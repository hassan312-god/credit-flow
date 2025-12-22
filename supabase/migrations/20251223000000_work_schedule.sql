-- Create work_schedule table for official work hours
CREATE TABLE IF NOT EXISTS public.work_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(day_of_week)
);

-- Enable RLS
ALTER TABLE public.work_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_schedule
CREATE POLICY "Admins and Directors can manage work schedule"
ON public.work_schedule FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'directeur')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'directeur')
);

CREATE POLICY "All authenticated users can view work schedule"
ON public.work_schedule FOR SELECT
USING (auth.role() = 'authenticated');

-- Add fields to work_sessions for time tracking
ALTER TABLE public.work_sessions 
ADD COLUMN IF NOT EXISTS actual_start_time TIME,
ADD COLUMN IF NOT EXISTS actual_end_time TIME,
ADD COLUMN IF NOT EXISTS scheduled_start_time TIME,
ADD COLUMN IF NOT EXISTS scheduled_end_time TIME,
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_work_minutes INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'absent'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_date ON public.work_sessions(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_work_sessions_status ON public.work_sessions(status, work_date);

-- Function to calculate work hours
CREATE OR REPLACE FUNCTION public.calculate_work_hours(
  start_time TIME,
  end_time TIME
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF start_time IS NULL OR end_time IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN EXTRACT(EPOCH FROM (end_time - start_time)) / 60; -- Return minutes
END;
$$;

-- Function to check if user is late
CREATE OR REPLACE FUNCTION public.check_late(
  actual_start TIME,
  scheduled_start TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF actual_start IS NULL OR scheduled_start IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN actual_start > scheduled_start;
END;
$$;

-- Function to calculate late minutes
CREATE OR REPLACE FUNCTION public.calculate_late_minutes(
  actual_start TIME,
  scheduled_start TIME
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF actual_start IS NULL OR scheduled_start IS NULL THEN
    RETURN 0;
  END IF;
  
  IF actual_start <= scheduled_start THEN
    RETURN 0;
  END IF;
  
  RETURN EXTRACT(EPOCH FROM (actual_start - scheduled_start)) / 60; -- Return minutes
END;
$$;

-- Trigger to automatically set times when opening work session
CREATE OR REPLACE FUNCTION public.set_work_session_times()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  schedule_record RECORD;
  current_day INTEGER;
  actual_start_time_val TIME;
BEGIN
  -- Get current day of week (0 = Sunday, 6 = Saturday)
  current_day := EXTRACT(DOW FROM NEW.work_date);
  
  -- Get schedule for this day
  SELECT * INTO schedule_record
  FROM public.work_schedule
  WHERE day_of_week = current_day
    AND is_active = TRUE
  LIMIT 1;
  
  -- Set scheduled times if schedule exists
  IF schedule_record IS NOT NULL THEN
    NEW.scheduled_start_time := schedule_record.start_time;
    NEW.scheduled_end_time := schedule_record.end_time;
  END IF;
  
  -- Set actual start time from opened_at
  actual_start_time_val := (NEW.opened_at)::time;
  NEW.actual_start_time := actual_start_time_val;
  
  -- Check if late
  IF schedule_record IS NOT NULL THEN
    NEW.is_late := public.check_late(actual_start_time_val, schedule_record.start_time);
    NEW.late_minutes := public.calculate_late_minutes(actual_start_time_val, schedule_record.start_time);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_work_session_times_trigger ON public.work_sessions;
CREATE TRIGGER set_work_session_times_trigger
  BEFORE INSERT ON public.work_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_work_session_times();

-- Trigger to update times when closing work session and prevent modification of time fields
CREATE OR REPLACE FUNCTION public.update_work_session_end_times()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  actual_end_time_val TIME;
  user_role TEXT;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  
  -- Only admins and directors can modify time tracking fields
  IF user_role NOT IN ('admin', 'directeur') THEN
    -- Prevent modification of time tracking fields for regular users
    IF OLD.actual_start_time IS DISTINCT FROM NEW.actual_start_time THEN
      NEW.actual_start_time := OLD.actual_start_time;
    END IF;
    IF OLD.actual_end_time IS DISTINCT FROM NEW.actual_end_time THEN
      NEW.actual_end_time := OLD.actual_end_time;
    END IF;
    IF OLD.scheduled_start_time IS DISTINCT FROM NEW.scheduled_start_time THEN
      NEW.scheduled_start_time := OLD.scheduled_start_time;
    END IF;
    IF OLD.scheduled_end_time IS DISTINCT FROM NEW.scheduled_end_time THEN
      NEW.scheduled_end_time := OLD.scheduled_end_time;
    END IF;
    IF OLD.is_late IS DISTINCT FROM NEW.is_late THEN
      NEW.is_late := OLD.is_late;
    END IF;
    IF OLD.late_minutes IS DISTINCT FROM NEW.late_minutes THEN
      NEW.late_minutes := OLD.late_minutes;
    END IF;
    IF OLD.total_work_minutes IS DISTINCT FROM NEW.total_work_minutes THEN
      NEW.total_work_minutes := OLD.total_work_minutes;
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status != 'closed' THEN
      -- Allow status change to 'closed' when closing session
      IF NEW.closed_at IS NULL OR OLD.closed_at IS NOT NULL THEN
        NEW.status := OLD.status;
      END IF;
    END IF;
  END IF;
  
  -- Set actual end time from closed_at
  IF NEW.closed_at IS NOT NULL AND OLD.closed_at IS NULL THEN
    actual_end_time_val := (NEW.closed_at)::time;
    NEW.actual_end_time := actual_end_time_val;
    NEW.status := 'closed';
    
    -- Calculate total work minutes
    IF NEW.actual_start_time IS NOT NULL AND actual_end_time_val IS NOT NULL THEN
      NEW.total_work_minutes := public.calculate_work_hours(NEW.actual_start_time, actual_end_time_val);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_work_session_end_times_trigger ON public.work_sessions;
CREATE TRIGGER update_work_session_end_times_trigger
  BEFORE UPDATE ON public.work_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_work_session_end_times();

-- Insert default work schedule (Monday to Friday, 8:00 - 17:00)
INSERT INTO public.work_schedule (day_of_week, start_time, end_time, is_active)
VALUES
  (1, '08:00:00', '17:00:00', TRUE), -- Monday
  (2, '08:00:00', '17:00:00', TRUE), -- Tuesday
  (3, '08:00:00', '17:00:00', TRUE), -- Wednesday
  (4, '08:00:00', '17:00:00', TRUE), -- Thursday
  (5, '08:00:00', '17:00:00', TRUE)  -- Friday
ON CONFLICT (day_of_week) DO NOTHING;

-- Create view for attendance summary
CREATE OR REPLACE VIEW public.attendance_summary AS
SELECT 
  ws.user_id,
  u.email,
  p.full_name,
  DATE_TRUNC('month', ws.work_date)::DATE as month,
  COUNT(*) FILTER (WHERE ws.status = 'closed') as days_worked,
  COUNT(*) FILTER (WHERE ws.is_late = TRUE) as days_late,
  COUNT(*) FILTER (WHERE ws.status = 'absent') as days_absent,
  SUM(ws.late_minutes) as total_late_minutes,
  SUM(ws.total_work_minutes) as total_work_minutes,
  AVG(ws.total_work_minutes) as avg_work_minutes
FROM public.work_sessions ws
JOIN auth.users u ON ws.user_id = u.id
LEFT JOIN public.profiles p ON u.id = p.id
GROUP BY ws.user_id, u.email, p.full_name, DATE_TRUNC('month', ws.work_date)::DATE;

-- Grant access to view
GRANT SELECT ON public.attendance_summary TO authenticated;

