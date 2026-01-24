-- Fix update_work_session_end_times function to use user_roles table instead of profiles.role
-- The role column doesn't exist in profiles table, roles are stored in user_roles table

CREATE OR REPLACE FUNCTION public.update_work_session_end_times()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  actual_end_time_val TIME;
  user_role app_role;
BEGIN
  -- Get user role from user_roles table using the existing function
  SELECT public.get_user_role(auth.uid()) INTO user_role;
  
  -- Only admins and directors can modify time tracking fields
  IF user_role IS NULL OR user_role NOT IN ('admin', 'directeur') THEN
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
