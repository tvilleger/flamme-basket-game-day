import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { fetchNextEntrainement, formatFrDate, submitCheckin } from "@/lib/api";
import { getSession } from "@/lib/session";
import { getOrCreateAutoMission, inscrireMission, fetchMissionTakenCount } from "@/lib/missions";

export const Route = createFileRoute("/_app/checkin")({
  component: CheckinPage,
});

const fatigueLabels = ["", "Au top", "Bien", "Moyen", "Crevée", "Épuisée"];
const fatigueEmojis = ["", "😎", "💪", "😐", "😴", "🥵"];

function CheckinPage() {
  const session = getSession();
  const qc = useQueryClient();
  const trainingQ = useQuery({ queryKey: ["next-training"], queryFn: fetchNextEntrainement });
  const [presence, setPresence] = useState<"yes" | "no" | null>(null);
  const [fatigue, setFatigue] = useState<number>(0);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      submitCheckin({
        joueuseId: session!.joueuseId,
        entrainementId: trainingQ.data!.id,
        presente: presence === "yes",
        fatigue: presence === "yes" ? fatigue : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stats", session?.joueuseId] });
      setDone(true);
    },
  });

  const canSubmit =
    !!trainingQ.data && presence !== null && (presence === "no" || fatigue > 0) && !mutation.isPending;

  if (done) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-flame shadow-flame animate-pop-in">
          <Check size={48} className="text-primary-foreground" strokeWidth={3} />
        </div>
        <h1 className="mt-6 text-3xl font-black">Check-in validé !</h1>
        <p className="mt-2 text-muted-foreground">Ta réponse a été enregistrée 🔥</p>

        {presence === "yes" && trainingQ.data && (
          <AutoMissionCard
            entrainementDate={trainingQ.data.date}
            joueuseId={session!.joueuseId}
          />
        )}

        <button
          onClick={() => { setDone(false); setPresence(null); setFatigue(0); }}
          className="mt-8 rounded-2xl bg-secondary px-6 py-3 font-bold text-secondary-foreground"
        >
          Nouveau check-in
        </button>
      </div>
    );
  }

  const training = trainingQ.data;

  return (
    <div className="px-5 pt-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Check-in</p>
        <h1 className="mt-1 text-3xl font-black">Entraînement</h1>
        {training ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {formatFrDate(training.date)} · {training.heure.slice(0, 5)}
            {training.lieu ? ` · ${training.lieu}` : ""}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Aucun entraînement à venir.</p>
        )}
      </header>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-muted-foreground">Tu seras là ?</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPresence("yes")}
            disabled={!training}
            className={`rounded-3xl border-2 p-5 text-left transition-all disabled:opacity-50 ${
              presence === "yes"
                ? "border-transparent bg-gradient-flame text-primary-foreground shadow-flame scale-[1.02]"
                : "border-border bg-card"
            }`}
          >
            <p className="text-3xl">✋</p>
            <p className="mt-2 font-black">Présente</p>
          </button>
          <button
            onClick={() => setPresence("no")}
            disabled={!training}
            className={`rounded-3xl border-2 p-5 text-left transition-all disabled:opacity-50 ${
              presence === "no"
                ? "border-secondary bg-secondary text-secondary-foreground scale-[1.02]"
                : "border-border bg-card"
            }`}
          >
            <p className="text-3xl">🚫</p>
            <p className="mt-2 font-black">Absente</p>
          </button>
        </div>
      </section>

      {presence === "yes" && (
        <section className="mt-8 animate-slide-up">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-muted-foreground">
            Ta fatigue aujourd'hui ?
          </h2>
          <div className="rounded-3xl bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-5xl">{fatigueEmojis[fatigue] || "🤔"}</p>
              <div className="text-right">
                <p className="text-3xl font-black">{fatigue || "—"}<span className="text-base text-muted-foreground">/5</span></p>
                <p className="text-xs font-bold text-muted-foreground">{fatigueLabels[fatigue] || "Choisis"}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setFatigue(n)}
                  className={`aspect-square rounded-2xl text-xl font-black transition-all ${
                    fatigue === n
                      ? "bg-gradient-flame text-primary-foreground shadow-flame scale-110"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {mutation.isError && (
        <p className="mt-4 rounded-xl bg-destructive/15 px-4 py-3 text-sm text-destructive">
          Erreur d'enregistrement. Réessaie.
        </p>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={!canSubmit}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-flame px-6 py-4 text-lg font-black text-primary-foreground shadow-flame transition-transform active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
      >
        <Sparkles size={20} />
        {mutation.isPending ? "Envoi..." : "Valider mon check-in"}
      </button>
    </div>
  );
}

function AutoMissionCard({
  entrainementDate,
  joueuseId,
}: {
  entrainementDate: string;
  joueuseId: string;
}) {
  const qc = useQueryClient();
  const missionQ = useQuery({
    queryKey: ["auto-mission", entrainementDate],
    queryFn: () => getOrCreateAutoMission(entrainementDate),
  });
  const takenQ = useQuery({
    queryKey: ["auto-mission-taken", missionQ.data?.id],
    queryFn: () => fetchMissionTakenCount(missionQ.data!.id),
    enabled: !!missionQ.data?.id,
  });
  const subscribe = useMutation({
    mutationFn: () => inscrireMission(missionQ.data!.id, joueuseId),
    onSuccess: () => {
      toast.success("Tu es inscrite ! En attente du coach.");
      qc.invalidateQueries({ queryKey: ["auto-mission-taken", missionQ.data?.id] });
      qc.invalidateQueries({ queryKey: ["missions-inscriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!missionQ.data) return null;
  const taken = takenQ.data ?? [];
  const restantes = Math.max(0, missionQ.data.places_max - taken.length);
  const already = taken.some((t) => t.joueuse_id === joueuseId);

  return (
    <div className="mt-8 w-full max-w-sm rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-5 text-left shadow-card">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-primary" />
        <p className="text-xs font-black uppercase tracking-wider text-primary">
          Mission bonus
        </p>
      </div>
      <p className="mt-2 text-lg font-black">Rangement du matériel</p>
      <p className="text-sm text-muted-foreground">+10 ⭐ · {restantes} place{restantes > 1 ? "s" : ""} restante{restantes > 1 ? "s" : ""}</p>
      {already ? (
        <div className="mt-3 rounded-xl bg-emerald-500/15 px-3 py-2 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
          ✅ Inscription envoyée — en attente coach
        </div>
      ) : (
        <button
          onClick={() => subscribe.mutate()}
          disabled={subscribe.isPending || restantes === 0}
          className="mt-3 w-full rounded-2xl bg-gradient-flame py-2.5 text-sm font-black text-white shadow-flame disabled:opacity-40"
        >
          {restantes === 0 ? "Complète" : "Je participe"}
        </button>
      )}
      <Link to="/missions" className="mt-3 block text-center text-xs font-bold text-primary underline">
        Voir toutes les missions
      </Link>
    </div>
  );
}
