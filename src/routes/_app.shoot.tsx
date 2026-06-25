import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShootGame } from "@/components/ShootGame";
import { getSession } from "@/lib/session";
import { fetchJoueuseById } from "@/lib/api";

export const Route = createFileRoute("/_app/shoot")({
  component: ShootPage,
});

function ShootPage() {
  const session = getSession();
  const [nom, setNom] = useState<string>(session?.prenom ?? "Joueuse");

  useEffect(() => {
    if (!session) return;
    fetchJoueuseById(session.joueuseId)
      .then((j) => j && setNom(j.prenom))
      .catch(() => {});
  }, [session]);

  if (!session) return null;
  return (
    <ShootGame
      user={{ id: session.joueuseId, type: "joueuse", nom }}
    />
  );
}
