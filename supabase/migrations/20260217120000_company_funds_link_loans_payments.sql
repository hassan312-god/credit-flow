-- Lier le fonds de trésorerie aux prêts et aux paiements :
-- - À chaque nouveau paiement : créditer le fonds (current_balance, total_payments_received) et historiser.
-- - À chaque déblocage de prêt (disbursement_date renseigné) : débiter le fonds (current_balance, total_loans_disbursed) et historiser.

-- Fonction : récupérer l'id du premier fonds (le plus ancien)
CREATE OR REPLACE FUNCTION public.get_main_company_fund_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.company_funds ORDER BY created_at ASC LIMIT 1;
$$;

-- Trigger : après insertion d'un paiement
CREATE OR REPLACE FUNCTION public.on_payment_insert_update_funds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _fund_id UUID;
  _prev_balance NUMERIC;
  _new_balance NUMERIC;
BEGIN
  _fund_id := public.get_main_company_fund_id();
  IF _fund_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT current_balance INTO _prev_balance FROM public.company_funds WHERE id = _fund_id FOR UPDATE;
  _new_balance := _prev_balance + NEW.amount;

  UPDATE public.company_funds
  SET
    current_balance = _new_balance,
    total_payments_received = COALESCE(total_payments_received, 0) + NEW.amount,
    updated_at = now()
  WHERE id = _fund_id;

  INSERT INTO public.company_funds_history (fund_id, previous_balance, new_balance, change_amount, change_type, notes, updated_by)
  VALUES (_fund_id, _prev_balance, _new_balance, NEW.amount, 'payment_received', 'Paiement prêt ' || NEW.loan_id::text, NEW.recorded_by);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_payment_insert_update_funds ON public.payments;
CREATE TRIGGER after_payment_insert_update_funds
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_payment_insert_update_funds();

-- Trigger : après mise à jour d'un prêt (déblocage : disbursement_date passé à non null)
CREATE OR REPLACE FUNCTION public.on_loan_disbursement_update_funds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _fund_id UUID;
  _prev_balance NUMERIC;
  _new_balance NUMERIC;
BEGIN
  IF OLD.disbursement_date IS NOT NULL OR NEW.disbursement_date IS NULL THEN
    RETURN NEW;
  END IF;

  _fund_id := public.get_main_company_fund_id();
  IF _fund_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT current_balance INTO _prev_balance FROM public.company_funds WHERE id = _fund_id FOR UPDATE;
  _new_balance := _prev_balance - NEW.amount;

  IF _new_balance < 0 THEN
    RAISE WARNING 'Fonds de trésorerie insuffisant après déblocage du prêt %', NEW.id;
  END IF;

  UPDATE public.company_funds
  SET
    current_balance = _new_balance,
    total_loans_disbursed = COALESCE(total_loans_disbursed, 0) + NEW.amount,
    updated_at = now()
  WHERE id = _fund_id;

  INSERT INTO public.company_funds_history (fund_id, previous_balance, new_balance, change_amount, change_type, notes, updated_by)
  VALUES (_fund_id, _prev_balance, _new_balance, -NEW.amount, 'loan_disbursement', 'Déblocage prêt ' || NEW.id::text, NULL);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_loan_update_disbursement_funds ON public.loans;
CREATE TRIGGER after_loan_update_disbursement_funds
  AFTER UPDATE ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION public.on_loan_disbursement_update_funds();
