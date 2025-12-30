export interface Stock {
  symbol: string;
  name: string;
}

export interface ScraperKeyword {
  id: string;
  keyword: string;
  source: "classification" | "custom";
  classificationId?: string;
  classificationName?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  matchedStock: string;
  matchedKeywords: string[];
  sentiment: "positive" | "negative" | "neutral";
  impactScore: number;

  // Event classification
  eventType?: string;
  eventCode?: string;

  // Price tracking (all optional, populated over time)
  priceAtEvent?: number;
  price1h?: number | null;
  price1d?: number | null;

  // Index prices (SPY for market adjustment)
  indexPriceAtEvent?: number;
  indexPrice1h?: number | null;
  indexPrice1d?: number | null;

  // Calculated metrics
  stockAbsMove1h?: number | null;
  stockAbsMove1d?: number | null;
  newsMove1h?: number | null;
  newsMove1d?: number | null;
  newsImpact1h?: number | null;
  newsImpact1d?: number | null;

  // Baselines
  baseline1h?: number;
  baseline1d?: number;

  // Status
  priceTrackingStatus?: "pending" | "1h_complete" | "1d_complete";
  is1hTruncated?: boolean;
}

export interface ScraperConfig {
  stocks: Stock[];
  keywords: ScraperKeyword[];
  daysToScrape: number;
  notificationLimit: number;
}

export interface ScraperState {
  isRunning: boolean;
  isPaused: boolean;
  progress: number;
  totalArticlesScanned: number;
  matchedArticles: NewsArticle[];
  notificationCount: number;
}

// Popular stocks for quick selection
export const popularStocks: Stock[] = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "PG", name: "Procter & Gamble Co." },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "UNH", name: "UnitedHealth Group Inc." },
  { symbol: "HD", name: "Home Depot Inc." },
  { symbol: "DIS", name: "Walt Disney Co." },
  { symbol: "BAC", name: "Bank of America Corp." },
  { symbol: "ADBE", name: "Adobe Inc." },
  { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "NFLX", name: "Netflix Inc." },
];
