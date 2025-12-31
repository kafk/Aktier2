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
    selectorsChecked?: number;
  };
}

// Rate limiting - be polite to Placera's servers
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL_MS = 2000; // 2 seconds between requests

// Cache to avoid hammering the server
const cache = new Map<string, { data: PlaceraNewsItem[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

interface FetchResult {
  articles: PlaceraNewsItem[];
  htmlLength: number;
  fetchStatus: string;
  sourceUrl: string;
}

// Fetch a single page with optional offset for pagination
async function fetchSinglePage(tab: string, limit: number, offset: number = 0): Promise<{ articles: PlaceraNewsItem[]; htmlLength: number; ok: boolean; sourceUrl: string }> {
  // Try different pagination URL patterns
  const sourceUrl = offset > 0
    ? `https://www.placera.se/telegram?tab=${tab}&limit=${limit}&offset=${offset}`
    : `https://www.placera.se/telegram?tab=${tab}&limit=${limit}`;

  // Rate limiting
  const now = Date.now();
  const timeSinceLastFetch = now - lastFetchTime;
  if (timeSinceLastFetch < MIN_FETCH_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_FETCH_INTERVAL_MS - timeSinceLastFetch));
  }
  lastFetchTime = Date.now();

  try {
    console.log(`Fetching Placera: ${sourceUrl}`);
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      console.error(`Placera fetch failed: ${response.status} ${response.statusText}`);
      return { articles: [], htmlLength: 0, ok: false, sourceUrl };
    }

    const html = await response.text();
    console.log(`Placera HTML received: ${html.length} bytes`);

    const articles = parseHtml(html, tab, sourceUrl);
    console.log(`Placera parsed: ${articles.length} articles from offset ${offset}`);

    return { articles, htmlLength: html.length, ok: true, sourceUrl };
  } catch (error) {
    console.error(`Error fetching Placera ${tab}:`, error);
    return { articles: [], htmlLength: 0, ok: false, sourceUrl };
  }
}

// Fetch multiple pages to get more articles (simulates "ladda mer" / load more)
async function fetchPlaceraPage(tab: string, limit: number): Promise<FetchResult> {
  const cacheKey = `${tab}-${limit}`;
  const cached = cache.get(cacheKey);
  const sourceUrl = `https://www.placera.se/telegram?tab=${tab}&limit=${limit}`;

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { articles: cached.data, htmlLength: 0, fetchStatus: "cached", sourceUrl };
  }

  const allArticles: PlaceraNewsItem[] = [];
  let totalHtmlLength = 0;
  const pageSize = 50; // Fetch 50 per page
  const maxPages = Math.ceil(limit / pageSize); // Number of pages to fetch
  let pagesLoaded = 0;

  for (let page = 0; page < maxPages; page++) {
    const offset = page * pageSize;
    const result = await fetchSinglePage(tab, pageSize, offset);

    if (!result.ok || result.articles.length === 0) {
      // No more articles or error, stop pagination
      break;
    }

    allArticles.push(...result.articles);
    totalHtmlLength += result.htmlLength;
    pagesLoaded++;

    console.log(`Placera ${tab}: loaded page ${page + 1}, total articles: ${allArticles.length}`);

    // If we got fewer articles than requested, we've reached the end
    if (result.articles.length < pageSize) {
      break;
    }

    // Don't fetch more than needed
    if (allArticles.length >= limit) {
      break;
    }
  }

  // Update cache
  cache.set(cacheKey, { data: allArticles, timestamp: Date.now() });

  return {
    articles: allArticles,
    htmlLength: totalHtmlLength,
    fetchStatus: `ok (${pagesLoaded} pages)`,
    sourceUrl
  };
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
