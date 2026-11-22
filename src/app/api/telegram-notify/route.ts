import { NextRequest, NextResponse } from "next/server";

interface TelegramRequest {
  botToken?: string;
  chatId?: string;
  message: string;
}

const REVOKED_TOKEN_PREFIXES = ["8388583066:AAGo9", "7783225076:AAG6D", "7911671019:AAET8"];
function isRevokedToken(token?: string): boolean {
  if (!token) return false;
  const trimmed = token.trim();
  return REVOKED_TOKEN_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

export async function POST(request: NextRequest) {
  try {
    const body: TelegramRequest = await request.json();

    const serverToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const clientToken = body.botToken?.trim();
    const botToken = serverToken || clientToken;
    const chatId = body.chatId?.trim() || process.env.TELEGRAM_CHAT_ID?.trim();

    if (!botToken || !chatId || !body.message) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: configure TELEGRAM_BOT_TOKEN on the server (or provide botToken), chatId, and message",
        },
        { status: 400 }
      );
    }

    if (isRevokedToken(botToken)) {
      return NextResponse.json(
        {
          error:
            "This Telegram bot token was previously exposed in git history and is blocked. Please revoke it in @BotFather and set a new TELEGRAM_BOT_TOKEN on the server.",
        },
        { status: 403 }
      );
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: body.message,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Telegram API error:", data);
      return NextResponse.json(
        { error: data.description || "Failed to send Telegram message" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, message_id: data.result?.message_id });
  } catch (error) {
    console.error("Telegram notify error:", error);
    return NextResponse.json(
      { error: `Failed to send notification: ${error}` },
      { status: 500 }
    );
  }
}
