-- Deployed to Supabase project utauewtqtmqgmguxtmvn on 2026-10-20.
-- Only anonymous site-wide aggregate pageviews. No identifiers or request metadata.
CREATE TABLE IF NOT EXISTS public.mynw_pageviews_daily (
  day date NOT NULL,
  page_path text NOT NULL,
  page_lang text NOT NULL,
  source_kind text NOT NULL,
  views bigint NOT NULL DEFAULT 0 CHECK (views >= 0),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mynw_pageviews_daily_pk PRIMARY KEY (day,page_path,page_lang,source_kind),
  CONSTRAINT mynw_pageviews_path_safe CHECK (length(page_path) <= 128 AND page_path ~ '^/[a-z0-9_/-]*$'),
  CONSTRAINT mynw_pageviews_language_safe CHECK (page_lang IN ('en','pt','ru','uk','fr','es','de','it','und')),
  CONSTRAINT mynw_pageviews_source_safe CHECK (source_kind IN ('direct','internal','external','nowwhat','nowcook','nowkids','nowgreen'))
);
ALTER TABLE public.mynw_pageviews_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mynw_pageviews_daily FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mynw_pageviews_daily TO service_role;
CREATE OR REPLACE FUNCTION public.mynw_record_pageview(
  p_path text, p_lang text, p_source text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF p_path IS NULL OR length(p_path) > 128
    OR p_path !~ '^/[a-z0-9_/-]*$'
    OR p_lang IS NULL OR p_lang NOT IN ('en','pt','ru','uk','fr','es','de','it','und')
    OR p_source IS NULL OR p_source NOT IN ('direct','internal','external','nowwhat','nowcook','nowkids','nowgreen')
  THEN
    RAISE EXCEPTION 'invalid_aggregate_dimensions';
  END IF;
  INSERT INTO public.mynw_pageviews_daily(
    day,page_path,page_lang,source_kind,views,first_seen_at,last_seen_at
  )
  VALUES ((now() AT TIME ZONE 'UTC')::date,p_path,p_lang,p_source,1,now(),now())
  ON CONFLICT (day,page_path,page_lang,source_kind)
  DO UPDATE SET views = public.mynw_pageviews_daily.views + 1,
                last_seen_at = now();
END
$fn$;
REVOKE ALL ON FUNCTION public.mynw_record_pageview(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mynw_record_pageview(text,text,text) TO service_role;
