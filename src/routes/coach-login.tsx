import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { attemptCoachLogin } from "@/lib/session";

export const Route = createFileRoute("/coach-login")({
  component: CoachLogin,
});

function CoachLogin() {
  const navigate = useNavigate();

  const [nom, setNom] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const coach = await attemptCoachLogin(
      nom.trim(),
      motDePasse.trim()
    );

    if (!coach) {
      setError("Identifiants incorrects");
      return;
    }

    localStorage.setItem(
      "coach-session",
      JSON.stringify(coach)
    );

    navigate({
      to: "/coach-dashboard",
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-black">
        Connexion Coach
      </h1>

      <form
        onSubmit={submit}
        className="mt-6 flex flex-col gap-4"
      >
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nom"
          className="rounded-xl border p-4"
        />

        <input
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="Mot de passe"
          className="rounded-xl border p-4"
        />

        <button
          type="submit"
          className="rounded-xl bg-orange-500 p-4 text-white font-bold"
        >
          Se connecter
        </button>

        {error && <p>{error}</p>}
      </form>
    </div>
  );
}
