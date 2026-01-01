import { NextRequest, NextResponse } from "next/server";

interface TelegramRequest {
  botToken: string;
  chatId: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TelegramRequest = await request.json();

    if (!body.botToken || !body.chatId || !body.message) {
      return NextResponse.json(
        { error: "Missing required fields: botToken, chatId, message" },
        { status: 400 }
      );
    }

    const telegramUrl = `https://api.telegram.org/bot${body.botToken}/sendMessage`;

    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: body.chatId,
        text: body.message,
        parse_mode: "Markdown",
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
