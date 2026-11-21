/**
 * Import processing. CSV files are parsed in the browser; Excel workbooks and
 * PDF purchase records use MOCK processors (stand-ins for a server-side parser
 * and Amazon Textract respectively). Validation and duplicate detection run
 * locally against the current catalogue.
 */
import type { ImportType, InventoryRecord, Warehouse } from "@/types";
import { canonicalUom, normalizePartNumber, UOM_ALIASES } from "./ai/dictionaries";
import { descriptionSimilarity } from "./ai/matching";

export const TARGET_FIELDS = [
  { key: "partNumber", label: "Part number", required: false, hint: "Manufacturer or internal stock code" },
  { key: "description", label: "Part description", required: true, hint: "Free-text description" },
  { key: "manufacturer", label: "Manufacturer", required: false },
  { key: "equipmentRef", label: "Equipment reference", required: false },
  { key: "category", label: "Category", required: false },
  { key: "uom", label: "Unit of measurement", required: true },
  { key: "quantity", label: "Quantity", required: true },
  { key: "warehouse", label: "Warehouse location", required: true },
  { key: "supplier", label: "Supplier", required: false },
  { key: "unitPrice", label: "Purchase price", required: false },
] as const;

export type TargetField = (typeof TARGET_FIELDS)[number]["key"];
export type ColumnMapping = Partial<Record<TargetField, string>>;

export const IMPORT_TYPES: { value: ImportType; label: string; accept: string; description: string }[] = [
  { value: "inventory-csv", label: "CSV inventory file", accept: ".csv,.txt", description: "Stock-on-hand extract from ERP, CMMS or stores system" },
  { value: "excel", label: "Excel spreadsheet", accept: ".xlsx,.xls", description: "Workbook exports and local spares registers" },
  { value: "parts-catalogue", label: "Parts catalogue", accept: ".csv,.xlsx", description: "Item master or catalogue of record" },
  { value: "purchase-records", label: "Purchase records", accept: ".csv,.xlsx,.pdf", description: "PO history, invoices — PDFs via Textract (mock)" },
  { value: "supplier-catalogue", label: "Supplier catalogue", accept: ".csv,.xlsx,.pdf", description: "Supplier price lists and product catalogues" },
];

const SYNONYMS: Record<TargetField, string[]> = {
  partNumber: ["part number", "part no", "partno", "pn", "mpn", "item code", "material", "material no", "stock code", "sku", "part #"],
  description: ["description", "desc", "item description", "material description", "short text", "part name", "item name"],
  manufacturer: ["manufacturer", "mfr", "make", "brand", "oem", "vendor brand"],
  equipmentRef: ["equipment", "equipment ref", "asset", "asset tag", "tag", "equipment reference", "where used"],
  category: ["category", "class", "material group", "commodity", "group"],
  uom: ["uom", "unit", "unit of measure", "units", "base unit", "bun"],
  quantity: ["qty", "quantity", "on hand", "soh", "stock", "qty on hand", "balance"],
  warehouse: ["warehouse", "location", "plant", "store", "site", "storage location", "bin location"],
  supplier: ["supplier", "vendor", "vendor name", "supplier name"],
  unitPrice: ["price", "unit price", "cost", "unit cost", "purchase price", "net price"],
};

export interface ParsedFile {
  fileName: string;
  headers: string[];
  rows: string[][];
  processor: "browser-csv" | "mock-excel" | "mock-textract";
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const delim = (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"' && field === "") inQuotes = true; // quotes are only special at the start of a field
    else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) out.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) out.push(row);
  const [headers = [], ...rows] = out;
  return { headers: headers.map((h) => h.trim()), rows };
}

export const SAMPLE_CSV = `Material No,Material Description,Make,Equipment,Material Group,UoM,Qty On Hand,Storage Location,Vendor,Unit Cost
6205-2RSH,"BEARING 6205 2RS 25X52X15",SKF,CV-201 Conveyor drive,Bearings,EA,14,IKJ-02,Bearing Hub Nigeria Ltd,9.80
6205 DDU,Ball bearing 6205 sealed,NSK,P-104 Process water pump,Bearings,PCS,6,APP-01,Transpower Engineering,8.95
ST-55102,Brg 6206 zz shielded,S.K.F.,FAN-12 ID fan,Bearings,EACH,3,OTA-01,Bearing Hub Nigeria Ltd,11.20
SPA1250,V-BELT SPA 1250,Gates,CT-01 Cooling tower fan,Power Transmission,EA,8,PHC-01,Drivetrain Partners,14.50
SPA 1250 LW,Wedge belt SPA-1250,Optibelt,AHU-04 Air handler,Power Transmission,EA,,WRI-03,Transpower Engineering,13.90
LC1D32P7,Contactor 32A coil 230VAC,Schneider Elec.,MCC-3 Motor control centre,Electrical,EA,4,APP-01,Elektro Distribution Co.,88.00
LC1D32BD,CONTACTOR 32A 24VDC,Schneider Electric,PLC-2 Filler control panel,Electrical,EA,2,ABJ-01,Powerline Controls,abc
N0674-50X3,O RING 50X3 NBR,Parker,HPU-01 Press hydraulic unit,Seals & Gaskets,BOX10,5,KAN-02,Sealtech West Africa,9.20
,O-ring 50 x 3 viton,Trelleborg,HX-11 Heat exchanger,Seals & Gaskets,EA,40,ACC-01,Sealtech West Africa,2.80
3NA3063,HRC FUSE 63A 500V NH00,Siemens,DB-12 Distribution board,Electrical,EA,25,LAG-99,Elektro Distribution Co.,6.40
W22-5.5-4P-IE3,Electric motor 5.5kW 4 pole 415V,WEG,P-221 Boiler feed pump,Rotating Equipment,EA,1,WRI-03,Drivetrain Partners,480.00
213.53.100-10B,Pressure gauge 0-10 bar 100mm,WIKA,BLR-01 Steam boiler,Instrumentation,EA,7,PHC-01,Process Instruments Ltd,24.10
0160D010BN4HC,Hydraulic return filter 10 micron,Hydac,HPU-03 Baler hydraulics,Filtration,EA,3,OTA-01,Sealtech West Africa,41.00
CG-4-150-316-FG,SWG 4in 150# 316 graphite,Flexitallic,PL-08 Steam header,Seals & Gaskets,EA,12,IKJ-02,FlowServe Spares Ltd,19.50
IG5953,Prox sensor M12 PNP 4mm,IFM,FIL-01 Filler,Instrumentation,EA,6,ACC-01,Process Instruments Ltd,36.00
L100-NBR,Jaw coupling spider L100,Lovejoy,CV-201 Conveyor drive,Power Transmission,EA,9,KAN-02,Drivetrain Partners,13.70
SCG238A032-24DC,Sol valve 1/2" 24VDC NC,ASCO,TK-04 CIP tank,Valves,EA,2,APP-01,Process Instruments Ltd,79.00
6205-2RSH,"BEARING 6205 2RS 25X52X15",SKF,CV-201 Conveyor drive,Bearings,EA,14,IKJ-02,Bearing Hub Nigeria Ltd,9.80
`;

/** MOCK: stands in for a server-side Excel parser. Returns the sample sheet. */
export function mockExcelParse(fileName: string): ParsedFile {
  const { headers, rows } = parseCsv(SAMPLE_CSV);
  return { fileName, headers, rows, processor: "mock-excel" };
}

/** MOCK: stands in for Amazon Textract AnalyzeExpense / AnalyzeDocument tables. */
export function mockTextractExtract(fileName: string): ParsedFile {
  const { headers, rows } = parseCsv(SAMPLE_CSV);
  return { fileName, headers: headers, rows: rows.slice(0, 10), processor: "mock-textract" };
}

export function autoMap(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  for (const f of TARGET_FIELDS) {
    const syns = SYNONYMS[f.key];
    const hit =
      headers.find((h) => !used.has(h) && syns.includes(h.trim().toLowerCase())) ??
      headers.find((h) => !used.has(h) && syns.some((s) => h.trim().toLowerCase().includes(s)));
    if (hit) {
      mapping[f.key] = hit;
      used.add(hit);
    }
  }
  return mapping;
}

export type IssueLevel = "error" | "warning" | "duplicate";

export interface RowIssue {
  row: number; // 1-based data row
  level: IssueLevel;
  field: string;
  message: string;
}

export interface ValidationResult {
  issues: RowIssue[];
  validRows: number;
  errorRows: Set<number>;
  preview: Partial<Record<TargetField, string>>[];
  duplicateRows: Map<number, string>; // row -> existing record id
}

export function validateRows(
  file: ParsedFile,
  mapping: ColumnMapping,
  warehouses: Warehouse[],
  existing: InventoryRecord[],
): ValidationResult {
  const idx = (f: TargetField) => (mapping[f] ? file.headers.indexOf(mapping[f]!) : -1);
  const get = (row: string[], f: TargetField) => {
    const i = idx(f);
    return i >= 0 ? (row[i] ?? "").trim() : "";
  };
  const knownUoms = new Set(Object.keys(UOM_ALIASES));
  const whCodes = new Set(warehouses.flatMap((w) => [w.code.toUpperCase(), w.id.toUpperCase(), w.name.toUpperCase()]));
  const byPn = new Map<string, InventoryRecord>();
  for (const r of existing) if (r.partNumber) byPn.set(normalizePartNumber(r.partNumber), r);

  const issues: RowIssue[] = [];
  const errorRows = new Set<number>();
  const duplicateRows = new Map<number, string>();
  const seenInFile = new Map<string, number>();
  const preview: Partial<Record<TargetField, string>>[] = [];

  file.rows.forEach((row, i) => {
    const n = i + 1;
    const rec: Partial<Record<TargetField, string>> = {};
    for (const f of TARGET_FIELDS) rec[f.key] = get(row, f.key);
    preview.push(rec);

    const err = (field: string, message: string) => {
      issues.push({ row: n, level: "error", field, message });
      errorRows.add(n);
    };
    const warn = (field: string, message: string) => issues.push({ row: n, level: "warning", field, message });

    if (!rec.description && !rec.partNumber) err("Part description", "Row has neither a description nor a part number.");
    else if (!rec.description) warn("Part description", "Description missing — matching will rely on part number only.");
    if (!rec.partNumber) warn("Part number", "No part number — record will be matched on description and specifications.");

    if (mapping.quantity) {
      if (rec.quantity === "") err("Quantity", "Quantity is blank.");
      else if (!/^-?\d+(\.\d+)?$/.test(rec.quantity!)) err("Quantity", `"${rec.quantity}" is not a number.`);
      else if (Number(rec.quantity) < 0) err("Quantity", "Negative quantity.");
    }
    if (mapping.unitPrice && rec.unitPrice && !/^\d+(\.\d+)?$/.test(rec.unitPrice.replace(/[$,₦]/g, ""))) err("Purchase price", `"${rec.unitPrice}" is not a valid price.`);
    if (mapping.uom && rec.uom) {
      const cu = canonicalUom(rec.uom);
      if (!knownUoms.has(cu)) warn("Unit of measurement", `Unrecognised unit "${rec.uom}".`);
      else if (cu !== rec.uom.toUpperCase()) warn("Unit of measurement", `"${rec.uom}" will be normalized to ${cu}.`);
    }
    if (mapping.warehouse && rec.warehouse && !whCodes.has(rec.warehouse.toUpperCase())) err("Warehouse location", `Unknown warehouse "${rec.warehouse}".`);

    // Duplicate detection
    const key = `${normalizePartNumber(rec.partNumber ?? "")}|${(rec.description ?? "").toUpperCase()}|${(rec.warehouse ?? "").toUpperCase()}`;
    if (seenInFile.has(key)) {
      issues.push({ row: n, level: "duplicate", field: "Row", message: `Exact duplicate of row ${seenInFile.get(key)} in this file.` });
      errorRows.add(n);
    } else seenInFile.set(key, n);

    const pnHit = rec.partNumber ? byPn.get(normalizePartNumber(rec.partNumber)) : undefined;
    if (pnHit) {
      duplicateRows.set(n, pnHit.id);
      issues.push({ row: n, level: "duplicate", field: "Part number", message: `Part number already exists as ${pnHit.id} (${pnHit.description}).` });
    } else if (rec.description) {
      let best: InventoryRecord | undefined;
      let bestScore = 0;
      for (const r of existing) {
        const s = descriptionSimilarity(rec.description, r.description);
        if (s > bestScore) {
          bestScore = s;
          best = r;
        }
      }
      if (best && bestScore >= 0.7) {
        duplicateRows.set(n, best.id);
        issues.push({ row: n, level: "duplicate", field: "Part description", message: `Similar description to ${best.id} (${Math.round(bestScore * 100)}% overlap) — will be sent to matching review.` });
      }
    }
  });

  return { issues, validRows: file.rows.length - errorRows.size, errorRows, preview, duplicateRows };
}
