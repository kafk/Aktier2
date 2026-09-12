"use client";

import { Play, Pause, Square, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScraperState, MarketDataSource } from "@/types/scraper";

export type NewsSource = "yahoo" | "placera" | "placera_press" | "mfn" | "nordic" | "all" | "both";
export type PlaceraScrapeMode = "feed" | "search" | "both";
export type PlaceraTab = "all" | "pressmeddelande" | "telegram" | "extern-analys";

interface ScraperControlsProps {
  daysToScrape: number;
  onDaysChange: (days: number) => void;
  notificationLimit: number;
  onNotificationLimitChange: (limit: number) => void;
  newsSource: NewsSource;
  onNewsSourceChange: (source: NewsSource) => void;
  marketDataSource?: MarketDataSource;
  onMarketDataSourceChange?: (source: MarketDataSource) => void;
  placeraMode?: PlaceraScrapeMode;
  onPlaceraModeChange?: (mode: PlaceraScrapeMode) => void;
  placeraTab?: PlaceraTab;
  onPlaceraTabChange?: (tab: PlaceraTab) => void;
  scraperState: ScraperState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  canStart: boolean;
}

export function ScraperControls({
  daysToScrape,
  onDaysChange,
  notificationLimit,
  onNotificationLimitChange,
  newsSource,
  onNewsSourceChange,
  marketDataSource = "auto",
  onMarketDataSourceChange,
  placeraMode = "both",
  onPlaceraModeChange,
  placeraTab = "all",
  onPlaceraTabChange,
  scraperState,
  onStart,
  onPause,
  onResume,
  onStop,
  canStart,
}: ScraperControlsProps) {
  const { isRunning, isPaused, progress, totalArticlesScanned, notificationCount } = scraperState;
  const isPlaceraActive = newsSource === "placera" || newsSource === "placera_press" || newsSource === "nordic" || newsSource === "all" || newsSource === "both";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scraper Controls</CardTitle>
        <CardDescription>Configure and run the news scraper</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuration */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* News Source */}
            <div className="space-y-2">
              <Label>News Source</Label>
              <Select
                value={newsSource}
                onValueChange={(v) => onNewsSourceChange(v as NewsSource)}
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placera">🇸🇪 Placera.se (Alla nyheter & telegram)</SelectItem>
                  <SelectItem value="placera_press">📢 Placera.se (Endast Pressmeddelanden)</SelectItem>
                  <SelectItem value="mfn">📰 MFN.se (Nordic Press Releases & Regulatory)</SelectItem>
                  <SelectItem value="nordic">🇸🇪 Placera + MFN.se (All Nordic)</SelectItem>
                  <SelectItem value="yahoo">🇺🇸 Yahoo Finance (US News)</SelectItem>
                  <SelectItem value="all">🌐 All Sources (Placera, MFN, Yahoo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Market Data Provider */}
            <div className="space-y-2">
              <Label>Market Data Provider</Label>
              <Select
                value={marketDataSource}
                onValueChange={(v) => onMarketDataSourceChange?.(v as MarketDataSource)}
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">⚡ Auto (Smart Fallback)</SelectItem>
                  <SelectItem value="yahoo">🟣 Yahoo Finance (Quotes & Intraday)</SelectItem>
                  <SelectItem value="tradingview">📈 TradingView (Global Scan & Quotes)</SelectItem>
                  <SelectItem value="polygon">🟢 Polygon.io / Massive (US Intraday)</SelectItem>
                  <SelectItem value="google">🔵 Google Finance (Web Quotes)</SelectItem>
                  <SelectItem value="avanza">🇸🇪 Avanza (Swedish Market Guide)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Placera Options (Shown when Placera is active) */}
          {isPlaceraActive && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-3 rounded-lg border border-border/50">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Placera Flik / Kategori
                </Label>
                <Select
                  value={newsSource === "placera_press" ? "pressmeddelande" : placeraTab}
                  onValueChange={(v) => onPlaceraTabChange?.(v as PlaceraTab)}
                  disabled={isRunning || newsSource === "placera_press"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pressmeddelande">📢 Endast Pressmeddelanden (tab=pressmeddelande&limit=100)</SelectItem>
                    <SelectItem value="all">⚡ Alla kategorier (Telegram + Press + Analys)</SelectItem>
                    <SelectItem value="telegram">📰 Endast Telegram</SelectItem>
                    <SelectItem value="extern-analys">📊 Endast Analyser</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Placera Scraping Strategy
                </Label>
                <Select
                  value={placeraMode}
                  onValueChange={(v) => onPlaceraModeChange?.(v as PlaceraScrapeMode)}
                  disabled={isRunning}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">⚡ Combined (Deep Feed + Stock Search)</SelectItem>
                    <SelectItem value="feed">🔄 Deep Feed Pagination (Full Market)</SelectItem>
                    <SelectItem value="search">🎯 Stock-Specific Search (Targeted)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Days to Scrape</Label>
              <Select
                value={daysToScrape.toString()}
                onValueChange={(v) => onDaysChange(parseInt(v))}
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pause After (notifications)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={notificationLimit}
                onChange={(e) => onNotificationLimitChange(parseInt(e.target.value) || 10)}
                disabled={isRunning && !isPaused}
              />
            </div>
          </div>
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{totalArticlesScanned} articles scanned</span>
              <span>{notificationCount} / {notificationLimit} notifications</span>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={onStart} disabled={!canStart} className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Scrape Now
            </Button>
          ) : isPaused ? (
            <>
              <Button onClick={onResume} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Continue
              </Button>
              <Button onClick={onStop} variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onPause} variant="secondary" className="flex-1">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button onClick={onStop} variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>

        {/* Status */}
        {isRunning && (
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isPaused ? "bg-yellow-500" : "bg-green-500 animate-pulse"}`} />
            <span>{isPaused ? "Paused - Notification limit reached" : "Scanning news articles..."}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
