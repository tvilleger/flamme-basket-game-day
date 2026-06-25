import { supabase } from "@/integrations/supabase/client";

export type Mission = {
  id: string;
  titre: string;
  description: string | null;
  etoiles: number;
  date: string | null;
  places_max: number;
  archivee: boolean;
  categorie: string | null;
  recurrente: boolean;
  automatique: boolean;
  created_at: string;
};

export type MissionInscription = {
  id: string;
  mission_id: string;
  joueuse_id: string;
  statut: "en_attente" | "validee" | "refusee" | "terminee";
  date_inscription: string;
  date_validation: string | null;
  coach_validateur: string | null;
  motif_refus: string | null;
};

export async function fetchMissions(): Promise<Mission[]> {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .order("date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Mission[];
}

export async function fetchInscriptions(): Promise<MissionInscription[]> {
  const { data, error } = await supabase
    .from("missions_inscriptions")
    .select("*")
    .order("date_inscription", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MissionInscription[];
}

export async function fetchMyInscriptions(joueuseId: string) {
  const { data, error } = await supabase
    .from("missions_inscriptions")
    .select("*")
    .eq("joueuse_id", joueuseId);
  if (error) throw error;
  return (data ?? []) as MissionInscription[];
}

export async function fetchTotalEtoiles(joueuseId: string) {
  const { data, error } = await supabase
    .from("etoiles_joueuses")
    .select("etoiles")
    .eq("joueuse_id", joueuseId);
  if (error) throw error;
  return (data ?? []).reduce((s, r) => s + (r.etoiles ?? 0), 0);
}

export async function inscrireMission(missionId: string, joueuseId: string) {
  // check places restantes
  const [missionRes, inscRes] = await Promise.all([
    supabase.from("missions").select("*").eq("id", missionId).maybeSingle(),
    supabase
      .from("missions_inscriptions")
      .select("*")
      .eq("mission_id", missionId)
      .in("statut", ["en_attente", "validee", "terminee"]),
  ]);
  if (missionRes.error) throw missionRes.error;
  if (!missionRes.data) throw new Error("Mission introuvable");
  const mission = missionRes.data as Mission;
  if (mission.archivee) throw new Error("Mission archivée");
  const taken = (inscRes.data ?? []).length;
  if (taken >= mission.places_max) throw new Error("Plus de places disponibles");
  const already = (inscRes.data ?? []).find((i) => i.joueuse_id === joueuseId);
  if (already) throw new Error("Déjà inscrite");
  const { error } = await supabase
    .from("missions_inscriptions")
    .insert({ mission_id: missionId, joueuse_id: joueuseId, statut: "en_attente" });
  if (error) throw error;
}

export async function validerInscription(
  inscription: MissionInscription,
  coach: string,
) {
  const mission = await supabase
    .from("missions")
    .select("*")
    .eq("id", inscription.mission_id)
    .maybeSingle();
  if (mission.error || !mission.data) throw mission.error ?? new Error("Mission introuvable");
  const m = mission.data as Mission;
  const { error: upErr } = await supabase
    .from("missions_inscriptions")
    .update({
      statut: "validee",
      date_validation: new Date().toISOString(),
      coach_validateur: coach,
    })
    .eq("id", inscription.id);
  if (upErr) throw upErr;
  const { error: eErr } = await supabase.from("etoiles_joueuses").insert({
    joueuse_id: inscription.joueuse_id,
    mission_id: m.id,
    etoiles: m.etoiles,
    motif: `Mission : ${m.titre}`,
  });
  if (eErr) throw eErr;
}

export async function refuserInscription(
  inscription: MissionInscription,
  coach: string,
  motif?: string,
) {
  const { error } = await supabase
    .from("missions_inscriptions")
    .update({
      statut: "refusee",
      date_validation: new Date().toISOString(),
      coach_validateur: coach,
      motif_refus: motif ?? null,
    })
    .eq("id", inscription.id);
  if (error) throw error;
}

export async function getOrCreateAutoMission(date: string): Promise<Mission> {
  const existing = await supabase
    .from("missions")
    .select("*")
    .eq("automatique", true)
    .eq("date", date)
    .eq("titre", "Rangement du matériel")
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as Mission;
  const ins = await supabase
    .from("missions")
    .insert({
      titre: "Rangement du matériel",
      description: "Aider à ranger le matériel après l'entraînement.",
      etoiles: 10,
      date,
      places_max: 2,
      automatique: true,
      categorie: "auto",
    })
    .select("*")
    .single();
  if (ins.error) throw ins.error;
  return ins.data as Mission;
}

export async function fetchMissionTakenCount(missionId: string) {
  const { data, error } = await supabase
    .from("missions_inscriptions")
    .select("id, statut, joueuse_id")
    .eq("mission_id", missionId);
  if (error) throw error;
  return (data ?? []).filter((r) =>
    ["en_attente", "validee", "terminee"].includes(r.statut),
  );
}
