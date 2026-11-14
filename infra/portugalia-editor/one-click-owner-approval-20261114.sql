-- 2026-11-14: One-click owner approval without weakening strict intake.
-- Production Neon project restless-pine-73362851 branch br-young-paper-b972wmgd.
-- This migration records editor-only exceptions; intake stays independently strict.
-- Hard Telegram constraints (usable HTTPS photo and article, valid event,
-- nonpartner event, no duplicate message) are retained. No automatic posting.
-- Editor/API must enforce role=owner and obtain actor UUID from authentication.

CREATE TABLE IF NOT EXISTS public.pr_owner_approval_overrides (
 id bigserial PRIMARY KEY,
 item_id uuid NOT NULL REFERENCES public.pr_items(id) ON DELETE CASCADE,
 actor_user_id uuid NOT NULL,
 intake_ready_at_approval boolean NOT NULL,
 intake_issues text[] NOT NULL DEFAULT ARRAY[]::text[],
 value_score integer,
 photo_url text,
 notes text NOT NULL DEFAULT '',
 approved_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS pr_owner_approval_overrides_item_latest
 ON public.pr_owner_approval_overrides(item_id,approved_at DESC);

CREATE OR REPLACE FUNCTION public.pr_owner_override_active(p_item_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
 SELECT EXISTS(
 SELECT 1 FROM public.pr_owner_approval_overrides x
 JOIN public.pr_items i ON i.id=x.item_id AND i.status='approved'
 JOIN public.pr_story_drafts d ON d.item_id=x.item_id AND d.status='approved'
 WHERE x.item_id=p_item_id
   AND x.approved_at>=COALESCE(d.updated_at,x.approved_at)
   AND x.approved_at>=COALESCE(i.reviewed_at,x.approved_at)
   AND i.reviewed_by=x.actor_user_id::text
 )
 $function$;

CREATE OR REPLACE FUNCTION public.pr_owner_override_publish_gate(p_item_id uuid)
 RETURNS TABLE(allowed boolean, reason text)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE i record; d record;
BEGIN
 SELECT it.*, s.code AS source_code INTO i FROM public.pr_items it
 LEFT JOIN public.pr_sources s ON s.id=it.source_id WHERE it.id=p_item_id;
 IF NOT FOUND THEN RETURN QUERY SELECT false,'item_not_found'::text;RETURN;END IF;
 IF i.status<>'approved' OR i.duplicate_of IS NOT NULL THEN RETURN QUERY SELECT false,'not_approved_or_duplicate'::text;RETURN;END IF;
 IF i.canonical_url IS NULL OR i.canonical_url !~ '^https://[^[:space:]]+$'
 THEN RETURN QUERY SELECT false,'missing_https_source'::text;RETURN;END IF;
 SELECT * INTO d FROM public.pr_story_drafts WHERE item_id=p_item_id;
 IF NOT FOUND OR d.status<>'approved' OR length(trim(d.headline_ru))<3
 OR length(trim(d.headline_ru))>255 OR length(trim(d.story_ru))<110
 THEN RETURN QUERY SELECT false,'insufficient_story_for_telegram'::text;RETURN;END IF;
 IF i.photo_url IS NULL OR i.photo_url !~ '^https://[^[:space:]]+$'
 OR NOT EXISTS(SELECT 1 FROM public.pr_media_assets a WHERE a.item_id=p_item_id
 AND a.public_url=i.photo_url AND a.status IN ('candidate','approved')
 AND a.media_type IN ('licensed_original','owned_original','generated_illustration','brand_generic')
 AND (a.media_type<>'brand_generic' OR a.generation_model='trailyo_existing_image_reference')
 AND (a.media_type<>'generated_illustration' OR
 (a.illustration_label_required AND a.storage_bucket='pr-editorial-media' AND a.storage_key IS NOT NULL)))
 THEN RETURN QUERY SELECT false,'no_usable_photo_for_telegram'::text;RETURN;END IF;
 IF i.source_code='trailyo_events' AND NOT EXISTS(
 SELECT 1 FROM public.pr_trailyo_event_details td
 WHERE td.item_id=p_item_id AND td.source_type IS NOT NULL AND td.source_type<>'partner')
 THEN RETURN QUERY SELECT false,'partner_or_unknown_event_source'::text;RETURN;END IF;
 IF i.primary_category='events' AND (i.event_status IN ('cancelled','past','postponed')
 OR (i.source_code='trailyo_events' AND NOT EXISTS(
 SELECT 1 FROM public.pr_trailyo_event_details td WHERE td.item_id=p_item_id
 AND td.starts_on IS NOT NULL AND td.ends_on>=td.starts_on
 AND td.ends_on>=(now() AT TIME ZONE 'Europe/Lisbon')::date))
 OR (i.source_code IS DISTINCT FROM 'trailyo_events' AND
 (i.starts_at IS NULL OR coalesce(i.ends_at,i.starts_at)<now())))
 THEN RETURN QUERY SELECT false,'event_expired_or_unconfirmed'::text;RETURN;END IF;
 RETURN QUERY SELECT true,'owner_editorial_override'::text;
END $function$;

CREATE OR REPLACE FUNCTION public.pr_editor_accepted_unverified_photo(p_item_id uuid, p_photo_url text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
SELECT EXISTS (
 SELECT 1 FROM public.pr_items i
 JOIN LATERAL (SELECT decision,claim_verified,rights_verified FROM public.pr_editorial_reviews r WHERE r.item_id=i.id ORDER BY r.reviewed_at DESC,r.id DESC LIMIT 1) r ON true
 JOIN public.pr_media_assets m ON m.item_id=i.id AND m.public_url=p_photo_url
 WHERE i.id=p_item_id AND i.photo_url=p_photo_url AND i.status='approved'
   AND m.status IN ('candidate','approved') AND m.public_url LIKE 'https://%'
   AND r.decision='approve' AND ((r.claim_verified IS TRUE AND r.rights_verified IS TRUE) OR public.pr_owner_override_active(p_item_id))
) $function$;

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
 IF public.pr_owner_override_active(p_item_id) THEN RETURN QUERY SELECT g.allowed,g.reason FROM public.pr_owner_override_publish_gate(p_item_id) g;RETURN; END IF;
 IF COALESCE(a.verification_status,'pending') NOT IN ('verified_official','verified_editorial','verified_internal') THEN RETURN QUERY SELECT false,'source_not_verified'::text; RETURN;END IF;
 IF COALESCE(trim(a.title_ru),'') = '' OR COALESCE(trim(a.summary_ru),'')='' THEN RETURN QUERY SELECT false,'missing_russian_copy'::text;RETURN;END IF;
 IF a.canonical_url IS NULL OR a.canonical_url !~ '^https://[^[:space:]]+$' THEN RETURN QUERY SELECT false,'missing_https_source'::text;RETURN;END IF;
 IF a.source_fact_checked IS DISTINCT FROM true OR a.source_confidence IN ('unreviewed','disputed') THEN RETURN QUERY SELECT false,'claims_unverified'::text; RETURN; END IF;
 IF a.photo_url IS NOT NULL AND a.photo_rights NOT IN ('permission_confirmed','cc_licensed','owned') AND NOT public.pr_editor_accepted_unverified_photo(p_item_id,a.photo_url) AND NOT EXISTS(
 SELECT 1 FROM public.pr_media_assets media
 WHERE media.item_id=p_item_id AND media.public_url=a.photo_url
 AND media.media_type='brand_generic'
 AND media.generation_model='trailyo_existing_image_reference'
 AND media.status='approved' AND media.approved_by IS NOT NULL
 AND a.primary_category='events' AND a.source_code='trailyo_events'
) THEN RETURN QUERY SELECT false,'photo_rights_unverified'::text; RETURN; END IF;
 IF a.source_code='trailyo_events' AND NOT EXISTS(SELECT 1 FROM pr_trailyo_event_details td WHERE td.item_id=p_item_id AND td.source_type IS NOT NULL AND td.source_type<>'partner') THEN RETURN QUERY SELECT false,'partner_or_unverified_event_source'::text; RETURN; END IF;
 IF a.primary_category = 'events' AND (
 a.event_status IN ('cancelled','past','postponed')
 OR (a.source_code='trailyo_events' AND NOT EXISTS (
     SELECT 1 FROM public.pr_trailyo_event_details td
     WHERE td.item_id=p_item_id AND td.starts_on IS NOT NULL
       AND td.ends_on>=td.starts_on
       AND td.ends_on>=(now() AT TIME ZONE 'Europe/Lisbon')::date
 ))
 OR (a.source_code IS DISTINCT FROM 'trailyo_events' AND
     (a.starts_at IS NULL OR COALESCE(a.ends_at,a.starts_at)<now()))
) THEN RETURN QUERY SELECT false,'event_outdated_or_unconfirmed'::text; RETURN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pr_item_evidence e WHERE e.item_id=p_item_id AND e.evidence_url ~ '^https://') THEN RETURN QUERY SELECT false,'missing_verifiable_evidence'::text; RETURN; END IF;
 SELECT * INTO last_review FROM pr_editorial_reviews WHERE item_id=p_item_id ORDER BY reviewed_at DESC,id DESC LIMIT 1;
 IF last_review IS NULL OR last_review.decision <> 'approve' OR last_review.claim_verified IS DISTINCT FROM true THEN RETURN QUERY SELECT false,'editor_approval_missing'::text; RETURN; END IF;
 IF a.photo_url IS NOT NULL AND last_review.rights_verified IS DISTINCT FROM true AND NOT public.pr_editor_accepted_unverified_photo(p_item_id,a.photo_url) AND NOT EXISTS(
 SELECT 1 FROM public.pr_media_assets media
 WHERE media.item_id=p_item_id AND media.public_url=a.photo_url
 AND media.media_type='brand_generic'
 AND media.generation_model='trailyo_existing_image_reference'
 AND media.status='approved' AND media.approved_by IS NOT NULL
 AND a.primary_category='events' AND a.source_code='trailyo_events'
) THEN RETURN QUERY SELECT false,'editor_photo_approval_missing'::text; RETURN; END IF;
 RETURN QUERY SELECT true,'ok'::text;
 END $function$;

CREATE OR REPLACE FUNCTION public.pr_require_editorial_asset()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
 DECLARE draft record;
 BEGIN
 IF NEW.status NOT IN ('scheduled','sending','sent') THEN RETURN NEW; END IF;
 IF public.pr_owner_override_active(NEW.item_id) THEN RETURN NEW; END IF;
 SELECT * INTO draft FROM pr_story_drafts WHERE item_id=NEW.item_id;
 IF NOT FOUND OR draft.status <> 'approved' OR draft.needs_more_facts IS TRUE OR draft.context_verified IS NOT TRUE
 THEN RAISE EXCEPTION 'Approved factual editorial draft required before publishing' USING ERRCODE='23514'; END IF;
 -- Optional editorial illustrations: factual/editorial approval remains mandatory.
 -- If an image is selected, publication rights remain checked by pr_item_publication_check.
 RETURN NEW;
 END $function$;

CREATE OR REPLACE FUNCTION public.pr_owner_approve_and_queue(p_item_id uuid, p_actor uuid, p_note text DEFAULT ''::text, p_delay_minutes integer DEFAULT NULL::integer, p_publish_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(approved boolean, queued boolean, sent boolean, destination text, post_id uuid, scheduled_for timestamp with time zone, issues text[], value_score integer, warning text)
 LANGUAGE plpgsql
AS $function$
DECLARE i record; d record; check_result record; gate record; reservation record;
 target text; is_approved boolean; latest_post record; send_warning text;
 review_facts boolean; review_rights boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(8412026,202);
 IF p_delay_minutes IS NOT NULL AND p_publish_at IS NOT NULL THEN RAISE EXCEPTION 'Выберите дату или задержку, не оба варианта';END IF;
 IF p_actor IS NULL OR p_item_id IS NULL THEN RAISE EXCEPTION 'Отсутствует авторизованный редактор или материал';END IF;
 SELECT it.*,src.code AS source_code INTO i
 FROM public.pr_items it JOIN public.pr_sources src ON src.id=it.source_id
 WHERE it.id=p_item_id FOR UPDATE OF it;
 IF NOT FOUND THEN RAISE EXCEPTION 'Материал не найден';END IF;
 IF i.duplicate_of IS NOT NULL OR i.status IN ('rejected','expired') THEN
   RAISE EXCEPTION 'Дубликат или снятый с публикации материал не может быть утверждён';
 END IF;
 SELECT * INTO d FROM public.pr_story_drafts WHERE item_id=p_item_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Отсутствует текст статьи: сначала создайте редакционный черновик';END IF;
 SELECT * INTO check_result FROM public.pr_intake_check(p_item_id);
 target:=CASE WHEN i.source_code='trailyo_events' THEN 'afisha' ELSE 'main' END;
 SELECT p.id,p.status,p.scheduled_for INTO latest_post
 FROM public.pr_posts p WHERE p.item_id=p_item_id AND p.destination_code=target
 ORDER BY p.created_at DESC LIMIT 1;
 IF latest_post.status='sent' THEN
  RETURN QUERY SELECT true,false,true,target,latest_post.id,latest_post.scheduled_for,
    check_result.issues,check_result.value_score,'Уже опубликовано в Telegram; повторная отправка отменена'::text;
  RETURN;
 END IF;
 is_approved:=i.status='approved' AND d.status='approved';
 IF NOT is_approved THEN
  UPDATE public.pr_story_drafts SET status='approved',reviewer=p_actor,
    reviewed_at=now(),updated_at=now() WHERE item_id=p_item_id;
  UPDATE public.pr_items SET status='approved',reviewed_by=p_actor::text,
    reviewed_at=now(),updated_at=now() WHERE id=p_item_id;
 END IF;
 INSERT INTO public.pr_owner_approval_overrides(
   item_id,actor_user_id,intake_ready_at_approval,intake_issues,value_score,photo_url,notes)
 VALUES(p_item_id,p_actor,COALESCE(check_result.ready,false),
   COALESCE(check_result.issues,ARRAY[]::text[]),check_result.value_score,i.photo_url,
   concat_ws(' | ',NULLIF(p_note,''),'Личное окончательное решение владельца, замечания приёмки сохранены'));
 review_facts:=COALESCE(i.source_fact_checked,false) AND COALESCE(d.context_verified,false)
   AND COALESCE(d.needs_more_facts,false)=false AND
   EXISTS(SELECT 1 FROM public.pr_item_evidence e WHERE e.item_id=p_item_id);
 review_rights:=i.photo_rights IN ('permission_confirmed','cc_licensed','owned')
  OR EXISTS(SELECT 1 FROM public.pr_media_assets m WHERE m.item_id=p_item_id
    AND m.public_url=i.photo_url AND m.rights_verified=true);
 IF NOT is_approved OR NOT EXISTS(
  SELECT 1 FROM public.pr_editorial_reviews er WHERE er.item_id=p_item_id AND er.decision='approve'
 ) THEN
 INSERT INTO public.pr_editorial_reviews(item_id,reviewer,decision,rationale,claim_verified,rights_verified)
 VALUES(p_item_id,p_actor,'approve',
   concat_ws(' | ',NULLIF(p_note,''),'Решение владельца. Приёмка: '||
     CASE WHEN check_result.ready THEN 'пройдена' ELSE array_to_string(check_result.issues,'; ') END),
   review_facts,review_rights);
 END IF;
 INSERT INTO public.pr_editorial_revisions(item_id,actor_user_id,action,note,before_state,after_state)
 VALUES(p_item_id,p_actor,'approve_one_click',
   left(concat_ws(' | ',p_note,'Приёмка: '||array_to_string(COALESCE(check_result.issues,ARRAY[]::text[]),'; ')),1000),
   jsonb_build_object('intake_ready',check_result.ready,'intake_issues',check_result.issues,'value_score',check_result.value_score),
   jsonb_build_object('owner_override',true,'facts_already_verified',review_facts,'rights_verified',review_rights));
 SELECT x.allowed,x.reason INTO gate FROM public.pr_item_publication_check(p_item_id) x;
 IF gate.allowed IS DISTINCT FROM true THEN
  RETURN QUERY SELECT true,false,false,target,NULL::uuid,NULL::timestamptz,
   check_result.issues,check_result.value_score,
   ('Утверждено владельцем, но отправка невозможна: '||COALESCE(gate.reason,'неизвестная техническая причина'))::text;
  RETURN;
 END IF;
 BEGIN
  SELECT r.post_id,r.scheduled_for INTO reservation FROM
  public.pr_schedule_publication(p_item_id,target,p_delay_minutes,p_publish_at) r;
 EXCEPTION WHEN OTHERS THEN
  send_warning:=left(SQLERRM,400);
 END;
 IF reservation.post_id IS NULL THEN
  RETURN QUERY SELECT true,false,false,target,NULL::uuid,NULL::timestamptz,
   check_result.issues,check_result.value_score,
   ('Утверждено владельцем, но планирование не завершено: '||COALESCE(send_warning,'нет записи в очереди'))::text;
  RETURN;
 END IF;
 RETURN QUERY SELECT true,true,false,target,reservation.post_id,reservation.scheduled_for,
  check_result.issues,check_result.value_score, NULL::text;
END $function$;

CREATE OR REPLACE FUNCTION public.pr_instagram_staging_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE item uuid;
BEGIN
 IF TG_TABLE_NAME='pr_items' THEN item:=NEW.id;
 ELSE item:=NEW.item_id; END IF;
 PERFORM public.pr_stage_instagram_article(item);
 RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.pr_intake_check(p_item_id uuid)
 RETURNS TABLE(ready boolean, issues text[], value_score integer, preview_image_url text, category_hashtag text)
 LANGUAGE sql
 STABLE
AS $function$
WITH base AS(
 SELECT i.*,s.verification_status,d.id draft_id,d.status draft_status,d.headline_ru,d.lead_ru,d.story_ru,
 d.source_context_used,d.needs_more_facts,rv.value_score rated_value,rv.decision value_decision,rv.reviewer_kind value_reviewer_kind,
 p.min_editorial_value,pr_telegram_hashtag(i.primary_category) hashtag,
 pr_topic_hashtags(i.id) topic_tags,
 COALESCE((SELECT a.public_url FROM pr_media_assets a WHERE a.item_id=i.id
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
 ORDER BY CASE WHEN a.status='approved' THEN 0 ELSE 1 END, a.approved_at DESC NULLS LAST, a.created_at DESC LIMIT 1), (SELECT m.public_url FROM public.pr_media_assets m WHERE m.item_id=i.id AND m.public_url LIKE 'https://%' AND m.status IN ('candidate','approved') ORDER BY CASE WHEN m.rights_verified THEN 0 ELSE 1 END, m.created_at DESC LIMIT 1)) picture
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
 CASE WHEN hashtag IS NULL THEN 'Нет навигационного хештега' END,
 CASE WHEN value_decision='reject' THEN 'Материал отклонён редакционным отбором' END,
 CASE WHEN COALESCE(rated_value,0)<COALESCE(min_editorial_value,55) THEN 'Полезность и интерес для читателей не подтверждены' END,
 CASE WHEN ingested_via='curated_rss' AND EXISTS(SELECT 1 FROM pr_discovery_hits h WHERE h.item_id=b.id AND h.stage<>'promoted') THEN 'Материал из тестовой подборки требует повторной классификации' END,
 CASE WHEN source_published_at IS NOT NULL AND source_published_at>now()+interval '1 day' THEN 'Неверная дата источника' END,
 CASE WHEN primary_category='events' AND (
   (source_id=(SELECT id FROM pr_sources WHERE code='trailyo_events' LIMIT 1)
    AND NOT EXISTS (
     SELECT 1 FROM pr_trailyo_event_details td
     WHERE td.item_id=b.id AND td.starts_on IS NOT NULL
       AND td.ends_on>=td.starts_on
       AND td.ends_on>=(now() AT TIME ZONE 'Europe/Lisbon')::date
    ))
   OR
   (source_id IS DISTINCT FROM (SELECT id FROM pr_sources WHERE code='trailyo_events' LIMIT 1)
    AND (starts_at IS NULL OR COALESCE(ends_at,starts_at)<now()))
 ) THEN 'Событие завершилось или не указана дата' END,
 CASE WHEN primary_category='events' AND source_id=(SELECT id FROM pr_sources WHERE code='trailyo_events' LIMIT 1) AND NOT EXISTS (SELECT 1 FROM pr_trailyo_event_details td WHERE td.item_id=b.id AND td.starts_on IS NOT NULL AND td.ends_on IS NOT NULL AND td.ends_on>=td.starts_on) THEN 'Нет полного периода мероприятия из Trailyo' END,
 CASE WHEN primary_category='events' AND source_id=(SELECT id FROM pr_sources WHERE code='trailyo_events' LIMIT 1) AND EXISTS (SELECT 1 FROM pr_trailyo_event_details td WHERE td.item_id=b.id AND td.time_known=false AND td.source_time_text IS NULL) THEN 'Не указано, что время мероприятия не подтверждено' END,
 CASE WHEN source_id=(SELECT id FROM pr_sources WHERE code='trailyo_events' LIMIT 1) AND EXISTS(SELECT 1 FROM pr_trailyo_event_details fd WHERE fd.item_id=b.id AND fd.source_type='partner') THEN 'Партнёрское событие исключено из Афиши' END
 ]::text[],NULL) problems FROM base b)
 SELECT cardinality(problems)=0,problems,COALESCE(rated_value,0),picture,hashtag FROM tests
$function$;

CREATE OR REPLACE VIEW public.pr_telegram_delivery_queue AS 
SELECT p.id AS post_id,
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
     JOIN pr_story_drafts draft ON (((draft.item_id = p.item_id) AND (draft.status = 'approved'::text) AND ((draft.context_verified AND (NOT draft.needs_more_facts)) OR pr_owner_override_active(p.item_id)))))
     JOIN LATERAL pr_item_publication_check(p.item_id) gate(allowed, reason) ON (gate.allowed))
     JOIN LATERAL ( SELECT m.public_url,
            m.illustration_label_required
           FROM pr_media_assets m
          WHERE ((m.item_id = p.item_id) AND (m.public_url = i.photo_url) AND (m.status = ANY (ARRAY['approved'::text, 'candidate'::text])) AND (pr_editor_accepted_unverified_photo(p.item_id, m.public_url) OR m.rights_verified OR ((m.media_type = 'brand_generic'::text) AND (m.generation_model = 'trailyo_existing_image_reference'::text) AND (m.approved_by IS NOT NULL) AND (i.primary_category = 'events'::text) AND (EXISTS ( SELECT 1
                   FROM pr_sources src
                  WHERE ((src.id = i.source_id) AND (src.code = 'trailyo_events'::text)))))) AND (m.media_type = ANY (ARRAY['licensed_original'::text, 'owned_original'::text, 'generated_illustration'::text, 'brand_generic'::text])) AND ((m.media_type <> 'brand_generic'::text) OR (m.generation_model = 'trailyo_existing_image_reference'::text)) AND ((m.media_type <> 'generated_illustration'::text) OR (m.illustration_label_required AND (m.storage_bucket = 'pr-editorial-media'::text) AND (m.storage_key IS NOT NULL))))
          ORDER BY m.approved_at DESC NULLS LAST, m.created_at DESC
         LIMIT 1) a ON (true))
  WHERE ((p.status = 'scheduled'::text) AND ((p.scheduled_for IS NULL) OR (p.scheduled_for <= now())) AND (p.prepared_text IS NOT NULL) AND (p.prepared_caption IS NOT NULL) AND (p.category_hashtag IS NOT NULL));
