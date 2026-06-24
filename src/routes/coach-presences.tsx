import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAvatar, formatFrDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { useCoachGuard } from "@/lib/coach-guard";
import { ArrowLeft, Check, X } from "lucide-react";

export const Route = createFileRoute("/coach-presences")({
  component: CoachPresences,
});

function CoachPresences() {
  const coach = useCoachGuard();
  const [joueuseFilter, setJoueuseFilter] = useState<string>("all");
  const [entrFilter, setEntrFilter] = useState<string>("all");

  const { data } = useQuery({
    enabled: !!coach,
    queryKey: ["coach-presences-page"],
    queryFn: async () => {
      const [j, e, p] = await Promise.all([
        supabase.from("joueuses").select("id, prenom, photo").order("prenom"),
        supabase.from("entrainements").select("id, date, heure, lieu").order("date", { ascending: false }),
        supabase
          .from("presences_entrainements")
          .select("id, joueuse_id, entrainement_id, presente, fatigue, date_validation")
          .order("date_validation", { ascending: false }),
      ]);
      return {
        joueuses: j.data ?? [],
        entrs: e.data ?? [],
        presences: p.data ?? [],
      };
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.presences.filter((r) => {
      if (joueuseFilter !== "all" && r.joueuse_id !== joueuseFilter) return false;
      if (entrFilter !== "all" && r.entrainement_id !== entrFilter) return false;
      return true;
    });
  }, [data, joueuseFilter, entrFilter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const presentes = filtered.filter((r) => r.presente).length;
    const absences = total - presentes;
    const taux = total ? Math.round((presentes / total) * 100) : 0;
    return { total, presentes, absences, taux };
  }, [filtered]);

  if (!coach) return null;

  const joueusesById = new Map((data?.joueuses ?? []).map((j) => [j.id, j]));
  const entrsById = new Map((data?.entrs ?? []).map((e) => [e.id, e]));

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="mx-auto max-w-2xl px-5 pb-20 pt-8">
        <Link to="/coach-dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="font-display text-3xl font-black">Présences</h1>
        <p className="text-xs text-white/50">U15 Performance</p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat label="Présences" value={stats.presentes} tone="ok" />
          <Stat label="Absences" value={stats.absences} tone="ko" />
          <Stat label="Taux" value={`${stats.taux}%`} tone="flame" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <select
            value={joueuseFilter}
            onChange={(e) => setJoueuseFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="all">Toutes les joueuses</option>
            {data?.joueuses.map((j) => (
              <option key={j.id} value={j.id}>{j.prenom}</option>
            ))}
          </select>
          <select
            value={entrFilter}
            onChange={(e) => setEntrFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="all">Tous les entraînements</option>
            {data?.entrs.map((e) => (
              <option key={e.id} value={e.id}>
                {formatFrDate(e.date)} · {e.heure.slice(0, 5)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 space-y-2">
          {!data ? (
            <Card className="border-white/10 bg-white/5 p-4 text-sm text-white/60">Chargement…</Card>
          ) : filtered.length === 0 ? (
            <Card className="border-white/10 bg-white/5 p-4 text-sm text-white/60">
              Aucune présence enregistrée pour ces filtres.
            </Card>
          ) : (
            filtered.map((r) => {
              const j = joueusesById.get(r.joueuse_id);
              const e = entrsById.get(r.entrainement_id);
              return (
                <Card
                  key={r.id}
                  className="flex items-center gap-3 border border-white/10 bg-white/5 p-3"
                >
                  <img
                    src={getAvatar(j?.prenom ?? "?", j?.photo ?? null)}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">
                      {j?.prenom ?? "Joueuse inconnue"}
                    </p>
                    <p className="truncate text-xs capitalize text-white/60">
                      {e ? `${formatFrDate(e.date)} · ${e.heure.slice(0, 5)}` : "Entraînement supprimé"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.presente ? (
                      <span className="inline-flex h-7 items-center gap-1 rounded-full bg-emerald-500/20 px-2 text-xs font-bold text-emerald-300">
                        <Check className="h-3.5 w-3.5" /> Présente
                      </span>
                    ) : (
                      <span className="inline-flex h-7 items-center gap-1 rounded-full bg-red-500/20 px-2 text-xs font-bold text-red-300">
                        <X className="h-3.5 w-3.5" /> Absente
                      </span>
                    )}
                    {r.presente && r.fatigue !== null && (
                      <span className="inline-flex h-7 items-center rounded-full bg-amber-500/20 px-2 text-xs font-bold text-amber-300">
                        {r.fatigue}/5
                      </span>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: "ok" | "ko" | "flame" }) {
  const bg =
    tone === "ok" ? "bg-emerald-500/15 text-emerald-300"
    : tone === "ko" ? "bg-red-500/15 text-red-300"
    : "bg-flame text-white";
  return (
    <Card className={`border-0 p-3 ${bg}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-1 font-display text-2xl font-black leading-none">{value}</p>
    </Card>
  );
}
