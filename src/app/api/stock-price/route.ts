import { NextRequest, NextResponse } from "next/server";

// Polygon/Massive API key from environment
const POLYGON_API_KEY = process.env.POLYGON_API_KEY || process.env.MASSIVE_API_KEY;

// ============ AVANZA API (Swedish Stocks) ============
// Common Swedish stocks with their Avanza orderbookIds
const AVANZA_ORDERBOOK_IDS: Record<string, string> = {
  "VOLV-B": "5240", "VOLV-B.ST": "5240", "VOLV-A": "5239", "VOLV-A.ST": "5239",
  "ERIC-B": "5765", "ERIC-B.ST": "5765", "ERIC-A": "5764", "ERIC-A.ST": "5764",
  "SEB-A": "725", "SEB-A.ST": "725", "SEB-C": "726", "SEB-C.ST": "726",
  "SWED-A": "5287", "SWED-A.ST": "5287",
  "HM-B": "5235", "HM-B.ST": "5235",
  "ABB": "5447", "ABB.ST": "5447",
  "ASSA-B": "24", "ASSA-B.ST": "24",
  "ATCO-A": "45", "ATCO-A.ST": "45",
  "ATCO-B": "46", "ATCO-B.ST": "46",
  "AZN": "3524", "AZN.ST": "3524",
  "SAND": "650", "SAND.ST": "650",
  "SHB-A": "668", "SHB-A.ST": "668", "SHB-B": "669", "SHB-B.ST": "669",
  "SKF-B": "677", "SKF-B.ST": "677", "SKF-A": "676", "SKF-A.ST": "676",
  "TELIA": "5353", "TELIA.ST": "5353",
  "TEL2-B": "5351", "TEL2-B.ST": "5351",
  "INVE-B": "5247", "INVE-B.ST": "5247", "INVE-A": "5246", "INVE-A.ST": "5246",
  "HEXA-B": "5279", "HEXA-B.ST": "5279",
  "SAAB-B": "653", "SAAB-B.ST": "653",
  "NIBE-B": "5284", "NIBE-B.ST": "5284",
  "EVO": "746107", "EVO.ST": "746107",
  "SINCH": "658963", "SINCH.ST": "658963",
  "NDA-SE": "542691", "NDA-SE.ST": "542691",
  "EMBRAC-B": "607424", "EMBRAC-B.ST": "607424",
  "ESSITY-B": "725547", "ESSITY-B.ST": "725547", "ESSITY-A": "725546", "ESSITY-A.ST": "725546",
  "SBB-B": "753514", "SBB-B.ST": "753514", "SBB-D": "981440", "SBB-D.ST": "981440",
  "EQT": "993351", "EQT.ST": "993351",
  "BOL": "155", "BOL.ST": "155",
  "ALFA": "15", "ALFA.ST": "15",
  "SCA-B": "656", "SCA-B.ST": "656", "SCA-A": "655", "SCA-A.ST": "655",
  "SKA-B": "672", "SKA-B.ST": "672",
  "GETI-B": "177", "GETI-B.ST": "177",
  "ELUX-B": "81", "ELUX-B.ST": "81",
  "KINV-B": "260", "KINV-B.ST": "260",
  "CAST": "134", "CAST.ST": "134",
  "BALD-B": "5437", "BALD-B.ST": "5437",
  "FABG": "125", "FABG.ST": "125",
  "LUMI": "5422", "LUMI.ST": "5422",
  "HOLM-B": "213", "HOLM-B.ST": "213",
  "HPOL-B": "5534", "HPOL-B.ST": "5534",
  "TREL-B": "702", "TREL-B.ST": "702",
  "INDT": "5322", "INDT.ST": "5322",
  "LIFCO-B": "518335", "LIFCO-B.ST": "518335",
  "BEIJ-B": "5278", "BEIJ-B.ST": "5278",
  "ADDT-B": "5300", "ADDT-B.ST": "5300",
  "SWEC-B": "683", "SWEC-B.ST": "683",
  "AAK": "5248", "AAK.ST": "5248",
  "SAGA-B": "5423", "SAGA-B.ST": "5423",
  "LATO-B": "277", "LATO-B.ST": "277",
  "LUND-B": "289", "LUND-B.ST": "289",
  "SECU-B": "665", "SECU-B.ST": "665",
  "LOOM-B": "5650", "LOOM-B.ST": "5650",
  "DOM": "579899", "DOM.ST": "579899",
  "THULE": "518334", "THULE.ST": "518334",
  "BRAV": "587524", "BRAV.ST": "587524",
  "WALL-B": "715", "WALL-B.ST": "715",
  "WIHL": "5276", "WIHL.ST": "5276",
  "PEAB-B": "626", "PEAB-B.ST": "626",
  "BILL": "5302", "BILL.ST": "5302",
  "HUSQ-B": "5349", "HUSQ-B.ST": "5349",
  "SOBI": "5380", "SOBI.ST": "5380",
  "CLAS-B": "5245", "CLAS-B.ST": "5245",
  "BILI-A": "148", "BILI-A.ST": "148",
  "BUFAB": "447231", "BUFAB.ST": "447231",
  "MYCR": "5295", "MYCR.ST": "5295",
  "NYF": "898574", "NYF.ST": "898574",
  "PNDX-B": "557161", "PNDX-B.ST": "557161",
  "LIAB": "5394", "LIAB.ST": "5394",
  "BIOT": "5277", "BIOT.ST": "5277",
  "MTRS": "753512", "MTRS.ST": "753512",
  "NOLA-B": "5297", "NOLA-B.ST": "5297",
  "GRNG": "508244", "GRNG.ST": "508244",
  "JM": "244", "JM.ST": "244",
  "COOR": "557162", "COOR.ST": "557162",
  "ATT": "597576", "ATT.ST": "597576",
  "INWI": "504353", "INWI.ST": "504353",
  "CIBUS": "833633", "CIBUS.ST": "833633",
  "CLA-B": "5674", "CLA-B.ST": "5674",
  "HMS": "5476", "HMS.ST": "5476",
  "VBG-B": "708", "VBG-B.ST": "708",
  "DIOS": "5347", "DIOS.ST": "5347",
  "BURE": "128", "BURE.ST": "128",
  "CRED-A": "333830", "CRED-A.ST": "333830",
  "RATO-B": "642", "RATO-B.ST": "642",
  "ELTEL": "534571", "ELTEL.ST": "534571",
  "STAR-B": "5462", "STAR-B.ST": "5462",
  "ANOT": "20", "ANOT.ST": "20",
  "BICO": "687258", "BICO.ST": "687258",
  "CANTA": "557163", "CANTA.ST": "557163",
  "RAY-B": "5320", "RAY-B.ST": "5320",
  "GREEN": "847250", "GREEN.ST": "847250",
  "ALLIG": "687259", "ALLIG.ST": "687259",
  "OVZON": "857241", "OVZON.ST": "857241",
  "NWG": "637251", "NWG.ST": "637251",
  "DEDI": "333831", "DEDI.ST": "333831",
  "PRIC-B": "637", "PRIC-B.ST": "637",
  "PACT": "636", "PACT.ST": "636",
  "MSON-B": "5535", "MSON-B.ST": "5535",
  "KNOW": "263", "KNOW.ST": "263",
  "SENS": "5378", "SENS.ST": "5378",
  "ORTI-A": "614", "ORTI-A.ST": "614",
  "VIVE": "587525", "VIVE.ST": "587525",
  "SECT-B": "667", "SECT-B.ST": "667",
  "KAMBI": "484512", "KAMBI.ST": "484512",
  "STORY-B": "587526", "STORY-B.ST": "587526",
  "FRACTL": "1187250", "FRACTL.ST": "1187250",
  "PDX": "637252", "PDX.ST": "637252",
  "SF": "607425", "SF.ST": "607425",
  "YUBICO": "1687250", "YUBICO.ST": "1687250",
  "VIVA": "1287250", "VIVA.ST": "1287250",
  "CINT": "1187251", "CINT.ST": "1187251",
  "FLAT-B": "1287251", "FLAT-B.ST": "1287251",
};

function getNormalizedSwedishSymbol(symbol: string): string {
  return symbol.toUpperCase().trim().replace(/\s+/g, "-").replace(/_/g, "-");
}

// Check if symbol is Swedish
function isSwedishStock(symbol: string): boolean {
  const norm = getNormalizedSwedishSymbol(symbol);
  return norm.endsWith(".ST") || AVANZA_ORDERBOOK_IDS[norm] !== undefined || AVANZA_ORDERBOOK_IDS[norm.replace(".ST", "")] !== undefined;
}

function getAvanzaOrderbookId(symbol: string): string | undefined {
  const norm = getNormalizedSwedishSymbol(symbol);
  const withoutSt = norm.replace(".ST", "");
  return AVANZA_ORDERBOOK_IDS[norm] || AVANZA_ORDERBOOK_IDS[withoutSt];
}

// Fetch price from Avanza
async function fetchAvanzaPrice(symbol: string): Promise<number | null> {
  const orderbookId = getAvanzaOrderbookId(symbol);

  if (!orderbookId) {
    console.log(`No Avanza orderbookId for ${symbol}`);
    return null;
  }

  try {
    const url = `https://www.avanza.se/_api/market-guide/stock/${orderbookId}`;
    console.log(`Fetching Avanza: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Avanza HTTP ${response.status} for ${symbol}`);
      return null;
    }

    const data = await response.json();
    const price = data.lastPrice || data.quote?.last;

    if (price) {
      console.log(`Avanza: ${symbol} = ${price} SEK`);
      return price;
    }

    return null;
  } catch (error) {
    console.error(`Avanza error for ${symbol}:`, error);
    return null;
  }
}

// Debug: log if API key is configured
console.log(`Polygon API key configured: ${POLYGON_API_KEY ? 'YES (length: ' + POLYGON_API_KEY.length + ')' : 'NO'}`);

// Cache for Polygon data to avoid rate limiting (5 calls/min on free tier)
// Key: "SYMBOL-YYYY-MM-DD", Value: { bars: [], fetchedAt: timestamp }
interface PolygonBar {
  t: number; // timestamp in ms
  c: number; // close price
}
interface CacheEntry {
  bars: PolygonBar[];
  dailyClose: number | null;
  fetchedAt: number;
}
const polygonCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Rate limiting for Polygon API (5 calls/minute = 1 call per 12 seconds)
let lastPolygonCall = 0;
const POLYGON_RATE_LIMIT_MS = 12500; // 12.5 seconds between calls to stay under 5/min

interface PriceResponse {
  symbol: string;
  price: number | null;
  previousClose: number | null;
  timestamp: string;
  marketState: "REGULAR" | "PRE" | "POST" | "CLOSED";
  source?: string;
  error?: string;
}

// ============ POLYGON/MASSIVE API ============

// Fetch current price from Polygon/Massive
async function fetchPolygonPrice(symbol: string): Promise<number | null> {
  if (!POLYGON_API_KEY) {
    console.log("Polygon API key not configured");
    return null;
  }

  try {
    // Get previous day's close (most reliable for current price)
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?apiKey=${POLYGON_API_KEY}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      console.error(`Polygon HTTP ${response.status} for ${symbol}`);
      return null;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // 'c' is close price
      return data.results[0].c;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Polygon price for ${symbol}:`, error);
    return null;
  }
}

// Fetch historical price from Polygon/Massive at specific time (with caching)
async function fetchPolygonHistoricalPrice(
  symbol: string,
  targetTime: Date
): Promise<number | null> {
  if (!POLYGON_API_KEY) {
    console.log(`Polygon: No API key for ${symbol}`);
    return null;
  }

  try {
    // Format dates for Polygon API (YYYY-MM-DD)
    const targetDate = targetTime.toISOString().split("T")[0];
    const cacheKey = `${symbol}-${targetDate}`;

    // Check cache first
    const cached = polygonCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      // Use cached data
      if (cached.bars.length > 0) {
        const targetTimestamp = targetTime.getTime();
        let closestBar = cached.bars[0];
        let closestDiff = Math.abs(cached.bars[0].t - targetTimestamp);

        for (const bar of cached.bars) {
          const diff = Math.abs(bar.t - targetTimestamp);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestBar = bar;
          }
        }
        console.log(`Polygon (cached): price ${closestBar.c} for ${symbol}`);
        return closestBar.c;
      } else if (cached.dailyClose !== null) {
        console.log(`Polygon (cached daily): price ${cached.dailyClose} for ${symbol}`);
        return cached.dailyClose;
      }
      return null;
    }

    // Rate limiting - wait if needed
    const now = Date.now();
    const timeSinceLastCall = now - lastPolygonCall;
    if (timeSinceLastCall < POLYGON_RATE_LIMIT_MS) {
      await new Promise(resolve => setTimeout(resolve, POLYGON_RATE_LIMIT_MS - timeSinceLastCall));
    }
    lastPolygonCall = Date.now();

    console.log(`Polygon: Fetching ${symbol} for date ${targetDate}`);

    // Fetch 5-minute bars for the target day
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/5/minute/${targetDate}/${targetDate}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      console.error(`Polygon historical HTTP ${response.status} for ${symbol}`);
      return null;
    }

    const data = await response.json();
    console.log(`Polygon response for ${symbol}: status=${data.status}, resultsCount=${data.resultsCount}`);

    if (!data.results || data.results.length === 0) {
      console.log(`Polygon: No 5-min data for ${symbol} on ${targetDate}, trying daily...`);

      // Rate limit for daily call too
      await new Promise(resolve => setTimeout(resolve, POLYGON_RATE_LIMIT_MS));
      lastPolygonCall = Date.now();

      const nextDate = new Date(targetTime.getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const dailyUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${targetDate}/${nextDate}?adjusted=true&apiKey=${POLYGON_API_KEY}`;
      const dailyResponse = await fetch(dailyUrl);
      const dailyData = await dailyResponse.json();

      if (dailyData.results && dailyData.results.length > 0) {
        const dailyClose = dailyData.results[0].c;
        // Cache the daily result
        polygonCache.set(cacheKey, {
          bars: [],
          dailyClose,
          fetchedAt: Date.now(),
        });
        console.log(`Polygon: using daily close ${dailyClose} for ${symbol}`);
        return dailyClose;
      }

      // Cache empty result to avoid repeated calls
      polygonCache.set(cacheKey, {
        bars: [],
        dailyClose: null,
        fetchedAt: Date.now(),
      });
      return null;
    }

    // Cache the 5-minute bars
    polygonCache.set(cacheKey, {
      bars: data.results,
      dailyClose: null,
      fetchedAt: Date.now(),
    });

    // Find the bar closest to target time
    const targetTimestamp = targetTime.getTime();
    let closestBar = data.results[0];
    let closestDiff = Math.abs(data.results[0].t - targetTimestamp);

    for (const bar of data.results) {
      const diff = Math.abs(bar.t - targetTimestamp);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestBar = bar;
      }
    }

    console.log(`Polygon: found price ${closestBar.c} for ${symbol}`);
    return closestBar.c;
  } catch (error) {
    console.error(`Error fetching Polygon historical for ${symbol}:`, error);
    return null;
  }
}

// ============ GOOGLE FINANCE ============

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

// Normalize symbol for Yahoo Finance (Swedish stocks need .ST suffix)
function getYahooSymbol(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  if (clean.endsWith(".ST")) return clean;
  const norm = clean.replace(/\s+/g, "-").replace(/_/g, "-");
  if (isSwedishStock(symbol) || AVANZA_ORDERBOOK_IDS[norm] !== undefined || AVANZA_ORDERBOOK_IDS[clean] !== undefined) {
    return `${norm}.ST`;
  }
  return clean;
}

// Fetch current price from Yahoo Finance
async function fetchYahooPrice(symbol: string): Promise<PriceResponse> {
  const yahooSymbol = getYahooSymbol(symbol);
  const symbolsToTry = [yahooSymbol];
  if (yahooSymbol !== symbol.trim().toUpperCase()) {
    symbolsToTry.push(symbol.trim().toUpperCase());
  }

  for (const sym of symbolsToTry) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1m&range=1d`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        next: { revalidate: 60 },
      });

      if (!response.ok) continue;

      const data = await response.json();
      if (data.chart?.error) continue;

      const result = data.chart?.result?.[0];
      if (!result) continue;

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

      if (currentPrice) {
        return {
          symbol: meta.symbol || sym,
          price: currentPrice,
          previousClose: meta.previousClose || null,
          timestamp: new Date().toISOString(),
          marketState: meta.marketState || "CLOSED",
          source: "yahoo",
        };
      }
    } catch (error) {
      console.error(`Yahoo Finance error for ${sym}:`, error);
    }
  }

  return {
    symbol,
    price: null,
    previousClose: null,
    timestamp: new Date().toISOString(),
    marketState: "CLOSED",
    source: "yahoo",
    error: "No price returned from Yahoo",
  };
}

// Cache for Yahoo chart data (10 min cache to avoid rate limits)
interface YahooChartCacheEntry {
  timestamps: number[];
  closes: (number | null)[];
  fetchedAt: number;
}
const yahooChartCache = new Map<string, YahooChartCacheEntry>();
const YAHOO_CHART_TTL = 10 * 60 * 1000; // 10 minutes

async function getYahooChartData(symbol: string, range: string): Promise<YahooChartCacheEntry | null> {
  const yahooSymbol = getYahooSymbol(symbol);
  const cacheKey = `${yahooSymbol}-${range}`;
  const cached = yahooChartCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < YAHOO_CHART_TTL) {
    return cached;
  }

  const symbolsToTry = [yahooSymbol];
  if (yahooSymbol !== symbol.trim().toUpperCase()) {
    symbolsToTry.push(symbol.trim().toUpperCase());
  }

  for (const sym of symbolsToTry) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=5m&range=${range}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) continue;

      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) continue;

      const entry: YahooChartCacheEntry = {
        timestamps: result.timestamp,
        closes: result.indicators.quote[0].close,
        fetchedAt: Date.now(),
      };
      yahooChartCache.set(cacheKey, entry);
      return entry;
    } catch (err) {
      console.error(`Error fetching Yahoo chart for ${sym}:`, err);
    }
  }
  return null;
}

function findClosestPriceInChart(chart: YahooChartCacheEntry, targetSec: number): number | null {
  if (!chart.timestamps || !chart.timestamps.length || !chart.closes || !chart.closes.length) return null;
  let closestIndex = 0;
  let closestDiff = Math.abs(chart.timestamps[0] - targetSec);

  for (let i = 1; i < chart.timestamps.length; i++) {
    const diff = Math.abs(chart.timestamps[i] - targetSec);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }

  // Check closest bar and nearby non-null bars
  for (let offset = 0; offset <= 5; offset++) {
    const p1 = chart.closes[closestIndex + offset];
    if (p1 !== null && p1 !== undefined) return p1;
    const p2 = chart.closes[closestIndex - offset];
    if (p2 !== null && p2 !== undefined) return p2;
  }
  return null;
}

// Fetch historical price from Yahoo Finance using cache
async function fetchYahooHistoricalPrice(
  symbol: string,
  targetTime: Date
): Promise<number | null> {
  const nowSec = Math.floor(Date.now() / 1000);
  const targetSec = Math.floor(targetTime.getTime() / 1000);

  const daysDiff = Math.ceil((nowSec - targetSec) / (24 * 60 * 60));
  const range = daysDiff <= 1 ? "1d" : daysDiff <= 5 ? "5d" : daysDiff <= 30 ? "1mo" : "3mo";

  const chart = await getYahooChartData(symbol, range);
  if (!chart) return null;

  return findClosestPriceInChart(chart, targetSec);
}

// Fetch all price points for an event (atEvent, 10m, 15m, 30m, 1h, 2h, 1d, 1w) in one fast call
async function fetchEventPricePoints(
  symbol: string,
  eventTime: Date,
  preferredSource: string = "auto"
): Promise<{
  priceAtEvent: number | null;
  price10m: number | null;
  price15m: number | null;
  price30m: number | null;
  price1h: number | null;
  price2h: number | null;
  price1d: number | null;
  price1w: number | null;
  source: string;
}> {
  if (!symbol || symbol.toUpperCase() === "MARKET") {
    return {
      priceAtEvent: null,
      price10m: null,
      price15m: null,
      price30m: null,
      price1h: null,
      price2h: null,
      price1d: null,
      price1w: null,
      source: "none",
    };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const eventSec = Math.floor(eventTime.getTime() / 1000);

  const time10mSec = eventSec + 600;
  const time15mSec = eventSec + 900;
  const time30mSec = eventSec + 1800;
  const time1hSec = eventSec + 3600;
  const time2hSec = eventSec + 7200;
  const time1dSec = eventSec + 86400;
  const time1wSec = eventSec + 7 * 86400;

  const daysDiff = Math.ceil((nowSec - eventSec) / (24 * 60 * 60));
  const range = daysDiff <= 1 ? "1d" : daysDiff <= 5 ? "5d" : daysDiff <= 30 ? "1mo" : "3mo";

  const tryYahoo = async () => {
    const chart = await getYahooChartData(symbol, range);
    if (chart) {
      const atEvent = findClosestPriceInChart(chart, eventSec);
      const at10m = nowSec >= time10mSec ? findClosestPriceInChart(chart, time10mSec) : null;
      const at15m = nowSec >= time15mSec ? findClosestPriceInChart(chart, time15mSec) : null;
      const at30m = nowSec >= time30mSec ? findClosestPriceInChart(chart, time30mSec) : null;
      const at1h = nowSec >= time1hSec ? findClosestPriceInChart(chart, time1hSec) : null;
      const at2h = nowSec >= time2hSec ? findClosestPriceInChart(chart, time2hSec) : null;
      const at1d = nowSec >= time1dSec ? findClosestPriceInChart(chart, time1dSec) : null;
      const at1w = nowSec >= time1wSec ? findClosestPriceInChart(chart, time1wSec) : null;

      if (atEvent !== null) {
        return {
          priceAtEvent: atEvent,
          price10m: at10m,
          price15m: at15m,
          price30m: at30m,
          price1h: at1h,
          price2h: at2h,
          price1d: at1d,
          price1w: at1w,
          source: "yahoo",
        };
      }
    }
    const yp = await fetchYahooPrice(symbol);
    if (yp.price !== null) {
      return {
        priceAtEvent: yp.price,
        price10m: null,
        price15m: null,
        price30m: null,
        price1h: null,
        price2h: null,
        price1d: null,
        price1w: null,
        source: "yahoo",
      };
    }
    return null;
  };

  const tryTradingView = async () => {
    const tvPrice = await fetchTradingViewPrice(symbol);
    if (tvPrice !== null) {
      return {
        priceAtEvent: tvPrice,
        price10m: null,
        price15m: null,
        price30m: null,
        price1h: null,
        price2h: null,
        price1d: null,
        price1w: null,
        source: "tradingview",
      };
    }
    return null;
  };

  const tryAvanza = async () => {
    if (isSwedishStock(symbol)) {
      const avanzaPrice = await fetchAvanzaPrice(symbol);
      if (avanzaPrice !== null) {
        return {
          priceAtEvent: avanzaPrice,
          price10m: null,
          price15m: null,
          price30m: null,
          price1h: null,
          price2h: null,
          price1d: null,
          price1w: null,
          source: "avanza",
        };
      }
    }
    return null;
  };

  const tryPolygon = async () => {
    if (!POLYGON_API_KEY) return null;
    const pPrice = await fetchPolygonPrice(symbol);
    if (pPrice !== null) {
      return {
        priceAtEvent: pPrice,
        price10m: null,
        price15m: null,
        price30m: null,
        price1h: null,
        price2h: null,
        price1d: null,
        price1w: null,
        source: "polygon",
      };
    }
    return null;
  };

  const tryGoogle = async () => {
    const gPrice = await fetchGooglePrice(symbol);
    if (gPrice !== null) {
      return {
        priceAtEvent: gPrice,
        price10m: null,
        price15m: null,
        price30m: null,
        price1h: null,
        price2h: null,
        price1d: null,
        price1w: null,
        source: "google",
      };
    }
    return null;
  };

  // 1. If a specific source was preferred by user, try it FIRST:
  if (preferredSource === "yahoo") {
    const res = await tryYahoo();
    if (res) return res;
  } else if (preferredSource === "tradingview") {
    const res = await tryTradingView();
    if (res) return res;
  } else if (preferredSource === "avanza") {
    const res = await tryAvanza();
    if (res) return res;
  } else if (preferredSource === "polygon") {
    const res = await tryPolygon();
    if (res) return res;
  } else if (preferredSource === "google") {
    const res = await tryGoogle();
    if (res) return res;
  }

  // 2. Fallbacks:
  if (preferredSource !== "yahoo") {
    const yahooRes = await tryYahoo();
    if (yahooRes) return yahooRes;
  }

  if (isSwedishStock(symbol) && preferredSource !== "avanza") {
    const avanzaRes = await tryAvanza();
    if (avanzaRes) return avanzaRes;
  }

  if (preferredSource !== "tradingview") {
    const tvRes = await tryTradingView();
    if (tvRes) return tvRes;
  }

  if (preferredSource !== "polygon") {
    const polyRes = await tryPolygon();
    if (polyRes) return polyRes;
  }

  if (preferredSource !== "google") {
    const gRes = await tryGoogle();
    if (gRes) return gRes;
  }

  return {
    priceAtEvent: null,
    price10m: null,
    price15m: null,
    price30m: null,
    price1h: null,
    price2h: null,
    price1d: null,
    price1w: null,
    source: "none",
  };
}


// Fetch historical price from Google Finance
async function fetchGoogleHistoricalPrice(
  symbol: string,
  targetTime: Date
): Promise<number | null> {
  try {
    const googleSymbol = getGoogleSymbol(symbol);
    const now = new Date();
    const daysDiff = Math.ceil((now.getTime() - targetTime.getTime()) / (24 * 60 * 60 * 1000));

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

    const currentPriceMatch = html.match(/data-last-price="([0-9.]+)"/);
    const currentPrice = currentPriceMatch ? parseFloat(currentPriceMatch[1]) : null;

    const prevCloseMatch = html.match(/data-price-at-close="([0-9.]+)"/);
    const prevClose = prevCloseMatch ? parseFloat(prevCloseMatch[1]) : null;

    const chartDataMatch = html.match(/\[\[(\d{10,13}),([0-9.]+)\]/g);

    if (chartDataMatch && chartDataMatch.length > 0) {
      const targetTimestamp = targetTime.getTime();
      let closestPrice: number | null = null;
      let closestDiff = Infinity;

      for (const match of chartDataMatch) {
        const parts = match.match(/\[(\d+),([0-9.]+)\]/);
        if (parts) {
          let timestamp = parseInt(parts[1]);
          if (timestamp < 10000000000) timestamp *= 1000;

          const price = parseFloat(parts[2]);
          const diff = Math.abs(timestamp - targetTimestamp);

          if (diff < closestDiff) {
            closestDiff = diff;
            closestPrice = price;
          }
        }
      }

      if (closestPrice !== null) {
        return closestPrice;
      }
    }

    if (daysDiff <= 1 && prevClose) {
      return prevClose;
    }

    if (currentPrice) {
      return currentPrice;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Google historical for ${symbol}:`, error);
    return null;
  }
}

// ============ TRADINGVIEW SCANNER ============
function getTradingViewTicker(symbol: string): { exchange: string; ticker: string } {
  const upper = symbol.toUpperCase().replace(".ST", "").replace("-", "_").replace(" ", "_");
  const isSwedish = isSwedishStock(symbol);
  if (isSwedish) {
    return { exchange: "sweden", ticker: `OMXSTO:${upper}` };
  }
  return { exchange: "america", ticker: symbol.toUpperCase() };
}

async function fetchTradingViewPrice(symbol: string): Promise<number | null> {
  try {
    const { exchange, ticker } = getTradingViewTicker(symbol);
    const url = `https://scanner.tradingview.com/${exchange}/scan`;

    const tickers = ticker.includes(":")
      ? [ticker]
      : [`NASDAQ:${ticker}`, `NYSE:${ticker}`, `AMEX:${ticker}`, ticker];

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify({
        symbols: { tickers },
        columns: ["close", "change", "open", "high", "low", "volume"]
      }),
    });

    if (!response.ok) {
      console.error(`TradingView HTTP ${response.status} for ${symbol}`);
      return null;
    }

    const data = await response.json();
    if (data.data && data.data.length > 0 && data.data[0].d && data.data[0].d.length > 0) {
      const closePrice = data.data[0].d[0];
      if (typeof closePrice === "number") {
        console.log(`TradingView: ${symbol} = ${closePrice}`);
        return closePrice;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching TradingView price for ${symbol}:`, error);
    return null;
  }
}

// Fetch price with preferred source and fallback
async function fetchPriceWithSource(
  symbol: string,
  preferredSource: string = "auto"
): Promise<PriceResponse> {
  const tryAvanza = async () => {
    const avanzaPrice = await fetchAvanzaPrice(symbol);
    if (avanzaPrice !== null) {
      return {
        symbol,
        price: avanzaPrice,
        previousClose: null,
        timestamp: new Date().toISOString(),
        marketState: "CLOSED" as const,
        source: "avanza",
      };
    }
    return null;
  };

  const tryTradingView = async () => {
    const tvPrice = await fetchTradingViewPrice(symbol);
    if (tvPrice !== null) {
      return {
        symbol,
        price: tvPrice,
        previousClose: null,
        timestamp: new Date().toISOString(),
        marketState: "CLOSED" as const,
        source: "tradingview",
      };
    }
    return null;
  };

  const tryPolygon = async () => {
    if (!POLYGON_API_KEY) return null;
    const polygonPrice = await fetchPolygonPrice(symbol);
    if (polygonPrice !== null) {
      return {
        symbol,
        price: polygonPrice,
        previousClose: null,
        timestamp: new Date().toISOString(),
        marketState: "CLOSED" as const,
        source: "polygon",
      };
    }
    return null;
  };

  const tryYahoo = async () => {
    const yahooResult = await fetchYahooPrice(symbol);
    if (yahooResult.price !== null) {
      return yahooResult;
    }
    return null;
  };

  const tryGoogle = async () => {
    const googlePrice = await fetchGooglePrice(symbol);
    if (googlePrice !== null) {
      return {
        symbol,
        price: googlePrice,
        previousClose: null,
        timestamp: new Date().toISOString(),
        marketState: "CLOSED" as const,
        source: "google",
      };
    }
    return null;
  };

  // If specific source preferred, try it first
  if (preferredSource === "avanza") {
    const res = await tryAvanza();
    if (res) return res;
  } else if (preferredSource === "tradingview") {
    const res = await tryTradingView();
    if (res) return res;
  } else if (preferredSource === "polygon") {
    const res = await tryPolygon();
    if (res) return res;
  } else if (preferredSource === "yahoo") {
    const res = await tryYahoo();
    if (res) return res;
  } else if (preferredSource === "google") {
    const res = await tryGoogle();
    if (res) return res;
  }

  // If preferred source was auto (or preferred source failed, fallback chain)
  if (isSwedishStock(symbol)) {
    const avanzaRes = await tryAvanza();
    if (avanzaRes) return avanzaRes;
  }

  // Next try TradingView
  const tvRes = await tryTradingView();
  if (tvRes) return tvRes;

  // Next try Polygon
  const polygonRes = await tryPolygon();
  if (polygonRes) return polygonRes;

  // Next try Yahoo
  const yahooRes = await tryYahoo();
  if (yahooRes) return yahooRes;

  // Next try Google
  const googleRes = await tryGoogle();
  if (googleRes) return googleRes;

  return {
    symbol,
    price: null,
    previousClose: null,
    timestamp: new Date().toISOString(),
    marketState: "CLOSED",
    source: "none",
    error: "All market data providers failed to return a price",
  };
}

// Fetch historical price with preferred source and fallback
async function fetchHistoricalPriceWithFallback(
  symbol: string,
  targetTime: Date,
  preferredSource: string = "auto"
): Promise<{ price: number | null; source: string }> {
  const tryAvanza = async () => {
    const avanzaPrice = await fetchAvanzaPrice(symbol);
    if (avanzaPrice !== null) {
      console.log(`Using Avanza current quote for ${symbol}`);
      return { price: avanzaPrice, source: "avanza" };
    }
    return null;
  };

  const tryTradingView = async () => {
    const tvPrice = await fetchTradingViewPrice(symbol);
    if (tvPrice !== null) {
      console.log(`Using TradingView quote for ${symbol}`);
      return { price: tvPrice, source: "tradingview" };
    }
    return null;
  };

  const tryPolygon = async () => {
    if (!POLYGON_API_KEY) return null;
    const polygonPrice = await fetchPolygonHistoricalPrice(symbol, targetTime);
    if (polygonPrice !== null) {
      return { price: polygonPrice, source: "polygon" };
    }
    return null;
  };

  const tryYahoo = async () => {
    const yahooPrice = await fetchYahooHistoricalPrice(symbol, targetTime);
    if (yahooPrice !== null) {
      return { price: yahooPrice, source: "yahoo" };
    }
    return null;
  };

  const tryGoogle = async () => {
    const googlePrice = await fetchGoogleHistoricalPrice(symbol, targetTime);
    if (googlePrice !== null) {
      return { price: googlePrice, source: "google" };
    }
    return null;
  };

  // If user requested a specific source, attempt it first
  if (preferredSource === "avanza") {
    const res = await tryAvanza();
    if (res) return res;
  } else if (preferredSource === "tradingview") {
    const res = await tryTradingView();
    if (res) return res;
  } else if (preferredSource === "polygon") {
    const res = await tryPolygon();
    if (res) return res;
  } else if (preferredSource === "yahoo") {
    const res = await tryYahoo();
    if (res) return res;
  } else if (preferredSource === "google") {
    const res = await tryGoogle();
    if (res) return res;
  }

  // Automatic smart fallback:
  // For Swedish stocks, try Avanza first
  if (isSwedishStock(symbol)) {
    const avanzaRes = await tryAvanza();
    if (avanzaRes) return avanzaRes;
  }

  // Try Polygon (most reliable for US intraday)
  const polygonRes = await tryPolygon();
  if (polygonRes) return polygonRes;

  // Try Yahoo
  const yahooRes = await tryYahoo();
  if (yahooRes) return yahooRes;

  // Try TradingView
  const tvRes = await tryTradingView();
  if (tvRes) return tvRes;

  // Fallback to Google
  const googleRes = await tryGoogle();
  if (googleRes) return googleRes;

  return { price: null, source: "none" };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");
  const timestamp = searchParams.get("timestamp");
  const eventTimestamp = searchParams.get("eventTimestamp");
  const source = searchParams.get("source") || "auto"; // "auto" | "yahoo" | "polygon" | "google" | "avanza" | "tradingview"

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol parameter is required" },
      { status: 400 }
    );
  }

  // If eventTimestamp provided, fetch all horizons (atEvent, 10m, 15m, 30m, 1h, 2h, 1d, 1w) in one fast call
  if (eventTimestamp) {
    const targetTime = new Date(eventTimestamp);
    const result = await fetchEventPricePoints(symbol, targetTime, source);
    return NextResponse.json({
      symbol,
      eventTimestamp,
      priceAtEvent: result.priceAtEvent,
      price10m: result.price10m,
      price15m: result.price15m,
      price30m: result.price30m,
      price1h: result.price1h,
      price2h: result.price2h,
      price1d: result.price1d,
      price1w: result.price1w,
      source: result.source,
    });
  }

  // If single timestamp provided, fetch historical price
  if (timestamp) {
    const targetTime = new Date(timestamp);
    const result = await fetchHistoricalPriceWithFallback(symbol, targetTime, source);
    return NextResponse.json({
      symbol,
      price: result.price,
      timestamp,
      type: "historical",
      source: result.source,
    });
  }

  // Fetch current price
  const result = await fetchPriceWithSource(symbol, source);
  return NextResponse.json(result);
}

// POST endpoint for batch price fetching
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, source = "auto" } = body as { symbols: string[]; source?: string };

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: "Symbols array is required" },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      symbols.map((symbol) => fetchPriceWithSource(symbol, source))
    );

    return NextResponse.json({ prices: results });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
