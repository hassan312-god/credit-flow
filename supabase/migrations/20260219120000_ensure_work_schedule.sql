-- Migration idempotente : s'assurer que la table work_schedule existe et est utilisable pour les horaires.
-- À exécuter si les horaires ne s'enregistrent pas ou si la table n'existe pas.

-- 1. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.work_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '17:00:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(day_of_week)
);

-- 2. Activer RLS
ALTER TABLE public.work_schedule ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer les anciennes politiques si elles existent (noms possibles selon les migrations)
DROP POLICY IF EXISTS "Authenticated users can view schedule" ON public.work_schedule;
DROP POLICY IF EXISTS "Admins and directors can manage schedule" ON public.work_schedule;
DROP POLICY IF EXISTS "Admins and Directors can manage work schedule" ON public.work_schedule;
DROP POLICY IF EXISTS "All authenticated users can view work schedule" ON public.work_schedule;

-- 4. Politique : tous les utilisateurs authentifiés peuvent lire les horaires
CREATE POLICY "Authenticated users can view schedule"
ON public.work_schedule FOR SELECT
USING (auth.role() = 'authenticated');

-- 5. Politique : seuls admin et directeur peuvent modifier les horaires
CREATE POLICY "Admins and directors can manage schedule"
ON public.work_schedule FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'directeur')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'directeur')
  )
);

-- 6. Insérer les jours manquants (0-6) avec valeurs par défaut, sans écraser l'existant
INSERT INTO public.work_schedule (day_of_week, start_time, end_time, is_active)
SELECT d, '08:00:00'::TIME, '17:00:00'::TIME, (d >= 1 AND d <= 5)
FROM generate_series(0, 6) AS d
WHERE NOT EXISTS (SELECT 1 FROM public.work_schedule ws WHERE ws.day_of_week = d);

-- 7. Trigger pour updated_at si la fonction existe
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_work_schedule_updated_at ON public.work_schedule;
CREATE TRIGGER update_work_schedule_updated_at
BEFORE UPDATE ON public.work_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
