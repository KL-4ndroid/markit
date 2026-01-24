-- ==================== RPC Functions ====================
-- 版本：003 - RPC 函數
-- 日期：2026-01-24
-- 說明：安全的 RPC 函數，避免 RLS 權限複雜度

-- ==================== 安全的加入團隊 RPC ====================

CREATE OR REPLACE FUNCTION join_market_by_code(
  p_code TEXT
)
RETURNS JSONB
SECURITY DEFINER  -- 使用函數定義者的權限執行
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invitation RECORD;
  v_market RECORD;
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- 獲取當前用戶 ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '未登入'
    );
  END IF;
  
  -- 查詢並鎖定邀請碼（防止競態條件）
  SELECT * INTO v_invitation
  FROM market_invitations
  WHERE code = UPPER(p_code)
    AND is_used = FALSE
  FOR UPDATE;
  
  -- 驗證邀請碼
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '邀請碼無效或已使用'
    );
  END IF;
  
  -- 檢查是否過期
  IF v_invitation.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '邀請碼已過期'
    );
  END IF;
  
  -- 檢查是否已是成員
  IF EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = v_invitation.market_id
      AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '您已經是該市集的成員'
    );
  END IF;
  
  -- 獲取市集資訊
  SELECT * INTO v_market
  FROM markets
  WHERE id = v_invitation.market_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '市集不存在'
    );
  END IF;
  
  -- 原子操作：標記邀請碼 + 添加成員
  UPDATE market_invitations
  SET 
    is_used = TRUE,
    used_by = v_user_id,
    used_at = NOW()
  WHERE id = v_invitation.id;
  
  INSERT INTO market_members (market_id, user_id, role)
  VALUES (v_invitation.market_id, v_user_id, 'staff');
  
  -- 返回市集資訊（供 Client 端同步使用）
  v_result := jsonb_build_object(
    'success', TRUE,
    'market_id', v_market.id,
    'market_name', v_market.name,
    'owner_id', v_market.owner_id
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- 統一錯誤處理
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;

-- 授予執行權限
GRANT EXECUTE ON FUNCTION join_market_by_code(TEXT) TO authenticated;

-- ==================== 生成邀請碼 RPC ====================

CREATE OR REPLACE FUNCTION generate_invite_code(
  p_market_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_code TEXT;
  v_invitation_id UUID;
  v_max_attempts INTEGER := 10;
  v_attempt INTEGER := 0;
BEGIN
  -- 獲取當前用戶 ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '未登入'
    );
  END IF;
  
  -- 檢查是否為 owner
  IF NOT EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = p_market_id
      AND user_id = v_user_id
      AND role = 'owner'
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '只有市集擁有者可以生成邀請碼'
    );
  END IF;
  
  -- 生成唯一的 6 位邀請碼
  LOOP
    v_attempt := v_attempt + 1;
    
    -- 生成隨機 6 位大寫字母和數字
    v_code := UPPER(
      SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6)
    );
    
    -- 檢查是否已存在
    IF NOT EXISTS (
      SELECT 1 FROM market_invitations
      WHERE code = v_code AND is_used = FALSE
    ) THEN
      EXIT; -- 找到唯一的碼
    END IF;
    
    -- 防止無限循環
    IF v_attempt >= v_max_attempts THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', '生成邀請碼失敗，請稍後再試'
      );
    END IF;
  END LOOP;
  
  -- 插入邀請碼
  INSERT INTO market_invitations (code, market_id, created_by)
  VALUES (v_code, p_market_id, v_user_id)
  RETURNING id INTO v_invitation_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'code', v_code,
    'invitation_id', v_invitation_id,
    'expires_at', (NOW() + INTERVAL '7 days')::TEXT
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;

-- 授予執行權限
GRANT EXECUTE ON FUNCTION generate_invite_code(UUID) TO authenticated;

-- ==================== 移除團隊成員 RPC ====================

CREATE OR REPLACE FUNCTION remove_team_member(
  p_market_id UUID,
  p_user_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  -- 獲取當前用戶 ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '未登入'
    );
  END IF;
  
  -- 檢查是否為 owner
  IF NOT EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = p_market_id
      AND user_id = v_current_user_id
      AND role = 'owner'
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '只有市集擁有者可以移除成員'
    );
  END IF;
  
  -- 不能移除 owner
  IF EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = p_market_id
      AND user_id = p_user_id
      AND role = 'owner'
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '不能移除市集擁有者'
    );
  END IF;
  
  -- 移除成員
  DELETE FROM market_members
  WHERE market_id = p_market_id
    AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '成員不存在'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', '成員已移除'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;

-- 授予執行權限
GRANT EXECUTE ON FUNCTION remove_team_member(UUID, UUID) TO authenticated;

-- ==================== 獲取市集成員列表 RPC ====================

CREATE OR REPLACE FUNCTION get_market_members(
  p_market_id UUID
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT,
  joined_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  -- 獲取當前用戶 ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION '未登入';
  END IF;
  
  -- 檢查是否為成員
  IF NOT EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = p_market_id
      AND user_id = v_current_user_id
  ) THEN
    RAISE EXCEPTION '無權限查看此市集的成員';
  END IF;
  
  -- 返回成員列表
  RETURN QUERY
  SELECT 
    mm.user_id,
    p.email,
    p.display_name,
    p.avatar_url,
    mm.role,
    mm.joined_at
  FROM market_members mm
  JOIN profiles p ON mm.user_id = p.id
  WHERE mm.market_id = p_market_id
  ORDER BY 
    CASE mm.role 
      WHEN 'owner' THEN 1 
      WHEN 'staff' THEN 2 
    END,
    mm.joined_at;
END;
$$;

-- 授予執行權限
GRANT EXECUTE ON FUNCTION get_market_members(UUID) TO authenticated;

-- ==================== 註解 ====================
COMMENT ON FUNCTION join_market_by_code(TEXT) IS '使用邀請碼加入市集（原子操作）';
COMMENT ON FUNCTION generate_invite_code(UUID) IS '生成市集邀請碼（僅 owner）';
COMMENT ON FUNCTION remove_team_member(UUID, UUID) IS '移除團隊成員（僅 owner）';
COMMENT ON FUNCTION get_market_members(UUID) IS '獲取市集成員列表（需為成員）';

-- ==================== 完成 ====================
-- RPC 函數創建完成
-- 下一步：執行 004_rls_policies.sql
