import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="32" height="32" rx="7" className="fill-navy-900" />
      <path d="M9 8v16M16 8v16M23 8v16M6 12h20M6 20h20" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2.6" fill="#fff" />
    </svg>
  );
}

export function Logo({ to = "/", dark = false, className }: { to?: string; dark?: boolean; className?: string }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("text-[17px] font-bold tracking-tight", dark ? "text-white" : "text-navy-900")}>
        Spare<span className="text-amber-500">Trellis</span>
      </span>
    </Link>
  );
}
