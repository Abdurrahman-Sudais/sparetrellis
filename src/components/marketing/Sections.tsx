import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHero({ eyebrow, title, description, children }: { eyebrow: string; title: ReactNode; description: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-navy-950 text-white">
      <div className="absolute inset-0 bg-grid bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="absolute -top-40 right-0 h-[420px] w-[620px] rounded-full bg-amber-500/10 blur-3xl" />
      <div className="container relative py-20 md:py-24">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">{eyebrow}</div>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-steel-300">{description}</p>
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, description, center = false, dark = false }: { eyebrow?: string; title: ReactNode; description?: ReactNode; center?: boolean; dark?: boolean }) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h2 className={cn("mt-2 text-3xl font-bold tracking-tight md:text-4xl", dark ? "text-white" : "text-navy-900")}>{title}</h2>
      {description && <p className={cn("mt-4 text-lg leading-relaxed", dark ? "text-steel-300" : "text-steel-600")}>{description}</p>}
    </div>
  );
}

export function CtaBand({ title = "See what's already on your shelves.", description = "Upload a stock extract and get a duplicate and stock-discovery assessment in a guided pilot." }: { title?: string; description?: string }) {
  return (
    <section className="bg-white py-20">
      <div className="container">
        <div className="relative overflow-hidden rounded-2xl bg-navy-900 px-8 py-14 text-white md:px-14">
          <div className="absolute inset-0 bg-grid bg-[size:32px_32px] opacity-60" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
              <p className="mt-3 text-steel-300">{description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg">
                <Link to="/#demo">
                  Request a demo <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link to="/contact">Talk to us</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
