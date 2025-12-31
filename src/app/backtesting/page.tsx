"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/backtesting/KpiCard";
import { FilterBar } from "@/components/backtesting/FilterBar";
import { ImpactByScoreChart } from "@/components/backtesting/ImpactByScoreChart";
import { EventPerformanceTable } from "@/components/backtesting/EventPerformanceTable";
import { FalsePositiveTable } from "@/components/backtesting/FalsePositiveTable";
import {
  BacktestingFilters,
  BacktestingSummary,
  ScorePerformance,
  EventPerformance,
  FalsePositive,
} from "@/types/backtesting";
import { NewsArticle } from "@/types/scraper";

const MIN_ALERTS_FOR_ANALYSIS = 5;

// Calculate real backtesting data from scraped articles
function calculateFromScrapedData(
  articles: NewsArticle[],
  filters: BacktestingFilters
): {
  summary: BacktestingSummary;
  scorePerformance: ScorePerformance[];
  eventPerformance: EventPerformance[];
  falsePositives: FalsePositive[];
} {
  // Filter by date range
  const now = new Date();
  const daysMap = { "30d": 30, "90d": 90, "1y": 365 };
  const days = daysMap[filters.dateRange];
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const filteredArticles = articles.filter((a) => {
    const pubDate = new Date(a.publishedAt);
    return pubDate >= cutoff;
  });

  // Filter articles with valid price data (newsImpact1d exists)
  const articlesWithPrices = filteredArticles.filter(
    (a) => a.newsImpact1d !== null && a.newsImpact1d !== undefined
  );

  // Calculate summary
  const highScoreArticles = articlesWithPrices.filter((a) => a.impactScore >= 7);
  const avgMoveHighScore =
    highScoreArticles.length > 0
      ? highScoreArticles.reduce((sum, a) => sum + Math.abs(a.newsImpact1d || 0), 0) /
        highScoreArticles.length
      : 0;

  const baselineMove =
    articlesWithPrices.length > 0
      ? articlesWithPrices.reduce((sum, a) => sum + Math.abs(a.newsImpact1d || 0), 0) /
        articlesWithPrices.length
      : 0;

  const hitThreshold = 3; // 3% move
  const hitCount = highScoreArticles.filter(
    (a) => Math.abs(a.newsImpact1d || 0) >= hitThreshold
  ).length;
  const hitRate = highScoreArticles.length > 0 ? (hitCount / highScoreArticles.length) * 100 : 0;

  const summary: BacktestingSummary = {
    avgMoveHighScore,
    baselineMove,
    hitRate: Math.round(hitRate),
    hitThreshold,
    totalAlerts: filteredArticles.length,
    highScoreAlerts: highScoreArticles.length,
    dateRange:
      filters.dateRange === "30d"
        ? "Last 30 days"
        : filters.dateRange === "90d"
        ? "Last 90 days"
        : "Last year",
    market: filters.market === "US" ? "US Stocks" : filters.market === "EU" ? "EU Stocks" : "All Markets",
  };

  // Calculate score performance (group by impact score)
  const scoreGroups = new Map<number, { total: number; count: number }>();
  for (const article of articlesWithPrices) {
    const score = Math.min(10, Math.max(1, article.impactScore));
    const existing = scoreGroups.get(score) || { total: 0, count: 0 };
    existing.total += Math.abs(article.newsImpact1d || 0);
    existing.count += 1;
    scoreGroups.set(score, existing);
  }

  const scorePerformance: ScorePerformance[] = [];
  for (let score = 1; score <= 10; score++) {
    const data = scoreGroups.get(score);
    if (data && data.count > 0) {
      scorePerformance.push({
        score,
        avgImpact: data.total / data.count,
        sampleSize: data.count,
      });
    }
  }

  // Calculate event performance (group by event type)
  const eventGroups = new Map<
    string,
    { eventType: string; eventCode: string; total: number; count: number; hits: number }
  >();
  for (const article of articlesWithPrices) {
    const eventType = article.eventType || "Unknown";
    const eventCode = article.eventCode || "UNKNOWN";
    const key = eventCode;
    const existing = eventGroups.get(key) || {
      eventType,
      eventCode,
      total: 0,
      count: 0,
      hits: 0,
    };
    existing.total += Math.abs(article.newsImpact1d || 0);
    existing.count += 1;
    if (Math.abs(article.newsImpact1d || 0) >= hitThreshold) {
      existing.hits += 1;
    }
    eventGroups.set(key, existing);
  }

  const eventPerformance: EventPerformance[] = Array.from(eventGroups.values())
    .map((e) => ({
      eventType: e.eventType,
      eventCode: e.eventCode,
      alertCount: e.count,
      avgImpact: e.total / e.count,
      hitRate: Math.round((e.hits / e.count) * 100),
    }))
    .sort((a, b) => b.avgImpact - a.avgImpact);

  // Find false positives (high score but low impact)
  const falsePositives: FalsePositive[] = articlesWithPrices
    .filter((a) => a.impactScore >= 7 && Math.abs(a.newsImpact1d || 0) < 2)
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      ticker: a.matchedStock,
      eventType: a.eventType || "Unknown",
      eventCode: a.eventCode || "UNKNOWN",
      score: a.impactScore,
      actualImpact: a.newsImpact1d || 0,
      reason: "",
      date: a.publishedAt.split("T")[0],
      title: a.title,
    }));

  return { summary, scorePerformance, eventPerformance, falsePositives };
}

export default function BacktestingPage() {
  const [filters, setFilters] = useState<BacktestingFilters>({
    dateRange: "30d",
    market: "US",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedCount, setScrapedCount] = useState(0);

  // Data state
  const [summary, setSummary] = useState<BacktestingSummary | null>(null);
  const [scorePerformance, setScorePerformance] = useState<ScorePerformance[]>([]);
  const [eventPerformance, setEventPerformance] = useState<EventPerformance[]>([]);
  const [falsePositives, setFalsePositives] = useState<FalsePositive[]>([]);

  // Load data on mount and when filters change
  const loadData = useCallback(() => {
    setIsLoading(true);

    try {
      const stored = localStorage.getItem("scraped-articles");
      const articles: NewsArticle[] = stored ? JSON.parse(stored) : [];
      setScrapedCount(articles.length);

      if (articles.length > 0) {
        const data = calculateFromScrapedData(articles, filters);
        setSummary(data.summary);
        setScorePerformance(data.scorePerformance);
        setEventPerformance(data.eventPerformance);
        setFalsePositives(data.falsePositives);
      } else {
        setSummary(null);
        setScorePerformance([]);
        setEventPerformance([]);
        setFalsePositives([]);
      }
    } catch (e) {
      console.error("Error loading scraped articles:", e);
    }

    setIsLoading(false);
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApply = useCallback(() => {
    loadData();
  }, [loadData]);

  const handleReasonChange = useCallback((id: string, reason: string) => {
    setFalsePositives((prev) =>
      prev.map((fp) => (fp.id === id ? { ...fp, reason } : fp))
    );
  }, []);

  const handleClearData = useCallback(() => {
    if (confirm("Clear all scraped articles? This cannot be undone.")) {
      localStorage.removeItem("scraped-articles");
      setScrapedCount(0);
      setSummary(null);
      setScorePerformance([]);
      setEventPerformance([]);
      setFalsePositives([]);
    }
  }, []);

  const hasEnoughData = summary && summary.totalAlerts >= MIN_ALERTS_FOR_ANALYSIS;

  return (
    <main className="min-h-screen bg-background">
      <Header
        title="Backtesting"
        subtitle="Validate how well Impact Scores predict price movements"
        backHref="/scraper"
      />

      <div className="container mx-auto px-4">
        {/* Data Source Info */}
        <Card className="mb-6 border-blue-500/50 bg-blue-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Scraped Articles: {scrapedCount}</p>
                  <p className="text-sm text-muted-foreground">
                    Run the scraper to collect news articles with price data
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/scraper">
                  <Button variant="outline" size="sm">
                    Go to Scraper
                  </Button>
                </Link>
                {scrapedCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleClearData}>
                    Clear Data
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Bar */}
        <div className="mb-6">
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            onApply={handleApply}
            isLoading={isLoading}
          />
        </div>

        {/* No Data Warning */}
        {scrapedCount === 0 && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">No scraped data available</p>
                  <p className="text-sm text-muted-foreground">
                    Go to the News Scraper to collect articles. The scraper will fetch price data
                    for each matched article, which is used for backtesting analysis.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Not Enough Data Warning */}
        {scrapedCount > 0 && !hasEnoughData && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Not enough data to evaluate performance</p>
                  <p className="text-sm text-muted-foreground">
                    Backtesting requires at least {MIN_ALERTS_FOR_ANALYSIS} alerts with price data.
                    Currently: {summary?.totalAlerts || 0} alerts in selected range.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        {summary && summary.totalAlerts > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <KpiCard
              title={`Avg 1D Move (Score ≥7)`}
              value={`${summary.avgMoveHighScore.toFixed(1)}%`}
              comparison={{
                value: `${summary.avgMoveHighScore > summary.baselineMove ? "+" : ""}${(
                  summary.avgMoveHighScore - summary.baselineMove
                ).toFixed(1)}% vs baseline`,
                isPositive: summary.avgMoveHighScore > summary.baselineMove,
              }}
            />
            <KpiCard
              title={`Hit Rate (Score ≥7)`}
              value={`${summary.hitRate}%`}
              subtitle={`≥ ${summary.hitThreshold}% move`}
            />
            <KpiCard
              title="Total Alerts"
              value={summary.totalAlerts.toString()}
              subtitle={summary.dateRange}
            />
            <KpiCard
              title="High-Score Alerts"
              value={summary.highScoreAlerts.toString()}
              subtitle="Score ≥7"
            />
          </div>
        )}

        {/* Main Content */}
        {hasEnoughData && (
          <div className="space-y-6">
            {/* Impact Score Chart */}
            <ImpactByScoreChart data={scorePerformance} />

            {/* Two Column Layout for Tables */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Event Performance */}
              <EventPerformanceTable data={eventPerformance} />

              {/* False Positives */}
              <FalsePositiveTable
                data={falsePositives}
                onReasonChange={handleReasonChange}
              />
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <p className="font-medium mb-2">How backtesting works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Data Source:</strong> Articles scraped from News Scraper with price tracking
            </li>
            <li>
              <strong>News Impact:</strong> Stock move minus market (SPY) move = news-specific impact
            </li>
            <li>
              <strong>Hit Rate:</strong> % of high-score alerts that moved ≥3%
            </li>
            <li>
              <strong>False Positives:</strong> High-score alerts with &lt;2% actual move
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
