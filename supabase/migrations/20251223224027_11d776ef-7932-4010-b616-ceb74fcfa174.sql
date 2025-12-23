-- Table work_schedule : horaires de travail par jour
CREATE TABLE public.work_schedule (
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

-- Table work_sessions : sessions de travail journalières
CREATE TABLE public.work_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  initial_cash NUMERIC DEFAULT 0,
  final_cash NUMERIC,
  notes TEXT,
  is_late BOOLEAN DEFAULT false,
  late_minutes INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, work_date)
);

-- Table company_funds : fonds de l'entreprise
CREATE TABLE public.company_funds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  initial_capital NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table company_funds_history : historique des modifications de fonds
CREATE TABLE public.company_funds_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_id UUID NOT NULL REFERENCES public.company_funds(id) ON DELETE CASCADE,
  previous_balance NUMERIC NOT NULL,
  new_balance NUMERIC NOT NULL,
  change_amount NUMERIC NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('initial_setup', 'adjustment', 'loan_disbursement', 'payment_received', 'expense')),
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table app_settings : paramètres de l'application
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.work_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_funds_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour work_schedule
CREATE POLICY "Authenticated users can view schedule"
ON public.work_schedule FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Admins and directors can manage schedule"
ON public.work_schedule FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'directeur'::app_role));

-- Politiques RLS pour work_sessions
CREATE POLICY "Users can view their own sessions"
ON public.work_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and directors can view all sessions"
ON public.work_sessions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'directeur'::app_role));

CREATE POLICY "Users can create their own session"
ON public.work_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own session"
ON public.work_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- Politiques RLS pour company_funds
CREATE POLICY "Admins and directors can view funds"
ON public.company_funds FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'directeur'::app_role));

CREATE POLICY "Admins and directors can manage funds"
ON public.company_funds FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'directeur'::app_role));

-- Politiques RLS pour company_funds_history
CREATE POLICY "Admins and directors can view history"
ON public.company_funds_history FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'directeur'::app_role));

CREATE POLICY "Admins and directors can insert history"
ON public.company_funds_history FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'directeur'::app_role));

-- Politiques RLS pour app_settings
CREATE POLICY "Admins can view settings"
ON public.app_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage settings"
ON public.app_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers pour updated_at
CREATE TRIGGER update_work_schedule_updated_at
BEFORE UPDATE ON public.work_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_sessions_updated_at
BEFORE UPDATE ON public.work_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_funds_updated_at
BEFORE UPDATE ON public.company_funds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les horaires par défaut (lundi-vendredi, 8h-17h)
INSERT INTO public.work_schedule (day_of_week, start_time, end_time, is_active)
VALUES 
  (0, '08:00:00', '17:00:00', false), -- Dimanche
  (1, '08:00:00', '17:00:00', true),  -- Lundi
  (2, '08:00:00', '17:00:00', true),  -- Mardi
  (3, '08:00:00', '17:00:00', true),  -- Mercredi
  (4, '08:00:00', '17:00:00', true),  -- Jeudi
  (5, '08:00:00', '17:00:00', true),  -- Vendredi
  (6, '08:00:00', '17:00:00', false); -- Samedi