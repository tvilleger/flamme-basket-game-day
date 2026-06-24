import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchNextEntrainement,
  fetchNextMatch,
  formatFrDate,
  getAvatar,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Flame } from "@/components/Flame";
import { AlertTriangle, BedDouble, Stethoscope, UserX } from "lucide-react";

export const Route = createFileRoute("/coach-dashboard")({
  component: CoachDashboard,
});

type CoachSession = { id: string; nom: string };

type AlertItem = {
  joueuseId: string;
  prenom: string;
  photo: string | null;
  type: "absences" | "fatigue" | "blessure" | "no-data";
  detail: string;
};

function CoachDashboard() {
  const navigate = useNavigate();
  const [coach, setCoach] = useState<CoachSession | null>(null);

  useEffect(() => {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem("coach-session") : null;
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
    queryKey: ["coach-dashboard-v2"],
    queryFn: async () => {
      const [joueusesRes, presEntrRes, presMatchRes, entrRes, nextEntr, nextMatch] =
        await Promise.all([
          supabase.from("joueuses").select("*"),
          supabase
            .from("presences_entrainements")
            .select("joueuse_id, entrainement_id, presente, fatigue, date_validation"),
          supabase.from("presences_matchs").select("presente"),
          supabase.from("entrainements").select("id, date").order("date", { ascending: true }),
          fetchNextEntrainement(),
          fetchNextMatch(),
        ]);

      const joueuses = joueusesRes.data ?? [];
      const presEntr = presEntrRes.data ?? [];
      const presMatch = presMatchRes.data ?? [];
      const entrs = entrRes.data ?? [];

      const effectif = joueuses.length;
      const blessees = joueuses.filter((j) => j.statut_blessure !== "OK");
      const actives = effectif - blessees.length;

      const presenceEntrAvg = presEntr.length
        ? Math.round((presEntr.filter((r) => r.presente).length / presEntr.length) * 100)
        : 0;
      const presenceMatchAvg = presMatch.length
        ? Math.round((presMatch.filter((r) => r.presente).length / presMatch.length) * 100)
        : 0;

      const fatigues = presEntr
        .map((r) => r.fatigue)
        .filter((f): f is number => typeof f === "number");
      const fatigueAvg = fatigues.length
        ? (fatigues.reduce((a, b) => a + b, 0) / fatigues.length).toFixed(1)
        : "—";

      const flammeAvg = joueuses.length
        ? Math.round(
            joueuses.reduce((s, j) => s + (j.flamme_actuelle ?? 0), 0) / joueuses.length,
          )
        : 0;

      const alerts: AlertItem[] = [];
      const today = new Date().toISOString().slice(0, 10);
      const pastEntrs = entrs
        .filter((e) => e.date <= today)
        .sort((a, b) => b.date.localeCompare(a.date));
      const last2EntrIds = pastEntrs.slice(0, 2).map((e) => e.id);

      for (const j of joueuses) {
        if (j.statut_blessure !== "OK") {
          alerts.push({
            joueuseId: j.id,
            prenom: j.prenom,
            photo: j.photo,
            type: "blessure",
            detail: j.statut_blessure,
          });
        }

        const mine = presEntr.filter((p) => p.joueuse_id === j.id);

        if (last2EntrIds.length === 2) {
          const recent = last2EntrIds.map((id) =>
            mine.find((p) => p.entrainement_id === id),
          );
          const bothAbsent = recent.every((r) => r && r.presente === false);
          if (bothAbsent) {
            alerts.push({
              joueuseId: j.id,
              prenom: j.prenom,
              photo: j.photo,
              type: "absences",
              detail: "Absente aux 2 derniers entraînements",
            });
          }
        }

        if (nextEntr) {
          const nextResponse = mine.find((p) => p.entrainement_id === nextEntr.id);
          if (
            nextResponse &&
            nextResponse.presente === true &&
            nextResponse.fatigue !== null &&
            (nextResponse.fatigue ?? 0) >= 4
          ) {
            alerts.push({
              joueuseId: j.id,
              prenom: j.prenom,
              photo: j.photo,
              type: "fatigue",
              detail: `Fatigue élevée (${nextResponse.fatigue}/5)`,
            });
          }
        }
      }

      return {
        effectif,
        actives,
        blesseesCount: blessees.length,
        presenceEntrAvg,
        presenceMatchAvg,
        fatigueAvg,
        flammeAvg,
        nextEntr,
        nextMatch,
        alerts,
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
      <div className="mx-auto max-w-2xl px-5 pb-20 pt-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-flame">Coach</p>
            <h1 className="font-display text-3xl font-black leading-tight">
              Bonjour {coach.nom} <Flame className="inline h-7 w-7 align-text-bottom" />
            </h1>
            <p className="mt-1 text-xs text-white/50">U15 Performance</p>
          </div>
          <button
            onClick={logout}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/5"
          >
            Déconnexion
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Effectif" value={data?.effectif ?? "—"} accent />
          <StatCard label="Joueuses actives" value={data?.actives ?? "—"} />
          <StatCard
            label="Présence entraînements"
            value={data ? `${data.presenceEntrAvg}%` : "—"}
          />
          <StatCard
            label="Présence matchs"
            value={data ? `${data.presenceMatchAvg}%` : "—"}
          />
          <StatCard label="Fatigue moyenne" value={data?.fatigueAvg ?? "—"} suffix="/5" />
          <StatCard
            label="Joueuses blessées"
            value={data?.blesseesCount ?? "—"}
            icon={<Stethoscope className="h-5 w-5" />}
          />
          <StatCard
            label="Flamme moyenne"
            value={data?.flammeAvg ?? "—"}
            icon={<Flame className="h-5 w-5" />}
          />
        </div>

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
                  {data.nextEntr.heure.slice(0, 5)} ·{" "}
                  {data.nextEntr.lieu ?? data.nextEntr.equipe}
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
                <p className="font-display text-xl font-black">
                  vs {data.nextMatch.adversaire}
                </p>
                <p className="text-sm capitalize text-white/70">
                  {formatFrDate(data.nextMatch.date)} · {data.nextMatch.heure.slice(0, 5)} ·{" "}
                  {data.nextMatch.lieu}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-white/60">Aucun match planifié</p>
            )}
          </Card>
        </div>

        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-flame" />
            <h2 className="font-display text-lg font-black">Alertes coach</h2>
            {data && data.alerts.length > 0 && (
              <span className="ml-auto rounded-full bg-flame px-2.5 py-0.5 text-xs font-bold text-white">
                {data.alerts.length}
              </span>
            )}
          </div>

          {!data ? (
            <Card className="border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              Chargement…
            </Card>
          ) : data.alerts.length === 0 ? (
            <Card className="border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              ✅ Aucune alerte. Tout va bien dans l'équipe.
            </Card>
          ) : (
            <div className="space-y-2">
              {data.alerts.map((a, idx) => (
                <AlertRow key={`${a.joueuseId}-${a.type}-${idx}`} alert={a} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <h2 className="mb-3 font-display text-lg font-black">Actions rapides</h2>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton to="/coach-messages" emoji="📢" label="Messages" />
            <ActionButton to="/coach-presences" emoji="✅" label="Présences" />
            <ActionButton to="/coach-flammes" emoji="🔥" label="Flammes" />
            <ActionButton to="/coach-effectif" emoji="👥" label="Effectif" />
            <ActionButton to="/coach-matchs" emoji="🏀" label="Matchs" />
            <ActionButton to="/coach-entrainements" emoji="📅" label="Entraînements" />
            <ActionButton to="/coach-exports" emoji="📂" label="Exports" />
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
  icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  accent?: boolean;
  icon?: React.ReactNode;
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
      <div className="mt-2 flex items-end gap-2">
        <p className="font-display text-3xl font-black leading-none">
          {value}
          {suffix && <span className="ml-0.5 text-base font-bold opacity-70">{suffix}</span>}
        </p>
        {icon && <span className="mb-0.5 opacity-80">{icon}</span>}
      </div>
    </Card>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  const palette: Record<
    AlertItem["type"],
    { bg: string; icon: React.ReactNode; border: string }
  > = {
    blessure: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      icon: <Stethoscope className="h-4 w-4 text-red-400" />,
    },
    fatigue: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      icon: <BedDouble className="h-4 w-4 text-amber-400" />,
    },
    absences: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      icon: <UserX className="h-4 w-4 text-orange-400" />,
    },
    "no-data": {
      bg: "bg-white/5",
      border: "border-white/15",
      icon: <AlertTriangle className="h-4 w-4 text-white/60" />,
    },
  };
  const p = palette[alert.type];
  return (
    <div className={`flex items-center gap-3 rounded-2xl border ${p.border} ${p.bg} p-3`}>
      <img
        src={getAvatar(alert.prenom, alert.photo)}
        alt={alert.prenom}
        className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-black text-white">{alert.prenom}</p>
        <p className="truncate text-xs text-white/70">{alert.detail}</p>
      </div>
      <span className="shrink-0">{p.icon}</span>
    </div>
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
