"use client";

import { useState, useMemo } from "react";
import { X, Plus, Search, CheckCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stock, StockMarket, StockList, popularStocks } from "@/types/scraper";

interface StockSelectorProps {
  selectedStocks: Stock[];
  onStocksChange: (stocks: Stock[]) => void;
}

type MarketTab = "all" | "SE" | "US";
type SubListFilter = "all" | StockList;

export function StockSelector({ selectedStocks, onStocksChange }: StockSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [customSymbol, setCustomSymbol] = useState("");
  const [marketTab, setMarketTab] = useState<MarketTab>("SE");
  const [subListFilter, setSubListFilter] = useState<SubListFilter>("all");

  // Filter stocks by market, sub-list, and search query
  const availableStocks = useMemo(() => {
    return popularStocks.filter((stock) => {
      // Exclude already selected
      if (selectedStocks.some((s) => s.symbol === stock.symbol)) return false;

      // Filter by market
      if (marketTab !== "all" && stock.market !== marketTab) return false;

      // Filter by sub-list
      if (subListFilter !== "all" && stock.list !== subListFilter) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesSymbol = stock.symbol.toLowerCase().includes(query);
        const matchesName = stock.name.toLowerCase().includes(query);
        const matchesList = stock.list ? stock.list.toLowerCase().includes(query) : false;
        return matchesSymbol || matchesName || matchesList;
      }

      return true;
    });
  }, [selectedStocks, marketTab, subListFilter, searchTerm]);

  const addStock = (stock: Stock) => {
    if (!selectedStocks.some((s) => s.symbol === stock.symbol)) {
      onStocksChange([...selectedStocks, stock]);
    }
  };

  const addAllVisible = () => {
    const newItems = availableStocks.filter(
      (avail) => !selectedStocks.some((s) => s.symbol === avail.symbol)
    );
    if (newItems.length > 0) {
      onStocksChange([...selectedStocks, ...newItems]);
    }
  };

  const removeStock = (symbol: string) => {
    onStocksChange(selectedStocks.filter((s) => s.symbol !== symbol));
  };

  const addCustomStock = () => {
    const trimmed = customSymbol.trim().toUpperCase();
    if (trimmed && !selectedStocks.some((s) => s.symbol === trimmed)) {
      onStocksChange([
        ...selectedStocks,
        { symbol: trimmed, name: trimmed, market: trimmed.endsWith(".ST") || trimmed.includes(" ") ? "SE" : "US" },
      ]);
      setCustomSymbol("");
    }
  };

  const getListBadgeVariant = (list?: StockList) => {
    switch (list) {
      case "OMXS30": return "bg-blue-600 text-white";
      case "Large Cap": return "bg-indigo-600 text-white";
      case "Mid Cap": return "bg-emerald-600 text-white";
      case "Small Cap": return "bg-amber-600 text-white";
      case "First North": return "bg-purple-600 text-white";
      case "US Tech": return "bg-cyan-600 text-white";
      case "US Blue Chips": return "bg-sky-600 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Select Stocks to Monitor</span>
        </CardTitle>
        <CardDescription>
          Filter and select Swedish (OMXS30, Large, Mid, Small Cap, First North) or US stocks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Stocks */}
        {selectedStocks.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Selected Stocks ({selectedStocks.length})</label>
              <button
                onClick={() => onStocksChange([])}
                className="text-xs text-red-600 hover:text-red-700 hover:underline font-medium"
              >
                Clear all (switch to market-wide mode)
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border rounded-md bg-muted/20">
              {selectedStocks.map((stock) => (
                <Badge key={stock.symbol} variant="default" className="gap-1 pr-1 text-xs">
                  {stock.symbol} {stock.name && stock.name !== stock.symbol ? `(${stock.name})` : ""}
                  <button
                    onClick={() => removeStock(stock.symbol)}
                    className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
                    title="Remove stock"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground bg-muted/30">
            🌐 <strong>Market-Wide Mode:</strong> No specific stocks selected. The scraper will scan <strong>all news</strong> for matching keywords.
          </div>
        )}

        {/* Add Custom Stock */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter custom ticker (e.g., VOLV B, ELTEL, NVDA, AAPL)"
            value={customSymbol}
            onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && addCustomStock()}
            className="flex-1 text-sm font-mono"
          />
          <Button onClick={addCustomStock} disabled={!customSymbol.trim()} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Market Tabs & Sub-Lists */}
        <div className="space-y-3 pt-2 border-t">
          {/* Main Market Tabs */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Börs & Marknad:
            </label>
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg text-xs">
              <button
                type="button"
                onClick={() => { setMarketTab("SE"); setSubListFilter("all"); }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  marketTab === "SE"
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🇸🇪 Sverige (Stockholm)
              </button>
              <button
                type="button"
                onClick={() => { setMarketTab("US"); setSubListFilter("all"); }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  marketTab === "US"
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🇺🇸 USA (Wall Street)
              </button>
              <button
                type="button"
                onClick={() => { setMarketTab("all"); setSubListFilter("all"); }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  marketTab === "all"
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Alla
              </button>
            </div>
          </div>

          {/* Sub-List Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Lista:</span>
            <button
              type="button"
              onClick={() => setSubListFilter("all")}
              className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                subListFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary font-medium"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Alla
            </button>

            {marketTab === "SE" || marketTab === "all" ? (
              <>
                <button
                  type="button"
                  onClick={() => setSubListFilter("OMXS30")}
                  className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                    subListFilter === "OMXS30"
                      ? "bg-blue-600 text-white border-blue-600 font-medium"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  OMXS30 (30 st)
                </button>
                <button
                  type="button"
                  onClick={() => setSubListFilter("Large Cap")}
                  className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                    subListFilter === "Large Cap"
                      ? "bg-indigo-600 text-white border-indigo-600 font-medium"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Large Cap
                </button>
                <button
                  type="button"
                  onClick={() => setSubListFilter("Mid Cap")}
                  className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                    subListFilter === "Mid Cap"
                      ? "bg-emerald-600 text-white border-emerald-600 font-medium"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Mid Cap
                </button>
                <button
                  type="button"
                  onClick={() => setSubListFilter("Small Cap")}
                  className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                    subListFilter === "Small Cap"
                      ? "bg-amber-600 text-white border-amber-600 font-medium"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Small Cap
                </button>
                <button
                  type="button"
                  onClick={() => setSubListFilter("First North")}
                  className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                    subListFilter === "First North"
                      ? "bg-purple-600 text-white border-purple-600 font-medium"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  First North
                </button>
              </>
            ) : null}

            {marketTab === "US" || marketTab === "all" ? (
              <>
                <button
                  type="button"
                  onClick={() => setSubListFilter("US Tech")}
                  className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                    subListFilter === "US Tech"
                      ? "bg-cyan-600 text-white border-cyan-600 font-medium"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  US Tech
                </button>
                <button
                  type="button"
                  onClick={() => setSubListFilter("US Blue Chips")}
                  className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                    subListFilter === "US Blue Chips"
                      ? "bg-sky-600 text-white border-sky-600 font-medium"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  US Blue Chips
                </button>
              </>
            ) : null}
          </div>

          {/* Search bar & Batch select button */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search stocks or lists (e.g., Eltel, Volvo, Nvidia, Mid Cap)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>
            {availableStocks.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAllVisible}
                className="h-8 text-xs whitespace-nowrap"
                title="Add all currently filtered stocks to monitoring"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1 text-primary" />
                Select All ({availableStocks.length})
              </Button>
            )}
          </div>

          {/* Available Stocks Grid */}
          <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto p-1.5 border rounded-md bg-background">
            {availableStocks.length === 0 ? (
              <div className="w-full py-6 text-center text-xs text-muted-foreground">
                All stocks in this category are already selected or match no search results.
              </div>
            ) : (
              availableStocks.map((stock) => (
                <div
                  key={stock.symbol}
                  onClick={() => addStock(stock)}
                  className="group flex items-center gap-1.5 border rounded-md px-2.5 py-1 text-xs cursor-pointer hover:bg-accent hover:border-primary transition-all select-none"
                  title={`Click to monitor ${stock.name} (${stock.symbol})`}
                >
                  <Plus className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-semibold">{stock.symbol}</span>
                  <span className="text-muted-foreground text-[11px]">· {stock.name}</span>
                  {stock.list && (
                    <span
                      className={`text-[9px] font-medium px-1.5 py-0.2 rounded ${getListBadgeVariant(
                        stock.list
                      )}`}
                    >
                      {stock.list}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
