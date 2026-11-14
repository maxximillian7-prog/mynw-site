-- 2026-11-14: Editorial Afisha — prepare new events in advance but keep
-- existing ongoing multi-day exhibitions / festivals / activities eligible.
-- Do NOT modify published or scheduled posts; this is an intake selection only.

CREATE OR REPLACE FUNCTION public.pr_afisha_advance_notice_ok(p_item_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
 SELECT COALESCE((
  SELECT td.source_type IS NOT NULL AND td.source_type <> 'partner'
    AND td.starts_on IS NOT NULL AND td.ends_on IS NOT NULL
    AND td.ends_on >= td.starts_on
    AND i.event_status NOT IN ('cancelled','past','postponed')
    AND (
      -- New events: normally give readers at least seven days to plan.
      td.starts_on >= (now() AT TIME ZONE 'Europe/Lisbon')::date + 7
      -- Events already running remain eligible if they continue tomorrow or later.
      OR (td.starts_on <= (now() AT TIME ZONE 'Europe/Lisbon')::date
          AND td.ends_on > (now() AT TIME ZONE 'Europe/Lisbon')::date)
      -- Multi-day events starting soon remain useful if they run past the seven-day horizon.
      OR (td.starts_on > (now() AT TIME ZONE 'Europe/Lisbon')::date
          AND td.ends_on >= (now() AT TIME ZONE 'Europe/Lisbon')::date + 7)
    )
  FROM public.pr_items i
  JOIN public.pr_sources s ON s.id=i.source_id AND s.code='trailyo_events'
  JOIN public.pr_trailyo_event_details td ON td.item_id=i.id
  WHERE i.id=p_item_id
 ),false)
$function$
;

CREATE OR REPLACE VIEW public.pr_editorial_intake_dashboard AS
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
    i.discovered_at
   FROM pr_items i
     LEFT JOIN pr_story_drafts d ON d.item_id = i.id
     CROSS JOIN LATERAL pr_intake_check(i.id) g(ready, issues, value_score, preview_image_url, category_hashtag)
  WHERE i.duplicate_of IS NULL AND (i.status <> 'candidate'::text OR NOT (EXISTS ( SELECT 1
           FROM pr_sources sx
          WHERE sx.id = i.source_id AND sx.code = 'trailyo_events'::text)) OR pr_afisha_advance_notice_ok(i.id));;

-- Expected: zero rejected candidates in editorial intake.
SELECT count(*) AS violating_candidates
FROM public.pr_editorial_intake_dashboard d
JOIN public.pr_items i ON i.id=d.item_id
WHERE i.status='candidate' AND i.primary_category='events'
AND NOT public.pr_afisha_advance_notice_ok(i.id);
