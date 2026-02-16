-- Ajoute les colonnes de suivi de temps à work_sessions si elles n'existent pas.
-- À appliquer si vous avez l'erreur: column work_sessions.actual_start_time does not exist
-- (par ex. quand la migration work_schedule n'a pas été appliquée.)

ALTER TABLE public.work_sessions 
ADD COLUMN IF NOT EXISTS actual_start_time TIME,
ADD COLUMN IF NOT EXISTS actual_end_time TIME,
ADD COLUMN IF NOT EXISTS scheduled_start_time TIME,
ADD COLUMN IF NOT EXISTS scheduled_end_time TIME,
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_work_minutes INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';

CREATE INDEX IF NOT EXISTS idx_work_sessions_user_date ON public.work_sessions(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_work_sessions_status ON public.work_sessions(status, work_date);
