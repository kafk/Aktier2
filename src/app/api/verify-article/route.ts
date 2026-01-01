import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

// Verify article content by fetching the page and checking <article> element
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

    // Extract text ONLY from <article> element
    const articleElement = $("article").first();

    if (articleElement.length === 0) {
      console.log("No <article> element found, checking full page");
      // Fallback: if no article element, this might not be a valid article page
      return NextResponse.json({
        verified: false,
        reason: "No <article> element found on page",
        matchedStocks: [],
      });
    }

    // Get text content from article only (not related content outside)
    const articleText = articleElement.text().toLowerCase();
    console.log(`Article text length: ${articleText.length} chars`);

    // Check which stocks are mentioned in the article content
    const matchedStocks: string[] = [];

    // Stock aliases for matching
    const stockAliases: Record<string, string[]> = {
      "AAPL": ["aapl", "apple"],
      "MSFT": ["msft", "microsoft"],
      "GOOGL": ["googl", "google", "alphabet"],
      "AMZN": ["amzn", "amazon"],
      "NVDA": ["nvda", "nvidia"],
      "META": ["meta", "facebook"],
      "TSLA": ["tsla", "tesla"],
      "NFLX": ["nflx", "netflix"],
      "DIS": ["dis", "disney"],
      "JPM": ["jpm", "jpmorgan", "jp morgan"],
    };

    for (const stock of stocks) {
      const aliases = stockAliases[stock] || [stock.toLowerCase()];

      for (const alias of aliases) {
        if (articleText.includes(alias)) {
          matchedStocks.push(stock);
          console.log(`Found stock ${stock} (matched: "${alias}")`);
          break;
        }
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
