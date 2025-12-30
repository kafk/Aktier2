import { NextRequest, NextResponse } from "next/server";

interface PriceResponse {
  symbol: string;
  price: number | null;
  previousClose: number | null;
  timestamp: string;
  marketState: "REGULAR" | "PRE" | "POST" | "CLOSED";
  error?: string;
}

interface QuoteResponse {
  symbol: string;
  prices: {
    current: number | null;
    previousClose: number | null;
    open: number | null;
    high: number | null;
    low: number | null;
  };
  timestamp: string;
  marketState: string;
}

// Fetch current price from Yahoo Finance
async function fetchYahooPrice(symbol: string): Promise<PriceResponse> {
  try {
    // Yahoo Finance quote API
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.chart?.error) {
      throw new Error(data.chart.error.description || "Unknown error");
    }

    const result = data.chart?.result?.[0];
    if (!result) {
      throw new Error("No data returned");
    }

    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];
    const timestamps = result.timestamp;

    // Get the most recent price
    let currentPrice = meta.regularMarketPrice;

    // If no regular market price, try to get from quotes
    if (!currentPrice && quotes?.close && timestamps) {
      const lastIndex = quotes.close.length - 1;
      for (let i = lastIndex; i >= 0; i--) {
        if (quotes.close[i] !== null) {
          currentPrice = quotes.close[i];
          break;
        }
      }
    }

    return {
      symbol: meta.symbol || symbol,
      price: currentPrice || null,
      previousClose: meta.previousClose || null,
      timestamp: new Date().toISOString(),
      marketState: meta.marketState || "CLOSED",
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return {
      symbol,
      price: null,
      previousClose: null,
      timestamp: new Date().toISOString(),
      marketState: "CLOSED",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Fetch historical price at a specific time (approximate)
async function fetchHistoricalPrice(
  symbol: string,
  targetTime: Date
): Promise<number | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const target = Math.floor(targetTime.getTime() / 1000);

    // Calculate range needed
    const daysDiff = Math.ceil((now - target) / (24 * 60 * 60));
    const range = daysDiff <= 1 ? "1d" : daysDiff <= 5 ? "5d" : daysDiff <= 30 ? "1mo" : "3mo";

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=${range}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const timestamps = result.timestamp;
    const quotes = result.indicators?.quote?.[0];

    if (!timestamps || !quotes?.close) return null;

    // Find the closest price to target time
    let closestIndex = 0;
    let closestDiff = Math.abs(timestamps[0] - target);

    for (let i = 1; i < timestamps.length; i++) {
      const diff = Math.abs(timestamps[i] - target);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    // Return the price, or search nearby if null
    for (let offset = 0; offset <= 5; offset++) {
      if (quotes.close[closestIndex + offset] !== null) {
        return quotes.close[closestIndex + offset];
      }
      if (quotes.close[closestIndex - offset] !== null) {
        return quotes.close[closestIndex - offset];
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching historical price for ${symbol}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");
  const timestamp = searchParams.get("timestamp"); // Optional: get price at specific time

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol parameter is required" },
      { status: 400 }
    );
  }

  // If timestamp provided, fetch historical price
  if (timestamp) {
    const targetTime = new Date(timestamp);
    const price = await fetchHistoricalPrice(symbol, targetTime);
    return NextResponse.json({
      symbol,
      price,
      timestamp,
      type: "historical",
    });
  }

  // Otherwise fetch current price
  const result = await fetchYahooPrice(symbol);
  return NextResponse.json(result);
}

// POST endpoint for batch price fetching
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols } = body as { symbols: string[] };

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: "Symbols array is required" },
        { status: 400 }
      );
    }

    // Fetch all prices in parallel
    const results = await Promise.all(
      symbols.map((symbol) => fetchYahooPrice(symbol))
    );

    return NextResponse.json({ prices: results });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
