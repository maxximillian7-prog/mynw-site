-- Portugal Ryadom / Journal Studio: Instagram caption formatting and verified geotag readiness
-- Production migration executed 2026-11-14. Idempotent on replay.
-- Never remove the native Buffer isAiGenerated marker on generated images.
-- Native Instagram location tags require Buffer connected through Facebook and a verified Facebook Place ID.
ALTER TABLE public.pr_instagram_accounts
  ADD COLUMN IF NOT EXISTS buffer_connection_route text NOT NULL DEFAULT 'instagram_login';
CREATE TABLE IF NOT EXISTS public.pr_instagram_event_geotags (
 event_id uuid PRIMARY KEY,
 facebook_place_id text NOT NULL,
 place_name text NOT NULL,
 verified_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT instagram_event_place_id_safe CHECK (length(trim(facebook_place_id))>=4 AND facebook_place_id ~ '^[A-Za-z0-9_-]+$'),
 CONSTRAINT instagram_event_place_name_safe CHECK (length(trim(place_name))>=2)
);
COMMENT ON TABLE public.pr_instagram_event_geotags IS 'Verified Facebook Place IDs for true Buffer Instagram geolocation. Never invent location IDs.';
COMMENT ON COLUMN public.pr_instagram_accounts.buffer_connection_route IS 'instagram_login (native geolocation unavailable) or verified facebook_page connection.';

CREATE OR REPLACE FUNCTION public.pr_prepare_instagram_caption(p_item_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
 a record;
 headline text;
 intro text;
 takeaway text;
 footer text;
 hashtags text;
 datestr text;
 placestr text;
 linkstr text;
 base text;
 room integer;
BEGIN
 SELECT i.id,i.primary_category,i.starts_at,i.location_city,i.canonical_url,
 d.headline_ru,d.lead_ru,d.why_matters_ru,
 ev.event_id,ev.city,ev.venue,ev.starts_on,ev.ends_on
 INTO a
 FROM public.pr_items i
 JOIN public.pr_story_drafts d ON d.item_id=i.id
 LEFT JOIN public.pr_trailyo_event_details ev ON ev.item_id=i.id
 WHERE i.id=p_item_id;
 IF NOT FOUND THEN RETURN NULL;END IF;
 headline:=nullif(trim(a.headline_ru),'');
 intro:=nullif(trim(a.lead_ru),'');
 takeaway:=nullif(trim(a.why_matters_ru),'');
 hashtags:=nullif(trim(concat_ws(' ','#ПортугалияРядом',public.pr_topic_hashtags(p_item_id))),'');
 IF a.primary_category='events' THEN
   IF a.starts_on IS NOT NULL THEN
     datestr:='📅 '||to_char(a.starts_on,'DD.MM.YYYY');
     IF a.ends_on IS NOT NULL AND a.ends_on>a.starts_on THEN
       datestr:=datestr||' — '||to_char(a.ends_on,'DD.MM.YYYY');
     END IF;
   ELSIF a.starts_at IS NOT NULL THEN
     datestr:='📅 '||to_char(a.starts_at AT TIME ZONE 'Europe/Lisbon','DD.MM.YYYY');
   END IF;
   placestr:=nullif(trim(concat_ws(', ',nullif(trim(a.venue),''),nullif(trim(coalesce(a.city,a.location_city)),''))),'');
   IF placestr IS NOT NULL THEN placestr:='📍 '||placestr; END IF;
   IF a.event_id IS NOT NULL THEN
     linkstr:='🔗 Событие в Trailyo: https://mynw.app/trailyo/event/?id='||a.event_id::text;
   ELSIF a.canonical_url LIKE 'https://mynw.app/trailyo/event/?id=%' THEN
     linkstr:='🔗 Событие в Trailyo: '||a.canonical_url;
   END IF;
   footer:=concat_ws(E'\n\n',datestr,placestr,linkstr,hashtags);
 ELSE
   footer:=concat_ws(E'\n\n','Полные материалы и источники — в Telegram @pt_ryadom',hashtags);
 END IF;
 -- Keep Trailyo deep link, date, city and hashtags intact even for long leads.
 room:=greatest(0,2150-char_length(footer)-2);
 base:=concat_ws(E'\n\n',headline,nullif(left(coalesce(intro,''),900),''),nullif(left(coalesce(takeaway,''),560),''));
 base:=left(trim(base),room);
 RETURN nullif(trim(concat_ws(E'\n\n',nullif(base,''),nullif(footer,''))),'');
END
$function$
;
CREATE OR REPLACE FUNCTION public.pr_stage_instagram_article(p_item_id uuid)
 RETURNS TABLE(publication_id uuid, publication_status text, stage_result text)
 LANGUAGE plpgsql
AS $function$
 DECLARE i public.pr_items%ROWTYPE; d public.pr_story_drafts%ROWTYPE; r public.pr_editorial_reviews%ROWTYPE;
 media public.pr_media_assets%ROWTYPE; pub public.pr_instagram_publications%ROWTYPE; gate record; target_status text;
 BEGIN
 SELECT * INTO i FROM public.pr_items WHERE id=p_item_id;
 SELECT * INTO d FROM public.pr_story_drafts WHERE item_id=p_item_id;
 SELECT * INTO r FROM public.pr_editorial_reviews WHERE item_id=p_item_id ORDER BY reviewed_at DESC,id DESC LIMIT 1;
 IF i.id IS NULL OR d.id IS NULL OR r.id IS NULL OR i.status<>'approved' OR d.status<>'approved'
    OR d.needs_more_facts IS DISTINCT FROM false OR d.context_verified IS DISTINCT FROM true
    OR r.decision<>'approve' OR r.claim_verified IS DISTINCT FROM true THEN
    RETURN QUERY SELECT NULL::uuid,NULL::text,'editorial_approval_incomplete'::text; RETURN;
 END IF;
 SELECT * INTO gate FROM public.pr_item_publication_check(p_item_id);
 IF gate.allowed IS DISTINCT FROM true AND gate.reason NOT IN ('photo_rights_unverified','editor_photo_approval_missing') THEN
    RETURN QUERY SELECT NULL::uuid,NULL::text,coalesce(gate.reason,'publication_checks_failed')::text; RETURN;
 END IF;
 IF i.primary_category='events' AND (i.starts_at IS NULL OR coalesce(i.ends_at,i.starts_at) < now()) THEN
    RETURN QUERY SELECT NULL::uuid,NULL::text,'event_expired'::text; RETURN;
 END IF;
 SELECT * INTO media FROM public.pr_media_assets m
 WHERE m.item_id=p_item_id AND m.public_url=i.photo_url AND m.status='approved' AND m.rights_verified IS TRUE
   AND m.media_type IN ('licensed_original','owned_original','generated_illustration')
   AND (m.media_type<>'generated_illustration' OR (m.illustration_label_required AND m.storage_key IS NOT NULL))
   AND m.public_url LIKE 'https://%'
   AND i.photo_rights IN ('owned','cc_licensed','permission_confirmed')
 ORDER BY m.approved_at DESC NULLS LAST,m.created_at DESC LIMIT 1;
 target_status:=CASE WHEN media.id IS NULL THEN 'awaiting_media' ELSE 'awaiting_approval' END;
 INSERT INTO public.pr_instagram_publications (item_id,account_key,status,image_url,caption)
 VALUES (p_item_id,'pt_ryadom',target_status,CASE WHEN media.id IS NOT NULL THEN i.photo_url END,
  public.pr_prepare_instagram_caption(p_item_id))
 ON CONFLICT (item_id,account_key) DO NOTHING;
 SELECT * INTO pub FROM public.pr_instagram_publications WHERE item_id=p_item_id AND account_key='pt_ryadom';
 RETURN QUERY SELECT pub.id,pub.status, CASE WHEN pub.status='awaiting_media' THEN 'needs_rights_cleared_media' ELSE 'staged' END;
 END $function$
;
