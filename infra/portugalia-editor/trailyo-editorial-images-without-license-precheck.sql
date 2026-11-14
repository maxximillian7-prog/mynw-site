-- Trailyo images enter as unverified source references, never as licensed/owned media.
-- Only a human-reviewed, status=approved image may be published in Afisha.
-- All other Journal media still requires its normal licence checks.

-- editorial intake
CREATE OR REPLACE FUNCTION public.pr_intake_check(p_item_id uuid)
 RETURNS TABLE(ready boolean, issues text[], value_score integer, preview_image_url text, category_hashtag text)
 LANGUAGE sql
 STABLE
AS $function$
WITH base AS(
 SELECT i.*,s.verification_status,d.id draft_id,d.status draft_status,d.headline_ru,d.lead_ru,d.story_ru,
 d.source_context_used,d.needs_more_facts,rv.value_score rated_value,rv.decision value_decision,
 p.min_editorial_value,pr_telegram_hashtag(i.primary_category) hashtag,
 pr_topic_hashtags(i.id) topic_tags,
 (SELECT a.public_url FROM pr_media_assets a WHERE a.item_id=i.id
 AND (a.rights_verified OR (s.code='trailyo_events' AND i.primary_category='events' AND a.media_type='brand_generic' AND a.generation_model='trailyo_existing_image_reference')) AND a.public_url ~ '^https://'
 AND a.status IN ('candidate','approved')
 AND a.media_type IN ('licensed_original','owned_original','generated_illustration','brand_generic')
 AND ((a.media_type='brand_generic' AND a.generation_model='trailyo_existing_image_reference' AND s.code='trailyo_events') OR a.media_type='owned_original' OR (a.media_type='generated_illustration' AND a.illustration_label_required AND a.storage_bucket='pr-editorial-media' AND a.storage_key IS NOT NULL) OR (length(trim(coalesce(a.attribution,'')))>=8 AND length(trim(coalesce(a.license_details,'')))>=12))
 AND NOT EXISTS (
   SELECT 1 FROM pr_media_assets duplicate
   WHERE duplicate.item_id <> i.id AND duplicate.public_url=a.public_url
   AND duplicate.media_type IN ('licensed_original','owned_original','generated_illustration')
   AND duplicate.status IN ('candidate','approved')
 )
 ORDER BY CASE WHEN a.status='approved' THEN 0 ELSE 1 END, a.approved_at DESC NULLS LAST, a.created_at DESC LIMIT 1) picture
 FROM pr_items i JOIN pr_sources s ON s.id=i.source_id
 LEFT JOIN pr_story_drafts d ON d.item_id=i.id
 LEFT JOIN pr_editorial_value_reviews rv ON rv.item_id=i.id
 LEFT JOIN pr_editorial_priority p ON p.category_code=i.primary_category
 WHERE i.id=p_item_id
), tests AS(
 SELECT b.*,array_remove(ARRAY[
 CASE WHEN duplicate_of IS NOT NULL OR status NOT IN ('candidate','approved') THEN 'Дубликат или исключённый материал' END,
 CASE WHEN verification_status NOT IN ('verified_official','verified_editorial','verified_internal') THEN 'Источник не подтверждён' END,
 CASE WHEN canonical_url !~ '^https://' THEN 'Нет действительной HTTPS-ссылки на первоисточник' END,
 CASE WHEN draft_id IS NULL THEN 'Полный редакционный материал ещё не подготовлен' END,
 CASE WHEN coalesce(length(trim(headline_ru)),0)<18 OR coalesce(headline_ru,'') !~ '[А-Яа-яЁё]' THEN 'Нет корректного русского заголовка' END,
 CASE WHEN coalesce(length(trim(lead_ru)),0)<55 OR coalesce(lead_ru,'') !~ '[А-Яа-яЁё]' THEN 'Нет полноценного русского вступления' END,
 CASE WHEN coalesce(length(trim(story_ru)),0)<180 OR coalesce(story_ru,'') !~ '[А-Яа-яЁё]' THEN 'Русский текст слишком короткий или отсутствует' END,
 CASE WHEN trim(coalesce(story_ru,'')) !~ '[.!?…»)]$' THEN 'Текст оборван или не завершён предложением' END,
 CASE WHEN length(coalesce(source_context_used,'')) BETWEEN 495 AND 505 AND source_id=(SELECT id FROM pr_sources WHERE code='trailyo_events' LIMIT 1) THEN 'Исходное описание Trailyo обрезано до 500 символов' END,
 CASE WHEN coalesce(length(trim(source_context_used)),0)<160 THEN 'Недостаточно первичной фактической информации' END,
 CASE WHEN needs_more_facts IS DISTINCT FROM false THEN 'Нужна дополнительная проверка фактов' END,
 CASE WHEN picture IS NULL THEN 'Нет реальной фотографии или AI-иллюстрации с подтверждённым происхождением' END,
 CASE WHEN hashtag IS NULL THEN 'Нет навигационного хештега' END,
 CASE WHEN topic_tags IS NULL THEN 'Нет 2–4 релевантных тематических тегов статьи' END,
 CASE WHEN value_decision='reject' THEN 'Материал отклонён редакционным отбором' END,
 CASE WHEN COALESCE(rated_value,0)<COALESCE(min_editorial_value,55) THEN 'Полезность и интерес для читателей не подтверждены' END,
 CASE WHEN ingested_via='curated_rss' AND EXISTS(SELECT 1 FROM pr_discovery_hits h WHERE h.item_id=b.id AND h.stage<>'promoted') THEN 'Материал из тестовой подборки требует повторной классификации' END,
 CASE WHEN source_published_at IS NOT NULL AND source_published_at>now()+interval '1 day' THEN 'Неверная дата источника' END,
 CASE WHEN primary_category='events' AND (starts_at IS NULL OR COALESCE(ends_at,starts_at)<now()) THEN 'Событие завершилось или не указана дата' END
 ]::text[],NULL) problems FROM base b)
 SELECT cardinality(problems)=0,problems,COALESCE(rated_value,0),picture,hashtag FROM tests
$function$;

-- manual publication gate
CREATE OR REPLACE FUNCTION public.pr_item_publication_check(p_item_id uuid)
 RETURNS TABLE(allowed boolean, reason text)
 LANGUAGE plpgsql
 STABLE
AS $function$
 DECLARE a record; last_review record;
 BEGIN
 SELECT i.*,s.verification_status,s.rights_policy,s.is_enabled AS source_ingestion_enabled,s.code AS source_code
 INTO a FROM pr_items i LEFT JOIN pr_sources s ON s.id=i.source_id WHERE i.id=p_item_id;
 IF NOT FOUND THEN RETURN QUERY SELECT false,'item_not_found'::text; RETURN; END IF;
 IF a.status <> 'approved' THEN RETURN QUERY SELECT false,'not_approved'::text;RETURN;END IF;
 IF COALESCE(a.verification_status,'pending') NOT IN ('verified_official','verified_editorial','verified_internal') THEN RETURN QUERY SELECT false,'source_not_verified'::text; RETURN;END IF;
 IF COALESCE(trim(a.title_ru),'') = '' OR COALESCE(trim(a.summary_ru),'')='' THEN RETURN QUERY SELECT false,'missing_russian_copy'::text;RETURN;END IF;
 IF a.canonical_url IS NULL OR a.canonical_url !~ '^https://[^[:space:]]+$' THEN RETURN QUERY SELECT false,'missing_https_source'::text;RETURN;END IF;
 IF a.source_fact_checked IS DISTINCT FROM true OR a.source_confidence IN ('unreviewed','disputed') THEN RETURN QUERY SELECT false,'claims_unverified'::text; RETURN; END IF;
 IF a.photo_url IS NOT NULL AND a.photo_rights NOT IN ('permission_confirmed','cc_licensed','owned') AND NOT EXISTS(
 SELECT 1 FROM public.pr_media_assets media
 WHERE media.item_id=p_item_id AND media.public_url=a.photo_url
 AND media.media_type='brand_generic'
 AND media.generation_model='trailyo_existing_image_reference'
 AND media.status='approved' AND media.approved_by IS NOT NULL
 AND a.primary_category='events' AND a.source_code='trailyo_events'
) THEN RETURN QUERY SELECT false,'photo_rights_unverified'::text; RETURN; END IF;
 IF a.primary_category = 'events' AND (a.starts_at IS NULL OR COALESCE(a.ends_at,a.starts_at) < now() OR a.event_status IN ('cancelled','past','postponed')) THEN RETURN QUERY SELECT false,'event_outdated_or_unconfirmed'::text; RETURN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pr_item_evidence e WHERE e.item_id=p_item_id AND e.evidence_url ~ '^https://') THEN RETURN QUERY SELECT false,'missing_verifiable_evidence'::text; RETURN; END IF;
 SELECT * INTO last_review FROM pr_editorial_reviews WHERE item_id=p_item_id ORDER BY reviewed_at DESC,id DESC LIMIT 1;
 IF last_review IS NULL OR last_review.decision <> 'approve' OR last_review.claim_verified IS DISTINCT FROM true THEN RETURN QUERY SELECT false,'editor_approval_missing'::text; RETURN; END IF;
 IF a.photo_url IS NOT NULL AND last_review.rights_verified IS DISTINCT FROM true AND NOT EXISTS(
 SELECT 1 FROM public.pr_media_assets media
 WHERE media.item_id=p_item_id AND media.public_url=a.photo_url
 AND media.media_type='brand_generic'
 AND media.generation_model='trailyo_existing_image_reference'
 AND media.status='approved' AND media.approved_by IS NOT NULL
 AND a.primary_category='events' AND a.source_code='trailyo_events'
) THEN RETURN QUERY SELECT false,'editor_photo_approval_missing'::text; RETURN; END IF;
 RETURN QUERY SELECT true,'ok'::text;
 END $function$;

-- photo attribution
CREATE OR REPLACE FUNCTION public.pr_photo_credit(p_item_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
SELECT CASE WHEN a.media_type='licensed_original'
 THEN CASE WHEN a.attribution LIKE 'Фото:%' THEN a.attribution ELSE 'Фото: '||a.attribution END
 WHEN a.media_type='generated_illustration' AND a.illustration_label_required THEN 'AI-иллюстрация: изображение создано ИИ для журнала «Португалия рядом», не документальное фото'
 WHEN a.media_type='brand_generic' AND a.generation_model='trailyo_existing_image_reference' THEN 'Фото: '||coalesce(nullif(trim(a.attribution),''),'Изображение Trailyo')||'; Файл: '||a.public_url
 WHEN a.media_type='owned_original' AND nullif(trim(a.attribution),'') IS NOT NULL
 THEN CASE WHEN a.attribution LIKE 'Фото:%' THEN a.attribution ELSE 'Фото: '||a.attribution END
 ELSE '' END
FROM public.pr_items i
JOIN public.pr_media_assets a ON a.item_id=i.id AND a.public_url=i.photo_url
WHERE i.id=p_item_id AND a.status='approved'
 AND (a.rights_verified OR (a.media_type='brand_generic' AND a.generation_model='trailyo_existing_image_reference' AND EXISTS(SELECT 1 FROM pr_sources s WHERE s.id=i.source_id AND s.code='trailyo_events')))
 AND a.public_url IS NOT NULL
 AND a.media_type IN ('licensed_original','owned_original','generated_illustration','brand_generic')
ORDER BY a.approved_at DESC NULLS LAST,a.created_at DESC LIMIT 1
$function$;

-- due publisher claim
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
    AND (p.destination_code<>'afisha' OR EXISTS(
       SELECT 1 FROM public.pr_items i JOIN public.pr_sources src ON src.id=i.source_id
       WHERE i.id=p.item_id AND i.primary_category='events' AND src.code='trailyo_events'
    ))
    AND EXISTS (
     SELECT 1 FROM public.pr_media_assets a
     WHERE a.item_id=p.item_id AND a.public_url=q.approved_image_url
       AND a.status='approved'
       AND (a.rights_verified OR (a.media_type='brand_generic' AND a.generation_model='trailyo_existing_image_reference'
          AND EXISTS(SELECT 1 FROM public.pr_items i JOIN public.pr_sources s ON s.id=i.source_id
              WHERE i.id=p.item_id AND i.primary_category='events' AND s.code='trailyo_events')))
       AND a.media_type IN ('licensed_original','owned_original','generated_illustration','brand_generic')
       AND (a.media_type<>'brand_generic' OR a.generation_model='trailyo_existing_image_reference')
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

-- delivery view
CREATE OR REPLACE VIEW public.pr_telegram_delivery_queue AS  SELECT p.id AS post_id,
    p.item_id,
    p.destination_code,
    dst.telegram_chat_id,
    p.status,
    p.scheduled_for,
    p.category_hashtag,
    p.prepared_text,
    p.prepared_caption,
    a.public_url AS approved_image_url,
    a.illustration_label_required
   FROM (((((pr_posts p
     JOIN pr_items i ON ((i.id = p.item_id)))
     JOIN pr_destinations dst ON (((dst.code = p.destination_code) AND (dst.is_enabled = true) AND (dst.telegram_chat_id IS NOT NULL))))
     JOIN pr_story_drafts draft ON (((draft.item_id = p.item_id) AND (draft.status = 'approved'::text) AND draft.context_verified AND (NOT draft.needs_more_facts))))
     JOIN LATERAL pr_item_publication_check(p.item_id) gate(allowed, reason) ON (gate.allowed))
     JOIN LATERAL ( SELECT m.public_url,
            m.illustration_label_required
           FROM pr_media_assets m
          WHERE ((m.item_id = p.item_id) AND (m.public_url = i.photo_url) AND (m.status = 'approved'::text) AND (m.rights_verified OR (m.media_type='brand_generic' AND m.generation_model='trailyo_existing_image_reference' AND m.approved_by IS NOT NULL
 AND i.primary_category='events' AND EXISTS(SELECT 1 FROM public.pr_sources src WHERE src.id=i.source_id AND src.code='trailyo_events')))
 AND (m.media_type = ANY (ARRAY['licensed_original'::text, 'owned_original'::text, 'generated_illustration'::text, 'brand_generic'::text]))
 AND (m.media_type <> 'brand_generic' OR m.generation_model='trailyo_existing_image_reference') AND ((m.media_type <> 'generated_illustration'::text) OR (m.illustration_label_required AND (m.storage_bucket = 'pr-editorial-media'::text) AND (m.storage_key IS NOT NULL))))
          ORDER BY m.approved_at DESC NULLS LAST, m.created_at DESC
         LIMIT 1) a ON (true))
  WHERE ((p.status = 'scheduled'::text) AND ((p.scheduled_for IS NULL) OR (p.scheduled_for <= now())) AND (p.prepared_text IS NOT NULL) AND (p.prepared_caption IS NOT NULL) AND (p.category_hashtag IS NOT NULL));;