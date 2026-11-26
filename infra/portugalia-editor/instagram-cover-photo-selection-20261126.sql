-- Portugal Ryadom: fix Instagram-only cover inadvertently replacing the
-- article/Telegram photo during pr_media_assets candidate -> approved.
-- Do NOT apply the Instagram typography image to public.pr_items.photo_url.
-- Approved cover stays in pr_media_assets and pr_stage_instagram_article
-- selects it independently. Existing post IDs are not changed.
-- Applied in Neon production 2026-11-26.

CREATE OR REPLACE FUNCTION public.pr_set_selected_photo_after_approval()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
 IF NEW.status='approved' AND OLD.status IS DISTINCT FROM 'approved'
    -- Instagram-only typographic overlays must never replace the article/Telegram photo.
    AND NEW.generation_model IS DISTINCT FROM 'pt_ryadom_instagram_typography_v1'
    AND COALESCE(NEW.storage_key,'') NOT LIKE 'instagram-covers/%'
    AND NEW.rights_verified AND NEW.media_type IN ('licensed_original','owned_original','generated_illustration')
    AND NEW.public_url ~ '^https://' AND (NEW.media_type<>'generated_illustration' OR (NEW.illustration_label_required AND NEW.storage_bucket='pr-editorial-media' AND NEW.storage_key IS NOT NULL)) THEN
  UPDATE public.pr_items SET
   photo_url=NEW.public_url,
   photo_rights=CASE WHEN NEW.media_type IN ('owned_original','generated_illustration') THEN 'owned' ELSE 'cc_licensed' END,
   photo_attribution=NEW.attribution,
   photo_license=CASE WHEN NEW.media_type='generated_illustration' THEN 'AI-generated editorial artwork, not a documentary photograph' ELSE NULLIF(btrim(split_part(coalesce(NEW.license_details,''),';',1)),'') END,
   photo_licence_url=CASE WHEN NEW.media_type='generated_illustration' THEN NULL ELSE NULLIF(btrim(split_part(coalesce(NEW.license_details,''),';',2)),'') END,
   updated_at=now()
  WHERE id=NEW.item_id AND status='candidate';
 END IF;
 RETURN NEW;
END
$function$

