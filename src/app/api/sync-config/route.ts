import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export interface ScraperConfig {
  stocks: Array<{ symbol: string; name: string }>;
  keywords: string[];
  newsSource: "placera" | "yahoo" | "both";
  scrapeInterval: string;
  isRunning: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  lastUpdated: string;
}

// GET - Retrieve current config
export async function GET() {
  try {
    const config = await kv.get<ScraperConfig>("scraper-config");

    if (!config) {
      return NextResponse.json({
        success: true,
        config: null,
        message: "No config found",
      });
    }

    // Don't expose full telegram token
    return NextResponse.json({
      success: true,
      config: {
        ...config,
        telegramBotToken: config.telegramBotToken ? "***configured***" : "",
      },
    });
  } catch (error) {
    console.error("Failed to get config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get config" },
      { status: 500 }
    );
  }
}

// POST - Save config from browser
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const config: ScraperConfig = {
      stocks: body.stocks || [],
      keywords: body.keywords || [],
      newsSource: body.newsSource || "placera",
      scrapeInterval: body.scrapeInterval || "5",
      isRunning: body.isRunning ?? false,
      telegramBotToken: body.telegramBotToken || "",
      telegramChatId: body.telegramChatId || "",
      lastUpdated: new Date().toISOString(),
    };

    await kv.set("scraper-config", config);

    return NextResponse.json({
      success: true,
      message: "Config saved successfully",
      config: {
        ...config,
        telegramBotToken: config.telegramBotToken ? "***configured***" : "",
      },
    });
  } catch (error) {
    console.error("Failed to save config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save config" },
      { status: 500 }
    );
  }
}

// PATCH - Update specific fields (used by Telegram commands)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const currentConfig = await kv.get<ScraperConfig>("scraper-config");

    if (!currentConfig) {
      return NextResponse.json(
        { success: false, error: "No config exists. Sync from browser first." },
        { status: 404 }
      );
    }

    const updatedConfig: ScraperConfig = {
      ...currentConfig,
      ...body,
      lastUpdated: new Date().toISOString(),
    };

    await kv.set("scraper-config", updatedConfig);

    return NextResponse.json({
      success: true,
      message: "Config updated",
      config: {
        ...updatedConfig,
        telegramBotToken: updatedConfig.telegramBotToken ? "***configured***" : "",
      },
    });
  } catch (error) {
    console.error("Failed to update config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update config" },
      { status: 500 }
    );
  }
}
