import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const LINKS = [
  { to: "/features", label: "Features" },
  { to: "/solutions", label: "Solutions" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function MarketingLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/95 backdrop-blur">
        <div className="container flex h-16 items-center gap-8">
          <Logo dark />
          <nav className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => cn("rounded-md px-3 py-2 text-sm font-medium transition-colors", isActive ? "text-amber-400" : "text-steel-300 hover:text-white")}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            {user ? (
              <Button asChild variant="accent" size="sm">
                <Link to="/app">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-steel-200 hover:bg-white/10 hover:text-white">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild variant="accent" size="sm">
                  <Link to="/register">Start free pilot</Link>
                </Button>
              </>
            )}
          </div>
          <Button variant="ghost" size="icon" className="ml-auto text-white hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
        </div>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="bg-navy-950 p-6 text-white [&>button]:text-white">
          <Logo dark />
          <nav className="mt-8 flex flex-col gap-1">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-steel-200 hover:bg-white/10">
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild variant="accent">
              <Link to={user ? "/app" : "/register"} onClick={() => setOpen(false)}>
                {user ? "Open dashboard" : "Start free pilot"}
              </Link>
            </Button>
            {!user && (
              <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link to="/login" onClick={() => setOpen(false)}>
                  Log in
                </Link>
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-white/10 bg-charcoal-950 text-steel-400">
        <div className="container grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">Find the spare parts already in stock. AI-assisted inventory intelligence for factories, maintenance contractors and warehouse teams.</p>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Product</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className="hover:text-white" to="/features">Features</Link></li>
              <li><Link className="hover:text-white" to="/how-it-works">How it works</Link></li>
              <li><Link className="hover:text-white" to="/pricing">Pricing</Link></li>
              <li><Link className="hover:text-white" to="/app">Live demo</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Solutions</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className="hover:text-white" to="/solutions">Manufacturing plants</Link></li>
              <li><Link className="hover:text-white" to="/solutions">Maintenance contractors</Link></li>
              <li><Link className="hover:text-white" to="/solutions">Multi-site warehouses</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Company</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className="hover:text-white" to="/about">About</Link></li>
              <li><Link className="hover:text-white" to="/contact">Contact</Link></li>
              <li><Link className="hover:text-white" to="/login">Log in</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5">
          <div className="container flex flex-col gap-2 py-5 text-xs md:flex-row md:justify-between">
            <span>© 2026 SpareTrellis. All rights reserved.</span>
            <span>AI suggestions require human verification. Similar descriptions do not establish technical compatibility.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
