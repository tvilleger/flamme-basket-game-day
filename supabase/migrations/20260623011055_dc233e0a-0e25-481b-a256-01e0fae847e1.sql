CREATE TABLE public.historique_flammes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  joueuse_id uuid NOT NULL REFERENCES public.joueuses(id) ON DELETE CASCADE,
  coach text,
  variation integer NOT NULL,
  motif text NOT NULL,
  date timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.historique_flammes TO authenticated;
GRANT SELECT, INSERT ON public.historique_flammes TO anon;
GRANT ALL ON public.historique_flammes TO service_role;

ALTER TABLE public.historique_flammes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique historique flammes"
  ON public.historique_flammes FOR SELECT
  USING (true);

CREATE POLICY "Ecriture publique historique flammes"
  ON public.historique_flammes FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_historique_flammes_joueuse ON public.historique_flammes(joueuse_id, date DESC);