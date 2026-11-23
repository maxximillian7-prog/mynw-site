-- Stage only compact v2 Instagram JPEG; the full article and Telegram original remain unchanged.
CREATE OR REPLACE FUNCTION public.pr_stage_instagram_article(p_item_id uuid)
 RETURNS TABLE(publication_id uuid, publication_status text, stage_result text)
 LANGUAGE plpgsql
AS $function$
 DECLARE i public.pr_items%ROWTYPE; d public.pr_story_drafts%ROWTYPE; r public.pr_editorial_reviews%ROWTYPE;
 media public.pr_media_assets%ROWTYPE; pub public.pr_instagram_publications%ROWTYPE; gate record; target_status text;
 BEGIN
 SELECT * INTO i FROM public.pr_items WHERE id=p_item_id;
 SELECT * INTO d FROM public.pr_story_drafts WHERE item_id=p_item_id;
 SELECT * INTO r FROM public.pr_editorial_reviews WHERE item_id=p_item_id ORDER BY reviewed_at DESC,id DESC LIMIT 1;
 IF i.id IS NULL OR d.id IS NULL OR r.id IS NULL OR i.status<>'approved' OR d.status<>'approved'
    OR d.needs_more_facts IS DISTINCT FROM false OR d.context_verified IS DISTINCT FROM true
    OR r.decision<>'approve'
    OR (r.claim_verified IS DISTINCT FROM true
      AND NOT (i.source_fact_checked IS TRUE
               AND public.pr_owner_override_active(p_item_id))) THEN
    RETURN QUERY SELECT NULL::uuid,NULL::text,'editorial_approval_incomplete'::text; RETURN;
 END IF;
 SELECT * INTO gate FROM public.pr_item_publication_check(p_item_id);
 IF gate.allowed IS DISTINCT FROM true AND gate.reason NOT IN ('photo_rights_unverified','editor_photo_approval_missing') THEN
    RETURN QUERY SELECT NULL::uuid,NULL::text,coalesce(gate.reason,'publication_checks_failed')::text; RETURN;
 END IF;
 IF i.primary_category='events' AND (i.starts_at IS NULL OR coalesce(i.ends_at,i.starts_at) < now()) THEN
    RETURN QUERY SELECT NULL::uuid,NULL::text,'event_expired'::text; RETURN;
 END IF;
 -- Instagram is a photo post with its own reviewed, typographically
 -- composed JPEG. Telegram continues using i.photo_url without overlay.
 SELECT * INTO media FROM public.pr_media_assets m
 WHERE m.item_id=p_item_id
   AND m.generation_model='pt_ryadom_instagram_typography_v1'
   AND m.generation_prompt IS NOT NULL
   AND (m.generation_prompt::jsonb->>'headline')=d.headline_ru
   AND (m.generation_prompt::jsonb->>'source_photo_url')=i.photo_url
   AND (m.generation_prompt::jsonb->>'design_version')='2'
   AND m.status='approved' AND m.rights_verified IS TRUE
   AND m.media_type IN ('licensed_original','owned_original','generated_illustration')
   AND (m.media_type<>'generated_illustration' OR (m.illustration_label_required AND m.storage_key IS NOT NULL))
   AND m.storage_bucket='pr-editorial-media'
   AND m.storage_key LIKE 'instagram-covers/%'
   AND m.public_url LIKE 'https://%'
   AND i.photo_rights IN ('owned','cc_licensed','permission_confirmed')
 ORDER BY m.approved_at DESC NULLS LAST,m.created_at DESC LIMIT 1;
 target_status:=CASE WHEN media.id IS NULL THEN 'awaiting_media' ELSE 'awaiting_approval' END;
 INSERT INTO public.pr_instagram_publications (item_id,account_key,status,image_url,caption)
 VALUES (p_item_id,'pt_ryadom',target_status,CASE WHEN media.id IS NOT NULL THEN media.public_url END,
  public.pr_prepare_instagram_caption(p_item_id))
 ON CONFLICT (item_id,account_key) DO UPDATE SET
   status=EXCLUDED.status,
   image_url=EXCLUDED.image_url,
   caption=EXCLUDED.caption,
   approved_by=NULL,approved_at=NULL,
   last_error=NULL,updated_at=now()
 WHERE pr_instagram_publications.buffer_post_id IS NULL
   AND pr_instagram_publications.status IN ('awaiting_media','awaiting_approval','failed');
 SELECT * INTO pub FROM public.pr_instagram_publications WHERE item_id=p_item_id AND account_key='pt_ryadom';
 RETURN QUERY SELECT pub.id,pub.status, CASE WHEN pub.status='awaiting_media' THEN 'needs_rights_cleared_media' ELSE 'staged' END;
 END $function$;

