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

REVOKE EXECUTE ON FUNCTION public.validate_sale_referral() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_sale_referral() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.accrue_referral_commission() FROM PUBLIC, anon, authenticated;
