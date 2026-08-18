REVOKE ALL ON public.sale_referrals FROM anon;
REVOKE ALL ON public.commission_accrual_issues FROM anon;
REVOKE ALL ON public.sale_referrals FROM authenticated;
REVOKE ALL ON public.commission_accrual_issues FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sale_referrals TO authenticated;
GRANT SELECT, UPDATE ON public.commission_accrual_issues TO authenticated;
GRANT ALL ON public.sale_referrals TO service_role;
GRANT ALL ON public.commission_accrual_issues TO service_role;