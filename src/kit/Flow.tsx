import { Children, isValidElement, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const still = () => typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const v = (i: number) => ({ "--i": i }) as CSSProperties;

/** Splits string children into words that rise in one after another; nested elements animate as single units. */
export function Words({ children }: { children: ReactNode }) {
  let i = 0;
  const out: ReactNode[] = [];
  Children.forEach(children, (c, k) => {
    if (typeof c === "string") {
      c.split(/(\s+)/).forEach((w, j) => {
        if (!w) return;
        if (/^\s+$/.test(w)) out.push(w);
        else out.push(<span key={`${k}-${j}`} className="fx-w" style={v(i++)}>{w}</span>);
      });
    } else if (isValidElement(c)) out.push(<span key={k} className="fx-wi" style={v(i++)}>{c}</span>);
    else if (c != null) out.push(c);
  });
  return <>{out}</>;
}

/** Cycles through items every few seconds. */
export function Cycle({ items, lead, ms = 2600, className = "", accent = "text-primary" }: { items: readonly string[]; lead?: string; ms?: number; className?: string; accent?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (still()) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % items.length), ms);
    return () => window.clearInterval(t);
  }, [items.length, ms]);
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 ${className}`}>
      {lead && <span>{lead}</span>}
      <b key={i} className={`fx-cycle font-semibold ${accent}`} aria-live="polite">{items[i]}</b>
    </span>
  );
}

/** Counts up to `to` the first time it scrolls into view. */
export function Count({ to, prefix = "", suffix = "", decimals = 0, ms = 1500 }: { to: number; prefix?: string; suffix?: string; decimals?: number; ms?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(() => (still() ? to : 0));
  useEffect(() => {
    const el = ref.current;
    if (!el || still() || !("IntersectionObserver" in window)) { setVal(to); return; }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (now: number) => { const p = Math.min(1, (now - t0) / ms); setVal(to * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, ms]);
  return <span ref={ref}>{prefix}{val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

/** A slow band of words that pauses on hover. */
export function Marquee({ items, label }: { items: readonly string[]; label: string }) {
  return (
    <div className="fx-mq border-y border-border bg-muted/40 py-5" role="region" aria-label={label}>
      <div className="fx-mq-track flex w-max gap-12 pl-12">
        {[0, 1].map((r) => items.map((t) => (
          <span key={`${r}-${t}`} aria-hidden={r === 1 ? true : undefined} className="inline-flex items-center gap-12 whitespace-nowrap text-sm font-medium text-muted-foreground">
            {t}<span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
          </span>
        )))}
      </div>
    </div>
  );
}

/** Four count-up figures taken from the demo data. */
export function Stats({ items, note = "Figures from the demo’s sample data." }: { items: readonly (readonly [number, string, string?, string?])[]; note?: string }) {
  return (
    <section aria-label="The product demo at a glance" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map(([n, l, pre, suf]) => (
          <div key={l} className="flex flex-col-reverse justify-end gap-2 rounded-xl border border-border bg-card p-5 shadow-sm">
            <dt className="text-sm leading-snug text-muted-foreground">{l}</dt>
            <dd className="text-4xl font-semibold tracking-tight text-foreground tabular-nums"><Count to={n} prefix={pre} suffix={suf} /></dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">{note}</p>
    </section>
  );
}
