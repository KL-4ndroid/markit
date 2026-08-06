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
COMMENT ON CONSTRAINT events_type_check ON events IS '限制事件類型為預定義的類型列表';

-- ==================== 完成 ====================
-- Migration 019 完成
-- 現在可以記錄 market_updated 事件了
