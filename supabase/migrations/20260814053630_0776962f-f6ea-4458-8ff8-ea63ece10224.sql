ALTER TABLE public.payments DISABLE TRIGGER trg_block_payment_delete;

DELETE FROM public.payments WHERE ref LIKE 'PAY-TEST-%';
DELETE FROM public.payment_schedule WHERE sale_id IN (SELECT id FROM public.sales WHERE ref LIKE 'SAL-TEST-%');
UPDATE public.properties SET status='available', customer_id=NULL, realtor_id=NULL, sale_date=NULL, reservation_date=NULL, allocation_status='pending'
  WHERE id IN (SELECT property_id FROM public.sales WHERE ref LIKE 'SAL-TEST-%'
               UNION SELECT property_id FROM public.reservations WHERE ref LIKE 'RSV-TEST-%');
DELETE FROM public.reservations WHERE ref LIKE 'RSV-TEST-%';
DELETE FROM public.sales WHERE ref LIKE 'SAL-TEST-%';
DELETE FROM public.customers WHERE ref LIKE 'CUS-TEST-%';
DELETE FROM public.realtors WHERE ref LIKE 'RLT-TEST-%';

ALTER TABLE public.payments ENABLE TRIGGER trg_block_payment_delete;