import { FileUp, GitCompareArrows, UserCheck, ScanSearch, TrendingUp, ShieldCheck } from "lucide-react";
import { CtaBand, PageHero, SectionHeading } from "@/components/marketing/Sections";

const STEPS = [
  { icon: FileUp, title: "Import inventory", text: "Upload CSV or Excel extracts, catalogues, purchase records or supplier catalogues. SpareTrellis suggests a column mapping; you confirm it. Validation flags errors, unknown warehouses, unit problems and likely duplicates before anything is committed.", human: "You confirm the mapping and choose what to import." },
  { icon: GitCompareArrows, title: "Identify duplicates", text: "The matching engine extracts technical attributes from descriptions — designations, dimensions, ratings, materials — and compares them with part numbers, manufacturers and units. Each pair gets a similarity score and a status.", human: "Scores are evidence, not decisions." },
  { icon: UserCheck, title: "Review matches", text: "Specialists see both records side by side with matching and conflicting attributes. They approve the relationship, reject it, or flag it for engineering. Approved duplicates are linked — both original records are kept.", human: "Only people create relationships. Cross-manufacturer equivalence needs engineering confirmation." },
  { icon: ScanSearch, title: "Discover available stock", text: "Search once across every warehouse using any name a part is known by. Results show available and reserved quantities, units, last update and match confidence.", human: "Confidence is shown so you can verify before you transfer." },
  { icon: TrendingUp, title: "Review reorder recommendations", text: "Consumption history is classified as smooth, intermittent, lumpy or erratic and forecast with suitable methods. Suggested quantities account for lead time, safety stock and stock found elsewhere in the network.", human: "Planners approve, adjust, defer or reject every suggestion." },
];

export default function HowItWorks() {
  return (
    <>
      <PageHero eyebrow="How it works" title="AI does the comparing. People make the decisions." description="A five-step workflow that turns inconsistent inventory records into a trusted view of stock — with a human checkpoint at every step." />
      <section className="bg-white py-20">
        <div className="container max-w-4xl">
          <ol className="relative space-y-10 border-l-2 border-steel-200 pl-8">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="absolute -left-[49px] flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 font-mono text-sm font-bold text-amber-400 ring-4 ring-white">{i + 1}</span>
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <s.icon className="h-5 w-5 text-amber-600" />
                    <h2 className="text-xl font-bold text-navy-900">{s.title}</h2>
                  </div>
                  <p className="mt-3 leading-relaxed text-steel-600">{s.text}</p>
                  <div className="mt-4 flex items-start gap-2 rounded-md bg-navy-50 px-3 py-2 text-sm text-navy-800">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    {s.human}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="bg-navy-950 py-20 text-white">
        <div className="container">
          <SectionHeading dark eyebrow="Under the hood" title="Architected for AWS" description="Amazon Bedrock for semantic matching, Amazon Textract for document extraction, Amazon SageMaker AI for forecasting, with S3, DynamoDB, Lambda, Cognito and CloudWatch. The demo uses clearly labelled mock services behind the same interfaces." />
        </div>
      </section>
      <CtaBand />
    </>
  );
}
