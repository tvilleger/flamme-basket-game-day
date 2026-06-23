
ALTER TABLE public.joueuses ADD COLUMN IF NOT EXISTS licence TEXT;

CREATE TABLE IF NOT EXISTS public.coachs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  mot_de_passe TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coachs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coachs TO authenticated;
GRANT ALL ON public.coachs TO service_role;

ALTER TABLE public.coachs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique coachs" ON public.coachs FOR SELECT USING (true);

INSERT INTO public.coachs (nom, mot_de_passe) VALUES ('Trystan', 'coach2026')
ON CONFLICT DO NOTHING;
