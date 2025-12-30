"use client";

import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  ScoringConfig,
  SentimentModifier,
  SourceCredibility,
  CompanySensitivity,
  MarketContextModifier,
} from "@/types/keywords";

interface ScoringConfigTabProps {
  scoringConfig: ScoringConfig;
  setScoringConfig: (config: ScoringConfig) => void;
}

export function ScoringConfigTab({
  scoringConfig,
  setScoringConfig,
}: ScoringConfigTabProps) {
  const [newSentimentWord, setNewSentimentWord] = useState("");
  const [newSentimentScore, setNewSentimentScore] = useState(1);
  const [newSentimentType, setNewSentimentType] = useState<"positive" | "negative">("positive");

  const [newSource, setNewSource] = useState("");
  const [newSourceScore, setNewSourceScore] = useState(1);

  const [newCompanyProfile, setNewCompanyProfile] = useState("");
  const [newCompanyScore, setNewCompanyScore] = useState(1);

  const [newMarketContext, setNewMarketContext] = useState("");
  const [newMarketScore, setNewMarketScore] = useState(0);

  // Sentiment Modifiers
  const addSentimentModifier = () => {
    if (!newSentimentWord.trim()) return;
    const modifier: SentimentModifier = {
      word: newSentimentWord.trim(),
      score: newSentimentType === "positive" ? newSentimentScore : -newSentimentScore,
      type: newSentimentType,
    };
    setScoringConfig({
      ...scoringConfig,
      sentimentModifiers: [...scoringConfig.sentimentModifiers, modifier],
    });
    setNewSentimentWord("");
    setNewSentimentScore(1);
  };

  const removeSentimentModifier = (index: number) => {
    setScoringConfig({
      ...scoringConfig,
      sentimentModifiers: scoringConfig.sentimentModifiers.filter((_, i) => i !== index),
    });
  };

  // Source Credibility
  const addSource = () => {
    if (!newSource.trim()) return;
    setScoringConfig({
      ...scoringConfig,
      sourceCredibility: [
        ...scoringConfig.sourceCredibility,
        { name: newSource.trim(), score: newSourceScore },
      ],
    });
    setNewSource("");
    setNewSourceScore(1);
  };

  const removeSource = (index: number) => {
    setScoringConfig({
      ...scoringConfig,
      sourceCredibility: scoringConfig.sourceCredibility.filter((_, i) => i !== index),
    });
  };

  const updateSourceScore = (index: number, score: number) => {
    const updated = [...scoringConfig.sourceCredibility];
    updated[index] = { ...updated[index], score };
    setScoringConfig({ ...scoringConfig, sourceCredibility: updated });
  };

  // Company Sensitivity
  const addCompanyProfile = () => {
    if (!newCompanyProfile.trim()) return;
    setScoringConfig({
      ...scoringConfig,
      companySensitivity: [
        ...scoringConfig.companySensitivity,
        { profile: newCompanyProfile.trim(), score: newCompanyScore },
      ],
    });
    setNewCompanyProfile("");
    setNewCompanyScore(1);
  };

  const removeCompanyProfile = (index: number) => {
    setScoringConfig({
      ...scoringConfig,
      companySensitivity: scoringConfig.companySensitivity.filter((_, i) => i !== index),
    });
  };

  const updateCompanyScore = (index: number, score: number) => {
    const updated = [...scoringConfig.companySensitivity];
    updated[index] = { ...updated[index], score };
    setScoringConfig({ ...scoringConfig, companySensitivity: updated });
  };

  // Market Context
  const addMarketContext = () => {
    if (!newMarketContext.trim()) return;
    setScoringConfig({
      ...scoringConfig,
      marketContextModifiers: [
        ...scoringConfig.marketContextModifiers,
        { context: newMarketContext.trim(), score: newMarketScore },
      ],
    });
    setNewMarketContext("");
    setNewMarketScore(0);
  };

  const removeMarketContext = (index: number) => {
    setScoringConfig({
      ...scoringConfig,
      marketContextModifiers: scoringConfig.marketContextModifiers.filter((_, i) => i !== index),
    });
  };

  const updateMarketScore = (index: number, score: number) => {
    const updated = [...scoringConfig.marketContextModifiers];
    updated[index] = { ...updated[index], score };
    setScoringConfig({ ...scoringConfig, marketContextModifiers: updated });
  };

  // Surprise Factors
  const updateSurpriseFactor = (key: keyof typeof scoringConfig.surpriseFactors, value: number) => {
    setScoringConfig({
      ...scoringConfig,
      surpriseFactors: { ...scoringConfig.surpriseFactors, [key]: value },
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Scoring Configuration</CardTitle>
          <CardDescription>
            Configure how different factors contribute to the final impact score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full" defaultValue={["sentiment"]}>
            {/* Sentiment Strength */}
            <AccordionItem value="sentiment">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <span>Sentiment Strength</span>
                  <Badge variant="secondary">-2 to +2</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Detect language intensity. Strong words add/subtract from the base score.
                  </p>

                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Positive Words</Label>
                    <div className="flex flex-wrap gap-2">
                      {scoringConfig.sentimentModifiers
                        .filter((m) => m.type === "positive")
                        .map((modifier, i) => {
                          const actualIndex = scoringConfig.sentimentModifiers.findIndex(
                            (m) => m.word === modifier.word && m.type === "positive"
                          );
                          return (
                            <Badge
                              key={i}
                              variant="positive"
                              className="cursor-pointer hover:bg-green-200"
                              onClick={() => removeSentimentModifier(actualIndex)}
                            >
                              {modifier.word} (+{modifier.score})
                              <Trash2 className="ml-1 h-3 w-3" />
                            </Badge>
                          );
                        })}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Negative Words</Label>
                    <div className="flex flex-wrap gap-2">
                      {scoringConfig.sentimentModifiers
                        .filter((m) => m.type === "negative")
                        .map((modifier, i) => {
                          const actualIndex = scoringConfig.sentimentModifiers.findIndex(
                            (m) => m.word === modifier.word && m.type === "negative"
                          );
                          return (
                            <Badge
                              key={i}
                              variant="negative"
                              className="cursor-pointer hover:bg-red-200"
                              onClick={() => removeSentimentModifier(actualIndex)}
                            >
                              {modifier.word} ({modifier.score})
                              <Trash2 className="ml-1 h-3 w-3" />
                            </Badge>
                          );
                        })}
                    </div>
                  </div>

                  <div className="flex gap-2 items-end border-t pt-4">
                    <div className="flex-1">
                      <Label htmlFor="sentiment-word">Word</Label>
                      <Input
                        id="sentiment-word"
                        value={newSentimentWord}
                        onChange={(e) => setNewSentimentWord(e.target.value)}
                        placeholder="e.g., exceptional"
                      />
                    </div>
                    <div className="w-32">
                      <Label>Type</Label>
                      <Select
                        value={newSentimentType}
                        onValueChange={(v: "positive" | "negative") => setNewSentimentType(v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="positive">Positive</SelectItem>
                          <SelectItem value="negative">Negative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label>Score</Label>
                      <Select
                        value={newSentimentScore.toString()}
                        onValueChange={(v) => setNewSentimentScore(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addSentimentModifier} disabled={!newSentimentWord.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Surprise Factor */}
            <AccordionItem value="surprise">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <span>Surprise Factor</span>
                  <Badge variant="secondary">0 to +2</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Markets move on unexpected news. Configure how surprise affects scoring.
                  </p>

                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Conflicts with last guidance</Label>
                        <p className="text-xs text-muted-foreground">
                          News contradicts previous statements
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-48">
                        <Slider
                          value={[scoringConfig.surpriseFactors.conflictsWithGuidance]}
                          onValueChange={([v]) => updateSurpriseFactor("conflictsWithGuidance", v)}
                          min={0}
                          max={2}
                          step={0.5}
                        />
                        <span className="w-8 text-right font-mono">
                          +{scoringConfig.surpriseFactors.conflictsWithGuidance}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>First time event</Label>
                        <p className="text-xs text-muted-foreground">
                          Never happened before for this company
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-48">
                        <Slider
                          value={[scoringConfig.surpriseFactors.firstTimeEvent]}
                          onValueChange={([v]) => updateSurpriseFactor("firstTimeEvent", v)}
                          min={0}
                          max={2}
                          step={0.5}
                        />
                        <span className="w-8 text-right font-mono">
                          +{scoringConfig.surpriseFactors.firstTimeEvent}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Repeated / already known</Label>
                        <p className="text-xs text-muted-foreground">
                          Information was previously reported
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-48">
                        <Slider
                          value={[scoringConfig.surpriseFactors.repeated]}
                          onValueChange={([v]) => updateSurpriseFactor("repeated", v)}
                          min={0}
                          max={2}
                          step={0.5}
                        />
                        <span className="w-8 text-right font-mono">
                          +{scoringConfig.surpriseFactors.repeated}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Rumored before</Label>
                        <p className="text-xs text-muted-foreground">
                          Was speculated but not confirmed
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-48">
                        <Slider
                          value={[scoringConfig.surpriseFactors.rumoredBefore]}
                          onValueChange={([v]) => updateSurpriseFactor("rumoredBefore", v)}
                          min={0}
                          max={2}
                          step={0.5}
                        />
                        <span className="w-8 text-right font-mono">
                          +{scoringConfig.surpriseFactors.rumoredBefore}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Source Credibility */}
            <AccordionItem value="source">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <span>Source Credibility</span>
                  <Badge variant="secondary">0 to +2</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Who said it matters. Configure credibility scores for different sources.
                  </p>

                  <div className="space-y-2">
                    {scoringConfig.sourceCredibility.map((source, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                      >
                        <span className="flex-1">{source.name}</span>
                        <div className="flex items-center gap-2 w-48">
                          <Slider
                            value={[source.score]}
                            onValueChange={([v]) => updateSourceScore(index, v)}
                            min={0}
                            max={2}
                            step={0.5}
                          />
                          <span className="w-8 text-right font-mono">+{source.score}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSource(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 items-end border-t pt-4">
                    <div className="flex-1">
                      <Label>Source Name</Label>
                      <Input
                        value={newSource}
                        onChange={(e) => setNewSource(e.target.value)}
                        placeholder="e.g., Analyst report"
                      />
                    </div>
                    <div className="w-32">
                      <Label>Score</Label>
                      <Select
                        value={newSourceScore.toString()}
                        onValueChange={(v) => setNewSourceScore(parseFloat(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.5">0.5</SelectItem>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="1.5">1.5</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addSource} disabled={!newSource.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Company Sensitivity */}
            <AccordionItem value="company">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <span>Company Sensitivity</span>
                  <Badge variant="secondary">0 to +2</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Small or volatile stocks move more. Configure sensitivity by company profile.
                  </p>

                  <div className="space-y-2">
                    {scoringConfig.companySensitivity.map((company, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                      >
                        <span className="flex-1">{company.profile}</span>
                        <div className="flex items-center gap-2 w-48">
                          <Slider
                            value={[company.score]}
                            onValueChange={([v]) => updateCompanyScore(index, v)}
                            min={0}
                            max={2}
                            step={0.5}
                          />
                          <span className="w-8 text-right font-mono">+{company.score}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCompanyProfile(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 items-end border-t pt-4">
                    <div className="flex-1">
                      <Label>Company Profile</Label>
                      <Input
                        value={newCompanyProfile}
                        onChange={(e) => setNewCompanyProfile(e.target.value)}
                        placeholder="e.g., Mid-cap growth"
                      />
                    </div>
                    <div className="w-32">
                      <Label>Score</Label>
                      <Select
                        value={newCompanyScore.toString()}
                        onValueChange={(v) => setNewCompanyScore(parseFloat(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.5">0.5</SelectItem>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="1.5">1.5</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addCompanyProfile} disabled={!newCompanyProfile.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Market Context */}
            <AccordionItem value="market">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <span>Market Context Modifier</span>
                  <Badge variant="secondary">-1 to +1</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Same news does not equal same reaction in different market conditions.
                  </p>

                  <div className="space-y-2">
                    {scoringConfig.marketContextModifiers.map((context, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                      >
                        <span className="flex-1">{context.context}</span>
                        <div className="flex items-center gap-2 w-48">
                          <Slider
                            value={[context.score]}
                            onValueChange={([v]) => updateMarketScore(index, v)}
                            min={-1}
                            max={1}
                            step={0.5}
                          />
                          <span className="w-8 text-right font-mono">
                            {context.score >= 0 ? "+" : ""}
                            {context.score}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMarketContext(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 items-end border-t pt-4">
                    <div className="flex-1">
                      <Label>Market Context</Label>
                      <Input
                        value={newMarketContext}
                        onChange={(e) => setNewMarketContext(e.target.value)}
                        placeholder="e.g., High volatility period"
                      />
                    </div>
                    <div className="w-32">
                      <Label>Score</Label>
                      <Select
                        value={newMarketScore.toString()}
                        onValueChange={(v) => setNewMarketScore(parseFloat(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">-1</SelectItem>
                          <SelectItem value="-0.5">-0.5</SelectItem>
                          <SelectItem value="0">0</SelectItem>
                          <SelectItem value="0.5">+0.5</SelectItem>
                          <SelectItem value="1">+1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addMarketContext} disabled={!newMarketContext.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Scoring Formula Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Formula</CardTitle>
          <CardDescription>How the final impact score is calculated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-md font-mono text-sm">
            <p className="mb-2">
              <strong>Final Score</strong> = Base Event Impact + Sentiment Strength + Surprise Factor
              + Source Credibility + Company Sensitivity + Market Context
            </p>
            <p className="text-muted-foreground">
              Range: 1-10 (capped)
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-md border">
              <div className="font-medium">Base Event Impact</div>
              <div className="text-muted-foreground">1-5 points</div>
            </div>
            <div className="p-3 rounded-md border">
              <div className="font-medium">Sentiment Strength</div>
              <div className="text-muted-foreground">-2 to +2 points</div>
            </div>
            <div className="p-3 rounded-md border">
              <div className="font-medium">Surprise Factor</div>
              <div className="text-muted-foreground">0-2 points</div>
            </div>
            <div className="p-3 rounded-md border">
              <div className="font-medium">Source Credibility</div>
              <div className="text-muted-foreground">0-2 points</div>
            </div>
            <div className="p-3 rounded-md border">
              <div className="font-medium">Company Sensitivity</div>
              <div className="text-muted-foreground">0-2 points</div>
            </div>
            <div className="p-3 rounded-md border">
              <div className="font-medium">Market Context</div>
              <div className="text-muted-foreground">-1 to +1 points</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
