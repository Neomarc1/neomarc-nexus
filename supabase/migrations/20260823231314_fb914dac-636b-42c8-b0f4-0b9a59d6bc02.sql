
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON public.payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_documents_status_created ON public.documents(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_stage_updated ON public.sales(stage, updated_at);
CREATE INDEX IF NOT EXISTS idx_sales_alloc_stage ON public.sales(allocation_status, stage);
CREATE INDEX IF NOT EXISTS idx_leads_next_followup ON public.leads(next_followup_at) WHERE next_followup_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_status_due ON public.payment_schedule(status, due_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status_expiry ON public.reservations(status, expiry_date);
