import { Cycle, Marquee, Stats, Words } from "@/kit/Flow";
import { AwsSection, ProgressAndDemo } from "@/kit/Sections";
import { SITE } from "@/kit/site";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  FileUp,
  GitCompareArrows,
  ScanSearch,
  ShieldCheck,
  SpellCheck2,
  TrendingUp,
  UserCheck,
  Warehouse,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CtaBand, SectionHeading } from "@/components/marketing/Sections";
import { DashboardShot, DiscoveryShot, ForecastShot, MatchShot } from "@/components/marketing/ProductShots";

const WORKFLOW = [
  { icon: FileUp, title: "Import inventory", text: "Load CSV and Excel extracts, catalogues, purchase records and supplier price lists. Map columns once." },
  { icon: GitCompareArrows, title: "Identify duplicates", text: "AI compares descriptions, part numbers, specs, manufacturers and units across every record." },
  { icon: UserCheck, title: "Review matches", text: "Specialists approve, reject or flag each suggested relationship. Nothing merges automatically." },
  { icon: ScanSearch, title: "Discover stock", text: "Search once and see matching stock in every warehouse — including items filed under other names." },
  { icon: TrendingUp, title: "Review reorders", text: "Forecasts built for intermittent demand propose quantities. Planners decide." },
];

const FEATURES = [
  { icon: GitCompareArrows, title: "AI catalogue matching", text: "Similarity scoring with matching and conflicting attributes shown side by side." },
  { icon: SpellCheck2, title: "Part normalization", text: "Standard descriptions, units and manufacturer names with a full audit trail." },
  { icon: Warehouse, title: "Multi-warehouse discovery", text: "Available and reserved quantities across sites, with match confidence on every row." },
  { icon: TrendingUp, title: "Intermittent-demand forecasting", text: "Croston-style methods for slow-moving spares, with reorder suggestions for approval." },
  { icon: BarChart3, title: "Reports & exports", text: "Duplicate, reconciliation and estimated savings reports in PDF and CSV." },
  { icon: ShieldCheck, title: "Human approval built in", text: "Every relationship, correction and reorder is a suggestion until a person signs off." },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="absolute inset-0 bg-grid bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_75%)]" />
        <div className="absolute -right-40 top-20 h-[520px] w-[720px] rounded-full bg-amber-500/10 blur-3xl" />
        <div className="container relative grid items-center gap-14 py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Industrial inventory intelligence
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
              <Words>Your spare parts might already be <span className="text-amber-400">in stock.</span></Words>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-steel-300">
              SpareTrellis uses AI to connect inconsistent inventory records, identify duplicate parts, and help maintenance teams find existing stock before placing new orders.
            </p>
            <p className="mt-4 text-base text-steel-300"><Cycle lead="Built for" items={SITE.cycle} accent="text-amber-400" /></p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg">
                <a href="#demo">
                  Request a demo <ArrowRight />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link to="/login">Explore the live demo</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-steel-400">
              {["No ERP replacement", "Human-approved relationships", "Works with messy spreadsheets"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-amber-400" />
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="relative">
            <DashboardShot className="lg:translate-x-6" />
            <MatchShot className="relative -mt-16 ml-auto w-[88%] md:-mt-24" />
          </div>
        </div>
      </section>

      <Marquee items={SITE.marquee} label={`What ${SITE.name} is built for`} />
      <Stats items={SITE.stats} />

      {/* Problem */}
      <section className="border-b bg-steel-50 py-16">
        <div className="container grid gap-10 md:grid-cols-3">
          {[
            ["“BRG 6205 2RS”, “Ball bearing 25x52 sealed”, “6205DDU”", "Same part. Three names. Three warehouses. The catalogue says you have none."],
            ["Duplicate purchases", "When records don't connect, maintenance teams order what's already sitting on a shelf at another site."],
            ["Unclear stock position", "Planners can't trust reorder points when stock is scattered under inconsistent descriptions and units."],
          ].map(([t, d]) => (
            <div key={t} className="border-l-2 border-amber-500 pl-5">
              <div className="font-mono text-sm font-semibold text-navy-900">{t}</div>
              <p className="mt-2 text-sm leading-relaxed text-steel-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="bg-white py-24">
        <div className="container">
          <SectionHeading center eyebrow="The core workflow" title="From messy records to confident decisions" description="Five steps, each with a human checkpoint. SpareTrellis does the comparison work; your specialists make the calls." />
          <div className="mt-14 grid gap-4 md:grid-cols-5">
            {WORKFLOW.map((s, i) => (
              <div key={s.title} className="relative rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-amber-400">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-steel-400">0{i + 1}</span>
                </div>
                <div className="mt-4 font-semibold text-navy-900">{s.title}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-steel-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature: matching */}
      <section className="bg-steel-50 py-24">
        <div className="container grid items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="AI catalogue matching" title="See why records match — and where they don't" description="Every suggestion shows the original record, the candidate, a similarity score, matching attributes, conflicting attributes and a recommended action." />
            <ul className="mt-6 space-y-3 text-sm text-steel-700">
              {["Compares descriptions, part numbers, dimensions, specs, manufacturers and units", "Highlights conflicts like seal type, coil voltage or material", "Approve, reject or flag for engineering — with an audit trail"].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <MatchShot />
        </div>
      </section>

      {/* Feature: discovery */}
      <section className="bg-white py-24">
        <div className="container grid items-center gap-14 lg:grid-cols-2">
          <DiscoveryShot className="order-2 lg:order-1" />
          <div className="order-1 lg:order-2">
            <SectionHeading eyebrow="Stock discovery" title="One search across every warehouse" description="Search by description, part number, equipment, manufacturer or alternative name. Results show available and reserved quantities with match confidence." />
            <Button asChild variant="link" className="mt-4 px-0 text-amber-700">
              <Link to="/features">
                Explore all features <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature: forecasting */}
      <section className="bg-steel-50 py-24">
        <div className="container grid items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Demand forecasting" title="Built for spares that move rarely" description="Spare parts demand is intermittent and lumpy. SpareTrellis classifies each item's demand pattern and applies suitable methods, then proposes reorder quantities for planner approval." />
          </div>
          <ForecastShot />
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-navy-950 py-24 text-white">
        <div className="container">
          <SectionHeading dark center eyebrow="Platform" title="Everything inventory specialists need" />
          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-navy-950 p-7">
                <f.icon className="h-6 w-6 text-amber-400" />
                <div className="mt-4 font-semibold">{f.title}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-steel-400">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Principle */}
      <section className="bg-white py-24">
        <div className="container">
          <div className="grid gap-10 rounded-2xl border bg-steel-50 p-8 md:grid-cols-[auto_1fr] md:p-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy-900 text-amber-400">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-navy-900">Similar is not the same. We never pretend otherwise.</h3>
              <p className="mt-3 max-w-3xl leading-relaxed text-steel-600">
                Two bearings with near-identical descriptions can differ in seal type, clearance or cage material. SpareTrellis never merges records or declares parts interchangeable on its own.
                Every suggested relationship stays a suggestion until an inventory specialist verifies it, and cross-manufacturer equivalence is routed to engineering.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["No automatic merges", "Original records retained", "Full audit trail", "Engineering escalation"].map((t) => (
                  <span key={t} className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-navy-800">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AWS */}
      <section className="border-y bg-white py-14">
        <div className="container flex flex-col items-center gap-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-steel-500">Designed for AWS</div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-semibold text-steel-600">
            {["Amazon Bedrock", "Amazon Textract", "Amazon SageMaker AI", "Amazon S3", "Amazon DynamoDB", "AWS Lambda", "Amazon Cognito", "Amazon CloudWatch"].map((s) => (
              <span key={s} className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-amber-600" />
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      <AwsSection />

      <ProgressAndDemo />

      <CtaBand />
    </>
  );
}
