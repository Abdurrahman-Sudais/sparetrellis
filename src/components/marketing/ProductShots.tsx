import type { ReactNode } from "react";
import { AlertTriangle, Check, CheckCircle2, Flag, MapPin, Search, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Stylised, code-rendered product screenshots used on the marketing site. */
export function ShotFrame({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl shadow-navy-950/40 ring-1 ring-black/5", className)}>
      <div className="flex items-center gap-2 border-b bg-steel-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 truncate rounded bg-white px-2 py-0.5 font-mono text-[10px] text-steel-500 ring-1 ring-steel-200">app.sparetrellis.top/{title}</span>
      </div>
      <div className="text-navy-900">{children}</div>
    </div>
  );
}

export function MatchShot({ className }: { className?: string }) {
  const rows: [string, string, string, "ok" | "warn"][] = [
    ["Designation", "6205", "6205", "ok"],
    ["Seal / shield", "2RS (rubber)", "2RS (DDU)", "ok"],
    ["Dimensions", "25×52×15 mm", "25×52×15 mm", "ok"],
    ["Manufacturer", "SKF", "NSK", "warn"],
  ];
  return (
    <ShotFrame title="matching/MC-00184" className={className}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-steel-500">Match suggestion</div>
            <div className="text-sm font-semibold">Deep groove ball bearing · 6205</div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">Possible match · 78%</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          {[
            ["Apapa Central Stores", "6205-2RSH", "Ball brg 6205 2RS", "14 EA"],
            ["Ikeja Maintenance Depot", "6205DDU", "BEARING 6205 SEALED 25X52X15", "6 PCS"],
          ].map(([wh, pn, d, q]) => (
            <div key={pn} className="rounded-lg border bg-steel-50/60 p-2.5">
              <div className="flex items-center gap-1 text-steel-500"><MapPin className="h-3 w-3" />{wh}</div>
              <div className="mt-1 font-mono font-semibold">{pn}</div>
              <div className="truncate text-steel-600">{d}</div>
              <div className="mt-1 font-medium">{q}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 divide-y rounded-lg border text-[11px]">
          {rows.map(([k, a, b, s]) => (
            <div key={k} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 px-2.5 py-1.5">
              <span className="text-steel-500">{k}</span>
              <span className="font-medium">{a}</span>
              <span className="font-medium">{b}</span>
              {s === "ok" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-md bg-amber-50 px-2.5 py-2 text-[11px] text-amber-900">Different manufacturers — equivalence must be confirmed by engineering before substitution.</div>
        <div className="mt-3 flex gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-medium text-white"><Check className="h-3 w-3" />Approve</span>
          <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-medium"><X className="h-3 w-3" />Reject</span>
          <span className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-medium"><Flag className="h-3 w-3" />Flag for engineering</span>
        </div>
      </div>
    </ShotFrame>
  );
}

export function DiscoveryShot({ className }: { className?: string }) {
  const rows = [
    ["Apapa Central Stores", "14", "2", "96%"],
    ["Ikeja Maintenance Depot", "6", "0", "91%"],
    ["Warri Turnaround Cage", "11", "4", "84%"],
    ["Tema Satellite Store", "3", "0", "72%"],
  ];
  return (
    <ShotFrame title="discovery?q=6205+sealed" className={className}>
      <div className="p-4">
        <div className="flex items-center gap-2 rounded-md border bg-steel-50 px-3 py-2 text-xs">
          <Search className="h-3.5 w-3.5 text-steel-400" />
          <span>bearing 6205 sealed</span>
          <span className="ml-auto rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">4 locations</span>
        </div>
        <div className="mt-3 text-[11px] font-semibold">BEARING, BALL, DEEP GROOVE, 6205-2RS, 25X52X15MM</div>
        <table className="mt-2 w-full text-[11px]">
          <thead className="text-left text-[10px] uppercase tracking-wider text-steel-500">
            <tr><th className="py-1 font-semibold">Warehouse</th><th className="font-semibold">Avail.</th><th className="font-semibold">Resv.</th><th className="text-right font-semibold">Conf.</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(([w, a, r, c]) => (
              <tr key={w}>
                <td className="py-1.5">{w}</td>
                <td className="font-semibold text-emerald-700">{a}</td>
                <td className="text-steel-500">{r}</td>
                <td className="text-right font-mono">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] text-emerald-800">32 units available across the network before raising a new purchase order.</div>
      </div>
    </ShotFrame>
  );
}

export function DashboardShot({ className }: { className?: string }) {
  const bars = [38, 52, 45, 61, 58, 72, 66, 81, 77, 88, 84, 93];
  return (
    <ShotFrame title="dashboard" className={className}>
      <div className="grid grid-cols-4 gap-2 p-4">
        {[
          ["Inventory records", "48,612"],
          ["Potential duplicates", "3,184"],
          ["Unmatched entries", "1,207"],
          ["Warehouses", "8"],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg border p-2">
            <div className="truncate text-[9px] text-steel-500">{l}</div>
            <div className="text-sm font-bold">{v}</div>
          </div>
        ))}
        <div className="col-span-3 rounded-lg border p-2.5">
          <div className="text-[10px] font-semibold">Matches reviewed per week</div>
          <div className="mt-2 flex h-20 items-end gap-1">
            {bars.map((b, i) => (
              <div key={i} className="flex-1 rounded-t-sm bg-navy-700" style={{ height: `${b}%` }}>
                <div className="h-1/3 rounded-t-sm bg-amber-500" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border p-2.5">
          <div className="text-[10px] font-semibold">Reconciled</div>
          <div className="mx-auto mt-2 h-16 w-16 rounded-full" style={{ background: "conic-gradient(#10b981 0 62%, #0ea5e9 62% 86%, #f59e0b 86% 100%)" }}>
            <div className="m-[10px] flex h-11 w-11 items-center justify-center rounded-full bg-white text-[10px] font-bold">62%</div>
          </div>
        </div>
      </div>
    </ShotFrame>
  );
}

export function ForecastShot({ className }: { className?: string }) {
  const hist = [0, 2, 0, 0, 1, 0, 3, 0, 0, 0, 2, 0, 1, 0, 0, 2];
  return (
    <ShotFrame title="forecasting/FC-007" className={className}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold">Contactor 32A AC3 · coil 230VAC</div>
          <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-violet-300 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700"><Sparkles className="h-2.5 w-2.5" />Simulated</span>
        </div>
        <div className="mt-3 flex h-20 items-end gap-1 border-b border-l pl-1">
          {hist.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm bg-steel-400" style={{ height: `${h * 25 + 2}%` }} />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <div key={`f${i}`} className="flex-1 rounded-t-sm border-2 border-dashed border-amber-500 bg-amber-100" style={{ height: "18%" }} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
          <div className="rounded border p-1.5"><div className="text-steel-500">Pattern</div><div className="font-semibold">Intermittent</div></div>
          <div className="rounded border p-1.5"><div className="text-steel-500">Lead time</div><div className="font-semibold">42 days</div></div>
          <div className="rounded border p-1.5"><div className="text-steel-500">Suggested</div><div className="font-semibold">2 EA</div></div>
        </div>
        <div className="mt-2 text-[10px] text-steel-500">Suggestion only — awaiting planner approval.</div>
      </div>
    </ShotFrame>
  );
}
