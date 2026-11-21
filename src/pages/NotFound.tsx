import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-navy-950 bg-grid bg-[size:32px_32px] px-4 text-center text-white">
      <Logo dark />
      <div>
        <div className="font-mono text-sm text-amber-400">ERR 404 · PART NOT FOUND</div>
        <h1 className="mt-2 text-3xl font-bold">This page isn't in any warehouse.</h1>
        <p className="mt-2 text-steel-300">We searched every location. It may have been renamed or never existed.</p>
      </div>
      <div className="flex gap-3">
        <Button asChild variant="accent"><Link to="/">Back to home</Link></Button>
        <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link to="/app">Open app</Link></Button>
      </div>
    </div>
  );
}
