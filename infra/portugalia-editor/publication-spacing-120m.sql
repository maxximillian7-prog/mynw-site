-- Portugal Ryadom Journal: 120-minute spacing across Main and Afisha Telegram posts.
-- Quiet hours 00:00-08:00 Europe/Lisbon. Safe-send margin 23:58-00:00.
-- Production Neon project restless-pine-73362851, branch br-young-paper-b972wmgd.
-- The global advisory lock serializes editor queue reservations and publisher claims.
-- Each claim checks the previous actual send and local quiet hours.
-- PostgreSQL Europe/Lisbon handles DST changes automatically.
-- The existing prpublish cron runs every 5 minutes, only for approved content.
-- All CREATE OR REPLACE statements are idempotent.

CREATE OR REPLACE FUNCTION public.pr_next_portugal_publication_slot(p_requested timestamptz)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
AS $portugal$
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
$portugal$;

CREATE OR REPLACE FUNCTION public.pr_claim_due_telegram_post()
 RETURNS TABLE(post_id uuid, item_id uuid, destination_code text, telegram_chat_id bigint, prepared_text text, approved_image_url text, is_ai_generated boolean, attempts integer, telegram_thread_id bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
 -- Serialize parallel cron and manual invocations across both channels.
 PERFORM pg_advisory_xact_lock(8412026, 201);
 -- Quiet hours: no Telegram delivery from 00:00 to 08:00 Lisbon time.
 -- Additionally avoid opening a new send during the last 2 minutes before midnight.
 IF (now() AT TIME ZONE 'Europe/Lisbon')::time < time '08:00'
    OR (now() AT TIME ZONE 'Europe/Lisbon')::time >= time '23:58' THEN
  RETURN;
 END IF;
 -- A publication or unresolved delivery in progress blocks a second send.
 IF EXISTS (SELECT 1 FROM public.pr_posts p WHERE p.status='sending')
 OR EXISTS (SELECT 1 FROM public.pr_posts p
            WHERE p.status='sent' AND p.sent_at > now() - interval '2 hours') THEN
  RETURN;
 END IF;
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
    AND EXISTS (
     SELECT 1 FROM public.pr_media_assets a
     WHERE a.item_id=p.item_id AND a.public_url=q.approved_image_url
       AND a.status='approved' AND a.rights_verified
       AND a.media_type IN ('licensed_original','owned_original','generated_illustration')
       AND (a.media_type<>'generated_illustration' OR
        (a.illustration_label_required AND a.storage_bucket='pr-editorial-media' AND a.storage_key IS NOT NULL))
    )
  ORDER BY p.scheduled_for,p.created_at
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
 -- All journal destinations share a single two-hour timeline.
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
 SELECT max(
   CASE WHEN p.status='sent' THEN p.sent_at
        WHEN p.status='sending' THEN coalesce(p.scheduled_for, p.created_at)
        ELSE coalesce(p.scheduled_for,p.created_at)
   END
 )
 INTO last_reserved
 FROM public.pr_posts p
 WHERE p.status IN ('queued','scheduled','sending','sent')
   AND (p.status<>'sent' OR p.sent_at > now() - interval '30 days');
 next_slot := greatest(now() + interval '1 minute',
                      coalesce(last_reserved + interval '2 hours',now() + interval '1 minute'));
 next_slot := public.pr_next_portugal_publication_slot(next_slot);
 INSERT INTO public.pr_posts(item_id,destination_code,status,scheduled_for)
 VALUES(p_item_id,p_destination,'queued',next_slot) RETURNING * INTO inserted_post;
 RETURN QUERY SELECT inserted_post.id, inserted_post.scheduled_for;
END;
$function$;
