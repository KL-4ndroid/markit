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
COMMENT ON TABLE profiles IS '用戶資料表';
COMMENT ON TABLE markets IS '市集資料表（讀取模型，由 Trigger 自動維護）';
COMMENT ON TABLE products IS '商品資料表（讀取模型，由 Trigger 自動維護）';
COMMENT ON TABLE market_members IS '市集成員表（多對多關聯）';
COMMENT ON TABLE market_invitations IS '邀請碼表（一次性使用）';
COMMENT ON TABLE events IS '事件表（唯一寫入來源，Event Sourcing）';

COMMENT ON COLUMN markets.total_revenue IS '總收入（由 deal_closed 事件計算）';
COMMENT ON COLUMN markets.total_profit IS '總利潤（由 deal_closed 事件計算）';
COMMENT ON COLUMN markets.total_interactions IS '總互動數（由 interaction_recorded 事件計算）';
COMMENT ON COLUMN markets.total_deals IS '總成交數（由 deal_closed 事件計算）';

-- ==================== 完成 ====================
-- 資料表創建完成
-- 下一步：執行 002_cqrs_triggers.sql
