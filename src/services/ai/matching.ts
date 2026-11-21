/**
 * Catalogue matching service.
 *
 * `CatalogueMatchingProvider` is the abstraction the UI depends on.
 * `MockBedrockMatcher` is a deterministic, rule-based stand-in used for the
 * demonstration. A production provider would call a Lambda that uses
 * Amazon Bedrock embeddings + an LLM for attribute reasoning.
 *
 * IMPORTANT PRODUCT RULE: a match result is only a *suggestion*. Similar
 * descriptions never establish technical compatibility. Records are never
 * merged and parts are never declared interchangeable without a human
 * reviewer's verification.
 */
import type { AttributeComparison, InventoryRecord, MatchStatus } from "@/types";
import {
  canonicalManufacturer,
  canonicalUom,
  isInternalCode,
  normalizePartNumber,
  tokenize,
} from "./dictionaries";
import { CRITICAL_SPECS, extractSpecs } from "./specExtraction";

export type ComparableRecord = Pick<
  InventoryRecord,
  "partNumber" | "description" | "manufacturer" | "equipmentRef" | "category" | "uom"
>;

export interface MatchResult {
  score: number;
  status: MatchStatus;
  matching: AttributeComparison[];
  conflicting: AttributeComparison[];
  recommendedAction: string;
  components: { label: string; value: number | null; weight: number }[];
}

export interface CatalogueMatchingProvider {
  readonly id: string;
  readonly label: string;
  readonly isMock: boolean;
  compare(a: ComparableRecord, b: ComparableRecord): MatchResult;
}

function dice(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return (2 * inter) / (A.size + B.size);
}

function coreDesignation(pn: string): string | null {
  const m = pn.toUpperCase().match(/\d{3,}/);
  return m ? m[0] : null;
}

export function partNumberSimilarity(a: string, b: string): number | null {
  if (!a.trim() || !b.trim() || isInternalCode(a) || isInternalCode(b)) return null;
  const na = normalizePartNumber(a);
  const nb = normalizePartNumber(b);
  if (na === nb) return 1;
  const ca = coreDesignation(a);
  const cb = coreDesignation(b);
  if (ca && cb && ca === cb) return 0.6;
  return 0;
}

export function descriptionSimilarity(a: string, b: string): number {
  return dice(tokenize(a), tokenize(b));
}

function recommend(status: MatchStatus, conflicts: AttributeComparison[]): string {
  const critical = conflicts.filter((c) => c.severity === "critical").map((c) => c.attribute.toLowerCase());
  switch (status) {
    case "high":
      return "Likely the same catalogue item. Verify part number and datasheet, then link as a duplicate record. Do not merge automatically.";
    case "possible":
      return conflicts.some((c) => c.attribute === "Manufacturer")
        ? "Different manufacturers with similar specifications. Equivalence must be confirmed by engineering before any substitution."
        : "Partial match. Review specifications and datasheets before linking these records.";
    case "conflict":
      return `Do not link. Resolve conflicting ${critical.join(", ") || "attributes"} with engineering or the stores supervisor.`;
    default:
      return "Treat as distinct parts. No relationship suggested.";
  }
}

export class MockBedrockMatcher implements CatalogueMatchingProvider {
  readonly id = "mock-bedrock-matcher";
  readonly label = "Mock semantic matcher (simulated Amazon Bedrock)";
  readonly isMock = true;

  compare(a: ComparableRecord, b: ComparableRecord): MatchResult {
    const matching: AttributeComparison[] = [];
    const conflicting: AttributeComparison[] = [];

    // Description
    const desc = descriptionSimilarity(a.description, b.description);
    if (desc >= 0.5) matching.push({ attribute: "Description", a: a.description, b: b.description, note: `${Math.round(desc * 100)}% token overlap` });

    // Part number
    const pn = partNumberSimilarity(a.partNumber, b.partNumber);
    if (pn === 1) matching.push({ attribute: "Part number", a: a.partNumber, b: b.partNumber });
    else if (pn === 0.6) matching.push({ attribute: "Part number (core)", a: a.partNumber, b: b.partNumber, note: "Same base designation, different suffix" });
    else if (pn === 0) conflicting.push({ attribute: "Part number", a: a.partNumber, b: b.partNumber, severity: "review" });

    // Technical specifications
    const sa = extractSpecs(`${a.description} ${a.partNumber}`);
    const sb = extractSpecs(`${b.description} ${b.partNumber}`);
    let common = 0;
    let agreed = 0;
    for (const key of Object.keys(sa)) {
      if (!(key in sb)) continue;
      common++;
      if (sa[key] === sb[key]) {
        agreed++;
        matching.push({ attribute: key, a: sa[key], b: sb[key] });
      } else {
        conflicting.push({
          attribute: key,
          a: sa[key],
          b: sb[key],
          severity: CRITICAL_SPECS.has(key) ? "critical" : "review",
        });
      }
    }
    const spec = common ? agreed / common : null;

    // Manufacturer
    let mfr: number | null = null;
    const ma = canonicalManufacturer(a.manufacturer);
    const mb = canonicalManufacturer(b.manufacturer);
    if (ma && mb && ma !== "Generic / Unbranded" && mb !== "Generic / Unbranded") {
      if (ma === mb) {
        mfr = 1;
        matching.push({ attribute: "Manufacturer", a: a.manufacturer, b: b.manufacturer, note: a.manufacturer !== b.manufacturer ? `Both resolve to ${ma}` : undefined });
      } else {
        mfr = 0;
        conflicting.push({
          attribute: "Manufacturer",
          a: a.manufacturer,
          b: b.manufacturer,
          severity: "review",
          note: "Different manufacturers — interchangeability requires engineering verification",
        });
      }
    }

    // Unit of measure
    const ua = canonicalUom(a.uom);
    const ub = canonicalUom(b.uom);
    const uom = ua === ub ? 1 : 0;
    if (uom) matching.push({ attribute: "Unit of measure", a: a.uom, b: b.uom });
    else conflicting.push({ attribute: "Unit of measure", a: a.uom, b: b.uom, severity: "review", note: "Quantities need unit conversion before comparison" });

    // Equipment & category (supporting evidence only)
    if (a.equipmentRef && a.equipmentRef === b.equipmentRef) matching.push({ attribute: "Equipment reference", a: a.equipmentRef, b: b.equipmentRef });
    if (a.category === b.category) matching.push({ attribute: "Category", a: a.category, b: b.category });

    const components = [
      { label: "Description", value: desc, weight: 0.35 },
      { label: "Part number", value: pn, weight: 0.2 },
      { label: "Specifications", value: spec, weight: 0.3 },
      { label: "Manufacturer", value: mfr, weight: 0.1 },
      { label: "Unit of measure", value: uom, weight: 0.05 },
    ];
    let wsum = 0;
    let total = 0;
    for (const c of components) {
      if (c.value === null) continue;
      wsum += c.weight;
      total += c.weight * c.value;
    }
    const criticalCount = conflicting.filter((c) => c.severity === "critical").length;
    let score = wsum ? total / wsum : 0;
    score -= criticalCount * 0.12;
    if (a.category !== b.category) score -= 0.1;
    score = Math.max(0.02, Math.min(0.99, score));

    let status: MatchStatus;
    if (criticalCount > 0 && score >= 0.4) status = "conflict";
    // Cross-manufacturer pairs are never "high confidence": equivalence needs engineering sign-off.
    else if (score >= 0.82 && mfr !== 0) status = "high";
    else if (score >= 0.6) status = "possible";
    else status = "none";

    return { score, status, matching, conflicting, recommendedAction: recommend(status, conflicting), components };
  }
}

export const matchingProvider: CatalogueMatchingProvider = new MockBedrockMatcher();

export const MATCH_STATUS_META: Record<MatchStatus, { label: string; short: string; tone: "success" | "info" | "danger" | "neutral" }> = {
  high: { label: "High-confidence match", short: "High confidence", tone: "success" },
  possible: { label: "Possible match", short: "Possible", tone: "info" },
  conflict: { label: "Conflicting information", short: "Conflicting", tone: "danger" },
  none: { label: "No match", short: "No match", tone: "neutral" },
};
