"use client";

import { useState, useMemo } from "react";
import { ExternalLink, TrendingUp, TrendingDown, Minus, Bell, Trash2, Clock, Timer, ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewsArticle } from "@/types/scraper";
import { getImpactVerdict1h, getImpactVerdict1d } from "@/types/priceTracking";

interface ScraperResultsProps {
  articles: NewsArticle[];
  onClearResults: () => void;
  onArticleClick?: (article: NewsArticle) => void;
}

export function ScraperResults({ articles, onClearResults, onArticleClick }: ScraperResultsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  // Get unique event types/labels from articles
  const availableLabels = useMemo(() => {
    const labels = new Set<string>();
    articles.forEach(article => {
      if (article.eventType) {
        labels.add(article.eventType);
      }
    });
    return Array.from(labels).sort();
  }, [articles]);

  // Filter articles by selected labels
  const filteredArticles = useMemo(() => {
    if (selectedLabels.length === 0) return articles;
    return articles.filter(article =>
      article.eventType && selectedLabels.includes(article.eventType)
    );
  }, [articles, selectedLabels]);

  const toggleLabel = (label: string) => {
    setSelectedLabels(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const clearFilters = () => {
    setSelectedLabels([]);
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "negative":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    const variants = {
      positive: "positive" as const,
      negative: "negative" as const,
      neutral: "neutral" as const,
    };
    return <Badge variant={variants[sentiment as keyof typeof variants]}>{sentiment}</Badge>;
  };

  const getImpactColor = (score: number) => {
    if (score >= 9) return "bg-red-500";
    if (score >= 7) return "bg-orange-500";
    if (score >= 5) return "bg-yellow-500";
    if (score >= 3) return "bg-green-500";
    return "bg-gray-500";
  };

  const getImpactLabel = (score: number) => {
    if (score >= 9) return "Critical";
    if (score >= 7) return "High";
    if (score >= 5) return "Medium";
    if (score >= 3) return "Low";
    return "Noise";
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case "major": return "text-red-500 bg-red-500/10";
      case "significant": return "text-orange-500 bg-orange-500/10";
      case "mild": return "text-yellow-600 bg-yellow-500/10";
      default: return "text-gray-500 bg-gray-500/10";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              News Alerts
            </CardTitle>
            <CardDescription>
              {selectedLabels.length > 0
                ? `${filteredArticles.length} of ${articles.length} articles`
                : `${articles.length} matching articles found`}
            </CardDescription>
          </div>
          {articles.length > 0 && (
            <Button variant="outline" size="sm" onClick={onClearResults}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Label Filter */}
        {availableLabels.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Filter:</span>
              {availableLabels.map(label => (
                <Badge
                  key={label}
                  variant={selectedLabels.includes(label) ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleLabel(label)}
                >
                  {label}
                </Badge>
              ))}
              {selectedLabels.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={clearFilters}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filteredArticles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
            {articles.length > 0 && selectedLabels.length > 0 ? (
              <>
                <p>No articles match the selected filters</p>
                <Button variant="link" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <p>No news alerts yet</p>
                <p className="text-sm">Start the scraper to find matching articles</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredArticles.map((article) => {
              const has1hData = article.newsImpact1h !== undefined && article.newsImpact1h !== null;
              const has1dData = article.newsImpact1d !== undefined && article.newsImpact1d !== null;
              const verdict1h = has1hData ? getImpactVerdict1h(article.newsImpact1h!) : null;
              const verdict1d = has1dData ? getImpactVerdict1d(article.newsImpact1d!) : null;

              // Determine if we tried to fetch but got no data (market closed, etc.)
              const hasPriceAtEvent = article.priceAtEvent !== undefined;
              const is1hUnavailable = hasPriceAtEvent && !has1hData;
              const is1dUnavailable = hasPriceAtEvent && !has1dData;
              const isExpanded = expandedId === article.id;

              return (
                <div
                  key={article.id}
                  className="rounded-lg border hover:bg-muted/50 transition-colors overflow-hidden"
                >
                  {/* Main content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Top row: Stock, Sentiment, Score */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="default" className="font-mono font-bold">
                            {article.matchedStock}
                          </Badge>
                          {article.eventType && (
                            <Badge variant="secondary" className="text-xs">
                              {article.eventType}
                            </Badge>
                          )}
                          {getSentimentBadge(article.sentiment)}
                          <div className="flex items-center gap-1">
                            <div
                              className={`w-2 h-2 rounded-full ${getImpactColor(article.impactScore)}`}
                            />
                            <span className="text-xs font-medium">
                              Score: {article.impactScore}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="font-medium text-sm mb-2 line-clamp-2">
                          {article.title}
                        </h4>

                        {/* 1H and 1D Impact Boxes */}
                        <div className="flex gap-2 mb-2">
                          {/* 1H Impact */}
                          <div className={`flex-1 p-2 rounded-md border ${has1hData ? '' : 'opacity-50'}`}>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Timer className="h-3 w-3" />
                              <span>1H Reaction</span>
                            </div>
                            {has1hData ? (
                              <>
                                <div className="text-lg font-bold">
                                  {formatPercent(article.newsImpact1h)}
                                </div>
                                <div className={`text-xs px-1.5 py-0.5 rounded inline-block ${getVerdictColor(verdict1h?.label || 'noise')}`}>
                                  {verdict1h?.label}
                                </div>
                              </>
                            ) : is1hUnavailable ? (
                              <div className="text-sm text-muted-foreground">N/A (market closed)</div>
                            ) : (
                              <div className="text-sm text-muted-foreground">Pending...</div>
                            )}
                          </div>

                          {/* 1D Impact */}
                          <div className={`flex-1 p-2 rounded-md border ${has1dData ? '' : 'opacity-50'}`}>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Clock className="h-3 w-3" />
                              <span>1D Impact</span>
                            </div>
                            {has1dData ? (
                              <>
                                <div className="text-lg font-bold">
                                  {formatPercent(article.newsImpact1d)}
                                </div>
                                <div className={`text-xs px-1.5 py-0.5 rounded inline-block ${getVerdictColor(verdict1d?.label || 'noise')}`}>
                                  {verdict1d?.label}
                                </div>
                              </>
                            ) : is1dUnavailable ? (
                              <div className="text-sm text-muted-foreground">N/A (market closed)</div>
                            ) : (
                              <div className="text-sm text-muted-foreground">Pending...</div>
                            )}
                          </div>
                        </div>

                        {/* Meta info */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {article.source} • {formatDate(article.publishedAt)}
                            {article.priceAtEvent && (
                              <span className="ml-1 font-mono">
                                @ ${article.priceAtEvent.toFixed(2)}
                              </span>
                            )}
                            {article.priceSource && article.priceSource !== "none" && (
                              <span className={`ml-1 px-1 py-0.5 rounded text-[10px] ${
                                article.priceSource === "polygon" ? "bg-green-100 text-green-700" :
                                article.priceSource === "yahoo" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                              }`}>
                                {article.priceSource === "polygon" ? "P" : article.priceSource === "yahoo" ? "Y" : "G"}
                              </span>
                            )}
                          </span>
                          <div className="flex gap-1">
                            {article.matchedKeywords.slice(0, 2).map((kw, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {kw}
                              </Badge>
                            ))}
                            {article.matchedKeywords.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{article.matchedKeywords.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side actions */}
                      <div className="flex flex-col items-center gap-2">
                        {getSentimentIcon(article.sentiment)}
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleExpand(article.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                      <div className="pt-3">
                        <h5 className="text-xs font-medium text-muted-foreground mb-2">
                          Price Movement Breakdown
                        </h5>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div></div>
                          <div className="text-center font-medium">1H</div>
                          <div className="text-center font-medium">1D</div>

                          <div className="text-muted-foreground">Price at Event</div>
                          <div className="text-center font-mono">
                            {article.priceAtEvent ? `$${article.priceAtEvent.toFixed(2)}` : "—"}
                          </div>
                          <div className="text-center font-mono">
                            {article.priceAtEvent ? `$${article.priceAtEvent.toFixed(2)}` : "—"}
                          </div>

                          <div className="text-muted-foreground">Price After</div>
                          <div className="text-center font-mono">
                            {article.price1h ? `$${article.price1h.toFixed(2)}` : "—"}
                          </div>
                          <div className="text-center font-mono">
                            {article.price1d ? `$${article.price1d.toFixed(2)}` : "—"}
                          </div>

                          <div className="text-muted-foreground">Stock Move</div>
                          <div className="text-center font-mono">
                            {formatPercent(article.stockAbsMove1h)}
                          </div>
                          <div className="text-center font-mono">
                            {formatPercent(article.stockAbsMove1d)}
                          </div>

                          <div className="text-muted-foreground">Market Move</div>
                          <div className="text-center font-mono text-muted-foreground">
                            {article.indexPriceAtEvent ? formatPercent(
                              article.indexPrice1h && article.indexPriceAtEvent
                                ? Math.abs(article.indexPrice1h - article.indexPriceAtEvent) / article.indexPriceAtEvent * 100
                                : null
                            ) : "—"}
                          </div>
                          <div className="text-center font-mono text-muted-foreground">
                            {article.indexPriceAtEvent ? formatPercent(
                              article.indexPrice1d && article.indexPriceAtEvent
                                ? Math.abs(article.indexPrice1d - article.indexPriceAtEvent) / article.indexPriceAtEvent * 100
                                : null
                            ) : "—"}
                          </div>

                          <div className="text-muted-foreground">News Move</div>
                          <div className="text-center font-mono">
                            {formatPercent(article.newsMove1h)}
                          </div>
                          <div className="text-center font-mono">
                            {formatPercent(article.newsMove1d)}
                          </div>

                          <div className="text-muted-foreground">Baseline</div>
                          <div className="text-center font-mono text-muted-foreground">
                            {article.baseline1h ? `${article.baseline1h.toFixed(1)}%` : "0.4%"}
                          </div>
                          <div className="text-center font-mono text-muted-foreground">
                            {article.baseline1d ? `${article.baseline1d.toFixed(1)}%` : "1.2%"}
                          </div>

                          <div className="font-medium">News Impact</div>
                          <div className={`text-center font-mono font-bold ${has1hData && article.newsImpact1h! >= 1 ? 'text-green-600' : ''}`}>
                            {formatPercent(article.newsImpact1h)}
                          </div>
                          <div className={`text-center font-mono font-bold ${has1dData && article.newsImpact1d! >= 3 ? 'text-green-600' : ''}`}>
                            {formatPercent(article.newsImpact1d)}
                          </div>
                        </div>

                        {/* Summary */}
                        <p className="text-xs text-muted-foreground mt-3 line-clamp-3">
                          {article.summary}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
