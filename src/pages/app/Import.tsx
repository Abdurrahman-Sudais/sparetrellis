import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  FileUp,
  Loader2,
  ReceiptText,
  ScrollText,
  Store,
  TriangleAlert,
  UploadCloud,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Notice } from "@/components/shared/Notice";
import { MockBadge } from "@/components/shared/Indicators";
import { useAppStore } from "@/hooks/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { WAREHOUSES } from "@/data/catalogue";
import {
  autoMap,
  IMPORT_TYPES,
  mockExcelParse,
  mockTextractExtract,
  parseCsv,
  SAMPLE_CSV,
  TARGET_FIELDS,
  validateRows,
  type ColumnMapping,
  type ParsedFile,
  type TargetField,
  type ValidationResult,
} from "@/services/importService";
import { matchingProvider } from "@/services/ai/matching";
import { exportCsv } from "@/lib/export";
import { cn, fmtDateTime, sleep } from "@/lib/utils";
import type { ImportJob, ImportType, InventoryRecord, MatchCandidate, RecordSource } from "@/types";

const STEPS = ["Upload", "Map columns", "Validate", "Complete"];
const TYPE_ICON: Record<ImportType, typeof FileUp> = {
  "inventory-csv": FileText,
  excel: FileSpreadsheet,
  "parts-catalogue": ScrollText,
  "purchase-records": ReceiptText,
  "supplier-catalogue": Store,
};
const NONE = "__none__";

function requiredFor(type: ImportType): TargetField[] {
  return type === "inventory-csv" || type === "excel" ? ["description", "uom", "quantity", "warehouse"] : ["description", "uom"];
}

export default function ImportPage() {
  const { records, importJobs, dispatch } = useAppStore();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ImportType>("inventory-csv");
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [parsing, setParsing] = useState(false);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [autoMapped, setAutoMapped] = useState<Set<string>>(new Set());
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [skipErrors, setSkipErrors] = useState(true);
  const [sendToMatching, setSendToMatching] = useState(true);
  const [result, setResult] = useState<{ job: ImportJob; candidates: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const required = requiredFor(type);
  const missingRequired = required.filter((f) => !mapping[f]);

  const loadParsed = (pf: ParsedFile) => {
    setFile(pf);
    const m = autoMap(pf.headers);
    setMapping(m);
    setAutoMapped(new Set(Object.keys(m)));
    setStep(1);
  };

  const handleFile = async (f: File) => {
    setParsing(true);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    try {
      if (ext === "csv" || ext === "txt") {
        const text = await f.text();
        const { headers, rows } = parseCsv(text);
        if (!headers.length || !rows.length) throw new Error("The file has no header row or no data rows.");
        await sleep(500);
        loadParsed({ fileName: f.name, headers, rows, processor: "browser-csv" });
      } else if (ext === "xlsx" || ext === "xls") {
        await sleep(1100);
        loadParsed(mockExcelParse(f.name));
        toast.info("Excel parsed by mock processor", { description: "The demo substitutes a sample sheet for workbook contents." });
      } else if (ext === "pdf") {
        await sleep(1600);
        loadParsed(mockTextractExtract(f.name));
        toast.info("Extracted with mock Textract", { description: "Line items shown are simulated extraction output." });
      } else {
        throw new Error(`Unsupported file type ".${ext}". Use CSV, XLSX or PDF.`);
      }
    } catch (e) {
      toast.error("Could not read file", { description: (e as Error).message });
    } finally {
      setParsing(false);
    }
  };

  const useSample = async () => {
    setParsing(true);
    await sleep(500);
    const { headers, rows } = parseCsv(SAMPLE_CSV);
    loadParsed({ fileName: "sample_multi_site_extract.csv", headers, rows, processor: "browser-csv" });
    setParsing(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const runValidation = async () => {
    if (!file) return;
    setStep(2);
    setValidation(null);
    const phases = ["Parsing rows", "Validating required fields", "Normalizing units of measure", "Checking warehouse codes", "Comparing against catalogue (mock semantic matching)"];
    for (let i = 0; i < phases.length; i++) {
      setProgressLabel(phases[i]);
      setProgress(Math.round(((i + 0.5) / phases.length) * 100));
      await sleep(380);
    }
    const v = validateRows(file, mapping, WAREHOUSES, records);
    setProgress(100);
    setValidation(v);
  };

  const counts = useMemo(() => {
    if (!validation) return { errors: 0, warnings: 0, duplicates: 0 };
    return {
      errors: validation.issues.filter((i) => i.level === "error").length,
      warnings: validation.issues.filter((i) => i.level === "warning").length,
      duplicates: validation.duplicateRows.size + validation.issues.filter((i) => i.level === "duplicate" && i.field === "Row").length,
    };
  }, [validation]);

  const commit = async () => {
    if (!file || !validation) return;
    setProgressLabel("Writing records");
    await sleep(600);
    const sourceMap: Record<ImportType, RecordSource> = {
      "inventory-csv": "ERP export",
      excel: "Spreadsheet",
      "parts-catalogue": "ERP export",
      "purchase-records": "Purchase record",
      "supplier-catalogue": "Supplier catalogue",
    };
    const whLookup = new Map<string, string>();
    for (const w of WAREHOUSES) [w.code, w.id, w.name].forEach((k) => whLookup.set(k.toUpperCase(), w.id));
    const newRecords: InventoryRecord[] = [];
    const rowToRecord = new Map<number, InventoryRecord>();
    const stamp = Date.now().toString(36).toUpperCase();
    validation.preview.forEach((row, i) => {
      const n = i + 1;
      if (skipErrors && validation.errorRows.has(n)) return;
      const rec: InventoryRecord = {
        id: `INV-${stamp}-${n}`,
        partNumber: row.partNumber ?? "",
        description: row.description || row.partNumber || "(no description)",
        manufacturer: row.manufacturer ?? "",
        equipmentRef: row.equipmentRef ?? "",
        category: row.category || "Uncategorised",
        uom: row.uom || "EA",
        quantity: Number(row.quantity) || 0,
        reserved: 0,
        warehouseId: whLookup.get((row.warehouse ?? "").toUpperCase()) ?? WAREHOUSES[0].id,
        supplier: row.supplier ?? "",
        unitPrice: Number((row.unitPrice ?? "").replace(/[$,₦]/g, "")) || 0,
        lastUpdated: new Date().toISOString(),
        source: sourceMap[type],
        standardPartId: null,
        mappingConfidence: 0,
        mappingStatus: "unmapped",
      };
      newRecords.push(rec);
      rowToRecord.set(n, rec);
    });

    const newCandidates: MatchCandidate[] = [];
    if (sendToMatching) {
      const byId = new Map(records.map((r) => [r.id, r]));
      for (const [n, existingId] of validation.duplicateRows) {
        const rec = rowToRecord.get(n);
        const ex = byId.get(existingId);
        if (!rec || !ex) continue;
        const res = matchingProvider.compare(rec, ex);
        newCandidates.push({
          id: `MC-${stamp}-${n}`,
          recordAId: ex.id,
          recordBId: rec.id,
          score: Number(res.score.toFixed(3)),
          status: res.status,
          matching: res.matching,
          conflicting: res.conflicting,
          recommendedAction: res.recommendedAction,
          reviewStatus: "pending",
          detectedAt: new Date().toISOString(),
        });
      }
    }

    const job: ImportJob = {
      id: `IMP-${String(importJobs.length + 1).padStart(4, "0")}`,
      fileName: file.fileName,
      type,
      rows: file.rows.length,
      imported: newRecords.length,
      errors: counts.errors,
      warnings: counts.warnings,
      duplicates: counts.duplicates,
      status: newRecords.length === 0 ? "failed" : counts.errors ? "completed-with-errors" : "completed",
      createdAt: new Date().toISOString(),
      user: user?.name ?? "Unknown",
    };
    dispatch({ type: "import", job, records: newRecords, candidates: newCandidates });
    setResult({ job, candidates: newCandidates.length });
    setStep(3);
    toast.success(`Imported ${newRecords.length} records`, { description: newCandidates.length ? `${newCandidates.length} potential duplicates sent to matching review.` : undefined });
  };

  const downloadErrors = () => {
    if (!validation || !file) return;
    exportCsv(
      `${file.fileName.replace(/\.[^.]+$/, "")}_validation_report.csv`,
      ["Row", "Level", "Field", "Message"],
      validation.issues.map((i) => [i.row, i.level, i.field, i.message]),
      [`SpareTrellis import validation report — ${file.fileName}`, `Generated ${new Date().toISOString()}`],
    );
  };

  const restart = () => {
    setStep(0);
    setFile(null);
    setValidation(null);
    setResult(null);
    setMapping({});
  };

  return (
    <div>
      <PageHeader
        eyebrow="Step 1 · Core workflow"
        title="Import inventory"
        description="Load stock extracts, catalogues, purchase records and supplier catalogues. Map columns, validate, and send likely duplicates to AI matching review."
        actions={<MockBadge label="Mock import processing" />}
      />

      {/* Stepper */}
      <Card className="mb-6">
        <ol className="flex flex-wrap items-center gap-y-3 px-5 py-4">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold",
                    i < step ? "bg-emerald-600 text-white" : i === step ? "bg-navy-900 text-amber-400" : "bg-steel-100 text-steel-500",
                  )}
                >
                  {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </span>
                <span className={cn("text-sm font-medium", i === step ? "text-navy-900" : "text-muted-foreground")}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn("mx-4 h-px w-8 md:w-16", i < step ? "bg-emerald-500" : "bg-steel-200")} />}
            </li>
          ))}
        </ol>
      </Card>

      {step === 0 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <Card>
            <CardHeader>
              <CardTitle>What are you importing?</CardTitle>
              <CardDescription>The type sets required fields and how records are labelled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {IMPORT_TYPES.map((t) => {
                const Icon = TYPE_ICON[t.value];
                return (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      type === t.value ? "border-amber-500 bg-amber-50/60 ring-1 ring-amber-500" : "hover:bg-steel-50",
                    )}
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", type === t.value ? "bg-navy-900 text-amber-400" : "bg-steel-100 text-steel-600")}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-navy-900">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                      <div className="mt-1 font-mono text-[10px] text-steel-500">{t.accept}</div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload file</CardTitle>
              <CardDescription>CSV is parsed in your browser. Excel and PDF use mock processors in this demo.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                className={cn("flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors", drag ? "border-amber-500 bg-amber-50" : "border-steel-300 bg-steel-50/50")}
              >
                {parsing ? (
                  <>
                    <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                    <div className="mt-4 font-semibold text-navy-900">Reading file…</div>
                  </>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-amber-400">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div className="mt-4 font-semibold text-navy-900">Drag & drop your file here</div>
                    <div className="mt-1 text-sm text-muted-foreground">{IMPORT_TYPES.find((t) => t.value === type)?.accept} · up to 50 MB</div>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <Button onClick={() => inputRef.current?.click()}>
                        <FileUp /> Browse files
                      </Button>
                      <Button variant="outline" onClick={useSample}>
                        <Wand2 /> Use sample file
                      </Button>
                    </div>
                  </>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept={IMPORT_TYPES.find((t) => t.value === type)?.accept}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <Notice className="mt-4" tone="info" title="In production">
                Files are uploaded to Amazon S3, parsed by AWS Lambda, and scanned purchase records are extracted with Amazon Textract before validation.
              </Notice>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 1 && file && (
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Map columns</CardTitle>
              <CardDescription>
                <span className="font-mono text-xs">{file.fileName}</span> · {file.rows.length} rows · {file.headers.length} columns
                {file.processor !== "browser-csv" && <Badge variant="mock" className="ml-2">{file.processor === "mock-textract" ? "Mock Textract" : "Mock Excel parser"}</Badge>}
              </CardDescription>
            </div>
            <Badge variant="info">
              <Wand2 />
              {autoMapped.size} fields auto-mapped
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">SpareTrellis field</TableHead>
                  <TableHead className="w-[280px]">Source column</TableHead>
                  <TableHead>Sample values</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TARGET_FIELDS.map((f) => {
                  const src = mapping[f.key];
                  const idx = src ? file.headers.indexOf(src) : -1;
                  const isReq = required.includes(f.key);
                  return (
                    <TableRow key={f.key}>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium text-navy-900">
                          {f.label}
                          {isReq && <span className="text-red-500">*</span>}
                        </div>
                        {"hint" in f && f.hint && <div className="text-xs text-muted-foreground">{f.hint}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={src ?? NONE}
                            onValueChange={(v) => {
                              setMapping((m) => ({ ...m, [f.key]: v === NONE ? undefined : v }));
                              setAutoMapped((s) => {
                                const n = new Set(s);
                                n.delete(f.key);
                                return n;
                              });
                            }}
                          >
                            <SelectTrigger className={cn("h-8", isReq && !src && "border-red-300 bg-red-50/40")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>— Not mapped —</SelectItem>
                              {file.headers.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {autoMapped.has(f.key) && <Wand2 className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-label="Auto-mapped" />}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        {idx >= 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {file.rows.slice(0, 3).map((r, i) => (
                              <span key={i} className="max-w-[160px] truncate rounded bg-steel-100 px-1.5 py-0.5 font-mono text-[11px]">
                                {r[idx] || "∅"}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
          <div className="flex flex-col-reverse gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={restart}>
              <ArrowLeft /> Back
            </Button>
            <div className="flex items-center gap-3">
              {missingRequired.length > 0 && (
                <span className="text-xs text-red-600">Map required: {missingRequired.map((m) => TARGET_FIELDS.find((t) => t.key === m)?.label).join(", ")}</span>
              )}
              <Button disabled={missingRequired.length > 0} onClick={runValidation}>
                Validate {file.rows.length} rows <ArrowRight />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && file && (
        <div className="space-y-6">
          {!validation ? (
            <Card className="p-10">
              <div className="mx-auto max-w-md text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-500" />
                <div className="mt-4 font-semibold text-navy-900">{progressLabel}…</div>
                <Progress value={progress} className="mt-4" indicatorClassName="bg-amber-500" />
                <p className="mt-3 text-xs text-muted-foreground">Mock processing — runs locally in your browser.</p>
              </div>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Rows ready to import", value: validation.validRows, icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50" },
                  { label: "Errors", value: counts.errors, icon: AlertCircle, cls: "text-red-600 bg-red-50" },
                  { label: "Warnings", value: counts.warnings, icon: TriangleAlert, cls: "text-amber-700 bg-amber-50" },
                  { label: "Duplicate warnings", value: counts.duplicates, icon: Copy, cls: "text-sky-700 bg-sky-50" },
                ].map((s) => (
                  <Card key={s.label} className="flex items-center gap-3 p-4">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-md", s.cls)}>
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold tabular-nums text-navy-900">{s.value}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card>
                <Tabs defaultValue={counts.errors ? "errors" : counts.duplicates ? "duplicates" : "preview"}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                    <TabsList>
                      <TabsTrigger value="errors">Errors ({counts.errors})</TabsTrigger>
                      <TabsTrigger value="warnings">Warnings ({counts.warnings})</TabsTrigger>
                      <TabsTrigger value="duplicates">Duplicates ({counts.duplicates})</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    <Button variant="outline" size="sm" onClick={downloadErrors}>
                      <Download /> Download error report
                    </Button>
                  </div>
                  {(["error", "warning", "duplicate"] as const).map((lvl) => (
                    <TabsContent key={lvl} value={lvl === "error" ? "errors" : lvl === "warning" ? "warnings" : "duplicates"} className="mt-0">
                      <IssueTable issues={validation.issues.filter((i) => i.level === lvl)} />
                    </TabsContent>
                  ))}
                  <TabsContent value="preview" className="mt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          {TARGET_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                            <TableHead key={f.key}>{f.label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validation.preview.slice(0, 25).map((r, i) => (
                          <TableRow key={i} className={cn(validation.errorRows.has(i + 1) && "bg-red-50/60")}>
                            <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                            {TARGET_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                              <TableCell key={f.key} className="max-w-[220px] truncate text-xs">
                                {r[f.key] || <span className="text-steel-400">∅</span>}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </Card>

              <Card className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={skipErrors} onCheckedChange={(v) => setSkipErrors(v === true)} />
                      Skip {validation.errorRows.size} rows with errors
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={sendToMatching} onCheckedChange={(v) => setSendToMatching(v === true)} />
                      Send {validation.duplicateRows.size} potential duplicates to matching review
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setStep(1)}>
                      <ArrowLeft /> Mapping
                    </Button>
                    <Button variant="accent" onClick={commit}>
                      Import {skipErrors ? validation.validRows : file.rows.length} records <ArrowRight />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Imported records are never merged with existing records. Potential duplicates become suggestions for human review.</p>
              </Card>
            </>
          )}
        </div>
      )}

      {step === 3 && result && (
        <Card className="p-10">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-navy-900">Import complete</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.job.imported} of {result.job.rows} rows from <span className="font-mono">{result.job.fileName}</span> were added. {result.candidates} potential duplicate relationships are waiting for review.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {result.candidates > 0 && (
                <Button asChild variant="accent">
                  <Link to="/app/matching">
                    Review {result.candidates} match suggestions <ArrowRight />
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link to="/app/catalogue">View catalogue</Link>
              </Button>
              <Button variant="ghost" onClick={restart}>
                Import another file
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Import history</CardTitle>
          <CardDescription>Recent imports across your organization</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Rows</TableHead>
                <TableHead className="text-right">Imported</TableHead>
                <TableHead className="text-right">Errors</TableHead>
                <TableHead className="text-right">Duplicates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>By</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importJobs.map((j) => (
                <TableRow key={j.id}>
                  <TableCell>
                    <div className="font-mono text-xs font-medium">{j.fileName}</div>
                    <div className="text-[11px] text-muted-foreground">{j.id}</div>
                  </TableCell>
                  <TableCell className="text-xs">{IMPORT_TYPES.find((t) => t.value === j.type)?.label}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{j.rows.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{j.imported.toLocaleString()}</TableCell>
                  <TableCell className={cn("text-right font-mono text-xs", j.errors && "text-red-600")}>{j.errors}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{j.duplicates}</TableCell>
                  <TableCell>
                    {j.status === "completed" ? <Badge variant="success">Completed</Badge> : j.status === "failed" ? <Badge variant="danger">Failed</Badge> : <Badge variant="warning">With errors</Badge>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{j.user}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(j.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function IssueTable({ issues }: { issues: { row: number; field: string; message: string; level: string }[] }) {
  if (!issues.length) return <div className="p-10 text-center text-sm text-muted-foreground">Nothing to report here.</div>;
  return (
    <div className="max-h-[360px] overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Row</TableHead>
            <TableHead className="w-48">Field</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((i, k) => (
            <TableRow key={k}>
              <TableCell className="font-mono text-xs">{i.row}</TableCell>
              <TableCell className="text-xs font-medium">{i.field}</TableCell>
              <TableCell className="text-xs">{i.message}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
