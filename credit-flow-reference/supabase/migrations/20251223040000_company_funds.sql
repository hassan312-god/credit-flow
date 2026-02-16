-- Create company_funds table for managing company capital/funds
CREATE TABLE IF NOT EXISTS public.company_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initial_capital DECIMAL(15, 2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.company_funds ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins and directors can manage company funds
CREATE POLICY "Admins and directors can view company funds"
ON public.company_funds FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'directeur')
);

CREATE POLICY "Admins and directors can insert company funds"
ON public.company_funds FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'directeur')
);

CREATE POLICY "Admins and directors can update company funds"
ON public.company_funds FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'directeur')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'directeur')
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_company_funds_updated_at ON public.company_funds;
CREATE TRIGGER update_company_funds_updated_at
  BEFORE UPDATE ON public.company_funds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for fund history (track changes)
CREATE TABLE IF NOT EXISTS public.company_funds_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID REFERENCES public.company_funds(id) ON DELETE CASCADE,
  previous_balance DECIMAL(15, 2) NOT NULL,
  new_balance DECIMAL(15, 2) NOT NULL,
  change_amount DECIMAL(15, 2) NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('initial_setup', 'adjustment', 'loan_disbursement', 'payment_received')),
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.company_funds_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for history: Only admins and directors can view
CREATE POLICY "Admins and directors can view fund history"
ON public.company_funds_history FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'directeur')
);

CREATE POLICY "System can insert fund history"
ON public.company_funds_history FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Note: L'insertion initiale sera gérée par l'application si aucun enregistrement n'existe

