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
    mode?: string;
    days?: number;
    cutoff?: string;
    totalBeforeCutoff?: number;
    note?: string;
    [key: string]: any;
  };
}

// Rate limiting - fast interval safe for serverless
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL_MS = 50; // 50ms between requests

// Cache to avoid hammering the server
const cache = new Map<string, { data: PlaceraNewsItem[]; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache

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

    // Fetch HTML with timeout safety for serverless
    const htmlResponse = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(3500),
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

// Map stock ticker symbols to effective Placera search queries
function getStockSearchQueries(stock: string): string[] {
  const s = stock.trim().toUpperCase();
  const dict: Record<string, string[]> = {
    NVDA: ["nvidia"],
    AAPL: ["apple"],
    MSFT: ["microsoft"],
    GOOGL: ["google", "alphabet"],
    GOOG: ["google", "alphabet"],
    AMZN: ["amazon"],
    META: ["meta", "facebook"],
    TSLA: ["tesla"],
    AMD: ["amd"],
    NFLX: ["netflix"],
    PLTR: ["palantir"],
    COIN: ["coinbase"],
    DIS: ["disney"],
    INTC: ["intel"],
    CRM: ["salesforce"],
    ADBE: ["adobe"],
    QCOM: ["qualcomm"],
    UBER: ["uber"],
    "VOLV B": ["volvo"],
    "VOLV A": ["volvo"],
    "ERIC B": ["ericsson"],
    "ERIC A": ["ericsson"],
    "INVE B": ["investor"],
    "INVE A": ["investor"],
    "HM B": ["h&m", "hennes"],
    "SAAB B": ["saab"],
    "ATCO A": ["atlas copco"],
    "ATCO B": ["atlas copco"],
    "SWED A": ["swedbank"],
    "SEB A": ["seb"],
    "SHB A": ["handelsbanken"],
    "NDA SE": ["nordea"],
    "NIBE B": ["nibe"],
    "EMBRAC B": ["embracer"],
    "ESSITY B": ["essity"],
    "TELIA": ["telia"],
    "TEL2 B": ["tele2"],
    "SBB B": ["sbb"],
    "EQT": ["eqt"],
    "SAND": ["sandvik"],
    "SINCH": ["sinch"],
    "BOL": ["boliden"],
    "EVO": ["evolution"],
    "AZN": ["astrazeneca"],
    "ALFA": ["alfa laval"],
    "HEXA B": ["hexagon"],
    "SCA B": ["sca"],
    "SKF B": ["skf"],
    "SKA B": ["skanska"],
  };

  if (dict[s]) {
    return dict[s];
  }
  // Strip class suffix like " B", " A"
  const clean = stock.replace(/\s+[A-Z]$/i, "").toLowerCase();
  return [clean];
}

// Fetch from Placera search page (https://www.placera.se/search?q=...)
async function fetchSearchPage(keyword: string = ""): Promise<{ articles: PlaceraNewsItem[]; bytes: number }> {
  // Use modern search URL: https://www.placera.se/search?q=...
  const searchUrl = keyword
    ? `https://www.placera.se/search?q=${encodeURIComponent(keyword)}`
    : `https://www.placera.se/telegram?tab=telegram&limit=50`;

  // Rate limiting
  const now = Date.now();
  const timeSinceLastFetch = now - lastFetchTime;
  if (timeSinceLastFetch < MIN_FETCH_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_FETCH_INTERVAL_MS - timeSinceLastFetch));
  }
  lastFetchTime = Date.now();

  try {
    console.log(`Fetching Placera search: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      signal: AbortSignal.timeout(4000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!response.ok) {
      console.error(`Search page fetch failed: ${response.status}`);
      return { articles: [], bytes: 0 };
    }

    const html = await response.text();
    console.log(`Search page for "${keyword}" received: ${html.length} bytes`);

    const articles = parseHtml(html, "search", searchUrl);
    console.log(`Search page parsed for "${keyword}": ${articles.length} articles`);

    return { articles, bytes: html.length };
  } catch (error) {
    console.error(`Error fetching search page for "${keyword}":`, error);
    return { articles: [], bytes: 0 };
  }
}

// Fetch paginated feed for a specific tab until cutoff date or maxPages is reached
async function fetchPaginatedTab(
  tab: string,
  cutoffDate: Date,
  maxPages: number = 3
): Promise<{ articles: PlaceraNewsItem[]; totalBytes: number; pagesFetched: number }> {
  let allArticles: PlaceraNewsItem[] = [];
  let totalBytes = 0;
  const seenLinks = new Set<string>();
  const limitPerPage = 50;
  let pagesFetched = 0;

  for (let page = 0; page < maxPages; page++) {
    pagesFetched++;
    const offset = page * limitPerPage;
    const pageResult = await fetchSinglePage(tab, limitPerPage, offset);
    totalBytes += pageResult.bytes;

    if (!pageResult.articles || pageResult.articles.length === 0) {
      console.log(`Placera ${tab} ended at page ${page + 1}: no articles returned`);
      break;
    }

    let pageAdded = 0;
    let reachedCutoff = false;

    for (const article of pageResult.articles) {
      const articleDate = new Date(article.pubDate);
      if (!isNaN(articleDate.getTime()) && articleDate < cutoffDate) {
        reachedCutoff = true;
      }

      const linkKey = (article.link || article.title).toLowerCase();
      if (!seenLinks.has(linkKey)) {
        seenLinks.add(linkKey);
        allArticles.push(article);
        pageAdded++;
      }
    }

    console.log(`Placera ${tab} page ${page + 1} (offset=${offset}): ${pageResult.articles.length} items, +${pageAdded} new (total: ${allArticles.length})`);

    if (reachedCutoff) {
      console.log(`Placera ${tab} reached cutoff date (${cutoffDate.toISOString().split("T")[0]}) at page ${page + 1}`);
      break;
    }

    // Small delay between page requests
    await new Promise(r => setTimeout(r, 100));
  }

  return { articles: allArticles, totalBytes, pagesFetched };
}

// Fetch stock-specific news via Placera search (placera.se/search?q=...)
async function fetchStocksSearch(
  stockSymbols: string[],
  cutoffDate: Date
): Promise<{ articles: PlaceraNewsItem[]; totalBytes: number }> {
  let allArticles: PlaceraNewsItem[] = [];
  let totalBytes = 0;
  const seenLinks = new Set<string>();

  // Map symbols to Placera search keywords
  const queriesToRun: { keyword: string; originalSymbol: string }[] = [];
  for (const rawStock of stockSymbols) {
    const kws = getStockSearchQueries(rawStock);
    for (const kw of kws) {
      if (!queriesToRun.some(q => q.keyword === kw)) {
        queriesToRun.push({ keyword: kw, originalSymbol: rawStock.toUpperCase() });
      }
    }
  }

  // Run searches in parallel (fast and within serverless limits)
  const searchPromises = queriesToRun.map(async ({ keyword, originalSymbol }) => {
    const res = await fetchSearchPage(keyword);
    return { keyword, originalSymbol, res };
  });

  const searchResults = await Promise.all(searchPromises);

  for (const { keyword, originalSymbol, res } of searchResults) {
    totalBytes += res.bytes;
    let added = 0;

    for (const article of res.articles) {
      const articleDate = new Date(article.pubDate);
      if (isNaN(articleDate.getTime()) || articleDate >= cutoffDate) {
        const linkKey = (article.link || article.title).toLowerCase();
        if (!seenLinks.has(linkKey)) {
          seenLinks.add(linkKey);
          allArticles.push({
            ...article,
            ticker: article.ticker || originalSymbol,
          });
          added++;
        }
      }
    }

    console.log(`Placera Search for "${keyword}" (${originalSymbol}): found ${res.articles.length}, kept +${added} within date range`);
  }

  return { articles: allArticles, totalBytes };
}

// Fetch articles from Placera (backward compatible legacy wrapper)
async function fetchPlaceraPage(tab: string, limit: number): Promise<FetchResult> {
  const cacheKey = `${tab}-${limit}`;
  const cached = cache.get(cacheKey);
  const sourceUrl = `https://www.placera.se/placera/sok.html`;

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { articles: cached.data, htmlLength: 0, fetchStatus: "cached", sourceUrl };
  }

  let allArticles: PlaceraNewsItem[] = [];
  let totalBytes = 0;
  const statusParts: string[] = [];

  // Primary: Use search page (sok.html)
  const searchResult = await fetchSearchPage();
  if (searchResult.articles.length > 0) {
    allArticles = searchResult.articles;
    totalBytes += searchResult.bytes;
    statusParts.push(`search: ${searchResult.articles.length}`);
  }

  // Secondary: Also fetch telegram page if needed
  if (allArticles.length < limit) {
    const telegramResult = await fetchSinglePage(tab, 50, 0);
    if (telegramResult.articles.length > 0) {
      const existingLinks = new Set(allArticles.map(a => a.link.toLowerCase()));
      let added = 0;
      for (const article of telegramResult.articles) {
        if (!existingLinks.has(article.link.toLowerCase())) {
          allArticles.push(article);
          existingLinks.add(article.link.toLowerCase());
          added++;
        }
      }
      totalBytes += telegramResult.bytes;
      statusParts.push(`telegram: +${added}`);
    }
  }

  const fetchStatus = statusParts.length > 0 ? statusParts.join(", ") + `, total: ${allArticles.length}` : "0 articles";

  if (allArticles.length > 0) {
    cache.set(cacheKey, { data: allArticles, timestamp: Date.now() });
  }

  return { articles: allArticles, htmlLength: totalBytes, fetchStatus, sourceUrl };
}

function parseHtml(html: string, category: string, sourceUrl: string): PlaceraNewsItem[] {
  const $ = cheerio.load(html);
  const articles: PlaceraNewsItem[] = [];

  // PRIORITY 1: Focus on <article> elements only - ignore related content outside
  const articleElements = $("article");
  if (articleElements.length > 0) {
    console.log(`Found ${articleElements.length} <article> elements - focusing only on these`);
    articleElements.each((_, element) => {
      const $article = $(element);

      // Get text only from within this article element
      const articleText = $article.text().trim();

      // Find title - look for h1, h2, or strong text within article
      let title = $article.find("h1").first().text().trim() ||
                  $article.find("h2").first().text().trim() ||
                  $article.find("strong").first().text().trim();

      // Find link within article
      const href = $article.find("a[href*='/telegram/']").first().attr("href") || "";
      const link = href ? (href.startsWith("http") ? href : `https://www.placera.se${href}`) : "";

      // Find date
      const timeEl = $article.find("time");
      let pubDate = timeEl.attr("datetime") || "";
      if (!pubDate) {
        const dateStr = extractDateFromText(articleText);
        pubDate = dateStr ? parseSwedishDate(dateStr) : new Date().toISOString();
      }

      // Get description from article content
      const description = $article.find("p").first().text().trim().slice(0, 200);

      if (title && title.length > 5) {
        articles.push({
          title,
          link: link || sourceUrl,
          pubDate,
          description,
          source: `Placera ${category} (${sourceUrl})`,
          category,
          ticker: extractTicker(title),
        });
      }
    });

    if (articles.length > 0) {
      console.log(`Parsed ${articles.length} articles from <article> elements`);
      return articles;
    }
  }

  // PRIORITY 2: Modern Placera Search Page (placera.se/search?q=...)
  if (category === "search") {
    const seenSearchLinks = new Set<string>();
    $("a").each((_, element) => {
      const $a = $(element);
      const href = $a.attr("href") || "";
      if (
        (href.includes("/telegram/") || href.includes("/nyheter/") || href.includes("/pressmeddelande/") || href.includes("/analys/")) &&
        !seenSearchLinks.has(href)
      ) {
        seenSearchLinks.add(href);
        const title = $a.find("h2, h3, strong").first().text().trim() || $a.text().trim();
        const parentText = $a.parent().text().replace(/\s+/g, " ").trim();
        const fullLink = href.startsWith("http") ? href : `https://www.placera.se${href}`;

        const dateStr = extractDateFromText(parentText) || extractDateFromUrl(href);
        const pubDate = dateStr ? parseSwedishDate(dateStr) : new Date().toISOString();

        if (title && title.length > 5) {
          articles.push({
            title: title.replace(/\s+/g, " "),
            link: fullLink,
            pubDate,
            description: parentText.slice(0, 200),
            source: `Placera search (${sourceUrl})`,
            category: "search",
            ticker: extractTicker(title),
          });
        }
      }
    });

    if (articles.length > 0) {
      console.log(`Parsed ${articles.length} articles from search page`);
      return articles;
    }
  }

  // PRIORITY 3: Try the legacy search page structure (.searchItem)
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
  const mode = searchParams.get("mode") || "both"; // "feed" | "search" | "both"
  const daysParam = searchParams.get("days");
  const days = daysParam ? Math.max(1, parseInt(daysParam, 10)) : 7;
  const stocksParam = searchParams.get("stocks") || searchParams.get("q") || "";
  const maxPagesParam = searchParams.get("maxPages");
  // Cap max pages to 2-3 per tab to keep total latency well under serverless timeouts
  const maxPages = maxPagesParam ? parseInt(maxPagesParam, 10) : Math.min(3, Math.max(1, Math.ceil(days / 3)));

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const stockList = stocksParam
    ? stocksParam.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  // Check cache
  const cacheKey = `${tab}-${mode}-${days}-${stocksParam}-${maxPages}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      articles: cached.data,
      totalFetched: cached.data.length,
      debug: {
        fetchStatus: "cached",
        mode,
        days,
        cutoff: cutoffDate.toISOString(),
      },
    });
  }

  try {
    let allArticles: PlaceraNewsItem[] = [];
    let totalHtmlLength = 0;
    const fetchStatuses: string[] = [];

    // 1. Feed Pagination Mode (or Both)
    if (mode === "feed" || mode === "both") {
      const tabsToFetch = tab === "all" ? ["telegram", "extern-analys", "pressmeddelande"] : [tab];
      
      const tabResults = await Promise.all(
        tabsToFetch.map(t => fetchPaginatedTab(t, cutoffDate, maxPages))
      );

      for (let i = 0; i < tabsToFetch.length; i++) {
        const t = tabsToFetch[i];
        const res = tabResults[i];
        allArticles.push(...res.articles);
        totalHtmlLength += res.totalBytes;
        fetchStatuses.push(`${t}: ${res.articles.length} articles (${res.pagesFetched} pages)`);
      }
    }

    // 2. Stock-Specific Search Mode (or Both)
    if ((mode === "search" || mode === "both") && stockList.length > 0) {
      const searchRes = await fetchStocksSearch(stockList, cutoffDate);
      allArticles.push(...searchRes.articles);
      totalHtmlLength += searchRes.totalBytes;
      fetchStatuses.push(`stock-search: ${searchRes.articles.length} articles for ${stockList.length} stocks`);
    } else if (mode === "search" && stockList.length === 0) {
      // If search mode is requested but no stocks provided, fallback to default search page
      const generalSearch = await fetchSearchPage();
      allArticles.push(...generalSearch.articles);
      totalHtmlLength += generalSearch.bytes;
      fetchStatuses.push(`general-search: ${generalSearch.articles.length} articles`);
    }

    // Sort by date (newest first)
    allArticles.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });

    // Remove duplicates by title and link
    const seen = new Set<string>();
    const uniqueArticles = allArticles.filter(article => {
      const key = (article.link || article.title).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter to ensure only articles within the requested cutoff date
    const filteredArticles = uniqueArticles.filter(article => {
      const d = new Date(article.pubDate);
      return isNaN(d.getTime()) || d >= cutoffDate;
    });

    // Cache the result
    cache.set(cacheKey, { data: filteredArticles, timestamp: Date.now() });

    const result: NewsResponse = {
      articles: filteredArticles,
      totalFetched: filteredArticles.length,
      debug: {
        htmlLength: totalHtmlLength,
        fetchStatus: fetchStatuses.join(", "),
        mode,
        days,
        cutoff: cutoffDate.toISOString(),
        totalBeforeCutoff: uniqueArticles.length,
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
