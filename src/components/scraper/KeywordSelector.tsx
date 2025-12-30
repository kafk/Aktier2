"use client";

import { useState } from "react";
import { X, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScraperKeyword } from "@/types/scraper";
import { Classification } from "@/types/keywords";

interface KeywordSelectorProps {
  selectedKeywords: ScraperKeyword[];
  onKeywordsChange: (keywords: ScraperKeyword[]) => void;
  classifications: Classification[];
}

export function KeywordSelector({
  selectedKeywords,
  onKeywordsChange,
  classifications,
}: KeywordSelectorProps) {
  const [customKeyword, setCustomKeyword] = useState("");
  const [expandedClassifications, setExpandedClassifications] = useState<string[]>([]);

  const addCustomKeyword = () => {
    if (customKeyword.trim()) {
      const newKeyword: ScraperKeyword = {
        id: `custom-${Date.now()}`,
        keyword: customKeyword.trim().toLowerCase(),
        source: "custom",
      };
      if (!selectedKeywords.some((k) => k.keyword === newKeyword.keyword)) {
        onKeywordsChange([...selectedKeywords, newKeyword]);
      }
      setCustomKeyword("");
    }
  };

  const toggleClassification = (classification: Classification) => {
    const classificationKeywords = classification.keywords.map((kw) => ({
      id: `${classification.id}-${kw}`,
      keyword: kw.toLowerCase(),
      source: "classification" as const,
      classificationId: classification.id,
      classificationName: classification.name,
    }));

    const hasAllKeywords = classificationKeywords.every((ck) =>
      selectedKeywords.some((sk) => sk.keyword === ck.keyword)
    );

    if (hasAllKeywords) {
      // Remove all keywords from this classification
      onKeywordsChange(
        selectedKeywords.filter((sk) => sk.classificationId !== classification.id)
      );
    } else {
      // Add all keywords from this classification
      const existingKeywords = selectedKeywords.filter(
        (sk) => sk.classificationId !== classification.id
      );
      const newKeywords = classificationKeywords.filter(
        (ck) => !existingKeywords.some((ek) => ek.keyword === ck.keyword)
      );
      onKeywordsChange([...existingKeywords, ...newKeywords]);
    }
  };

  const removeKeyword = (id: string) => {
    onKeywordsChange(selectedKeywords.filter((k) => k.id !== id));
  };

  const isClassificationSelected = (classification: Classification) => {
    return classification.keywords.every((kw) =>
      selectedKeywords.some((sk) => sk.keyword === kw.toLowerCase())
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedClassifications((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const activeClassifications = classifications.filter((c) => c.isActive);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keywords to Monitor</CardTitle>
        <CardDescription>
          Select classification keywords or add custom ones
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Keywords Summary */}
        {selectedKeywords.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Active Keywords ({selectedKeywords.length})
            </label>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1">
              {selectedKeywords.slice(0, 20).map((kw) => (
                <Badge
                  key={kw.id}
                  variant={kw.source === "custom" ? "secondary" : "outline"}
                  className="text-xs gap-1 pr-1"
                >
                  {kw.keyword}
                  <button
                    onClick={() => removeKeyword(kw.id)}
                    className="ml-1 hover:bg-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </Badge>
              ))}
              {selectedKeywords.length > 20 && (
                <Badge variant="secondary" className="text-xs">
                  +{selectedKeywords.length - 20} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Add Custom Keyword */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Add Custom Keyword</label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter keyword..."
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomKeyword()}
              className="flex-1"
            />
            <Button onClick={addCustomKeyword} disabled={!customKeyword.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Classifications */}
        <div className="space-y-2">
          <label className="text-sm font-medium">From Classifications</label>
          <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
            {activeClassifications.map((classification) => (
              <div key={classification.id} className="p-2">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-2 flex-1 cursor-pointer"
                    onClick={() => toggleExpand(classification.id)}
                  >
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{classification.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {classification.keywords.length} keywords
                    </Badge>
                  </div>
                  <Switch
                    checked={isClassificationSelected(classification)}
                    onCheckedChange={() => toggleClassification(classification)}
                  />
                </div>
                {expandedClassifications.includes(classification.id) && (
                  <div className="mt-2 pl-6 flex flex-wrap gap-1">
                    {classification.keywords.map((kw, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
