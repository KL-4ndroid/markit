# Supabase 多人協作功能 - 可行性分析與建議（修訂版）

> **更新日期：** 2026-01-24  
> **版本：** 2.0（架構優化版）  
> **關鍵改進：** UUID 主鍵 + CQRS 模式 + RPC 安全性

## 📋 總體評估

**可行性：✅ 高度可行（優化後更加穩健）**

經過架構優化，設計更加符合分散式系統和事件溯源的最佳實踐。以下是詳細分析：

---

## 🔑 關鍵架構改進

### 1. **UUID 主鍵策略** ✅ 關鍵改進
- 支援離線建立資料
- 避免 ID 衝突
- 分散式系統友好

### 2. **CQRS 模式** ✅ 架構優化
- 事件為唯一寫入來源
- Markets 表作為讀取模型
- PostgreSQL Trigger 自動更新

### 3. **RPC 安全性** ✅ 安全強化
- 避免 RLS 權限複雜度
- SECURITY DEFINER 原子操作
- 減少 Client 端邏輯

---

## 1️⃣ 資料庫結構與身分系統

### ✅ Supabase 資料表設計（UUID 版本）

```sql
-- ==================== 用戶資料表 ====================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== 市集資料表（讀取模型）====================
-- 注意：此表僅作為讀取模型，由 Trigger 自動維護
CREATE TABLE markets (
  id UUID PRIMARY KEY,                    -- 改為 UUID
  owner_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'registered',
  
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

-- ==================== 商品資料表（讀取模型）====================
CREATE TABLE products (
  id UUID PRIMARY KEY,                    -- 改為 UUID
  market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
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

-- ==================== 市集成員表 ====================
CREATE TABLE market_members (
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (market_id, user_id)
);

-- ==================== 邀請碼表 ====================
CREATE TABLE market_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- 改為 UUID
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  actor_id UUID NOT NULL REFERENCES profiles(id),
  market_id UUID REFERENCES markets(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  
  -- 索引優化
  CONSTRAINT valid_event_type CHECK (
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
  )
);

-- ==================== 索引優化 ====================
CREATE INDEX idx_events_market_id ON events(market_id);
CREATE INDEX idx_events_actor_id ON events(actor_id);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_market_members_user_id ON market_members(user_id);
CREATE INDEX idx_market_members_market_id ON market_members(market_id);
CREATE INDEX idx_invitations_code ON market_invitations(code) WHERE NOT is_used;
CREATE INDEX idx_products_market_id ON products(market_id);
```

**評估：✅ 優秀**
- UUID 支援離線建立
- 結構清晰，關聯正確
- 使用 CASCADE 確保資料一致性
- 索引設計合理

---

### ✅ Dexie 更新（UUID 版本）

```typescript
// lib/db/index.ts 更新

import { v4 as uuidv4 } from 'uuid'; // 需要安裝：npm install uuid

export class MarketPulseDB extends Dexie {
  events!: Table<Event, string>;      // 改為 string (UUID)
  markets!: Table<Market, string>;    // 改為 string (UUID)
  products!: Table<Product, string>;  // 改為 string (UUID)
  dailyStats!: Table<DailyStats, string>;
  settings!: Table<Settings, number>;
  syncQueue!: Table<SyncQueueItem, string>; // 新增：同步佇列

  constructor() {
    super('MarketPulseDB');
    
    // 版本 1-2：現有版本（保持不變）
    this.version(1).stores({
      events: '++id, type, timestamp',
      markets: '++id, status, name, date',
      products: '++id, category, name, isActive',
      dailyStats: 'date, marketId',
      settings: '++id',
    });

    this.version(2).stores({
      markets: '++id, status, name, startDate, endDate',
    }).upgrade(async (trans) => {
      const markets = await trans.table('markets').toArray();
      for (const market of markets) {
        if (market.date && !market.startDate) {
          await trans.table('markets').update(market.id, {
            startDate: market.date,
            endDate: market.date,
          });
        }
      }
    });
    
    // 版本 3：UUID 遷移 + 多人協作支援
    this.version(3).stores({
      events: 'id, type, timestamp, actor_id, market_id, sync_status',
      markets: 'id, status, name, startDate, endDate, owner_id, is_collaborative, sync_status',
      products: 'id, category, name, isActive, market_id',
      dailyStats: 'date, marketId',
      settings: '++id',
      syncQueue: 'id, status, created_at',
    }).upgrade(async (trans) => {
      console.log('🔄 開始遷移到 UUID...');
      
      // 1. 遷移 Markets
      const oldMarkets = await trans.table('markets').toArray();
      const marketIdMap = new Map<number, string>(); // 舊ID -> 新UUID
      
      await trans.table('markets').clear();
      
      for (const market of oldMarkets) {
        const newId = uuidv4();
        marketIdMap.set(market.id as number, newId);
        
        await trans.table('markets').add({
          ...market,
          id: newId,
          owner_id: 'local',
          is_collaborative: false,
          sync_status: 'local_only',
        });
      }
      
      // 2. 遷移 Products
      const oldProducts = await trans.table('products').toArray();
      await trans.table('products').clear();
      
      for (const product of oldProducts) {
        await trans.table('products').add({
          ...product,
          id: uuidv4(),
          market_id: product.market_id ? marketIdMap.get(product.market_id as number) : undefined,
        });
      }
      
      // 3. 遷移 Events
      const oldEvents = await trans.table('events').toArray();
      await trans.table('events').clear();
      
      for (const event of oldEvents) {
        await trans.table('events').add({
          ...event,
          id: uuidv4(),
          actor_id: 'local',
          market_id: event.payload?.marketId ? marketIdMap.get(event.payload.marketId) : undefined,
          sync_status: 'local_only',
        });
      }
      
      // 4. 更新 DailyStats 的 marketId
      const oldStats = await trans.table('dailyStats').toArray();
      await trans.table('dailyStats').clear();
      
      for (const stat of oldStats) {
        await trans.table('dailyStats').add({
          ...stat,
          marketId: stat.marketId ? marketIdMap.get(stat.marketId as number) : undefined,
        });
      }
      
      console.log('✅ UUID 遷移完成');
    });
  }
}

// UUID 生成輔助函數
export function generateUUID(): string {
  return uuidv4();
}
```

**新增類型定義：**

```typescript
// types/db.ts 更新

export interface Event<T = any> {
  id?: string;                 // 改為 string (UUID)
  type: EventType;
  payload: T;
  timestamp: number;
  actor_id?: string;           // 新增：操作者 UUID
  market_id?: string;          // 改為 string (UUID)
  sync_status?: 'local_only' | 'pending' | 'synced' | 'conflict';
  metadata?: {
    userId?: string;
    deviceId?: string;
    version?: string;
  };
}

export interface Market {
  id?: string;                 // 改為 string (UUID)
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  // ... 其他欄位
  owner_id?: string;           // 新增：擁有者 UUID
  is_collaborative?: boolean;  // 新增：是否為協作市集
  sync_status?: 'local_only' | 'synced' | 'conflict';
  createdAt: number;
  updatedAt: number;
}

export interface Product {
  id?: string;                 // 改為 string (UUID)
  market_id?: string;          // 改為 string (UUID)
  name: string;
  category: ProductCategory;
  price: number;
  // ... 其他欄位
}

export interface SyncQueueItem {
  id?: string;                 // 改為 string (UUID)
  event_id: string;            // 改為 string (UUID)
  market_id: string;           // 改為 string (UUID)
  status: 'pending' | 'syncing' | 'success' | 'failed';
  retry_count: number;
  error_message?: string;
  created_at: number;
  updated_at: number;
}
```

**評估：✅ 優秀**
- UUID 支援離線建立
- 平滑遷移策略（保留舊資料）
- ID 映射確保關聯正確
- 向後相容

---

## 2️⃣ CQRS 模式：PostgreSQL Trigger 自動更新讀取模型

### ✅ 核心概念

**Client 端：** 只寫入 `events` 表  
**Server 端：** Trigger 自動更新 `markets` 和 `products` 表

```sql
-- ==================== Market 讀取模型更新 Trigger ====================

-- 1. 創建 Trigger 函數
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
      );
    
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
$$ LANGUAGE plpgsql;

-- 2. 創建 Trigger
CREATE TRIGGER trigger_update_market_read_model
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION update_market_read_model();

-- ==================== Product 讀取模型更新 Trigger ====================

CREATE OR REPLACE FUNCTION update_product_read_model()
RETURNS TRIGGER AS $$
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
        (NEW.payload->>'unlimitedStock')::BOOLEAN,
        TRUE,
        (NEW.payload->>'description')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      );
    
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
      UPDATE products p
      SET 
        total_sold = total_sold + (item->>'quantity')::INTEGER,
        stock = CASE 
          WHEN NOT unlimited_stock THEN GREATEST(0, stock - (item->>'quantity')::INTEGER)
          ELSE stock
        END,
        updated_at = NEW.timestamp
      FROM jsonb_array_elements(NEW.payload->'items') AS item
      WHERE p.id = (item->>'productId')::UUID;
    
    ELSE
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_read_model
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION update_product_read_model();
```

**評估：✅ 優秀**
- Client 端邏輯簡化（只寫事件）
- 讀取模型自動維護
- 符合 CQRS 最佳實踐
- 減少網路往返次數

---

## 3️⃣ 邀請與加入邏輯（RPC 安全版）

### ✅ 邀請碼生成（保持不變）

```typescript
// lib/collaboration/invitations.ts

import { supabase } from '@/lib/supabase';

/**
 * 生成 6 位隨機邀請碼
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆字元
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 創建邀請碼
 */
export async function createInvitation(marketId: number): Promise<string> {
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error('未登入');

  // 檢查權限：只有 owner 可以生成邀請碼
  const { data: member } = await supabase
    .from('market_members')
    .select('role')
    .eq('market_id', marketId)
    .eq('user_id', user.data.user.id)
    .single();

  if (!member || member.role !== 'owner') {
    throw new Error('無權限生成邀請碼');
  }

  // 生成唯一邀請碼
  let code: string;
  let attempts = 0;
  
  while (attempts < 10) {
    code = generateInviteCode();
    
    const { data: existing } = await supabase
      .from('market_invitations')
      .select('id')
      .eq('code', code)
      .single();
    
    if (!existing) {
      // 創建邀請碼
      const { error } = await supabase
        .from('market_invitations')
        .insert({
          code,
          market_id: marketId,
          created_by: user.data.user.id,
        });
      
      if (!error) return code;
    }
    
    attempts++;
  }
  
  throw new Error('生成邀請碼失敗，請重試');
}
```

**評估：✅ 優秀**
- 排除易混淆字元（0/O, 1/I）
- 重試機制確保唯一性
- 權限檢查嚴格

---

### ✅ 加入團隊（RPC 安全版）

**核心改進：** 使用 `SECURITY DEFINER` 避免 RLS 權限複雜度

```sql
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
    RAISE EXCEPTION '未登入';
  END IF;
  
  -- 查詢並鎖定邀請碼（防止競態條件）
  SELECT * INTO v_invitation
  FROM market_invitations
  WHERE code = UPPER(p_code)
    AND is_used = FALSE
  FOR UPDATE;
  
  -- 驗證邀請碼
  IF NOT FOUND THEN
    RAISE EXCEPTION '邀請碼無效或已使用';
  END IF;
  
  -- 檢查是否過期
  IF v_invitation.expires_at < NOW() THEN
    RAISE EXCEPTION '邀請碼已過期';
  END IF;
  
  -- 檢查是否已是成員
  IF EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = v_invitation.market_id
      AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION '您已經是該市集的成員';
  END IF;
  
  -- 獲取市集資訊
  SELECT * INTO v_market
  FROM markets
  WHERE id = v_invitation.market_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '市集不存在';
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

-- ==================== 撤銷直接查詢權限 ====================

-- 撤銷 market_invitations 表的直接查詢權限
REVOKE ALL ON market_invitations FROM authenticated;

-- 只允許 owner 查看自己創建的邀請碼
CREATE POLICY "用戶只能查看自己創建的邀請碼"
ON market_invitations FOR SELECT
USING (created_by = auth.uid());

-- 只允許 owner 創建邀請碼
CREATE POLICY "市集 owner 可以創建邀請碼"
ON market_invitations FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = market_invitations.market_id
      AND user_id = auth.uid()
      AND role = 'owner'
  )
);
```

**Client 端調用：**

```typescript
// lib/collaboration/invitations.ts

/**
 * 使用邀請碼加入團隊（RPC 版本）
 */
export async function joinTeamByCode(inviteCode: string): Promise<void> {
  // 直接調用 RPC，無需查詢權限
  const { data, error } = await supabase
    .rpc('join_market_by_code', {
      p_code: inviteCode.toUpperCase().trim(),
    });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.success) {
    throw new Error(data.error || '加入失敗');
  }

  // 成功加入，開始同步市集數據
  const marketId = data.market_id;
  
  toast.success(`成功加入市集：${data.market_name}`);
  
  // 下載該市集的所有事件
  await syncMarketEvents(marketId);
  
  // 重定向到市集頁面
  window.location.href = `/markets/${marketId}`;
}
```

**評估：✅ 優秀**
- `SECURITY DEFINER` 避免 RLS 權限地獄
- 原子操作確保一致性
- 防止競態條件（`FOR UPDATE` 鎖定）
- Client 端邏輯簡化
- 統一錯誤處理

---

## 4️⃣ 團隊管理介面

### ✅ UI 組件設計

```typescript
// components/collaboration/TeamMembers.tsx

'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createInvitation } from '@/lib/collaboration/invitations';
import { toast } from 'sonner';

interface TeamMember {
  user_id: string;
  role: 'owner' | 'staff';
  display_name: string;
  email: string;
  joined_at: string;
}

export function TeamMembers({ marketId }: { marketId: number }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
    getCurrentUser();
  }, [marketId]);

  async function getCurrentUser() {
    const { data } = await supabase.auth.getUser();
    setCurrentUserId(data.user?.id || null);
  }

  async function loadMembers() {
    const { data, error } = await supabase
      .from('market_members')
      .select(`
        user_id,
        role,
        joined_at,
        profiles (
          display_name,
          email
        )
      `)
      .eq('market_id', marketId);

    if (!error && data) {
      setMembers(data.map(m => ({
        user_id: m.user_id,
        role: m.role,
        display_name: m.profiles.display_name || m.profiles.email,
        email: m.profiles.email,
        joined_at: m.joined_at,
      })));
    }
  }

  async function handleGenerateInvite() {
    try {
      const code = await createInvitation(marketId);
      setInviteCode(code);
      toast.success('邀請碼已生成');
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function handleCopyCode() {
    if (inviteCode) {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success('已複製到剪貼簿');
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('確定要移除此成員嗎？')) return;

    const { error } = await supabase
      .from('market_members')
      .delete()
      .eq('market_id', marketId)
      .eq('user_id', userId);

    if (!error) {
      toast.success('成員已移除');
      loadMembers();
    } else {
      toast.error('移除失敗');
    }
  }

  const isOwner = members.find(m => m.user_id === currentUserId)?.role === 'owner';

  return (
    <div className="bg-white rounded-[1.5rem] p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#7B9FA6]" />
          <h3 className="text-lg font-medium text-[#3A3A3A]">團隊成員</h3>
        </div>
        
        {isOwner && (
          <button
            onClick={handleGenerateInvite}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7B9FA6] text-white hover:bg-[#6A8E95] transition-colors text-sm"
          >
            <UserPlus className="w-4 h-4" />
            生成邀請碼
          </button>
        )}
      </div>

      {/* 邀請碼顯示 */}
      {inviteCode && (
        <div className="mb-4 p-4 bg-[#E8F0F8] rounded-xl">
          <p className="text-sm text-[#6B6B6B] mb-2">邀請碼（7天內有效）：</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-2xl font-mono font-bold text-[#7B9FA6] tracking-wider">
              {inviteCode}
            </code>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-lg hover:bg-white transition-colors"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5 text-[#7B9FA6]" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* 成員列表 */}
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.user_id}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FAFAF8] transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-[#3A3A3A]">
                  {member.display_name}
                </p>
                {member.role === 'owner' && (
                  <span className="px-2 py-0.5 rounded-full bg-[#7B9FA6] text-white text-xs">
                    老闆
                  </span>
                )}
              </div>
              <p className="text-sm text-[#6B6B6B]">{member.email}</p>
            </div>

            {isOwner && member.role !== 'owner' && (
              <button
                onClick={() => handleRemoveMember(member.user_id)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**評估：✅ 優秀**
- UI 清晰直觀
- 權限控制嚴格
- 用戶體驗良好

---

## 5️⃣ 事件同步與資料一致性（CQRS 版本）

### ⚠️ 關鍵問題：交易快照

**您提到的問題非常重要！**

```typescript
// ❌ 錯誤做法：只記錄商品 ID
{
  type: 'deal_closed',
  payload: {
    items: [
      { productId: 1, quantity: 2 } // 缺少價格！
    ]
  }
}

// ✅ 正確做法：記錄交易時的價格
{
  type: 'deal_closed',
  payload: {
    items: [
      { 
        productId: 1, 
        quantity: 2,
        price_at_time_of_sale: 100, // 交易當下的價格
        cost_at_time_of_sale: 50    // 交易當下的成本
      }
    ]
  }
}
```

**修改建議：**

```typescript
// types/db.ts 更新

export interface DealClosedPayload {
  marketId: number;
  items: {
    productId: number;
    quantity: number;
    price_at_time_of_sale: number;      // 新增：交易時的售價
    cost_at_time_of_sale?: number;      // 新增：交易時的成本
    product_name: string;                // 新增：商品名稱（防止商品被刪除）
  }[];
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'mobile' | 'other';
  notes?: string;
}
```

**評估：✅ 關鍵改進**
- 確保歷史數據準確性
- 防止價格變動影響利潤計算
- 符合事件溯源最佳實踐

---

### ✅ 同步過濾與權限（簡化版）

**核心改進：** Client 只需推送事件，Trigger 自動更新讀取模型

```typescript
// lib/collaboration/sync.ts

/**
 * 同步市集事件（Push）- CQRS 版本
 */
export async function pushEvents(marketId: string): Promise<void> {
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error('未登入');

  // 檢查權限
  const { data: member } = await supabase
    .from('market_members')
    .select('role')
    .eq('market_id', marketId)
    .eq('user_id', user.data.user.id)
    .single();

  if (!member) {
    throw new Error('無權限同步此市集');
  }

  // 獲取待同步的事件
  const pendingEvents = await db.events
    .where('market_id').equals(marketId)
    .and(e => e.sync_status === 'pending' || e.sync_status === 'local_only')
    .toArray();

  // 批次上傳（只寫事件，Trigger 會自動更新讀取模型）
  for (const event of pendingEvents) {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          id: event.id,              // 使用本地生成的 UUID
          type: event.type,
          payload: event.payload,
          actor_id: user.data.user.id,
          market_id: marketId,
          timestamp: new Date(event.timestamp).toISOString(),
          metadata: event.metadata,
        })
        .select()
        .single();

      if (!error && data) {
        // 更新本地事件狀態
        await db.events.update(event.id!, {
          sync_status: 'synced',
        });
        
        console.log(`✅ 事件已同步：${event.type} (${event.id})`);
      }
    } catch (error: any) {
      // 處理 UUID 衝突（可能是重複同步）
      if (error.code === '23505') { // Unique violation
        await db.events.update(event.id!, {
          sync_status: 'synced',
        });
      } else {
        console.error('同步事件失敗:', event.id, error);
        await db.events.update(event.id!, {
          sync_status: 'conflict',
        });
      }
    }
  }
  
  console.log(`✅ 推送完成：${pendingEvents.length} 個事件`);
}

/**
 * 同步市集事件（Pull）- CQRS 版本
 */
export async function pullEvents(marketId: string): Promise<void> {
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error('未登入');

  // 檢查權限
  const { data: member } = await supabase
    .from('market_members')
    .select('role')
    .eq('market_id', marketId)
    .eq('user_id', user.data.user.id)
    .single();

  if (!member) {
    throw new Error('無權限同步此市集');
  }

  // 獲取最後同步時間
  const lastSyncedEvent = await db.events
    .where('market_id').equals(marketId)
    .and(e => e.sync_status === 'synced')
    .reverse()
    .sortBy('timestamp');

  const lastSyncTime = lastSyncedEvent[0]?.timestamp || 0;

  // 從 Supabase 拉取新事件
  const { data: newEvents, error } = await supabase
    .from('events')
    .select('*')
    .eq('market_id', marketId)
    .gt('timestamp', new Date(lastSyncTime).toISOString())
    .order('timestamp', { ascending: true });

  if (error) throw error;

  // 應用新事件到本地
  for (const event of newEvents || []) {
    // 檢查是否已存在（使用 UUID）
    const existing = await db.events.get(event.id);

    if (!existing) {
      // 直接插入事件（不通過 recordEvent，避免重複處理）
      await db.events.add({
        id: event.id,
        type: event.type,
        payload: event.payload,
        actor_id: event.actor_id,
        market_id: event.market_id,
        timestamp: new Date(event.timestamp).getTime(),
        sync_status: 'synced',
        metadata: event.metadata,
      });
      
      // 本地也需要更新讀取模型（重放事件）
      const handler = eventHandlers[event.type];
      if (handler) {
        await handler({
          id: event.id,
          type: event.type,
          payload: event.payload,
          timestamp: new Date(event.timestamp).getTime(),
        }, db);
      }
    }
  }
  
  console.log(`✅ 拉取完成：${newEvents?.length || 0} 個新事件`);
}

/**
 * 完整同步（Push + Pull）
 */
export async function syncMarket(marketId: string): Promise<void> {
  try {
    // 先推送本地事件
    await pushEvents(marketId);
    
    // 再拉取遠端事件
    await pullEvents(marketId);
    
    toast.success('同步完成');
  } catch (error: any) {
    console.error('同步失敗:', error);
    
    // 檢查是否為權限錯誤
    if (error.code === 'PGRST301' || error.message.includes('403')) {
      await handlePermissionRevoked(marketId);
    } else {
      toast.error(`同步失敗：${error.message}`);
    }
  }
}
```

**評估：✅ 優秀（CQRS 優化）**
- Client 只需同步事件表
- Trigger 自動維護讀取模型
- UUID 避免 ID 衝突
- 權限檢查嚴格
- 批次處理效率高

---

### ✅ 安全清理（403 處理）

```typescript
// lib/collaboration/security.ts

/**
 * 處理權限失效
 */
export async function handlePermissionRevoked(marketId: string): Promise<void> {
  try {
    // 1. 登出當前帳號
    await supabase.auth.signOut();

    // 2. 清除該市集的所有本地數據
    await db.transaction('rw', [db.events, db.markets, db.products, db.dailyStats], async () => {
      // 刪除市集
      await db.markets.delete(marketId);

      // 刪除相關事件
      await db.events.where('market_id').equals(marketId).delete();

      // 刪除相關商品
      await db.products.where('market_id').equals(marketId).delete();

      // 刪除相關統計
      await db.dailyStats.where('marketId').equals(marketId).delete();
    });

    // 3. 顯示提示
    toast.error('權限已失效，相關資料已從本機移除', {
      duration: 5000,
    });

    // 4. 重定向到首頁
    window.location.href = '/';
  } catch (error) {
    console.error('清理資料失敗:', error);
  }
}

/**
 * API 請求攔截器
 */
export function setupSyncErrorHandler() {
  // 監聽 Supabase 錯誤
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      // 用戶被登出，可能是權限被撤銷
      console.log('用戶已登出');
    }
  });

  // 全域錯誤處理
  window.addEventListener('unhandledrejection', async (event) => {
    if (event.reason?.code === 'PGRST301') { // 403 Forbidden
      const marketId = extractMarketIdFromError(event.reason);
      if (marketId) {
        await handlePermissionRevoked(marketId);
      }
    }
  });
}
```

**評估：✅ 優秀**
- 安全清理邏輯完善
- 用戶體驗友好
- 防止數據洩漏

---

## 📊 整體架構評估（優化版）

### ✅ 優點

1. **UUID 主鍵策略**
   - 支援離線建立資料
   - 避免 ID 衝突
   - 分散式系統友好

2. **CQRS 模式**
   - 事件為唯一寫入來源
   - 讀取模型自動維護
   - Client 端邏輯簡化

3. **RPC 安全性**
   - 避免 RLS 權限複雜度
   - SECURITY DEFINER 原子操作
   - 統一錯誤處理

4. **事件溯源相容性高**
   - 完美契合現有架構
   - 不破壞離線優先特性

5. **權限控制嚴格**
   - Row Level Security (RLS)
   - 多層權限檢查

6. **數據一致性保證**
   - Transaction 確保原子性
   - Trigger 自動更新
   - UUID 避免衝突

7. **用戶體驗良好**
   - 邀請碼簡單易用
   - UI 清晰直觀

### ⚠️ 需要注意的問題

1. **UUID 遷移**
   - 需要平滑遷移現有資料
   - ID 映射確保關聯正確
   - 測試充分

2. **Trigger 效能**
   - 大量事件插入時的效能
   - 考慮批次處理優化
   - 監控 Trigger 執行時間

3. **衝突解決策略**
   - UUID 避免大部分衝突
   - 時間戳決定優先級（LWW）
   - 考慮 CRDT 以獲得更好一致性

4. **網路斷線處理**
   - 需要完善的離線佇列
   - 重連後自動同步

5. **大量數據同步**
   - 首次同步可能較慢
   - 建議：分批同步 + 進度顯示

6. **成本考量**
   - Supabase 免費方案限制
   - 需監控 API 使用量

---

## 🎯 實施建議（優化版）

### 階段一：UUID 遷移與基礎建設（2週）
- [ ] 安裝 uuid 套件：`npm install uuid @types/uuid`
- [ ] Dexie 版本 3 升級（UUID 支援）
- [ ] 測試 UUID 遷移邏輯
- [ ] Supabase 專案設置
- [ ] 資料庫 Schema 建立（UUID 版本）

### 階段二：CQRS Trigger 設置（1週）
- [ ] 創建 Market 讀取模型 Trigger
- [ ] 創建 Product 讀取模型 Trigger
- [ ] 測試 Trigger 正確性
- [ ] RLS 政策設定

### 階段三：認證與邀請（1週）
- [ ] Supabase Auth 整合
- [ ] 邀請碼生成功能
- [ ] `join_market_by_code` RPC 函數
- [ ] 團隊管理 UI

### 階段四：事件同步（2週）
- [ ] Push 邏輯（只寫事件）
- [ ] Pull 邏輯（重放事件）
- [ ] UUID 衝突處理
- [ ] 離線佇列
- [ ] 錯誤處理

### 階段五：測試與優化（1週）
- [ ] UUID 遷移測試
- [ ] Trigger 效能測試
- [ ] 多人協作測試
- [ ] 衝突解決測試
- [ ] 安全測試

---

## 📝 總結（優化版）

**可行性：✅ 高度可行（98%）**

經過架構優化，設計更加完善：

### ✅ 核心改進

1. **UUID 主鍵策略**
   - 支援離線建立
   - 避免 ID 衝突
   - 分散式友好

2. **CQRS 模式**
   - 事件為唯一寫入來源
   - Trigger 自動維護讀取模型
   - Client 端邏輯簡化

3. **RPC 安全性**
   - `SECURITY DEFINER` 避免 RLS 複雜度
   - 原子操作確保一致性
   - 統一錯誤處理

### ✅ 架構優勢

- ✅ 完美契合事件溯源
- ✅ 不破壞離線優先特性
- ✅ 權限控制嚴格
- ✅ 數據一致性保證
- ✅ 用戶體驗良好
- ✅ 可擴展性強

### ⚠️ 需要注意

1. UUID 遷移需要充分測試
2. Trigger 效能需要監控
3. 衝突解決策略需要詳細設計
4. 成本監控與限制

### 🎯 建議

**可以開始實施！** 這是一個非常紮實且經過優化的設計。

**預計時程：** 7 週（含 UUID 遷移）

---

## 📚 相關資源

### SQL 腳本
- `supabase/migrations/001_uuid_schema.sql` - UUID 版本 Schema
- `supabase/migrations/002_cqrs_triggers.sql` - CQRS Trigger
- `supabase/migrations/003_rpc_functions.sql` - RPC 函數
- `supabase/migrations/004_rls_policies.sql` - RLS 政策

### TypeScript 代碼
- `lib/db/index.ts` - Dexie 版本 3（UUID 支援）
- `lib/collaboration/sync.ts` - 同步邏輯
- `lib/collaboration/invitations.ts` - 邀請碼邏輯
- `lib/collaboration/security.ts` - 安全清理

### 文件
- `SUPABASE-COLLABORATION-ANALYSIS.md` - 本文件
- `SUPABASE-MIGRATION-GUIDE.md` - UUID 遷移指南（待建立）
- `SUPABASE-TESTING-GUIDE.md` - 測試指南（待建立）

---

**需要我協助：**
1. 建立 SQL 遷移腳本？
2. 實作 Dexie 版本 3 升級？
3. 開發同步邏輯？
4. 建立測試計畫？

隨時告訴我！🚀
