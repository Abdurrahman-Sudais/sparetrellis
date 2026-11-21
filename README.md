# SpareTrellis

**Find the spare parts already in stock.**

SpareTrellis is an AI-assisted industrial inventory intelligence platform. It connects inconsistent spare-part records, identifies likely duplicates, and helps maintenance teams find existing stock across warehouses before placing new orders.

Founded by **Damilare Akinyemi** (Founder) and **Ngozi Ekwueme** (Co-founder).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

Log in with **Continue with demo account** (mock auth; any email + 8-char password also works). Use **Reset demo data** in the account menu to restore the initial dataset.

## Stack

Vite · React 18 · TypeScript · Tailwind CSS · shadcn/ui (Radix) · React Router · Lucide · Recharts · React Hook Form + Zod · jsPDF (PDF export).

## Core workflow

| Step | Page | What happens |
| --- | --- | --- |
| 1 | `/app/import` | Upload CSV/Excel/catalogues/purchase records → column mapping → validation (errors, warnings, duplicates) → import. |
| 2 | `/app/matching` | Review AI-suggested pairs: original vs. suggested record, similarity score, matching & conflicting attributes, recommended action. Approve / reject / flag. |
| 3 | `/app/discovery` | Search every warehouse by description, part number, equipment, manufacturer or alternative name. Spec-aware: “sealed” penalises shielded bearings. |
| 4 | `/app/forecasting` | Simulated intermittent-demand forecasts and reorder suggestions for planner approval, with network-stock checks. |

Also: dashboard, catalogue management, part normalization (with audit trail), reports (PDF/CSV), and an AWS architecture page.

## Guardrails

- Matches are **suggestions**. Only a person can approve a relationship, and approval **links** records — nothing is merged.
- Cross-manufacturer relationships are never “high confidence”; “verified equivalent” requires an engineering reference and attestation.
- Forecasts are labelled **simulated**; reorder quantities are **suggestions**.
- Savings figures are labelled **estimates, not realized savings**.

## Mock services & AWS seams

| Concern | Demo implementation | Production target |
| --- | --- | --- |
| Catalogue matching | `services/ai/matching.ts` → `MockBedrockMatcher` (rule-based spec extraction + weighted similarity) | Amazon Bedrock via AWS Lambda |
| Document extraction | `services/importService.ts` → `mockTextractExtract`, `mockExcelParse` | Amazon Textract, Lambda parser |
| Forecasting | `services/ai/forecasting.ts` → `SimulatedForecastProvider` (Syntetos–Boylan classification, Croston SBA, SES) | Amazon SageMaker AI (`SageMakerForecastProvider` stub) |
| Persistence | `hooks/useAppStore.tsx` (browser localStorage) | Amazon DynamoDB, Amazon S3 |
| Auth | `hooks/useAuth.tsx` | Amazon Cognito |
| Monitoring | — | Amazon CloudWatch |

Descriptors live in `services/aws/integration.ts`. Demo data is deterministic (`data/generate.ts`, fixed seed) for the fictional tenant *Meridian Process Industries*.

## Website: lead capture, AWS section and motion

- **Demo request** (home page, `#demo`) asks for company size, organisation type, primary use case and catalogue and sites; **contact** (`/contact`) has a topic picker. Both post to HubSpot when `VITE_HUBSPOT_*` is set (see `.env.example` and `docs/crm-plan.md`), otherwise they open a pre-filled email to hello@sparetrellis.com.
- **Planned AWS infrastructure** and **progress** sections on the home page are driven by `src/kit/site.ts`.
- **Motion:** headings, intros and card grids fade, rise and sharpen in sequence on scroll; the hero headline enters word by word with a cycling “Built for” line, followed by a marquee band and count-up figures from the demo data (`src/kit/flow.ts`, `src/kit/Flow.tsx`). Everything is shown immediately for visitors who prefer reduced motion.
