-- Applied to Journal Studio production on 2026-11-06.
-- Editors write translations only through authenticated studio-api routes.
-- Public studio-feed never exposes consent_ref, email or internal metadata.
ALTER TABLE public.studio_authors
 ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.studio_authors
 ADD CONSTRAINT studio_authors_translations_object_check
 CHECK (jsonb_typeof(translations) = 'object');
COMMENT ON COLUMN public.studio_authors.translations IS
 'Editor-reviewed author profile translations by locale; per-field source snapshots prevent stale translations.';
