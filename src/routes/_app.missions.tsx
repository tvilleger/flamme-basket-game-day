import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Star, Calendar, Users, CheckCircle2, Clock, XCircle, Trophy } from "lucide-react";
import { toast } from "sonner";
import { getSession } from "@/lib/session";
import {
  fetchMissions,
  fetchInscriptions,
  inscrireMission,
  fetchTotalEtoiles,
  type Mission,
  type MissionInscription,
} from "@/lib/missions";
import { formatFrDate } from "@/lib/api";

export const Route = createFileRoute("/_app/missions")({
  component: MissionsPage,
});

function MissionsPage() {
  const session = getSession();
  const qc = useQueryClient();
  const missionsQ = useQuery({ queryKey: ["missions"], queryFn: fetchMissions });
  const inscQ = useQuery({ queryKey: ["missions-inscriptions"], queryFn: fetchInscriptions });
  const etoilesQ = useQuery({
    queryKey: ["etoiles-total", session?.joueuseId],
    queryFn: () => fetchTotalEtoiles(session!.joueuseId),
    enabled: !!session,
  });

  const inscrire = useMutation({
    mutationFn: (missionId: string) => inscrireMission(missionId, session!.joueuseId),
    onSuccess: () => {
      toast.success("Inscription envoyée ! En attente de validation du coach.");
      qc.invalidateQueries({ queryKey: ["missions-inscriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const missions = (missionsQ.data ?? []).filter((m) => !m.archivee);
  const inscriptions = inscQ.data ?? [];
  const mine = inscriptions.filter((i) => i.joueuse_id === session?.joueuseId);

  const counts = (missionId: string) =>
    inscriptions.filter(
      (i) =>
        i.mission_id === missionId &&
        ["en_attente", "validee", "terminee"].includes(i.statut),
    );

  const myStatus = (missionId: string): MissionInscription | null =>
    mine.find((i) => i.mission_id === missionId) ?? null;

  const disponibles = missions.filter(
    (m) => !myStatus(m.id) && counts(m.id).length < m.places_max,
  );
  const enCours = missions.filter((m) => {
    const s = myStatus(m.id);
    return s && (s.statut === "en_attente" || s.statut === "validee");
  });
  const historique = mine
    .filter((i) => ["validee", "refusee", "terminee"].includes(i.statut))
    .map((i) => ({ insc: i, mission: missions.find((m) => m.id === i.mission_id) }))
    .filter((x) => x.mission);

  return (
    <div className="px-5 pt-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Missions</p>
          <h1 className="mt-1 text-3xl font-black">🏆 Engage-toi</h1>
        </div>
        <div className="rounded-2xl bg-gradient-flame px-4 py-2 text-white shadow-flame">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">Total</p>
          <p className="text-2xl font-black leading-none">
            {etoilesQ.data ?? 0} <Star className="inline h-5 w-5 fill-white" />
          </p>
        </div>
      </header>

      {enCours.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-black uppercase tracking-wider text-muted-foreground">
            En cours
          </h2>
          <div className="space-y-3">
            {enCours.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                taken={counts(m.id).length}
                myStatus={myStatus(m.id)}
                onSubscribe={() => inscrire.mutate(m.id)}
                disabled={inscrire.isPending}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-black uppercase tracking-wider text-muted-foreground">
          Disponibles
        </h2>
        {missionsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : disponibles.length === 0 ? (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-card">
            Aucune mission disponible pour le moment. Reviens vite !
          </p>
        ) : (
          <div className="space-y-3">
            {disponibles.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                taken={counts(m.id).length}
                myStatus={null}
                onSubscribe={() => inscrire.mutate(m.id)}
                disabled={inscrire.isPending}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-2 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
            Mon historique
          </h2>
        </div>
        {historique.length === 0 ? (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-card">
            Pas encore de missions terminées.
          </p>
        ) : (
          <div className="space-y-2">
            {historique.map(({ insc, mission }) => (
              <div
                key={insc.id}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card"
              >
                <StatusBadge statut={insc.statut} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{mission!.titre}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {mission!.date ? formatFrDate(mission!.date) : "—"}
                  </p>
                </div>
                {insc.statut === "validee" || insc.statut === "terminee" ? (
                  <div className="shrink-0 rounded-full bg-gradient-flame px-3 py-1 text-xs font-black text-white">
                    +{mission!.etoiles} ⭐
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MissionCard({
  mission,
  taken,
  myStatus,
  onSubscribe,
  disabled,
}: {
  mission: Mission;
  taken: number;
  myStatus: MissionInscription | null;
  onSubscribe: () => void;
  disabled: boolean;
}) {
  const restantes = Math.max(0, mission.places_max - taken);
  const full = restantes === 0 && !myStatus;
  return (
    <article className="rounded-3xl bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-black">{mission.titre}</p>
          {mission.description && (
            <p className="mt-1 text-xs text-muted-foreground">{mission.description}</p>
          )}
        </div>
        <div className="shrink-0 rounded-full bg-gradient-flame px-3 py-1.5 text-sm font-black text-white shadow-flame">
          +{mission.etoiles} ⭐
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-muted-foreground">
        {mission.date && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
            <Calendar className="h-3 w-3" /> {formatFrDate(mission.date)}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
          <Users className="h-3 w-3" /> {restantes}/{mission.places_max} places
        </span>
      </div>
      <div className="mt-3">
        {myStatus ? (
          <StatusInline statut={myStatus.statut} />
        ) : (
          <button
            onClick={onSubscribe}
            disabled={disabled || full}
            className="w-full rounded-2xl bg-gradient-flame py-2.5 text-sm font-black text-white shadow-flame disabled:opacity-40 disabled:shadow-none"
          >
            {full ? "Complète" : "Je m'inscris"}
          </button>
        )}
      </div>
    </article>
  );
}

function StatusInline({ statut }: { statut: MissionInscription["statut"] }) {
  const map = {
    en_attente: { label: "En attente de validation", icon: Clock, cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    validee: { label: "Validée", icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    refusee: { label: "Refusée", icon: XCircle, cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
    terminee: { label: "Terminée", icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  } as const;
  const c = map[statut];
  const Icon = c.icon;
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${c.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {c.label}
    </div>
  );
}

function StatusBadge({ statut }: { statut: MissionInscription["statut"] }) {
  const map = {
    en_attente: "⏳",
    validee: "✅",
    refusee: "❌",
    terminee: "🏁",
  };
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-lg">
      {map[statut]}
    </span>
  );
}
