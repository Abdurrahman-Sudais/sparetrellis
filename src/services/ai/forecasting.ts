/**
 * Demand forecasting service.
 *
 * `DemandForecastProvider` is the abstraction the UI depends on.
 * `SimulatedForecastProvider` runs in the browser using classical methods
 * suitable for spare parts: Syntetos–Boylan demand classification, Croston/SBA
 * for intermittent and lumpy demand, and simple exponential smoothing for
 * smooth demand. Its outputs are SIMULATED and labelled as such in the UI.
 *
 * `SageMakerForecastProvider` is the placeholder for a future Amazon
 * SageMaker AI endpoint (e.g. a DeepAR or intermittent-demand model).
 *
 * All reorder quantities are SUGGESTIONS for planner approval.
 */
import type { DemandPattern, ForecastItem, RiskLevel } from "@/types";

export interface ForecastOutput {
  pattern: DemandPattern;
  adi: number;
  cv2: number;
  method: string;
  monthlyForecast: number;
  horizon: number[];
  lower: number[];
  upper: number[];
  sigma: number;
}

export interface DemandForecastProvider {
  readonly id: string;
  readonly label: string;
  readonly isSimulated: boolean;
  forecast(history: number[], horizonMonths: number): ForecastOutput;
}

function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function std(xs: number[]) {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

export function classifyDemand(history: number[]): { pattern: DemandPattern; adi: number; cv2: number } {
  const nonZero = history.filter((x) => x > 0);
  const adi = nonZero.length ? history.length / nonZero.length : history.length;
  const m = mean(nonZero);
  const cv2 = nonZero.length > 1 && m > 0 ? (std(nonZero) / m) ** 2 : 0;
  let pattern: DemandPattern;
  if (adi > 1.32 && cv2 < 0.49) pattern = "intermittent";
  else if (adi > 1.32) pattern = "lumpy";
  else if (cv2 >= 0.49) pattern = "erratic";
  else pattern = "smooth";
  return { pattern, adi, cv2 };
}

/** Croston's method with the Syntetos–Boylan approximation (SBA). */
export function crostonSBA(history: number[], alpha = 0.15): number {
  let z = 0; // demand size estimate
  let p = 0; // interval estimate
  let q = 1;
  let initialised = false;
  for (const d of history) {
    if (d > 0) {
      if (!initialised) {
        z = d;
        p = q;
        initialised = true;
      } else {
        z = z + alpha * (d - z);
        p = p + alpha * (q - p);
      }
      q = 1;
    } else {
      q++;
    }
  }
  if (!initialised || p === 0) return 0;
  return (1 - alpha / 2) * (z / p);
}

export function ses(history: number[], alpha = 0.3): number {
  if (!history.length) return 0;
  let level = history[0];
  for (const d of history.slice(1)) level = level + alpha * (d - level);
  return level;
}

export class SimulatedForecastProvider implements DemandForecastProvider {
  readonly id = "simulated-browser";
  readonly label = "Simulated forecast (Croston/SBA + SES, in-browser)";
  readonly isSimulated = true;

  forecast(history: number[], horizonMonths: number): ForecastOutput {
    const { pattern, adi, cv2 } = classifyDemand(history);
    const useCroston = pattern === "intermittent" || pattern === "lumpy";
    const f = useCroston ? crostonSBA(history) : ses(history);
    const sigma = std(history);
    const band = useCroston ? 1.28 * sigma : 1.0 * sigma;
    const horizon = Array.from({ length: horizonMonths }, () => Number(f.toFixed(2)));
    return {
      pattern,
      adi,
      cv2,
      method: useCroston ? "Croston (SBA)" : "Simple exponential smoothing",
      monthlyForecast: f,
      horizon,
      lower: horizon.map((v) => Math.max(0, Number((v - band).toFixed(2)))),
      upper: horizon.map((v) => Number((v + band).toFixed(2))),
      sigma,
    };
  }
}

/** Placeholder for the future Amazon SageMaker AI integration. */
export class SageMakerForecastProvider implements DemandForecastProvider {
  readonly id = "sagemaker";
  readonly label = "Amazon SageMaker AI endpoint (not connected)";
  readonly isSimulated = false;
  constructor(private readonly endpointName?: string) {}

  forecast(): ForecastOutput {
    throw new Error(
      `SageMaker endpoint ${this.endpointName ?? "(unset)"} is not configured. ` +
        "Invoke via API Gateway → Lambda → sagemaker-runtime:InvokeEndpoint once deployed.",
    );
  }
}

export const forecastProvider: DemandForecastProvider = new SimulatedForecastProvider();

const Z: Record<ForecastItem["criticality"], number> = { A: 1.88, B: 1.65, C: 1.28 };

export interface ReorderRecommendation {
  forecast: ForecastOutput;
  available: number;
  position: number;
  leadTimeMonths: number;
  demandDuringLeadTime: number;
  safetyStock: number;
  reorderPoint: number;
  suggestedQty: number;
  monthsOfCover: number;
  risk: RiskLevel;
  needsReorder: boolean;
}

export function recommendReorder(item: ForecastItem, provider: DemandForecastProvider = forecastProvider): ReorderRecommendation {
  const forecast = provider.forecast(item.history, 6);
  const available = Math.max(0, item.onHand - item.reserved);
  const position = available + item.onOrder;
  const leadTimeMonths = item.leadTimeDays / 30;
  const demandDuringLeadTime = forecast.monthlyForecast * leadTimeMonths;
  const safetyStock = Z[item.criticality] * forecast.sigma * Math.sqrt(leadTimeMonths);
  const reorderPoint = Math.ceil(demandDuringLeadTime + safetyStock);
  const reviewPeriodDemand = forecast.monthlyForecast * 3;
  const needsReorder = position <= reorderPoint;
  const raw = needsReorder ? reorderPoint + reviewPeriodDemand - position : 0;
  const suggestedQty = needsReorder ? Math.max(item.moq, Math.ceil(raw / item.moq) * item.moq) : 0;
  const monthsOfCover = forecast.monthlyForecast > 0 ? available / forecast.monthlyForecast : 99;
  let risk: RiskLevel = "low";
  if (position < demandDuringLeadTime) risk = "high";
  else if (position <= reorderPoint) risk = "medium";
  return {
    forecast,
    available,
    position,
    leadTimeMonths,
    demandDuringLeadTime,
    safetyStock,
    reorderPoint,
    suggestedQty,
    monthsOfCover,
    risk,
    needsReorder,
  };
}

export const PATTERN_META: Record<DemandPattern, { label: string; description: string }> = {
  smooth: { label: "Smooth", description: "Regular demand with low variability" },
  intermittent: { label: "Intermittent", description: "Infrequent demand, consistent size" },
  lumpy: { label: "Lumpy", description: "Infrequent demand, highly variable size" },
  erratic: { label: "Erratic", description: "Frequent demand, highly variable size" },
};
