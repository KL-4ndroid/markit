# 快速互動按鈕雲端同步功能

## 📋 功能概述

快速互動按鈕設定現在支援雲端同步！用戶在不同設備登入時，都能看到相同的按鈕設定。

## 🏗️ 架構設計

### 資料流向

```
用戶操作 → 本地儲存 (localStorage) → 雲端同步 (Supabase)
                                              ↓
登入時 ← 本地儲存 (localStorage) ← 雲端拉取 (Supabase)
```

### 儲存位置

1. **本地儲存（localStorage）**
   - 鍵名：`quick_action_buttons`
   - 格式：JSON 陣列
   - 用途：離線使用、快速讀取

2. **雲端儲存（Supabase）**
   - 表名：`user_settings`
   - 欄位：`quick_action_buttons` (JSONB)
   - 用途：跨設備同步

## 📁 檔案結構

```
supabase/
  └── migrations/
      └── 013_user_settings.sql          # 資料表定義

lib/
  ├── quick-actions-store.ts             # 本地儲存邏輯（已更新）
  └── supabase/
      ├── settings.ts                    # 雲端同步服務（新增）
      └── auth-context.tsx               # 登入時自動拉取（已更新）

app/
  └── settings/
      └── page.tsx                       # 設定頁面（已更新）
```

## 🔄 同步邏輯

### 1. 保存設定時

```typescript
// app/settings/page.tsx
const handleSave = async () => {
  // 1. 保存到本地
  // 2. 如果已登入，同步到雲端
  await saveQuickActionButtons(buttons, user?.id);
};
```

### 2. 登入時

```typescript
// lib/supabase/auth-context.tsx
const syncUserSettings = async (userId: string) => {
  // 1. 從雲端拉取設定
  const buttons = await pullQuickActionButtonsFromCloud(userId);
  
  // 2. 如果雲端沒有設定，初始化預設設定
  if (!buttons) {
    await initializeUserSettings(userId);
  }
};
```

### 3. 首次登入

當用戶首次登入時：
1. 檢查雲端是否有設定
2. 如果沒有，創建預設設定
3. 同步到本地

### 4. 切換設備

當用戶在新設備登入時：
1. 自動從雲端拉取設定
2. 覆蓋本地設定
3. 顯示同步成功提示

## 🔐 安全性

### Row Level Security (RLS)

```sql
-- 用戶只能查看自己的設定
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- 用戶只能更新自己的設定
CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);
```

## 📊 資料表結構

```sql
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  quick_action_buttons JSONB DEFAULT '[...]',
  theme TEXT DEFAULT 'auto',
  language TEXT DEFAULT 'zh-TW',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🎯 使用方式

### 未登入用戶

- ✅ 可以自訂按鈕
- ✅ 設定儲存在本地
- ❌ 無法跨設備同步

### 已登入用戶

- ✅ 可以自訂按鈕
- ✅ 設定儲存在本地
- ✅ 自動同步到雲端
- ✅ 跨設備同步

## 🚀 部署步驟

### 1. 執行 Migration

```bash
# 在 Supabase Dashboard 執行
supabase/migrations/013_user_settings.sql
```

### 2. 驗證 RLS 政策

確認 `user_settings` 表的 RLS 政策已啟用。

### 3. 測試流程

1. 登入帳號 A
2. 修改快速互動按鈕設定
3. 保存設定
4. 登出
5. 在另一個設備登入帳號 A
6. 確認設定已同步

## 🐛 故障排除

### 問題：設定沒有同步

**檢查項目：**
1. 用戶是否已登入？
2. Supabase 是否已配置？
3. RLS 政策是否正確？
4. 網路連線是否正常？

**解決方法：**
```typescript
// 手動觸發同步
import { pullQuickActionButtonsFromCloud } from '@/lib/quick-actions-store';
await pullQuickActionButtonsFromCloud(userId);
```

### 問題：本地和雲端設定不一致

**解決方法：**
1. 登出後重新登入（會自動拉取雲端設定）
2. 或手動清除本地設定：
```javascript
localStorage.removeItem('quick_action_buttons');
```

## 📈 未來擴展

`user_settings` 表可以儲存更多用戶設定：

- ✅ 快速互動按鈕（已實現）
- 🔜 主題設定（light/dark/auto）
- 🔜 語言設定
- 🔜 通知偏好
- 🔜 顯示偏好

## 💡 最佳實踐

1. **離線優先**：先保存到本地，再同步到雲端
2. **錯誤處理**：雲端同步失敗不影響本地使用
3. **自動同步**：登入時自動拉取，保存時自動上傳
4. **用戶提示**：明確告知用戶同步狀態

## 🎉 完成！

快速互動按鈕現在支援雲端同步，用戶體驗大幅提升！
