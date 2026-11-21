import { SITE } from "./site";

// Lead capture: validation and HubSpot payloads for the demo-request and contact forms. Until HubSpot is
// configured (see .env.example), submitting opens a pre-filled email to the founder instead — nothing is faked.
export const COMPANY_SIZES = ["1–10 people", "11–50 people", "51–200 people", "201–1,000 people", "1,000+ people"] as const;

export type Demo = { name: string; email: string; company: string; size: string; kind: string; useCase: string; detail: string; message: string; consent: boolean; website: string };
export type Contact = { name: string; email: string; company: string; topic: string; message: string; consent: boolean; website: string };
export const blankDemo = (): Demo => ({ name: "", email: "", company: "", size: "", kind: "", useCase: "", detail: "", message: "", consent: false, website: "" });
export const blankContact = (): Contact => ({ name: "", email: "", company: "", topic: "", message: "", consent: false, website: "" });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Errors<T> = Partial<Record<keyof T, string>>;

export function validateDemo(f: Demo): Errors<Demo> {
  const e: Errors<Demo> = {};
  if (f.name.trim().length < 2) e.name = "Please enter your name.";
  if (!EMAIL.test(f.email.trim())) e.email = "Enter a valid work email.";
  if (f.company.trim().length < 2) e.company = "Company is required.";
  if (!f.size) e.size = "Choose your company size.";
  if (!f.kind) e.kind = `Choose your ${SITE.orgLabel.toLowerCase()}.`;
  if (!f.useCase) e.useCase = "Choose what you’d like to explore first.";
  if (!f.consent) e.consent = "Please agree so we can reply.";
  return e;
}

export function validateContact(f: Contact): Errors<Contact> {
  const e: Errors<Contact> = {};
  if (f.name.trim().length < 2) e.name = "Please enter your name.";
  if (!EMAIL.test(f.email.trim())) e.email = "Enter a valid email.";
  if (!f.topic) e.topic = "Choose a topic.";
  if (f.message.trim().length < 10) e.message = "Tell us a little more (10 characters minimum).";
  if (!f.consent) e.consent = "Please agree so we can reply.";
  return e;
}

const split = (n: string) => { const p = n.trim().split(/\s+/); return { firstname: p[0] ?? "", lastname: p.slice(1).join(" ") }; };
type Ctx = { pageUri: string; pageName: string };

export function demoPayload(f: Demo, ctx: Ctx) {
  const { firstname, lastname } = split(f.name);
  return { fields: [
    { name: "firstname", value: firstname }, { name: "lastname", value: lastname }, { name: "email", value: f.email.trim() }, { name: "company", value: f.company.trim() },
    { name: "company_size", value: f.size }, { name: "organisation_type", value: f.kind }, { name: "primary_use_case", value: f.useCase },
    { name: SITE.detailProp, value: f.detail.trim() }, { name: "message", value: f.message.trim() },
  ], context: ctx };
}

export function contactPayload(f: Contact, ctx: Ctx) {
  const { firstname, lastname } = split(f.name);
  return { fields: [
    { name: "firstname", value: firstname }, { name: "lastname", value: lastname }, { name: "email", value: f.email.trim() }, { name: "company", value: f.company.trim() },
    { name: "contact_topic", value: f.topic }, { name: "enquiry_message", value: f.message.trim() },
  ], context: ctx };
}

type Env = Record<string, string | undefined>;
export function hubspot(kind: "demo" | "contact", env: Env) {
  const portal = env.VITE_HUBSPOT_PORTAL_ID;
  const form = kind === "demo" ? env.VITE_HUBSPOT_FORM_GUID : env.VITE_HUBSPOT_CONTACT_FORM_GUID;
  return portal && form ? { portal, form } : null;
}

export async function submit(kind: "demo" | "contact", payload: { fields: { name: string; value: string }[] }, env: Env): Promise<"sent" | "email"> {
  const hs = hubspot(kind, env);
  if (hs) {
    const r = await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${hs.portal}/${hs.form}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) throw new Error("The form service did not accept the submission.");
    return "sent";
  }
  const body = payload.fields.filter((x) => x.value).map((x) => `${x.name.replace(/_/g, " ")}: ${x.value}`).join("\n");
  const subject = kind === "demo" ? `${SITE.name} demo request` : `${SITE.name} enquiry`;
  window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return "email";
}
