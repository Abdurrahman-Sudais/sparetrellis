import { CtaBand, PageHero, SectionHeading } from "@/components/marketing/Sections";
import { Compass, ShieldCheck, Wrench } from "lucide-react";

const FOUNDERS = [
  { name: "Damilare Akinyemi", role: "Founder", initials: "DA", bio: "Leads SpareTrellis's product and company vision, focused on giving maintenance teams a clear picture of the stock they already own." },
  { name: "Ngozi Ekwueme", role: "Co-founder", initials: "NE", bio: "Co-leads the company, shaping how SpareTrellis works with industrial customers and how its AI stays accountable to the people who use it." },
];

export default function About() {
  return (
    <>
      <PageHero eyebrow="About SpareTrellis" title="We help industrial teams find the spare parts they already have" description="Industrial organizations carry inventory they can't see because records don't connect. We're building the intelligence layer that connects them — carefully, with people in control." />
      <section className="bg-white py-20">
        <div className="container grid gap-12 lg:grid-cols-2">
          <SectionHeading eyebrow="Our mission" title="Improve inventory visibility. Avoid unnecessary duplicate purchases." />
          <div className="space-y-4 text-steel-600">
            <p className="leading-relaxed">A trellis gives structure to something that grows in every direction. That's how we think about inventory data: years of spreadsheets, migrations and free-text descriptions that need a frame before they're useful.</p>
            <p className="leading-relaxed">SpareTrellis uses AI to do the tedious comparison work — but the decisions about what is the same part, what can be substituted and what to buy stay with the specialists and engineers who are accountable for them.</p>
          </div>
        </div>
      </section>
      <section className="bg-steel-50 py-20">
        <div className="container">
          <SectionHeading center eyebrow="Leadership" title="Founders" />
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {FOUNDERS.map((f) => (
              <div key={f.name} className="rounded-xl border bg-white p-7">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy-900 text-lg font-bold text-amber-400">{f.initials}</div>
                  <div>
                    <div className="text-lg font-bold text-navy-900">{f.name}</div>
                    <div className="text-sm font-medium text-amber-700">{f.role}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-steel-600">{f.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-white py-20">
        <div className="container grid gap-6 md:grid-cols-3">
          {[
            { icon: ShieldCheck, t: "People decide", d: "AI proposes; specialists and engineers approve. No silent merges, no assumed compatibility." },
            { icon: Wrench, t: "Built for the shop floor", d: "Designed around how maintenance and stores teams actually search for and talk about parts." },
            { icon: Compass, t: "Honest numbers", d: "Estimates are labelled as estimates. Simulated outputs are labelled as simulated." },
          ].map((v) => (
            <div key={v.t} className="rounded-xl border p-6">
              <v.icon className="h-6 w-6 text-amber-600" />
              <div className="mt-4 font-semibold text-navy-900">{v.t}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-steel-600">{v.d}</p>
            </div>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
