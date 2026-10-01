-- ============================================
-- 員工邀請系統：連結邀請功能
-- 版本：028
-- 日期：2026-03-01
-- 描述：建立 staff_invitations 表，支援透過連結邀請員工
-- ============================================

-- ============================================
-- Step 1: 建立員工邀請表
-- ============================================

CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 索引：加速 token 查詢
  CONSTRAINT staff_invitations_token_key UNIQUE (token)
);

COMMENT ON TABLE staff_invitations IS '員工邀請表：儲存邀請連結的 Token';
COMMENT ON COLUMN staff_invitations.owner_id IS '老闆的 user_id';
COMMENT ON COLUMN staff_invitations.token IS '唯一的邀請 Token（用於生成連結）';
COMMENT ON COLUMN staff_invitations.expires_at IS '過期時間（建立時間 + 3 天）';

-- ============================================
-- Step 2: 建立索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_staff_invitations_owner 
ON staff_invitations(owner_id);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_token 
ON staff_invitations(token);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_expires 
ON staff_invitations(expires_at);

-- ============================================
-- Step 3: 啟用 RLS
-- ============================================

ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

-- 刪除舊政策（如果存在）
DROP POLICY IF EXISTS "Owners can manage their invitations" ON staff_invitations;
DROP POLICY IF EXISTS "Anyone can verify invitation tokens" ON staff_invitations;
DROP POLICY IF EXISTS "Owners can insert invitations" ON staff_invitations;
DROP POLICY IF EXISTS "Owners can view their invitations" ON staff_invitations;
DROP POLICY IF EXISTS "Owners can delete their invitations" ON staff_invitations;

-- ✅ 老闆可以插入邀請（必須設定 owner_id 為自己）
CREATE POLICY "Owners can insert invitations"
ON staff_invitations
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- ✅ 老闆可以查看自己的邀請
CREATE POLICY "Owners can view their invitations"
ON staff_invitations
FOR SELECT
USING (auth.uid() = owner_id);

-- ✅ 老闆可以刪除自己的邀請
CREATE POLICY "Owners can delete their invitations"
ON staff_invitations
FOR DELETE
USING (auth.uid() = owner_id);

-- ✅ 關鍵：允許未登入用戶透過 token 查詢（唯讀，用於驗證）
CREATE POLICY "Anyone can verify invitation tokens"
ON staff_invitations
FOR SELECT
USING (token IS NOT NULL);

-- ============================================
-- Step 4: 建立自動清理過期邀請的函數
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- 刪除過期的邀請
  DELETE FROM staff_invitations
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE '已清理 % 個過期邀請', deleted_count;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_invitations IS '清理過期的員工邀請（可由 Supabase Cron 定期執行）';

-- ============================================
-- Step 5: 建立驗證邀請 Token 的函數
-- ============================================

CREATE OR REPLACE FUNCTION verify_invitation_token(p_token TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  owner_id UUID,
  owner_email TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_owner_email TEXT;
  v_expires_at TIMESTAMPTZ;
  v_is_valid BOOLEAN;
BEGIN
  -- 查詢邀請資訊
  SELECT 
    si.owner_id,
    u.email,
    si.expires_at,
    (si.expires_at > NOW())
  INTO v_owner_id, v_owner_email, v_expires_at, v_is_valid
  FROM staff_invitations si
  JOIN auth.users u ON u.id = si.owner_id
  WHERE si.token = p_token
  LIMIT 1;
  
  -- 如果找到記錄，返回結果
  IF FOUND THEN
    RETURN QUERY SELECT v_is_valid, v_owner_id, v_owner_email, v_expires_at;
  ELSE
    -- 如果找不到記錄，返回 false
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

COMMENT ON FUNCTION verify_invitation_token IS '驗證邀請 Token 是否有效，並返回老闆信息';

-- ============================================
-- Step 6: 建立自動綁定員工關係的函數
-- ============================================

CREATE OR REPLACE FUNCTION accept_invitation_and_bind(
  p_token TEXT,
  p_staff_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  relationship_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_relationship_id UUID;
  v_staff_email TEXT;
  v_existing_owner_count INTEGER;
BEGIN
  -- 1. 驗證 Token 是否存在且未過期
  SELECT si.owner_id, si.expires_at
  INTO v_owner_id, v_expires_at
  FROM staff_invitations si
  WHERE si.token = p_token;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, '邀請連結不存在'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  IF v_expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, '邀請連結已過期'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- ✅ 2. 檢查用戶是否已經加入其他團隊（一個用戶只能加入一個團隊）
  SELECT COUNT(*)
  INTO v_existing_owner_count
  FROM staff_relationships
  WHERE staff_id = p_staff_id
  AND status IN ('pending', 'active');
  
  IF v_existing_owner_count > 0 THEN
    RETURN QUERY SELECT FALSE, '您已經是其他老闆的員工，一個帳號只能加入一個團隊'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- 3. 檢查是否已經是此老闆的員工
  IF EXISTS (
    SELECT 1 FROM staff_relationships
    WHERE owner_id = v_owner_id
    AND staff_id = p_staff_id
    AND status IN ('pending', 'active')
  ) THEN
    RETURN QUERY SELECT FALSE, '您已經是此老闆的員工'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- 4. 獲取員工 Email
  SELECT email INTO v_staff_email
  FROM auth.users
  WHERE id = p_staff_id;
  
  -- 5. 建立員工關係（直接設為 active）
  INSERT INTO staff_relationships (
    owner_id,
    staff_id,
    staff_email,
    status,
    accepted_at,
    permissions
  ) VALUES (
    v_owner_id,
    p_staff_id,
    v_staff_email,
    'active',
    NOW(),
    '{"can_view": true, "can_edit": false}'::jsonb
  )
  RETURNING id INTO v_relationship_id;
  
  -- 6. 返回成功
  RETURN QUERY SELECT TRUE, '成功加入團隊'::TEXT, v_relationship_id;
END;
$$;

COMMENT ON FUNCTION accept_invitation_and_bind IS '接受邀請並自動建立員工關係';

-- ============================================
-- 完成
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 員工邀請系統創建完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '新增內容：';
  RAISE NOTICE '- ✅ staff_invitations 表';
  RAISE NOTICE '- ✅ RLS 政策（支援未登入用戶驗證）';
  RAISE NOTICE '- ✅ 3 個輔助函數';
  RAISE NOTICE '  - cleanup_expired_invitations()';
  RAISE NOTICE '  - verify_invitation_token()';
  RAISE NOTICE '  - accept_invitation_and_bind()';
  RAISE NOTICE '========================================';
  RAISE NOTICE '使用方式：';
  RAISE NOTICE '1. 老闆產生邀請連結';
  RAISE NOTICE '2. 員工透過連結註冊';
  RAISE NOTICE '3. 系統自動建立員工關係';
  RAISE NOTICE '========================================';
END;
$$;
