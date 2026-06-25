import { createFileRoute } from "@tanstack/react-router";
import { ShootGame } from "@/components/ShootGame";
import { useCoachGuard } from "@/lib/coach-guard";

export const Route = createFileRoute("/coach-shoot")({
  component: CoachShootPage,
});

function CoachShootPage() {
  const coach = useCoachGuard();
  if (!coach) return null;
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <ShootGame user={{ id: coach.id, type: "coach", nom: coach.nom }} />
    </div>
  );
}
