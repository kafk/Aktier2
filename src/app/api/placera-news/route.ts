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

  // RSC format contains JSON-like data with article information
  // Look for patterns like: "title":"...", "href":"/telegram/...", timestamps, etc.

  // Extract all article-like objects from the RSC response
  // Pattern 1: Look for telegram article links and their associated titles
  const telegramLinkPattern = /\/telegram\/[a-z0-9-]+/gi;
  const links = rscData.match(telegramLinkPattern) || [];
  const uniqueLinks = [...new Set(links)];

  // Pattern 2: Extract titles - they often appear as strings before or after links
  // Look for title-like patterns in the RSC data
  const titlePattern = /"([^"]{20,200})"/g;
  const potentialTitles: string[] = [];
  let match;
  while ((match = titlePattern.exec(rscData)) !== null) {
    const text = match[1];
    // Filter for likely article titles (Swedish/financial news patterns)
    if (
      text.length > 25 &&
      !text.includes("http") &&
      !text.includes("className") &&
      !text.includes("children") &&
      !text.startsWith("/") &&
      !text.includes("\\u") &&
      /[a-zåäöA-ZÅÄÖ]/.test(text)
    ) {
      potentialTitles.push(text);
    }
  }

  // Pattern 3: Look for date/time patterns
  const dateTimePattern = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})|(\d{1,2}\s+(?:jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)\w*\s+\d{2}:\d{2})/gi;
  const dates = rscData.match(dateTimePattern) || [];

  console.log(`RSC Parse: Found ${uniqueLinks.length} links, ${potentialTitles.length} potential titles, ${dates.length} dates`);

  // Try to pair links with titles
  // In RSC format, titles and links are often near each other in the serialized data
  for (let i = 0; i < uniqueLinks.length && i < potentialTitles.length; i++) {
    const link = uniqueLinks[i];
    const title = potentialTitles[i];
    const pubDate = dates[i] ? parseSwedishDate(dates[i]) : new Date().toISOString();

    if (title && link) {
      articles.push({
        title,
        link: `https://www.placera.se${link}`,
        pubDate,
        description: "",
        source: `Placera ${category} (${sourceUrl})`,
        category,
        ticker: extractTicker(title),
      });
    }
  }

  // If pairing didn't work well, try a more aggressive approach
  // Look for complete article patterns in the RSC data
  if (articles.length < 10) {
    // Try finding JSON-like article objects
    const articleJsonPattern = /\{"[^}]*title[^}]*href[^}]*\}/gi;
    const jsonMatches = rscData.match(articleJsonPattern) || [];

    for (const jsonStr of jsonMatches) {
      try {
        // Try to extract title and href from each match
        const titleMatch = jsonStr.match(/"title":"([^"]+)"/);
        const hrefMatch = jsonStr.match(/"href":"([^"]+)"/);
        if (titleMatch && hrefMatch) {
          const title = titleMatch[1];
          const href = hrefMatch[1];
          if (!articles.some(a => a.title === title)) {
            articles.push({
              title,
              link: href.startsWith("http") ? href : `https://www.placera.se${href}`,
              pubDate: new Date().toISOString(),
              description: "",
              source: `Placera ${category} (${sourceUrl})`,
              category,
              ticker: extractTicker(title),
            });
          }
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }

  return articles;
}

function extractTicker(title: string): string | undefined {
  const tickerMatch = title.match(/\b([A-Z]{2,5}(?:\.ST)?)\b/);
  return tickerMatch ? tickerMatch[1] : undefined;
}

// Fetch articles from Placera using RSC format for more data
async function fetchPlaceraPage(tab: string, limit: number): Promise<FetchResult> {
  const cacheKey = `${tab}-${limit}`;
  const cached = cache.get(cacheKey);
  // Use RSC format - this returns more data than plain HTML
  const sourceUrl = `https://www.placera.se/telegram?tab=${tab}&limit=${limit}`;

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { articles: cached.data, htmlLength: 0, fetchStatus: "cached", sourceUrl };
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastFetch = now - lastFetchTime;
  if (timeSinceLastFetch < MIN_FETCH_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_FETCH_INTERVAL_MS - timeSinceLastFetch));
  }
  lastFetchTime = Date.now();

  try {
    // First try RSC format (returns more data)
    const rscUrl = `${sourceUrl}&_rsc=1`;
    console.log(`Fetching Placera RSC: ${rscUrl}`);

    const rscResponse = await fetch(rscUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/x-component",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
        "RSC": "1",
        "Next-Router-State-Tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22telegram%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
        "Next-Url": "/telegram",
        "Cache-Control": "no-cache",
      },
    });

    let articles: PlaceraNewsItem[] = [];
    let responseLength = 0;
    let fetchStatus = "";

    if (rscResponse.ok) {
      const rscData = await rscResponse.text();
      responseLength = rscData.length;
      console.log(`Placera RSC received: ${rscData.length} bytes for ${rscUrl}`);

      articles = parseRscResponse(rscData, tab, sourceUrl);
      console.log(`Placera RSC ${tab}: parsed ${articles.length} articles`);
      fetchStatus = `rsc (${articles.length} articles, ${responseLength} bytes)`;
    }

    // If RSC didn't return enough articles, fall back to HTML
    if (articles.length < 20) {
      console.log(`RSC returned only ${articles.length} articles, trying HTML fallback...`);

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
        responseLength = html.length;
        console.log(`Placera HTML received: ${html.length} bytes for ${sourceUrl}`);

        const htmlArticles = parseHtml(html, tab, sourceUrl);
        console.log(`Placera HTML ${tab}: parsed ${htmlArticles.length} articles`);

        // Merge RSC and HTML results, preferring more results
        if (htmlArticles.length > articles.length) {
          articles = htmlArticles;
          fetchStatus = `html fallback (${articles.length} articles, ${responseLength} bytes)`;
        } else {
          fetchStatus = `rsc+html (${articles.length} rsc, ${htmlArticles.length} html)`;
        }
      }
    }

    if (articles.length === 0) {
      return { articles: [], htmlLength: responseLength, fetchStatus: "no articles found", sourceUrl };
    }

    // Update cache
    cache.set(cacheKey, { data: articles, timestamp: Date.now() });

    return { articles, htmlLength: responseLength, fetchStatus, sourceUrl };
  } catch (error) {
    console.error(`Error fetching Placera ${tab}:`, error);
    return { articles: [], htmlLength: 0, fetchStatus: `error: ${error}`, sourceUrl };
  }
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
