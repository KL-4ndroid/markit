-- 查詢 RLS enabled 狀態 + 所有 policy 的完整資訊
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'events';

-- 列出 events 表所有 policy
SELECT 
  policyname,
  permissive,
  cmd,
  roles,
  qual::text AS using_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'events'
ORDER BY cmd, policyname;

-- 關鍵：用 auth.uid() 模擬的查詢
-- 把 A_USER_ID 換成老闆 A 的 UUID
SELECT 
  '015_only_count' AS source,
  COUNT(*) AS count
FROM events
WHERE actor_id = 'A_USER_ID'::uuid
   OR (market_id IS NOT NULL 
       AND EXISTS (SELECT 1 FROM market_members WHERE market_id = events.market_id AND user_id = 'A_USER_ID'::uuid));

-- 用 005 政策模擬
SELECT 
  '005_v2_count' AS source,
  COUNT(*) AS count
FROM events
WHERE market_id IS NULL
   OR market_id IN (SELECT market_id FROM market_members WHERE user_id = 'A_USER_ID'::uuid);

-- 兩個 OR 起來
SELECT 
  'both_policies' AS source,
  COUNT(*) AS count
FROM events
WHERE 
  -- 015
  actor_id = 'A_USER_ID'::uuid
  OR
  (market_id IS NOT NULL 
   AND EXISTS (SELECT 1 FROM market_members WHERE market_id = events.market_id AND user_id = 'A_USER_ID'::uuid))
  OR
  -- 005 v2
  market_id IS NULL
  OR
  market_id IN (SELECT market_id FROM market_members WHERE user_id = 'A_USER_ID'::uuid);
