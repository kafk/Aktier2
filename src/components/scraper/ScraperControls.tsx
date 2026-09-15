"use client";

import { Play, Pause, Square, RefreshCw, Calendar } from "lucide-react";
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

export type NewsSource = "yahoo" | "placera" | "placera_press" | "mfn" | "mfn_reports" | "mfn_company" | "nordic" | "nordic_reports" | "all" | "both";
export type PlaceraScrapeMode = "feed" | "search" | "both";
export type PlaceraTab = "all" | "pressmeddelande" | "telegram" | "extern-analys";

interface ScraperControlsProps {
  daysToScrape: number;
  onDaysChange: (days: number) => void;
  dateFilterMode?: "days" | "custom";
  onDateFilterModeChange?: (mode: "days" | "custom") => void;
  startDate?: string;
  onStartDateChange?: (date: string) => void;
  endDate?: string;
  onEndDateChange?: (date: string) => void;
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
  dateFilterMode = "days",
  onDateFilterModeChange,
  startDate = "",
  onStartDateChange,
  endDate = "",
  onEndDateChange,
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
                  <SelectItem value="mfn_company">🏢 MFN.se (Direkta Bolagsflöden /all/a/volvo)</SelectItem>
                  <SelectItem value="mfn_reports">📊 MFN.se (Endast Kvartals- & Delårsrapporter / sub:report)</SelectItem>
                  <SelectItem value="mfn">📰 MFN.se (Alla Pressmeddelanden & PM)</SelectItem>
                  <SelectItem value="nordic_reports">📈 Alla Nordiska Rapporter (MFN Rapporter + Placera)</SelectItem>
                  <SelectItem value="placera">🇸🇪 Placera.se (Alla nyheter & telegram)</SelectItem>
                  <SelectItem value="placera_press">📢 Placera.se (Endast Pressmeddelanden)</SelectItem>
                  <SelectItem value="nordic">🇸🇪 Placera + MFN.se (Allt Nordiskt)</SelectItem>
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

          {/* Time Period / Date Range Selection */}
          <div className="bg-muted/30 p-3 rounded-lg border border-border/60 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Tidsperiod att skrapa
              </Label>
              <div className="flex rounded-md bg-muted p-0.5 border text-xs">
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    dateFilterMode === "days"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => onDateFilterModeChange?.("days")}
                  disabled={isRunning}
                >
                  Förinställda dagar
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    dateFilterMode === "custom"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => onDateFilterModeChange?.("custom")}
                  disabled={isRunning}
                >
                  Valfri period (Datumintervall)
                </button>
              </div>
            </div>

            {dateFilterMode === "days" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Antal dagar bakåt i tiden</Label>
                  <Select
                    value={daysToScrape.toString()}
                    onValueChange={(v) => onDaysChange(parseInt(v))}
                    disabled={isRunning}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 dag (Idag)</SelectItem>
                      <SelectItem value="3">3 dagar</SelectItem>
                      <SelectItem value="7">7 dagar (1 vecka)</SelectItem>
                      <SelectItem value="14">14 dagar (2 veckor)</SelectItem>
                      <SelectItem value="30">30 dagar (1 månad)</SelectItem>
                      <SelectItem value="60">60 dagar (2 månader)</SelectItem>
                      <SelectItem value="90">90 dagar (1 kvartal)</SelectItem>
                      <SelectItem value="180">180 dagar (6 månader)</SelectItem>
                      <SelectItem value="365">365 dagar (1 år)</SelectItem>
                      <SelectItem value="730">730 dagar (2 år)</SelectItem>
                      <SelectItem value="1095">1 095 dagar (3 år)</SelectItem>
                      <SelectItem value="1825">1 825 dagar (5 år)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Pausa efter (notiser)</Label>
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
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Från datum (Start)</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => onStartDateChange?.(e.target.value)}
                      disabled={isRunning}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Till datum (Slut)</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => onEndDateChange?.(e.target.value)}
                      disabled={isRunning}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Pausa efter (notiser)</Label>
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
                {startDate && (
                  <p className="text-[11px] text-muted-foreground">
                    📅 Skrapar artiklar från <strong>{startDate}</strong> {endDate ? `till och med ${endDate}` : "fram till idag"}.
                  </p>
                )}
              </div>
            )}
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
