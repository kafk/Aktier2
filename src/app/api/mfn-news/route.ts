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

// Fetch and parse MFN RSS feed with multi-year offset pagination
async function fetchMfnRssFeed(isReportsOnly = false, cutoffDate?: Date, maxPages = 25): Promise<MfnNewsItem[]> {
  const allItems: MfnNewsItem[] = [];
  const seenLinks = new Set<string>();
  const limit = 192;
  let offset = 0;

  for (let page = 0; page < maxPages; page++) {
    try {
      const baseUrl = isReportsOnly
        ? `https://mfn.se/all/s/nordic.rss?filter=(and(or(.properties.tags%40%3E%5B%22sub%3Areport%22%5D)))&limit=${limit}&offset=${offset}`
        : `https://mfn.se/all/s/nordic.rss?limit=${limit}&offset=${offset}`;

      const response = await fetch(baseUrl, {
        signal: AbortSignal.timeout(12000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
        },
      });

      if (!response.ok) {
        console.error(`MFN RSS HTTP ${response.status} at offset ${offset}`);
        break;
      }

      const xml = await response.text();
      const $ = cheerio.load(xml, { xmlMode: true });
      const pageItems: MfnNewsItem[] = [];
      let oldestTimeInPage: number | null = null;

      $("item").each((_, element) => {
        const $item = $(element);
        const title = $item.find("title").text().trim();
        const link = $item.find("link").text().trim() || $item.find("guid").text().trim();
        const rawPubDate = $item.find("pubDate").text().trim();
        const description = $item.find("description").text().trim();
        const tags = $item.find("x\\:tag, tag").map((__, el) => $(el).text()).get();
        const isRegulatory = tags.some((t) => t.includes("regulatory") || t.includes("mar"));
        const isReport = tags.some((t) => t.includes("report")) || isReportsOnly;
        const author = extractCompanyFromMfnLink(link);

        let pubDate = new Date().toISOString();
        if (rawPubDate) {
          const d = new Date(rawPubDate);
          const t = d.getTime();
          if (!isNaN(t)) {
            pubDate = d.toISOString();
            if (oldestTimeInPage === null || t < oldestTimeInPage) {
              oldestTimeInPage = t;
            }
          }
        }

        if (title && link && !seenLinks.has(link)) {
          seenLinks.add(link);
          let category = "pressmeddelande";
          if (isReport) {
            category = "rapport";
          } else if (isRegulatory) {
            category = "regulatory";
          }

          pageItems.push({
            title,
            link,
            pubDate,
            description: description.slice(0, 400),
            source: isReport ? "MFN.se (Rapport)" : "MFN.se",
            category,
            author,
            isRegulatory,
          });
        }
      });

      if (pageItems.length === 0) {
        break;
      }

      allItems.push(...pageItems);

      // If we have reached or passed the cutoff date, stop paginating
      if (cutoffDate && oldestTimeInPage !== null && oldestTimeInPage < cutoffDate.getTime()) {
        break;
      }

      // If page had fewer items than limit, reached the end of feed
      if (pageItems.length < limit) {
        break;
      }

      offset += limit;

      // Small delay between page fetches
      if (page < maxPages - 1) {
        await new Promise((r) => setTimeout(r, 120));
      }
    } catch (err) {
      console.error(`Error fetching MFN RSS at offset ${offset}:`, err);
      break;
    }
  }

  return allItems;
}

// Fetch and parse MFN HTML page (fallback)
async function fetchMfnHtmlFeed(isReportsOnly = false): Promise<MfnNewsItem[]> {
  try {
    const url = isReportsOnly
      ? "https://mfn.se/all/s/nordic?filter=(and(or(.properties.tags%40%3E%5B%22sub%3Areport%22%5D)))&limit=192"
      : "https://mfn.se/all/s/nordic";

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const items: MfnNewsItem[] = [];

    $(".short-item, .item").each((_, element) => {
      const $el = $(element);
      const titleLink = $el.find(".compressed-title a, a.title");
      const title = titleLink.text().trim() || titleLink.attr("title") || "";
      const rawHref = titleLink.attr("href") || "";
      const link = rawHref.startsWith("http") ? rawHref : `https://mfn.se${rawHref}`;

      const dateStr = $el.find(".compressed-date, .date").text().trim();
      const timeStr = $el.find(".compressed-time, .time").text().trim();
      const author = $el.find(".compressed-author a, .author").text().trim();

      let pubDate = new Date().toISOString();
      if (dateStr && timeStr) {
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
          source: isReportsOnly ? "MFN.se (Rapport)" : "MFN.se",
          category: isReportsOnly ? "rapport" : "pressmeddelande",
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
  const filterParam = searchParams.get("filter") || "";
  const isReportsOnly = filterParam === "reports" || searchParams.get("reports") === "true";

  const cacheKey = `mfn-${days}-${stocksParam}-${isReportsOnly ? "reports" : "all"}`;
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

  // Determine max pages based on number of days requested (e.g. 1-5 years)
  // For reports, ~200 reports is 1-2 months, ~1500 is a full year.
  const maxPages = isReportsOnly
    ? Math.min(60, Math.max(2, Math.ceil(days / 45) * 2))
    : Math.min(30, Math.max(1, Math.ceil(days / 15)));

  try {
    // 1. Fetch RSS feed with multi-page pagination
    const rssItems = await fetchMfnRssFeed(isReportsOnly, cutoffDate, maxPages);

    // 2. Fetch HTML feed if RSS gave low item count and days < 14
    let combinedItems = [...rssItems];
    if (combinedItems.length < 20 && days <= 14) {
      const htmlItems = await fetchMfnHtmlFeed(isReportsOnly);
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
      filter: isReportsOnly ? "reports" : "all",
      cutoff: cutoffDate.toISOString(),
      daysScraped: days,
    });
  } catch (error) {
    console.error("MFN API route error:", error);
    return NextResponse.json(
      { error: "Failed to scrape MFN news", articles: [] },
      { status: 500 }
    );
  }
}
