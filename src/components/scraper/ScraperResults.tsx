"use client";

import { ExternalLink, TrendingUp, TrendingDown, Minus, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewsArticle } from "@/types/scraper";

interface ScraperResultsProps {
  articles: NewsArticle[];
  onClearResults: () => void;
}

export function ScraperResults({ articles, onClearResults }: ScraperResultsProps) {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
              {articles.length} matching articles found
            </CardDescription>
          </div>
          {articles.length > 0 && (
            <Button variant="outline" size="sm" onClick={onClearResults}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {articles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No news alerts yet</p>
            <p className="text-sm">Start the scraper to find matching articles</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {articles.map((article) => (
              <div
                key={article.id}
                className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="default" className="font-mono">
                        {article.matchedStock}
                      </Badge>
                      {getSentimentBadge(article.sentiment)}
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-2 h-2 rounded-full ${getImpactColor(article.impactScore)}`}
                        />
                        <span className="text-xs font-medium">
                          {getImpactLabel(article.impactScore)} ({article.impactScore})
                        </span>
                      </div>
                    </div>
                    <h4 className="font-medium text-sm mb-1 line-clamp-2">
                      {article.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {article.summary}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {article.source} • {formatDate(article.publishedAt)}
                      </span>
                      <div className="flex gap-1">
                        {article.matchedKeywords.slice(0, 3).map((kw, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                        {article.matchedKeywords.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{article.matchedKeywords.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
