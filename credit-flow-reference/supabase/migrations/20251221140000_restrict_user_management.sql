-- Drop the old policy that only allows admins
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Drop and recreate SELECT policies to allow both admins/directors and users to view their own roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and directors can view all roles" ON public.user_roles;

-- Policy for users to view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Policy for admins and directors to view all roles
CREATE POLICY "Admins and directors can view all roles"
ON public.user_roles FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'directeur')
);

-- Policy for admins and directors to manage (INSERT, UPDATE, DELETE) all roles
CREATE POLICY "Admins and directors can manage all roles"
ON public.user_roles FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'directeur')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'directeur')
);

