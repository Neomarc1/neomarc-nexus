
-- 1. Task engine columns
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS source_table text,
  ADD COLUMN IF NOT EXISTS source_record_id uuid,
  ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_auto boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_auto_open_unique
  ON public.tasks (source_table, source_record_id, category)
  WHERE is_auto AND status IN ('todo','in_progress');

CREATE INDEX IF NOT EXISTS tasks_status_due_idx ON public.tasks (status, due_date);

-- 2. Automation run log
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation text NOT NULL,
  event_type text NOT NULL,
  source_table text,
  source_record_id uuid,
  status text NOT NULL DEFAULT 'success',
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  actor text NOT NULL DEFAULT 'system',
  attempts integer NOT NULL DEFAULT 1,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.automation_runs TO authenticated;
GRANT ALL ON public.automation_runs TO service_role;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read automation runs" ON public.automation_runs;
CREATE POLICY "Staff read automation runs" ON public.automation_runs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS automation_runs_created_idx ON public.automation_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS automation_runs_status_idx ON public.automation_runs (status, created_at DESC);

-- 3. Settings defaults
INSERT INTO public.system_settings (key, value)
VALUES ('automation_settings', jsonb_build_object(
  'lead_response_hours', 24,
  'followup_task_lead_days', 0,
  'task_escalation_days', 2,
  'dormant_lead_days', 30,
  'enable_lead_automation', true,
  'enable_task_escalation', true
))
ON CONFLICT (key) DO NOTHING;

-- 4. Helpers
CREATE OR REPLACE FUNCTION public.automation_setting(_key text, _default numeric)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((value ->> _key)::numeric, _default)
  FROM public.system_settings WHERE key = 'automation_settings'
  UNION ALL SELECT _default
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.log_automation(
  _automation text, _event text, _table text, _record uuid,
  _status text DEFAULT 'success', _result jsonb DEFAULT '{}'::jsonb, _error text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.automation_runs (automation, event_type, source_table, source_record_id, status, result, error)
  VALUES (_automation, _event, _table, _record, _status, COALESCE(_result,'{}'::jsonb), _error)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_user(_user uuid, _title text, _body text, _type text, _link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (_user, _title, _body, _type, _link);
END; $$;

-- 5. Lead automation trigger
CREATE OR REPLACE FUNCTION public.automate_new_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _hours numeric := public.automation_setting('lead_response_hours', 24);
  _owner uuid;
  _task_id uuid;
BEGIN
  IF NOT COALESCE((SELECT (value ->> 'enable_lead_automation')::boolean FROM public.system_settings WHERE key='automation_settings'), true) THEN
    RETURN NEW;
  END IF;

  IF NEW.next_followup_at IS NULL THEN
    UPDATE public.leads SET next_followup_at = now() + make_interval(hours => _hours::int)
    WHERE id = NEW.id;
  END IF;

  SELECT user_id INTO _owner FROM public.realtors WHERE id = NEW.realtor_id;

  INSERT INTO public.tasks (title, description, category, priority, due_date,
                            lead_id, assigned_realtor_id, assigned_to,
                            source_table, source_record_id, is_auto)
  VALUES ('First contact: ' || NEW.full_name,
          'Automatically created when the lead was captured' ||
            CASE WHEN NEW.source IS NOT NULL THEN ' from ' || NEW.source ELSE '' END || '.',
          'followup', 'high',
          (now() + make_interval(hours => _hours::int))::date,
          NEW.id, NEW.realtor_id, _owner, 'leads', NEW.id, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO _task_id;

  INSERT INTO public.lead_activities (lead_id, activity_type, summary, occurred_at, status, next_action, next_action_at)
  VALUES (NEW.id, 'system', 'Lead captured and queued for first contact.', now(), 'completed',
          'First contact call', now() + make_interval(hours => _hours::int));

  PERFORM public.notify_user(_owner, 'New lead assigned: ' || NEW.full_name,
    'Make first contact within ' || _hours::int || ' hours.', 'lead', '/my-work/leads/' || NEW.id);

  PERFORM public.log_automation('lead_intake', 'lead_created', 'leads', NEW.id, 'success',
    jsonb_build_object('task_id', _task_id, 'owner', _owner, 'response_hours', _hours));

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM public.log_automation('lead_intake', 'lead_created', 'leads', NEW.id, 'failed', '{}'::jsonb, SQLERRM);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_automate_new_lead ON public.leads;
CREATE TRIGGER trg_automate_new_lead AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.automate_new_lead();

-- 6. Follow-up task generation
CREATE OR REPLACE FUNCTION public.generate_followup_tasks()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer := 0; r record; _owner uuid;
BEGIN
  FOR r IN
    SELECT l.* FROM public.leads l
    WHERE l.status NOT IN ('closed_won','closed_lost')
      AND l.next_followup_at IS NOT NULL
      AND l.next_followup_at <= now()
      AND NOT EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.lead_id = l.id AND t.is_auto
          AND t.category = 'followup' AND t.status IN ('todo','in_progress'))
  LOOP
    SELECT user_id INTO _owner FROM public.realtors WHERE id = r.realtor_id;
    INSERT INTO public.tasks (title, description, category, priority, due_date,
                              lead_id, assigned_realtor_id, assigned_to,
                              source_table, source_record_id, is_auto)
    VALUES ('Follow up: ' || r.full_name, 'Follow-up date reached for this lead.',
            'followup', CASE WHEN r.temperature = 'hot' THEN 'high' ELSE 'medium' END,
            (now())::date, r.id, r.realtor_id, _owner, 'leads', r.id, true)
    ON CONFLICT DO NOTHING;
    PERFORM public.notify_user(_owner, 'Follow-up due: ' || r.full_name,
      'This lead is due for a follow-up today.', 'lead', '/my-work/leads/' || r.id);
    _n := _n + 1;
  END LOOP;
  PERFORM public.log_automation('lead_followup', 'followup_tasks_generated', NULL, NULL, 'success',
    jsonb_build_object('tasks_created', _n));
  RETURN _n;
EXCEPTION WHEN OTHERS THEN
  PERFORM public.log_automation('lead_followup', 'followup_tasks_generated', NULL, NULL, 'failed', '{}'::jsonb, SQLERRM);
  RETURN _n;
END; $$;

-- 7. Task escalation
CREATE OR REPLACE FUNCTION public.escalate_overdue_tasks()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer := 0; _days numeric := public.automation_setting('task_escalation_days', 2); r record; m record;
BEGIN
  UPDATE public.tasks SET status = 'overdue', updated_at = now()
  WHERE status = 'todo' AND due_date IS NOT NULL AND due_date < current_date;

  FOR r IN
    SELECT * FROM public.tasks
    WHERE status IN ('overdue','in_progress')
      AND due_date IS NOT NULL AND due_date < current_date
      AND (last_escalated_at IS NULL OR last_escalated_at < now() - make_interval(days => _days::int))
  LOOP
    UPDATE public.tasks
      SET escalation_level = escalation_level + 1,
          last_escalated_at = now(),
          priority = CASE WHEN escalation_level + 1 >= 2 THEN 'urgent' ELSE 'high' END,
          updated_at = now()
    WHERE id = r.id;

    PERFORM public.notify_user(r.assigned_to, 'Overdue task: ' || r.title,
      'This task passed its deadline on ' || r.due_date || '.', 'task', '/tasks');

    IF r.escalation_level + 1 >= 2 THEN
      FOR m IN SELECT user_id FROM public.user_roles WHERE role IN ('super_admin','management','sales_manager') LOOP
        PERFORM public.notify_user(m.user_id, 'Escalated task: ' || r.title,
          'Overdue since ' || r.due_date || ' and still not completed.', 'task', '/tasks');
      END LOOP;
    END IF;
    _n := _n + 1;
  END LOOP;

  PERFORM public.log_automation('task_escalation', 'tasks_escalated', NULL, NULL, 'success',
    jsonb_build_object('tasks_escalated', _n));
  RETURN _n;
EXCEPTION WHEN OTHERS THEN
  PERFORM public.log_automation('task_escalation', 'tasks_escalated', NULL, NULL, 'failed', '{}'::jsonb, SQLERRM);
  RETURN _n;
END; $$;

-- 8. Orchestrator, callable on demand by admins
CREATE OR REPLACE FUNCTION public.run_automations()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a int; b int;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  SELECT public.generate_followup_tasks() INTO a;
  SELECT public.escalate_overdue_tasks() INTO b;
  PERFORM public.log_automation('automation_batch', 'batch_completed', NULL, NULL, 'success',
    jsonb_build_object('followup_tasks', a, 'tasks_escalated', b));
  RETURN jsonb_build_object('followup_tasks', a, 'tasks_escalated', b, 'ran_at', now());
END; $$;

REVOKE ALL ON FUNCTION public.generate_followup_tasks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.escalate_overdue_tasks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_automation(text,text,text,uuid,text,jsonb,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_user(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.automate_new_lead() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_automations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_setting(text, numeric) TO authenticated;

-- 9. Fold into the existing nightly job
CREATE OR REPLACE FUNCTION public.run_nightly_operations()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a int; b int; c int; d int; e int;
BEGIN
  SELECT public.expire_due_reservations() INTO a;
  SELECT public.refresh_schedule_statuses() INTO b;
  SELECT public.generate_payment_reminders() INTO c;
  SELECT public.generate_followup_tasks() INTO d;
  SELECT public.escalate_overdue_tasks() INTO e;
  PERFORM public.log_automation('nightly_operations', 'batch_completed', NULL, NULL, 'success',
    jsonb_build_object('reservations_expired', a, 'schedules_refreshed', b, 'reminders_queued', c,
                       'followup_tasks', d, 'tasks_escalated', e));
  RETURN jsonb_build_object('reservations_expired', a, 'schedules_refreshed', b, 'reminders_queued', c,
                            'followup_tasks', d, 'tasks_escalated', e, 'ran_at', now());
END; $$;
