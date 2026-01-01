"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Play, Square, Bell, Send, Clock, Newspaper, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { StockSelector } from "@/components/scraper/StockSelector";
import { KeywordSelector } from "@/components/scraper/KeywordSelector";
import { Stock, ScraperKeyword } from "@/types/scraper";
import {
  Classification,
  defaultClassifications,
} from "@/types/keywords";

interface ScrapedArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  matchedKeywords: string[];
  notifiedAt: string;
}

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

type NewsSource = "placera" | "yahoo" | "both";
type ScrapeInterval = "1" | "5" | "10" | "15" | "30";

export default function NewsScrapingPage() {
  // Telegram configuration
  const [telegramConfig, setTelegramConfig] = useLocalStorage<TelegramConfig>("telegram-config", {
    botToken: "7911671019:AAET8sC_dFCpl9oyQax2dWYhQjLHGiNx7Qw",
    chatId: "6365420985",
  });

  // Scraping settings
  const [newsSource, setNewsSource] = useState<NewsSource>("placera");
  const [scrapeInterval, setScrapeInterval] = useState<ScrapeInterval>("5");
  const [isRunning, setIsRunning] = useState(false);
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null);
  const [nextScrapeTime, setNextScrapeTime] = useState<string | null>(null);
  const [scrapedArticles, setScrapedArticles] = useLocalStorage<ScrapedArticle[]>("news-scraping-articles", []);
  const [scrapeCount, setScrapeCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Classifications for keyword matching
  const [classifications] = useLocalStorage<Classification[]>(
    "keyword-classifications",
    defaultClassifications
  );

  // Stock and keyword selection (shared with History Scraping)
  const [selectedStocks, setSelectedStocks] = useLocalStorage<Stock[]>(
    "scraper-stocks",
    []
  );
  const [selectedKeywords, setSelectedKeywords] = useLocalStorage<ScraperKeyword[]>(
    "scraper-keywords",
    []
  );
  const [hasInitializedKeywords, setHasInitializedKeywords] = useState(false);

  // Initialize keywords from all active classifications on first load
  useEffect(() => {
    if (!hasInitializedKeywords && classifications.length > 0 && selectedKeywords.length === 0) {
      const allKeywords: ScraperKeyword[] = [];
      for (const classification of classifications) {
        if (classification.isActive) {
          for (const kw of classification.keywords) {
            allKeywords.push({
              id: `${classification.id}-${kw}`,
              keyword: kw.toLowerCase(),
              source: "classification",
              classificationId: classification.id,
              classificationName: classification.name,
            });
          }
        }
      }
      if (allKeywords.length > 0) {
        setSelectedKeywords(allKeywords);
      }
      setHasInitializedKeywords(true);
    }
  }, [classifications, selectedKeywords, hasInitializedKeywords, setSelectedKeywords]);

  // Refs for interval management
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const seenTitlesRef = useRef<Set<string>>(new Set());

  // Send Telegram notification
  const sendTelegramNotification = async (article: ScrapedArticle) => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      console.warn("Telegram not configured");
      return false;
    }

    const message = `🔔 *News Alert!*\n\n` +
      `📰 *${article.title}*\n\n` +
      `🔑 Keywords: ${article.matchedKeywords.join(", ")}\n` +
      `📅 Date: ${new Date(article.pubDate).toLocaleString()}\n` +
      `🔗 ${article.link}`;

    try {
      const response = await fetch("/api/telegram-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: telegramConfig.botToken,
          chatId: telegramConfig.chatId,
          message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Telegram error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to send Telegram notification:", error);
      return false;
    }
  };

  // Check if article matches any selected keywords
  const findMatchingKeywords = (title: string, description: string): string[] => {
    const text = `${title} ${description}`.toLowerCase();
    const matches: string[] = [];

    for (const kw of selectedKeywords) {
      if (text.includes(kw.keyword.toLowerCase())) {
        matches.push(kw.keyword);
      }
    }

    return matches;
  };

  // Scrape news from selected source
  const scrapeNews = async () => {
    setErrorMessage(null);
    console.log(`[${new Date().toLocaleTimeString()}] Scraping ${newsSource}...`);

    try {
      const newArticles: ScrapedArticle[] = [];

      // Fetch from Placera
      if (newsSource === "placera" || newsSource === "both") {
        const response = await fetch("/api/placera-news?tab=all&limit=100");
        const data = await response.json();

        if (data.articles && Array.isArray(data.articles)) {
          for (const article of data.articles) {
            // Skip if already seen
            if (seenTitlesRef.current.has(article.title)) continue;

            const matchedKeywords = findMatchingKeywords(article.title, article.description || "");

            if (matchedKeywords.length > 0) {
              const scrapedArticle: ScrapedArticle = {
                title: article.title,
                link: article.link,
                pubDate: article.pubDate,
                description: article.description || "",
                source: "Placera",
                matchedKeywords,
                notifiedAt: new Date().toISOString(),
              };

              newArticles.push(scrapedArticle);
              seenTitlesRef.current.add(article.title);

              // Send Telegram notification
              await sendTelegramNotification(scrapedArticle);
            }
          }
        }
      }

      // Fetch from Yahoo - use selected stocks
      if (newsSource === "yahoo" || newsSource === "both") {
        const stocksToFetch = selectedStocks.length > 0
          ? selectedStocks.map(s => s.symbol)
          : ["AAPL"]; // Fallback if no stocks selected

        for (const symbol of stocksToFetch) {
          const response = await fetch(`/api/yahoo-news?symbol=${symbol}`);
          const data = await response.json();

          if (data.articles && Array.isArray(data.articles)) {
            for (const article of data.articles) {
              if (seenTitlesRef.current.has(article.title)) continue;

              const matchedKeywords = findMatchingKeywords(article.title, article.description || "");

              if (matchedKeywords.length > 0) {
                const scrapedArticle: ScrapedArticle = {
                  title: article.title,
                  link: article.link,
                  pubDate: article.pubDate,
                  description: article.description || "",
                  source: `Yahoo Finance (${symbol})`,
                  matchedKeywords,
                  notifiedAt: new Date().toISOString(),
                };

                newArticles.push(scrapedArticle);
                seenTitlesRef.current.add(article.title);

                await sendTelegramNotification(scrapedArticle);
              }
            }
          }
        }
      }

      // Update state
      if (newArticles.length > 0) {
        setScrapedArticles(prev => [...newArticles, ...prev].slice(0, 100)); // Keep last 100
      }

      setScrapeCount(prev => prev + 1);
      setLastScrapeTime(new Date().toLocaleTimeString());

      // Calculate next scrape time
      const nextTime = new Date(Date.now() + parseInt(scrapeInterval) * 60 * 1000);
      setNextScrapeTime(nextTime.toLocaleTimeString());

      console.log(`[${new Date().toLocaleTimeString()}] Found ${newArticles.length} new matching articles`);

    } catch (error) {
      console.error("Scrape error:", error);
      setErrorMessage(`Scrape failed: ${error}`);
    }
  };

  // Start scraping
  const startScraping = () => {
    setIsRunning(true);
    setScrapeCount(0);
    seenTitlesRef.current.clear();

    // Load existing titles to avoid re-notifying
    scrapedArticles.forEach(article => {
      seenTitlesRef.current.add(article.title);
    });

    // Initial scrape
    scrapeNews();

    // Set up interval
    const intervalMs = parseInt(scrapeInterval) * 60 * 1000;
    intervalRef.current = setInterval(scrapeNews, intervalMs);
  };

  // Stop scraping
  const stopScraping = () => {
    setIsRunning(false);
    setNextScrapeTime(null);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // State for verification results
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  // Verify Telegram config - finds correct chat ID
  const verifyTelegram = async () => {
    if (!telegramConfig.botToken) {
      setErrorMessage("Please enter Bot Token first");
      return;
    }

    setVerifyResult(null);
    setErrorMessage(null);

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
        setVerifyResult("No chats found. Please:\n1. Open Telegram\n2. Find @Gotainnovation_bot\n3. Send /start\n4. Click Verify again");
      }
    } catch (error) {
      setErrorMessage(`Failed to verify: ${error}`);
    }
  };

  // Test Telegram connection
  const testTelegram = async () => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      setErrorMessage("Please enter Bot Token and Chat ID");
      return;
    }

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
        setVerifyResult(null);
        alert("Test message sent successfully!");
      } else {
        const error = await response.json();
        setErrorMessage(`Telegram error: ${error.error}`);
      }
    } catch (error) {
      setErrorMessage(`Failed to send test: ${error}`);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Header
        title="News Scraping"
        titleClassName="text-green-600"
        subtitle="Real-time news monitoring with Telegram alerts"
        backHref="/"
      />

      <div className="container mx-auto px-4 pb-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            {/* Stock Selector */}
            <StockSelector
              selectedStocks={selectedStocks}
              onStocksChange={setSelectedStocks}
            />

            {/* Keyword Selector */}
            <KeywordSelector
              selectedKeywords={selectedKeywords}
              onKeywordsChange={setSelectedKeywords}
              classifications={classifications}
            />

            {/* Telegram Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Telegram Configuration
                </CardTitle>
                <CardDescription>
                  Configure your Telegram bot for notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="botToken">Bot Token</Label>
                  <Input
                    id="botToken"
                    type="password"
                    placeholder="Enter your Telegram bot token"
                    value={telegramConfig.botToken}
                    onChange={(e) => setTelegramConfig(prev => ({ ...prev, botToken: e.target.value }))}
                    disabled={isRunning}
                  />
                </div>
                <div>
                  <Label htmlFor="chatId">Chat ID</Label>
                  <Input
                    id="chatId"
                    placeholder="Enter your Telegram chat ID"
                    value={telegramConfig.chatId}
                    onChange={(e) => setTelegramConfig(prev => ({ ...prev, chatId: e.target.value }))}
                    disabled={isRunning}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={verifyTelegram}
                    disabled={isRunning || !telegramConfig.botToken}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Verify & Find Chat ID
                  </Button>
                  <Button
                    variant="outline"
                    onClick={testTelegram}
                    disabled={isRunning || !telegramConfig.botToken || !telegramConfig.chatId}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Test Notification
                  </Button>
                </div>

                {verifyResult && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                      <pre className="text-blue-700 text-sm whitespace-pre-wrap">{verifyResult}</pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scraping Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5" />
                  Scraping Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>News Source</Label>
                  <Select
                    value={newsSource}
                    onValueChange={(v) => setNewsSource(v as NewsSource)}
                    disabled={isRunning}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placera">Placera.se</SelectItem>
                      <SelectItem value="yahoo">Yahoo Finance</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Scrape Interval
                  </Label>
                  <Select
                    value={scrapeInterval}
                    onValueChange={(v) => setScrapeInterval(v as ScrapeInterval)}
                    disabled={isRunning}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Every 1 minute</SelectItem>
                      <SelectItem value="5">Every 5 minutes</SelectItem>
                      <SelectItem value="10">Every 10 minutes</SelectItem>
                      <SelectItem value="15">Every 15 minutes</SelectItem>
                      <SelectItem value="30">Every 30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Control Buttons */}
                <div className="flex gap-4 pt-4">
                  {!isRunning ? (
                    <Button
                      onClick={startScraping}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={!telegramConfig.botToken || !telegramConfig.chatId}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Scraping
                    </Button>
                  ) : (
                    <Button
                      onClick={stopScraping}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop Scraping
                    </Button>
                  )}
                </div>

                {/* Status */}
                {isRunning && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-green-700 font-medium">Scraping Active</span>
                    </div>
                    <div className="text-sm text-green-600 space-y-1">
                      <p>Scrapes completed: {scrapeCount}</p>
                      {lastScrapeTime && <p>Last scrape: {lastScrapeTime}</p>}
                      {nextScrapeTime && <p>Next scrape: {nextScrapeTime}</p>}
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-red-700 text-sm">{errorMessage}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notifications Sent
                  </span>
                  <Badge variant="secondary">{scrapedArticles.length} alerts</Badge>
                </CardTitle>
                <CardDescription>
                  Articles that matched keywords and triggered Telegram notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {scrapedArticles.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No alerts yet. Start scraping to monitor for keyword matches.
                    </p>
                  ) : (
                    scrapedArticles.map((article, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <a
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:underline line-clamp-2"
                          >
                            {article.title}
                          </a>
                          <Badge variant="outline" className="shrink-0">
                            {article.source}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {article.matchedKeywords.map((kw, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(article.pubDate).toLocaleString()} • Notified: {new Date(article.notifiedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {scrapedArticles.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => {
                      setScrapedArticles([]);
                      seenTitlesRef.current.clear();
                    }}
                  >
                    Clear All Notifications
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
