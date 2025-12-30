"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImpactScoreBand } from "@/types/keywords";

interface ImpactBandsTabProps {
  impactBands: ImpactScoreBand[];
  setImpactBands: (bands: ImpactScoreBand[]) => void;
}

const presetColors = [
  { name: "Gray", value: "#6b7280" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
];

export function ImpactBandsTab({ impactBands, setImpactBands }: ImpactBandsTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<ImpactScoreBand>({
    minScore: 1,
    maxScore: 2,
    label: "",
    action: "",
    color: "#6b7280",
  });

  const handleAdd = () => {
    setEditingIndex(null);
    const lastBand = impactBands[impactBands.length - 1];
    setFormData({
      minScore: lastBand ? lastBand.maxScore + 1 : 1,
      maxScore: lastBand ? lastBand.maxScore + 2 : 2,
      label: "",
      action: "",
      color: "#6b7280",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData({ ...impactBands[index] });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingIndex !== null) {
      const updated = [...impactBands];
      updated[editingIndex] = formData;
      setImpactBands(updated);
    } else {
      setImpactBands([...impactBands, formData]);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (index: number) => {
    setImpactBands(impactBands.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Impact Score Bands</CardTitle>
              <CardDescription>
                Configure how scores translate to user actions
              </CardDescription>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Band
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Visual Score Scale */}
            <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex">
                {impactBands.map((band, index) => {
                  const totalRange = 10;
                  const width = ((band.maxScore - band.minScore + 1) / totalRange) * 100;
                  const left = ((band.minScore - 1) / totalRange) * 100;
                  return (
                    <div
                      key={index}
                      className="absolute h-full flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity"
                      style={{
                        backgroundColor: band.color,
                        width: `${width}%`,
                        left: `${left}%`,
                      }}
                      onClick={() => handleEdit(index)}
                    >
                      {band.label}
                    </div>
                  );
                })}
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] text-muted-foreground">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </div>
            </div>

            {/* Bands Table */}
            <div className="rounded-md border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium w-12"></th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Score Range</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Label</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Color</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {impactBands.map((band, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono">
                          {band.minScore} - {band.maxScore}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: band.color }}
                          />
                          <span className="font-medium">{band.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{band.action}</td>
                      <td className="px-4 py-3">
                        <div
                          className="w-8 h-6 rounded border"
                          style={{ backgroundColor: band.color }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(index)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(index)}
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
          </div>
        </CardContent>
      </Card>

      {/* Example Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Example Calculations</CardTitle>
          <CardDescription>See how scores are categorized</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border">
              <h4 className="font-medium mb-2">Earnings Beat + Strong Language</h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Base (Earnings Beat)</span>
                  <span>+5</span>
                </div>
                <div className="flex justify-between">
                  <span>Sentiment (strong)</span>
                  <span>+1</span>
                </div>
                <div className="flex justify-between">
                  <span>Source (8-K filing)</span>
                  <span>+2</span>
                </div>
                <div className="flex justify-between">
                  <span>Company (mid-cap)</span>
                  <span>+1</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-medium text-foreground">
                  <span>Total</span>
                  <span>9</span>
                </div>
              </div>
              <div className="mt-2">
                {impactBands.find((b) => 9 >= b.minScore && 9 <= b.maxScore) && (
                  <span
                    className="inline-block px-2 py-1 rounded text-sm text-white font-medium"
                    style={{
                      backgroundColor:
                        impactBands.find((b) => 9 >= b.minScore && 9 <= b.maxScore)?.color ||
                        "#6b7280",
                    }}
                  >
                    {impactBands.find((b) => 9 >= b.minScore && 9 <= b.maxScore)?.label} -{" "}
                    {impactBands.find((b) => 9 >= b.minScore && 9 <= b.maxScore)?.action}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg border">
              <h4 className="font-medium mb-2">Product Launch (Known)</h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Base (Product Launch)</span>
                  <span>+2</span>
                </div>
                <div className="flex justify-between">
                  <span>Sentiment (neutral)</span>
                  <span>+0</span>
                </div>
                <div className="flex justify-between">
                  <span>Source (press release)</span>
                  <span>+1</span>
                </div>
                <div className="flex justify-between">
                  <span>Surprise (rumored)</span>
                  <span>+0.5</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-medium text-foreground">
                  <span>Total</span>
                  <span>3.5 → 4</span>
                </div>
              </div>
              <div className="mt-2">
                {impactBands.find((b) => 4 >= b.minScore && 4 <= b.maxScore) && (
                  <span
                    className="inline-block px-2 py-1 rounded text-sm text-white font-medium"
                    style={{
                      backgroundColor:
                        impactBands.find((b) => 4 >= b.minScore && 4 <= b.maxScore)?.color ||
                        "#6b7280",
                    }}
                  >
                    {impactBands.find((b) => 4 >= b.minScore && 4 <= b.maxScore)?.label} -{" "}
                    {impactBands.find((b) => 4 >= b.minScore && 4 <= b.maxScore)?.action}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? "Edit Band" : "Add Band"}</DialogTitle>
            <DialogDescription>
              Configure the score range, label, and action for this band.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minScore">Min Score</Label>
                <Input
                  id="minScore"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.minScore}
                  onChange={(e) =>
                    setFormData({ ...formData, minScore: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxScore">Max Score</Label>
                <Input
                  id="maxScore"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.maxScore}
                  onChange={(e) =>
                    setFormData({ ...formData, maxScore: parseInt(e.target.value) || 10 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Critical"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Input
                id="action"
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                placeholder="e.g., Push notification"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {presetColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-md border-2 transition-all ${
                      formData.color === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:border-muted-foreground"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor="customColor" className="text-xs">
                  Custom:
                </Label>
                <Input
                  id="customColor"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-8 p-1 cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-24 font-mono text-xs"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.label || !formData.action}>
              {editingIndex !== null ? "Save Changes" : "Add Band"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
