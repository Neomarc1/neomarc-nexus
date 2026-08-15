-- =====================================================================
-- PHASE 2B: DOCUMENTS + STORAGE, ALLOCATIONS, CLOSING CHECKLIST, TIMELINE
-- =====================================================================

-- ---------- 1. DOCUMENT METADATA + VERSIONING ----------
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS document_group_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid,
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_category_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_category_check CHECK (category IS NULL OR category IN
  ('application_form','identification','payment_receipt','contract_of_sale','deed_of_assignment',
   'registered_survey','allocation_letter','offer_letter','other'));

CREATE INDEX IF NOT EXISTS idx_documents_group ON public.documents (document_group_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON public.documents (customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_group_version ON public.documents (document_group_id, version);

CREATE OR REPLACE FUNCTION public.version_document()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE maxv integer;
BEGIN
  SELECT COALESCE(MAX(version),0) INTO maxv FROM public.documents WHERE document_group_id = NEW.document_group_id;
  NEW.version := maxv + 1;
  NEW.is_current := true;
  NEW.uploaded_by := COALESCE(NEW.uploaded_by, auth.uid());
  NEW.uploaded_at := COALESCE(NEW.uploaded_at, now());
  UPDATE public.documents
    SET is_current = false, superseded_at = now()
    WHERE document_group_id = NEW.document_group_id AND is_current;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_version_document ON public.documents;
CREATE TRIGGER trg_version_document BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.version_document();

-- prevent silent overwrite: storage_path is immutable once set
CREATE OR REPLACE FUNCTION public.protect_document_path()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.storage_path IS NOT NULL AND NEW.storage_path IS DISTINCT FROM OLD.storage_path THEN
    RAISE EXCEPTION 'A stored file cannot be replaced in place. Upload a new version instead.';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_document_path ON public.documents;
CREATE TRIGGER trg_protect_document_path BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.protect_document_path();

-- ---------- 2. DOCUMENT ACCESS ----------
CREATE OR REPLACE FUNCTION public.can_read_document(_customer_id uuid, _document_type text, _category text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(auth.uid())
      OR public.can_docs(auth.uid())
      OR (public.can_finance(auth.uid())
          AND (COALESCE(_category,'') = 'payment_receipt' OR COALESCE(_document_type,'') = 'receipt'))
      OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = _customer_id AND c.user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.can_read_document(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_document(uuid,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_read_document_path(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.storage_path = _path
      AND public.can_read_document(d.customer_id, d.document_type, d.category)
  );
$$;
REVOKE ALL ON FUNCTION public.can_read_document_path(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_document_path(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "documents_read" ON public.documents;
DROP POLICY IF EXISTS "documents_write" ON public.documents;
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;
DROP POLICY IF EXISTS "documents_delete" ON public.documents;
DROP POLICY IF EXISTS "Docs manage documents" ON public.documents;
DROP POLICY IF EXISTS "Customers view own documents" ON public.documents;
DROP POLICY IF EXISTS "Staff view documents" ON public.documents;

CREATE POLICY "documents_read" ON public.documents FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.can_docs(auth.uid())
    OR (public.can_finance(auth.uid()) AND (COALESCE(category,'') = 'payment_receipt' OR COALESCE(document_type,'') = 'receipt'))
    OR (public.is_my_customer(customer_id) AND status IN ('issued','signed'))
  );
CREATE POLICY "documents_insert" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.can_docs(auth.uid()));
CREATE POLICY "documents_update" ON public.documents FOR UPDATE TO authenticated
  USING (public.can_docs(auth.uid())) WITH CHECK (public.can_docs(auth.uid()));
CREATE POLICY "documents_delete" ON public.documents FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ---------- 3. PRIVATE STORAGE POLICIES ----------
DROP POLICY IF EXISTS "ndos_docs_read" ON storage.objects;
DROP POLICY IF EXISTS "ndos_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "ndos_docs_update" ON storage.objects;
DROP POLICY IF EXISTS "ndos_docs_delete" ON storage.objects;

CREATE POLICY "ndos_docs_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.can_read_document_path(name));
CREATE POLICY "ndos_docs_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.can_docs(auth.uid()));
CREATE POLICY "ndos_docs_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND public.can_docs(auth.uid()));
CREATE POLICY "ndos_docs_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin(auth.uid()));

-- ---------- 4. ALLOCATIONS ----------
CREATE TABLE public.allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL DEFAULT public.gen_ref('ALL'),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  estate_id uuid REFERENCES public.estates(id) ON DELETE SET NULL,
  allocation_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Lagos')::date,
  allocation_officer uuid,
  allocation_reference text,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allocations TO authenticated;
GRANT ALL ON public.allocations TO service_role;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allocations_read" ON public.allocations FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR public.is_my_customer(customer_id));
CREATE POLICY "allocations_insert" ON public.allocations FOR INSERT TO authenticated
  WITH CHECK (public.can_docs(auth.uid()));
CREATE POLICY "allocations_update" ON public.allocations FOR UPDATE TO authenticated
  USING (public.can_docs(auth.uid())) WITH CHECK (public.can_docs(auth.uid()));
CREATE POLICY "allocations_delete" ON public.allocations FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) AND status = 'pending');
CREATE TRIGGER trg_allocations_updated BEFORE UPDATE ON public.allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX idx_allocations_one_per_sale ON public.allocations (sale_id) WHERE status <> 'cancelled';
CREATE UNIQUE INDEX idx_allocations_one_per_property ON public.allocations (property_id) WHERE status = 'completed';

CREATE OR REPLACE FUNCTION public.apply_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status,'') <> 'completed' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    NEW.allocation_officer := COALESCE(NEW.allocation_officer, auth.uid());
    UPDATE public.properties SET status = 'allocated', allocation_status = 'allocated', updated_at = now()
      WHERE id = NEW.property_id;
    UPDATE public.sales SET allocation_status = 'allocated', stage = 'allocated', updated_at = now()
      WHERE id = NEW.sale_id;
    INSERT INTO public.audit_logs(user_id, user_email, action, table_name, record_id, new_value)
    VALUES (auth.uid(), NULL, 'allocation_completed', 'allocations', NEW.id,
            jsonb_build_object('sale_id', NEW.sale_id, 'property_id', NEW.property_id));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_apply_allocation ON public.allocations;
CREATE TRIGGER trg_apply_allocation BEFORE INSERT OR UPDATE ON public.allocations
  FOR EACH ROW EXECUTE FUNCTION public.apply_allocation();

-- ---------- 5. CLOSING CHECKLIST ----------
CREATE TABLE public.closing_checklist_templates (
  code text PRIMARY KEY,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.closing_checklist_templates TO authenticated;
GRANT ALL ON public.closing_checklist_templates TO service_role;
ALTER TABLE public.closing_checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist_tpl_read" ON public.closing_checklist_templates FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "checklist_tpl_write" ON public.closing_checklist_templates FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_checklist_tpl_updated BEFORE UPDATE ON public.closing_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.closing_checklist_templates (code, label, sort_order, is_required) VALUES
  ('customer_verified','Customer verified',1,true),
  ('property_confirmed','Property confirmed',2,true),
  ('sale_agreement','Sale agreement completed',3,true),
  ('payment_completed','Required payment completed',4,true),
  ('payment_verified','Payment verified',5,true),
  ('documentation_completed','Documentation completed',6,true),
  ('deed_survey','Deed / Survey available',7,false),
  ('allocation_approved','Allocation approved',8,true),
  ('allocation_completed','Allocation completed',9,true),
  ('commission_approved','Commission approved',10,false),
  ('customer_notified','Customer notified',11,false)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE public.sale_closing_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_code text NOT NULL REFERENCES public.closing_checklist_templates(code) ON DELETE CASCADE,
  is_done boolean NOT NULL DEFAULT false,
  done_by uuid,
  done_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sale_id, item_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_closing_checklist TO authenticated;
GRANT ALL ON public.sale_closing_checklist TO service_role;
ALTER TABLE public.sale_closing_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_checklist_read" ON public.sale_closing_checklist FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "sale_checklist_write" ON public.sale_closing_checklist FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()) AND NOT public.has_role(auth.uid(),'realtor'))
  WITH CHECK (public.is_staff(auth.uid()) AND NOT public.has_role(auth.uid(),'realtor'));
CREATE TRIGGER trg_sale_checklist_updated BEFORE UPDATE ON public.sale_closing_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.stamp_checklist_item()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_done AND (TG_OP = 'INSERT' OR NOT COALESCE(OLD.is_done,false)) THEN
    NEW.done_at := now(); NEW.done_by := COALESCE(NEW.done_by, auth.uid());
  ELSIF NOT NEW.is_done THEN
    NEW.done_at := NULL; NEW.done_by := NULL;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_stamp_checklist ON public.sale_closing_checklist;
CREATE TRIGGER trg_stamp_checklist BEFORE INSERT OR UPDATE ON public.sale_closing_checklist
  FOR EACH ROW EXECUTE FUNCTION public.stamp_checklist_item();

-- close a sale (management only, all required items done)
CREATE OR REPLACE FUNCTION public.close_sale(_sale_id uuid)
RETURNS public.sales LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE missing int; s public.sales;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can close a transaction.';
  END IF;
  SELECT count(*) INTO missing
  FROM public.closing_checklist_templates t
  LEFT JOIN public.sale_closing_checklist c ON c.sale_id = _sale_id AND c.item_code = t.code
  WHERE t.is_active AND t.is_required AND COALESCE(c.is_done,false) = false;
  IF missing > 0 THEN
    RAISE EXCEPTION 'Cannot close: % required checklist item(s) outstanding.', missing;
  END IF;
  UPDATE public.sales
    SET stage = 'closed', status = 'completed', closed_at = now(), closed_by = auth.uid(), updated_at = now()
    WHERE id = _sale_id RETURNING * INTO s;
  INSERT INTO public.audit_logs(user_id, action, table_name, record_id, new_value)
  VALUES (auth.uid(), 'sale_closed', 'sales', _sale_id, jsonb_build_object('stage','closed'));
  RETURN s;
END; $$;
REVOKE ALL ON FUNCTION public.close_sale(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_sale(uuid) TO authenticated, service_role;

-- ---------- 6. TRANSACTION TIMELINE ----------
CREATE OR REPLACE FUNCTION public.sale_timeline(_sale_id uuid)
RETURNS TABLE (occurred_at timestamptz, category text, event text, actor text, detail text)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH s AS (SELECT * FROM public.sales WHERE id = _sale_id)
  SELECT l.created_at, 'lead', 'Lead created', COALESCE(p.full_name,'System'), l.full_name || ' · ' || COALESCE(l.source,'no source')
    FROM public.leads l LEFT JOIN public.profiles p ON p.id = l.created_by
    WHERE l.customer_id = (SELECT customer_id FROM s)
  UNION ALL
  SELECT ra.assigned_at, 'lead', 'Lead assigned', COALESCE(p.full_name,'System'), COALESCE(r.full_name,'Realtor')
    FROM public.realtor_assignments ra
    LEFT JOIN public.leads l ON l.id = ra.lead_id
    LEFT JOIN public.realtors r ON r.id = ra.realtor_id
    LEFT JOIN public.profiles p ON p.id = ra.assigned_by
    WHERE l.customer_id = (SELECT customer_id FROM s)
  UNION ALL
  SELECT i.created_at, 'inspection', 'Inspection ' || i.status, COALESCE(r.full_name,'—'),
         'Scheduled ' || i.scheduled_date || COALESCE(' · ' || i.outcome, '')
    FROM public.inspections i LEFT JOIN public.realtors r ON r.id = i.realtor_id
    WHERE i.customer_id = (SELECT customer_id FROM s) AND i.estate_id = (SELECT estate_id FROM s)
  UNION ALL
  SELECT rv.created_at, 'reservation', 'Reservation ' || rv.status, COALESCE(r.full_name,'—'),
         rv.ref || ' · expires ' || COALESCE(rv.expiry_date::text,'—')
    FROM public.reservations rv LEFT JOIN public.realtors r ON r.id = rv.realtor_id
    WHERE rv.property_id = (SELECT property_id FROM s)
  UNION ALL
  SELECT s.created_at, 'sale', 'Sale created', COALESCE(p.full_name,'System'),
         s.ref || ' · ' || s.total_payable::text
    FROM s LEFT JOIN public.profiles p ON p.id = s.created_by
  UNION ALL
  SELECT ps.created_at, 'schedule', 'Payment schedule created', 'System',
         COALESCE(ps.label,'Instalment') || ' · due ' || ps.due_date
    FROM public.payment_schedule ps WHERE ps.sale_id = _sale_id
  UNION ALL
  SELECT pm.created_at, 'payment', 'Payment ' || pm.status, COALESCE(p.full_name,'—'),
         pm.ref || ' · ' || pm.amount::text || COALESCE(' · ' || pm.receipt_number,'')
    FROM public.payments pm LEFT JOIN public.profiles p ON p.id = pm.created_by
    WHERE pm.sale_id = _sale_id
  UNION ALL
  SELECT d.uploaded_at, 'document', 'Document ' || d.status, COALESCE(p.full_name,'—'),
         COALESCE(d.title, d.document_type) || ' v' || d.version
    FROM public.documents d LEFT JOIN public.profiles p ON p.id = d.uploaded_by
    WHERE d.sale_id = _sale_id
  UNION ALL
  SELECT c.created_at, 'commission', 'Commission ' || c.status, COALESCE(r.full_name,'—'),
         c.ref || ' · ' || c.amount::text
    FROM public.commissions c LEFT JOIN public.realtors r ON r.id = c.realtor_id
    WHERE c.sale_id = _sale_id
  UNION ALL
  SELECT a.created_at, 'allocation', 'Allocation ' || a.status, COALESCE(p.full_name,'—'),
         a.ref || COALESCE(' · ' || a.allocation_reference,'')
    FROM public.allocations a LEFT JOIN public.profiles p ON p.id = a.allocation_officer
    WHERE a.sale_id = _sale_id
  UNION ALL
  SELECT s.closed_at, 'closing', 'Transaction closed', COALESCE(p.full_name,'—'), s.ref
    FROM s LEFT JOIN public.profiles p ON p.id = s.closed_by WHERE s.closed_at IS NOT NULL
  ORDER BY 1;
$$;
REVOKE ALL ON FUNCTION public.sale_timeline(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sale_timeline(uuid) TO authenticated, service_role;

-- ---------- 7. LOCK DOWN INTERNAL TRIGGER FUNCTIONS ----------
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.accrue_sale_commission()','public.reverse_sale_commission()','public.stamp_commission_status()',
    'public.block_paid_commission_delete()','public.version_document()','public.protect_document_path()',
    'public.apply_allocation()','public.stamp_checklist_item()','public.apply_verified_payment()',
    'public.block_payment_delete()','public.generate_payment_schedule()','public.recalc_schedule()',
    'public.handle_new_user()','public.sync_property_on_sale()','public.sync_property_on_reservation()',
    'public.update_updated_at_column()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;