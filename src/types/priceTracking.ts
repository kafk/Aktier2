// Price tracking types based on the news-based price movement methodology

export interface PriceSnapshot {
  price: number;
  timestamp: string;
}

export interface PriceMovement {
  // Core price at news event
  priceAtEvent: number;

  // Multi-horizon prices (10m, 15m, 30m, 1h, 2h, 1d, 1w)
  price10m: number | null;
  price15m: number | null;
  price30m: number | null;
  price1h: number | null;
  price2h: number | null;
  price1d: number | null;
  price1w: number | null;

  // Multi-horizon percentage moves (% change relative to event)
  move10m: number | null;
  move15m: number | null;
  move30m: number | null;
  move1h: number | null;
  move2h: number | null;
  move1d: number | null;
  move1w: number | null;

  // Index prices (for market adjustment)
  indexPriceAtEvent: number;
  indexPrice1h: number | null;
  indexPrice1d: number | null;

  // Calculated moves (absolute values)
  stockAbsMove1h: number | null;  // |price1h - priceAtEvent| / priceAtEvent * 100
  stockAbsMove1d: number | null;

  // Market moves
  marketAbsMove1h: number | null;
  marketAbsMove1d: number | null;

  // News-specific moves (stock - market)
  newsMove1h: number | null;      // max(0, stockAbsMove1h - marketAbsMove1h)
  newsMove1d: number | null;

  // Baseline (normal stock volatility)
  baseline1h: number;             // Avg 1H move over last 60 days
  baseline1d: number;             // Avg 1D move over last 60 days

  // Final news impact (above normal)
  newsImpact1h: number | null;    // max(0, newsMove1h - baseline1h)
  newsImpact1d: number | null;

  // Status flags
  is1hTruncated: boolean;         // Market closed before 1h
  is1hComplete: boolean;
  is1dComplete: boolean;
}

export interface ImpactVerdict {
  label: "noise" | "mild" | "significant" | "major";
  threshold: number;
}

// Thresholds for 1H impact
export const IMPACT_THRESHOLDS_1H = {
  noise: 0.5,
  mild: 1.0,
  significant: 2.0,
  major: Infinity,
};

// Thresholds for 1D impact
export const IMPACT_THRESHOLDS_1D = {
  noise: 1.5,
  mild: 3.0,
  significant: 5.0,
  major: Infinity,
};

export function getImpactVerdict1h(impact: number): ImpactVerdict {
  if (impact < IMPACT_THRESHOLDS_1H.noise) return { label: "noise", threshold: IMPACT_THRESHOLDS_1H.noise };
  if (impact < IMPACT_THRESHOLDS_1H.mild) return { label: "mild", threshold: IMPACT_THRESHOLDS_1H.mild };
  if (impact < IMPACT_THRESHOLDS_1H.significant) return { label: "significant", threshold: IMPACT_THRESHOLDS_1H.significant };
  return { label: "major", threshold: IMPACT_THRESHOLDS_1H.major };
}

export function getImpactVerdict1d(impact: number): ImpactVerdict {
  if (impact < IMPACT_THRESHOLDS_1D.noise) return { label: "noise", threshold: IMPACT_THRESHOLDS_1D.noise };
  if (impact < IMPACT_THRESHOLDS_1D.mild) return { label: "mild", threshold: IMPACT_THRESHOLDS_1D.mild };
  if (impact < IMPACT_THRESHOLDS_1D.significant) return { label: "significant", threshold: IMPACT_THRESHOLDS_1D.significant };
  return { label: "major", threshold: IMPACT_THRESHOLDS_1D.major };
}

// Default baseline values
export const DEFAULT_BASELINE = {
  baseline1h: 0.4,  // 0.4% average 1H move
  baseline1d: 1.2,  // 1.2% average 1D move
};

// Calculate all price movement metrics across horizons (10m, 15m, 30m, 1h, 2h, 1d, 1w)
export function calculatePriceMovement(
  priceAtEvent: number,
  price1h: number | null,
  price1d: number | null,
  indexPriceAtEvent: number,
  indexPrice1h: number | null,
  indexPrice1d: number | null,
  baseline1h: number = DEFAULT_BASELINE.baseline1h,
  baseline1d: number = DEFAULT_BASELINE.baseline1d,
  is1hTruncated: boolean = false,
  price10m: number | null = null,
  price15m: number | null = null,
  price30m: number | null = null,
  price2h: number | null = null,
  price1w: number | null = null
): PriceMovement {
  const calcMove = (price: number | null) =>
    price !== null && priceAtEvent > 0
      ? ((price - priceAtEvent) / priceAtEvent) * 100
      : null;

  const move10m = calcMove(price10m);
  const move15m = calcMove(price15m);
  const move30m = calcMove(price30m);
  const move1h = calcMove(price1h);
  const move2h = calcMove(price2h);
  const move1d = calcMove(price1d);
  const move1w = calcMove(price1w);

  // Calculate stock absolute moves
  const stockAbsMove1h = price1h !== null && priceAtEvent > 0
    ? Math.abs(price1h - priceAtEvent) / priceAtEvent * 100
    : null;
  const stockAbsMove1d = price1d !== null && priceAtEvent > 0
    ? Math.abs(price1d - priceAtEvent) / priceAtEvent * 100
    : null;

  // Calculate market absolute moves
  const marketAbsMove1h = indexPrice1h !== null && indexPriceAtEvent > 0
    ? Math.abs(indexPrice1h - indexPriceAtEvent) / indexPriceAtEvent * 100
    : null;
  const marketAbsMove1d = indexPrice1d !== null && indexPriceAtEvent > 0
    ? Math.abs(indexPrice1d - indexPriceAtEvent) / indexPriceAtEvent * 100
    : null;

  // Calculate news-specific moves (subtract market, floor at 0)
  const newsMove1h = stockAbsMove1h !== null && marketAbsMove1h !== null
    ? Math.max(0, stockAbsMove1h - marketAbsMove1h)
    : null;
  const newsMove1d = stockAbsMove1d !== null && marketAbsMove1d !== null
    ? Math.max(0, stockAbsMove1d - marketAbsMove1d)
    : null;

  // Calculate final news impact (subtract baseline, floor at 0)
  const newsImpact1h = newsMove1h !== null
    ? Math.max(0, newsMove1h - baseline1h)
    : null;
  const newsImpact1d = newsMove1d !== null
    ? Math.max(0, newsMove1d - baseline1d)
    : null;

  return {
    priceAtEvent,
    price10m,
    price15m,
    price30m,
    price1h,
    price2h,
    price1d,
    price1w,
    move10m,
    move15m,
    move30m,
    move1h,
    move2h,
    move1d,
    move1w,
    indexPriceAtEvent,
    indexPrice1h,
    indexPrice1d,
    stockAbsMove1h,
    stockAbsMove1d,
    marketAbsMove1h,
    marketAbsMove1d,
    newsMove1h,
    newsMove1d,
    baseline1h,
    baseline1d,
    newsImpact1h,
    newsImpact1d,
    is1hTruncated,
    is1hComplete: price1h !== null,
    is1dComplete: price1d !== null,
  };
}

// Initialize empty price movement (for new alerts)
export function initializePriceMovement(
  priceAtEvent: number,
  indexPriceAtEvent: number
): PriceMovement {
  return calculatePriceMovement(
    priceAtEvent,
    null,
    null,
    indexPriceAtEvent,
    null,
    null
  );
}

