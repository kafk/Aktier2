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

  {
    symbol: "GETI B",
    name: "Getinge",
    aliases: ["GETINGE", "GETI-B", "GETI_B", "GETINGE AB"],
    orderbookId: "177",
  },
  {
    symbol: "ELUX B",
    name: "Electrolux",
    aliases: ["ELECTROLUX", "ELUX-B", "ELUX_B", "AB ELECTROLUX"],
    orderbookId: "81",
  },
  {
    symbol: "KINV B",
    name: "Kinnevik",
    aliases: ["KINNEVIK", "KINV-B", "KINV_B", "KINNEVIK AB"],
    orderbookId: "260",
  },
  {
    symbol: "CAST",
    name: "Castellum",
    aliases: ["CASTELLUM", "CAST.ST", "CASTELLUM AB"],
    orderbookId: "134",
  },
  {
    symbol: "BALD B",
    name: "Balder",
    aliases: ["BALDER", "FASTIGHETS BALDER", "BALD-B", "BALD_B"],
    orderbookId: "5437",
  },
  {
    symbol: "FABG",
    name: "Fabege",
    aliases: ["FABEGE", "FABG.ST", "FABEGE AB"],
    orderbookId: "125",
  },
  {
    symbol: "LUMI",
    name: "Lundin Mining",
    aliases: ["LUNDIN MINING", "LUMI.ST", "LUNDIN"],
    orderbookId: "5422",
  },
  {
    symbol: "HOLM B",
    name: "Holmen",
    aliases: ["HOLMEN", "HOLM-B", "HOLM_B", "HOLMEN AB"],
    orderbookId: "213",
  },
  {
    symbol: "HPOL B",
    name: "Hexpol",
    aliases: ["HEXPOL", "HPOL-B", "HPOL_B", "HEXPOL AB"],
    orderbookId: "5534",
  },
  {
    symbol: "TREL B",
    name: "Trelleborg",
    aliases: ["TRELLEBORG", "TREL-B", "TREL_B", "TRELLEBORG AB"],
    orderbookId: "702",
  },
  {
    symbol: "INDT",
    name: "Indutrade",
    aliases: ["INDUTRADE", "INDT.ST", "INDUTRADE AB"],
    orderbookId: "5322",
  },
  {
    symbol: "LIFCO B",
    name: "Lifco",
    aliases: ["LIFCO", "LIFCO-B", "LIFCO_B", "LIFCO AB"],
    orderbookId: "518335",
  },
  {
    symbol: "BEIJ B",
    name: "Beijer Ref",
    aliases: ["BEIJER REF", "BEIJ-B", "BEIJ_B", "BEIJER"],
    orderbookId: "5278",
  },
  {
    symbol: "ADDT B",
    name: "Addtech",
    aliases: ["ADDTECH", "ADDT-B", "ADDT_B", "ADDTECH AB"],
    orderbookId: "5300",
  },
  {
    symbol: "SWEC B",
    name: "Sweco",
    aliases: ["SWECO", "SWEC-B", "SWEC_B", "SWECO AB"],
    orderbookId: "683",
  },
  {
    symbol: "AAK",
    name: "AAK",
    aliases: ["AAK", "AAK AB", "AAK.ST"],
    orderbookId: "5248",
  },
  {
    symbol: "SAGA B",
    name: "Sagax",
    aliases: ["SAGAX", "SAGA-B", "SAGA_B", "AB SAGAX"],
    orderbookId: "5423",
  },
  {
    symbol: "LATO B",
    name: "Latour",
    aliases: ["LATOUR", "LATO-B", "LATO_B", "INVESTMENT AB LATOUR"],
    orderbookId: "277",
  },
  {
    symbol: "LUND B",
    name: "Lundbergföretagen",
    aliases: ["LUNDBERGFÖRETAGEN", "LUNDBERG", "LUND-B", "LUND_B"],
    orderbookId: "289",
  },
  {
    symbol: "SECU B",
    name: "Securitas",
    aliases: ["SECURITAS", "SECU-B", "SECU_B", "SECURITAS AB"],
    orderbookId: "665",
  },
  {
    symbol: "LOOM B",
    name: "Loomis",
    aliases: ["LOOMIS", "LOOM-B", "LOOM_B", "LOOMIS AB"],
    orderbookId: "5650",
  },
  {
    symbol: "DOM",
    name: "Dometic",
    aliases: ["DOMETIC", "DOMETIC GROUP", "DOM.ST"],
    orderbookId: "579899",
  },
  {
    symbol: "THULE",
    name: "Thule",
    aliases: ["THULE", "THULE GROUP", "THULE.ST"],
    orderbookId: "518334",
  },
  {
    symbol: "BRAV",
    name: "Bravida",
    aliases: ["BRAVIDA", "BRAVIDA HOLDING", "BRAV.ST"],
    orderbookId: "587524",
  },
  {
    symbol: "WALL B",
    name: "Wallenstam",
    aliases: ["WALLENSTAM", "WALL-B", "WALL_B", "WALLENSTAM AB"],
    orderbookId: "715",
  },
  {
    symbol: "WIHL",
    name: "Wihlborgs",
    aliases: ["WIHLBORGS", "WIHLBORGS FASTIGHETER", "WIHL.ST"],
    orderbookId: "5276",
  },
  {
    symbol: "PEAB B",
    name: "Peab",
    aliases: ["PEAB", "PEAB-B", "PEAB_B", "PEAB AB"],
    orderbookId: "626",
  },
  {
    symbol: "BILL",
    name: "Billerud",
    aliases: ["BILLERUD", "BILLERUDKORSNÄS", "BILL.ST"],
    orderbookId: "5302",
  },
  {
    symbol: "HUSQ B",
    name: "Husqvarna",
    aliases: ["HUSQVARNA", "HUSQ-B", "HUSQ_B", "HUSQVARNA AB"],
    orderbookId: "5349",
  },
  {
    symbol: "SOBI",
    name: "Sobi",
    aliases: ["SOBI", "SWEDISH ORPHAN BIOVITRUM", "SOBI.ST"],
    orderbookId: "5380",
  },

  // 🇸🇪 Mid Cap Stockholm
  {
    symbol: "CLAS B",
    name: "Clas Ohlson",
    aliases: ["CLAS OHLSON", "CLAS-B", "CLAS_B", "CLAS"],
    orderbookId: "5245",
  },
  {
    symbol: "BILI A",
    name: "Bilia",
    aliases: ["BILIA", "BILI-A", "BILI_A", "BILIA AB"],
    orderbookId: "148",
  },
  {
    symbol: "BUFAB",
    name: "Bufab",
    aliases: ["BUFAB", "BUFAB AB", "BUFAB.ST"],
    orderbookId: "447231",
  },
  {
    symbol: "MYCR",
    name: "Mycronic",
    aliases: ["MYCRONIC", "MYCR.ST", "MYCRONIC AB"],
    orderbookId: "5295",
  },
  {
    symbol: "NYF",
    name: "Nyfosa",
    aliases: ["NYFOSA", "NYF.ST", "NYFOSA AB"],
    orderbookId: "898574",
  },
  {
    symbol: "PNDX B",
    name: "Pandox",
    aliases: ["PANDOX", "PNDX-B", "PNDX_B", "PANDOX AB"],
    orderbookId: "557161",
  },
  {
    symbol: "LIAB",
    name: "Lindab",
    aliases: ["LINDAB", "LINDAB INTERNATIONAL", "LIAB.ST"],
    orderbookId: "5394",
  },
  {
    symbol: "BIOT",
    name: "Biotage",
    aliases: ["BIOTAGE", "BIOT.ST", "BIOTAGE AB"],
    orderbookId: "5277",
  },
  {
    symbol: "MTRS",
    name: "Munters",
    aliases: ["MUNTERS", "MUNTERS GROUP", "MTRS.ST"],
    orderbookId: "753512",
  },
  {
    symbol: "NOLA B",
    name: "Nolato",
    aliases: ["NOLATO", "NOLA-B", "NOLA_B", "NOLATO AB"],
    orderbookId: "5297",
  },
  {
    symbol: "GRNG",
    name: "Gränges",
    aliases: ["GRÄNGES", "GRANGES", "GRNG.ST", "GRÄNGES AB"],
    orderbookId: "508244",
  },
  {
    symbol: "JM",
    name: "JM",
    aliases: ["JM", "JM AB", "JM.ST"],
    orderbookId: "244",
  },
  {
    symbol: "COOR",
    name: "Coor",
    aliases: ["COOR", "COOR SERVICE MANAGEMENT", "COOR.ST"],
    orderbookId: "557162",
  },
  {
    symbol: "ATT",
    name: "Attendo",
    aliases: ["ATTENDO", "ATT.ST", "ATTENDO AB"],
    orderbookId: "597576",
  },
  {
    symbol: "INWI",
    name: "Inwido",
    aliases: ["INWIDO", "INWI.ST", "INWIDO AB"],
    orderbookId: "504353",
  },
  {
    symbol: "CIBUS",
    name: "Cibus",
    aliases: ["CIBUS", "CIBUS NORDIC", "CIBUS.ST"],
    orderbookId: "833633",
  },
  {
    symbol: "CLA B",
    name: "Cloetta",
    aliases: ["CLOETTA", "CLA-B", "CLA_B", "CLOETTA AB"],
    orderbookId: "5674",
  },
  {
    symbol: "HMS",
    name: "HMS Networks",
    aliases: ["HMS NETWORKS", "HMS", "HMS.ST"],
    orderbookId: "5476",
  },
  {
    symbol: "VBG B",
    name: "VBG Group",
    aliases: ["VBG GROUP", "VBG", "VBG-B", "VBG_B"],
    orderbookId: "708",
  },
  {
    symbol: "DIOS",
    name: "Diös",
    aliases: ["DIÖS", "DIOS", "DIÖS FASTIGHETER", "DIOS.ST"],
    orderbookId: "5347",
  },
  {
    symbol: "BURE",
    name: "Bure",
    aliases: ["BURE", "BURE EQUITY", "BURE.ST"],
    orderbookId: "128",
  },
  {
    symbol: "CRED A",
    name: "Creades",
    aliases: ["CREADES", "CRED-A", "CRED_A", "CREADES AB"],
    orderbookId: "333830",
  },
  {
    symbol: "RATO B",
    name: "Ratos",
    aliases: ["RATOS", "RATO-B", "RATO_B", "RATOS AB"],
    orderbookId: "642",
  },

  // 🇸🇪 Small Cap Stockholm
  {
    symbol: "ELTEL",
    name: "Eltel",
    aliases: ["ELTEL", "ELTEL AB", "ELTEL GROUP", "ELTEL.ST"],
    orderbookId: "534571",
  },
  {
    symbol: "STAR B",
    name: "Starbreeze",
    aliases: ["STARBREEZE", "STAR-B", "STAR_B", "STARBREEZE AB"],
    orderbookId: "5462",
  },
  {
    symbol: "ANOT",
    name: "Anoto",
    aliases: ["ANOTO", "ANOTO GROUP", "ANOT.ST"],
    orderbookId: "20",
  },
  {
    symbol: "BICO",
    name: "BICO Group",
    aliases: ["BICO", "BICO GROUP", "CELLINK", "BICO.ST"],
    orderbookId: "687258",
  },
  {
    symbol: "CANTA",
    name: "Cantargia",
    aliases: ["CANTARGIA", "CANTA.ST", "CANTARGIA AB"],
    orderbookId: "557163",
  },
  {
    symbol: "RAY B",
    name: "RaySearch",
    aliases: ["RAYSEARCH", "RAYSEARCH LABORATORIES", "RAY-B", "RAY_B"],
    orderbookId: "5320",
  },
  {
    symbol: "GREEN",
    name: "Green Landscaping",
    aliases: ["GREEN LANDSCAPING", "GREEN LANDSCAPING GROUP", "GREEN.ST"],
    orderbookId: "847250",
  },
  {
    symbol: "ALLIG",
    name: "Alligator Bioscience",
    aliases: ["ALLIGATOR", "ALLIGATOR BIOSCIENCE", "ALLIG.ST"],
    orderbookId: "687259",
  },
  {
    symbol: "OVZON",
    name: "Ovzon",
    aliases: ["OVZON", "OVZON AB", "OVZON.ST"],
    orderbookId: "857241",
  },
  {
    symbol: "NWG",
    name: "Nordic Waterproofing",
    aliases: ["NORDIC WATERPROOFING", "NWG.ST"],
    orderbookId: "637251",
  },
  {
    symbol: "DEDI",
    name: "Dedicare",
    aliases: ["DEDICARE", "DEDI.ST", "DEDICARE AB"],
    orderbookId: "333831",
  },
  {
    symbol: "PRIC B",
    name: "Pricer",
    aliases: ["PRICER", "PRIC-B", "PRIC_B", "PRICER AB"],
    orderbookId: "637",
  },
  {
    symbol: "PACT",
    name: "Proact",
    aliases: ["PROACT", "PROACT IT", "PROACT IT GROUP", "PACT.ST"],
    orderbookId: "636",
  },
  {
    symbol: "MSON B",
    name: "Midsona",
    aliases: ["MIDSONA", "MSON-B", "MSON_B", "MIDSONA AB"],
    orderbookId: "5535",
  },
  {
    symbol: "KNOW",
    name: "Knowit",
    aliases: ["KNOWIT", "KNOWIT AB", "KNOW.ST"],
    orderbookId: "263",
  },
  {
    symbol: "SENS",
    name: "Sensys Gatso",
    aliases: ["SENSYS GATSO", "SENSYS", "SENS.ST"],
    orderbookId: "5378",
  },
  {
    symbol: "ORTI A",
    name: "Ortivus",
    aliases: ["ORTIVUS", "ORTI-A", "ORTI_A", "ORTIVUS AB"],
    orderbookId: "614",
  },
  {
    symbol: "VIVE",
    name: "Vivesto",
    aliases: ["VIVESTO", "OASMIA", "VIVE.ST"],
    orderbookId: "587525",
  },
  {
    symbol: "SECT B",
    name: "Sectra",
    aliases: ["SECTRA", "SECT-B", "SECT_B", "SECTRA AB"],
    orderbookId: "667",
  },

  // 🇸🇪 First North (Tillväxtmarknad)
  {
    symbol: "KAMBI",
    name: "Kambi",
    aliases: ["KAMBI", "KAMBI GROUP", "KAMBI.ST"],
    orderbookId: "484512",
  },
  {
    symbol: "STORY B",
    name: "Storytel",
    aliases: ["STORYTEL", "STORY-B", "STORY_B", "STORYTEL AB"],
    orderbookId: "587526",
  },
  {
    symbol: "FRACTL",
    name: "Fractal Gaming",
    aliases: ["FRACTAL GAMING", "FRACTAL", "FRACTL.ST"],
    orderbookId: "1187250",
  },
  {
    symbol: "PDX",
    name: "Paradox",
    aliases: ["PARADOX", "PARADOX INTERACTIVE", "PDX.ST"],
    orderbookId: "637252",
  },
  {
    symbol: "SF",
    name: "Stillfront",
    aliases: ["STILLFRONT", "STILLFRONT GROUP", "SF.ST"],
    orderbookId: "607425",
  },
  {
    symbol: "YUBICO",
    name: "Yubico",
    aliases: ["YUBICO", "YUBICO AB", "YUBICO.ST"],
    orderbookId: "1687250",
  },
  {
    symbol: "VIVA",
    name: "Viva Wine",
    aliases: ["VIVA WINE", "VIVA WINE GROUP", "VIVA.ST"],
    orderbookId: "1287250",
  },
  {
    symbol: "CINT",
    name: "Cint",
    aliases: ["CINT", "CINT GROUP", "CINT.ST"],
    orderbookId: "1187251",
  },
  {
    symbol: "FLAT B",
    name: "Flat Capital",
    aliases: ["FLAT CAPITAL", "FLAT-B", "FLAT_B"],
    orderbookId: "1287251",
  },

  // 🇺🇸 US Tech & Mega Caps
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
  { symbol: "CRM", name: "Salesforce Inc.", aliases: ["SALESFORCE", "CRM"] },
  { symbol: "ADBE", name: "Adobe Inc.", aliases: ["ADOBE", "ADBE"] },
  { symbol: "INTC", name: "Intel Corporation", aliases: ["INTEL", "INTC"] },
  { symbol: "QCOM", name: "Qualcomm Inc.", aliases: ["QUALCOMM", "QCOM"] },
  { symbol: "AVGO", name: "Broadcom Inc.", aliases: ["BROADCOM", "AVGO"] },
  { symbol: "UBER", name: "Uber Technologies", aliases: ["UBER"] },
  { symbol: "SNOW", name: "Snowflake Inc.", aliases: ["SNOWFLAKE", "SNOW"] },
  { symbol: "NOW", name: "ServiceNow Inc.", aliases: ["SERVICENOW", "NOW"] },
  { symbol: "ARM", name: "ARM Holdings", aliases: ["ARM", "ARM HOLDINGS"] },

  // 🇺🇸 US Blue Chips & Dow
  { symbol: "JPM", name: "JPMorgan Chase & Co.", aliases: ["JPMORGAN", "JP MORGAN", "JPM"] },
  { symbol: "V", name: "Visa Inc.", aliases: ["VISA", "V"] },
  { symbol: "MA", name: "Mastercard Inc.", aliases: ["MASTERCARD", "MA"] },
  { symbol: "WMT", name: "Walmart Inc.", aliases: ["WALMART", "WMT"] },
  { symbol: "DIS", name: "Walt Disney Co.", aliases: ["DISNEY", "WALT DISNEY", "DIS"] },
  { symbol: "BRK.B", name: "Berkshire Hathaway", aliases: ["BERKSHIRE HATHAWAY", "BERKSHIRE", "BRK.B", "BRK-B"] },
  { symbol: "JNJ", name: "Johnson & Johnson", aliases: ["JOHNSON & JOHNSON", "JNJ"] },
  { symbol: "PG", name: "Procter & Gamble", aliases: ["PROCTER & GAMBLE", "P&G", "PG"] },
  { symbol: "XOM", name: "ExxonMobil", aliases: ["EXXONMOBIL", "EXXON", "XOM"] },
  { symbol: "LLY", name: "Eli Lilly", aliases: ["ELI LILLY", "LILLY", "LLY"] },
  { symbol: "UNH", name: "UnitedHealth", aliases: ["UNITEDHEALTH", "UNH"] },
  { symbol: "KO", name: "Coca-Cola", aliases: ["COCA-COLA", "COCA COLA", "KO"] },
  { symbol: "PEP", name: "PepsiCo", aliases: ["PEPSICO", "PEP"] },
  { symbol: "COST", name: "Costco", aliases: ["COSTCO", "COST"] },
  { symbol: "BA", name: "Boeing", aliases: ["BOEING", "BA"] },
];

/**
 * Check if an article matches a specific stock (by ticker, name, or aliases)
 */
export function matchStockInArticle(
  article: { title: string; description?: string; ticker?: string; author?: string },
  stock: Stock
): boolean {
  const titleUpper = article.title.toUpperCase();
  const descUpper = (article.description || "").toUpperCase();
  const authorUpper = (article.author || "").toUpperCase();
  const combined = `${titleUpper} ${descUpper} ${authorUpper}`;

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

  // 1. Check author if provided (MFN feed)
  if (authorUpper) {
    for (const alias of Array.from(aliasesToCheck)) {
      if (alias.length >= 2 && (authorUpper === alias || authorUpper.includes(alias))) {
        return true;
      }
    }
  }

  // 2. Check article ticker
  if (article.ticker) {
    const cleanTicker = article.ticker.replace(/\.ST$/i, "").toUpperCase();
    if (aliasesToCheck.has(cleanTicker) || aliasesToCheck.has(article.ticker.toUpperCase())) {
      return true;
    }
  }

  // 3. Check headline prefix (e.g. "VOLVO:", "ERICSSON:", "H&M:")
  const prefixMatch = titleUpper.match(/^([A-ZÅÄÖ0-9&.\-\s]{2,20}):/);
  if (prefixMatch) {
    const prefix = prefixMatch[1].trim();
    if (aliasesToCheck.has(prefix)) {
      return true;
    }
  }

  // 4. Word and compound check in title and description (e.g. "Google-avtal", "Nvidias", "Apple-chef")
  for (const alias of Array.from(aliasesToCheck)) {
    if (alias.length < 2) continue;

    if (combined.includes(alias)) {
      return true;
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
  author?: string;
}): Stock | null {
  // Check if article matches any stock in our dictionary
  for (const stock of STOCK_DICTIONARY) {
    if (matchStockInArticle(article, stock)) {
      return { symbol: stock.symbol, name: stock.name };
    }
  }

  // Check author
  if (article.author) {
    const cleanAuthor = article.author.trim();
    if (cleanAuthor.length > 1) {
      return { symbol: cleanAuthor, name: cleanAuthor };
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

