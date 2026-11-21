/**
 * Reference dictionaries used by the mock AI services for text normalization.
 * In production these would be maintained per tenant and augmented by
 * Amazon Bedrock embeddings (see services/aws/integration.ts).
 */

export const ABBREVIATIONS: Record<string, string> = {
  BRG: "BEARING",
  BRGS: "BEARING",
  BEARINGS: "BEARING",
  DGBB: "DEEP GROOVE BALL BEARING",
  SOL: "SOLENOID",
  VLV: "VALVE",
  CONT: "CONTACTOR",
  MTR: "MOTOR",
  ELEM: "ELEMENT",
  HYD: "HYDRAULIC",
  PROX: "PROXIMITY",
  SWG: "SPIRAL WOUND GASKET",
  ORING: "O RING",
  MIC: "MICRON",
  VITON: "FKM",
  GA: "GAUGE",
  GAUGES: "GAUGE",
  SS: "STAINLESS",
  CPLG: "COUPLING",
  FLT: "FILTER",
  ELEC: "ELECTRIC",
  "3PH": "3 PHASE",
};

export const STOPWORDS = new Set(["MM", "THE", "FOR", "AND", "WITH", "OF", "TYPE", "X", "NO", "PCS", "EA"]);

export const MANUFACTURER_ALIASES: Record<string, string[]> = {
  SKF: ["SKF", "S.K.F.", "S.K.F", "SKF AB", "SKF BEARINGS", "SKF BEARINGS LTD", "SKF BEARING"],
  "FAG (Schaeffler)": ["FAG", "SCHAEFFLER", "FAG BEARINGS", "FAG (SCHAEFFLER)", "SCHAEFFLER FAG"],
  NSK: ["NSK", "NSK LTD", "N.S.K."],
  NTN: ["NTN", "NTN-SNR", "NTN SNR", "NTN CORP"],
  "Schneider Electric": ["SCHNEIDER", "SCHNEIDER ELEC.", "SCHNEIDER ELECTRIC", "TELEMECANIQUE", "SCHNEIDER ELEC"],
  Siemens: ["SIEMENS", "SIEMENS AG", "SIEMENS LTD"],
  ABB: ["ABB", "ABB LTD", "A.B.B.", "ABB MOTORS"],
  WEG: ["WEG", "WEG MOTORS", "WEG ELECTRIC"],
  TECO: ["TECO", "TECO WESTINGHOUSE"],
  Gates: ["GATES", "GATES CORP", "GATES INDUSTRIAL"],
  Optibelt: ["OPTIBELT", "OPTI BELT", "OPTIBELT GMBH"],
  Fenner: ["FENNER", "FENNER DRIVES"],
  Continental: ["CONTINENTAL", "CONTITECH", "CONTINENTAL CONTITECH"],
  "Parker Hannifin": ["PARKER", "PARKER HANNIFIN", "PARKER-HANNIFIN"],
  Trelleborg: ["TRELLEBORG", "TRELLEBORG SEALING"],
  Hydac: ["HYDAC", "HYDAC INTL"],
  Pall: ["PALL", "PALL CORP", "PALL CORPORATION"],
  WIKA: ["WIKA", "WIKA INSTRUMENTS", "WIKA ALEXANDER WIEGAND"],
  Ashcroft: ["ASHCROFT", "ASHCROFT INC"],
  IFM: ["IFM", "IFM ELECTRONIC", "I.F.M."],
  Sick: ["SICK", "SICK AG"],
  "Pepperl+Fuchs": ["PEPPERL+FUCHS", "P+F", "PEPPERL FUCHS"],
  Omron: ["OMRON", "OMRON CORP"],
  ASCO: ["ASCO", "EMERSON ASCO", "ASCO VALVE"],
  Bürkert: ["BURKERT", "BÜRKERT", "BUERKERT"],
  Flexitallic: ["FLEXITALLIC", "FLEXITALLIC LTD"],
  Lamons: ["LAMONS", "LAMONS GASKET"],
  Garlock: ["GARLOCK", "GARLOCK SEALING"],
  Lovejoy: ["LOVEJOY", "LOVE JOY", "TIMKEN LOVEJOY"],
  Mersen: ["MERSEN", "FERRAZ SHAWMUT", "MERSEN (FERRAZ)"],
  Unbrako: ["UNBRAKO"],
  "Generic / Unbranded": ["GENERIC", "UNBRANDED", "N/A", "LOCAL", "-"],
};

const MFR_LOOKUP: Map<string, string> = new Map();
for (const [canonical, aliases] of Object.entries(MANUFACTURER_ALIASES)) {
  for (const a of aliases) MFR_LOOKUP.set(a.toUpperCase(), canonical);
}

export function canonicalManufacturer(raw: string): string {
  const key = raw.trim().toUpperCase();
  if (!key) return "";
  return MFR_LOOKUP.get(key) ?? raw.trim();
}

export function isKnownManufacturerAlias(raw: string): boolean {
  return MFR_LOOKUP.has(raw.trim().toUpperCase());
}

export const UOM_ALIASES: Record<string, string[]> = {
  EA: ["EA", "EACH", "PC", "PCS", "PIECE", "NO", "NO.", "NOS", "UNIT", "UN"],
  M: ["M", "MTR", "METER", "METRE", "MTRS"],
  "BOX/10": ["BOX/10", "BOX10", "BX/10", "BOX OF 10"],
  "BOX/100": ["BOX/100", "BOX100", "BX/100", "BOX OF 100"],
  KG: ["KG", "KGS", "KILO"],
  SET: ["SET", "SETS", "KIT"],
  L: ["L", "LTR", "LITRE", "LITER"],
};

export const UOM_LABELS: Record<string, string> = {
  EA: "Each",
  M: "Metre",
  "BOX/10": "Box of 10",
  "BOX/100": "Box of 100",
  KG: "Kilogram",
  SET: "Set",
  L: "Litre",
};

const UOM_LOOKUP: Map<string, string> = new Map();
for (const [canonical, aliases] of Object.entries(UOM_ALIASES)) {
  for (const a of aliases) UOM_LOOKUP.set(a.toUpperCase(), canonical);
}

export function canonicalUom(raw: string): string {
  const key = raw.trim().toUpperCase();
  return UOM_LOOKUP.get(key) ?? key;
}

/** Normalizes a free-text description into comparable tokens. */
export function normalizeText(raw: string): string {
  let s = raw.toUpperCase().replace(/×/g, "X").replace(/[’'`]/g, "");
  s = s.replace(/O[\s-]?RING/g, "ORING");
  s = s.replace(/V[\s-]BELT/g, "VBELT");
  s = s.replace(/(\d)\s*U\b/g, "$1 MICRON");
  s = s.replace(/(\d{3,})([A-Z])/g, "$1 $2");
  s = s.replace(/([A-Z]{2,})(\d{3,})/g, "$1 $2");
  s = s.replace(/(\d)X(\d)/g, "$1 X $2");
  s = s.replace(/[^A-Z0-9/.+]+/g, " ");
  return s
    .split(" ")
    .filter(Boolean)
    .map((t) => ABBREVIATIONS[t] ?? t)
    .join(" ");
}

export function tokenize(raw: string): string[] {
  return normalizeText(raw)
    .split(" ")
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t && !STOPWORDS.has(t));
}

export function normalizePartNumber(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isInternalCode(pn: string): boolean {
  return /^(ST|INT|MAT|SP)-?\d+/i.test(pn.trim());
}
