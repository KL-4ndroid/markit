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

COMMENT ON COLUMN markets.is_collaborative IS '是否為協作市集（多人共享）';
COMMENT ON COLUMN markets.operation_phase IS '營業階段（early_entry, check_in, operating, closing）';

-- ==================== 完成 ====================
-- 缺少的欄位已添加
