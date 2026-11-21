import { useState, type FormEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  CloudCog,
  FileUp,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Menu,
  RotateCcw,
  ScanSearch,
  Search,
  SpellCheck2,
  TrendingUp,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/shared/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/hooks/useAppStore";
import { cn } from "@/lib/utils";
import { DEMO_TENANT } from "@/data/catalogue";

function useNav() {
  const { candidates, forecastItems, proposals } = useAppStore();
  const pendingMatches = candidates.filter((c) => c.reviewStatus === "pending" && c.status !== "none").length;
  const pendingProposals = proposals.filter((p) => p.status === "pending").length;
  const pendingReorders = forecastItems.filter((f) => f.decision === "pending").length;
  return [
    { section: "Overview", items: [{ to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true }] },
    {
      section: "Core workflow",
      items: [
        { to: "/app/import", label: "Import inventory", icon: FileUp, step: 1 },
        { to: "/app/matching", label: "AI matching review", icon: GitCompareArrows, step: 2, count: pendingMatches },
        { to: "/app/discovery", label: "Stock discovery", icon: ScanSearch, step: 3 },
        { to: "/app/forecasting", label: "Reorder review", icon: TrendingUp, step: 4, count: pendingReorders },
      ],
    },
    {
      section: "Catalogue",
      items: [
        { to: "/app/catalogue", label: "Catalogue", icon: Boxes },
        { to: "/app/normalization", label: "Part normalization", icon: SpellCheck2, count: pendingProposals },
      ],
    },
    {
      section: "Insights & platform",
      items: [
        { to: "/app/reports", label: "Reports", icon: BarChart3 },
        { to: "/app/architecture", label: "AWS architecture", icon: CloudCog },
      ],
    },
  ];
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const nav = useNav();
  return (
    <div className="flex h-full flex-col bg-navy-950 text-steel-300">
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <Logo to="/app" dark />
      </div>
      <div className="border-b border-white/10 px-5 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel-500">Organization</div>
        <div className="mt-0.5 truncate text-sm font-medium text-white">{DEMO_TENANT}</div>
      </div>
      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {nav.map((group) => (
          <div key={group.section}>
            <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-steel-500">{group.section}</div>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={"end" in item ? item.end : false}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                        isActive ? "bg-white/10 text-white shadow-[inset_2px_0_0_0_#f59e0b]" : "hover:bg-white/5 hover:text-white",
                      )
                    }
                  >
                    {"step" in item && item.step ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/15 font-mono text-[10px] text-amber-400">{item.step}</span>
                    ) : (
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {"count" in item && item.count ? (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-400">{item.count}</span>
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-lg border border-violet-400/20 bg-violet-500/10 p-3 text-xs text-violet-200">
        <div className="font-semibold text-violet-100">Demonstration mode</div>
        <p className="mt-1 leading-relaxed text-violet-200/80">AI matching, extraction and forecasting use clearly labelled mock services. Every relationship requires human approval.</p>
      </div>
    </div>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { resetDemo } = useAppStore();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/app/discovery?q=${encodeURIComponent(q.trim())}`);
  };

  const initials = (user?.name ?? "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarContent />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 border-0 p-0 [&>button]:text-white">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu />
          </Button>
          <form onSubmit={submit} className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={location.pathname.includes("discovery") ? "Search parts…" : "Find stock by description, part number, equipment…"}
              className="h-9 border-steel-200 bg-steel-50 pl-9"
              aria-label="Search stock"
            />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="hidden items-center gap-1.5 rounded-full border border-dashed border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 md:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  Mock AI services
                </span>
              </TooltipTrigger>
              <TooltipContent>Bedrock, Textract and SageMaker are simulated in this demo. See AWS architecture.</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md p-1 hover:bg-secondary" aria-label="Account menu">
                  <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left leading-tight md:block">
                    <div className="text-sm font-medium">{user?.name}</div>
                    <div className="text-[11px] text-muted-foreground">{user?.role}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-sm font-medium">{user?.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/")}>
                  <User /> Public website
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    resetDemo();
                    toast.success("Demo data reset", { description: "All reviews, imports and decisions were restored to the initial dataset." });
                  }}
                >
                  <RotateCcw /> Reset demo data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    signOut();
                    navigate("/login");
                  }}
                >
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
