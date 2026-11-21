import { ContactForm } from "@/kit/LeadForms";
import { SITE } from "@/kit/site";

import { Mail, MapPin, Clock } from "lucide-react";
import { PageHero } from "@/components/marketing/Sections";

export default function Contact() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Let's look at your inventory together" description="Tell us about your sites and catalogue. We'll set up a pilot on your own data." />
      <section className="bg-white py-20">
        <div className="container grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            {[
              { icon: Mail, t: "Email", d: SITE.email },
              { icon: MapPin, t: "Office", d: "Lagos, Nigeria · Remote-first team" },
              { icon: Clock, t: "Response time", d: "Within one business day" },
            ].map((c) => (
              <div key={c.t} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-amber-400">
                  <c.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-navy-900">{c.t}</div>
                  <div className="text-sm text-steel-600">{c.d}</div>
                </div>
              </div>
            ))}
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
