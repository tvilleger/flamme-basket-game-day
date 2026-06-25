
CREATE TABLE public.missions (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  description text,
  etoiles integer not null default 10,
  date date,
  places_max integer not null default 1,
  archivee boolean not null default false,
  categorie text,
  recurrente boolean not null default false,
  automatique boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missions TO anon, authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique missions" ON public.missions FOR SELECT USING (true);
CREATE POLICY "Ecriture publique missions" ON public.missions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.missions_inscriptions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  joueuse_id uuid not null references public.joueuses(id) on delete cascade,
  statut text not null default 'en_attente',
  date_inscription timestamptz not null default now(),
  date_validation timestamptz,
  coach_validateur text,
  motif_refus text,
  unique (mission_id, joueuse_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missions_inscriptions TO anon, authenticated;
GRANT ALL ON public.missions_inscriptions TO service_role;
ALTER TABLE public.missions_inscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique inscriptions" ON public.missions_inscriptions FOR SELECT USING (true);
CREATE POLICY "Ecriture publique inscriptions" ON public.missions_inscriptions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.etoiles_joueuses (
  id uuid primary key default gen_random_uuid(),
  joueuse_id uuid not null references public.joueuses(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete set null,
  etoiles integer not null,
  motif text,
  date timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etoiles_joueuses TO anon, authenticated;
GRANT ALL ON public.etoiles_joueuses TO service_role;
ALTER TABLE public.etoiles_joueuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique etoiles" ON public.etoiles_joueuses FOR SELECT USING (true);
CREATE POLICY "Ecriture publique etoiles" ON public.etoiles_joueuses FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_missions_inscriptions_mission ON public.missions_inscriptions(mission_id);
CREATE INDEX idx_missions_inscriptions_joueuse ON public.missions_inscriptions(joueuse_id);
CREATE INDEX idx_etoiles_joueuse ON public.etoiles_joueuses(joueuse_id);
