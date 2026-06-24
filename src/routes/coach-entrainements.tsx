import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useCoachGuard } from "@/lib/coach-guard";
import { formatFrDate } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/coach-entrainements")({
  component: CoachEntrainements,
});

function CoachEntrainements() {
  const coach = useCoachGuard();
  const { data } = useQuery({
    enabled: !!coach,
    queryKey: ["coach-entrainements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entrainements")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!coach) return null;
  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="mx-auto max-w-2xl px-5 pb-20 pt-8">
        <Link to="/coach-dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/60">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="font-display text-3xl font-black">Entraînements</h1>
        <div className="mt-5 space-y-2">
          {data?.length === 0 && <Card className="border-white/10 bg-white/5 p-4 text-sm text-white/60">Aucun entraînement.</Card>}
          {data?.map((e) => (
            <Card key={e.id} className="border border-white/10 bg-white/5 p-4">
              <p className="font-display text-base font-black capitalize">{formatFrDate(e.date)}</p>
              <p className="text-sm text-white/60">
                {e.heure.slice(0, 5)} · {e.lieu ?? e.equipe}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
