DROP POLICY IF EXISTS read_sources ON public.lead_sources;
CREATE POLICY read_sources ON public.lead_sources FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS read_templates ON public.message_templates;
CREATE POLICY read_templates ON public.message_templates FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS read_projects ON public.projects;
CREATE POLICY read_projects ON public.projects FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));