import type {
  Activity,
  AuditEntry,
  ForecastItem,
  ImportJob,
  InventoryRecord,
  MatchCandidate,
  NormalizationProposal,
  RecordSource,
  ReviewStatus,
  StandardPart,
} from "@/types";
import { DEMO_TODAY, PART_TEMPLATES, WAREHOUSES, type PartTemplate } from "./catalogue";
import { canonicalManufacturer, canonicalUom, isInternalCode, MANUFACTURER_ALIASES, UOM_LABELS } from "@/services/ai/dictionaries";
import { matchingProvider } from "@/services/ai/matching";

// ---------- deterministic RNG ----------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rnd = mulberry32(20261121);
const ri = (a: number, b: number) => Math.floor(rnd() * (b - a + 1)) + a;
const choice = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const chance = (p: number) => rnd() < p;
const today = new Date(DEMO_TODAY).getTime();
const daysAgo = (d: number, h = 0) => new Date(today - d * 86400000 - h * 3600000).toISOString();

export const TEAM = ["Adaeze Okafor", "Tunde Bakare", "Halima Yusuf", "Kwame Mensah", "Chinedu Eze"];
const SOURCES: RecordSource[] = ["ERP export", "ERP export", "CMMS", "Spreadsheet", "Spreadsheet", "Supplier catalogue", "Purchase record", "Manual entry"];

function titleCase(s: string) {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function messyManufacturer(canonical: string): string {
  if (chance(0.58)) return canonical;
  const aliases = MANUFACTURER_ALIASES[canonical] ?? [canonical];
  const a = choice(aliases);
  return chance(0.5) ? a : titleCase(a);
}

function messyPartNumber(pn: string): string {
  const r = rnd();
  if (r < 0.5) return pn;
  if (r < 0.63) return pn.toLowerCase();
  if (r < 0.74) return pn.includes("-") ? pn.replace(/-/g, " ") : pn.replace(/(\d{3,})([A-Z])/, "$1 $2");
  if (r < 0.92) return `ST-${ri(10000, 99999)}`;
  return "";
}

// ---------- generation ----------
export interface GeneratedData {
  standardParts: StandardPart[];
  records: InventoryRecord[];
  candidates: MatchCandidate[];
  proposals: NormalizationProposal[];
  forecastItems: ForecastItem[];
  activities: Activity[];
  importJobs: ImportJob[];
  audit: AuditEntry[];
}

export function generateDemoData(): GeneratedData {
  rnd = mulberry32(20261121);
  const records: InventoryRecord[] = [];
  const byTemplate = new Map<string, InventoryRecord[]>();
  const templateOf = new Map<string, PartTemplate>();
  const mpnOf = new Map<string, [string, string]>();
  let seq = 100000;

  for (const t of PART_TEMPLATES) {
    const n = t.longTail ? (chance(0.82) ? 1 : 2) : choice([1, 2, 2, 3, 3, 4]);
    const whs = [...WAREHOUSES].sort(() => rnd() - 0.5).slice(0, n);
    const group: InventoryRecord[] = [];
    whs.forEach((wh, idx) => {
      const mpn = idx === 0 || chance(0.5) ? t.mpns[0] : choice(t.mpns);
      const description = idx === 0 && chance(0.45) ? t.name : choice(t.variants);
      const uom = t.uomVariants ? choice(t.uomVariants) : choice(["EA", "EA", "EA", "EACH", "PCS", "PC", "No."]);
      const boxed = uom.startsWith("BOX");
      let quantity = chance(0.14) ? 0 : ri(1, Math.ceil(t.qtyScale * 1.5));
      if (boxed) quantity = Math.max(1, Math.round(quantity / (uom === "BOX/100" ? 100 : 10)));
      const reserved = chance(0.4) ? ri(0, Math.max(0, Math.min(quantity, Math.ceil(t.qtyScale / 4)))) : 0;
      const priceMult = uom === "BOX/100" ? 100 : boxed ? 10 : 1;
      const rec: InventoryRecord = {
        id: `INV-${seq++}`,
        partNumber: messyPartNumber(mpn[1]),
        description,
        manufacturer: messyManufacturer(mpn[0]),
        equipmentRef: chance(0.75) ? choice(t.equipment) : "",
        category: t.category,
        uom,
        quantity,
        reserved,
        warehouseId: wh.id,
        supplier: choice(t.suppliers),
        unitPrice: Number((t.basePrice * (0.85 + rnd() * 0.4) * priceMult).toFixed(2)),
        lastUpdated: daysAgo(ri(0, 150), ri(0, 23)),
        source: choice(SOURCES),
        standardPartId: t.id,
        mappingConfidence: 0,
        mappingStatus: "ai-suggested",
      };
      // AI mapping to catalogue master
      const res = matchingProvider.compare(rec, {
        partNumber: mpn[1],
        description: t.name,
        manufacturer: mpn[0],
        equipmentRef: rec.equipmentRef,
        category: t.category,
        uom: t.uom,
      });
      rec.mappingConfidence = Number(res.score.toFixed(3));
      if (res.score >= 0.82) rec.mappingStatus = chance(t.longTail ? 0.85 : 0.5) ? "verified" : "ai-suggested";
      else if (res.score >= 0.64) rec.mappingStatus = "ai-suggested";
      else {
        rec.mappingStatus = "unmapped";
        rec.standardPartId = null;
      }
      records.push(rec);
      group.push(rec);
      templateOf.set(rec.id, t);
      mpnOf.set(rec.id, mpn);
    });
    byTemplate.set(t.id, group);
  }

  // Vague legacy records that cannot be mapped without human input
  const VAGUE: [string, string, string, string][] = [
    ["Bearing for pump P-104", "Bearings", "EA", "P-104 Process water pump"],
    ["MISC SPARE - SEE DRAWING 44-118", "Uncategorised", "EA", ""],
    ["Seal kit", "Seals & Gaskets", "SET", "P-221 Boiler feed pump"],
    ["Belt (old stock)", "Power Transmission", "EA", ""],
    ["Electrical spares box", "Electrical", "BOX", "MCC-3 Motor control centre"],
    ["Filter - compressor", "Filtration", "EA", "CMP-02 Air compressor"],
    ["Gasket various", "Seals & Gaskets", "LOT", ""],
    ["Motor spare (rewound)", "Rotating Equipment", "EA", "FAN-12 ID fan"],
    ["Valve repair kit 2in", "Valves", "KIT", "TK-04 CIP tank"],
    ["Sensor - filler infeed", "Instrumentation", "EA", "FIL-01 Filler"],
    ["Coupling insert red", "Power Transmission", "EA", "CV-201 Conveyor drive"],
    ["Fuse", "Electrical", "PCS", ""],
    ["O-rings assorted", "Seals & Gaskets", "BOX", ""],
    ["Bearing housing unit", "Bearings", "EA", "CV-201 Conveyor drive"],
    ["Spare contactor (unknown rating)", "Electrical", "EA", "DB-12 Distribution board"],
    ["Hose assy hydraulic", "Hydraulics", "EA", "HPU-01 Press hydraulic unit"],
    ["Pressure switch", "Instrumentation", "EA", "CMP-02 Air compressor"],
    ["Wear plate", "Uncategorised", "EA", "PAL-01 Palletiser"],
  ];
  VAGUE.forEach(([desc, cat, uom, eq], i) => {
    const rec: InventoryRecord = {
      id: `INV-${seq++}`,
      partNumber: chance(0.6) ? `ST-${ri(10000, 99999)}` : "",
      description: desc,
      manufacturer: chance(0.5) ? "" : "Generic",
      equipmentRef: eq,
      category: cat,
      uom,
      quantity: ri(0, 12),
      reserved: 0,
      warehouseId: WAREHOUSES[i % WAREHOUSES.length].id,
      supplier: "",
      unitPrice: Number((5 + rnd() * 120).toFixed(2)),
      lastUpdated: daysAgo(ri(30, 400)),
      source: choice(["Spreadsheet", "Manual entry", "CMMS"] as RecordSource[]),
      standardPartId: null,
      mappingConfidence: Number((0.1 + rnd() * 0.3).toFixed(3)),
      mappingStatus: "unmapped",
    };
    records.push(rec);
  });

  const standardParts: StandardPart[] = PART_TEMPLATES.map((t) => {
    const recs = byTemplate.get(t.id) ?? [];
    return {
      id: t.id,
      name: t.name,
      family: t.family,
      category: t.category,
      manufacturerPartNumbers: t.mpns.map(([m, p]) => `${m}: ${p}`),
      specs: t.specs,
      uom: t.uom,
      aliases: Array.from(new Set(recs.map((r) => r.description).filter((d) => d !== t.name))),
    };
  });

  // ---------- candidate pairs ----------
  const pairs: [InventoryRecord, InventoryRecord][] = [];
  for (const group of byTemplate.values()) {
    for (let i = 1; i < group.length; i++) pairs.push([group[0], group[i]]);
  }
  const firstOf = (id: string) => byTemplate.get(id)?.[0];
  const nearMiss = (a: string, b: string, p: number) => {
    const ra = firstOf(a);
    const rb = firstOf(b);
    if (ra && rb && ra.warehouseId !== rb.warehouseId && chance(p)) pairs.push([ra, rb]);
  };
  for (const t of PART_TEMPLATES) {
    if (t.id.startsWith("SP-BRG-") && t.id.endsWith("-2RS")) nearMiss(t.id, t.id.replace("-2RS", "-ZZ"), 0.55);
    if (t.id.startsWith("SP-CON-") && t.id.endsWith("230VAC")) nearMiss(t.id, t.id.replace("230VAC", "24VDC"), 0.6);
    if (t.id.startsWith("SP-SOL-") && t.id.endsWith("24VDC")) nearMiss(t.id, t.id.replace("24VDC", "230VAC"), 0.7);
    if (t.id.startsWith("SP-ORG-") && t.id.endsWith("NBR")) nearMiss(t.id, t.id.replace("NBR", "FKM"), 0.6);
    if (t.id.startsWith("SP-PRX-") && t.id.endsWith("PNP")) nearMiss(t.id, t.id.replace("PNP", "NPN"), 0.8);
    if (t.id.startsWith("SP-BLT-SPA")) nearMiss(t.id, t.id.replace("SPA", "SPB"), 0.25);
    if (t.id.startsWith("SP-GSK-") && t.id.endsWith("CL150")) nearMiss(t.id, t.id.replace("CL150", "CL300"), 0.5);
  }
  const kws = PART_TEMPLATES.filter((t) => t.id.startsWith("SP-MTR-"));
  for (let i = 0; i < kws.length - 1; i++) nearMiss(kws[i].id, kws[i + 1].id, 0.5);
  // A few unrelated pairs that a naive text matcher might surface
  nearMiss("SP-FUS-NH00-63A", "SP-CON-65A-230VAC", 1);
  nearMiss("SP-GAU-0-10BAR", "SP-FLT-10U-160", 1);
  nearMiss("SP-BRG-6205-2RS", "SP-BRG-6305-2RS", 1);

  const candidates: MatchCandidate[] = [];
  const audit: AuditEntry[] = [];
  let cseq = 1;
  for (const [a, b] of pairs) {
    const res = matchingProvider.compare(a, b);
    const c: MatchCandidate = {
      id: `MC-${String(cseq++).padStart(5, "0")}`,
      recordAId: a.id,
      recordBId: b.id,
      score: Number(res.score.toFixed(3)),
      status: res.status,
      matching: res.matching,
      conflicting: res.conflicting,
      recommendedAction: res.recommendedAction,
      reviewStatus: "pending",
      detectedAt: daysAgo(ri(0, 60), ri(0, 23)),
    };
    if (chance(0.34)) {
      let rs: ReviewStatus = "pending";
      let note = "";
      const r = rnd();
      if (c.status === "high") {
        rs = r < 0.85 ? "approved" : "flagged";
        note = rs === "approved" ? "Part number and datasheet confirmed. Linked as duplicate record — both records retained." : "Stock counts disagree; asked stores to recount.";
        if (rs === "approved") c.relationship = "duplicate-record";
      } else if (c.status === "possible") {
        rs = r < 0.35 ? "approved" : r < 0.65 ? "rejected" : "flagged";
        if (rs === "approved") {
          const crossMfr = c.conflicting.some((x) => x.attribute === "Manufacturer");
          c.relationship = crossMfr ? "verified-equivalent" : "duplicate-record";
          note = crossMfr ? "Reliability engineering confirmed equivalence against both datasheets (ref ENG-EQ-0" + ri(100, 999) + ")." : "Same item, inconsistent description. Linked.";
        } else note = rs === "rejected" ? "Different application — not the same part." : "Escalated to maintenance engineering for compatibility check.";
      } else if (c.status === "conflict") {
        rs = r < 0.7 ? "rejected" : "flagged";
        note = rs === "rejected" ? "Specifications differ. Distinct parts." : "Possible data-entry error on spec — flagged for correction.";
      } else {
        rs = "rejected";
        note = "Unrelated parts.";
      }
      c.reviewStatus = rs;
      c.reviewer = choice(TEAM.slice(1));
      c.reviewedAt = daysAgo(ri(0, 80), ri(0, 10));
      c.note = note;
      audit.push({
        id: `AUD-${audit.length + 1}`,
        ts: c.reviewedAt,
        user: c.reviewer,
        action: rs === "approved" ? "Approved match" : rs === "rejected" ? "Rejected match" : "Flagged match",
        entity: c.id,
        before: "pending",
        after: rs,
        note,
      });
    }
    candidates.push(c);
  }

  // ---------- normalization proposals ----------
  const proposals: NormalizationProposal[] = [];
  let pseq = 1;
  const pushP = (p: Omit<NormalizationProposal, "id" | "status">) => {
    const status = chance(0.18) ? (chance(0.8) ? "accepted" : "rejected") : "pending";
    proposals.push({ ...p, id: `NP-${String(pseq++).padStart(4, "0")}`, status });
    if (status !== "pending") {
      const user = choice(TEAM.slice(1));
      audit.push({
        id: `AUD-${audit.length + 1}`,
        ts: daysAgo(ri(1, 70), ri(0, 10)),
        user,
        action: status === "accepted" ? "Accepted normalization" : "Rejected normalization",
        entity: p.recordId,
        field: String(p.field),
        before: p.current,
        after: status === "accepted" ? p.proposed : p.current,
      });
    }
  };
  for (const r of records) {
    const t = templateOf.get(r.id);
    const mpn = mpnOf.get(r.id);
    if (!t || !mpn) continue;
    if (r.standardPartId && r.description !== t.name && chance(0.3)) {
      pushP({
        type: "description",
        recordId: r.id,
        field: "description",
        current: r.description,
        proposed: t.name,
        confidence: r.mappingConfidence,
        rationale: "Align with catalogue master naming convention: NOUN, MODIFIER, key attributes.",
      });
    }
    const cu = canonicalUom(r.uom);
    if (cu !== r.uom && chance(0.35)) {
      pushP({
        type: "uom",
        recordId: r.id,
        field: "uom",
        current: r.uom,
        proposed: cu,
        confidence: 0.98,
        rationale: `"${r.uom}" is a known alias of ${cu} (${UOM_LABELS[cu] ?? cu}).`,
      });
    }
    const cm = canonicalManufacturer(r.manufacturer);
    if (cm !== r.manufacturer && chance(0.55)) {
      pushP({
        type: "manufacturer",
        recordId: r.id,
        field: "manufacturer",
        current: r.manufacturer,
        proposed: cm,
        confidence: 0.95,
        rationale: `"${r.manufacturer}" matches a registered alias of ${cm}.`,
      });
    }
    if (r.partNumber && !isInternalCode(r.partNumber) && r.partNumber !== mpn[1] && chance(0.6)) {
      pushP({
        type: "format",
        recordId: r.id,
        field: "partNumber",
        current: r.partNumber,
        proposed: mpn[1],
        confidence: 0.9,
        rationale: "Formatting differs from the manufacturer's published part-number convention (case, spacing or separators).",
      });
    }
  }

  // ---------- forecast items ----------
  const forecastItems: ForecastItem[] = [];
  const fcTemplates = PART_TEMPLATES.filter((t) => !t.longTail && byTemplate.get(t.id)?.length);
  const fcPick = fcTemplates.filter((_, i) => i % 6 === 0).slice(0, 30);
  const leadByCat: Record<string, [number, number]> = {
    Bearings: [14, 45],
    "Power Transmission": [10, 30],
    "Seals & Gaskets": [21, 42],
    Electrical: [28, 70],
    "Rotating Equipment": [60, 120],
    Valves: [35, 75],
    Instrumentation: [21, 56],
    Filtration: [14, 35],
  };
  fcPick.forEach((t, i) => {
    const rec = byTemplate.get(t.id)![0];
    const pattern = (["intermittent", "smooth", "lumpy", "intermittent", "erratic", "smooth"] as const)[i % 6];
    const m = Math.max(1, Math.round(t.qtyScale / 4));
    const history = Array.from({ length: 24 }, () => {
      switch (pattern) {
        case "smooth":
          return Math.max(0, Math.round(m + (rnd() - 0.5) * m * 0.6));
        case "intermittent":
          return chance(0.28) ? ri(1, 3) : 0;
        case "lumpy":
          return chance(0.22) ? ri(1, Math.max(4, m * 3)) : 0;
        default:
          return chance(0.85) ? ri(0, m * 3) : 0;
      }
    });
    const avg = history.reduce((a, b) => a + b, 0) / 24;
    const [lo, hi] = leadByCat[t.category] ?? [21, 45];
    const lowStock = i % 3 === 0;
    const onHand = lowStock ? ri(0, Math.ceil(avg)) : Math.round(avg * (2 + rnd() * 6)) + ri(0, 3);
    forecastItems.push({
      id: `FC-${String(i + 1).padStart(3, "0")}`,
      standardPartId: t.id,
      name: t.name,
      category: t.category,
      warehouseId: rec.warehouseId,
      history,
      onHand,
      reserved: Math.min(onHand, chance(0.4) ? ri(0, 2) : 0),
      onOrder: chance(0.2) ? ri(1, Math.max(2, Math.round(avg * 2))) : 0,
      leadTimeDays: ri(lo, hi),
      unitPrice: Number(t.basePrice.toFixed(2)),
      moq: t.category === "Seals & Gaskets" ? 5 : t.category === "Rotating Equipment" ? 1 : choice([1, 2, 5]),
      criticality: choice(["A", "B", "B", "C"] as const),
      decision: "pending",
    });
  });

  // ---------- history ----------
  const importJobs: ImportJob[] = [
    { id: "IMP-0006", fileName: "apapa_stores_extract_nov.csv", type: "inventory-csv", rows: 412, imported: 405, errors: 7, warnings: 21, duplicates: 38, status: "completed-with-errors", createdAt: daysAgo(2, 3), user: "Tunde Bakare" },
    { id: "IMP-0005", fileName: "SKF_price_list_2026.xlsx", type: "supplier-catalogue", rows: 1280, imported: 1280, errors: 0, warnings: 12, duplicates: 64, status: "completed", createdAt: daysAgo(6, 1), user: "Halima Yusuf" },
    { id: "IMP-0004", fileName: "cmms_spares_master.xlsx", type: "excel", rows: 2214, imported: 2190, errors: 24, warnings: 88, duplicates: 141, status: "completed-with-errors", createdAt: daysAgo(13, 5), user: "Adaeze Okafor" },
    { id: "IMP-0003", fileName: "PO_history_Q3.csv", type: "purchase-records", rows: 956, imported: 956, errors: 0, warnings: 4, duplicates: 0, status: "completed", createdAt: daysAgo(21, 2), user: "Kwame Mensah" },
    { id: "IMP-0002", fileName: "electrical_catalogue_v3.csv", type: "parts-catalogue", rows: 318, imported: 0, errors: 318, warnings: 0, duplicates: 0, status: "failed", createdAt: daysAgo(30, 6), user: "Chinedu Eze" },
    { id: "IMP-0001", fileName: "tema_satellite_stock.csv", type: "inventory-csv", rows: 187, imported: 184, errors: 3, warnings: 9, duplicates: 17, status: "completed-with-errors", createdAt: daysAgo(44, 4), user: "Adaeze Okafor" },
  ];

  const activities: Activity[] = [
    { id: "ACT-12", ts: daysAgo(0, 1), user: "Matching engine", type: "match", message: "Nightly matching run compared 1,284 record pairs and surfaced 23 new suggestions (mock)." },
    { id: "ACT-11", ts: daysAgo(0, 3), user: "Halima Yusuf", type: "review", message: "Approved 6205-2RSH ↔ 6205 2RS bearing as a duplicate record (Apapa ↔ Ikeja)." },
    { id: "ACT-10", ts: daysAgo(0, 5), user: "Tunde Bakare", type: "review", message: "Flagged contactor LC1D32P7 vs LC1D32BD — coil voltage conflict sent to engineering." },
    { id: "ACT-09", ts: daysAgo(1, 2), user: "Kwame Mensah", type: "normalize", message: "Accepted 14 manufacturer-name corrections (S.K.F. → SKF, Telemecanique → Schneider Electric)." },
    { id: "ACT-08", ts: daysAgo(2, 3), user: "Tunde Bakare", type: "import", message: "Imported apapa_stores_extract_nov.csv: 405 rows, 38 duplicate warnings, 7 errors." },
    { id: "ACT-07", ts: daysAgo(3, 1), user: "Adaeze Okafor", type: "forecast", message: "Deferred reorder for SPB1600 belts — 11 units located at Warri Turnaround Cage." },
    { id: "ACT-06", ts: daysAgo(4, 6), user: "Chinedu Eze", type: "report", message: "Exported Duplicate catalogue records report (PDF)." },
    { id: "ACT-05", ts: daysAgo(6, 1), user: "Halima Yusuf", type: "import", message: "Imported SKF_price_list_2026.xlsx supplier catalogue: 1,280 rows." },
    { id: "ACT-04", ts: daysAgo(8, 4), user: "Kwame Mensah", type: "review", message: "Rejected O-ring 50x3 NBR ↔ 50x3 FKM — material conflict." },
    { id: "ACT-03", ts: daysAgo(10, 2), user: "Adaeze Okafor", type: "normalize", message: "Standardized 32 bearing descriptions to catalogue master convention." },
  ];

  return { standardParts, records, candidates, proposals, forecastItems, activities, importJobs, audit: audit.sort((a, b) => b.ts.localeCompare(a.ts)) };
}
