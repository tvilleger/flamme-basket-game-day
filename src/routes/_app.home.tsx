import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Flame } from "@/components/Flame";
import { findPlayer, getSession, clearSession } from "@/lib/session";
import { upcoming } from "@/lib/mock-data";
import { Calendar, Swords, LogOut, TrendingUp, Activity } from "lucide-react";

export const Route = createFileRoute("/_app/home")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const player = findPlayer(getSession());
  if (!player) return null;

  const logout = () => {
    clearSession();
    navigate({ to: "/" });
  };

  return (
    <div className="px-5 pt-8">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Salut 👋
          </p>
          <h1 className="truncate text-3xl font-black">{player.firstName}</h1>
        </div>
        <button
          onClick={logout}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground"
          aria-label="Déconnexion"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Hero card */}
      <section className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-ink p-5 text-white shadow-card animate-pop-in">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-flame opacity-40 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <img
              src={player.avatar}
              alt={player.firstName}
              loading="lazy"
              width={96}
              height={96}
              className="h-20 w-20 rounded-2xl border-2 border-white/20 bg-white object-cover"
            />
            <span className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-full bg-gradient-flame shadow-flame">
              <Flame size={20} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black">{player.firstName}</p>
            <p className="truncate text-xs text-white/60">{player.team}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold">
                #{player.id.toUpperCase()}
              </div>
              <div className="rounded-full bg-gradient-flame px-2.5 py-1 text-xs font-black">
                {player.flame} 🔥
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <Stat
            icon={<Flame size={18} animate={false} />}
            label="Flamme"
            value={`${player.flame}j`}
            tone="flame"
          />
          <Stat
            icon={<TrendingUp size={18} />}
            label="Record"
            value={`${player.record}j`}
            tone="dark"
          />
        </div>
      </section>

      {/* Stats grid */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <BigStat label="Présence entraînements" value={player.trainingAttendance} suffix="%" />
        <BigStat label="Présence matchs" value={player.matchAttendance} suffix="%" />
        <FatigueCard value={player.avgFatigue} />
        <div className="rounded-3xl bg-secondary p-4 text-secondary-foreground shadow-card">
          <p className="text-xs font-bold uppercase tracking-wider text-white/50">Position</p>
          <p className="mt-2 text-3xl font-black">#2</p>
          <p className="mt-1 text-xs text-white/60">au classement flammes</p>
        </div>
      </section>

      {/* Upcoming */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-black">À venir</h2>
        <div className="space-y-3">
          <EventCard
            icon={<Activity size={20} />}
            tag="ENTRAÎNEMENT"
            title={upcoming.training.date}
            sub={`${upcoming.training.time} · ${upcoming.training.place}`}
            accent="primary"
          />
          <EventCard
            icon={<Swords size={20} />}
            tag="MATCH"
            title={`vs ${upcoming.match.opponent}`}
            sub={`${upcoming.match.date} · ${upcoming.match.time} · ${upcoming.match.home ? "Domicile" : "Extérieur"}`}
            accent="dark"
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "flame" | "dark" }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl p-3 ${tone === "flame" ? "bg-gradient-flame" : "bg-white/10"}`}
    >
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
      <p className="mt-2 text-3xl font-black text-foreground">
        {value}
        <span className="text-lg text-primary">{suffix}</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-flame"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function FatigueCard({ value }: { value: number }) {
  const dots = [1, 2, 3, 4, 5];
  return (
    <div className="rounded-3xl bg-card p-4 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fatigue moy.</p>
      <p className="mt-2 text-3xl font-black">{value.toFixed(1)}<span className="text-lg text-muted-foreground">/5</span></p>
      <div className="mt-3 flex gap-1.5">
        {dots.map((d) => (
          <span
            key={d}
            className={`h-2 flex-1 rounded-full ${d <= Math.round(value) ? "bg-gradient-flame" : "bg-muted"}`}
          />
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
      <div
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
          accent === "primary" ? "bg-gradient-flame text-primary-foreground" : "bg-secondary text-secondary-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-black uppercase tracking-wider ${accent === "primary" ? "text-primary" : "text-foreground"}`}>
          {tag}
        </p>
        <p className="truncate text-base font-black">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
      <Calendar size={18} className="shrink-0 text-muted-foreground" />
    </div>
  );
}
