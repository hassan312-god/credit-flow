-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement');

-- Create enum for loan status
CREATE TYPE public.loan_status AS ENUM ('en_attente', 'en_cours_validation', 'approuve', 'rejete', 'en_cours', 'rembourse', 'en_retard', 'defaut');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('en_attente', 'paye', 'en_retard', 'partiel');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, role)
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  id_number TEXT NOT NULL,
  id_type TEXT NOT NULL DEFAULT 'CNI',
  profession TEXT,
  monthly_income DECIMAL(15, 2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create loans table
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
  duration_months INTEGER NOT NULL,
  monthly_payment DECIMAL(15, 2),
  total_amount DECIMAL(15, 2),
  status loan_status NOT NULL DEFAULT 'en_attente',
  purpose TEXT,
  created_by UUID REFERENCES auth.users(id),
  validated_by UUID REFERENCES auth.users(id),
  validation_date TIMESTAMP WITH TIME ZONE,
  disbursement_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create payment_schedule table
CREATE TABLE public.payment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  due_date DATE NOT NULL,
  amount_due DECIMAL(15, 2) NOT NULL,
  principal DECIMAL(15, 2) NOT NULL,
  interest DECIMAL(15, 2) NOT NULL,
  amount_paid DECIMAL(15, 2) DEFAULT 0,
  payment_date DATE,
  status payment_status NOT NULL DEFAULT 'en_attente',
  installment_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  schedule_id UUID REFERENCES public.payment_schedule(id),
  amount DECIMAL(15, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'especes',
  reference TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for clients (all authenticated users with roles can view)
CREATE POLICY "Authenticated users with roles can view clients"
ON public.clients FOR SELECT
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Credit agents and above can create clients"
ON public.clients FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'directeur') OR
  public.has_role(auth.uid(), 'agent_credit')
);

CREATE POLICY "Credit agents and above can update clients"
ON public.clients FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'directeur') OR
  public.has_role(auth.uid(), 'agent_credit')
);

-- RLS Policies for loans
CREATE POLICY "Authenticated users with roles can view loans"
ON public.loans FOR SELECT
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Credit agents and above can create loans"
ON public.loans FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'directeur') OR
  public.has_role(auth.uid(), 'agent_credit')
);

CREATE POLICY "Directors and admins can update loans"
ON public.loans FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'directeur')
);

-- RLS Policies for payment_schedule
CREATE POLICY "Authenticated users with roles can view schedules"
ON public.payment_schedule FOR SELECT
USING (public.has_any_role(auth.uid()));

CREATE POLICY "System can manage schedules"
ON public.payment_schedule FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'directeur') OR
  public.has_role(auth.uid(), 'agent_credit')
);

-- RLS Policies for payments
CREATE POLICY "Authenticated users with roles can view payments"
ON public.payments FOR SELECT
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Cashiers and above can create payments"
ON public.payments FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'directeur') OR
  public.has_role(auth.uid(), 'caissier')
);

-- RLS Policies for audit_logs
CREATE POLICY "Admins and directors can view audit logs"
ON public.audit_logs FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'directeur')
);

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();