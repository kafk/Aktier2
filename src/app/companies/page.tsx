"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Plus, Pencil, Trash2, Search, Building2, RotateCcw, Filter } from "lucide-react";
import {
  Company,
  MarketCap,
  TransactionVolume,
  Sector,
  marketCapLabels,
  transactionVolumeLabels,
  sectorLabels,
  defaultCompanies,
} from "@/types/company";

const emptyCompany: Omit<Company, "id"> = {
  symbol: "",
  name: "",
  marketCap: "mid_cap",
  transactionVolume: "medium",
  sector: "other",
  exchange: "OMX Stockholm",
  isActive: true,
  notes: "",
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useLocalStorage<Company[]>("companies", defaultCompanies);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMarketCap, setFilterMarketCap] = useState<MarketCap | "all">("all");
  const [filterSector, setFilterSector] = useState<Sector | "all">("all");
  const [filterVolume, setFilterVolume] = useState<TransactionVolume | "all">("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Company, "id">>(emptyCompany);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMarketCap = filterMarketCap === "all" || c.marketCap === filterMarketCap;
    const matchesSector = filterSector === "all" || c.sector === filterSector;
    const matchesVolume = filterVolume === "all" || c.transactionVolume === filterVolume;
    return matchesSearch && matchesMarketCap && matchesSector && matchesVolume;
  });

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyCompany);
    setIsDialogOpen(true);
  };

  const handleEdit = (company: Company) => {
    setEditingId(company.id);
    setFormData({
      symbol: company.symbol,
      name: company.name,
      marketCap: company.marketCap,
      transactionVolume: company.transactionVolume,
      sector: company.sector,
      exchange: company.exchange,
      isActive: company.isActive,
      notes: company.notes || "",
      isin: company.isin,
      volatility: company.volatility,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      setCompanies(
        companies.map((c) =>
          c.id === editingId ? { ...formData, id: editingId } : c
        )
      );
    } else {
      const newCompany: Company = {
        ...formData,
        id: Date.now().toString(),
      };
      setCompanies([...companies, newCompany]);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setCompanies(companies.filter((c) => c.id !== id));
    setDeleteConfirmId(null);
  };

  const handleToggleActive = (id: string) => {
    setCompanies(
      companies.map((c) =>
        c.id === id ? { ...c, isActive: !c.isActive } : c
      )
    );
  };

  const handleResetToDefaults = () => {
    setCompanies(defaultCompanies);
    setShowResetConfirm(false);
  };

  const getMarketCapBadge = (marketCap: MarketCap) => {
    const colors: Record<MarketCap, string> = {
      large_cap: "bg-blue-100 text-blue-800",
      mid_cap: "bg-green-100 text-green-800",
      small_cap: "bg-yellow-100 text-yellow-800",
      micro_cap: "bg-orange-100 text-orange-800",
    };
    return (
      <Badge className={colors[marketCap]}>
        {marketCapLabels[marketCap]}
      </Badge>
    );
  };

  const getVolumeBadge = (volume: TransactionVolume) => {
    const colors: Record<TransactionVolume, string> = {
      high: "bg-purple-100 text-purple-800",
      medium: "bg-gray-100 text-gray-800",
      low: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={colors[volume]}>
        {transactionVolumeLabels[volume]}
      </Badge>
    );
  };

  // Group companies by category for overview
  const companiesByMarketCap = {
    large_cap: companies.filter((c) => c.marketCap === "large_cap"),
    mid_cap: companies.filter((c) => c.marketCap === "mid_cap"),
    small_cap: companies.filter((c) => c.marketCap === "small_cap"),
    micro_cap: companies.filter((c) => c.marketCap === "micro_cap"),
  };

  const companiesBySector = Object.keys(sectorLabels).reduce((acc, sector) => {
    acc[sector as Sector] = companies.filter((c) => c.sector === sector);
    return acc;
  }, {} as Record<Sector, Company[]>);

  return (
    <main className="min-h-screen bg-background">
      <Header
        title="Company Management"
        titleClassName="text-blue-600"
        subtitle="Manage and categorize companies by market cap, sector, and trading volume"
        backHref="/"
      />

      <div className="container mx-auto px-4 pb-8">
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">All Companies</TabsTrigger>
            <TabsTrigger value="by-cap">By Market Cap</TabsTrigger>
            <TabsTrigger value="by-sector">By Sector</TabsTrigger>
          </TabsList>

          {/* All Companies Tab */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      All Companies
                    </CardTitle>
                    <CardDescription>
                      {companies.length} companies configured
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowResetConfirm(true)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                    <Button onClick={handleAdd}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Company
                    </Button>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="grid gap-4 mt-4 md:grid-cols-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search companies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterMarketCap} onValueChange={(v) => setFilterMarketCap(v as MarketCap | "all")}>
                    <SelectTrigger>
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Market Cap" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Market Caps</SelectItem>
                      {Object.entries(marketCapLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterSector} onValueChange={(v) => setFilterSector(v as Sector | "all")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sectors</SelectItem>
                      {Object.entries(sectorLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterVolume} onValueChange={(v) => setFilterVolume(v as TransactionVolume | "all")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Volume" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Volumes</SelectItem>
                      {Object.entries(transactionVolumeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent>
                {companies.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <p className="text-muted-foreground">No companies configured.</p>
                    <Button onClick={handleResetToDefaults}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Load Default Companies (Swedish & US stocks)
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">Company</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Market Cap</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Sector</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Volume</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Exchange</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCompanies.map((company) => (
                          <tr key={company.id} className="border-t">
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium">{company.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {company.symbol}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {getMarketCapBadge(company.marketCap)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">{sectorLabels[company.sector]}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              {getVolumeBadge(company.transactionVolume)}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {company.exchange}
                            </td>
                            <td className="px-4 py-3">
                              <Switch
                                checked={company.isActive}
                                onCheckedChange={() => handleToggleActive(company.id)}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(company)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteConfirmId(company.id)}
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Market Cap Tab */}
          <TabsContent value="by-cap">
            <div className="grid gap-4 md:grid-cols-2">
              {(Object.entries(companiesByMarketCap) as [MarketCap, Company[]][]).map(([cap, capCompanies]) => (
                <Card key={cap}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {marketCapLabels[cap]}
                      <Badge variant="secondary">{capCompanies.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {capCompanies.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No companies</p>
                      ) : (
                        capCompanies.map((company) => (
                          <div
                            key={company.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div>
                              <span className="font-medium">{company.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {company.symbol}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {sectorLabels[company.sector]}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* By Sector Tab */}
          <TabsContent value="by-sector">
            <div className="grid gap-4 md:grid-cols-3">
              {(Object.entries(companiesBySector) as [Sector, Company[]][])
                .filter(([, sectorCompanies]) => sectorCompanies.length > 0)
                .map(([sector, sectorCompanies]) => (
                  <Card key={sector}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base">
                        {sectorLabels[sector]}
                        <Badge variant="secondary">{sectorCompanies.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {sectorCompanies.map((company) => (
                          <div
                            key={company.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div>
                              <span className="font-medium text-sm">{company.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {company.symbol}
                              </span>
                            </div>
                            {getMarketCapBadge(company.marketCap)}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Company" : "Add Company"}
            </DialogTitle>
            <DialogDescription>
              Configure company details and categorization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g., VOLV-B"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Volvo"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Market Cap</Label>
                <Select
                  value={formData.marketCap}
                  onValueChange={(v) => setFormData({ ...formData, marketCap: v as MarketCap })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(marketCapLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Transaction Volume</Label>
                <Select
                  value={formData.transactionVolume}
                  onValueChange={(v) => setFormData({ ...formData, transactionVolume: v as TransactionVolume })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(transactionVolumeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sector</Label>
                <Select
                  value={formData.sector}
                  onValueChange={(v) => setFormData({ ...formData, sector: v as Sector })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sectorLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exchange">Exchange</Label>
                <Input
                  id="exchange"
                  value={formData.exchange}
                  onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                  placeholder="e.g., OMX Stockholm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="isin">ISIN (optional)</Label>
                <Input
                  id="isin"
                  value={formData.isin || ""}
                  onChange={(e) => setFormData({ ...formData, isin: e.target.value })}
                  placeholder="e.g., SE0000115446"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes about this company..."
                className="min-h-[80px]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="active">Active (include in monitoring)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.symbol || !formData.name}>
              {editingId ? "Save Changes" : "Add Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this company? This action cannot be undone.
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
              This will replace all companies with the default list of Swedish and US stocks. Your custom companies will be removed.
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
    </main>
  );
}
