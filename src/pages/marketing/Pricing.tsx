import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CtaBand, PageHero } from "@/components/marketing/Sections";
import { cn } from "@/lib/utils";

const TIERS = [
  { name: "Pilot", price: "Free", period: "60 days", desc: "Prove the value on one site's data.", features: ["Up to 10,000 inventory records", "2 warehouses", "AI matching & review queue", "Stock discovery", "Duplicate & savings estimate report"], cta: "Start free pilot", to: "/register" },
  { name: "Site", price: "$1,450", period: "per month", desc: "For a plant or depot running day to day.", features: ["Up to 75,000 records", "Up to 5 warehouses", "Part normalization & audit trail", "Reorder recommendations", "PDF & CSV reports", "Email support"], cta: "Start with Site", to: "/register", featured: true },
  { name: "Enterprise", price: "Custom", period: "annual", desc: "Multi-site networks and contractors.", features: ["Unlimited records & warehouses", "SSO via Amazon Cognito", "Dedicated AWS deployment options", "ERP/CMMS integrations", "Custom approval workflows", "Named customer success manager"], cta: "Talk to sales", to: "/contact" },
];

export default function Pricing() {
  return (
    <>
      <PageHero eyebrow="Pricing" title="Simple pricing that scales with your catalogue" description="Start with a free pilot on your own data. Upgrade when you've seen what's on your shelves." />
      <section className="bg-white py-20">
        <div className="container grid gap-6 lg:grid-cols-3">
          {TIERS.map((t) => (
            <div key={t.name} className={cn("flex flex-col rounded-xl border p-7", t.featured ? "border-amber-500 bg-navy-950 text-white shadow-xl ring-1 ring-amber-500" : "bg-white")}>
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">{t.name}</div>
                {t.featured && <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-charcoal-950">Most popular</span>}
              </div>
              <p className={cn("mt-1 text-sm", t.featured ? "text-steel-300" : "text-steel-600")}>{t.desc}</p>
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold tracking-tight">{t.price}</span>
                <span className={cn("text-sm", t.featured ? "text-steel-400" : "text-steel-500")}>{t.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm">
                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", t.featured ? "text-amber-400" : "text-emerald-600")} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant={t.featured ? "accent" : "outline"} className="mt-8">
                <Link to={t.to}>{t.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="container mt-8 text-center text-xs text-steel-500">Prices shown are illustrative for this demonstration. Any savings figures produced by SpareTrellis are estimates, not realized financial savings.</p>
      </section>
      <section className="bg-steel-50 py-20">
        <div className="container max-w-3xl">
          <h2 className="text-2xl font-bold text-navy-900">Frequently asked questions</h2>
          <div className="mt-6 divide-y rounded-xl border bg-white">
            {[
              ["Does SpareTrellis replace our ERP or CMMS?", "No. It sits alongside them, reading exports and producing reviewed relationships, corrections and reports you can feed back."],
              ["Will it merge our records automatically?", "Never. Matches are suggestions. Specialists approve relationships, and original records are always retained."],
              ["Can it tell us two parts are interchangeable?", "It can show evidence. Interchangeability between manufacturers must be verified by your engineering team before any substitution."],
              ["How are savings calculated?", "Reports estimate potential avoided purchases from stock found elsewhere. They are clearly labelled estimates — not realized savings."],
            ].map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="cursor-pointer list-none font-medium text-navy-900 marker:hidden">{q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-steel-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
