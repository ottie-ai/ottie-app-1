-- ==========================================
-- CHECK WORKSPACES OVER SEAT LIMIT
-- ==========================================
-- Query to find all workspaces that are over their seat limit
-- ==========================================

SELECT 
  w.id,
  w.name,
  w.plan,
  w.subscription_status,
  w.seats_limit,
  w.seats_used,
  (w.seats_used - w.seats_limit) as over_limit_by,
  w.grace_period_ends_at,
  w.subscription_locked_at,
  CASE 
    WHEN w.seats_used > w.seats_limit THEN 'OVER LIMIT'
    WHEN w.seats_used = w.seats_limit THEN 'AT LIMIT'
    ELSE 'OK'
  END as status,
  w.created_at
FROM public.workspaces w
WHERE w.deleted_at IS NULL
  AND w.seats_used > w.seats_limit
ORDER BY (w.seats_used - w.seats_limit) DESC, w.created_at DESC;

-- Alternative: Show all workspaces with their status
-- Uncomment to see all workspaces (not just over limit)
/*
SELECT 
  w.id,
  w.name,
  w.plan,
  w.subscription_status,
  w.seats_limit,
  w.seats_used,
  (w.seats_used - w.seats_limit) as over_limit_by,
  CASE 
    WHEN w.seats_used > w.seats_limit THEN 'OVER LIMIT'
    WHEN w.seats_used = w.seats_limit THEN 'AT LIMIT'
    ELSE 'OK'
  END as status,
  w.created_at
FROM public.workspaces w
WHERE w.deleted_at IS NULL
ORDER BY 
  CASE 
    WHEN w.seats_used > w.seats_limit THEN 1
    WHEN w.seats_used = w.seats_limit THEN 2
    ELSE 3
  END,
  (w.seats_used - w.seats_limit) DESC;
*/

