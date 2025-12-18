-- ==========================================
-- SITE IMAGES STORAGE BUCKET SETUP
-- ==========================================
-- 
-- Tento skript automaticky vytvorí bucket a nastaví RLS policies.
-- Stačí ho spustiť v Supabase SQL Editor.
-- 
-- Bucket nastavenia:
-- - Názov: `site-images`
-- - Public bucket: **Zapnuté** (aby boli obrázky verejne dostupné)
-- - File size limit: 5MB (5242880 bytes)
-- - Allowed MIME types: image/jpeg, image/jpg, image/png, image/gif, image/webp
-- 
-- Štruktúra bucket:
-- - `{site-id}/...` - Site images (owner/admin/assigned agent)
-- - `temp-preview/{preview-id}/...` - Temp previews (service_role only)
-- 
-- ==========================================

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-images',
  'site-images',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Service role can upload site images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update site images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete site images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload site images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update site images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete site images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from own folder" ON storage.objects;
DROP POLICY IF EXISTS "Public can view site images" ON storage.objects;

-- ==========================================
-- SERVICE ROLE POLICIES (for server actions)
-- ==========================================
-- Service role can do everything - used for:
-- - Scraping/processing (server-side)
-- - Temp preview image uploads
-- - Image cleanup jobs

CREATE POLICY "Service role can upload site images"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'site-images');

CREATE POLICY "Service role can update site images"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'site-images');

CREATE POLICY "Service role can delete site images"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'site-images');

-- ==========================================
-- USER POLICIES (for client-side uploads)
-- ==========================================
-- Only owner, admin, or assigned agent can upload/update/delete
-- Temp previews are handled by service_role only (server actions)

-- Allow authenticated users to upload images for sites they can edit
-- ONLY for site folders - NOT for temp-preview or user folders
CREATE POLICY "Users can upload site images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-images' AND
  -- Must be a site folder path (starts with site UUID)
  name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' AND
  -- User must have edit access to the site
  -- Extract site_id from path and check membership
  (
    SUBSTRING(name FROM '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')::uuid
    IN (
      SELECT s.id FROM public.sites s
      INNER JOIN public.memberships m ON m.workspace_id = s.workspace_id
      WHERE m.user_id = auth.uid()
      AND s.deleted_at IS NULL
      AND (
        (m.role IN ('owner', 'admin'))
        OR
        (m.role = 'agent' AND (s.creator_id = auth.uid() OR s.assigned_agent_id = auth.uid()))
      )
    )
  )
);

-- Allow authenticated users to update images for sites they can edit
CREATE POLICY "Users can update site images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-images' AND
  -- Must be a site folder path (starts with site UUID)
  name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' AND
  -- User must have edit access to the site
  -- Extract site_id from path and check membership
  (
    SUBSTRING(name FROM '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')::uuid
    IN (
      SELECT s.id FROM public.sites s
      INNER JOIN public.memberships m ON m.workspace_id = s.workspace_id
      WHERE m.user_id = auth.uid()
      AND s.deleted_at IS NULL
      AND (
        (m.role IN ('owner', 'admin'))
        OR
        (m.role = 'agent' AND (s.creator_id = auth.uid() OR s.assigned_agent_id = auth.uid()))
      )
    )
  )
);

-- Allow authenticated users to delete images for sites they can edit
CREATE POLICY "Users can delete site images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'site-images' AND
  -- Must be a site folder path (starts with site UUID)
  name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' AND
  -- User must have edit access to the site
  -- Extract site_id from path (first part before /) and check membership
  (
    -- Get first part of path (site UUID)
    SUBSTRING(name FROM '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')::uuid
    IN (
      SELECT s.id FROM public.sites s
      INNER JOIN public.memberships m ON m.workspace_id = s.workspace_id
      WHERE m.user_id = auth.uid()
      AND s.deleted_at IS NULL
      AND (
        -- Owners/admins can delete for any site in workspace
        (m.role IN ('owner', 'admin'))
        OR
        -- Agents can delete ONLY for sites they created OR are assigned to
        (m.role = 'agent' AND (s.creator_id = auth.uid() OR s.assigned_agent_id = auth.uid()))
      )
    )
  )
);

-- ==========================================
-- PUBLIC READ ACCESS
-- ==========================================
-- Anyone can view images (needed for displaying on public sites)

CREATE POLICY "Public can view site images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'site-images');

-- ==========================================
-- SECURITY NOTES
-- ==========================================
-- 
-- 1. Temp previews (temp-preview/*):
--    - Upload/update/delete: ONLY service_role (server actions)
--    - This prevents any authenticated user from tampering with temp previews
-- 
-- 2. Site images ({site-id}/*):
--    - Upload/update/delete: owner, admin, OR assigned agent
--    - Strict check that user has membership in workspace AND proper role
-- 
-- 3. No user folder support:
--    - Users cannot upload to personal folders
--    - All uploads must be tied to a specific site
-- 
-- 4. Public read:
--    - All images are publicly readable (needed for displaying on sites)
-- 
-- ==========================================
