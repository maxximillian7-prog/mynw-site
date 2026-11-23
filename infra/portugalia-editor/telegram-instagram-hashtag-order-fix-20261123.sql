-- Fix 2026-11-23: Instagram CTA immediately after the full article, while
-- keeping the canonical category hashtag LAST (required by pr_posts guards).
-- Preserve both channel destinations, the publication queue and ptnav buttons.
CREATE OR REPLACE FUNCTION public.pr_build_telegram_post(p_item_id uuid)
RETURNS text LANGUAGE plpgsql STABLE AS $function$
DECLARE x record; tg text; body text; footer text; post text; credit text; topics text;
BEGIN
 SELECT i.primary_category,i.canonical_url,
        COALESCE(NULLIF(d.headline_ru,''),NULLIF(i.title_ru,''),i.title_original) title,
        COALESCE(d.hook_ru,'') hook,
        COALESCE(NULLIF(d.lead_ru,''),NULLIF(i.summary_ru,''),'') lead,
        COALESCE(d.story_ru,'') story,COALESCE(d.why_matters_ru,'') why
 INTO x FROM pr_items i LEFT JOIN pr_story_drafts d ON d.item_id=i.id WHERE i.id=p_item_id;
 IF NOT FOUND OR x.canonical_url !~ '^https://' THEN RETURN NULL; END IF;
 tg:=pr_telegram_hashtag(x.primary_category);
 IF tg IS NULL THEN RETURN NULL; END IF;
 body:=trim(concat_ws(E'\n\n',nullif(trim(x.title),''),nullif(trim(x.story),''),nullif(trim(x.why),'')));
 body:=trim(replace(body,tg,''));
 topics:=pr_topic_hashtags(p_item_id);
 credit:=nullif(pr_photo_credit(p_item_id),'');
 footer:=concat_ws(E'\n','Источник: '||x.canonical_url,credit,topics,tg);
 post:=body||E'\n\n'||'Наш канал в Инстаграмм: https://www.instagram.com/pt_ryadom/'||E'\n\n'||footer;
 IF char_length(post)>28000 THEN RETURN NULL; END IF;
 RETURN post;
END $function$;

-- Regression: every buildable approved article must have a clickable Instagram
-- URL in the prepared text and end with exactly its category hashtag.
DO $assert$
BEGIN
 IF EXISTS (
  SELECT 1 FROM public.pr_items i
  CROSS JOIN LATERAL (SELECT public.pr_build_telegram_post(i.id) AS txt) b
  WHERE i.status='approved' AND b.txt IS NOT NULL
    AND (
      strpos(b.txt,'Наш канал в Инстаграмм: https://www.instagram.com/pt_ryadom/')=0
      OR right(trim(b.txt),length(public.pr_telegram_hashtag(i.primary_category)))
         IS DISTINCT FROM public.pr_telegram_hashtag(i.primary_category)
    )
 ) THEN
   RAISE EXCEPTION 'Telegram Instagram-link and category-hashtag regression';
 END IF;
END $assert$;
