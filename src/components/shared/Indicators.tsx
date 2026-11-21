import { AlertTriangle, Ban, CheckCircle2, CircleDashed, Flag, HelpCircle, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MappingStatus, MatchStatus, ReviewStatus, RiskLevel } from "@/types";
import { MATCH_STATUS_META } from "@/services/ai/matching";

export function confidenceTone(score: number) {
  if (score >= 0.82) return { bar: "bg-emerald-500", text: "text-emerald-700", label: "High" };
  if (score >= 0.6) return { bar: "bg-sky-500", text: "text-sky-700", label: "Medium" };
  if (score >= 0.4) return { bar: "bg-amber-500", text: "text-amber-700", label: "Low" };
  return { bar: "bg-steel-400", text: "text-steel-600", label: "Very low" };
}

export function ConfidenceMeter({ score, className, showLabel = false }: { score: number; className?: string; showLabel?: boolean }) {
  const t = confidenceTone(score);
  const segments = 5;
  const filled = Math.max(1, Math.round(score * segments));
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("inline-flex items-center gap-2", className)}>
          <div className="flex gap-0.5" aria-hidden>
            {Array.from({ length: segments }).map((_, i) => (
              <span key={i} className={cn("h-3 w-1.5 rounded-[2px]", i < filled ? t.bar : "bg-steel-200")} />
            ))}
          </div>
          <span className={cn("font-mono text-xs font-semibold tabular-nums", t.text)}>{Math.round(score * 100)}%</span>
          {showLabel && <span className="text-xs text-muted-foreground">{t.label}</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent>Similarity score from the mock matching model. A score is not proof of technical compatibility.</TooltipContent>
    </Tooltip>
  );
}

export function MatchStatusBadge({ status, className }: { status: MatchStatus; className?: string }) {
  const meta = MATCH_STATUS_META[status];
  const Icon = { high: CheckCircle2, possible: HelpCircle, conflict: AlertTriangle, none: Ban }[status];
  const variant = { success: "success", info: "info", danger: "danger", neutral: "neutral" }[meta.tone] as "success" | "info" | "danger" | "neutral";
  return (
    <Badge variant={variant} className={className}>
      <Icon />
      {meta.label}
    </Badge>
  );
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const map = {
    pending: { v: "neutral", Icon: CircleDashed, label: "Awaiting review" },
    approved: { v: "success", Icon: ShieldCheck, label: "Approved" },
    rejected: { v: "danger", Icon: XCircle, label: "Rejected" },
    flagged: { v: "warning", Icon: Flag, label: "Flagged" },
  } as const;
  const m = map[status];
  return (
    <Badge variant={m.v}>
      <m.Icon />
      {m.label}
    </Badge>
  );
}

export function MappingBadge({ status }: { status: MappingStatus }) {
  if (status === "verified")
    return (
      <Badge variant="success">
        <ShieldCheck />
        Verified
      </Badge>
    );
  if (status === "ai-suggested")
    return (
      <Badge variant="info">
        <Sparkles />
        AI-suggested
      </Badge>
    );
  return (
    <Badge variant="warning">
      <HelpCircle />
      Unmatched
    </Badge>
  );
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const v = { high: "danger", medium: "warning", low: "success" } as const;
  return <Badge variant={v[risk]}>{risk[0].toUpperCase() + risk.slice(1)} risk</Badge>;
}

export function MockBadge({ label = "Mock AI", className }: { label?: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Badge variant="mock" className={className}>
            <Sparkles />
            {label}
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent>Demonstration output from a simulated service. No production AI model is connected.</TooltipContent>
    </Tooltip>
  );
}
