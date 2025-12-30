"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScorePerformance } from "@/types/backtesting";

interface ImpactByScoreChartProps {
  data: ScorePerformance[];
}

export function ImpactByScoreChart({ data }: ImpactByScoreChartProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const maxImpact = Math.max(...data.map((d) => d.avgImpact));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Impact Score → Price Movement</CardTitle>
        <CardDescription>
          Average 1-day news impact by score (higher score should = bigger move)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Y-axis label */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
            <span>Impact Score</span>
            <span>Avg 1D News Impact %</span>
          </div>

          {/* Bars */}
          <div className="space-y-2">
            {data.map((item) => (
              <div
                key={item.score}
                className="relative flex items-center gap-3"
                onMouseEnter={() => setHoveredBar(item.score)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {/* Score label */}
                <div className="w-8 text-sm font-medium text-right">{item.score}</div>

                {/* Bar container */}
                <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
                  {/* Bar */}
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-md flex items-center justify-end pr-2"
                    style={{
                      width: `${(item.avgImpact / maxImpact) * 100}%`,
                      minWidth: "40px",
                    }}
                  >
                    <span className="text-xs font-medium text-primary-foreground">
                      {item.avgImpact.toFixed(1)}%
                    </span>
                  </div>

                  {/* Tooltip */}
                  {hoveredBar === item.score && (
                    <div className="absolute left-1/2 -translate-x-1/2 -top-16 bg-foreground text-background px-3 py-2 rounded-md text-xs z-10 whitespace-nowrap shadow-lg">
                      <div className="font-semibold">Score {item.score}</div>
                      <div>Avg move: {item.avgImpact.toFixed(1)}%</div>
                      <div>Sample size: {item.sampleSize} alerts</div>
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-foreground rotate-45" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded" />
              <span>Average 1-day price movement</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
