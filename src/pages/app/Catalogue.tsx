import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Boxes, Download, Layers, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WarehouseSelect } from "@/components/shared/Filters";
import { Pagination } from "@/components/shared/Pagination";
import { ConfidenceMeter, MappingBadge, MatchStatusBadge, ReviewStatusBadge } from "@/components/shared/Indicators";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAppStore } from "@/hooks/useAppStore";
import { warehouseById } from "@/data/catalogue";
import { exportCsv } from "@/lib/export";
import { fmtCurrency, fmtDate } from "@/lib/utils";
import type { InventoryRecord, MappingStatus } from "@/types";

const PAGE = 20;

export default function Catalogue() {
  const { records, standardParts, candidates, proposals, partById } = useAppStore();
  const [params] = useSearchParams();
  const [q, setQ] = useState("");
  const [wh, setWh] = useState("all");
  const [cat, setCat] = useState("all");
  const [mapping, setMapping] = useState<MappingStatus | "all">((params.get("mapping") as MappingStatus) ?? "all");
  const [page, setPage] = useState(0);
  const [mPage, setMPage] = useState(0);
  const [open, setOpen] = useState<InventoryRecord | null>(null);

  const categories = useMemo(() => Array.from(new Set(records.map((r) => r.category))).sort(), [records]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return records.filter(
      (r) =>
        (wh === "all" || r.warehouseId === wh) &&
        (cat === "all" || r.category === cat) &&
        (mapping === "all" || r.mappingStatus === mapping) &&
        (!n || [r.id, r.partNumber, r.description, r.manufacturer, r.equipmentRef, r.supplier].some((s) => s.toLowerCase().includes(n))),
    );
  }, [records, q, wh, cat, mapping]);
  useEffect(() => { setPage(0); }, [q, wh, cat, mapping]);

  const masters = useMemo(() => {
    const n = q.trim().toLowerCase();
    return standardParts
      .map((p) => {
        const recs = records.filter((r) => r.standardPartId === p.id);
        return { p, recs, wh: new Set(recs.map((r) => r.warehouseId)).size, qty: recs.reduce((s, r) => s + r.quantity, 0) };
      })
      .filter((x) => (cat === "all" || x.p.category === cat) && (!n || [x.p.name, x.p.id, ...x.p.aliases, ...x.p.manufacturerPartNumbers].some((s) => s.toLowerCase().includes(n))))
      .sort((a, b) => b.recs.length - a.recs.length);
  }, [standardParts, records, q, cat]);

  const exportRecords = () =>
    exportCsv(
      "sparetrellis_catalogue_records.csv",
      ["Record ID", "Part number", "Description", "Manufacturer", "Equipment", "Category", "UoM", "Quantity", "Reserved", "Warehouse", "Supplier", "Unit price", "Mapping status", "Mapping confidence", "Catalogue master"],
      filtered.map((r) => [r.id, r.partNumber, r.description, r.manufacturer, r.equipmentRef, r.category, r.uom, r.quantity, r.reserved, warehouseById(r.warehouseId)?.code, r.supplier, r.unitPrice, r.mappingStatus, r.mappingConfidence, r.standardPartId ?? ""]),
    );

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue management"
        title="Catalogue"
        description="All inventory records and the catalogue master they map to. Mapping status shows whether a person has verified the link."
        actions={
          <Button variant="outline" onClick={exportRecords}>
            <Download /> Export CSV
          </Button>
        }
      />

      <Tabs defaultValue="records">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList>
            <TabsTrigger value="records">
              <Boxes /> Inventory records ({records.length})
            </TabsTrigger>
            <TabsTrigger value="master">
              <Layers /> Catalogue master ({standardParts.length})
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search records…" className="pl-8" />
            </div>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="records">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap gap-2 border-b p-3">
              <WarehouseSelect value={wh} onChange={setWh} />
              <Select value={mapping} onValueChange={(v) => setMapping(v as MappingStatus | "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All mapping statuses</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="ai-suggested">AI-suggested</SelectItem>
                  <SelectItem value="unmapped">Unmatched</SelectItem>
                </SelectContent>
              </Select>
              <span className="ml-auto self-center text-xs text-muted-foreground">{filtered.length.toLocaleString()} records</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record</TableHead>
                  <TableHead>Part number</TableHead>
                  <TableHead className="min-w-[260px]">Description</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Mapping</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(page * PAGE, (page + 1) * PAGE).map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpen(r)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.id}</TableCell>
                    <TableCell className="font-mono text-xs">{r.partNumber || <span className="text-steel-400">—</span>}</TableCell>
                    <TableCell>
                      <div className="font-medium text-navy-900">{r.description}</div>
                      <div className="text-xs text-muted-foreground">{r.category}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{r.manufacturer || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{warehouseById(r.warehouseId)?.code}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{r.quantity}</TableCell>
                    <TableCell className="text-xs">{r.uom}</TableCell>
                    <TableCell>
                      <MappingBadge status={r.mappingStatus} />
                    </TableCell>
                    <TableCell>
                      <ConfidenceMeter score={r.mappingConfidence} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!filtered.length && <EmptyState icon={Boxes} title="No records found" description="Try a different search or filter." />}
            <Pagination page={page} pageSize={PAGE} total={filtered.length} onPage={setPage} />
          </Card>
        </TabsContent>

        <TabsContent value="master">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[320px]">Standardized part name</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Key specifications</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Sites</TableHead>
                  <TableHead className="text-right">Total qty</TableHead>
                  <TableHead className="text-right">Alt. names</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {masters.slice(mPage * PAGE, (mPage + 1) * PAGE).map(({ p, recs, wh, qty }) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium text-navy-900">{p.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{p.id}</div>
                    </TableCell>
                    <TableCell className="text-xs">{p.family}</TableCell>
                    <TableCell>
                      <div className="flex max-w-[280px] flex-wrap gap-1">
                        {Object.entries(p.specs).slice(0, 3).map(([k, v]) => (
                          <Badge key={k} variant="neutral" className="font-normal">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{recs.length}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{wh}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{qty}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{p.aliases.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={mPage} pageSize={PAGE} total={masters.length} onPage={setMPage} />
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="pr-6">{open.description}</DialogTitle>
              <DialogDescription>
                <span className="font-mono">{open.id}</span> · {warehouseById(open.warehouseId)?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
              {[
                ["Part number", open.partNumber || "—"],
                ["Manufacturer", open.manufacturer || "—"],
                ["Equipment", open.equipmentRef || "—"],
                ["Category", open.category],
                ["Unit", open.uom],
                ["On hand / reserved", `${open.quantity} / ${open.reserved}`],
                ["Supplier", open.supplier || "—"],
                ["Unit price", fmtCurrency(open.unitPrice)],
                ["Last updated", fmtDate(open.lastUpdated)],
                ["Source", open.source],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="font-medium">{v}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border bg-steel-50 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-steel-500">Catalogue master</div>
                <MappingBadge status={open.mappingStatus} />
              </div>
              {open.standardPartId ? (
                <div className="mt-1.5 text-sm font-medium">{partById.get(open.standardPartId)?.name}</div>
              ) : (
                <div className="mt-1.5 text-sm text-muted-foreground">No confident mapping. Add a part number or specifications, or review in normalization.</div>
              )}
              <ConfidenceMeter score={open.mappingConfidence} className="mt-2" showLabel />
            </div>
            {(() => {
              const rel = candidates.filter((c) => c.recordAId === open.id || c.recordBId === open.id);
              const props = proposals.filter((p) => p.recordId === open.id);
              return (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-steel-500">Match suggestions ({rel.length})</div>
                    <div className="space-y-1.5">
                      {rel.slice(0, 4).map((c) => (
                        <Link key={c.id} to={`/app/matching?id=${c.id}`} className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs hover:bg-steel-50">
                          <span className="font-mono">{c.id}</span>
                          <span className="flex gap-1">
                            <MatchStatusBadge status={c.status} className="text-[10px]" />
                            <ReviewStatusBadge status={c.reviewStatus} />
                          </span>
                        </Link>
                      ))}
                      {!rel.length && <p className="text-xs text-muted-foreground">None.</p>}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-steel-500">Proposed corrections ({props.length})</div>
                    <div className="space-y-1.5">
                      {props.slice(0, 4).map((p) => (
                        <Link key={p.id} to="/app/normalization" className="block rounded-md border px-2.5 py-1.5 text-xs hover:bg-steel-50">
                          <span className="font-medium capitalize">{p.type}</span>: <span className="text-muted-foreground line-through">{p.current}</span> → {p.proposed}
                          <Badge variant={p.status === "accepted" ? "success" : p.status === "rejected" ? "danger" : "neutral"} className="ml-1.5 text-[10px]">
                            {p.status}
                          </Badge>
                        </Link>
                      ))}
                      {!props.length && <p className="text-xs text-muted-foreground">None.</p>}
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
