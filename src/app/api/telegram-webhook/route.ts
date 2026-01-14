import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { ScraperConfig } from "../sync-config/route";

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { username?: string; first_name?: string };
  };
}

async function sendTelegramMessage(botToken: string, chatId: string, message: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    }),
  });
}

export async function POST(request: Request) {
  try {
    const update: TelegramUpdate = await request.json();
    const message = update.message;

    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const text = message.text.trim();
    const config = await kv.get<ScraperConfig>("scraper-config");

    // Check if this chat is authorized
    if (config && config.telegramChatId !== chatId) {
      console.log(`Unauthorized chat ID: ${chatId}`);
      return NextResponse.json({ ok: true });
    }

    const botToken = config?.telegramBotToken || "";

    if (!botToken) {
      return NextResponse.json({ ok: true });
    }

    // Parse commands
    const [command, ...args] = text.split(" ");

    switch (command.toLowerCase()) {
      case "/start":
        if (!config) {
          await sendTelegramMessage(botToken, chatId,
            "⚠️ No config found. Please sync from the browser UI first at /news-scraping");
        } else if (config.isRunning) {
          await sendTelegramMessage(botToken, chatId, "✅ Scraping is already running!");
        } else {
          await kv.set("scraper-config", { ...config, isRunning: true, lastUpdated: new Date().toISOString() });
          await sendTelegramMessage(botToken, chatId,
            `🚀 <b>Scraping started!</b>\n\n` +
            `📊 Stocks: ${config.stocks.map(s => s.symbol).join(", ") || "None"}\n` +
            `🔑 Keywords: ${config.keywords.length} configured\n` +
            `⏱️ Interval: Every ${config.scrapeInterval} minutes`);
        }
        break;

      case "/stop":
        if (!config) {
          await sendTelegramMessage(botToken, chatId, "⚠️ No config found.");
        } else if (!config.isRunning) {
          await sendTelegramMessage(botToken, chatId, "⏹️ Scraping is already stopped.");
        } else {
          await kv.set("scraper-config", { ...config, isRunning: false, lastUpdated: new Date().toISOString() });
          await sendTelegramMessage(botToken, chatId, "⏹️ <b>Scraping stopped!</b>");
        }
        break;

      case "/status":
        if (!config) {
          await sendTelegramMessage(botToken, chatId,
            "⚠️ <b>Not configured</b>\n\nSync your config from the browser UI first.");
        } else {
          const statusEmoji = config.isRunning ? "🟢" : "🔴";
          const statusText = config.isRunning ? "Running" : "Stopped";
          await sendTelegramMessage(botToken, chatId,
            `${statusEmoji} <b>Status: ${statusText}</b>\n\n` +
            `📊 Stocks: ${config.stocks.map(s => s.symbol).join(", ") || "None"}\n` +
            `🔑 Keywords: ${config.keywords.length} configured\n` +
            `📰 Source: ${config.newsSource}\n` +
            `⏱️ Interval: Every ${config.scrapeInterval} min\n` +
            `🕐 Last updated: ${new Date(config.lastUpdated).toLocaleString()}`);
        }
        break;

      case "/stocks":
        if (!config || config.stocks.length === 0) {
          await sendTelegramMessage(botToken, chatId, "📊 No stocks configured.");
        } else {
          const stockList = config.stocks.map(s => `• ${s.symbol} (${s.name})`).join("\n");
          await sendTelegramMessage(botToken, chatId, `📊 <b>Monitored Stocks:</b>\n\n${stockList}`);
        }
        break;

      case "/add_stock":
        if (!config) {
          await sendTelegramMessage(botToken, chatId, "⚠️ Sync config from browser first.");
        } else if (args.length === 0) {
          await sendTelegramMessage(botToken, chatId, "Usage: /add_stock SYMBOL\nExample: /add_stock AAPL");
        } else {
          const symbol = args[0].toUpperCase();
          if (config.stocks.some(s => s.symbol === symbol)) {
            await sendTelegramMessage(botToken, chatId, `⚠️ ${symbol} is already in the list.`);
          } else {
            const newStocks = [...config.stocks, { symbol, name: symbol }];
            await kv.set("scraper-config", { ...config, stocks: newStocks, lastUpdated: new Date().toISOString() });
            await sendTelegramMessage(botToken, chatId, `✅ Added ${symbol} to monitored stocks.`);
          }
        }
        break;

      case "/remove_stock":
        if (!config) {
          await sendTelegramMessage(botToken, chatId, "⚠️ Sync config from browser first.");
        } else if (args.length === 0) {
          await sendTelegramMessage(botToken, chatId, "Usage: /remove_stock SYMBOL\nExample: /remove_stock AAPL");
        } else {
          const symbol = args[0].toUpperCase();
          const newStocks = config.stocks.filter(s => s.symbol !== symbol);
          if (newStocks.length === config.stocks.length) {
            await sendTelegramMessage(botToken, chatId, `⚠️ ${symbol} not found in the list.`);
          } else {
            await kv.set("scraper-config", { ...config, stocks: newStocks, lastUpdated: new Date().toISOString() });
            await sendTelegramMessage(botToken, chatId, `✅ Removed ${symbol} from monitored stocks.`);
          }
        }
        break;

      case "/keywords":
        if (!config || config.keywords.length === 0) {
          await sendTelegramMessage(botToken, chatId, "🔑 No keywords configured.");
        } else {
          const keywordList = config.keywords.slice(0, 30).join(", ");
          const more = config.keywords.length > 30 ? `\n...and ${config.keywords.length - 30} more` : "";
          await sendTelegramMessage(botToken, chatId, `🔑 <b>Keywords (${config.keywords.length}):</b>\n\n${keywordList}${more}`);
        }
        break;

      case "/help":
        await sendTelegramMessage(botToken, chatId,
          `🤖 <b>News Scraper Bot Commands</b>\n\n` +
          `/start - Start scraping\n` +
          `/stop - Stop scraping\n` +
          `/status - Show current status\n` +
          `/stocks - List monitored stocks\n` +
          `/add_stock SYMBOL - Add a stock\n` +
          `/remove_stock SYMBOL - Remove a stock\n` +
          `/keywords - List keywords\n` +
          `/help - Show this message\n\n` +
          `💡 Configure stocks & keywords in the browser UI, then sync to server.`);
        break;

      default:
        if (text.startsWith("/")) {
          await sendTelegramMessage(botToken, chatId, `Unknown command. Type /help for available commands.`);
        }
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

// Telegram sends a GET to verify the webhook
export async function GET() {
  return NextResponse.json({ status: "Webhook endpoint active" });
}
