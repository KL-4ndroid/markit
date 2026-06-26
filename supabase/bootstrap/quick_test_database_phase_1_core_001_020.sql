-- BoothBook / Markit quick test database phase 1: core schema 001-020 plus sync_status compatibility
-- Intended only for a new/empty or disposable Supabase staging/local test project.
-- Do NOT run on production or on a database that contains real user data.
-- Sanitized for quick bootstrap: removed COMMENT ON statements and replaced RAISE NOTICE with NULL;
-- Generated at: 2026-06-23 02:01:36 +08:00

set check_function_bodies = off;

-- ============================================================
-- BEGIN SOURCE: 001_uuid_schema.sql
-- ============================================================

-- ==================== Supabase Schema Migration ====================
-- 版本：001 - UUID 資料表結構
-- 日期：2026-01-24
-- 說明：創建所有資料表（UUID 主鍵版本）

-- ==================== 啟用 UUID 擴展 ====================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== 用戶資料表 ====================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== 市集資料表（讀取模型）====================
-- 注意：此表僅作為讀取模型，由 Trigger 自動維護
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (
    status IN ('registered', 'accepted', 'paid', 'ongoing', 'completed', 'postponed', 'cancelled')
  ),
  
  -- 時間軸資訊
  early_entry_enabled BOOLEAN DEFAULT FALSE,
  early_entry_time TIME,
  check_in_time TIME,
  operating_start_time TIME,
  operating_end_time TIME,
  
  -- 財務資訊
  registration_fee NUMERIC(10,2) DEFAULT 0,
  booth_cost NUMERIC(10,2) DEFAULT 0,
  deposit NUMERIC(10,2),
  table_rental NUMERIC(10,2),
  chair_rental NUMERIC(10,2),
  umbrella_rental NUMERIC(10,2),
  tablecloth_rental NUMERIC(10,2),
  commission_rate NUMERIC(5,2),
  
  -- 免費提供標記
  table_free BOOLEAN DEFAULT FALSE,
  chair_free BOOLEAN DEFAULT FALSE,
  umbrella_free BOOLEAN DEFAULT FALSE,
  tablecloth_free BOOLEAN DEFAULT FALSE,
  
  -- 統計資訊（由事件計算）
  total_revenue NUMERIC(10,2) DEFAULT 0,
  total_profit NUMERIC(10,2) DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  total_deals INTEGER DEFAULT 0,
  
  notes TEXT,
  
  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_markets_updated_at
  BEFORE UPDATE ON markets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== 商品資料表（讀取模型）====================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('handmade', 'food', 'accessory', 'clothing', 'art', 'stationery', 'other')
  ),
  price NUMERIC(10,2) NOT NULL,
  cost NUMERIC(10,2),
  icon_name TEXT,
  color_code TEXT,
  stock INTEGER,
  unlimited_stock BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  total_sold INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== 市集成員表 ====================
CREATE TABLE IF NOT EXISTS market_members (
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (market_id, user_id)
);

-- ==================== 邀請碼表 ====================
CREATE TABLE IF NOT EXISTS market_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL CHECK (LENGTH(code) = 6),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES profiles(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== 事件表（唯一寫入來源）====================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (
    type IN (
      'market_created',
      'market_status_changed',
      'market_started',
      'market_ended',
      'product_created',
      'product_updated',
      'product_deleted',
      'interaction_recorded',
      'deal_closed'
    )
  ),
  payload JSONB NOT NULL,
  actor_id UUID NOT NULL REFERENCES profiles(id),
  market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- ==================== 索引優化 ====================
-- Events 表索引
CREATE INDEX IF NOT EXISTS idx_events_market_id ON events(market_id);
CREATE INDEX IF NOT EXISTS idx_events_actor_id ON events(actor_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- Market Members 表索引
CREATE INDEX IF NOT EXISTS idx_market_members_user_id ON market_members(user_id);
CREATE INDEX IF NOT EXISTS idx_market_members_market_id ON market_members(market_id);

-- Invitations 表索引
CREATE INDEX IF NOT EXISTS idx_invitations_code ON market_invitations(code) WHERE NOT is_used;
CREATE INDEX IF NOT EXISTS idx_invitations_market_id ON market_invitations(market_id);

-- Products 表索引
CREATE INDEX IF NOT EXISTS idx_products_market_id ON products(market_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Markets 表索引
CREATE INDEX IF NOT EXISTS idx_markets_owner_id ON markets(owner_id);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_start_date ON markets(start_date);

-- ==================== 註解 ====================


-- ==================== 完成 ====================
-- 資料表創建完成
-- 下一步：執行 002_cqrs_triggers.sql

-- ============================================================
-- END SOURCE: 001_uuid_schema.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 002_cqrs_triggers.sql
-- ============================================================

-- ==================== CQRS Triggers ====================
-- 版本：002 - CQRS 模式 Trigger
-- 日期：2026-01-24
-- 說明：當 events 表插入事件時，自動更新讀取模型（markets 和 products 表）

-- ==================== Market 讀取模型更新 Trigger ====================

CREATE OR REPLACE FUNCTION update_market_read_model()
RETURNS TRIGGER AS $$
DECLARE
  market_data JSONB;
BEGIN
  -- 根據事件類型更新讀取模型
  CASE NEW.type
    
    -- 市集建立事件
    WHEN 'market_created' THEN
      INSERT INTO markets (
        id,
        owner_id,
        name,
        location,
        start_date,
        end_date,
        start_time,
        end_time,
        status,
        early_entry_enabled,
        early_entry_time,
        check_in_time,
        operating_start_time,
        operating_end_time,
        registration_fee,
        booth_cost,
        deposit,
        table_rental,
        chair_rental,
        umbrella_rental,
        tablecloth_rental,
        commission_rate,
        table_free,
        chair_free,
        umbrella_free,
        tablecloth_free,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        NEW.market_id,
        NEW.actor_id,
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'location')::TEXT,
        (NEW.payload->>'startDate')::DATE,
        (NEW.payload->>'endDate')::DATE,
        (NEW.payload->>'startTime')::TIME,
        (NEW.payload->>'endTime')::TIME,
        'registered',
        (NEW.payload->>'earlyEntryEnabled')::BOOLEAN,
        (NEW.payload->>'earlyEntryTime')::TIME,
        (NEW.payload->>'checkInTime')::TIME,
        (NEW.payload->>'operatingStartTime')::TIME,
        (NEW.payload->>'operatingEndTime')::TIME,
        (NEW.payload->>'registrationFee')::NUMERIC,
        (NEW.payload->>'boothCost')::NUMERIC,
        (NEW.payload->>'deposit')::NUMERIC,
        (NEW.payload->>'tableRental')::NUMERIC,
        (NEW.payload->>'chairRental')::NUMERIC,
        (NEW.payload->>'umbrellaRental')::NUMERIC,
        (NEW.payload->>'tableclothRental')::NUMERIC,
        (NEW.payload->>'commissionRate')::NUMERIC,
        (NEW.payload->>'tableFree')::BOOLEAN,
        (NEW.payload->>'chairFree')::BOOLEAN,
        (NEW.payload->>'umbrellaFree')::BOOLEAN,
        (NEW.payload->>'tableclothFree')::BOOLEAN,
        (NEW.payload->>'notes')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
      
      -- 自動添加 owner 到 market_members
      INSERT INTO market_members (market_id, user_id, role)
      VALUES (NEW.market_id, NEW.actor_id, 'owner')
      ON CONFLICT (market_id, user_id) DO NOTHING;
    
    -- 市集狀態變更事件
    WHEN 'market_status_changed' THEN
      UPDATE markets
      SET 
        status = (NEW.payload->>'newStatus')::TEXT,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 市集開始營業事件
    WHEN 'market_started' THEN
      UPDATE markets
      SET 
        status = 'ongoing',
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 市集結束營業事件
    WHEN 'market_ended' THEN
      UPDATE markets
      SET 
        status = 'completed',
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 成交事件：更新統計
    WHEN 'deal_closed' THEN
      UPDATE markets
      SET 
        total_revenue = total_revenue + (NEW.payload->>'totalAmount')::NUMERIC,
        total_deals = total_deals + 1,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 互動記錄事件：更新統計
    WHEN 'interaction_recorded' THEN
      UPDATE markets
      SET 
        total_interactions = total_interactions + 1,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    ELSE
      -- 其他事件類型不處理
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 創建 Trigger
DROP TRIGGER IF EXISTS trigger_update_market_read_model ON events;
CREATE TRIGGER trigger_update_market_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_market_read_model();

-- ==================== Product 讀取模型更新 Trigger ====================

CREATE OR REPLACE FUNCTION update_product_read_model()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_item JSONB;
BEGIN
  CASE NEW.type
    
    -- 商品建立事件
    WHEN 'product_created' THEN
      INSERT INTO products (
        id,
        market_id,
        name,
        category,
        price,
        cost,
        icon_name,
        color_code,
        stock,
        unlimited_stock,
        is_active,
        description,
        created_at,
        updated_at
      )
      VALUES (
        (NEW.payload->>'productId')::UUID,
        NEW.market_id,
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'category')::TEXT,
        (NEW.payload->>'price')::NUMERIC,
        (NEW.payload->>'cost')::NUMERIC,
        (NEW.payload->>'iconName')::TEXT,
        (NEW.payload->>'colorCode')::TEXT,
        (NEW.payload->>'stock')::INTEGER,
        COALESCE((NEW.payload->>'unlimitedStock')::BOOLEAN, FALSE),
        TRUE,
        (NEW.payload->>'description')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
    
    -- 商品更新事件
    WHEN 'product_updated' THEN
      UPDATE products
      SET 
        name = COALESCE((NEW.payload->'updates'->>'name')::TEXT, name),
        price = COALESCE((NEW.payload->'updates'->>'price')::NUMERIC, price),
        cost = COALESCE((NEW.payload->'updates'->>'cost')::NUMERIC, cost),
        stock = COALESCE((NEW.payload->'updates'->>'stock')::INTEGER, stock),
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'productId')::UUID;
    
    -- 商品刪除事件
    WHEN 'product_deleted' THEN
      UPDATE products
      SET 
        is_active = FALSE,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'productId')::UUID;
    
    -- 成交事件：更新商品銷售統計
    WHEN 'deal_closed' THEN
      -- 遍歷 items 陣列更新每個商品
      FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.payload->'items')
      LOOP
        v_product_id := (v_item->>'productId')::UUID;
        
        UPDATE products
        SET 
          total_sold = total_sold + (v_item->>'quantity')::INTEGER,
          stock = CASE 
            WHEN NOT unlimited_stock THEN GREATEST(0, stock - (v_item->>'quantity')::INTEGER)
            ELSE stock
          END,
          updated_at = NEW.timestamp
        WHERE id = v_product_id;
      END LOOP;
    
    ELSE
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 創建 Trigger
DROP TRIGGER IF EXISTS trigger_update_product_read_model ON events;
CREATE TRIGGER trigger_update_product_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_product_read_model();

-- ==================== 註解 ====================

-- ==================== 完成 ====================
-- CQRS Trigger 創建完成
-- 下一步：執行 003_rpc_functions.sql

-- ============================================================
-- END SOURCE: 002_cqrs_triggers.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 003_rpc_functions.sql
-- ============================================================

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

-- ==================== 完成 ====================
-- RPC 函數創建完成
-- 下一步：執行 004_rls_policies.sql

-- ============================================================
-- END SOURCE: 003_rpc_functions.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 004_rls_policies.sql
-- ============================================================

-- ==================== Row Level Security (RLS) Policies ====================
-- 版本：004 - RLS 政策
-- 日期：2026-01-24
-- 說明：設置 Row Level Security 政策，確保資料安全

-- ==================== 啟用 RLS ====================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ==================== Profiles 表政策 ====================

-- 用戶可以查看所有 profiles（用於顯示成員資訊）
CREATE POLICY "用戶可以查看所有 profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- 用戶只能更新自己的 profile
CREATE POLICY "用戶只能更新自己的 profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 用戶可以插入自己的 profile（註冊時）
CREATE POLICY "用戶可以插入自己的 profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ==================== Markets 表政策 ====================

-- 用戶可以查看自己是成員的市集
CREATE POLICY "用戶可以查看自己是成員的市集"
ON markets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = markets.id
      AND user_id = auth.uid()
  )
);

-- 用戶可以插入市集（通過事件）
-- 注意：實際插入由 Trigger 完成，這裡允許 service_role
CREATE POLICY "允許 service_role 插入市集"
ON markets FOR INSERT
TO service_role
WITH CHECK (true);

-- 用戶可以更新自己擁有的市集（通過事件）
-- 注意：實際更新由 Trigger 完成，這裡允許 service_role
CREATE POLICY "允許 service_role 更新市集"
ON markets FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- ==================== Products 表政策 ====================

-- 用戶可以查看自己市集的商品
CREATE POLICY "用戶可以查看自己市集的商品"
ON products FOR SELECT
TO authenticated
USING (
  market_id IS NULL OR
  EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = products.market_id
      AND user_id = auth.uid()
  )
);

-- 允許 service_role 插入商品（通過 Trigger）
CREATE POLICY "允許 service_role 插入商品"
ON products FOR INSERT
TO service_role
WITH CHECK (true);

-- 允許 service_role 更新商品（通過 Trigger）
CREATE POLICY "允許 service_role 更新商品"
ON products FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- ==================== Market Members 表政策 ====================

-- 用戶可以查看自己所在市集的成員
CREATE POLICY "用戶可以查看自己所在市集的成員"
ON market_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM market_members mm
    WHERE mm.market_id = market_members.market_id
      AND mm.user_id = auth.uid()
  )
);

-- 允許 service_role 插入成員（通過 RPC）
CREATE POLICY "允許 service_role 插入成員"
ON market_members FOR INSERT
TO service_role
WITH CHECK (true);

-- 允許 service_role 刪除成員（通過 RPC）
CREATE POLICY "允許 service_role 刪除成員"
ON market_members FOR DELETE
TO service_role
USING (true);

-- ==================== Market Invitations 表政策 ====================

-- 用戶只能查看自己創建的邀請碼
CREATE POLICY "用戶只能查看自己創建的邀請碼"
ON market_invitations FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- 市集 owner 可以創建邀請碼（通過 RPC）
CREATE POLICY "允許 service_role 插入邀請碼"
ON market_invitations FOR INSERT
TO service_role
WITH CHECK (true);

-- 允許 service_role 更新邀請碼（通過 RPC）
CREATE POLICY "允許 service_role 更新邀請碼"
ON market_invitations FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- ==================== Events 表政策 ====================

-- 用戶可以查看自己市集的事件
CREATE POLICY "用戶可以查看自己市集的事件"
ON events FOR SELECT
TO authenticated
USING (
  market_id IS NULL OR
  EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = events.market_id
      AND user_id = auth.uid()
  )
);

-- 用戶可以插入自己市集的事件
CREATE POLICY "用戶可以插入自己市集的事件"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid() AND
  (
    market_id IS NULL OR
    EXISTS (
      SELECT 1 FROM market_members
      WHERE market_id = events.market_id
        AND user_id = auth.uid()
    )
  )
);

-- 允許 service_role 插入事件（用於 Trigger）
CREATE POLICY "允許 service_role 插入事件"
ON events FOR INSERT
TO service_role
WITH CHECK (true);

-- ==================== 特殊政策：Trigger 執行權限 ====================

-- 授予 Trigger 函數執行權限
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- 授予 authenticated 用戶查詢權限
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT ON events TO authenticated;

-- ==================== 安全函數：檢查用戶權限 ====================

CREATE OR REPLACE FUNCTION check_user_market_permission(
  p_market_id UUID,
  p_required_role TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 查詢用戶角色
  SELECT role INTO v_user_role
  FROM market_members
  WHERE market_id = p_market_id
    AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- 如果需要特定角色
  IF p_required_role IS NOT NULL THEN
    RETURN v_user_role = p_required_role;
  END IF;
  
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_market_permission(UUID, TEXT) TO authenticated;

-- ==================== 註解 ====================



-- ==================== 測試 RLS 政策 ====================

-- 測試腳本（在 SQL Editor 中執行）
/*
-- 1. 創建測試用戶（需要先在 Authentication 中創建）
-- 2. 測試查詢權限
SELECT * FROM markets; -- 應該只返回用戶是成員的市集

-- 3. 測試插入權限
INSERT INTO events (type, payload, actor_id, market_id)
VALUES (
  'market_created',
  '{"name": "測試市集", "location": "台北"}'::jsonb,
  auth.uid(),
  uuid_generate_v4()
); -- 應該成功

-- 4. 測試 RPC 函數
SELECT generate_invite_code('市集UUID'); -- 應該成功（如果是 owner）
SELECT join_market_by_code('邀請碼'); -- 應該成功
*/

-- ==================== 完成 ====================
-- RLS 政策設置完成
-- 所有 SQL 遷移腳本已完成！
-- 
-- 執行順序：
-- 1. 001_uuid_schema.sql
-- 2. 002_cqrs_triggers.sql
-- 3. 003_rpc_functions.sql
-- 4. 004_rls_policies.sql

-- ============================================================
-- END SOURCE: 004_rls_policies.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 005_fix_rls_recursion.sql
-- ============================================================

-- ==================== 修復 RLS 政策 - 無限遞迴問題 ====================
-- 版本：004_fix - 修復 market_members 無限遞迴
-- 日期：2026-01-24
-- 說明：移除會造成循環查詢的 RLS 政策

-- ==================== 刪除有問題的政策 ====================

-- 刪除 market_members 的舊政策
DROP POLICY IF EXISTS "用戶可以查看自己所在市集的成員" ON market_members;
DROP POLICY IF EXISTS "允許 service_role 插入成員" ON market_members;
DROP POLICY IF EXISTS "允許 service_role 刪除成員" ON market_members;

-- ==================== 重新創建正確的政策 ====================

-- 用戶可以查看自己參與的市集的成員（使用簡單的條件，避免遞迴）
CREATE POLICY "用戶可以查看自己參與的市集的成員_v2"
ON market_members FOR SELECT
TO authenticated
USING (
  -- 直接檢查當前用戶是否在同一個市集中
  market_id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
);

-- 允許 authenticated 用戶插入成員（通過 RPC）
CREATE POLICY "允許 authenticated 插入成員"
ON market_members FOR INSERT
TO authenticated
WITH CHECK (
  -- 只能通過 RPC 函數插入，RPC 會檢查權限
  true
);

-- 允許 authenticated 用戶刪除成員（通過 RPC）
CREATE POLICY "允許 authenticated 刪除成員"
ON market_members FOR DELETE
TO authenticated
USING (
  -- 只能通過 RPC 函數刪除，RPC 會檢查權限
  true
);

-- ==================== 修復 Events 表政策 ====================

-- 刪除舊的 events 政策
DROP POLICY IF EXISTS "用戶可以查看自己市集的事件" ON events;
DROP POLICY IF EXISTS "用戶可以插入自己市集的事件" ON events;
DROP POLICY IF EXISTS "允許 service_role 插入事件" ON events;

-- 用戶可以查看自己市集的事件（避免遞迴）
CREATE POLICY "用戶可以查看自己市集的事件_v2"
ON events FOR SELECT
TO authenticated
USING (
  market_id IS NULL OR
  market_id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
);

-- 用戶可以插入事件（簡化權限檢查）
CREATE POLICY "用戶可以插入事件_v2"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
);

-- ==================== 修復 Markets 表政策 ====================

-- 刪除舊的 markets 政策
DROP POLICY IF EXISTS "用戶可以查看自己是成員的市集" ON markets;
DROP POLICY IF EXISTS "允許 service_role 插入市集" ON markets;
DROP POLICY IF EXISTS "允許 service_role 更新市集" ON markets;

-- 用戶可以查看自己是成員的市集（避免遞迴）
CREATE POLICY "用戶可以查看自己是成員的市集_v2"
ON markets FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
);

-- 允許 authenticated 用戶插入市集（通過 Trigger）
CREATE POLICY "允許 authenticated 插入市集"
ON markets FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允許 authenticated 用戶更新市集（通過 Trigger）
CREATE POLICY "允許 authenticated 更新市集"
ON markets FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
);

-- ==================== 修復 Products 表政策 ====================

-- 刪除舊的 products 政策
DROP POLICY IF EXISTS "用戶可以查看自己市集的商品" ON products;
DROP POLICY IF EXISTS "允許 service_role 插入商品" ON products;
DROP POLICY IF EXISTS "允許 service_role 更新商品" ON products;

-- 用戶可以查看自己市集的商品（避免遞迴）
CREATE POLICY "用戶可以查看自己市集的商品_v2"
ON products FOR SELECT
TO authenticated
USING (
  market_id IS NULL OR
  market_id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
);

-- 允許 authenticated 用戶插入商品（通過 Trigger）
CREATE POLICY "允許 authenticated 插入商品"
ON products FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允許 authenticated 用戶更新商品（通過 Trigger）
CREATE POLICY "允許 authenticated 更新商品"
ON products FOR UPDATE
TO authenticated
USING (
  market_id IS NULL OR
  market_id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
)
WITH CHECK (
  market_id IS NULL OR
  market_id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
);

-- ==================== 註解 ====================


-- ==================== 完成 ====================
-- RLS 政策已修復
-- 請在 Supabase SQL Editor 中執行此腳本

-- ============================================================
-- END SOURCE: 005_fix_rls_recursion.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 006_final_fix.sql
-- ============================================================

-- ==================== 最終修復：market_members RLS 政策 ====================
-- 版本：006_final_fix
-- 日期：2026-01-24
-- 說明：正確的 RLS 政策，避免無限遞迴

-- ==================== 刪除現有政策 ====================

DROP POLICY IF EXISTS "market_members_select" ON market_members;
DROP POLICY IF EXISTS "market_members_insert" ON market_members;
DROP POLICY IF EXISTS "market_members_delete" ON market_members;

-- ==================== 創建正確的政策 ====================

-- SELECT: 用戶可以查看自己參與的市集的所有成員
-- 使用 CTE 避免遞迴
CREATE POLICY "market_members_select_v3"
ON market_members FOR SELECT
TO authenticated
USING (
  -- 方案：使用 security definer 函數
  market_id IN (
    SELECT mm.market_id 
    FROM market_members mm 
    WHERE mm.user_id = auth.uid()
  )
);

-- INSERT: 允許插入（由 RPC 函數控制）
CREATE POLICY "market_members_insert_v3"
ON market_members FOR INSERT
TO authenticated
WITH CHECK (true);

-- DELETE: 允許刪除（由 RPC 函數控制）
CREATE POLICY "market_members_delete_v3"
ON market_members FOR DELETE
TO authenticated
USING (true);

-- ==================== 如果還是有遞迴問題，使用這個替代方案 ====================

-- 如果上面的政策還是有問題，執行以下腳本：

-- 方案 A: 完全禁用 market_members 的 RLS，依賴 RPC 函數
-- ALTER TABLE market_members DISABLE ROW LEVEL SECURITY;

-- 方案 B: 使用 security definer 函數
CREATE OR REPLACE FUNCTION user_market_ids(p_user_id UUID)
RETURNS TABLE(market_id UUID)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT market_id FROM market_members WHERE user_id = p_user_id;
$$;

-- 然後使用這個函數在政策中
DROP POLICY IF EXISTS "market_members_select_v3" ON market_members;

CREATE POLICY "market_members_select_v4"
ON market_members FOR SELECT
TO authenticated
USING (
  market_id IN (SELECT user_market_ids(auth.uid()))
);

-- ==================== 完成 ====================
-- 請執行此腳本，如果還有問題，請告訴我

-- ============================================================
-- END SOURCE: 006_final_fix.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 007_fix_trigger_product_id.sql
-- ============================================================

-- ==================== 修復 CQRS Trigger - Product ID 問題 ====================
-- 版本：007_fix_trigger_product_id
-- 日期：2026-01-24
-- 說明：修復 product_created 事件的 Trigger，確保 ID 正確設置

-- ==================== 重新創建 Product Trigger ====================

CREATE OR REPLACE FUNCTION update_product_read_model()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_item JSONB;
BEGIN
  CASE NEW.type
    
    -- 商品建立事件
    WHEN 'product_created' THEN
      -- 從 payload 獲取 productId，如果沒有則生成新的
      v_product_id := COALESCE(
        (NEW.payload->>'productId')::UUID,
        uuid_generate_v4()
      );
      
      INSERT INTO products (
        id,
        market_id,
        name,
        category,
        price,
        cost,
        icon_name,
        color_code,
        stock,
        unlimited_stock,
        is_active,
        description,
        created_at,
        updated_at
      )
      VALUES (
        v_product_id,  -- 使用確定的 UUID
        NEW.market_id,
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'category')::TEXT,
        (NEW.payload->>'price')::NUMERIC,
        (NEW.payload->>'cost')::NUMERIC,
        (NEW.payload->>'iconName')::TEXT,
        (NEW.payload->>'colorCode')::TEXT,
        (NEW.payload->>'stock')::INTEGER,
        COALESCE((NEW.payload->>'unlimitedStock')::BOOLEAN, FALSE),
        TRUE,
        (NEW.payload->>'description')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
    
    -- 商品更新事件
    WHEN 'product_updated' THEN
      v_product_id := (NEW.payload->>'productId')::UUID;
      
      IF v_product_id IS NOT NULL THEN
        UPDATE products
        SET 
          name = COALESCE((NEW.payload->'updates'->>'name')::TEXT, name),
          price = COALESCE((NEW.payload->'updates'->>'price')::NUMERIC, price),
          cost = COALESCE((NEW.payload->'updates'->>'cost')::NUMERIC, cost),
          stock = COALESCE((NEW.payload->'updates'->>'stock')::INTEGER, stock),
          updated_at = NEW.timestamp
        WHERE id = v_product_id;
      END IF;
    
    -- 商品刪除事件
    WHEN 'product_deleted' THEN
      v_product_id := (NEW.payload->>'productId')::UUID;
      
      IF v_product_id IS NOT NULL THEN
        UPDATE products
        SET 
          is_active = FALSE,
          updated_at = NEW.timestamp
        WHERE id = v_product_id;
      END IF;
    
    -- 成交事件：更新商品銷售統計
    WHEN 'deal_closed' THEN
      -- 遍歷 items 陣列更新每個商品
      FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.payload->'items')
      LOOP
        v_product_id := (v_item->>'productId')::UUID;
        
        IF v_product_id IS NOT NULL THEN
          UPDATE products
          SET 
            total_sold = total_sold + (v_item->>'quantity')::INTEGER,
            stock = CASE 
              WHEN NOT unlimited_stock THEN GREATEST(0, stock - (v_item->>'quantity')::INTEGER)
              ELSE stock
            END,
            updated_at = NEW.timestamp
          WHERE id = v_product_id;
        END IF;
      END LOOP;
    
    ELSE
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新創建 Trigger
DROP TRIGGER IF EXISTS trigger_update_product_read_model ON events;
CREATE TRIGGER trigger_update_product_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_product_read_model();

-- ==================== 完成 ====================
-- Product Trigger 已修復
-- 現在會正確處理 productId

-- ============================================================
-- END SOURCE: 007_fix_trigger_product_id.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 008_fix_trigger_use_payload_ids.sql
-- ============================================================

-- ==================== 修復 Trigger：使用 Payload 中的 ID ====================
-- 版本：008_fix_trigger_use_payload_ids
-- 日期：2026-01-24
-- 說明：修復 Trigger，從 payload 中讀取 marketId 和 productId

-- ==================== Market Trigger ====================

CREATE OR REPLACE FUNCTION update_market_read_model()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.type
    
    -- 市集建立事件
    WHEN 'market_created' THEN
      -- 從 payload 中讀取 marketId（必須存在）
      IF (NEW.payload->>'marketId') IS NULL THEN
        RAISE EXCEPTION 'market_created event missing marketId in payload';
      END IF;
      
      INSERT INTO markets (
        id,
        name,
        location,
        start_date,
        end_date,
        start_time,
        end_time,
        status,
        owner_id,
        is_collaborative,
        early_entry_enabled,
        early_entry_time,
        check_in_time,
        operating_start_time,
        operating_end_time,
        registration_fee,
        booth_cost,
        deposit,
        table_rental,
        chair_rental,
        umbrella_rental,
        tablecloth_rental,
        commission_rate,
        table_free,
        chair_free,
        umbrella_free,
        tablecloth_free,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        (NEW.payload->>'marketId')::UUID,
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'location')::TEXT,
        (NEW.payload->>'startDate')::DATE,
        (NEW.payload->>'endDate')::DATE,
        (NEW.payload->>'startTime')::TIME,
        (NEW.payload->>'endTime')::TIME,
        'registered',
        NEW.actor_id,
        FALSE,
        COALESCE((NEW.payload->>'earlyEntryEnabled')::BOOLEAN, FALSE),
        (NEW.payload->>'earlyEntryTime')::TIME,
        (NEW.payload->>'checkInTime')::TIME,
        (NEW.payload->>'operatingStartTime')::TIME,
        (NEW.payload->>'operatingEndTime')::TIME,
        (NEW.payload->>'registrationFee')::NUMERIC,
        (NEW.payload->>'boothCost')::NUMERIC,
        (NEW.payload->>'deposit')::NUMERIC,
        (NEW.payload->>'tableRental')::NUMERIC,
        (NEW.payload->>'chairRental')::NUMERIC,
        (NEW.payload->>'umbrellaRental')::NUMERIC,
        (NEW.payload->>'tableclothRental')::NUMERIC,
        (NEW.payload->>'commissionRate')::NUMERIC,
        COALESCE((NEW.payload->>'tableFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'chairFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'umbrellaFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'tableclothFree')::BOOLEAN, FALSE),
        (NEW.payload->>'notes')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
    
    -- 市集狀態變更事件
    WHEN 'market_status_changed' THEN
      UPDATE markets
      SET 
        status = (NEW.payload->>'newStatus')::TEXT,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'marketId')::UUID;
    
    -- 市集開始營業事件
    WHEN 'market_started' THEN
      UPDATE markets
      SET 
        status = 'ongoing',
        operation_phase = 'operating',
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'marketId')::UUID;
    
    -- 市集結束營業事件
    WHEN 'market_ended' THEN
      UPDATE markets
      SET 
        status = 'completed',
        operation_phase = NULL,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'marketId')::UUID;
    
    ELSE
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新創建 Trigger
DROP TRIGGER IF EXISTS trigger_update_market_read_model ON events;
CREATE TRIGGER trigger_update_market_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_market_read_model();

-- ==================== Product Trigger ====================

CREATE OR REPLACE FUNCTION update_product_read_model()
RETURNS TRIGGER AS $$
DECLARE
  v_item JSONB;
BEGIN
  CASE NEW.type
    
    -- 商品建立事件
    WHEN 'product_created' THEN
      -- 從 payload 中讀取 productId（必須存在）
      IF (NEW.payload->>'productId') IS NULL THEN
        RAISE EXCEPTION 'product_created event missing productId in payload';
      END IF;
      
      INSERT INTO products (
        id,
        market_id,
        name,
        category,
        price,
        cost,
        icon_name,
        color_code,
        stock,
        unlimited_stock,
        is_active,
        description,
        created_at,
        updated_at
      )
      VALUES (
        (NEW.payload->>'productId')::UUID,
        NEW.market_id,
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'category')::TEXT,
        (NEW.payload->>'price')::NUMERIC,
        (NEW.payload->>'cost')::NUMERIC,
        (NEW.payload->>'iconName')::TEXT,
        (NEW.payload->>'colorCode')::TEXT,
        COALESCE((NEW.payload->>'stock')::INTEGER, 0),
        COALESCE((NEW.payload->>'unlimitedStock')::BOOLEAN, FALSE),
        TRUE,
        (NEW.payload->>'description')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
    
    -- 商品更新事件
    WHEN 'product_updated' THEN
      UPDATE products
      SET 
        name = COALESCE((NEW.payload->'updates'->>'name')::TEXT, name),
        price = COALESCE((NEW.payload->'updates'->>'price')::NUMERIC, price),
        cost = COALESCE((NEW.payload->'updates'->>'cost')::NUMERIC, cost),
        stock = COALESCE((NEW.payload->'updates'->>'stock')::INTEGER, stock),
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'productId')::UUID;
    
    -- 商品刪除事件
    WHEN 'product_deleted' THEN
      UPDATE products
      SET 
        is_active = FALSE,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'productId')::UUID;
    
    -- 成交事件：更新商品銷售統計
    WHEN 'deal_closed' THEN
      -- 遍歷 items 陣列更新每個商品
      FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.payload->'items')
      LOOP
        UPDATE products
        SET 
          total_sold = total_sold + (v_item->>'quantity')::INTEGER,
          stock = CASE 
            WHEN NOT unlimited_stock THEN GREATEST(0, stock - (v_item->>'quantity')::INTEGER)
            ELSE stock
          END,
          updated_at = NEW.timestamp
        WHERE id = (v_item->>'productId')::UUID;
      END LOOP;
    
    ELSE
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新創建 Trigger
DROP TRIGGER IF EXISTS trigger_update_product_read_model ON events;
CREATE TRIGGER trigger_update_product_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_product_read_model();

-- ==================== 完成 ====================
-- Trigger 已修復，現在會從 payload 中讀取 ID

-- ============================================================
-- END SOURCE: 008_fix_trigger_use_payload_ids.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 009_fix_foreign_key_deferrable.sql
-- ============================================================

-- ==================== 修復外鍵約束時機問題 ====================
-- 版本：009_fix_foreign_key_deferrable
-- 日期：2026-01-24
-- 說明：將外鍵約束設置為 DEFERRABLE，允許 Trigger 先執行

-- ==================== 刪除現有外鍵約束 ====================

ALTER TABLE events 
DROP CONSTRAINT IF EXISTS events_market_id_fkey;

ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_market_id_fkey;

ALTER TABLE market_members 
DROP CONSTRAINT IF EXISTS market_members_market_id_fkey;

-- ==================== 重新創建為 DEFERRABLE 約束 ====================

-- Events 表：market_id 外鍵（延遲檢查）
ALTER TABLE events
ADD CONSTRAINT events_market_id_fkey
FOREIGN KEY (market_id)
REFERENCES markets(id)
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Products 表：market_id 外鍵（延遲檢查）
ALTER TABLE products
ADD CONSTRAINT products_market_id_fkey
FOREIGN KEY (market_id)
REFERENCES markets(id)
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Market Members 表：market_id 外鍵（延遲檢查）
ALTER TABLE market_members
ADD CONSTRAINT market_members_market_id_fkey
FOREIGN KEY (market_id)
REFERENCES markets(id)
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- ==================== 說明 ====================
-- DEFERRABLE INITIALLY DEFERRED 的作用：
-- 1. 外鍵約束在事務提交時才檢查（而不是插入時立即檢查）
-- 2. 允許 Trigger 先執行，創建 markets 記錄
-- 3. 然後再檢查外鍵約束，此時 markets 記錄已存在

-- ==================== 完成 ====================

-- ============================================================
-- END SOURCE: 009_fix_foreign_key_deferrable.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 010_final_fix_all_issues.sql
-- ============================================================

-- ==================== 最終修復腳本（合併版本）====================
-- 版本：010_final_fix_all_issues
-- 日期：2026-01-24
-- 說明：一次性修復所有同步問題
--   1. 將外鍵約束設置為 DEFERRABLE（延遲檢查）
--   2. 修復 Trigger 從 payload 讀取 ID
--   3. 添加錯誤處理

-- ==================== 步驟 1：刪除並重建外鍵約束為 DEFERRABLE ====================

-- Events 表
ALTER TABLE events 
DROP CONSTRAINT IF EXISTS events_market_id_fkey;

ALTER TABLE events
ADD CONSTRAINT events_market_id_fkey
FOREIGN KEY (market_id)
REFERENCES markets(id)
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Products 表
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_market_id_fkey;

ALTER TABLE products
ADD CONSTRAINT products_market_id_fkey
FOREIGN KEY (market_id)
REFERENCES markets(id)
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Market Members 表
ALTER TABLE market_members 
DROP CONSTRAINT IF EXISTS market_members_market_id_fkey;

ALTER TABLE market_members
ADD CONSTRAINT market_members_market_id_fkey
FOREIGN KEY (market_id)
REFERENCES markets(id)
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- ==================== 步驟 2：修復 Market Trigger ====================

CREATE OR REPLACE FUNCTION update_market_read_model()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.type
    
    -- 市集建立事件
    WHEN 'market_created' THEN
      -- 從 payload 中讀取 marketId（必須存在）
      IF (NEW.payload->>'marketId') IS NULL THEN
        RAISE EXCEPTION 'market_created event missing marketId in payload';
      END IF;
      
      INSERT INTO markets (
        id,
        name,
        location,
        start_date,
        end_date,
        start_time,
        end_time,
        status,
        owner_id,
        is_collaborative,
        early_entry_enabled,
        early_entry_time,
        check_in_time,
        operating_start_time,
        operating_end_time,
        registration_fee,
        booth_cost,
        deposit,
        table_rental,
        chair_rental,
        umbrella_rental,
        tablecloth_rental,
        commission_rate,
        table_free,
        chair_free,
        umbrella_free,
        tablecloth_free,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        (NEW.payload->>'marketId')::UUID,
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'location')::TEXT,
        (NEW.payload->>'startDate')::DATE,
        (NEW.payload->>'endDate')::DATE,
        (NEW.payload->>'startTime')::TIME,
        (NEW.payload->>'endTime')::TIME,
        'registered',
        NEW.actor_id,
        FALSE,
        COALESCE((NEW.payload->>'earlyEntryEnabled')::BOOLEAN, FALSE),
        (NEW.payload->>'earlyEntryTime')::TIME,
        (NEW.payload->>'checkInTime')::TIME,
        (NEW.payload->>'operatingStartTime')::TIME,
        (NEW.payload->>'operatingEndTime')::TIME,
        (NEW.payload->>'registrationFee')::NUMERIC,
        (NEW.payload->>'boothCost')::NUMERIC,
        (NEW.payload->>'deposit')::NUMERIC,
        (NEW.payload->>'tableRental')::NUMERIC,
        (NEW.payload->>'chairRental')::NUMERIC,
        (NEW.payload->>'umbrellaRental')::NUMERIC,
        (NEW.payload->>'tableclothRental')::NUMERIC,
        (NEW.payload->>'commissionRate')::NUMERIC,
        COALESCE((NEW.payload->>'tableFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'chairFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'umbrellaFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'tableclothFree')::BOOLEAN, FALSE),
        (NEW.payload->>'notes')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
      
      -- 自動添加 owner 到 market_members
      INSERT INTO market_members (market_id, user_id, role)
      VALUES ((NEW.payload->>'marketId')::UUID, NEW.actor_id, 'owner')
      ON CONFLICT (market_id, user_id) DO NOTHING;
    
    -- 市集狀態變更事件
    WHEN 'market_status_changed' THEN
      UPDATE markets
      SET 
        status = (NEW.payload->>'newStatus')::TEXT,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'marketId')::UUID;
    
    -- 市集開始營業事件
    WHEN 'market_started' THEN
      UPDATE markets
      SET 
        status = 'ongoing',
        operation_phase = 'operating',
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'marketId')::UUID;
    
    -- 市集結束營業事件
    WHEN 'market_ended' THEN
      UPDATE markets
      SET 
        status = 'completed',
        operation_phase = NULL,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'marketId')::UUID;
    
    -- 成交事件：更新統計
    WHEN 'deal_closed' THEN
      UPDATE markets
      SET 
        total_revenue = total_revenue + (NEW.payload->>'totalAmount')::NUMERIC,
        total_deals = total_deals + 1,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 互動記錄事件：更新統計
    WHEN 'interaction_recorded' THEN
      UPDATE markets
      SET 
        total_interactions = total_interactions + 1,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    ELSE
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新創建 Trigger
DROP TRIGGER IF EXISTS trigger_update_market_read_model ON events;
CREATE TRIGGER trigger_update_market_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_market_read_model();

-- ==================== 步驟 3：修復 Product Trigger ====================

CREATE OR REPLACE FUNCTION update_product_read_model()
RETURNS TRIGGER AS $$
DECLARE
  v_item JSONB;
BEGIN
  CASE NEW.type
    
    -- 商品建立事件
    WHEN 'product_created' THEN
      -- 從 payload 中讀取 productId（必須存在）
      IF (NEW.payload->>'productId') IS NULL THEN
        RAISE EXCEPTION 'product_created event missing productId in payload';
      END IF;
      
      INSERT INTO products (
        id,
        market_id,
        name,
        category,
        price,
        cost,
        icon_name,
        color_code,
        stock,
        unlimited_stock,
        is_active,
        description,
        created_at,
        updated_at
      )
      VALUES (
        (NEW.payload->>'productId')::UUID,
        NEW.market_id,
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'category')::TEXT,
        (NEW.payload->>'price')::NUMERIC,
        (NEW.payload->>'cost')::NUMERIC,
        (NEW.payload->>'iconName')::TEXT,
        (NEW.payload->>'colorCode')::TEXT,
        COALESCE((NEW.payload->>'stock')::INTEGER, 0),
        COALESCE((NEW.payload->>'unlimitedStock')::BOOLEAN, FALSE),
        TRUE,
        (NEW.payload->>'description')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
    
    -- 商品更新事件
    WHEN 'product_updated' THEN
      UPDATE products
      SET 
        name = COALESCE((NEW.payload->'updates'->>'name')::TEXT, name),
        price = COALESCE((NEW.payload->'updates'->>'price')::NUMERIC, price),
        cost = COALESCE((NEW.payload->'updates'->>'cost')::NUMERIC, cost),
        stock = COALESCE((NEW.payload->'updates'->>'stock')::INTEGER, stock),
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'productId')::UUID;
    
    -- 商品刪除事件
    WHEN 'product_deleted' THEN
      UPDATE products
      SET 
        is_active = FALSE,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'productId')::UUID;
    
    -- 成交事件：更新商品銷售統計
    WHEN 'deal_closed' THEN
      -- 遍歷 items 陣列更新每個商品
      FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.payload->'items')
      LOOP
        UPDATE products
        SET 
          total_sold = total_sold + (v_item->>'quantity')::INTEGER,
          stock = CASE 
            WHEN NOT unlimited_stock THEN GREATEST(0, stock - (v_item->>'quantity')::INTEGER)
            ELSE stock
          END,
          updated_at = NEW.timestamp
        WHERE id = (v_item->>'productId')::UUID;
      END LOOP;
    
    ELSE
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新創建 Trigger
DROP TRIGGER IF EXISTS trigger_update_product_read_model ON events;
CREATE TRIGGER trigger_update_product_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_product_read_model();

-- ==================== 完成 ====================
-- 所有問題已修復：
-- ✅ 外鍵約束延遲檢查（DEFERRABLE）
-- ✅ Trigger 從 payload 讀取 ID
-- ✅ 添加錯誤檢查


-- ============================================================
-- END SOURCE: 010_final_fix_all_issues.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 011_add_missing_columns.sql
-- ============================================================

-- ==================== 添加缺少的欄位 ====================
-- 版本：011_add_missing_columns
-- 日期：2026-01-24
-- 說明：添加 markets 表缺少的協作相關欄位

-- ==================== 添加 is_collaborative 欄位 ====================

ALTER TABLE markets
ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT FALSE;

-- ==================== 添加 operation_phase 欄位 ====================

ALTER TABLE markets
ADD COLUMN IF NOT EXISTS operation_phase TEXT CHECK (
  operation_phase IS NULL OR 
  operation_phase IN ('early_entry', 'check_in', 'operating', 'closing')
);

-- ==================== 註解 ====================


-- ==================== 完成 ====================
-- 缺少的欄位已添加

-- ============================================================
-- END SOURCE: 011_add_missing_columns.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 012_update_deal_closed_backfill.sql
-- ============================================================

-- =====================================================
-- Migration 012: 更新 deal_closed 事件處理，支持補登標記
-- =====================================================
-- 目的：在處理 deal_closed 事件時，檢查 isBackfill 標記
--       如果是補登交易，則跳過庫存扣除
-- 日期：2025-01-25
-- =====================================================

-- 備份現有函數（可選）
-- CREATE OR REPLACE FUNCTION update_market_read_model_backup AS ...

-- 更新 update_market_read_model 函數
CREATE OR REPLACE FUNCTION update_market_read_model()
RETURNS TRIGGER AS $$
DECLARE
  v_market_id UUID;
  v_payload JSONB;
  v_is_backfill BOOLEAN;
  v_is_manual_entry BOOLEAN;
BEGIN
  -- 提取 payload
  v_payload := NEW.payload;
  
  -- 提取 market_id（支持兩種命名方式）
  v_market_id := COALESCE(
    (v_payload->>'market_id')::UUID,
    (v_payload->>'marketId')::UUID
  );
  
  -- 提取補登標記
  v_is_backfill := COALESCE((v_payload->>'isBackfill')::BOOLEAN, FALSE);
  v_is_manual_entry := COALESCE((v_payload->>'isManualEntry')::BOOLEAN, FALSE);

  -- 根據事件類型處理
  CASE NEW.type
    
    -- ==================== 市集建立 ====================
    WHEN 'market_created' THEN
      INSERT INTO markets (
        id,
        name,
        location,
        start_date,
        end_date,
        start_time,
        end_time,
        status,
        owner_id,
        is_collaborative,
        sync_status,
        -- 時間軸資訊
        early_entry_enabled,
        early_entry_time,
        check_in_time,
        operating_start_time,
        operating_end_time,
        -- 財務資訊
        registration_fee,
        booth_cost,
        deposit,
        table_rental,
        chair_rental,
        umbrella_rental,
        tablecloth_rental,
        commission_rate,
        -- 免費提供標記
        table_free,
        chair_free,
        umbrella_free,
        tablecloth_free,
        notes,
        -- 統計資訊
        total_revenue,
        total_profit,
        total_interactions,
        total_deals,
        -- 時間戳
        created_at,
        updated_at
      ) VALUES (
        v_market_id,
        v_payload->>'name',
        v_payload->>'location',
        (v_payload->>'start_date')::DATE,
        (v_payload->>'end_date')::DATE,
        v_payload->>'start_time',
        v_payload->>'end_time',
        'registered',
        COALESCE(NEW.actor_id, 'local'),
        FALSE,
        'synced',
        -- 時間軸
        COALESCE((v_payload->>'early_entry_enabled')::BOOLEAN, FALSE),
        v_payload->>'early_entry_time',
        v_payload->>'check_in_time',
        v_payload->>'operating_start_time',
        v_payload->>'operating_end_time',
        -- 財務
        COALESCE((v_payload->>'registration_fee')::NUMERIC, 0),
        COALESCE((v_payload->>'booth_cost')::NUMERIC, 0),
        (v_payload->>'deposit')::NUMERIC,
        (v_payload->>'table_rental')::NUMERIC,
        (v_payload->>'chair_rental')::NUMERIC,
        (v_payload->>'umbrella_rental')::NUMERIC,
        (v_payload->>'tablecloth_rental')::NUMERIC,
        (v_payload->>'commission_rate')::NUMERIC,
        -- 免費提供
        COALESCE((v_payload->>'table_free')::BOOLEAN, FALSE),
        COALESCE((v_payload->>'chair_free')::BOOLEAN, FALSE),
        COALESCE((v_payload->>'umbrella_free')::BOOLEAN, FALSE),
        COALESCE((v_payload->>'tablecloth_free')::BOOLEAN, FALSE),
        v_payload->>'notes',
        -- 統計
        0, 0, 0, 0,
        -- 時間戳
        NEW.timestamp,
        NEW.timestamp
      );

    -- ==================== 成交事件 ====================
    WHEN 'deal_closed' THEN
      DECLARE
        v_item JSONB;
        v_product_id UUID;
        v_quantity INTEGER;
        v_total_amount NUMERIC;
        v_total_cost NUMERIC := 0;
        v_deal_count INTEGER := 1;
      BEGIN
        -- ✅ 檢查是否為簡化補登模式
        IF v_is_manual_entry THEN
          -- 簡化模式：直接使用手動輸入的金額
          v_total_amount := COALESCE((v_payload->>'manualRevenue')::NUMERIC, 0);
          v_total_cost := COALESCE((v_payload->>'manualCost')::NUMERIC, 0);
          v_deal_count := COALESCE((v_payload->>'manualDealCount')::INTEGER, 1);
          
        ELSE
          -- 完整模式：處理商品項目
          v_total_amount := COALESCE((v_payload->>'totalAmount')::NUMERIC, 0);
          
          -- 遍歷商品項目
          FOR v_item IN SELECT * FROM jsonb_array_elements(v_payload->'items')
          LOOP
            v_product_id := (v_item->>'productId')::UUID;
            v_quantity := (v_item->>'quantity')::INTEGER;
            
            -- 更新商品銷售統計
            UPDATE products
            SET 
              total_sold = COALESCE(total_sold, 0) + v_quantity,
              updated_at = NEW.timestamp
            WHERE id = v_product_id;
            
            -- ✅ 關鍵：只有非補登交易才扣除庫存
            IF NOT v_is_backfill THEN
              UPDATE products
              SET 
                stock = GREATEST(0, COALESCE(stock, 0) - v_quantity),
                updated_at = NEW.timestamp
              WHERE id = v_product_id
                AND unlimited_stock = FALSE;
            END IF;
            
            -- 累加成本
            SELECT COALESCE(cost, 0) * v_quantity INTO v_total_cost
            FROM products
            WHERE id = v_product_id;
          END LOOP;
        END IF;
        
        -- 更新市集統計
        UPDATE markets
        SET
          total_revenue = COALESCE(total_revenue, 0) + v_total_amount,
          total_profit = COALESCE(total_profit, 0) + (v_total_amount - v_total_cost),
          total_deals = COALESCE(total_deals, 0) + v_deal_count,
          updated_at = NEW.timestamp
        WHERE id = v_market_id;
      END;

    -- ==================== 其他事件類型 ====================
    -- 互動記錄
    WHEN 'interaction_recorded' THEN
      UPDATE markets
      SET
        total_interactions = COALESCE(total_interactions, 0) + 1,
        updated_at = NEW.timestamp
      WHERE id = v_market_id;

    -- 市集狀態變更
    WHEN 'market_status_changed' THEN
      UPDATE markets
      SET
        status = (v_payload->>'newStatus')::market_status,
        updated_at = NEW.timestamp
      WHERE id = v_market_id;

    -- 市集開始營業
    WHEN 'market_started' THEN
      UPDATE markets
      SET
        status = 'ongoing',
        operation_phase = 'operating',
        updated_at = NEW.timestamp
      WHERE id = v_market_id;

    -- 市集結束營業
    WHEN 'market_ended' THEN
      UPDATE markets
      SET
        status = 'completed',
        operation_phase = NULL,
        updated_at = NEW.timestamp
      WHERE id = v_market_id;

    -- 市集刪除（軟刪除）
    WHEN 'market_deleted' THEN
      UPDATE markets
      SET
        is_deleted = TRUE,
        updated_at = NEW.timestamp
      WHERE id = v_market_id;

    ELSE
      -- 未知事件類型，記錄日誌
      NULL; -- sanitized bootstrap: removed RAISE NOTICE
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 確保觸發器存在
DROP TRIGGER IF EXISTS trigger_update_market_read_model ON events;
CREATE TRIGGER trigger_update_market_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_market_read_model();

-- 添加註釋

-- ============================================================
-- END SOURCE: 012_update_deal_closed_backfill.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 013_user_settings.sql
-- ============================================================

-- ==================== User Settings Table ====================
-- 版本：013 - 用戶設定表
-- 日期：2026-01-25
-- 說明：儲存用戶的個人化設定（快速互動按鈕等）

-- ==================== 用戶設定表 ====================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 快速互動按鈕設定
  quick_action_buttons JSONB DEFAULT '[
    {"id": "button_1", "label": "詢問", "emoji": "💬"},
    {"id": "button_2", "label": "試吃", "emoji": "🍰"},
    {"id": "button_3", "label": "拍照", "emoji": "📸"}
  ]'::JSONB,
  
  -- 其他設定可以在這裡擴展
  theme TEXT DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'zh-TW',
  
  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自動更新 updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== 索引 ====================
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- ==================== RLS 政策 ====================
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 用戶只能查看自己的設定
CREATE POLICY "Users can view own settings"
  ON user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- 用戶只能插入自己的設定
CREATE POLICY "Users can insert own settings"
  ON user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用戶只能更新自己的設定
CREATE POLICY "Users can update own settings"
  ON user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 用戶只能刪除自己的設定
CREATE POLICY "Users can delete own settings"
  ON user_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- ==================== 註解 ====================

-- ==================== 完成 ====================
-- User Settings 表創建完成

-- ============================================================
-- END SOURCE: 013_user_settings.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 014_products_ownership.sql
-- ============================================================

-- ==================== Products Schema Update ====================
-- 版本：014 - 商品表結構更新
-- 日期：2026-01-25
-- 說明：
--   1. 移除 market_id 外鍵約束（商品不綁定市集）
--   2. 添加 owner_id（商品所有者）
--   3. 添加協作相關欄位
--   4. 更新 RLS 政策支援團隊共享

-- ==================== 修改 products 表結構 ====================

-- 1. 移除 market_id 外鍵約束
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_market_id_fkey;

-- 2. 將 market_id 改為可選（用於標記商品首次創建的市集，但不強制）
ALTER TABLE products 
ALTER COLUMN market_id DROP NOT NULL;

-- 3. 添加 owner_id 欄位（商品所有者）
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 4. 添加協作相關欄位
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;

-- 5. 更新現有商品的 owner_id（從 events 表推斷）
UPDATE products p
SET owner_id = (
  SELECT e.actor_id 
  FROM events e 
  WHERE e.type = 'product_created' 
    AND (e.payload->>'productId')::UUID = p.id
  LIMIT 1
)
WHERE owner_id IS NULL;

-- 6. 設置 owner_id 為必填（在更新現有數據後）
ALTER TABLE products 
ALTER COLUMN owner_id SET NOT NULL;

-- ==================== 更新索引 ====================

-- 添加 owner_id 索引
CREATE INDEX IF NOT EXISTS idx_products_owner_id ON products(owner_id);

-- 保留 market_id 索引（用於查詢某市集使用的商品）
-- 已存在：idx_products_market_id

-- ==================== 更新 RLS 政策 ====================

-- 刪除舊的政策
DROP POLICY IF EXISTS "Users can view all products" ON products;
DROP POLICY IF EXISTS "Users can insert products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;

-- 1. 查看政策：用戶可以查看自己的商品 + 團隊成員的商品
CREATE POLICY "Users can view own and team products"
  ON products
  FOR SELECT
  USING (
    -- 自己的商品
    owner_id = auth.uid()
    OR
    -- 團隊成員的商品（通過 market_members 關聯）
    owner_id IN (
      SELECT DISTINCT m2.user_id
      FROM market_members m1
      JOIN market_members m2 ON m1.market_id = m2.market_id
      WHERE m1.user_id = auth.uid()
    )
    OR
    -- 共享商品
    is_shared = true
  );

-- 2. 插入政策：用戶只能創建自己的商品
CREATE POLICY "Users can insert own products"
  ON products
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- 3. 更新政策：用戶只能更新自己的商品
CREATE POLICY "Users can update own products"
  ON products
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 4. 刪除政策：用戶只能刪除自己的商品
CREATE POLICY "Users can delete own products"
  ON products
  FOR DELETE
  USING (owner_id = auth.uid());

-- ==================== 更新 Trigger ====================

-- 更新 product_created 事件處理
CREATE OR REPLACE FUNCTION update_product_read_model()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_item JSONB;
BEGIN
  CASE NEW.type
    
    -- 商品建立事件
    WHEN 'product_created' THEN
      INSERT INTO products (
        id,
        owner_id,           -- ✅ 新增：商品所有者
        market_id,          -- ✅ 可選：首次創建的市集
        name,
        category,
        price,
        cost,
        icon_name,
        color_code,
        stock,
        unlimited_stock,
        is_active,
        is_shared,          -- ✅ 新增：是否共享
        description,
        created_at,
        updated_at
      )
      VALUES (
        (NEW.payload->>'productId')::UUID,
        NEW.actor_id,       -- ✅ 使用事件的 actor_id 作為所有者
        NEW.market_id,      -- ✅ 可以是 NULL
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'category')::TEXT,
        (NEW.payload->>'price')::NUMERIC,
        (NEW.payload->>'cost')::NUMERIC,
        (NEW.payload->>'iconName')::TEXT,
        (NEW.payload->>'colorCode')::TEXT,
        (NEW.payload->>'stock')::INTEGER,
        COALESCE((NEW.payload->>'unlimitedStock')::BOOLEAN, FALSE),
        TRUE,
        COALESCE((NEW.payload->>'isShared')::BOOLEAN, FALSE),
        (NEW.payload->>'description')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
    
    -- 商品更新事件
    WHEN 'product_updated' THEN
      UPDATE products
      SET 
        name = COALESCE((NEW.payload->'updates'->>'name')::TEXT, name),
        price = COALESCE((NEW.payload->'updates'->>'price')::NUMERIC, price),
        cost = COALESCE((NEW.payload->'updates'->>'cost')::NUMERIC, cost),
        stock = COALESCE((NEW.payload->'updates'->>'stock')::INTEGER, stock),
        is_shared = COALESCE((NEW.payload->'updates'->>'isShared')::BOOLEAN, is_shared),
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'productId')::UUID;
    
    -- 商品刪除事件
    WHEN 'product_deleted' THEN
      UPDATE products
      SET 
        is_active = FALSE,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'productId')::UUID;
    
    -- 成交事件：更新商品銷售統計
    WHEN 'deal_closed' THEN
      -- 遍歷 items 陣列更新每個商品
      FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.payload->'items')
      LOOP
        v_product_id := (v_item->>'productId')::UUID;
        
        UPDATE products
        SET 
          total_sold = total_sold + (v_item->>'quantity')::INTEGER,
          stock = CASE 
            WHEN NOT unlimited_stock THEN GREATEST(0, stock - (v_item->>'quantity')::INTEGER)
            ELSE stock
          END,
          updated_at = NEW.timestamp
        WHERE id = v_product_id;
      END LOOP;
    
    ELSE
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新創建 Trigger（如果已存在會先刪除）
DROP TRIGGER IF EXISTS trigger_update_product_read_model ON events;
CREATE TRIGGER trigger_update_product_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_product_read_model();

-- ==================== 註解 ====================

-- ==================== 完成 ====================
-- Products 表結構更新完成
-- 商品現在屬於用戶，可通過團隊共享，不綁定特定市集

-- ============================================================
-- END SOURCE: 014_products_ownership.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 015_fix_events_rls_policy.sql
-- ============================================================

-- ==================== 修復 Events 表 RLS 政策 ====================
-- 版本：015 - 修復事件查詢政策（支援商品同步）
-- 日期：2026-01-25
-- 說明：
--   1. 修復 events 表的 SELECT 政策
--   2. 允許用戶查詢自己的全局事件（market_id = NULL）
--   3. 支援商品事件的跨設備同步

-- ==================== 刪除舊政策 ====================

DROP POLICY IF EXISTS "用戶可以查看自己市集的事件" ON events;

-- ==================== 創建新政策 ====================

-- 用戶可以查看：
-- 1. 自己創建的事件（actor_id = auth.uid()）
-- 2. 自己參與的市集的事件
CREATE POLICY "用戶可以查看自己的事件和市集事件"
ON events FOR SELECT
TO authenticated
USING (
  -- 自己創建的事件（包括 market_id = NULL 的商品事件）
  actor_id = auth.uid()
  OR
  -- 自己參與的市集的事件
  (
    market_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM market_members
      WHERE market_id = events.market_id
        AND user_id = auth.uid()
    )
  )
);

-- ==================== 註解 ====================


-- ==================== 測試 ====================

-- 測試腳本（在 SQL Editor 中執行）
/*
-- 1. 測試查詢自己的商品事件
SELECT * FROM events 
WHERE type = 'product_created' 
  AND actor_id = auth.uid();
-- 應該返回自己創建的商品事件

-- 2. 測試查詢市集事件
SELECT * FROM events 
WHERE market_id IN (
  SELECT market_id FROM market_members WHERE user_id = auth.uid()
);
-- 應該返回自己參與的市集的事件

-- 3. 測試查詢其他人的商品事件（應該失敗）
SELECT * FROM events 
WHERE type = 'product_created' 
  AND actor_id != auth.uid();
-- 應該返回空結果
*/

-- ==================== 完成 ====================
-- Events 表 RLS 政策已修復
-- 現在支援商品事件的跨設備同步

-- ============================================================
-- END SOURCE: 015_fix_events_rls_policy.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 016_market_soft_delete.sql
-- ============================================================

-- ==================== 市集軟刪除功能 ====================
-- 版本：016 - 市集軟刪除
-- 日期：2026-01-25
-- 說明：
--   1. 添加 is_deleted 欄位到 markets 表
--   2. 添加 market_deleted 事件類型到 events 表的 CHECK 約束
--   3. 添加 market_deleted 事件處理
--   4. 區分「已取消」和「已刪除」狀態
--      - 已取消（status = 'cancelled'）：市集狀態，仍顯示在列表中
--      - 已刪除（is_deleted = true）：軟刪除標記，不顯示在列表中

-- ==================== 更新 events 表的 CHECK 約束 ====================

-- 刪除舊的 CHECK 約束
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;

-- 添加新的 CHECK 約束（包含 market_deleted）
ALTER TABLE events ADD CONSTRAINT events_type_check CHECK (
  type IN (
    'market_created',
    'market_status_changed',
    'market_started',
    'market_ended',
    'market_deleted',        -- ✅ 新增：市集刪除事件
    'product_created',
    'product_updated',
    'product_deleted',
    'interaction_recorded',
    'deal_closed'
  )
);

-- ==================== 修改 markets 表結構 ====================

-- 添加 is_deleted 欄位
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 添加索引（用於快速過濾）
CREATE INDEX IF NOT EXISTS idx_markets_is_deleted ON markets(is_deleted);

-- 添加註解

-- ==================== 更新 Market Trigger ====================

CREATE OR REPLACE FUNCTION update_market_read_model()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.type
    
    -- 市集建立事件
    WHEN 'market_created' THEN
      -- 從 payload 中讀取 marketId 或 market_id
      IF (NEW.payload->>'marketId') IS NULL AND (NEW.payload->>'market_id') IS NULL THEN
        RAISE EXCEPTION 'market_created event missing marketId/market_id in payload';
      END IF;
      
      INSERT INTO markets (
        id,
        name,
        location,
        start_date,
        end_date,
        start_time,
        end_time,
        status,
        owner_id,
        is_collaborative,
        is_deleted,  -- ✅ 新增：預設為 false
        early_entry_enabled,
        early_entry_time,
        check_in_time,
        operating_start_time,
        operating_end_time,
        registration_fee,
        booth_cost,
        deposit,
        table_rental,
        chair_rental,
        umbrella_rental,
        tablecloth_rental,
        commission_rate,
        table_free,
        chair_free,
        umbrella_free,
        tablecloth_free,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        COALESCE((NEW.payload->>'market_id')::UUID, (NEW.payload->>'marketId')::UUID),
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'location')::TEXT,
        COALESCE((NEW.payload->>'start_date')::DATE, (NEW.payload->>'startDate')::DATE),
        COALESCE((NEW.payload->>'end_date')::DATE, (NEW.payload->>'endDate')::DATE),
        COALESCE((NEW.payload->>'start_time')::TIME, (NEW.payload->>'startTime')::TIME),
        COALESCE((NEW.payload->>'end_time')::TIME, (NEW.payload->>'endTime')::TIME),
        'registered',
        NEW.actor_id,
        FALSE,
        FALSE,  -- ✅ 預設為未刪除
        COALESCE((NEW.payload->>'early_entry_enabled')::BOOLEAN, (NEW.payload->>'earlyEntryEnabled')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'early_entry_time')::TIME, (NEW.payload->>'earlyEntryTime')::TIME),
        COALESCE((NEW.payload->>'check_in_time')::TIME, (NEW.payload->>'checkInTime')::TIME),
        COALESCE((NEW.payload->>'operating_start_time')::TIME, (NEW.payload->>'operatingStartTime')::TIME),
        COALESCE((NEW.payload->>'operating_end_time')::TIME, (NEW.payload->>'operatingEndTime')::TIME),
        COALESCE((NEW.payload->>'registration_fee')::NUMERIC, (NEW.payload->>'registrationFee')::NUMERIC),
        COALESCE((NEW.payload->>'booth_cost')::NUMERIC, (NEW.payload->>'boothCost')::NUMERIC),
        (NEW.payload->>'deposit')::NUMERIC,
        COALESCE((NEW.payload->>'table_rental')::NUMERIC, (NEW.payload->>'tableRental')::NUMERIC),
        COALESCE((NEW.payload->>'chair_rental')::NUMERIC, (NEW.payload->>'chairRental')::NUMERIC),
        COALESCE((NEW.payload->>'umbrella_rental')::NUMERIC, (NEW.payload->>'umbrellaRental')::NUMERIC),
        COALESCE((NEW.payload->>'tablecloth_rental')::NUMERIC, (NEW.payload->>'tableclothRental')::NUMERIC),
        COALESCE((NEW.payload->>'commission_rate')::NUMERIC, (NEW.payload->>'commissionRate')::NUMERIC),
        COALESCE((NEW.payload->>'table_free')::BOOLEAN, (NEW.payload->>'tableFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'chair_free')::BOOLEAN, (NEW.payload->>'chairFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'umbrella_free')::BOOLEAN, (NEW.payload->>'umbrellaFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'tablecloth_free')::BOOLEAN, (NEW.payload->>'tableclothFree')::BOOLEAN, FALSE),
        (NEW.payload->>'notes')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
      
      -- 自動添加 owner 到 market_members
      INSERT INTO market_members (market_id, user_id, role)
      VALUES (
        COALESCE((NEW.payload->>'market_id')::UUID, (NEW.payload->>'marketId')::UUID),
        NEW.actor_id,
        'owner'
      )
      ON CONFLICT (market_id, user_id) DO NOTHING;
    
    -- 市集狀態變更事件
    WHEN 'market_status_changed' THEN
      UPDATE markets
      SET 
        status = (NEW.payload->>'newStatus')::TEXT,
        updated_at = NEW.timestamp
      WHERE id = COALESCE((NEW.payload->>'market_id')::UUID, (NEW.payload->>'marketId')::UUID);
    
    -- 市集開始營業事件
    WHEN 'market_started' THEN
      UPDATE markets
      SET 
        status = 'ongoing',
        operation_phase = 'operating',
        updated_at = NEW.timestamp
      WHERE id = COALESCE((NEW.payload->>'market_id')::UUID, (NEW.payload->>'marketId')::UUID);
    
    -- 市集結束營業事件
    WHEN 'market_ended' THEN
      UPDATE markets
      SET 
        status = 'completed',
        operation_phase = NULL,
        updated_at = NEW.timestamp
      WHERE id = COALESCE((NEW.payload->>'market_id')::UUID, (NEW.payload->>'marketId')::UUID);
    
    -- ✅ 市集刪除事件（軟刪除）
    WHEN 'market_deleted' THEN
      UPDATE markets
      SET 
        is_deleted = TRUE,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'marketId')::UUID;
    
    -- 成交事件：更新統計
    WHEN 'deal_closed' THEN
      UPDATE markets
      SET 
        total_revenue = total_revenue + (NEW.payload->>'totalAmount')::NUMERIC,
        total_deals = total_deals + 1,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 互動記錄事件：更新統計
    WHEN 'interaction_recorded' THEN
      UPDATE markets
      SET 
        total_interactions = total_interactions + 1,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    ELSE
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新創建 Trigger
DROP TRIGGER IF EXISTS trigger_update_market_read_model ON events;
CREATE TRIGGER trigger_update_market_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_market_read_model();

-- ==================== 測試 ====================

-- 測試腳本（在 SQL Editor 中執行）
/*
-- 1. 創建測試市集
INSERT INTO events (id, type, payload, actor_id, timestamp)
VALUES (
  gen_random_uuid(),
  'market_created',
  jsonb_build_object(
    'marketId', gen_random_uuid(),
    'name', '測試市集',
    'location', '台北',
    'startDate', '2026-02-01',
    'endDate', '2026-02-01',
    'registrationFee', 500,
    'boothCost', 1000
  ),
  auth.uid(),
  NOW()
);

-- 2. 查詢市集（應該看到 is_deleted = false）
SELECT id, name, status, is_deleted
FROM markets
WHERE name = '測試市集';

-- 3. 刪除市集（軟刪除）
INSERT INTO events (id, type, payload, actor_id, timestamp)
VALUES (
  gen_random_uuid(),
  'market_deleted',
  jsonb_build_object(
    'marketId', (SELECT id FROM markets WHERE name = '測試市集'),
    'reason', '測試刪除'
  ),
  auth.uid(),
  NOW()
);

-- 4. 再次查詢（應該看到 is_deleted = true）
SELECT id, name, status, is_deleted
FROM markets
WHERE name = '測試市集';

-- 5. 查詢未刪除的市集（應該不包含測試市集）
SELECT id, name, status
FROM markets
WHERE is_deleted = FALSE
ORDER BY created_at DESC;
*/

-- ==================== 完成 ====================
-- 市集軟刪除功能已完成
-- 
-- 使用方式：
-- 1. 前端調用 deleteMarket(marketId) 函數
-- 2. 系統記錄 market_deleted 事件
-- 3. Trigger 自動設置 is_deleted = true
-- 4. 前端查詢時過濾 is_deleted = true 的市集

-- ============================================================
-- END SOURCE: 016_market_soft_delete.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 017_snapshots_and_archive.sql
-- ============================================================

-- ==================== Supabase Schema Migration ====================
-- 版本：017 - 快照與歸檔表
-- 日期：2025-02-17
-- 說明：創建快照表和事件歸檔表，支持性能優化

-- ==================== 快照表 ====================
CREATE TABLE IF NOT EXISTS snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- 快照數據（JSONB 格式，已壓縮）
  data JSONB NOT NULL,
  
  -- 元數據
  event_count INTEGER NOT NULL,
  last_event_id UUID NOT NULL,
  data_size_bytes INTEGER,
  compressed_size_bytes INTEGER,
  compression_ratio NUMERIC(5,2),
  
  -- 索引
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 唯一約束：每個用戶的每個版本只能有一個快照
  CONSTRAINT snapshots_user_version_unique UNIQUE (user_id, version)
);

-- 索引優化
CREATE INDEX idx_snapshots_user_latest 
  ON snapshots(user_id, snapshot_at DESC);

CREATE INDEX idx_snapshots_user_id 
  ON snapshots(user_id);

-- 註釋

-- ==================== RLS 政策 ====================
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

-- 用戶只能查看自己的快照
CREATE POLICY "用戶只能查看自己的快照"
  ON snapshots FOR SELECT
  USING (auth.uid() = user_id);

-- 用戶只能創建自己的快照
CREATE POLICY "用戶只能創建自己的快照"
  ON snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用戶只能刪除自己的快照
CREATE POLICY "用戶只能刪除自己的快照"
  ON snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- ==================== 事件歸檔表 ====================
CREATE TABLE IF NOT EXISTS events_archive (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  actor_id UUID NOT NULL,
  market_id UUID,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  
  -- 歸檔元數據
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by UUID REFERENCES profiles(id)
);

-- 索引優化
CREATE INDEX idx_events_archive_actor 
  ON events_archive(actor_id, timestamp DESC);

CREATE INDEX idx_events_archive_market 
  ON events_archive(market_id, timestamp DESC);

CREATE INDEX idx_events_archive_type 
  ON events_archive(type);

-- 註釋

-- ==================== RLS 政策 ====================
ALTER TABLE events_archive ENABLE ROW LEVEL SECURITY;

-- 用戶只能查看自己的歸檔事件
CREATE POLICY "用戶只能查看自己的歸檔事件"
  ON events_archive FOR SELECT
  USING (auth.uid() = actor_id);

-- 用戶只能創建自己的歸檔事件
CREATE POLICY "用戶只能創建自己的歸檔事件"
  ON events_archive FOR INSERT
  WITH CHECK (auth.uid() = actor_id);

-- ==================== 輔助函數 ====================

-- 獲取用戶最新快照
CREATE OR REPLACE FUNCTION get_latest_snapshot(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  snapshot_at TIMESTAMPTZ,
  event_count INTEGER,
  data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.snapshot_at,
    s.event_count,
    s.data
  FROM snapshots s
  WHERE s.user_id = p_user_id
  ORDER BY s.snapshot_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 清理舊快照（只保留最近2個）
CREATE OR REPLACE FUNCTION cleanup_old_snapshots(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH snapshots_to_keep AS (
    SELECT id
    FROM snapshots
    WHERE user_id = p_user_id
    ORDER BY snapshot_at DESC
    LIMIT 2
  )
  DELETE FROM snapshots
  WHERE user_id = p_user_id
    AND id NOT IN (SELECT id FROM snapshots_to_keep)
  RETURNING id INTO deleted_count;
  
  RETURN COALESCE(deleted_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 註釋

-- ============================================================
-- END SOURCE: 017_snapshots_and_archive.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 018_auto_create_profile.sql
-- ============================================================

-- ==================== Auto Create Profile ====================
-- 版本：018 - 自動創建用戶 Profile
-- 日期：2026-02-21
-- 說明：當新用戶註冊時，自動在 profiles 表創建記錄

-- ==================== 創建 Trigger Function ====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== 創建 Trigger ====================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==================== 註解 ====================

-- ==================== 完成 ====================
-- Auto Create Profile Trigger 創建完成

-- ============================================================
-- END SOURCE: 018_auto_create_profile.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 019_add_market_updated_event.sql
-- ============================================================

-- ==================== Migration 019 ====================
-- 日期：2026-02-22
-- 說明：添加 market_updated 事件類型到 events 表的 CHECK 約束
-- 原因：修復市集編輯後無法同步到 Supabase 的問題

-- ==================== 更新 events 表的 type CHECK 約束 ====================

-- 1. 刪除舊的 CHECK 約束
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;

-- 2. 添加新的 CHECK 約束（包含 market_updated）
ALTER TABLE events ADD CONSTRAINT events_type_check CHECK (
  type IN (
    'market_created',
    'market_updated',           -- ✅ 新增：市集更新事件
    'market_status_changed',
    'market_started',
    'market_ended',
    'market_deleted',           -- ✅ 確保包含市集刪除事件
    'product_created',
    'product_updated',
    'product_deleted',
    'interaction_recorded',
    'deal_closed',
    'settings_updated'          -- ✅ 確保包含設定更新事件
  )
);

-- ==================== 註解 ====================

-- ==================== 完成 ====================
-- Migration 019 完成
-- 現在可以記錄 market_updated 事件了

-- ============================================================
-- END SOURCE: 019_add_market_updated_event.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 020_add_market_updated_trigger.sql
-- ============================================================

-- ==================== Migration 020 ====================
-- 日期：2026-02-22
-- 說明：添加 market_updated 事件的觸發器處理邏輯
-- 原因：修復市集編輯後無法同步到 Supabase 的問題

-- ==================== 更新 market 讀取模型觸發器函數 ====================

CREATE OR REPLACE FUNCTION update_market_read_model()
RETURNS TRIGGER AS $$
DECLARE
  market_data JSONB;
  v_updates JSONB;
BEGIN
  -- 根據事件類型更新讀取模型
  CASE NEW.type
    
    -- 市集建立事件
    WHEN 'market_created' THEN
      INSERT INTO markets (
        id,
        owner_id,
        name,
        location,
        start_date,
        end_date,
        start_time,
        end_time,
        status,
        early_entry_enabled,
        early_entry_time,
        check_in_time,
        operating_start_time,
        operating_end_time,
        registration_fee,
        booth_cost,
        deposit,
        table_rental,
        chair_rental,
        umbrella_rental,
        tablecloth_rental,
        commission_rate,
        table_free,
        chair_free,
        umbrella_free,
        tablecloth_free,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        NEW.market_id,
        NEW.actor_id,
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'location')::TEXT,
        (NEW.payload->>'startDate')::DATE,
        (NEW.payload->>'endDate')::DATE,
        (NEW.payload->>'startTime')::TIME,
        (NEW.payload->>'endTime')::TIME,
        'registered',
        (NEW.payload->>'earlyEntryEnabled')::BOOLEAN,
        (NEW.payload->>'earlyEntryTime')::TIME,
        (NEW.payload->>'checkInTime')::TIME,
        (NEW.payload->>'operatingStartTime')::TIME,
        (NEW.payload->>'operatingEndTime')::TIME,
        (NEW.payload->>'registrationFee')::NUMERIC,
        (NEW.payload->>'boothCost')::NUMERIC,
        (NEW.payload->>'deposit')::NUMERIC,
        (NEW.payload->>'tableRental')::NUMERIC,
        (NEW.payload->>'chairRental')::NUMERIC,
        (NEW.payload->>'umbrellaRental')::NUMERIC,
        (NEW.payload->>'tableclothRental')::NUMERIC,
        (NEW.payload->>'commissionRate')::NUMERIC,
        (NEW.payload->>'tableFree')::BOOLEAN,
        (NEW.payload->>'chairFree')::BOOLEAN,
        (NEW.payload->>'umbrellaFree')::BOOLEAN,
        (NEW.payload->>'tableclothFree')::BOOLEAN,
        (NEW.payload->>'notes')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
      
      -- 自動添加 owner 到 market_members
      INSERT INTO market_members (market_id, user_id, role)
      VALUES (NEW.market_id, NEW.actor_id, 'owner')
      ON CONFLICT (market_id, user_id) DO NOTHING;
    
    -- ✅ 新增：市集更新事件
    WHEN 'market_updated' THEN
      -- 獲取 updates 物件
      v_updates := NEW.payload->'updates';
      
      -- 動態更新市集資料（只更新有提供的欄位）
      UPDATE markets
      SET 
        -- 基本資訊
        name = COALESCE((v_updates->>'name')::TEXT, name),
        location = COALESCE((v_updates->>'location')::TEXT, location),
        start_date = COALESCE((v_updates->>'start_date')::DATE, start_date),
        end_date = COALESCE((v_updates->>'end_date')::DATE, end_date),
        -- ❌ 移除：start_time 和 end_time 已在 Migration 022 中刪除
        -- start_time = COALESCE((v_updates->>'start_time')::TIME, start_time),
        -- end_time = COALESCE((v_updates->>'end_time')::TIME, end_time),
        
        -- 時間軸資訊
        early_entry_enabled = COALESCE((v_updates->>'early_entry_enabled')::BOOLEAN, early_entry_enabled),
        early_entry_time = COALESCE((v_updates->>'early_entry_time')::TIME, early_entry_time),
        check_in_time = COALESCE((v_updates->>'check_in_time')::TIME, check_in_time),
        operating_start_time = COALESCE((v_updates->>'operating_start_time')::TIME, operating_start_time),
        operating_end_time = COALESCE((v_updates->>'operating_end_time')::TIME, operating_end_time),
        
        -- 財務資訊
        registration_fee = COALESCE((v_updates->>'registration_fee')::NUMERIC, registration_fee),
        booth_cost = COALESCE((v_updates->>'booth_cost')::NUMERIC, booth_cost),
        deposit = COALESCE((v_updates->>'deposit')::NUMERIC, deposit),
        table_rental = COALESCE((v_updates->>'table_rental')::NUMERIC, table_rental),
        chair_rental = COALESCE((v_updates->>'chair_rental')::NUMERIC, chair_rental),
        umbrella_rental = COALESCE((v_updates->>'umbrella_rental')::NUMERIC, umbrella_rental),
        tablecloth_rental = COALESCE((v_updates->>'tablecloth_rental')::NUMERIC, tablecloth_rental),
        commission_rate = COALESCE((v_updates->>'commission_rate')::NUMERIC, commission_rate),
        
        -- 免費提供標記
        table_free = COALESCE((v_updates->>'table_free')::BOOLEAN, table_free),
        chair_free = COALESCE((v_updates->>'chair_free')::BOOLEAN, chair_free),
        umbrella_free = COALESCE((v_updates->>'umbrella_free')::BOOLEAN, umbrella_free),
        tablecloth_free = COALESCE((v_updates->>'tablecloth_free')::BOOLEAN, tablecloth_free),
        
        -- 備註
        notes = COALESCE((v_updates->>'notes')::TEXT, notes),
        
        -- 更新時間戳
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'market_id')::UUID;
    
    -- 市集狀態變更事件
    WHEN 'market_status_changed' THEN
      UPDATE markets
      SET 
        status = (NEW.payload->>'newStatus')::TEXT,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 市集開始營業事件
    WHEN 'market_started' THEN
      UPDATE markets
      SET 
        status = 'ongoing',
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 市集結束營業事件
    WHEN 'market_ended' THEN
      UPDATE markets
      SET 
        status = 'completed',
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 成交事件：更新統計
    WHEN 'deal_closed' THEN
      UPDATE markets
      SET 
        total_revenue = total_revenue + (NEW.payload->>'totalAmount')::NUMERIC,
        total_deals = total_deals + 1,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 互動記錄事件：更新統計
    WHEN 'interaction_recorded' THEN
      UPDATE markets
      SET 
        total_interactions = total_interactions + 1,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    ELSE
      -- 其他事件類型不處理
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== 註解 ====================

-- ==================== 完成 ====================
-- Migration 020 完成
-- 現在 market_updated 事件會自動更新 markets 表

-- ============================================================
-- END SOURCE: 020_add_market_updated_trigger.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: quick_test_database_compat_sync_status_columns.sql
-- ============================================================

-- BoothBook / Markit quick test database compatibility patch
--
-- Why this exists:
-- Historical migrations and runtime code reference sync_status on read models,
-- but the current migration archive does not explicitly add that column before
-- migration 034 creates idx_events_sync_status.
--
-- Run this only for disposable test database bootstrap when rebuilding schema
-- from the archived SQL files.

alter table if exists public.events
add column if not exists sync_status text default 'synced';

alter table if exists public.markets
add column if not exists sync_status text default 'synced';

alter table if exists public.products
add column if not exists sync_status text default 'synced';

create index if not exists idx_markets_sync_status
on public.markets(sync_status);

create index if not exists idx_products_sync_status
on public.products(sync_status);

-- ============================================================
-- END SOURCE: quick_test_database_compat_sync_status_columns.sql
-- ============================================================
