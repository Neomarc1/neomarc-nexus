REVOKE ALL ON FUNCTION public.is_crm_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_money(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_crm_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_money(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.run_nightly_operations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_schedule_statuses() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_commission_rule(uuid, text, uuid, text, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_commission_rule(uuid, text, uuid, text, date, referral_type) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_nightly_operations() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_schedule_statuses() TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_commission_rule(uuid, text, uuid, text, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_commission_rule(uuid, text, uuid, text, date, referral_type) TO service_role;