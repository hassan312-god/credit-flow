-- Seul le directeur peut supprimer un client (plus l'admin).
-- On s'assure que le directeur peut aussi supprimer les prêts (cascade client → prêts).

DROP POLICY IF EXISTS "Admins and directors can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Directors can delete clients" ON public.clients;

CREATE POLICY "Directors can delete clients"
ON public.clients
FOR DELETE
USING (public.has_role(auth.uid(), 'directeur'::app_role));

-- Indispensable pour la cascade : admin et directeur peuvent supprimer les prêts
DROP POLICY IF EXISTS "Admins and directors can delete loans" ON public.loans;
CREATE POLICY "Admins and directors can delete loans"
ON public.loans
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'directeur'::app_role));

-- Cascade prêt → paiements
DROP POLICY IF EXISTS "Admins and directors can delete payments" ON public.payments;
CREATE POLICY "Admins and directors can delete payments"
ON public.payments
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'directeur'::app_role));
