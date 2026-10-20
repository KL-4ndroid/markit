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
COMMENT ON FUNCTION public.handle_new_user() IS '當新用戶註冊時，自動在 profiles 表創建記錄';

-- ==================== 完成 ====================
-- Auto Create Profile Trigger 創建完成
