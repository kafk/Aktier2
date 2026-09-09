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

  // Data source tracking
  priceSource?: "polygon" | "yahoo" | "google" | "none";
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
  // 🇺🇸 US Tech & Mega Caps
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Google / Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "AMD", name: "AMD" },
  { symbol: "NFLX", name: "Netflix" },
  { symbol: "PLTR", name: "Palantir" },
  { symbol: "COIN", name: "Coinbase" },
  { symbol: "DIS", name: "Disney" },
  { symbol: "JPM", name: "JPMorgan Chase" },
  { symbol: "V", name: "Visa" },
  { symbol: "WMT", name: "Walmart" },
  { symbol: "CRM", name: "Salesforce" },
  { symbol: "ADBE", name: "Adobe" },
  { symbol: "INTC", name: "Intel" },
  { symbol: "QCOM", name: "Qualcomm" },
  { symbol: "UBER", name: "Uber" },

  // 🇸🇪 Swedish Stocks (OMXS30 & Popular)
  { symbol: "VOLV B", name: "Volvo" },
  { symbol: "ERIC B", name: "Ericsson" },
  { symbol: "INVE B", name: "Investor" },
  { symbol: "EVO", name: "Evolution" },
  { symbol: "AZN", name: "AstraZeneca" },
  { symbol: "ATCO A", name: "Atlas Copco" },
  { symbol: "HM B", name: "H&M" },
  { symbol: "SAAB B", name: "Saab" },
  { symbol: "SEB A", name: "SEB" },
  { symbol: "SWED A", name: "Swedbank" },
  { symbol: "SHB A", name: "Handelsbanken" },
  { symbol: "NDA SE", name: "Nordea" },
  { symbol: "NIBE B", name: "NIBE Industrier" },
  { symbol: "SAND", name: "Sandvik" },
  { symbol: "SINCH", name: "Sinch" },
  { symbol: "EMBRAC B", name: "Embracer" },
  { symbol: "ESSITY B", name: "Essity" },
  { symbol: "TELIA", name: "Telia Company" },
  { symbol: "SBB B", name: "Samhällsbyggnadsbolaget" },
  { symbol: "EQT", name: "EQT" },
];

