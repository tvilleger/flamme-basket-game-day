import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Pencil, Trash2, Archive, ArchiveRestore, Plus, Check, X, Star } from "lucide-react";
import { toast } from "sonner";
import { useCoachGuard } from "@/lib/coach-guard";
import {
  fetchMissions,
  fetchInscriptions,
  validerInscription,
  refuserInscription,
  type Mission,
  type MissionInscription,
} from "@/lib/missions";
import { formatFrDate } from "@/lib/api";

export const Route = createFileRoute("/coach-missions")({
  component: CoachMissions,
});

type FormState = {
  id?: string;
  titre: string;
  description: string;
  etoiles: number;
  date: string;
  places_max: number;
};

const emptyForm: FormState = {
  titre: "",
  description: "",
  etoiles: 10,
  date: "",
  places_max: 1,
};

function CoachMissions() {
  const coach = useCoachGuard();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [direct, setDirect] = useState<{ joueuseId: string; etoiles: number; motif: string }>({
    joueuseId: "",
    etoiles: 5,
    motif: "",
  });


  const missionsQ = useQuery({ queryKey: ["missions"], queryFn: fetchMissions });
  const inscQ = useQuery({ queryKey: ["missions-inscriptions"], queryFn: fetchInscriptions });
  const joueusesQ = useQuery({
    queryKey: ["joueuses-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("joueuses").select("id, prenom");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        titre: form.titre.trim(),
        description: form.description.trim() || null,
        etoiles: Number(form.etoiles),
        date: form.date || null,
        places_max: Math.max(1, Number(form.places_max)),
      };
      if (!payload.titre) throw new Error("Titre requis");
      if (form.id) {
        const { error } = await supabase.from("missions").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("missions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "Mission mise à jour" : "Mission créée");
      setForm(emptyForm);
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["missions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("missions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mission supprimée");
      qc.invalidateQueries({ queryKey: ["missions"] });
    },
  });

  const toggleArchive = useMutation({
    mutationFn: async (m: Mission) => {
      const { error } = await supabase
        .from("missions")
        .update({ archivee: !m.archivee })
        .eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["missions"] }),
  });

  const validate = useMutation({
    mutationFn: (i: MissionInscription) => validerInscription(i, coach!.nom),
    onSuccess: () => {
      toast.success("Inscription validée — étoiles attribuées ⭐");
      qc.invalidateQueries({ queryKey: ["missions-inscriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refuse = useMutation({
    mutationFn: (i: MissionInscription) => refuserInscription(i, coach!.nom),
    onSuccess: () => {
      toast.success("Inscription refusée");
      qc.invalidateQueries({ queryKey: ["missions-inscriptions"] });
    },
  });

  const awardDirect = useMutation({
    mutationFn: async () => {
      if (!direct.joueuseId) throw new Error("Choisis une joueuse");
      const nb = Number(direct.etoiles);
      if (!nb || nb < 1) throw new Error("Nombre d'étoiles invalide");
      const { error } = await supabase.from("etoiles_joueuses").insert({
        joueuse_id: direct.joueuseId,
        etoiles: nb,
        motif: direct.motif.trim() || "Attribution directe",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`+${direct.etoiles} ⭐ attribuée`);
      setDirect({ joueuseId: "", etoiles: 5, motif: "" });
      qc.invalidateQueries({ queryKey: ["etoiles-total"] });
      qc.invalidateQueries({ queryKey: ["ranking-stars"] });
      qc.invalidateQueries({ queryKey: ["coach-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  if (!coach) return null;

  const missions = missionsQ.data ?? [];
  const insc = inscQ.data ?? [];
  const enAttente = insc.filter((i) => i.statut === "en_attente");
  const prenomOf = (id: string) =>
    joueusesQ.data?.find((j) => j.id === id)?.prenom ?? "—";
  const missionOf = (id: string) => missions.find((m) => m.id === id);

  const startEdit = (m: Mission) => {
    setForm({
      id: m.id,
      titre: m.titre,
      description: m.description ?? "",
      etoiles: m.etoiles,
      date: m.date ?? "",
      places_max: m.places_max,
    });
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="mx-auto max-w-2xl px-5 pb-24 pt-8">
        <Link to="/coach-dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/60">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="font-display text-3xl font-black">🏆 Gestion des missions</h1>

        <Card className="mt-5 border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-black">
              {form.id ? "Modifier la mission" : "Nouvelle mission"}
            </h2>
            {form.id && (
              <button
                onClick={() => { setForm(emptyForm); setEditing(false); }}
                className="text-xs text-white/60 hover:text-white"
              >
                Annuler
              </button>
            )}
          </div>
          <div className="grid gap-2">
            <input
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              placeholder="Titre (ex: Table de marque)"
              className="rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm text-white"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              rows={2}
              className="rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm text-white"
            />
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs">
                <span className="block text-white/60">Étoiles</span>
                <input
                  type="number"
                  min={1}
                  value={form.etoiles}
                  onChange={(e) => setForm({ ...form, etoiles: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-xs">
                <span className="block text-white/60">Places</span>
                <input
                  type="number"
                  min={1}
                  value={form.places_max}
                  onChange={(e) => setForm({ ...form, places_max: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-xs">
                <span className="block text-white/60">Date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm text-white"
                />
              </label>
            </div>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.titre.trim()}
              className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-flame text-sm font-bold text-white disabled:opacity-40"
            >
              {form.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {form.id ? "Mettre à jour" : "Créer la mission"}
            </button>
          </div>
        </Card>

        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-black">⭐ Attribuer des étoiles</h2>
          <Card className="border border-white/10 bg-white/5 p-4">
            <div className="grid gap-2">
              <select
                value={direct.joueuseId}
                onChange={(e) => setDirect({ ...direct, joueuseId: e.target.value })}
                className="rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm text-white"
              >
                <option value="">— Choisir une joueuse —</option>
                {(joueusesQ.data ?? []).map((j) => (
                  <option key={j.id} value={j.id}>{j.prenom}</option>
                ))}
              </select>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <input
                  type="number"
                  min={1}
                  value={direct.etoiles}
                  onChange={(e) => setDirect({ ...direct, etoiles: Number(e.target.value) })}
                  className="rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm text-white"
                  aria-label="Nombre d'étoiles"
                />
                <input
                  value={direct.motif}
                  onChange={(e) => setDirect({ ...direct, motif: e.target.value })}
                  placeholder="Motif (optionnel)"
                  className="rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm text-white"
                />
              </div>
              <button
                onClick={() => awardDirect.mutate()}
                disabled={awardDirect.isPending || !direct.joueuseId}
                className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-flame text-sm font-bold text-white disabled:opacity-40"
              >
                <Star className="h-4 w-4 fill-white" /> Attribuer
              </button>
            </div>
          </Card>
        </section>

        <section className="mt-8">

          <h2 className="mb-3 font-display text-lg font-black">
            📋 Demandes en attente
            {enAttente.length > 0 && (
              <span className="ml-2 rounded-full bg-flame px-2 py-0.5 text-xs">{enAttente.length}</span>
            )}
          </h2>
          {enAttente.length === 0 ? (
            <Card className="border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              Aucune demande en attente.
            </Card>
          ) : (
            <div className="space-y-2">
              {enAttente.map((i) => {
                const m = missionOf(i.mission_id);
                return (
                  <Card key={i.id} className="border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-white">{prenomOf(i.joueuse_id)}</p>
                        <p className="truncate text-xs text-white/60">
                          {m?.titre} · +{m?.etoiles ?? 0} ⭐
                        </p>
                      </div>
                      <button
                        onClick={() => validate.mutate(i)}
                        className="rounded-xl bg-emerald-500/20 p-2 text-emerald-300 hover:bg-emerald-500/30"
                        aria-label="Valider"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => refuse.mutate(i)}
                        className="rounded-xl bg-red-500/20 p-2 text-red-300 hover:bg-red-500/30"
                        aria-label="Refuser"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-black">Toutes les missions</h2>
          <div className="space-y-2">
            {missions.map((m) => {
              const taken = insc.filter(
                (i) => i.mission_id === m.id && ["en_attente", "validee", "terminee"].includes(i.statut),
              ).length;
              return (
                <Card
                  key={m.id}
                  className={`border p-3 ${m.archivee ? "border-white/5 bg-white/[0.02] opacity-60" : "border-white/10 bg-white/5"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-flame text-white">
                      <Star className="h-5 w-5 fill-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-white">{m.titre}</p>
                      <p className="text-xs text-white/60">
                        +{m.etoiles} ⭐ · {taken}/{m.places_max} places
                        {m.date && ` · ${formatFrDate(m.date)}`}
                      </p>
                    </div>
                    <button onClick={() => startEdit(m)} className="rounded-lg p-2 text-white/60 hover:bg-white/10">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => toggleArchive.mutate(m)} className="rounded-lg p-2 text-white/60 hover:bg-white/10">
                      {m.archivee ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer "${m.titre}" ?`)) removeMission.mutate(m.id);
                      }}
                      className="rounded-lg p-2 text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              );
            })}
            {missions.length === 0 && (
              <p className="text-sm text-white/60">Aucune mission créée.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
