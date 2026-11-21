import type { ReactNode } from "react";
import { Info, ShieldAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warning" | "guard"; title?: string; children: ReactNode; className?: string }) {
  const styles = {
    info: "border-sky-200 bg-sky-50/70 text-sky-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    guard: "border-navy-200 bg-navy-50 text-navy-900",
  };
  const Icon = { info: Info, warning: TriangleAlert, guard: ShieldAlert }[tone];
  return (
    <div className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", styles[tone], className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div>
      </div>
    </div>
  );
}
