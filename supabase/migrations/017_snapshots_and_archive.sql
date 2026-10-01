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
COMMENT ON TABLE snapshots IS '用戶數據快照表，用於加速新設備同步';
COMMENT ON COLUMN snapshots.data IS '壓縮後的快照數據（JSONB格式）';
COMMENT ON COLUMN snapshots.event_count IS '此快照包含的事件數量';
COMMENT ON COLUMN snapshots.compression_ratio IS '壓縮比例（原始大小/壓縮後大小）';

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
COMMENT ON TABLE events_archive IS '歸檔事件表，存儲超過6個月的舊事件';
COMMENT ON COLUMN events_archive.archived_at IS '歸檔時間';

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
COMMENT ON FUNCTION get_latest_snapshot IS '獲取用戶最新的快照';
COMMENT ON FUNCTION cleanup_old_snapshots IS '清理舊快照，只保留最近2個';
