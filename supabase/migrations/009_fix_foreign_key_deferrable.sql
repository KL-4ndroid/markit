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
