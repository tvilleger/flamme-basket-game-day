import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flame } from "@/components/Flame";
import { getSession, clearSession } from "@/lib/session";
import {
  fetchJoueuseById,
  fetchNextEntrainement,
  fetchNextMatch,
  fetchStats,
  formatFrDate,
  getAvatar,
} from "@/lib/api";
import { fetchTotalEtoiles } from "@/lib/missions";
import { Calendar, Swords, LogOut, TrendingUp, Activity, Camera, Star } from "lucide-react";

export const Route = createFileRoute("/_app/home")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const session = getSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const playerQ = useQuery({
    queryKey: ["joueuse", session?.joueuseId],
    queryFn: () => fetchJoueuseById(session!.joueuseId),
    enabled: !!session,
  });
  const statsQ = useQuery({
    queryKey: ["stats", session?.joueuseId],
    queryFn: () => fetchStats(session!.joueuseId),
    enabled: !!session,
  });
  const trainingQ = useQuery({ queryKey: ["next-training"], queryFn: fetchNextEntrainement });
  const matchQ = useQuery({ queryKey: ["next-match"], queryFn: fetchNextMatch });

  const logout = () => {
    clearSession();
    navigate({ to: "/" });
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !session) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde (max 5 Mo)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${session.joueuseId}/${Date.now()}.${ext}`;
      const up = await supabase.storage
        .from("photos-joueuses")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("photos-joueuses")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;
      const { error: updErr } = await supabase
        .from("joueuses")
        .update({ photo: signed.data.signedUrl })
        .eq("id", session.joueuseId);
      if (updErr) throw updErr;
      toast.success("Photo mise à jour");
      qc.invalidateQueries({ queryKey: ["joueuse", session.joueuseId] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  if (!session || !playerQ.data) {
    return <div className="px-5 pt-16 text-center text-muted-foreground">Chargement…</div>;
  }
  const player = playerQ.data;
  const stats = statsQ.data ?? { trainingAttendance: 0, matchAttendance: 0, avgFatigue: 0 };
  const training = trainingQ.data;
  const match = matchQ.data;

  return (
    <div className="px-5 pt-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Salut 👋</p>
          <h1 className="truncate text-3xl font-black">{player.prenom}</h1>
        </div>
        <button
          onClick={logout}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground"
          aria-label="Déconnexion"
        >
          <LogOut size={18} />
        </button>
      </header>

      <section className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-ink p-5 text-white shadow-card animate-pop-in">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-flame opacity-40 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <img
              src={getAvatar(player.prenom, player.photo)}
              alt={player.prenom}
              loading="lazy"
              width={96}
              height={96}
              className="h-20 w-20 rounded-2xl border-2 border-white/20 bg-white object-cover"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Changer ma photo"
              className="absolute -bottom-2 -left-2 grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow ring-2 ring-ink disabled:opacity-50"
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickPhoto}
            />
            <span className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-full bg-gradient-flame shadow-flame">
              <Flame size={20} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black">{player.prenom}</p>
            <p className="truncate text-xs text-white/60">{player.equipe}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold">
                {player.statut_blessure === "OK" ? "✅ Apte" : `⚠️ ${player.statut_blessure}`}
              </div>
              <div className="rounded-full bg-gradient-flame px-2.5 py-1 text-xs font-black">
                {player.flamme_actuelle} 🔥
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <Stat icon={<Flame size={18} animate={false} />} label="Flamme" value={`${player.flamme_actuelle}j`} tone="flame" />
          <Stat icon={<TrendingUp size={18} />} label="Record" value={`${player.record_flamme}j`} tone="dark" />
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <BigStat label="Présence entraînements" value={stats.trainingAttendance} suffix="%" />
        <BigStat label="Présence matchs" value={stats.matchAttendance} suffix="%" />
        <FatigueCard value={stats.avgFatigue} />
        <div className="rounded-3xl bg-secondary p-4 text-secondary-foreground shadow-card">
          <p className="text-xs font-bold uppercase tracking-wider text-white/50">CTC</p>
          <p className="mt-2 text-3xl font-black">{player.flamme_actuelle}<span className="text-lg text-white/60">j</span></p>
          <p className="mt-1 text-xs text-white/60">consécutifs 🔥</p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-black">À venir</h2>
        <div className="space-y-3">
          {training ? (
            <EventCard
              icon={<Activity size={20} />}
              tag="ENTRAÎNEMENT"
              title={formatFrDate(training.date)}
              sub={`${training.heure.slice(0, 5)}${training.lieu ? " · " + training.lieu : ""}`}
              accent="primary"
            />
          ) : (
            <EmptyCard text="Aucun entraînement programmé" />
          )}
          {match ? (
            <EventCard
              icon={<Swords size={20} />}
              tag="MATCH"
              title={`vs ${match.adversaire}`}
              sub={`${formatFrDate(match.date)} · ${match.heure.slice(0, 5)} · ${match.lieu}`}
              accent="dark"
            />
          ) : (
            <EmptyCard text="Aucun match programmé" />
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "flame" | "dark" }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl p-3 ${tone === "flame" ? "bg-gradient-flame" : "bg-white/10"}`}>
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
        <p className="text-lg font-black leading-tight">{value}</p>
      </div>
    </div>
  );
}

function BigStat({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="rounded-3xl bg-card p-4 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black text-foreground">{value}<span className="text-lg text-primary">{suffix}</span></p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-gradient-flame" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function FatigueCard({ value }: { value: number }) {
  return (
    <div className="rounded-3xl bg-card p-4 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fatigue moy.</p>
      <p className="mt-2 text-3xl font-black">{value ? value.toFixed(1) : "—"}<span className="text-lg text-muted-foreground">/5</span></p>
      <div className="mt-3 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((d) => (
          <span key={d} className={`h-2 flex-1 rounded-full ${d <= Math.round(value) ? "bg-gradient-flame" : "bg-muted"}`} />
        ))}
      </div>
    </div>
  );
}

function EventCard({
  icon, tag, title, sub, accent,
}: { icon: React.ReactNode; tag: string; title: string; sub: string; accent: "primary" | "dark" }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-card p-4 shadow-card">
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
        accent === "primary" ? "bg-gradient-flame text-primary-foreground" : "bg-secondary text-secondary-foreground"
      }`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-black uppercase tracking-wider ${accent === "primary" ? "text-primary" : "text-foreground"}`}>{tag}</p>
        <p className="truncate text-base font-black">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
      <Calendar size={18} className="shrink-0 text-muted-foreground" />
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-3xl bg-card p-4 text-center text-sm text-muted-foreground shadow-card">
      {text}
    </div>
  );
}
