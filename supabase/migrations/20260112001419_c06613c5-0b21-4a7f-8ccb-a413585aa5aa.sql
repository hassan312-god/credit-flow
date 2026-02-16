-- Autoriser la suppression des clients par admin et directeur
CREATE POLICY "Admins and directors can delete clients" 
ON public.clients 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'directeur'::app_role));

-- Autoriser la suppression des prêts par admin et directeur (pour cascade)
CREATE POLICY "Admins and directors can delete loans" 
ON public.loans 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'directeur'::app_role));

-- Autoriser la suppression des paiements par admin et directeur
CREATE POLICY "Admins and directors can delete payments" 
ON public.payments 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'directeur'::app_role));

-- Autoriser la suppression des échéanciers par admin et directeur
CREATE POLICY "Admins and directors can delete payment_schedule" 
ON public.payment_schedule 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'directeur'::app_role));