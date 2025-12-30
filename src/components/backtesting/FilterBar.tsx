"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BacktestingFilters } from "@/types/backtesting";

interface FilterBarProps {
  filters: BacktestingFilters;
  onFiltersChange: (filters: BacktestingFilters) => void;
  onApply: () => void;
  isLoading?: boolean;
}

export function FilterBar({ filters, onFiltersChange, onApply, isLoading }: FilterBarProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Date Range</span>
        <Select
          value={filters.dateRange}
          onValueChange={(value: BacktestingFilters["dateRange"]) =>
            onFiltersChange({ ...filters, dateRange: value })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Market</span>
        <Select
          value={filters.market}
          onValueChange={(value: BacktestingFilters["market"]) =>
            onFiltersChange({ ...filters, market: value })
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="US">US Stocks</SelectItem>
            <SelectItem value="EU">EU Stocks</SelectItem>
            <SelectItem value="ALL">All Markets</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={onApply} disabled={isLoading}>
        {isLoading ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          "Apply"
        )}
      </Button>
    </div>
  );
}
