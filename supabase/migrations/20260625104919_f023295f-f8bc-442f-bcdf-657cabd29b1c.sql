
-- 1. Helper : la joueuse est-elle actuellement blessée ?
CREATE OR REPLACE FUNCTION public.is_blessee(p_joueuse_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(statut_blessure, 'OK') <> 'OK'
  FROM public.joueuses
  WHERE id = p_joueuse_id
$$;

-- 2. Filet de sécurité : record_flamme ne peut jamais descendre
CREATE OR REPLACE FUNCTION public.enforce_record_flamme()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.record_flamme := GREATEST(
    COALESCE(OLD.record_flamme, 0),
    COALESCE(NEW.record_flamme, 0),
    COALESCE(NEW.flamme_actuelle, 0)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_joueuses_record ON public.joueuses;
CREATE TRIGGER trg_joueuses_record
BEFORE UPDATE ON public.joueuses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_record_flamme();

-- 3. Logique principale : présence → flamme
CREATE OR REPLACE FUNCTION public.apply_presence_to_flamme()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_joueuse uuid;
  v_old_pres boolean;
  v_new_pres boolean;
  v_current int;
  v_blessee boolean;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_joueuse  := OLD.joueuse_id;
    v_old_pres := OLD.presente;
    v_new_pres := NULL;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_joueuse  := NEW.joueuse_id;
    v_old_pres := OLD.presente;
    v_new_pres := NEW.presente;
  ELSE
    v_joueuse  := NEW.joueuse_id;
    v_old_pres := NULL;
    v_new_pres := NEW.presente;
  END IF;

  -- Aucun changement de statut sur un UPDATE → rien à faire
  IF TG_OP = 'UPDATE' AND v_old_pres IS NOT DISTINCT FROM v_new_pres THEN
    RETURN NEW;
  END IF;

  SELECT flamme_actuelle,
         COALESCE(statut_blessure, 'OK') <> 'OK'
    INTO v_current, v_blessee
    FROM public.joueuses
    WHERE id = v_joueuse
    FOR UPDATE;

  -- Joueuse blessée → flamme gelée, on journalise et on sort
  IF v_blessee THEN
    INSERT INTO public.historique_flammes (joueuse_id, variation, motif)
    VALUES (v_joueuse, 0, 'gel (blessure)');
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Annule l'effet précédent (UPDATE ou DELETE)
  IF v_old_pres IS TRUE THEN
    v_current := GREATEST(0, v_current - 1);
    INSERT INTO public.historique_flammes (joueuse_id, variation, motif)
    VALUES (v_joueuse, -1, 'annulation présence');
  ELSIF v_old_pres IS FALSE THEN
    -- Un reset ne peut pas être reconstruit exactement
    INSERT INTO public.historique_flammes (joueuse_id, variation, motif)
    VALUES (v_joueuse, 0, 'annulation absence (non reconstituable)');
  END IF;

  -- Applique le nouveau statut (INSERT ou UPDATE)
  IF v_new_pres IS TRUE THEN
    v_current := v_current + 1;
    INSERT INTO public.historique_flammes (joueuse_id, variation, motif)
    VALUES (v_joueuse, 1, 'présence entraînement');
  ELSIF v_new_pres IS FALSE THEN
    IF v_current > 0 THEN
      INSERT INTO public.historique_flammes (joueuse_id, variation, motif)
      VALUES (v_joueuse, -v_current, 'absence → reset');
    END IF;
    v_current := 0;
  END IF;

  UPDATE public.joueuses
     SET flamme_actuelle = v_current,
         record_flamme   = GREATEST(record_flamme, v_current)
   WHERE id = v_joueuse;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_presences_flamme ON public.presences_entrainements;
CREATE TRIGGER trg_presences_flamme
AFTER INSERT OR UPDATE OR DELETE ON public.presences_entrainements
FOR EACH ROW
EXECUTE FUNCTION public.apply_presence_to_flamme();
