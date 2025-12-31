import { NextRequest, NextResponse } from "next/server";

interface YahooNewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}

interface NewsResponse {
  symbol: string;
  articles: YahooNewsItem[];
  totalFetched: number;
  error?: string;
  debug?: {
    apiUsed: string;
    rawCount?: number;
  };
}

// Yahoo Finance JSON API response structure
interface YahooApiResponse {
  Content?: {
    result?: Array<{
      uuid?: string;
      title?: string;
      link?: string;
      published_at?: number;
      summary?: string;
      publisher?: string;
    }>;
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Try Yahoo Finance JSON API first (returns more articles)
    const jsonApiUrl = `https://query1.finance.yahoo.com/v2/finance/news?symbols=${encodeURIComponent(symbol)}`;

    console.log(`Fetching Yahoo news: ${jsonApiUrl}`);

    const response = await fetch(jsonApiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`Yahoo JSON API failed: ${response.status}, trying RSS fallback...`);
      return await fetchRSS(symbol);
    }

    const data = await response.json() as YahooApiResponse;
    console.log(`Yahoo API response received`);

    const articles: YahooNewsItem[] = [];

    if (data.Content?.result && Array.isArray(data.Content.result)) {
      for (const item of data.Content.result) {
        if (item.title && item.link) {
          articles.push({
            title: item.title,
            link: item.link,
            pubDate: item.published_at
              ? new Date(item.published_at * 1000).toISOString()
              : new Date().toISOString(),
            description: item.summary || "",
            source: item.publisher || "Yahoo Finance",
          });
        }
      }
    }

    console.log(`Yahoo JSON API: parsed ${articles.length} articles for ${symbol}`);

    // If JSON API returned no articles, try RSS fallback
    if (articles.length === 0) {
      console.log("JSON API returned 0 articles, trying RSS fallback...");
      return await fetchRSS(symbol);
    }

    const result: NewsResponse = {
      symbol: symbol.toUpperCase(),
      articles,
      totalFetched: articles.length,
      debug: {
        apiUsed: "json",
        rawCount: data.Content?.result?.length || 0,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    // Try RSS fallback on error
    return await fetchRSS(symbol);
  }
}

// RSS fallback function
async function fetchRSS(symbol: string): Promise<NextResponse> {
  try {
    const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;

    console.log(`Fetching Yahoo RSS: ${rssUrl}`);

    const response = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }

    const xml = await response.text();
    const articles = parseRSS(xml);

    console.log(`Yahoo RSS: parsed ${articles.length} articles for ${symbol}`);

    const result: NewsResponse = {
      symbol: symbol.toUpperCase(),
      articles,
      totalFetched: articles.length,
      debug: {
        apiUsed: "rss",
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error(`RSS fallback failed for ${symbol}:`, error);
    return NextResponse.json(
      {
        symbol: symbol.toUpperCase(),
        articles: [],
        totalFetched: 0,
        error: "Failed to fetch news from both JSON API and RSS",
        debug: {
          apiUsed: "none",
        },
      },
      { status: 500 }
    );
  }
}

// Parse RSS XML to extract news items
function parseRSS(xml: string): YahooNewsItem[] {
  const items: YahooNewsItem[] = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");
    const description = extractTag(itemXml, "description");
    const source = extractTag(itemXml, "source") || "Yahoo Finance";

    if (title && link) {
      items.push({
        title: decodeHtmlEntities(title),
        link,
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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
