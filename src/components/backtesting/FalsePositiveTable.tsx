"use client";

import { useState } from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FalsePositive, falsePositiveReasons } from "@/types/backtesting";

interface FalsePositiveTableProps {
  data: FalsePositive[];
  onReasonChange?: (id: string, reason: string) => void;
}

export function FalsePositiveTable({ data, onReasonChange }: FalsePositiveTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            False Positives
          </CardTitle>
          <CardDescription>
            High-score alerts (≥7) with low actual impact (&lt;1.5%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No false positives found</p>
            <p className="text-sm">Great — your scoring is accurate!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          False Positives
        </CardTitle>
        <CardDescription>
          High-score alerts (≥7) with low actual impact (&lt;1.5%) — this is where your system improves
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Ticker</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Event</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Score</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actual Impact</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {data.map((fp) => (
                <>
                  <tr
                    key={fp.id}
                    className="border-t hover:bg-muted/30 cursor-pointer"
                    onClick={() => setExpandedRow(expandedRow === fp.id ? null : fp.id)}
                  >
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono font-bold">
                        {fp.ticker}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{fp.eventType}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="default">{fp.score}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-red-500 font-mono font-medium">
                        {fp.actualImpact.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {onReasonChange ? (
                        <Select
                          value={fp.reason}
                          onValueChange={(value) => onReasonChange(fp.id, value)}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {falsePositiveReasons.map((reason) => (
                              <SelectItem key={reason} value={reason} className="text-xs">
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {fp.reason}
                        </Badge>
                      )}
                    </td>
                  </tr>
                  {expandedRow === fp.id && (
                    <tr key={`${fp.id}-expanded`} className="bg-muted/20">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="text-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-muted-foreground">Date: </span>
                              <span>{formatDate(fp.date)}</span>
                            </div>
                            <a
                              href="#"
                              className="text-primary hover:underline flex items-center gap-1 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Alert <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <p className="mt-2 text-muted-foreground">{fp.title}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Click row to expand details • Tag reasons to identify patterns
        </p>
      </CardContent>
    </Card>
  );
}
