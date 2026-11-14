-- Trailyo location and time for Journal Studio Afisha.
-- Source: production Trailyo public.experiences; fields are synchronized by prtrailmedia.
-- No changes to licensing or editor-approval policy.
-- A date is NOT a confirmed clock time. time_known must be true;
-- 23:59 without an explicit source_time_text is treated as an importer placeholder.
-- All displayed times are formatted in Europe/Lisbon (summer/winter transitions).
CREATE TABLE IF NOT EXISTS public.pr_trailyo_event_details (
  item_id uuid PRIMARY KEY REFERENCES public.pr_items(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  city text,
  venue text,
  starts_on date,
  ends_on date,
  time_known boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  source_time_text text,
  latitude double precision,
  longitude double precision,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pr_trailyo_geo_valid CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  )
);
