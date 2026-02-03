-- Restrict Admin role to supervision only (no business operations)
-- Admin can VIEW everything but cannot CREATE/UPDATE business records

-- Drop existing policies that allow admin to create/update
DROP POLICY IF EXISTS "Credit agents and above can create clients" ON public.clients;
DROP POLICY IF EXISTS "Credit agents and above can update clients" ON public.clients;
DROP POLICY IF EXISTS "Credit agents and above can create loans" ON public.loans;
DROP POLICY IF EXISTS "Directors and admins can update loans" ON public.loans;
DROP POLICY IF EXISTS "Cashiers and above can create payments" ON public.payments;
DROP POLICY IF EXISTS "System can manage schedules" ON public.payment_schedule;

-- Recreate policies WITHOUT admin role for INSERT/UPDATE operations

-- Clients: Only directeur and agent_credit can create/update (admin can only view)
CREATE POLICY "Credit agents and directors can create clients"
ON public.clients FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'directeur') OR
  public.has_role(auth.uid(), 'agent_credit')
);

CREATE POLICY "Credit agents and directors can update clients"
ON public.clients FOR UPDATE
USING (
  public.has_role(auth.uid(), 'directeur') OR
  public.has_role(auth.uid(), 'agent_credit')
);

-- Loans: Only directeur and agent_credit can create, only directeur can update/validate
CREATE POLICY "Credit agents and directors can create loans"
ON public.loans FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'directeur') OR
  public.has_role(auth.uid(), 'agent_credit')
);

CREATE POLICY "Directors can update loans"
ON public.loans FOR UPDATE
USING (public.has_role(auth.uid(), 'directeur'));

-- Payments: Only directeur and caissier can create (admin can only view)
CREATE POLICY "Cashiers and directors can create payments"
ON public.payments FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'directeur') OR
  public.has_role(auth.uid(), 'caissier')
);

-- Payment schedule: Only directeur and agent_credit can manage (admin can only view)
CREATE POLICY "Credit agents and directors can manage schedules"
ON public.payment_schedule FOR ALL
USING (
  public.has_role(auth.uid(), 'directeur') OR
  public.has_role(auth.uid(), 'agent_credit')
)
WITH CHECK (
  public.has_role(auth.uid(), 'directeur') OR
  public.has_role(auth.uid(), 'agent_credit')
);

-- Work sessions: Admin cannot create/update (supervision only)
-- Note: The existing policies already restrict users to their own sessions
-- We just need to ensure admin cannot create sessions
DROP POLICY IF EXISTS "Users can create their own work sessions" ON public.work_sessions;
CREATE POLICY "Non-admin users can create their own work sessions"
ON public.work_sessions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  NOT public.has_role(auth.uid(), 'admin')
);

-- Admin can still view all work sessions (supervision)
-- This is already handled by "Admins and Directors can view all work sessions" policy

