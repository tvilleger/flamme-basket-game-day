
CREATE TABLE public.messages_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages_coach(id) ON DELETE CASCADE,
  joueuse_id uuid NOT NULL REFERENCES public.joueuses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, joueuse_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages_likes TO anon, authenticated;
GRANT ALL ON public.messages_likes TO service_role;
ALTER TABLE public.messages_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique likes" ON public.messages_likes FOR SELECT USING (true);
CREATE POLICY "Ecriture publique likes" ON public.messages_likes FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.messages_reponses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages_coach(id) ON DELETE CASCADE,
  joueuse_id uuid REFERENCES public.joueuses(id) ON DELETE SET NULL,
  auteur_nom text NOT NULL,
  auteur_type text NOT NULL DEFAULT 'joueuse',
  contenu text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_reponses_msg ON public.messages_reponses(message_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages_reponses TO anon, authenticated;
GRANT ALL ON public.messages_reponses TO service_role;
ALTER TABLE public.messages_reponses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique reponses" ON public.messages_reponses FOR SELECT USING (true);
CREATE POLICY "Ecriture publique reponses" ON public.messages_reponses FOR ALL USING (true) WITH CHECK (true);
