import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "./AuthLayout";

const schema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid work email"),
    organization: z.string().min(2, "Organization is required"),
    role: z.string().min(1, "Select your role"),
    password: z.string().min(8, "At least 8 characters").regex(/[0-9]/, "Include at least one number"),
    confirm: z.string(),
    terms: z.boolean().refine((v) => v, "You must accept the terms"),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });
type Values = z.infer<typeof schema>;

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { role: "", terms: false },
  });

  const onSubmit = async (v: Values) => {
    await registerUser({ name: v.name, email: v.email, organization: v.organization, role: v.role });
    toast.success("Workspace created", { description: "You're exploring the Meridian Process Industries demo dataset." });
    navigate("/app");
  };

  return (
    <AuthLayout title="Start your free pilot" subtitle={<>Already have an account? <Link to="/login" className="font-medium text-amber-700 hover:underline">Log in</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={watch("role")} onValueChange={(v) => setValue("role", v, { shouldValidate: true })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["Inventory Specialist", "Maintenance Planner", "Stores Supervisor", "Reliability Engineer", "Procurement Lead", "Operations Manager"].map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-red-600">{errors.role.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="organization">Organization</Label>
          <Input id="organization" {...register("organization")} />
          {errors.organization && <p className="text-xs text-red-600">{errors.organization.message}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
            {errors.confirm && <p className="text-xs text-red-600">{errors.confirm.message}</p>}
          </div>
        </div>
        <label className="flex items-start gap-2.5 text-sm text-steel-600">
          <Checkbox checked={watch("terms")} onCheckedChange={(v) => setValue("terms", v === true, { shouldValidate: true })} className="mt-0.5" />
          I agree to the terms of service and understand AI outputs are suggestions that require human verification.
        </label>
        {errors.terms && <p className="-mt-2 text-xs text-red-600">{errors.terms.message}</p>}
        <Button type="submit" variant="accent" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Create workspace
        </Button>
      </form>
    </AuthLayout>
  );
}
