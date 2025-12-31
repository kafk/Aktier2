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
import { ScraperState } from "@/types/scraper";

type NewsSource = "yahoo" | "placera" | "both";

interface ScraperControlsProps {
  daysToScrape: number;
  onDaysChange: (days: number) => void;
  notificationLimit: number;
  onNotificationLimitChange: (limit: number) => void;
  newsSource: NewsSource;
  onNewsSourceChange: (source: NewsSource) => void;
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
  scraperState,
  onStart,
  onPause,
  onResume,
  onStop,
  canStart,
}: ScraperControlsProps) {
  const { isRunning, isPaused, progress, totalArticlesScanned, notificationCount } = scraperState;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scraper Controls</CardTitle>
        <CardDescription>Configure and run the news scraper</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuration */}
        <div className="space-y-4">
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
                <SelectItem value="placera">🇸🇪 Placera.se (Swedish)</SelectItem>
                <SelectItem value="yahoo">🇺🇸 Yahoo Finance (US)</SelectItem>
                <SelectItem value="both">Both Sources</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
