import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { useCoachGuard } from "@/lib/coach-guard";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/coach-exports")({
  component: CoachExports,
});

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function CoachExports() {
  const coach = useCoachGuard();
  if (!coach) return null;

  const exportTable = async (table: "joueuses" | "presences_entrainements" | "entrainements" | "matchs" | "presences_matchs") => {
    const { data, error } = await supabase.from(table).select("*");
    if (error) return toast.error(error.message);
    download(`${table}.csv`, toCSV(data ?? []));
    toast.success(`${table}.csv téléchargé`);
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="mx-auto max-w-2xl px-5 pb-20 pt-8">
        <Link to="/coach-dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/60">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="font-display text-3xl font-black">Exports CSV</h1>
        <div className="mt-5 grid gap-2">
          {(["joueuses", "entrainements", "presences_entrainements", "matchs", "presences_matchs"] as const).map((t) => (
            <Card key={t} className="flex items-center justify-between border border-white/10 bg-white/5 p-4">
              <span className="text-sm font-bold text-white">{t}</span>
              <button
                onClick={() => exportTable(t)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-flame px-3 text-xs font-bold text-white"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
