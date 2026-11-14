-- Portugal Journal: Main and Afisha have INDEPENDENT time rules.
-- MAIN: >=120 minutes between successful sends, no starts from 00:00 to 08:00 Lisbon (23:58 safety buffer).
-- AFISHA: no pacing or quiet hours, next five-minute publisher run after manual approval.
-- Both remain subject to verification, approved photo, source, deduplication and human editorial review.
-- Safe to reapply: CREATE OR REPLACE preserves data and signatures.

CREATE OR REPLACE FUNCTION public.pr_next_portugal_publication_slot(p_requested timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
 local_date date := (p_requested AT TIME ZONE 'Europe/Lisbon')::date;
 local_clock time := (p_requested AT TIME ZONE 'Europe/Lisbon')::time;
BEGIN
 IF p_requested IS NULL THEN RETURN NULL; END IF;
 IF local_clock < time '08:00' THEN
  RETURN (local_date + time '08:00') AT TIME ZONE 'Europe/Lisbon';
 END IF;
 -- A two-minute safety margin keeps a Telegram API request
 -- started before midnight from completing inside the quiet hours.
 IF local_clock >= time '23:58' THEN
  RETURN ((local_date + 1) + time '08:00') AT TIME ZONE 'Europe/Lisbon';
 END IF;
 RETURN p_requested;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pr_enqueue_publication_slot(p_item_id uuid, p_destination text)
 RETURNS TABLE(post_id uuid, scheduled_for timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
 existing_post public.pr_posts%ROWTYPE;
 last_reserved timestamptz;
 next_slot timestamptz;
 inserted_post public.pr_posts%ROWTYPE;
BEGIN
 -- Main and Afisha use independent publication clocks.
 -- Keep one advisory lock to serialize queue reservations and publisher claims.
 PERFORM pg_advisory_xact_lock(8412026, 201);
 SELECT * INTO existing_post FROM public.pr_posts p
 WHERE p.item_id = p_item_id AND p.destination_code = p_destination
 FOR UPDATE;
 IF FOUND THEN
  IF existing_post.status NOT IN ('queued','scheduled') THEN
   RAISE EXCEPTION 'Post already processed (status %); manual reconciliation required', existing_post.status USING ERRCODE='P0001';
  END IF;
  IF existing_post.scheduled_for IS NULL THEN
   RAISE EXCEPTION 'Existing post lacks a reserved time; repair it before continuing' USING ERRCODE='P0001';
  END IF;
  RETURN QUERY SELECT existing_post.id, existing_post.scheduled_for;
  RETURN;
 END IF;
 IF p_destination = 'main' THEN
  -- Only MAIN posts reserve 2-hour gaps; Afisha never delays them.
  SELECT max(
    CASE WHEN p.status='sent' THEN p.sent_at
         WHEN p.status='sending' THEN coalesce(p.scheduled_for,p.created_at)
         ELSE coalesce(p.scheduled_for,p.created_at) END
  ) INTO last_reserved
  FROM public.pr_posts p
  WHERE p.destination_code='main' AND p.status IN ('queued','scheduled','sending','sent')
    AND (p.status<>'sent' OR p.sent_at > now()-interval '30 days');
  next_slot := greatest(now() + interval '1 minute',
                       coalesce(last_reserved + interval '2 hours',now() + interval '1 minute'));
  next_slot := public.pr_next_portugal_publication_slot(next_slot);
 ELSIF p_destination='afisha' THEN
  -- No two-hour pacing and no quiet hours. Eligible at next cron cycle.
  next_slot := now();
 ELSE
  RAISE EXCEPTION 'Unsupported Telegram destination: %',p_destination USING ERRCODE='22023';
 END IF;
 INSERT INTO public.pr_posts(item_id,destination_code,status,scheduled_for)
 VALUES(p_item_id,p_destination,'queued',next_slot) RETURNING * INTO inserted_post;
 RETURN QUERY SELECT inserted_post.id, inserted_post.scheduled_for;
END;
$function$;

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
 -- Afisha bypasses Main's quiet hours and Main's 120-minute clock.
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
      p.destination_code='afisha'
      OR (p.destination_code='main'
          AND (now() AT TIME ZONE 'Europe/Lisbon')::time >= time '08:00'
          AND (now() AT TIME ZONE 'Europe/Lisbon')::time < time '23:58'
          AND NOT EXISTS(
             SELECT 1 FROM public.pr_posts prior
             WHERE prior.destination_code='main' AND prior.status='sent'
               AND prior.sent_at > now()-interval '2 hours'
          ))
    )
    AND EXISTS (
     SELECT 1 FROM public.pr_media_assets a
     WHERE a.item_id=p.item_id AND a.public_url=q.approved_image_url
       AND a.status='approved' AND a.rights_verified
       AND a.media_type IN ('licensed_original','owned_original','generated_illustration')
       AND (a.media_type<>'generated_illustration' OR
        (a.illustration_label_required AND a.storage_bucket='pr-editorial-media' AND a.storage_key IS NOT NULL))
    )
  ORDER BY CASE WHEN p.destination_code='main' THEN 0 ELSE 1 END,
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
$function$;
