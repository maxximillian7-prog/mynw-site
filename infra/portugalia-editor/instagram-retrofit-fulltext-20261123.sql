-- Applied 2026-11-23 in production Neon project restless-pine-73362851.
-- Telegram content, Telegram button styles and source photographs are untouched.
-- Instagram caption: full approved story where <= 2,200 Instagram chars.
-- Longer articles: caption intro (sentences only) plus carousel slides containing
-- the entire approved text, because Instagram's 2,200-character cap is strict.
-- Buffer cannot edit SENT posts. Existing SENT posts are kept intact and
-- replacement versions are saved as UNSCHEDULED Buffer drafts.
CREATE OR REPLACE FUNCTION public.pr_prepare_instagram_caption_v3(p_item_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
WITH base AS (
 SELECT i.id,i.primary_category,i.canonical_url,
        COALESCE(NULLIF(trim(d.headline_ru),''), NULLIF(trim(i.title_ru),''),i.title_original) AS headline,
        trim(COALESCE(d.story_ru,'')) AS story,
        trim(COALESCE(d.why_matters_ru,'')) AS why,
        ev.event_id,ev.city,ev.venue,ev.starts_on,ev.ends_on
 FROM public.pr_items i JOIN public.pr_story_drafts d ON d.item_id=i.id
 LEFT JOIN public.pr_trailyo_event_details ev ON ev.item_id=i.id
 WHERE i.id=p_item_id AND i.status='approved' AND d.status='approved'
), s AS (
 SELECT *,
  trim(concat_ws(E'\n\n',nullif(trim(headline),''),nullif(story,''),nullif(why,''))) AS full_text,
  trim(concat_ws(E'\n',
   CASE WHEN primary_category='events' AND starts_on IS NOT NULL THEN
       '📅 '||to_char(starts_on,'DD.MM.YYYY')||
       CASE WHEN ends_on>starts_on THEN ' — '||to_char(ends_on,'DD.MM.YYYY') ELSE '' END
   END,
   CASE WHEN primary_category='events' AND coalesce(nullif(trim(venue),''),nullif(trim(city),'')) IS NOT NULL
        THEN '📍 '||concat_ws(', ',nullif(trim(venue),''),nullif(trim(city),'')) END,
   CASE WHEN primary_category='events' AND event_id IS NOT NULL THEN
        '🔗 Событие в Trailyo: https://mynw.app/trailyo/event/?id='||event_id::text END,
   'Больше материалов: https://t.me/pt_ryadom',
   concat_ws(' ','#ПортугалияРядом', public.pr_topic_hashtags(id))
  )) AS footer
 FROM base
), limit_data AS (
 SELECT *, GREATEST(300, 2190 - char_length(footer) - 11) AS max_body FROM s
), res AS (
 SELECT *,
  CASE WHEN char_length(full_text)<=max_body THEN full_text
  ELSE
   COALESCE(NULLIF(trim(substring(left(full_text,GREATEST(300,max_body-49)) FROM '(?s)^(.+[.!?…])')),''),
            trim(regexp_replace(left(full_text,GREATEST(300,max_body-49)), E'\\s+[^\\s]+$', '')))||
    E'\n\n📖 Полная статья — на следующих слайдах.'
  END AS body
 FROM limit_data
)
SELECT CASE WHEN char_length(body||E'\n\n'||footer)>2200 THEN left(body||E'\n\n'||footer,2200)
       ELSE body||E'\n\n'||footer END
FROM res
$function$
;

CREATE OR REPLACE FUNCTION public.pr_prepare_instagram_caption(p_item_id uuid)
RETURNS text LANGUAGE sql STABLE AS $f$
  SELECT public.pr_prepare_instagram_caption_v3(p_item_id)
$f$;

CREATE TABLE IF NOT EXISTS public.pr_instagram_retrofit_20261123 (
 item_id uuid PRIMARY KEY REFERENCES public.pr_items(id),
 publication_id uuid NOT NULL REFERENCES public.pr_instagram_publications(id),
 source_status text NOT NULL,
 source_buffer_post_id text,
 cover_url text NOT NULL,
 carousel_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
 caption text NOT NULL,
 full_text text NOT NULL,
 stage text NOT NULL DEFAULT 'ready',
 replacement_buffer_post_id text,
 attempts integer NOT NULL DEFAULT 0,
 last_error text,
 synced_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now()
);
