import { CheckCircle2, FileUp, GitCompareArrows, SpellCheck2, ScanSearch, TrendingUp, BarChart3, ShieldCheck, History } from "lucide-react";
import { CtaBand, PageHero } from "@/components/marketing/Sections";
import { DashboardShot, DiscoveryShot, ForecastShot, MatchShot } from "@/components/marketing/ProductShots";
import type { ReactNode } from "react";

const GROUPS: { icon: typeof FileUp; title: string; text: string; bullets: string[]; shot?: ReactNode }[] = [
  {
    icon: FileUp,
    title: "Inventory import",
    text: "Bring in data the way it exists today — no clean-up project required first.",
    bullets: ["CSV, Excel, parts catalogues, purchase records and supplier catalogues", "Column mapping to part number, description, manufacturer, equipment, category, unit, quantity, warehouse, supplier and price", "Row-level validation, duplicate warnings and error reports", "Scanned purchase records extracted via Amazon Textract (planned)"],
    shot: <DashboardShot />,
  },
  {
    icon: GitCompareArrows,
    title: "AI catalogue matching",
    text: "Compare every record against every other on the attributes that matter.",
    bullets: ["Descriptions, manufacturers, part numbers, equipment references, dimensions, specifications and units", "High-confidence, possible, conflicting and no-match statuses", "Matching and conflicting attributes side by side", "Approve, reject or flag — never auto-merged"],
    shot: <MatchShot />,
  },
  {
    icon: ScanSearch,
    title: "Multi-warehouse stock discovery",
    text: "Find stock filed under other names, in other places.",
    bullets: ["Search by description, part number, equipment, manufacturer or alternative name", "Standardized name, warehouse, available and reserved quantity, unit and last update", "Match confidence on every result", "Filter by warehouse, availability and confidence"],
    shot: <DiscoveryShot />,
  },
  {
    icon: TrendingUp,
    title: "Demand forecasting",
    text: "Forecasts designed for intermittent spare-parts demand.",
    bullets: ["Historical consumption, stock levels and supplier lead times", "Demand classification: smooth, intermittent, lumpy, erratic", "Suggested reorder quantities and stockout risk", "Every suggestion requires planner approval"],
    shot: <ForecastShot />,
  },
];

const MORE = [
  { icon: SpellCheck2, title: "Part normalization", text: "Standardize descriptions, normalize units, resolve manufacturer aliases and formatting, maintain alternative names." },
  { icon: History, title: "Audit trail", text: "Every approval, rejection and correction is recorded with user, time, before and after values." },
  { icon: BarChart3, title: "Reports", text: "Duplicates, reconciliation, stock discovery, normalization, estimated savings and reorder recommendations — PDF and CSV." },
  { icon: ShieldCheck, title: "Governed AI", text: "Mock and production AI services sit behind clear interfaces. Outputs are labelled and always require human review." },
];

export default function Features() {
  return (
    <>
      <PageHero eyebrow="Features" title="An inventory intelligence layer on top of the systems you already run" description="SpareTrellis doesn't replace your ERP or CMMS. It connects their inconsistent records so you can see what you actually have." />
      <section className="bg-white py-20">
        <div className="container space-y-24">
          {GROUPS.map((g, i) => (
            <div key={g.title} className="grid items-center gap-12 lg:grid-cols-2">
              <div className={i % 2 ? "lg:order-2" : ""}>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-900 text-amber-400">
                  <g.icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-navy-900">{g.title}</h2>
                <p className="mt-3 text-lg text-steel-600">{g.text}</p>
                <ul className="mt-6 space-y-3">
                  {g.bullets.map((b) => (
                    <li key={b} className="flex gap-2.5 text-sm text-steel-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={i % 2 ? "lg:order-1" : ""}>{g.shot}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-steel-50 py-20">
        <div className="container grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {MORE.map((m) => (
            <div key={m.title} className="rounded-xl border bg-white p-6">
              <m.icon className="h-6 w-6 text-amber-600" />
              <div className="mt-4 font-semibold text-navy-900">{m.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-steel-600">{m.text}</p>
            </div>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
