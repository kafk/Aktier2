"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  comparison?: {
    value: string;
    isPositive: boolean;
  };
}

export function KpiCard({ title, value, subtitle, comparison }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold mt-2">{value}</p>
        {comparison && (
          <div className="flex items-center gap-1 mt-2">
            {comparison.isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span
              className={`text-sm font-medium ${
                comparison.isPositive ? "text-green-500" : "text-red-500"
              }`}
            >
              {comparison.value}
            </span>
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
