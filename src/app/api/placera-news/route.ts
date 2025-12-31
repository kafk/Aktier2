import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface PlaceraNewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  category: string; // telegram, extern-analys, pressmeddelande
  ticker?: string;
}

interface NewsResponse {
  articles: PlaceraNewsItem[];
  totalFetched: number;
  error?: string;
  debug?: {
    htmlLength?: number;
    fetchStatus?: string;
    requestedLimit?: number;
    note?: string;
  };
}

// Rate limiting - be polite to Placera's servers
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL_MS = 2000; // 2 seconds between requests

// Cache to avoid hammering the server
const cache = new Map<string, { data: PlaceraNewsItem[]; timestamp: number }>();
const CACHE_TTL_MS = 1 * 60 * 1000; // 1 minute cache (reduced for testing)

interface FetchResult {
  articles: PlaceraNewsItem[];
  htmlLength: number;
  fetchStatus: string;
  sourceUrl: string;
}

// Parse RSC (React Server Components) response format to extract articles
function parseRscResponse(rscData: string, category: string, sourceUrl: string): PlaceraNewsItem[] {
  const articles: PlaceraNewsItem[] = [];
  const seenLinks = new Set<string>();

  // RSC format: lines like "0:..." or "1:..." containing serialized React data
  // Articles appear as arrays with href, title, and date info

  // Pattern to find article links - matches /telegram/slug-here or /placera/telegram/slug
  const articleLinkPattern = /(?:\/placera)?\/telegram\/([a-z0-9-]+(?:-[a-z0-9]+)*)/gi;

  // Find all article links first
  let linkMatch;
  const linkPositions: { link: string; pos: number }[] = [];
  while ((linkMatch = articleLinkPattern.exec(rscData)) !== null) {
    const fullLink = linkMatch[0];
    if (!seenLinks.has(fullLink) && fullLink.length > 15) {
      seenLinks.add(fullLink);
      linkPositions.push({ link: fullLink, pos: linkMatch.index });
    }
  }

  console.log(`RSC Parse: Found ${linkPositions.length} unique article links`);

  // For each link, look for nearby title and date
  for (const { link, pos } of linkPositions) {
    // Look in a window around the link position for title and date
    const windowStart = Math.max(0, pos - 500);
    const windowEnd = Math.min(rscData.length, pos + 500);
    const window = rscData.substring(windowStart, windowEnd);

    // Find potential title - look for quoted strings that look like headlines
    // Swedish news titles often contain specific patterns
    const titleMatches = window.match(/"([^"]{30,150})"/g) || [];
    let bestTitle = "";

    for (const match of titleMatches) {
      const text = match.slice(1, -1); // Remove quotes
      // Skip if it looks like code/markup
      if (
        text.includes("className") ||
        text.includes("children") ||
        text.includes("\\u") ||
        text.startsWith("/") ||
        text.startsWith("http") ||
        text.includes("function") ||
        text.includes("onClick")
      ) continue;

      // Prefer titles that look like Swedish news
      if (/[A-ZÅÄÖ]/.test(text) && /[a-zåäö]/.test(text)) {
        bestTitle = text;
        break;
      }
    }

    // Find date/time - look for Swedish format "31 dec 14:30" or ISO format
    const dateMatch = window.match(/(\d{1,2})\s+(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)\w*\s+(\d{2}):(\d{2})/i) ||
                      window.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);

    const pubDate = dateMatch ? parseSwedishDate(dateMatch[0]) : new Date().toISOString();

    if (bestTitle) {
      articles.push({
        title: bestTitle,
        link: `https://www.placera.se${link}`,
        pubDate,
        description: "",
        source: `Placera ${category} (${sourceUrl})`,
        category,
        ticker: extractTicker(bestTitle),
      });
    }
  }

  // Fallback: if we found links but no titles, just use the links with slug as title
  if (articles.length === 0 && linkPositions.length > 0) {
    for (const { link } of linkPositions) {
      const slug = link.split("/").pop() || "";
      const title = slug.replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase());
      if (title.length > 10) {
        articles.push({
          title,
          link: `https://www.placera.se${link}`,
          pubDate: new Date().toISOString(),
          description: "",
          source: `Placera ${category} (${sourceUrl})`,
          category,
        });
      }
    }
  }

  return articles;
}

function extractTicker(title: string): string | undefined {
  const tickerMatch = title.match(/\b([A-Z]{2,5}(?:\.ST)?)\b/);
  return tickerMatch ? tickerMatch[1] : undefined;
}

// Fetch a single page from Placera
async function fetchSinglePage(tab: string, limit: number, offset: number = 0): Promise<{ articles: PlaceraNewsItem[]; bytes: number }> {
  const sourceUrl = `https://www.placera.se/telegram?tab=${tab}&limit=${limit}${offset > 0 ? `&offset=${offset}` : ""}`;

  // Rate limiting
  const now = Date.now();
  const timeSinceLastFetch = now - lastFetchTime;
  if (timeSinceLastFetch < MIN_FETCH_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_FETCH_INTERVAL_MS - timeSinceLastFetch));
  }
  lastFetchTime = Date.now();

  try {
    // Try RSC format first (returns more data)
    const rscUrl = `${sourceUrl}&_rsc=1`;
    console.log(`Fetching Placera: ${rscUrl}`);

    const rscResponse = await fetch(rscUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/x-component",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
        "RSC": "1",
        "Next-Url": "/telegram",
        "Cache-Control": "no-cache",
      },
    });

    if (rscResponse.ok) {
      const rscData = await rscResponse.text();
      console.log(`Placera RSC received: ${rscData.length} bytes`);

      const articles = parseRscResponse(rscData, tab, sourceUrl);
      if (articles.length > 0) {
        console.log(`Placera RSC ${tab}: parsed ${articles.length} articles`);
        return { articles, bytes: rscData.length };
      }
    }

    // Fallback to HTML
    console.log(`RSC failed or returned 0, trying HTML...`);
    const htmlResponse = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
      },
    });

    if (htmlResponse.ok) {
      const html = await htmlResponse.text();
      const articles = parseHtml(html, tab, sourceUrl);
      console.log(`Placera HTML ${tab}: parsed ${articles.length} articles`);
      return { articles, bytes: html.length };
    }

    return { articles: [], bytes: 0 };
  } catch (error) {
    console.error(`Error fetching Placera ${tab}:`, error);
    return { articles: [], bytes: 0 };
  }
}

// Fetch articles from Placera with pagination
async function fetchPlaceraPage(tab: string, limit: number): Promise<FetchResult> {
  const cacheKey = `${tab}-${limit}`;
  const cached = cache.get(cacheKey);
  const sourceUrl = `https://www.placera.se/telegram?tab=${tab}&limit=${limit}`;

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { articles: cached.data, htmlLength: 0, fetchStatus: "cached", sourceUrl };
  }

  const allArticles: PlaceraNewsItem[] = [];
  const seenTitles = new Set<string>();
  let totalBytes = 0;
  const pageSize = 100; // Fetch 100 at a time
  const maxPages = Math.ceil(limit / pageSize);

  // Fetch multiple pages to get more articles
  for (let page = 0; page < maxPages; page++) {
    const offset = page * pageSize;
    const { articles, bytes } = await fetchSinglePage(tab, pageSize, offset);
    totalBytes += bytes;

    // Add unique articles
    for (const article of articles) {
      const key = article.title.toLowerCase();
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        allArticles.push(article);
      }
    }

    console.log(`Page ${page + 1}: got ${articles.length} articles, total unique: ${allArticles.length}`);

    // Stop if we got no new articles (pagination exhausted) or have enough
    if (articles.length === 0 || allArticles.length >= limit) {
      break;
    }
  }

  const fetchStatus = `${allArticles.length} articles from ${Math.min(maxPages, Math.ceil(allArticles.length / pageSize) + 1)} pages, ${totalBytes} bytes`;

  // Update cache
  if (allArticles.length > 0) {
    cache.set(cacheKey, { data: allArticles, timestamp: Date.now() });
  }

  return { articles: allArticles, htmlLength: totalBytes, fetchStatus, sourceUrl };
}

function parseHtml(html: string, category: string, sourceUrl: string): PlaceraNewsItem[] {
  const $ = cheerio.load(html);
  const articles: PlaceraNewsItem[] = [];

  // Try multiple common selectors for news items
  // These may need adjustment based on actual Placera HTML structure
  const selectors = [
    // Common news list patterns
    "article",
    ".telegram-item",
    ".news-item",
    ".list-item",
    '[class*="telegram"]',
    '[class*="news"]',
    ".card",
    "li[class*='item']",
    // Table-based layouts
    "table tbody tr",
    ".table-row",
  ];

  let foundItems = false;

  for (const selector of selectors) {
    const items = $(selector);
    if (items.length > 0) {
      items.each((_, element) => {
        const $item = $(element);

        // Extract title - try multiple patterns
        let title =
          $item.find("h2, h3, h4, .title, .headline, a[class*='title']").first().text().trim() ||
          $item.find("a").first().text().trim() ||
          $item.find("td").first().text().trim();

        // Extract link
        let link =
          $item.find("a").first().attr("href") ||
          $item.attr("href") ||
          "";

        // Make relative URLs absolute
        if (link && !link.startsWith("http")) {
          link = `https://www.placera.se${link.startsWith("/") ? "" : "/"}${link}`;
        }

        // Extract date - try multiple patterns
        let pubDate =
          $item.find("time").attr("datetime") ||
          $item.find("time").text().trim() ||
          $item.find(".date, .time, .timestamp, [class*='date']").first().text().trim() ||
          $item.find("td:nth-child(1)").text().trim() || // Often date is first column
          "";

        // Parse Swedish date formats (e.g., "2025-12-31 14:30" or "31 dec 14:30")
        if (pubDate && !pubDate.includes("T")) {
          pubDate = parseSwedishDate(pubDate);
        }

        // Extract description/summary
        const description =
          $item.find(".summary, .description, .excerpt, p").first().text().trim() ||
          "";

        // Source shows which Placera tab the article came from
        const source = `Placera ${category} (${sourceUrl})`;

        // Try to extract ticker symbols (common Swedish/US patterns)
        const tickerMatch = title.match(/\b([A-Z]{2,5}(?:\.ST)?)\b/);
        const ticker = tickerMatch ? tickerMatch[1] : undefined;

        if (title && title.length > 5) {
          articles.push({
            title,
            link,
            pubDate,
            description,
            source,
            category,
            ticker,
          });
          foundItems = true;
        }
      });

      if (foundItems) break; // Stop if we found items with this selector
    }
  }

  // If no structured items found, try to extract from raw text/links
  if (articles.length === 0) {
    $("a").each((_, element) => {
      const $a = $(element);
      const href = $a.attr("href") || "";
      const text = $a.text().trim();

      // Filter for likely news links
      if (
        text.length > 20 &&
        (href.includes("/telegram/") || href.includes("/nyheter/") || href.includes("/analys/"))
      ) {
        articles.push({
          title: text,
          link: href.startsWith("http") ? href : `https://www.placera.se${href}`,
          pubDate: new Date().toISOString(),
          description: "",
          source: `Placera ${category} (${sourceUrl})`,
          category,
        });
      }
    });
  }

  return articles;
}

function parseSwedishDate(dateStr: string): string {
  // Handle various Swedish date formats
  const now = new Date();

  // Format: "2025-12-31 14:30"
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (isoMatch) {
    return new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T${isoMatch[4]}:${isoMatch[5]}:00`).toISOString();
  }

  // Format: "31 dec 14:30" or "31 december 14:30"
  const monthMap: Record<string, string> = {
    jan: "01", januari: "01",
    feb: "02", februari: "02",
    mar: "03", mars: "03",
    apr: "04", april: "04",
    maj: "05",
    jun: "06", juni: "06",
    jul: "07", juli: "07",
    aug: "08", augusti: "08",
    sep: "09", september: "09",
    okt: "10", oktober: "10",
    nov: "11", november: "11",
    dec: "12", december: "12",
  };

  const swedishMatch = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{2}):(\d{2})/i);
  if (swedishMatch) {
    const day = swedishMatch[1].padStart(2, "0");
    const monthName = swedishMatch[2].toLowerCase();
    const month = monthMap[monthName] || "01";
    const hour = swedishMatch[3];
    const minute = swedishMatch[4];
    const year = now.getFullYear();
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`).toISOString();
  }

  // Format: "14:30" (today)
  const timeOnlyMatch = dateStr.match(/^(\d{2}):(\d{2})$/);
  if (timeOnlyMatch) {
    const today = now.toISOString().split("T")[0];
    return new Date(`${today}T${timeOnlyMatch[1]}:${timeOnlyMatch[2]}:00`).toISOString();
  }

  // Return current time if parsing fails
  return now.toISOString();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tab = searchParams.get("tab") || "all"; // telegram, extern-analys, pressmeddelande, or all
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  try {
    let allArticles: PlaceraNewsItem[] = [];
    let totalHtmlLength = 0;
    const fetchStatuses: string[] = [];

    if (tab === "all") {
      // Fetch from all three sources
      const [telegram, analys, press] = await Promise.all([
        fetchPlaceraPage("telegram", limit),
        fetchPlaceraPage("extern-analys", limit),
        fetchPlaceraPage("pressmeddelande", limit),
      ]);
      allArticles = [...telegram.articles, ...analys.articles, ...press.articles];
      totalHtmlLength = telegram.htmlLength + analys.htmlLength + press.htmlLength;
      fetchStatuses.push(`telegram:${telegram.fetchStatus}`, `analys:${analys.fetchStatus}`, `press:${press.fetchStatus}`);
    } else {
      const result = await fetchPlaceraPage(tab, limit);
      allArticles = result.articles;
      totalHtmlLength = result.htmlLength;
      fetchStatuses.push(`${tab}:${result.fetchStatus}`);
    }

    // Sort by date (newest first)
    allArticles.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });

    // Remove duplicates by title
    const seen = new Set<string>();
    const uniqueArticles = allArticles.filter(article => {
      const key = article.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const result: NewsResponse = {
      articles: uniqueArticles,
      totalFetched: uniqueArticles.length,
      debug: {
        htmlLength: totalHtmlLength,
        fetchStatus: fetchStatuses.join(", "),
        requestedLimit: limit,
        note: "Placera may not honor large limit values. Check if 'ladda mer' uses a different API.",
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching Placera news:", error);
    return NextResponse.json(
      {
        articles: [],
        totalFetched: 0,
        error: `Failed to fetch Placera news: ${error}`,
        debug: {
          fetchStatus: "exception",
        },
      },
      { status: 500 }
    );
  }
}
