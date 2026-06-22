import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Flame } from "@/components/Flame";
import { attemptLogin, saveSession } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flamme Basket — Connexion" },
      { name: "description", content: "L'app de l'équipe féminine Flamme Basket." },
      { name: "theme-color", content: "#FF6A1F" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("Léa");
  const [birthDate, setBirthDate] = useState("2008-04-12");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !birthDate) return;
    setLoading(true);
    setError(null);
    try {
      const joueuse = await attemptLogin(firstName.trim(), birthDate);
      if (!joueuse) {
        setError("Aucune joueuse trouvée avec ce prénom et cette date.");
        return;
      }
      saveSession({ joueuseId: joueuse.id, prenom: joueuse.prenom });
      navigate({ to: "/home" });
    } catch (err) {
      console.error(err);
      setError("Connexion impossible. Réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-gradient-ink px-6 pb-10 pt-16 text-white">
      <div className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-gradient-flame opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-gradient-flame opacity-20 blur-3xl" />

      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-flame shadow-flame">
            <Flame size={32} />
          </div>
          <div>
            <p className="font-display text-2xl font-black leading-none">Flamme</p>
            <p className="font-display text-2xl font-black leading-none text-primary">Basket</p>
          </div>
        </div>

        <div className="mt-16 animate-slide-up">
          <h1 className="text-4xl font-black leading-tight">
            Allume ta <span className="text-primary">flamme</span> 🔥
          </h1>
          <p className="mt-3 text-white/70">
            Connecte-toi pour rejoindre l'équipe, valider tes présences et grimper au classement.
          </p>
        </div>

        <form onSubmit={submit} className="mt-10 flex flex-col gap-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">Prénom</span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-2xl border-2 border-white/10 bg-white/10 px-5 py-4 text-lg font-semibold text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
              placeholder="Ton prénom"
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">
              Date de naissance
            </span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="rounded-2xl border-2 border-white/10 bg-white/10 px-5 py-4 text-lg font-semibold text-white focus:border-primary focus:outline-none"
              required
            />
          </label>

          {error && (
            <p className="rounded-xl bg-destructive/20 px-4 py-3 text-sm font-semibold text-white">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 rounded-2xl bg-gradient-flame px-6 py-4 text-lg font-black text-primary-foreground shadow-flame transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Entrer dans le vestiaire →"}
          </button>

          <p className="mt-2 text-center text-xs text-white/40">
            Démo : Léa · 12/04/2008
          </p>
        </form>
      </div>
    </div>
  );
}
