-- Ajouter les paramètres de verrouillage dans app_settings s'ils n'existent pas (value est JSONB)
INSERT INTO public.app_settings (key, value) 
VALUES ('lockout_max_attempts', '5'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value) 
VALUES ('lockout_duration_minutes', '15'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Mettre à jour la fonction is_account_locked pour utiliser les paramètres dynamiques
CREATE OR REPLACE FUNCTION public.is_account_locked(check_email text)
RETURNS TABLE (is_locked boolean, locked_until timestamp with time zone, failed_attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_attempts INTEGER;
  lockout_minutes INTEGER;
  recent_failed INTEGER;
  last_attempt_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get configurable settings from app_settings (with defaults)
  SELECT COALESCE((value)::integer, 5)
  INTO max_attempts
  FROM public.app_settings
  WHERE key = 'lockout_max_attempts';
  
  IF max_attempts IS NULL THEN
    max_attempts := 5;
  END IF;
  
  SELECT COALESCE((value)::integer, 15)
  INTO lockout_minutes
  FROM public.app_settings
  WHERE key = 'lockout_duration_minutes';
  
  IF lockout_minutes IS NULL THEN
    lockout_minutes := 15;
  END IF;
  
  -- Count failed attempts in the last lockout period
  SELECT COUNT(*), MAX(attempted_at) INTO recent_failed, last_attempt_time
  FROM public.login_attempts
  WHERE email = check_email
    AND was_successful = false
    AND attempted_at > (now() - (lockout_minutes || ' minutes')::interval);
  
  IF recent_failed >= max_attempts THEN
    RETURN QUERY SELECT 
      true AS is_locked, 
      (last_attempt_time + (lockout_minutes || ' minutes')::interval) AS locked_until,
      recent_failed AS failed_attempts;
  ELSE
    RETURN QUERY SELECT 
      false AS is_locked, 
      NULL::TIMESTAMP WITH TIME ZONE AS locked_until,
      recent_failed AS failed_attempts;
  END IF;
END;
$$;

-- Fonction pour récupérer les paramètres de verrouillage
CREATE OR REPLACE FUNCTION public.get_lockout_settings()
RETURNS TABLE (max_attempts integer, lockout_duration integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT (value)::integer FROM public.app_settings WHERE key = 'lockout_max_attempts'), 5) AS max_attempts,
    COALESCE((SELECT (value)::integer FROM public.app_settings WHERE key = 'lockout_duration_minutes'), 15) AS lockout_duration;
END;
$$;