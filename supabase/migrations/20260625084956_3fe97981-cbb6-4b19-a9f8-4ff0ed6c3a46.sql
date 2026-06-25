CREATE TABLE public.shoot_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  utilisateur_id UUID NOT NULL,
  utilisateur_type TEXT NOT NULL CHECK (utilisateur_type IN ('joueuse','coach')),
  nom TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 200),
  date_partie TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.shoot_scores TO anon, authenticated;
GRANT ALL ON public.shoot_scores TO service_role;
ALTER TABLE public.shoot_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read shoot scores" ON public.shoot_scores FOR SELECT USING (true);
CREATE POLICY "Public insert shoot scores" ON public.shoot_scores FOR INSERT WITH CHECK (true);
CREATE INDEX idx_shoot_scores_score ON public.shoot_scores (score DESC);
CREATE INDEX idx_shoot_scores_user ON public.shoot_scores (utilisateur_id, score DESC);