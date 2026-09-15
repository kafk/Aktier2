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
  Sunrise,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Classification, defaultClassifications } from "@/types/keywords";

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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);

  const [classifications] = useLocalStorage<Classification[]>(
    "classifications",
    defaultClassifications
  );

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

  const classificationOptions = useMemo(() => {
    const set = new Set<string>();
    // From active / configured classifications
    if (classifications && Array.isArray(classifications)) {
      classifications.forEach((c) => {
        if (c.name) set.add(c.name);
      });
    }
    // From scraped articles (eventType and matchedKeywords)
    articles.forEach((a) => {
      if (a.eventType) set.add(a.eventType);
      if (a.matchedKeywords && Array.isArray(a.matchedKeywords)) {
        a.matchedKeywords.forEach((k) => set.add(k));
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "sv"));
  }, [classifications, articles]);

  // Filtered & Sorted Articles
  const filteredArticles = useMemo(() => {
    return articles
      .filter((a) => {
        // Stock filter
        if (selectedStock !== "all" && a.matchedStock !== selectedStock) return false;
        // Sentiment filter
        if (selectedSentiment !== "all" && a.sentiment !== selectedSentiment) return false;
        // Classification / Event type filter
        if (selectedEventType !== "all") {
          const target = selectedEventType.toLowerCase();
          const matchType = a.eventType?.toLowerCase() === target;
          const matchCode = a.eventCode?.toLowerCase() === target;
          const matchKw = a.matchedKeywords?.some((k) => k.toLowerCase() === target);
          if (!matchType && !matchCode && !matchKw) return false;
        }
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

  // Total pages
  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize));

  // Reset to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStock, selectedSentiment, selectedEventType, searchQuery, sortField, sortDirection, pageSize]);

  // Clamp current page if total pages decreases
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Paginated articles for the current page
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredArticles.slice(start, start + pageSize);
  }, [filteredArticles, currentPage, pageSize]);

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

  const isAllPageSelected =
    paginatedArticles.length > 0 &&
    paginatedArticles.every((a) => selectedIds.has(a.id));

  const isAllFilteredSelected =
    filteredArticles.length > 0 &&
    filteredArticles.every((a) => selectedIds.has(a.id));

  const isSomePageSelected =
    paginatedArticles.some((a) => selectedIds.has(a.id)) && !isAllPageSelected;

  const toggleSelectPage = () => {
    if (isAllPageSelected) {
      // Deselect page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedArticles.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      // Select page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedArticles.forEach((a) => next.add(a.id));
        return next;
      });
    }
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredArticles.forEach((a) => next.add(a.id));
      return next;
    });
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
      "Pre-Market Event",
      "Open 1m Price",
      "Open 1m Move %",
      "Open 15m Price",
      "Open 15m Move %",
      "Open 30m Price",
      "Open 30m Move %",
      "Open 1h Price",
      "Open 1h Move %",
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
      escapeCsv(a.isPreMarket ? "Yes" : "No"),
      escapeCsv(a.priceOpen1m?.toFixed(2)),
      escapeCsv(a.moveOpen1m !== null && a.moveOpen1m !== undefined ? a.moveOpen1m.toFixed(2) + "%" : ""),
      escapeCsv(a.priceOpen15m?.toFixed(2)),
      escapeCsv(a.moveOpen15m !== null && a.moveOpen15m !== undefined ? a.moveOpen15m.toFixed(2) + "%" : ""),
      escapeCsv(a.priceOpen30m?.toFixed(2)),
      escapeCsv(a.moveOpen30m !== null && a.moveOpen30m !== undefined ? a.moveOpen30m.toFixed(2) + "%" : ""),
      escapeCsv(a.priceOpen1h?.toFixed(2)),
      escapeCsv(a.moveOpen1h !== null && a.moveOpen1h !== undefined ? a.moveOpen1h.toFixed(2) + "%" : ""),
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

  const renderArchiveHorizonPill = (
    label: string,
    price: number | null | undefined,
    move: number | null | undefined,
    cur: string
  ) => {
    if (price === null || price === undefined) {
      return (
        <div className="flex flex-col items-center justify-center px-2 py-1 rounded border text-[11px] min-w-[62px] bg-muted/40 text-muted-foreground border-muted">
          <span className="text-[9px] font-semibold opacity-70 uppercase tracking-wider">{label}</span>
          <span className="font-mono text-[11.5px] leading-tight">—</span>
          <span className="text-[9.5px] opacity-60">Pending</span>
        </div>
      );
    }

    const isPositive = move !== null && move !== undefined && move > 0.05;
    const isNegative = move !== null && move !== undefined && move < -0.05;

    const colorClass = isPositive
      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
      : isNegative
      ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
      : "bg-muted/60 text-foreground border-muted-foreground/20";

    const moveText = move !== null && move !== undefined
      ? `${move > 0 ? "+" : ""}${move.toFixed(2)}%`
      : "0.00%";

    return (
      <div
        className={`flex flex-col items-center justify-center px-2 py-1 rounded border text-[11px] min-w-[62px] transition-all shadow-xs ${colorClass}`}
        title={`${label}: ${cur}${price.toFixed(2)} (${moveText})`}
      >
        <span className="text-[9px] font-semibold opacity-75 uppercase tracking-wider">{label}</span>
        <span className="font-mono font-bold text-[11.5px] leading-tight">{cur}{price.toFixed(2)}</span>
        <span className="text-[10px] font-semibold">{moveText}</span>
      </div>
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

              {/* Classification Filter */}
              <div>
                <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alla Klassificeringar" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    <SelectItem value="all">Alla Klassificeringar ({classificationOptions.length})</SelectItem>
                    {classificationOptions.map((t) => (
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
              <div className="flex items-center justify-between bg-primary/10 border-b border-primary/20 px-4 py-2.5 text-xs text-foreground flex-wrap gap-2">
                <div className="flex items-center gap-2 font-medium">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span>
                    <strong>{selectedIds.size}</strong> {selectedIds.size === 1 ? "rad markerad" : "rader markerade"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedIds.size < filteredArticles.length ? (
                    <button
                      onClick={selectAllFiltered}
                      className="text-primary font-semibold hover:underline mr-2"
                    >
                      Markera alla {filteredArticles.length} matchande rapporter
                    </button>
                  ) : (
                    <button
                      onClick={handleClearSelection}
                      className="text-primary font-semibold hover:underline mr-2"
                    >
                      Avmarkera alla ({filteredArticles.length})
                    </button>
                  )}
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
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b select-none">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer align-middle"
                            checked={isAllPageSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isSomePageSelected;
                            }}
                            onChange={toggleSelectPage}
                            title={isAllPageSelected ? "Avmarkera alla på denna sida" : "Markera alla på denna sida"}
                          />
                        </th>
                        {renderSortHeader("stock", "Aktie", "left", "px-4")}
                        {renderSortHeader("title", "Rubrik & Källa", "left", "px-4 min-w-[300px]")}
                        {renderSortHeader("type", "Typ", "left", "px-3")}
                        {renderSortHeader("date", "Datum & År", "left", "px-3 min-w-[105px]")}
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
                      {paginatedArticles.map((article) => {
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

                              {/* Date & Year */}
                              <td className="py-3 px-3 whitespace-nowrap text-xs text-muted-foreground font-mono">
                                <div className="font-semibold text-foreground/90">
                                  {new Date(article.publishedAt).toLocaleDateString("sv-SE", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                  })}
                                </div>
                                <div className="text-[10px] text-muted-foreground opacity-80">
                                  {new Date(article.publishedAt).toLocaleTimeString("sv-SE", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
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
                                    {/* Pre-Market / Börsöppning Square */}
                                    {(article.isPreMarket || article.priceOpen1m !== undefined || article.priceOpen15m !== undefined) && (
                                      <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/25 dark:bg-amber-950/20 dark:border-amber-700/40 space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px] font-medium">
                                          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                                            <Sunrise className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                            <span className="font-semibold text-foreground">Börsöppningsreaktion (Market Open Reaction):</span>
                                            <Badge variant="outline" className="text-[9.5px] py-0 px-1.5 h-4 border-amber-400/50 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50">
                                              Före börsöppning
                                            </Badge>
                                          </div>
                                          {article.priceAtEvent && (
                                            <span className="font-mono text-xs text-muted-foreground">
                                              Eventkurs: {cur}{article.priceAtEvent.toFixed(2)}
                                            </span>
                                          )}
                                        </div>
                                        
                                        <div className="flex gap-1.5 overflow-x-auto pb-1 pt-0.5">
                                          {renderArchiveHorizonPill("Öppning 1m", article.priceOpen1m, article.moveOpen1m, cur)}
                                          {renderArchiveHorizonPill("Öppning 15m", article.priceOpen15m, article.moveOpen15m, cur)}
                                          {renderArchiveHorizonPill("Öppning 30m", article.priceOpen30m, article.moveOpen30m, cur)}
                                          {renderArchiveHorizonPill("Öppning 1h", article.priceOpen1h, article.moveOpen1h, cur)}
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
                                      <span>
                                        <strong>Publicerad:</strong>{" "}
                                        {new Date(article.publishedAt).toLocaleDateString("sv-SE", {
                                          year: "numeric",
                                          month: "2-digit",
                                          day: "2-digit",
                                        })}{" "}
                                        kl.{" "}
                                        {new Date(article.publishedAt).toLocaleTimeString("sv-SE", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
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

                {/* Pagination Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t bg-muted/20 text-xs">
                  {/* Left: Summary & Page Size */}
                  <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                    <span>
                      Visar <strong>{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredArticles.length)}</strong> av <strong>{filteredArticles.length}</strong> sparade rapporter
                    </span>
                    <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
                      <span className="text-muted-foreground">Visa per sida:</span>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(v) => {
                          setPageSize(parseInt(v, 10));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="h-7 w-[85px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25 / sida</SelectItem>
                          <SelectItem value="50">50 / sida</SelectItem>
                          <SelectItem value="100">100 / sida</SelectItem>
                          <SelectItem value="200">200 / sida</SelectItem>
                          <SelectItem value="500">500 / sida</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Right: Page Navigation Buttons */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      {/* First */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        title="Första sidan"
                      >
                        <ChevronsLeft className="h-3.5 w-3.5" />
                      </Button>

                      {/* Previous */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                        Föregående
                      </Button>

                      {/* Page Number Pills */}
                      <div className="flex items-center gap-1 px-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => {
                            return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2;
                          })
                          .map((p, index, array) => {
                            const prev = array[index - 1];
                            const showEllipsis = prev && p - prev > 1;
                            return (
                              <div key={p} className="flex items-center gap-1">
                                {showEllipsis && <span className="px-1 text-muted-foreground font-bold">...</span>}
                                <Button
                                  variant={currentPage === p ? "default" : "outline"}
                                  size="sm"
                                  className={`h-7 min-w-[28px] px-2 text-xs ${
                                    currentPage === p ? "font-bold" : "text-muted-foreground hover:text-foreground"
                                  }`}
                                  onClick={() => setCurrentPage(p)}
                                >
                                  {p}
                                </Button>
                              </div>
                            );
                          })}
                      </div>

                      {/* Next */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Nästa
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>

                      {/* Last */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        title="Sista sidan"
                      >
                        <ChevronsRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
