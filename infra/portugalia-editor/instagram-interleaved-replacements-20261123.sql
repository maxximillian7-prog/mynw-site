-- Executed on 2026-11-23: Portugal Ryadom, production Neon.
-- 42 historical, updated Instagram Buffer drafts only; original first old
-- ("Потеряли документы...") already successfully republished and excluded.
-- Old post about €100 voucher was flagged as spam; NOT retried or scheduled.
-- NEW publication times stay 08:00 / 13:00 / 18:00 / 23:00 Europe/Lisbon.
-- OLD replacement posts are interleaved 10:30, 15:30, 20:30 Lisbon,
-- three per day from 2026-11-24 until 2026-12-07. No overnight publishing.
-- Only existing Buffer post IDs are edited. Buffer pending cap = 10.
-- Separate /internal/refill trigger promotes waiting old drafts after new
-- articles; /internal/rapid-replace remains disabled after the spam warning.
CREATE TABLE IF NOT EXISTS public.pr_instagram_interleave_20261123 (
 item_id uuid PRIMARY KEY REFERENCES public.pr_items(id),
 ordinal integer NOT NULL UNIQUE,
 replacement_buffer_post_id text NOT NULL UNIQUE,
 target_time timestamptz NOT NULL UNIQUE,
 state text NOT NULL DEFAULT 'waiting'
   CHECK (state IN ('waiting','reschedule_pending','dispatching','scheduled','published','needs_review')),
 attempts integer NOT NULL DEFAULT 0,
 last_error text,
 scheduled_at timestamptz,
 published_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
WITH targets AS (
 SELECT q.item_id,q.ordinal,q.replacement_buffer_post_id,r.stage,
 row_number() OVER (ORDER BY q.ordinal)-1 AS seq
 FROM public.pr_instagram_rapid_replace_20261123 q
 JOIN public.pr_instagram_retrofit_20261123 r
 ON r.item_id=q.item_id AND r.replacement_buffer_post_id=q.replacement_buffer_post_id
 WHERE q.state='waiting'
   AND r.stage IN ('draft_created','scheduled_repost')
), schedule AS (
 SELECT *,
 (date '2026-11-24'+(seq/3)::int+
 make_time(CASE(seq%3) WHEN 0 THEN 10 WHEN 1 THEN 15 ELSE 20 END,30,0))
 AT TIME ZONE 'Europe/Lisbon' AS due_at
 FROM targets
)
INSERT INTO public.pr_instagram_interleave_20261123
(item_id,ordinal,replacement_buffer_post_id,target_time,state)
SELECT item_id,ordinal,replacement_buffer_post_id,due_at,
 CASE WHEN stage='scheduled_repost' THEN 'reschedule_pending' ELSE 'waiting' END
FROM schedule
ON CONFLICT(item_id) DO NOTHING;
SELECT state,count(*)::int AS n FROM public.pr_instagram_interleave_20261123 GROUP BY state ORDER BY state;
