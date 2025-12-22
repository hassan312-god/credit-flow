-- Drop existing policies that we need to recreate
DROP POLICY IF EXISTS "Users can update their own work sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "Admins can view all work sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "Admins and Directors can view all work sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "Admins and Directors can update all work sessions" ON public.work_sessions;

-- Create or replace updated policies
-- Note: We use CREATE POLICY (not CREATE OR REPLACE) so we must drop first
-- Note: RLS policies cannot compare OLD and NEW values in WITH CHECK
-- We'll use a trigger function to prevent modification of time tracking fields
CREATE POLICY "Users can update their own work sessions"
ON public.work_sessions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and Directors can view all work sessions"
ON public.work_sessions FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'directeur')
);

CREATE POLICY "Admins and Directors can update all work sessions"
ON public.work_sessions FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'directeur')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'directeur')
);

