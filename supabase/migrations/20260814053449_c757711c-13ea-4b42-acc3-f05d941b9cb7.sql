-- 1. Role helpers
CREATE OR REPLACE FUNCTION public.can_finance(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('super_admin','management','accounts'));
$$;
CREATE OR REPLACE FUNCTION public.can_docs(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('super_admin','management','documentation'));
$$;
CREATE OR REPLACE FUNCTION public.can_projects(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('super_admin','management','project_manager'));
$$;
REVOKE EXECUTE ON FUNCTION public.can_finance(uuid), public.can_docs(uuid), public.can_projects(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_finance(uuid), public.can_docs(uuid), public.can_projects(uuid) TO authenticated, service_role;

-- 2. Split financial write access from general staff read access
DROP POLICY IF EXISTS staff_all_payments ON public.payments;
CREATE POLICY payments_read ON public.payments FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY payments_write ON public.payments FOR ALL TO authenticated USING (can_finance(auth.uid())) WITH CHECK (can_finance(auth.uid()));

DROP POLICY IF EXISTS staff_all_payment_schedule ON public.payment_schedule;
CREATE POLICY schedule_read ON public.payment_schedule FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY schedule_write ON public.payment_schedule FOR ALL TO authenticated USING (can_finance(auth.uid())) WITH CHECK (can_finance(auth.uid()));

DROP POLICY IF EXISTS staff_all_commissions ON public.commissions;
CREATE POLICY commissions_read ON public.commissions FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY commissions_write ON public.commissions FOR ALL TO authenticated USING (can_finance(auth.uid())) WITH CHECK (can_finance(auth.uid()));

DROP POLICY IF EXISTS staff_all_expenses ON public.expenses;
CREATE POLICY expenses_read ON public.expenses FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY expenses_write ON public.expenses FOR ALL TO authenticated USING (can_finance(auth.uid()) OR can_projects(auth.uid())) WITH CHECK (can_finance(auth.uid()) OR can_projects(auth.uid()));

DROP POLICY IF EXISTS staff_all_documents ON public.documents;
CREATE POLICY documents_read ON public.documents FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY documents_write ON public.documents FOR ALL TO authenticated USING (can_docs(auth.uid())) WITH CHECK (can_docs(auth.uid()));

DROP POLICY IF EXISTS staff_all_projects ON public.projects;
CREATE POLICY projects_write ON public.projects FOR ALL TO authenticated USING (can_projects(auth.uid())) WITH CHECK (can_projects(auth.uid()));

DROP POLICY IF EXISTS staff_all_project_milestones ON public.project_milestones;
CREATE POLICY milestones_read ON public.project_milestones FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY milestones_write ON public.project_milestones FOR ALL TO authenticated USING (can_projects(auth.uid())) WITH CHECK (can_projects(auth.uid()));

-- 3. Audit log integrity
DROP POLICY IF EXISTS audit_insert ON public.audit_logs;
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 4. Financial records are never hard-deleted
CREATE OR REPLACE FUNCTION public.block_payment_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Payments cannot be deleted. Set status to reversed instead.';
END; $$;
DROP TRIGGER IF EXISTS trg_block_payment_delete ON public.payments;
CREATE TRIGGER trg_block_payment_delete BEFORE DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.block_payment_delete();

-- 5. Data integrity constraints
ALTER TABLE public.sales
  ALTER COLUMN customer_id SET NOT NULL,
  ALTER COLUMN property_id SET NOT NULL;
ALTER TABLE public.sales
  ADD CONSTRAINT sales_amounts_nonneg CHECK (price >= 0 AND discount >= 0 AND total_payable >= 0 AND deposit >= 0);
ALTER TABLE public.payment_schedule
  ADD CONSTRAINT schedule_amounts_nonneg CHECK (amount_due >= 0 AND amount_paid >= 0);
ALTER TABLE public.reservations
  ADD CONSTRAINT reservation_fee_nonneg CHECK (reservation_fee >= 0);
ALTER TABLE public.properties
  ADD CONSTRAINT property_price_nonneg CHECK (price >= 0);

-- 6. Auto-generate the payment schedule when a sale is created
CREATE OR REPLACE FUNCTION public.generate_payment_schedule()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pl record; i int; step interval; running numeric := 0; amt numeric; n int; dep numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM public.payment_schedule WHERE sale_id = NEW.id) THEN RETURN NEW; END IF;

  IF NEW.payment_plan_id IS NULL THEN
    INSERT INTO public.payment_schedule (sale_id, customer_id, installment_no, label, due_date, amount_due, status, created_by)
    VALUES (NEW.id, NEW.customer_id, 1, 'Full Payment', NEW.sale_date, NEW.total_payable, 'pending', NEW.created_by);
    RETURN NEW;
  END IF;

  SELECT * INTO pl FROM public.payment_plans WHERE id = NEW.payment_plan_id;
  IF pl IS NULL THEN RETURN NEW; END IF;

  step := CASE lower(coalesce(pl.installment_frequency,'monthly'))
            WHEN 'weekly' THEN interval '1 week'
            WHEN 'quarterly' THEN interval '3 months'
            ELSE interval '1 month' END;

  dep := LEAST(coalesce(NEW.deposit, pl.initial_deposit, 0), NEW.total_payable);
  IF dep > 0 THEN
    INSERT INTO public.payment_schedule (sale_id, customer_id, installment_no, label, due_date, amount_due, status, created_by)
    VALUES (NEW.id, NEW.customer_id, 1, 'Initial Deposit', NEW.sale_date, dep, 'pending', NEW.created_by);
    running := dep;
  END IF;

  n := coalesce(pl.installment_count, 0);
  IF n > 0 THEN
    amt := round((NEW.total_payable - running) / n, 2);
    FOR i IN 1..n LOOP
      IF i = n THEN amt := NEW.total_payable - running; END IF;
      INSERT INTO public.payment_schedule (sale_id, customer_id, installment_no, label, due_date, amount_due, status, created_by)
      VALUES (NEW.id, NEW.customer_id, i + (CASE WHEN dep > 0 THEN 1 ELSE 0 END),
              'Installment ' || i, (NEW.sale_date + (step * i))::date, amt, 'pending', NEW.created_by);
      running := running + amt;
    END LOOP;
  ELSIF running < NEW.total_payable THEN
    INSERT INTO public.payment_schedule (sale_id, customer_id, installment_no, label, due_date, amount_due, status, created_by)
    VALUES (NEW.id, NEW.customer_id, 2, 'Balance', NEW.sale_date, NEW.total_payable - running, 'pending', NEW.created_by);
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_generate_schedule ON public.sales;
CREATE TRIGGER trg_generate_schedule AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.generate_payment_schedule();

-- 7. Missing foreign-key indexes
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_realtor ON public.sales(realtor_id);
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON public.reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_realtor ON public.customers(realtor_id);
CREATE INDEX IF NOT EXISTS idx_commissions_realtor ON public.commissions(realtor_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON public.documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_inspections_realtor ON public.inspections(realtor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_schedule_customer ON public.payment_schedule(customer_id);