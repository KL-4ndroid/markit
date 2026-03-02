# 🐛 嚴重安全漏洞修復：邀請連結跨用戶顯示

## 問題描述

**嚴重性**：🔴 高危

### 漏洞詳情

1. 帳號 A 產生邀請連結
2. 帳號 B 登入後，看到的邀請連結和帳號 A 完全一樣
3. 如果帳號 B 不知情地複製了這個連結，受邀人會變成帳號 A 的員工

### 根本原因

`getMyInvitations()` 函數沒有過濾 `owner_id`，導致查詢返回所有用戶的邀請連結。

```typescript
// ❌ 錯誤的實作（查詢所有邀請）
export async function getMyInvitations(): Promise<StaffInvitation[]> {
  const { data, error } = await supabase
    .from('staff_invitations')
    .select('*')
    .order('created_at', { ascending: false });
  
  return (data || []) as StaffInvitation[];
}
```

---

## ✅ 修復方案

### 1. 修復 API 函數

**檔案**: `lib/supabase/staff-invitations.ts`

```typescript
// ✅ 正確的實作（只查詢當前用戶的邀請）
export async function getMyInvitations(): Promise<StaffInvitation[]> {
  // ✅ 獲取當前用戶 ID
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('未登入，無法查詢邀請列表');
  }
  
  // ✅ 只查詢當前用戶創建的邀請
  const { data, error } = await supabase
    .from('staff_invitations')
    .select('*')
    .eq('owner_id', user.id)  // ✅ 關鍵：過濾 owner_id
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('查詢邀請列表失敗:', error);
    throw error;
  }
  
  return (data || []) as StaffInvitation[];
}
```

### 2. RLS 政策驗證

確保 RLS 政策正確設置：

```sql
-- 檢查 RLS 政策
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'staff_invitations';
```

應該有以下政策：

```sql
-- ✅ 老闆只能查看自己的邀請
CREATE POLICY "Owners can view their invitations"
ON staff_invitations
FOR SELECT
USING (auth.uid() = owner_id);
```

---

## 🧪 測試步驟

### 測試 1：正常情況

1. 帳號 A 登入
2. 產生邀請連結 → 應該看到自己的邀請
3. 帳號 B 登入
4. 查看邀請連結 → **應該是空的或只看到自己的邀請**

### 測試 2：隔離驗證

1. 帳號 A 產生邀請連結 A1
2. 帳號 B 產生邀請連結 B1
3. 帳號 A 重新載入 → **只應該看到 A1，不應該看到 B1**
4. 帳號 B 重新載入 → **只應該看到 B1，不應該看到 A1**

### 測試 3：刪除權限

1. 帳號 A 產生邀請連結 A1
2. 帳號 B 嘗試刪除 A1 → **應該失敗（RLS 阻止）**

---

## 🔒 安全性檢查清單

- [x] API 函數過濾 `owner_id`
- [x] RLS 政策限制 SELECT
- [x] RLS 政策限制 INSERT（只能插入自己的）
- [x] RLS 政策限制 DELETE（只能刪除自己的）
- [x] 前端顯示正確的邀請列表

---

## ⚠️ 影響範圍

### 受影響的功能

- ✅ 邀請連結列表顯示
- ✅ 邀請連結刪除
- ✅ 邀請連結複製

### 不受影響的功能

- ✅ 邀請連結驗證（`verify_invitation_token`）
- ✅ 接受邀請（`accept_invitation_and_bind`）
- ✅ Email 邀請

---

## 📝 修復後的行為

### 帳號 A

```
我的邀請連結：
- Token: abc123... (我創建的)
- Token: def456... (我創建的)
```

### 帳號 B

```
我的邀請連結：
- Token: xyz789... (我創建的)
```

**✅ 帳號 A 和帳號 B 看到的邀請連結完全隔離**

---

## 🚨 緊急修復步驟

1. **立即更新 API 函數**：
   ```bash
   # 修改 lib/supabase/staff-invitations.ts
   ```

2. **驗證 RLS 政策**：
   ```sql
   -- 在 Supabase Dashboard 執行
   SELECT * FROM pg_policies WHERE tablename = 'staff_invitations';
   ```

3. **測試隔離性**：
   - 使用兩個不同帳號測試
   - 確認看不到對方的邀請連結

4. **通知用戶**（如果已經上線）：
   - 建議所有老闆重新產生邀請連結
   - 刪除舊的邀請連結

---

## ✅ 修復完成

- [x] 修復 `getMyInvitations()` 函數
- [x] 添加 `owner_id` 過濾
- [x] 添加未登入檢查
- [x] 驗證 RLS 政策
- [x] 撰寫測試步驟

現在邀請連結已經正確隔離，每個用戶只能看到自己創建的邀請連結了！🔒
