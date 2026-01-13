-- Create table for user suspensions
CREATE TABLE public.user_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  suspended_by UUID NOT NULL,
  suspended_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  suspended_until TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  lifted_at TIMESTAMP WITH TIME ZONE,
  lifted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint for active suspensions per user
CREATE UNIQUE INDEX idx_active_suspension_per_user ON public.user_suspensions (user_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all suspensions"
ON public.user_suspensions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create suspensions"
ON public.user_suspensions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update suspensions"
ON public.user_suspensions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to check if a user is currently suspended
CREATE OR REPLACE FUNCTION public.is_user_suspended(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_suspensions
    WHERE user_id = _user_id
      AND is_active = true
      AND suspended_until > now()
  )
$$;

-- Function to get suspension details
CREATE OR REPLACE FUNCTION public.get_user_suspension(_user_id UUID)
RETURNS TABLE(
  suspended_until TIMESTAMP WITH TIME ZONE,
  reason TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT suspended_until, reason
  FROM public.user_suspensions
  WHERE user_id = _user_id
    AND is_active = true
    AND suspended_until > now()
  LIMIT 1
$$;