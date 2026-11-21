import { useState, type ReactNode } from "react";
import { SITE } from "./site";
import { COMPANY_SIZES, blankContact, blankDemo, contactPayload, demoPayload, submit, validateContact, validateDemo, type Contact, type Demo } from "./leads";

const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {});
const box = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30";

function Field({ id, label, error, wide, children }: { id: string; label: string; error?: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p id={`${id}-err`} className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Done({ how, again }: { how: "sent" | "email"; again: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm" role="status">
      <h3 className="text-xl font-semibold text-foreground">{how === "sent" ? "Thank you — we’ve got it." : "Your email app should have opened."}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{how === "sent" ? `${SITE.founder} will reply personally, usually within two working days.` : `Send the pre-filled message to ${SITE.email} and ${SITE.founder.split(" ")[0]} will reply personally.`}</p>
      <button type="button" onClick={again} className="mt-5 text-sm font-medium text-primary underline underline-offset-4">Send another</button>
    </div>
  );
}

const ctx = () => ({ pageUri: window.location.href, pageName: document.title });
const aria = (id: string, err?: string) => ({ id, "aria-invalid": err ? true : undefined, "aria-describedby": err ? `${id}-err` : undefined });

export function DemoForm({ submitLabel = "Request a demo" }: { submitLabel?: string }) {
  const [f, setF] = useState<Demo>(blankDemo);
  const [err, setErr] = useState<Partial<Record<keyof Demo, string>>>({});
  const [state, setState] = useState<"idle" | "busy" | "sent" | "email">("idle");
  const [fail, setFail] = useState("");
  const set = <K extends keyof Demo>(k: K, val: Demo[K]) => setF({ ...f, [k]: val });
  if (state === "sent" || state === "email") return <Done how={state} again={() => { setF(blankDemo()); setState("idle"); }} />;
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.website) return;
    const v = validateDemo(f); setErr(v);
    if (Object.keys(v).length) return;
    setState("busy"); setFail("");
    try { setState(await submit("demo", demoPayload(f, ctx()), env)); } catch (x) { setFail((x as Error).message); setState("idle"); }
  };
  return (
    <form onSubmit={go} noValidate className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:grid-cols-2 sm:p-8" data-noflow>
      <Field id="d-name" label="Full name" error={err.name}><input {...aria("d-name", err.name)} className={box} autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field id="d-email" label="Work email" error={err.email}><input {...aria("d-email", err.email)} type="email" className={box} autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
      <Field id="d-company" label="Company" error={err.company}><input {...aria("d-company", err.company)} className={box} autoComplete="organization" value={f.company} onChange={(e) => set("company", e.target.value)} /></Field>
      <Field id="d-size" label="Company size" error={err.size}><select {...aria("d-size", err.size)} className={box} value={f.size} onChange={(e) => set("size", e.target.value)}><option value="">Choose…</option>{COMPANY_SIZES.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field id="d-kind" label={SITE.orgLabel} error={err.kind}><select {...aria("d-kind", err.kind)} className={box} value={f.kind} onChange={(e) => set("kind", e.target.value)}><option value="">Choose…</option>{SITE.orgTypes.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field id="d-use" label="What would you like to explore first?" error={err.useCase}><select {...aria("d-use", err.useCase)} className={box} value={f.useCase} onChange={(e) => set("useCase", e.target.value)}><option value="">Choose…</option>{SITE.useCases.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field id="d-detail" label={`${SITE.detailLabel} (optional)`} wide><input id="d-detail" className={box} placeholder={SITE.detailPlaceholder} value={f.detail} onChange={(e) => set("detail", e.target.value)} /></Field>
      <Field id="d-msg" label="Anything else? (optional)" wide><textarea id="d-msg" rows={3} className={box} value={f.message} onChange={(e) => set("message", e.target.value)} /></Field>
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true"><label>Website <input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} /></label></div>
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground sm:col-span-2"><input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} /><span>I agree that {SITE.name} may contact me about this request. We never share your details.{err.consent && <span className="block text-xs text-destructive">{err.consent}</span>}</span></label>
      {fail && <p className="text-sm text-destructive sm:col-span-2" role="alert">{fail} You can email {SITE.email} directly.</p>}
      <div className="sm:col-span-2"><button type="submit" disabled={state === "busy"} className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60">{state === "busy" ? "Sending…" : submitLabel}</button></div>
    </form>
  );
}

export function ContactForm({ bare = false }: { bare?: boolean }) {
  const [f, setF] = useState<Contact>(blankContact);
  const [err, setErr] = useState<Partial<Record<keyof Contact, string>>>({});
  const [state, setState] = useState<"idle" | "busy" | "sent" | "email">("idle");
  const [fail, setFail] = useState("");
  const set = <K extends keyof Contact>(k: K, val: Contact[K]) => setF({ ...f, [k]: val });
  if (state === "sent" || state === "email") return <Done how={state} again={() => { setF(blankContact()); setState("idle"); }} />;
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.website) return;
    const v = validateContact(f); setErr(v);
    if (Object.keys(v).length) return;
    setState("busy"); setFail("");
    try { setState(await submit("contact", contactPayload(f, ctx()), env)); } catch (x) { setFail((x as Error).message); setState("idle"); }
  };
  return (
    <form onSubmit={go} noValidate className={bare ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:grid-cols-2 sm:p-8"} data-noflow>
      <Field id="c-name" label="Full name" error={err.name}><input {...aria("c-name", err.name)} className={box} autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field id="c-email" label="Email" error={err.email}><input {...aria("c-email", err.email)} type="email" className={box} autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
      <Field id="c-company" label="Company (optional)"><input id="c-company" className={box} autoComplete="organization" value={f.company} onChange={(e) => set("company", e.target.value)} /></Field>
      <Field id="c-topic" label="Topic" error={err.topic}><select {...aria("c-topic", err.topic)} className={box} value={f.topic} onChange={(e) => set("topic", e.target.value)}><option value="">Choose…</option>{SITE.topics.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field id="c-msg" label="Message" error={err.message} wide><textarea {...aria("c-msg", err.message)} rows={5} className={box} value={f.message} onChange={(e) => set("message", e.target.value)} /></Field>
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true"><label>Website <input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} /></label></div>
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground sm:col-span-2"><input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} /><span>I agree that {SITE.name} may reply to this message.{err.consent && <span className="block text-xs text-destructive">{err.consent}</span>}</span></label>
      {fail && <p className="text-sm text-destructive sm:col-span-2" role="alert">{fail} You can email {SITE.email} directly.</p>}
      <div className="sm:col-span-2"><button type="submit" disabled={state === "busy"} className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60">{state === "busy" ? "Sending…" : "Send message"}</button></div>
    </form>
  );
}
