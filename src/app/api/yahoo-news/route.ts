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

  const articles: YahooNewsItem[] = [];
  const seenLinks = new Set<string>();

  // 1. Try Yahoo Search API first
  try {
    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=30`;
    console.log(`Fetching Yahoo search news: ${searchUrl}`);

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 300 },
    });

    if (searchResponse.ok) {
      const data = await searchResponse.json();
      if (data.news && Array.isArray(data.news)) {
        for (const item of data.news) {
          if (item.title && item.link && !seenLinks.has(item.link)) {
            seenLinks.add(item.link);
            articles.push({
              title: item.title,
              link: item.link,
              pubDate: item.providerPublishTime
                ? new Date(item.providerPublishTime * 1000).toISOString()
                : new Date().toISOString(),
              description: item.summary || "",
              source: item.publisher || "Yahoo Finance",
            });
          }
        }
      }
    }
  } catch (searchError) {
    console.warn("Yahoo search API failed:", searchError);
  }

  // 2. Also fetch RSS feed for additional articles
  try {
    const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
    console.log(`Fetching Yahoo RSS: ${rssUrl}`);

    const rssResponse = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 300 },
    });

    if (rssResponse.ok) {
      const xml = await rssResponse.text();
      const rssArticles = parseRSS(xml);
      for (const item of rssArticles) {
        if (!seenLinks.has(item.link)) {
          seenLinks.add(item.link);
          articles.push(item);
        }
      }
    }
  } catch (rssError) {
    console.warn("Yahoo RSS failed:", rssError);
  }

  // Sort by date (newest first)
  articles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  const result: NewsResponse = {
    symbol: symbol.toUpperCase(),
    articles,
    totalFetched: articles.length,
    debug: {
      apiUsed: "search+rss",
      rawCount: articles.length,
    },
  };

  return NextResponse.json(result);
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
