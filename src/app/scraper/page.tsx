"use client";

import { useState, useRef, useCallback } from "react";
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
  ScoringConfig,
  defaultClassifications,
  defaultScoringConfig,
} from "@/types/keywords";
import Link from "next/link";
import { Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { calculatePriceMovement, DEFAULT_BASELINE } from "@/types/priceTracking";

interface YahooNewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}

// Fetch historical stock price at a specific time
async function fetchHistoricalPrice(symbol: string, timestamp: string): Promise<{ price: number | null; source: string }> {
  try {
    const response = await fetch(`/api/stock-price?symbol=${symbol}&timestamp=${encodeURIComponent(timestamp)}`);
    const data = await response.json();
    return { price: data.price || null, source: data.source || "unknown" };
  } catch (error) {
    console.error(`Error fetching historical price for ${symbol}:`, error);
    return { price: null, source: "error" };
  }
}

// Fetch all price points for an article (at event, +1h, +1d)
async function fetchAllPrices(
  symbol: string,
  publishedAt: string
): Promise<{
  priceAtEvent: number | null;
  price1h: number | null;
  price1d: number | null;
  source: string;
}> {
  const eventTime = new Date(publishedAt);
  const time1h = new Date(eventTime.getTime() + 60 * 60 * 1000); // +1 hour
  const time1d = new Date(eventTime.getTime() + 24 * 60 * 60 * 1000); // +1 day

  const [atEvent, at1h, at1d] = await Promise.all([
    fetchHistoricalPrice(symbol, eventTime.toISOString()),
    fetchHistoricalPrice(symbol, time1h.toISOString()),
    fetchHistoricalPrice(symbol, time1d.toISOString()),
  ]);

  // Use the source from the first successful fetch
  const source = atEvent.source !== "error" ? atEvent.source :
                 at1h.source !== "error" ? at1h.source :
                 at1d.source !== "error" ? at1d.source : "none";

  return {
    priceAtEvent: atEvent.price,
    price1h: at1h.price,
    price1d: at1d.price,
    source
  };
}

// Analyze sentiment based on keywords and scoring config
function analyzeSentiment(
  text: string,
  classifications: Classification[],
  scoringConfig: ScoringConfig
): {
  sentiment: "positive" | "negative" | "neutral";
  impactScore: number;
  matchedKeywords: string[];
  eventType?: string;
  eventCode?: string;
} {
  const lowerText = text.toLowerCase();
  const matchedKeywords: string[] = [];
  let baseScore = 1;
  let sentimentScore = 0;
  let matchedClassification: Classification | null = null;

  // Check against all classifications
  for (const classification of classifications) {
    if (!classification.isActive) continue;

    for (const keyword of classification.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        if (!matchedClassification || classification.baseImpactScore > matchedClassification.baseImpactScore) {
          matchedClassification = classification;
        }
      }
    }
  }

  if (matchedClassification) {
    baseScore = matchedClassification.baseImpactScore;
    if (matchedClassification.sentiment === "positive") sentimentScore += 1;
    if (matchedClassification.sentiment === "negative") sentimentScore -= 1;
  }

  // Check sentiment modifiers
  for (const modifier of scoringConfig.sentimentModifiers) {
    if (lowerText.includes(modifier.word.toLowerCase())) {
      sentimentScore += modifier.score;
    }
  }

  // Determine final sentiment
  let sentiment: "positive" | "negative" | "neutral" = "neutral";
  if (sentimentScore > 0) sentiment = "positive";
  if (sentimentScore < 0) sentiment = "negative";

  // Calculate impact score (capped at 1-10)
  const impactScore = Math.min(10, Math.max(1, baseScore + Math.abs(sentimentScore)));

  return {
    sentiment,
    impactScore,
    matchedKeywords,
    eventType: matchedClassification?.name,
    eventCode: matchedClassification?.code,
  };
}

// Check if article matches selected keywords
function matchesKeywords(
  text: string,
  keywords: ScraperKeyword[]
): string[] {
  const lowerText = text.toLowerCase();
  const matched: string[] = [];

  for (const kw of keywords) {
    if (lowerText.includes(kw.keyword.toLowerCase())) {
      matched.push(kw.keyword);
    }
  }

  return matched;
}

// Check if article is within date range
function isWithinDays(pubDate: string, days: number): boolean {
  const articleDate = new Date(pubDate);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  return articleDate >= cutoffDate;
}

export default function ScraperPage() {
  const [classifications] = useLocalStorage<Classification[]>(
    "classifications",
    defaultClassifications
  );
  const [scoringConfig] = useLocalStorage<ScoringConfig>(
    "scoringConfig",
    defaultScoringConfig
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

    setScraperState({
      isRunning: true,
      isPaused: false,
      progress: 0,
      totalArticlesScanned: 0,
      matchedArticles: [],
      notificationCount: 0,
    });

    const totalStocks = selectedStocks.length;
    let articlesScanned = 0;
    let notificationCount = 0;

    for (let i = 0; i < selectedStocks.length; i++) {
      const stock = selectedStocks[i];

      if (scraperRef.current.shouldStop) break;

      // Wait while paused
      while (scraperRef.current.shouldPause && !scraperRef.current.shouldStop) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (scraperRef.current.shouldStop) break;

      try {
        // Fetch news from both Yahoo Finance and Google News
        const [yahooResponse, googleResponse] = await Promise.all([
          fetch(`/api/yahoo-news?symbol=${stock.symbol}`),
          fetch(`/api/google-news?symbol=${stock.symbol}&days=${daysToScrape}`),
        ]);

        const yahooData = await yahooResponse.json();
        const googleData = await googleResponse.json();

        // Combine articles from both sources, removing duplicates by title similarity
        const allArticles: YahooNewsItem[] = [];
        const seenTitles = new Set<string>();

        // Add Yahoo articles first
        if (yahooData.articles && Array.isArray(yahooData.articles)) {
          for (const article of yahooData.articles) {
            const normalizedTitle = article.title.toLowerCase().substring(0, 50);
            if (!seenTitles.has(normalizedTitle)) {
              seenTitles.add(normalizedTitle);
              allArticles.push(article);
            }
          }
        }

        // Add Google articles (avoiding duplicates)
        if (googleData.articles && Array.isArray(googleData.articles)) {
          for (const article of googleData.articles) {
            const normalizedTitle = article.title.toLowerCase().substring(0, 50);
            if (!seenTitles.has(normalizedTitle)) {
              seenTitles.add(normalizedTitle);
              allArticles.push(article);
            }
          }
        }

        // Sort by date (newest first)
        allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

        for (const article of allArticles) {
            if (scraperRef.current.shouldStop) break;

            // Wait while paused
            while (scraperRef.current.shouldPause && !scraperRef.current.shouldStop) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            articlesScanned++;

            // Check if within date range
            if (!isWithinDays(article.pubDate, daysToScrape)) {
              continue;
            }

            // Check if matches keywords
            const textToSearch = `${article.title} ${article.description}`;
            const matchedKws = matchesKeywords(textToSearch, selectedKeywords);

            if (matchedKws.length > 0) {
              // Analyze sentiment and impact
              const analysis = analyzeSentiment(
                textToSearch,
                classifications,
                scoringConfig
              );

              // Fetch historical prices for stock and SPY at event, +1h, +1d
              const [stockPrices, spyPrices] = await Promise.all([
                fetchAllPrices(stock.symbol, article.pubDate),
                fetchAllPrices("SPY", article.pubDate),
              ]);

              // Calculate full price movement metrics
              const priceMovement = stockPrices.priceAtEvent && spyPrices.priceAtEvent
                ? calculatePriceMovement(
                    stockPrices.priceAtEvent,
                    stockPrices.price1h,
                    stockPrices.price1d,
                    spyPrices.priceAtEvent,
                    spyPrices.price1h,
                    spyPrices.price1d,
                    DEFAULT_BASELINE.baseline1h,
                    DEFAULT_BASELINE.baseline1d
                  )
                : null;

              // Determine tracking status based on available data
              let priceTrackingStatus: "pending" | "1h_complete" | "1d_complete" = "pending";
              if (stockPrices.price1d !== null) {
                priceTrackingStatus = "1d_complete";
              } else if (stockPrices.price1h !== null) {
                priceTrackingStatus = "1h_complete";
              }

              const newsArticle: NewsArticle = {
                id: `${stock.symbol}-${Date.now()}-${Math.random()}`,
                title: article.title,
                source: article.source || "Yahoo Finance",
                url: article.link,
                publishedAt: article.pubDate,
                summary: article.description,
                matchedStock: stock.symbol,
                matchedKeywords: Array.from(new Set([...matchedKws, ...analysis.matchedKeywords])),
                sentiment: analysis.sentiment,
                impactScore: analysis.impactScore,
                eventType: analysis.eventType,
                eventCode: analysis.eventCode,
                // Price tracking data
                priceAtEvent: stockPrices.priceAtEvent || undefined,
                price1h: stockPrices.price1h,
                price1d: stockPrices.price1d,
                indexPriceAtEvent: spyPrices.priceAtEvent || undefined,
                indexPrice1h: spyPrices.price1h,
                indexPrice1d: spyPrices.price1d,
                // Calculated metrics from priceMovement
                stockAbsMove1h: priceMovement?.stockAbsMove1h,
                stockAbsMove1d: priceMovement?.stockAbsMove1d,
                newsMove1h: priceMovement?.newsMove1h,
                newsMove1d: priceMovement?.newsMove1d,
                newsImpact1h: priceMovement?.newsImpact1h,
                newsImpact1d: priceMovement?.newsImpact1d,
                baseline1h: DEFAULT_BASELINE.baseline1h,
                baseline1d: DEFAULT_BASELINE.baseline1d,
                priceTrackingStatus,
                priceSource: stockPrices.source as "polygon" | "yahoo" | "google" | "none",
              };

              notificationCount++;

              setScraperState((prev) => ({
                ...prev,
                matchedArticles: [newsArticle, ...prev.matchedArticles],
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

            // Update progress
            setScraperState((prev) => ({
              ...prev,
              totalArticlesScanned: articlesScanned,
            }));
        }
      } catch (error) {
        console.error(`Error fetching news for ${stock.symbol}:`, error);
      }

      // Update progress
      const progress = ((i + 1) / totalStocks) * 100;
      setScraperState((prev) => ({
        ...prev,
        progress,
      }));

      // Small delay between stocks to avoid rate limiting
      if (i < selectedStocks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!scraperRef.current.shouldPause) {
      setScraperState((prev) => ({
        ...prev,
        isRunning: false,
        progress: 100,
      }));
    }
  }, [selectedStocks, selectedKeywords, daysToScrape, notificationLimit, classifications, scoringConfig]);

  const handleStart = () => {
    runScraper();
  };

  const handlePause = () => {
    scraperRef.current.shouldPause = true;
    setScraperState((prev) => ({ ...prev, isPaused: true }));
  };

  const handleResume = () => {
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
      <Header
        title="News Scraper"
        subtitle="Monitor stocks for keyword-matching news from Yahoo Finance"
        backHref="/"
      >
        <Link href="/backtesting">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Backtesting
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Keywords
          </Button>
        </Link>
      </Header>

      <div className="container mx-auto px-4">
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
