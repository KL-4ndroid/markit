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
COMMENT ON CONSTRAINT events_type_check ON events IS '事件類型檢查約束（包含刪除事件類型）';

-- ==================== 完成 ====================
-- Migration 完成
-- 新增事件類型：
-- - interaction_deleted: 刪除互動記錄
-- - deal_deleted: 刪除成交記錄
-- - market_updated: 市集更新（補充）
-- - market_deleted: 市集刪除（補充）
-- - settings_updated: 設定更新（補充）
