-- Journal Studio: only the studio-api service role can check protected media references.
-- Conservative: match historical version snapshots and any existing reference.
CREATE OR REPLACE FUNCTION public.studio_media_in_use_v1(p_asset uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
 SELECT
   EXISTS (SELECT 1 FROM public.studio_posts p WHERE p.cover_path=p_asset::text OR COALESCE(p.blocks::text,'') LIKE '%' || p_asset::text || '%')
 OR EXISTS (SELECT 1 FROM public.studio_channel_versions v WHERE v.cover_path=p_asset::text OR COALESCE(v.blocks::text,'') LIKE '%' || p_asset::text || '%')
 OR EXISTS (SELECT 1 FROM public.studio_ai_translations t WHERE COALESCE(t.blocks::text,'') LIKE '%' || p_asset::text || '%')
 OR EXISTS (SELECT 1 FROM public.studio_post_versions pv WHERE COALESCE(pv.snapshot::text,'') LIKE '%' || p_asset::text || '%')
 OR EXISTS (SELECT 1 FROM public.studio_topics t WHERE t.image_asset_id=p_asset)
 OR EXISTS (SELECT 1 FROM public.studio_authors a WHERE a.photo_asset_id=p_asset)
 OR EXISTS (SELECT 1 FROM public.studio_image_jobs j WHERE j.asset_id=p_asset);
$fn$;
REVOKE ALL ON FUNCTION public.studio_media_in_use_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.studio_media_in_use_v1(uuid) TO service_role;
