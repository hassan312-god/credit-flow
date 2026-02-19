-- Isolation des données : chaque utilisateur ne voit/modifie que ses propres données (created_by).
-- Le directeur voit tout et peut tout modifier / supprimer (y compris supprimer un client et ses prêts).

-- 1) UPDATE clients : l'agent_credit ne peut modifier que les clients qu'il a créés ; le directeur peut tout modifier
DROP POLICY IF EXISTS "Credit agents and directors can update clients" ON public.clients;
CREATE POLICY "Credit agents and directors can update own or all"
ON public.clients FOR UPDATE
USING (
  public.has_role(auth.uid(), 'directeur'::app_role)
  OR (public.has_role(auth.uid(), 'agent_credit'::app_role) AND created_by = auth.uid())
);

-- 2) Au cas où l'app n'envoie pas created_by : forcer created_by = auth.uid() à l'insertion (clients)
CREATE OR REPLACE FUNCTION public.set_created_by_client()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS set_created_by_on_clients ON public.clients;
CREATE TRIGGER set_created_by_on_clients
  BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by_client();

-- 3) Idem pour les prêts : created_by = auth.uid() si non renseigné
CREATE OR REPLACE FUNCTION public.set_created_by_loan()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS set_created_by_on_loans ON public.loans;
CREATE TRIGGER set_created_by_on_loans
  BEFORE INSERT ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by_loan();
