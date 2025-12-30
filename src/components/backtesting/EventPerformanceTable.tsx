"use client";

import { useState } from "react";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventPerformance } from "@/types/backtesting";

interface EventPerformanceTableProps {
  data: EventPerformance[];
}

type SortKey = "eventType" | "alertCount" | "avgImpact" | "hitRate";
type SortOrder = "asc" | "desc";

export function EventPerformanceTable({ data }: EventPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("avgImpact");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    const modifier = sortOrder === "asc" ? 1 : -1;

    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal) * modifier;
    }
    return ((aVal as number) - (bVal as number)) * modifier;
  });

  const getHitRateColor = (rate: number) => {
    if (rate >= 70) return "text-green-600";
    if (rate >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getImpactBadge = (impact: number) => {
    if (impact >= 6) return "default";
    if (impact >= 3) return "secondary";
    return "outline";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Type Performance</CardTitle>
        <CardDescription>
          Helps you tune base weights — what to keep or drop
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("eventType")}
                    className="font-medium -ml-3"
                  >
                    Event Type
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
                <th className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("alertCount")}
                    className="font-medium"
                  >
                    Alerts
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
                <th className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("avgImpact")}
                    className="font-medium"
                  >
                    Avg Impact
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
                <th className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("hitRate")}
                    className="font-medium"
                  >
                    ≥3% Hit Rate
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((event) => (
                <tr key={event.eventCode} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{event.eventType}</span>
                      <Badge variant={getImpactBadge(event.avgImpact)} className="text-xs">
                        {event.avgImpact >= 6 ? "High" : event.avgImpact >= 3 ? "Med" : "Low"}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {event.alertCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {event.avgImpact >= 3 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className="font-mono text-sm font-medium">
                        {event.avgImpact.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono text-sm font-medium ${getHitRateColor(event.hitRate)}`}>
                    {event.hitRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Hit Rate = % of alerts that resulted in ≥3% price movement
        </p>
      </CardContent>
    </Card>
  );
}
