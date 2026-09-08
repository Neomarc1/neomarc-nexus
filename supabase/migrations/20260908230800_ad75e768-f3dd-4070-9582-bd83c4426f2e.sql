CREATE OR REPLACE FUNCTION public.replay_automation_run(_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _rec record; _root uuid; _new uuid; _result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT r.* INTO _rec FROM public.automation_runs r WHERE r.id = _run_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Run not found';
  END IF;
  IF _rec.job_key IS NULL THEN
    RAISE EXCEPTION 'This run cannot be replayed';
  END IF;

  _root := COALESCE(_rec.parent_run_id, _rec.id);

  INSERT INTO public.automation_runs
    (automation, event_type, source_table, source_record_id, status, result, actor,
     attempts, job_key, parent_run_id, started_at)
  VALUES
    (_rec.automation, _rec.event_type, _rec.source_table, _rec.source_record_id, 'running',
     jsonb_build_object('replay_of', _rec.id, 'input', COALESCE(_rec.result -> 'input', '{}'::jsonb)),
     'replay', 1, _rec.job_key, _root, now())
  RETURNING id INTO _new;

  BEGIN
    _result := public.execute_automation_job(_rec.job_key);
    UPDATE public.automation_runs
       SET status = 'success',
           result = jsonb_build_object('replay_of', _rec.id, 'input', COALESCE(_rec.result -> 'input', '{}'::jsonb)) || _result,
           error = NULL, finished_at = now(), resolved_at = now()
     WHERE id = _new;
    RETURN jsonb_build_object('ok', true, 'run_id', _new, 'result', _result);
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.automation_runs
       SET status = 'failed', error = SQLERRM, finished_at = now(),
           next_retry_at = now() + interval '15 minutes'
     WHERE id = _new;
    RETURN jsonb_build_object('ok', false, 'run_id', _new, 'error', SQLERRM);
  END;
END;
$function$;

REVOKE ALL ON FUNCTION public.replay_automation_run(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replay_automation_run(uuid) TO authenticated;