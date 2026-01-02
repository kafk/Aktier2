"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Classification, Sentiment, defaultClassifications } from "@/types/keywords";

interface ClassificationsTabProps {
  classifications: Classification[];
  setClassifications: (classifications: Classification[]) => void;
}

const emptyClassification: Omit<Classification, "id"> = {
  name: "",
  code: "",
  keywords: [],
  sentiment: "neutral",
  isActive: true,
  isBuiltIn: false,
  baseImpactScore: 3,
};

export function ClassificationsTab({
  classifications,
  setClassifications,
}: ClassificationsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Classification, "id">>(emptyClassification);
  const [keywordsText, setKeywordsText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const filteredClassifications = classifications.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.keywords.some((k) => k.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyClassification);
    setKeywordsText("");
    setIsDialogOpen(true);
  };

  const handleEdit = (classification: Classification) => {
    setEditingId(classification.id);
    setFormData({
      name: classification.name,
      code: classification.code,
      keywords: classification.keywords,
      sentiment: classification.sentiment,
      isActive: classification.isActive,
      isBuiltIn: classification.isBuiltIn,
      baseImpactScore: classification.baseImpactScore,
    });
    setKeywordsText(classification.keywords.join("\n"));
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    const keywords = keywordsText
      .split("\n")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (editingId) {
      setClassifications(
        classifications.map((c) =>
          c.id === editingId ? { ...formData, id: editingId, keywords } : c
        )
      );
    } else {
      const newClassification: Classification = {
        ...formData,
        id: Date.now().toString(),
        keywords,
      };
      setClassifications([...classifications, newClassification]);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setClassifications(classifications.filter((c) => c.id !== id));
    setDeleteConfirmId(null);
  };

  const handleToggleActive = (id: string) => {
    setClassifications(
      classifications.map((c) =>
        c.id === id ? { ...c, isActive: !c.isActive } : c
      )
    );
  };

  const handleResetToDefaults = () => {
    setClassifications(defaultClassifications);
    setShowResetConfirm(false);
  };

  const getSentimentBadge = (sentiment: Sentiment) => {
    const variants = {
      positive: "positive" as const,
      negative: "negative" as const,
      neutral: "neutral" as const,
    };
    return <Badge variant={variants[sentiment]}>{sentiment}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Classifications</CardTitle>
            <CardDescription>
              {classifications.length} rules configured
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowResetConfirm(true)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Classification
            </Button>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search classifications or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Classification</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Keywords</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Sentiment</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Impact</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClassifications.map((classification) => (
                <tr key={classification.id} className="border-t">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{classification.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {classification.code}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {classification.keywords.slice(0, 4).map((keyword, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {classification.keywords.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{classification.keywords.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getSentimentBadge(classification.sentiment)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(classification.baseImpactScore / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{classification.baseImpactScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={classification.isActive}
                        onCheckedChange={() => handleToggleActive(classification.id)}
                      />
                      <span className="text-sm">
                        {classification.isActive ? "Active" : "Disabled"}
                      </span>
                      {classification.isBuiltIn && (
                        <Badge variant="secondary" className="text-xs">
                          Built-in
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(classification)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmId(classification.id)}
                        disabled={classification.isBuiltIn}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Classification" : "Add Classification"}
            </DialogTitle>
            <DialogDescription>
              Configure the classification name, keywords, and scoring parameters.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Earnings Beat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., EARNINGS_BEAT"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords (one per line)</Label>
              <Textarea
                id="keywords"
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                placeholder="beats&#10;topped&#10;exceeds&#10;surpasses"
                className="min-h-[150px] font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sentiment">Sentiment</Label>
                <Select
                  value={formData.sentiment}
                  onValueChange={(value: Sentiment) =>
                    setFormData({ ...formData, sentiment: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Base Impact Score: {formData.baseImpactScore}</Label>
                <Slider
                  value={[formData.baseImpactScore]}
                  onValueChange={([value]) =>
                    setFormData({ ...formData, baseImpactScore: value })
                  }
                  min={1}
                  max={5}
                  step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low (1)</span>
                  <span>High (5)</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.code}>
              {editingId ? "Save Changes" : "Add Classification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Classification</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this classification? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to Defaults</DialogTitle>
            <DialogDescription>
              This will replace all classifications with the latest defaults, including new Swedish keywords and 8 new categories. Your custom classifications will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetToDefaults}>
              Reset to Defaults
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
