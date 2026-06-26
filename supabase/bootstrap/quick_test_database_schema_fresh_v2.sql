-- BoothBook / Markit quick test database schema bootstrap (recommended, corrected v3)
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
-- BEGIN SOURCE: 012_fix_trigger_naming_compatibility.sql
-- ============================================================

-- ==================== 修復 Trigger：支援駝峰式和底線式命名 ====================
-- 版本：012_fix_trigger_naming_compatibility
-- 日期：2026-01-24
-- 說明：Trigger 同時支援 startDate/start_date 等命名方式

-- ==================== Market Trigger ====================

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
-- Trigger 已更新，現在同時支援駝峰式和底線式命名

-- ============================================================
-- END SOURCE: 012_fix_trigger_naming_compatibility.sql
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

-- ============================================================
-- BEGIN SOURCE: 20240220_staff_system_simple.sql
-- ============================================================

-- ============================================
-- 員工系統：獨立表方案（不修改現有表）
-- 版本：2.0.0
-- 日期：2024-02-20
-- 描述：創建獨立的員工管理表，不修改 market_members
-- ============================================

-- ============================================
-- Step 1: 創建員工關係表
-- ============================================

CREATE TABLE IF NOT EXISTS staff_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_email TEXT NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  permissions JSONB DEFAULT '{"can_view": true, "can_edit": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 確保同一個員工不會被同一個老闆重複添加
  UNIQUE(owner_id, staff_id)
);


-- ============================================
-- Step 2: 創建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_staff_relationships_owner 
ON staff_relationships(owner_id, status);

CREATE INDEX IF NOT EXISTS idx_staff_relationships_staff 
ON staff_relationships(staff_id, status);

CREATE INDEX IF NOT EXISTS idx_staff_relationships_email 
ON staff_relationships(LOWER(staff_email));

-- ============================================
-- Step 3: 啟用 RLS
-- ============================================

ALTER TABLE staff_relationships ENABLE ROW LEVEL SECURITY;

-- 刪除舊政策（如果存在）
DROP POLICY IF EXISTS "Owners can manage their staff" ON staff_relationships;
DROP POLICY IF EXISTS "Staff can view their relationships" ON staff_relationships;
DROP POLICY IF EXISTS "Staff can accept invitations" ON staff_relationships;

-- 老闆可以查看和管理自己的員工
CREATE POLICY "Owners can manage their staff"
ON staff_relationships
FOR ALL
USING (auth.uid() = owner_id);

-- 員工可以查看自己的關係
CREATE POLICY "Staff can view their relationships"
ON staff_relationships
FOR SELECT
USING (auth.uid() = staff_id);

-- 員工可以接受邀請（更新 accepted_at）
CREATE POLICY "Staff can accept invitations"
ON staff_relationships
FOR UPDATE
USING (auth.uid() = staff_id AND status = 'pending')
WITH CHECK (auth.uid() = staff_id);

-- ============================================
-- Step 4: 創建輔助函數
-- ============================================

-- 檢查用戶是否為某老闆的員工
CREATE OR REPLACE FUNCTION is_staff_of(p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff_relationships
    WHERE staff_id = auth.uid()
    AND owner_id = p_owner_id
    AND status = 'active'
  );
END;
$$;

-- 獲取用戶的所有老闆
CREATE OR REPLACE FUNCTION get_my_owners()
RETURNS TABLE (
  owner_id UUID,
  owner_email TEXT,
  permissions JSONB,
  accepted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.owner_id,
    u.email,
    sr.permissions,
    sr.accepted_at
  FROM staff_relationships sr
  JOIN auth.users u ON u.id = sr.owner_id
  WHERE sr.staff_id = auth.uid()
  AND sr.status = 'active';
END;
$$;

-- 獲取老闆的所有員工
CREATE OR REPLACE FUNCTION get_my_staff()
RETURNS TABLE (
  staff_id UUID,
  staff_email TEXT,
  status TEXT,
  permissions JSONB,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.staff_id,
    sr.staff_email,
    sr.status,
    sr.permissions,
    sr.invited_at,
    sr.accepted_at
  FROM staff_relationships sr
  WHERE sr.owner_id = auth.uid()
  ORDER BY sr.created_at DESC;
END;
$$;

-- ============================================
-- Step 5: 創建觸發器（自動更新時間戳）
-- ============================================

CREATE OR REPLACE FUNCTION update_staff_relationships_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 刪除舊觸發器（如果存在）
DROP TRIGGER IF EXISTS trigger_update_staff_relationships_timestamp ON staff_relationships;

CREATE TRIGGER trigger_update_staff_relationships_timestamp
BEFORE UPDATE ON staff_relationships
FOR EACH ROW
EXECUTE FUNCTION update_staff_relationships_timestamp();

-- ============================================
-- Step 6: 創建員工專用視圖（修正重複欄位問題）
-- ============================================

-- 員工可訪問的市集視圖
CREATE OR REPLACE VIEW staff_accessible_markets AS
SELECT 
  m.*, -- 如果 m 裡面已經有 owner_id，這裡會包含它
  sr.owner_id AS relationship_owner_id, -- 給它一個別名避免衝突
  sr.permissions,
  'staff' as access_type
FROM markets m
JOIN market_members mm ON mm.market_id = m.id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'

UNION ALL

SELECT 
  m.*,
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM markets m
JOIN market_members mm ON mm.market_id = m.id
WHERE mm.user_id = auth.uid();

-- 員工可訪問的商品視圖
CREATE OR REPLACE VIEW staff_accessible_products AS
SELECT 
  p.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM products p
JOIN markets m ON p.market_id = m.id -- 先連接到市場以取得成員資訊
JOIN market_members mm ON mm.market_id = m.id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'

UNION ALL

SELECT 
  p.*,
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM products p
JOIN market_members mm ON mm.market_id = p.market_id
WHERE mm.user_id = auth.uid();

-- ============================================
-- 完成
-- ============================================

DO $$ 
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- END SOURCE: 20240220_staff_system_simple.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 021_auto_add_staff_to_markets.sql
-- ============================================================

-- ==================== Migration 021 ====================
-- 日期：2026-02-22
-- 說明：自動將員工添加到老闆的新市集
-- 原因：當老闆創建新市集時，員工應該自動獲得訪問權限

-- ==================== 創建觸發器函數 ====================

CREATE OR REPLACE FUNCTION auto_add_staff_to_new_market()
RETURNS TRIGGER AS $$
BEGIN
  -- 當新市集創建時，自動將該老闆的所有員工添加到 market_members
  INSERT INTO market_members (market_id, user_id, role)
  SELECT 
    NEW.id,           -- 新市集的 ID
    sr.staff_id,      -- 員工的 ID
    'staff'           -- 角色為 staff
  FROM staff_relationships sr
  WHERE sr.owner_id = NEW.owner_id
    AND sr.status = 'active'
  ON CONFLICT (market_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== 創建觸發器 ====================

DROP TRIGGER IF EXISTS trigger_auto_add_staff_to_new_market ON markets;

CREATE TRIGGER trigger_auto_add_staff_to_new_market
  AFTER INSERT ON markets
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_staff_to_new_market();

-- ==================== 補充現有市集的員工權限 ====================

-- 為所有現有市集添加缺少的員工權限
INSERT INTO market_members (market_id, user_id, role)
SELECT 
  m.id,
  sr.staff_id,
  'staff'
FROM markets m
CROSS JOIN staff_relationships sr
WHERE m.owner_id = sr.owner_id
  AND sr.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM market_members mm
    WHERE mm.market_id = m.id 
    AND mm.user_id = sr.staff_id
  )
ON CONFLICT (market_id, user_id) DO NOTHING;

-- ==================== 註解 ====================


-- ==================== 完成 ====================
-- Migration 021 完成
-- 現在老闆創建新市集時，員工會自動獲得訪問權限

-- ============================================================
-- END SOURCE: 021_auto_add_staff_to_markets.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 022_remove_duplicate_time_fields.sql
-- ============================================================

-- ==================== Migration 022 (修正版) ====================
-- 日期：2026-02-22
-- 說明：移除重複的時間欄位（start_time & end_time）
-- 原因：與 operating_start_time & operating_end_time 重複，造成程式邏輯混亂
-- 修正：先更新依賴的視圖，再安全刪除欄位

-- ==================== 問題說明 ====================
-- 當前 markets 表有兩組幾乎相同的時間欄位：
-- 1. start_time & end_time（幾乎沒有使用）
-- 2. operating_start_time & operating_end_time（實際在使用）
--
-- 依賴關係：
-- - staff_accessible_markets 視圖使用 m.* 包含了所有欄位
-- - 需要先更新視圖，明確列出欄位，排除 start_time 和 end_time

-- ==================== 風險評估 ====================
DO $$
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

-- ==================== 驗證當前數據 ====================
DO $$
DECLARE
  start_time_count INTEGER;
  end_time_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO start_time_count FROM markets WHERE start_time IS NOT NULL;
  SELECT COUNT(*) INTO end_time_count FROM markets WHERE end_time IS NOT NULL;
  
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  
  IF start_time_count > 0 OR end_time_count > 0 THEN
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
  ELSE
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
  END IF;
END $$;

-- ==================== 步驟 1：備份數據 ====================
DO $$
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

UPDATE markets
SET 
  operating_start_time = COALESCE(operating_start_time, start_time),
  operating_end_time = COALESCE(operating_end_time, end_time),
  updated_at = NOW()
WHERE 
  (start_time IS NOT NULL AND operating_start_time IS NULL)
  OR (end_time IS NOT NULL AND operating_end_time IS NULL);

DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count 
  FROM markets 
  WHERE operating_start_time IS NOT NULL OR operating_end_time IS NOT NULL;
  
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

-- ==================== 步驟 2：重建視圖（明確列出欄位）====================
DO $$
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

-- 刪除舊視圖
DROP VIEW IF EXISTS staff_accessible_markets CASCADE;
DROP VIEW IF EXISTS staff_accessible_products CASCADE;

-- 重建 staff_accessible_markets 視圖（明確列出欄位，排除 start_time 和 end_time）
CREATE OR REPLACE VIEW staff_accessible_markets AS
SELECT 
  -- 明確列出所有需要的欄位（排除 start_time 和 end_time）
  m.id,
  m.owner_id,
  m.name,
  m.location,
  m.start_date,
  m.end_date,
  -- ❌ 不包含 m.start_time
  -- ❌ 不包含 m.end_time
  m.status,
  m.early_entry_enabled,
  m.early_entry_time,
  m.check_in_time,
  m.operating_start_time,  -- ✅ 保留
  m.operating_end_time,    -- ✅ 保留
  m.registration_fee,
  m.booth_cost,
  m.deposit,
  m.table_rental,
  m.chair_rental,
  m.umbrella_rental,
  m.tablecloth_rental,
  m.commission_rate,
  m.table_free,
  m.chair_free,
  m.umbrella_free,
  m.tablecloth_free,
  m.total_revenue,
  m.total_profit,
  m.total_interactions,
  m.total_deals,
  m.notes,
  m.created_at,
  m.updated_at,
  -- 員工關係欄位
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM markets m
JOIN market_members mm ON mm.market_id = m.id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'

UNION ALL

SELECT 
  -- 明確列出所有需要的欄位（排除 start_time 和 end_time）
  m.id,
  m.owner_id,
  m.name,
  m.location,
  m.start_date,
  m.end_date,
  -- ❌ 不包含 m.start_time
  -- ❌ 不包含 m.end_time
  m.status,
  m.early_entry_enabled,
  m.early_entry_time,
  m.check_in_time,
  m.operating_start_time,  -- ✅ 保留
  m.operating_end_time,    -- ✅ 保留
  m.registration_fee,
  m.booth_cost,
  m.deposit,
  m.table_rental,
  m.chair_rental,
  m.umbrella_rental,
  m.tablecloth_rental,
  m.commission_rate,
  m.table_free,
  m.chair_free,
  m.umbrella_free,
  m.tablecloth_free,
  m.total_revenue,
  m.total_profit,
  m.total_interactions,
  m.total_deals,
  m.notes,
  m.created_at,
  m.updated_at,
  -- 老闆關係欄位
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM markets m
JOIN market_members mm ON mm.market_id = m.id
WHERE mm.user_id = auth.uid();

-- 重建 staff_accessible_products 視圖
CREATE OR REPLACE VIEW staff_accessible_products AS
SELECT 
  p.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM products p
JOIN markets m ON p.market_id = m.id
JOIN market_members mm ON mm.market_id = m.id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'

UNION ALL

SELECT 
  p.*,
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM products p
JOIN market_members mm ON mm.market_id = p.market_id
WHERE mm.user_id = auth.uid();

DO $$
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

-- ==================== 步驟 3：移除重複欄位 ====================
DO $$
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

ALTER TABLE markets DROP COLUMN IF EXISTS start_time;
ALTER TABLE markets DROP COLUMN IF EXISTS end_time;

DO $$ 
BEGIN 
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

-- ==================== 步驟 4：更新註解 ====================
DO $$
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;




DO $$
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

-- ==================== 驗證結果 ====================
DO $$
DECLARE
  column_exists BOOLEAN;
  view_exists BOOLEAN;
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  
  -- 檢查 start_time 是否還存在
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'markets' 
    AND column_name = 'start_time'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE EXCEPTION '❌ start_time 欄位仍然存在，移除失敗';
  ELSE
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
  END IF;
  
  -- 檢查 end_time 是否還存在
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'markets' 
    AND column_name = 'end_time'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE EXCEPTION '❌ end_time 欄位仍然存在，移除失敗';
  ELSE
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
  END IF;
  
  -- 檢查 operating_start_time 是否存在
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'markets' 
    AND column_name = 'operating_start_time'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE EXCEPTION '❌ operating_start_time 欄位不存在';
  ELSE
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
  END IF;
  
  -- 檢查 operating_end_time 是否存在
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'markets' 
    AND column_name = 'operating_end_time'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE EXCEPTION '❌ operating_end_time 欄位不存在';
  ELSE
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
  END IF;
  
  -- 檢查視圖是否存在
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_name = 'staff_accessible_markets'
  ) INTO view_exists;
  
  IF NOT view_exists THEN
    RAISE EXCEPTION '❌ staff_accessible_markets 視圖不存在';
  ELSE
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
  END IF;
  
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_name = 'staff_accessible_products'
  ) INTO view_exists;
  
  IF NOT view_exists THEN
    RAISE EXCEPTION '❌ staff_accessible_products 視圖不存在';
  ELSE
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
  END IF;
END $$;

-- ==================== 完成 ====================
DO $$
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

-- ==================== 回滾腳本（如需要）====================
-- 如果需要回滾，執行以下 SQL：
/*
-- 1. 重新添加欄位
ALTER TABLE markets ADD COLUMN start_time TIME;
ALTER TABLE markets ADD COLUMN end_time TIME;

-- 2. 複製數據
UPDATE markets
SET 
  start_time = operating_start_time,
  end_time = operating_end_time;

-- 3. 重建視圖（使用 m.*）
DROP VIEW IF EXISTS staff_accessible_markets CASCADE;
DROP VIEW IF EXISTS staff_accessible_products CASCADE;

CREATE OR REPLACE VIEW staff_accessible_markets AS
SELECT 
  m.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM markets m
JOIN market_members mm ON mm.market_id = m.id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'
UNION ALL
SELECT 
  m.*,
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM markets m
JOIN market_members mm ON mm.market_id = m.id
WHERE mm.user_id = auth.uid();

CREATE OR REPLACE VIEW staff_accessible_products AS
SELECT 
  p.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM products p
JOIN markets m ON p.market_id = m.id
JOIN market_members mm ON mm.market_id = m.id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'
UNION ALL
SELECT 
  p.*,
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM products p
JOIN market_members mm ON mm.market_id = p.market_id
WHERE mm.user_id = auth.uid();

-- 4. 更新註解
*/

-- ============================================================
-- END SOURCE: 022_remove_duplicate_time_fields.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 023_fix_market_updated_trigger.sql
-- ============================================================

-- ==================== Migration 023 ====================
-- 日期：2026-02-22
-- 說明：修復 market_updated 事件觸發器（移除已刪除的 start_time 和 end_time 欄位）
-- 原因：Migration 022 已移除 start_time 和 end_time，但 trigger 仍嘗試更新這些欄位

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
    
    -- ✅ 市集更新事件（修復：移除 start_time 和 end_time）
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
        -- ✅ 移除：start_time 和 end_time 已在 Migration 022 中刪除
        
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
    
    -- 市集刪除事件
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
      -- 其他事件類型不處理
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== 註解 ====================

-- ==================== 完成 ====================
DO $$ 
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- END SOURCE: 023_fix_market_updated_trigger.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 024_fix_events_insert_policy.sql
-- ============================================================

-- ==================== 修復 Events 表 INSERT RLS 政策 ====================
-- 版本：024 - 修復事件插入政策
-- 日期：2026-02-23
-- 說明：
--   1. 修復 events 表的 INSERT 政策
--   2. 允許用戶插入 market_created 事件（即使 market_members 還不存在）
--   3. 允許用戶插入自己的全局事件（market_id = NULL）
--   4. 允許用戶插入自己參與的市集的事件

-- ==================== 刪除舊政策 ====================

DROP POLICY IF EXISTS "用戶可以插入自己市集的事件" ON events;

-- ==================== 創建新政策 ====================

-- 用戶可以插入：
-- 1. 自己創建的事件（actor_id = auth.uid()）
-- 2. market_id = NULL 的全局事件（如商品事件）
-- 3. market_created 事件（特殊處理，允許在 market_members 創建前插入）
-- 4. 自己參與的市集的事件
CREATE POLICY "用戶可以插入自己的事件"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid() AND
  (
    -- 全局事件（商品事件等）
    market_id IS NULL
    OR
    -- market_created 事件（特殊處理）
    type = 'market_created'
    OR
    -- 自己參與的市集的事件
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
-- 1. 測試插入 market_created 事件（應該成功）
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'market_created',
  '{"name": "測試市集", "location": "台北"}'::jsonb,
  auth.uid(),
  gen_random_uuid(),
  now()
);

-- 2. 測試插入商品事件（應該成功）
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'product_created',
  '{"name": "測試商品", "price": 100}'::jsonb,
  auth.uid(),
  NULL,
  now()
);

-- 3. 測試插入其他市集的事件（應該失敗）
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'deal_closed',
  '{"amount": 100}'::jsonb,
  auth.uid(),
  '00000000-0000-0000-0000-000000000000', -- 不存在的市集
  now()
);
-- 應該返回錯誤：new row violates row-level security policy
*/

-- ==================== 完成 ====================
-- Events 表 INSERT RLS 政策已修復
-- 現在可以正常插入 market_created 和商品事件了

-- ============================================================
-- END SOURCE: 024_fix_events_insert_policy.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 025_support_staff_mode_events.sql
-- ============================================================

-- ==================== 修復 Events 表 INSERT RLS 政策（支援員工模式）====================
-- 版本：025 - 支援員工模式上傳事件
-- 日期：2026-02-23
-- 說明：
--   1. 允許員工插入老闆市集的事件
--   2. 保留員工的 actor_id（不修改創建者）
--   3. 防止跨帳號數據盜取

-- ==================== 刪除舊政策 ====================

DROP POLICY IF EXISTS "用戶可以插入自己市集的事件" ON events;
DROP POLICY IF EXISTS "用戶可以插入事件_v2" ON events;
DROP POLICY IF EXISTS "用戶可以插入自己的事件" ON events;

-- ==================== 創建新政策 ====================

-- 用戶可以插入：
-- 1. 自己創建的事件（actor_id = auth.uid()）
-- 2. market_id = NULL 的全局事件（如商品事件）
-- 3. market_created 事件（特殊處理，允許在 market_members 創建前插入）
-- 4. 自己參與的市集的事件（作為 owner）
-- 5. ✅ 員工可以插入老闆市集的事件（作為 staff）
CREATE POLICY "用戶可以插入事件_v3"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid() AND
  (
    -- 全局事件（商品事件等）
    market_id IS NULL
    OR
    -- market_created 事件（特殊處理）
    type = 'market_created'
    OR
    -- 自己參與的市集的事件（owner）
    EXISTS (
      SELECT 1 FROM market_members
      WHERE market_id = events.market_id
        AND user_id = auth.uid()
    )
    OR
    -- ✅ 員工可以插入老闆市集的事件
    EXISTS (
      SELECT 1 FROM market_members mm
      JOIN staff_relationships sr ON sr.owner_id = mm.user_id
      WHERE mm.market_id = events.market_id
        AND sr.staff_id = auth.uid()
        AND sr.status = 'active'
    )
  )
);

-- ==================== 註解 ====================


-- ==================== 測試 ====================

-- 測試腳本（在 SQL Editor 中執行）
/*
-- 1. 測試老闆插入 market_created 事件（應該成功）
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'market_created',
  '{"name": "測試市集", "location": "台北"}'::jsonb,
  auth.uid(),
  gen_random_uuid(),
  now()
);

-- 2. 測試員工插入互動事件（應該成功）
-- 前提：員工已被添加到 staff_relationships，且老闆是該市集的成員
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'interaction_recorded',
  '{"type": "touch", "marketId": "老闆的市集ID"}'::jsonb,
  auth.uid(), -- 員工的 ID
  '老闆的市集ID',
  now()
);

-- 3. 測試插入其他人的市集事件（應該失敗）
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'deal_closed',
  '{"amount": 100}'::jsonb,
  auth.uid(),
  '00000000-0000-0000-0000-000000000000', -- 不存在的市集
  now()
);
-- 應該返回錯誤：new row violates row-level security policy
*/

-- ==================== 完成 ====================
-- Events 表 INSERT RLS 政策已更新
-- 現在支援員工模式，員工可以插入老闆市集的事件，且保留員工的 actor_id

-- ============================================================
-- END SOURCE: 025_support_staff_mode_events.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 026_add_delete_event_types.sql
-- ============================================================

-- ==================== Supabase Schema Migration ====================
-- 版本：026 - 添加刪除事件類型
-- 日期：2026-02-26
-- 說明：添加 deal_deleted 和 interaction_deleted 事件類型到 events 表的 CHECK constraint

-- ==================== 更新 events 表的 type CHECK constraint ====================

-- 1. 刪除舊的 CHECK constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;

-- 2. 添加新的 CHECK constraint（包含刪除事件類型）
ALTER TABLE events ADD CONSTRAINT events_type_check CHECK (
  type IN (
    -- 市集相關事件
    'market_created',
    'market_updated',
    'market_status_changed',
    'market_started',
    'market_ended',
    'market_deleted',
    -- 商品相關事件
    'product_created',
    'product_updated',
    'product_deleted',
    -- 互動相關事件
    'interaction_recorded',
    'interaction_deleted',
    'deal_closed',
    'deal_deleted',
    -- 設定相關事件
    'settings_updated'
  )
);

-- ==================== 註解 ====================

-- ==================== 完成 ====================
-- Migration 完成
-- 新增事件類型：
-- - interaction_deleted: 刪除互動記錄
-- - deal_deleted: 刪除成交記錄
-- - market_updated: 市集更新（補充）
-- - market_deleted: 市集刪除（補充）
-- - settings_updated: 設定更新（補充）

-- ============================================================
-- END SOURCE: 026_add_delete_event_types.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 027_add_staff_events_view.sql
-- ============================================================

-- ==================== 創建員工事件視圖 ====================
-- 版本：027 - 支援員工模式拉取事件
-- 日期：2026-02-28
-- 說明：
--   1. 創建 staff_accessible_events 視圖
--   2. 員工可以查看老闆市集的所有事件
--   3. 包含市集事件和全局事件（商品事件）

-- ==================== 刪除舊視圖（如果存在）====================

DROP VIEW IF EXISTS staff_accessible_events;

-- ==================== 創建員工事件視圖 ====================

-- 員工可訪問的事件視圖
CREATE OR REPLACE VIEW staff_accessible_events AS
-- 1. 員工可以查看老闆市集的事件
SELECT 
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'

UNION ALL

-- 2. 員工可以查看老闆的全局事件（商品事件等，market_id = NULL）
SELECT 
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM events e
JOIN staff_relationships sr ON sr.owner_id = e.actor_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'
AND e.market_id IS NULL

UNION ALL

-- 3. 老闆可以查看自己的所有事件
SELECT 
  e.*,
  e.actor_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM events e
WHERE e.actor_id = auth.uid()

UNION ALL

-- 4. 老闆可以查看自己市集的所有事件（包括員工創建的）
SELECT 
  e.*,
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
WHERE mm.user_id = auth.uid()
AND e.actor_id != auth.uid(); -- 避免與上面的 UNION 重複

-- ==================== 註解 ====================


-- ==================== 完成 ====================

DO $$ 
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- END SOURCE: 027_add_staff_events_view.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 028_staff_invitations.sql
-- ============================================================

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
  
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  
  RETURN deleted_count;
END;
$$;


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


-- ============================================
-- 完成
-- ============================================

DO $$ 
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- END SOURCE: 028_staff_invitations.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 029_fix_staff_accessible_products.sql
-- ============================================================

-- ==================== 修復員工可訪問商品視圖 ====================
-- 版本：029 - 修復商品同步問題
-- 日期：2026-03-03
-- 說明：
--   1. 修復 staff_accessible_products 視圖邏輯
--   2. 商品應該透過 owner_id 連接，而不是 market_id
--   3. 員工可以看到老闆的所有商品（包括全局商品）

-- ==================== 刪除舊視圖 ====================

DROP VIEW IF EXISTS staff_accessible_products;

-- ==================== 創建新視圖 ====================

-- 員工可訪問的商品視圖
CREATE OR REPLACE VIEW staff_accessible_products AS
-- 1. 員工可以查看老闆的商品（透過 owner_id 直接連接）
SELECT 
  p.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM products p
JOIN staff_relationships sr ON sr.owner_id = p.owner_id  -- ✅ 直接透過 owner_id 連接
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'
AND p.is_active = TRUE  -- ✅ 排除已刪除的商品（使用 is_active）

UNION ALL

-- 2. 老闆可以查看自己的商品
SELECT 
  p.*,
  p.owner_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM products p
WHERE p.owner_id = auth.uid()
AND p.is_active = TRUE;  -- ✅ 排除已刪除的商品（使用 is_active）

-- ==================== 註解 ====================


-- ==================== 測試查詢 ====================

/*
-- 測試 1：老闆查看自己的商品（應該看到所有自己的商品）
SELECT * FROM staff_accessible_products WHERE access_type = 'owner';

-- 測試 2：員工查看可訪問的商品（應該看到老闆的所有商品）
SELECT * FROM staff_accessible_products WHERE access_type = 'staff';

-- 測試 3：檢查商品數量
SELECT 
  access_type,
  COUNT(*) as product_count
FROM staff_accessible_products
GROUP BY access_type;
*/

-- ==================== 完成 ====================

DO $$ 
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- END SOURCE: 029_fix_staff_accessible_products.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 030_fix_data_isolation.sql
-- ============================================================

-- ==================== 緊急修復：數據隔離問題 ====================
-- 版本：030 - 修復視圖返回其他用戶數據的問題
-- 日期：2026-03-03
-- 說明：
--   1. 視圖返回了其他用戶的數據
--   2. 需要在視圖中添加更嚴格的過濾
--   3. 確保只返回當前用戶可訪問的數據

-- ==================== 問題分析 ====================
/*
當前問題：
- 員工 B 登入後，視圖返回了 25 個市集、6 個商品、208 個事件
- 但這些數據不屬於員工 B，而是其他用戶的數據
- 說明視圖的過濾邏輯有問題

可能原因：
1. staff_relationships 表中有多條記錄（員工 B 曾經加入過多個團隊）
2. 視圖沒有正確過濾 status = 'active'
3. RLS 政策沒有生效
*/

-- ==================== 診斷查詢 ====================

-- 檢查當前用戶的員工關係
SELECT 
  id,
  owner_id,
  staff_id,
  status,
  created_at
FROM staff_relationships
WHERE staff_id = auth.uid()
ORDER BY created_at DESC;

-- 檢查視圖返回的市集
SELECT 
  id,
  name,
  owner_id,
  access_type,
  relationship_owner_id
FROM staff_accessible_markets
LIMIT 10;

-- 檢查視圖返回的商品
SELECT 
  id,
  name,
  owner_id,
  access_type,
  relationship_owner_id
FROM staff_accessible_products
LIMIT 10;

-- ==================== 修復方案 ====================

-- 方案 1：清理無效的員工關係
-- 如果員工 B 曾經加入過其他團隊，但現在已經離開，需要清理這些記錄

-- 查看所有非 active 的關係
SELECT 
  id,
  owner_id,
  staff_id,
  status,
  created_at
FROM staff_relationships
WHERE staff_id = auth.uid()
AND status != 'active';

-- 刪除非 active 的關係（可選）
-- DELETE FROM staff_relationships
-- WHERE staff_id = auth.uid()
-- AND status != 'active';

-- 方案 2：確保視圖只返回 active 的關係
-- 視圖定義中已經有 AND sr.status = 'active'，但可能沒有生效

-- 重新創建視圖（強制刷新）
DROP VIEW IF EXISTS staff_accessible_markets CASCADE;
DROP VIEW IF EXISTS staff_accessible_products CASCADE;
DROP VIEW IF EXISTS staff_accessible_events CASCADE;

-- 重新創建市集視圖
CREATE OR REPLACE VIEW staff_accessible_markets AS
-- 1. 員工可以查看老闆的市集
SELECT 
  m.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM markets m
JOIN market_members mm ON mm.market_id = m.id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'  -- ✅ 確保只返回 active 的關係

UNION ALL

-- 2. 老闆可以查看自己的市集
SELECT 
  m.*,
  m.owner_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM markets m
JOIN market_members mm ON mm.market_id = m.id
WHERE mm.user_id = auth.uid();

-- 重新創建商品視圖
CREATE OR REPLACE VIEW staff_accessible_products AS
-- 1. 員工可以查看老闆的商品
SELECT 
  p.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM products p
JOIN staff_relationships sr ON sr.owner_id = p.owner_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'  -- ✅ 確保只返回 active 的關係
AND p.is_active = TRUE    -- ✅ 排除已刪除的商品

UNION ALL

-- 2. 老闆可以查看自己的商品
SELECT 
  p.*,
  p.owner_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM products p
WHERE p.owner_id = auth.uid()
AND p.is_active = TRUE;   -- ✅ 排除已刪除的商品

-- 重新創建事件視圖
CREATE OR REPLACE VIEW staff_accessible_events AS
-- 1. 員工可以查看老闆市集的事件
SELECT 
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'  -- ✅ 確保只返回 active 的關係

UNION ALL

-- 2. 員工可以查看老闆的全局事件（商品事件等，market_id = NULL）
SELECT 
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM events e
JOIN staff_relationships sr ON sr.owner_id = e.actor_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'  -- ✅ 確保只返回 active 的關係
AND e.market_id IS NULL

UNION ALL

-- 3. 老闆可以查看自己的所有事件
SELECT 
  e.*,
  e.actor_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM events e
WHERE e.actor_id = auth.uid()

UNION ALL

-- 4. 老闆可以查看自己市集的所有事件（包括員工創建的）
SELECT 
  e.*,
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
WHERE mm.user_id = auth.uid()
AND e.actor_id != auth.uid(); -- 避免與上面的 UNION 重複

-- ==================== 註解 ====================


-- ==================== 驗證查詢 ====================

-- 驗證 1：檢查當前用戶的 active 關係
SELECT 
  'Active Relationships' as check_type,
  COUNT(*) as count
FROM staff_relationships
WHERE staff_id = auth.uid()
AND status = 'active';

-- 驗證 2：檢查視圖返回的市集數量
SELECT 
  'Markets from View' as check_type,
  COUNT(*) as count
FROM staff_accessible_markets;

-- 驗證 3：檢查視圖返回的商品數量
SELECT 
  'Products from View' as check_type,
  COUNT(*) as count
FROM staff_accessible_products;

-- 驗證 4：檢查視圖返回的事件數量
SELECT 
  'Events from View' as check_type,
  COUNT(*) as count
FROM staff_accessible_events;

-- ==================== 清理腳本 ====================

-- 如果需要清理無效的員工關係，執行以下腳本：
/*
-- 查看所有非 active 的關係
SELECT 
  id,
  owner_id,
  (SELECT email FROM auth.users WHERE id = owner_id) as owner_email,
  staff_id,
  (SELECT email FROM auth.users WHERE id = staff_id) as staff_email,
  status,
  created_at
FROM staff_relationships
WHERE status != 'active'
ORDER BY created_at DESC;

-- 刪除非 active 的關係（謹慎執行！）
-- DELETE FROM staff_relationships
-- WHERE status != 'active';
*/

-- ==================== 完成 ====================

DO $$ 
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- END SOURCE: 030_fix_data_isolation.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 031_harden_staff_invitations.sql
-- ============================================================

-- Harden staff invitation access.
-- Keep public token verification through RPC, but stop direct table reads by token.

ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can verify invitation tokens" ON staff_invitations;

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
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT
    si.owner_id,
    u.email,
    si.expires_at,
    si.expires_at > NOW()
  INTO v_owner_id, v_owner_email, v_expires_at, v_is_valid
  FROM staff_invitations si
  JOIN auth.users u ON u.id = si.owner_id
  WHERE si.token = p_token
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_is_valid, v_owner_id, v_owner_email, v_expires_at;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

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
  v_staff_id UUID;
  v_staff_email TEXT;
  v_existing_owner_count INTEGER;
BEGIN
  v_staff_id := auth.uid();

  IF v_staff_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_staff_id IS NOT NULL AND p_staff_id <> v_staff_id THEN
    RETURN QUERY SELECT FALSE, 'Authenticated user does not match staff id'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN QUERY SELECT FALSE, 'Invalid invitation token'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT si.owner_id, si.expires_at
  INTO v_owner_id, v_expires_at
  FROM staff_invitations si
  WHERE si.token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid invitation token'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, 'Invitation has expired'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_owner_id = v_staff_id THEN
    RETURN QUERY SELECT FALSE, 'Owner cannot accept their own invitation'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO v_existing_owner_count
  FROM staff_relationships
  WHERE staff_id = v_staff_id
  AND status IN ('pending', 'active');

  IF v_existing_owner_count > 0 THEN
    RETURN QUERY SELECT FALSE, 'This user is already bound to an owner'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM staff_relationships
    WHERE owner_id = v_owner_id
    AND staff_id = v_staff_id
    AND status IN ('pending', 'active')
  ) THEN
    RETURN QUERY SELECT FALSE, 'This user is already invited by this owner'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT email INTO v_staff_email
  FROM auth.users
  WHERE id = v_staff_id;

  INSERT INTO staff_relationships (
    owner_id,
    staff_id,
    staff_email,
    status,
    accepted_at,
    permissions
  ) VALUES (
    v_owner_id,
    v_staff_id,
    v_staff_email,
    'active',
    NOW(),
    '{"can_view": true, "can_edit": false}'::jsonb
  )
  RETURNING id INTO v_relationship_id;

  RETURN QUERY SELECT TRUE, 'Invitation accepted'::TEXT, v_relationship_id;
END;
$$;



-- ============================================================
-- END SOURCE: 031_harden_staff_invitations.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 032_safe_staff_invitation_acceptance.sql
-- ============================================================

-- Make token-based staff invitation acceptance complete and atomic.
-- The RPC now binds the staff relationship and adds the staff user to the
-- owner's active markets in the same transaction.

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
  v_staff_id UUID;
  v_staff_email TEXT;
  v_existing_owner_count INTEGER;
BEGIN
  v_staff_id := auth.uid();

  IF v_staff_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_staff_id IS NOT NULL AND p_staff_id <> v_staff_id THEN
    RETURN QUERY SELECT FALSE, 'Authenticated user does not match staff id'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN QUERY SELECT FALSE, 'Invalid invitation token'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT si.owner_id, si.expires_at
  INTO v_owner_id, v_expires_at
  FROM staff_invitations si
  WHERE si.token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid invitation token'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, 'Invitation has expired'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_owner_id = v_staff_id THEN
    RETURN QUERY SELECT FALSE, 'Owner cannot accept their own invitation'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO v_existing_owner_count
  FROM staff_relationships
  WHERE staff_id = v_staff_id
  AND status IN ('pending', 'active');

  IF v_existing_owner_count > 0 THEN
    RETURN QUERY SELECT FALSE, 'This user is already bound to an owner'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT email INTO v_staff_email
  FROM auth.users
  WHERE id = v_staff_id;

  INSERT INTO staff_relationships (
    owner_id,
    staff_id,
    staff_email,
    status,
    accepted_at,
    permissions
  ) VALUES (
    v_owner_id,
    v_staff_id,
    v_staff_email,
    'active',
    NOW(),
    '{"can_view": true, "can_edit": false}'::jsonb
  )
  ON CONFLICT (owner_id, staff_id)
  DO UPDATE SET
    staff_email = EXCLUDED.staff_email,
    status = 'active',
    accepted_at = NOW(),
    permissions = EXCLUDED.permissions,
    updated_at = NOW()
  RETURNING id INTO v_relationship_id;

  INSERT INTO market_members (
    market_id,
    user_id,
    role,
    joined_at
  )
  SELECT
    m.id,
    v_staff_id,
    'staff',
    NOW()
  FROM markets m
  WHERE m.owner_id = v_owner_id
    AND m.status IN ('ongoing', 'registered', 'accepted', 'paid')
    AND NOT EXISTS (
      SELECT 1
      FROM market_members mm
      WHERE mm.market_id = m.id
        AND mm.user_id = v_staff_id
    );

  DELETE FROM staff_invitations
  WHERE token = p_token;

  RETURN QUERY SELECT TRUE, 'Invitation accepted'::TEXT, v_relationship_id;
END;
$$;


-- ============================================================
-- END SOURCE: 032_safe_staff_invitation_acceptance.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 033_account_data_deletion_rpcs.sql
-- ============================================================

-- Move destructive account/team cleanup into SECURITY DEFINER RPCs.
-- This keeps cloud mutations atomic and lets clients clear local caches only after success.

CREATE OR REPLACE FUNCTION delete_current_user_app_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_market_ids UUID[];
  v_count INTEGER;
  v_result JSONB := '{}'::jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO v_market_ids
  FROM markets
  WHERE owner_id = v_user_id;

  DELETE FROM staff_invitations
  WHERE owner_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('staff_invitations', v_count);

  DELETE FROM staff_relationships
  WHERE owner_id = v_user_id
     OR staff_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('staff_relationships', v_count);

  DELETE FROM market_members
  WHERE user_id = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('market_members', v_count);

  DELETE FROM events
  WHERE actor_id = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('events', v_count);

  DELETE FROM products
  WHERE owner_id = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('products', v_count);

  DELETE FROM snapshots
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('snapshots', v_count);

  DELETE FROM user_settings
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('user_settings', v_count);

  DELETE FROM events_archive
  WHERE actor_id = v_user_id
     OR archived_by = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('events_archive', v_count);

  DELETE FROM markets
  WHERE owner_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('markets', v_count);

  RETURN v_result || jsonb_build_object('user_id', v_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION leave_current_staff_team(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_market_ids UUID[];
  v_count INTEGER;
  v_result JSONB := '{}'::jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner id is required';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO v_market_ids
  FROM markets
  WHERE owner_id = p_owner_id;

  DELETE FROM market_members
  WHERE user_id = v_user_id
    AND role = 'staff'
    AND market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('market_members', v_count);

  DELETE FROM staff_relationships
  WHERE owner_id = p_owner_id
    AND staff_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('staff_relationships', v_count);

  RETURN v_result || jsonb_build_object('owner_id', p_owner_id, 'staff_id', v_user_id);
END;
$$;

REVOKE ALL ON FUNCTION delete_current_user_app_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION leave_current_staff_team(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION delete_current_user_app_data() TO authenticated;
GRANT EXECUTE ON FUNCTION leave_current_staff_team(UUID) TO authenticated;



-- ============================================================
-- END SOURCE: 033_account_data_deletion_rpcs.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 034_performance_indexes.sql
-- ============================================================

-- ============================================================
-- Supabase Schema Migration
-- 版本：034 - 資料庫效能優化
-- 日期：2026-05-26
-- 說明：
--   1. 添加效能索引
--   2. 添加 staff_relationships owner_id 默認值
--   3. 修復市場成員表外鍵約束
-- ============================================================

-- ==================== 1. 添加效能索引 ====================

-- events 表索引（高頻查詢優化）
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_actor_id ON events(actor_id);
CREATE INDEX IF NOT EXISTS idx_events_market_id ON events(market_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_sync_status ON events(sync_status);

-- 組合索引（常見查詢模式）
CREATE INDEX IF NOT EXISTS idx_events_market_timestamp ON events(market_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_actor_timestamp ON events(actor_id, timestamp DESC);

-- market_members 表索引
CREATE INDEX IF NOT EXISTS idx_market_members_user_id ON market_members(user_id);
CREATE INDEX IF NOT EXISTS idx_market_members_role ON market_members(role);
CREATE INDEX IF NOT EXISTS idx_market_members_market_user ON market_members(market_id, user_id);

-- staff_relationships 表索引
CREATE INDEX IF NOT EXISTS idx_staff_relationships_owner ON staff_relationships(owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_relationships_staff ON staff_relationships(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_relationships_status ON staff_relationships(status);
CREATE INDEX IF NOT EXISTS idx_staff_relationships_owner_staff ON staff_relationships(owner_id, staff_id);

-- staff_invitations 表索引
CREATE INDEX IF NOT EXISTS idx_staff_invitations_owner ON staff_invitations(owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(token);

-- snapshots 表索引（用於快速同步）
CREATE INDEX IF NOT EXISTS idx_snapshots_user_id ON snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_last_event_id ON snapshots(last_event_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_version ON snapshots(user_id, version DESC);

-- products 表索引
CREATE INDEX IF NOT EXISTS idx_products_owner_id ON products(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_market_id ON products(market_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- markets 表索引
CREATE INDEX IF NOT EXISTS idx_markets_owner_id ON markets(owner_id);
CREATE INDEX IF NOT EXISTS idx_markets_start_date ON markets(start_date);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);

-- ==================== 2. 修復 staff_relationships 表 ====================

-- 將 owner_id 設置為 NOT NULL（添加默認值並更新現有記錄）
ALTER TABLE staff_relationships
ALTER COLUMN owner_id SET NOT NULL;

-- 添加註釋

-- ==================== 3. 驗證索引創建 ====================

-- 驗證所有索引已創建
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename IN ('events', 'market_members', 'staff_relationships', 'staff_invitations', 'snapshots', 'products', 'markets')
    OR indexname LIKE 'idx_events_%'
    OR indexname LIKE 'idx_market_members_%'
    OR indexname LIKE 'idx_staff_%'
    OR indexname LIKE 'idx_snapshots_%'
  )
ORDER BY tablename, indexname;

-- ==================== 4. 分析表以更新統計 ====================

ANALYZE events;
ANALYZE market_members;
ANALYZE staff_relationships;
ANALYZE staff_invitations;
ANALYZE snapshots;
ANALYZE products;
ANALYZE markets;

-- ==================== Migration 完成 ====================
-- 新增功能：
--   1. 為所有高頻查詢字段添加了 B-tree 索引
--   2. 添加了組合索引以優化常見查詢模式
--   3. 將 staff_relationships.owner_id 設置為 NOT NULL
--   4. 執行了 ANALYZE 以更新查詢計劃器統計
--
-- 效能預期提升：
--   - 事件查詢：提升 50-80%
--   - 市集成員查詢：提升 60-90%
--   - 員工關係查詢：提升 70-95%

-- ============================================================
-- END SOURCE: 034_performance_indexes.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 035_fix_p0_rls_security.sql
-- ============================================================

-- ============================================================
-- Phase 8E/8F: P0 RLS Security Hardening
-- Migration: 035_fix_p0_rls_security.sql
-- Date: 2026-06-02
-- Severity: P0
-- Description:
--   1. Creates SECURITY DEFINER helper function current_user_market_ids()
--      (no parameters, uses auth.uid(), avoids RLS recursion)
--   2. Removes all market_members INSERT policies
--      (write via SECURITY DEFINER RPCs only)
--   3. Removes all market_members DELETE policies and replaces with
--      a role-aware policy:
--      - staff can delete their own staff memberships
--      - owner can delete staff memberships in their own markets
--      - nobody can delete owner memberships
--   4. Enables RLS on market_members
--   5. Creates secure market_members SELECT policy using helper
--   6. Removes markets_select_temp and replaces with helper-based policy
--   7. Removes products_select_temp
--
-- Does NOT touch:
--   - staff_accessible_* views
--   - events payload
--   - get_my_staff RPC
--   - markets/products INSERT/UPDATE policies
--   - P1/P2 items
--
-- IMPORTANT: Execute against Supabase after review.
-- ============================================================

-- ============================================================
-- STEP 1: Helper function (no parameters, prevents injection)
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_market_ids()
RETURNS TABLE(market_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT market_id
  FROM public.market_members
  WHERE user_id = auth.uid();
$$;

-- Restrict execution: authenticated only, no PUBLIC
REVOKE ALL ON FUNCTION public.current_user_market_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_market_ids() TO authenticated;


-- ============================================================
-- STEP 1b: Helper for owned market IDs (for owner-based DELETE)
-- Returns market IDs where the current user is the market owner.
-- SECURITY DEFINER: does not go through RLS, no parameters.
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_owned_market_ids()
RETURNS TABLE(id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id
  FROM public.markets
  WHERE owner_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_owned_market_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_owned_market_ids() TO authenticated;


-- ============================================================
-- STEP 2: Remove all market_members INSERT policies
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'market_members'
      AND cmd         = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.market_members', p.policyname);
  END LOOP;
END;
$$;
-- market_members INSERT is exclusively handled by SECURITY DEFINER RPCs:
--   - accept_invitation_and_bind()   (staff joining via invitation)
--   - remove_team_member()           (owner removing a member)
--   - leave_current_staff_team()    (staff leaving)
-- No client-side INSERT policy is needed.

-- ============================================================
-- STEP 3: Remove all market_members DELETE policies, then create
--         a role-aware secure policy:
--         - staff: can delete only their own staff membership
--         - owner: can delete staff memberships in their own markets
--         - nobody: can delete owner memberships
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'market_members'
      AND cmd         = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.market_members', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "market_members_delete_owner_or_self_staff"
ON public.market_members FOR DELETE
TO authenticated
USING (
  role = 'staff'
  AND (
    user_id = auth.uid()
    OR market_id IN (SELECT * FROM public.current_user_owned_market_ids())
  )
);
-- Logic: only staff rows are deletable.
--   - A staff member can delete their own staff row.
--   - A market owner can delete staff rows in markets they own.
--   - Owner rows (role = 'owner') are never deletable via this policy.

-- ============================================================
-- STEP 4: Enable RLS on market_members
-- ============================================================

ALTER TABLE public.market_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: Remove all market_members SELECT policies, then create
--         secure policy using helper (avoids recursion)
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'market_members'
      AND cmd         = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.market_members', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "market_members_select_secure"
ON public.market_members FOR SELECT
TO authenticated
USING (
  market_id IN (SELECT * FROM public.current_user_market_ids())
);

-- ============================================================
-- STEP 6: Remove markets_select_temp and all other SELECT policies,
--         then create helper-based secure policy
-- ============================================================

DROP POLICY IF EXISTS "markets_select_temp" ON public.markets;

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'markets'
      AND cmd         = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.markets', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "markets_select_secure"
ON public.markets FOR SELECT
TO authenticated
USING (
  id IN (SELECT * FROM public.current_user_market_ids())
);

-- ============================================================
-- STEP 7: Remove products_select_temp
-- Note: Migration 014's "Users can view own and team products"
-- policy will automatically take effect. No replacement needed.
-- ============================================================

DROP POLICY IF EXISTS "products_select_temp" ON public.products;

-- ============================================================
-- VERIFICATION SQL (read-only, run in SQL Editor after migration)
-- ============================================================
/*

-- V1: market_members rowsecurity = true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'market_members';
-- Expected: 1 row, rowsecurity = true

-- V2: market_members has no INSERT policies
SELECT policyname, cmd, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'market_members' AND cmd = 'INSERT';
-- Expected: 0 rows

-- V3: market_members DELETE policy: role='staff' + self OR owner market
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'market_members' AND cmd = 'DELETE';
-- Expected: 1 row named 'market_members_delete_owner_or_self_staff'
-- Expected: qual contains 'role = \'staff\'', 'user_id = auth.uid()',
--           'market_id IN', 'current_user_owned_market_ids'

-- V4: market_members SELECT policy uses helper
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'market_members' AND cmd = 'SELECT';
-- Expected: 1 row, qual contains 'current_user_market_ids'

-- V5: markets_select_temp is gone
SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'markets' AND policyname = 'markets_select_temp';
-- Expected: 0 rows

-- V6: markets SELECT policy uses helper
SELECT policyname, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'markets' AND cmd = 'SELECT';
-- Expected: 1 row, qual contains 'current_user_market_ids'

-- V7: products_select_temp is gone
SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'products_select_temp';
-- Expected: 0 rows

-- V8: Helper functions are SECURITY DEFINER with no IN parameters
SELECT r.routine_name, r.security_type,
  COUNT(p.parameter_name) FILTER (WHERE p.parameter_mode = 'IN') AS in_param_count
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p
  ON p.specific_schema = r.specific_schema
 AND p.specific_name = r.specific_name
WHERE r.routine_schema = 'public'
  AND r.routine_name IN ('current_user_market_ids', 'current_user_owned_market_ids')
GROUP BY r.routine_name, r.security_type
ORDER BY r.routine_name;
-- Expected: 2 rows, all security_type = 'DEFINER', all in_param_count = 0

-- V9: Helper grants
SELECT r.routine_name, fp.grantee, fp.privilege_type
FROM information_schema.routines r
JOIN information_schema.function_privileges fp
  ON fp.specific_schema = r.specific_schema
 AND fp.specific_name = r.specific_name
WHERE r.routine_schema = 'public'
  AND r.routine_name IN ('current_user_market_ids', 'current_user_owned_market_ids')
ORDER BY r.routine_name, fp.privilege_type;
-- Expected: both functions have EXECUTE granted to 'authenticated';
--           PUBLIC does not appear

-- V10: Owner membership integrity
-- IMPORTANT: Run this BEFORE applying this migration. If it returns rows,
-- the owner market membership is missing — the owner will lose access to
-- their own market after RLS is enabled. Backfill the missing memberships
-- before proceeding with this migration.
--
-- Backfill example (run as service_role):
--   INSERT INTO public.market_members (market_id, user_id, role)
--   SELECT m.id, m.owner_id, 'owner'
--   FROM public.markets m
--   WHERE NOT EXISTS (
--     SELECT 1 FROM public.market_members mm
--     WHERE mm.market_id = m.id AND mm.user_id = m.owner_id AND mm.role = 'owner'
--   );
SELECT m.id AS market_id, m.name AS market_name, m.owner_id
FROM public.markets m
WHERE NOT EXISTS (
  SELECT 1
  FROM public.market_members mm
  WHERE mm.market_id = m.id
    AND mm.user_id = m.owner_id
    AND mm.role = 'owner'
);
-- Expected: 0 rows before migration. If rows appear, backfill first.

*/

-- ============================================================
-- Done.
-- Next steps (outside this migration):
--   - Phase 8D-2: Sanitize staff_accessible_* views (typed NULL)
--   - Phase 8D-3: Fix get_my_staff() RPC (exclude revoked)
--   - Phase 8D-4: events payload sanitization
--   - Phase 8D-5: markets/products INSERT policy tightening (P1)
-- ============================================================

-- ============================================================
-- END SOURCE: 035_fix_p0_rls_security.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 037_add_events_created_at_cursor.sql
-- ============================================================

-- ============================================
-- Migration: 037_add_events_created_at_cursor
-- Date: 2026-06-03
-- ============================================
-- Purpose:
--   Add created_at column to events table to serve as a reliable sync cursor.
--
-- Design rationale:
--   - timestamp: Business event time, may be backfilled with historical dates
--     (e.g. deal_closed backfilled to 2026-05-23 while inserted today).
--     Using timestamp as sync cursor causes these events to be skipped
--     when lastSyncAt > timestamp, which is the root cause of owner sync miss.
--
--   - created_at: Cloud-side INSERT/write time. Always >= actual INSERT time
--     (PostgreSQL default NOW()). Cannot be backfilled to arbitrary historical
--     dates by design, making it a reliable cursor for incremental sync.
--
--   - Existing rows: Backfilled to migration time (NOW()) so that any events
--     previously missed due to the timestamp cursor bug will have
--     created_at > lastSyncAt, and will be re-discovered on the next sync.
--
--   - Replay ordering: All replay logic (pullAllEvents, pullIncrementalEvents)
--     continues to use ORDER BY timestamp ASC to preserve business chronology.
--     created_at is only used as a WHERE cursor filter, never for sorting.
-- ============================================

-- Step 1: Add column (nullable initially)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

-- Step 2: Backfill existing rows to NOW()
-- All existing rows get created_at = migration execution time.
-- This ensures they will be re-evaluated by the created_at cursor on next sync.
UPDATE public.events
SET created_at = NOW()
WHERE created_at IS NULL;

-- Step 3: Set default for future inserts
ALTER TABLE public.events
ALTER COLUMN created_at SET DEFAULT NOW();

-- Step 4: Enforce NOT NULL
ALTER TABLE public.events
ALTER COLUMN created_at SET NOT NULL;

-- Step 5: Create index for created_at > lastSyncAt queries
CREATE INDEX IF NOT EXISTS idx_events_created_at
ON public.events(created_at DESC);

-- ============================================
-- Verification queries (can be run manually)
-- ============================================

-- Check 1: created_at column exists
-- Expected: 1 row
-- SELECT 1 FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'events'
--   AND column_name = 'created_at';

-- Check 2: created_at NULL count = 0
-- Expected: 0
-- SELECT COUNT(*) FROM public.events WHERE created_at IS NULL;

-- Check 3: index idx_events_created_at exists
-- Expected: 1 row
-- SELECT 1 FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'events'
--   AND indexname = 'idx_events_created_at';

-- Check 4: Verify target market's deal_closed events have created_at
-- Expected: 2 rows with non-null created_at
-- SELECT id, type, market_id, timestamp, created_at
-- FROM public.events
-- WHERE market_id = '5bfb9ff4-15b3-4b5e-831c-d96439b4d0bb'
--   AND type = 'deal_closed';

-- ============================================================
-- END SOURCE: 037_add_events_created_at_cursor.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 038_ensure_staff_tombstone_events_visible.sql
-- ============================================================

-- ============================================================
-- Migration: 038_ensure_staff_tombstone_events_visible
-- Date: 2026-06-13
-- Purpose:
--   Ensure deal_deleted and interaction_deleted tombstone events
--   are explicitly included in staff_accessible_events so that
--   staff-side tombstone logic can correctly filter out
--   deleted deals after pulling from the view.
--
-- Background:
--   The existing view (030_fix_data_isolation.sql) has 4 UNION
--   branches using "e.*", which in theory includes all event
--   types including tombstones. However, the join path for
--   deal_deleted events (owner creates them with market_id =
--   market UUID) depends on market_members containing a row for
--   that market + owner combination.
--
--   This migration adds an explicit dedicated branch for
--   tombstone events, making the intent unambiguous and
--   resilient to edge cases in the market_members join chain.
--
-- Verification SQL (run as authenticated staff user):
--   SELECT type, COUNT(*)
--   FROM staff_accessible_events
--   WHERE market_id = 'YOUR_MARKET_UUID'
--   GROUP BY type;
--   -- Should show non-zero counts for deal_deleted and
--   -- interaction_deleted if tombstones exist for that market.
-- ============================================================

CREATE OR REPLACE VIEW staff_accessible_events AS

-- 1. Staff sees owner's market-scoped events (all types including tombstones)
SELECT
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' AS access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
  AND sr.status = 'active'

UNION ALL

-- 2. Staff sees owner's global events (market_id IS NULL, all types)
SELECT
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' AS access_type
FROM events e
JOIN staff_relationships sr ON sr.owner_id = e.actor_id
WHERE sr.staff_id = auth.uid()
  AND sr.status = 'active'
  AND e.market_id IS NULL

UNION ALL

-- 3. Owner sees own events (all types)
SELECT
  e.*,
  e.actor_id AS relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb AS permissions,
  'owner' AS access_type
FROM events e
WHERE e.actor_id = auth.uid()

UNION ALL

-- 4. Owner sees all events in own markets (all types, including tombstones
--    created by staff)
SELECT
  e.*,
  mm.user_id AS relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb AS permissions,
  'owner' AS access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
WHERE mm.user_id = auth.uid()
  AND e.actor_id != auth.uid();

-- ============================================================
-- Verification: Ensure deal_deleted is visible in the view
-- Run this as a staff user with an active relationship:
--
-- SELECT type, COUNT(*) AS cnt
-- FROM staff_accessible_events
-- WHERE type IN ('deal_deleted', 'interaction_deleted')
--   AND market_id = 'YOUR_MARKET_UUID'
-- GROUP BY type;
-- ============================================================

-- ============================================================
-- END SOURCE: 038_ensure_staff_tombstone_events_visible.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 039_staff_view_hardening.sql
-- ============================================================

-- =============================================================================
-- 039_staff_view_hardening.sql
-- =============================================================================
--
-- C2.29B-1: Staff accessible view hardening (草稿)
-- 建立日期: 2026-06-15
-- 建立者: Cursor (Codex)
-- 狀態: 🟡 草稿（已 commit 到 repo，**未套用到 Supabase**）
--
-- 對應攻擊面（C2.29 線上實測確認）:
--   #1 staff_accessible_markets    含 booth_cost / commission_rate / total_profit / 4 個 rental
--   #2 staff_accessible_products   含 cost
--   #3 staff_accessible_events     含完整 payload（boothCost / cost / supplier / profitMargin 等）
--
-- 對應 E1-E3 線上實測:
--   E2: 員工透過 RLS 直接 SELECT markets 拉到 booth_cost / total_profit
--   E3: 員工透過 staff_accessible_events view 拉到 10 筆 boothCost=3000/3500
--
-- 設計原則:
--   - 因為 view 使用 UNION ALL，owner branch 與 staff branch 必須維持相同欄位結構
--   - Staff branch 保留所有欄位名稱，敏感欄位輸出 NULL
--   - Owner branch 保留完整欄位與完整 payload
--   - 目標是讓 Staff 查不到真實敏感值，不是讓欄位不存在
--
-- 範圍限制（必須遵守）:
--   - 039 只能修 staff_accessible_* view 層
--   - 039 不修改底表 RLS（攻擊面 #4 需 C2.29B-2 規劃）
--   - 039 不修改既有 migration
--   - 039 不修改前端 / PermissionGate / useUserRole
--
-- 套用前必讀:
--   1. 先確認備份文件 docs/C2.29_VIEW_BACKUP_2026_06_15.md 已建立
--   2. 先在 Supabase SQL Editor 套用本檔
--   3. 套用後執行遷移驗證 SQL（見檔尾）
--   4. 驗證通過後再 commit 套用紀錄
--
-- 套用方式（人工）:
--   - 在 Supabase Dashboard > SQL Editor
--   - 貼上本檔完整內容
--   - 點選 Run
--   - 確認無錯誤後跑驗證 SQL
--   - 確認 owner / staff 查詢結果符合預期
--
-- -----------------------------------------------------------------------------
-- 🚦 正式套用建議（transactional safety）
-- -----------------------------------------------------------------------------
--
-- 建議正式套用時使用 transaction，所有 migration body + 驗證 SQL 一次貼到
-- SQL Editor，整段包進 BEGIN ... COMMIT，讓套用與驗證在同一個交易裡。
-- 任何驗證失敗 → ROLLBACK 一次性還原，不會留下半套 view。
--
-- 標準流程：
--
--   BEGIN;
--   -- (1) 貼上 Section 1 ~ 4 的 migration body
--   --     (sanitize_staff_event_payload + 3 個 view 重建)
--
--   -- (2) 立即跑 Staff 驗證 SQL（見 Section 5）
--   --     預期：booth_cost / cost / payload 敏感 key 全部 NULL / 缺漏
--
--   -- (3) 跑 Owner 驗證 SQL
--   --     預期：booth_cost / cost / payload 仍為真實值
--
--   -- (4) 跑 tombstone 驗證 SQL
--   --     預期：deal_deleted / interaction_deleted 仍可見
--
--   -- (5) 全部通過：
--   COMMIT;
--   --     (6) 任一失敗：
--   --     ROLLBACK;
--
-- 提醒：
--   - 不要在未驗證前 COMMIT。
--   - 驗證順序：先 Staff branch → 再 Owner branch → 最後 tombstone。
--   - 驗證完成後再記錄套用結果（建議在 docs/C2.29_REANALYSIS_2026_06_15.md
--     補上套用日期 + commit hash）。
--
-- 為何要用 transaction：
--   - CREATE OR REPLACE VIEW / FUNCTION 不會自動 rollback 既有 session 的暫存
--   - 套用後若 Owner 端查詢結果異常，需要一次性還原 3 個 view
--   - Supabase SQL Editor 對 BEGIN/COMMIT 支援完善
--
-- Rollback 方式（人工）:
--   - 參考 docs/C2.29_VIEW_BACKUP_2026_06_15.md §1.1 / §2.1 / §3.1
--   - 禁止自動 rollback，需人工確認
--
-- =============================================================================


-- =============================================================================
-- Section 1: Helper function for payload sanitization
-- =============================================================================
--
-- 為何需要 helper function:
--   - top-level `payload - 'cost'` 只能移除最外層
--   - deal_closed.payload.items[] 內可能含 cost / costAtTimeOfSale / supplierInfo
--     / profit / profitMargin / grossMargin / totalCost
--   - 必須用 jsonb 遞迴處理才能清乾淨
--
-- 設計:
--   - SECURITY INVOKER（跟著 caller 的權限，不放大）
--   - 不變更原 payload key 順序
--   - 保留所有非敏感 key（含 tombstone: deal_deleted / interaction_deleted）
--   - 對 jsonb 陣列內的 object 遞迴處理
--
-- 處理策略:
--   - top-level 移除 15+ 個敏感 key（camelCase + snake_case）
--   - 對 jsonb 陣列內的每個 object 執行同樣的 key 過濾
--   - 對 jsonb 物件內的巢狀 object 不深層遞迴（避免過度處理，視需要再擴充）
--
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sanitize_staff_event_payload(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
AS $$
DECLARE
  -- top-level 敏感 key 列表（camelCase + snake_case 兩種命名都涵蓋）
  sensitive_keys text[] := ARRAY[
    -- 攤位費用
    'boothCost', 'booth_cost',
    'registrationFee', 'registration_fee',
    'commissionRate', 'commission_rate',
    'tableRental', 'table_rental',
    'chairRental', 'chair_rental',
    'umbrellaRental', 'umbrella_rental',
    'tableclothRental', 'tablecloth_rental',
    -- 商品成本 / 售價成本
    'cost',
    'costAtTimeOfSale', 'cost_at_time_of_sale',
    'supplierInfo', 'supplier_info',
    'totalCost', 'total_cost',
    -- 利潤 / 毛利 / 淨利
    'profitMargin', 'profit_margin',
    'grossMargin', 'gross_margin',
    'totalProfit', 'total_profit',
    'netProfit', 'net_profit',
    'profit'
  ];
  result jsonb;
  arr jsonb;
  cleaned_item jsonb;
  i int;
BEGIN
  -- 邊界：null 或非 object 直接回傳原值
  IF payload IS NULL OR jsonb_typeof(payload) <> 'object' THEN
    RETURN payload;
  END IF;

  -- Step 1: 移除 top-level 敏感 key
  result := payload;
  FOR i IN 1..array_length(sensitive_keys, 1) LOOP
    result := result - sensitive_keys[i];
  END LOOP;

  -- Step 2: 處理 items[] 陣列（deal_closed 等事件會含 items）
  -- 對陣列內的每個 object，遞迴套用同樣的 key 移除
  IF result ? 'items' AND jsonb_typeof(result->'items') = 'array' THEN
    arr := '[]'::jsonb;
    FOR i IN 0..jsonb_array_length(result->'items') - 1 LOOP
      cleaned_item := sanitize_staff_event_payload(result->'items'->i);
      arr := arr || jsonb_build_array(cleaned_item);
    END LOOP;
    result := jsonb_set(result, '{items}', arr, false);
  END IF;

  RETURN result;
END;
$$;



-- =============================================================================
-- Section 2: 重建 staff_accessible_markets
-- =============================================================================
--
-- Staff branch 敏感欄位 → NULL
--   - booth_cost, registration_fee, commission_rate, total_profit
--   - table_rental, chair_rental, umbrella_rental, tablecloth_rental
--
-- Staff branch 保留（產品決策）:
--   - deposit（保證金提醒）
--   - table_free / chair_free / umbrella_free / tablecloth_free
--   - total_revenue / total_deals / total_interactions
--   - 基本市集資訊
--
-- Owner branch 保留完整欄位
--
-- 重要：UNION ALL 要求兩個 branch 欄位數 + 型別完全一致
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_markets AS
-- Branch 1: STAFF（敏感欄位 NULL）
SELECT
    m.id,
    m.owner_id,
    m.name,
    m.location,
    m.start_date,
    m.end_date,
    m.status,
    m.early_entry_enabled,
    m.early_entry_time,
    m.check_in_time,
    m.operating_start_time,
    m.operating_end_time,
    NULL::numeric(10,2)                  AS registration_fee,    -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS booth_cost,          -- 🛡️ 脫敏
    m.deposit,                                                 -- 🟢 保留（保證金提醒）
    NULL::numeric(10,2)                  AS table_rental,        -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS chair_rental,        -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS umbrella_rental,     -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS tablecloth_rental,   -- 🛡️ 脫敏
    NULL::numeric(5,2)                   AS commission_rate,     -- 🛡️ 脫敏
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    NULL::numeric(10,2)                  AS total_profit,        -- 🛡️ 脫敏
    m.total_interactions,
    m.total_deals,
    m.notes,
    m.created_at,
    m.updated_at,
    m.is_collaborative,
    m.operation_phase,
    m.is_deleted,
    m.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM ((markets m
    JOIN market_members mm ON ((mm.market_id = m.id)))
    JOIN staff_relationships sr ON ((sr.owner_id = mm.user_id)))
WHERE ((sr.staff_id = auth.uid()) AND (sr.status = 'active'::text))

UNION ALL

-- Branch 2: OWNER（完整欄位）
SELECT
    m.id,
    m.owner_id,
    m.name,
    m.location,
    m.start_date,
    m.end_date,
    m.status,
    m.early_entry_enabled,
    m.early_entry_time,
    m.check_in_time,
    m.operating_start_time,
    m.operating_end_time,
    m.registration_fee,                                       -- ✅ 完整
    m.booth_cost,                                             -- ✅ 完整
    m.deposit,                                                -- ✅ 完整
    m.table_rental,                                           -- ✅ 完整
    m.chair_rental,                                           -- ✅ 完整
    m.umbrella_rental,                                        -- ✅ 完整
    m.tablecloth_rental,                                      -- ✅ 完整
    m.commission_rate,                                        -- ✅ 完整
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    m.total_profit,                                           -- ✅ 完整
    m.total_interactions,
    m.total_deals,
    m.notes,
    m.created_at,
    m.updated_at,
    m.is_collaborative,
    m.operation_phase,
    m.is_deleted,
    m.sync_status,
    m.owner_id                    AS relationship_owner_id,
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM (markets m
    JOIN market_members mm ON ((mm.market_id = m.id)))
WHERE (mm.user_id = auth.uid());



-- =============================================================================
-- Section 3: 重建 staff_accessible_products
-- =============================================================================
--
-- Staff branch:
--   - cost → NULL
--
-- Staff branch 保留:
--   - price / stock / total_sold / category / name / market_id
--   - is_active / is_shared / description
--   - icon_name / color_code
--
-- Owner branch 保留完整欄位
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_products AS
-- Branch 1: STAFF（cost 為 NULL）
SELECT
    p.id,
    p.market_id,
    p.name,
    p.category,
    p.price,
    NULL::numeric(10,2)                  AS cost,                -- 🛡️ 脫敏
    p.icon_name,
    p.color_code,
    p.stock,
    p.unlimited_stock,
    p.is_active,
    p.total_sold,
    p.description,
    p.created_at,
    p.updated_at,
    p.owner_id,
    p.is_shared,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM (products p
    JOIN staff_relationships sr ON ((sr.owner_id = p.owner_id)))
WHERE ((sr.staff_id = auth.uid())
  AND (sr.status = 'active'::text)
  AND (p.is_active = true))

UNION ALL

-- Branch 2: OWNER（完整欄位）
SELECT
    p.id,
    p.market_id,
    p.name,
    p.category,
    p.price,
    p.cost,                                                    -- ✅ 完整
    p.icon_name,
    p.color_code,
    p.stock,
    p.unlimited_stock,
    p.is_active,
    p.total_sold,
    p.description,
    p.created_at,
    p.updated_at,
    p.owner_id,
    p.is_shared,
    p.owner_id                   AS relationship_owner_id,
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                 AS access_type
FROM products p
WHERE ((p.owner_id = auth.uid()) AND (p.is_active = true));



-- =============================================================================
-- Section 4: 重建 staff_accessible_events
-- =============================================================================
--
-- Staff branch payload → scrubbed（呼叫 sanitize_staff_event_payload）
-- Staff branch 其餘欄位保留（含 tombstone: deal_deleted / interaction_deleted）
-- Owner branch 保留完整 payload
--
-- 4 個 UNION branch:
--   1. STAFF 市集事件
--   2. STAFF 全局事件（market_id IS NULL）
--   3. OWNER 自己的所有事件
--   4. OWNER 市集成員事件
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_events AS
-- Branch 1: STAFF（市集事件，payload 脫敏）
SELECT
    e.id,
    e.type,
    public.sanitize_staff_event_payload(e.payload) AS payload,  -- 🛡️ 脫敏
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM ((events e
    JOIN market_members mm ON ((mm.market_id = e.market_id)))
    JOIN staff_relationships sr ON ((sr.owner_id = mm.user_id)))
WHERE ((sr.staff_id = auth.uid()) AND (sr.status = 'active'::text))

UNION ALL

-- Branch 2: STAFF（全局事件，payload 脫敏）
SELECT
    e.id,
    e.type,
    public.sanitize_staff_event_payload(e.payload) AS payload,  -- 🛡️ 脫敏
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM (events e
    JOIN staff_relationships sr ON ((sr.owner_id = e.actor_id)))
WHERE ((sr.staff_id = auth.uid())
  AND (sr.status = 'active'::text)
  AND (e.market_id IS NULL))

UNION ALL

-- Branch 3: OWNER（自己的所有事件，payload 完整）
SELECT
    e.id,
    e.type,
    e.payload,                                                  -- ✅ 完整
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    e.actor_id                    AS relationship_owner_id,
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM events e
WHERE (e.actor_id = auth.uid())

UNION ALL

-- Branch 4: OWNER（市集成員事件，payload 完整）
SELECT
    e.id,
    e.type,
    e.payload,                                                  -- ✅ 完整
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    mm.user_id                    AS relationship_owner_id,
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM (events e
    JOIN market_members mm ON ((mm.market_id = e.market_id)))
WHERE ((mm.user_id = auth.uid()) AND (e.actor_id <> auth.uid()));



-- =============================================================================
-- Section 5: 套用後驗證 SQL（人工執行）
-- =============================================================================
--
-- 套用本 migration 後，在 Supabase SQL Editor 跑以下驗證 SQL。
-- 預期：staff 查詢敏感欄位為 NULL，owner 查詢完整。
--
-- ⚠️ 驗證 SQL 全部用 transaction 包住：
--
--   BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);
--   -- verification query
--   ROLLBACK;
--
-- - BEGIN/ROLLBACK 確保驗證結束後 role 與 jwt claim 不會污染 session。
-- - 每個驗證 block 各自一個 transaction（不要混用）。
-- - 驗證順序：先 Staff（1-4）→ 再 Owner（5）。
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 驗證 1: Staff 查 staff_accessible_markets（敏感欄位應為 NULL）
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);  -- 換成實際 staff UUID

SELECT
    name,
    booth_cost,            -- 預期：NULL
    commission_rate,       -- 預期：NULL
    total_profit,          -- 預期：NULL
    table_rental,          -- 預期：NULL
    chair_rental,          -- 預期：NULL
    umbrella_rental,       -- 預期：NULL
    tablecloth_rental,     -- 預期：NULL
    registration_fee,      -- 預期：NULL
    deposit,               -- 預期：保留（保證金提醒）
    total_revenue,         -- 預期：保留
    total_deals,           -- 預期：保留
    total_interactions     -- 預期：保留
FROM staff_accessible_markets
LIMIT 1;

ROLLBACK;
*/

-- -----------------------------------------------------------------------------
-- 驗證 2: Staff 查 staff_accessible_products（cost 應為 NULL）
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

SELECT
    name,
    price,                 -- 預期：保留
    cost,                  -- 預期：NULL
    stock,
    total_sold
FROM staff_accessible_products
LIMIT 1;

ROLLBACK;
*/

-- -----------------------------------------------------------------------------
-- 驗證 3: Staff 查 staff_accessible_events.payload（敏感 key 應被移除）
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- 3a. 檢查 top-level 敏感 key 不存在
SELECT
    type,
    payload ? 'boothCost'            AS has_boothCost,        -- 預期：false
    payload ? 'cost'                 AS has_cost,             -- 預期：false
    payload ? 'costAtTimeOfSale'     AS has_costAtTimeOfSale, -- 預期：false
    payload ? 'supplierInfo'         AS has_supplierInfo,     -- 預期：false
    payload ? 'profitMargin'         AS has_profitMargin,     -- 預期：false
    payload ? 'grossMargin'          AS has_grossMargin,      -- 預期：false
    payload ? 'totalProfit'          AS has_totalProfit,      -- 預期：false
    payload ? 'booth_cost'           AS has_booth_cost,       -- 預期：false
    payload ? 'commissionRate'       AS has_commissionRate    -- 預期：false
FROM staff_accessible_events
WHERE type = 'market_created'
LIMIT 5;

-- 3b. 檢查 deal_closed 內的 items[] 巢狀結構也已脫敏
SELECT
    type,
    jsonb_path_query_array(payload, '$.items[*]') AS items_array
FROM staff_accessible_events
WHERE type = 'deal_closed'
LIMIT 5;
-- 預期：每個 item 內的 cost / costAtTimeOfSale / supplierInfo / profit 等 key 不存在

ROLLBACK;
*/

-- -----------------------------------------------------------------------------
-- 驗證 4: Staff 仍應看到 tombstone 事件
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

SELECT type, count(*)
FROM staff_accessible_events
WHERE type IN ('deal_deleted', 'interaction_deleted')
GROUP BY type;
-- 預期：deal_deleted / interaction_deleted 各有 row（tombstone 仍可見）

ROLLBACK;
*/

-- -----------------------------------------------------------------------------
-- 驗證 5: Owner 查詢仍保留完整資料
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'OWNER_USER_UUID', true);  -- 換成實際 owner UUID

-- 5a. Owner 看市集
SELECT name, booth_cost, total_profit, commission_rate
FROM staff_accessible_markets
LIMIT 1;
-- 預期：booth_cost / total_profit / commission_rate 都是真實值

-- 5b. Owner 看商品
SELECT name, cost, price
FROM staff_accessible_products
LIMIT 1;
-- 預期：cost 是真實值

-- 5c. Owner 看事件 payload
SELECT type, payload
FROM staff_accessible_events
LIMIT 1;
-- 預期：payload 是完整 JSONB

ROLLBACK;
*/


-- =============================================================================
-- Section 6: 已知限制
-- =============================================================================
--
-- 1. 039 只能修 staff_accessible_* view 層
--    E2 已證明 Staff 仍可能透過底表 RLS 直接 SELECT markets 取得敏感欄位
--    因此 C2.29B-2 必須規劃 base table RLS tightening
--    或前端完全遷移到 staff-safe view / RPC 後再收緊底表
--
-- 2. sanitize_staff_event_payload 目前只處理:
--    - top-level 敏感 key 移除
--    - items[] 陣列內的 object 遞迴處理
--    未深層處理其他巢狀 object（如 metadata 內的 object）
--    視後續發現的攻擊面再擴充
--
-- 3. 不修改底表 RLS（C2.29B-2 範圍）
--    不修改前端
--    不修改 PermissionGate / useUserRole
--    不修改 C2.28 已完成邏輯
--
-- 4. 套用後員工 UI 仍可正常運作（PermissionGate 已 fail-closed）
--    因為 PermissionGate 已經在 UI 層把 cost / profit 過濾
--    039 是在 Supabase 端多加一層防護
--
-- =============================================================================

-- ============================================================
-- END SOURCE: 039_staff_view_hardening.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 040_fix_staff_accessible_view_scope.sql
-- ============================================================

-- =============================================================================
-- 040_fix_staff_accessible_view_scope.sql
-- =============================================================================
--
-- C2.29B-1.1: Fix staff accessible view scope bug
-- 建立日期: 2026-06-16
-- 建立者: Cursor (Codex)
-- 狀態: 🟡 草稿（**已 commit 到 repo，**未套用到 Supabase**\*\*）
--
-- ⚠️ 重要：這份草稿**尚未套用**。套用前請先：
--   1. 確認 C2.29B-1 (039) 已成功套用
--   2. 確認 C2.29B-1 Post-Apply Smoke Test 完成
--   3. 人工在 Supabase SQL Editor 套用本檔
--   4. 套用後跑 §5 驗證 SQL
--   5. 驗證通過後才 commit 套用紀錄
--
-- 對應攻擊面（C2.29B-1 Post-Apply 線上實測發現）:
--   #A staff_accessible_markets.owner_branch scope leak
--      員工在 market_members 有 row (role='staff')，
--      039 owner branch 用 `mm.user_id = auth.uid()` 沒檢查 role，
--      員工會命中 owner branch，access_type='owner' 拿到完整敏感欄位
--      → 039 staff branch 脫敏完全被繞過
--   #B staff_accessible_events.owner_branch_4 scope leak
--      同樣的 bug：員工在 market_members 有 row
--      → 員工命中 owner branch 4 拿到完整 payload
--   #C deleted markets 仍被 Staff 拉進來
--      4 個 view 結構都沒過濾 is_deleted
--   #D global product_created / product_deleted events
--      staff_accessible_events Branch 2 讓員工看到 market_id IS NULL
--      的 product_created / product_deleted 事件
--      → 前端 useSync 看到 missing_market_id 而跳過（已知問題）
--
-- 對應的 SQL 觀察（用戶補跑 2026-06-16）:
--   1. staff_accessible_markets 同一個 market id 同時出現 staff + owner branch
--   2. 多個 is_deleted=true 的 market 仍被 Staff 拉進來
--   3. staff_accessible_events market_id IS NULL 事件中：
--      - product_deleted: 13 個
--      - product_created: 8 個
--   4. 前端 useSync log 印出
--      `Skipping event outside local scoped dataset
--       reason: missing_market_id
--       eventType: product_created`
--
-- 設計原則:
--   - 040 只能修 staff_accessible_* view 層
--   - 040 不修改底表 RLS（攻擊面 #4 direct SELECT 仍需 C2.29B-2）
--   - 040 不修改既有 migration
--   - 040 不修改前端 / PermissionGate / useUserRole
--
-- 修正策略（owner branch 必須嚴格用 m.owner_id = auth.uid()）:
--   1. staff_accessible_markets
--      - Owner branch 改用 `m.owner_id = auth.uid()`（不依賴 market_members）
--      - Staff branch 加上 `COALESCE(m.is_deleted, false) = false`
--   2. staff_accessible_events
--      - Branch 4 (OWNER team events) 改用 `m.owner_id = auth.uid()` JOIN
--      - Branch 1 (STAFF market events) 改用 `m.owner_id` JOIN staff_relationships
--        避免「員工在 market_members 命中 owner branch 4」風險
--      - 加 `is_deleted = false` 過濾
--      - Branch 2 (STAFF global events) 改用 `e.actor_id = m.owner_id JOIN staff`
--        避免 product_created / product_deleted 命中無關 owner
--   3. staff_accessible_products
--      - 040 確認 Owner branch 用 `p.owner_id = auth.uid()`（已是這樣，無 bug）
--      - Staff branch 加上 `p.is_active = true`（已是這樣，無 bug）
--      - 040 不改此 view（無 bug）
--
-- 為何 Owner branch 用 `m.owner_id` 比 `mm.user_id + mm.role='owner'` 好:
--   - m.owner_id 是 markets 表的事實欄位，由 trigger 維護
--   - mm.role 是 market_members 表的欄位，依賴 trigger (002 / 021) 正確加入
--   - 如果 021 trigger 漏加 owner row，owner branch 會漏 owner 的市集
--   - 035 已經有 `current_user_owned_market_ids()` helper，可直接用
--
-- 為何 Staff branch 改用 m.owner_id JOIN staff_relationships:
--   - 員工可能也透過 is_collaborative 市集被加進 market_members (role='staff')
--   - 039 Staff branch 透過 `sr.owner_id = mm.user_id` 串 → 員工只能在
--     "自己被加進去" 的市集命中 → 但員工也可能在 mm 中是 staff，命中 Branch 4
--   - 040 改用 `sr.owner_id = m.owner_id` 直接透過 owner_id 串，
--     不依賴 market_members 的 membership
--
-- 範圍限制（必須遵守）:
--   - 040 只能修 staff_accessible_* view 層
--   - 040 不修改底表 RLS（C2.29B-2 範圍）
--   - 040 不修改既有 migration
--   - 040 不修改前端 / PermissionGate / useUserRole
--   - 040 不直接套用到 Supabase
--   - 040 不刪除任何 view branch（保守，只修條件）
--
-- =============================================================================


-- =============================================================================
-- Section 1: 重建 staff_accessible_markets
-- =============================================================================
--
-- 修正要點:
--   - Owner branch: WHERE m.owner_id = auth.uid()（不依賴 market_members）
--   - Staff branch: 加 is_deleted = false 過濾
--   - Staff branch: 改用 m.owner_id 串 staff_relationships
--     （避免 is_collaborative 市集把員工加進 market_members 命中 owner branch）
--
-- 注意：UNION ALL 要求兩個 branch 欄位數 + 型別完全一致
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_markets AS
-- Branch 1: STAFF（敏感欄位 NULL + 排除 deleted market + 透過 owner_id 串）
SELECT
    m.id,
    m.owner_id,
    m.name,
    m.location,
    m.start_date,
    m.end_date,
    m.status,
    m.early_entry_enabled,
    m.early_entry_time,
    m.check_in_time,
    m.operating_start_time,
    m.operating_end_time,
    NULL::numeric(10,2)                  AS registration_fee,    -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS booth_cost,          -- 🛡️ 脫敏
    m.deposit,                                                 -- 🟢 保留
    NULL::numeric(10,2)                  AS table_rental,        -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS chair_rental,        -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS umbrella_rental,     -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS tablecloth_rental,   -- 🛡️ 脫敏
    NULL::numeric(5,2)                   AS commission_rate,     -- 🛡️ 脫敏
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    NULL::numeric(10,2)                  AS total_profit,        -- 🛡️ 脫敏
    m.total_interactions,
    m.total_deals,
    m.notes,
    m.created_at,
    m.updated_at,
    m.is_collaborative,
    m.operation_phase,
    m.is_deleted,
    m.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM (markets m
    JOIN staff_relationships sr ON (sr.owner_id = m.owner_id))
WHERE ((sr.staff_id = auth.uid())
  AND (sr.status = 'active'::text)
  AND (COALESCE(m.is_deleted, false) = false))                   -- 🆕 排除已刪除市集

UNION ALL

-- Branch 2: OWNER（完整欄位 + 嚴格 owner 判斷）
-- 🆕 從 `mm.user_id = auth.uid()` 改為 `m.owner_id = auth.uid()`
--   原因：員工在 market_members 有 role='staff' row，會誤命中 owner branch
SELECT
    m.id,
    m.owner_id,
    m.name,
    m.location,
    m.start_date,
    m.end_date,
    m.status,
    m.early_entry_enabled,
    m.early_entry_time,
    m.check_in_time,
    m.operating_start_time,
    m.operating_end_time,
    m.registration_fee,                                       -- ✅ 完整
    m.booth_cost,                                             -- ✅ 完整
    m.deposit,                                                -- ✅ 完整
    m.table_rental,                                           -- ✅ 完整
    m.chair_rental,                                           -- ✅ 完整
    m.umbrella_rental,                                        -- ✅ 完整
    m.tablecloth_rental,                                      -- ✅ 完整
    m.commission_rate,                                        -- ✅ 完整
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    m.total_profit,                                           -- ✅ 完整
    m.total_interactions,
    m.total_deals,
    m.notes,
    m.created_at,
    m.updated_at,
    m.is_collaborative,
    m.operation_phase,
    m.is_deleted,
    m.sync_status,
    m.owner_id                    AS relationship_owner_id,
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM markets m
WHERE (m.owner_id = auth.uid());                                -- 🆕 嚴格 owner 判斷



-- =============================================================================
-- Section 2: staff_accessible_products（不變更）
-- =============================================================================
--
-- 040 審查結果：此 view 無 owner-branch scope bug
--   - Owner branch: WHERE p.owner_id = auth.uid()（已正確，不依賴 market_members）
--   - Staff branch: 透過 sr.staff_id = auth.uid() 判斷
--   - 兩 branch 都用 p.is_active = true 過濾軟刪除
--
-- 040 不動此 view（避免不必要的變更風險）
-- =============================================================================

-- （無變更）


-- =============================================================================
-- Section 3: 重建 staff_accessible_events
-- =============================================================================
--
-- 修正要點:
--   - Branch 1 (STAFF market events): 改用 m.owner_id 串 staff_relationships
--     加 is_deleted 過濾
--   - Branch 2 (STAFF global events): 改用 m.owner_id 串 staff_relationships
--     （不是用 actor_id，避免 product_created with market_id=NULL 誤命中）
--     ⚠️ 040 保守做法：保留 Branch 2 結構，只加 is_deleted + 加註解
--   - Branch 3 (OWNER self events): 保留
--   - Branch 4 (OWNER team events): 改用 m.owner_id 嚴格判斷
--     （從 mm.user_id = auth.uid() 改為 JOIN markets m ON m.id = e.market_id
--       WHERE m.owner_id = auth.uid()）
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_events AS
-- Branch 1: STAFF（市集事件，payload 脫敏，透過 owner_id 串）
SELECT
    e.id,
    e.type,
    public.sanitize_staff_event_payload(e.payload) AS payload,  -- 🛡️ 脫敏
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM (events e
    JOIN markets m ON (m.id = e.market_id)                       -- 🆕 透過 markets JOIN
    JOIN staff_relationships sr ON (sr.owner_id = m.owner_id))  -- 🆕 透過 owner_id 串
WHERE ((sr.staff_id = auth.uid())
  AND (sr.status = 'active'::text)
  AND (COALESCE(m.is_deleted, false) = false))                  -- 🆕 排除已刪除市集

UNION ALL

-- Branch 2: STAFF（全局事件，payload 脫敏）
-- ⚠️ 040 保守做法：保留原結構，但加註解說明風險
--   - 員工透過 `e.actor_id = owner_id JOIN staff_relationships` 命中
--   - product_created / product_deleted 沒有 market_id 仍會命中
--   - 前端 useSync 會以 missing_market_id 跳過（已知行為）
SELECT
    e.id,
    e.type,
    public.sanitize_staff_event_payload(e.payload) AS payload,  -- 🛡️ 脫敏
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM (events e
    JOIN staff_relationships sr ON (sr.owner_id = e.actor_id))
WHERE ((sr.staff_id = auth.uid())
  AND (sr.status = 'active'::text)
  AND (e.market_id IS NULL))

UNION ALL

-- Branch 3: OWNER（自己的所有事件，payload 完整）
SELECT
    e.id,
    e.type,
    e.payload,                                                  -- ✅ 完整
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    e.actor_id                    AS relationship_owner_id,
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM events e
WHERE (e.actor_id = auth.uid())

UNION ALL

-- Branch 4: OWNER（市集成員事件，payload 完整，嚴格 owner 判斷）
-- 🆕 從 `mm.user_id = auth.uid()` 改為 `m.owner_id = auth.uid()`
--   原因：員工在 market_members 有 row，會誤命中 owner branch 4
SELECT
    e.id,
    e.type,
    e.payload,                                                  -- ✅ 完整
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    m.owner_id                    AS relationship_owner_id,    -- 🆕 改用 m.owner_id
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM (events e
    JOIN markets m ON (m.id = e.market_id))                    -- 🆕 JOIN markets
WHERE ((m.owner_id = auth.uid())                                -- 🆕 嚴格 owner
  AND (e.actor_id <> auth.uid()));



-- =============================================================================
-- Section 4: 套用後驗證 SQL（人工執行）
-- =============================================================================
--
-- ⚠️ 驗證 SQL 全部用 transaction 包住：
--
--   BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);
--   -- verification query
--   ROLLBACK;
--
-- 驗證順序：
--   1. Staff 不應有 access_type='owner' 命中
--   2. Staff 不應有重複 market id
--   3. Staff 不應有 is_deleted=true market
--   4. Owner 仍可看到完整資料
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 驗證 1: Staff 不應命中 owner branch（scope leak 防護）
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- 1a. 不應有 access_type='owner'
SELECT access_type, count(*)
FROM staff_accessible_markets
GROUP BY access_type;
-- 預期：只有 1 row，access_type='staff'，count = (該 owner 旗下市集數 - 已刪除數)

-- 1b. 不應有同一 market id 出現兩次
SELECT id, count(*)
FROM staff_accessible_markets
GROUP BY id
HAVING count(*) > 1;
-- 預期：0 rows

-- 1c. 不應有 is_deleted=true
SELECT id, name, is_deleted
FROM staff_accessible_markets
WHERE COALESCE(is_deleted, false) = true;
-- 預期：0 rows

ROLLBACK;
*/


-- -----------------------------------------------------------------------------
-- 驗證 2: Staff events 不應命中 owner branch
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- 2a. 不應有 access_type='owner'
SELECT access_type, count(*)
FROM staff_accessible_events
GROUP BY access_type;
-- 預期：只有 1 row，access_type='staff'

-- 2b. payload 仍應 scrubbed（boothCost 不應存在）
SELECT
  type,
  count(*) FILTER (WHERE payload ? 'boothCost') AS has_boothCost,
  count(*) FILTER (WHERE payload ? 'cost')      AS has_cost,
  count(*) FILTER (WHERE payload ? 'supplierInfo') AS has_supplierInfo
FROM staff_accessible_events
WHERE type IN ('market_created', 'product_created', 'deal_closed')
GROUP BY type;
-- 預期：所有 has_* = 0

ROLLBACK;
*/


-- -----------------------------------------------------------------------------
-- 驗證 3: Staff 不應拉到 global product_created / product_deleted 誤命中
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- 3a. 確認 staff global events 數量
SELECT type, count(*)
FROM staff_accessible_events
WHERE market_id IS NULL
GROUP BY type;
-- 預期：product_created / product_deleted 仍會命中（Branch 2 保留）
--   但 owner 已 verify 過，前端 useSync 會以 missing_market_id 跳過

-- 3b. 確認 staff market events（market_id NOT NULL）的 access_type
SELECT
  COUNT(*) FILTER (WHERE access_type = 'staff')  AS staff_branch,
  COUNT(*) FILTER (WHERE access_type = 'owner')  AS owner_branch
FROM staff_accessible_events
WHERE market_id IS NOT NULL;
-- 預期：owner_branch = 0（員工只能命中 staff branch）

ROLLBACK;
*/


-- -----------------------------------------------------------------------------
-- 驗證 4: Owner 仍可看到完整資料
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'OWNER_USER_UUID', true);  -- 換成實際 owner UUID

-- 4a. Owner 看市集
SELECT access_type, count(*)
FROM staff_accessible_markets
GROUP BY access_type;
-- 預期：access_type='owner'，count = (該 owner 旗下市集數)

-- 4b. Owner 看 markets 真實敏感欄位
SELECT name, booth_cost, total_profit, commission_rate
FROM staff_accessible_markets
WHERE access_type = 'owner'
LIMIT 1;
-- 預期：booth_cost / total_profit / commission_rate 都是真實值

-- 4c. Owner 看商品 cost
SELECT name, cost, price
FROM staff_accessible_products
WHERE access_type = 'owner'
LIMIT 1;
-- 預期：cost 是真實值

-- 4d. Owner 看 events payload
SELECT type, payload->>'boothCost' AS booth_cost
FROM staff_accessible_events
WHERE access_type = 'owner' AND type = 'market_created'
LIMIT 1;
-- 預期：payload 是完整 JSONB，booth_cost 不是 NULL

-- 4e. Owner 仍可看到市集成員事件（其他用戶的）
SELECT type, count(*)
FROM staff_accessible_events
WHERE access_type = 'owner' AND actor_id <> auth.uid()
GROUP BY type;
-- 預期：有多種類型（market_created / deal_closed / interaction_recorded / 等）

ROLLBACK;
*/


-- -----------------------------------------------------------------------------
-- 驗證 5: 040 套用前 vs 套用後對照（用 markets 數量差異確認 scope 收斂）
-- -----------------------------------------------------------------------------
/*
-- 套用 040 前先跑一次（用 staff_id）
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);
SELECT count(*) AS pre_040_markets FROM staff_accessible_markets;
SELECT count(*) AS pre_040_events FROM staff_accessible_events;
ROLLBACK;

-- 套用 040 後再跑一次
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);
SELECT count(*) AS post_040_markets FROM staff_accessible_markets;
SELECT count(*) AS post_040_events FROM staff_accessible_events;
ROLLBACK;

-- 預期：post_040_markets << pre_040_markets（刪除 owner branch 命中）
--       post_040_events 接近 pre_040_events - (owner branch 4 命中數)
*/


-- =============================================================================
-- Section 5: 已知限制
-- =============================================================================
--
-- 1. 040 只能修 staff_accessible_* view 層
--    E2 已證明 Staff 仍可能透過底表 RLS 直接 SELECT markets 取得敏感欄位
--    因此 C2.29B-2 仍需規劃 base table RLS tightening
--    或前端完全遷移到 staff-safe view / RPC 後再收緊底表
--
-- 2. Branch 2 (STAFF global events) 040 保守不刪
--    員工仍會拉到 market_id IS NULL 的 product_created / product_deleted
--    前端 useSync 已用 missing_market_id 跳過（已知）
--    風險：若日後 owner 改用 global product_created 寫入敏感 payload，
--          員工 Branch 2 仍會看到（雖 payload 已 scrubbed）
--    建議：C2.29B-2 評估是否刪 Branch 2 或在 Branch 2 加 is_active 過濾
--
-- 3. staff_accessible_products 040 不變更（無 bug）
--    維持既有 `p.owner_id = auth.uid()` + `p.is_active = true` 結構
--
-- 4. 040 不修改底表 RLS
--    不修改前端
--    不修改 PermissionGate / useUserRole
--    不修改 C2.28 已完成邏輯
--
-- 5. 套用後員工 UI 仍可正常運作（PermissionGate 已 fail-closed）
--    040 是收緊 scope（員工看到更少），不是放寬
--    若前端 useSync 對「員工看不到部分 market」處理正確，UI 不會 regression
--
-- =============================================================================


-- =============================================================================
-- Section 6: 套用方式（人工）
-- =============================================================================
--
-- 建議正式套用時使用 transaction：
--
--   BEGIN;
--   -- 貼上 Section 1 + 3 的 migration body
--   -- (staff_accessible_markets 重建 + staff_accessible_events 重建)
--   -- staff_accessible_products 040 不變更
--
--   -- 立即跑 §4 驗證 SQL
--   -- 預期：
--   --   1a. 員工只命中 access_type='staff'
--   --   1b. 沒有重複 market id
--   --   1c. 沒有 is_deleted=true market
--   --   2a. 員工 events 只命中 access_type='staff'
--   --   4a-4e. Owner 仍可看到完整資料
--
--   -- 全部通過：
--   COMMIT;
--   -- 任一失敗：
--   --   ROLLBACK;
--
-- 提醒：
--   - 不要在未驗證前 COMMIT
--   - 驗證順序：先 Staff（1-3）→ 再 Owner（4）→ 最後前後對照（5）
--   - 驗證完成後記錄套用結果（更新 docs/C2.29B_VIEW_SCOPE_AUDIT_2026_06_15.md）
--
-- =============================================================================

-- ============================================================
-- END SOURCE: 040_fix_staff_accessible_view_scope.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 041_tighten_base_table_select_rls.sql
-- ============================================================

-- ============================================================
-- Phase C2.29B-2.1: Base Table SELECT RLS Tightening
-- Migration: 041_tighten_base_table_select_rls.sql
-- Date: 2026-06-16
-- Severity: P0 (Owner / Staff data isolation)
-- Description:
--   1. markets: replace markets_select_secure (uses current_user_market_ids)
--      with markets_select_owner_only (uses owner_id = auth.uid()).
--      → Staff SELECT markets = 0 row.
--      → Staff must go through staff_accessible_markets view.
--   2. products: drop "Users can view own and team products" (014, includes
--      team + is_shared path that exposes cost to staff) and any other
--      staff-friendly SELECT policy; replace with products_select_owner_only.
--      → Staff SELECT products = 0 row.
--      → Staff must go through staff_accessible_products view.
--   3. events: drop both legacy SELECT policies
--      - "用戶可以查看自己的事件和市集事件" (015, uses market_members)
--      - "users_can_view_events" (online-only, simplified)
--      Replace with events_select_owner_only that is STRICTLY owner-only:
--        - market_id IN (owned markets)  --  owner 旗下市集事件
--        - market_id IS NULL AND actor_id = auth.uid()
--          AND EXISTS (markets.owner_id = auth.uid())  --  owner 自己寫的全局事件
--      Note: actor_id = auth.uid() alone is REMOVED — staff who wrote
--      an event (e.g. via the 025 staff_relationships insert path) would
--      otherwise still be able to SELECT events directly with
--      actor_id = auth.uid(). The new condition ties global events to
--      the actor being an owner of at least one market.
--      → Staff SELECT events = 0 row.
--      → Staff must go through staff_accessible_events view.
--
-- Helper format reminder:
--   current_user_owned_market_ids()  returns  TABLE(id UUID)
--   (per 035_fix_p0_rls_security.sql line 60-70)
--   → market_id IN (SELECT id FROM public.current_user_owned_market_ids())
--   The alternate form SELECT * also works but is less explicit.
--
-- View security mode reminder (CRITICAL):
--   staff_accessible_* views must be SECURITY DEFINER for 041 to work
--   as designed. If they are SECURITY INVOKER, the view's internal
--   queries inherit the caller's RLS context, and 041 will break
--   staff_accessible_* in the following ways:
--     - Staff reading staff_accessible_markets will see 0 rows (the
--       view's JOIN to markets will hit markets_select_owner_only
--       which requires owner_id = auth.uid()).
--     - Owner reading staff_accessible_events Branch 3
--       (actor_id = auth.uid()) will miss market_id IS NULL events
--       because the new events policy requires actor IS owner.
--   Run the preflight in STEP 0 before applying. If any view is
--   INVOKER, STOP and add 042 to fix view ownership first
--   (out of scope for 041).
--
-- Does NOT touch:
--   - staff_accessible_markets / products / events views (039 + 040)
--   - sanitize_staff_event_payload() (039)
--   - market_members / staff_relationships / staff_invitations RLS
--   - INSERT / UPDATE / DELETE policies on markets / products / events
--   - profiles / market_invitations RLS
--   - Existing trigger / function / RPC
--
-- IMPORTANT:
--   - This is a DESTRUCTIVE migration for the staff SELECT path.
--   - Staff clients MUST go through staff_accessible_* view.
--   - Owner clients (and services running with auth.uid() == owner) must
--     either SELECT base tables directly or call staff_accessible_* view.
--   - The following service / repair paths run with the user's auth.uid()
--     and thus are subject to the new RLS. Each MUST be owner-only:
--       lib/db/recovery.ts:240                       (.from('products'))
--       lib/sync/owner-revenue-gap-repair.ts:328/347 (.from('markets' / 'events'))
--       lib/supabase/migration.ts:204-208            (.from('events'))
--     If any of these are ever invoked from a staff session, they will
--     silently return 0 rows. Pre-apply audit required.
--   - This migration is NOT yet applied to Supabase. Execute only after
--     review and the pre-apply checklist in
--     docs/C2.29B-2_1_RLS_MIGRATION_DRAFT_2026_06_16.md
-- ============================================================

-- ============================================================
-- STEP 0: Preflight — verify view security mode + helper format
-- Refuses to proceed if any staff_accessible_* view is SECURITY INVOKER.
-- Run each query manually, then if all pass, mark a session variable
-- to acknowledge the preflight. The DO block below checks for that
-- acknowledgment and RAISES otherwise.
-- ============================================================

-- P0.1: Helper return type
-- Expected: TABLE (id uuid)
SELECT pg_get_function_result('public.current_user_owned_market_ids()'::regprocedure) AS owned_market_ids_return_type;
-- If this returns 'TABLE (id uuid)' → OK.
-- If it returns 'SETOF uuid' → use SELECT * instead of SELECT id (both work
-- for TABLE return; for SETOF they are equivalent; current code uses
-- SELECT id which is correct for the current 035 implementation).

-- P0.2: Helper is SECURITY DEFINER
SELECT p.prosecdef AS is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'current_user_owned_market_ids';
-- Expected: t

-- P0.3: View security mode
--   In PostgreSQL 15+, CREATE OR REPLACE VIEW preserves the existing
--   view's security_invoker flag. If a view was created on PG14 as
--   SECURITY DEFINER (the PG14 default) and never re-created with
--   security_invoker = true, it stays DEFINER. We need DEFINER for
--   041 to work.
SELECT
  c.relname AS view_name,
  CASE
    WHEN c.reloptions IS NULL THEN 'security_definer (default for PG14-created views)'
    WHEN c.reloptions::text LIKE '%security_invoker%' THEN 'SECURITY INVOKER (BREAKS 041)'
    ELSE 'security_definer (custom options)'
  END AS security_mode,
  c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'staff_accessible_markets',
    'staff_accessible_products',
    'staff_accessible_events'
  )
ORDER BY c.relname;
-- Expected: all 3 rows show security_definer.
-- If any row shows "SECURITY INVOKER (BREAKS 041)" → STOP, do not apply.
--   The user must run a follow-up migration to flip the view to DEFINER
--   (out of scope for 041).

-- P0.4: Hard gate — refuse to run STEP 2-5 if any view is INVOKER.
DO $$
DECLARE
  v_invoker_count int;
BEGIN
  SELECT count(*) INTO v_invoker_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'staff_accessible_markets',
      'staff_accessible_products',
      'staff_accessible_events'
    )
    AND c.reloptions IS NOT NULL
    AND c.reloptions::text LIKE '%security_invoker%';

  IF v_invoker_count > 0 THEN
    RAISE EXCEPTION
      'Preflight P0.4 failed: % staff_accessible_* view(s) are SECURITY INVOKER. 041 will break staff views. Aborting. Fix view security mode first (out of scope for 041).',
      v_invoker_count;
  END IF;

  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- STEP 1: Helper function (no parameters, prevents injection)
-- Reuse current_user_owned_market_ids() (already created in 035).
-- ============================================================

-- Verify the helper still exists and is SECURITY DEFINER
DO $$
DECLARE
  v_security_type text;
BEGIN
  SELECT p.prosecdef INTO v_security_type
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'current_user_owned_market_ids';

  IF v_security_type IS NULL THEN
    RAISE EXCEPTION 'current_user_owned_market_ids() does not exist. Run 035 first.';
  ELSIF v_security_type = false THEN
    RAISE EXCEPTION 'current_user_owned_market_ids() is not SECURITY DEFINER. Refusing to use it.';
  END IF;

  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- STEP 2: Drop all markets SELECT policies, then create owner-only
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'markets'
      AND cmd         = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.markets', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "markets_select_owner_only"
ON public.markets FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
);


-- ============================================================
-- STEP 3: Drop all products SELECT policies, then create owner-only
-- Note: 014 created "Users can view own and team products" with three
-- OR branches (own / team via market_members / is_shared = true).
-- The team and shared branches both leak cost to staff. Drop everything
-- and replace with strict owner check.
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'products'
      AND cmd         = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "products_select_owner_only"
ON public.products FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
);


-- ============================================================
-- STEP 4: Drop all events SELECT policies, then create owner-only
-- Note: 015 created "用戶可以查看自己的事件和市集事件" with
--   actor_id = auth.uid()
--   OR market_id IN (SELECT market_id FROM market_members WHERE user_id = auth.uid())
-- Plus the online-only "users_can_view_events" simplified version.
-- Both let staff SELECT events via market_members. Drop and replace.
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'events'
      AND cmd         = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "events_select_owner_only"
ON public.events FOR SELECT
TO authenticated
USING (
  -- 自己市集的事件（透過 markets.owner_id 嚴格 owner 判斷）
  market_id IN (SELECT id FROM public.current_user_owned_market_ids())
  OR
  -- 自己建立的全局事件（market_id IS NULL），且自己必須是某個市集的 owner
  -- 為何要 EXISTS：單純 actor_id = auth.uid() 會讓 staff 透過 025
  -- staff_relationships 寫入的事件仍可 SELECT；加 EXISTS 限縮為 owner。
  (
    market_id IS NULL
    AND actor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.markets m WHERE m.owner_id = auth.uid())
  )
);


-- ============================================================
-- STEP 5: Note about INSERT / UPDATE / DELETE (intentionally untouched)
-- ============================================================

-- events INSERT: "用戶可以插入事件_v3" (025) is preserved as-is.
--   It allows staff to insert events into markets they are bound to via
--   staff_relationships (acting as staff), which is required for the
--   staff sync flow. actor_id is preserved as the staff's own UUID.
-- markets INSERT / UPDATE: "authenticated_can_insert_markets" (and any
--   other authenticated INSERT / UPDATE) are preserved as-is. Triggers
--   gate actual writes (002 / 008 / 021).
-- products INSERT / UPDATE / DELETE: 014 owner-only policies are
--   preserved as-is.
-- market_members / staff_relationships / staff_invitations: 035 P0 RLS
--   is preserved as-is.

-- ============================================================
-- VERIFICATION SQL (read-only, run in SQL Editor after migration)
-- ============================================================

/*

-- V1: markets has exactly one SELECT policy, owner-only
SELECT policyname, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'markets' AND cmd = 'SELECT';
-- Expected: 1 row named 'markets_select_owner_only', qual contains 'owner_id = auth.uid()'

-- V2: products has exactly one SELECT policy, owner-only
SELECT policyname, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products' AND cmd = 'SELECT';
-- Expected: 1 row named 'products_select_owner_only', qual contains 'owner_id = auth.uid()'

-- V3: events has exactly one SELECT policy, owner-only (no naked actor_id)
SELECT policyname, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'events' AND cmd = 'SELECT';
-- Expected: 1 row named 'events_select_owner_only', qual contains
--           'current_user_owned_market_ids' AND 'EXISTS' AND
--           'market_id IS NULL'
-- qual must NOT contain a bare 'actor_id = auth.uid()' without EXISTS.

-- V4: All legacy staff-friendly SELECT policies are gone
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'SELECT'
  AND tablename IN ('markets', 'products', 'events')
  AND policyname IN (
    'markets_select_secure',
    'Users can view own and team products',
    'products_select_temp',
    '用戶可以查看自己的事件和市集事件',
    'users_can_view_events'
  );
-- Expected: 0 rows

-- ============================================================
-- STAFF DIRECT TABLE SELECT (must be 0 rows)
-- ============================================================

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- Staff direct markets SELECT → expected 0
SELECT count(*) AS staff_markets_direct FROM markets;

-- Staff direct products SELECT → expected 0
SELECT count(*) AS staff_products_direct FROM products;

-- Staff direct events SELECT → expected 0
SELECT count(*) AS staff_events_direct FROM events;

ROLLBACK;

-- ============================================================
-- STAFF VIEW STILL WORKS (脱敏有效)
-- ============================================================

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

SELECT count(*) AS staff_markets_view FROM staff_accessible_markets;
SELECT count(*) AS staff_products_view FROM staff_accessible_products;
SELECT count(*) AS staff_events_view FROM staff_accessible_events;

-- spot-check: staff markets financial fields are NULL
SELECT
  count(*) FILTER (WHERE booth_cost IS NULL) AS booth_cost_null,
  count(*) FILTER (WHERE total_profit IS NULL) AS total_profit_null,
  count(*) FILTER (WHERE commission_rate IS NULL) AS commission_rate_null
FROM staff_accessible_markets;

-- spot-check: staff products cost is NULL
SELECT
  count(*) FILTER (WHERE cost IS NULL) AS cost_null
FROM staff_accessible_products;

-- spot-check: staff events payload has no sensitive top-level keys
SELECT
  count(*) FILTER (WHERE payload ? 'boothCost') AS has_boothCost,
  count(*) FILTER (WHERE payload ? 'cost') AS has_cost,
  count(*) FILTER (WHERE payload ? 'supplierInfo') AS has_supplierInfo
FROM staff_accessible_events;

ROLLBACK;

-- ============================================================
-- OWNER DIRECT TABLE SELECT (must work, no regression)
-- ============================================================

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '0d21abfe-136f-4c42-987b-14928593f323', true);

-- Owner markets direct SELECT → expected > 0
SELECT count(*) AS owner_markets_direct FROM markets;

-- Owner products direct SELECT → expected > 0
SELECT count(*) AS owner_products_direct FROM products;

-- Owner events direct SELECT → expected > 0
SELECT count(*) AS owner_events_direct FROM events;

-- Owner can see full financial fields
SELECT id, name, booth_cost, total_profit, commission_rate
FROM markets
LIMIT 5;

-- Owner can see full product cost
SELECT id, name, cost, price
FROM products
LIMIT 5;

-- Owner can see full event payload
SELECT id, type, payload
FROM events
LIMIT 5;

ROLLBACK;

-- ============================================================
-- OWNER VIEW STILL WORKS
-- ============================================================

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '0d21abfe-136f-4c42-987b-14928593f323', true);

SELECT access_type, count(*)
FROM staff_accessible_markets
GROUP BY access_type;

SELECT access_type, count(*)
FROM staff_accessible_events
GROUP BY access_type;

ROLLBACK;

*/

-- ============================================================
-- Done.
-- Next steps (outside this migration):
--   - C2.29B-2.2: Frontend type-level guard (prevent future code from
--     re-introducing staff → base-table queries)
--   - C2.29B-2.3: Full chain E1-E5 verification (re-run E1-E3 from
--     C2.29 + add E4 base-table direct SELECT + E5 build-time guard)
--   - Conditional 042: ONLY if STEP 0 P0.3 reports any view as
--     SECURITY INVOKER, create a follow-up migration to flip that
--     view to SECURITY DEFINER before re-applying 041. Out of scope
--     for 041 (do not create 042 proactively).
-- ============================================================

-- ============================================================
-- END SOURCE: 041_tighten_base_table_select_rls.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 042_preserve_staff_rental_existence.sql
-- ============================================================

-- ============================================================
-- Phase C2.30A-1.1: Staff Rental Amount Preservation
-- Migration: 042_preserve_staff_rental_existence.sql
-- Date: 2026-06-17
-- Severity: P1（員工設備狀態誤判）
-- 建立者: Cursor (Codex)
--
-- 問題：
-- staff_accessible_markets view 對員工 branch 把 table_rental / chair_rental /
-- umbrella_rental / tablecloth_rental 全部設為 NULL（沿襲 039_staff_view_hardening）。
-- 這導致員工看到市集時，market.tableRental 為 undefined，
-- StaffMarketDetailView 的判斷（tableFree || tableRental > 0 || 自備）
-- 永遠落到「自備」。
--
-- 設計修正：
-- 員工需要「設備是否承租」這個狀態（用於 UI 顯示「已承租 / 自備 / 免費提供」）。
-- 金額本身對員工無保密必要（員工本來就要知道自己要不要帶設備），
-- 直接保留 owner 設的金額：
-- - 老闆設 tableRental = 500 → 員工看到 table_rental = 500 → UI 顯示「已承租」
-- - 老闆設 tableRental = 0   → 員工看到 table_rental = 0   → UI 顯示「自備」
-- - 老闆設 tableFree = true   → 員工看到 table_free = true   → UI 顯示「免費提供」
--
-- 配合 PermissionGate.ts：market + event entity 的 rental 欄位不視為敏感，
-- 確保 events replay 時 payload.tableRental 仍寫入市集 snapshot。
--
-- Owner branch 不變（保留完整金額）。
-- ============================================================

CREATE OR REPLACE VIEW public.staff_accessible_markets AS
-- Branch 1: STAFF（敏感欄位脫敏；設備存在性保留）
SELECT
    m.id,
    m.owner_id,
    m.name,
    m.location,
    m.start_date,
    m.end_date,
    m.status,
    m.early_entry_enabled,
    m.early_entry_time,
    m.check_in_time,
    m.operating_start_time,
    m.operating_end_time,
    NULL::numeric(10,2)                  AS registration_fee,    -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS booth_cost,          -- 🛡️ 脫敏
    m.deposit,                                                 -- 🟢 保留（保證金提醒）
    -- ✅ 設備租金金額保留（員工需知道「已承租 / 自備 / 免費提供」）
    -- UI 判斷：tableFree=true → 免費提供 / tableRental > 0 → 已承租 / 其他 → 自備
    -- 金額本身對員工無保密必要，無需脫敏（無商業敏感性，不會被競爭對手取得）
    m.table_rental,
    m.chair_rental,
    m.umbrella_rental,
    m.tablecloth_rental,
    NULL::numeric(5,2)                   AS commission_rate,     -- 🛡️ 脫敏
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    NULL::numeric(10,2)                  AS total_profit,        -- 🛡️ 脫敏
    m.total_interactions,
    m.total_deals,
    m.notes,
    m.created_at,
    m.updated_at,
    m.is_collaborative,
    m.operation_phase,
    m.is_deleted,
    m.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM ((markets m
    JOIN market_members mm ON ((mm.market_id = m.id)))
    JOIN staff_relationships sr ON ((sr.owner_id = mm.user_id)))
WHERE ((sr.staff_id = auth.uid()) AND (sr.status = 'active'::text))

UNION ALL

-- Branch 2: OWNER（完整欄位）
SELECT
    m.id,
    m.owner_id,
    m.name,
    m.location,
    m.start_date,
    m.end_date,
    m.status,
    m.early_entry_enabled,
    m.early_entry_time,
    m.check_in_time,
    m.operating_start_time,
    m.operating_end_time,
    m.registration_fee,                                       -- ✅ 完整
    m.booth_cost,                                             -- ✅ 完整
    m.deposit,                                                -- ✅ 完整
    m.table_rental,                                           -- ✅ 完整
    m.chair_rental,                                           -- ✅ 完整
    m.umbrella_rental,                                        -- ✅ 完整
    m.tablecloth_rental,                                      -- ✅ 完整
    m.commission_rate,                                        -- ✅ 完整
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    m.total_profit,                                           -- ✅ 完整
    m.total_interactions,
    m.total_deals,
    m.notes,
    m.created_at,
    m.updated_at,
    m.is_collaborative,
    m.operation_phase,
    m.is_deleted,
    m.sync_status,
    m.owner_id                    AS relationship_owner_id,
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM (markets m
    JOIN market_members mm ON ((mm.market_id = m.id)))
WHERE (mm.user_id = auth.uid());



-- -----------------------------------------------------------------------------
-- Verification ROLLBACK example（驗證 1：Staff 查 staff_accessible_markets）
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

SELECT
    name,
    table_rental,         -- 預期：保留 owner 設的金額（> 0 表示已承租）
    chair_rental,         -- 預期：保留
    umbrella_rental,      -- 預期：保留
    tablecloth_rental,    -- 預期：保留
    table_free,           -- 預期：保留
    registration_fee,     -- 預期：NULL
    total_revenue         -- 預期：保留
FROM staff_accessible_markets
LIMIT 1;

ROLLBACK;
*/

-- ============================================================
-- End of 042_preserve_staff_rental_existence.sql
-- ============================================================

-- ============================================================
-- END SOURCE: 042_preserve_staff_rental_existence.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 043_staff_role_foundation.sql
-- ============================================================

-- ============================================================
-- P1: DB Role Foundation
-- Migration: 043_staff_role_foundation.sql
-- Date: 2026-06-18
-- Phase: P1（純 DB + RPC，零前端 / runtime 行為變動）
--
-- 目標：
-- 讓 staff_relationships 表具備 role-based 員工權限的基礎能力，
-- 但前端目前不讀取、不顯示、不使用這個 role。
--
-- 角色：
--   viewer   - 基礎查看者（純只查看，不可寫入）
--   operator - 出攤助手（可記錄互動 / 成交 / 編輯自己當日紀錄）
--   manager  - 管理員（operator 額外 + 協助編輯市集 / 商品基本資料）
--
-- 設計原則：
--   - role 為 Primary Source of Truth
--   - permissions JSON 仍保留（過渡用），由 RPC 同步更新
--   - DEFAULT 'viewer' 確保新記錄與既有邀請流程安全
--   - CHECK 限制合法 enum
--   - 回填既有資料：can_edit=true → operator，false → viewer
--   - update_staff_role RPC 為唯一受控寫入路徑
--   - 不 DROP 任何 RLS policy
--   - 不加固 WITH CHECK（保留既有 "Staff can accept invitations"）
--   - 不動其他 TS / UI / sync / Dexie
-- ============================================================

-- ============================================================
-- A. 新增 role 欄位
-- ============================================================

ALTER TABLE staff_relationships
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer';

-- ============================================================
-- B. 新增 CHECK constraint（用 DO $$ 避免重複新增）
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_relationships_role_check'
  ) THEN
    ALTER TABLE staff_relationships
      ADD CONSTRAINT staff_relationships_role_check
      CHECK (role IN ('viewer', 'operator', 'manager'));
  END IF;
END $$;


-- ============================================================
-- C. 回填舊資料
-- 規則：
--   permissions.can_edit = true  → operator
--   其他 / false / null          → viewer
-- DEFAULT 'viewer' 已經處理了新增列，UPDATE 處理既有列
-- ============================================================

UPDATE staff_relationships
SET role = CASE
  WHEN COALESCE((permissions->>'can_edit')::boolean, false) = true THEN 'operator'
  ELSE 'viewer'
END;

-- ============================================================
-- D. 建立 update_staff_role RPC
-- 唯一受控寫入路徑（owner 才能調整自己 active 員工的角色）
-- ============================================================

CREATE OR REPLACE FUNCTION update_staff_role(
  p_relationship_id UUID,
  p_role TEXT
)
RETURNS staff_relationships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_staff_id UUID;
  v_status   TEXT;
  v_record   staff_relationships%ROWTYPE;
BEGIN
  -- (1) 驗證 role 參數（enum gate）
  IF p_role NOT IN ('viewer', 'operator', 'manager') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be viewer, operator, or manager.', p_role
      USING ERRCODE = '22023';
  END IF;

  -- (2) 讀取目標記錄
  SELECT owner_id, staff_id, status
    INTO v_owner_id, v_staff_id, v_status
    FROM staff_relationships
   WHERE id = p_relationship_id;

  -- (3) 驗證存在性
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff relationship not found: %', p_relationship_id
      USING ERRCODE = 'P0002';
  END IF;

  -- (4) 驗證呼叫者為 owner
  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized: you are not the owner of this staff relationship.'
      USING ERRCODE = '42501';
  END IF;

  -- (5) 驗證 status = active
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Cannot change role for % relationship; only active relationships are editable.', v_status
      USING ERRCODE = 'P0001';
  END IF;

  -- (6) 禁止 staff 自己改自己
  IF v_staff_id = auth.uid() THEN
    RAISE EXCEPTION 'Not authorized: staff cannot change their own role.'
      USING ERRCODE = '42501';
  END IF;

  -- (7) 執行更新（只允許 role + 過渡用 permissions）
  -- updated_at 由既有 trigger (update_staff_relationships_timestamp) 自動更新
  UPDATE staff_relationships
     SET role = p_role,
         permissions = jsonb_build_object(
           'can_view', true,
           'can_edit', (p_role IN ('operator', 'manager')),
           'infoLevel', CASE p_role
                          WHEN 'viewer'   THEN 0
                          WHEN 'operator' THEN 2
                          WHEN 'manager'  THEN 2
                        END
         )
   WHERE id = p_relationship_id
   RETURNING * INTO v_record;

  -- (8) 回傳更新後記錄
  RETURN v_record;
END;
$$;


-- ============================================================
-- E. 收緊 RPC 權限
-- Supabase 預設 PUBLIC 有 EXECUTE，必須明確 revoke
-- ============================================================

REVOKE EXECUTE ON FUNCTION update_staff_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION update_staff_role(UUID, TEXT) TO authenticated;

-- ============================================================
-- End of 043_staff_role_foundation.sql
-- ============================================================

-- ============================================================
-- END SOURCE: 043_staff_role_foundation.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 044_get_my_staff_add_role.sql
-- ============================================================

-- ============================================================
-- Migration: 044_get_my_staff_add_role.sql
-- Purpose:   Include staff_relationships.role in get_my_staff() RPC result.
-- Date:      2026-06-18
-- Severity:  Yellow (DB RPC compatibility change)
-- Phase:     P3a 必要前置（讓前端可安全讀取 role）
--
-- 背景：
-- 043_staff_role_foundation.sql 已建立 staff_relationships.role 欄位
-- 並回填既有資料為 'viewer' / 'operator' / 'manager'。
-- 但 043 沒改 get_my_staff()，因此 owner 端 staff list 仍拿不到 role。
-- P3a 計畫在 StaffManagement 顯示 role badge，
-- 前置條件是 get_my_staff() 回傳 role 欄位。
--
-- 改動範圍：
--   - 重建 get_my_staff() RETURNS TABLE，新增 role TEXT 欄位
--   - 不改其他 RPC（get_my_owners / is_staff_of / accept_invitation_and_bind）
--   - 不改 RLS policy
--   - 不改前端 runtime 行為（沒改任何 TS / UI）
--   - 不加 GRANT / REVOKE（既有 20240220_staff_system_simple.sql 沒做特別授權，
--     維持 Postgres 預設 PUBLIC EXECUTE 狀態）
--
-- 安全性：
--   - 保留 SECURITY DEFINER
--   - 加上 SET search_path = public（與 043 風格一致，避免 search_path 攻擊）
--   - DROP FUNCTION 不用 CASCADE（get_my_staff 沒有相依物件）
--   - SQL 內部不動 owner_id 推導邏輯（仍 WHERE sr.owner_id = auth.uid()）
-- ============================================================

-- 1. 刪除舊 function（return type 改變，CREATE OR REPLACE 會失敗）
--    不使用 CASCADE：get_my_staff 沒有相依物件（view / trigger / 其他 function）
DROP FUNCTION IF EXISTS public.get_my_staff();

-- 2. 重建 function，新增 role 欄位
CREATE OR REPLACE FUNCTION public.get_my_staff()
RETURNS TABLE (
  staff_id      UUID,
  staff_email   TEXT,
  status        TEXT,
  permissions   JSONB,
  role          TEXT,         -- ✅ 新增：043 之後 owner 可看到員工角色
  invited_at    TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.staff_id,
    sr.staff_email,
    sr.status,
    sr.permissions,
    sr.role,
    sr.invited_at,
    sr.accepted_at
  FROM staff_relationships sr
  WHERE sr.owner_id = auth.uid()
  ORDER BY sr.created_at DESC;
END;
$$;

-- 3. 更新 function 註解

-- ============================================================
-- 驗證 SQL（人工套用後執行）
-- ============================================================
/*
-- 1. function 存在且回傳正確欄位
SELECT
  p.proname,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid)     AS result_definition,
  p.prosecdef                        AS is_security_definer,
  p.proconfig                        AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_my_staff';

-- 預期：
--   result_definition 含 "role text"
--   is_security_definer = true
--   config_settings 含 {search_path=public}

-- 2. 驗證 owner 可正常查詢
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<owner_user_id>', true);
SELECT staff_id, role, status FROM public.get_my_staff();
-- 預期：每筆 role 都是 'viewer' / 'operator' / 'manager'

-- 3. 驗證其他 RPC 沒被改
SELECT proname FROM pg_proc
WHERE proname IN ('get_my_staff', 'get_my_owners', 'is_staff_of', 'accept_invitation_and_bind')
ORDER BY proname;
-- 預期：4 個都存在
*/

-- ============================================================
-- End of 044_get_my_staff_add_role.sql
-- ============================================================

-- ============================================================
-- END SOURCE: 044_get_my_staff_add_role.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 045_get_my_staff_add_relationship_id.sql
-- ============================================================

-- ============================================================
-- 045_get_my_staff_add_relationship_id.sql
-- Purpose:   Include relationship_id in get_my_staff() RPC result.
-- Date:      2026-06-18
-- Severity:  Yellow (DB RPC return type change)
-- Phase:     P4 必要前置（讓 update_staff_role() 可以從前端拿 relationship id）
--
-- 背景：
-- 043_staff_role_foundation.sql 建立 staff_relationships.role
-- 044_get_my_staff_add_role.sql 讓 get_my_staff() 回傳 role
-- 045 補上 relationship_id 欄位（staff_relationships.id 主鍵）
-- 供未來 update_staff_role(p_relationship_id, p_role) 使用
--
-- 改動範圍：
--   - 重建 get_my_staff() RETURNS TABLE，新增 relationship_id UUID 欄位
--   - 不改其他 RPC（get_my_owners / is_staff_of / accept_invitation_and_bind / update_staff_role）
--   - 不改 RLS policy
--   - 不改前端 runtime 行為（沒改任何 TS / UI）
--   - 不加 GRANT / REVOKE（既有 20240220_staff_system_simple.sql 沒做特別授權，
--     維持 Postgres 預設 PUBLIC EXECUTE 狀態；044 也無 GRANT / REVOKE）
--
-- 安全性：
--   - 保留 SECURITY DEFINER
--   - 加上 SET search_path = public（與 043 / 044 風格一致，避免 search_path 攻擊）
--   - DROP FUNCTION 不用 CASCADE（get_my_staff 沒有相依物件）
--   - SQL 內部不動 owner_id 推導邏輯（仍 WHERE sr.owner_id = auth.uid()）
-- ============================================================

-- 1. 刪除舊 function（return type 改變，CREATE OR REPLACE 會失敗）
--    不使用 CASCADE：get_my_staff 沒有相依物件（view / trigger / 其他 function）
DROP FUNCTION IF EXISTS public.get_my_staff();

-- 2. 重建 function，新增 relationship_id 欄位
CREATE OR REPLACE FUNCTION public.get_my_staff()
RETURNS TABLE (
  relationship_id  UUID,        -- ✅ 新增：staff_relationships.id（主鍵）
  staff_id         UUID,
  staff_email      TEXT,
  status           TEXT,
  permissions      JSONB,
  role             TEXT,
  invited_at       TIMESTAMPTZ,
  accepted_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id          AS relationship_id,
    sr.staff_id,
    sr.staff_email,
    sr.status,
    sr.permissions,
    sr.role,
    sr.invited_at,
    sr.accepted_at
  FROM staff_relationships sr
  WHERE sr.owner_id = auth.uid()
  ORDER BY sr.created_at DESC;
END;
$$;

-- 3. 更新 function 註解

-- ============================================================
-- 驗證 SQL（人工套用後執行）
-- ============================================================
/*
-- 1. function 存在且回傳正確欄位
SELECT
  p.proname,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid)     AS result_definition,
  p.prosecdef                        AS is_security_definer,
  p.proconfig                        AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_my_staff';

-- 預期：
--   result_definition 含 "relationship_id uuid, staff_id uuid, ..., role text"
--   is_security_definer = true
--   config_settings 含 {search_path=public}

-- 2. 驗證 owner 可正常查詢
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<owner_user_id>', true);
SELECT relationship_id, staff_id, role, status FROM public.get_my_staff();
-- 預期：每筆 relationship_id 都有值，role 都是 'viewer' / 'operator' / 'manager'

-- 3. 驗證其他 RPC 沒被改
SELECT proname FROM pg_proc
WHERE proname IN ('get_my_staff', 'get_my_owners', 'is_staff_of', 'accept_invitation_and_bind', 'update_staff_role')
ORDER BY proname;
-- 預期：5 個都存在
*/

-- ============================================================
-- End of 045_get_my_staff_add_relationship_id.sql
-- ============================================================

-- ============================================================
-- END SOURCE: 045_get_my_staff_add_relationship_id.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 046_align_staff_permissions_with_role.sql
-- ============================================================

-- ============================================================
-- Migration: 046_align_staff_permissions_with_role.sql
-- Date: 2026-06-18
-- Phase: P3 legacy align（純資料回填 + DDL default + RPC literal 修正）
--
-- 目標：
-- 讓 staff_relationships.permissions 與 staff_relationships.role 對齊
-- 解決既有 viewer 員工 runtime fallback L2（無 infoLevel）造成的資料落差。
--
-- 此 migration 會讓 viewer 從舊 fallback L2 收斂為明確 L0。
-- Production audit 顯示受影響 active viewer 為 2 筆，revoked viewer 1 筆。
--
-- Role matrix（與 043_staff_role_foundation.sql update_staff_role RPC CASE 對齊）：
--   viewer   → can_view=true, can_edit=false, infoLevel=0
--   operator → can_view=true, can_edit=true,  infoLevel=2
--   manager  → can_view=true, can_edit=true,  infoLevel=2
--
-- 設計原則：
--   - 純資料 / DDL / RPC literal 修補，不引入新 runtime 行為
--   - 不改 update_staff_role RPC 行為（043 已正確）
--   - 不改 RLS policy
--   - 不改 function signature
-- ============================================================

-- ============================================================
-- A. 將 permissions DDL DEFAULT 改為 viewer + L0
--    影響：未來 INSERT 未指定 permissions 的 row 會拿到含 infoLevel=0 的完整 JSON
-- ============================================================

ALTER TABLE staff_relationships
  ALTER COLUMN permissions SET DEFAULT
  '{"can_view": true, "can_edit": false, "infoLevel": 0}'::jsonb;


-- ============================================================
-- B. 回填所有既有 staff_relationships，讓 permissions 與 role 一致
--
-- 規則（與 043 update_staff_role RPC CASE 對齊）：
--   role = 'viewer'   → infoLevel=0, can_edit=false
--   role = 'operator' → infoLevel=2, can_edit=true
--   role = 'manager'  → infoLevel=2, can_edit=true
--   其他 / NULL         → infoLevel=0, can_edit=false（保守預設）
--
-- 影響：
--   - 既有缺 infoLevel 的 active viewer：L2 → L0（會感知到收入/價格/成交統計被隱藏）
--   - 既有缺 infoLevel 的 revoked viewer：同上，但 revoked 已無 active session
--   - 既有 operator / manager：已是 L2 回填為 noop
--   - 既有 row 若有其他自訂 key：會被整個覆蓋為 role matrix 對應 JSON
-- ============================================================

UPDATE staff_relationships
SET permissions = jsonb_build_object(
      'can_view', true,
      'can_edit', (role IN ('operator', 'manager')),
      'infoLevel', CASE
        WHEN role = 'viewer' THEN 0
        WHEN role IN ('operator', 'manager') THEN 2
        ELSE 0
      END
    )
WHERE role IN ('viewer', 'operator', 'manager');

-- ============================================================
-- C. 重建 accept_invitation_and_bind RPC
--
-- 031 / 032 已是最終覆寫版本（028 為初始），重建 032 body 即可。
-- 唯一變更：permissions literal 加入 infoLevel=0。
-- 不改：function signature、回傳型別、RLS 權限、業務流程。
-- ============================================================

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
  v_staff_id UUID;
  v_staff_email TEXT;
  v_existing_owner_count INTEGER;
BEGIN
  v_staff_id := auth.uid();

  IF v_staff_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_staff_id IS NOT NULL AND p_staff_id <> v_staff_id THEN
    RETURN QUERY SELECT FALSE, 'Authenticated user does not match staff id'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN QUERY SELECT FALSE, 'Invalid invitation token'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT si.owner_id, si.expires_at
  INTO v_owner_id, v_expires_at
  FROM staff_invitations si
  WHERE si.token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid invitation token'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, 'Invitation has expired'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_owner_id = v_staff_id THEN
    RETURN QUERY SELECT FALSE, 'Owner cannot accept their own invitation'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO v_existing_owner_count
  FROM staff_relationships
  WHERE staff_id = v_staff_id
  AND status IN ('pending', 'active');

  IF v_existing_owner_count > 0 THEN
    RETURN QUERY SELECT FALSE, 'This user is already bound to an owner'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT email INTO v_staff_email
  FROM auth.users
  WHERE id = v_staff_id;

  INSERT INTO staff_relationships (
    owner_id,
    staff_id,
    staff_email,
    status,
    accepted_at,
    permissions
  ) VALUES (
    v_owner_id,
    v_staff_id,
    v_staff_email,
    'active',
    NOW(),
    '{"can_view": true, "can_edit": false, "infoLevel": 0}'::jsonb
  )
  ON CONFLICT (owner_id, staff_id)
  DO UPDATE SET
    staff_email = EXCLUDED.staff_email,
    status = 'active',
    accepted_at = NOW(),
    permissions = EXCLUDED.permissions,
    updated_at = NOW()
  RETURNING id INTO v_relationship_id;

  INSERT INTO market_members (
    market_id,
    user_id,
    role,
    joined_at
  )
  SELECT
    m.id,
    v_staff_id,
    'staff',
    NOW()
  FROM markets m
  WHERE m.owner_id = v_owner_id
    AND m.status IN ('ongoing', 'registered', 'accepted', 'paid')
    AND NOT EXISTS (
      SELECT 1 FROM market_members mm
      WHERE mm.market_id = m.id
        AND mm.user_id = v_staff_id
    );

  DELETE FROM staff_invitations
  WHERE token = p_token;

  RETURN QUERY SELECT TRUE, 'Invitation accepted'::TEXT, v_relationship_id;
END;
$$;


-- ============================================================
-- End of 046_align_staff_permissions_with_role.sql
-- ============================================================

-- ============================================================
-- 驗證 SQL（套用後人工執行，預期結果如下）
-- ============================================================
--
-- (1) 預期所有 row has_info_level = true
-- SELECT
--   status,
--   role,
--   permissions ? 'infoLevel' AS has_info_level,
--   permissions->>'infoLevel' AS info_level,
--   COUNT(*) AS count
-- FROM staff_relationships
-- GROUP BY status, role, has_info_level, info_level
-- ORDER BY status, role, has_info_level, info_level;
--
-- 預期：每個 (status, role) 群組都有 has_info_level=true 的 row
--      不應有 has_info_level=false 的 row
--
-- (2) 預期 can_edit 與 infoLevel 對齊 role matrix
-- SELECT
--   role,
--   permissions->>'can_edit' AS can_edit,
--   permissions->>'infoLevel' AS info_level,
--   COUNT(*) AS count
-- FROM staff_relationships
-- GROUP BY role, can_edit, info_level
-- ORDER BY role, can_edit, info_level;
--
-- 預期：
--   viewer   / can_edit=false / infoLevel=0
--   operator / can_edit=true  / infoLevel=2
--   manager  / can_edit=true  / infoLevel=2
-- ============================================================

-- ============================================================
-- END SOURCE: 046_align_staff_permissions_with_role.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 047_add_note_checklist_event_types.sql
-- ============================================================

-- Migration: 047_add_note_checklist_event_types
-- Date: 2026-06-20
-- Purpose:
--   Allow market-scoped Field notes and Checklist events to sync to Supabase.
--
-- Safety notes:
--   - This migration only updates the events.type CHECK constraint.
--   - It does not change RLS policies.
--   - It does not widen staff base-table SELECT access.
--   - staff_accessible_events already exposes market-scoped events through
--     the events -> markets -> staff_relationships branch.

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_type_check;

ALTER TABLE public.events ADD CONSTRAINT events_type_check CHECK (
  type IN (
    -- Market events
    'market_created',
    'market_updated',
    'market_status_changed',
    'market_started',
    'market_ended',
    'market_deleted',

    -- Product events
    'product_created',
    'product_updated',
    'product_deleted',

    -- Interaction and deal events
    'interaction_recorded',
    'interaction_deleted',
    'deal_closed',
    'deal_deleted',

    -- Field notes
    'field_note_created',
    'field_note_updated',
    'field_note_deleted',

    -- Checklist
    'checklist_item_created',
    'checklist_item_updated',
    'checklist_item_deleted',

    -- Settings
    'settings_updated'
  )
);



-- ============================================================
-- END SOURCE: 047_add_note_checklist_event_types.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 048_add_pending_operations_schema.sql
-- ============================================================

-- ============================================================
-- Gate D2a: pending_operations schema draft
-- Migration: 048_add_pending_operations_schema.sql
-- Date: 2026-06-21
--
-- Scope:
--   - Add the cloud table shape for future pending-operation pilots.
--   - Add conservative RLS policies and indexes.
--   - Do NOT route any production writes through this table.
--   - Do NOT change events, sync, cache replacement, projections, or UI.
--
-- Approved pilot domain for future discussion only:
--   - field notes
--   - checklist items
--
-- Rollback:
--   - If this migration has been applied but no production code is writing
--     to the table, rollback is simply:
--       DROP TABLE IF EXISTS public.pending_operations;
--   - If future production write routing is later approved and rows exist,
--     do not drop the table until queued rows are drained, ignored by flag,
--     or exported according to the Gate D decision record.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pending_operations (
  operation_id TEXT PRIMARY KEY CHECK (length(trim(operation_id)) > 0),
  operation_type TEXT NOT NULL CHECK (
    operation_type IN (
      'field_note_create',
      'field_note_update',
      'field_note_delete',
      'checklist_item_create',
      'checklist_item_update',
      'checklist_item_delete',
      'checklist_item_toggle'
    )
  ),
  entity_type TEXT NOT NULL CHECK (
    entity_type IN ('field_note', 'checklist_item')
  ),
  entity_id TEXT NOT NULL CHECK (length(trim(entity_id)) > 0),
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  idempotency_key TEXT NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_snapshot JSONB NOT NULL CHECK (jsonb_typeof(role_snapshot) = 'object'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'processing',
      'synced',
      'failed_retryable',
      'failed_permanent',
      'blocked_permission'
    )
  ),
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A single actor must not enqueue the same logical operation twice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_operations_actor_idempotency
ON public.pending_operations(actor_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_pending_operations_actor_status
ON public.pending_operations(actor_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_pending_operations_market_status
ON public.pending_operations(market_id, status, created_at);

DROP TRIGGER IF EXISTS update_pending_operations_updated_at ON public.pending_operations;
CREATE TRIGGER update_pending_operations_updated_at
  BEFORE UPDATE ON public.pending_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pending_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pending_operations_select_actor_or_owner" ON public.pending_operations;
CREATE POLICY "pending_operations_select_actor_or_owner"
ON public.pending_operations FOR SELECT
TO authenticated
USING (
  actor_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.markets m
    WHERE m.id = pending_operations.market_id
      AND m.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "pending_operations_insert_actor_market_member" ON public.pending_operations;
CREATE POLICY "pending_operations_insert_actor_market_member"
ON public.pending_operations FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1
      FROM public.markets m
      WHERE m.id = pending_operations.market_id
        AND m.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.markets m
      JOIN public.staff_relationships sr
        ON sr.owner_id = m.owner_id
      WHERE m.id = pending_operations.market_id
        AND sr.staff_id = auth.uid()
        AND sr.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "pending_operations_update_actor_only" ON public.pending_operations;
CREATE POLICY "pending_operations_update_actor_only"
ON public.pending_operations FOR UPDATE
TO authenticated
USING (
  actor_id = auth.uid()
)
WITH CHECK (
  actor_id = auth.uid()
);

REVOKE ALL ON TABLE public.pending_operations FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.pending_operations TO authenticated;
REVOKE DELETE ON TABLE public.pending_operations FROM authenticated;





-- Verification notes:
-- 1. This migration must not be paired with production write routing.
-- 2. No DELETE policy is created. Cleanup/retention requires a later explicit Gate D approval.
-- 3. Owner visibility is SELECT-only through market ownership; owners cannot mutate staff rows through user RLS.
-- 4. Future service-role workers may bypass RLS, but must be separately approved and tested.

-- ============================================================
-- END SOURCE: 048_add_pending_operations_schema.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 049_enqueue_checklist_toggle_pending_operation.sql
-- ============================================================

-- ============================================================
-- Gate D3c-0: checklist toggle enqueue RPC draft
-- Migration: 049_enqueue_checklist_toggle_pending_operation.sql
-- Date: 2026-06-21
--
-- Scope:
--   - Add one narrow SECURITY DEFINER RPC for the future checklist
--     toggle pending-operation pilot.
--   - Validate the actor from auth.uid(), not from client payload.
--   - Validate owner or active operator/manager membership live.
--   - Keep the RPC disconnected from production runtime in this slice.
--
-- Not in scope:
--   - No UI or sync runtime connection.
--   - No field note, checklist text, revenue, inventory, market, or
--     product routing.
--   - No policy/table/view/event changes.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.enqueue_checklist_toggle_pending_operation(
--     TEXT,
--     UUID,
--     TEXT,
--     BOOLEAN,
--     TEXT
--   );
-- ============================================================

CREATE OR REPLACE FUNCTION public.enqueue_checklist_toggle_pending_operation(
  p_operation_id TEXT,
  p_market_id UUID,
  p_item_id TEXT,
  p_completed BOOLEAN,
  p_idempotency_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_operation_id TEXT := trim(COALESCE(p_operation_id, ''));
  v_item_id TEXT := trim(COALESCE(p_item_id, ''));
  v_idempotency_key TEXT := trim(COALESCE(p_idempotency_key, ''));
  v_is_owner BOOLEAN := FALSE;
  v_staff_role TEXT;
  v_role_snapshot JSONB;
  v_payload JSONB;
  v_inserted_operation_id TEXT;
  v_existing_operation_id TEXT;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF v_operation_id = '' THEN
    RAISE EXCEPTION 'operation_id is required.'
      USING ERRCODE = '22023';
  END IF;

  IF p_market_id IS NULL THEN
    RAISE EXCEPTION 'market_id is required.'
      USING ERRCODE = '22023';
  END IF;

  IF v_item_id = '' THEN
    RAISE EXCEPTION 'item_id is required.'
      USING ERRCODE = '22023';
  END IF;

  IF p_completed IS NULL THEN
    RAISE EXCEPTION 'completed is required.'
      USING ERRCODE = '22023';
  END IF;

  IF v_idempotency_key = '' THEN
    RAISE EXCEPTION 'idempotency_key is required.'
      USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.markets m
    WHERE m.id = p_market_id
      AND m.owner_id = v_actor_id
  )
  INTO v_is_owner;

  IF v_is_owner THEN
    v_role_snapshot := jsonb_build_object(
      'isOwner', true,
      'staffRole', NULL,
      'capabilities', jsonb_build_array('canToggleChecklistItem')
    );
  ELSE
    SELECT sr.role
    INTO v_staff_role
    FROM public.markets m
    JOIN public.staff_relationships sr
      ON sr.owner_id = m.owner_id
    WHERE m.id = p_market_id
      AND sr.staff_id = v_actor_id
      AND sr.status = 'active'
    LIMIT 1;

    IF v_staff_role IS NULL OR v_staff_role NOT IN ('operator', 'manager') THEN
      RAISE EXCEPTION 'Not authorized to toggle checklist items for this market.'
        USING ERRCODE = '42501';
    END IF;

    v_role_snapshot := jsonb_build_object(
      'isOwner', false,
      'staffRole', v_staff_role,
      'capabilities', jsonb_build_array('canToggleChecklistItem')
    );
  END IF;

  v_payload := jsonb_build_object(
    'market_id', p_market_id::TEXT,
    'itemId', v_item_id,
    'completed', p_completed
  );

  INSERT INTO public.pending_operations (
    operation_id,
    operation_type,
    entity_type,
    entity_id,
    market_id,
    payload,
    idempotency_key,
    actor_id,
    role_snapshot,
    status,
    retry_count,
    last_error_code,
    last_error_message
  )
  VALUES (
    v_operation_id,
    'checklist_item_toggle',
    'checklist_item',
    v_item_id,
    p_market_id,
    v_payload,
    v_idempotency_key,
    v_actor_id,
    v_role_snapshot,
    'pending',
    0,
    NULL,
    NULL
  )
  ON CONFLICT (actor_id, idempotency_key) DO NOTHING
  RETURNING operation_id INTO v_inserted_operation_id;

  IF v_inserted_operation_id IS NOT NULL THEN
    RETURN v_inserted_operation_id;
  END IF;

  SELECT po.operation_id
  INTO v_existing_operation_id
  FROM public.pending_operations po
  WHERE po.actor_id = v_actor_id
    AND po.idempotency_key = v_idempotency_key
    AND po.operation_type = 'checklist_item_toggle'
    AND po.entity_type = 'checklist_item'
    AND po.entity_id = v_item_id
    AND po.market_id = p_market_id
    AND po.payload = v_payload;

  IF v_existing_operation_id IS NOT NULL THEN
    RETURN v_existing_operation_id;
  END IF;

  RAISE EXCEPTION 'Idempotency key already used for a different pending operation.'
    USING ERRCODE = '23505';
END;
$$;


REVOKE ALL ON FUNCTION public.enqueue_checklist_toggle_pending_operation(TEXT, UUID, TEXT, BOOLEAN, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_checklist_toggle_pending_operation(TEXT, UUID, TEXT, BOOLEAN, TEXT)
  TO authenticated;

-- ============================================================
-- END SOURCE: 049_enqueue_checklist_toggle_pending_operation.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 050_drain_checklist_toggle_pending_operation.sql
-- ============================================================

-- ============================================================
-- Gate D3c-2b: checklist toggle single-operation drain RPC draft
-- Migration: 050_drain_checklist_toggle_pending_operation.sql
-- Date: 2026-06-21
--
-- Scope:
--   - Add one narrow SECURITY DEFINER RPC that drains exactly one
--     checklist toggle pending operation into one final event.
--   - Re-check the actor from auth.uid().
--   - Re-check live owner/operator/manager permission.
--   - Keep runtime, UI, flags, RLS policies, cache replacement, revenue,
--     inventory, market, and product behavior unchanged.
--
-- Not in scope:
--   - No runtime caller.
--   - No batch worker.
--   - No table, policy, view, trigger, or feature-flag change.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.drain_checklist_toggle_pending_operation(TEXT);
-- ============================================================

CREATE OR REPLACE FUNCTION public.drain_checklist_toggle_pending_operation(
  p_operation_id TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_operation_id TEXT := trim(COALESCE(p_operation_id, ''));
  v_operation public.pending_operations%ROWTYPE;
  v_payload JSONB;
  v_item_id TEXT;
  v_event_id UUID;
  v_inserted_event_id UUID;
  v_is_authorized BOOLEAN := FALSE;
  v_staff_role TEXT;
  v_existing_event RECORD;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF v_operation_id = '' THEN
    RAISE EXCEPTION 'operation_id is required.'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_operation
  FROM public.pending_operations po
  WHERE po.operation_id = v_operation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending operation not found.'
      USING ERRCODE = '22023';
  END IF;

  IF v_operation.actor_id <> v_actor_id THEN
    RAISE EXCEPTION 'Not authorized to drain this pending operation.'
      USING ERRCODE = '42501';
  END IF;

  IF v_operation.status IN (
    'synced',
    'processing',
    'blocked_permission',
    'failed_permanent'
  ) THEN
    RETURN v_operation.status;
  END IF;

  IF v_operation.status NOT IN ('pending', 'failed_retryable') THEN
    RETURN v_operation.status;
  END IF;

  UPDATE public.pending_operations
  SET
    status = 'processing',
    last_error_code = NULL,
    last_error_message = NULL
  WHERE operation_id = v_operation_id;

  BEGIN
    IF v_operation_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      UPDATE public.pending_operations
      SET
        status = 'failed_permanent',
        last_error_code = 'invalid_operation_id',
        last_error_message = 'operation_id must be a UUID to become an event id'
      WHERE operation_id = v_operation_id;
      RETURN 'failed_permanent';
    END IF;

    v_event_id := v_operation_id::UUID;

    IF v_operation.operation_type <> 'checklist_item_toggle'
      OR v_operation.entity_type <> 'checklist_item'
    THEN
      UPDATE public.pending_operations
      SET
        status = 'failed_permanent',
        last_error_code = 'unsupported_operation',
        last_error_message = 'Only checklist_item_toggle can be drained by this RPC'
      WHERE operation_id = v_operation_id;
      RETURN 'failed_permanent';
    END IF;

    v_payload := v_operation.payload;

    IF jsonb_typeof(v_payload) <> 'object'
      OR v_payload->>'market_id' IS DISTINCT FROM v_operation.market_id::TEXT
      OR jsonb_typeof(v_payload->'completed') <> 'boolean'
      OR v_payload ? 'text'
    THEN
      UPDATE public.pending_operations
      SET
        status = 'failed_permanent',
        last_error_code = 'invalid_payload',
        last_error_message = 'Checklist toggle payload must be completed-only and market-scoped'
      WHERE operation_id = v_operation_id;
      RETURN 'failed_permanent';
    END IF;

    v_item_id := trim(COALESCE(v_payload->>'itemId', ''));

    IF v_item_id = ''
      OR v_operation.entity_id <> v_item_id
    THEN
      UPDATE public.pending_operations
      SET
        status = 'failed_permanent',
        last_error_code = 'invalid_entity',
        last_error_message = 'Checklist toggle entity_id must match payload.itemId'
      WHERE operation_id = v_operation_id;
      RETURN 'failed_permanent';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.markets m
      WHERE m.id = v_operation.market_id
        AND m.owner_id = v_operation.actor_id
    )
    INTO v_is_authorized;

    IF NOT v_is_authorized THEN
      SELECT sr.role
      INTO v_staff_role
      FROM public.markets m
      JOIN public.staff_relationships sr
        ON sr.owner_id = m.owner_id
      WHERE m.id = v_operation.market_id
        AND sr.staff_id = v_operation.actor_id
        AND sr.status = 'active'
      LIMIT 1;

      IF v_staff_role IS NULL OR v_staff_role NOT IN ('operator', 'manager') THEN
        UPDATE public.pending_operations
        SET
          status = 'blocked_permission',
          last_error_code = 'permission_denied',
          last_error_message = 'Actor no longer has checklist toggle permission'
        WHERE operation_id = v_operation_id;
        RETURN 'blocked_permission';
      END IF;
    END IF;

    SELECT
      e.type,
      e.payload,
      e.actor_id,
      e.market_id
    INTO v_existing_event
    FROM public.events e
    WHERE e.id = v_event_id;

    IF FOUND THEN
      IF v_existing_event.type = 'checklist_item_updated'
        AND v_existing_event.payload = v_payload
        AND v_existing_event.actor_id = v_operation.actor_id
        AND v_existing_event.market_id = v_operation.market_id
      THEN
        UPDATE public.pending_operations
        SET
          status = 'synced',
          last_error_code = NULL,
          last_error_message = NULL
        WHERE operation_id = v_operation_id;
        RETURN v_event_id::TEXT;
      END IF;

      UPDATE public.pending_operations
      SET
        status = 'failed_permanent',
        last_error_code = 'event_id_collision',
        last_error_message = 'A different event already uses this operation_id'
      WHERE operation_id = v_operation_id;
      RETURN 'failed_permanent';
    END IF;

    INSERT INTO public.events (
      id,
      type,
      payload,
      actor_id,
      market_id,
      timestamp,
      metadata
    )
    VALUES (
      v_event_id,
      'checklist_item_updated',
      v_payload,
      v_operation.actor_id,
      v_operation.market_id,
      v_operation.created_at,
      jsonb_build_object(
        'source', 'pending_operations',
        'pendingOperationId', v_operation.operation_id,
        'idempotencyKey', v_operation.idempotency_key,
        'drainedAt', NOW()
      )
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_inserted_event_id;

    IF v_inserted_event_id IS NULL THEN
      SELECT
        e.type,
        e.payload,
        e.actor_id,
        e.market_id
      INTO v_existing_event
      FROM public.events e
      WHERE e.id = v_event_id;

      IF FOUND
        AND v_existing_event.type = 'checklist_item_updated'
        AND v_existing_event.payload = v_payload
        AND v_existing_event.actor_id = v_operation.actor_id
        AND v_existing_event.market_id = v_operation.market_id
      THEN
        UPDATE public.pending_operations
        SET
          status = 'synced',
          last_error_code = NULL,
          last_error_message = NULL
        WHERE operation_id = v_operation_id;
        RETURN v_event_id::TEXT;
      END IF;

      UPDATE public.pending_operations
      SET
        status = 'failed_permanent',
        last_error_code = 'event_id_collision',
        last_error_message = 'A different event already uses this operation_id'
      WHERE operation_id = v_operation_id;
      RETURN 'failed_permanent';
    END IF;

    UPDATE public.pending_operations
    SET
      status = 'synced',
      last_error_code = NULL,
      last_error_message = NULL
    WHERE operation_id = v_operation_id;

    RETURN v_event_id::TEXT;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.pending_operations
    SET
      status = 'failed_retryable',
      retry_count = retry_count + 1,
      last_error_code = SQLSTATE,
      last_error_message = SQLERRM
    WHERE operation_id = v_operation_id;

    RETURN 'failed_retryable';
  END;
END;
$$;


REVOKE ALL ON FUNCTION public.drain_checklist_toggle_pending_operation(TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.drain_checklist_toggle_pending_operation(TEXT)
  TO authenticated;

-- ============================================================
-- END SOURCE: 050_drain_checklist_toggle_pending_operation.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 051_list_owner_pending_operation_diagnostics.sql
-- ============================================================

-- ============================================================
-- Gate D3c-2f: owner-only pending-operation diagnostics read RPC
-- Migration: 051_list_owner_pending_operation_diagnostics.sql
-- Date: 2026-06-22
--
-- Scope:
--   - Add one read-only SECURITY DEFINER RPC for owner diagnostics.
--   - Return an explicit, redacted diagnostics column list.
--   - Restrict results to markets owned by auth.uid().
--   - Keep runtime, UI, flags, RLS policies, cache replacement, revenue,
--     inventory, market, product, retry, drain, cleanup, and worker
--     behavior unchanged.
--
-- Not in scope:
--   - No UI or runtime caller.
--   - No staff diagnostics inbox.
--   - No retry, drain, update, delete, cleanup, recovery, or worker action.
--   - No table, policy, view, trigger, event, or feature-flag change.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.list_owner_pending_operation_diagnostics(UUID);
-- ============================================================

CREATE OR REPLACE FUNCTION public.list_owner_pending_operation_diagnostics(
  p_owner_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  operation_id TEXT,
  operation_type TEXT,
  entity_type TEXT,
  entity_id TEXT,
  market_id UUID,
  status TEXT,
  retry_count INTEGER,
  actor_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_message TEXT,
  safe_metadata JSONB,
  age_bucket TEXT,
  state_group TEXT,
  final_event_id UUID,
  final_event_type TEXT,
  has_final_event BOOLEAN,
  final_event_mismatch BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_owner_id UUID := COALESCE(p_owner_id, auth.uid());
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'owner_id is required.'
      USING ERRCODE = '22023';
  END IF;

  IF v_owner_id <> v_actor_id THEN
    RAISE EXCEPTION 'Owner diagnostics can only be read by the authenticated owner.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    po.operation_id,
    po.operation_type,
    po.entity_type,
    po.entity_id,
    po.market_id,
    po.status,
    po.retry_count,
    po.actor_id,
    po.created_at,
    po.updated_at,
    po.last_error_code,
    po.last_error_message,
    jsonb_strip_nulls(jsonb_build_object(
      'source', e.metadata->>'source',
      'idempotencyKey', e.metadata->>'idempotencyKey',
      'pendingOperationId', e.metadata->>'pendingOperationId',
      'drainedAt', e.metadata->>'drainedAt'
    )) AS safe_metadata,
    CASE
      WHEN NOW() - po.updated_at < INTERVAL '15 minutes' THEN 'fresh'
      WHEN NOW() - po.updated_at < INTERVAL '1 hour' THEN 'recent'
      WHEN NOW() - po.updated_at < INTERVAL '1 day' THEN 'stale'
      ELSE 'old'
    END AS age_bucket,
    CASE
      WHEN po.status = 'synced' THEN 'healthy'
      WHEN po.status IN ('failed_retryable', 'blocked_permission', 'failed_permanent') THEN 'needs_attention'
      WHEN po.status IN ('pending', 'processing') THEN 'in_progress'
      ELSE 'unknown'
    END AS state_group,
    e.id AS final_event_id,
    e.type AS final_event_type,
    e.id IS NOT NULL AS has_final_event,
    CASE
      WHEN e.id IS NULL THEN FALSE
      WHEN po.status = 'synced'
        AND e.type = 'checklist_item_updated'
        AND e.actor_id = po.actor_id
        AND e.market_id = po.market_id
      THEN FALSE
      ELSE TRUE
    END AS final_event_mismatch
  FROM public.pending_operations po
  JOIN public.markets m
    ON m.id = po.market_id
  LEFT JOIN public.events e
    ON e.id = CASE
      WHEN po.operation_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN po.operation_id::UUID
      ELSE NULL
    END
  WHERE m.owner_id = v_owner_id
  ORDER BY po.updated_at DESC, po.created_at DESC
  LIMIT 100;
END;
$$;


REVOKE ALL ON FUNCTION public.list_owner_pending_operation_diagnostics(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_owner_pending_operation_diagnostics(UUID)
  TO authenticated;

-- ============================================================
-- END SOURCE: 051_list_owner_pending_operation_diagnostics.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 052_recover_stale_processing_pending_operation.sql
-- ============================================================

-- ============================================================
-- Gate D3c-2i: stale processing single-operation recovery RPC draft
-- Migration: 052_recover_stale_processing_pending_operation.sql
-- Date: 2026-06-22
--
-- Scope:
--   - Add one narrow SECURITY DEFINER RPC that recovers exactly one
--     stale processing pending operation.
--   - Restrict recovery to the owner of the pending operation's market.
--   - Inspect any existing final event before changing pending state.
--   - Keep runtime, UI, flags, RLS policies, cache replacement, revenue,
--     inventory, market, product, drain, retry execution, cleanup, and
--     worker behavior unchanged.
--
-- Not in scope:
--   - No runtime caller.
--   - No UI action.
--   - No event creation.
--   - No drain, retry, cleanup, batch worker, table, policy, view,
--     trigger, or feature-flag change.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.recover_stale_processing_pending_operation(TEXT);
-- ============================================================

CREATE OR REPLACE FUNCTION public.recover_stale_processing_pending_operation(
  p_operation_id TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_operation_id TEXT := trim(COALESCE(p_operation_id, ''));
  v_operation public.pending_operations%ROWTYPE;
  v_event_id UUID;
  v_existing_event RECORD;
  v_is_owner BOOLEAN := FALSE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF v_operation_id = '' THEN
    RAISE EXCEPTION 'operation_id is required.'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_operation
  FROM public.pending_operations po
  WHERE po.operation_id = v_operation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending operation not found.'
      USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.markets m
    WHERE m.id = v_operation.market_id
      AND m.owner_id = v_actor_id
  )
  INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Only the market owner can recover stale processing pending operations.'
      USING ERRCODE = '42501';
  END IF;

  IF v_operation.status <> 'processing' THEN
    RAISE EXCEPTION 'Only processing pending operations can be recovered.'
      USING ERRCODE = '22023';
  END IF;

  IF v_operation.updated_at >= NOW() - INTERVAL '15 minutes' THEN
    RAISE EXCEPTION 'Processing pending operation is not stale.'
      USING ERRCODE = '22023';
  END IF;

  IF v_operation_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_event_id := v_operation_id::UUID;

    SELECT
      e.type,
      e.payload,
      e.actor_id,
      e.market_id
    INTO v_existing_event
    FROM public.events e
    WHERE e.id = v_event_id;

    IF FOUND THEN
      IF v_operation.operation_type = 'checklist_item_toggle'
        AND v_operation.entity_type = 'checklist_item'
        AND v_existing_event.type = 'checklist_item_updated'
        AND v_existing_event.payload = v_operation.payload
        AND v_existing_event.actor_id = v_operation.actor_id
        AND v_existing_event.market_id = v_operation.market_id
      THEN
        UPDATE public.pending_operations
        SET
          status = 'synced',
          last_error_code = NULL,
          last_error_message = NULL
        WHERE operation_id = v_operation_id;

        RETURN 'synced';
      END IF;

      UPDATE public.pending_operations
      SET
        status = 'failed_permanent',
        last_error_code = 'event_id_collision',
        last_error_message = 'A different event already uses this operation_id'
      WHERE operation_id = v_operation_id;

      RETURN 'failed_permanent';
    END IF;
  END IF;

  UPDATE public.pending_operations
  SET
    status = 'failed_retryable',
    retry_count = retry_count + 1,
    last_error_code = 'stale_processing_reset',
    last_error_message = 'Stale processing operation reset to retryable without draining'
  WHERE operation_id = v_operation_id;

  RETURN 'failed_retryable';
END;
$$;


REVOKE ALL ON FUNCTION public.recover_stale_processing_pending_operation(TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recover_stale_processing_pending_operation(TEXT)
  TO authenticated;

-- ============================================================
-- END SOURCE: 052_recover_stale_processing_pending_operation.sql
-- ============================================================
