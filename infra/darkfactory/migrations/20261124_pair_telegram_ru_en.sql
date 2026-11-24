-- Supabase Journal Studio / DarkFactory, production rollout 2026-11-24.
-- When both Telegram translations are scheduled, move them atomically.
-- Keep legacy behaviour for already published, blocked, and Instagram posts.
-- No data deletion or publication is performed by applying this migration.

CREATE OR REPLACE FUNCTION public.darkfactory_reschedule_job(p_queue_id uuid, p_after timestamp with time zone)
 RETURNS darkfactory_publish_queue
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
 job public.darkfactory_publish_queue%ROWTYPE;
 twin public.darkfactory_publish_queue%ROWTYPE;
 slot timestamptz;
 other_slot timestamptz;
 step_n integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('darkfactory_queue_shared'));
 SELECT * INTO job FROM public.darkfactory_publish_queue
 WHERE id=p_queue_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Queue entry missing'; END IF;
 IF job.status NOT IN ('scheduled','blocked') THEN
  RAISE EXCEPTION 'Only unpublished jobs can be rescheduled';
 END IF;
 -- Telegram RU and EN are different translations of ONE fact. If both are
 -- pending, their schedule is atomic; never push only one language away.
 IF job.status='scheduled' AND job.destination IN ('telegram_ru','telegram_en') THEN
  SELECT * INTO twin FROM public.darkfactory_publish_queue
  WHERE item_id=job.item_id AND destination IN ('telegram_ru','telegram_en')
    AND destination<>job.destination AND status='scheduled'
  FOR UPDATE;
  IF twin.id IS NOT NULL THEN
   UPDATE public.darkfactory_publish_queue SET status='cancelled'
   WHERE id IN (job.id,twin.id);
   slot=public.darkfactory_next_editorial_slot(job.destination,p_after,job.item_id);
   other_slot=public.darkfactory_next_editorial_slot(twin.destination,p_after,job.item_id);
   slot=GREATEST(slot,other_slot);
   FOR step_n IN 1..3 LOOP
    other_slot=public.darkfactory_next_editorial_slot(twin.destination,slot,job.item_id);
    slot=GREATEST(slot,other_slot);
    other_slot=public.darkfactory_next_editorial_slot(job.destination,slot,job.item_id);
    IF other_slot<=slot THEN EXIT; END IF;
    slot=other_slot;
   END LOOP;
   UPDATE public.darkfactory_publish_queue
   SET status='scheduled',run_at=slot,updated_at=now(),error=NULL
   WHERE id IN (job.id,twin.id);
   SELECT * INTO job FROM public.darkfactory_publish_queue WHERE id=p_queue_id;
   RETURN job;
  END IF;
 END IF;
 -- Other platforms and unpaired legacy jobs preserve the old behaviour.
 UPDATE public.darkfactory_publish_queue SET status='cancelled' WHERE id=p_queue_id;
 slot=public.darkfactory_next_editorial_slot(job.destination,p_after,job.item_id);
 UPDATE public.darkfactory_publish_queue SET status=job.status,run_at=slot,updated_at=now()
 WHERE id=p_queue_id RETURNING * INTO job;
 RETURN job;
END
$function$
;
