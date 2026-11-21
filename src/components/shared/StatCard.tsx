import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  tone = "navy",
  footer,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  sub?: ReactNode;
  tone?: "navy" | "amber" | "red" | "emerald" | "sky" | "steel";
  footer?: ReactNode;
}) {
  const tones = {
    navy: "bg-navy-50 text-navy-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-600",
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    steel: "bg-steel-100 text-steel-700",
  };
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-navy-900">{value}</div>
          {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", tones[tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      {footer && <div className="mt-3 border-t pt-2.5 text-xs">{footer}</div>}
    </Card>
  );
}
