export type StockMarket = "US" | "SE";
export type StockList = "OMXS30" | "Large Cap" | "Mid Cap" | "Small Cap" | "First North" | "US Tech" | "US Blue Chips";

export interface Stock {
  symbol: string;
  name: string;
  market?: StockMarket;
  list?: StockList;
}

export interface ScraperKeyword {
  id: string;
  keyword: string;
  source: "classification" | "custom";
  classificationId?: string;
  classificationName?: string;
}

export type MarketDataSource = "auto" | "yahoo" | "polygon" | "google" | "avanza" | "tradingview";

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  matchedStock: string;
  matchedKeywords: string[];
  sentiment: "positive" | "negative" | "neutral";
  impactScore: number;

  // Event classification
  eventType?: string;
  eventCode?: string;

  // Price tracking (all optional, populated over time)
  priceAtEvent?: number;
  price1h?: number | null;
  price1d?: number | null;

  // Index prices (SPY for market adjustment)
  indexPriceAtEvent?: number;
  indexPrice1h?: number | null;
  indexPrice1d?: number | null;

  // Calculated metrics
  stockAbsMove1h?: number | null;
  stockAbsMove1d?: number | null;
  newsMove1h?: number | null;
  newsMove1d?: number | null;
  newsImpact1h?: number | null;
  newsImpact1d?: number | null;

  // Baselines
  baseline1h?: number;
  baseline1d?: number;

  // Status
  priceTrackingStatus?: "pending" | "1h_complete" | "1d_complete";
  is1hTruncated?: boolean;

  // Data source tracking
  priceSource?: "polygon" | "yahoo" | "google" | "avanza" | "tradingview" | "none";
}

export interface ScraperConfig {
  stocks: Stock[];
  keywords: ScraperKeyword[];
  daysToScrape: number;
  notificationLimit: number;
}

export interface ScraperState {
  isRunning: boolean;
  isPaused: boolean;
  progress: number;
  totalArticlesScanned: number;
  matchedArticles: NewsArticle[];
  notificationCount: number;
}

// Comprehensive stocks database divided by market and exchange list
export const popularStocks: Stock[] = [
  // 🇸🇪 OMXS30 (De 30 mest omsatta på Stockholmsbörsen)
  { symbol: "VOLV B", name: "Volvo B", market: "SE", list: "OMXS30" },
  { symbol: "INVE B", name: "Investor B", market: "SE", list: "OMXS30" },
  { symbol: "ATCO A", name: "Atlas Copco A", market: "SE", list: "OMXS30" },
  { symbol: "ATCO B", name: "Atlas Copco B", market: "SE", list: "OMXS30" },
  { symbol: "ABB", name: "ABB", market: "SE", list: "OMXS30" },
  { symbol: "AZN", name: "AstraZeneca", market: "SE", list: "OMXS30" },
  { symbol: "ASSA B", name: "Assa Abloy B", market: "SE", list: "OMXS30" },
  { symbol: "SEB A", name: "SEB A", market: "SE", list: "OMXS30" },
  { symbol: "SWED A", name: "Swedbank A", market: "SE", list: "OMXS30" },
  { symbol: "SHB A", name: "Handelsbanken A", market: "SE", list: "OMXS30" },
  { symbol: "NDA SE", name: "Nordea Bank", market: "SE", list: "OMXS30" },
  { symbol: "ERIC B", name: "Ericsson B", market: "SE", list: "OMXS30" },
  { symbol: "SAND", name: "Sandvik", market: "SE", list: "OMXS30" },
  { symbol: "HM B", name: "H&M B", market: "SE", list: "OMXS30" },
  { symbol: "EVO", name: "Evolution", market: "SE", list: "OMXS30" },
  { symbol: "EQT", name: "EQT", market: "SE", list: "OMXS30" },
  { symbol: "HEXA B", name: "Hexagon B", market: "SE", list: "OMXS30" },
  { symbol: "SAAB B", name: "Saab B", market: "SE", list: "OMXS30" },
  { symbol: "NIBE B", name: "NIBE Industrier B", market: "SE", list: "OMXS30" },
  { symbol: "ESSITY B", name: "Essity B", market: "SE", list: "OMXS30" },
  { symbol: "BOL", name: "Boliden", market: "SE", list: "OMXS30" },
  { symbol: "ALFA", name: "Alfa Laval", market: "SE", list: "OMXS30" },
  { symbol: "SKF B", name: "SKF B", market: "SE", list: "OMXS30" },
  { symbol: "SCA B", name: "SCA B", market: "SE", list: "OMXS30" },
  { symbol: "TELIA", name: "Telia Company", market: "SE", list: "OMXS30" },
  { symbol: "TEL2 B", name: "Tele2 B", market: "SE", list: "OMXS30" },
  { symbol: "GETI B", name: "Getinge B", market: "SE", list: "OMXS30" },
  { symbol: "ELUX B", name: "Electrolux B", market: "SE", list: "OMXS30" },
  { symbol: "KINV B", name: "Kinnevik B", market: "SE", list: "OMXS30" },
  { symbol: "SINCH", name: "Sinch", market: "SE", list: "OMXS30" },

  // 🇸🇪 Large Cap Stockholm
  { symbol: "CAST", name: "Castellum", market: "SE", list: "Large Cap" },
  { symbol: "BALD B", name: "Fastighets Balder B", market: "SE", list: "Large Cap" },
  { symbol: "FABG", name: "Fabege", market: "SE", list: "Large Cap" },
  { symbol: "LUMI", name: "Lundin Mining", market: "SE", list: "Large Cap" },
  { symbol: "HOLM B", name: "Holmen B", market: "SE", list: "Large Cap" },
  { symbol: "HPOL B", name: "Hexpol B", market: "SE", list: "Large Cap" },
  { symbol: "TREL B", name: "Trelleborg B", market: "SE", list: "Large Cap" },
  { symbol: "INDU C", name: "Industrivärden C", market: "SE", list: "Large Cap" },
  { symbol: "INDT", name: "Indutrade", market: "SE", list: "Large Cap" },
  { symbol: "LIFCO B", name: "Lifco B", market: "SE", list: "Large Cap" },
  { symbol: "BEIJ B", name: "Beijer Ref B", market: "SE", list: "Large Cap" },
  { symbol: "ADDT B", name: "Addtech B", market: "SE", list: "Large Cap" },
  { symbol: "SWEC B", name: "Sweco B", market: "SE", list: "Large Cap" },
  { symbol: "AAK", name: "AAK", market: "SE", list: "Large Cap" },
  { symbol: "SAGA B", name: "Sagax B", market: "SE", list: "Large Cap" },
  { symbol: "LATO B", name: "Latour B", market: "SE", list: "Large Cap" },
  { symbol: "LUND B", name: "Lundbergföretagen B", market: "SE", list: "Large Cap" },
  { symbol: "SECU B", name: "Securitas B", market: "SE", list: "Large Cap" },
  { symbol: "LOOM B", name: "Loomis", market: "SE", list: "Large Cap" },
  { symbol: "DOM", name: "Dometic Group", market: "SE", list: "Large Cap" },
  { symbol: "SBB B", name: "Samhällsbyggnadsbolaget B", market: "SE", list: "Large Cap" },
  { symbol: "THULE", name: "Thule Group", market: "SE", list: "Large Cap" },
  { symbol: "BRAV", name: "Bravida Holding", market: "SE", list: "Large Cap" },
  { symbol: "WALL B", name: "Wallenstam B", market: "SE", list: "Large Cap" },
  { symbol: "WIHL", name: "Wihlborgs Fastigheter", market: "SE", list: "Large Cap" },
  { symbol: "PEAB B", name: "Peab B", market: "SE", list: "Large Cap" },
  { symbol: "SKA B", name: "Skanska B", market: "SE", list: "Large Cap" },
  { symbol: "BILL", name: "Billerud", market: "SE", list: "Large Cap" },
  { symbol: "HUSQ B", name: "Husqvarna B", market: "SE", list: "Large Cap" },
  { symbol: "SOBI", name: "Swedish Orphan Biovitrum", market: "SE", list: "Large Cap" },
  { symbol: "AXFO", name: "Axfood", market: "SE", list: "Large Cap" },
  { symbol: "ALIV SDB", name: "Autoliv SDB", market: "SE", list: "Large Cap" },
  { symbol: "EPI A", name: "Epiroc A", market: "SE", list: "Large Cap" },
  { symbol: "EPI B", name: "Epiroc B", market: "SE", list: "Large Cap" },
  { symbol: "SSAB A", name: "SSAB A", market: "SE", list: "Large Cap" },
  { symbol: "SSAB B", name: "SSAB B", market: "SE", list: "Large Cap" },
  { symbol: "ELUX P", name: "Electrolux Professional B", market: "SE", list: "Large Cap" },
  { symbol: "EKTA B", name: "Elekta B", market: "SE", list: "Large Cap" },
  { symbol: "HEM", name: "Hemnet Group", market: "SE", list: "Large Cap" },
  { symbol: "INSTAL", name: "Instalco", market: "SE", list: "Large Cap" },
  { symbol: "INTRUM", name: "Intrum", market: "SE", list: "Large Cap" },
  { symbol: "MIPS", name: "MIPS", market: "SE", list: "Large Cap" },
  { symbol: "NCC B", name: "NCC B", market: "SE", list: "Large Cap" },
  { symbol: "NOMI", name: "Nordnet", market: "SE", list: "Large Cap" },
  { symbol: "PNDX B", name: "Pandox B", market: "SE", list: "Large Cap" },
  { symbol: "VITR", name: "Vitrolife", market: "SE", list: "Large Cap" },
  { symbol: "BEIA B", name: "Beijer Alma B", market: "SE", list: "Large Cap" },
  { symbol: "AFRY", name: "AFRY", market: "SE", list: "Large Cap" },
  { symbol: "ATRLJ B", name: "Atrium Ljungberg B", market: "SE", list: "Large Cap" },
  { symbol: "ARJO B", name: "Arjo B", market: "SE", list: "Large Cap" },
  { symbol: "BETS B", name: "Betsson B", market: "SE", list: "Large Cap" },
  { symbol: "BIOA B", name: "BioArctic B", market: "SE", list: "Large Cap" },
  { symbol: "CAMX", name: "Camurus", market: "SE", list: "Large Cap" },
  { symbol: "CAT B", name: "Catena B", market: "SE", list: "Large Cap" },
  { symbol: "CORE B", name: "Corem Property B", market: "SE", list: "Large Cap" },
  { symbol: "HUFV A", name: "Hufvudstaden A", market: "SE", list: "Large Cap" },
  { symbol: "LAGR B", name: "Lagercrantz Group B", market: "SE", list: "Large Cap" },
  { symbol: "NTEK B", name: "Netcompany", market: "SE", list: "Large Cap" },
  { symbol: "NWG", name: "Nordic Waterproofing", market: "SE", list: "Large Cap" },
  { symbol: "SECT B", name: "Sectra B", market: "SE", list: "Large Cap" },
  { symbol: "TRUE B", name: "Truecaller B", market: "SE", list: "Large Cap" },
  { symbol: "VVI", name: "Vimian Group", market: "SE", list: "Large Cap" },
  { symbol: "VIT B", name: "Vitec Software Group B", market: "SE", list: "Large Cap" },
  { symbol: "XVIVO", name: "Xvivo Perfusion", market: "SE", list: "Large Cap" },

  // 🇸🇪 Mid Cap Stockholm
  { symbol: "CLAS B", name: "Clas Ohlson B", market: "SE", list: "Mid Cap" },
  { symbol: "BILI A", name: "Bilia A", market: "SE", list: "Mid Cap" },
  { symbol: "BUFAB", name: "Bufab", market: "SE", list: "Mid Cap" },
  { symbol: "MYCR", name: "Mycronic", market: "SE", list: "Mid Cap" },
  { symbol: "NYF", name: "Nyfosa", market: "SE", list: "Mid Cap" },
  { symbol: "LIAB", name: "Lindab International", market: "SE", list: "Mid Cap" },
  { symbol: "BIOT", name: "Biotage", market: "SE", list: "Mid Cap" },
  { symbol: "MTRS", name: "Munters Group", market: "SE", list: "Mid Cap" },
  { symbol: "NOLA B", name: "Nolato B", market: "SE", list: "Mid Cap" },
  { symbol: "GRNG", name: "Gränges", market: "SE", list: "Mid Cap" },
  { symbol: "JM", name: "JM", market: "SE", list: "Mid Cap" },
  { symbol: "COOR", name: "Coor Service Management", market: "SE", list: "Mid Cap" },
  { symbol: "ATT", name: "Attendo", market: "SE", list: "Mid Cap" },
  { symbol: "INWI", name: "Inwido", market: "SE", list: "Mid Cap" },
  { symbol: "CIBUS", name: "Cibus Nordic Real Estate", market: "SE", list: "Mid Cap" },
  { symbol: "CLA B", name: "Cloetta B", market: "SE", list: "Mid Cap" },
  { symbol: "HMS", name: "HMS Networks", market: "SE", list: "Mid Cap" },
  { symbol: "VBG B", name: "VBG Group B", market: "SE", list: "Mid Cap" },
  { symbol: "FPAR A", name: "Fastpartner A", market: "SE", list: "Mid Cap" },
  { symbol: "DIOS", name: "Diös Fastigheter", market: "SE", list: "Mid Cap" },
  { symbol: "MEKO", name: "MEKO", market: "SE", list: "Mid Cap" },
  { symbol: "BURE", name: "Bure Equity", market: "SE", list: "Mid Cap" },
  { symbol: "CRED A", name: "Creades A", market: "SE", list: "Mid Cap" },
  { symbol: "RATO B", name: "Ratos B", market: "SE", list: "Mid Cap" },
  { symbol: "ALIF B", name: "Alimak Group", market: "SE", list: "Mid Cap" },
  { symbol: "AMBEA", name: "Ambea", market: "SE", list: "Mid Cap" },
  { symbol: "BHG", name: "BHG Group", market: "SE", list: "Mid Cap" },
  { symbol: "BOOZT", name: "Boozt", market: "SE", list: "Mid Cap" },
  { symbol: "BULTEN", name: "Bulten", market: "SE", list: "Mid Cap" },
  { symbol: "CALL", name: "Calliditas Therapeutics", market: "SE", list: "Mid Cap" },
  { symbol: "CATE", name: "Catella B", market: "SE", list: "Mid Cap" },
  { symbol: "CTEK", name: "CTEK", market: "SE", list: "Mid Cap" },
  { symbol: "DUST", name: "Dustin Group", market: "SE", list: "Mid Cap" },
  { symbol: "FAG", name: "Fagerhult", market: "SE", list: "Mid Cap" },
  { symbol: "FING B", name: "Fingerprint Cards B", market: "SE", list: "Mid Cap" },
  { symbol: "GARO", name: "GARO", market: "SE", list: "Mid Cap" },
  { symbol: "HANZA", name: "HANZA", market: "SE", list: "Mid Cap" },
  { symbol: "HEBA B", name: "Heba Fastighets B", market: "SE", list: "Mid Cap" },
  { symbol: "KDEV", name: "Karolinska Development", market: "SE", list: "Mid Cap" },
  { symbol: "KNOW", name: "Knowit", market: "SE", list: "Mid Cap" },
  { symbol: "LINC", name: "Linc", market: "SE", list: "Mid Cap" },
  { symbol: "MEDA", name: "Medivir", market: "SE", list: "Mid Cap" },
  { symbol: "MILDEF", name: "MilDef Group", market: "SE", list: "Mid Cap" },
  { symbol: "MTG B", name: "Modern Times Group B", market: "SE", list: "Mid Cap" },
  { symbol: "NMAN", name: "Nederman Holding", market: "SE", list: "Mid Cap" },
  { symbol: "NEW B", name: "New Wave Group B", market: "SE", list: "Mid Cap" },
  { symbol: "NOBI", name: "Nobia", market: "SE", list: "Mid Cap" },
  { symbol: "NOTE", name: "NOTE", market: "SE", list: "Mid Cap" },
  { symbol: "OEM B", name: "OEM International B", market: "SE", list: "Mid Cap" },
  { symbol: "PLAZ B", name: "Platzer Fastigheter B", market: "SE", list: "Mid Cap" },
  { symbol: "SCST", name: "Scandi Standard", market: "SE", list: "Mid Cap" },
  { symbol: "SHOT", name: "Scandic Hotels Group", market: "SE", list: "Mid Cap" },
  { symbol: "SVOL B", name: "Svolder B", market: "SE", list: "Mid Cap" },
  { symbol: "TRAC B", name: "Traction B", market: "SE", list: "Mid Cap" },
  { symbol: "TROAX", name: "Troax Group", market: "SE", list: "Mid Cap" },
  { symbol: "VAPO", name: "Viaplay Group B", market: "SE", list: "Mid Cap" },
  { symbol: "VICO", name: "Vicore Pharma", market: "SE", list: "Mid Cap" },
  { symbol: "VOLO", name: "Volati", market: "SE", list: "Mid Cap" },

  // 🇸🇪 Small Cap Stockholm
  { symbol: "ELTEL", name: "Eltel", market: "SE", list: "Small Cap" },
  { symbol: "STAR B", name: "Starbreeze B", market: "SE", list: "Small Cap" },
  { symbol: "ANOT", name: "Anoto Group", market: "SE", list: "Small Cap" },
  { symbol: "BICO", name: "BICO Group", market: "SE", list: "Small Cap" },
  { symbol: "CANTA", name: "Cantargia", market: "SE", list: "Small Cap" },
  { symbol: "RAY B", name: "RaySearch Laboratories B", market: "SE", list: "Small Cap" },
  { symbol: "GREEN", name: "Green Landscaping Group", market: "SE", list: "Small Cap" },
  { symbol: "ALLIG", name: "Alligator Bioscience", market: "SE", list: "Small Cap" },
  { symbol: "OVZON", name: "Ovzon", market: "SE", list: "Small Cap" },
  { symbol: "DEDI", name: "Dedicare", market: "SE", list: "Small Cap" },
  { symbol: "PRIC B", name: "Pricer B", market: "SE", list: "Small Cap" },
  { symbol: "PACT", name: "Proact IT Group", market: "SE", list: "Small Cap" },
  { symbol: "MSON B", name: "Midsona B", market: "SE", list: "Small Cap" },
  { symbol: "SENS", name: "Sensys Gatso Group", market: "SE", list: "Small Cap" },
  { symbol: "ORTI A", name: "Ortivus A", market: "SE", list: "Small Cap" },
  { symbol: "VIVE", name: "Vivesto", market: "SE", list: "Small Cap" },
  { symbol: "ACTI", name: "Actic Group", market: "SE", list: "Small Cap" },
  { symbol: "ACTI B", name: "Active Biotech", market: "SE", list: "Small Cap" },
  { symbol: "ANX", name: "Annexin Pharmaceuticals", market: "SE", list: "Small Cap" },
  { symbol: "ARISE", name: "Arise", market: "SE", list: "Small Cap" },
  { symbol: "ASCE", name: "Ascelia Pharma", market: "SE", list: "Small Cap" },
  { symbol: "BETS", name: "Better Collective", market: "SE", list: "Small Cap" },
  { symbol: "BONG", name: "Bong", market: "SE", list: "Small Cap" },
  { symbol: "BTS B", name: "BTS Group B", market: "SE", list: "Small Cap" },
  { symbol: "CBTT B", name: "Christian Berner Tech B", market: "SE", list: "Small Cap" },
  { symbol: "CRAD B", name: "C-RAD B", market: "SE", list: "Small Cap" },
  { symbol: "DURC B", name: "Duroc B", market: "SE", list: "Small Cap" },
  { symbol: "ENEA", name: "Enea", market: "SE", list: "Small Cap" },
  { symbol: "ENZY", name: "Enzymatica", market: "SE", list: "Small Cap" },
  { symbol: "EPIS B", name: "Episurf Medical B", market: "SE", list: "Small Cap" },
  { symbol: "EWRK", name: "eWork Group", market: "SE", list: "Small Cap" },
  { symbol: "FPIP", name: "Formpipe Software", market: "SE", list: "Small Cap" },
  { symbol: "GENI", name: "Generic Sweden", market: "SE", list: "Small Cap" },
  { symbol: "HAV B", name: "Havsfrun Investment B", market: "SE", list: "Small Cap" },
  { symbol: "IMPC", name: "Impact Coatings", market: "SE", list: "Small Cap" },
  { symbol: "INVIS", name: "Invisio", market: "SE", list: "Small Cap" },
  { symbol: "IAR B", name: "IAR Systems Group B", market: "SE", list: "Small Cap" },
  { symbol: "KABE B", name: "KABE Group B", market: "SE", list: "Small Cap" },
  { symbol: "LAMM B", name: "Lammhults Design B", market: "SE", list: "Small Cap" },
  { symbol: "MALM B", name: "Malmbergs Elektriska B", market: "SE", list: "Small Cap" },
  { symbol: "MSAB B", name: "Micro Systemation B", market: "SE", list: "Small Cap" },
  { symbol: "MOB", name: "Moberg Pharma", market: "SE", list: "Small Cap" },
  { symbol: "NAXS", name: "NAXS", market: "SE", list: "Small Cap" },
  { symbol: "NTE B", name: "Netel Holding", market: "SE", list: "Small Cap" },
  { symbol: "NOLA A", name: "Nolato A", market: "SE", list: "Small Cap" },
  { symbol: "NVP", name: "NeuroVive Pharmaceutical", market: "SE", list: "Small Cap" },
  { symbol: "PREC", name: "Precise Biometrics", market: "SE", list: "Small Cap" },
  { symbol: "PRVB", name: "Prevas B", market: "SE", list: "Small Cap" },
  { symbol: "PROB", name: "Probi", market: "SE", list: "Small Cap" },
  { symbol: "PROG B", name: "ProfilGruppen B", market: "SE", list: "Small Cap" },
  { symbol: "RAIL", name: "Railcare Group", market: "SE", list: "Small Cap" },
  { symbol: "REJL B", name: "Rejlers B", market: "SE", list: "Small Cap" },
  { symbol: "RROS", name: "Rottneros", market: "SE", list: "Small Cap" },
  { symbol: "SANION", name: "Saniona", market: "SE", list: "Small Cap" },
  { symbol: "SINT", name: "SinterCast", market: "SE", list: "Small Cap" },
  { symbol: "SOF B", name: "Softronic B", market: "SE", list: "Small Cap" },
  { symbol: "SPRINT", name: "Sprint Bioscience", market: "SE", list: "Small Cap" },
  { symbol: "STWK", name: "Stockwik Förvaltning", market: "SE", list: "Small Cap" },
  { symbol: "STUD", name: "Studsvik", market: "SE", list: "Small Cap" },
  { symbol: "SVED B", name: "Svedbergs i Dalstorp B", market: "SE", list: "Small Cap" },
  { symbol: "WISE", name: "Wise Group", market: "SE", list: "Small Cap" },
  { symbol: "XANO B", name: "XANO Industri B", market: "SE", list: "Small Cap" },

  // 🇸🇪 First North (Tillväxtmarknad)
  { symbol: "EMBRAC B", name: "Embracer Group B", market: "SE", list: "First North" },
  { symbol: "KAMBI", name: "Kambi Group", market: "SE", list: "First North" },
  { symbol: "STORY B", name: "Storytel B", market: "SE", list: "First North" },
  { symbol: "FRACTL", name: "Fractal Gaming Group", market: "SE", list: "First North" },
  { symbol: "PDX", name: "Paradox Interactive", market: "SE", list: "First North" },
  { symbol: "SF", name: "Stillfront Group", market: "SE", list: "First North" },
  { symbol: "YUBICO", name: "Yubico", market: "SE", list: "First North" },
  { symbol: "VIVA", name: "Viva Wine Group", market: "SE", list: "First North" },
  { symbol: "CINT", name: "Cint Group", market: "SE", list: "First North" },
  { symbol: "FLAT B", name: "Flat Capital B", market: "SE", list: "First North" },
  { symbol: "BONES", name: "BONESUPPORT HOLDING", market: "SE", list: "First North" },
  { symbol: "CHECK", name: "Checkin.com Group", market: "SE", list: "First North" },
  { symbol: "DESEN", name: "Desenio Group", market: "SE", list: "First North" },
  { symbol: "DVYSR", name: "Devyser Diagnostics", market: "SE", list: "First North" },
  { symbol: "HAYPP", name: "Haypp Group", market: "SE", list: "First North" },
  { symbol: "LYKO A", name: "Lyko Group A", market: "SE", list: "First North" },
  { symbol: "PIERCE", name: "Pierce Group", market: "SE", list: "First North" },
  { symbol: "RVRC", name: "RevolutionRace", market: "SE", list: "First North" },
  { symbol: "RUG", name: "RugVista Group", market: "SE", list: "First North" },
  { symbol: "SLEEP", name: "Sleep Cycle", market: "SE", list: "First North" },
  { symbol: "SOLID", name: "Solid Försäkringsaktiebolag", market: "SE", list: "First North" },
  { symbol: "SYNSAM", name: "Synsam", market: "SE", list: "First North" },
  { symbol: "VNV", name: "VNV Global", market: "SE", list: "First North" },
  { symbol: "QLIRO", name: "Qliro", market: "SE", list: "First North" },
  { symbol: "ACRO", name: "Acrobatic / Acroud", market: "SE", list: "First North" },
  { symbol: "ADVEN", name: "Adverty", market: "SE", list: "First North" },
  { symbol: "AIC B", name: "Angler Gaming", market: "SE", list: "First North" },
  { symbol: "AMPLI", name: "Amplicare / Amplex", market: "SE", list: "First North" },
  { symbol: "BOKU", name: "Bokusgruppen", market: "SE", list: "First North" },
  { symbol: "BUSER", name: "Builder Software / BuildData", market: "SE", list: "First North" },
  { symbol: "CELL B", name: "Cell Impact B", market: "SE", list: "First North" },
  { symbol: "CIP", name: "Climeon", market: "SE", list: "First North" },
  { symbol: "DOME", name: "Dome Energy", market: "SE", list: "First North" },
  { symbol: "EQL", name: "EQL Pharma", market: "SE", list: "First North" },
  { symbol: "FRNT", name: "Frontoffice Nordic", market: "SE", list: "First North" },
  { symbol: "GOMOR", name: "Good Games Group", market: "SE", list: "First North" },
  { symbol: "HEMRA", name: "Hemmavid / Hembla", market: "SE", list: "First North" },
  { symbol: "HOFF B", name: "Hofvander / Hoff", market: "SE", list: "First North" },
  { symbol: "ICON", name: "Iconovo", market: "SE", list: "First North" },
  { symbol: "LUM", name: "LumenRadio", market: "SE", list: "First North" },
  { symbol: "MINX", name: "Minesto", market: "SE", list: "First North" },
  { symbol: "NEXAM", name: "Nexam Chemical", market: "SE", list: "First North" },
  { symbol: "OPT", name: "OptiMobile / OptiCept", market: "SE", list: "First North" },
  { symbol: "POLY", name: "Polygiene Group", market: "SE", list: "First North" },
  { symbol: "SAVE", name: "SaveLend Group", market: "SE", list: "First North" },
  { symbol: "SPOR", name: "Speqta", market: "SE", list: "First North" },
  { symbol: "TAG", name: "TargetEveryone", market: "SE", list: "First North" },
  { symbol: "TRAIN", name: "Train Alliance", market: "SE", list: "First North" },
  { symbol: "VIC", name: "Vicore Pharma", market: "SE", list: "First North" },
  { symbol: "WNT", name: "WntResearch", market: "SE", list: "First North" },

  // 🇺🇸 US Tech & Mega Caps
  { symbol: "NVDA", name: "NVIDIA", market: "US", list: "US Tech" },
  { symbol: "AAPL", name: "Apple", market: "US", list: "US Tech" },
  { symbol: "MSFT", name: "Microsoft", market: "US", list: "US Tech" },
  { symbol: "GOOGL", name: "Google / Alphabet", market: "US", list: "US Tech" },
  { symbol: "AMZN", name: "Amazon", market: "US", list: "US Tech" },
  { symbol: "META", name: "Meta Platforms", market: "US", list: "US Tech" },
  { symbol: "TSLA", name: "Tesla", market: "US", list: "US Tech" },
  { symbol: "AMD", name: "AMD", market: "US", list: "US Tech" },
  { symbol: "NFLX", name: "Netflix", market: "US", list: "US Tech" },
  { symbol: "PLTR", name: "Palantir", market: "US", list: "US Tech" },
  { symbol: "COIN", name: "Coinbase", market: "US", list: "US Tech" },
  { symbol: "CRM", name: "Salesforce", market: "US", list: "US Tech" },
  { symbol: "ADBE", name: "Adobe", market: "US", list: "US Tech" },
  { symbol: "INTC", name: "Intel", market: "US", list: "US Tech" },
  { symbol: "QCOM", name: "Qualcomm", market: "US", list: "US Tech" },
  { symbol: "AVGO", name: "Broadcom", market: "US", list: "US Tech" },
  { symbol: "UBER", name: "Uber", market: "US", list: "US Tech" },
  { symbol: "SNOW", name: "Snowflake", market: "US", list: "US Tech" },
  { symbol: "NOW", name: "ServiceNow", market: "US", list: "US Tech" },
  { symbol: "ARM", name: "ARM Holdings", market: "US", list: "US Tech" },

  // 🇺🇸 US Blue Chips & S&P Leaders
  { symbol: "JPM", name: "JPMorgan Chase", market: "US", list: "US Blue Chips" },
  { symbol: "V", name: "Visa", market: "US", list: "US Blue Chips" },
  { symbol: "MA", name: "Mastercard", market: "US", list: "US Blue Chips" },
  { symbol: "WMT", name: "Walmart", market: "US", list: "US Blue Chips" },
  { symbol: "DIS", name: "Disney", market: "US", list: "US Blue Chips" },
  { symbol: "BRK.B", name: "Berkshire Hathaway", market: "US", list: "US Blue Chips" },
  { symbol: "JNJ", name: "Johnson & Johnson", market: "US", list: "US Blue Chips" },
  { symbol: "PG", name: "Procter & Gamble", market: "US", list: "US Blue Chips" },
  { symbol: "XOM", name: "ExxonMobil", market: "US", list: "US Blue Chips" },
  { symbol: "LLY", name: "Eli Lilly", market: "US", list: "US Blue Chips" },
  { symbol: "UNH", name: "UnitedHealth", market: "US", list: "US Blue Chips" },
  { symbol: "KO", name: "Coca-Cola", market: "US", list: "US Blue Chips" },
  { symbol: "PEP", name: "PepsiCo", market: "US", list: "US Blue Chips" },
  { symbol: "COST", name: "Costco", market: "US", list: "US Blue Chips" },
  { symbol: "BA", name: "Boeing", market: "US", list: "US Blue Chips" },
];


