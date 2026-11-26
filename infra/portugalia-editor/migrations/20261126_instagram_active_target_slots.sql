-- Applied on production Neon project restless-pine-73362851 on 2026-11-26.
-- The editorial interleave table stores an ORIGINAL tentative time for each
-- waiting old Instagram article. This is NOT a real Buffer slot, so those
-- placeholders must not prevent another article from using the next free slot.
-- All data rows and original times are preserved.
-- Only dispatching, scheduled and reschedule_pending times must be unique.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS pr_instagram_interleave_20261123_active_target_time_uniq
ON public.pr_instagram_interleave_20261123(target_time)
WHERE state IN ('dispatching','scheduled','reschedule_pending');
ALTER TABLE public.pr_instagram_interleave_20261123
DROP CONSTRAINT IF EXISTS pr_instagram_interleave_20261123_target_time_key;
COMMIT;
