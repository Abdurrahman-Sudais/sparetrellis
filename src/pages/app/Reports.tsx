import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis, Legend } from "recharts";
import { BarChart3, Copy, FileDown, FileSpreadsheet, PackageSearch, PiggyBank, Scale, SpellCheck2, TrendingUp, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Notice } from "@/components/shared/Notice";
import { useAppStore, type AppState } from "@/hooks/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { WAREHOUSES, warehouseById, DEMO_TENANT } from "@/data/catalogue";
import { recommendReorder } from "@/services/ai/forecasting";
import { MATCH_STATUS_META } from "@/services/ai/matching";
import { exportCsv, exportPdf, type Cell } from "@/lib/export";
import { cn, fmtCurrency } from "@/lib/utils";
import type { InventoryRecord } from "@/types";

interface ReportOutput {
  summary: [string, string][];
  headers: string[];
  rows: Cell[][];
  notes: string[];
  chart?: { data: Record<string, string | number>[]; bars: { key: string; color: string }[]; x: string };
}

interface ReportDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  estimate?: boolean;
  build: (s: AppState, byId: Map<string, InventoryRecord>) => ReportOutput;
}

const CARRYING_RATE = 0.2;

const REPORTS: ReportDef[] = [
  {
    id: "duplicates",
    title: "Duplicate catalogue records",
    description: "High-confidence and possible duplicate pairs, with review outcomes.",
    icon: Copy,
    build: (s, byId) => {
      const list = s.candidates.filter((c) => (c.status === "high" || c.status === "possible") && c.reviewStatus !== "rejected");
      const byCat = new Map<string, { Pending: number; Approved: number; Flagged: number }>();
      for (const c of list) {
        const cat = byId.get(c.recordAId)?.category ?? "Other";
        const v = byCat.get(cat) ?? { Pending: 0, Approved: 0, Flagged: 0 };
        if (c.reviewStatus === "approved") v.Approved++;
        else if (c.reviewStatus === "flagged") v.Flagged++;
        else v.Pending++;
        byCat.set(cat, v);
      }
      return {
        summary: [
          ["Potential duplicate pairs", String(list.length)],
          ["Approved (linked, not merged)", String(list.filter((c) => c.reviewStatus === "approved").length)],
          ["Awaiting review", String(list.filter((c) => c.reviewStatus === "pending").length)],
          ["Flagged for engineering", String(list.filter((c) => c.reviewStatus === "flagged").length)],
        ],
        headers: ["Match ID", "Record A", "Warehouse A", "Record B", "Warehouse B", "Score", "Status", "Review", "Relationship"],
        rows: list.map((c) => {
          const a = byId.get(c.recordAId);
          const b = byId.get(c.recordBId);
          return [c.id, a?.description, warehouseById(a?.warehouseId ?? "")?.code, b?.description, warehouseById(b?.warehouseId ?? "")?.code, `${Math.round(c.score * 100)}%`, MATCH_STATUS_META[c.status].label, c.reviewStatus, c.relationship ?? ""];
        }),
        notes: ["Pairs are suggestions from a mock matching service unless marked approved. Approved duplicates are linked records; no records were merged."],
        chart: { data: [...byCat.entries()].map(([k, v]) => ({ category: k, ...v })), x: "category", bars: [{ key: "Approved", color: "#10b981" }, { key: "Pending", color: "#b1b8c6" }, { key: "Flagged", color: "#f59e0b" }] },
      };
    },
  },
  {
    id: "reconciliation",
    title: "Inventory reconciliation",
    description: "Catalogue mapping coverage and inventory value by warehouse.",
    icon: Scale,
    build: (s) => {
      const rows = WAREHOUSES.map((w) => {
        const r = s.records.filter((x) => x.warehouseId === w.id);
        const v = r.filter((x) => x.mappingStatus === "verified").length;
        const ai = r.filter((x) => x.mappingStatus === "ai-suggested").length;
        const un = r.filter((x) => x.mappingStatus === "unmapped").length;
        return { w, n: r.length, v, ai, un, value: r.reduce((a, x) => a + x.quantity * x.unitPrice, 0) };
      });
      const tot = rows.reduce((a, r) => ({ n: a.n + r.n, v: a.v + r.v, un: a.un + r.un, value: a.value + r.value }), { n: 0, v: 0, un: 0, value: 0 });
      return {
        summary: [
          ["Records", tot.n.toLocaleString()],
          ["Verified mappings", `${tot.v} (${Math.round((tot.v / tot.n) * 100)}%)`],
          ["Unmatched entries", String(tot.un)],
          ["Inventory value on hand", fmtCurrency(tot.value)],
        ],
        headers: ["Warehouse", "Name", "Records", "Verified", "AI-suggested", "Unmatched", "% verified", "Value on hand"],
        rows: rows.map((r) => [r.w.code, r.w.name, r.n, r.v, r.ai, r.un, `${r.n ? Math.round((r.v / r.n) * 100) : 0}%`, fmtCurrency(r.value)]),
        notes: ["AI-suggested mappings have not yet been verified by a person."],
        chart: { data: rows.map((r) => ({ wh: r.w.code, Verified: r.v, "AI-suggested": r.ai, Unmatched: r.un })), x: "wh", bars: [{ key: "Verified", color: "#10b981" }, { key: "AI-suggested", color: "#0ea5e9" }, { key: "Unmatched", color: "#f59e0b" }] },
      };
    },
  },
  {
    id: "discovery",
    title: "Stock discovery",
    description: "Catalogue parts held at more than one warehouse, with available quantities.",
    icon: PackageSearch,
    build: (s) => {
      const by = new Map<string, InventoryRecord[]>();
      for (const r of s.records) if (r.standardPartId) by.set(r.standardPartId, [...(by.get(r.standardPartId) ?? []), r]);
      const parts = [...by.entries()]
        .map(([id, recs]) => ({ id, name: s.standardParts.find((p) => p.id === id)?.name ?? id, recs, sites: new Set(recs.map((r) => r.warehouseId)).size, avail: recs.reduce((a, r) => a + Math.max(0, r.quantity - r.reserved), 0), reserved: recs.reduce((a, r) => a + r.reserved, 0) }))
        .filter((p) => p.sites > 1)
        .sort((a, b) => b.avail - a.avail);
      return {
        summary: [
          ["Parts stocked at 2+ sites", String(parts.length)],
          ["Units available across those sites", parts.reduce((a, p) => a + p.avail, 0).toLocaleString()],
          ["Records involved", String(parts.reduce((a, p) => a + p.recs.length, 0))],
        ],
        headers: ["Catalogue part", "Sites", "Available", "Reserved", "Breakdown (warehouse: available)"],
        rows: parts.map((p) => [p.name, p.sites, p.avail, p.reserved, p.recs.map((r) => `${warehouseById(r.warehouseId)?.code}: ${Math.max(0, r.quantity - r.reserved)}`).join("; ")]),
        notes: ["Includes AI-suggested catalogue mappings. Verify part identity before transferring stock."],
        chart: {
          data: WAREHOUSES.map((w) => ({ wh: w.code, Units: parts.reduce((a, p) => a + p.recs.filter((r) => r.warehouseId === w.id).reduce((x, r) => x + Math.max(0, r.quantity - r.reserved), 0), 0) })),
          x: "wh",
          bars: [{ key: "Units", color: "#223553" }],
        },
      };
    },
  },
  {
    id: "normalization",
    title: "Catalogue normalization",
    description: "Proposed and accepted corrections to descriptions, units, manufacturers and formats.",
    icon: SpellCheck2,
    build: (s) => {
      const types = ["description", "uom", "manufacturer", "format"] as const;
      const label = { description: "Description", uom: "Unit", manufacturer: "Manufacturer", format: "Part-number format" };
      const resolved = s.proposals.filter((p) => p.status !== "pending");
      return {
        summary: [
          ["Proposals", String(s.proposals.length)],
          ["Accepted", String(s.proposals.filter((p) => p.status === "accepted").length)],
          ["Rejected", String(s.proposals.filter((p) => p.status === "rejected").length)],
          ["Pending", String(s.proposals.filter((p) => p.status === "pending").length)],
        ],
        headers: ["Proposal", "Type", "Record", "Original value", "Final value", "Status"],
        rows: resolved.map((p) => [p.id, label[p.type], p.recordId, p.current, p.status === "accepted" ? p.proposed : p.current, p.status]),
        notes: ["Original values for every accepted change are retained in the audit trail."],
        chart: {
          data: types.map((t) => ({ type: label[t], Accepted: s.proposals.filter((p) => p.type === t && p.status === "accepted").length, Pending: s.proposals.filter((p) => p.type === t && p.status === "pending").length, Rejected: s.proposals.filter((p) => p.type === t && p.status === "rejected").length })),
          x: "type",
          bars: [{ key: "Accepted", color: "#10b981" }, { key: "Pending", color: "#b1b8c6" }, { key: "Rejected", color: "#223553" }],
        },
      };
    },
  },
  {
    id: "savings",
    title: "Potential purchasing savings",
    description: "Estimated avoidable purchases and duplicate-stock carrying cost.",
    icon: PiggyBank,
    estimate: true,
    build: (s, byId) => {
      const lines: Cell[][] = [];
      let avoided = 0;
      for (const f of s.forecastItems) {
        const rec = recommendReorder(f);
        if (!rec.needsReorder || f.decision === "rejected") continue;
        const net = s.records.filter((r) => r.standardPartId === f.standardPartId && r.warehouseId !== f.warehouseId).reduce((a, r) => a + Math.max(0, r.quantity - r.reserved), 0);
        const cover = Math.min(rec.suggestedQty, net);
        if (!cover) continue;
        const v = cover * f.unitPrice;
        avoided += v;
        lines.push(["Avoidable purchase (network stock)", f.name, `${cover} of ${rec.suggestedQty} suggested`, fmtCurrency(v)]);
      }
      let carrying = 0;
      for (const c of s.candidates) {
        if (!(c.reviewStatus === "approved" && c.relationship === "duplicate-record")) continue;
        const a = byId.get(c.recordAId);
        const b = byId.get(c.recordBId);
        if (!a || !b) continue;
        const v = Math.min(a.quantity * a.unitPrice, b.quantity * b.unitPrice) * CARRYING_RATE;
        if (!v) continue;
        carrying += v;
        lines.push(["Duplicate-stock carrying cost (annual)", a.description, `${c.id}`, fmtCurrency(v)]);
      }
      return {
        summary: [
          ["ESTIMATED avoidable purchases", fmtCurrency(avoided)],
          ["ESTIMATED annual carrying cost of duplicate stock", fmtCurrency(carrying)],
          ["ESTIMATED total opportunity", fmtCurrency(avoided + carrying)],
          ["Status", "Estimates — not realized savings"],
        ],
        headers: ["Estimate type", "Part", "Basis", "Estimated value"],
        rows: lines,
        notes: [
          "All figures are ESTIMATES for prioritisation, not realized financial savings. Savings are realized only when a planned purchase is actually avoided.",
          `Avoidable purchases assume network stock is verified as the same part and transferable. Carrying cost uses an assumed ${CARRYING_RATE * 100}% annual rate on the smaller duplicate holding.`,
        ],
        chart: { data: [{ name: "Estimated opportunity", "Avoidable purchases": Math.round(avoided), "Carrying cost (annual)": Math.round(carrying) }], x: "name", bars: [{ key: "Avoidable purchases", color: "#f59e0b" }, { key: "Carrying cost (annual)", color: "#223553" }] },
      };
    },
  },
  {
    id: "reorder",
    title: "Reorder recommendations",
    description: "Simulated reorder suggestions and planner decisions.",
    icon: TrendingUp,
    build: (s) => {
      const rows = s.forecastItems.map((f) => ({ f, r: recommendReorder(f) }));
      const sugg = rows.filter((x) => x.r.needsReorder);
      return {
        summary: [
          ["Items forecast", String(rows.length)],
          ["Suggestions raised", String(sugg.length)],
          ["Approved by planners", String(rows.filter((x) => x.f.decision === "approved").length)],
          ["High stockout risk", String(rows.filter((x) => x.r.risk === "high").length)],
        ],
        headers: ["Item", "Part", "Warehouse", "Pattern", "Avg/month", "Available", "Lead time (d)", "Reorder point", "Suggested qty", "Risk", "Decision"],
        rows: rows.map(({ f, r }) => [f.id, f.name, warehouseById(f.warehouseId)?.code, r.forecast.pattern, r.forecast.monthlyForecast.toFixed(2), r.available, f.leadTimeDays, r.reorderPoint, r.suggestedQty, r.risk, f.decision]),
        notes: ["Forecasts are SIMULATED (Croston SBA / exponential smoothing on demo data). Quantities are suggestions for planner approval."],
        chart: { data: (["high", "medium", "low"] as const).map((k) => ({ risk: k, Items: rows.filter((x) => x.r.risk === k).length })), x: "risk", bars: [{ key: "Items", color: "#223553" }] },
      };
    },
  },
];

export default function Reports() {
  const store = useAppStore();
  const { user } = useAuth();
  const { recordById } = store;
  const [active, setActive] = useState(REPORTS[0].id);
  const def = REPORTS.find((r) => r.id === active)!;
  const out = useMemo(() => def.build(store, recordById), [def, store, recordById]);

  const stamp = new Date().toISOString().slice(0, 10);
  const file = `sparetrellis_${def.id}_${stamp}`;
  const log = (fmt: string) => store.dispatch({ type: "activity", activity: { user: user?.name ?? "Unknown", type: "report", message: `Exported ${def.title} report (${fmt}).` } });

  const toCsv = () => {
    exportCsv(`${file}.csv`, out.headers, out.rows, [`SpareTrellis — ${def.title}`, `${DEMO_TENANT}`, ...out.summary.map(([k, v]) => `${k}: ${v}`), ...out.notes]);
    log("CSV");
    toast.success("CSV exported");
  };
  const toPdf = () => {
    exportPdf({ title: def.title, subtitle: `${DEMO_TENANT} · generated by ${user?.name ?? "—"}`, summary: out.summary, notes: out.notes, headers: out.headers, rows: out.rows, filename: `${file}.pdf` });
    log("PDF");
    toast.success("PDF exported");
  };

  return (
    <div>
      <PageHeader eyebrow="Insights" title="Reports" description="Generate and export reports on duplicates, reconciliation, stock discovery, normalization, estimated savings and reorder recommendations." />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-2">
          {REPORTS.map((r) => (
            <button key={r.id} onClick={() => setActive(r.id)} className={cn("flex w-full items-start gap-3 rounded-lg border bg-white p-3 text-left transition-colors hover:bg-steel-50", active === r.id && "border-amber-500 ring-1 ring-amber-500")}>
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", active === r.id ? "bg-navy-900 text-amber-400" : "bg-steel-100 text-steel-600")}>
                <r.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
                  {r.title}
                  {r.estimate && <span className="rounded bg-amber-100 px-1 text-[9px] font-bold uppercase text-amber-800">Estimate</span>}
                </div>
                <div className="text-xs text-muted-foreground">{r.description}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader className="flex-col gap-3 space-y-0 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <def.icon className="h-5 w-5 text-amber-600" /> {def.title}
                </CardTitle>
                <CardDescription>{def.description}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={toCsv}>
                  <FileSpreadsheet /> Export CSV
                </Button>
                <Button onClick={toPdf}>
                  <FileDown /> Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {def.estimate && (
                <Notice tone="warning" title="Estimates — not realized financial savings">
                  These figures indicate potential opportunity for prioritisation. They become savings only when a planned purchase is actually avoided or duplicate stock is actually consumed.
                </Notice>
              )}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {out.summary.map(([k, v]) => (
                  <div key={k} className="rounded-lg border bg-steel-50/60 p-3">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k}</div>
                    <div className="mt-1 text-lg font-bold text-navy-900">{v}</div>
                  </div>
                ))}
              </div>
              {out.chart && (
                <div className="h-[240px]">
                  <ResponsiveContainer>
                    <BarChart data={out.chart.data} margin={{ left: -10, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey={out.chart.x} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <RTooltip cursor={{ fill: "#f6f7f9" }} />
                      {out.chart.bars.length > 1 && <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />}
                      {out.chart.bars.map((b, i) => (
                        <Bar key={b.key} dataKey={b.key} stackId={def.id === "savings" ? undefined : "a"} fill={b.color} radius={i === out.chart!.bars.length - 1 || def.id === "savings" ? [3, 3, 0, 0] : undefined} maxBarSize={56} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {out.notes.map((n) => (
                <p key={n} className="text-xs text-muted-foreground">
                  ⓘ {n}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4" /> Preview
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Showing {Math.min(15, out.rows.length)} of {out.rows.length} rows — export for the full report
              </span>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  {out.headers.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {out.rows.slice(0, 15).map((r, i) => (
                  <TableRow key={i}>
                    {r.map((c, j) => (
                      <TableCell key={j} className="max-w-[280px] truncate text-xs">
                        {c ?? ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!out.rows.length && <div className="p-8 text-center text-sm text-muted-foreground">No rows for this report yet.</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}
