export interface Warehouse {
  id: string;
  code: string;
  name: string;
  site: string;
  region: string;
}

export type RecordSource = "ERP export" | "CMMS" | "Spreadsheet" | "Supplier catalogue" | "Purchase record" | "Manual entry";

export type MappingStatus = "verified" | "ai-suggested" | "unmapped";

export interface InventoryRecord {
  id: string;
  partNumber: string;
  description: string;
  manufacturer: string;
  equipmentRef: string;
  category: string;
  uom: string;
  quantity: number;
  reserved: number;
  warehouseId: string;
  supplier: string;
  unitPrice: number;
  lastUpdated: string;
  source: RecordSource;
  /** Catalogue master part this record is mapped to (if any). */
  standardPartId: string | null;
  mappingConfidence: number;
  mappingStatus: MappingStatus;
}

export interface StandardPart {
  id: string;
  name: string;
  family: string;
  category: string;
  manufacturerPartNumbers: string[];
  specs: Record<string, string>;
  uom: string;
  aliases: string[];
}

export type MatchStatus = "high" | "possible" | "conflict" | "none";
export type ReviewStatus = "pending" | "approved" | "rejected" | "flagged";
export type RelationshipType = "duplicate-record" | "verified-equivalent";

export interface AttributeComparison {
  attribute: string;
  a: string;
  b: string;
  severity?: "critical" | "review";
  note?: string;
}

export interface MatchCandidate {
  id: string;
  recordAId: string;
  recordBId: string;
  score: number;
  status: MatchStatus;
  matching: AttributeComparison[];
  conflicting: AttributeComparison[];
  recommendedAction: string;
  reviewStatus: ReviewStatus;
  relationship?: RelationshipType;
  reviewer?: string;
  reviewedAt?: string;
  note?: string;
  detectedAt: string;
}

export type ProposalType = "description" | "uom" | "manufacturer" | "format";
export type ProposalStatus = "pending" | "accepted" | "rejected";

export interface NormalizationProposal {
  id: string;
  type: ProposalType;
  recordId: string;
  field: keyof InventoryRecord;
  current: string;
  proposed: string;
  confidence: number;
  rationale: string;
  status: ProposalStatus;
}

export interface AuditEntry {
  id: string;
  ts: string;
  user: string;
  action: string;
  entity: string;
  field?: string;
  before?: string;
  after?: string;
  note?: string;
}

export type ActivityType = "import" | "match" | "review" | "normalize" | "forecast" | "report";

export interface Activity {
  id: string;
  ts: string;
  user: string;
  type: ActivityType;
  message: string;
}

export type ImportType = "inventory-csv" | "excel" | "parts-catalogue" | "purchase-records" | "supplier-catalogue";

export interface ImportJob {
  id: string;
  fileName: string;
  type: ImportType;
  rows: number;
  imported: number;
  errors: number;
  warnings: number;
  duplicates: number;
  status: "completed" | "completed-with-errors" | "failed";
  createdAt: string;
  user: string;
}

export type DemandPattern = "smooth" | "intermittent" | "lumpy" | "erratic";
export type ReorderDecision = "pending" | "approved" | "rejected" | "deferred";
export type RiskLevel = "high" | "medium" | "low";

export interface ForecastItem {
  id: string;
  standardPartId: string;
  name: string;
  category: string;
  warehouseId: string;
  history: number[]; // monthly consumption, oldest first
  onHand: number;
  reserved: number;
  onOrder: number;
  leadTimeDays: number;
  unitPrice: number;
  moq: number;
  criticality: "A" | "B" | "C";
  decision: ReorderDecision;
  decisionNote?: string;
}
