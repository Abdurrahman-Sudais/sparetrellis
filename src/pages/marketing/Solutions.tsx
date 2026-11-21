import { Factory, HardHat, Warehouse, CheckCircle2 } from "lucide-react";
import { CtaBand, PageHero } from "@/components/marketing/Sections";

const SOLUTIONS = [
  {
    icon: Factory,
    title: "Manufacturing plants",
    who: "Reliability engineers, stores supervisors, maintenance planners",
    pain: "Critical spares are recorded differently across production lines and legacy systems. Breakdowns trigger urgent purchases for parts that are already in another store.",
    outcomes: ["Connect line-level spares registers to the plant catalogue", "Check network stock before raising emergency POs", "Reduce duplicate catalogue entries over time"],
  },
  {
    icon: HardHat,
    title: "Maintenance contractors",
    who: "Contract managers, site supervisors, procurement",
    pain: "Contractors inherit client stock lists in every format imaginable and need to know quickly what is usable on site.",
    outcomes: ["Import client spreadsheets in minutes with column mapping", "Map client descriptions to a standard catalogue", "Export reconciliation reports for handover"],
  },
  {
    icon: Warehouse,
    title: "Multi-site warehouse teams",
    who: "Inventory controllers, warehouse managers, supply planners",
    pain: "The same part sits in several warehouses under different codes, so stock positions and reorder points are unreliable.",
    outcomes: ["One search across all locations", "Consolidated view of available and reserved stock", "Intermittent-demand reorder suggestions for planner approval"],
  },
];

export default function Solutions() {
  return (
    <>
      <PageHero eyebrow="Solutions" title="For the teams who keep industrial operations running" description="Whether you run one plant or many sites, SpareTrellis helps you see the stock you already own." />
      <section className="bg-white py-20">
        <div className="container grid gap-6 lg:grid-cols-3">
          {SOLUTIONS.map((s) => (
            <div key={s.title} className="flex flex-col rounded-xl border bg-white p-7 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-900 text-amber-400">
                <s.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-navy-900">{s.title}</h2>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-steel-500">{s.who}</div>
              <p className="mt-4 text-sm leading-relaxed text-steel-600">{s.pain}</p>
              <div className="mt-6 border-t pt-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">What changes</div>
                <ul className="mt-3 space-y-2.5">
                  {s.outcomes.map((o) => (
                    <li key={o} className="flex gap-2 text-sm text-steel-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-steel-50 py-20">
        <div className="container">
          <h2 className="text-2xl font-bold text-navy-900">Common part families we help untangle</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Bearings", "V-belts & wedge belts", "O-rings & seals", "Spiral wound gaskets", "HRC fuses", "Contactors", "Electric motors", "Solenoid valves", "Proximity sensors", "Hydraulic filters", "Pressure gauges", "Coupling spiders", "Fasteners", "Pipe fittings"].map((f) => (
              <span key={f} className="rounded-md border bg-white px-3 py-1.5 text-sm text-navy-800">
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
