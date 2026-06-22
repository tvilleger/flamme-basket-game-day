import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { players, hallOfFame } from "@/lib/mock-data";
import { Flame } from "@/components/Flame";
import { Trophy, Medal } from "lucide-react";

export const Route = createFileRoute("/_app/rankings")({
  component: RankingsPage,
});

type Tab = "training" | "match" | "flame" | "hof";

const tabs: { id: Tab; label: string }[] = [
  { id: "training", label: "Entraîn." },
  { id: "match", label: "Matchs" },
  { id: "flame", label: "Flammes" },
  { id: "hof", label: "Hall of Fame" },
];

function RankingsPage() {
  const [tab, setTab] = useState<Tab>("flame");

  const sorted = [...players].sort((a, b) => {
    if (tab === "training") return b.trainingAttendance - a.trainingAttendance;
    if (tab === "match") return b.matchAttendance - a.matchAttendance;
    return b.flame - a.flame;
  });

  return (
    <div className="px-5 pt-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Classements</p>
        <h1 className="mt-1 text-3xl font-black">Qui mène la danse ?</h1>
      </header>

      {/* Tabs */}
      <div className="mt-5 -mx-5 overflow-x-auto px-5 pb-1">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition-all ${
                tab === t.id
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "hof" ? (
        <section className="mt-5 space-y-3">
          <div className="rounded-3xl bg-gradient-ink p-5 text-white shadow-card">
            <div className="flex items-center gap-3">
              <Trophy size={24} className="text-primary" />
              <h2 className="text-lg font-black">Hall of Fame des records</h2>
            </div>
            <p className="mt-1 text-sm text-white/60">Les flammes les plus longues de la saison</p>
          </div>
          {hallOfFame.map((h, i) => (
            <div
              key={h.name}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-card p-4 shadow-card animate-slide-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl ${
                i === 0 ? "bg-gradient-flame" : "bg-muted"
              }`}>
                {i === 0 ? "👑" : <Medal size={20} />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-black">{h.name}</p>
                <p className="text-xs text-muted-foreground">Saison {h.year}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-flame px-3 py-1.5 text-sm font-black text-primary-foreground">
                {h.record} <Flame size={14} animate={false} />
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="mt-5 space-y-3">
          {sorted.map((p, i) => {
            const value =
              tab === "training" ? `${p.trainingAttendance}%` :
              tab === "match" ? `${p.matchAttendance}%` :
              `${p.flame}j`;
            return (
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
                  src={p.avatar}
                  alt={p.firstName}
                  loading="lazy"
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded-2xl bg-white object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-black">{p.firstName}</p>
                  <p className={`truncate text-xs ${i === 0 ? "text-white/60" : "text-muted-foreground"}`}>
                    {p.team}
                  </p>
                </div>
                <div className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-black ${
                  i === 0 ? "bg-gradient-flame text-primary-foreground" : "bg-muted text-foreground"
                }`}>
                  {tab === "flame" ? `${value} 🔥` : value}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
