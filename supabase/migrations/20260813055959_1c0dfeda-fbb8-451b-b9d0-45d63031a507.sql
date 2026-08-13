
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.my_realtor_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_my_customer(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.gen_ref(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sync_property_on_reservation() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sync_property_on_sale() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.apply_verified_payment() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.recalc_schedule() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_realtor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_customer(uuid) TO authenticated;
