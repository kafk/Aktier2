export interface BacktestingSummary {
  avgMoveHighScore: number;      // Avg 1D move for score >= 7
  baselineMove: number;          // Baseline avg move
  hitRate: number;               // % of alerts with >= 3% move
  hitThreshold: number;          // The threshold (3%)
  totalAlerts: number;
  highScoreAlerts: number;       // Alerts with score >= 7
  dateRange: string;
  market: string;
}

export interface ScorePerformance {
  score: number;
  avgImpact: number;
  sampleSize: number;
}

export interface EventPerformance {
  eventType: string;
  eventCode: string;
  alertCount: number;
  avgImpact: number;
  hitRate: number;              // % with >= 3% move
}

export interface FalsePositive {
  id: string;
  ticker: string;
  eventType: string;
  eventCode: string;
  score: number;
  actualImpact: number;
  reason: string;
  date: string;
  title: string;
}

export interface BacktestingFilters {
  dateRange: "30d" | "90d" | "1y";
  market: "US" | "EU" | "ALL";
}

// Mock data generators
export function generateMockSummary(filters: BacktestingFilters): BacktestingSummary {
  const multiplier = filters.dateRange === "1y" ? 1.2 : filters.dateRange === "90d" ? 1.1 : 1;
  return {
    avgMoveHighScore: 4.8 * multiplier,
    baselineMove: 1.6,
    hitRate: 68,
    hitThreshold: 3,
    totalAlerts: Math.floor(247 * multiplier),
    highScoreAlerts: Math.floor(89 * multiplier),
    dateRange: filters.dateRange === "30d" ? "Last 30 days" : filters.dateRange === "90d" ? "Last 90 days" : "Last year",
    market: filters.market === "US" ? "US Stocks" : filters.market === "EU" ? "EU Stocks" : "All Markets",
  };
}

export function generateMockScorePerformance(): ScorePerformance[] {
  return [
    { score: 3, avgImpact: 0.8, sampleSize: 45 },
    { score: 4, avgImpact: 1.4, sampleSize: 52 },
    { score: 5, avgImpact: 2.1, sampleSize: 61 },
    { score: 6, avgImpact: 3.2, sampleSize: 48 },
    { score: 7, avgImpact: 4.5, sampleSize: 42 },
    { score: 8, avgImpact: 6.1, sampleSize: 31 },
    { score: 9, avgImpact: 8.0, sampleSize: 16 },
    { score: 10, avgImpact: 9.2, sampleSize: 5 },
  ];
}

export function generateMockEventPerformance(): EventPerformance[] {
  return [
    { eventType: "SEC Investigation", eventCode: "SEC_INVESTIGATION", alertCount: 7, avgImpact: 7.8, hitRate: 86 },
    { eventType: "Guidance Cut", eventCode: "GUIDANCE_CUT", alertCount: 18, avgImpact: 6.4, hitRate: 78 },
    { eventType: "Earnings Miss", eventCode: "EARNINGS_MISS", alertCount: 22, avgImpact: 5.9, hitRate: 73 },
    { eventType: "FDA Rejection", eventCode: "FDA_REJECTION", alertCount: 5, avgImpact: 8.2, hitRate: 80 },
    { eventType: "Bankruptcy", eventCode: "BANKRUPTCY", alertCount: 3, avgImpact: 12.1, hitRate: 100 },
    { eventType: "Earnings Beat", eventCode: "EARNINGS_BEAT", alertCount: 28, avgImpact: 4.2, hitRate: 61 },
    { eventType: "FDA Approval", eventCode: "FDA_APPROVAL", alertCount: 8, avgImpact: 6.8, hitRate: 75 },
    { eventType: "Acquisition/Merger", eventCode: "ACQUISITION", alertCount: 12, avgImpact: 5.1, hitRate: 67 },
    { eventType: "CEO Change", eventCode: "CEO_CHANGE", alertCount: 9, avgImpact: 3.8, hitRate: 44 },
    { eventType: "Layoffs", eventCode: "LAYOFFS", alertCount: 15, avgImpact: 2.9, hitRate: 40 },
    { eventType: "Product Launch", eventCode: "PRODUCT_LAUNCH", alertCount: 31, avgImpact: 1.6, hitRate: 19 },
    { eventType: "Partnership", eventCode: "PARTNERSHIP", alertCount: 24, avgImpact: 1.8, hitRate: 25 },
  ];
}

export function generateMockFalsePositives(): FalsePositive[] {
  return [
    {
      id: "fp1",
      ticker: "AAPL",
      eventType: "Earnings Beat",
      eventCode: "EARNINGS_BEAT",
      score: 7,
      actualImpact: 0.8,
      reason: "Priced in",
      date: "2024-12-15",
      title: "Apple beats Q4 expectations with strong iPhone sales",
    },
    {
      id: "fp2",
      ticker: "TSLA",
      eventType: "Partnership",
      eventCode: "PARTNERSHIP",
      score: 8,
      actualImpact: 1.1,
      reason: "Weak source",
      date: "2024-12-12",
      title: "Tesla rumored to partner with major battery supplier",
    },
    {
      id: "fp3",
      ticker: "MSFT",
      eventType: "Product Launch",
      eventCode: "PRODUCT_LAUNCH",
      score: 7,
      actualImpact: 0.5,
      reason: "Expected announcement",
      date: "2024-12-10",
      title: "Microsoft unveils new AI features for Office 365",
    },
    {
      id: "fp4",
      ticker: "GOOGL",
      eventType: "Analyst Upgrade",
      eventCode: "UPGRADE",
      score: 7,
      actualImpact: 1.2,
      reason: "Minor firm",
      date: "2024-12-08",
      title: "Alphabet upgraded to Buy by regional analyst",
    },
    {
      id: "fp5",
      ticker: "AMZN",
      eventType: "Guidance Raised",
      eventCode: "GUIDANCE_RAISE",
      score: 8,
      actualImpact: 0.9,
      reason: "Already at ATH",
      date: "2024-12-05",
      title: "Amazon raises Q1 guidance citing strong AWS growth",
    },
    {
      id: "fp6",
      ticker: "META",
      eventType: "Stock Buyback",
      eventCode: "STOCK_BUYBACK",
      score: 7,
      actualImpact: 0.4,
      reason: "Routine buyback",
      date: "2024-12-03",
      title: "Meta announces additional $10B stock repurchase program",
    },
  ];
}

export const falsePositiveReasons = [
  "Priced in",
  "Weak source",
  "Expected announcement",
  "Minor firm",
  "Already at ATH",
  "Routine buyback",
  "Market noise",
  "Sector rotation",
  "Low volume",
  "Other",
];
