import { NextRequest, NextResponse } from "next/server";

interface PriceResponse {
  symbol: string;
  price: number | null;
  previousClose: number | null;
  timestamp: string;
  marketState: "REGULAR" | "PRE" | "POST" | "CLOSED";
  source?: string;
  error?: string;
}

// Map common symbols to Google Finance format (SYMBOL:EXCHANGE)
function getGoogleSymbol(symbol: string): string {
  // Most US stocks are on NASDAQ or NYSE
  const nasdaqStocks = ["AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "META", "NVDA", "TSLA", "NFLX", "ADBE", "CRM", "INTC", "AMD", "PYPL", "CSCO"];
  const nyseStocks = ["V", "JPM", "JNJ", "WMT", "PG", "MA", "UNH", "HD", "DIS", "BAC", "KO", "PEP", "MRK", "VZ", "T"];

  if (symbol === "SPY" || symbol === "QQQ" || symbol === "IWM" || symbol === "DIA") {
    return `${symbol}:NYSEARCA`;
  }
  if (nasdaqStocks.includes(symbol)) {
    return `${symbol}:NASDAQ`;
  }
  if (nyseStocks.includes(symbol)) {
    return `${symbol}:NYSE`;
  }
  // Default to NASDAQ for unknown symbols
  return `${symbol}:NASDAQ`;
}

// Fetch current price from Google Finance (scraping)
async function fetchGooglePrice(symbol: string): Promise<number | null> {
  try {
    const googleSymbol = getGoogleSymbol(symbol);
    const url = `https://www.google.com/finance/quote/${googleSymbol}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      console.error(`Google Finance HTTP ${response.status} for ${symbol}`);
      return null;
    }

    const html = await response.text();

    // Extract price from the HTML - look for the data-last-price attribute
    const priceMatch = html.match(/data-last-price="([0-9.]+)"/);
    if (priceMatch && priceMatch[1]) {
      return parseFloat(priceMatch[1]);
    }

    // Alternative: look for the price in a specific pattern
    const altMatch = html.match(/class="YMlKec fxKbKc"[^>]*>([0-9,.]+)</);
    if (altMatch && altMatch[1]) {
      return parseFloat(altMatch[1].replace(/,/g, ""));
    }

    console.error(`Could not parse price from Google Finance for ${symbol}`);
    return null;
  } catch (error) {
    console.error(`Error fetching Google price for ${symbol}:`, error);
    return null;
  }
}

// Fetch current price from Yahoo Finance
async function fetchYahooPrice(symbol: string): Promise<PriceResponse> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 60 },
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

    let currentPrice = meta.regularMarketPrice;

    if (!currentPrice && quotes?.close) {
      for (let i = quotes.close.length - 1; i >= 0; i--) {
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
      source: "yahoo",
    };
  } catch (error) {
    console.error(`Yahoo Finance error for ${symbol}:`, error);
    return {
      symbol,
      price: null,
      previousClose: null,
      timestamp: new Date().toISOString(),
      marketState: "CLOSED",
      source: "yahoo",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Fetch price with fallback: Yahoo -> Google
async function fetchPriceWithFallback(symbol: string): Promise<PriceResponse> {
  // Try Yahoo first
  const yahooResult = await fetchYahooPrice(symbol);
  if (yahooResult.price !== null) {
    return yahooResult;
  }

  // Fallback to Google
  console.log(`Yahoo failed for ${symbol}, trying Google Finance...`);
  const googlePrice = await fetchGooglePrice(symbol);

  if (googlePrice !== null) {
    return {
      symbol,
      price: googlePrice,
      previousClose: null,
      timestamp: new Date().toISOString(),
      marketState: "CLOSED",
      source: "google",
    };
  }

  // Both failed
  return {
    symbol,
    price: null,
    previousClose: null,
    timestamp: new Date().toISOString(),
    marketState: "CLOSED",
    source: "none",
    error: "Both Yahoo and Google Finance failed",
  };
}

// Fetch historical price from Yahoo (Google doesn't have easy historical intraday)
async function fetchHistoricalPrice(
  symbol: string,
  targetTime: Date
): Promise<number | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const target = Math.floor(targetTime.getTime() / 1000);

    const daysDiff = Math.ceil((now - target) / (24 * 60 * 60));
    const range = daysDiff <= 1 ? "1d" : daysDiff <= 5 ? "5d" : daysDiff <= 30 ? "1mo" : "3mo";

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=${range}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error(`Yahoo historical HTTP ${response.status} for ${symbol}`);
      return null;
    }

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

// Try to get historical price from Google Finance daily data
async function fetchGoogleHistoricalPrice(
  symbol: string,
  targetTime: Date
): Promise<number | null> {
  try {
    // Google Finance doesn't easily expose historical intraday data
    // But we can try to get close prices from their chart data
    const googleSymbol = getGoogleSymbol(symbol);

    // For now, just return the current price as a fallback
    // This is not ideal but better than nothing
    const currentPrice = await fetchGooglePrice(symbol);
    return currentPrice;
  } catch (error) {
    console.error(`Error fetching Google historical for ${symbol}:`, error);
    return null;
  }
}

// Fetch historical price with fallback
async function fetchHistoricalPriceWithFallback(
  symbol: string,
  targetTime: Date
): Promise<{ price: number | null; source: string }> {
  // Try Yahoo first (has better historical data)
  const yahooPrice = await fetchHistoricalPrice(symbol, targetTime);
  if (yahooPrice !== null) {
    return { price: yahooPrice, source: "yahoo" };
  }

  // Fallback to Google (current price only as approximation)
  console.log(`Yahoo historical failed for ${symbol}, trying Google...`);
  const googlePrice = await fetchGoogleHistoricalPrice(symbol, targetTime);
  if (googlePrice !== null) {
    return { price: googlePrice, source: "google" };
  }

  return { price: null, source: "none" };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");
  const timestamp = searchParams.get("timestamp");
  const source = searchParams.get("source"); // Optional: force specific source

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol parameter is required" },
      { status: 400 }
    );
  }

  // If timestamp provided, fetch historical price
  if (timestamp) {
    const targetTime = new Date(timestamp);
    const result = await fetchHistoricalPriceWithFallback(symbol, targetTime);
    return NextResponse.json({
      symbol,
      price: result.price,
      timestamp,
      type: "historical",
      source: result.source,
    });
  }

  // Fetch current price
  if (source === "google") {
    const price = await fetchGooglePrice(symbol);
    return NextResponse.json({
      symbol,
      price,
      timestamp: new Date().toISOString(),
      source: "google",
    });
  }

  if (source === "yahoo") {
    const result = await fetchYahooPrice(symbol);
    return NextResponse.json(result);
  }

  // Default: try both with fallback
  const result = await fetchPriceWithFallback(symbol);
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

    const results = await Promise.all(
      symbols.map((symbol) => fetchPriceWithFallback(symbol))
    );

    return NextResponse.json({ prices: results });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
