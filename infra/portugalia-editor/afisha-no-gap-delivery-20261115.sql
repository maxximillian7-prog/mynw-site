-- 2026-11-15: Synchronize real Afisha posting policy with prpublish.health.
-- Afisha posts are sent when due; Main keeps its 120-minute interval/quiet hours.
-- Do not reset message IDs, send duplicates, or touch already sent publications.
-- The existing media/rights/source validity guards remain intact.

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
          AND (p.schedule_mode='now' OR ((now() AT TIME ZONE 'Europe/Lisbon')::time >= time '08:00'
          AND (now() AT TIME ZONE 'Europe/Lisbon')::time < time '23:58'
          AND (p.schedule_mode<>'automatic' OR NOT EXISTS(
             SELECT 1 FROM public.pr_posts prior
             WHERE prior.destination_code='main' AND prior.status='sent'
               AND prior.sent_at > now()-interval '2 hours'
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

-- Monitor this query if scheduled messages appear overdue in Journal Studio.
SELECT p.id,p.item_id,p.destination_code,p.scheduled_for,p.status,
       (g.allowed) AS publication_allowed,(g.reason) AS publication_reason,
       p.last_error
FROM public.pr_posts p
CROSS JOIN LATERAL public.pr_item_publication_check(p.item_id) g
WHERE p.status IN ('queued','scheduled') AND p.scheduled_for<now()-interval '10 minutes'
ORDER BY p.scheduled_for;
