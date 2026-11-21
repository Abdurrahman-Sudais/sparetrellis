import { SITE } from "./site";
import { DemoForm } from "./LeadForms";

const wrap = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";
const eyebrowCls = "text-xs font-semibold tracking-wide text-primary";

/** The planned AWS architecture: why AWS, the stages with their services, cross-cutting services, and every service’s role. */
export function AwsSection() {
  const a = SITE.aws;
  return (
    <section id="technology" className="py-20 sm:py-24">
      <div className={wrap}>
        <p className={eyebrowCls}>Planned AWS infrastructure</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">How {SITE.name} uses Amazon Web Services</h2>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{a.why}</p>
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {a.stages.map(([title, services, text], i) => (
            <li key={title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <span className="font-mono text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 font-semibold text-foreground">{title}</h3>
              <p className="mt-2 flex flex-wrap gap-1.5">{services.map((s) => <span key={s} className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{s}</span>)}</p>
              <p className="mt-3 text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 rounded-xl border border-dashed border-border p-5">
          <p className={eyebrowCls}>Across every stage</p>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{a.across.map(([s, r]) => <li key={s}><b className="font-semibold text-foreground">{s}</b> {r}</li>)}</ul>
        </div>
        <h3 className="mt-12 text-lg font-semibold text-foreground">Services and their role in {SITE.name}</h3>
        <dl className="mt-4 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {a.services.map(([s, r]) => <div key={s} className="bg-card p-4"><dt className="text-sm font-semibold text-foreground">{s}</dt><dd className="mt-1 text-sm text-muted-foreground">{r}</dd></div>)}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">Planned, not yet deployed. The demo runs in your browser on fictional data, with AI features simulated and labelled.</p>
      </div>
    </section>
  );
}

/** Where the company is today, and a demo request form beside it. */
export function ProgressAndDemo() {
  return (
    <section id="demo" className="bg-muted/30 py-20 sm:py-24">
      <div className={`${wrap} grid gap-12 lg:grid-cols-2 lg:items-start`}>
        <div>
          <p className={eyebrowCls}>Progress & demos</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{SITE.demoTitle}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{SITE.demoIntro}</p>
          <ol className="mt-8 border-l border-border">
            {SITE.progress.map(([status, title, detail]) => (
              <li key={title} className="relative grid grid-cols-[64px_1fr] gap-3 py-3 pl-6">
                <span className={`absolute -left-[5px] top-[18px] h-2.5 w-2.5 rounded-full ${status === "Next" ? "border-2 border-primary bg-background" : "bg-primary"}`} />
                <span className="pt-0.5 font-mono text-xs text-primary">{status}</span>
                <div><b className="font-semibold text-foreground">{title}</b><p className="text-sm text-muted-foreground">{detail}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <DemoForm />
      </div>
    </section>
  );
}
