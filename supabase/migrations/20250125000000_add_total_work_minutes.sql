-- Add total_work_minutes column to work_sessions if it doesn't exist
-- This column stores the total work time in minutes

ALTER TABLE public.work_sessions 
ADD COLUMN IF NOT EXISTS total_work_minutes INTEGER;

-- Add comment to document the column
COMMENT ON COLUMN public.work_sessions.total_work_minutes IS 'Total work time in minutes, calculated from opened_at to closed_at';

-- Create a function to calculate total_work_minutes from opened_at and closed_at
CREATE OR REPLACE FUNCTION public.calculate_total_work_minutes(
  opened_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF opened_at IS NULL OR closed_at IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN EXTRACT(EPOCH FROM (closed_at - opened_at))::INTEGER / 60;
END;
$$;

-- Update existing rows to calculate total_work_minutes if it's NULL
UPDATE public.work_sessions
SET total_work_minutes = public.calculate_total_work_minutes(opened_at, closed_at)
WHERE total_work_minutes IS NULL 
  AND opened_at IS NOT NULL 
  AND closed_at IS NOT NULL;
