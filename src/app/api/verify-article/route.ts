import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

import { STOCK_DICTIONARY, matchStockInArticle } from "@/lib/stockAliases";

// Verify article content by fetching the page and checking content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, stocks } = body;

    if (!url || !stocks || !Array.isArray(stocks)) {
      return NextResponse.json(
        { error: "Missing url or stocks array" },
        { status: 400 }
      );
    }

    console.log(`Verifying article: ${url}`);
    console.log(`Checking for stocks: ${stocks.join(", ")}`);

    // Fetch the article page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch article: ${response.status}` },
        { status: 500 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract text from <article>, <main>, or h1/body
    let articleElement = $("article").first();
    if (articleElement.length === 0) {
      articleElement = $("main").first();
    }

    const articleText = (articleElement.length > 0 ? articleElement.text() : $("body").text()).toLowerCase();
    const titleText = $("h1").first().text();
    console.log(`Article text length: ${articleText.length} chars`);

    // Check which stocks are mentioned in the article content
    const matchedStocks: string[] = [];

    for (const stockSymbol of stocks) {
      const stockObj = STOCK_DICTIONARY.find(
        (s) => s.symbol.toUpperCase() === stockSymbol.toUpperCase()
      ) || { symbol: stockSymbol, name: stockSymbol, aliases: [stockSymbol.toLowerCase()] };

      if (matchStockInArticle({ title: titleText, description: articleText }, stockObj)) {
        matchedStocks.push(stockSymbol);
        console.log(`Found stock ${stockSymbol}`);
      }
    }

    return NextResponse.json({
      verified: matchedStocks.length > 0,
      matchedStocks,
      articleTextLength: articleText.length,
    });
  } catch (error) {
    console.error("Verify article error:", error);
    return NextResponse.json(
      { error: `Failed to verify article: ${error}` },
      { status: 500 }
    );
  }
}
