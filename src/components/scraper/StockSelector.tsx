"use client";

import { useState } from "react";
import { X, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stock, popularStocks } from "@/types/scraper";

interface StockSelectorProps {
  selectedStocks: Stock[];
  onStocksChange: (stocks: Stock[]) => void;
}

export function StockSelector({ selectedStocks, onStocksChange }: StockSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [customSymbol, setCustomSymbol] = useState("");
  const [marketFilter, setMarketFilter] = useState<"all" | "us" | "swe">("all");

  const isSwedish = (s: Stock) =>
    s.symbol.includes(" ") ||
    ["EVO", "AZN", "SAND", "SINCH", "TELIA", "EQT", "BOL", "ALFA", "ABB"].includes(s.symbol);

  const filteredStocks = popularStocks.filter((stock) => {
    if (selectedStocks.some((s) => s.symbol === stock.symbol)) return false;
    if (marketFilter === "us" && isSwedish(stock)) return false;
    if (marketFilter === "swe" && !isSwedish(stock)) return false;

    return (
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const addStock = (stock: Stock) => {
    if (!selectedStocks.some((s) => s.symbol === stock.symbol)) {
      onStocksChange([...selectedStocks, stock]);
    }
  };

  const removeStock = (symbol: string) => {
    onStocksChange(selectedStocks.filter((s) => s.symbol !== symbol));
  };

  const addCustomStock = () => {
    if (customSymbol.trim() && !selectedStocks.some((s) => s.symbol === customSymbol.toUpperCase())) {
      onStocksChange([
        ...selectedStocks,
        { symbol: customSymbol.toUpperCase(), name: customSymbol.toUpperCase() },
      ]);
      setCustomSymbol("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Stocks to Monitor</CardTitle>
        <CardDescription>Choose US or Swedish stocks to scan for news</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Stocks */}
        {selectedStocks.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Selected ({selectedStocks.length})</label>
              <button
                onClick={() => onStocksChange([])}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Clear all (scan all market news)
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedStocks.map((stock) => (
                <Badge key={stock.symbol} variant="default" className="gap-1 pr-1">
                  {stock.symbol} {stock.name && stock.name !== stock.symbol ? `(${stock.name})` : ""}
                  <button
                    onClick={() => removeStock(stock.symbol)}
                    className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
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
            placeholder="Enter stock symbol (e.g., NVDA, AAPL, VOLV B)"
            value={customSymbol}
            onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && addCustomStock()}
            className="flex-1"
          />
          <Button onClick={addCustomStock} disabled={!customSymbol.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Popular Stocks & Market Tabs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Popular Stocks</label>
            <div className="flex gap-1 text-xs">
              <button
                type="button"
                onClick={() => setMarketFilter("all")}
                className={`px-2 py-0.5 rounded ${
                  marketFilter === "all" ? "bg-primary text-primary-foreground font-semibold" : "bg-muted text-muted-foreground"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setMarketFilter("us")}
                className={`px-2 py-0.5 rounded ${
                  marketFilter === "us" ? "bg-primary text-primary-foreground font-semibold" : "bg-muted text-muted-foreground"
                }`}
              >
                🇺🇸 US Tech
              </button>
              <button
                type="button"
                onClick={() => setMarketFilter("swe")}
                className={`px-2 py-0.5 rounded ${
                  marketFilter === "swe" ? "bg-primary text-primary-foreground font-semibold" : "bg-muted text-muted-foreground"
                }`}
              >
                🇸🇪 Swedish
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search stocks (e.g., Nvidia, Apple, Volvo)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto p-1">
            {filteredStocks.map((stock) => (
              <Badge
                key={stock.symbol}
                variant="outline"
                className="cursor-pointer hover:bg-accent py-1 px-2.5 transition-colors"
                onClick={() => addStock(stock)}
              >
                <Plus className="h-3 w-3 mr-1" />
                <span className="font-semibold">{stock.symbol}</span>
                {stock.name && stock.name !== stock.symbol && (
                  <span className="ml-1 text-xs text-muted-foreground">· {stock.name}</span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
