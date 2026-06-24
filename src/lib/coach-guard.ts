import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export type CoachSession = { id: string; nom: string };

export function useCoachGuard() {
  const navigate = useNavigate();
  const [coach, setCoach] = useState<CoachSession | null>(null);
  useEffect(() => {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem("coach-session") : null;
    if (!raw) {
      navigate({ to: "/coach-login" });
      return;
    }
    try {
      setCoach(JSON.parse(raw));
    } catch {
      navigate({ to: "/coach-login" });
    }
  }, [navigate]);
  return coach;
}
