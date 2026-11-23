-- Applied 2026-11-23 to production Neon Portugal Journal.
-- Main Telegram and Instagram automatic publication slots: 08:00 13:00 18:00 23:00 Europe/Lisbon (DST-aware).
-- Afisha still uses its independent scheduler.
-- Pre-existing explicit 1 Dec 08:00 event remains pinned on that date.
-- Buffer Free tier: hard cap 10 scheduled posts in total per Instagram channel at once.
-- A five-minute Neon function trigger /internal/refill promotes reviewed draft IDs
-- to fixed slots without creating duplicate Instagram posts.
-- Old Instagram posts remain, no deletion/duplicate automatic republishing.
-- pr_next_portugal_publication_slot
CREATE OR REPLACE FUNCTION public.pr_next_portugal_publication_slot(p_requested timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE local_day date; day_offset integer; slot_hour integer; candidate timestamptz;
BEGIN
 IF p_requested IS NULL THEN RETURN NULL; END IF;
 local_day:=(p_requested AT TIME ZONE 'Europe/Lisbon')::date;
 FOR day_offset IN 0..366 LOOP
  FOREACH slot_hour IN ARRAY ARRAY[8,13,18,23] LOOP
   candidate:=((local_day+day_offset)+make_time(slot_hour,0,0)) AT TIME ZONE 'Europe/Lisbon';
   IF candidate >= p_requested THEN RETURN candidate; END IF;
  END LOOP;
 END LOOP;
 RAISE EXCEPTION 'No Portugal publication slot within a year';
END $function$
;

-- pr_schedule_publication
CREATE OR REPLACE FUNCTION public.pr_schedule_publication(p_item_id uuid, p_destination text, p_delay_minutes integer DEFAULT NULL::integer, p_publish_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(post_id uuid, scheduled_for timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE e public.pr_posts%ROWTYPE; last_reserved timestamptz; chosen timestamptz; inserted public.pr_posts%ROWTYPE; is_manual boolean;
BEGIN
 IF p_destination NOT IN ('main','afisha') THEN RAISE EXCEPTION 'Unsupported destination %',p_destination USING ERRCODE='22023';END IF;
 IF p_delay_minutes IS NOT NULL AND p_publish_at IS NOT NULL THEN RAISE EXCEPTION 'Choose delay or timestamp, not both' USING ERRCODE='22023';END IF;
 IF p_delay_minutes IS NOT NULL AND (p_delay_minutes<0 OR p_delay_minutes>525600) THEN RAISE EXCEPTION 'Delay must be 0..525600 minutes' USING ERRCODE='22023';END IF;
 IF p_publish_at IS NOT NULL AND p_publish_at<now()+interval '1 minute' THEN RAISE EXCEPTION 'Publish time must be at least one minute in the future' USING ERRCODE='22023';END IF;
 is_manual:=(p_delay_minutes IS NOT NULL OR p_publish_at IS NOT NULL);
 PERFORM pg_advisory_xact_lock(8412026,201);
 SELECT * INTO e FROM public.pr_posts p WHERE p.item_id=p_item_id AND p.destination_code=p_destination FOR UPDATE;
 IF FOUND THEN
   IF e.status IN ('cancelled','failed') THEN
    -- Reactivate only undelivered cancelled posts and confirmed Telegram 400 hard-failures.
    -- A transient/ambiguous send failure is NOT safe to retry automatically.
    IF e.status='failed' AND
       (coalesce(e.last_error,'') !~* '^Telegram .*400: Bad Request:'
        OR e.telegram_photo_message_id IS NOT NULL) THEN
       RAISE EXCEPTION 'Failed post requires delivery reconciliation before retry' USING ERRCODE='P0001';
    END IF;
    -- Preserve the unique item/destination row and prevent duplicate sends.
    IF e.telegram_message_id IS NOT NULL OR e.sent_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot reactivate an already delivered post' USING ERRCODE='P0001';
    END IF;
    IF is_manual THEN
      chosen:=coalesce(p_publish_at,now()+(p_delay_minutes*interval '1 minute'));
    ELSE
      SELECT max(CASE WHEN p.status='sent' THEN p.sent_at
                   ELSE coalesce(p.scheduled_for,p.created_at) END)
      INTO last_reserved FROM public.pr_posts p
      WHERE p.destination_code=p_destination
        AND p.status IN ('queued','scheduled','sending','sent')
        AND p.schedule_mode='automatic'
        AND (p.status<>'sent' OR p.sent_at>now()-interval '30 days');
      chosen:=greatest(now()+interval '2 hours',
        coalesce(last_reserved+interval '2 hours',now()+interval '2 hours'));
    END IF;
    IF p_destination='afisha' THEN chosen:=public.pr_next_afisha_publication_slot(chosen); END IF;
 IF p_destination='main' AND p_delay_minutes IS DISTINCT FROM 0 THEN
      chosen:=public.pr_next_portugal_publication_slot(chosen);
      -- Do not collide with manually selected future slots (e.g. 1 December).
      WHILE EXISTS (SELECT 1 FROM public.pr_posts occupied
                    WHERE occupied.destination_code='main'
                      AND occupied.status IN ('queued','scheduled','sending')
                      AND occupied.item_id IS DISTINCT FROM p_item_id
                      AND occupied.scheduled_for=chosen) LOOP
       chosen:=public.pr_next_portugal_publication_slot(chosen+interval '1 minute');
      END LOOP;
    END IF;
    IF e.status='failed' THEN
      INSERT INTO public.pr_telegram_retry_events
        (post_id, previous_error, previous_attempts, previous_scheduled_for, new_scheduled_for)
      VALUES (e.id,e.last_error,e.attempts,e.scheduled_for,chosen);
    END IF;
    UPDATE public.pr_posts SET
      status='queued',scheduled_for=chosen,
      schedule_mode=CASE WHEN p_delay_minutes=0 THEN 'now'
                         WHEN p_publish_at IS NOT NULL THEN 'datetime'
                         WHEN p_delay_minutes IS NOT NULL THEN 'delay'
                         ELSE 'automatic' END,
      schedule_requested_at=p_publish_at,
      schedule_delay_minutes=p_delay_minutes,
      attempts=0,last_error=NULL,
      sent_at=NULL,telegram_message_id=NULL,telegram_photo_message_id=NULL
    WHERE id=e.id;
    RETURN QUERY SELECT e.id,chosen;RETURN;
  END IF;
  IF e.status NOT IN ('queued','scheduled') THEN RAISE EXCEPTION 'Cannot reschedule %',e.status USING ERRCODE='P0001';END IF;
   IF NOT is_manual THEN RETURN QUERY SELECT e.id,e.scheduled_for;RETURN;END IF;
   chosen:=coalesce(p_publish_at,now()+(p_delay_minutes*interval '1 minute'));
   IF p_destination='afisha' THEN chosen:=public.pr_next_afisha_publication_slot(chosen); END IF;
 IF p_destination='main' AND p_delay_minutes IS DISTINCT FROM 0 THEN
      chosen:=public.pr_next_portugal_publication_slot(chosen);
      -- Do not collide with manually selected future slots (e.g. 1 December).
      WHILE EXISTS (SELECT 1 FROM public.pr_posts occupied
                    WHERE occupied.destination_code='main'
                      AND occupied.status IN ('queued','scheduled','sending')
                      AND occupied.item_id IS DISTINCT FROM p_item_id
                      AND occupied.scheduled_for=chosen) LOOP
       chosen:=public.pr_next_portugal_publication_slot(chosen+interval '1 minute');
      END LOOP;
    END IF;
   UPDATE public.pr_posts SET scheduled_for=chosen,schedule_mode=CASE WHEN p_delay_minutes=0 THEN 'now' WHEN p_publish_at IS NULL THEN 'delay' ELSE 'datetime' END,
     schedule_requested_at=p_publish_at,schedule_delay_minutes=p_delay_minutes
   WHERE id=e.id;
   RETURN QUERY SELECT e.id,chosen;RETURN;
 END IF;
 IF is_manual THEN
   chosen:=coalesce(p_publish_at,now()+(p_delay_minutes*interval '1 minute'));
 ELSE
   SELECT max(case when p.status='sent' then p.sent_at else coalesce(p.scheduled_for,p.created_at) end)
   INTO last_reserved FROM public.pr_posts p
   WHERE p.destination_code=p_destination AND p.status IN ('queued','scheduled','sending','sent')
    AND p.schedule_mode='automatic' AND (p.status<>'sent' OR p.sent_at>now()-interval '30 days');
   chosen:=greatest(now()+interval '2 hours',coalesce(last_reserved+interval '2 hours',now()+interval '2 hours'));
 END IF;
 IF p_destination='afisha' THEN chosen:=public.pr_next_afisha_publication_slot(chosen); END IF;
 IF p_destination='main' AND p_delay_minutes IS DISTINCT FROM 0 THEN
      chosen:=public.pr_next_portugal_publication_slot(chosen);
      -- Do not collide with manually selected future slots (e.g. 1 December).
      WHILE EXISTS (SELECT 1 FROM public.pr_posts occupied
                    WHERE occupied.destination_code='main'
                      AND occupied.status IN ('queued','scheduled','sending')
                      AND occupied.item_id IS DISTINCT FROM p_item_id
                      AND occupied.scheduled_for=chosen) LOOP
       chosen:=public.pr_next_portugal_publication_slot(chosen+interval '1 minute');
      END LOOP;
    END IF;
 INSERT INTO public.pr_posts(item_id,destination_code,status,scheduled_for,schedule_mode,schedule_requested_at,schedule_delay_minutes)
 VALUES(p_item_id,p_destination,'queued',chosen,
        CASE WHEN p_delay_minutes=0 THEN 'now' WHEN p_publish_at IS NOT NULL THEN 'datetime' WHEN p_delay_minutes IS NOT NULL THEN 'delay' ELSE 'automatic' END,
        p_publish_at,p_delay_minutes) RETURNING * INTO inserted;
 RETURN QUERY SELECT inserted.id,inserted.scheduled_for;
END; $function$
;

CREATE TABLE IF NOT EXISTS public.pr_instagram_waitlist_4slots (
 item_id uuid PRIMARY KEY REFERENCES public.pr_items(id),
 publication_id uuid NOT NULL REFERENCES public.pr_instagram_publications(id),
 queued_by text,
 state text NOT NULL DEFAULT 'waiting' CHECK(state IN ('waiting','dispatching','scheduled','needs_review')),
 request_mode text NOT NULL DEFAULT 'automatic',
 requested_at timestamptz NOT NULL DEFAULT now(),
 target_time timestamptz,
 buffer_post_id text,
 attempt_count integer NOT NULL DEFAULT 0,
 last_error text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pr_instagram_retrofit_20261123
 ADD COLUMN IF NOT EXISTS target_time timestamptz;


-- Main is now governed by fixed four-slot schedule; a short 30-minute
-- anti-repeat guard allows the transition after the old 2-hour cadence.
CREATE OR REPLACE FUNCTION public.pr_claim_due_telegram_post()
 RETURNS TABLE(post_id uuid, item_id uuid, destination_code text, telegram_chat_id bigint, prepared_text text, approved_image_url text, is_ai_generated boolean, attempts integer, telegram_thread_id bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
 -- Shared concurrency lock prevents concurrent Telegram calls.
 PERFORM pg_advisory_xact_lock(8412026, 201);
 -- Preserve the in-flight guard until ambiguous deliveries are reconciled.
 IF EXISTS(SELECT 1 FROM public.pr_posts p WHERE p.status='sending') THEN
  RETURN;
 END IF;
 -- Afisha quiet hours (Lisbon): 00:00-08:00 with a two-minute send safety margin.
 -- Main continues to use the Lisbon time zone (automatic DST handling).
 RETURN QUERY
 WITH todo AS MATERIALIZED (
  SELECT p.id, q.post_id, q.item_id, q.destination_code,
         q.telegram_chat_id, q.prepared_text, q.approved_image_url,
         EXISTS(
          SELECT 1 FROM public.pr_media_assets a
          WHERE a.item_id=p.item_id AND a.public_url=q.approved_image_url
            AND a.status='approved' AND a.media_type='generated_illustration'
         ) AS ai_image
  FROM public.pr_posts p
  JOIN public.pr_telegram_delivery_queue q ON q.post_id=p.id
  WHERE p.status='scheduled' AND p.scheduled_for IS NOT NULL
    AND p.scheduled_for <= now() AND q.approved_image_url IS NOT NULL
    AND (
      p.destination_code='afisha' AND (now() AT TIME ZONE 'Europe/Lisbon')::time >= time '08:00'
         AND (now() AT TIME ZONE 'Europe/Lisbon')::time < time '23:58'
      OR (p.destination_code='main'
          AND (p.schedule_mode='now' OR ((now() AT TIME ZONE 'Europe/Lisbon')::time >= time '08:00'
          AND (now() AT TIME ZONE 'Europe/Lisbon')::time < time '23:58'
          AND (p.schedule_mode<>'automatic' OR NOT EXISTS(
             SELECT 1 FROM public.pr_posts prior
             WHERE prior.destination_code='main' AND prior.status='sent'
               AND prior.sent_at > now()-interval '30 minutes'
          )))))
    )
    -- Afisha: no minimum interval. Already queued posts may publish when due.
    AND (p.destination_code<>'afisha' OR EXISTS(
       SELECT 1 FROM public.pr_items i JOIN public.pr_sources src ON src.id=i.source_id
       JOIN public.pr_trailyo_event_details td ON td.item_id=i.id
       WHERE i.id=p.item_id AND i.primary_category='events' AND src.code='trailyo_events'
         AND td.source_type IS NOT NULL AND td.source_type<>'partner'
    ))
    AND EXISTS (
     SELECT 1 FROM public.pr_media_assets a
     WHERE a.item_id=p.item_id AND a.public_url=q.approved_image_url
       AND a.status IN ('approved','candidate')
       AND (public.pr_editor_accepted_unverified_photo(p.item_id,a.public_url) OR a.rights_verified OR (a.media_type='brand_generic' AND a.generation_model='trailyo_existing_image_reference'
          AND EXISTS(SELECT 1 FROM public.pr_items i JOIN public.pr_sources s ON s.id=i.source_id
              WHERE i.id=p.item_id AND i.primary_category='events' AND s.code='trailyo_events')))
       AND a.media_type IN ('licensed_original','owned_original','generated_illustration','brand_generic')
       AND (a.media_type<>'brand_generic' OR a.generation_model='trailyo_existing_image_reference')
       AND (a.media_type<>'generated_illustration' OR
        (a.illustration_label_required AND a.storage_bucket='pr-editorial-media' AND a.storage_key IS NOT NULL))
    )
  ORDER BY CASE WHEN p.schedule_mode='now' THEN 0 WHEN p.schedule_mode IN ('datetime','delay') THEN 1 ELSE 2 END,
           p.scheduled_for,p.created_at
  LIMIT 1 FOR UPDATE OF p SKIP LOCKED
 ), claimed AS (
  UPDATE public.pr_posts p SET status='sending',attempts=p.attempts+1,last_error=NULL
  FROM todo t WHERE p.id=t.id AND p.status='scheduled'
  RETURNING p.id,p.attempts,p.telegram_thread_id
 )
 SELECT t.post_id,t.item_id,t.destination_code,t.telegram_chat_id,
        t.prepared_text,t.approved_image_url,t.ai_image,
        c.attempts,c.telegram_thread_id
 FROM todo t JOIN claimed c ON c.id=t.id;
END;
$function$
;
