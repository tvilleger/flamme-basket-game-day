import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchNextEntrainement, fetchNextMatch, formatFrDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Flame } from "@/components/Flame";

export const Route = createFileRoute("/coach-dashboard")({
  component: CoachDashboard,
});

type CoachSession = { id: string; nom: string };

function CoachDashboard() {
  const navigate = useNavigate();
  const [coach, setCoach] = useState<CoachSession | null>(null);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("coach-session") : null;
    if (!raw) {
      navigate({ to: "/coach-login" });
      return;
    }
    try {
      setCoach(JSON.parse(raw));
    } catch {
      navigate({ to: "/coach-login" });
    }
  }, [navigate]);

  const { data } = useQuery({
    enabled: !!coach,
    queryKey: ["coach-dashboard"],
    queryFn: async () => {
      const [joueuses, presEntr, nextEntr, nextMatch] = await Promise.all([
        supabase.from("joueuses").select("id", { count: "exact", head: true }),
        supabase.from("presences_entrainements").select("presente, fatigue"),
        fetchNextEntrainement(),
        fetchNextMatch(),
      ]);
      const rows = presEntr.data ?? [];
      const presenceAvg = rows.length
        ? Math.round((rows.filter((r) => r.presente).length / rows.length) * 100)
        : 0;
      const fatigues = rows.map((r) => r.fatigue).filter((f): f is number => typeof f === "number");
      const fatigueAvg = fatigues.length
        ? (fatigues.reduce((a, b) => a + b, 0) / fatigues.length).toFixed(1)
        : "—";
      return {
        effectif: joueuses.count ?? 0,
        presenceAvg,
        fatigueAvg,
        nextEntr,
        nextMatch,
      };
    },
  });

  const logout = () => {
    localStorage.removeItem("coach-session");
    navigate({ to: "/coach-login" });
  };

  if (!coach) return null;

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-flame">Coach</p>
            <h1 className="font-display text-3xl font-black leading-tight">
              Bonjour {coach.nom} <Flame className="inline h-7 w-7 align-text-bottom" />
            </h1>
          </div>
          <button
            onClick={logout}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/5"
          >
            Déconnexion
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Effectif" value={data?.effectif ?? "—"} accent />
          <StatCard label="Présence entraînements" value={data ? `${data.presenceAvg}%` : "—"} />
          <StatCard label="Fatigue moyenne" value={data?.fatigueAvg ?? "—"} suffix="/5" />
          <StatCard label="Joueuses actives" value={data?.effectif ?? "—"} />
        </div>

        {/* Next events */}
        <div className="mt-6 grid gap-3">
          <Card className="border-0 bg-gradient-to-br from-flame to-orange-600 p-5 text-white shadow-[0_12px_32px_-8px_rgba(234,88,12,0.5)]">
            <p className="text-xs font-bold uppercase tracking-widest opacity-90">
              Prochain entraînement
            </p>
            {data?.nextEntr ? (
              <div className="mt-2">
                <p className="font-display text-xl font-black capitalize">
                  {formatFrDate(data.nextEntr.date)}
                </p>
                <p className="text-sm opacity-90">
                  {data.nextEntr.heure.slice(0, 5)} · {data.nextEntr.lieu ?? data.nextEntr.equipe}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm opacity-80">Aucun entraînement planifié</p>
            )}
          </Card>

          <Card className="border border-white/10 bg-white/5 p-5 text-white backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-widest text-flame">
              Prochain match
            </p>
            {data?.nextMatch ? (
              <div className="mt-2">
                <p className="font-display text-xl font-black">vs {data.nextMatch.adversaire}</p>
                <p className="text-sm capitalize text-white/70">
                  {formatFrDate(data.nextMatch.date)} · {data.nextMatch.heure.slice(0, 5)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-white/60">Aucun match planifié</p>
            )}
          </Card>
        </div>

        {/* Quick actions */}
        <div className="mt-8">
          <h2 className="mb-3 font-display text-lg font-black">Actions rapides</h2>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton to="/coach-messages" emoji="📢" label="Messages Coach" />
            <ActionButton to="/coach-presences" emoji="✅" label="Présences" />
            <ActionButton to="/coach-flammes" emoji="🔥" label="Gestion Flammes" />
            <ActionButton to="/coach-effectif" emoji="👥" label="Effectif" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={`border-0 p-4 ${
        accent ? "bg-flame text-white" : "bg-white/5 text-white backdrop-blur"
      }`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-widest ${
          accent ? "text-white/90" : "text-white/60"
        }`}
      >
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-black leading-none">
        {value}
        {suffix && <span className="ml-0.5 text-base font-bold opacity-70">{suffix}</span>}
      </p>
    </Card>
  );
}

function ActionButton({ to, emoji, label }: { to: string; emoji: string; label: string }) {
  return (
    <Link
      to={to as never}
      className="flex flex-col items-start justify-between rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-flame hover:bg-flame/10"
    >
      <span className="text-3xl">{emoji}</span>
      <span className="mt-3 text-sm font-bold text-white">{label}</span>
    </Link>
  );
}
