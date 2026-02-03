-- Create work_sessions table for managing work days
CREATE TABLE IF NOT EXISTS public.work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  initial_cash DECIMAL(15, 2) DEFAULT 0,
  final_cash DECIMAL(15, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, work_date)
);

-- Enable RLS
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own work sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "Users can create their own work sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "Users can update their own work sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "Admins can view all work sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "Admins and Directors can view all work sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "Admins and Directors can update all work sessions" ON public.work_sessions;

-- RLS Policies for work_sessions
CREATE POLICY "Users can view their own work sessions"
ON public.work_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own work sessions"
ON public.work_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own work sessions"
ON public.work_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to check if user has open work session
CREATE OR REPLACE FUNCTION public.has_open_work_session(_user_id UUID, _work_date DATE DEFAULT CURRENT_DATE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.work_sessions
    WHERE user_id = _user_id
      AND work_date = _work_date
      AND closed_at IS NULL
  )
$$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_work_sessions_updated_at ON public.work_sessions;
CREATE TRIGGER update_work_sessions_updated_at
  BEFORE UPDATE ON public.work_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

