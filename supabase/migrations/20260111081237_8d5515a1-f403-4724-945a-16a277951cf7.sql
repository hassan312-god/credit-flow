-- Remove admin write access from company_funds to align with separation of duties
-- Admins should only have supervision access, not operational permissions

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Admins and directors can manage funds" ON public.company_funds;
DROP POLICY IF EXISTS "Admins and directors can view funds" ON public.company_funds;
DROP POLICY IF EXISTS "Directors can manage funds" ON public.company_funds;

-- Create new policies: Only directors can INSERT/UPDATE/DELETE, both admin and director can SELECT
CREATE POLICY "Directors can manage funds"
ON public.company_funds
FOR ALL
USING (public.has_role(auth.uid(), 'directeur'))
WITH CHECK (public.has_role(auth.uid(), 'directeur'));

CREATE POLICY "Admins and directors can view funds"
ON public.company_funds
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'directeur')
);

-- Also update company_funds_history to match the same pattern
DROP POLICY IF EXISTS "Admins and directors can insert history" ON public.company_funds_history;
DROP POLICY IF EXISTS "Admins and directors can view history" ON public.company_funds_history;
DROP POLICY IF EXISTS "Directors can insert history" ON public.company_funds_history;

CREATE POLICY "Directors can insert history"
ON public.company_funds_history
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'directeur'));

CREATE POLICY "Admins and directors can view history"
ON public.company_funds_history
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'directeur')
);