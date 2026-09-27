CREATE TABLE public.company_profile (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  legal_name text NOT NULL DEFAULT 'NEOMARC REALTY LTD',
  trading_name text, rc_number text, tin text, vat_number text,
  address text, phone text, email text, website text,
  currency text NOT NULL DEFAULT 'NGN',
  timezone text NOT NULL DEFAULT 'Africa/Lagos',
  fiscal_year_start_month int NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  vat_rate numeric NOT NULL DEFAULT 7.5,
  wht_rate numeric NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.company_profile TO authenticated;
GRANT ALL ON public.company_profile TO service_role;
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read company profile" ON public.company_profile FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins insert company profile" ON public.company_profile FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update company profile" ON public.company_profile FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_company_profile_updated BEFORE UPDATE ON public.company_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  account_type text NOT NULL DEFAULT 'expense' CHECK (account_type IN ('asset','liability','equity','income','expense')),
  parent_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chart_of_accounts TO authenticated;
GRANT ALL ON public.chart_of_accounts TO service_role;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read accounts" ON public.chart_of_accounts FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Finance manage accounts" ON public.chart_of_accounts FOR ALL TO authenticated USING (public.can_finance(auth.uid()) OR public.is_admin(auth.uid())) WITH CHECK (public.can_finance(auth.uid()) OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_coa_updated BEFORE UPDATE ON public.chart_of_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_coa_parent ON public.chart_of_accounts(parent_id);

ALTER TABLE public.expenses ADD COLUMN account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT;
CREATE INDEX idx_expenses_account ON public.expenses(account_id);