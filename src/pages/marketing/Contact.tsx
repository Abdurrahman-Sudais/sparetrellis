import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, MapPin, Clock, Loader2 } from "lucide-react";
import { PageHero } from "@/components/marketing/Sections";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid work email"),
  company: z.string().min(2, "Company is required"),
  interest: z.string().min(1, "Choose a topic"),
  records: z.string().optional(),
  message: z.string().min(10, "Tell us a little more (10+ characters)"),
});
type FormValues = z.infer<typeof schema>;

export default function Contact() {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { interest: "" } });

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Message received", { description: "This is a demo form — nothing was sent. In production our team would reply within one business day." });
    reset();
  };

  return (
    <>
      <PageHero eyebrow="Contact" title="Let's look at your inventory together" description="Tell us about your sites and catalogue. We'll set up a pilot on your own data." />
      <section className="bg-white py-20">
        <div className="container grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            {[
              { icon: Mail, t: "Email", d: "hello@sparetrellis.com" },
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
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 rounded-xl border bg-white p-6 shadow-sm md:grid-cols-2 md:p-8" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" {...register("company")} />
              {errors.company && <p className="text-xs text-red-600">{errors.company.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Topic</Label>
              <Select value={watch("interest")} onValueChange={(v) => setValue("interest", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select a topic" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pilot">Free pilot</SelectItem>
                  <SelectItem value="demo">Product demo</SelectItem>
                  <SelectItem value="enterprise">Enterprise pricing</SelectItem>
                  <SelectItem value="partner">Partnership</SelectItem>
                </SelectContent>
              </Select>
              {errors.interest && <p className="text-xs text-red-600">{errors.interest.message}</p>}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="records">Approximate inventory records (optional)</Label>
              <Input id="records" placeholder="e.g. 40,000 across 6 warehouses" {...register("records")} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" rows={5} {...register("message")} />
              {errors.message && <p className="text-xs text-red-600">{errors.message.message}</p>}
            </div>
            <div className="md:col-span-2">
              <Button type="submit" variant="accent" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Send message
              </Button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
