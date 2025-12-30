import { NextRequest, NextResponse } from "next/server";

// Test endpoint to verify Polygon API is working
export async function GET(request: NextRequest) {
  const POLYGON_API_KEY = process.env.POLYGON_API_KEY || process.env.MASSIVE_API_KEY;

  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol") || "AAPL";
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const results: Record<string, unknown> = {
    apiKeyConfigured: !!POLYGON_API_KEY,
    apiKeyLength: POLYGON_API_KEY?.length || 0,
    symbol,
    date,
    tests: {}
  };

  if (!POLYGON_API_KEY) {
    return NextResponse.json({
      ...results,
      error: "POLYGON_API_KEY not configured"
    });
  }

  // Test 1: Previous day close
  try {
    const prevUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?apiKey=${POLYGON_API_KEY}`;
    const prevResponse = await fetch(prevUrl);
    const prevData = await prevResponse.json();
    results.tests = {
      ...results.tests as object,
      previousClose: {
        status: prevResponse.status,
        data: prevData
      }
    };
  } catch (error) {
    results.tests = {
      ...results.tests as object,
      previousClose: { error: String(error) }
    };
  }

  // Test 2: 5-minute bars for specific date
  try {
    const barsUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/5/minute/${date}/${date}?adjusted=true&sort=asc&limit=10&apiKey=${POLYGON_API_KEY}`;
    const barsResponse = await fetch(barsUrl);
    const barsData = await barsResponse.json();
    results.tests = {
      ...results.tests as object,
      fiveMinBars: {
        status: barsResponse.status,
        resultsCount: barsData.resultsCount,
        queryCount: barsData.queryCount,
        firstResult: barsData.results?.[0],
        apiStatus: barsData.status,
        message: barsData.message
      }
    };
  } catch (error) {
    results.tests = {
      ...results.tests as object,
      fiveMinBars: { error: String(error) }
    };
  }

  // Test 3: Daily bars
  try {
    const dailyUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${date}/${date}?adjusted=true&apiKey=${POLYGON_API_KEY}`;
    const dailyResponse = await fetch(dailyUrl);
    const dailyData = await dailyResponse.json();
    results.tests = {
      ...results.tests as object,
      dailyBars: {
        status: dailyResponse.status,
        resultsCount: dailyData.resultsCount,
        firstResult: dailyData.results?.[0],
        apiStatus: dailyData.status
      }
    };
  } catch (error) {
    results.tests = {
      ...results.tests as object,
      dailyBars: { error: String(error) }
    };
  }

  return NextResponse.json(results);
}
