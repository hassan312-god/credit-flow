-- Create notifications table for admin alerts
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  message text NOT NULL,
  related_user_id uuid,
  related_user_name text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can see their own notifications
CREATE POLICY "Admins can view their notifications"
ON public.admin_notifications
FOR SELECT
USING (
  admin_user_id = auth.uid() AND 
  public.has_role(auth.uid(), 'admin')
);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.admin_notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can update their notifications (mark as read)
CREATE POLICY "Admins can update their notifications"
ON public.admin_notifications
FOR UPDATE
USING (
  admin_user_id = auth.uid() AND 
  public.has_role(auth.uid(), 'admin')
);

-- Admins can delete their notifications
CREATE POLICY "Admins can delete their notifications"
ON public.admin_notifications
FOR DELETE
USING (
  admin_user_id = auth.uid() AND 
  public.has_role(auth.uid(), 'admin')
);

-- Add loan tracking columns to company_funds
ALTER TABLE public.company_funds 
ADD COLUMN IF NOT EXISTS total_loans_disbursed numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_interest_earned numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_payments_received numeric DEFAULT 0;