import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DEMO_USER, useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "./AuthLayout";
import { useState } from "react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type Values = z.infer<typeof schema>;

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/app";
  const [demoLoading, setDemoLoading] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Values) => {
    await signIn(v.email);
    navigate(from, { replace: true });
  };

  const demo = async () => {
    setDemoLoading(true);
    await signIn(DEMO_USER.email);
    navigate(from, { replace: true });
  };

  return (
    <AuthLayout title="Log in to SpareTrellis" subtitle={<>New here? <Link to="/register" className="font-medium text-amber-700 hover:underline">Create an account</Link></>}>
      <Button type="button" variant="accent" className="w-full" size="lg" onClick={demo} disabled={demoLoading}>
        {demoLoading ? <Loader2 className="animate-spin" /> : <PlayCircle />}
        Continue with demo account
      </Button>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" /> or sign in with email <Separator className="flex-1" />
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</button>
          </div>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}
