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
  const match = link.match(/mfn\.se\/(?:cis\/|one\/)?a\/([a-z0-9-]+)\//i);
  if (match && match[1]) {
    return match[1].replace(/-/g, " ").toUpperCase();
  }
  return "";
}

// MFN company slug mappings for popular Nordic stocks
const MFN_SLUG_MAP: Record<string, string> = {
  "VOLV B": "volvo",
  "VOLV A": "volvo",
  "VOLVO": "volvo",
  "ERIC B": "ericsson",
  "ERIC A": "ericsson",
  "ERICSSON": "ericsson",
  "INVE B": "investor",
  "INVE A": "investor",
  "INVESTOR": "investor",
  "EVO": "evolution",
  "EVOLUTION": "evolution",
  "HM B": "hm",
  "H&M": "hm",
  "AZN": "astrazeneca",
  "ASTRAZENECA": "astrazeneca",
  "SAAB B": "saab",
  "SAAB": "saab",
  "ATCO A": "atlas-copco",
  "ATCO B": "atlas-copco",
  "ATLAS COPCO": "atlas-copco",
  "SWED A": "swedbank",
  "SWEDBANK": "swedbank",
  "SEB A": "seb",
  "SEB C": "seb",
  "SEB": "seb",
  "SHB A": "handelsbanken",
  "SHB B": "handelsbanken",
  "HANDELSBANKEN": "handelsbanken",
  "NDA SE": "nordea",
  "NORDEA": "nordea",
  "SAND": "sandvik",
  "SANDVIK": "sandvik",
  "EQT": "eqt",
  "HEXA B": "hexagon",
  "HEXAGON": "hexagon",
  "NIBE B": "nibe-industrier",
  "NIBE": "nibe-industrier",
  "ESSITY B": "essity",
  "ESSITY A": "essity",
  "ESSITY": "essity",
  "BOL": "boliden",
  "BOLIDEN": "boliden",
  "ALFA": "alfa-laval",
  "ALFA LAVAL": "alfa-laval",
  "SKF B": "skf",
  "SKF A": "skf",
  "SKF": "skf",
  "SCA B": "sca",
  "SCA A": "sca",
  "SCA": "sca",
  "TELIA": "telia-company",
  "TEL2 B": "tele2",
  "TEL2 A": "tele2",
  "TELE2": "tele2",
  "GETI B": "getinge",
  "GETINGE": "getinge",
  "ELUX B": "electrolux",
  "ELECTROLUX": "electrolux",
  "KINV B": "kinnevik",
  "KINNEVIK": "kinnevik",
  "SINCH": "sinch",
  "CAST": "castellum",
  "CASTELLUM": "castellum",
  "BALD B": "fastighets-ab-balder",
  "BALDER": "fastighets-ab-balder",
  "FABG": "fabege",
  "FABEGE": "fabege",
  "SBB B": "samhallsbyggnadsbolaget-i-norden",
  "SBB": "samhallsbyggnadsbolaget-i-norden",
  "EMBRAC B": "embracer-group",
  "EMBRACER": "embracer-group",
  "FLAT B": "flat-capital",
  "FLAT": "flat-capital",
  "KLAR": "klarna",
  "KLARNA": "klarna",
  "RUSTA": "rusta",
  "YUBICO": "yubico",
  "STORY B": "storytel",
  "STORYTEL": "storytel",
  "PDX": "paradox-interactive",
  "PARADOX": "paradox-interactive",
  "VIVA": "viva-wine-group",
  "CINT": "cint-group",
  "BONES": "bonesupport-holding",
  "RVRC": "revolutionrace",
  "HAYPP": "haypp-group",
  "LYKO A": "lyko-group",
  "SYNSAM": "synsam",
  "QLIRO": "qliro",
  "THULE": "thule-group",
  "AXFO": "axfood",
  "NCC B": "ncc",
  "PEAB B": "peab",
  "SECU B": "securitas",
  "BILL": "billerud",
  "HUSQ B": "husqvarna",
  "SOBI": "swedish-orphan-biovitrum",
  "HEM": "hemnet-group",
  "NOMI": "nordnet",
  "TRUE B": "truecaller",
  "AFRY": "afry",
  "BETS B": "betsson",
  "JM": "jm",
  "CLAS B": "clas-ohlson",
  "BILI A": "bilia",
  "COOR": "coor-service-management",
  "ATT": "attendo",
};

function resolveMfnSlug(symbolOrNameOrUrl: string): string {
  const clean = symbolOrNameOrUrl.trim();
  // Check if it's a URL like https://mfn.se/all/a/volvo
  const urlMatch = clean.match(/mfn\.se\/(?:all\/|cis\/|one\/)?a\/([a-z0-9-]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].toLowerCase();
  }

  const upper = clean.toUpperCase();
  if (MFN_SLUG_MAP[upper]) {
    return MFN_SLUG_MAP[upper];
  }

  // Fallback: clean to lowercase hyphenated slug
  return clean
    .toLowerCase()
    .replace(/\s+(a|b|c)$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Fetch and parse MFN RSS feed with multi-year offset pagination and company slug support
async function fetchMfnRssFeed(
  isReportsOnly = false,
  cutoffDate?: Date,
  maxPages = 25,
  companySlug?: string
): Promise<MfnNewsItem[]> {
  const allItems: MfnNewsItem[] = [];
  const seenLinks = new Set<string>();
  const limit = 192;
  let offset = 0;

  const cleanSlug = companySlug ? resolveMfnSlug(companySlug) : undefined;

  for (let page = 0; page < maxPages; page++) {
    try {
      let baseUrl = "";
      if (cleanSlug) {
        baseUrl = isReportsOnly
          ? `https://mfn.se/all/a/${encodeURIComponent(cleanSlug)}.rss?filter=(and(or(.properties.tags%40%3E%5B%22sub%3Areport%22%5D)))&limit=${limit}&offset=${offset}`
          : `https://mfn.se/all/a/${encodeURIComponent(cleanSlug)}.rss?limit=${limit}&offset=${offset}`;
      } else {
        baseUrl = isReportsOnly
          ? `https://mfn.se/all/s/nordic.rss?filter=(and(or(.properties.tags%40%3E%5B%22sub%3Areport%22%5D)))&limit=${limit}&offset=${offset}`
          : `https://mfn.se/all/s/nordic.rss?limit=${limit}&offset=${offset}`;
      }

      const response = await fetch(baseUrl, {
        signal: AbortSignal.timeout(12000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
        },
      });

      if (!response.ok) {
        if (response.status === 404 && cleanSlug) {
          console.warn(`MFN RSS 404 for company slug "${cleanSlug}" at offset ${offset}`);
        } else {
          console.error(`MFN RSS HTTP ${response.status} for ${cleanSlug || "all"} at offset ${offset}`);
        }
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
        const author = extractCompanyFromMfnLink(link) || (cleanSlug ? cleanSlug.toUpperCase() : "");

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
      console.error(`Error fetching MFN RSS for ${cleanSlug || "all"} at offset ${offset}:`, err);
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
  const companyParam = searchParams.get("company") || searchParams.get("slug") || searchParams.get("author") || "";
  const urlParam = searchParams.get("url") || "";
  const filterParam = searchParams.get("filter") || "";
  const isReportsOnly = filterParam === "reports" || searchParams.get("reports") === "true";
  const modeParam = searchParams.get("mode") || "auto"; // "auto" | "company" | "feed"

  const directSlug = urlParam ? resolveMfnSlug(urlParam) : companyParam ? resolveMfnSlug(companyParam) : "";

  const cacheKey = `mfn-${days}-${stocksParam}-${directSlug}-${modeParam}-${isReportsOnly ? "reports" : "all"}`;
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
  const maxPages = isReportsOnly
    ? Math.min(60, Math.max(2, Math.ceil(days / 45) * 2))
    : Math.min(30, Math.max(1, Math.ceil(days / 15)));

  try {
    let rssItems: MfnNewsItem[] = [];

    // Case 1: Direct single company slug or URL (e.g. https://mfn.se/all/a/volvo or company=volvo)
    if (directSlug) {
      rssItems = await fetchMfnRssFeed(isReportsOnly, cutoffDate, maxPages, directSlug);
    }
    // Case 2: Selected stocks in company mode (or auto when stocks are provided)
    else if (stocksParam && (modeParam === "company" || modeParam === "targeted")) {
      const stockList = stocksParam.split(",").map((s) => s.trim()).filter(Boolean);
      const uniqueSlugs = Array.from(new Set(stockList.map((s) => resolveMfnSlug(s)).filter(Boolean)));

      const companyResults = await Promise.all(
        uniqueSlugs.slice(0, 15).map((slug) =>
          fetchMfnRssFeed(isReportsOnly, cutoffDate, Math.min(10, maxPages), slug)
        )
      );

      const seen = new Set<string>();
      for (const res of companyResults) {
        for (const item of res) {
          if (!seen.has(item.link)) {
            seen.add(item.link);
            rssItems.push(item);
          }
        }
      }
    }
    // Case 3: Market-wide Nordic feed
    else {
      rssItems = await fetchMfnRssFeed(isReportsOnly, cutoffDate, maxPages);

      // Fetch HTML fallback if RSS gave low item count and short time window
      if (rssItems.length < 20 && days <= 14) {
        const htmlItems = await fetchMfnHtmlFeed(isReportsOnly);
        const seen = new Set(rssItems.map((i) => i.link));
        for (const h of htmlItems) {
          if (!seen.has(h.link)) {
            rssItems.push(h);
            seen.add(h.link);
          }
        }
      }
    }

    // Filter by date cutoff
    let filtered = rssItems.filter((item) => {
      const itemDate = new Date(item.pubDate);
      return isNaN(itemDate.getTime()) || itemDate >= cutoffDate;
    });

    // Sort descending (newest first)
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
      companySlug: directSlug || undefined,
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
