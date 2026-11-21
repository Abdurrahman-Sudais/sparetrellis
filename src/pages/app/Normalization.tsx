import { useEffect, useMemo, useState } from "react";
import { Check, Download, History, Plus, Ruler, Search, SpellCheck2, Tags, X, Factory, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination } from "@/components/shared/Pagination";
import { ConfidenceMeter, MockBadge } from "@/components/shared/Indicators";
import { EmptyState } from "@/components/shared/EmptyState";
import { Notice } from "@/components/shared/Notice";
import { useAppStore } from "@/hooks/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { canonicalManufacturer, canonicalUom, UOM_LABELS } from "@/services/ai/dictionaries";
import { exportCsv } from "@/lib/export";
import { cn, fmtDateTime } from "@/lib/utils";
import type { ProposalStatus, ProposalType } from "@/types";

const PAGE = 20;
const TYPE_LABEL: Record<ProposalType, string> = { description: "Description", uom: "Unit of measure", manufacturer: "Manufacturer", format: "Part-number format" };

export default function Normalization() {
  const { proposals, audit } = useAppStore();
  const pending = proposals.filter((p) => p.status === "pending").length;
  return (
    <div>
      <PageHeader
        eyebrow="Catalogue management"
        title="Part normalization"
        description="Standardize descriptions, normalize units, resolve manufacturer names and formatting, and maintain preferred and alternative part names. Every change is recorded."
        actions={<MockBadge label="Mock normalization engine" />}
      />
      <Tabs defaultValue="proposals">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="proposals">
            <SpellCheck2 /> Proposed corrections ({pending})
          </TabsTrigger>
          <TabsTrigger value="manufacturers">
            <Factory /> Manufacturers
          </TabsTrigger>
          <TabsTrigger value="units">
            <Ruler /> Units
          </TabsTrigger>
          <TabsTrigger value="names">
            <Tags /> Preferred & alternative names
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History /> Audit trail ({audit.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="proposals">
          <Proposals />
        </TabsContent>
        <TabsContent value="manufacturers">
          <Manufacturers />
        </TabsContent>
        <TabsContent value="units">
          <Units />
        </TabsContent>
        <TabsContent value="names">
          <Names />
        </TabsContent>
        <TabsContent value="audit">
          <AuditTrail />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Proposals() {
  const { proposals, recordById, dispatch } = useAppStore();
  const { user } = useAuth();
  const [type, setType] = useState<ProposalType | "all">("all");
  const [status, setStatus] = useState<ProposalStatus | "all">("pending");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, string>>({});

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return proposals.filter((p) => (type === "all" || p.type === type) && (status === "all" || p.status === status) && (!n || p.current.toLowerCase().includes(n) || p.proposed.toLowerCase().includes(n) || p.recordId.toLowerCase().includes(n)));
  }, [proposals, type, status, q]);
  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [type, status, q]);
  const pageItems = list.slice(page * PAGE, (page + 1) * PAGE);
  const pendingOnPage = pageItems.filter((p) => p.status === "pending");

  const resolve = (ids: string[], accept: boolean) => {
    dispatch({ type: "resolveProposal", ids, accept, user: user?.name ?? "Unknown", overrides: edits });
    setSelected(new Set());
    toast.success(`${accept ? "Accepted" : "Rejected"} ${ids.length} correction${ids.length > 1 ? "s" : ""}`, { description: accept ? "Records updated. Original values kept in the audit trail." : "Recorded in the audit trail." });
  };

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of proposals) if (p.status === "pending") c[p.type] = (c[p.type] ?? 0) + 1;
    return c;
  }, [proposals]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(TYPE_LABEL) as ProposalType[]).map((t) => (
          <button key={t} onClick={() => setType(type === t ? "all" : t)} className={cn("rounded-lg border bg-white p-4 text-left transition-colors hover:bg-steel-50", type === t && "border-amber-500 ring-1 ring-amber-500")}>
            <div className="text-xs text-muted-foreground">{TYPE_LABEL[t]}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-navy-900">{typeCounts[t] ?? 0}</div>
            <div className="text-[11px] text-muted-foreground">pending proposals</div>
          </button>
        ))}
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search values or record ID…" className="pl-8" />
          </div>
          <Select value={type} onValueChange={(v) => setType(v as ProposalType | "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All correction types</SelectItem>
              {(Object.keys(TYPE_LABEL) as ProposalType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as ProposalStatus | "all")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          {selected.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-medium">{selected.size} selected</span>
              <Button size="sm" variant="success" onClick={() => resolve([...selected], true)}>
                <Check /> Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => resolve([...selected], false)}>
                <X /> Reject
              </Button>
            </div>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={pendingOnPage.length > 0 && pendingOnPage.every((p) => selected.has(p.id))}
                  onCheckedChange={(v) => setSelected(v ? new Set(pendingOnPage.map((p) => p.id)) : new Set())}
                  aria-label="Select all on page"
                />
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Record</TableHead>
              <TableHead className="min-w-[220px]">Current value</TableHead>
              <TableHead className="min-w-[260px]">Proposed value</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead className="min-w-[220px]">Rationale</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((p) => {
              const rec = recordById.get(p.recordId);
              return (
                <TableRow key={p.id}>
                  <TableCell>{p.status === "pending" && <Checkbox checked={selected.has(p.id)} onCheckedChange={() => setSelected((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })} />}</TableCell>
                  <TableCell>
                    <Badge variant="neutral">{TYPE_LABEL[p.type]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-xs">{p.recordId}</div>
                    <div className="max-w-[160px] truncate text-[11px] text-muted-foreground">{rec?.description}</div>
                  </TableCell>
                  <TableCell className="text-sm text-red-700/80">
                    <span className={cn(p.status === "accepted" && "line-through")}>{p.current}</span>
                  </TableCell>
                  <TableCell>
                    {p.status === "pending" ? (
                      <div className="flex items-center gap-1.5">
                        <Input value={edits[p.id] ?? p.proposed} onChange={(e) => setEdits((x) => ({ ...x, [p.id]: e.target.value }))} className={cn("h-8 text-sm font-medium text-emerald-800", edits[p.id] !== undefined && edits[p.id] !== p.proposed && "border-amber-400")} />
                        {edits[p.id] !== undefined && edits[p.id] !== p.proposed && <Pencil className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-label="Edited" />}
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-emerald-800">{p.proposed}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ConfidenceMeter score={p.confidence} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.rationale}</TableCell>
                  <TableCell className="text-right">
                    {p.status === "pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="success" className="h-7 w-7" onClick={() => resolve([p.id], true)} aria-label="Accept">
                          <Check />
                        </Button>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => resolve([p.id], false)} aria-label="Reject">
                          <X />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant={p.status === "accepted" ? "success" : "danger"}>{p.status}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!list.length && <EmptyState icon={SpellCheck2} title="No proposals" description="Nothing matches these filters." />}
        <Pagination page={page} pageSize={PAGE} total={list.length} onPage={setPage} />
      </Card>
    </div>
  );
}

function Manufacturers() {
  const { records } = useAppStore();
  const rows = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const r of records) {
      if (!r.manufacturer) continue;
      const c = canonicalManufacturer(r.manufacturer);
      const v = m.get(c) ?? new Map<string, number>();
      v.set(r.manufacturer, (v.get(r.manufacturer) ?? 0) + 1);
      m.set(c, v);
    }
    return [...m.entries()]
      .map(([canonical, variants]) => ({ canonical, variants: [...variants.entries()].sort((a, b) => b[1] - a[1]), total: [...variants.values()].reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.variants.length - a.variants.length || b.total - a.total);
  }, [records]);
  const inconsistent = rows.filter((r) => r.variants.length > 1 || r.variants[0][0] !== r.canonical).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manufacturer name consistency</CardTitle>
        <CardDescription>
          {inconsistent} of {rows.length} manufacturers appear under inconsistent spellings. Corrections are proposed in the <span className="font-medium">Proposed corrections</span> tab.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Canonical name</TableHead>
              <TableHead>Spellings found in records</TableHead>
              <TableHead className="text-right">Records</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const ok = r.variants.length === 1 && r.variants[0][0] === r.canonical;
              return (
                <TableRow key={r.canonical}>
                  <TableCell className="font-medium text-navy-900">{r.canonical}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.variants.map(([v, n]) => (
                        <span key={v} className={cn("rounded border px-1.5 py-0.5 font-mono text-[11px]", v === r.canonical ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900")}>
                          {v} <span className="opacity-60">×{n}</span>
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.total}</TableCell>
                  <TableCell>{ok ? <Badge variant="success">Consistent</Badge> : <Badge variant="warning">{r.variants.filter(([v]) => v !== r.canonical).length} variants</Badge>}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Units() {
  const { records } = useAppStore();
  const rows = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const r of records) {
      const c = canonicalUom(r.uom);
      const v = m.get(c) ?? new Map<string, number>();
      v.set(r.uom, (v.get(r.uom) ?? 0) + 1);
      m.set(c, v);
    }
    return [...m.entries()].map(([canonical, variants]) => ({ canonical, variants: [...variants.entries()].sort((a, b) => b[1] - a[1]) }));
  }, [records]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Unit of measure normalization</CardTitle>
          <CardDescription>Variants are mapped to a canonical unit. Pack units (box of 10/100) are kept distinct — converting them changes quantities.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canonical unit</TableHead>
                <TableHead>Variants in use</TableHead>
                <TableHead className="text-right">Records</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.canonical}>
                  <TableCell>
                    <div className="font-mono font-semibold">{r.canonical}</div>
                    <div className="text-xs text-muted-foreground">{UOM_LABELS[r.canonical] ?? "Unrecognised unit"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.variants.map(([v, n]) => (
                        <span key={v} className={cn("rounded border px-1.5 py-0.5 font-mono text-[11px]", v === r.canonical ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
                          {v} <span className="opacity-60">×{n}</span>
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.variants.reduce((s, [, n]) => s + n, 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Notice tone="warning" title="Pack-size conversions need review">
        A record stocked as <span className="font-mono">BOX/10</span> and another as <span className="font-mono">EA</span> may describe the same O-ring, but quantities differ by a factor of ten. SpareTrellis flags these
        as unit conflicts in matching rather than converting automatically.
      </Notice>
    </div>
  );
}

function Names() {
  const { standardParts, records, dispatch } = useAppStore();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState(standardParts[0]?.id);
  const [alias, setAlias] = useState("");
  const [preferred, setPreferred] = useState("");
  const [note, setNote] = useState("");
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return standardParts.filter((p) => !n || p.name.toLowerCase().includes(n) || p.aliases.some((a) => a.toLowerCase().includes(n))).slice(0, 60);
  }, [standardParts, q]);
  const part = standardParts.find((p) => p.id === activeId);
  useEffect(() => {
    setPreferred(part?.name ?? "");
    setNote("");
  }, [part?.id, part?.name]);
  const recs = part ? records.filter((r) => r.standardPartId === part.id) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="overflow-hidden">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a catalogue part…" className="pl-8" />
          </div>
        </div>
        <div className="scrollbar-thin max-h-[560px] divide-y overflow-y-auto">
          {list.map((p) => (
            <button key={p.id} onClick={() => setActiveId(p.id)} className={cn("block w-full px-3 py-2.5 text-left hover:bg-steel-50", p.id === activeId && "bg-amber-50/70 shadow-[inset_3px_0_0_0_#f59e0b]")}>
              <div className="truncate text-sm font-medium text-navy-900">{p.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {p.family} · {p.aliases.length} alternative names
              </div>
            </button>
          ))}
        </div>
      </Card>
      {part && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferred description</CardTitle>
              <CardDescription>
                <span className="font-mono">{part.id}</span> · {part.family} · {recs.length} linked records
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={preferred} onChange={(e) => setPreferred(e.target.value.toUpperCase())} className="font-medium" />
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for change (recorded in audit trail)" />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Convention: NOUN, MODIFIER, key attributes. The previous name becomes an alternative name.</p>
                <Button
                  disabled={!preferred.trim() || preferred === part.name}
                  onClick={() => {
                    dispatch({ type: "renameStandard", partId: part.id, name: preferred.trim(), user: user?.name ?? "Unknown", note: note.trim() || undefined });
                    toast.success("Preferred description updated");
                  }}
                >
                  Save preferred description
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(part.specs).map(([k, v]) => (
                  <Badge key={k} variant="neutral" className="font-normal">
                    <span className="text-muted-foreground">{k}:</span> {v}
                  </Badge>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">Manufacturer part numbers: {part.manufacturerPartNumbers.join(" · ")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Alternative part names</CardTitle>
              <CardDescription>Names this part is known by across sites. Used by stock discovery search.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!alias.trim()) return;
                  dispatch({ type: "addAlias", partId: part.id, alias: alias.trim(), user: user?.name ?? "Unknown" });
                  setAlias("");
                  toast.success("Alternative name added");
                }}
              >
                <Input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="e.g. Conveyor tail pulley bearing" />
                <Button type="submit" variant="outline">
                  <Plus /> Add
                </Button>
              </form>
              <div className="mt-4 flex flex-wrap gap-2">
                {part.aliases.map((a) => (
                  <span key={a} className="group inline-flex items-center gap-1.5 rounded-md border bg-steel-50 px-2 py-1 text-sm">
                    {a}
                    <button onClick={() => dispatch({ type: "removeAlias", partId: part.id, alias: a, user: user?.name ?? "Unknown" })} className="text-steel-400 hover:text-red-600" aria-label={`Remove ${a}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                {!part.aliases.length && <p className="text-sm text-muted-foreground">No alternative names yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function AuditTrail() {
  const { audit } = useAppStore();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return audit.filter((a) => !n || [a.user, a.action, a.entity, a.before ?? "", a.after ?? "", a.note ?? ""].some((s) => s.toLowerCase().includes(n)));
  }, [audit, q]);
  useEffect(() => { setPage(0); }, [q]);
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user, action, entity…" className="pl-8" />
        </div>
        <Button
          variant="outline"
          className="ml-auto"
          onClick={() =>
            exportCsv(
              "sparetrellis_audit_trail.csv",
              ["Timestamp", "User", "Action", "Entity", "Field", "Before", "After", "Note"],
              list.map((a) => [a.ts, a.user, a.action, a.entity, a.field ?? "", a.before ?? "", a.after ?? "", a.note ?? ""]),
            )
          }
        >
          <Download /> Export CSV
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead className="min-w-[280px]">Change</TableHead>
            <TableHead className="min-w-[200px]">Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.slice(page * PAGE, (page + 1) * PAGE).map((a) => (
            <TableRow key={a.id}>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(a.ts)}</TableCell>
              <TableCell className="whitespace-nowrap text-sm">{a.user}</TableCell>
              <TableCell className="whitespace-nowrap text-sm font-medium">{a.action}</TableCell>
              <TableCell className="font-mono text-xs">{a.entity}</TableCell>
              <TableCell className="text-xs">
                {a.field && <span className="mr-1 text-muted-foreground">{a.field}:</span>}
                {a.before && <span className="text-red-700/80 line-through">{a.before}</span>}
                {a.before && a.after && <span className="mx-1 text-muted-foreground">→</span>}
                {a.after && <span className="font-medium text-emerald-800">{a.after}</span>}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{a.note}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} pageSize={PAGE} total={list.length} onPage={setPage} />
    </Card>
  );
}
