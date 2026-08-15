CREATE OR REPLACE FUNCTION public.expire_due_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0; released boolean; ruser uuid; mgr record; pstatus text;
BEGIN
  FOR r IN
    SELECT * FROM public.reservations
    WHERE status = 'active' AND expiry_date IS NOT NULL
      AND expiry_date < (now() AT TIME ZONE 'Africa/Lagos')::date
      AND sale_id IS NULL
  LOOP
    IF EXISTS (SELECT 1 FROM public.sales s
               WHERE s.property_id = r.property_id AND s.customer_id = r.customer_id
                 AND s.status <> 'cancelled') THEN
      UPDATE public.reservations SET status='converted', updated_at=now() WHERE id = r.id;
      INSERT INTO public.reservation_expiry_log(reservation_id, reservation_ref, property_id, customer_id, realtor_id, expiry_date, action, property_released, detail)
      VALUES (r.id, r.ref, r.property_id, r.customer_id, r.realtor_id, r.expiry_date, 'skipped_converted', false,
              'Reservation has a valid sale; marked converted instead of expired.');
      CONTINUE;
    END IF;

    UPDATE public.reservations
      SET status='expired', expired_at=now(), released_at=now(), updated_at=now()
      WHERE id = r.id;

    UPDATE public.properties
      SET status='available', customer_id=NULL, reservation_date=NULL, updated_at=now()
      WHERE id = r.property_id AND status = 'reserved';

    SELECT status::text INTO pstatus FROM public.properties WHERE id = r.property_id;
    released := (pstatus = 'available');

    INSERT INTO public.reservation_expiry_log(reservation_id, reservation_ref, property_id, customer_id, realtor_id, expiry_date, action, property_released, detail)
    VALUES (r.id, r.ref, r.property_id, r.customer_id, r.realtor_id, r.expiry_date, 'expired', released,
            'Plot status after expiry: ' || COALESCE(pstatus,'unknown'));

    INSERT INTO public.audit_logs(user_id, user_email, action, table_name, record_id, previous_value, new_value)
    VALUES (NULL, 'system@ndos', 'reservation_expired', 'reservations', r.id,
            jsonb_build_object('status','active'), jsonb_build_object('status','expired','property_released',released));

    SELECT user_id INTO ruser FROM public.realtors WHERE id = r.realtor_id;
    IF ruser IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, body, type, link)
      VALUES (ruser, 'Reservation expired',
              'Reservation ' || r.ref || ' expired on ' || r.expiry_date || '. The plot has been released.', 'warning', '/reservations');
    END IF;

    FOR mgr IN SELECT user_id FROM public.user_roles WHERE role IN ('super_admin','management','sales_manager') LOOP
      INSERT INTO public.notifications(user_id, title, body, type, link)
      VALUES (mgr.user_id, 'Reservation expired',
              'Reservation ' || r.ref || ' expired and the plot is now ' || COALESCE(pstatus,'unknown') || '.', 'warning', '/reservations');
    END LOOP;

    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.expire_due_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_due_reservations() TO service_role;