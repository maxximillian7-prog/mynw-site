-- Editorial Afisha: de-duplicate the live incoming queue and protect against repeat approval.
-- Source of truth: production Neon project restless-pine-73362851.
-- Captured 2026-11-19. Deploy this SQL only to a database that already has pr_items/pr_posts/
-- pr_story_drafts/pr_sources/pr_trailyo_event_details and other Journal Studio tables.
-- Preserves every original Trailyo event, date and existing Telegram publication.
-- The deployed /api/articles?status=incoming queries pr_intake_check directly, so merely
-- filtering pr_editorial_intake_dashboard is NOT sufficient. The helper function
-- pr_afisha_repeat_issue is therefore called inside pr_intake_check for candidate events.
-- Unrelated published and approved articles are accessible in their own editor tabs.
-- DO NOT delete original items, drafts, posts or event rows.
-- For suspected same-date different-title events at one venue, manual inspection remains required.

CREATE TABLE IF NOT EXISTS public.pr_afisha_series_definitions(
 series_code text PRIMARY KEY,
 display_title text NOT NULL,
 original_title_prefix text NOT NULL,
 venue_exact text NOT NULL,
 city_exact text,
 enabled boolean NOT NULL DEFAULT true,
 editorial_note text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (length(series_code) BETWEEN 4 AND 100),
 CHECK (length(original_title_prefix) >= 10),
 CHECK (length(venue_exact)>=5)
);

INSERT INTO public.pr_afisha_series_definitions(series_code,display_title,original_title_prefix,venue_exact,city_exact,editorial_note,enabled) VALUES
('candlelight_hans_zimmer_lisboa','Candlelight — музыка Ханса Циммера, Лиссабон','Candlelight: O melhor de Hans Zimmer','Academia das Ciências de Lisboa','Lisboa','Отдельные выступления одной программы в одном зале, группировка только для редакционной приёмки.',true),
('pe_no_rio_lisboa_rio','PÉ NO RIO — Lisboa Rio Club','PÉ NO RIO -','Lisboa Rio Club','Lisboa','Повторяющийся клубный вечер; прошедшие даты не удалять.',true),
('perreo_society_lisboa_rio','Perreo Society — Lisboa Rio Club','Perreo Society','Lisboa Rio Club','Lisboa','Повторяющиеся клубные вечера; не смешивать с другими вечеринками.',true),
('porto_pub_crawl_eight_drinks','Porto Pub Crawl — 8 напитков, игры, VIP-клуб','Porto: Pub Crawl with 8 Drinks, Games, and VIP Club Entry','The Porto Pubcrawl','Porto','Регулярные сеансы одного продукта; все даты сохранить в Trailyo.',true),
('tejo_sunset_boat_party','Sunset Boat Party — Тежу, прогулка с DJ','Sunset Boat Party With Dj and Open Bar','Estação Fluvial Sul e Sueste','Lisboa','Повторяющийся рейс с разными датами; отдельные сеансы сохранить в Trailyo.',true)
ON CONFLICT(series_code) DO UPDATE SET display_title=EXCLUDED.display_title, original_title_prefix=EXCLUDED.original_title_prefix,venue_exact=EXCLUDED.venue_exact,city_exact=EXCLUDED.city_exact,editorial_note=EXCLUDED.editorial_note,enabled=EXCLUDED.enabled,updated_at=now();

CREATE TABLE IF NOT EXISTS public.pr_afisha_review_suppressed_series(
 series_code text PRIMARY KEY REFERENCES public.pr_afisha_series_definitions(series_code),
 reason text NOT NULL,
 suppressed_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.pr_afisha_review_suppressed_series(series_code,reason) VALUES ('porto_pub_crawl_eight_drinks','Повторяющийся коммерческий паб-тур; редакционный приоритет 19.11.2026 — свежие и интересные семейные/культурные события. Убрать только из «На приёмку», исходные даты и Trailyo не менять.') ON CONFLICT(series_code) DO NOTHING;

-- Dynamic series membership and complete list of independent session dates.
CREATE OR REPLACE VIEW public.pr_afisha_series_members AS
SELECT df.series_code,
    df.display_title,
    i.id AS item_id,
    e.event_id,
    e.starts_on,
    e.ends_on,
    e.venue,
    e.city,
    i.status AS item_status,
    d.status AS draft_status,
    i.canonical_url,
    i.title_original,
    COALESCE(d.headline_ru, i.title_ru, i.title_original) AS editorial_title
   FROM pr_afisha_series_definitions df
     JOIN pr_trailyo_event_details e ON lower(btrim(e.venue)) = lower(btrim(df.venue_exact)) AND (df.city_exact IS NULL OR lower(btrim(e.city)) = lower(btrim(df.city_exact)))
     JOIN pr_items i ON i.id = e.item_id AND lower(btrim(i.title_original)) ~~ (lower(btrim(df.original_title_prefix)) || '%'::text) AND i.duplicate_of IS NULL
     JOIN pr_sources src ON src.id = i.source_id AND src.code = 'trailyo_events'::text
     LEFT JOIN pr_story_drafts d ON d.item_id = i.id
  WHERE df.enabled = true AND e.starts_on IS NOT NULL;

CREATE OR REPLACE VIEW public.pr_afisha_series_review AS
SELECT series_code,
    max(display_title) AS display_title,
    count(*) AS total_sessions,
    count(DISTINCT starts_on) AS unique_dates,
    count(*) FILTER (WHERE starts_on >= (now() AT TIME ZONE 'Europe/Lisbon'::text)::date) AS upcoming_sessions,
    count(*) FILTER (WHERE item_status = 'candidate'::text) AS candidates,
    count(*) FILTER (WHERE item_status = 'approved'::text) AS approved,
    min(starts_on) FILTER (WHERE starts_on >= (now() AT TIME ZONE 'Europe/Lisbon'::text)::date) AS next_date,
    max(starts_on) AS last_date,
    jsonb_agg(jsonb_build_object('date', starts_on::text, 'ends_on', ends_on::text, 'item_id', item_id::text, 'event_id', event_id::text, 'url', canonical_url, 'status', item_status, 'title', editorial_title) ORDER BY starts_on, item_id) AS all_dates_and_events
   FROM pr_afisha_series_members m
  GROUP BY series_code;

-- Server-level repeat guard; candidates only.
CREATE OR REPLACE FUNCTION public.pr_afisha_repeat_issue(p_item_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
WITH c AS (
 SELECT i.id, i.status, i.primary_category, i.title_original, i.canonical_url,
        s.code AS source_code,
        t.event_id, t.city, t.venue, t.starts_on, t.ends_on,
        m.series_code
 FROM public.pr_items i
 JOIN public.pr_sources s ON s.id=i.source_id
 LEFT JOIN public.pr_trailyo_event_details t ON t.item_id=i.id
 LEFT JOIN public.pr_afisha_series_members m ON m.item_id=i.id
 WHERE i.id=p_item_id
)
SELECT CASE
 WHEN c.status IS DISTINCT FROM 'candidate' OR c.source_code IS DISTINCT FROM 'trailyo_events' THEN NULL
 WHEN EXISTS(
  SELECT 1 FROM public.pr_afisha_review_suppressed_series sup WHERE sup.series_code=c.series_code
 ) THEN 'Повторяющаяся серия снята с редакционной приёмки'
 WHEN EXISTS(
  SELECT 1 FROM public.pr_posts own
  WHERE own.item_id=c.id AND own.destination_code='afisha'
    AND own.status IN('sent','queued','scheduled','sending','failed')
 ) THEN 'Материал уже опубликован, запланирован или находится в разборе ошибки доставки'
 WHEN EXISTS(
  SELECT 1
  FROM public.pr_posts p
  JOIN public.pr_items prev ON prev.id=p.item_id AND prev.id<>c.id
  LEFT JOIN public.pr_trailyo_event_details pt ON pt.item_id=prev.id
  WHERE p.destination_code='afisha' AND p.status IN ('sent','queued','scheduled','sending')
  AND (
    prev.canonical_url=c.canonical_url
    OR (c.event_id IS NOT NULL AND c.event_id=pt.event_id)
    OR (
      c.city IS NOT NULL AND c.venue IS NOT NULL
      AND lower(btrim(c.city))=lower(btrim(pt.city))
      AND lower(btrim(c.venue))=lower(btrim(pt.venue))
      AND lower(btrim(c.title_original))=lower(btrim(prev.title_original))
    )
    OR (
      c.series_code IS NOT NULL AND EXISTS(
        SELECT 1 FROM public.pr_afisha_series_members pm
        WHERE pm.series_code=c.series_code AND pm.item_id=prev.id
      )
    )
  )
 ) THEN 'Событие или серия уже опубликованы либо поставлены в очередь афиши'
 WHEN c.series_code IS NOT NULL AND EXISTS (
   SELECT 1 FROM public.pr_afisha_series_members m
   JOIN public.pr_story_drafts d ON d.item_id=m.item_id
   WHERE m.series_code=c.series_code AND m.item_id<>c.id
     AND m.item_status='approved' AND d.status='approved'
 ) THEN 'Серия уже утверждена редактором — повторное согласование не требуется'
 WHEN c.series_code IS NOT NULL AND EXISTS(
   SELECT 1 FROM public.pr_afisha_series_members m
   JOIN public.pr_story_drafts d ON d.item_id=m.item_id
   WHERE m.series_code=c.series_code AND m.item_id<>c.id
     AND m.item_status='candidate'
     AND m.starts_on >= (now() AT TIME ZONE 'Europe/Lisbon')::date
     AND m.starts_on<c.starts_on
     AND d.status IN ('draft','ready_for_review')
     AND d.needs_more_facts=false
     AND char_length(coalesce(d.story_ru,''))>=180
 ) THEN 'Повтор другого сеанса этой серии — оставить более раннюю готовую дату'
 ELSE NULL
 END
FROM c
$function$;

-- Main intake gate: /api/articles reads this function, not the editor dashboard view.
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
 CASE WHEN b.status='candidate' AND b.primary_category='events' THEN public.pr_afisha_repeat_issue(b.id) END,
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

-- Owner one-click approval guard, retaining all other publication behavior.
CREATE OR REPLACE FUNCTION public.pr_owner_approve_and_queue(p_item_id uuid, p_actor uuid, p_note text DEFAULT ''::text, p_delay_minutes integer DEFAULT NULL::integer, p_publish_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(approved boolean, queued boolean, sent boolean, destination text, post_id uuid, scheduled_for timestamp with time zone, issues text[], value_score integer, warning text)
 LANGUAGE plpgsql
AS $function$
DECLARE i record; d record; check_result record; gate record; reservation_post_id uuid; reservation_scheduled_at timestamptz;
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
 IF i.status='candidate' AND i.source_code='trailyo_events'
    AND public.pr_afisha_repeat_issue(p_item_id) IS NOT NULL THEN
   RAISE EXCEPTION 'Повторное утверждение афиши заблокировано: %', public.pr_afisha_repeat_issue(p_item_id);
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
  SELECT r.post_id,r.scheduled_for INTO reservation_post_id,reservation_scheduled_at FROM
  public.pr_schedule_publication(p_item_id,target,p_delay_minutes,p_publish_at) r;
 EXCEPTION WHEN OTHERS THEN
  send_warning:=left(SQLERRM,400);
 END;
 IF reservation_post_id IS NULL THEN
  RETURN QUERY SELECT true,false,false,target,NULL::uuid,NULL::timestamptz,
   check_result.issues,check_result.value_score,
   ('Утверждено владельцем, но планирование не завершено: '||COALESCE(send_warning,'нет записи в очереди'))::text;
  RETURN;
 END IF;
 RETURN QUERY SELECT true,true,false,target,reservation_post_id,reservation_scheduled_at,
  check_result.issues,check_result.value_score, NULL::text;
END $function$;

-- Dashboard view for metrics and editorial reporting.
CREATE OR REPLACE VIEW public.pr_editorial_intake_dashboard AS
WITH base AS (
         SELECT i.id AS item_id,
            i.primary_category,
            i.title_ru,
            i.canonical_url,
            d.status AS draft_status,
            g.ready,
            g.issues,
            g.value_score,
            g.preview_image_url,
            g.category_hashtag,
            i.discovered_at,
            i.status AS _item_status,
            m.series_code AS _series_code,
            m.starts_on AS _series_date,
            s.code IS DISTINCT FROM 'trailyo_events'::text OR pr_afisha_advance_notice_ok(i.id) AS _notice_ok
           FROM pr_items i
             LEFT JOIN pr_sources s ON s.id = i.source_id
             LEFT JOIN pr_story_drafts d ON d.item_id = i.id
             LEFT JOIN pr_afisha_series_members m ON m.item_id = i.id
             CROSS JOIN LATERAL pr_intake_check(i.id) g(ready, issues, value_score, preview_image_url, category_hashtag)
          WHERE i.duplicate_of IS NULL
        ), eligible AS (
         SELECT b_1.item_id,
            b_1.primary_category,
            b_1.title_ru,
            b_1.canonical_url,
            b_1.draft_status,
            b_1.ready,
            b_1.issues,
            b_1.value_score,
            b_1.preview_image_url,
            b_1.category_hashtag,
            b_1.discovered_at,
            b_1._item_status,
            b_1._series_code,
            b_1._series_date,
            b_1._notice_ok,
            b_1._series_code IS NOT NULL AND b_1._item_status = 'candidate'::text AND b_1.ready AND (EXISTS ( SELECT 1
                   FROM pr_afisha_series_members earlier
                  WHERE earlier.series_code = b_1._series_code AND earlier.item_status = 'approved'::text AND earlier.draft_status = 'approved'::text AND earlier.starts_on <= b_1._series_date)) AS _covered_by_approved
           FROM base b_1
        ), ranked AS (
         SELECT b_1.item_id,
            row_number() OVER (PARTITION BY b_1._series_code ORDER BY (
                CASE
                    WHEN b_1._series_date > (now() AT TIME ZONE 'Europe/Lisbon'::text)::date THEN 0
                    WHEN b_1._series_date = (now() AT TIME ZONE 'Europe/Lisbon'::text)::date THEN 1
                    ELSE 2
                END), b_1._series_date, b_1.discovered_at DESC, b_1.item_id) AS series_rank
           FROM eligible b_1
          WHERE b_1._series_code IS NOT NULL AND b_1._item_status = 'candidate'::text AND b_1.ready AND b_1._notice_ok AND NOT b_1._covered_by_approved
        )
 SELECT b.item_id,
    b.primary_category,
        CASE
            WHEN r.series_rank = 1 AND b._series_code IS NOT NULL THEN ((( SELECT d.display_title
               FROM pr_afisha_series_definitions d
              WHERE d.series_code = b._series_code)) || ' · сеансов: '::text) || rv.total_sessions::text
            ELSE b.title_ru
        END AS title_ru,
    b.canonical_url,
    b.draft_status,
    b.ready,
    b.issues,
    b.value_score,
    b.preview_image_url,
    b.category_hashtag,
    b.discovered_at,
    b._series_code AS series_code,
    rv.total_sessions AS series_total_sessions,
    rv.unique_dates AS series_unique_dates,
    rv.all_dates_and_events AS series_dates_and_events
   FROM eligible b
     LEFT JOIN ranked r ON r.item_id = b.item_id
     LEFT JOIN pr_afisha_series_review rv ON rv.series_code = b._series_code
  WHERE b._notice_ok AND NOT b._covered_by_approved AND (r.series_rank IS NULL OR r.series_rank = 1) AND (b._item_status <> 'candidate'::text OR b._series_code IS NULL OR NOT (EXISTS ( SELECT 1
           FROM pr_afisha_review_suppressed_series sup
          WHERE sup.series_code = b._series_code))) AND (b.primary_category <> 'events'::text OR b._item_status = 'candidate'::text AND NOT (EXISTS ( SELECT 1
           FROM pr_posts own
          WHERE own.item_id = b.item_id AND (own.destination_code = ANY (ARRAY['afisha'::text, 'main'::text])) AND (own.status = ANY (ARRAY['sent'::text, 'queued'::text, 'scheduled'::text, 'sending'::text, 'failed'::text])))) AND NOT (EXISTS ( SELECT 1
           FROM pr_posts pp
             JOIN pr_items already ON already.id = pp.item_id AND already.id <> b.item_id
             LEFT JOIN pr_trailyo_event_details candidate_detail ON candidate_detail.item_id = b.item_id
             LEFT JOIN pr_trailyo_event_details published_detail ON published_detail.item_id = already.id
             JOIN pr_items candidate_item ON candidate_item.id = b.item_id
          WHERE pp.destination_code = 'afisha'::text AND (pp.status = ANY (ARRAY['sent'::text, 'queued'::text, 'scheduled'::text, 'sending'::text])) AND (already.canonical_url = b.canonical_url OR candidate_detail.event_id IS NOT NULL AND candidate_detail.event_id = published_detail.event_id OR candidate_detail.city IS NOT NULL AND candidate_detail.venue IS NOT NULL AND lower(btrim(candidate_detail.city)) = lower(btrim(published_detail.city)) AND lower(btrim(candidate_detail.venue)) = lower(btrim(published_detail.venue)) AND lower(btrim(candidate_item.title_original)) = lower(btrim(already.title_original)) OR b._series_code IS NOT NULL AND (EXISTS ( SELECT 1
                   FROM pr_afisha_series_members member
                  WHERE member.item_id = already.id AND member.series_code = b._series_code))))));
