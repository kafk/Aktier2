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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botToken } = body;

    if (!botToken) {
      return NextResponse.json(
        { error: "Missing botToken" },
        { status: 400 }
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
