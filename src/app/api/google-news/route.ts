import { NextRequest, NextResponse } from "next/server";

interface GoogleNewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}

interface NewsResponse {
  symbol: string;
  articles: GoogleNewsItem[];
  error?: string;
}

// Parse Google News RSS XML
function parseGoogleRSS(xml: string): GoogleNewsItem[] {
  const items: GoogleNewsItem[] = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");
    const description = extractTag(itemXml, "description");
    const source = extractSource(itemXml) || "Google News";

    if (title && link) {
      items.push({
        title: decodeHtmlEntities(cleanTitle(title)),
        link: extractActualLink(link),
        pubDate,
        description: decodeHtmlEntities(description || ""),
        source,
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

// Extract source from Google News format (usually in title after " - ")
function extractSource(xml: string): string {
  const sourceMatch = xml.match(/<source[^>]*>([^<]+)<\/source>/i);
  if (sourceMatch) return sourceMatch[1].trim();

  // Fallback: extract from title
  const title = extractTag(xml, "title");
  const dashIndex = title.lastIndexOf(" - ");
  if (dashIndex > 0) {
    return title.substring(dashIndex + 3).trim();
  }
  return "";
}

// Clean title by removing source suffix
function cleanTitle(title: string): string {
  const dashIndex = title.lastIndexOf(" - ");
  if (dashIndex > 0) {
    return title.substring(0, dashIndex).trim();
  }
  return title;
}

// Google News links are redirects - try to extract actual URL
function extractActualLink(link: string): string {
  // Google News links look like: https://news.google.com/rss/articles/...
  // The actual URL is often in a different format, but we'll keep the Google link
  // as it will redirect to the actual article
  return link;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, ""); // Remove HTML tags from description
}

// Format date as YYYY-MM-DD for Google News
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");
  const days = parseInt(searchParams.get("days") || "30");

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build Google News search query
    // Search for stock symbol and company-related terms
    const query = `${symbol} stock OR ${symbol} shares`;
    const afterDate = formatDate(startDate);
    const beforeDate = formatDate(endDate);

    // Google News RSS with date filters
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+after:${afterDate}+before:${beforeDate}&hl=en-US&gl=US&ceid=US:en`;

    console.log(`Fetching Google News for ${symbol}: ${rssUrl}`);

    const response = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`Google News HTTP ${response.status} for ${symbol}`);
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const xml = await response.text();
    const articles = parseGoogleRSS(xml);

    console.log(`Google News: Found ${articles.length} articles for ${symbol}`);

    const result: NewsResponse = {
      symbol: symbol.toUpperCase(),
      articles,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error fetching Google News for ${symbol}:`, error);
    return NextResponse.json(
      {
        symbol: symbol.toUpperCase(),
        articles: [],
        error: "Failed to fetch news from Google"
      },
      { status: 500 }
    );
  }
}
