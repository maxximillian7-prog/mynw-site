-- Portugal Ryadom: track successful one-button-per-row navigation edits.
-- Works with the existing prpublish + ptnav send pipeline; never resends posts.
-- The original ptnav schedule and telegram channel IDs remain unchanged.
CREATE TABLE IF NOT EXISTS public.pr_post_nav_wide_sync (
  post_id uuid PRIMARY KEY REFERENCES public.pr_posts(id) ON DELETE CASCADE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  layout_version text NOT NULL DEFAULT 'full_width_v1',
  last_error text,
  status text NOT NULL DEFAULT 'done',
  attempts integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pr_post_nav_wide_sync
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'done',
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
-- Monitor live progress:
SELECT status,count(*) AS messages
FROM public.pr_post_nav_wide_sync
GROUP BY status ORDER BY status;
