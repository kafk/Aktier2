"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Send, Bell, Search, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export default function TelegramConfigPage() {
  const [telegramConfig, setTelegramConfig] = useLocalStorage<TelegramConfig>("telegram-config", {
    botToken: "",
    chatId: "",
  });

  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Verify Telegram config - finds correct chat ID
  const verifyTelegram = async () => {
    if (!telegramConfig.botToken) {
      setErrorMessage("Please enter Bot Token first");
      return;
    }

    setVerifyResult(null);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/telegram-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: telegramConfig.botToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(`Verify error: ${data.error}`);
        return;
      }

      if (data.chats && data.chats.length > 0) {
        const chatInfo = data.chats.map((c: { chatId: number; username?: string; firstName?: string }) =>
          `Chat ID: ${c.chatId} (${c.username || c.firstName || 'Unknown'})`
        ).join('\n');

        // Auto-fill the first chat ID found
        const firstChatId = data.chats[0].chatId.toString();
        setTelegramConfig(prev => ({ ...prev, chatId: firstChatId }));
        setVerifyResult(`Found ${data.chats.length} chat(s):\n${chatInfo}\n\nChat ID auto-filled: ${firstChatId}`);
      } else {
        setVerifyResult("No chats found. Please:\n1. Open Telegram\n2. Find your bot\n3. Send /start\n4. Click Verify again");
      }
    } catch (error) {
      setErrorMessage(`Failed to verify: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test Telegram connection
  const testTelegram = async () => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      setErrorMessage("Please enter Bot Token and Chat ID");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/telegram-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: telegramConfig.botToken,
          chatId: telegramConfig.chatId,
          message: "✅ Test notification from News Scraping app!",
        }),
      });

      if (response.ok) {
        setErrorMessage(null);
        setVerifyResult("✅ Test message sent successfully! Check your Telegram.");
      } else {
        const error = await response.json();
        setErrorMessage(`Telegram error: ${error.error}`);
      }
    } catch (error) {
      setErrorMessage(`Failed to send test: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isConfigured = telegramConfig.botToken && telegramConfig.chatId;

  return (
    <main className="min-h-screen bg-background">
      <Header
        title="Telegram Settings"
        titleClassName="text-purple-600"
        subtitle="Configure your Telegram bot for news alerts"
        backHref="/news-scraping"
      >
        <Link href="/news-scraping">
          <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to News Scraping
          </Button>
        </Link>
      </Header>

      <div className="container mx-auto px-4 pb-8 max-w-2xl">
        {/* Status Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="font-medium">
                  {isConfigured ? 'Telegram is configured' : 'Telegram not configured'}
                </span>
              </div>
              {isConfigured && (
                <Button variant="outline" size="sm" onClick={testTelegram} disabled={isLoading}>
                  <Bell className="h-4 w-4 mr-2" />
                  Send Test
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Telegram Bot Configuration
            </CardTitle>
            <CardDescription>
              Enter your Telegram bot credentials to receive news alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium">How to set up:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Open Telegram and search for @BotFather</li>
                <li>Send /newbot and follow the instructions</li>
                <li>Copy the bot token and paste it below</li>
                <li>Start a chat with your new bot (send /start)</li>
                <li>Click "Verify & Find Chat ID" to auto-detect your chat</li>
              </ol>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="botToken">Bot Token</Label>
                <Input
                  id="botToken"
                  type="password"
                  placeholder="Enter your Telegram bot token (e.g., 123456:ABC-DEF...)"
                  value={telegramConfig.botToken}
                  onChange={(e) => setTelegramConfig(prev => ({ ...prev, botToken: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get this from @BotFather when you create your bot
                </p>
              </div>

              <div>
                <Label htmlFor="chatId">Chat ID</Label>
                <Input
                  id="chatId"
                  placeholder="Enter your Telegram chat ID (auto-detected on verify)"
                  value={telegramConfig.chatId}
                  onChange={(e) => setTelegramConfig(prev => ({ ...prev, chatId: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This identifies where to send notifications. Click verify to auto-detect.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={verifyTelegram}
                  disabled={isLoading || !telegramConfig.botToken}
                  className="flex-1"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Verify & Find Chat ID
                </Button>
                <Button
                  onClick={testTelegram}
                  disabled={isLoading || !telegramConfig.botToken || !telegramConfig.chatId}
                  className="flex-1"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Test Notification
                </Button>
              </div>
            </div>

            {verifyResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <pre className="text-blue-700 text-sm whitespace-pre-wrap">{verifyResult}</pre>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-red-700 text-sm">{errorMessage}</span>
              </div>
            )}

            {/* Clear Button */}
            {isConfigured && (
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  setTelegramConfig({ botToken: "", chatId: "" });
                  setVerifyResult(null);
                  setErrorMessage(null);
                }}
              >
                Clear Configuration
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
