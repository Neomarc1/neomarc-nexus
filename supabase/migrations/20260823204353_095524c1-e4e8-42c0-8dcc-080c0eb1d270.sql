-- 1. Finer-grained role helpers -------------------------------------------
CREATE OR REPLACE FUNCTION public.is_crm_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('super_admin','management','sales_manager','accounts','documentation'));
$$;

CREATE OR REPLACE FUNCTION public.can_view_money(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('super_admin','management','accounts','sales_manager'));
$$;

REVOKE EXECUTE ON FUNCTION public.is_crm_staff(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_money(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_crm_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_money(uuid) TO authenticated, service_role;

-- 2. CRM tables: exclude project managers ----------------------------------
DROP POLICY IF EXISTS staff_all_customers ON public.customers;
CREATE POLICY staff_all_customers ON public.customers FOR ALL TO authenticated
  USING (public.is_crm_staff(auth.uid())) WITH CHECK (public.is_crm_staff(auth.uid()));

DROP POLICY IF EXISTS staff_all_leads ON public.leads;
CREATE POLICY staff_all_leads ON public.leads FOR ALL TO authenticated
  USING (public.is_crm_staff(auth.uid())) WITH CHECK (public.is_crm_staff(auth.uid()));

DROP POLICY IF EXISTS staff_all_lead_activities ON public.lead_activities;
CREATE POLICY staff_all_lead_activities ON public.lead_activities FOR ALL TO authenticated
  USING (public.is_crm_staff(auth.uid())) WITH CHECK (public.is_crm_staff(auth.uid()));

DROP POLICY IF EXISTS staff_all_sales ON public.sales;
CREATE POLICY staff_all_sales ON public.sales FOR ALL TO authenticated
  USING (public.is_crm_staff(auth.uid())) WITH CHECK (public.is_crm_staff(auth.uid()));

DROP POLICY IF EXISTS staff_all_reservations ON public.reservations;
CREATE POLICY staff_all_reservations ON public.reservations FOR ALL TO authenticated
  USING (public.is_crm_staff(auth.uid())) WITH CHECK (public.is_crm_staff(auth.uid()));

DROP POLICY IF EXISTS staff_all_inspections ON public.inspections;
CREATE POLICY staff_all_inspections ON public.inspections FOR ALL TO authenticated
  USING (public.is_crm_staff(auth.uid())) WITH CHECK (public.is_crm_staff(auth.uid()));

DROP POLICY IF EXISTS staff_all_realtors ON public.realtors;
CREATE POLICY staff_all_realtors ON public.realtors FOR ALL TO authenticated
  USING (public.is_crm_staff(auth.uid())) WITH CHECK (public.is_crm_staff(auth.uid()));

DROP POLICY IF EXISTS staff_all_realtor_assignments ON public.realtor_assignments;
CREATE POLICY staff_all_realtor_assignments ON public.realtor_assignments FOR ALL TO authenticated
  USING (public.is_crm_staff(auth.uid())) WITH CHECK (public.is_crm_staff(auth.uid()));

-- 3. Financial records: finance + sales leadership only --------------------
DROP POLICY IF EXISTS payments_read ON public.payments;
CREATE POLICY payments_read ON public.payments FOR SELECT TO authenticated
  USING (public.can_view_money(auth.uid()));

DROP POLICY IF EXISTS schedule_read ON public.payment_schedule;
CREATE POLICY schedule_read ON public.payment_schedule FOR SELECT TO authenticated
  USING (public.can_view_money(auth.uid()));

DROP POLICY IF EXISTS commissions_read ON public.commissions;
CREATE POLICY commissions_read ON public.commissions FOR SELECT TO authenticated
  USING (public.can_view_money(auth.uid()) OR realtor_id = public.my_realtor_id());

DROP POLICY IF EXISTS expenses_read ON public.expenses;
CREATE POLICY expenses_read ON public.expenses FOR SELECT TO authenticated
  USING (public.can_view_money(auth.uid()) OR public.can_projects(auth.uid()));

-- 4. Audit log: management only -------------------------------------------
DROP POLICY IF EXISTS audit_read ON public.audit_logs;
CREATE POLICY audit_read ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 5. Ensure the business has a Super Admin ---------------------------------
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin')
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Missing foreign-key and hot-path indexes ------------------------------
CREATE INDEX IF NOT EXISTS idx_realtors_manager ON public.realtors(manager_id);
CREATE INDEX IF NOT EXISTS idx_realtors_user ON public.realtors(user_id);
CREATE INDEX IF NOT EXISTS idx_estates_project ON public.estates(project_id);
CREATE INDEX IF NOT EXISTS idx_properties_realtor ON public.properties(realtor_id);
CREATE INDEX IF NOT EXISTS idx_properties_customer ON public.properties(customer_id);
CREATE INDEX IF NOT EXISTS idx_properties_estate_status ON public.properties(estate_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_user ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_realtor ON public.customers(realtor_id);
CREATE INDEX IF NOT EXISTS idx_leads_estate ON public.leads(estate_id);
CREATE INDEX IF NOT EXISTS idx_leads_property ON public.leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_customer ON public.leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_realtor_status ON public.leads(realtor_id, status);
CREATE INDEX IF NOT EXISTS idx_lead_assign_lead ON public.realtor_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assign_realtor ON public.realtor_assignments(realtor_id);
CREATE INDEX IF NOT EXISTS idx_plans_estate ON public.payment_plans(estate_id);
CREATE INDEX IF NOT EXISTS idx_sales_estate ON public.sales(estate_id);
CREATE INDEX IF NOT EXISTS idx_sales_plan ON public.sales(payment_plan_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_realtor_status ON public.sales(realtor_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_res_estate ON public.reservations(estate_id);
CREATE INDEX IF NOT EXISTS idx_res_realtor ON public.reservations(realtor_id);
CREATE INDEX IF NOT EXISTS idx_res_sale ON public.reservations(sale_id);
CREATE INDEX IF NOT EXISTS idx_res_customer ON public.reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_property ON public.payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_schedule ON public.payments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale_status ON public.payments(sale_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_schedule_sale ON public.payment_schedule(sale_id);
CREATE INDEX IF NOT EXISTS idx_schedule_customer ON public.payment_schedule(customer_id);
CREATE INDEX IF NOT EXISTS idx_schedule_due ON public.payment_schedule(due_date, status);
CREATE INDEX IF NOT EXISTS idx_documents_sale ON public.documents(sale_id);
CREATE INDEX IF NOT EXISTS idx_documents_estate ON public.documents(estate_id);
CREATE INDEX IF NOT EXISTS idx_documents_property ON public.documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON public.documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_inspections_lead ON public.inspections(lead_id);
CREATE INDEX IF NOT EXISTS idx_inspections_customer ON public.inspections(customer_id);
CREATE INDEX IF NOT EXISTS idx_inspections_estate ON public.inspections(estate_id);
CREATE INDEX IF NOT EXISTS idx_inspections_realtor_date ON public.inspections(realtor_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON public.tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_realtor ON public.tasks(assigned_realtor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_customer ON public.tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sale ON public.tasks(sale_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON public.tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_commissions_property ON public.commissions(property_id);
CREATE INDEX IF NOT EXISTS idx_commissions_estate ON public.commissions(estate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_customer ON public.commissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_commissions_rule ON public.commissions(rule_id);
CREATE INDEX IF NOT EXISTS idx_commissions_realtor_status ON public.commissions(realtor_id, status);
CREATE INDEX IF NOT EXISTS idx_commissions_sale ON public.commissions(sale_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON public.expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_estate ON public.expenses(estate_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_comm_rules_estate ON public.commission_rules(estate_id);
CREATE INDEX IF NOT EXISTS idx_comm_rules_realtor ON public.commission_rules(realtor_id);
CREATE INDEX IF NOT EXISTS idx_expiry_log_reservation ON public.reservation_expiry_log(reservation_id);
CREATE INDEX IF NOT EXISTS idx_expiry_log_property ON public.reservation_expiry_log(property_id);
CREATE INDEX IF NOT EXISTS idx_expiry_log_customer ON public.reservation_expiry_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_expiry_log_realtor ON public.reservation_expiry_log(realtor_id);
CREATE INDEX IF NOT EXISTS idx_reminders_sale ON public.reminders(sale_id);
CREATE INDEX IF NOT EXISTS idx_reminders_customer ON public.reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_reminders_realtor ON public.reminders(realtor_id);
CREATE INDEX IF NOT EXISTS idx_reminders_schedule ON public.reminders(schedule_id);
CREATE INDEX IF NOT EXISTS idx_allocations_customer ON public.allocations(customer_id);
CREATE INDEX IF NOT EXISTS idx_allocations_estate ON public.allocations(estate_id);
CREATE INDEX IF NOT EXISTS idx_allocations_document ON public.allocations(document_id);
CREATE INDEX IF NOT EXISTS idx_allocations_sale ON public.allocations(sale_id);
CREATE INDEX IF NOT EXISTS idx_allocations_property ON public.allocations(property_id);
CREATE INDEX IF NOT EXISTS idx_checklist_item ON public.sale_closing_checklist(item_code);
CREATE INDEX IF NOT EXISTS idx_checklist_sale ON public.sale_closing_checklist(sale_id);
CREATE INDEX IF NOT EXISTS idx_referrals_direct ON public.sale_referrals(direct_realtor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_indirect ON public.sale_referrals(indirect_realtor_id);
CREATE INDEX IF NOT EXISTS idx_accrual_issues_realtor ON public.commission_accrual_issues(realtor_id);
CREATE INDEX IF NOT EXISTS idx_accrual_issues_estate ON public.commission_accrual_issues(estate_id);
CREATE INDEX IF NOT EXISTS idx_accrual_issues_sale ON public.commission_accrual_issues(sale_id);
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);