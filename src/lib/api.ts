import { supabase } from "@/integrations/supabase/client";
import avatar1 from "@/assets/avatar-1.png";
import avatar2 from "@/assets/avatar-2.png";
import avatar3 from "@/assets/avatar-3.png";
import avatar4 from "@/assets/avatar-4.png";
import avatarCoach from "@/assets/avatar-coach.png";

// Fallback avatars when joueuses.photo is null — keyed by first letter of prenom.
const fallbackAvatars: Record<string, string> = {
  L: avatar1,
  I: avatar2,
  M: avatar3,
  C: avatar4,
};

export function getAvatar(prenom: string, photo: string | null) {
  if (photo) return photo;
  return fallbackAvatars[prenom[0]?.toUpperCase()] ?? avatar1;
}

export const coachAvatar = avatarCoach;

export type Joueuse = {
  id: string;
  prenom: string;
  date_naissance: string;
  photo: string | null;
  equipe: string;
  flamme_actuelle: number;
  record_flamme: number;
  statut_blessure: string;
};

export async function fetchJoueuses(): Promise<Joueuse[]> {
  const { data, error } = await supabase
    .from("joueuses")
    .select("*")
    .order("flamme_actuelle", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function findJoueuse(
  prenom: string,
  licence: string
) {
  console.log("Recherche :", prenom, licence);

  const { data, error } = await supabase
    .from("joueuses")
    .select("*")
    .eq("licence", licence);

  console.log("Résultat :", data);

  if (error) throw error;

  return data?.[0] ?? null;
}

export async function fetchJoueuseById(id: string) {
  const { data, error } = await supabase
    .from("joueuses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type Entrainement = {
  id: string;
  date: string;
  heure: string;
  equipe: string;
  lieu: string | null;
};
export type Match = {
  id: string;
  date: string;
  heure: string;
  adversaire: string;
  lieu: string;
};

export async function fetchNextEntrainement(): Promise<Entrainement | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("entrainements")
    .select("*")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function fetchNextMatch(): Promise<Match | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("matchs")
    .select("*")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type PresenceStats = {
  trainingAttendance: number;
  matchAttendance: number;
  avgFatigue: number;
};

export async function fetchStats(joueuseId: string): Promise<PresenceStats> {
  const [{ data: pe }, { data: pm }] = await Promise.all([
    supabase.from("presences_entrainements").select("presente, fatigue").eq("joueuse_id", joueuseId),
    supabase.from("presences_matchs").select("presente").eq("joueuse_id", joueuseId),
  ]);
  const peRows = pe ?? [];
  const pmRows = pm ?? [];
  const trainingAttendance = peRows.length
    ? Math.round((peRows.filter((r) => r.presente).length / peRows.length) * 100)
    : 0;
  const matchAttendance = pmRows.length
    ? Math.round((pmRows.filter((r) => r.presente).length / pmRows.length) * 100)
    : 0;
  const fatigues = peRows.map((r) => r.fatigue).filter((f): f is number => typeof f === "number");
  const avgFatigue = fatigues.length
    ? fatigues.reduce((a, b) => a + b, 0) / fatigues.length
    : 0;
  return { trainingAttendance, matchAttendance, avgFatigue };
}

export type Message = {
  id: string;
  titre: string | null;
  contenu: string;
  date_publication: string;
};

export async function fetchMessages(): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages_coach")
    .select("*")
    .order("date_publication", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function submitCheckin(params: {
  joueuseId: string;
  entrainementId: string;
  presente: boolean;
  fatigue: number | null;
}) {
  const { error } = await supabase.from("presences_entrainements").upsert(
    {
      joueuse_id: params.joueuseId,
      entrainement_id: params.entrainementId,
      presente: params.presente,
      fatigue: params.fatigue,
      date_validation: new Date().toISOString(),
    },
    { onConflict: "joueuse_id,entrainement_id" },
  );
  if (error) throw error;
}

export function formatFrDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatRelative(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}
export type Coach = {
  id: string;
  nom: string;
  mot_de_passe: string;
};

export async function findCoach(
  nom: string,
  motDePasse: string
): Promise<Coach | null> {
  const { data, error } = await supabase
    .from("coachs")
    .select("*")
    .ilike("nom", nom)
    .eq("mot_de_passe", motDePasse)
    .maybeSingle();

  if (error) throw error;

  return data;
}
