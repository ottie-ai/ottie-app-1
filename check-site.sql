-- Check if workspace exists
SELECT id, slug, created_at 
FROM workspaces 
WHERE slug = 'sonias' 
AND deleted_at IS NULL;

-- Check if site exists
SELECT id, slug, title, status, workspace_id, published_at, deleted_at
FROM sites 
WHERE slug = 'testujem'
AND deleted_at IS NULL;
