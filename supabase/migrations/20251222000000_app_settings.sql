-- Create app_settings table for storing application settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can manage settings
CREATE POLICY "Admins can view all settings"
ON public.app_settings FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
ON public.app_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
ON public.app_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings"
ON public.app_settings FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('company_name', '"N''FA KA SÉRUM"', 'Nom de l''entreprise'),
  ('currency', '"XOF"', 'Devise par défaut'),
  ('language', '"fr"', 'Langue de l''application'),
  ('email_notifications', 'true', 'Activer les notifications par email'),
  ('payment_reminders', 'true', 'Activer les rappels de paiement'),
  ('overdue_alerts', 'true', 'Activer les alertes de retard'),
  ('reminder_days', '"3"', 'Nombre de jours avant échéance pour les rappels'),
  ('session_timeout', '"30"', 'Délai d''expiration de session en minutes'),
  ('require_strong_password', 'true', 'Exiger des mots de passe forts'),
  ('two_factor_auth', 'false', 'Activer l''authentification à deux facteurs'),
  ('auto_backup', 'true', 'Activer la sauvegarde automatique'),
  ('backup_frequency', '"daily"', 'Fréquence de sauvegarde'),
  ('max_file_size', '"10"', 'Taille maximale des fichiers en MB')
ON CONFLICT (key) DO NOTHING;

