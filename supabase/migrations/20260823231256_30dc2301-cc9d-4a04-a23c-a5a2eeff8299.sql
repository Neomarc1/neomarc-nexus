
DROP POLICY IF EXISTS "expenses_read" ON public.expenses;
CREATE POLICY "expenses_read" ON public.expenses FOR SELECT TO authenticated
  USING (public.can_view_money(auth.uid()));
