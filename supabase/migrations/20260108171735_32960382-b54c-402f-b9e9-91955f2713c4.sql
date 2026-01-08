
-- Drop existing SELECT policies on clients
DROP POLICY IF EXISTS "Authenticated users with roles can view clients" ON public.clients;

-- Create new policy: employees see only their clients, admin/directeur see all
CREATE POLICY "Users can view their own clients or all if admin/directeur"
ON public.clients
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'directeur'::app_role) OR 
  created_by = auth.uid()
);

-- Drop existing SELECT policies on loans
DROP POLICY IF EXISTS "Authenticated users with roles can view loans" ON public.loans;

-- Create new policy: employees see only their loans, admin/directeur see all
CREATE POLICY "Users can view their own loans or all if admin/directeur"
ON public.loans
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'directeur'::app_role) OR 
  created_by = auth.uid()
);

-- Drop existing SELECT policies on payments
DROP POLICY IF EXISTS "Authenticated users with roles can view payments" ON public.payments;

-- Create new policy: employees see only payments for their loans, admin/directeur see all
CREATE POLICY "Users can view their own payments or all if admin/directeur"
ON public.payments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'directeur'::app_role) OR 
  recorded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.loans 
    WHERE loans.id = payments.loan_id 
    AND loans.created_by = auth.uid()
  )
);

-- Drop existing SELECT policies on payment_schedule
DROP POLICY IF EXISTS "Authenticated users with roles can view schedules" ON public.payment_schedule;

-- Create new policy: employees see only schedules for their loans
CREATE POLICY "Users can view their own schedules or all if admin/directeur"
ON public.payment_schedule
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'directeur'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.loans 
    WHERE loans.id = payment_schedule.loan_id 
    AND loans.created_by = auth.uid()
  )
);

-- Update user_roles policy to ensure ONLY admin can assign admin role
-- First drop existing policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert roles (but we'll add a trigger to prevent non-admins from assigning admin)
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a trigger to prevent non-admins from assigning admin role
CREATE OR REPLACE FUNCTION public.check_admin_role_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to assign admin role, check if current user is admin
  IF NEW.role = 'admin'::app_role THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Seul un administrateur peut attribuer le rôle admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS ensure_admin_role_assignment ON public.user_roles;
CREATE TRIGGER ensure_admin_role_assignment
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_admin_role_assignment();
