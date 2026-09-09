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

interface PlaceraNewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  category: string;
  ticker?: string;
}

type NewsSource = "yahoo" | "placera" | "both";

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

// Check if article is within date range (includes all days, no exclusion)
function isWithinDays(pubDate: string, days: number): boolean {
  const articleDate = new Date(pubDate);

  // Check if within the specified days range (includes today)
  const oldCutoff = new Date();
  oldCutoff.setDate(oldCutoff.getDate() - days);
  return articleDate >= oldCutoff;
}

// Check if article was published during US market hours (9:30 AM - 4:00 PM ET)
function isDuringMarketHours(pubDate: string): boolean {
  const articleDate = new Date(pubDate);

  // Check if it's a weekday (Mon-Fri)
  const dayOfWeek = articleDate.getUTCDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  if (!isWeekday) return false;

  // Convert to ET (Eastern Time)
  const utcHours = articleDate.getUTCHours();
  const utcMinutes = articleDate.getUTCMinutes();

  // Determine if DST is in effect (roughly March-November)
  const month = articleDate.getUTCMonth();
  const isDST = month >= 2 && month <= 10; // March (2) to November (10)
  const offset = isDST ? -4 : -5;

  // Convert to ET
  let etHours = utcHours + offset;
  if (etHours < 0) etHours += 24;

  const etTimeInMinutes = etHours * 60 + utcMinutes;

  // Regular market hours: 9:30 AM to 4:00 PM ET
  const marketOpen = 9 * 60 + 30;  // 9:30 AM = 570 minutes
  const marketClose = 16 * 60;      // 4:00 PM = 960 minutes

  return etTimeInMinutes >= marketOpen && etTimeInMinutes <= marketClose;
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
  const [hasInitializedKeywords, setHasInitializedKeywords] = useState(false);
  const [newsSource, setNewsSource] = useLocalStorage<NewsSource>("scraper-news-source", "placera");

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

  // Process a single article (common logic for both sources)
  const processArticle = async (
    article: { title: string; link: string; pubDate: string; description: string; source: string },
    stockSymbol: string,
    articlesScanned: number,
    notificationCount: number,
    setArticlesScanned: (n: number) => void,
    setNotificationCount: (n: number) => void
  ): Promise<{ matched: boolean; newNotificationCount: number }> => {
    // Check if within date range
    // For Placera: include recent articles (no 2-day exclusion) since it's current news
    // For Yahoo: exclude last 2 days for price data accuracy
    if (newsSource === "placera") {
      // Just check if within the date range, don't exclude recent
      const articleDate = new Date(article.pubDate);
      const oldCutoff = new Date();
      oldCutoff.setDate(oldCutoff.getDate() - daysToScrape);
      if (articleDate < oldCutoff) {
        return { matched: false, newNotificationCount: notificationCount };
      }
    } else if (!isWithinDays(article.pubDate, daysToScrape)) {
      return { matched: false, newNotificationCount: notificationCount };
    }

    // Check if published during market hours (skip for Placera - Swedish market)
    if (newsSource !== "placera" && !isDuringMarketHours(article.pubDate)) {
      return { matched: false, newNotificationCount: notificationCount };
    }

    // Check if matches keywords
    const textToSearch = `${article.title} ${article.description}`;
    const matchedKws = matchesKeywords(textToSearch, selectedKeywords);

    if (matchedKws.length === 0) {
      return { matched: false, newNotificationCount: notificationCount };
    }

    // Analyze sentiment and impact
    const analysis = analyzeSentiment(textToSearch, classifications, scoringConfig);

    // Fetch historical prices for stock and SPY at event, +1h, +1d
    // DISABLED: Price fetching paused to focus on scraping
    // Re-enable later by uncommenting the fetchAllPrices calls
    // const [stockPrices, spyPrices] = await Promise.all([
    //   fetchAllPrices(stockSymbol, article.pubDate),
    //   fetchAllPrices("SPY", article.pubDate),
    // ]);

    // Placeholder values while price fetching is disabled
    const stockPrices = { priceAtEvent: null, price1h: null, price1d: null, source: "none" };
    const spyPrices = { priceAtEvent: null, price1h: null, price1d: null, source: "none" };

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
      id: `${stockSymbol}-${Date.now()}-${Math.random()}`,
      title: article.title,
      source: article.source,
      url: article.link,
      publishedAt: article.pubDate,
      summary: article.description,
      matchedStock: stockSymbol,
      matchedKeywords: Array.from(new Set([...matchedKws, ...analysis.matchedKeywords])),
      sentiment: analysis.sentiment,
      impactScore: analysis.impactScore,
      eventType: analysis.eventType,
      eventCode: analysis.eventCode,
      priceAtEvent: stockPrices.priceAtEvent || undefined,
      price1h: stockPrices.price1h,
      price1d: stockPrices.price1d,
      indexPriceAtEvent: spyPrices.priceAtEvent || undefined,
      indexPrice1h: spyPrices.price1h,
      indexPrice1d: spyPrices.price1d,
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

    const newCount = notificationCount + 1;

    setScraperState((prev) => ({
      ...prev,
      matchedArticles: [newsArticle, ...prev.matchedArticles],
      notificationCount: newCount,
      totalArticlesScanned: articlesScanned,
    }));

    // Save to localStorage for backtesting (merge with existing, avoid duplicates)
    try {
      const existing = JSON.parse(localStorage.getItem("scraped-articles") || "[]");
      const isDuplicate = existing.some((a: NewsArticle) =>
        a.title === newsArticle.title && a.matchedStock === newsArticle.matchedStock
      );
      if (!isDuplicate) {
        const updated = [newsArticle, ...existing].slice(0, 1000); // Keep max 1000
        localStorage.setItem("scraped-articles", JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Failed to save article to localStorage:", e);
    }


    // Check notification limit
    if (newCount >= scraperRef.current.currentLimit) {
      scraperRef.current.shouldPause = true;
      setScraperState((prev) => ({ ...prev, isPaused: true }));
    }

    return { matched: true, newNotificationCount: newCount };
  };

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

    let articlesScanned = 0;
    let notificationCount = 0;

    // Helper to update counters
    const setArticlesScanned = (n: number) => { articlesScanned = n; };
    const setNotificationCount = (n: number) => { notificationCount = n; };

    // Fetch from Placera if selected
    if (newsSource === "placera" || newsSource === "both") {
      try {
        setScraperState((prev) => ({ ...prev, progress: 5 }));

        console.log("Fetching Placera news...");
        const response = await fetch(`/api/placera-news?tab=all&limit=300`);
        const data = await response.json();

        console.log("Placera response:", {
          ok: response.ok,
          status: response.status,
          articlesCount: data.articles?.length || 0,
          debug: data.debug
        });

        if (data.error) {
          console.error("Placera API error:", data.error);
        }

        if (data.articles && Array.isArray(data.articles)) {
          const placeraArticles = data.articles as PlaceraNewsItem[];
          const totalPlacera = placeraArticles.length;

          if (totalPlacera === 0) {
            console.warn("Placera returned 0 articles. Debug info:", data.debug);
          }

          for (let i = 0; i < placeraArticles.length; i++) {
            if (scraperRef.current.shouldStop) break;

            while (scraperRef.current.shouldPause && !scraperRef.current.shouldStop) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            const article = placeraArticles[i];
            articlesScanned++;

            // Try to match with selected stocks or use ticker from article
            let matchedStock: string | undefined = undefined;

            if (selectedStocks.length > 0) {
              // 1. If article has a ticker, check if it matches one of our selected stocks
              if (article.ticker) {
                const cleanTicker = article.ticker.replace(/\.ST$/i, "").toUpperCase();
                const stockMatch = selectedStocks.find(s =>
                  s.symbol.toUpperCase() === article.ticker?.toUpperCase() ||
                  s.symbol.toUpperCase() === cleanTicker
                );
                if (stockMatch) {
                  matchedStock = stockMatch.symbol;
                }
              }

              // 2. If no direct ticker match, check if any selected stock symbol or name is mentioned
              if (!matchedStock) {
                const titleLower = article.title.toLowerCase();
                const descLower = article.description.toLowerCase();

                for (const stock of selectedStocks) {
                  const symbolUpper = stock.symbol.toUpperCase();
                  const nameLower = stock.name ? stock.name.toLowerCase() : "";

                  // Match symbol with word boundary or name match
                  const symbolRegex = new RegExp(`(^|[^a-zA-Z0-9])${symbolUpper}([^a-zA-Z0-9]|$)`, "i");
                  const matchesSymbol = symbolRegex.test(article.title) || symbolRegex.test(article.description);
                  const matchesName = nameLower.length > 2 && (titleLower.includes(nameLower) || descLower.includes(nameLower));

                  if (matchesSymbol || matchesName) {
                    matchedStock = stock.symbol;
                    break;
                  }
                }
              }

              // If this article does not match any selected stock, skip it
              if (!matchedStock) {
                continue;
              }
            } else {
              // If no specific stocks are selected, use article ticker or generic tag
              matchedStock = article.ticker ? article.ticker.replace(/\.ST$/i, "") : "MARKET";
            }

            if (matchedStock) {
              const result = await processArticle(
                article,
                matchedStock,
                articlesScanned,
                notificationCount,
                setArticlesScanned,
                setNotificationCount
              );
              if (result.matched) {
                notificationCount = result.newNotificationCount;
              }
            }

            // Update progress for Placera portion
            const placeraProgress = newsSource === "placera"
              ? ((i + 1) / totalPlacera) * 100
              : ((i + 1) / totalPlacera) * 50;

            setScraperState((prev) => ({
              ...prev,
              progress: placeraProgress,
              totalArticlesScanned: articlesScanned,
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching Placera news:", error);
      }
    }

    // Fetch from Yahoo if selected
    if (newsSource === "yahoo" || newsSource === "both") {
      const totalStocks = selectedStocks.length;
      const baseProgress = newsSource === "both" ? 50 : 0;

      for (let i = 0; i < selectedStocks.length; i++) {
        const stock = selectedStocks[i];

        if (scraperRef.current.shouldStop) break;

        while (scraperRef.current.shouldPause && !scraperRef.current.shouldStop) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (scraperRef.current.shouldStop) break;

        try {
          const response = await fetch(`/api/yahoo-news?symbol=${stock.symbol}`);
          const data = await response.json();

          if (data.articles && Array.isArray(data.articles)) {
            for (const article of data.articles as YahooNewsItem[]) {
              if (scraperRef.current.shouldStop) break;

              while (scraperRef.current.shouldPause && !scraperRef.current.shouldStop) {
                await new Promise((resolve) => setTimeout(resolve, 100));
              }

              articlesScanned++;

              const result = await processArticle(
                { ...article, source: article.source || "Yahoo Finance" },
                stock.symbol,
                articlesScanned,
                notificationCount,
                setArticlesScanned,
                setNotificationCount
              );
              if (result.matched) {
                notificationCount = result.newNotificationCount;
              }

              setScraperState((prev) => ({
                ...prev,
                totalArticlesScanned: articlesScanned,
              }));
            }
          }
        } catch (error) {
          console.error(`Error fetching news for ${stock.symbol}:`, error);
        }

        // Update progress
        const yahooProgress = baseProgress + ((i + 1) / totalStocks) * (newsSource === "both" ? 50 : 100);
        setScraperState((prev) => ({
          ...prev,
          progress: yahooProgress,
        }));

        // Small delay between stocks
        if (i < selectedStocks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    if (!scraperRef.current.shouldPause) {
      setScraperState((prev) => ({
        ...prev,
        isRunning: false,
        progress: 100,
      }));
    }
  }, [selectedStocks, selectedKeywords, daysToScrape, notificationLimit, classifications, scoringConfig, newsSource]);

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
        title="History Scraping"
        titleClassName="text-red-600"
        subtitle={`Monitor stocks for keyword-matching news from ${
          newsSource === "placera" ? "Placera.se" :
          newsSource === "yahoo" ? "Yahoo Finance" :
          "Placera.se & Yahoo Finance"
        }`}
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
              newsSource={newsSource}
              onNewsSourceChange={setNewsSource}
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
