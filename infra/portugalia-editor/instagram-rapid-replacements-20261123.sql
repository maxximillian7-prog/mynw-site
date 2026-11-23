-- 2026-11-23 — user-directed one-per-minute Instagram replacement run
-- In production Neon project restless-pine-73362851, branch br-young-paper-b972wmgd.
-- Historical selection is EXACTLY 44 approved Instagram replacement assets from:
--   first: "Потеряли документы в Португалии: что сделать в первый час и как получить дубликаты"
--   last:  "Подать заявление в PSP или GNR можно онлайн — но не любое и не при экстренной ситуации"
-- Includes one originally failed historical post. All 44 are already approved
-- replacement Buffer post IDs, so no new IDs/duplication needed.
-- NEVER deletes original Instagram posts; owner will delete old ones manually.
-- The fixed future/new IG queue 08/13/18/23 Europe/Lisbon remains intact.

CREATE TABLE IF NOT EXISTS public.pr_instagram_rapid_replace_20261123 (
 item_id uuid PRIMARY KEY REFERENCES public.pr_items(id),
 ordinal integer NOT NULL UNIQUE,
 replacement_buffer_post_id text NOT NULL UNIQUE,
 state text NOT NULL DEFAULT 'waiting'
  CHECK(state IN ('waiting','submitting','submitted','sent','needs_review')),
 attempts integer NOT NULL DEFAULT 0,
 last_request_at timestamptz,
 confirmed_sent_at timestamptz,
 last_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

WITH ends AS (
 SELECT (SELECT scheduled_for FROM pr_instagram_publications
         WHERE item_id='ce555f68-ef0b-4b9c-bee4-8686f9452319'::uuid) start_at,
        (SELECT scheduled_for FROM pr_instagram_publications
         WHERE item_id='b310b5f3-f3dd-45b6-ac06-1b7bb791cc21'::uuid) end_at
), source AS (
 SELECT r.item_id,r.replacement_buffer_post_id,
  row_number() OVER(ORDER BY p.scheduled_for,p.created_at,p.item_id)::int AS ordinal
 FROM public.pr_instagram_retrofit_20261123 r
 JOIN public.pr_instagram_publications p ON p.id=r.publication_id
 CROSS JOIN ends e
 WHERE p.scheduled_for BETWEEN e.start_at AND e.end_at
   AND p.status IN ('published','failed')
   AND r.stage IN ('draft_created','scheduled_repost')
   AND r.replacement_buffer_post_id IS NOT NULL
   AND length(r.caption) BETWEEN 80 AND 2200
   AND jsonb_array_length(r.carousel_urls)<=9
)
INSERT INTO public.pr_instagram_rapid_replace_20261123
 (item_id,ordinal,replacement_buffer_post_id)
SELECT item_id,ordinal,replacement_buffer_post_id FROM source
ON CONFLICT(item_id) DO NOTHING;

-- Trigger "Portugal Instagram 44 historical replacement drafts every minute"
-- invokes prbuffer /internal/rapid-replace with: "* * * * *".
-- Only the explicitly listed Buffer IDs may be edited with shareNow.
-- Fail-closed state machine: waiting -> submitting -> submitted -> sent.
-- For errors: needs_review pauses the entire run (no automatic duplicates).
-- The existing /internal/refill job suspends itself while this queue is active.
-- To check progress:
SELECT state, count(*)::integer AS n
FROM public.pr_instagram_rapid_replace_20261123
GROUP BY state ORDER BY state;
