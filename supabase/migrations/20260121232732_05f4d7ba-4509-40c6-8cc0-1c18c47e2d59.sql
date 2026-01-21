-- Create table to track login attempts
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  was_successful BOOLEAN NOT NULL DEFAULT false
);

-- Create index for faster lookups
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_time ON public.login_attempts(attempted_at);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only system can insert (no user auth required for login attempts)
CREATE POLICY "Anyone can insert login attempts"
ON public.login_attempts
FOR INSERT
WITH CHECK (true);

-- Admins can view login attempts
CREATE POLICY "Admins can view login attempts"
ON public.login_attempts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(check_email TEXT)
RETURNS TABLE(is_locked BOOLEAN, locked_until TIMESTAMP WITH TIME ZONE, failed_attempts INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_attempts INTEGER := 5;
  lockout_minutes INTEGER := 15;
  recent_failed INTEGER;
  last_attempt_time TIMESTAMP WITH TIME ZONE;
BEGIN
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

-- Create function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  attempt_email TEXT,
  attempt_ip TEXT DEFAULT NULL,
  attempt_successful BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, ip_address, was_successful)
  VALUES (attempt_email, attempt_ip, attempt_successful);
  
  -- If successful, delete old failed attempts for this email (cleanup)
  IF attempt_successful THEN
    DELETE FROM public.login_attempts
    WHERE email = attempt_email AND was_successful = false;
  END IF;
END;
$$;

-- Cleanup old login attempts (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE attempted_at < (now() - interval '24 hours');
END;
$$;