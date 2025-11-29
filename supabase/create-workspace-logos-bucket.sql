-- ==========================================
-- WORKSPACE LOGOS STORAGE BUCKET SETUP
-- ==========================================
-- 
-- INSTRUKCIE:
-- 1. Najprv vytvorte bucket cez Supabase Dashboard:
--    - Supabase Dashboard → Storage
--    - Kliknite na "New bucket"
--    - Názov bucketu: `workspace-logos`
--    - Public bucket: **Zapnúť** (aby boli logá verejne dostupné)
--    - File size limit: 2MB
--    - Allowed MIME types: image/jpeg, image/jpg, image/png, image/gif, image/webp, image/svg+xml
--
-- 2. Potom spustite tento SQL skript na vytvorenie RLS policies
-- ==========================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Workspace owners/admins can upload workspace logos" ON storage.objects;
DROP POLICY IF EXISTS "Workspace owners/admins can update workspace logos" ON storage.objects;
DROP POLICY IF EXISTS "Workspace owners/admins can delete workspace logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view workspace logos" ON storage.objects;

-- Allow workspace owners/admins to upload logos for their workspace
CREATE POLICY "Workspace owners/admins can upload workspace logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workspace-logos' AND
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
    AND (name LIKE m.workspace_id::text || '/%' OR name = m.workspace_id::text)
  )
);

-- Allow workspace owners/admins to update logos for their workspace
CREATE POLICY "Workspace owners/admins can update workspace logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'workspace-logos' AND
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
    AND (name LIKE m.workspace_id::text || '/%' OR name = m.workspace_id::text)
  )
);

-- Allow workspace owners/admins to delete logos for their workspace
CREATE POLICY "Workspace owners/admins can delete workspace logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'workspace-logos' AND
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
    AND (name LIKE m.workspace_id::text || '/%' OR name = m.workspace_id::text)
  )
);

-- Allow public read access to workspace logos
CREATE POLICY "Public can view workspace logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'workspace-logos');

