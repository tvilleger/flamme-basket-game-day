import { findJoueuse, type Joueuse } from "./api";

const KEY = "flamme-session";

export type Session = { joueuseId: string; prenom: string };

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

export async function attemptLogin(prenom: string, dateNaissance: string): Promise<Joueuse | null> {
  return findJoueuse(prenom, dateNaissance);
}
