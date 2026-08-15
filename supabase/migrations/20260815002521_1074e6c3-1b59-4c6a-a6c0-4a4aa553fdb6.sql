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
    ON CONFLICT (schedule_id, reminder_type, channel) WHERE schedule_id IS NOT NULL DO NOTHING;
    IF FOUND THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.generate_payment_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_payment_reminders() TO service_role;