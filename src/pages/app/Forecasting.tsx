import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { AlertTriangle, CalendarClock, Check, Clock, Cpu, MapPin, PackageCheck, PauseCircle, ScanSearch, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WarehouseSelect } from "@/components/shared/Filters";
import { MockBadge, RiskBadge } from "@/components/shared/Indicators";
import { Notice } from "@/components/shared/Notice";
import { useAppStore } from "@/hooks/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { warehouseById } from "@/data/catalogue";
import { forecastProvider, PATTERN_META, recommendReorder, SageMakerForecastProvider, type ReorderRecommendation } from "@/services/ai/forecasting";
import { cn, fmtCurrency } from "@/lib/utils";
import type { DemandPattern, ForecastItem, ReorderDecision, RiskLevel } from "@/types";

const MONTHS = (() => {
  const out: string[] = [];
  const end = new Date(2026, 9, 1); // Oct 2026 = last full month
  for (let i = 23; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    out.push(d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }));
  }
  for (let i = 1; i <= 6; i++) {
    const d = new Date(end.getFullYear(), end.getMonth() + i, 1);
    out.push(d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }));
  }
  return out;
})();

const PATTERN_TONE: Record<DemandPattern, string> = {
  smooth: "border-emerald-200 bg-emerald-50 text-emerald-700",
  intermittent: "border-sky-200 bg-sky-50 text-sky-700",
  lumpy: "border-violet-200 bg-violet-50 text-violet-700",
  erratic: "border-amber-200 bg-amber-50 text-amber-800",
};

const DECISION_BADGE: Record<ReorderDecision, { v: "neutral" | "success" | "danger" | "warning"; l: string }> = {
  pending: { v: "neutral", l: "Awaiting planner" },
  approved: { v: "success", l: "Approved" },
  rejected: { v: "danger", l: "Rejected" },
  deferred: { v: "warning", l: "Deferred" },
};

export default function Forecasting() {
  const { forecastItems, records } = useAppStore();
  const [wh, setWh] = useState("all");
  const [risk, setRisk] = useState<RiskLevel | "all">("all");
  const [pattern, setPattern] = useState<DemandPattern | "all">("all");
  const [decision, setDecision] = useState<ReorderDecision | "all">("pending");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      forecastItems.map((f) => {
        const rec = recommendReorder(f);
        const network = records.filter((r) => r.standardPartId === f.standardPartId && r.warehouseId !== f.warehouseId);
        const networkAvail = network.reduce((s, r) => s + Math.max(0, r.quantity - r.reserved), 0);
        return { f, rec, network, networkAvail };
      }),
    [forecastItems, records],
  );

  const filtered = rows
    .filter(({ f, rec }) => (wh === "all" || f.warehouseId === wh) && (risk === "all" || rec.risk === risk) && (pattern === "all" || rec.forecast.pattern === pattern) && (decision === "all" || f.decision === decision))
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a.rec.risk] - ({ high: 0, medium: 1, low: 2 })[b.rec.risk] || b.rec.suggestedQty - a.rec.suggestedQty);

  const pendingSuggestions = rows.filter((r) => r.f.decision === "pending" && r.rec.needsReorder);
  const highRisk = rows.filter((r) => r.rec.risk === "high").length;
  const value = pendingSuggestions.reduce((s, r) => s + r.rec.suggestedQty * r.f.unitPrice, 0);
  const coverable = pendingSuggestions.filter((r) => r.networkAvail > 0).length;

  const active = rows.find((r) => r.f.id === open);

  return (
    <div>
      <PageHeader
        eyebrow="Step 4 · Core workflow"
        title="Demand forecasting & reorder review"
        description="Consumption history, stock levels and lead times drive reorder suggestions designed for intermittent spare-parts demand. Every suggestion awaits planner approval."
        actions={
          <>
            <MockBadge label="Simulated forecasts" />
            <WarehouseSelect value={wh} onChange={setWh} />
          </>
        }
      />

      <Notice tone="warning" title="Simulated forecasts" className="mb-6">
        Forecasts are computed in your browser with Croston (SBA) and exponential smoothing on demonstration data. They are clearly labelled simulations — the production path uses an Amazon SageMaker AI endpoint behind the same{" "}
        <span className="font-mono text-xs">DemandForecastProvider</span> interface.
      </Notice>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Reorder suggestions awaiting review" value={pendingSuggestions.length} icon={TrendingUp} tone="sky" sub="Below simulated reorder point" />
        <StatCard label="Potential stockout risk" value={highRisk} icon={AlertTriangle} tone="red" sub="Position below lead-time demand" />
        <StatCard label="Suggestions coverable from network" value={coverable} icon={ScanSearch} tone="emerald" sub="Stock found at other warehouses" />
        <StatCard label="Value of suggested orders" value={fmtCurrency(value, true)} icon={PackageCheck} tone="amber" sub="Estimate at catalogue prices" />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <Select value={decision} onValueChange={(v) => setDecision(v as ReorderDecision | "all")}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Awaiting planner</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="deferred">Deferred</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All decisions</SelectItem>
            </SelectContent>
          </Select>
          <Select value={risk} onValueChange={(v) => setRisk(v as RiskLevel | "all")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk levels</SelectItem>
              <SelectItem value="high">High risk</SelectItem>
              <SelectItem value="medium">Medium risk</SelectItem>
              <SelectItem value="low">Low risk</SelectItem>
            </SelectContent>
          </Select>
          <Select value={pattern} onValueChange={(v) => setPattern(v as DemandPattern | "all")}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All demand patterns</SelectItem>
              {(Object.keys(PATTERN_META) as DemandPattern[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PATTERN_META[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} items</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[260px]">Part</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Demand pattern</TableHead>
              <TableHead className="text-right">Avg / month</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">On order</TableHead>
              <TableHead className="text-right">Lead time</TableHead>
              <TableHead className="text-right">Reorder pt.</TableHead>
              <TableHead className="text-right">Suggested</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Network stock</TableHead>
              <TableHead>Decision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(({ f, rec, networkAvail }) => (
              <TableRow key={f.id} className="cursor-pointer" onClick={() => setOpen(f.id)}>
                <TableCell>
                  <div className="max-w-[300px] truncate font-medium text-navy-900">{f.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {f.id} · {f.category} · Criticality {f.criticality}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{warehouseById(f.warehouseId)?.code}</TableCell>
                <TableCell>
                  <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs font-medium", PATTERN_TONE[rec.forecast.pattern])}>{PATTERN_META[rec.forecast.pattern].label}</span>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{rec.forecast.monthlyForecast.toFixed(1)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{rec.available}</TableCell>
                <TableCell className="text-right font-mono text-xs">{f.onOrder}</TableCell>
                <TableCell className="text-right font-mono text-xs">{f.leadTimeDays}d</TableCell>
                <TableCell className="text-right font-mono text-xs">{rec.reorderPoint}</TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">{rec.suggestedQty || <span className="text-steel-400">—</span>}</TableCell>
                <TableCell>
                  <RiskBadge risk={rec.risk} />
                </TableCell>
                <TableCell>{networkAvail > 0 ? <Badge variant="success">{networkAvail} elsewhere</Badge> : <span className="text-xs text-muted-foreground">None found</span>}</TableCell>
                <TableCell>
                  <Badge variant={DECISION_BADGE[f.decision].v}>{DECISION_BADGE[f.decision].l}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length && <div className="p-10 text-center text-sm text-muted-foreground">No items match these filters.</div>}
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-4 w-4" /> Forecast providers
          </CardTitle>
          <CardDescription>Swappable implementations of the forecasting interface</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{forecastProvider.label}</div>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Syntetos–Boylan classification (ADI / CV²). Croston SBA for intermittent & lumpy demand; simple exponential smoothing otherwise.</p>
          </div>
          <div className="rounded-lg border border-dashed p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{new SageMakerForecastProvider().label}</div>
              <Badge variant="neutral">Planned</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">API Gateway → Lambda → SageMaker runtime endpoint for intermittent-demand models, with monthly batch re-forecasts.</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => !o && setOpen(null)}>
        {active && <ForecastDetail item={active.f} rec={active.rec} networkAvail={active.networkAvail} network={active.network} onClose={() => setOpen(null)} />}
      </Dialog>
    </div>
  );
}

function ForecastDetail({ item: f, rec, networkAvail, network, onClose }: { item: ForecastItem; rec: ReorderRecommendation; networkAvail: number; network: { id: string; warehouseId: string; quantity: number; reserved: number; mappingStatus: string }[]; onClose: () => void }) {
  const { dispatch } = useAppStore();
  const { user } = useAuth();
  const [qty, setQty] = useState(String(rec.suggestedQty || f.moq));
  const [note, setNote] = useState("");

  const chart = MONTHS.map((m, i) => {
    if (i < 24) return { month: m, Consumption: f.history[i] };
    const k = i - 24;
    return { month: m, Forecast: rec.forecast.horizon[k], band: [rec.forecast.lower[k], rec.forecast.upper[k]] as [number, number] };
  });

  const decide = (d: ReorderDecision) => {
    if ((d === "rejected" || d === "deferred") && note.trim().length < 3) {
      toast.error("Add a short reason", { description: "Rejections and deferrals need a note for the audit trail." });
      return;
    }
    dispatch({ type: "forecastDecision", id: f.id, decision: d, user: user?.name ?? "Unknown", note: note.trim() || undefined, qty: d === "approved" ? Number(qty) : undefined });
    toast.success(d === "approved" ? `Approved reorder of ${qty} ${f.moq > 1 ? "units" : "unit(s)"}` : d === "deferred" ? "Reorder deferred" : "Suggestion rejected", {
      description: d === "approved" ? "Demo only — no purchase order was created." : undefined,
    });
    onClose();
  };

  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle className="pr-6">{f.name}</DialogTitle>
        <DialogDescription className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{f.id}</span>· {warehouseById(f.warehouseId)?.name} · <MockBadge label="Simulated" />
        </DialogDescription>
      </DialogHeader>

      <div className="h-[260px]">
        <ResponsiveContainer>
          <ComposedChart data={chart} margin={{ left: -20, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} interval={2} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <RTooltip />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            <Area dataKey="band" name="Forecast range" fill="#f59e0b" fillOpacity={0.15} stroke="none" />
            <Bar dataKey="Consumption" fill="#3f5a85" radius={[2, 2, 0, 0]} />
            <Line dataKey="Forecast" stroke="#d97706" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
            <ReferenceLine x={MONTHS[24]} stroke="#94a3b8" strokeDasharray="2 2" label={{ value: "Forecast →", fontSize: 10, fill: "#64748b", position: "insideTopLeft" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Demand pattern", PATTERN_META[rec.forecast.pattern].label, `ADI ${rec.forecast.adi.toFixed(2)} · CV² ${rec.forecast.cv2.toFixed(2)}`],
          ["Method", rec.forecast.method, `${rec.forecast.monthlyForecast.toFixed(2)} units / month`],
          ["Supplier lead time", `${f.leadTimeDays} days`, `${rec.demandDuringLeadTime.toFixed(1)} units during lead time`],
          ["Months of cover", rec.monthsOfCover >= 99 ? "—" : rec.monthsOfCover.toFixed(1), `${rec.available} available · ${f.onOrder} on order`],
        ].map(([k, v, s]) => (
          <div key={k} className="rounded-lg border p-3">
            <div className="text-[11px] text-muted-foreground">{k}</div>
            <div className="mt-0.5 font-semibold text-navy-900">{v}</div>
            <div className="text-[11px] text-muted-foreground">{s}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-steel-50/60 p-4 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">Reorder calculation</span>
            <RiskBadge risk={rec.risk} />
          </div>
          <dl className="space-y-1 font-mono text-xs">
            {[
              ["Inventory position", `${rec.position}`],
              ["Safety stock (criticality " + f.criticality + ")", rec.safetyStock.toFixed(1)],
              ["Reorder point", `${rec.reorderPoint}`],
              ["Minimum order qty", `${f.moq}`],
              ["Suggested quantity", `${rec.suggestedQty}`],
              ["Estimated value", fmtCurrency(rec.suggestedQty * f.unitPrice)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="font-sans text-muted-foreground">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className={cn("rounded-lg border p-4 text-sm", networkAvail > 0 ? "border-emerald-200 bg-emerald-50/60" : "bg-white")}>
          <div className="flex items-center gap-2 font-semibold">
            <MapPin className="h-4 w-4" /> Stock elsewhere in the network
          </div>
          {networkAvail > 0 ? (
            <>
              <p className="mt-1 text-emerald-900">{networkAvail} units of this catalogue part are available at other warehouses. Consider a transfer before ordering.</p>
              <ul className="mt-2 space-y-1 text-xs">
                {network
                  .filter((r) => r.quantity - r.reserved > 0)
                  .map((r) => (
                    <li key={r.id} className="flex justify-between">
                      <span>
                        {warehouseById(r.warehouseId)?.name} <span className="text-muted-foreground">({r.mappingStatus === "verified" ? "verified mapping" : "AI-suggested — verify"})</span>
                      </span>
                      <span className="font-mono font-semibold">{r.quantity - r.reserved}</span>
                    </li>
                  ))}
              </ul>
              <Button asChild variant="link" size="sm" className="mt-1 h-auto px-0 text-emerald-800">
                <Link to={`/app/discovery?q=${encodeURIComponent(f.name.split(",").slice(0, 4).join(" "))}`}>Open in stock discovery →</Link>
              </Button>
            </>
          ) : (
            <p className="mt-1 text-muted-foreground">No mapped stock found at other warehouses.</p>
          )}
        </div>
      </div>

      {f.decision === "pending" ? (
        <div className="space-y-3 border-t pt-4">
          <div className="grid gap-3 md:grid-cols-[160px_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="qty">Order quantity</Label>
              <Input id="qty" type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pnote">Planner note</Label>
              <Textarea id="pnote" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Required when deferring or rejecting, e.g. transfer 4 units from Warri instead." />
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => decide("rejected")}>
              <X /> Reject
            </Button>
            <Button variant="outline" onClick={() => decide("deferred")}>
              <PauseCircle /> Defer
            </Button>
            <Button variant="success" disabled={!Number(qty)} onClick={() => decide("approved")}>
              <Check /> Approve {qty} for ordering
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Suggestions are advisory. Approval records the planner's decision; purchase orders are raised in your ERP.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between border-t pt-4 text-sm">
          <span className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            Decision: <Badge variant={DECISION_BADGE[f.decision].v}>{DECISION_BADGE[f.decision].l}</Badge>
            {f.decisionNote && <span className="text-muted-foreground">— {f.decisionNote}</span>}
          </span>
          <Button variant="outline" size="sm" onClick={() => { dispatch({ type: "forecastDecision", id: f.id, decision: "pending", user: user?.name ?? "Unknown" }); onClose(); }}>
            Reopen
          </Button>
        </div>
      )}
    </DialogContent>
  );
}
