
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin','management','sales_manager','realtor','accounts','documentation','project_manager','customer');
CREATE TYPE public.lead_status AS ENUM ('new','contacted','qualified','interested','inspection_scheduled','inspection_completed','negotiation','reservation','payment_started','documentation','allocation','closed_won','closed_lost','nurture');
CREATE TYPE public.lead_temperature AS ENUM ('hot','warm','cold');
CREATE TYPE public.property_status AS ENUM ('available','reserved','sold','allocated','on_hold','blocked');
CREATE TYPE public.payment_status AS ENUM ('pending','verified','reversed','failed');
CREATE TYPE public.task_status AS ENUM ('todo','in_progress','completed','overdue');
CREATE TYPE public.commission_status AS ENUM ('pending','approved','paid','cancelled');
CREATE TYPE public.inspection_status AS ENUM ('scheduled','confirmed','completed','rescheduled','cancelled','no_show');

-- UTIL
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.gen_ref(prefix text) RETURNS text AS $$
  SELECT prefix || '-' || to_char(now() AT TIME ZONE 'Africa/Lagos','YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text),1,5));
$$ LANGUAGE sql VOLATILE SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('super_admin','management','sales_manager','accounts','documentation','project_manager'));
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','management'));
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'customer'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- REALTORS
CREATE TABLE public.realtors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('RLT'),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text, whatsapp text, email text, location text,
  registration_status text NOT NULL DEFAULT 'registered',
  date_joined date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Lagos')::date,
  manager_id uuid REFERENCES public.realtors(id) ON DELETE SET NULL,
  commission_rate numeric(5,2) NOT NULL DEFAULT 5.00,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);
CREATE OR REPLACE FUNCTION public.my_realtor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.realtors WHERE user_id = auth.uid() LIMIT 1;
$$;

-- PROJECTS / ESTATES / PROPERTIES
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('PRJ'),
  name text NOT NULL, location text, project_type text,
  land_size text, start_date date, target_completion date,
  budget numeric(16,2) DEFAULT 0, actual_cost numeric(16,2) DEFAULT 0,
  progress int NOT NULL DEFAULT 0,
  manager_name text, status text NOT NULL DEFAULT 'active', notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);

CREATE TABLE public.estates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('EST'),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  name text NOT NULL, location text, state text, lga text,
  default_plot_size text, default_price numeric(16,2) NOT NULL DEFAULT 0,
  promo_price numeric(16,2), title_documentation text, description text,
  image_url text, status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('PLT'),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  block text, plot_number text NOT NULL,
  plot_size text, property_type text NOT NULL DEFAULT 'Land',
  title_documentation text,
  price numeric(16,2) NOT NULL DEFAULT 0, promo_price numeric(16,2),
  status public.property_status NOT NULL DEFAULT 'available',
  customer_id uuid, realtor_id uuid REFERENCES public.realtors(id) ON DELETE SET NULL,
  reservation_date date, sale_date date, allocation_status text DEFAULT 'not_allocated',
  is_demo boolean NOT NULL DEFAULT false, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid,
  UNIQUE (estate_id, plot_number)
);
CREATE INDEX idx_properties_estate ON public.properties(estate_id);
CREATE INDEX idx_properties_status ON public.properties(status);

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('CUS'),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL, phone text, whatsapp text, email text,
  address text, location text, country text DEFAULT 'Nigeria',
  id_type text, id_number text, next_of_kin text, next_of_kin_phone text,
  realtor_id uuid REFERENCES public.realtors(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active', notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);
ALTER TABLE public.properties ADD CONSTRAINT properties_customer_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.is_my_customer(_customer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.customers c WHERE c.id = _customer_id AND c.user_id = auth.uid());
$$;

-- LEAD SOURCES + LEADS
CREATE TABLE public.lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('LEAD'),
  full_name text NOT NULL, phone text, whatsapp text, email text,
  location text, country text DEFAULT 'Nigeria',
  source text, campaign text,
  estate_id uuid REFERENCES public.estates(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  budget numeric(16,2), preferred_plot_size text, purchase_intent text,
  temperature public.lead_temperature NOT NULL DEFAULT 'warm',
  realtor_id uuid REFERENCES public.realtors(id) ON DELETE SET NULL,
  sales_officer text,
  last_contact_at timestamptz, next_followup_at timestamptz,
  ai_summary text, ai_recommendation text, ai_score int,
  notes text,
  status public.lead_status NOT NULL DEFAULT 'new',
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_realtor ON public.leads(realtor_id);

CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL, summary text NOT NULL, outcome text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  next_action text, next_action_at timestamptz,
  status text NOT NULL DEFAULT 'logged',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);
CREATE INDEX idx_lead_activities_lead ON public.lead_activities(lead_id);

CREATE TABLE public.realtor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  realtor_id uuid REFERENCES public.realtors(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid, note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PAYMENT PLANS
CREATE TABLE public.payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('PLN'),
  estate_id uuid REFERENCES public.estates(id) ON DELETE CASCADE,
  name text NOT NULL, plan_type text NOT NULL DEFAULT 'installment',
  total_price numeric(16,2) NOT NULL DEFAULT 0,
  initial_deposit numeric(16,2) NOT NULL DEFAULT 0,
  interest_rate numeric(6,2) NOT NULL DEFAULT 0,
  installment_count int NOT NULL DEFAULT 0,
  installment_frequency text NOT NULL DEFAULT 'monthly',
  installment_amount numeric(16,2) NOT NULL DEFAULT 0,
  total_payable numeric(16,2) NOT NULL DEFAULT 0,
  grace_period_days int NOT NULL DEFAULT 0,
  penalty_rule text, description text,
  is_active boolean NOT NULL DEFAULT true, status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);

-- SALES
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('SAL'),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  estate_id uuid REFERENCES public.estates(id) ON DELETE SET NULL,
  realtor_id uuid REFERENCES public.realtors(id) ON DELETE SET NULL,
  sales_officer text,
  payment_plan_id uuid REFERENCES public.payment_plans(id) ON DELETE SET NULL,
  price numeric(16,2) NOT NULL DEFAULT 0,
  discount numeric(16,2) NOT NULL DEFAULT 0,
  total_payable numeric(16,2) NOT NULL DEFAULT 0,
  deposit numeric(16,2) NOT NULL DEFAULT 0,
  sale_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Lagos')::date,
  expected_completion date,
  documentation_status text NOT NULL DEFAULT 'pending',
  allocation_status text NOT NULL DEFAULT 'pending',
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);
CREATE UNIQUE INDEX idx_sales_active_property ON public.sales(property_id) WHERE status <> 'cancelled';

-- RESERVATIONS
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('RSV'),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  estate_id uuid REFERENCES public.estates(id) ON DELETE SET NULL,
  realtor_id uuid REFERENCES public.realtors(id) ON DELETE SET NULL,
  reservation_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Lagos')::date,
  expiry_date date,
  reservation_fee numeric(16,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  notes text, status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);
CREATE UNIQUE INDEX idx_reservations_active_property ON public.reservations(property_id) WHERE status = 'active';

-- PAYMENT SCHEDULE
CREATE TABLE public.payment_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  installment_no int NOT NULL,
  label text,
  due_date date NOT NULL,
  amount_due numeric(16,2) NOT NULL DEFAULT 0,
  amount_paid numeric(16,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);
CREATE INDEX idx_schedule_sale ON public.payment_schedule(sale_id);

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('PAY'),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  schedule_id uuid REFERENCES public.payment_schedule(id) ON DELETE SET NULL,
  amount numeric(16,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Lagos')::date,
  method text NOT NULL DEFAULT 'Bank Transfer',
  bank_account text, transaction_reference text,
  receipt_number text UNIQUE,
  narration text,
  status public.payment_status NOT NULL DEFAULT 'pending',
  verified_by uuid, verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);
CREATE INDEX idx_payments_customer ON public.payments(customer_id);
CREATE INDEX idx_payments_sale ON public.payments(sale_id);

-- DOCUMENTS
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('DOC'),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  estate_id uuid REFERENCES public.estates(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  document_type text NOT NULL, title text,
  storage_path text, version int NOT NULL DEFAULT 1,
  date_issued date, expiry_date date,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);

-- INSPECTIONS
CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('INS'),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  estate_id uuid REFERENCES public.estates(id) ON DELETE SET NULL,
  realtor_id uuid REFERENCES public.realtors(id) ON DELETE SET NULL,
  scheduled_date date NOT NULL, scheduled_time time,
  escort text, attendees int NOT NULL DEFAULT 1,
  status public.inspection_status NOT NULL DEFAULT 'scheduled',
  outcome text, notes text, followup_date date,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);

-- TASKS
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('TSK'),
  title text NOT NULL, description text, category text DEFAULT 'follow_up',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_realtor_id uuid REFERENCES public.realtors(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  status public.task_status NOT NULL DEFAULT 'todo',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);

-- COMMISSIONS
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('COM'),
  realtor_id uuid NOT NULL REFERENCES public.realtors(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  estate_id uuid REFERENCES public.estates(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  sale_value numeric(16,2) NOT NULL DEFAULT 0,
  rate numeric(5,2) NOT NULL DEFAULT 5,
  amount numeric(16,2) NOT NULL DEFAULT 0,
  amount_paid numeric(16,2) NOT NULL DEFAULT 0,
  approved_by uuid, approved_at timestamptz, paid_at timestamptz,
  status public.commission_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);

-- EXPENSES + MILESTONES
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE DEFAULT public.gen_ref('EXP'),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  estate_id uuid REFERENCES public.estates(id) ON DELETE SET NULL,
  category text NOT NULL, description text,
  amount numeric(16,2) NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Lagos')::date,
  vendor text, method text, receipt_path text,
  approved_by uuid, status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);

CREATE TABLE public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL, description text,
  due_date date, completed_at date, progress int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid
);

-- NOTIFICATIONS / TEMPLATES / AUTOMATION / AUDIT / SETTINGS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL, body text, type text NOT NULL DEFAULT 'general',
  link text, is_read boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, name text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp', body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, trigger_event text NOT NULL, action text NOT NULL,
  delay_hours int NOT NULL DEFAULT 0, template_code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, user_email text, action text NOT NULL,
  table_name text NOT NULL, record_id uuid,
  previous_value jsonb, new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

CREATE TABLE public.system_settings (
  key text PRIMARY KEY, value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- GRANTS
DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['realtors','projects','estates','properties','customers','lead_sources','leads','lead_activities','realtor_assignments','payment_plans','sales','reservations','payment_schedule','payments','documents','inspections','tasks','commissions','expenses','project_milestones','notifications','message_templates','automation_rules','audit_logs','system_settings']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- POLICIES: staff full access on operational tables
DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['realtors','projects','estates','properties','customers','lead_sources','leads','lead_activities','realtor_assignments','payment_plans','sales','reservations','payment_schedule','payments','documents','inspections','tasks','commissions','expenses','project_milestones','message_templates','automation_rules','system_settings']
  LOOP
    EXECUTE format('CREATE POLICY "staff_all_%I" ON public.%I FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', t, t);
  END LOOP;
END $$;

-- Reference data readable by all signed-in users
CREATE POLICY "read_estates" ON public.estates FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_properties" ON public.properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_plans" ON public.payment_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_sources" ON public.lead_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_templates" ON public.message_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_projects" ON public.projects FOR SELECT TO authenticated USING (true);

-- Realtor scoped access
CREATE POLICY "realtor_self" ON public.realtors FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "realtor_leads_read" ON public.leads FOR SELECT TO authenticated USING (realtor_id = public.my_realtor_id());
CREATE POLICY "realtor_leads_write" ON public.leads FOR UPDATE TO authenticated USING (realtor_id = public.my_realtor_id()) WITH CHECK (realtor_id = public.my_realtor_id());
CREATE POLICY "realtor_leads_insert" ON public.leads FOR INSERT TO authenticated WITH CHECK (realtor_id = public.my_realtor_id());
CREATE POLICY "realtor_activities" ON public.lead_activities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.realtor_id = public.my_realtor_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.realtor_id = public.my_realtor_id()));
CREATE POLICY "realtor_customers" ON public.customers FOR SELECT TO authenticated USING (realtor_id = public.my_realtor_id());
CREATE POLICY "realtor_sales" ON public.sales FOR SELECT TO authenticated USING (realtor_id = public.my_realtor_id());
CREATE POLICY "realtor_reservations" ON public.reservations FOR SELECT TO authenticated USING (realtor_id = public.my_realtor_id());
CREATE POLICY "realtor_inspections" ON public.inspections FOR ALL TO authenticated USING (realtor_id = public.my_realtor_id()) WITH CHECK (realtor_id = public.my_realtor_id());
CREATE POLICY "realtor_commissions" ON public.commissions FOR SELECT TO authenticated USING (realtor_id = public.my_realtor_id());
CREATE POLICY "realtor_tasks" ON public.tasks FOR ALL TO authenticated USING (assigned_to = auth.uid() OR assigned_realtor_id = public.my_realtor_id()) WITH CHECK (assigned_to = auth.uid() OR assigned_realtor_id = public.my_realtor_id());

-- Customer portal access
CREATE POLICY "customer_self" ON public.customers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "customer_sales" ON public.sales FOR SELECT TO authenticated USING (public.is_my_customer(customer_id));
CREATE POLICY "customer_payments" ON public.payments FOR SELECT TO authenticated USING (public.is_my_customer(customer_id));
CREATE POLICY "customer_schedule" ON public.payment_schedule FOR SELECT TO authenticated USING (public.is_my_customer(customer_id));
CREATE POLICY "customer_documents" ON public.documents FOR SELECT TO authenticated USING (public.is_my_customer(customer_id));
CREATE POLICY "customer_reservations" ON public.reservations FOR SELECT TO authenticated USING (public.is_my_customer(customer_id));

-- Notifications
CREATE POLICY "own_notifications" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- Audit logs: staff read, all insert
CREATE POLICY "audit_read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- INVENTORY SYNC TRIGGERS
CREATE OR REPLACE FUNCTION public.sync_property_on_reservation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    IF EXISTS (SELECT 1 FROM public.properties p WHERE p.id = NEW.property_id AND p.status IN ('sold','allocated','reserved')) THEN
      RAISE EXCEPTION 'This property is not available for reservation';
    END IF;
    UPDATE public.properties SET status='reserved', customer_id=NEW.customer_id, realtor_id=NEW.realtor_id, reservation_date=NEW.reservation_date WHERE id=NEW.property_id;
  ELSIF TG_OP='UPDATE' AND NEW.status <> 'active' AND OLD.status='active' THEN
    UPDATE public.properties SET status='available', customer_id=NULL, reservation_date=NULL
      WHERE id=NEW.property_id AND status='reserved';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_reservation_sync AFTER INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.sync_property_on_reservation();

CREATE OR REPLACE FUNCTION public.sync_property_on_sale() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF EXISTS (SELECT 1 FROM public.properties p WHERE p.id=NEW.property_id AND p.status IN ('sold','allocated')) THEN
      RAISE EXCEPTION 'This property has already been sold';
    END IF;
    UPDATE public.properties SET status='sold', customer_id=NEW.customer_id, realtor_id=NEW.realtor_id, sale_date=NEW.sale_date WHERE id=NEW.property_id;
    UPDATE public.reservations SET status='converted', sale_id=NEW.id WHERE property_id=NEW.property_id AND status='active';
  ELSIF TG_OP='UPDATE' THEN
    IF NEW.allocation_status='allocated' AND OLD.allocation_status <> 'allocated' THEN
      UPDATE public.properties SET status='allocated', allocation_status='allocated' WHERE id=NEW.property_id;
    END IF;
    IF NEW.status='cancelled' AND OLD.status <> 'cancelled' THEN
      UPDATE public.properties SET status='available', customer_id=NULL, sale_date=NULL WHERE id=NEW.property_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_sale_sync AFTER INSERT OR UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.sync_property_on_sale();

CREATE OR REPLACE FUNCTION public.apply_verified_payment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status='verified' AND NEW.receipt_number IS NULL THEN
    NEW.receipt_number := public.gen_ref('RCP');
    NEW.verified_at := COALESCE(NEW.verified_at, now());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_payment_receipt BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.apply_verified_payment();

CREATE OR REPLACE FUNCTION public.recalc_schedule() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sale uuid; remaining numeric; r record;
BEGIN
  v_sale := COALESCE(NEW.sale_id, OLD.sale_id);
  IF v_sale IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(amount),0) INTO remaining FROM public.payments WHERE sale_id=v_sale AND status='verified';
  FOR r IN SELECT * FROM public.payment_schedule WHERE sale_id=v_sale ORDER BY installment_no LOOP
    IF remaining >= r.amount_due THEN
      UPDATE public.payment_schedule SET amount_paid=r.amount_due, status='paid' WHERE id=r.id;
      remaining := remaining - r.amount_due;
    ELSIF remaining > 0 THEN
      UPDATE public.payment_schedule SET amount_paid=remaining, status='partial' WHERE id=r.id;
      remaining := 0;
    ELSE
      UPDATE public.payment_schedule SET amount_paid=0,
        status = CASE WHEN r.due_date < (now() AT TIME ZONE 'Africa/Lagos')::date THEN 'overdue' ELSE 'pending' END
      WHERE id=r.id;
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_recalc_schedule AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.recalc_schedule();

-- SEED
INSERT INTO public.lead_sources (name) VALUES
 ('WhatsApp'),('Facebook'),('Instagram'),('TikTok'),('LinkedIn'),('Website'),('Realtor Referral'),('Walk-in'),('Phone'),('Event'),('Existing Customer'),('Advertisement'),('Campaign'),('Other');

INSERT INTO public.estates (name, location, state, lga, default_plot_size, default_price, title_documentation, description)
VALUES
 ('RIKA ROYAL GARDEN','Azumini / Akirika','Abia State','Ukwa East','464 SQM',1200000,'Registered Survey, Deed of Assignment','Primary pilot estate for NEOMARC Realty.'),
 ('EMERALD CITY ESTATE','Ubakala','Abia State','Isiala Ngwa','464 SQM',6000000,'C of O','Premium estate with Certificate of Occupancy.');

INSERT INTO public.payment_plans (estate_id, name, plan_type, total_price, initial_deposit, interest_rate, installment_count, installment_amount, total_payable, description)
SELECT e.id, x.name, x.ptype, x.total, x.dep, x.rate, x.cnt, x.inst, x.payable, x.descr
FROM public.estates e,
 (VALUES
   ('Outright Payment','outright',1200000,1200000,0,0,0,1200000,'Full payment of ₦1,200,000'),
   ('3 Months Interest-Free','installment',1200000,400000,0,3,266700,1200000,'₦400,000 deposit then ₦266,700, ₦266,700, ₦266,600'),
   ('6 Months (10% Interest)','installment',1200000,300000,10,6,170000,1320000,'₦300,000 deposit, balance ₦900,000 + 10% interest = ₦1,020,000 over 6 months')
 ) AS x(name,ptype,total,dep,rate,cnt,inst,payable,descr)
WHERE e.name = 'RIKA ROYAL GARDEN';

INSERT INTO public.message_templates (code, name, channel, body) VALUES
 ('new_inquiry','New Inquiry Acknowledgement','whatsapp','Thank you for contacting NEOMARC Realty. A property consultant will reach out to you shortly.'),
 ('inspection_confirmation','Inspection Confirmation','whatsapp','Your inspection for {{estate}} is confirmed for {{date}} at {{time}}. Meeting point details will follow.'),
 ('payment_reminder','Payment Reminder','whatsapp','Dear {{customer}}, your installment of ₦{{amount}} for {{property}} is due on {{due_date}}.'),
 ('payment_receipt','Payment Receipt','whatsapp','We have received your payment of ₦{{amount}}. Receipt {{receipt_number}}. Outstanding balance: ₦{{balance}}.'),
 ('reservation_confirmation','Reservation Confirmation','whatsapp','Your reservation for {{property}} at {{estate}} is confirmed and expires on {{expiry}}.'),
 ('documentation_update','Documentation Update','whatsapp','Update on your documentation for {{property}}: {{status}}.'),
 ('allocation_notification','Allocation Notification','whatsapp','Congratulations {{customer}}! Your plot {{property}} at {{estate}} has been allocated.'),
 ('after_sales','After-Sales Message','whatsapp','Thank you for investing with NEOMARC Realty. Creating Value, and Sustainable Wealth.');

INSERT INTO public.automation_rules (name, trigger_event, action, delay_hours, template_code) VALUES
 ('Acknowledge new lead','lead_created','send_message',0,'new_inquiry'),
 ('Follow up unresponsive lead','lead_no_response','create_task',48,NULL),
 ('Confirm inspection','inspection_scheduled','send_message',0,'inspection_confirmation'),
 ('Post-inspection follow-up','inspection_completed','create_task',24,NULL),
 ('Reservation expiry warning','reservation_expiring','notify',0,'reservation_confirmation'),
 ('Payment due reminder','payment_due','send_message',0,'payment_reminder'),
 ('Overdue payment escalation','payment_overdue','notify',0,NULL),
 ('Sale completed documentation task','sale_completed','create_task',0,NULL),
 ('Documentation completed allocation task','documentation_completed','create_task',0,NULL),
 ('Allocation after-sales follow-up','allocation_completed','send_message',0,'after_sales');

INSERT INTO public.system_settings (key, value) VALUES
 ('company', '{"name":"NEOMARC REALTY","short":"NDOS","tagline":"Creating Value, and Sustainable Wealth.","positioning":"Land Banking | Development | Management | Sales","currency":"NGN","timezone":"Africa/Lagos"}'::jsonb),
 ('commission', '{"default_rate":5}'::jsonb);

-- DEMO INVENTORY (clearly labelled, easy to delete)
INSERT INTO public.properties (estate_id, block, plot_number, plot_size, property_type, title_documentation, price, is_demo, notes)
SELECT e.id, 'A', 'DEMO-' || lpad(g::text,3,'0'), '464 SQM','Land', e.title_documentation, e.default_price, true, 'DEMO INVENTORY'
FROM public.estates e, generate_series(1,20) g WHERE e.name='RIKA ROYAL GARDEN';

INSERT INTO public.properties (estate_id, block, plot_number, plot_size, property_type, title_documentation, price, is_demo, notes)
SELECT e.id, 'B', 'DEMO-' || lpad(g::text,3,'0'), '464 SQM','Land', e.title_documentation, e.default_price, true, 'DEMO INVENTORY'
FROM public.estates e, generate_series(1,10) g WHERE e.name='EMERALD CITY ESTATE';
