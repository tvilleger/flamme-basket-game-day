import { players, type Player } from "./mock-data";

const KEY = "flamme-session";

export type Session = { firstName: string; birthDate: string };

export function saveSession(s: Session) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(s));
}
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}
export function clearSession() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}
export function findPlayer(s: Session | null): Player | null {
  if (!s) return null;
  const match = players.find(
    (p) => p.firstName.toLowerCase() === s.firstName.toLowerCase() && p.birthDate === s.birthDate,
  );
  return match ?? players[0]; // demo fallback
}
