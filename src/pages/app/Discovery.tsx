import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRightLeft, Boxes, MapPin, PackageSearch, ScanSearch, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WarehouseSelect } from "@/components/shared/Filters";
import { ConfidenceMeter, MappingBadge, MockBadge } from "@/components/shared/Indicators";
import { EmptyState } from "@/components/shared/EmptyState";
import { Notice } from "@/components/shared/Notice";
import { useAppStore } from "@/hooks/useAppStore";
import { warehouseById } from "@/data/catalogue";
import { normalizePartNumber, tokenize } from "@/services/ai/dictionaries";
import { extractSpecs } from "@/services/ai/specExtraction";
import { cn, fmtDate } from "@/lib/utils";
import type { InventoryRecord, StandardPart } from "@/types";

type Field = "all" | "description" | "partNumber" | "equipment" | "manufacturer" | "alternative";
const FIELD_LABEL: Record<Field, string> = {
  all: "All fields",
  description: "Part description",
  partNumber: "Part number",
  equipment: "Equipment reference",
  manufacturer: "Manufacturer",
  alternative: "Alternative names",
};
const EXAMPLES = ["bearing 6205 sealed", "SPA1250", "contactor 32A", "CV-201", "O ring 50x3 NBR", "SKF", "fuse 63 amp", "Hyd filter 10 micron"];

function coverage(queryTokens: string[], text: string) {
  if (!queryTokens.length) return 0;
  const t = new Set(tokenize(text));
  let hit = 0;
  for (const q of queryTokens) if (t.has(q) || [...t].some((x) => x.length > 3 && q.length > 3 && (x.startsWith(q) || q.startsWith(x)))) hit++;
  return hit / queryTokens.length;
}

interface Hit {
  record: InventoryRecord;
  confidence: number;
  matchedOn: string;
}

export default function Discovery() {
  const { records, partById } = useAppStore();
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") ?? "";
  const [input, setInput] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [field, setField] = useState<Field>("all");
  const [wh, setWh] = useState("all");
  const [inStock, setInStock] = useState(false);
  const [minConf, setMinConf] = useState("0.4");

  useEffect(() => {
    const q = params.get("q") ?? "";
    setInput(q);
    setQuery(q);
  }, [params]);

  const submit = (e?: FormEvent, value?: string) => {
    e?.preventDefault();
    const v = (value ?? input).trim();
    setInput(v);
    setQuery(v);
    if (v) params.set("q", v);
    else params.delete("q");
    setParams(params, { replace: true });
  };

  const groups = useMemo(() => {
    if (!query.trim()) return [];
    const qt = tokenize(query);
    const qpn = normalizePartNumber(query);
    const lc = query.toLowerCase();
    const querySpecs = extractSpecs(query);
    const querySpecKeys = Object.keys(querySpecs);
    const hits: Hit[] = [];
    for (const r of records) {
      if (wh !== "all" && r.warehouseId !== wh) continue;
      if (inStock && r.quantity - r.reserved <= 0) continue;
      const part = r.standardPartId ? partById.get(r.standardPartId) : undefined;
      const scores: [number, string][] = [];
      if (field === "all" || field === "description") scores.push([coverage(qt, r.description), "Description"]);
      if ((field === "all" || field === "description") && part) scores.push([coverage(qt, part.name) * 0.97, "Standardized name"]);
      if ((field === "all" || field === "partNumber") && qpn.length >= 3 && r.partNumber) {
        const pn = normalizePartNumber(r.partNumber);
        scores.push([pn === qpn ? 1 : pn.includes(qpn) || qpn.includes(pn) ? 0.85 : 0, "Part number"]);
        if (part) scores.push([part.manufacturerPartNumbers.some((m) => normalizePartNumber(m).includes(qpn)) ? 0.8 : 0, "Manufacturer part no."]);
      }
      if ((field === "all" || field === "equipment") && r.equipmentRef) scores.push([r.equipmentRef.toLowerCase().includes(lc) ? 0.9 : coverage(qt, r.equipmentRef) * 0.8, "Equipment"]);
      if ((field === "all" || field === "manufacturer") && r.manufacturer) scores.push([r.manufacturer.toLowerCase().includes(lc) ? 0.9 : 0, "Manufacturer"]);
      if ((field === "all" || field === "alternative") && part) scores.push([Math.max(0, ...part.aliases.map((a) => coverage(qt, a))) * 0.93, "Alternative name"]);
      let [best, on] = scores.reduce((a, b) => (b[0] > a[0] ? b : a), [0, ""] as [number, string]);
      if (best < 0.5) continue;
      // Spec-aware adjustment: "sealed" must not rank a shielded bearing highly, etc.
      if (querySpecKeys.length) {
        const rs = { ...extractSpecs(`${r.description} ${r.partNumber}`), ...(part?.specs ?? {}) };
        let agree = 0;
        let conflict = 0;
        for (const k of querySpecKeys) {
          if (!(k in rs)) continue;
          if (rs[k] === querySpecs[k]) agree++;
          else conflict++;
        }
        if (conflict) best *= 0.5;
        else if (agree) best = Math.min(1, best + 0.12 * agree);
      }
      const mappingFactor = r.mappingStatus === "verified" ? 1 : r.mappingStatus === "ai-suggested" ? 0.55 + 0.45 * r.mappingConfidence : 0.6;
      const confidence = Math.min(0.99, best * mappingFactor);
      if (confidence < Number(minConf)) continue;
      hits.push({ record: r, confidence, matchedOn: on });
    }
    const byPart = new Map<string, { part?: StandardPart; hits: Hit[] }>();
    for (const h of hits) {
      const key = h.record.standardPartId ?? `unmapped:${h.record.id}`;
      const g = byPart.get(key) ?? { part: h.record.standardPartId ? partById.get(h.record.standardPartId) : undefined, hits: [] };
      g.hits.push(h);
      byPart.set(key, g);
    }
    return [...byPart.entries()]
      .map(([key, g]) => ({
        key,
        ...g,
        hits: g.hits.sort((a, b) => b.confidence - a.confidence),
        best: Math.max(...g.hits.map((h) => h.confidence)),
        available: g.hits.reduce((s, h) => s + Math.max(0, h.record.quantity - h.record.reserved), 0),
        sites: new Set(g.hits.map((h) => h.record.warehouseId)).size,
      }))
      .sort((a, b) => b.best - a.best || b.available - a.available)
      .slice(0, 25);
  }, [query, records, partById, field, wh, inStock, minConf]);

  const totalAvail = groups.reduce((s, g) => s + g.available, 0);
  const totalSites = new Set(groups.flatMap((g) => g.hits.map((h) => h.record.warehouseId))).size;

  return (
    <div>
      <PageHeader
        eyebrow="Step 3 · Core workflow"
        title="Stock discovery"
        description="Search every warehouse at once — by description, part number, equipment, manufacturer or alternative name — and find stock filed under other names before ordering."
        actions={<MockBadge label="Mock semantic search" />}
      />

      <Card className="p-4">
        <form onSubmit={submit} className="flex flex-col gap-2 md:flex-row">
          <Select value={field} onValueChange={(v) => setField(v as Field)}>
            <SelectTrigger className="md:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FIELD_LABEL) as Field[]).map((f) => (
                <SelectItem key={f} value={f}>
                  {FIELD_LABEL[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. bearing 6205 sealed, LC1D32, CV-201 conveyor…" className="h-10 pl-9 text-base" autoFocus />
          </div>
          <Button type="submit" variant="accent" className="h-10">
            <ScanSearch /> Search all warehouses
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          <WarehouseSelect value={wh} onChange={setWh} className="h-8 w-[220px] text-xs" />
          <Select value={minConf} onValueChange={setMinConf}>
            <SelectTrigger className="h-8 w-[190px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.4">Any confidence (≥ 40%)</SelectItem>
              <SelectItem value="0.6">Medium and above (≥ 60%)</SelectItem>
              <SelectItem value="0.82">High only (≥ 82%)</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="instock" checked={inStock} onCheckedChange={setInStock} />
            <Label htmlFor="instock" className="text-xs font-normal">
              Available stock only
            </Label>
          </div>
        </div>
        {!query && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
            <span className="text-xs text-muted-foreground">Try:</span>
            {EXAMPLES.map((e) => (
              <button key={e} onClick={() => submit(undefined, e)} className="rounded-full border bg-steel-50 px-2.5 py-1 font-mono text-xs hover:border-amber-400 hover:bg-amber-50">
                {e}
              </button>
            ))}
          </div>
        )}
      </Card>

      {query && (
        <>
          <div className="my-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm">
              <span className="font-semibold text-navy-900">{groups.length}</span> matching parts · <span className="font-semibold text-emerald-700">{totalAvail.toLocaleString()} units available</span> across{" "}
              <span className="font-semibold text-navy-900">{totalSites}</span> warehouses for “{query}”
            </div>
            <span className="text-xs text-muted-foreground">Confidence combines search relevance with catalogue-mapping verification.</span>
          </div>

          {groups.length > 0 && (
            <Notice tone="guard" className="mb-5">
              Results with AI-suggested mappings or lower confidence may describe a different part. Verify part number and specifications before transferring or substituting stock.
            </Notice>
          )}

          <div className="space-y-4">
            {groups.map((g) => (
              <Card key={g.key} className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b bg-steel-50/70 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {g.part ? <Boxes className="h-4 w-4 shrink-0 text-navy-700" /> : <PackageSearch className="h-4 w-4 shrink-0 text-amber-600" />}
                      <span className="truncate font-semibold text-navy-900">{g.part?.name ?? g.hits[0].record.description}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {g.part ? (
                        Object.values(g.part.specs).slice(0, 4).map((v) => (
                          <Badge key={v} variant="neutral" className="font-normal">
                            {v}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="warning">Not mapped to catalogue master</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-5 text-sm">
                    <div className="text-right">
                      <div className="text-lg font-bold tabular-nums text-emerald-700">{g.available}</div>
                      <div className="text-[11px] text-muted-foreground">available</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold tabular-nums text-navy-900">{g.sites}</div>
                      <div className="text-[11px] text-muted-foreground">{g.sites === 1 ? "warehouse" : "warehouses"}</div>
                    </div>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="min-w-[220px]">Recorded as</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Last updated</TableHead>
                      <TableHead>Match confidence</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.hits.map(({ record: r, confidence, matchedOn }) => {
                      const avail = Math.max(0, r.quantity - r.reserved);
                      const w = warehouseById(r.warehouseId);
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <MapPin className="h-3.5 w-3.5 text-steel-400" />
                              {w?.name}
                            </div>
                            <div className="ml-5 font-mono text-[11px] text-muted-foreground">
                              {w?.code} · {w?.region}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{r.description}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {r.partNumber || "no part no."} · {r.manufacturer || "—"} · matched on {matchedOn.toLowerCase()}
                            </div>
                          </TableCell>
                          <TableCell className={cn("text-right font-mono font-semibold tabular-nums", avail ? "text-emerald-700" : "text-steel-400")}>{avail}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{r.reserved}</TableCell>
                          <TableCell className="text-xs">{r.uom}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(r.lastUpdated)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <ConfidenceMeter score={confidence} />
                              <MappingBadge status={r.mappingStatus} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!avail}
                              onClick={() =>
                                toast.success("Transfer request drafted", {
                                  description: `${w?.code}: ${r.partNumber || r.description}. Requires stores supervisor approval and part verification (demo — nothing was sent).`,
                                })
                              }
                            >
                              <ArrowRightLeft /> Request
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            ))}
            {!groups.length && (
              <Card>
                <EmptyState icon={PackageSearch} title="No stock found" description="Try fewer words, a part number, or lower the confidence filter. The part may be catalogued under a name SpareTrellis hasn't linked yet." />
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
