
-- =============== 1. FEEDBACK ===============
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  user_role text,
  category text NOT NULL CHECK (category IN ('bug','feature','confusing','improvement')),
  description text NOT NULL,
  page_path text,
  screenshot_path text,
  technical_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','triaged','in_progress','resolved','wont_fix')),
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_insert_own" ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "feedback_select_own_or_admin" ON public.feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "feedback_update_admin" ON public.feedback FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_feedback_updated_at BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_feedback_user ON public.feedback(user_id);
CREATE INDEX idx_feedback_status_created ON public.feedback(status, created_at DESC);

-- =============== 2. ERROR REPORTS ===============
CREATE TABLE public.error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  user_role text,
  page_path text,
  action_attempted text,
  error_summary text,
  technical_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.error_reports TO authenticated;
GRANT ALL ON public.error_reports TO service_role;
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "error_reports_insert_own" ON public.error_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "error_reports_select_admin" ON public.error_reports FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "error_reports_update_admin" ON public.error_reports FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_error_reports_updated_at BEFORE UPDATE ON public.error_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_error_reports_created ON public.error_reports(created_at DESC);

-- =============== 3. ONBOARDING ===============
CREATE TABLE public.user_onboarding (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at timestamptz,
  completed_at timestamptz,
  last_seen_role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_onboarding TO authenticated;
GRANT ALL ON public.user_onboarding TO service_role;
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_select_own_or_admin" ON public.user_onboarding FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "onboarding_insert_own" ON public.user_onboarding FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "onboarding_update_own" ON public.user_onboarding FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_user_onboarding_updated_at BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============== 4. UAT CHECKLIST ===============
CREATE TABLE public.uat_checklist (
  code text PRIMARY KEY,
  section text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_done boolean NOT NULL DEFAULT false,
  done_by uuid,
  done_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.uat_checklist TO authenticated;
GRANT ALL ON public.uat_checklist TO service_role;
ALTER TABLE public.uat_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uat_select_staff" ON public.uat_checklist FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "uat_update_admin" ON public.uat_checklist FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_uat_checklist_updated_at BEFORE UPDATE ON public.uat_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.uat_checklist (code, section, label, sort_order) VALUES
  ('realtor_login','Realtor test','Login',10),
  ('realtor_my_work','Realtor test','View My Work',20),
  ('realtor_leads','Realtor test','View assigned leads',30),
  ('realtor_call','Realtor test','Call customer',40),
  ('realtor_whatsapp','Realtor test','WhatsApp customer',50),
  ('realtor_activity','Realtor test','Log activity',60),
  ('realtor_schedule_inspection','Realtor test','Schedule inspection',70),
  ('realtor_complete_inspection','Realtor test','Complete inspection',80),
  ('realtor_search_property','Realtor test','Search property',90),
  ('realtor_reservation','Realtor test','Create reservation',100),
  ('sales_convert_customer','Sales test','Convert customer',110),
  ('sales_create_sale','Sales test','Create sale',120),
  ('sales_payment_plan','Sales test','Select payment plan',130),
  ('sales_schedule','Sales test','Verify payment schedule',140),
  ('sales_commission','Sales test','Verify commission',150),
  ('accounts_record_payment','Accounts test','Record payment',160),
  ('accounts_pending_queue','Accounts test','View pending verification',170),
  ('accounts_verify','Accounts test','Verify payment',180),
  ('accounts_balance','Accounts test','Confirm balance update',190),
  ('accounts_receipt','Accounts test','Generate receipt',200),
  ('docs_upload','Documentation test','Upload document',210),
  ('docs_open','Documentation test','Open document',220),
  ('docs_private_access','Documentation test','Verify private access',230),
  ('docs_approve','Documentation test','Approve / reject document',240),
  ('docs_allocation_queue','Documentation test','Check allocation queue',250),
  ('mgmt_dashboard','Management test','View dashboard',260),
  ('mgmt_operations','Management test','View Operations Command',270),
  ('mgmt_exceptions','Management test','View exceptions',280),
  ('mgmt_feedback','Management test','View feedback',290),
  ('mgmt_audit','Management test','View audit activity',300),
  ('mobile_realtor','Mobile test','Realtor workflow',310),
  ('mobile_reservation','Mobile test','Reservation workflow',320),
  ('mobile_accounts','Mobile test','Accounts workflow',330),
  ('mobile_docs','Mobile test','Documentation workflow',340);

CREATE OR REPLACE FUNCTION public.stamp_uat_item()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_done IS DISTINCT FROM OLD.is_done THEN
    NEW.done_at := CASE WHEN NEW.is_done THEN now() ELSE NULL END;
    NEW.done_by := CASE WHEN NEW.is_done THEN auth.uid() ELSE NULL END;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_stamp_uat_item BEFORE UPDATE ON public.uat_checklist
  FOR EACH ROW EXECUTE FUNCTION public.stamp_uat_item();

-- =============== 5. CONFIGURABLE THRESHOLDS ===============
INSERT INTO public.system_settings (key, value) VALUES (
  'ops_thresholds',
  jsonb_build_object(
    'new_lead_uncontacted_hours', 24,
    'followup_overdue_days', 0,
    'reservation_expiring_days', 7,
    'payment_verification_hours', 24,
    'installment_overdue_days', 0,
    'sale_inactive_days', 14,
    'sale_stage_stuck_days', 21,
    'documentation_stalled_days', 10
  )
) ON CONFLICT (key) DO NOTHING;

-- =============== 6. TEST DATA MARKING ===============
ALTER TABLE public.leads        ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.customers    ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.sales        ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.payments     ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.inspections  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.documents    ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_leads_is_test ON public.leads(is_test) WHERE is_test;
CREATE INDEX IF NOT EXISTS idx_customers_is_test ON public.customers(is_test) WHERE is_test;
CREATE INDEX IF NOT EXISTS idx_sales_is_test ON public.sales(is_test) WHERE is_test;
CREATE INDEX IF NOT EXISTS idx_payments_is_test ON public.payments(is_test) WHERE is_test;
CREATE INDEX IF NOT EXISTS idx_reservations_is_test ON public.reservations(is_test) WHERE is_test;

-- allow deletion of explicitly-marked test payments during a guarded cleanup only
CREATE OR REPLACE FUNCTION public.block_payment_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF COALESCE(OLD.is_test, false)
     AND COALESCE(current_setting('ndos.test_cleanup', true), '') = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Payments cannot be deleted. Set status to reversed instead.';
END; $$;

CREATE OR REPLACE FUNCTION public.block_paid_commission_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF COALESCE(current_setting('ndos.test_cleanup', true), '') = 'on'
     AND EXISTS (SELECT 1 FROM public.sales s WHERE s.id = OLD.sale_id AND s.is_test) THEN
    RETURN OLD;
  END IF;
  IF OLD.status IN ('paid','payable','approved') OR COALESCE(OLD.amount_paid,0) > 0 THEN
    RAISE EXCEPTION 'Approved or paid commissions cannot be deleted. Reverse them instead.';
  END IF;
  RETURN OLD;
END; $$;

-- =============== 7. TEST DATA CLEANUP (preview + execute) ===============
CREATE OR REPLACE FUNCTION public.test_data_report()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'leads',        (SELECT count(*) FROM public.leads WHERE is_test),
    'inspections',  (SELECT count(*) FROM public.inspections WHERE is_test),
    'reservations', (SELECT count(*) FROM public.reservations WHERE is_test),
    'sales',        (SELECT count(*) FROM public.sales WHERE is_test),
    'payments',     (SELECT count(*) FROM public.payments WHERE is_test),
    'documents',    (SELECT count(*) FROM public.documents WHERE is_test),
    'customers',    (SELECT count(*) FROM public.customers WHERE is_test),
    'commissions',  (SELECT count(*) FROM public.commissions c JOIN public.sales s ON s.id = c.sale_id WHERE s.is_test),
    'schedule_rows',(SELECT count(*) FROM public.payment_schedule ps JOIN public.sales s ON s.id = ps.sale_id WHERE s.is_test),
    'allocations',  (SELECT count(*) FROM public.allocations a JOIN public.sales s ON s.id = a.sale_id WHERE s.is_test)
  );
$$;
REVOKE ALL ON FUNCTION public.test_data_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.test_data_report() TO authenticated;

CREATE OR REPLACE FUNCTION public.purge_test_data()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  before_report jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only a Super Admin can remove test data.';
  END IF;

  before_report := public.test_data_report();
  PERFORM set_config('ndos.test_cleanup', 'on', true);

  DELETE FROM public.reminders r USING public.sales s WHERE r.sale_id = s.id AND s.is_test;
  DELETE FROM public.allocations a USING public.sales s WHERE a.sale_id = s.id AND s.is_test;
  DELETE FROM public.sale_closing_checklist c USING public.sales s WHERE c.sale_id = s.id AND s.is_test;
  DELETE FROM public.commission_accrual_issues i USING public.sales s WHERE i.sale_id = s.id AND s.is_test;
  DELETE FROM public.commissions c USING public.sales s WHERE c.sale_id = s.id AND s.is_test;
  DELETE FROM public.payments p WHERE p.is_test;
  DELETE FROM public.payments p USING public.sales s WHERE p.sale_id = s.id AND s.is_test;
  DELETE FROM public.payment_schedule ps USING public.sales s WHERE ps.sale_id = s.id AND s.is_test;
  DELETE FROM public.documents d WHERE d.is_test;
  UPDATE public.reservations SET sale_id = NULL WHERE sale_id IN (SELECT id FROM public.sales WHERE is_test);
  DELETE FROM public.sale_referrals sr USING public.sales s WHERE sr.sale_id = s.id AND s.is_test;
  DELETE FROM public.sales WHERE is_test;
  DELETE FROM public.reservation_expiry_log l USING public.reservations r WHERE l.reservation_id = r.id AND r.is_test;
  DELETE FROM public.reservations WHERE is_test;
  DELETE FROM public.inspections WHERE is_test;
  DELETE FROM public.lead_activities la USING public.leads l WHERE la.lead_id = l.id AND l.is_test;
  DELETE FROM public.realtor_assignments ra USING public.leads l WHERE ra.lead_id = l.id AND l.is_test;
  DELETE FROM public.tasks t USING public.leads l WHERE t.lead_id = l.id AND l.is_test;
  DELETE FROM public.leads WHERE is_test;
  DELETE FROM public.tasks t USING public.customers c WHERE t.customer_id = c.id AND c.is_test;
  DELETE FROM public.customers WHERE is_test;

  PERFORM set_config('ndos.test_cleanup', 'off', true);

  INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, previous_value, new_value)
  VALUES (auth.uid(), auth.jwt() ->> 'email', 'purge_test_data', 'system', NULL, before_report,
          jsonb_build_object('remaining', public.test_data_report()));

  RETURN before_report;
END; $$;
REVOKE ALL ON FUNCTION public.purge_test_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_test_data() TO authenticated;

-- =============== 8. PILOT USERS ===============
CREATE OR REPLACE FUNCTION public.pilot_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  roles text[],
  last_sign_in_at timestamptz,
  created_at timestamptz,
  onboarding_dismissed_at timestamptz,
  onboarding_completed_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id,
         u.email::text,
         p.full_name,
         COALESCE(ARRAY(SELECT r.role::text FROM public.user_roles r WHERE r.user_id = u.id ORDER BY r.role::text), ARRAY[]::text[]),
         u.last_sign_in_at,
         u.created_at,
         o.dismissed_at,
         o.completed_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.user_onboarding o ON o.user_id = u.id
  WHERE public.is_admin(auth.uid())
  ORDER BY u.created_at;
$$;
REVOKE ALL ON FUNCTION public.pilot_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pilot_users() TO authenticated;
