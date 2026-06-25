import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJoueuses, getAvatar, type Joueuse } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { fetchShootLeaderboard } from "@/lib/shoot";
import { Flame } from "@/components/Flame";
import { Trophy, Medal } from "lucide-react";

export const Route = createFileRoute("/_app/rankings")({
  component: RankingsPage,
});

type Tab = "training" | "match" | "flame" | "stars" | "shoot" | "hof";

const tabs: { id: Tab; label: string }[] = [
  { id: "flame", label: "Flammes" },
  { id: "stars", label: "Étoiles" },
  { id: "shoot", label: "🏀 Shoot" },
  { id: "training", label: "Entraîn." },
  { id: "match", label: "Matchs" },
  { id: "hof", label: "Hall of Fame" },
];


async function fetchAttendanceRanking(kind: "training" | "match") {
  const table = kind === "training" ? "presences_entrainements" : "presences_matchs";
  const [{ data: joueuses }, { data: rows }] = await Promise.all([
    supabase.from("joueuses").select("*"),
    supabase.from(table).select("joueuse_id, presente"),
  ]);
  const map = new Map<string, { total: number; present: number }>();
  (rows ?? []).forEach((r) => {
    const m = map.get(r.joueuse_id) ?? { total: 0, present: 0 };
    m.total += 1;
    if (r.presente) m.present += 1;
    map.set(r.joueuse_id, m);
  });
  return (joueuses ?? [])
    .map((j) => {
      const s = map.get(j.id);
      const pct = s && s.total ? Math.round((s.present / s.total) * 100) : 0;
      return { joueuse: j as Joueuse, value: pct };
    })
    .sort((a, b) => b.value - a.value);
}

async function fetchStarsRanking() {
  const [{ data: joueuses }, { data: etoiles }] = await Promise.all([
    supabase.from("joueuses").select("*"),
    supabase
      .from("etoiles_joueuses")
      .select("joueuse_id, etoiles, mission_id"),
  ]);

  const rows = etoiles ?? [];
  return (joueuses ?? [])
    .map((j) => {
      const mine = rows.filter((e) => e.joueuse_id === j.id);
      const total = mine.reduce((s, e) => s + (e.etoiles ?? 0), 0);
      const missions = mine.filter((e) => e.mission_id !== null).length;
      return { joueuse: j as Joueuse, value: total, missions };
    })
    .sort((a, b) => b.value - a.value || b.missions - a.missions);
}

function RankingsPage() {
  const [tab, setTab] = useState<Tab>("flame");

  const flameQ = useQuery({ queryKey: ["ranking-flame"], queryFn: fetchJoueuses });
  const trainingQ = useQuery({
    queryKey: ["ranking-training"],
    queryFn: () => fetchAttendanceRanking("training"),
    enabled: tab === "training",
  });
  const matchQ = useQuery({
    queryKey: ["ranking-match"],
    queryFn: () => fetchAttendanceRanking("match"),
    enabled: tab === "match",
  });
  const starsQ = useQuery({
    queryKey: ["ranking-stars"],
    queryFn: fetchStarsRanking,
    enabled: tab === "stars",
  });
  const shootQ = useQuery({
    queryKey: ["ranking-shoot"],
    queryFn: fetchShootLeaderboard,
    enabled: tab === "shoot",
  });

  return (
    <div className="px-5 pt-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Classements</p>
        <h1 className="mt-1 text-3xl font-black">Qui mène la danse ?</h1>
      </header>

      <div className="-mx-5 mt-5 overflow-x-auto px-5 pb-1">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition-all ${
                tab === t.id ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "hof" ? (
        <HallOfFame players={flameQ.data ?? []} />
      ) : tab === "flame" ? (
        <RankingList
          items={(flameQ.data ?? []).map((j) => ({ joueuse: j, value: j.flamme_actuelle }))}
          suffix="j 🔥"
        />
      ) : tab === "training" ? (
        <RankingList items={trainingQ.data ?? []} suffix="%" />
      ) : tab === "stars" ? (
        <RankingList items={starsQ.data ?? []} suffix=" ⭐" />
      ) : tab === "shoot" ? (
        <ShootRanking data={shootQ.data ?? []} />
      ) : (
        <RankingList items={matchQ.data ?? []} suffix="%" />
      )}
    </div>
  );
}

function ShootRanking({ data }: { data: { utilisateur_id: string; utilisateur_type: "joueuse" | "coach"; nom: string; best: number }[] }) {
  if (!data.length) {
    return <p className="mt-8 text-center text-sm text-muted-foreground">Pas encore de partie jouée.</p>;
  }
  return (
    <section className="mt-5 space-y-2">
      {data.map((row, i) => (
        <div
          key={row.utilisateur_id}
          className={`flex items-center gap-3 rounded-2xl p-3 shadow-card ${
            i === 0 ? "bg-gradient-ink text-white" : "bg-card"
          }`}
        >
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black ${
            i === 0 ? "bg-yellow-400 text-black" :
            i === 1 ? "bg-zinc-300 text-black" :
            i === 2 ? "bg-amber-700 text-white" :
            "bg-muted text-muted-foreground"
          }`}>{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">
              {row.nom}
              {row.utilisateur_type === "coach" && (
                <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-black text-secondary-foreground">COACH</span>
              )}
            </p>
          </div>
          <span className="rounded-full bg-gradient-flame px-3 py-1.5 text-sm font-black text-primary-foreground">
            {row.best}
          </span>
        </div>
      ))}
    </section>
  );
}


function RankingList({
  items, suffix,
}: { items: { joueuse: Joueuse; value: number }[]; suffix: string }) {
  if (!items.length) {
    return <p className="mt-8 text-center text-sm text-muted-foreground">Pas encore de données.</p>;
  }
  return (
    <section className="mt-5 space-y-3">
      {items.map(({ joueuse: p, value }, i) => (
        <div
          key={p.id}
          className={`grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl p-3 shadow-card animate-slide-up ${
            i === 0 ? "bg-gradient-ink text-white" : "bg-card"
          }`}
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black ${
            i === 0 ? "bg-gradient-flame text-primary-foreground" :
            i === 1 ? "bg-secondary text-secondary-foreground" :
            i === 2 ? "bg-primary/20 text-primary" :
            "bg-muted text-muted-foreground"
          }`}>
            {i + 1}
          </div>
          <img
            src={getAvatar(p.prenom, p.photo)}
            alt={p.prenom}
            loading="lazy"
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-2xl bg-white object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-black">{p.prenom}</p>
            <p className={`truncate text-xs ${i === 0 ? "text-white/60" : "text-muted-foreground"}`}>
              {p.equipe}
            </p>
          </div>
          <div className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-black ${
            i === 0 ? "bg-gradient-flame text-primary-foreground" : "bg-muted text-foreground"
          }`}>
            {value}{suffix}
          </div>
        </div>
      ))}
    </section>
  );
}

function HallOfFame({ players }: { players: Joueuse[] }) {
  const sorted = [...players].sort((a, b) => b.record_flamme - a.record_flamme);
  return (
    <section className="mt-5 space-y-3">
      <div className="rounded-3xl bg-gradient-ink p-5 text-white shadow-card">
        <div className="flex items-center gap-3">
          <Trophy size={24} className="text-primary" />
          <h2 className="text-lg font-black">Hall of Fame des records</h2>
        </div>
        <p className="mt-1 text-sm text-white/60">Les flammes les plus longues</p>
      </div>
      {sorted.map((h, i) => (
        <div
          key={h.id}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-card p-4 shadow-card animate-slide-up"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl ${
            i === 0 ? "bg-gradient-flame" : "bg-muted"
          }`}>
            {i === 0 ? "👑" : <Medal size={20} />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black">{h.prenom}</p>
            <p className="text-xs text-muted-foreground">{h.equipe}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-flame px-3 py-1.5 text-sm font-black text-primary-foreground">
            {h.record_flamme} <Flame size={14} animate={false} />
          </div>
        </div>
      ))}
    </section>
  );
}
