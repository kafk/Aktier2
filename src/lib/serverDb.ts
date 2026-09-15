import fs from "fs";
import path from "path";
import { NewsArticle } from "@/types/scraper";

// Location for persistent server storage
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "scraped_articles.json");

// In-memory cache as fallback and speed layer
let memoryArticles: NewsArticle[] = [];
let isLoaded = false;

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("Could not create data directory, using memory store:", err);
  }
}

function loadArticlesFromDisk(): NewsArticle[] {
  if (isLoaded) return memoryArticles;

  try {
    ensureDataDir();
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryArticles = parsed;
          isLoaded = true;
          return memoryArticles;
        }
      }
    }
  } catch (err) {
    console.error("Error loading articles from disk:", err);
  }

  isLoaded = true;
  return memoryArticles;
}

function saveArticlesToDisk(articles: NewsArticle[]): boolean {
  memoryArticles = articles;
  try {
    ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(articles, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error saving articles to disk:", err);
    return false;
  }
}

/**
 * Get all stored articles with optional filtering, searching, and sorting
 */
export function getStoredArticles(options?: {
  stock?: string;
  sentiment?: string;
  eventType?: string;
  search?: string;
  days?: number;
  limit?: number;
  offset?: number;
}): { articles: NewsArticle[]; total: number } {
  let list = [...loadArticlesFromDisk()];

  // Sort descending by date (newest first)
  list.sort((a, b) => {
    const tA = new Date(a.publishedAt).getTime() || 0;
    const tB = new Date(b.publishedAt).getTime() || 0;
    return tB - tA;
  });

  if (options?.days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - options.days);
    list = list.filter((a) => {
      const d = new Date(a.publishedAt);
      return isNaN(d.getTime()) || d >= cutoff;
    });
  }

  if (options?.stock) {
    const stockUpper = options.stock.toUpperCase().trim();
    list = list.filter((a) => a.matchedStock.toUpperCase() === stockUpper);
  }

  if (options?.sentiment) {
    list = list.filter((a) => a.sentiment === options.sentiment);
  }

  if (options?.eventType) {
    list = list.filter((a) => a.eventType === options.eventType);
  }

  if (options?.search) {
    const q = options.search.toLowerCase().trim();
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.summary && a.summary.toLowerCase().includes(q)) ||
        a.matchedStock.toLowerCase().includes(q) ||
        (a.matchedKeywords && a.matchedKeywords.some((k) => k.toLowerCase().includes(q)))
    );
  }

  const total = list.length;
  const offset = options?.offset || 0;
  const limit = options?.limit || total;
  const paginated = list.slice(offset, offset + limit);

  return { articles: paginated, total };
}

/**
 * Save or upsert articles to server database
 */
export function saveOrUpdateArticles(newArticles: NewsArticle[]): { savedCount: number; totalCount: number } {
  const current = loadArticlesFromDisk();
  const map = new Map<string, NewsArticle>();

  // Index existing by URL or ID
  for (const item of current) {
    const key = item.url || item.id;
    map.set(key, item);
  }

  let savedCount = 0;
  for (const item of newArticles) {
    const key = item.url || item.id;
    if (!map.has(key)) {
      savedCount++;
    }
    // Update or insert
    map.set(key, { ...map.get(key), ...item });
  }

  const updatedList = Array.from(map.values());
  // Sort descending
  updatedList.sort((a, b) => {
    const tA = new Date(a.publishedAt).getTime() || 0;
    const tB = new Date(b.publishedAt).getTime() || 0;
    return tB - tA;
  });

  saveArticlesToDisk(updatedList);
  return { savedCount, totalCount: updatedList.length };
}

/**
 * Delete specific article by ID
 */
export function deleteStoredArticle(id: string): boolean {
  const current = loadArticlesFromDisk();
  const filtered = current.filter((a) => a.id !== id);
  if (filtered.length !== current.length) {
    saveArticlesToDisk(filtered);
    return true;
  }
  return false;
}

/**
 * Delete multiple articles by IDs
 */
export function deleteMultipleStoredArticles(ids: string[]): { deletedCount: number; remainingCount: number } {
  const idSet = new Set(ids);
  const current = loadArticlesFromDisk();
  const filtered = current.filter((a) => !idSet.has(a.id));
  const deletedCount = current.length - filtered.length;
  if (deletedCount > 0) {
    saveArticlesToDisk(filtered);
  }
  return { deletedCount, remainingCount: filtered.length };
}

/**
 * Clear all stored articles
 */
export function clearAllStoredArticles(): boolean {
  return saveArticlesToDisk([]);
}

/**
 * Convert articles to CSV format for Excel/Download
 */
export function exportArticlesToCsv(articles?: NewsArticle[]): string {
  const list = articles || loadArticlesFromDisk();

  const headers = [
    "Symbol",
    "Title",
    "Source",
    "Published At",
    "Sentiment",
    "Impact Score",
    "Event Type",
    "Event Price",
    "10m Price",
    "10m Move %",
    "15m Price",
    "15m Move %",
    "30m Price",
    "30m Move %",
    "1h Price",
    "1h Move %",
    "2h Price",
    "2h Move %",
    "1d Price",
    "1d Move %",
    "1w Price",
    "1w Move %",
    "Pre-Market Event",
    "Open 1m Price",
    "Open 1m Move %",
    "Open 15m Price",
    "Open 15m Move %",
    "Open 30m Price",
    "Open 30m Move %",
    "Open 1h Price",
    "Open 1h Move %",
    "Matched Keywords",
    "URL",
  ];

  const escapeCsv = (str: string | number | null | undefined): string => {
    if (str === null || str === undefined) return "";
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = list.map((a) => [
    escapeCsv(a.matchedStock),
    escapeCsv(a.title),
    escapeCsv(a.source),
    escapeCsv(a.publishedAt),
    escapeCsv(a.sentiment),
    escapeCsv(a.impactScore),
    escapeCsv(a.eventType || ""),
    escapeCsv(a.priceAtEvent?.toFixed(2)),
    escapeCsv(a.price10m?.toFixed(2)),
    escapeCsv(a.move10m !== null && a.move10m !== undefined ? a.move10m.toFixed(2) + "%" : ""),
    escapeCsv(a.price15m?.toFixed(2)),
    escapeCsv(a.move15m !== null && a.move15m !== undefined ? a.move15m.toFixed(2) + "%" : ""),
    escapeCsv(a.price30m?.toFixed(2)),
    escapeCsv(a.move30m !== null && a.move30m !== undefined ? a.move30m.toFixed(2) + "%" : ""),
    escapeCsv(a.price1h?.toFixed(2)),
    escapeCsv(a.move1h !== null && a.move1h !== undefined ? a.move1h.toFixed(2) + "%" : ""),
    escapeCsv(a.price2h?.toFixed(2)),
    escapeCsv(a.move2h !== null && a.move2h !== undefined ? a.move2h.toFixed(2) + "%" : ""),
    escapeCsv(a.price1d?.toFixed(2)),
    escapeCsv(a.move1d !== null && a.move1d !== undefined ? a.move1d.toFixed(2) + "%" : ""),
    escapeCsv(a.price1w?.toFixed(2)),
    escapeCsv(a.move1w !== null && a.move1w !== undefined ? a.move1w.toFixed(2) + "%" : ""),
    escapeCsv(a.isPreMarket ? "Yes" : "No"),
    escapeCsv(a.priceOpen1m?.toFixed(2)),
    escapeCsv(a.moveOpen1m !== null && a.moveOpen1m !== undefined ? a.moveOpen1m.toFixed(2) + "%" : ""),
    escapeCsv(a.priceOpen15m?.toFixed(2)),
    escapeCsv(a.moveOpen15m !== null && a.moveOpen15m !== undefined ? a.moveOpen15m.toFixed(2) + "%" : ""),
    escapeCsv(a.priceOpen30m?.toFixed(2)),
    escapeCsv(a.moveOpen30m !== null && a.moveOpen30m !== undefined ? a.moveOpen30m.toFixed(2) + "%" : ""),
    escapeCsv(a.priceOpen1h?.toFixed(2)),
    escapeCsv(a.moveOpen1h !== null && a.moveOpen1h !== undefined ? a.moveOpen1h.toFixed(2) + "%" : ""),
    escapeCsv(a.matchedKeywords?.join(", ")),
    escapeCsv(a.url),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
