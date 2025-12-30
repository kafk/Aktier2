"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { StockSelector } from "@/components/scraper/StockSelector";
import { KeywordSelector } from "@/components/scraper/KeywordSelector";
import { ScraperControls } from "@/components/scraper/ScraperControls";
import { ScraperResults } from "@/components/scraper/ScraperResults";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  Stock,
  ScraperKeyword,
  ScraperState,
  NewsArticle,
} from "@/types/scraper";
import {
  Classification,
  defaultClassifications,
} from "@/types/keywords";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock news data generator for simulation
const mockSources = ["Reuters", "Bloomberg", "CNBC", "MarketWatch", "WSJ", "Yahoo Finance"];
const mockTitles = [
  "{stock} reports strong quarterly earnings, beats expectations",
  "{stock} announces new product launch, shares surge",
  "{stock} CEO steps down amid restructuring efforts",
  "{stock} faces SEC investigation over accounting practices",
  "{stock} upgrades guidance for fiscal year",
  "{stock} to acquire smaller competitor in $2B deal",
  "{stock} misses earnings estimates, stock drops",
  "{stock} announces layoffs affecting 5% of workforce",
  "{stock} receives FDA approval for new drug",
  "{stock} partnership with tech giant boosts outlook",
  "{stock} insider selling raises concerns",
  "{stock} declares special dividend, investors cheer",
  "{stock} downgrades guidance citing supply chain issues",
  "{stock} beats revenue estimates but misses on profit",
  "{stock} announces $500M stock buyback program",
];

function generateMockArticle(
  stock: Stock,
  keywords: ScraperKeyword[],
  daysAgo: number
): NewsArticle | null {
  // Randomly decide if this article matches
  if (Math.random() > 0.3) return null;

  const matchingKeywords = keywords
    .filter(() => Math.random() > 0.5)
    .slice(0, Math.floor(Math.random() * 3) + 1);

  if (matchingKeywords.length === 0) return null;

  const title = mockTitles[Math.floor(Math.random() * mockTitles.length)].replace(
    "{stock}",
    stock.name
  );
  const source = mockSources[Math.floor(Math.random() * mockSources.length)];
  const sentiment = Math.random() > 0.6 ? "positive" : Math.random() > 0.3 ? "negative" : "neutral";
  const impactScore = Math.floor(Math.random() * 8) + 2;

  const publishedDate = new Date();
  publishedDate.setDate(publishedDate.getDate() - daysAgo);
  publishedDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

  return {
    id: `${stock.symbol}-${Date.now()}-${Math.random()}`,
    title,
    source,
    url: `https://example.com/news/${stock.symbol.toLowerCase()}-${Date.now()}`,
    publishedAt: publishedDate.toISOString(),
    summary: `${stock.name} (${stock.symbol}) news article mentioning keywords: ${matchingKeywords
      .map((k) => k.keyword)
      .join(", ")}. This is a simulated news summary for demonstration purposes.`,
    matchedStock: stock.symbol,
    matchedKeywords: matchingKeywords.map((k) => k.keyword),
    sentiment,
    impactScore,
  };
}

export default function ScraperPage() {
  const [classifications] = useLocalStorage<Classification[]>(
    "classifications",
    defaultClassifications
  );

  const [selectedStocks, setSelectedStocks] = useLocalStorage<Stock[]>(
    "scraper-stocks",
    []
  );
  const [selectedKeywords, setSelectedKeywords] = useLocalStorage<ScraperKeyword[]>(
    "scraper-keywords",
    []
  );
  const [daysToScrape, setDaysToScrape] = useState(7);
  const [notificationLimit, setNotificationLimit] = useState(10);

  const [scraperState, setScraperState] = useState<ScraperState>({
    isRunning: false,
    isPaused: false,
    progress: 0,
    totalArticlesScanned: 0,
    matchedArticles: [],
    notificationCount: 0,
  });

  const scraperRef = useRef<{
    shouldStop: boolean;
    shouldPause: boolean;
    currentLimit: number;
  }>({
    shouldStop: false,
    shouldPause: false,
    currentLimit: 10,
  });

  const runScraper = useCallback(async () => {
    scraperRef.current.shouldStop = false;
    scraperRef.current.shouldPause = false;
    scraperRef.current.currentLimit = notificationLimit;

    setScraperState((prev) => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      progress: 0,
      totalArticlesScanned: 0,
      matchedArticles: [],
      notificationCount: 0,
    }));

    const totalIterations = selectedStocks.length * daysToScrape;
    let currentIteration = 0;
    let articlesScanned = 0;
    let matchedArticles: NewsArticle[] = [];
    let notificationCount = 0;

    for (const stock of selectedStocks) {
      if (scraperRef.current.shouldStop) break;

      for (let day = 0; day < daysToScrape; day++) {
        if (scraperRef.current.shouldStop) break;

        // Wait while paused
        while (scraperRef.current.shouldPause && !scraperRef.current.shouldStop) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (scraperRef.current.shouldStop) break;

        // Simulate scanning articles
        const articlesToScan = Math.floor(Math.random() * 5) + 1;
        articlesScanned += articlesToScan;

        // Generate mock article
        const article = generateMockArticle(stock, selectedKeywords, day);
        if (article) {
          matchedArticles = [article, ...matchedArticles];
          notificationCount++;

          setScraperState((prev) => ({
            ...prev,
            matchedArticles: [article, ...prev.matchedArticles],
            notificationCount,
            totalArticlesScanned: articlesScanned,
          }));

          // Check notification limit
          if (notificationCount >= scraperRef.current.currentLimit) {
            scraperRef.current.shouldPause = true;
            setScraperState((prev) => ({
              ...prev,
              isPaused: true,
            }));
          }
        }

        currentIteration++;
        const progress = (currentIteration / totalIterations) * 100;

        setScraperState((prev) => ({
          ...prev,
          progress,
          totalArticlesScanned: articlesScanned,
        }));

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));
      }
    }

    if (!scraperRef.current.shouldPause) {
      setScraperState((prev) => ({
        ...prev,
        isRunning: false,
        progress: 100,
      }));
    }
  }, [selectedStocks, selectedKeywords, daysToScrape, notificationLimit]);

  const handleStart = () => {
    runScraper();
  };

  const handlePause = () => {
    scraperRef.current.shouldPause = true;
    setScraperState((prev) => ({ ...prev, isPaused: true }));
  };

  const handleResume = () => {
    // Update the limit for continuation
    scraperRef.current.currentLimit = scraperState.notificationCount + notificationLimit;
    scraperRef.current.shouldPause = false;
    setScraperState((prev) => ({ ...prev, isPaused: false }));
  };

  const handleStop = () => {
    scraperRef.current.shouldStop = true;
    scraperRef.current.shouldPause = false;
    setScraperState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
    }));
  };

  const handleClearResults = () => {
    setScraperState((prev) => ({
      ...prev,
      matchedArticles: [],
      notificationCount: 0,
    }));
  };

  const canStart =
    selectedStocks.length > 0 &&
    selectedKeywords.length > 0 &&
    !scraperState.isRunning;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">News Scraper</h1>
            <p className="text-muted-foreground mt-1">
              Monitor stocks for keyword-matching news articles
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Manage Keywords
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            <StockSelector
              selectedStocks={selectedStocks}
              onStocksChange={setSelectedStocks}
            />
            <KeywordSelector
              selectedKeywords={selectedKeywords}
              onKeywordsChange={setSelectedKeywords}
              classifications={classifications}
            />
            <ScraperControls
              daysToScrape={daysToScrape}
              onDaysChange={setDaysToScrape}
              notificationLimit={notificationLimit}
              onNotificationLimitChange={setNotificationLimit}
              scraperState={scraperState}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              canStart={canStart}
            />
          </div>

          {/* Right Column - Results */}
          <div>
            <ScraperResults
              articles={scraperState.matchedArticles}
              onClearResults={handleClearResults}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
