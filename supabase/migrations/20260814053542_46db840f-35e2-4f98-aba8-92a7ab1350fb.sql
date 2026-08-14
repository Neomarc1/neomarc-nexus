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

  dep := LEAST(coalesce(NULLIF(NEW.deposit,0), pl.initial_deposit, 0), NEW.total_payable);
  IF dep > 0 THEN
    INSERT INTO public.payment_schedule (sale_id, customer_id, installment_no, label, due_date, amount_due, status, created_by)
    VALUES (NEW.id, NEW.customer_id, 1, 'Initial Deposit', NEW.sale_date, dep, 'pending', NEW.created_by);
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

REVOKE EXECUTE ON FUNCTION public.gen_ref(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.gen_ref(text) TO authenticated, service_role;