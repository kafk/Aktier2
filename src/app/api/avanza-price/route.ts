import { NextRequest, NextResponse } from "next/server";

// Common Swedish stocks with their Avanza orderbookIds
// You can find these by going to Avanza.se, searching for a stock,
// and looking at the URL: https://www.avanza.se/aktier/om-aktien.html/5240/volvo-b
// The number (5240) is the orderbookId
const ORDERBOOK_IDS: Record<string, string> = {
  // Large Cap - OMX Stockholm 30
  "VOLV-B": "5240",
  "VOLV-B.ST": "5240",
  "ERIC-B": "5765",
  "ERIC-B.ST": "5765",
  "SEB-A": "725",
  "SEB-A.ST": "725",
  "SWED-A": "5287",
  "SWED-A.ST": "5287",
  "HM-B": "5235",
  "HM-B.ST": "5235",
  "ABB": "5447",
  "ABB.ST": "5447",
  "ASSA-B": "24",
  "ASSA-B.ST": "24",
  "ATCO-A": "45",
  "ATCO-A.ST": "45",
  "ATCO-B": "46",
  "ATCO-B.ST": "46",
  "AZN": "3524",
  "AZN.ST": "3524",
  "BOL": "155",
  "BOL.ST": "155",
  "ELUX-B": "230",
  "ELUX-B.ST": "230",
  "ESSITY-B": "725547",
  "ESSITY-B.ST": "725547",
  "GETI-B": "5765", // Same as Ericsson - placeholder, update with correct ID
  "HEXA-B": "5279",
  "HEXA-B.ST": "5279",
  "INVE-B": "5247",
  "INVE-B.ST": "5247",
  "KINV-B": "5235", // Placeholder
  "NDA-SE": "542691",
  "NDA-SE.ST": "542691",
  "SAND": "650",
  "SAND.ST": "650",
  "SCA-B": "656",
  "SCA-B.ST": "656",
  "SHB-A": "668",
  "SHB-A.ST": "668",
  "SKA-B": "672",
  "SKA-B.ST": "672",
  "SKF-B": "677",
  "SKF-B.ST": "677",
  "SSAB-A": "5269",
  "SSAB-A.ST": "5269",
  "SSAB-B": "5271",
  "SSAB-B.ST": "5271",
  "STE-R": "5287", // Placeholder
  "SWMA": "707",
  "SWMA.ST": "707",
  "TEL2-B": "5351",
  "TEL2-B.ST": "5351",
  "TELIA": "5353",
  "TELIA.ST": "5353",
  // More popular stocks
  "SINCH": "658963",
  "SINCH.ST": "658963",
  "EVO": "746107",
  "EVO.ST": "746107",
  "NIBE-B": "5284",
  "NIBE-B.ST": "5284",
  "ALFA": "15",
  "ALFA.ST": "15",
  "SAAB-B": "653",
  "SAAB-B.ST": "653",
};

interface AvanzaStockData {
  orderbookId: string;
  name: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  updated: string;
  highestPrice?: number;
  lowestPrice?: number;
  totalVolumeTraded?: number;
  currency: string;
}

interface PriceResponse {
  symbol: string;
  price: number | null;
  change?: number;
  changePercent?: number;
  currency?: string;
  name?: string;
  source: string;
  orderbookId?: string;
  error?: string;
}

// Cache for Avanza data
const priceCache = new Map<string, { data: AvanzaStockData; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache (data is 15 min delayed anyway)

// Rate limiting
let lastAvanzaCall = 0;
const AVANZA_RATE_LIMIT_MS = 1000; // 1 second between calls

async function fetchAvanzaPrice(orderbookId: string): Promise<AvanzaStockData | null> {
  // Check cache
  const cached = priceCache.get(orderbookId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastAvanzaCall;
  if (timeSinceLastCall < AVANZA_RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, AVANZA_RATE_LIMIT_MS - timeSinceLastCall));
  }
  lastAvanzaCall = Date.now();

  try {
    // Avanza public API endpoint
    const url = `https://www.avanza.se/_api/market-guide/stock/${orderbookId}`;

    console.log(`Fetching Avanza: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      console.error(`Avanza fetch failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    // Extract relevant fields from Avanza response
    const stockData: AvanzaStockData = {
      orderbookId: data.orderbookId || orderbookId,
      name: data.name || "",
      lastPrice: data.lastPrice || data.quote?.last || 0,
      change: data.change || data.quote?.change || 0,
      changePercent: data.changePercent || data.quote?.changePercent || 0,
      updated: data.updated || new Date().toISOString(),
      highestPrice: data.highestPrice || data.quote?.highest,
      lowestPrice: data.lowestPrice || data.quote?.lowest,
      totalVolumeTraded: data.totalVolumeTraded,
      currency: data.currency || "SEK",
    };

    // Update cache
    priceCache.set(orderbookId, { data: stockData, timestamp: Date.now() });

    return stockData;
  } catch (error) {
    console.error(`Error fetching Avanza price for ${orderbookId}:`, error);
    return null;
  }
}

// Search for a stock on Avanza to find its orderbookId
async function searchAvanzaStock(query: string): Promise<{ orderbookId: string; name: string } | null> {
  try {
    const url = `https://www.avanza.se/_api/search/instruments?query=${encodeURIComponent(query)}&limit=5`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Find the first stock result
    const stocks = data.hits?.filter((h: { instrumentType: string }) => h.instrumentType === "STOCK") || [];

    if (stocks.length > 0) {
      return {
        orderbookId: stocks[0].topHits?.[0]?.id || stocks[0].id,
        name: stocks[0].topHits?.[0]?.name || stocks[0].name,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error searching Avanza for ${query}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");
  const orderbookIdParam = searchParams.get("orderbookId");

  if (!symbol && !orderbookIdParam) {
    return NextResponse.json(
      { error: "Either symbol or orderbookId parameter is required" },
      { status: 400 }
    );
  }

  let orderbookId = orderbookIdParam;
  const symbolUpper = symbol?.toUpperCase() || "";

  // If no orderbookId provided, try to find it from our mapping
  if (!orderbookId && symbol) {
    orderbookId = ORDERBOOK_IDS[symbolUpper] || ORDERBOOK_IDS[symbolUpper.replace(".ST", "")];

    // If still not found, try to search Avanza
    if (!orderbookId) {
      const searchResult = await searchAvanzaStock(symbolUpper.replace(".ST", ""));
      if (searchResult) {
        orderbookId = searchResult.orderbookId;
        console.log(`Found orderbookId ${orderbookId} for ${symbol} via search`);
      }
    }
  }

  if (!orderbookId) {
    return NextResponse.json({
      symbol: symbolUpper,
      price: null,
      source: "avanza",
      error: `No orderbookId found for ${symbol}. Add it to ORDERBOOK_IDS mapping.`,
    });
  }

  const stockData = await fetchAvanzaPrice(orderbookId);

  if (!stockData) {
    return NextResponse.json({
      symbol: symbolUpper,
      price: null,
      source: "avanza",
      orderbookId,
      error: "Failed to fetch price from Avanza",
    });
  }

  const result: PriceResponse = {
    symbol: symbolUpper || stockData.name,
    price: stockData.lastPrice,
    change: stockData.change,
    changePercent: stockData.changePercent,
    currency: stockData.currency,
    name: stockData.name,
    source: "avanza",
    orderbookId,
  };

  return NextResponse.json(result);
}
