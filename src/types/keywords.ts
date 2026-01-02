export type Sentiment = "positive" | "negative" | "neutral";

export interface Classification {
  id: string;
  name: string;
  code: string;
  keywords: string[];
  sentiment: Sentiment;
  isActive: boolean;
  isBuiltIn: boolean;
  baseImpactScore: number; // 1-5
}

export interface SentimentModifier {
  word: string;
  score: number; // -2 to +2
  type: "positive" | "negative";
}

export interface SurpriseFactorConfig {
  conflictsWithGuidance: number;
  firstTimeEvent: number;
  repeated: number;
  rumoredBefore: number;
}

export interface SourceCredibility {
  name: string;
  score: number; // 0-2
}

export interface CompanySensitivity {
  profile: string;
  score: number; // 0-2
}

export interface MarketContextModifier {
  context: string;
  score: number; // -1 to +1
}

export interface ImpactScoreBand {
  minScore: number;
  maxScore: number;
  label: string;
  action: string;
  color: string;
}

export interface ScoringConfig {
  sentimentModifiers: SentimentModifier[];
  surpriseFactors: SurpriseFactorConfig;
  sourceCredibility: SourceCredibility[];
  companySensitivity: CompanySensitivity[];
  marketContextModifiers: MarketContextModifier[];
  impactScoreBands: ImpactScoreBand[];
}

// Default data
export const defaultClassifications: Classification[] = [
  {
    id: "1",
    name: "Acquisition/Merger",
    code: "ACQUISITION",
    keywords: ["acquires", "acquisition", "to buy", "takeover", "merger", "merge", "förvärv", "förvärvar", "uppköp", "fusion", "bud på", "köper upp", "samgående", "övertagande", "budplikt"],
    sentiment: "neutral",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 4,
  },
  {
    id: "2",
    name: "Analyst Downgrade",
    code: "DOWNGRADE",
    keywords: ["downgrades", "downgraded", "cuts rating", "downgrade to sell", "price target cut", "sänker", "sänkt", "nedgraderar", "riktkurs sänks", "sänker riktkurs", "lägre riktkurs", "neutral från köp"],
    sentiment: "negative",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 2,
  },
  {
    id: "3",
    name: "Analyst Upgrade",
    code: "UPGRADE",
    keywords: ["upgrades", "upgraded", "raises rating", "upgrade to buy", "price target raised", "höjer", "höjt", "uppgraderar", "riktkurs höjs", "höjer riktkurs", "högre riktkurs", "köp från neutral"],
    sentiment: "positive",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 2,
  },
  {
    id: "4",
    name: "Bankruptcy",
    code: "BANKRUPTCY",
    keywords: ["bankruptcy", "chapter 11", "chapter 7", "insolvency", "insolvent", "konkurs", "obestånd", "rekonstruktion", "konkursansökan", "likvidation", "avveckling", "betalningsinställelse"],
    sentiment: "negative",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 5,
  },
  {
    id: "5",
    name: "CEO Change",
    code: "CEO_CHANGE",
    keywords: ["ceo resigns", "ceo steps down", "new ceo", "ceo departs", "ceo fired", "vd avgår", "ny vd", "vd slutar", "verkställande direktör", "vd lämnar", "byter vd", "tillförordnad vd", "interims-vd"],
    sentiment: "neutral",
    isActive: true,
    isBuiltIn: true,
    baseImpactScore: 3,
  },
  {
    id: "6",
    name: "CFO Change",
    code: "CFO_CHANGE",
    keywords: ["cfo resigns", "cfo steps down", "new cfo", "cfo departs", "cfo fired", "finanschef avgår", "ny finanschef", "cfo slutar", "ekonomichef", "finansdirektör", "byter cfo"],
    sentiment: "neutral",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 3,
  },
  {
    id: "7",
    name: "Dividend",
    code: "DIVIDEND",
    keywords: ["dividend raises", "dividend increases", "dividend hikes", "declares dividend", "utdelning", "höjer utdelning", "aktieutdelning", "extrautdelning", "föreslagen utdelning", "utdelningsförslag", "ingen utdelning", "sänkt utdelning", "höjd utdelning"],
    sentiment: "positive",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 2,
  },
  {
    id: "8",
    name: "Earnings Beat",
    code: "EARNINGS_BEAT",
    keywords: ["beats", "topped", "exceeds", "surpasses", "earnings", "eps", "profit", "vinst", "resultat", "överträffar", "bättre än väntat", "kvartalsrapport", "stark rapport", "rekordresultat", "vinstökning", "resultattillväxt", "rörelseresultat", "nettoresultat"],
    sentiment: "positive",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 5,
  },
  {
    id: "9",
    name: "Earnings Miss",
    code: "EARNINGS_MISS",
    keywords: ["misses", "missed", "falls short", "below expectations", "earnings miss", "förlust", "sämre än väntat", "under förväntningar", "resultatvarning", "svag rapport", "vinstfall", "rörelseförlust", "nettoförlust", "besvikelse"],
    sentiment: "negative",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 5,
  },
  {
    id: "10",
    name: "FDA Approval",
    code: "FDA_APPROVAL",
    keywords: ["fda approves", "fda approved", "fda approval", "fda clears", "fda cleared", "godkännande", "läkemedelsverket godkänner", "ema godkänner", "marknadsgodkännande", "fas 3 godkänd"],
    sentiment: "positive",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 5,
  },
  {
    id: "11",
    name: "FDA Rejection",
    code: "FDA_REJECTION",
    keywords: ["fda rejects", "fda rejected", "fda rejection", "fda denies", "fda denied", "avslag", "nekas godkännande", "ej godkänd", "misslyckad studie", "negativ studiedata"],
    sentiment: "negative",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 5,
  },
  {
    id: "12",
    name: "Guidance Cut",
    code: "GUIDANCE_CUT",
    keywords: ["cuts guidance", "lowers outlook", "weak guidance", "disappointing forecast", "sänker prognos", "justerar ned", "vinstvarning", "negativ prognos", "reviderar ned", "sänkta utsikter", "försämrad utsikt", "lägre förväntningar"],
    sentiment: "negative",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 5,
  },
  {
    id: "13",
    name: "Guidance Raised",
    code: "GUIDANCE_RAISE",
    keywords: ["raises guidance", "raised guidance", "lifts outlook", "boosts forecast", "höjer prognos", "justerar upp", "positiv prognos", "reviderar upp", "höjda utsikter", "förbättrad utsikt", "högre förväntningar"],
    sentiment: "positive",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 5,
  },
  {
    id: "14",
    name: "IPO",
    code: "IPO",
    keywords: ["ipo", "initial public offering", "goes public", "going public", "public debut", "börsnotering", "börsintroduktion", "noteras", "första handelsdag", "notering", "listning", "first north", "nasdaq stockholm"],
    sentiment: "neutral",
    isActive: true,
    isBuiltIn: true,
    baseImpactScore: 3,
  },
  {
    id: "15",
    name: "Insider Buying",
    code: "INSIDER_BUYING",
    keywords: ["insider buys", "insider buying", "insider purchased", "insider acquires", "insynsköp", "storägare köper", "ledningen köper", "insynsperson köper", "flaggning köp", "ökad ägarandel"],
    sentiment: "positive",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 2,
  },
  {
    id: "16",
    name: "Insider Selling",
    code: "INSIDER_SELLING",
    keywords: ["insider sells", "insider selling", "insider sold", "insider dumps", "insynsförsäljning", "storägare säljer", "ledningen säljer", "insynsperson säljer", "flaggning sälj", "minskad ägarandel"],
    sentiment: "negative",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 2,
  },
  {
    id: "17",
    name: "Investment",
    code: "INVESTMENT",
    keywords: ["invests", "investment", "invested", "investing in", "investerar", "investering", "satsar", "satsning", "expansion", "utbyggnad", "kapitalallokering"],
    sentiment: "neutral",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 2,
  },
  {
    id: "18",
    name: "Lawsuit",
    code: "LAWSUIT",
    keywords: ["lawsuit", "sued", "sues", "suing", "litigation", "legal action", "class action", "stämning", "stämd", "rättstvist", "rättsprocess", "domstol", "tvistemål", "skadestånd", "rättslig tvist"],
    sentiment: "negative",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 3,
  },
  {
    id: "19",
    name: "Layoffs",
    code: "LAYOFFS",
    keywords: ["layoffs", "laying off", "job cuts", "workforce reduction", "downsizing", "restructuring", "varsel", "uppsägningar", "nedskärningar", "omstrukturering", "personalminskningar", "kostnadsbesparingar", "effektivisering", "sparprogram"],
    sentiment: "negative",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 3,
  },
  {
    id: "20",
    name: "Partnership",
    code: "PARTNERSHIP",
    keywords: ["partnership", "partners with", "teams up", "collaboration", "alliance", "deal with", "samarbete", "partnerskap", "avtal med", "samarbetsavtal", "strategiskt samarbete", "joint venture", "licensavtal"],
    sentiment: "positive",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 2,
  },
  {
    id: "21",
    name: "Product Launch",
    code: "PRODUCT_LAUNCH",
    keywords: ["launches", "launched", "unveils", "unveiled", "introduces", "new product", "new service", "lanserar", "lansering", "ny produkt", "ny tjänst", "produktlansering", "marknadslansering", "release"],
    sentiment: "positive",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 2,
  },
  {
    id: "22",
    name: "SEC Investigation",
    code: "SEC_INVESTIGATION",
    keywords: ["sec investigation", "sec investigates", "sec probe", "sec inquiry", "sec subpoena", "finansinspektion", "utredning", "granskning", "fi granskar", "ekobrottsmyndigheten", "börsövervakning"],
    sentiment: "negative",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 4,
  },
  {
    id: "23",
    name: "Stock Buyback",
    code: "STOCK_BUYBACK",
    keywords: ["buyback", "repurchase", "buy back", "share repurchase", "återköp", "aktieåterköp", "återköpsprogram", "köper tillbaka aktier"],
    sentiment: "positive",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 2,
  },
  {
    id: "24",
    name: "Stock Split",
    code: "STOCK_SPLIT",
    keywords: ["stock split", "share split", "split for", "aktiesplit", "split", "reverse split", "omvänd split"],
    sentiment: "positive",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 2,
  },
  {
    id: "25",
    name: "Order/Contract",
    code: "ORDER",
    keywords: ["order", "orders", "contract", "contracts", "awarded", "order från", "beställning", "kontrakt", "avtal", "ramavtal", "stororder", "tilldelning", "upphandling", "affär med"],
    sentiment: "positive",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 3,
  },
  {
    id: "26",
    name: "Recommendation",
    code: "RECOMMENDATION",
    keywords: ["rekommendation", "riktkurs", "köp", "sälj", "behåll", "target price", "recommendation", "rating", "stark köp", "köpvärd", "säljvärd"],
    sentiment: "neutral",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 2,
  },
  {
    id: "27",
    name: "Rights Issue",
    code: "RIGHTS_ISSUE",
    keywords: ["rights issue", "rights offering", "share offering", "nyemission", "företrädesemission", "riktad emission", "kapitalanskaffning", "aktieemission", "emissionsvillkor", "teckningsperiod"],
    sentiment: "negative",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 3,
  },
  {
    id: "28",
    name: "Divestiture",
    code: "DIVESTITURE",
    keywords: ["divests", "divestiture", "sells off", "disposes", "avyttrar", "avyttring", "säljer av", "avknoppning", "utförsäljning", "delförsäljning"],
    sentiment: "neutral",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 3,
  },
  {
    id: "29",
    name: "Clinical Trial",
    code: "CLINICAL_TRIAL",
    keywords: ["clinical trial", "phase 1", "phase 2", "phase 3", "trial results", "klinisk studie", "fas 1", "fas 2", "fas 3", "studieresultat", "patientrekrytering", "primärt effektmått"],
    sentiment: "neutral",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 4,
  },
  {
    id: "30",
    name: "Revenue Growth",
    code: "REVENUE_GROWTH",
    keywords: ["revenue growth", "sales increase", "top line growth", "omsättningstillväxt", "ökad omsättning", "försäljningstillväxt", "intäktsökning", "tillväxt", "organisk tillväxt"],
    sentiment: "positive",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 3,
  },
  {
    id: "31",
    name: "Debt/Financing",
    code: "DEBT_FINANCING",
    keywords: ["debt financing", "loan", "credit facility", "bond issue", "lån", "kredit", "obligation", "refinansiering", "skuldfinansiering", "kreditavtal", "obligationslån"],
    sentiment: "neutral",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 2,
  },
  {
    id: "32",
    name: "Board Change",
    code: "BOARD_CHANGE",
    keywords: ["board member", "new director", "board resigns", "styrelseledamot", "ny styrelse", "styrelseordförande", "avgår ur styrelsen", "styrelseförändringar", "valberedning"],
    sentiment: "neutral",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 2,
  },
  {
    id: "33",
    name: "Market Expansion",
    code: "MARKET_EXPANSION",
    keywords: ["expansion", "enters market", "new market", "geographic expansion", "expansion", "ny marknad", "geografisk expansion", "internationalisering", "etablering", "marknadsinträde"],
    sentiment: "positive",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 2,
  },
  {
    id: "34",
    name: "Delisting",
    code: "DELISTING",
    keywords: ["delisting", "delisted", "removed from", "avnoteras", "avnotering", "lämnar börsen", "stryks från", "handelsstopp"],
    sentiment: "negative",
    isActive: true,
    isBuiltIn: false,
    baseImpactScore: 4,
  },
];

export const defaultScoringConfig: ScoringConfig = {
  sentimentModifiers: [
    { word: "strong", score: 1, type: "positive" },
    { word: "record", score: 1, type: "positive" },
    { word: "significant", score: 1, type: "positive" },
    { word: "accelerating", score: 1, type: "positive" },
    { word: "exceptional", score: 2, type: "positive" },
    { word: "breakthrough", score: 2, type: "positive" },
    { word: "dominant", score: 2, type: "positive" },
    { word: "weak", score: -1, type: "negative" },
    { word: "slowing", score: -1, type: "negative" },
    { word: "pressure", score: -1, type: "negative" },
    { word: "severe", score: -2, type: "negative" },
    { word: "material", score: -2, type: "negative" },
    { word: "significant decline", score: -2, type: "negative" },
  ],
  surpriseFactors: {
    conflictsWithGuidance: 2,
    firstTimeEvent: 2,
    repeated: 0,
    rumoredBefore: 0.5,
  },
  sourceCredibility: [
    { name: "Company filing (10-K, 8-K)", score: 2 },
    { name: "Earnings call", score: 2 },
    { name: "Major outlet (Reuters, Bloomberg)", score: 1.5 },
    { name: "Tier-2 media", score: 1 },
    { name: "Social media / rumor", score: 0.5 },
  ],
  companySensitivity: [
    { profile: "Small cap / biotech", score: 2 },
    { profile: "High short interest", score: 1.5 },
    { profile: "High beta", score: 1 },
    { profile: "Mega-cap (Apple, MSFT)", score: 0.5 },
  ],
  marketContextModifiers: [
    { context: "Bear market bad news", score: 1 },
    { context: "Bull market bad news", score: -0.5 },
    { context: "Sector under pressure", score: 0.5 },
    { context: "Macro noise", score: -0.5 },
  ],
  impactScoreBands: [
    { minScore: 1, maxScore: 2, label: "Noise", action: "Ignore", color: "#6b7280" },
    { minScore: 3, maxScore: 4, label: "Low", action: "Digest", color: "#22c55e" },
    { minScore: 5, maxScore: 6, label: "Medium", action: "Watch", color: "#eab308" },
    { minScore: 7, maxScore: 8, label: "High", action: "Alert", color: "#f97316" },
    { minScore: 9, maxScore: 10, label: "Critical", action: "Push notification", color: "#ef4444" },
  ],
};
