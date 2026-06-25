import { supabase } from "@/integrations/supabase/client";

export type ShootUserType = "joueuse" | "coach";

export type ShootScore = {
  id: string;
  utilisateur_id: string;
  utilisateur_type: ShootUserType;
  nom: string;
  score: number;
  date_partie: string;
};

export type ShootLeaderEntry = {
  utilisateur_id: string;
  utilisateur_type: ShootUserType;
  nom: string;
  best: number;
  date: string;
};

export async function saveShootScore(params: {
  utilisateur_id: string;
  utilisateur_type: ShootUserType;
  nom: string;
  score: number;
}) {
  const safe = Math.max(0, Math.min(200, Math.floor(params.score)));
  const { error } = await supabase.from("shoot_scores").insert({
    utilisateur_id: params.utilisateur_id,
    utilisateur_type: params.utilisateur_type,
    nom: params.nom,
    score: safe,
  });
  if (error) throw error;
}

export async function fetchPersonalBest(utilisateur_id: string): Promise<number> {
  const { data, error } = await supabase
    .from("shoot_scores")
    .select("score")
    .eq("utilisateur_id", utilisateur_id)
    .order("score", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.score ?? 0;
}

export async function fetchShootLeaderboard(): Promise<ShootLeaderEntry[]> {
  const { data, error } = await supabase
    .from("shoot_scores")
    .select("utilisateur_id, utilisateur_type, nom, score, date_partie")
    .order("score", { ascending: false })
    .limit(500);
  if (error) throw error;
  const best = new Map<string, ShootLeaderEntry>();
  (data ?? []).forEach((r) => {
    const cur = best.get(r.utilisateur_id);
    if (!cur || r.score > cur.best) {
      best.set(r.utilisateur_id, {
        utilisateur_id: r.utilisateur_id,
        utilisateur_type: r.utilisateur_type as ShootUserType,
        nom: r.nom,
        best: r.score,
        date: r.date_partie,
      });
    }
  });
  return Array.from(best.values()).sort((a, b) => b.best - a.best);
}
