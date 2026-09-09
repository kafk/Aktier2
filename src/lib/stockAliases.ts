import { Stock } from "@/types/scraper";

export interface StockInfo extends Stock {
  aliases: string[];
  orderbookId?: string;
}

export const STOCK_DICTIONARY: StockInfo[] = [
  // 🇸🇪 Swedish OMXS30 & Large/Mid Cap Stocks
  {
    symbol: "VOLV B",
    name: "Volvo",
    aliases: ["VOLVO", "VOLV-B", "VOLV_B", "VOLV", "VOLVO LASTVAGNAR", "AB VOLVO"],
    orderbookId: "5240",
  },
  {
    symbol: "ERIC B",
    name: "Ericsson",
    aliases: ["ERICSSON", "ERIC-B", "ERIC_B", "ERIC", "LM ERICSSON", "TELEFONAKTIEBOLAGET LM ERICSSON"],
    orderbookId: "5765",
  },
  {
    symbol: "INVE B",
    name: "Investor",
    aliases: ["INVESTOR", "INVE-B", "INVE_B", "INVE", "INVESTOR AB"],
    orderbookId: "5247",
  },
  {
    symbol: "EVO",
    name: "Evolution",
    aliases: ["EVOLUTION", "EVOLUTION GAMING", "EVO.ST"],
    orderbookId: "746107",
  },
  {
    symbol: "HM B",
    name: "H&M",
    aliases: ["H&M", "HENNES & MAURITZ", "HM-B", "HM_B", "HM", "HENNES"],
    orderbookId: "5235",
  },
  {
    symbol: "AZN",
    name: "AstraZeneca",
    aliases: ["ASTRAZENECA", "ASTRA ZENECA", "ASTRA", "AZN.ST"],
    orderbookId: "3524",
  },
  {
    symbol: "SAAB B",
    name: "Saab",
    aliases: ["SAAB", "SAAB-B", "SAAB_B", "SAAB GROUP"],
    orderbookId: "653",
  },
  {
    symbol: "ATCO A",
    name: "Atlas Copco",
    aliases: ["ATLAS COPCO", "ATCO-A", "ATCO_A", "ATCO", "ATLAS COPCO A"],
    orderbookId: "45",
  },
  {
    symbol: "SWED A",
    name: "Swedbank",
    aliases: ["SWEDBANK", "SWED-A", "SWED_A", "SWED"],
    orderbookId: "5287",
  },
  {
    symbol: "SEB A",
    name: "SEB",
    aliases: ["SEB", "SKANDINAVISKA ENSKILDA BANKEN", "SEB-A", "SEB_A"],
    orderbookId: "725",
  },
  {
    symbol: "SHB A",
    name: "Handelsbanken",
    aliases: ["HANDELSBANKEN", "SHB-A", "SHB_A", "SHB", "SVENSKA HANDELSBANKEN"],
    orderbookId: "668",
  },
  {
    symbol: "NDA SE",
    name: "Nordea",
    aliases: ["NORDEA", "NORDEA BANK", "NDA-SE", "NDA_SE", "NDA"],
    orderbookId: "542691",
  },
  {
    symbol: "NIBE B",
    name: "NIBE Industrier",
    aliases: ["NIBE", "NIBE INDUSTRIER", "NIBE-B", "NIBE_B"],
    orderbookId: "5284",
  },
  {
    symbol: "BOL",
    name: "Boliden",
    aliases: ["BOLIDEN", "BOL.ST", "BOLIDEN AB"],
    orderbookId: "155",
  },
  {
    symbol: "SAND",
    name: "Sandvik",
    aliases: ["SANDVIK", "SAND.ST", "SANDVIK AB"],
    orderbookId: "650",
  },
  {
    symbol: "SINCH",
    name: "Sinch",
    aliases: ["SINCH", "SINCH AB", "SINCH.ST"],
    orderbookId: "658963",
  },
  {
    symbol: "EMBRAC B",
    name: "Embracer",
    aliases: ["EMBRACER", "EMBRACER GROUP", "EMBRAC-B", "EMBRAC_B", "EMBRAC"],
    orderbookId: "5427",
  },
  {
    symbol: "ESSITY B",
    name: "Essity",
    aliases: ["ESSITY", "ESSITY-B", "ESSITY_B", "ESSITY AB"],
    orderbookId: "725547",
  },
  {
    symbol: "TELIA",
    name: "Telia Company",
    aliases: ["TELIA", "TELIA COMPANY", "TELIASONERA", "TELIA.ST"],
    orderbookId: "5353",
  },
  {
    symbol: "TEL2 B",
    name: "Tele2",
    aliases: ["TELE2", "TEL2-B", "TEL2_B", "TELE2 AB"],
    orderbookId: "5351",
  },
  {
    symbol: "SBB B",
    name: "SBB",
    aliases: ["SBB", "SAMHÄLLSBYGGNADSBOLAGET", "SBB-B", "SBB_B", "SAMHÄLLSBYGGNADSBOLAGET I NORDEN"],
    orderbookId: "769719",
  },
  {
    symbol: "EQT",
    name: "EQT",
    aliases: ["EQT", "EQT AB", "EQT.ST"],
    orderbookId: "987514",
  },
  {
    symbol: "ASSA B",
    name: "Assa Abloy",
    aliases: ["ASSA ABLOY", "ASSA-B", "ASSA_B", "ASSA"],
    orderbookId: "24",
  },
  {
    symbol: "ABB",
    name: "ABB",
    aliases: ["ABB", "ABB LTD", "ABB.ST"],
    orderbookId: "5447",
  },
  {
    symbol: "SKF B",
    name: "SKF",
    aliases: ["SKF", "SKF-B", "SKF_B", "SKF AB"],
    orderbookId: "677",
  },
  {
    symbol: "SKA B",
    name: "Skanska",
    aliases: ["SKANSKA", "SKA-B", "SKA_B", "SKANSKA AB"],
    orderbookId: "672",
  },
  {
    symbol: "ALFA",
    name: "Alfa Laval",
    aliases: ["ALFA LAVAL", "ALFA", "ALFA.ST"],
    orderbookId: "15",
  },
  {
    symbol: "HEXA B",
    name: "Hexagon",
    aliases: ["HEXAGON", "HEXA-B", "HEXA_B", "HEXAGON AB"],
    orderbookId: "5279",
  },
  {
    symbol: "SCA B",
    name: "SCA",
    aliases: ["SCA", "SVENSKA CELLULOSA", "SCA-B", "SCA_B"],
    orderbookId: "656",
  },

  // 🇺🇸 US Stocks
  { symbol: "NVDA", name: "NVIDIA Corporation", aliases: ["NVIDIA", "NVDA"] },
  { symbol: "AAPL", name: "Apple Inc.", aliases: ["APPLE", "APPLE INC", "AAPL"] },
  { symbol: "MSFT", name: "Microsoft Corporation", aliases: ["MICROSOFT", "MSFT"] },
  { symbol: "GOOGL", name: "Alphabet Inc.", aliases: ["GOOGLE", "ALPHABET", "GOOGL", "GOOG"] },
  { symbol: "AMZN", name: "Amazon.com Inc.", aliases: ["AMAZON", "AMZN"] },
  { symbol: "META", name: "Meta Platforms Inc.", aliases: ["META", "FACEBOOK"] },
  { symbol: "TSLA", name: "Tesla Inc.", aliases: ["TESLA", "TSLA"] },
  { symbol: "AMD", name: "AMD", aliases: ["ADVANCED MICRO DEVICES", "AMD"] },
  { symbol: "NFLX", name: "Netflix Inc.", aliases: ["NETFLIX", "NFLX"] },
  { symbol: "PLTR", name: "Palantir Technologies", aliases: ["PALANTIR", "PLTR"] },
  { symbol: "COIN", name: "Coinbase Global", aliases: ["COINBASE", "COIN"] },
  { symbol: "DIS", name: "Walt Disney Co.", aliases: ["DISNEY", "WALT DISNEY", "DIS"] },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", aliases: ["JPMORGAN", "JP MORGAN", "JPM"] },
  { symbol: "V", name: "Visa Inc.", aliases: ["VISA", "V"] },
  { symbol: "WMT", name: "Walmart Inc.", aliases: ["WALMART", "WMT"] },
  { symbol: "CRM", name: "Salesforce Inc.", aliases: ["SALESFORCE", "CRM"] },
  { symbol: "ADBE", name: "Adobe Inc.", aliases: ["ADOBE", "ADBE"] },
  { symbol: "INTC", name: "Intel Corporation", aliases: ["INTEL", "INTC"] },
  { symbol: "QCOM", name: "Qualcomm Inc.", aliases: ["QUALCOMM", "QCOM"] },
  { symbol: "UBER", name: "Uber Technologies", aliases: ["UBER"] },
];

/**
 * Check if an article matches a specific stock (by ticker, name, or aliases)
 */
export function matchStockInArticle(
  article: { title: string; description?: string; ticker?: string },
  stock: Stock
): boolean {
  const titleUpper = article.title.toUpperCase();
  const descUpper = (article.description || "").toUpperCase();
  const combined = `${titleUpper} ${descUpper}`;

  // Find info from dictionary if available
  const dictInfo = STOCK_DICTIONARY.find(
    (s) =>
      s.symbol.toUpperCase() === stock.symbol.toUpperCase() ||
      s.name.toUpperCase() === stock.name.toUpperCase()
  );

  const aliasesToCheck = new Set<string>();
  aliasesToCheck.add(stock.symbol.toUpperCase());
  aliasesToCheck.add(stock.symbol.toUpperCase().replace(/\s+(A|B|C)$/i, ""));
  aliasesToCheck.add(stock.symbol.toUpperCase().replace(/[\s\-_]/g, ""));
  if (stock.name) {
    aliasesToCheck.add(stock.name.toUpperCase());
  }

  if (dictInfo) {
    for (const alias of dictInfo.aliases) {
      aliasesToCheck.add(alias.toUpperCase());
    }
  }

  // 1. Check article ticker
  if (article.ticker) {
    const cleanTicker = article.ticker.replace(/\.ST$/i, "").toUpperCase();
    if (aliasesToCheck.has(cleanTicker) || aliasesToCheck.has(article.ticker.toUpperCase())) {
      return true;
    }
  }

  // 2. Check headline prefix (e.g. "VOLVO:", "ERICSSON:", "H&M:")
  const prefixMatch = titleUpper.match(/^([A-ZÅÄÖ0-9&.\-\s]{2,20}):/);
  if (prefixMatch) {
    const prefix = prefixMatch[1].trim();
    if (aliasesToCheck.has(prefix)) {
      return true;
    }
  }

  // 3. Word-boundary or substring check in title and description
  for (const alias of Array.from(aliasesToCheck)) {
    if (alias.length < 2) continue;

    // For short aliases (<= 4 chars), require word boundary to avoid false substring matches
    if (alias.length <= 4) {
      const regex = new RegExp(`(^|[^a-zA-Z0-9åäöÅÄÖ])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zA-Z0-9åäöÅÄÖ]|$)`, "i");
      if (regex.test(titleUpper) || regex.test(descUpper)) {
        return true;
      }
    } else {
      if (combined.includes(alias)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Auto-detect stock from an article (useful for market-wide scanning)
 */
export function detectStockFromArticle(article: {
  title: string;
  description?: string;
  ticker?: string;
}): Stock | null {
  // Check if article matches any stock in our dictionary
  for (const stock of STOCK_DICTIONARY) {
    if (matchStockInArticle(article, stock)) {
      return { symbol: stock.symbol, name: stock.name };
    }
  }

  // If headline starts with a company prefix (e.g. "BOLAGET: ...")
  const prefixMatch = article.title.match(/^([A-ZÅÄÖ0-9&.\-\s]{2,15}):/);
  if (prefixMatch) {
    const prefix = prefixMatch[1].trim();
    return { symbol: prefix, name: prefix };
  }

  if (article.ticker) {
    const cleanTicker = article.ticker.replace(/\.ST$/i, "");
    return { symbol: cleanTicker, name: cleanTicker };
  }

  return null;
}
