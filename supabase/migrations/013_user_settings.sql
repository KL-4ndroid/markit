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
COMMENT ON TABLE user_settings IS '用戶個人化設定表';
COMMENT ON COLUMN user_settings.quick_action_buttons IS '快速互動按鈕設定（JSON 陣列）';
COMMENT ON COLUMN user_settings.theme IS '主題設定（light/dark/auto）';
COMMENT ON COLUMN user_settings.language IS '語言設定';

-- ==================== 完成 ====================
-- User Settings 表創建完成
