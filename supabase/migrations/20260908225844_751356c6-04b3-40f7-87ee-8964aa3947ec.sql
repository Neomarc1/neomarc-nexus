
-- 1. Jobs table -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_jobs (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  interval_minutes integer NOT NULL DEFAULT 1440,
  is_enabled boolean NOT NULL DEFAULT true,
  paused_at timestamptz,
  paused_reason text,
  last_run_at timestamptz,
  last_status text,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  max_attempts integer NOT NULL DEFAULT 3,
  lease_until timestamptz,
  lease_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.automation_jobs TO authenticated;
GRANT ALL ON public.automation_jobs TO service_role;
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read automation jobs" ON public.automation_jobs;
CREATE POLICY "Staff read automation jobs" ON public.automation_jobs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS trg_automation_jobs_updated ON public.automation_jobs;
CREATE TRIGGER trg_automation_jobs_updated BEFORE UPDATE ON public.automation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.automation_jobs (key, name, description, interval_minutes)
VALUES
  ('lead_followup', 'Lead follow-up', 'Creates a follow-up task when a lead''s follow-up date arrives.', 60),
  ('task_escalation', 'Task escalation', 'Marks tasks overdue, raises priority and alerts management.', 360),
  ('nightly_operations', 'Nightly operations', 'Reservation expiry, payment schedule refresh and payment reminders.', 1440)
ON CONFLICT (key) DO NOTHING;

-- 2. Run log gains queue/retry columns --------------------------------------
ALTER TABLE public.automation_runs
  ADD COLUMN IF NOT EXISTS job_key text,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_run_id uuid,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz;

CREATE INDEX IF NOT EXISTS automation_runs_retry_idx
  ON public.automation_runs (status, next_retry_at) WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS automation_runs_job_idx
  ON public.automation_runs (job_key, created_at DESC);
CREATE INDEX IF NOT EXISTS automation_jobs_due_idx
  ON public.automation_jobs (is_enabled, next_run_at);

-- 3. Execute one job body ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_automation_job(_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _key = 'lead_followup' THEN
    RETURN jsonb_build_object('tasks_created', public.generate_followup_tasks());
  ELSIF _key = 'task_escalation' THEN
    RETURN jsonb_build_object('tasks_escalated', public.escalate_overdue_tasks());
  ELSIF _key = 'nightly_operations' THEN
    RETURN public.run_nightly_operations();
  END IF;
  RAISE EXCEPTION 'Unknown automation job: %', _key;
END;
$$;
REVOKE ALL ON FUNCTION public.execute_automation_job(text) FROM PUBLIC, anon, authenticated;

-- 4. Runner ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_due_automations(_limit integer DEFAULT 5, _actor text DEFAULT 'scheduler')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job public.automation_jobs%ROWTYPE;
  _lease uuid;
  _run_id uuid;
  _result jsonb;
  _processed int := 0;
  _failed int := 0;
  _retried int := 0;
  _attempt int;
  _rec record;
BEGIN
  -- (a) due jobs, bounded per run
  FOR _job IN
    SELECT * FROM public.automation_jobs
    WHERE is_enabled AND paused_at IS NULL AND next_run_at <= now()
    ORDER BY next_run_at
    LIMIT GREATEST(_limit, 1)
  LOOP
    _lease := gen_random_uuid();

    -- single-flight lease: only one runner may claim the job
    UPDATE public.automation_jobs
       SET lease_id = _lease, lease_until = now() + interval '10 minutes'
     WHERE key = _job.key
       AND (lease_until IS NULL OR lease_until < now());
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    INSERT INTO public.automation_runs (automation, job_key, event_type, status, actor, attempts, started_at)
    VALUES (_job.key, _job.key, 'scheduled_run', 'running', _actor, 1, now())
    RETURNING id INTO _run_id;

    BEGIN
      _result := public.execute_automation_job(_job.key);
      UPDATE public.automation_runs
         SET status = 'success', result = _result, finished_at = now(), resolved_at = now()
       WHERE id = _run_id;
      UPDATE public.automation_jobs
         SET last_run_at = now(), last_status = 'success',
             next_run_at = now() + make_interval(mins => _job.interval_minutes),
             lease_until = NULL, lease_id = NULL
       WHERE key = _job.key;
      _processed := _processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.automation_runs
         SET status = 'failed', error = SQLERRM, finished_at = now(),
             next_retry_at = now() + interval '5 minutes'
       WHERE id = _run_id;
      UPDATE public.automation_jobs
         SET last_run_at = now(), last_status = 'failed',
             next_run_at = now() + make_interval(mins => _job.interval_minutes),
             lease_until = NULL, lease_id = NULL
       WHERE key = _job.key;
      _failed := _failed + 1;
    END;
  END LOOP;

  -- (b) retry failed runs whose backoff has elapsed
  FOR _rec IN
    SELECT r.id, r.job_key, r.attempts, COALESCE(j.max_attempts, 3) AS max_attempts
      FROM public.automation_runs r
      LEFT JOIN public.automation_jobs j ON j.key = r.job_key
     WHERE r.status = 'failed'
       AND r.resolved_at IS NULL
       AND r.job_key IS NOT NULL
       AND r.next_retry_at IS NOT NULL
       AND r.next_retry_at <= now()
       AND r.attempts < COALESCE(j.max_attempts, 3)
       AND COALESCE(j.paused_at IS NULL, true)
     ORDER BY r.next_retry_at
     LIMIT GREATEST(_limit, 1)
  LOOP
    _attempt := _rec.attempts + 1;
    BEGIN
      _result := public.execute_automation_job(_rec.job_key);
      UPDATE public.automation_runs
         SET status = 'success', result = _result, attempts = _attempt,
             error = NULL, finished_at = now(), resolved_at = now(), next_retry_at = NULL
       WHERE id = _rec.id;
      _retried := _retried + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.automation_runs
         SET attempts = _attempt, error = SQLERRM, finished_at = now(),
             next_retry_at = CASE WHEN _attempt >= _rec.max_attempts
                                  THEN NULL
                                  ELSE now() + make_interval(mins => 5 * power(3, _attempt)::int) END
       WHERE id = _rec.id;
      _failed := _failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('jobs_run', _processed, 'retries_succeeded', _retried, 'failures', _failed, 'at', now());
END;
$$;
REVOKE ALL ON FUNCTION public.run_due_automations(integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_due_automations(integer, text) TO service_role;

-- 5. Admin-facing controls ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.retry_automation_run(_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _rec record; _result jsonb; _attempt int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT r.id, r.job_key, r.attempts INTO _rec
    FROM public.automation_runs r WHERE r.id = _run_id AND r.status = 'failed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No failed run to retry';
  END IF;
  IF _rec.job_key IS NULL THEN
    RAISE EXCEPTION 'This run is not retryable';
  END IF;

  _attempt := _rec.attempts + 1;
  BEGIN
    _result := public.execute_automation_job(_rec.job_key);
    UPDATE public.automation_runs
       SET status = 'success', result = _result, attempts = _attempt, error = NULL,
           finished_at = now(), resolved_at = now(), next_retry_at = NULL
     WHERE id = _rec.id;
    RETURN jsonb_build_object('ok', true, 'result', _result);
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.automation_runs
       SET attempts = _attempt, error = SQLERRM, finished_at = now(),
           next_retry_at = now() + interval '15 minutes'
     WHERE id = _rec.id;
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
  END;
END;
$$;
REVOKE ALL ON FUNCTION public.retry_automation_run(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retry_automation_run(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_automation_job_paused(_key text, _paused boolean, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  UPDATE public.automation_jobs
     SET paused_at = CASE WHEN _paused THEN now() ELSE NULL END,
         paused_reason = CASE WHEN _paused THEN _reason ELSE NULL END,
         next_run_at = CASE WHEN _paused THEN next_run_at ELSE now() END
   WHERE key = _key;
END;
$$;
REVOKE ALL ON FUNCTION public.set_automation_job_paused(text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_automation_job_paused(text, boolean, text) TO authenticated;

-- Manual "run now" for admins goes through the same runner
CREATE OR REPLACE FUNCTION public.run_automations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  UPDATE public.automation_jobs SET next_run_at = now()
   WHERE is_enabled AND paused_at IS NULL;
  RETURN public.run_due_automations(10, 'manual');
END;
$$;
REVOKE ALL ON FUNCTION public.run_automations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_automations() TO authenticated;
