-- Fix security issues with attendance_summary view
-- 1. Remove direct access to auth.users (security risk)
-- 2. Use security_invoker instead of security_definer
-- 3. Restrict access via RLS policies

-- Drop the existing view
DROP VIEW IF EXISTS public.attendance_summary;

-- Recreate the view without exposing auth.users
-- Use only profiles table which has proper RLS policies
-- security_invoker=true ensures the view runs with the permissions of the querying user
CREATE OR REPLACE VIEW public.attendance_summary
WITH (security_invoker=true) AS
SELECT 
  ws.user_id,
  p.email,
  p.full_name,
  DATE_TRUNC('month', ws.work_date)::DATE as month,
  COUNT(*) FILTER (WHERE ws.status = 'closed') as days_worked,
  COUNT(*) FILTER (WHERE ws.is_late = TRUE) as days_late,
  COUNT(*) FILTER (WHERE ws.status = 'absent') as days_absent,
  SUM(ws.late_minutes) as total_late_minutes,
  SUM(ws.total_work_minutes) as total_work_minutes,
  AVG(ws.total_work_minutes) as avg_work_minutes
FROM public.work_sessions ws
LEFT JOIN public.profiles p ON ws.user_id = p.id
GROUP BY ws.user_id, p.email, p.full_name, DATE_TRUNC('month', ws.work_date)::DATE;

-- Revoke all public access
REVOKE ALL ON public.attendance_summary FROM authenticated;
REVOKE ALL ON public.attendance_summary FROM anon;
REVOKE ALL ON public.attendance_summary FROM public;

-- Enable RLS on the view (views can have RLS via policies)
-- Note: PostgreSQL doesn't support RLS directly on views, so we use a function instead

-- Create a secure function to access attendance summary
-- This function checks permissions and returns data safely
CREATE OR REPLACE FUNCTION public.get_attendance_summary()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  month DATE,
  days_worked BIGINT,
  days_late BIGINT,
  days_absent BIGINT,
  total_late_minutes NUMERIC,
  total_work_minutes NUMERIC,
  avg_work_minutes NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has admin or directeur role
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'directeur')) THEN
    RAISE EXCEPTION 'Access denied. Only administrators and directors can view attendance summary.';
  END IF;

  -- Return the data from the view (which now uses security_invoker)
  RETURN QUERY
  SELECT 
    as_view.user_id,
    as_view.email,
    as_view.full_name,
    as_view.month,
    as_view.days_worked,
    as_view.days_late,
    as_view.days_absent,
    as_view.total_late_minutes,
    as_view.total_work_minutes,
    as_view.avg_work_minutes
  FROM public.attendance_summary as_view;
END;
$$;

-- Grant execute permission on the function to authenticated users
-- The function itself will check permissions
GRANT EXECUTE ON FUNCTION public.get_attendance_summary() TO authenticated;

-- Note: The view is kept but should not be accessed directly
-- Always use the function get_attendance_summary() for secure access
-- This ensures:
-- 1. No direct access to auth.users
-- 2. Permission checks are enforced
-- 3. RLS policies on underlying tables are respected

