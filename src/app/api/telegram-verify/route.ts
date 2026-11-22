import { NextRequest, NextResponse } from "next/server";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

interface TelegramResponse {
  ok: boolean;
  result?: TelegramUpdate[];
  description?: string;
}

const REVOKED_TOKEN_PREFIXES = ["8388583066:AAGo9", "7783225076:AAG6D", "7911671019:AAET8"];
function isRevokedToken(token?: string): boolean {
  if (!token) return false;
  const trimmed = token.trim();
  return REVOKED_TOKEN_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

export async function GET() {
  const serverToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const serverChatId = process.env.TELEGRAM_CHAT_ID?.trim() || "";
  return NextResponse.json({
    serverTokenConfigured: Boolean(serverToken && !isRevokedToken(serverToken)),
    defaultChatId: serverChatId,
  });
}

export async function POST(request: NextRequest) {
  try {
    let body: { botToken?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Allow empty body when TELEGRAM_BOT_TOKEN is configured on the server
    }

    const serverToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const clientToken = body.botToken?.trim();
    const botToken = serverToken || clientToken;

    if (!botToken) {
      return NextResponse.json(
        { error: "Missing botToken (configure TELEGRAM_BOT_TOKEN on server or enter token)" },
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

    // Call Telegram's getUpdates API to find recent chat IDs
    const telegramUrl = `https://api.telegram.org/bot${botToken}/getUpdates`;

    const response = await fetch(telegramUrl, {
      method: "GET",
    });

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      return NextResponse.json(
        { error: data.description || "Invalid bot token or API error" },
        { status: 400 }
      );
    }

    // Extract unique chat IDs from updates
    const chats: Array<{
      chatId: number;
      username?: string;
      firstName?: string;
      type: string;
      lastMessage?: string;
    }> = [];

    const seenChatIds = new Set<number>();

    if (data.result) {
      for (const update of data.result) {
        if (update.message?.chat) {
          const chatId = update.message.chat.id;
          if (!seenChatIds.has(chatId)) {
            seenChatIds.add(chatId);
            chats.push({
              chatId,
              username: update.message.chat.username,
              firstName: update.message.chat.first_name,
              type: update.message.chat.type,
              lastMessage: update.message.text,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      chats,
      totalUpdates: data.result?.length || 0,
    });
  } catch (error) {
    console.error("Telegram verify error:", error);
    return NextResponse.json(
      { error: `Failed to verify: ${error}` },
      { status: 500 }
    );
  }
}
