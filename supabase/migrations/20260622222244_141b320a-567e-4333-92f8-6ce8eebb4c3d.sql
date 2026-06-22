
-- JOUEUSES
CREATE TABLE public.joueuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom text NOT NULL,
  date_naissance date NOT NULL,
  photo text,
  equipe text NOT NULL DEFAULT 'U18 Flammes',
  flamme_actuelle integer NOT NULL DEFAULT 0,
  record_flamme integer NOT NULL DEFAULT 0,
  statut_blessure text NOT NULL DEFAULT 'OK',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prenom, date_naissance)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.joueuses TO anon, authenticated;
GRANT ALL ON public.joueuses TO service_role;
ALTER TABLE public.joueuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique joueuses" ON public.joueuses FOR SELECT USING (true);
CREATE POLICY "Ecriture publique joueuses" ON public.joueuses FOR ALL USING (true) WITH CHECK (true);

-- ENTRAINEMENTS
CREATE TABLE public.entrainements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  heure time NOT NULL,
  equipe text NOT NULL DEFAULT 'U18 Flammes',
  lieu text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrainements TO anon, authenticated;
GRANT ALL ON public.entrainements TO service_role;
ALTER TABLE public.entrainements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique entrainements" ON public.entrainements FOR SELECT USING (true);
CREATE POLICY "Ecriture publique entrainements" ON public.entrainements FOR ALL USING (true) WITH CHECK (true);

-- PRESENCES_ENTRAINEMENTS
CREATE TABLE public.presences_entrainements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  joueuse_id uuid NOT NULL REFERENCES public.joueuses(id) ON DELETE CASCADE,
  entrainement_id uuid NOT NULL REFERENCES public.entrainements(id) ON DELETE CASCADE,
  presente boolean NOT NULL DEFAULT true,
  fatigue smallint CHECK (fatigue BETWEEN 1 AND 5),
  date_validation timestamptz NOT NULL DEFAULT now(),
  UNIQUE (joueuse_id, entrainement_id)
);
CREATE INDEX idx_pe_joueuse ON public.presences_entrainements(joueuse_id);
CREATE INDEX idx_pe_entrainement ON public.presences_entrainements(entrainement_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presences_entrainements TO anon, authenticated;
GRANT ALL ON public.presences_entrainements TO service_role;
ALTER TABLE public.presences_entrainements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique presences entr" ON public.presences_entrainements FOR SELECT USING (true);
CREATE POLICY "Ecriture publique presences entr" ON public.presences_entrainements FOR ALL USING (true) WITH CHECK (true);

-- MATCHS
CREATE TABLE public.matchs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  heure time NOT NULL,
  adversaire text NOT NULL,
  lieu text NOT NULL DEFAULT 'Domicile',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matchs TO anon, authenticated;
GRANT ALL ON public.matchs TO service_role;
ALTER TABLE public.matchs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique matchs" ON public.matchs FOR SELECT USING (true);
CREATE POLICY "Ecriture publique matchs" ON public.matchs FOR ALL USING (true) WITH CHECK (true);

-- PRESENCES_MATCHS
CREATE TABLE public.presences_matchs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  joueuse_id uuid NOT NULL REFERENCES public.joueuses(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matchs(id) ON DELETE CASCADE,
  presente boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (joueuse_id, match_id)
);
CREATE INDEX idx_pm_joueuse ON public.presences_matchs(joueuse_id);
CREATE INDEX idx_pm_match ON public.presences_matchs(match_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presences_matchs TO anon, authenticated;
GRANT ALL ON public.presences_matchs TO service_role;
ALTER TABLE public.presences_matchs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique presences matchs" ON public.presences_matchs FOR SELECT USING (true);
CREATE POLICY "Ecriture publique presences matchs" ON public.presences_matchs FOR ALL USING (true) WITH CHECK (true);

-- MESSAGES_COACH
CREATE TABLE public.messages_coach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text,
  contenu text NOT NULL,
  date_publication timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages_coach TO anon, authenticated;
GRANT ALL ON public.messages_coach TO service_role;
ALTER TABLE public.messages_coach ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique messages" ON public.messages_coach FOR SELECT USING (true);
CREATE POLICY "Ecriture publique messages" ON public.messages_coach FOR ALL USING (true) WITH CHECK (true);
