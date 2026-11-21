import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  Boxes,
  ClipboardCheck,
  Copy,
  FileUp,
  GitCompareArrows,
  HelpCircle,
  ScanSearch,
  Sparkles,
  TrendingUp,
  Warehouse as WarehouseIcon,
  BarChart3,
  SpellCheck2,
  PackageSearch,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DateRangeSelect, WarehouseSelect } from "@/components/shared/Filters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/hooks/useAppStore";
import { WAREHOUSES } from "@/data/catalogue";
import { cn, fmtCurrency, fmtDateTime, fmtNumber } from "@/lib/utils";
import { recommendReorder } from "@/services/ai/forecasting";
import { MatchStatusBadge, MockBadge } from "@/components/shared/Indicators";
import type { ActivityType } from "@/types";

const COLORS = { navy: "#223553", amber: "#f59e0b", emerald: "#10b981", sky: "#0ea5e9", steel: "#b1b8c6", red: "#ef4444", violet: "#8b5cf6" };

const ACT_ICON: Record<ActivityType, typeof FileUp> = {
  import: FileUp,
  match: Sparkles,
  review: ClipboardCheck,
  normalize: SpellCheck2,
  forecast: TrendingUp,
  report: BarChart3,
};

export default function Dashboard() {
  const { records, candidates, forecastItems, activities, recordById } = useAppStore();
  const [wh, setWh] = useState("all");
  const [range, setRange] = useState("all");

  const data = useMemo(() => {
    const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 86400000;
    const inRange = (iso: string) => new Date(iso).getTime() >= cutoff;
    const recs = records.filter((r) => (wh === "all" || r.warehouseId === wh) && inRange(r.lastUpdated));
    const recIds = new Set(recs.map((r) => r.id));
    const cands = candidates.filter((c) => (wh === "all" || recIds.has(c.recordAId) || recIds.has(c.recordBId)) && inRange(c.detectedAt));

    const dupRecordIds = new Set<string>();
    for (const c of cands) {
      if ((c.status === "high" || c.status === "possible") && c.reviewStatus !== "rejected") {
        if (wh === "all" || recIds.has(c.recordAId)) dupRecordIds.add(c.recordAId);
        if (wh === "all" || recIds.has(c.recordBId)) dupRecordIds.add(c.recordBId);
      }
    }
    const unmatched = recs.filter((r) => r.mappingStatus === "unmapped").length;

    // Stock availability across locations (all warehouses, for parts present in the selection)
    const partWh = new Map<string, Map<string, number>>();
    for (const r of records) {
      if (!r.standardPartId) continue;
      const avail = Math.max(0, r.quantity - r.reserved);
      if (!avail) continue;
      const m = partWh.get(r.standardPartId) ?? new Map<string, number>();
      m.set(r.warehouseId, (m.get(r.warehouseId) ?? 0) + avail);
      partWh.set(r.standardPartId, m);
    }
    const selectedParts = new Set(recs.map((r) => r.standardPartId).filter(Boolean) as string[]);
    let multiLocParts = 0;
    let multiLocUnits = 0;
    for (const [pid, m] of partWh) {
      if (!selectedParts.has(pid) || m.size < 2) continue;
      multiLocParts++;
      for (const [w, q] of m) if (wh === "all" || w !== wh) multiLocUnits += q;
    }

    const fc = forecastItems.filter((f) => wh === "all" || f.warehouseId === wh);
    const reorderReview = fc.filter((f) => f.decision === "pending" && recommendReorder(f).needsReorder).length;

    const mapping = [
      { name: "Verified", value: recs.filter((r) => r.mappingStatus === "verified").length, color: COLORS.emerald },
      { name: "AI-suggested", value: recs.filter((r) => r.mappingStatus === "ai-suggested").length, color: COLORS.sky },
      { name: "Unmatched", value: unmatched, color: COLORS.amber },
    ];

    const statusOrder = ["high", "possible", "conflict", "none"] as const;
    const statusLabels = { high: "High confidence", possible: "Possible", conflict: "Conflicting", none: "No match" };
    const byStatus = statusOrder.map((s) => {
      const list = cands.filter((c) => c.status === s);
      return {
        name: statusLabels[s],
        Pending: list.filter((c) => c.reviewStatus === "pending").length,
        Approved: list.filter((c) => c.reviewStatus === "approved").length,
        Rejected: list.filter((c) => c.reviewStatus === "rejected").length,
        Flagged: list.filter((c) => c.reviewStatus === "flagged").length,
      };
    });

    // weekly throughput (last 12 weeks)
    const weeks = Array.from({ length: 12 }, (_, i) => {
      const end = Date.now() - (11 - i) * 7 * 86400000;
      const start = end - 7 * 86400000;
      const reviewed = cands.filter((c) => c.reviewedAt && new Date(c.reviewedAt).getTime() > start && new Date(c.reviewedAt).getTime() <= end);
      const detected = cands.filter((c) => new Date(c.detectedAt).getTime() > start && new Date(c.detectedAt).getTime() <= end);
      return {
        week: new Date(end).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        Reviewed: reviewed.length,
        Detected: detected.length,
      };
    });

    const byWarehouse = WAREHOUSES.map((w) => {
      const list = records.filter((r) => r.warehouseId === w.id);
      return {
        name: w.code,
        value: Math.round(list.reduce((s, r) => s + r.quantity * r.unitPrice, 0)),
        records: list.length,
        unmatched: list.filter((r) => r.mappingStatus === "unmapped").length,
      };
    });

    const reviewed = cands.filter((c) => c.reviewStatus !== "pending").length;
    const recent = cands
      .filter((c) => c.status !== "none")
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
      .slice(0, 6);

    return {
      recs,
      cands,
      dupCount: dupRecordIds.size,
      unmatched,
      multiLocParts,
      multiLocUnits,
      reorderReview,
      mapping,
      byStatus,
      weeks,
      byWarehouse,
      reviewed,
      recent,
      acts: activities.filter((a) => inRange(a.ts)).slice(0, 7),
      pendingMatches: cands.filter((c) => c.reviewStatus === "pending" && c.status !== "none").length,
    };
  }, [records, candidates, forecastItems, activities, wh, range]);

  const reconciledPct = data.recs.length ? Math.round((data.mapping[0].value / data.recs.length) * 100) : 0;
  const reviewPct = data.cands.length ? Math.round((data.reviewed / data.cands.length) * 100) : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Inventory intelligence"
        title="Dashboard"
        description="Duplicate detection, reconciliation progress and stock availability across your warehouse network."
        actions={
          <>
            <WarehouseSelect value={wh} onChange={setWh} />
            <DateRangeSelect value={range} onChange={setRange} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total inventory records" value={fmtNumber(data.recs.length)} icon={Boxes} sub={`${fmtNumber(new Set(data.recs.map((r) => r.standardPartId).filter(Boolean)).size)} catalogue master parts`} />
        <StatCard label="Potential duplicate records" value={fmtNumber(data.dupCount)} icon={Copy} tone="amber" sub="High-confidence & possible matches" footer={<Link to="/app/matching" className="font-medium text-amber-700 hover:underline">Review {data.pendingMatches} pending →</Link>} />
        <StatCard label="Unmatched catalogue entries" value={fmtNumber(data.unmatched)} icon={HelpCircle} tone="red" sub="No confident catalogue mapping" footer={<Link to="/app/catalogue?mapping=unmapped" className="font-medium text-red-600 hover:underline">Investigate →</Link>} />
        <StatCard label="Total warehouses" value={wh === "all" ? WAREHOUSES.length : 1} icon={WarehouseIcon} tone="steel" sub={wh === "all" ? "Across 7 regions" : WAREHOUSES.find((w) => w.id === wh)?.name} />
        <StatCard label="Stock available across locations" value={fmtNumber(data.multiLocUnits)} icon={PackageSearch} tone="emerald" sub={`${data.multiLocParts} parts stocked at 2+ sites`} footer={<Link to="/app/discovery" className="font-medium text-emerald-700 hover:underline">Discover stock →</Link>} />
        <StatCard label="Parts requiring reorder review" value={data.reorderReview} icon={TrendingUp} tone="sky" sub="Below simulated reorder point" footer={<Link to="/app/forecasting" className="font-medium text-sky-700 hover:underline">Review suggestions →</Link>} />
      </div>

      {/* Workflow strip */}
      <Card className="mt-6 overflow-hidden">
        <div className="grid divide-y md:grid-cols-4 md:divide-x md:divide-y-0">
          {[
            { step: 1, label: "Import inventory", value: `${data.recs.length} records`, to: "/app/import", icon: FileUp },
            { step: 2, label: "Review matches", value: `${reviewPct}% reviewed`, to: "/app/matching", icon: GitCompareArrows, progress: reviewPct },
            { step: 3, label: "Discover stock", value: `${data.multiLocParts} multi-site parts`, to: "/app/discovery", icon: ScanSearch },
            { step: 4, label: "Review reorders", value: `${data.reorderReview} awaiting planner`, to: "/app/forecasting", icon: TrendingUp },
          ].map((s) => (
            <Link key={s.step} to={s.to} className="group flex items-center gap-3 p-4 transition-colors hover:bg-steel-50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-900 font-mono text-sm font-bold text-amber-400">{s.step}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-navy-900">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.value}</div>
                {s.progress !== undefined && (
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-steel-100">
                    <div className="h-full bg-amber-500" style={{ width: `${s.progress}%` }} />
                  </div>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-steel-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Inventory reconciliation</CardTitle>
            <CardDescription>Catalogue mapping status of records in scope</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-[200px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.mapping} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={2} stroke="none">
                    {data.mapping.map((m) => (
                      <Cell key={m.name} fill={m.color} />
                    ))}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-navy-900">{reconciledPct}%</div>
                <div className="text-xs text-muted-foreground">verified</div>
              </div>
            </div>
            <div className="mt-2 space-y-2">
              {data.mapping.map((m) => (
                <div key={m.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
                    {m.name}
                  </span>
                  <span className="font-mono tabular-nums">{fmtNumber(m.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Match suggestions by status</CardTitle>
              <CardDescription>Review outcomes for AI-suggested relationships</CardDescription>
            </div>
            <MockBadge label="Mock matcher" />
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer>
              <BarChart data={data.byStatus} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <RTooltip cursor={{ fill: "#f6f7f9" }} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Pending" stackId="a" fill={COLORS.steel} />
                <Bar dataKey="Approved" stackId="a" fill={COLORS.emerald} />
                <Bar dataKey="Flagged" stackId="a" fill={COLORS.amber} />
                <Bar dataKey="Rejected" stackId="a" fill={COLORS.navy} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Matching throughput</CardTitle>
            <CardDescription>Suggestions detected vs. reviewed by specialists, last 12 weeks</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer>
              <AreaChart data={data.weeks} margin={{ left: -16, right: 8 }}>
                <defs>
                  <linearGradient id="gDet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.amber} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COLORS.amber} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.navy} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COLORS.navy} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                <RTooltip />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Detected" stroke={COLORS.amber} fill="url(#gDet)" strokeWidth={2} />
                <Area type="monotone" dataKey="Reviewed" stroke={COLORS.navy} fill="url(#gRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Imports, matching runs and decisions</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {data.acts.map((a) => {
                const Icon = ACT_ICON[a.type];
                return (
                  <li key={a.id} className="flex gap-3">
                    <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md", a.type === "match" ? "bg-violet-50 text-violet-600" : "bg-steel-100 text-steel-600")}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm leading-snug text-navy-900">{a.message}</p>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {a.user} · {fmtDateTime(a.ts)}
                      </div>
                    </div>
                  </li>
                );
              })}
              {!data.acts.length && <p className="text-sm text-muted-foreground">No activity in this period.</p>}
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Recent matching activity</CardTitle>
              <CardDescription>Latest suggestions from the matching engine</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/matching">Open review queue</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.recent.map((c) => {
                const a = recordById.get(c.recordAId);
                const b = recordById.get(c.recordBId);
                if (!a || !b) return null;
                return (
                  <Link key={c.id} to={`/app/matching?id=${c.id}`} className="flex flex-col gap-2 px-5 py-3 hover:bg-steel-50 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-navy-900">{a.description}</div>
                      <div className="truncate text-xs text-muted-foreground">↔ {b.description}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MatchStatusBadge status={c.status} />
                      <span className="w-10 text-right font-mono text-xs font-semibold">{Math.round(c.score * 100)}%</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Records by warehouse</CardTitle>
            <CardDescription>Inventory value on hand (USD) and unmatched entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.byWarehouse.map((w) => {
                const max = Math.max(...data.byWarehouse.map((x) => x.value));
                return (
                  <div key={w.name} className={cn("text-sm", wh !== "all" && WAREHOUSES.find((x) => x.code === w.name)?.id !== wh && "opacity-40")}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-xs font-medium">{w.name}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {w.records} records
                        {w.unmatched > 0 && <Badge variant="warning">{w.unmatched} unmatched</Badge>}
                        <span className="w-16 text-right font-mono text-foreground">{fmtCurrency(w.value, true)}</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-steel-100">
                      <div className="h-full rounded-full bg-navy-700" style={{ width: `${(w.value / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
