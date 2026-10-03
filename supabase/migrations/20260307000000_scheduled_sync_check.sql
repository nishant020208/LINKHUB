-- UnifyHub: Scheduled sync verification and status RPC
-- Provides a clean, SECURITY DEFINER inspection of pg_cron and pg_net status
-- for the Settings page.

CREATE OR REPLACE FUNCTION public.check_scheduled_sync_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, extensions
AS $$
DECLARE
  v_cron_installed BOOLEAN;
  v_net_installed BOOLEAN;
  v_job_count INT;
  v_last_run TIMESTAMPTZ;
  v_last_status TEXT;
  v_jobname TEXT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_cron_installed;
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') INTO v_net_installed;

  IF NOT v_cron_installed THEN
    RETURN jsonb_build_object(
      'active', false,
      'cron_installed', false,
      'net_installed', v_net_installed,
      'reason', 'pg_cron extension not installed',
      'last_run', null
    );
  END IF;

  SELECT count(*), max(jobname) INTO v_job_count, v_jobname 
  FROM cron.job 
  WHERE active = true AND (jobname = 'sync-all-accounts-every-15m' OR jobname ILIKE '%sync%');

  IF v_job_count = 0 THEN
    RETURN jsonb_build_object(
      'active', false,
      'cron_installed', true,
      'net_installed', v_net_installed,
      'reason', 'No active sync job in cron.job',
      'last_run', null
    );
  END IF;

  SELECT end_time, status INTO v_last_run, v_last_status
  FROM cron.job_run_details
  WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname ILIKE '%sync%')
  ORDER BY start_time DESC LIMIT 1;

  RETURN jsonb_build_object(
    'active', true,
    'cron_installed', true,
    'net_installed', v_net_installed,
    'job_name', v_jobname,
    'job_count', v_job_count,
    'last_run', v_last_run,
    'last_status', v_last_status
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'active', false,
    'error', SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_scheduled_sync_status() TO authenticated, anon;
