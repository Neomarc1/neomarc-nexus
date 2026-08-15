-- =====================================================================
-- PHASE 2A: COMMISSION ENGINE, RESERVATION EXPIRY, SCHEDULE STATUSES
-- =====================================================================

-- ---------- helper: payout authority ----------
CREATE OR REPLACE FUNCTION public.can_payout(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('super_admin','management','accounts'));
$$;
REVOKE ALL ON FUNCTION public.can_payout(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_payout(uuid) TO authenticated, service_role;

-- ---------- 1. COMMISSION RULES ----------
CREATE TABLE public.commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  estate_id uuid REFERENCES public.estates(id) ON DELETE CASCADE,
  property_type text,
  realtor_id uuid REFERENCES public.realtors(id) ON DELETE CASCADE,
  sales_channel text,
  rate numeric NOT NULL DEFAULT 0 CHECK (rate >= 0 AND rate <= 100),
  fixed_amount numeric NOT NULL DEFAULT 0 CHECK (fixed_amount >= 0),
  priority integer NOT NULL DEFAULT 0,
  effective_from date,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_rules TO authenticated;
GRANT ALL ON public.commission_rules TO service_role;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission_rules_read" ON public.commission_rules FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR realtor_id = public.my_realtor_id());
CREATE POLICY "commission_rules_write" ON public.commission_rules FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_commission_rules_updated BEFORE UPDATE ON public.commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_commission_rules_lookup ON public.commission_rules (is_active, estate_id, property_type, realtor_id);

-- ---------- 2. SALES: channel + stage ----------
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS sales_channel text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'payment_in_progress',
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid;
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_stage_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_stage_check CHECK (stage IN
  ('payment_in_progress','fully_paid','documentation','ready_for_allocation','allocated','closed','cancelled'));

-- ---------- 3. COMMISSIONS: extra columns ----------
ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rule_id uuid REFERENCES public.commission_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS split_percent numeric NOT NULL DEFAULT 100 CHECK (split_percent > 0 AND split_percent <= 100),
  ADD COLUMN IF NOT EXISTS fixed_component numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payable_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS is_auto boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_commissions_unique_active
  ON public.commissions (sale_id, realtor_id) WHERE status <> 'reversed';

-- ---------- 4. RULE RESOLUTION ----------
CREATE OR REPLACE FUNCTION public.resolve_commission_rule(
  _estate_id uuid, _property_type text, _realtor_id uuid, _channel text, _on_date date)
RETURNS public.commission_rules
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.* FROM public.commission_rules r
  WHERE r.is_active
    AND (r.effective_from IS NULL OR r.effective_from <= _on_date)
    AND (r.effective_to   IS NULL OR r.effective_to   >= _on_date)
    AND (r.estate_id      IS NULL OR r.estate_id      = _estate_id)
    AND (r.property_type  IS NULL OR r.property_type  = _property_type)
    AND (r.realtor_id     IS NULL OR r.realtor_id     = _realtor_id)
    AND (r.sales_channel  IS NULL OR r.sales_channel  = _channel)
  ORDER BY
    ((r.realtor_id IS NOT NULL)::int * 8
     + (r.estate_id IS NOT NULL)::int * 4
     + (r.property_type IS NOT NULL)::int * 2
     + (r.sales_channel IS NOT NULL)::int) DESC,
    r.priority DESC, r.effective_from DESC NULLS LAST, r.created_at DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.resolve_commission_rule(uuid,text,uuid,text,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_commission_rule(uuid,text,uuid,text,date) TO authenticated, service_role;

-- ---------- 5. AUTO ACCRUAL ON SALE ----------
CREATE OR REPLACE FUNCTION public.accrue_sale_commission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rule public.commission_rules;
  ptype text;
  v_rate numeric := 0;
  v_fixed numeric := 0;
  v_amount numeric := 0;
BEGIN
  IF NEW.realtor_id IS NULL OR COALESCE(NEW.status,'active') = 'cancelled' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.commissions c
             WHERE c.sale_id = NEW.id AND c.realtor_id = NEW.realtor_id AND c.status <> 'reversed') THEN
    RETURN NEW;
  END IF;

  SELECT p.property_type INTO ptype FROM public.properties p WHERE p.id = NEW.property_id;
  SELECT * INTO rule FROM public.resolve_commission_rule(
    NEW.estate_id, ptype, NEW.realtor_id, COALESCE(NEW.sales_channel,'direct'), NEW.sale_date);

  IF rule.id IS NOT NULL THEN
    v_rate := COALESCE(rule.rate, 0);
    v_fixed := COALESCE(rule.fixed_amount, 0);
  ELSE
    SELECT COALESCE(r.commission_rate, 0) INTO v_rate FROM public.realtors r WHERE r.id = NEW.realtor_id;
  END IF;

  v_amount := ROUND(COALESCE(NEW.total_payable,0) * v_rate / 100.0, 2) + v_fixed;
  IF v_amount <= 0 THEN RETURN NEW; END IF;

  INSERT INTO public.commissions
    (ref, realtor_id, sale_id, customer_id, estate_id, property_id, rule_id,
     sale_value, rate, fixed_component, amount, amount_paid, status, is_auto, created_by)
  VALUES
    (public.gen_ref('COM'), NEW.realtor_id, NEW.id, NEW.customer_id, NEW.estate_id, NEW.property_id, rule.id,
     COALESCE(NEW.total_payable,0), v_rate, v_fixed, v_amount, 0, 'pending', true, NEW.created_by);

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_accrue_commission ON public.sales;
CREATE TRIGGER trg_accrue_commission AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.accrue_sale_commission();

-- ---------- 6. REVERSAL ON SALE CANCELLATION ----------
CREATE OR REPLACE FUNCTION public.reverse_sale_commission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND COALESCE(OLD.status,'') <> 'cancelled' THEN
    UPDATE public.commissions
      SET status = 'reversed',
          reversed_at = now(),
          notes = COALESCE(notes,'') || ' | Auto-reversed: sale cancelled ' || to_char(now(),'YYYY-MM-DD')
      WHERE sale_id = NEW.id AND status <> 'reversed';
    UPDATE public.sales SET stage = 'cancelled' WHERE id = NEW.id AND stage <> 'cancelled';
  ELSIF NEW.realtor_id IS NOT NULL AND NEW.status <> 'cancelled'
        AND COALESCE(OLD.status,'') = 'cancelled' THEN
    NULL; -- reinstatement handled manually by finance
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_reverse_commission ON public.sales;
CREATE TRIGGER trg_reverse_commission AFTER UPDATE OF status ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.reverse_sale_commission();

-- ---------- 7. COMMISSION RLS: only finance/management approve or pay ----------
DROP POLICY IF EXISTS "commissions_select" ON public.commissions;
DROP POLICY IF EXISTS "commissions_write" ON public.commissions;
DROP POLICY IF EXISTS "commissions_manage" ON public.commissions;
DROP POLICY IF EXISTS "Staff manage commissions" ON public.commissions;
DROP POLICY IF EXISTS "Realtors view own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Finance manages commissions" ON public.commissions;
DROP POLICY IF EXISTS "commissions_read" ON public.commissions;
DROP POLICY IF EXISTS "commissions_insert" ON public.commissions;
DROP POLICY IF EXISTS "commissions_update" ON public.commissions;
DROP POLICY IF EXISTS "commissions_delete" ON public.commissions;

CREATE POLICY "commissions_read" ON public.commissions FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR realtor_id = public.my_realtor_id());
CREATE POLICY "commissions_insert" ON public.commissions FOR INSERT TO authenticated
  WITH CHECK (public.can_finance(auth.uid()));
CREATE POLICY "commissions_update" ON public.commissions FOR UPDATE TO authenticated
  USING (public.can_finance(auth.uid())) WITH CHECK (public.can_finance(auth.uid()));
CREATE POLICY "commissions_delete" ON public.commissions FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) AND status = 'pending');

-- block hard-delete of paid commissions
CREATE OR REPLACE FUNCTION public.block_paid_commission_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status IN ('paid','payable','approved') OR COALESCE(OLD.amount_paid,0) > 0 THEN
    RAISE EXCEPTION 'Approved or paid commissions cannot be deleted. Reverse them instead.';
  END IF;
  RETURN OLD;
END; $$;
DROP TRIGGER IF EXISTS trg_block_commission_delete ON public.commissions;
CREATE TRIGGER trg_block_commission_delete BEFORE DELETE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.block_paid_commission_delete();

-- stamp approval / payable / paid timestamps
CREATE OR REPLACE FUNCTION public.stamp_commission_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.approved_at IS NULL THEN
    NEW.approved_at := now(); NEW.approved_by := COALESCE(NEW.approved_by, auth.uid());
  END IF;
  IF NEW.status = 'payable' AND NEW.payable_at IS NULL THEN NEW.payable_at := now(); END IF;
  IF NEW.status = 'paid' THEN
    NEW.paid_at := COALESCE(NEW.paid_at, now());
    NEW.amount_paid := CASE WHEN COALESCE(NEW.amount_paid,0) = 0 THEN NEW.amount ELSE NEW.amount_paid END;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_stamp_commission ON public.commissions;
CREATE TRIGGER trg_stamp_commission BEFORE INSERT OR UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.stamp_commission_status();

-- =====================================================================
-- 8. RESERVATION EXPIRY
-- =====================================================================
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS expired_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_at timestamptz;

CREATE TABLE public.reservation_expiry_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  reservation_ref text,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  realtor_id uuid REFERENCES public.realtors(id) ON DELETE SET NULL,
  expiry_date date,
  action text NOT NULL,
  property_released boolean NOT NULL DEFAULT false,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reservation_expiry_log TO authenticated;
GRANT ALL ON public.reservation_expiry_log TO service_role;
ALTER TABLE public.reservation_expiry_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expiry_log_read" ON public.reservation_expiry_log FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE INDEX idx_expiry_log_created ON public.reservation_expiry_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.expire_due_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; n integer := 0; released boolean; ruser uuid; mgr record;
BEGIN
  FOR r IN
    SELECT * FROM public.reservations
    WHERE status = 'active'
      AND expiry_date IS NOT NULL
      AND expiry_date < (now() AT TIME ZONE 'Africa/Lagos')::date
      AND sale_id IS NULL
  LOOP
    -- never expire a reservation that already produced a sale
    IF EXISTS (SELECT 1 FROM public.sales s
               WHERE s.property_id = r.property_id AND s.customer_id = r.customer_id
                 AND s.status <> 'cancelled') THEN
      UPDATE public.reservations SET status='converted', updated_at=now() WHERE id = r.id;
      INSERT INTO public.reservation_expiry_log(reservation_id, reservation_ref, property_id, customer_id, realtor_id, expiry_date, action, property_released, detail)
      VALUES (r.id, r.ref, r.property_id, r.customer_id, r.realtor_id, r.expiry_date, 'skipped_converted', false, 'Reservation has a valid sale; marked converted instead of expired.');
      CONTINUE;
    END IF;

    UPDATE public.reservations
      SET status='expired', expired_at=now(), released_at=now(), updated_at=now()
      WHERE id = r.id;

    released := false;
    UPDATE public.properties
      SET status='available', customer_id=NULL, reservation_date=NULL, updated_at=now()
      WHERE id = r.property_id AND status = 'reserved';
    IF FOUND THEN released := true; END IF;

    INSERT INTO public.reservation_expiry_log(reservation_id, reservation_ref, property_id, customer_id, realtor_id, expiry_date, action, property_released, detail)
    VALUES (r.id, r.ref, r.property_id, r.customer_id, r.realtor_id, r.expiry_date, 'expired', released,
            CASE WHEN released THEN 'Plot released back to available.' ELSE 'Plot not released (status was not reserved).' END);

    INSERT INTO public.audit_logs(user_id, user_email, action, table_name, record_id, previous_value, new_value)
    VALUES (NULL, 'system@ndos', 'reservation_expired', 'reservations', r.id,
            jsonb_build_object('status','active'), jsonb_build_object('status','expired','property_released',released));

    SELECT user_id INTO ruser FROM public.realtors WHERE id = r.realtor_id;
    IF ruser IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, body, type, link)
      VALUES (ruser, 'Reservation expired',
              'Reservation ' || r.ref || ' expired on ' || r.expiry_date || '. The plot has been released.',
              'warning', '/reservations');
    END IF;

    FOR mgr IN SELECT user_id FROM public.user_roles WHERE role IN ('super_admin','management','sales_manager') LOOP
      INSERT INTO public.notifications(user_id, title, body, type, link)
      VALUES (mgr.user_id, 'Reservation expired',
              'Reservation ' || r.ref || ' expired and the plot was ' || CASE WHEN released THEN 'released.' ELSE 'not released.' END,
              'warning', '/reservations');
    END LOOP;

    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.expire_due_reservations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_due_reservations() TO service_role;

-- =====================================================================
-- 9. PAYMENT SCHEDULE STATUS ENGINE
-- =====================================================================
ALTER TABLE public.payment_schedule
  ADD COLUMN IF NOT EXISTS waived_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_refreshed_at timestamptz;

ALTER TABLE public.payment_schedule DROP CONSTRAINT IF EXISTS payment_schedule_status_check;
ALTER TABLE public.payment_schedule ADD CONSTRAINT payment_schedule_status_check CHECK (status IN
  ('upcoming','due','partially_paid','paid','overdue','waived','reversed','pending','partial'));

CREATE OR REPLACE FUNCTION public.schedule_status(_due date, _due_amt numeric, _paid numeric)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _paid >= _due_amt THEN 'paid'
    WHEN _due < (now() AT TIME ZONE 'Africa/Lagos')::date THEN 'overdue'
    WHEN _paid > 0 THEN 'partially_paid'
    WHEN _due = (now() AT TIME ZONE 'Africa/Lagos')::date THEN 'due'
    ELSE 'upcoming'
  END;
$$;

-- recompute from VERIFIED payments only; never mutates payments
CREATE OR REPLACE FUNCTION public.recalc_schedule()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sale uuid; remaining numeric; r record; alloc numeric; total_due numeric; paid_total numeric;
BEGIN
  v_sale := COALESCE(NEW.sale_id, OLD.sale_id);
  IF v_sale IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(amount),0) INTO remaining
    FROM public.payments WHERE sale_id = v_sale AND status = 'verified';
  paid_total := remaining;

  FOR r IN SELECT * FROM public.payment_schedule
           WHERE sale_id = v_sale AND status NOT IN ('waived','reversed')
           ORDER BY installment_no LOOP
    alloc := LEAST(remaining, r.amount_due);
    IF alloc < 0 THEN alloc := 0; END IF;
    UPDATE public.payment_schedule
      SET amount_paid = alloc,
          status = public.schedule_status(r.due_date, r.amount_due, alloc),
          status_refreshed_at = now()
      WHERE id = r.id;
    remaining := remaining - alloc;
  END LOOP;

  SELECT COALESCE(SUM(amount_due),0) INTO total_due
    FROM public.payment_schedule WHERE sale_id = v_sale AND status <> 'reversed';

  UPDATE public.sales s
    SET stage = CASE
        WHEN s.status = 'cancelled' THEN 'cancelled'
        WHEN s.stage IN ('allocated','closed','ready_for_allocation','documentation') THEN s.stage
        WHEN total_due > 0 AND paid_total >= total_due THEN 'fully_paid'
        ELSE 'payment_in_progress' END
    WHERE s.id = v_sale;

  RETURN COALESCE(NEW, OLD);
END; $$;

-- new schedules start as upcoming
CREATE OR REPLACE FUNCTION public.generate_payment_schedule()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pl record; i int; step interval; running numeric := 0; amt numeric; n int; dep numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM public.payment_schedule WHERE sale_id = NEW.id) THEN RETURN NEW; END IF;

  IF NEW.payment_plan_id IS NULL THEN
    INSERT INTO public.payment_schedule (sale_id, customer_id, installment_no, label, due_date, amount_due, status, created_by)
    VALUES (NEW.id, NEW.customer_id, 1, 'Full Payment', NEW.sale_date, NEW.total_payable,
            public.schedule_status(NEW.sale_date, NEW.total_payable, 0), NEW.created_by);
    RETURN NEW;
  END IF;

  SELECT * INTO pl FROM public.payment_plans WHERE id = NEW.payment_plan_id;
  IF pl IS NULL THEN RETURN NEW; END IF;

  step := CASE lower(coalesce(pl.installment_frequency,'monthly'))
            WHEN 'weekly' THEN interval '1 week'
            WHEN 'quarterly' THEN interval '3 months'
            ELSE interval '1 month' END;

  dep := LEAST(coalesce(NULLIF(NEW.deposit,0), pl.initial_deposit, 0), NEW.total_payable);
  IF dep > 0 THEN
    INSERT INTO public.payment_schedule (sale_id, customer_id, installment_no, label, due_date, amount_due, status, created_by)
    VALUES (NEW.id, NEW.customer_id, 1, 'Initial Deposit', NEW.sale_date, dep,
            public.schedule_status(NEW.sale_date, dep, 0), NEW.created_by);
    running := dep;
  END IF;

  n := coalesce(pl.installment_count, 0);
  IF n > 0 THEN
    FOR i IN 1..n LOOP
      IF i = n THEN
        amt := NEW.total_payable - running;
      ELSE
        amt := COALESCE(NULLIF(pl.installment_amount, 0), round((NEW.total_payable - running) / (n - i + 1), 2));
        amt := LEAST(amt, NEW.total_payable - running);
      END IF;
      IF amt <= 0 THEN CONTINUE; END IF;
      INSERT INTO public.payment_schedule (sale_id, customer_id, installment_no, label, due_date, amount_due, status, created_by)
      VALUES (NEW.id, NEW.customer_id, i + (CASE WHEN dep > 0 THEN 1 ELSE 0 END),
              'Installment ' || i, (NEW.sale_date + (step * i))::date, amt,
              public.schedule_status((NEW.sale_date + (step * i))::date, amt, 0), NEW.created_by);
      running := running + amt;
    END LOOP;
  ELSIF running < NEW.total_payable THEN
    INSERT INTO public.payment_schedule (sale_id, customer_id, installment_no, label, due_date, amount_due, status, created_by)
    VALUES (NEW.id, NEW.customer_id, 2, 'Balance', NEW.sale_date, NEW.total_payable - running,
            public.schedule_status(NEW.sale_date, NEW.total_payable - running, 0), NEW.created_by);
  END IF;

  RETURN NEW;
END; $$;

-- nightly status refresh (no payment mutation)
CREATE OR REPLACE FUNCTION public.refresh_schedule_statuses()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  WITH upd AS (
    UPDATE public.payment_schedule ps
      SET status = public.schedule_status(ps.due_date, ps.amount_due, COALESCE(ps.amount_paid,0)),
          status_refreshed_at = now()
    WHERE ps.status NOT IN ('waived','reversed')
      AND ps.status IS DISTINCT FROM public.schedule_status(ps.due_date, ps.amount_due, COALESCE(ps.amount_paid,0))
    RETURNING 1)
  SELECT count(*) INTO n FROM upd;
  RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.refresh_schedule_statuses() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_schedule_statuses() TO service_role;

-- receivables ageing view (RLS of underlying tables applies)
CREATE OR REPLACE VIEW public.v_receivables
WITH (security_invoker = on) AS
SELECT
  ps.id, ps.sale_id, ps.customer_id, ps.installment_no, ps.label, ps.due_date,
  ps.amount_due, ps.amount_paid, ps.status,
  (ps.amount_due - COALESCE(ps.amount_paid,0)) AS balance,
  GREATEST(0, ((now() AT TIME ZONE 'Africa/Lagos')::date - ps.due_date)) AS days_overdue,
  CASE
    WHEN ps.status IN ('paid','waived','reversed') THEN 'settled'
    WHEN ps.due_date >= (now() AT TIME ZONE 'Africa/Lagos')::date THEN 'current'
    WHEN ((now() AT TIME ZONE 'Africa/Lagos')::date - ps.due_date) <= 30 THEN '1_30'
    WHEN ((now() AT TIME ZONE 'Africa/Lagos')::date - ps.due_date) <= 60 THEN '31_60'
    WHEN ((now() AT TIME ZONE 'Africa/Lagos')::date - ps.due_date) <= 90 THEN '61_90'
    ELSE '90_plus' END AS ageing_bucket
FROM public.payment_schedule ps;
GRANT SELECT ON public.v_receivables TO authenticated, service_role;

-- =====================================================================
-- 10. REMINDER / NOTIFICATION QUEUE
-- =====================================================================
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_type text NOT NULL CHECK (reminder_type IN ('due_soon','due_today','overdue','custom')),
  schedule_id uuid REFERENCES public.payment_schedule(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  realtor_id uuid REFERENCES public.realtors(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('whatsapp','email','sms','in_app')),
  recipient_name text,
  recipient_address text,
  template_code text,
  message text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  delivery_status text NOT NULL DEFAULT 'queued'
    CHECK (delivery_status IN ('queued','sending','sent','delivered','failed','skipped','cancelled')),
  provider text,
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders_read" ON public.reminders FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR realtor_id = public.my_realtor_id() OR public.is_my_customer(customer_id));
CREATE POLICY "reminders_write" ON public.reminders FOR ALL TO authenticated
  USING (public.can_finance(auth.uid())) WITH CHECK (public.can_finance(auth.uid()));
CREATE TRIGGER trg_reminders_updated BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX idx_reminders_unique ON public.reminders (schedule_id, reminder_type, channel)
  WHERE schedule_id IS NOT NULL;
CREATE INDEX idx_reminders_pending ON public.reminders (delivery_status, scheduled_at);

CREATE OR REPLACE FUNCTION public.generate_payment_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0; rtype text; msg text; ch text;
BEGIN
  FOR r IN
    SELECT ps.*, c.full_name, c.whatsapp, c.phone, c.email, s.ref AS sale_ref, s.realtor_id
    FROM public.payment_schedule ps
    JOIN public.sales s ON s.id = ps.sale_id AND s.status <> 'cancelled'
    LEFT JOIN public.customers c ON c.id = ps.customer_id
    WHERE ps.status NOT IN ('paid','waived','reversed')
      AND ps.due_date <= ((now() AT TIME ZONE 'Africa/Lagos')::date + 7)
  LOOP
    rtype := CASE
      WHEN r.due_date < (now() AT TIME ZONE 'Africa/Lagos')::date THEN 'overdue'
      WHEN r.due_date = (now() AT TIME ZONE 'Africa/Lagos')::date THEN 'due_today'
      ELSE 'due_soon' END;
    ch := CASE WHEN COALESCE(r.whatsapp, r.phone) IS NOT NULL THEN 'whatsapp'
               WHEN r.email IS NOT NULL THEN 'email' ELSE 'in_app' END;
    msg := 'Hello ' || COALESCE(r.full_name,'Customer') || ', your instalment of NGN '
           || to_char(r.amount_due - COALESCE(r.amount_paid,0), 'FM999,999,999.00')
           || ' for ' || COALESCE(r.sale_ref,'your NEOMARC purchase')
           || ' is ' || CASE rtype WHEN 'overdue' THEN 'overdue since ' WHEN 'due_today' THEN 'due today, ' ELSE 'due on ' END
           || r.due_date || '.';

    INSERT INTO public.reminders
      (reminder_type, schedule_id, sale_id, customer_id, realtor_id, channel,
       recipient_name, recipient_address, template_code, message, scheduled_at, delivery_status)
    VALUES
      (rtype, r.id, r.sale_id, r.customer_id, r.realtor_id, ch,
       r.full_name, COALESCE(r.whatsapp, r.phone, r.email), 'payment_' || rtype, msg, now(), 'queued')
    ON CONFLICT (schedule_id, reminder_type, channel) DO NOTHING;
    IF FOUND THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.generate_payment_reminders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_payment_reminders() TO service_role;

-- =====================================================================
-- 11. NIGHTLY SCHEDULED OPERATIONS
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.run_nightly_operations()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a int; b int; c int;
BEGIN
  SELECT public.expire_due_reservations() INTO a;
  SELECT public.refresh_schedule_statuses() INTO b;
  SELECT public.generate_payment_reminders() INTO c;
  RETURN jsonb_build_object('reservations_expired', a, 'schedules_refreshed', b, 'reminders_queued', c, 'ran_at', now());
END; $$;
REVOKE ALL ON FUNCTION public.run_nightly_operations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_nightly_operations() TO service_role;

SELECT cron.unschedule('ndos-nightly-operations')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ndos-nightly-operations');
SELECT cron.schedule('ndos-nightly-operations', '5 0 * * *', $$SELECT public.run_nightly_operations();$$);