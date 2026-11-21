import { Activity, ArrowDown, ArrowRight, Brain, Database, FileScan, FunctionSquare, HardDrive, KeyRound, LineChart, Monitor } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/shared/Notice";
import { AWS_SERVICES, type AwsServiceStatus } from "@/services/aws/integration";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Brain> = {
  bedrock: Brain,
  textract: FileScan,
  sagemaker: LineChart,
  s3: HardDrive,
  dynamodb: Database,
  lambda: FunctionSquare,
  cognito: KeyRound,
  cloudwatch: Activity,
};

const STATUS: Record<AwsServiceStatus, { v: "mock" | "neutral" | "success"; l: string }> = {
  mock: { v: "mock", l: "Mocked in demo" },
  planned: { v: "neutral", l: "Planned" },
  configured: { v: "success", l: "Configured" },
};

function Node({ id, label, sub, className }: { id?: string; label: string; sub?: string; className?: string }) {
  const Icon = id ? ICONS[id] : Monitor;
  return (
    <div className={cn("flex items-center gap-2.5 rounded-lg border bg-white px-3 py-2.5 shadow-sm", className)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy-900 text-amber-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-navy-900">{label}</div>
        {sub && <div className="truncate text-[11px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

export default function Architecture() {
  return (
    <div>
      <PageHeader
        eyebrow="Platform"
        title="AWS architecture"
        description="How SpareTrellis maps to AWS services in production, and which parts of this demonstration are mocked."
      />

      <Notice tone="info" className="mb-6" title="Demo vs. production">
        This build runs entirely in the browser. Mock services implement the same TypeScript interfaces production clients will use, so swapping in Amazon Bedrock, Textract or SageMaker AI requires no UI changes.
      </Notice>

      <Card className="mb-6 overflow-hidden">
        <CardHeader>
          <CardTitle>Reference architecture</CardTitle>
          <CardDescription>Core workflow: import → match → review → discover → forecast</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-steel-50 bg-grid bg-[size:24px_24px] p-5">
            <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1.2fr_auto_1.4fr]">
              <div className="space-y-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-steel-500">Users</div>
                <Node label="SpareTrellis web app" sub="React · Vite · CloudFront" />
                <Node id="cognito" label="Amazon Cognito" sub="Sign-in, SSO, roles" />
              </div>
              <ArrowRight className="mx-auto hidden h-5 w-5 text-steel-400 lg:block" />
              <ArrowDown className="mx-auto h-5 w-5 text-steel-400 lg:hidden" />
              <div className="space-y-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-steel-500">Processing</div>
                <Node id="s3" label="Amazon S3" sub="Uploads & report exports" />
                <Node id="lambda" label="AWS Lambda" sub="Import, matching & report workflows" />
                <Node id="dynamodb" label="Amazon DynamoDB" sub="Inventory, relationships, audit" />
              </div>
              <ArrowRight className="mx-auto hidden h-5 w-5 text-steel-400 lg:block" />
              <ArrowDown className="mx-auto h-5 w-5 text-steel-400 lg:hidden" />
              <div className="space-y-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-steel-500">AI services</div>
                <Node id="bedrock" label="Amazon Bedrock" sub="Embeddings + LLM attribute reasoning" className="border-violet-200" />
                <Node id="textract" label="Amazon Textract" sub="PO & catalogue extraction" className="border-violet-200" />
                <Node id="sagemaker" label="Amazon SageMaker AI" sub="Intermittent-demand forecasting" className="border-violet-200" />
              </div>
            </div>
            <div className="mt-4 border-t border-dashed pt-4">
              <Node id="cloudwatch" label="Amazon CloudWatch" sub="Metrics, logs and alarms across every component" className="max-w-md" />
            </div>
          </div>
          <ol className="mt-5 grid gap-3 text-sm md:grid-cols-5">
            {[
              ["Import", "Files land in S3; a Lambda validates rows. PDFs go through Textract."],
              ["Match", "Lambda generates candidate pairs; Bedrock scores and explains them."],
              ["Review", "Decisions are written to DynamoDB with a full audit trail."],
              ["Discover", "Search queries verified relationships and embeddings across warehouses."],
              ["Forecast", "SageMaker endpoint forecasts demand; suggestions await planner approval."],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 font-semibold text-navy-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-navy-900 font-mono text-[10px] text-amber-400">{i + 1}</span>
                  {t}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {AWS_SERVICES.map((s) => {
          const Icon = ICONS[s.id];
          return (
            <Card key={s.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-900 text-amber-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <Badge variant={STATUS[s.status].v}>{STATUS[s.status].l}</Badge>
                </div>
                <CardTitle className="pt-2">{s.service}</CardTitle>
                <CardDescription>{s.role}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <ul className="space-y-1.5 text-xs text-steel-700">
                  {s.usage.map((u) => (
                    <li key={u} className="flex gap-1.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                      {u}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto space-y-1 border-t pt-3 font-mono text-[10px] text-muted-foreground">
                  {s.mockModule && <div className="break-words">↳ {s.mockModule}</div>}
                  {s.envVar && <div>env: {s.envVar}</div>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Provider interfaces</CardTitle>
          <CardDescription>The seams where mock services are replaced by AWS clients</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="scrollbar-thin overflow-x-auto rounded-lg bg-navy-950 p-4 font-mono text-xs leading-relaxed text-steel-200">
{`// services/ai/matching.ts
interface CatalogueMatchingProvider {
  compare(a: ComparableRecord, b: ComparableRecord): MatchResult; // score, matching, conflicting, recommendedAction
}
// Demo: MockBedrockMatcher   →  Production: BedrockMatcher (Lambda + Bedrock embeddings/LLM)

// services/ai/forecasting.ts
interface DemandForecastProvider {
  forecast(history: number[], horizonMonths: number): ForecastOutput;
}
// Demo: SimulatedForecastProvider (Croston SBA / SES)  →  Production: SageMakerForecastProvider

// Guardrail (enforced in UI + data model):
//   MatchCandidate.reviewStatus starts "pending"; only a human action sets "approved".
//   Approval links records (relationship) — records are never merged.`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
