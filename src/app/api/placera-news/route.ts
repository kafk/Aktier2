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

// Extract date from text using various patterns
function extractDateFromText(text: string): string | null {
  // Pattern 1: "Igår, 15:15" (yesterday) or "Idag, 15:15" (today)
  const relativeMatch = text.match(/(igår|idag),?\s*(\d{2}):(\d{2})/i);
  if (relativeMatch) {
    const isYesterday = relativeMatch[1].toLowerCase() === "igår";
    const now = new Date();
    if (isYesterday) {
      now.setDate(now.getDate() - 1);
    }
    const dateStr = now.toISOString().split("T")[0];
    return `${dateStr} ${relativeMatch[2]}:${relativeMatch[3]}`;
  }

  // Pattern 2: Swedish format "31 dec 14:30" or "31 december 14:30"
  const swedishMatch = text.match(/(\d{1,2})\s+(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)\w*\s+(\d{2}):(\d{2})/i);
  if (swedishMatch) {
    return swedishMatch[0];
  }

  // Pattern 3: ISO format "2025-12-31T14:30:00"
  const isoMatch = text.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/);
  if (isoMatch) {
    return isoMatch[0];
  }

  // Pattern 4: Date format "2025-12-31 14:30"
  const dateTimeMatch = text.match(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/);
  if (dateTimeMatch) {
    return dateTimeMatch[0];
  }

  // Pattern 5: Just time "14:30" (today's articles) - look for time in context
  const timeOnlyMatch = text.match(/["\s](\d{2}):(\d{2})["\s,]/);
  if (timeOnlyMatch) {
    // Return the time, parseSwedishDate will handle adding today's date
    return `${timeOnlyMatch[1]}:${timeOnlyMatch[2]}`;
  }

  return null;
}

// Extract date from URL slug (e.g., "article-name-20251230" -> 2025-12-30)
function extractDateFromUrl(url: string): string | null {
  // Look for 8-digit date pattern at end of URL: YYYYMMDD
  const dateMatch = url.match(/(\d{4})(\d{2})(\d{2})(?:[^0-9]|$)/);
  if (dateMatch) {
    const year = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]);
    const day = parseInt(dateMatch[3]);
    // Validate it's a reasonable date
    if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T12:00:00`;
    }
  }
  return null;
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
    // Look in a larger window around the link position for title and date
    const windowStart = Math.max(0, pos - 800);
    const windowEnd = Math.min(rscData.length, pos + 800);
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

    // Find date/time using our extraction function
    const dateStr = extractDateFromText(window);
    const pubDate = dateStr ? parseSwedishDate(dateStr) : new Date().toISOString();

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
      const title = slug
        .replace(/-\d{8}$/, "") // Remove date suffix
        .replace(/-/g, " ")
        .replace(/^\w/, c => c.toUpperCase());
      if (title.length > 10) {
        // Try to get date from URL
        const dateFromUrl = extractDateFromUrl(link);
        articles.push({
          title,
          link: `https://www.placera.se${link}`,
          pubDate: dateFromUrl || new Date().toISOString(),
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

// Fetch a single page from Placera - simplified approach
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
    console.log(`Fetching Placera HTML: ${sourceUrl}`);

    // Just fetch HTML directly - skip RSC which is unreliable
    const htmlResponse = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
      },
    });

    console.log(`Placera response status: ${htmlResponse.status}`);

    if (!htmlResponse.ok) {
      console.error(`Placera fetch failed: ${htmlResponse.status} ${htmlResponse.statusText}`);
      return { articles: [], bytes: 0 };
    }

    const html = await htmlResponse.text();
    console.log(`Placera HTML received: ${html.length} bytes`);

    // Try parsing with cheerio first
    let articles = parseHtml(html, tab, sourceUrl);
    console.log(`Placera cheerio parsing found: ${articles.length} articles`);

    // If cheerio found nothing, try RSC parsing on the HTML (it might contain RSC data)
    if (articles.length === 0) {
      console.log("Trying RSC parsing on HTML content...");
      articles = parseRscResponse(html, tab, sourceUrl);
      console.log(`RSC parsing found: ${articles.length} articles`);
    }

    // If still nothing, try very simple regex extraction
    if (articles.length === 0) {
      console.log("Trying simple regex extraction...");
      articles = simpleExtractArticles(html, tab, sourceUrl);
      console.log(`Simple regex found: ${articles.length} articles`);
    }

    return { articles, bytes: html.length };
  } catch (error) {
    console.error(`Error fetching Placera ${tab}:`, error);
    return { articles: [], bytes: 0 };
  }
}

// Very simple article extraction as last resort - with date extraction
function simpleExtractArticles(html: string, tab: string, sourceUrl: string): PlaceraNewsItem[] {
  const articles: PlaceraNewsItem[] = [];
  const seenLinks = new Set<string>();

  // Find all telegram article links with surrounding context for date extraction
  const linkPattern = /href="(\/telegram\/[^"]+)"/g;
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1];
    if (seenLinks.has(href)) continue;
    seenLinks.add(href);

    // Extract title from slug
    const slug = href.split("/").pop() || "";
    if (slug.length < 10) continue;

    // Convert slug to readable title (remove date suffix if present)
    const title = slug
      .replace(/-\d{8}$/, "") // Remove date suffix like -20251230
      .replace(/-/g, " ")
      .replace(/^\w/, c => c.toUpperCase());

    // Look for date in surrounding context (500 chars before and after the link)
    const contextStart = Math.max(0, match.index - 500);
    const contextEnd = Math.min(html.length, match.index + 500);
    const context = html.substring(contextStart, contextEnd);

    // Try to extract a date from the context, then from URL, then default to now
    let pubDate: string;
    const dateFromContext = extractDateFromText(context);
    if (dateFromContext) {
      pubDate = parseSwedishDate(dateFromContext);
    } else {
      const dateFromUrl = extractDateFromUrl(href);
      pubDate = dateFromUrl || new Date().toISOString();
    }

    articles.push({
      title,
      link: `https://www.placera.se${href}`,
      pubDate,
      description: "",
      source: `Placera ${tab} (${sourceUrl})`,
      category: tab,
    });
  }

  return articles;
}

// Fetch from Placera search page (sok.html) - this has better structure
async function fetchSearchPage(keyword: string = ""): Promise<{ articles: PlaceraNewsItem[]; bytes: number }> {
  // Use empty search to get recent articles, or specific keyword
  const searchUrl = `https://www.placera.se/placera/sok.html${keyword ? `?sok=${encodeURIComponent(keyword)}` : ""}`;

  // Rate limiting
  const now = Date.now();
  const timeSinceLastFetch = now - lastFetchTime;
  if (timeSinceLastFetch < MIN_FETCH_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_FETCH_INTERVAL_MS - timeSinceLastFetch));
  }
  lastFetchTime = Date.now();

  try {
    console.log(`Fetching Placera search page: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!response.ok) {
      console.error(`Search page fetch failed: ${response.status}`);
      return { articles: [], bytes: 0 };
    }

    const html = await response.text();
    console.log(`Search page received: ${html.length} bytes`);

    const articles = parseHtml(html, "search", searchUrl);
    console.log(`Search page parsed: ${articles.length} articles`);

    return { articles, bytes: html.length };
  } catch (error) {
    console.error(`Error fetching search page:`, error);
    return { articles: [], bytes: 0 };
  }
}

// Fetch articles from Placera - try multiple sources
async function fetchPlaceraPage(tab: string, limit: number): Promise<FetchResult> {
  const cacheKey = `${tab}-${limit}`;
  const cached = cache.get(cacheKey);
  const actualLimit = Math.max(limit, 500);
  const sourceUrl = `https://www.placera.se/telegram?tab=${tab}&limit=${actualLimit}`;

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { articles: cached.data, htmlLength: 0, fetchStatus: "cached", sourceUrl };
  }

  // Try telegram page first
  let { articles, bytes } = await fetchSinglePage(tab, actualLimit, 0);
  let fetchStatus = `telegram: ${articles.length} articles`;

  // If telegram page returned few articles, also try search page
  if (articles.length < 30 && tab === "telegram") {
    console.log("Telegram returned few articles, trying search page...");
    const searchResult = await fetchSearchPage();

    if (searchResult.articles.length > 0) {
      // Merge articles, avoiding duplicates by title
      const existingTitles = new Set(articles.map(a => a.title.toLowerCase()));
      for (const article of searchResult.articles) {
        if (!existingTitles.has(article.title.toLowerCase())) {
          articles.push(article);
          existingTitles.add(article.title.toLowerCase());
        }
      }
      bytes += searchResult.bytes;
      fetchStatus = `telegram: ${articles.length - searchResult.articles.length}, search: ${searchResult.articles.length}, total: ${articles.length}`;
    }
  }

  // Update cache
  if (articles.length > 0) {
    cache.set(cacheKey, { data: articles, timestamp: Date.now() });
  }

  return { articles, htmlLength: bytes, fetchStatus, sourceUrl };
}

function parseHtml(html: string, category: string, sourceUrl: string): PlaceraNewsItem[] {
  const $ = cheerio.load(html);
  const articles: PlaceraNewsItem[] = [];

  // First try the search page structure (from Placera's sok.html)
  // This has .searchItem containers with h2, .intro, .publishedBy
  const searchItems = $(".searchItem");
  if (searchItems.length > 0) {
    console.log(`Found ${searchItems.length} .searchItem elements`);
    searchItems.each((_, element) => {
      const $item = $(element);

      // Title from h2
      const title = $item.find("h2").text().trim();

      // Description from .intro
      const description = $item.find(".intro").text().trim();

      // Link from href attribute
      const href = $item.attr("href") || $item.find("a").first().attr("href") || "";
      const link = href.startsWith("http") ? href : `https://www.placera.se${href}`;

      // Date from .publishedBy (format: "Publicerad: 2025-12-30 14:30")
      const publishedText = $item.find(".publishedBy").text().trim();
      let pubDate = new Date().toISOString();

      // Extract date from "Publicerad: 2025-12-30" or similar
      const dateMatch = publishedText.match(/Publicerad:\s*(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        pubDate = `${dateMatch[1]}T12:00:00.000Z`;
      } else {
        // Try other date patterns
        const extracted = extractDateFromText(publishedText);
        if (extracted) {
          pubDate = parseSwedishDate(extracted);
        }
      }

      if (title && title.length > 5) {
        articles.push({
          title,
          link,
          pubDate,
          description,
          source: `Placera ${category} (${sourceUrl})`,
          category,
          ticker: extractTicker(title),
        });
      }
    });

    if (articles.length > 0) {
      console.log(`Parsed ${articles.length} articles from .searchItem structure`);
      return articles;
    }
  }

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
        let pubDateRaw =
          $item.find("time").attr("datetime") ||
          $item.find("time").text().trim() ||
          $item.find(".date, .time, .timestamp, [class*='date'], [class*='time']").first().text().trim() ||
          $item.find("span").filter((_, el) => /\d{1,2}:\d{2}/.test($(el).text())).first().text().trim() ||
          $item.find("td:nth-child(1)").text().trim() || // Often date is first column
          "";

        // Try to extract date from the raw text
        let pubDate = "";
        if (pubDateRaw) {
          const extractedDate = extractDateFromText(pubDateRaw);
          pubDate = extractedDate ? parseSwedishDate(extractedDate) : parseSwedishDate(pubDateRaw);
        }

        // If still no date, try to find it in the item's full text
        if (!pubDate || pubDate === new Date().toISOString().split("T")[0]) {
          const fullText = $item.text();
          const extractedDate = extractDateFromText(fullText);
          if (extractedDate) {
            pubDate = parseSwedishDate(extractedDate);
          }
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
    console.log("No structured items found, trying link extraction fallback...");
    const seenHrefs = new Set<string>();

    $("a").each((_, element) => {
      const $a = $(element);
      const href = $a.attr("href") || "";
      const text = $a.text().trim();

      // Filter for likely news links - be less restrictive
      if (
        text.length > 10 &&
        (href.includes("/telegram/") || href.includes("/nyheter/") || href.includes("/analys/")) &&
        !seenHrefs.has(href)
      ) {
        seenHrefs.add(href);
        const fullLink = href.startsWith("http") ? href : `https://www.placera.se${href}`;

        // Try to find a date near this link
        const parent = $a.parent();
        const parentText = parent.text();
        const dateStr = extractDateFromText(parentText);
        const pubDate = dateStr ? parseSwedishDate(dateStr) : new Date().toISOString();

        articles.push({
          title: text,
          link: fullLink,
          pubDate,
          description: "",
          source: `Placera ${category} (${sourceUrl})`,
          category,
        });
      }
    });

    console.log(`Link extraction found ${articles.length} articles`);
  }

  // Ultimate fallback: parse raw HTML for telegram links
  if (articles.length === 0) {
    console.log("Trying raw HTML regex fallback...");
    const rawHtml = $.html();
    const linkPattern = /href="(\/telegram\/[^"]+)"/g;
    const seenLinks = new Set<string>();
    let match;

    while ((match = linkPattern.exec(rawHtml)) !== null) {
      const href = match[1];
      if (!seenLinks.has(href)) {
        seenLinks.add(href);
        const slug = href.split("/").pop() || "";
        const title = slug.replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase());

        if (title.length > 10) {
          articles.push({
            title,
            link: `https://www.placera.se${href}`,
            pubDate: new Date().toISOString(),
            description: "",
            source: `Placera ${category} (${sourceUrl})`,
            category,
          });
        }
      }
    }

    console.log(`Raw regex fallback found ${articles.length} articles`);
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
