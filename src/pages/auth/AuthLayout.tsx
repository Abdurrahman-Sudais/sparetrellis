import type { ReactNode } from "react";
import { Logo } from "@/components/shared/Logo";
import { MatchShot } from "@/components/marketing/ProductShots";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 md:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
        <p className="text-xs text-muted-foreground">Demo authentication — Amazon Cognito integration is planned. No credentials leave your browser.</p>
      </div>
      <div className="relative hidden overflow-hidden bg-navy-950 lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div className="absolute inset-0 bg-grid bg-[size:36px_36px]" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">Find the spare parts already in stock</div>
          <h2 className="mt-3 max-w-md text-3xl font-bold leading-tight text-white">Every match reviewed by a person. Every decision on the record.</h2>
          <MatchShot className="mt-10 max-w-lg" />
        </div>
      </div>
    </div>
  );
}
