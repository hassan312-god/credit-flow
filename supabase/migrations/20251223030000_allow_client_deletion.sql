-- Allow deletion of clients (only by admin and directeur)
-- Note: Loans have ON DELETE CASCADE, so deleting a client will also delete their loans

DROP POLICY IF EXISTS "Admins and directors can delete clients" ON public.clients;

CREATE POLICY "Admins and directors can delete clients"
ON public.clients FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'directeur')
);

