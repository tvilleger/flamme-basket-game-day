import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCoachGuard } from "@/lib/coach-guard";

export const Route = createFileRoute("/coach-flammes")({
  component: () => <Soon title="Gestion Flammes" desc="Module à venir — pour l'instant utilise Effectif pour ajuster les flammes." />,
});

function Soon({ title, desc }: { title: string; desc: string }) {
  const coach = useCoachGuard();
  if (!coach) return null;
  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="mx-auto max-w-2xl px-5 pb-20 pt-8">
        <Link to="/coach-dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/60">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="font-display text-3xl font-black">{title}</h1>
        <p className="mt-3 text-sm text-white/60">{desc}</p>
      </div>
    </div>
  );
}
