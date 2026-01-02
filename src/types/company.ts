export type MarketCap = "large_cap" | "mid_cap" | "small_cap" | "micro_cap";
export type TransactionVolume = "high" | "medium" | "low";
export type Sector =
  | "technology"
  | "healthcare"
  | "finance"
  | "industrials"
  | "consumer"
  | "energy"
  | "materials"
  | "real_estate"
  | "utilities"
  | "telecom"
  | "other";

export interface Company {
  id: string;
  symbol: string;
  name: string;
  marketCap: MarketCap;
  transactionVolume: TransactionVolume;
  sector: Sector;
  exchange: string;
  isActive: boolean;
  notes?: string;
  // Swedish-specific
  isin?: string;
  // Price sensitivity
  volatility?: "high" | "medium" | "low";
}

export const marketCapLabels: Record<MarketCap, string> = {
  large_cap: "Large Cap",
  mid_cap: "Mid Cap",
  small_cap: "Small Cap",
  micro_cap: "Micro Cap",
};

export const transactionVolumeLabels: Record<TransactionVolume, string> = {
  high: "High Volume",
  medium: "Medium Volume",
  low: "Low Volume",
};

export const sectorLabels: Record<Sector, string> = {
  technology: "Technology",
  healthcare: "Healthcare & Pharma",
  finance: "Finance & Banking",
  industrials: "Industrials",
  consumer: "Consumer Goods",
  energy: "Energy",
  materials: "Materials",
  real_estate: "Real Estate",
  utilities: "Utilities",
  telecom: "Telecom",
  other: "Other",
};

export const defaultCompanies: Company[] = [
  // Swedish Large Cap
  {
    id: "1",
    symbol: "VOLV-B",
    name: "Volvo",
    marketCap: "large_cap",
    transactionVolume: "high",
    sector: "industrials",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  {
    id: "2",
    symbol: "ERIC-B",
    name: "Ericsson",
    marketCap: "large_cap",
    transactionVolume: "high",
    sector: "technology",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  {
    id: "3",
    symbol: "HM-B",
    name: "H&M",
    marketCap: "large_cap",
    transactionVolume: "high",
    sector: "consumer",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  {
    id: "4",
    symbol: "ATCO-A",
    name: "Atlas Copco",
    marketCap: "large_cap",
    transactionVolume: "high",
    sector: "industrials",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  {
    id: "5",
    symbol: "SEB-A",
    name: "SEB",
    marketCap: "large_cap",
    transactionVolume: "high",
    sector: "finance",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  {
    id: "6",
    symbol: "SWED-A",
    name: "Swedbank",
    marketCap: "large_cap",
    transactionVolume: "high",
    sector: "finance",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  {
    id: "7",
    symbol: "SAND",
    name: "Sandvik",
    marketCap: "large_cap",
    transactionVolume: "high",
    sector: "industrials",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  {
    id: "8",
    symbol: "ASSA-B",
    name: "ASSA ABLOY",
    marketCap: "large_cap",
    transactionVolume: "high",
    sector: "industrials",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  {
    id: "9",
    symbol: "HEXA-B",
    name: "Hexagon",
    marketCap: "large_cap",
    transactionVolume: "high",
    sector: "technology",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  {
    id: "10",
    symbol: "INVE-B",
    name: "Investor",
    marketCap: "large_cap",
    transactionVolume: "high",
    sector: "finance",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  // Swedish Mid Cap
  {
    id: "11",
    symbol: "SINCH",
    name: "Sinch",
    marketCap: "mid_cap",
    transactionVolume: "medium",
    sector: "technology",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  {
    id: "12",
    symbol: "ELUX-B",
    name: "Electrolux",
    marketCap: "mid_cap",
    transactionVolume: "medium",
    sector: "consumer",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  {
    id: "13",
    symbol: "SKF-B",
    name: "SKF",
    marketCap: "mid_cap",
    transactionVolume: "medium",
    sector: "industrials",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  {
    id: "14",
    symbol: "TELIA",
    name: "Telia",
    marketCap: "mid_cap",
    transactionVolume: "medium",
    sector: "telecom",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  {
    id: "15",
    symbol: "SSAB-A",
    name: "SSAB",
    marketCap: "mid_cap",
    transactionVolume: "medium",
    sector: "materials",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  // Swedish Small Cap / Pharma
  {
    id: "16",
    symbol: "BIOA-B",
    name: "BioArctic",
    marketCap: "small_cap",
    transactionVolume: "medium",
    sector: "healthcare",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  {
    id: "17",
    symbol: "ONCO",
    name: "Oncopeptides",
    marketCap: "small_cap",
    transactionVolume: "low",
    sector: "healthcare",
    exchange: "OMX Stockholm",
    isActive: true,
  },
  // US Large Cap
  {
    id: "18",
    symbol: "AAPL",
    name: "Apple Inc.",
    marketCap: "large_cap",
    transactionVolume: "high",
    sector: "technology",
    exchange: "NASDAQ",
    isActive: true,
  },
  {
    id: "19",
    symbol: "MSFT",
    name: "Microsoft",
    marketCap: "large_cap",
    transactionVolume: "high",
    sector: "technology",
    exchange: "NASDAQ",
    isActive: true,
  },
  {
    id: "20",
    symbol: "NVDA",
    name: "NVIDIA",
    marketCap: "large_cap",
    transactionVolume: "high",
    sector: "technology",
    exchange: "NASDAQ",
    isActive: true,
  },
];
