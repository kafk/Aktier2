import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { ScraperConfig } from "../sync-config/route";

interface Article {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

// Send Telegram notification
async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  article: Article,
  matchedStocks: string[],
  matchedKeywords: string[]
) {
  const message =
    `🔔 <b>News Alert!</b>\n\n` +
    `📰 <b>${escapeHtml(article.title)}</b>\n\n` +
    `📊 Stock: ${matchedStocks.join(", ")}\n` +
    `🔑 Keywords: ${matchedKeywords.join(", ")}\n` +
    `📅 Date: ${new Date(article.pubDate).toLocaleString()}\n` +
    `🔗 ${article.link}`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Check if article matches keywords
function findMatchingKeywords(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase();
  return keywords.filter((kw) => lowerText.includes(kw.toLowerCase()));
}

// Check if article mentions stocks
function findMatchingStocks(
  text: string,
  stocks: Array<{ symbol: string; name: string }>
): string[] {
  const lowerText = text.toLowerCase();
  const matches: string[] = [];

  for (const stock of stocks) {
    if (
      lowerText.includes(stock.symbol.toLowerCase()) ||
      lowerText.includes(stock.name.toLowerCase())
    ) {
      matches.push(stock.symbol);
    }
  }

  return [...new Set(matches)];
}

// Fetch news from Placera
async function fetchPlaceraNews(baseUrl: string): Promise<Article[]> {
  try {
    const response = await fetch(`${baseUrl}/api/placera-news?tab=all&limit=50`);
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error("Failed to fetch Placera news:", error);
    return [];
  }
}

// Main scraping function
export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    // Get config from KV
    const config = await kv.get<ScraperConfig>("scraper-config");

    if (!config) {
      return NextResponse.json({
        success: false,
        message: "No config found. Sync from browser first.",
        duration: Date.now() - startTime,
      });
    }

    if (!config.isRunning) {
      return NextResponse.json({
        success: true,
        message: "Scraping is disabled",
        duration: Date.now() - startTime,
      });
    }

    if (!config.telegramBotToken || !config.telegramChatId) {
      return NextResponse.json({
        success: false,
        message: "Telegram not configured",
        duration: Date.now() - startTime,
      });
    }

    // Get base URL from request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Get seen articles to avoid duplicates
    const seenArticles = (await kv.get<string[]>("seen-articles")) || [];
    const seenSet = new Set(seenArticles);

    // Fetch news
    const articles = await fetchPlaceraNews(baseUrl);
    const newMatches: Array<{
      article: Article;
      stocks: string[];
      keywords: string[];
    }> = [];

    for (const article of articles) {
      // Skip if already seen
      if (seenSet.has(article.title)) continue;

      const text = `${article.title} ${article.description || ""}`;

      // Check for keyword matches
      const matchedKeywords = findMatchingKeywords(text, config.keywords);
      if (matchedKeywords.length === 0) continue;

      // Check for stock matches
      const matchedStocks = findMatchingStocks(text, config.stocks);
      if (matchedStocks.length === 0) continue;

      // We have a match!
      newMatches.push({
        article,
        stocks: matchedStocks,
        keywords: matchedKeywords,
      });

      // Mark as seen
      seenSet.add(article.title);
    }

    // Send notifications for new matches
    for (const match of newMatches) {
      await sendTelegramNotification(
        config.telegramBotToken,
        config.telegramChatId,
        match.article,
        match.stocks,
        match.keywords
      );
    }

    // Update seen articles (keep last 500)
    const updatedSeen = [...seenSet].slice(-500);
    await kv.set("seen-articles", updatedSeen);

    // Update last scrape time in config
    await kv.set("scraper-config", {
      ...config,
      lastUpdated: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      articlesChecked: articles.length,
      newMatches: newMatches.length,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Scrape cron error:", error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
