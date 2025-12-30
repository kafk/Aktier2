"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
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
  generateMockSummary,
  generateMockScorePerformance,
  generateMockEventPerformance,
  generateMockFalsePositives,
} from "@/types/backtesting";

const MIN_ALERTS_FOR_ANALYSIS = 20;

export default function BacktestingPage() {
  const [filters, setFilters] = useState<BacktestingFilters>({
    dateRange: "30d",
    market: "US",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Data state
  const [summary, setSummary] = useState<BacktestingSummary | null>(() =>
    generateMockSummary(filters)
  );
  const [scorePerformance, setScorePerformance] = useState<ScorePerformance[]>(() =>
    generateMockScorePerformance()
  );
  const [eventPerformance, setEventPerformance] = useState<EventPerformance[]>(() =>
    generateMockEventPerformance()
  );
  const [falsePositives, setFalsePositives] = useState<FalsePositive[]>(() =>
    generateMockFalsePositives()
  );

  const handleApply = useCallback(() => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setSummary(generateMockSummary(filters));
      setScorePerformance(generateMockScorePerformance());
      setEventPerformance(generateMockEventPerformance());
      setFalsePositives(generateMockFalsePositives());
      setIsLoading(false);
    }, 800);
  }, [filters]);

  const handleReasonChange = useCallback((id: string, reason: string) => {
    setFalsePositives((prev) =>
      prev.map((fp) => (fp.id === id ? { ...fp, reason } : fp))
    );
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
        {/* Filter Bar */}
        <div className="mb-6">
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            onApply={handleApply}
            isLoading={isLoading}
          />
        </div>

        {/* Not Enough Data Warning */}
        {!hasEnoughData && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Not enough data to evaluate performance</p>
                  <p className="text-sm text-muted-foreground">
                    Backtesting requires at least {MIN_ALERTS_FOR_ANALYSIS} alerts.
                    Currently: {summary?.totalAlerts || 0} alerts.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <KpiCard
              title={`Avg 1D Move (Score ≥7)`}
              value={`${summary.avgMoveHighScore.toFixed(1)}%`}
              comparison={{
                value: `+${(summary.avgMoveHighScore - summary.baselineMove).toFixed(1)}% vs baseline`,
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

        {/* Footer Info */}
        <div className="mt-8 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <p className="font-medium mb-2">What this page tells you:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Impact Score → Movement:</strong> Higher scores should correlate with bigger moves
            </li>
            <li>
              <strong>Event Performance:</strong> Which event types are worth tracking
            </li>
            <li>
              <strong>False Positives:</strong> Where your scoring system needs improvement
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
