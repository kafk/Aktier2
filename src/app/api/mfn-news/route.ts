import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface MfnNewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  category: string;
  ticker?: string;
  author?: string;
  isRegulatory?: boolean;
}

// In-memory cache for MFN news
const mfnCache = new Map<string, { data: MfnNewsItem[]; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Extract company / author from title or link
function extractCompanyFromMfnLink(link: string): string {
  const match = link.match(/mfn\.se\/(?:one\/)?a\/([a-z0-9-]+)\//i);
  if (match && match[1]) {
    return match[1].replace(/-/g, " ").toUpperCase();
  }
  return "";
}

// Fetch and parse MFN RSS feed (https://mfn.se/all/s/nordic.rss)
async function fetchMfnRssFeed(): Promise<MfnNewsItem[]> {
  try {
    const url = "https://mfn.se/all/s/nordic.rss";
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });

    if (!response.ok) {
      console.error(`MFN RSS HTTP ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items: MfnNewsItem[] = [];

    $("item").each((_, element) => {
      const $item = $(element);
      const title = $item.find("title").text().trim();
      const link = $item.find("link").text().trim() || $item.find("guid").text().trim();
      const rawPubDate = $item.find("pubDate").text().trim();
      const description = $item.find("description").text().trim();
      const tags = $item.find("x\\:tag, tag").map((__, el) => $(el).text()).get();
      const isRegulatory = tags.some((t) => t.includes("regulatory") || t.includes("mar"));
      const author = extractCompanyFromMfnLink(link);

      // Parse date to ISO string
      let pubDate = new Date().toISOString();
      if (rawPubDate) {
        const d = new Date(rawPubDate);
        if (!isNaN(d.getTime())) {
          pubDate = d.toISOString();
        }
      }

      if (title && link) {
        items.push({
          title,
          link,
          pubDate,
          description: description.slice(0, 300),
          source: "MFN.se",
          category: isRegulatory ? "regulatory" : "pressmeddelande",
          author,
          isRegulatory,
        });
      }
    });

    return items;
  } catch (err) {
    console.error("Error fetching MFN RSS:", err);
    return [];
  }
}

// Fetch and parse MFN HTML page (https://mfn.se/all/s/nordic)
async function fetchMfnHtmlFeed(): Promise<MfnNewsItem[]> {
  try {
    const url = "https://mfn.se/all/s/nordic";
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const items: MfnNewsItem[] = [];

    $(".short-item").each((_, element) => {
      const $el = $(element);
      const titleLink = $el.find(".compressed-title a");
      const title = titleLink.text().trim() || titleLink.attr("title") || "";
      const rawHref = titleLink.attr("href") || "";
      const link = rawHref.startsWith("http") ? rawHref : `https://mfn.se${rawHref}`;

      const dateStr = $el.find(".compressed-date").text().trim();
      const timeStr = $el.find(".compressed-time").text().trim();
      const author = $el.find(".compressed-author a").text().trim();

      let pubDate = new Date().toISOString();
      if (dateStr && timeStr) {
        // MFN dates on the Swedish feed are Europe/Stockholm time
        const d = new Date(`${dateStr}T${timeStr}+02:00`);
        if (!isNaN(d.getTime())) {
          pubDate = d.toISOString();
        }
      }

      if (title && link && link !== "https://mfn.se") {
        items.push({
          title,
          link,
          pubDate,
          description: "",
          source: "MFN.se",
          category: "pressmeddelande",
          author,
        });
      }
    });

    return items;
  } catch (err) {
    console.error("Error fetching MFN HTML:", err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const daysParam = searchParams.get("days");
  const days = daysParam ? Math.max(1, parseInt(daysParam, 10)) : 7;
  const stocksParam = searchParams.get("stocks") || "";

  const cacheKey = `mfn-${days}-${stocksParam}`;
  const cached = mfnCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      articles: cached.data,
      totalFetched: cached.data.length,
      source: "cache",
    });
  }

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  try {
    // 1. Fetch RSS feed (primary, rich and fast)
    const rssItems = await fetchMfnRssFeed();

    // 2. Fetch HTML feed if RSS gave low item count
    let combinedItems = [...rssItems];
    if (combinedItems.length < 20) {
      const htmlItems = await fetchMfnHtmlFeed();
      const seen = new Set(combinedItems.map((i) => i.link));
      for (const h of htmlItems) {
        if (!seen.has(h.link)) {
          combinedItems.push(h);
          seen.add(h.link);
        }
      }
    }

    // 3. Filter by date cutoff
    let filtered = combinedItems.filter((item) => {
      const itemDate = new Date(item.pubDate);
      return isNaN(itemDate.getTime()) || itemDate >= cutoffDate;
    });

    // 4. Sort descending (newest first)
    filtered.sort((a, b) => {
      const tA = new Date(a.pubDate).getTime() || 0;
      const tB = new Date(b.pubDate).getTime() || 0;
      return tB - tA;
    });

    mfnCache.set(cacheKey, { data: filtered, timestamp: Date.now() });

    return NextResponse.json({
      articles: filtered,
      totalFetched: filtered.length,
      source: "live",
      cutoff: cutoffDate.toISOString(),
    });
  } catch (error) {
    console.error("MFN API route error:", error);
    return NextResponse.json(
      { error: "Failed to scrape MFN news", articles: [] },
      { status: 500 }
    );
  }
}
