"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  BarChart3,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Database,
  ArrowUpDown,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewsArticle } from "@/types/scraper";
import { isSwedishStockSymbol, getStockDisplayName, getStockFullName } from "@/lib/stockAliases";

type SortField =
  | "date"
  | "score"
  | "stock"
  | "title"
  | "type"
  | "priceAtEvent"
  | "move10m"
  | "move15m"
  | "move30m"
  | "move1h"
  | "move2h"
  | "move1d"
  | "move1w";

function compareNullableNumber(
  valA: number | null | undefined,
  valB: number | null | undefined,
  dir: "asc" | "desc"
): number {
  const hasA = valA !== null && valA !== undefined && !isNaN(valA);
  const hasB = valB !== null && valB !== undefined && !isNaN(valB);

  // Put rows without data at the bottom regardless of sort direction
  if (!hasA && !hasB) return 0;
  if (!hasA) return 1;
  if (!hasB) return -1;

  if (valA! < valB!) return dir === "asc" ? -1 : 1;
  if (valA! > valB!) return dir === "asc" ? 1 : -1;
  return 0;
}

export default function ArchivePage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<string>("all");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("all");
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Load articles from Server DB (and merge with local storage)
  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch from server DB
      const res = await fetch("/api/articles");
      let serverArticles: NewsArticle[] = [];
      if (res.ok) {
        const data = await res.json();
        serverArticles = data.articles || [];
      }

      // 2. Read from localStorage to ensure any un-synced items are saved
      let localArticles: NewsArticle[] = [];
      try {
        const rawLocal = localStorage.getItem("scraped-articles");
        if (rawLocal) {
          localArticles = JSON.parse(rawLocal);
        }
      } catch (err) {
        console.warn("Could not read local articles:", err);
      }

      // Merge and deduplicate by URL or ID
      const map = new Map<string, NewsArticle>();
      for (const a of serverArticles) {
        map.set(a.url || a.id, a);
      }
      for (const a of localArticles) {
        if (!map.has(a.url || a.id)) {
          map.set(a.url || a.id, a);
        }
      }

      const merged = Array.from(map.values());
      setArticles(merged);

      // If there were local items not on server, sync to server in background
      if (merged.length > serverArticles.length) {
        fetch("/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(merged),
        }).catch((e) => console.warn("Background sync failed:", e));
      }
    } catch (error) {
      console.error("Error loading archive articles:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // Unique lists for filters
  const stockOptions = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => {
      if (a.matchedStock) set.add(a.matchedStock);
    });
    return Array.from(set).sort((a, b) => {
      const nameA = getStockDisplayName(a).toLowerCase();
      const nameB = getStockDisplayName(b).toLowerCase();
      return nameA.localeCompare(nameB, "sv");
    });
  }, [articles]);

  const eventTypeOptions = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => {
      if (a.eventType) set.add(a.eventType);
    });
    return Array.from(set).sort();
  }, [articles]);

  // Filtered & Sorted Articles
  const filteredArticles = useMemo(() => {
    return articles
      .filter((a) => {
        // Stock filter
        if (selectedStock !== "all" && a.matchedStock !== selectedStock) return false;
        // Sentiment filter
        if (selectedSentiment !== "all" && a.sentiment !== selectedSentiment) return false;
        // Event type filter
        if (selectedEventType !== "all" && a.eventType !== selectedEventType) return false;
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = a.title?.toLowerCase().includes(q);
          const matchSummary = a.summary?.toLowerCase().includes(q);
          const matchStock = a.matchedStock?.toLowerCase().includes(q);
          const matchFullName = getStockFullName(a.matchedStock)?.toLowerCase().includes(q);
          const matchKw = a.matchedKeywords?.some((k) => k.toLowerCase().includes(q));
          if (!matchTitle && !matchSummary && !matchStock && !matchFullName && !matchKw) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === "date") {
          const tA = new Date(a.publishedAt).getTime() || 0;
          const tB = new Date(b.publishedAt).getTime() || 0;
          return sortDirection === "asc" ? tA - tB : tB - tA;
        }

        if (sortField === "score") {
          return compareNullableNumber(a.impactScore, b.impactScore, sortDirection);
        }

        if (sortField === "priceAtEvent") {
          return compareNullableNumber(a.priceAtEvent, b.priceAtEvent, sortDirection);
        }

        if (sortField === "move10m") {
          return compareNullableNumber(a.move10m, b.move10m, sortDirection);
        }

        if (sortField === "move15m") {
          return compareNullableNumber(a.move15m, b.move15m, sortDirection);
        }

        if (sortField === "move30m") {
          return compareNullableNumber(a.move30m, b.move30m, sortDirection);
        }

        if (sortField === "move1h") {
          return compareNullableNumber(a.move1h, b.move1h, sortDirection);
        }

        if (sortField === "move2h") {
          return compareNullableNumber(a.move2h, b.move2h, sortDirection);
        }

        if (sortField === "move1d") {
          return compareNullableNumber(a.move1d, b.move1d, sortDirection);
        }

        if (sortField === "move1w") {
          return compareNullableNumber(a.move1w, b.move1w, sortDirection);
        }

        if (sortField === "stock") {
          const strA = getStockFullName(a.matchedStock) || a.matchedStock || "";
          const strB = getStockFullName(b.matchedStock) || b.matchedStock || "";
          return sortDirection === "asc"
            ? strA.localeCompare(strB, "sv")
            : strB.localeCompare(strA, "sv");
        }

        if (sortField === "title") {
          const strA = a.title || "";
          const strB = b.title || "";
          return sortDirection === "asc"
            ? strA.localeCompare(strB, "sv")
            : strB.localeCompare(strA, "sv");
        }

        if (sortField === "type") {
          const strA = a.eventType || "";
          const strB = b.eventType || "";
          return sortDirection === "asc"
            ? strA.localeCompare(strB, "sv")
            : strB.localeCompare(strA, "sv");
        }

        return 0;
      });
  }, [articles, selectedStock, selectedSentiment, selectedEventType, searchQuery, sortField, sortDirection]);

  // Stats Summary
  const stats = useMemo(() => {
    const total = articles.length;
    const positive = articles.filter((a) => a.sentiment === "positive").length;
    const negative = articles.filter((a) => a.sentiment === "negative").length;
    const neutral = articles.filter((a) => a.sentiment === "neutral").length;
    const highScores = articles.filter((a) => a.impactScore >= 7).length;
    const withMove1d = articles.filter((a) => a.move1d !== null && a.move1d !== undefined);
    const avgMove1d =
      withMove1d.length > 0
        ? withMove1d.reduce((sum, a) => sum + Math.abs(a.move1d || 0), 0) / withMove1d.length
        : 0;

    return { total, positive, negative, neutral, highScores, avgMove1d };
  }, [articles]);

  const handleExportCsv = () => {
    window.location.href = "/api/articles?format=csv";
  };

  const toggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllFilteredSelected =
    filteredArticles.length > 0 &&
    filteredArticles.every((a) => selectedIds.has(a.id));

  const isSomeFilteredSelected =
    filteredArticles.some((a) => selectedIds.has(a.id)) && !isAllFilteredSelected;

  const toggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Deselect all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredArticles.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredArticles.forEach((a) => next.add(a.id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    if (
      !confirm(
        `Är du säker på att du vill ta bort ${idsToDelete.length} markerade ${
          idsToDelete.length === 1 ? "rapport" : "rapporter"
        } från databasen?`
      )
    ) {
      return;
    }

    try {
      await fetch("/api/articles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      const deletedSet = new Set(idsToDelete);
      setArticles((prev) => prev.filter((a) => !deletedSet.has(a.id)));

      // Also remove from localStorage
      try {
        const stored = JSON.parse(localStorage.getItem("scraped-articles") || "[]");
        const updated = stored.filter((a: NewsArticle) => !deletedSet.has(a.id));
        localStorage.setItem("scraped-articles", JSON.stringify(updated));
      } catch {}

      setSelectedIds(new Set());
    } catch (err) {
      console.error("Error deleting selected articles:", err);
    }
  };

  const handleExportSelectedCsv = () => {
    const selectedArticles = articles.filter((a) => selectedIds.has(a.id));
    if (selectedArticles.length === 0) return;

    const headers = [
      "Symbol",
      "Title",
      "Source",
      "Published At",
      "Sentiment",
      "Impact Score",
      "Event Type",
      "Event Price",
      "10m Price",
      "10m Move %",
      "15m Price",
      "15m Move %",
      "30m Price",
      "30m Move %",
      "1h Price",
      "1h Move %",
      "2h Price",
      "2h Move %",
      "1d Price",
      "1d Move %",
      "1w Price",
      "1w Move %",
      "Matched Keywords",
      "URL",
    ];

    const escapeCsv = (str: any) => `"${String(str ?? "").replace(/"/g, '""')}"`;
    const rows = selectedArticles.map((a) => [
      escapeCsv(a.matchedStock),
      escapeCsv(a.title),
      escapeCsv(a.source),
      escapeCsv(a.publishedAt),
      escapeCsv(a.sentiment),
      escapeCsv(a.impactScore),
      escapeCsv(a.eventType || ""),
      escapeCsv(a.priceAtEvent?.toFixed(2)),
      escapeCsv(a.price10m?.toFixed(2)),
      escapeCsv(a.move10m !== null && a.move10m !== undefined ? a.move10m.toFixed(2) + "%" : ""),
      escapeCsv(a.price15m?.toFixed(2)),
      escapeCsv(a.move15m !== null && a.move15m !== undefined ? a.move15m.toFixed(2) + "%" : ""),
      escapeCsv(a.price30m?.toFixed(2)),
      escapeCsv(a.move30m !== null && a.move30m !== undefined ? a.move30m.toFixed(2) + "%" : ""),
      escapeCsv(a.price1h?.toFixed(2)),
      escapeCsv(a.move1h !== null && a.move1h !== undefined ? a.move1h.toFixed(2) + "%" : ""),
      escapeCsv(a.price2h?.toFixed(2)),
      escapeCsv(a.move2h !== null && a.move2h !== undefined ? a.move2h.toFixed(2) + "%" : ""),
      escapeCsv(a.price1d?.toFixed(2)),
      escapeCsv(a.move1d !== null && a.move1d !== undefined ? a.move1d.toFixed(2) + "%" : ""),
      escapeCsv(a.price1w?.toFixed(2)),
      escapeCsv(a.move1w !== null && a.move1w !== undefined ? a.move1w.toFixed(2) + "%" : ""),
      escapeCsv(a.matchedKeywords?.join(", ")),
      escapeCsv(a.url),
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `valda_rapporter_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna sparade notis?")) return;
    try {
      await fetch(`/api/articles?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setArticles((prev) => prev.filter((a) => a.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      // Also remove from localStorage
      try {
        const stored = JSON.parse(localStorage.getItem("scraped-articles") || "[]");
        const updated = stored.filter((a: NewsArticle) => a.id !== id);
        localStorage.setItem("scraped-articles", JSON.stringify(updated));
      } catch {}
    } catch (err) {
      console.error("Error deleting article:", err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("VARNING: Vill du rensa hela databasen över sparade rapporter? Detta kan inte ångras.")) return;
    try {
      await fetch("/api/articles", { method: "DELETE" });
      localStorage.removeItem("scraped-articles");
      setArticles([]);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Error clearing articles:", err);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      if (field === "stock" || field === "title" || field === "type") {
        setSortDirection("asc");
      } else {
        setSortDirection("desc");
      }
    }
  };

  const renderSortHeader = (
    field: SortField,
    label: string,
    align: "left" | "center" | "right" = "center",
    extraClass: string = ""
  ) => {
    const isActive = sortField === field;
    return (
      <th
        className={`py-3 px-2 text-${align} cursor-pointer hover:text-foreground hover:bg-muted/70 transition-colors select-none ${
          isActive ? "text-primary font-bold bg-primary/10" : ""
        } ${extraClass}`}
        onClick={() => toggleSort(field)}
        title={`Sortera på ${label} (${
          isActive && sortDirection === "asc"
            ? "Klicka för fallande (högst/nyast först)"
            : "Klicka för stigande (lägst/äldst först)"
        })`}
      >
        <div
          className={`flex items-center gap-1 ${
            align === "center"
              ? "justify-center"
              : align === "right"
              ? "justify-end"
              : "justify-start"
          }`}
        >
          <span>{label}</span>
          {isActive ? (
            sortDirection === "asc" ? (
              <ChevronUp className="h-3.5 w-3.5 text-primary shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0" />
            )
          ) : (
            <ArrowUpDown className="h-2.5 w-2.5 opacity-40 shrink-0" />
          )}
        </div>
      </th>
    );
  };

  const renderMoveBadge = (move: number | null | undefined) => {
    if (move === null || move === undefined) {
      return <span className="text-muted-foreground text-xs font-mono">-</span>;
    }
    const isPos = move > 0.05;
    const isNeg = move < -0.05;
    const color = isPos
      ? "text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/60"
      : isNeg
      ? "text-rose-700 bg-rose-50 border-rose-300 dark:text-rose-300 dark:bg-rose-950/60"
      : "text-muted-foreground bg-muted";

    return (
      <span className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold border ${color}`}>
        {move > 0 ? "+" : ""}
        {move.toFixed(2)}%
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-background">
      <Header
        title="Rapportarkiv & Sparade Händelser"
        titleClassName="text-indigo-600"
        subtitle="Permanent databas över alla skrapade kvartalsrapporter, PM och kursreaktioner"
        backHref="/scraper"
      >
        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={articles.length === 0}>
          <Download className="h-4 w-4 mr-2 text-emerald-600" />
          Exportera CSV
        </Button>
        <Button variant="outline" size="sm" onClick={loadArticles}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Uppdatera
        </Button>
        <Link href="/backtesting">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Backtesting
          </Button>
        </Link>
        {articles.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClearAll} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" />
            Rensa Arkiv
          </Button>
        )}
      </Header>

      <div className="container mx-auto px-4 max-w-[1920px] space-y-6 pb-16">
        {/* KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <Card className="shadow-xs border border-border/80">
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Totalt i Databas</span>
              <span className="text-2xl font-bold mt-1">{stats.total}</span>
            </CardContent>
          </Card>
          <Card className="shadow-xs border border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Positiva</span>
              <span className="text-2xl font-bold text-emerald-600 mt-1">{stats.positive}</span>
            </CardContent>
          </Card>
          <Card className="shadow-xs border border-rose-500/20 bg-rose-500/5">
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">Negativa</span>
              <span className="text-2xl font-bold text-rose-600 mt-1">{stats.negative}</span>
            </CardContent>
          </Card>
          <Card className="shadow-xs border border-border/80">
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Neutrala</span>
              <span className="text-2xl font-bold mt-1">{stats.neutral}</span>
            </CardContent>
          </Card>
          <Card className="shadow-xs border border-border/80">
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hög Impact (7+)</span>
              <span className="text-2xl font-bold mt-1 text-primary">{stats.highScores}</span>
            </CardContent>
          </Card>
          <Card className="shadow-xs border border-border/80">
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Snittrörelse 1D</span>
              <span className="text-2xl font-bold mt-1">{stats.avgMove1d > 0 ? `±${stats.avgMove1d.toFixed(2)}%` : "0.00%"}</span>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search Toolbar */}
        <Card className="shadow-xs border border-border/80">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sök bolag, rubrik, nyckelord..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Stock Filter */}
              <div>
                <Select value={selectedStock} onValueChange={setSelectedStock}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alla Aktier" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    <SelectItem value="all">Alla Aktier ({stockOptions.length})</SelectItem>
                    {stockOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {getStockDisplayName(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sentiment Filter */}
              <div>
                <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alla Sentiment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla Sentiment</SelectItem>
                    <SelectItem value="positive">🟢 Positivt</SelectItem>
                    <SelectItem value="negative">🔴 Negativt</SelectItem>
                    <SelectItem value="neutral">⚪ Neutralt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Event Type Filter */}
              <div>
                <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alla Händelsetyper" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla Händelsetyper</SelectItem>
                    {eventTypeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
              <span>
                Visar <strong>{filteredArticles.length}</strong> av <strong>{articles.length}</strong> sparade rapporter
              </span>
              {(selectedStock !== "all" || selectedSentiment !== "all" || selectedEventType !== "all" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    setSelectedStock("all");
                    setSelectedSentiment("all");
                    setSelectedEventType("all");
                    setSearchQuery("");
                  }}
                >
                  Nollställ filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Database Table View */}
        <Card className="shadow-xs border border-border/80 overflow-hidden">
          <CardHeader className="py-3 px-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Sparade Rapporter & Kursreaktioner
              </CardTitle>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={handleExportSelectedCsv}
                  >
                    <Download className="h-3 w-3 mr-1 text-emerald-600" />
                    Exportera valda ({selectedIds.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Ta bort markerade ({selectedIds.size})
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Selection Banner */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between bg-primary/10 border-b border-primary/20 px-4 py-2.5 text-xs text-foreground">
                <div className="flex items-center gap-2 font-medium">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span>
                    <strong>{selectedIds.size}</strong> {selectedIds.size === 1 ? "rad markerad" : "rader markerade"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="text-primary font-semibold hover:underline mr-2"
                  >
                    {isAllFilteredSelected ? "Avmarkera alla i tabell" : `Markera alla (${filteredArticles.length})`}
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={handleClearSelection}
                  >
                    Rensa markering
                  </Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-20 text-muted-foreground">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
                <p>Laddar sparade rapporter från databasen...</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-base">Inga sparade rapporter hittades</p>
                <p className="text-sm mt-1">
                  Kör en webscraping från History Scraping så sparas alla matchade rapporter och kurser automatiskt hit.
                </p>
                <Link href="/scraper" className="inline-block mt-4">
                  <Button size="sm">Gå till Scrapern</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b select-none">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer align-middle"
                          checked={isAllFilteredSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomeFilteredSelected;
                          }}
                          onChange={toggleSelectAll}
                          title={isAllFilteredSelected ? "Avmarkera alla synliga" : "Markera alla synliga"}
                        />
                      </th>
                      {renderSortHeader("stock", "Aktie", "left", "px-4")}
                      {renderSortHeader("title", "Rubrik & Källa", "left", "px-4 min-w-[300px]")}
                      {renderSortHeader("type", "Typ", "left", "px-3")}
                      {renderSortHeader("date", "Datum", "left", "px-3")}
                      {renderSortHeader("priceAtEvent", "Eventkurs", "right", "px-3")}
                      {renderSortHeader("move10m", "10m", "center", "px-2")}
                      {renderSortHeader("move15m", "15m", "center", "px-2")}
                      {renderSortHeader("move30m", "30m", "center", "px-2")}
                      {renderSortHeader("move1h", "1h", "center", "px-2")}
                      {renderSortHeader("move2h", "2h", "center", "px-2")}
                      {renderSortHeader("move1d", "1D", "center", "px-2")}
                      {renderSortHeader("move1w", "1W", "center", "px-2")}
                      {renderSortHeader("score", "Score", "center", "px-3")}
                      <th className="py-3 px-3 text-right">Åtgärd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredArticles.map((article) => {
                      const isExpanded = expandedRowId === article.id;
                      const isSelected = selectedIds.has(article.id);
                      const isSek =
                        isSwedishStockSymbol(article.matchedStock) ||
                        article.matchedStock.endsWith(".ST") ||
                        article.matchedStock.includes(" ");
                      const cur = isSek ? "SEK " : "$";

                      return (
                        <>
                          <tr
                            key={article.id}
                            className={`transition-colors cursor-pointer group ${
                              isSelected
                                ? "bg-primary/5 hover:bg-primary/10"
                                : "hover:bg-muted/40"
                            }`}
                            onClick={() => setExpandedRowId(isExpanded ? null : article.id)}
                          >
                            {/* Checkbox */}
                            <td className="py-3 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer align-middle"
                                checked={isSelected}
                                onChange={(e) => toggleSelectOne(article.id, e as any)}
                              />
                            </td>

                            {/* Stock */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-foreground">
                                  {getStockFullName(article.matchedStock)}
                                </span>
                                <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-4 bg-muted/60 text-muted-foreground font-normal">
                                  {article.matchedStock}
                                </Badge>
                              </div>
                            </td>

                            {/* Title & Source */}
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                {article.title}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                <span className="font-semibold">{article.source}</span>
                                {article.matchedKeywords && article.matchedKeywords.length > 0 && (
                                  <span>• Nyckelord: {article.matchedKeywords.slice(0, 3).join(", ")}</span>
                                )}
                              </div>
                            </td>

                            {/* Event Type */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {article.eventType ? (
                                <Badge variant="secondary" className="text-[11px] font-medium">
                                  {article.eventType}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </td>

                            {/* Date */}
                            <td className="py-3 px-3 whitespace-nowrap text-xs text-muted-foreground font-mono">
                              {new Date(article.publishedAt).toLocaleDateString("sv-SE", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>

                            {/* Event Price */}
                            <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap text-xs">
                              {article.priceAtEvent ? `${cur}${article.priceAtEvent.toFixed(2)}` : "-"}
                            </td>

                            {/* Horizons */}
                            <td className="py-3 px-2 text-center whitespace-nowrap">{renderMoveBadge(article.move10m)}</td>
                            <td className="py-3 px-2 text-center whitespace-nowrap">{renderMoveBadge(article.move15m)}</td>
                            <td className="py-3 px-2 text-center whitespace-nowrap">{renderMoveBadge(article.move30m)}</td>
                            <td className="py-3 px-2 text-center whitespace-nowrap">{renderMoveBadge(article.move1h)}</td>
                            <td className="py-3 px-2 text-center whitespace-nowrap">{renderMoveBadge(article.move2h)}</td>
                            <td className="py-3 px-2 text-center whitespace-nowrap">{renderMoveBadge(article.move1d)}</td>
                            <td className="py-3 px-2 text-center whitespace-nowrap">{renderMoveBadge(article.move1w)}</td>

                            {/* Score & Sentiment */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                  article.impactScore >= 7
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {article.impactScore}
                              </span>
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <a
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:text-primary text-muted-foreground transition-colors"
                                  title="Öppna originalartikel"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                                <button
                                  onClick={() => handleDeleteArticle(article.id)}
                                  className="p-1 hover:text-destructive text-muted-foreground transition-colors"
                                  title="Ta bort från arkiv"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <tr className="bg-muted/20 border-b">
                              <td colSpan={15} className="p-4">
                                <div className="space-y-3 max-w-4xl">
                                  {article.summary && (
                                    <div>
                                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Sammanfattning / Ingress:
                                      </span>
                                      <p className="text-sm mt-1 leading-relaxed text-foreground/90">{article.summary}</p>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
                                    <span>
                                      <strong>Publicerad:</strong> {new Date(article.publishedAt).toLocaleString("sv-SE")}
                                    </span>
                                    <span>
                                      <strong>Sentiment:</strong> {article.sentiment}
                                    </span>
                                    <span>
                                      <strong>Priskälla:</strong> {article.priceSource || "Yahoo Finance"}
                                    </span>
                                    <a
                                      href={article.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                                    >
                                      Öppna på {article.source} <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
