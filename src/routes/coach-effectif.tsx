import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAvatar, type Joueuse } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { useCoachGuard } from "@/lib/coach-guard";
import { ArrowLeft, Minus, Plus, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/coach-effectif")({
  component: CoachEffectif,
});

function CoachEffectif() {
  const coach = useCoachGuard();
  const qc = useQueryClient();

  const { data } = useQuery({
    enabled: !!coach,
    queryKey: ["coach-effectif"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("joueuses")
        .select("*")
        .order("prenom");
      if (error) throw error;
      return (data ?? []) as Joueuse[];
    },
  });

  if (!coach) return null;

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="mx-auto max-w-2xl px-5 pb-20 pt-8">
        <Link to="/coach-dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="font-display text-3xl font-black">Effectif</h1>
        <p className="text-xs text-white/50">{data?.length ?? 0} joueuses · U15 Performance</p>

        <div className="mt-5 space-y-3">
          {!data ? (
            <Card className="border-white/10 bg-white/5 p-4 text-sm text-white/60">Chargement…</Card>
          ) : (
            data.map((j) => (
              <PlayerCard key={j.id} j={j} onUpdated={() => qc.invalidateQueries({ queryKey: ["coach-effectif"] })} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ j, onUpdated }: { j: Joueuse; onUpdated: () => void }) {
  const [flamme, setFlamme] = useState(j.flamme_actuelle);
  const [blessure, setBlessure] = useState(j.statut_blessure);
  const [saving, setSaving] = useState(false);

  const dirty = flamme !== j.flamme_actuelle || blessure !== j.statut_blessure;

  const save = async () => {
    setSaving(true);
    const newRecord = Math.max(j.record_flamme, flamme);
    const { error } = await supabase
      .from("joueuses")
      .update({
        flamme_actuelle: flamme,
        record_flamme: newRecord,
        statut_blessure: blessure || "OK",
      })
      .eq("id", j.id);
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success(`${j.prenom} mise à jour`);
    onUpdated();
  };

  return (
    <Card className="border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        <img
          src={getAvatar(j.prenom, j.photo)}
          alt={j.prenom}
          className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white/10"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-black text-white">{j.prenom}</p>
          <p className="truncate text-xs text-white/50">
            Licence {j.licence ?? "—"} · Record {j.record_flamme}🔥
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/60">
            Flamme actuelle
          </p>
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-ink p-1">
            <button
              onClick={() => setFlamme((v) => Math.max(0, v - 1))}
              className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white hover:bg-white/10"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={flamme}
              onChange={(e) => setFlamme(Math.max(0, parseInt(e.target.value || "0", 10)))}
              className="w-full bg-transparent text-center font-display text-lg font-black text-flame outline-none"
            />
            <button
              onClick={() => setFlamme((v) => v + 1)}
              className="grid h-8 w-8 place-items-center rounded-lg bg-flame text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/60">
            Statut blessure
          </p>
          <select
            value={blessure}
            onChange={(e) => setBlessure(e.target.value)}
            className="h-10 w-full rounded-xl border border-white/10 bg-ink px-2 text-sm text-white"
          >
            <option value="OK">✅ Apte</option>
            <option value="Légère">⚠️ Légère</option>
            <option value="Cheville">🦶 Cheville</option>
            <option value="Genou">🦵 Genou</option>
            <option value="Dos">🪪 Dos</option>
            <option value="Sérieuse">🚑 Sérieuse</option>
          </select>
        </div>
      </div>

      <button
        onClick={save}
        disabled={!dirty || saving}
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-flame text-sm font-bold text-white disabled:opacity-40"
      >
        <Save className="h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </Card>
  );
}
