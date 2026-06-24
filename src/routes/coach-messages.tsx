import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useCoachGuard } from "@/lib/coach-guard";
import { fetchMessages, formatRelative } from "@/lib/api";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/coach-messages")({
  component: CoachMessages,
});

function CoachMessages() {
  const coach = useCoachGuard();
  const qc = useQueryClient();
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [sending, setSending] = useState(false);

  const { data: messages } = useQuery({
    enabled: !!coach,
    queryKey: ["messages-coach"],
    queryFn: fetchMessages,
  });

  if (!coach) return null;

  const publish = async () => {
    if (!contenu.trim()) return;
    setSending(true);
    const { error } = await supabase
      .from("messages_coach")
      .insert({ titre: titre.trim() || null, contenu: contenu.trim() });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTitre("");
    setContenu("");
    toast.success("Message publié");
    qc.invalidateQueries({ queryKey: ["messages-coach"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("messages_coach").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["messages-coach"] });
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="mx-auto max-w-2xl px-5 pb-20 pt-8">
        <Link to="/coach-dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/60">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="font-display text-3xl font-black">Messages</h1>

        <Card className="mt-5 space-y-2 border border-white/10 bg-white/5 p-4">
          <input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Titre (optionnel)"
            className="w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm text-white"
          />
          <textarea
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder="Ton message à l'équipe…"
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm text-white"
          />
          <button
            onClick={publish}
            disabled={sending || !contenu.trim()}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-flame text-sm font-bold text-white disabled:opacity-40"
          >
            <Send className="h-4 w-4" /> Publier
          </button>
        </Card>

        <div className="mt-6 space-y-2">
          {messages?.map((m) => (
            <Card key={m.id} className="border border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  {m.titre && <p className="font-display text-base font-black">{m.titre}</p>}
                  <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">{m.contenu}</p>
                  <p className="mt-2 text-xs text-white/40">{formatRelative(m.date_publication)}</p>
                </div>
                <button onClick={() => remove(m.id)} className="text-white/40 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
