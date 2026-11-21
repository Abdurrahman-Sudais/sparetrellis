import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Filter,
  Flag,
  GitCompareArrows,
  Lightbulb,
  MapPin,
  RotateCcw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfidenceMeter, MatchStatusBadge, MockBadge, ReviewStatusBadge } from "@/components/shared/Indicators";
import { Notice } from "@/components/shared/Notice";
import { EmptyState } from "@/components/shared/EmptyState";
import { WarehouseSelect } from "@/components/shared/Filters";
import { Pagination } from "@/components/shared/Pagination";
import { useAppStore } from "@/hooks/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { warehouseById } from "@/data/catalogue";
import { matchingProvider } from "@/services/ai/matching";
import { cn, fmtCurrency, fmtDate, fmtDateTime } from "@/lib/utils";
import type { InventoryRecord, MatchCandidate, MatchStatus, RelationshipType, ReviewStatus } from "@/types";

type Decision = { kind: "approve" | "reject" | "flag"; ids: string[] } | null;
const PAGE = 25;

export default function Matching() {
  const { candidates, recordById, dispatch } = useAppStore();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<ReviewStatus | "all">("pending");
  const [status, setStatus] = useState<MatchStatus | "all">("all");
  const [wh, setWh] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [decision, setDecision] = useState<Decision>(null);
  const activeId = params.get("id");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return candidates
      .filter((c) => (tab === "all" ? true : c.reviewStatus === tab))
      .filter((c) => (status === "all" ? true : c.status === status))
      .filter((c) => {
        const a = recordById.get(c.recordAId);
        const b = recordById.get(c.recordBId);
        if (!a || !b) return false;
        if (wh !== "all" && a.warehouseId !== wh && b.warehouseId !== wh) return false;
        if (!needle) return true;
        return [a.description, b.description, a.partNumber, b.partNumber, a.manufacturer, b.manufacturer, c.id].some((s) => s.toLowerCase().includes(needle));
      })
      .sort((x, y) => {
        const rank = { high: 0, possible: 1, conflict: 2, none: 3 };
        return rank[x.status] - rank[y.status] || y.score - x.score;
      });
  }, [candidates, recordById, tab, status, wh, q]);

  useEffect(() => { setPage(0); }, [tab, status, wh, q]);

  const active = useMemo(() => candidates.find((c) => c.id === activeId) ?? filtered[0], [candidates, activeId, filtered]);
  const pageItems = filtered.slice(page * PAGE, (page + 1) * PAGE);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, flagged: 0, all: candidates.length };
    for (const x of candidates) c[x.reviewStatus]++;
    return c;
  }, [candidates]);

  const select = (id: string) => {
    params.set("id", id);
    setParams(params, { replace: true });
    if (window.innerWidth < 1280) document.getElementById("match-detail")?.scrollIntoView({ behavior: "smooth" });
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const selectedList = candidates.filter((c) => selected.has(c.id));
  const bulkApprovable = selectedList.length > 0 && selectedList.every((c) => c.status === "high");

  const commitDecision = (kind: "approve" | "reject" | "flag", ids: string[], relationship?: RelationshipType, note?: string) => {
    const statusMap = { approve: "approved", reject: "rejected", flag: "flagged" } as const;
    dispatch({ type: "review", ids, status: statusMap[kind], user: user?.name ?? "Unknown", relationship, note });
    setSelected(new Set());
    setDecision(null);
    toast.success(
      kind === "approve" ? `Relationship approved${ids.length > 1 ? ` for ${ids.length} pairs` : ""}` : kind === "reject" ? `Suggestion rejected${ids.length > 1 ? ` (${ids.length})` : ""}` : `Flagged for engineering review${ids.length > 1 ? ` (${ids.length})` : ""}`,
      { description: kind === "approve" ? "Records were linked, not merged. Both originals are retained." : "Decision recorded in the audit trail." },
    );
    // advance to next pending item
    if (ids.length === 1 && tab === "pending") {
      const idx = filtered.findIndex((c) => c.id === ids[0]);
      const next = filtered[idx + 1] ?? filtered[idx - 1];
      if (next) {
        params.set("id", next.id);
        setParams(params, { replace: true });
      }
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Step 2 · Core workflow"
        title="AI matching review"
        description="Review relationships suggested by the matching engine. Approve, reject or flag each pair — nothing is merged and no part is treated as interchangeable without your verification."
        actions={<MockBadge label={matchingProvider.label} />}
      />

      <Notice tone="guard" title="Human verification required" className="mb-6">
        Similar descriptions do not establish technical compatibility. Approving a <em>duplicate record</em> links two records describing the same catalogue item; both records are retained. Cross-manufacturer
        equivalence must be confirmed by engineering before any substitution.
      </Notice>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReviewStatus | "all")}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="pending">Awaiting review ({counts.pending})</TabsTrigger>
          <TabsTrigger value="flagged">Flagged ({counts.flagged})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(380px,460px)_1fr]">
        {/* Queue */}
        <Card className="flex flex-col overflow-hidden xl:max-h-[calc(100vh-150px)] xl:sticky xl:top-20">
          <div className="space-y-2 border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by description, part number, ID…" className="h-8 pl-8 text-sm" />
            </div>
            <div className="flex gap-2">
              <Select value={status} onValueChange={(v) => setStatus(v as MatchStatus | "all")}>
                <SelectTrigger className="h-8 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-steel-500" />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="high">High-confidence match</SelectItem>
                  <SelectItem value="possible">Possible match</SelectItem>
                  <SelectItem value="conflict">Conflicting information</SelectItem>
                  <SelectItem value="none">No match</SelectItem>
                </SelectContent>
              </Select>
              <WarehouseSelect value={wh} onChange={setWh} className="h-8 w-full text-xs" />
            </div>
          </div>
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b bg-amber-50 px-3 py-2 text-xs">
              <span className="font-medium">{selected.size} selected</span>
              <div className="ml-auto flex gap-1.5">
                <Button size="sm" variant="success" className="h-7" disabled={!bulkApprovable} title={bulkApprovable ? "" : "Bulk approval is limited to high-confidence matches"} onClick={() => setDecision({ kind: "approve", ids: [...selected] })}>
                  <Check /> Approve
                </Button>
                <Button size="sm" variant="outline" className="h-7" onClick={() => setDecision({ kind: "reject", ids: [...selected] })}>
                  <X /> Reject
                </Button>
                <Button size="sm" variant="outline" className="h-7" onClick={() => setDecision({ kind: "flag", ids: [...selected] })}>
                  <Flag /> Flag
                </Button>
              </div>
            </div>
          )}
          <div className="scrollbar-thin flex-1 divide-y overflow-y-auto">
            {pageItems.length === 0 && <EmptyState icon={CheckCircle2} title="Queue clear" description="No suggestions match these filters." />}
            {pageItems.map((c) => {
              const a = recordById.get(c.recordAId)!;
              const b = recordById.get(c.recordBId)!;
              const isActive = active?.id === c.id;
              return (
                <div key={c.id} className={cn("flex gap-3 px-3 py-3 transition-colors", isActive ? "bg-amber-50/70 shadow-[inset_3px_0_0_0_#f59e0b]" : "hover:bg-steel-50")}>
                  <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} className="mt-1" aria-label={`Select ${c.id}`} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => select(c.id)}>
                    <div className="flex items-center justify-between gap-2">
                      <MatchStatusBadge status={c.status} className="text-[10px]" />
                      <span className="font-mono text-xs font-semibold tabular-nums">{Math.round(c.score * 100)}%</span>
                    </div>
                    <div className="mt-1.5 truncate text-sm font-medium text-navy-900">{a.description}</div>
                    <div className="truncate text-xs text-muted-foreground">↔ {b.description}</div>
                    <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-steel-500">
                      <span>{c.id}</span>·<span>{warehouseById(a.warehouseId)?.code}</span>
                      <ArrowLeftRight className="h-2.5 w-2.5" />
                      <span>{warehouseById(b.warehouseId)?.code}</span>
                      {c.reviewStatus !== "pending" && <span className="ml-auto font-sans"><ReviewStatusBadge status={c.reviewStatus} /></span>}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
          <Pagination page={page} pageSize={PAGE} total={filtered.length} onPage={setPage} />
        </Card>

        {/* Detail */}
        <div id="match-detail" className="min-w-0">
          {active ? (
            <MatchDetail candidate={active} a={recordById.get(active.recordAId)!} b={recordById.get(active.recordBId)!} onDecide={(kind) => setDecision({ kind, ids: [active.id] })} onReopen={() => dispatch({ type: "review", ids: [active.id], status: "pending", user: user?.name ?? "Unknown" })} />
          ) : (
            <Card>
              <EmptyState icon={GitCompareArrows} title="Select a suggestion" description="Choose a pair from the queue to compare records side by side." />
            </Card>
          )}
        </div>
      </div>

      <DecisionDialog decision={decision} candidates={candidates} onClose={() => setDecision(null)} onConfirm={commitDecision} />
    </div>
  );
}

const FIELDS: { key: keyof InventoryRecord; label: string; render?: (r: InventoryRecord) => string }[] = [
  { key: "partNumber", label: "Part number" },
  { key: "description", label: "Description" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "equipmentRef", label: "Equipment ref." },
  { key: "category", label: "Category" },
  { key: "uom", label: "Unit" },
  { key: "quantity", label: "On hand", render: (r) => `${r.quantity} (${r.reserved} reserved)` },
  { key: "warehouseId", label: "Warehouse", render: (r) => warehouseById(r.warehouseId)?.name ?? r.warehouseId },
  { key: "supplier", label: "Supplier" },
  { key: "unitPrice", label: "Unit price", render: (r) => fmtCurrency(r.unitPrice) },
  { key: "source", label: "Source" },
  { key: "lastUpdated", label: "Last updated", render: (r) => fmtDate(r.lastUpdated) },
];

function MatchDetail({ candidate: c, a, b, onDecide, onReopen }: { candidate: MatchCandidate; a: InventoryRecord; b: InventoryRecord; onDecide: (k: "approve" | "reject" | "flag") => void; onReopen: () => void }) {
  const breakdown = useMemo(() => matchingProvider.compare(a, b).components, [a, b]);
  const critical = c.conflicting.filter((x) => x.severity === "critical");
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{c.id}</span>
              <MatchStatusBadge status={c.status} />
              <ReviewStatusBadge status={c.reviewStatus} />
              {c.relationship && <Badge variant="outline">{c.relationship === "verified-equivalent" ? "Verified equivalent" : "Duplicate record"}</Badge>}
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Similarity score</div>
                <ConfidenceMeter score={c.score} className="mt-1" showLabel />
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-xs text-muted-foreground">
                Detected {fmtDateTime(c.detectedAt)}
                {c.reviewer && (
                  <div className="mt-0.5">
                    Reviewed by <span className="font-medium text-foreground">{c.reviewer}</span> · {c.reviewedAt && fmtDateTime(c.reviewedAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.reviewStatus === "pending" || c.reviewStatus === "flagged" ? (
              <>
                <Button variant="success" onClick={() => onDecide("approve")}>
                  <Check /> Approve
                </Button>
                <Button variant="outline" onClick={() => onDecide("reject")}>
                  <X /> Reject
                </Button>
                {c.reviewStatus !== "flagged" && (
                  <Button variant="outline" onClick={() => onDecide("flag")}>
                    <Flag /> Flag
                  </Button>
                )}
              </>
            ) : (
              <Button variant="outline" onClick={onReopen}>
                <RotateCcw /> Reopen
              </Button>
            )}
          </div>
        </div>
        {c.note && (
          <div className="border-t bg-steel-50/60 px-5 py-3 text-sm">
            <span className="font-medium">Reviewer note:</span> {c.note}
          </div>
        )}
      </Card>

      {/* Records side by side */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[110px_1fr_1fr] border-b bg-steel-50 text-[11px] font-semibold uppercase tracking-wider text-steel-500 md:grid-cols-[150px_1fr_1fr]">
          <div className="px-4 py-2.5">Attribute</div>
          <div className="flex items-center gap-1.5 border-l px-4 py-2.5">
            <span className="h-2 w-2 rounded-full bg-navy-700" /> Original record
          </div>
          <div className="flex items-center gap-1.5 border-l px-4 py-2.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Suggested match
          </div>
        </div>
        <div className="grid grid-cols-[110px_1fr_1fr] border-b text-xs md:grid-cols-[150px_1fr_1fr]">
          <div className="px-4 py-2 text-muted-foreground">Record ID</div>
          <div className="border-l px-4 py-2 font-mono">{a.id}</div>
          <div className="border-l px-4 py-2 font-mono">{b.id}</div>
        </div>
        {FIELDS.map((f) => {
          const va = f.render ? f.render(a) : String(a[f.key] ?? "");
          const vb = f.render ? f.render(b) : String(b[f.key] ?? "");
          const differs = va.toLowerCase() !== vb.toLowerCase() && !["quantity", "warehouseId", "lastUpdated", "source", "unitPrice", "supplier"].includes(f.key);
          return (
            <div key={f.key} className="grid grid-cols-[110px_1fr_1fr] border-b text-sm last:border-0 md:grid-cols-[150px_1fr_1fr]">
              <div className="px-4 py-2 text-xs text-muted-foreground">{f.label}</div>
              <div className={cn("break-words border-l px-4 py-2", f.key === "partNumber" && "font-mono text-xs", differs && "bg-amber-50/50")}>{va || <span className="text-steel-400">—</span>}</div>
              <div className={cn("break-words border-l px-4 py-2", f.key === "partNumber" && "font-mono text-xs", differs && "bg-amber-50/50")}>{vb || <span className="text-steel-400">—</span>}</div>
            </div>
          );
        })}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Matching attributes ({c.matching.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {c.matching.map((m, i) => (
              <div key={i} className="rounded-md border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm">
                <div className="font-medium text-emerald-900">{m.attribute}</div>
                <div className="mt-0.5 truncate text-xs text-emerald-800/80">
                  {m.a === m.b ? m.a : `${m.a}  ≈  ${m.b}`}
                </div>
                {m.note && <div className="mt-0.5 text-[11px] text-emerald-700">{m.note}</div>}
              </div>
            ))}
            {!c.matching.length && <p className="text-sm text-muted-foreground">No matching attributes.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" /> Conflicting attributes ({c.conflicting.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {c.conflicting.map((m, i) => (
              <div key={i} className={cn("rounded-md border px-3 py-2 text-sm", m.severity === "critical" ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60")}>
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("font-medium", m.severity === "critical" ? "text-red-900" : "text-amber-900")}>{m.attribute}</span>
                  <Badge variant={m.severity === "critical" ? "danger" : "warning"} className="text-[10px]">
                    {m.severity === "critical" ? "Critical" : "Needs review"}
                  </Badge>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                  <span className="truncate">
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-navy-700" />
                    {m.a || "—"}
                  </span>
                  <span className="truncate">
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {m.b || "—"}
                  </span>
                </div>
                {m.note && <div className="mt-1 text-[11px] opacity-80">{m.note}</div>}
              </div>
            ))}
            {!c.conflicting.length && <p className="text-sm text-muted-foreground">No conflicts detected. Still verify against the datasheet.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card className={cn("border-l-4", c.status === "conflict" ? "border-l-red-500" : c.status === "high" ? "border-l-emerald-500" : c.status === "possible" ? "border-l-sky-500" : "border-l-steel-400")}>
          <CardContent className="flex gap-3 p-5">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <div className="text-sm font-semibold text-navy-900">Recommended action</div>
              <p className="mt-1 text-sm text-steel-700">{c.recommendedAction}</p>
              {critical.length > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-700">
                  <ShieldAlert className="h-3.5 w-3.5" /> {critical.length} critical specification conflict{critical.length > 1 ? "s" : ""} — these are likely different parts.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              Score breakdown <MockBadge />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {breakdown.map((b) => (
              <div key={b.label} className="grid grid-cols-[110px_1fr_40px] items-center gap-2 text-xs">
                <span className="text-muted-foreground">{b.label}</span>
                <div className="h-1.5 overflow-hidden rounded-full bg-steel-100">
                  {b.value !== null && <div className="h-full rounded-full bg-navy-700" style={{ width: `${b.value * 100}%` }} />}
                </div>
                <span className="text-right font-mono">{b.value === null ? "n/a" : `${Math.round(b.value * 100)}%`}</span>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-muted-foreground">Weighted mock score with penalties for critical conflicts. n/a = attribute unavailable (e.g. internal stock code).</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        {warehouseById(a.warehouseId)?.name} ↔ {warehouseById(b.warehouseId)?.name}
      </div>
    </div>
  );
}

function DecisionDialog({
  decision,
  candidates,
  onClose,
  onConfirm,
}: {
  decision: Decision;
  candidates: MatchCandidate[];
  onClose: () => void;
  onConfirm: (kind: "approve" | "reject" | "flag", ids: string[], relationship?: RelationshipType, note?: string) => void;
}) {
  const [relationship, setRelationship] = useState<RelationshipType>("duplicate-record");
  const [note, setNote] = useState("");
  const [attest, setAttest] = useState(false);
  const list = decision ? candidates.filter((c) => decision.ids.includes(c.id)) : [];
  const hasConflict = list.some((c) => c.status === "conflict");
  const crossMfr = list.some((c) => c.conflicting.some((x) => x.attribute === "Manufacturer"));

  useEffect(() => {
    setNote("");
    setAttest(false);
    setRelationship(crossMfr ? "verified-equivalent" : "duplicate-record");
  }, [decision, crossMfr]);

  if (!decision) return null;
  const { kind, ids } = decision;
  const noteRequired = kind === "flag" || (kind === "approve" && (relationship === "verified-equivalent" || hasConflict));
  const canConfirm = (!noteRequired || note.trim().length >= 5) && (kind !== "approve" || attest);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {kind === "approve" ? "Approve relationship" : kind === "reject" ? "Reject suggestion" : "Flag for engineering review"}
            {ids.length > 1 && ` · ${ids.length} pairs`}
          </DialogTitle>
          <DialogDescription>
            {kind === "approve"
              ? "Records will be linked, not merged. Both original records and their stock remain unchanged."
              : kind === "reject"
                ? "The pair will be recorded as distinct parts and won't be suggested again."
                : "The pair will be routed for technical verification. Explain what needs checking."}
          </DialogDescription>
        </DialogHeader>

        {kind === "approve" && (
          <div className="space-y-3">
            {hasConflict && (
              <Notice tone="warning" title="This suggestion has conflicting information">
                Critical specifications differ. Approve only if you've confirmed the conflict is a data-entry error, and record your evidence.
              </Notice>
            )}
            <div className="space-y-2">
              <Label>Relationship type</Label>
              {(
                [
                  { v: "duplicate-record", t: "Duplicate record", d: "Both records describe the same catalogue item (same manufacturer part)." },
                  { v: "verified-equivalent", t: "Verified equivalent", d: "Different items confirmed interchangeable by engineering. Requires a reference." },
                ] as const
              ).map((o) => (
                <label key={o.v} className={cn("flex cursor-pointer gap-3 rounded-lg border p-3", relationship === o.v && "border-amber-500 bg-amber-50/50 ring-1 ring-amber-500")}>
                  <input type="radio" name="rel" className="mt-1 accent-amber-600" checked={relationship === o.v} onChange={() => setRelationship(o.v)} />
                  <div>
                    <div className="text-sm font-medium">{o.t}</div>
                    <div className="text-xs text-muted-foreground">{o.d}</div>
                  </div>
                </label>
              ))}
              {crossMfr && relationship === "duplicate-record" && <p className="text-xs text-amber-700">These records list different manufacturers. A duplicate-record link is unusual here — consider “Verified equivalent”.</p>}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="note">
            {kind === "approve" && relationship === "verified-equivalent" ? "Engineering reference & evidence" : kind === "flag" ? "What needs checking?" : "Note"}
            {noteRequired ? <span className="text-red-500"> *</span> : <span className="font-normal text-muted-foreground"> (optional)</span>}
          </Label>
          <Textarea
            id="note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={kind === "approve" && relationship === "verified-equivalent" ? "e.g. ENG-EQ-0412: datasheets compared, dimensions, seal type and load ratings identical." : kind === "flag" ? "e.g. Confirm coil voltage on panel PLC-2 before linking." : ""}
          />
        </div>

        {kind === "approve" && (
          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox checked={attest} onCheckedChange={(v) => setAttest(v === true)} className="mt-0.5" />
            <span>
              I have verified this relationship against part numbers{relationship === "verified-equivalent" ? ", datasheets and engineering approval" : " and datasheets"}. I understand the similarity score alone does not establish technical compatibility.
            </span>
          </label>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={kind === "approve" ? "success" : kind === "reject" ? "destructive" : "accent"} disabled={!canConfirm} onClick={() => onConfirm(kind, ids, kind === "approve" ? relationship : undefined, note.trim() || undefined)}>
            {kind === "approve" ? "Approve & link" : kind === "reject" ? "Reject" : "Flag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
