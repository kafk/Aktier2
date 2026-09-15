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
import { isSwedishStockSymbol } from "@/lib/stockAliases";

export default function ArchivePage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<string>("all");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("all");
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [sortField, setSortField] = useState<"date" | "score" | "move1d" | "stock">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

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
    return Array.from(set).sort();
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
          const matchKw = a.matchedKeywords?.some((k) => k.toLowerCase().includes(q));
          if (!matchTitle && !matchSummary && !matchStock && !matchKw) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA: number | string = 0;
        let valB: number | string = 0;

        if (sortField === "date") {
          valA = new Date(a.publishedAt).getTime() || 0;
          valB = new Date(b.publishedAt).getTime() || 0;
        } else if (sortField === "score") {
          valA = a.impactScore || 0;
          valB = b.impactScore || 0;
        } else if (sortField === "move1d") {
          valA = Math.abs(a.move1d || 0);
          valB = Math.abs(b.move1d || 0);
        } else if (sortField === "stock") {
          valA = a.matchedStock || "";
          valB = b.matchedStock || "";
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
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

  const handleDeleteArticle = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna sparade notis?")) return;
    try {
      await fetch(`/api/articles?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setArticles((prev) => prev.filter((a) => a.id !== id));
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
    } catch (err) {
      console.error("Error clearing articles:", err);
    }
  };

  const toggleSort = (field: "date" | "score" | "move1d" | "stock") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
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
                  <SelectContent>
                    <SelectItem value="all">Alla Aktier ({stockOptions.length})</SelectItem>
                    {stockOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
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
            </div>
          </CardHeader>
          <CardContent className="p-0">
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
                      <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort("stock")}>
                        <div className="flex items-center gap-1">
                          Aktie <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3 px-4 min-w-[320px]">Rubrik & Källa</th>
                      <th className="py-3 px-3">Typ</th>
                      <th className="py-3 px-3 cursor-pointer" onClick={() => toggleSort("date")}>
                        <div className="flex items-center gap-1">
                          Datum <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3 px-3 text-right">Eventkurs</th>
                      <th className="py-3 px-2 text-center">10m</th>
                      <th className="py-3 px-2 text-center">15m</th>
                      <th className="py-3 px-2 text-center">30m</th>
                      <th className="py-3 px-2 text-center">1h</th>
                      <th className="py-3 px-2 text-center">2h</th>
                      <th className="py-3 px-2 text-center cursor-pointer" onClick={() => toggleSort("move1d")}>
                        <div className="flex items-center justify-center gap-1">
                          1D <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3 px-2 text-center">1W</th>
                      <th className="py-3 px-3 text-center cursor-pointer" onClick={() => toggleSort("score")}>
                        <div className="flex items-center justify-center gap-1">
                          Score <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3 px-3 text-right">Åtgärd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredArticles.map((article) => {
                      const isExpanded = expandedRowId === article.id;
                      const isSek =
                        isSwedishStockSymbol(article.matchedStock) ||
                        article.matchedStock.endsWith(".ST") ||
                        article.matchedStock.includes(" ");
                      const cur = isSek ? "SEK " : "$";

                      return (
                        <>
                          <tr
                            key={article.id}
                            className="hover:bg-muted/40 transition-colors cursor-pointer group"
                            onClick={() => setExpandedRowId(isExpanded ? null : article.id)}
                          >
                            {/* Stock */}
                            <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                              <Badge variant="default" className="font-mono text-xs">
                                {article.matchedStock}
                              </Badge>
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
                              <td colSpan={14} className="p-4">
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
