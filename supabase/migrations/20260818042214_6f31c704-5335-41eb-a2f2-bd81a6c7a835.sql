-- 1. Enum
CREATE TYPE public.referral_type AS ENUM ('direct','indirect');

-- 2. Commission columns
ALTER TABLE public.commissions
  ADD COLUMN referral_type public.referral_type NOT NULL DEFAULT 'direct',
  ADD COLUMN beneficiary_snapshot jsonb;

ALTER TABLE public.commissions
  ADD CONSTRAINT commissions_amount_nonneg
  CHECK (amount >= 0 AND amount_paid >= 0 AND amount_paid <= amount);

-- 3. Commission rule dimension
ALTER TABLE public.commission_rules
  ADD COLUMN referral_type public.referral_type;

-- 4. sale_referrals
CREATE TABLE public.sale_referrals (
  sale_id uuid PRIMARY KEY REFERENCES public.sales(id) ON DELETE RESTRICT,
  direct_realtor_id uuid NOT NULL REFERENCES public.realtors(id) ON DELETE RESTRICT,
  indirect_realtor_id uuid REFERENCES public.realtors(id) ON DELETE RESTRICT,
  locked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT sale_referrals_distinct_beneficiaries
    CHECK (indirect_realtor_id IS NULL OR indirect_realtor_id <> direct_realtor_id)
);

GRANT SELECT, INSERT, UPDATE ON public.sale_referrals TO authenticated;
GRANT ALL ON public.sale_referrals TO service_role;
ALTER TABLE public.sale_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY sale_referrals_read ON public.sale_referrals
  FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR direct_realtor_id = public.my_realtor_id()
    OR indirect_realtor_id = public.my_realtor_id()
  );

CREATE POLICY sale_referrals_insert ON public.sale_referrals
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY sale_referrals_update ON public.sale_referrals
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_sale_referrals_updated
  BEFORE UPDATE ON public.sale_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Commission accrual issues ("COMMISSION RULE MISSING")
CREATE TABLE public.commission_accrual_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
  realtor_id uuid REFERENCES public.realtors(id) ON DELETE RESTRICT,
  referral_type public.referral_type NOT NULL,
  estate_id uuid REFERENCES public.estates(id) ON DELETE SET NULL,
  reason text NOT NULL,
  detail text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_accrual_issue_open
  ON public.commission_accrual_issues (sale_id, referral_type)
  WHERE resolved_at IS NULL;

GRANT SELECT, UPDATE ON public.commission_accrual_issues TO authenticated;
GRANT ALL ON public.commission_accrual_issues TO service_role;
ALTER TABLE public.commission_accrual_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY accrual_issues_read ON public.commission_accrual_issues
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR realtor_id = public.my_realtor_id());

CREATE POLICY accrual_issues_resolve ON public.commission_accrual_issues
  FOR UPDATE TO authenticated
  USING (public.can_finance(auth.uid()))
  WITH CHECK (public.can_finance(auth.uid()));

-- 6. Indexes
CREATE UNIQUE INDEX idx_commissions_unique_type
  ON public.commissions (sale_id, referral_type)
  WHERE status <> 'reversed';
CREATE INDEX idx_commissions_sale ON public.commissions (sale_id);
CREATE INDEX idx_sale_referrals_indirect ON public.sale_referrals (indirect_realtor_id);
DROP INDEX IF EXISTS public.idx_commission_rules_lookup;
CREATE INDEX idx_commission_rules_lookup
  ON public.commission_rules (is_active, referral_type, estate_id, property_type, realtor_id);

-- 7. Rule resolution with referral type
CREATE OR REPLACE FUNCTION public.resolve_commission_rule(
  _estate_id uuid, _property_type text, _realtor_id uuid, _channel text,
  _on_date date, _referral_type public.referral_type)
RETURNS public.commission_rules
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT r.* FROM public.commission_rules r
  WHERE r.is_active
    AND (r.effective_from IS NULL OR r.effective_from <= _on_date)
    AND (r.effective_to   IS NULL OR r.effective_to   >= _on_date)
    AND (r.estate_id      IS NULL OR r.estate_id      = _estate_id)
    AND (r.property_type  IS NULL OR r.property_type  = _property_type)
    AND (r.realtor_id     IS NULL OR r.realtor_id     = _realtor_id)
    AND (r.sales_channel  IS NULL OR r.sales_channel  = _channel)
    AND (r.referral_type  IS NULL OR r.referral_type  = _referral_type)
  ORDER BY
    ((r.realtor_id IS NOT NULL)::int * 16
     + (r.estate_id IS NOT NULL)::int * 8
     + (r.property_type IS NOT NULL)::int * 4
     + (r.sales_channel IS NOT NULL)::int * 2
     + (r.referral_type IS NOT NULL)::int) DESC,
    r.priority DESC, r.effective_from DESC NULLS LAST, r.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.resolve_commission_rule(
  _estate_id uuid, _property_type text, _realtor_id uuid, _channel text, _on_date date)
RETURNS public.commission_rules
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT * FROM public.resolve_commission_rule(
    _estate_id, _property_type, _realtor_id, _channel, _on_date, 'direct'::public.referral_type);
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_commission_rule(uuid, text, uuid, text, date, public.referral_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_commission_rule(uuid, text, uuid, text, date, public.referral_type) TO authenticated, service_role;

-- 8. Shared accrual routine (no global fallback, no realtor default rate)
CREATE OR REPLACE FUNCTION public.accrue_commission_for(
  _sale_id uuid, _realtor_id uuid, _type public.referral_type)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  s public.sales;
  rl public.realtors;
  rule public.commission_rules;
  ptype text;
  v_rate numeric := 0;
  v_fixed numeric := 0;
  v_amount numeric := 0;
BEGIN
  IF _realtor_id IS NULL THEN RETURN; END IF;
  SELECT * INTO s FROM public.sales WHERE id = _sale_id;
  IF s.id IS NULL OR COALESCE(s.status,'active') = 'cancelled' THEN RETURN; END IF;

  -- safeguard: a realtor never holds two live commissions on one sale
  IF EXISTS (SELECT 1 FROM public.commissions c
             WHERE c.sale_id = _sale_id AND c.status <> 'reversed'
               AND (c.realtor_id = _realtor_id OR c.referral_type = _type)) THEN
    RETURN;
  END IF;

  SELECT * INTO rl FROM public.realtors WHERE id = _realtor_id;
  IF rl.id IS NULL OR rl.is_active IS NOT TRUE OR COALESCE(rl.status,'active') <> 'active' THEN
    INSERT INTO public.commission_accrual_issues (sale_id, realtor_id, referral_type, estate_id, reason, detail)
    VALUES (_sale_id, _realtor_id, _type, s.estate_id, 'realtor_inactive',
            'Beneficiary realtor is inactive or missing; no commission accrued.')
    ON CONFLICT DO NOTHING;
    RETURN;
  END IF;

  SELECT p.property_type INTO ptype FROM public.properties p WHERE p.id = s.property_id;
  SELECT * INTO rule FROM public.resolve_commission_rule(
    s.estate_id, ptype, _realtor_id, COALESCE(s.sales_channel,'direct'), s.sale_date, _type);

  IF rule.id IS NULL THEN
    INSERT INTO public.commission_accrual_issues (sale_id, realtor_id, referral_type, estate_id, reason, detail)
    VALUES (_sale_id, _realtor_id, _type, s.estate_id, 'rule_missing',
            'COMMISSION RULE MISSING: no active ' || _type::text ||
            ' commission rule applies to this estate/property/channel. Commission was NOT accrued.')
    ON CONFLICT DO NOTHING;
    RETURN;
  END IF;

  v_rate  := COALESCE(rule.rate, 0);
  v_fixed := COALESCE(rule.fixed_amount, 0);
  v_amount := ROUND(COALESCE(s.total_payable,0) * v_rate / 100.0, 2) + v_fixed;

  -- A valid rule exists: the row is created even when it computes to zero,
  -- so "₦0 commission" stays distinct from "COMMISSION RULE MISSING".
  INSERT INTO public.commissions
    (ref, realtor_id, sale_id, customer_id, estate_id, property_id, rule_id,
     sale_value, rate, fixed_component, amount, amount_paid, status, is_auto,
     referral_type, beneficiary_snapshot, created_by)
  VALUES
    (public.gen_ref('COM'), _realtor_id, s.id, s.customer_id, s.estate_id, s.property_id, rule.id,
     COALESCE(s.total_payable,0), v_rate, v_fixed, v_amount, 0, 'pending', true,
     _type,
     jsonb_build_object('realtor_id', rl.id, 'ref', rl.ref, 'full_name', rl.full_name,
                        'rule_id', rule.id, 'rule_name', rule.name, 'rate', v_rate,
                        'fixed_amount', v_fixed, 'referral_type', _type::text,
                        'accrued_at', now()),
     s.created_by);

  UPDATE public.sale_referrals SET locked_at = COALESCE(locked_at, now()) WHERE sale_id = s.id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.accrue_commission_for(uuid, uuid, public.referral_type) FROM PUBLIC, anon, authenticated;

-- 9. Sale trigger: direct + optional first-level indirect
CREATE OR REPLACE FUNCTION public.accrue_sale_commission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE sr public.sale_referrals;
BEGIN
  IF COALESCE(NEW.status,'active') = 'cancelled' THEN RETURN NEW; END IF;
  IF NEW.realtor_id IS NOT NULL THEN
    PERFORM public.accrue_commission_for(NEW.id, NEW.realtor_id, 'direct');
  END IF;
  SELECT * INTO sr FROM public.sale_referrals WHERE sale_id = NEW.id;
  IF sr.indirect_realtor_id IS NOT NULL AND sr.indirect_realtor_id <> COALESCE(NEW.realtor_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    PERFORM public.accrue_commission_for(NEW.id, sr.indirect_realtor_id, 'indirect');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.accrue_referral_commission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.accrue_commission_for(NEW.sale_id, NEW.direct_realtor_id, 'direct');
  IF NEW.indirect_realtor_id IS NOT NULL THEN
    PERFORM public.accrue_commission_for(NEW.sale_id, NEW.indirect_realtor_id, 'indirect');
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_accrue_referral
  AFTER INSERT OR UPDATE OF direct_realtor_id, indirect_realtor_id ON public.sale_referrals
  FOR EACH ROW EXECUTE FUNCTION public.accrue_referral_commission();

-- 10. Referral validation + immutability
CREATE OR REPLACE FUNCTION public.validate_sale_referral()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE s public.sales; rl public.realtors;
BEGIN
  SELECT * INTO s FROM public.sales WHERE id = NEW.sale_id;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Sale % does not exist', NEW.sale_id; END IF;
  IF s.realtor_id IS NULL OR NEW.direct_realtor_id <> s.realtor_id THEN
    RAISE EXCEPTION 'Direct referrer must match the realtor on the sale';
  END IF;
  IF NEW.indirect_realtor_id IS NOT NULL AND NEW.indirect_realtor_id = NEW.direct_realtor_id THEN
    RAISE EXCEPTION 'A realtor cannot be both the direct and the indirect referrer on the same sale';
  END IF;

  FOREACH rl IN ARRAY ARRAY[]::public.realtors[] LOOP NULL; END LOOP; -- no-op placeholder

  SELECT * INTO rl FROM public.realtors WHERE id = NEW.direct_realtor_id;
  IF rl.id IS NULL OR rl.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Direct referrer must be an existing active realtor';
  END IF;
  IF NEW.indirect_realtor_id IS NOT NULL THEN
    SELECT * INTO rl FROM public.realtors WHERE id = NEW.indirect_realtor_id;
    IF rl.id IS NULL OR rl.is_active IS NOT TRUE THEN
      RAISE EXCEPTION 'Indirect referrer must be an existing active realtor';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.sale_id <> OLD.sale_id THEN
      RAISE EXCEPTION 'A referral cannot be moved to another sale';
    END IF;
    IF NEW.direct_realtor_id IS DISTINCT FROM OLD.direct_realtor_id
       AND EXISTS (SELECT 1 FROM public.commissions c
                   WHERE c.sale_id = OLD.sale_id AND c.realtor_id = OLD.direct_realtor_id
                     AND c.status <> 'reversed') THEN
      RAISE EXCEPTION 'Direct beneficiary is locked: reverse the existing commission before changing it';
    END IF;
    IF NEW.indirect_realtor_id IS DISTINCT FROM OLD.indirect_realtor_id
       AND OLD.indirect_realtor_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.commissions c
                   WHERE c.sale_id = OLD.sale_id AND c.realtor_id = OLD.indirect_realtor_id
                     AND c.status <> 'reversed') THEN
      RAISE EXCEPTION 'Indirect beneficiary is locked: reverse the existing commission before changing it';
    END IF;
    IF (NEW.direct_realtor_id IS DISTINCT FROM OLD.direct_realtor_id
        OR NEW.indirect_realtor_id IS DISTINCT FROM OLD.indirect_realtor_id)
       AND OLD.locked_at IS NOT NULL
       AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Referral is locked; only an administrator may correct it';
    END IF;
    NEW.updated_by := auth.uid();
  ELSE
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_sale_referral
  BEFORE INSERT OR UPDATE ON public.sale_referrals
  FOR EACH ROW EXECUTE FUNCTION public.validate_sale_referral();

CREATE OR REPLACE FUNCTION public.audit_sale_referral()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, previous_value, new_value)
  VALUES (
    auth.uid(),
    (SELECT email FROM public.profiles WHERE id = auth.uid()),
    CASE WHEN TG_OP = 'INSERT' THEN 'sale_referral_set' ELSE 'sale_referral_changed' END,
    'sale_referrals', NEW.sale_id,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW));
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_audit_sale_referral
  AFTER INSERT OR UPDATE ON public.sale_referrals
  FOR EACH ROW EXECUTE FUNCTION public.audit_sale_referral();

-- 11. Beneficiary/amount immutability once approved
CREATE OR REPLACE FUNCTION public.block_locked_commission_change()
RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IN ('approved','payable','paid') THEN
    IF NEW.realtor_id IS DISTINCT FROM OLD.realtor_id
       OR NEW.referral_type IS DISTINCT FROM OLD.referral_type
       OR NEW.sale_id IS DISTINCT FROM OLD.sale_id
       OR NEW.rate IS DISTINCT FROM OLD.rate
       OR NEW.amount IS DISTINCT FROM OLD.amount THEN
      RAISE EXCEPTION 'Beneficiary, rate and amount are immutable once a commission is approved, payable or paid. Reverse it instead.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_block_locked_commission_change
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.block_locked_commission_change();

-- 12. Reversal note now records referral type (behaviour otherwise unchanged)
CREATE OR REPLACE FUNCTION public.reverse_sale_commission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND COALESCE(OLD.status,'') <> 'cancelled' THEN
    UPDATE public.commissions
      SET status = 'reversed',
          reversed_at = now(),
          notes = COALESCE(notes,'') || ' | Auto-reversed (' || referral_type::text
                  || '): sale cancelled ' || to_char(now(),'YYYY-MM-DD')
      WHERE sale_id = NEW.id AND status <> 'reversed';
    UPDATE public.sales SET stage = 'cancelled' WHERE id = NEW.id AND stage <> 'cancelled';
  END IF;
  RETURN NEW;
END; $$;

-- 13. Estate-specific rules only (no global fallback)
INSERT INTO public.commission_rules (name, estate_id, referral_type, rate, fixed_amount, priority, is_active, notes)
SELECT 'RIKA ROYAL GARDEN — Direct referral', e.id, 'direct', 10, 0, 10, true,
       'NEOMARC policy: direct referral 10%.'
FROM public.estates e WHERE e.name = 'RIKA ROYAL GARDEN';

INSERT INTO public.commission_rules (name, estate_id, referral_type, rate, fixed_amount, priority, is_active, notes)
SELECT 'RIKA ROYAL GARDEN — Indirect referral (L1)', e.id, 'indirect', 3, 0, 10, true,
       'NEOMARC policy: first-level indirect referral 3%. Maximum indirect depth is one.'
FROM public.estates e WHERE e.name = 'RIKA ROYAL GARDEN';

INSERT INTO public.commission_rules (name, estate_id, referral_type, rate, fixed_amount, priority, is_active, notes)
SELECT 'EMERALD CITY ESTATE — Direct referral', e.id, 'direct', 10, 0, 10, true,
       'NEOMARC policy: direct referral 10%.'
FROM public.estates e WHERE e.name = 'EMERALD CITY ESTATE';

INSERT INTO public.commission_rules (name, estate_id, referral_type, rate, fixed_amount, priority, is_active, notes)
SELECT 'EMERALD CITY ESTATE — Indirect referral (L1)', e.id, 'indirect', 3, 0, 10, true,
       'NEOMARC policy: first-level indirect referral 3%. Maximum indirect depth is one.'
FROM public.estates e WHERE e.name = 'EMERALD CITY ESTATE';
