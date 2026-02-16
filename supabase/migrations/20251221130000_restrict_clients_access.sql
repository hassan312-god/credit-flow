-- Drop the old policy that allows all authenticated users with roles to view clients
DROP POLICY IF EXISTS "Authenticated users with roles can view clients" ON public.clients;

-- Create new policy that restricts access to admin, directeur, and agent_credit only
CREATE POLICY "Only credit agents, directors and admins can view clients"
ON public.clients FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'directeur') OR
  public.has_role(auth.uid(), 'agent_credit')
);

