# 員工邀請拒絕後無法再次邀請 - Bug 修復報告

## 🐛 問題現象

### 實測結果

1. **使用者A（老闆）邀請使用者B成為員工**
   - ✅ 邀請成功發送
   - ✅ 使用者B收到邀請

2. **使用者B登入後點擊「拒絕」**
   - ✅ 拒絕成功
   - ✅ `staff_relationships` 表的 `status` 更新為 `revoked`

3. **使用者A嘗試再次邀請使用者B**
   - ❌ 顯示錯誤：「此用戶已經是您的員工」
   - ❌ 無法再次邀請
   - ❌ 使用者A沒有收到拒絕的通知

### 問題分析

**根本原因**：
1. ✅ 拒絕邀請時，`status` 正確更新為 `revoked`
2. ❌ 但是 `staff_relationships` 記錄仍然存在
3. ❌ 再次邀請時，檢查邏輯只檢查「是否存在記錄」，沒有檢查 `status`
4. ❌ 導致系統認為「此用戶已經是員工」

---

## 🔍 代碼分析

### 問題代碼 1：邀請檢查邏輯

**位置**：`components/settings/StaffManagement.tsx` - `handleInvite()` 函數

```typescript
// ❌ 錯誤：只檢查是否存在記錄，沒有檢查 status
// 檢查是否已經是員工
if (staffList.some(s => s.id === staffId)) {
  toast.error('此用戶已經是您的員工');
  return;
}
```

**問題**：
- `staffList` 包含 `pending` 和 `active` 狀態的員工
- 但是沒有檢查 `revoked` 狀態
- 如果員工拒絕邀請（`status = 'revoked'`），記錄仍然存在於資料庫
- 再次邀請時，資料庫會因為 unique constraint 而失敗

### 問題代碼 2：載入員工列表邏輯

**位置**：`components/settings/StaffManagement.tsx` - `loadStaffList()` 函數

```typescript
// ✅ 正確：只載入 pending 和 active 狀態的員工
const { data: relationships, error: relError } = await supabase
  .from('staff_relationships')
  .select('staff_id, status, permissions, created_at')
  .eq('owner_id', user.id)
  .in('status', ['pending', 'active']); // ✅ 不包含 revoked
```

**問題**：
- 載入列表時，正確地只顯示 `pending` 和 `active` 狀態
- 但是 `revoked` 狀態的記錄仍然存在於資料庫
- 導致再次邀請時，資料庫 unique constraint 衝突

### 問題代碼 3：資料庫 Unique Constraint

**位置**：Supabase 資料庫 - `staff_relationships` 表

```sql
-- 假設的 unique constraint
UNIQUE (owner_id, staff_id)
```

**問題**：
- 這個 constraint 防止同一個老闆邀請同一個員工多次
- 但是當員工拒絕邀請後，記錄仍然存在
- 導致無法再次邀請

---

## 🔧 修復方案

### 方案 1：拒絕邀請時刪除記錄（推薦）

**優點**：
- ✅ 最簡單、最直觀
- ✅ 不需要修改邀請邏輯
- ✅ 資料庫更乾淨

**缺點**：
- ❌ 無法保留拒絕歷史記錄

**實作**：修改 `StaffInvitationDialog.tsx` 的 `handleReject()` 函數

```typescript
// 拒絕邀請
const handleReject = async () => {
  if (!user || !invitation) return;

  const confirmed = confirm(
    '確定要拒絕邀請嗎？\n\n' +
    '拒絕後，您將繼續使用原有身份。'
  );

  if (!confirmed) return;

  setIsProcessing(true);

  try {
    toast.loading('正在處理...', { id: 'reject-invitation' });

    // ✅ 直接刪除記錄（而不是更新 status）
    const { error } = await supabase
      .from('staff_relationships')
      .delete()
      .eq('id', invitation.id);

    if (error) throw error;

    toast.success('✅ 已拒絕邀請', { id: 'reject-invitation' });

    // 關閉對話框
    setIsOpen(false);
    setInvitation(null);

  } catch (error: any) {
    console.error('拒絕邀請失敗:', error);
    toast.error('拒絕邀請失敗：' + error.message, { id: 'reject-invitation' });
  } finally {
    setIsProcessing(false);
  }
};
```

---

### 方案 2：再次邀請時刪除舊記錄（備用）

**優點**：
- ✅ 可以保留拒絕歷史記錄
- ✅ 允許再次邀請

**缺點**：
- ❌ 邏輯較複雜
- ❌ 需要修改邀請邏輯

**實作**：修改 `StaffManagement.tsx` 的 `handleInvite()` 函數

```typescript
// 邀請員工
const handleInvite = async () => {
  if (!user) return;
  if (!inviteEmail.trim()) {
    toast.error('請輸入員工的 email');
    return;
  }

  setIsInviting(true);

  try {
    // 1. 檢查 email 是否存在
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', inviteEmail.trim().toLowerCase());

    if (profileError) throw profileError;

    if (!profiles || profiles.length === 0) {
      toast.error('找不到此 email 的用戶，請確認對方已註冊');
      return;
    }

    const staffId = profiles[0].id;
    const staffEmail = profiles[0].email;

    // ✅ 檢查是否已經是 active 或 pending 狀態的員工
    const activeStaff = staffList.find(s => s.id === staffId);
    if (activeStaff) {
      if (activeStaff.status === 'pending') {
        toast.error('已經向此用戶發送邀請，請等待對方接受');
      } else {
        toast.error('此用戶已經是您的員工');
      }
      return;
    }

    // ✅ 檢查是否有 revoked 狀態的記錄
    const { data: revokedRelations, error: revokedError } = await supabase
      .from('staff_relationships')
      .select('id')
      .eq('owner_id', user.id)
      .eq('staff_id', staffId)
      .eq('status', 'revoked');

    if (revokedError) throw revokedError;

    // ✅ 如果有 revoked 記錄，先刪除
    if (revokedRelations && revokedRelations.length > 0) {
      console.log('發現已拒絕的邀請記錄，正在刪除...');
      
      const { error: deleteError } = await supabase
        .from('staff_relationships')
        .delete()
        .eq('owner_id', user.id)
        .eq('staff_id', staffId)
        .eq('status', 'revoked');

      if (deleteError) throw deleteError;
      
      console.log('✅ 已刪除舊的邀請記錄');
    }

    // 2. 創建員工關係（staff_relationships）
    const permissions = {
      can_view: true,
      can_edit: invitePermission === 'edit',
    };

    const { error: relError } = await supabase
      .from('staff_relationships')
      .insert({
        owner_id: user.id,
        staff_id: staffId,
        staff_email: staffEmail,
        status: 'pending',
        permissions,
      });

    if (relError) {
      if (relError.code === '23505') {
        toast.error('此用戶已經是您的員工');
        return;
      }
      throw relError;
    }

    toast.success(`✅ 已發送邀請給 ${inviteEmail}，等待對方接受`);
    
    // 重新載入列表
    await loadStaffList();
    
    // 關閉對話框
    setShowInviteDialog(false);
    setInviteEmail('');
    setInvitePermission('view');

  } catch (error: any) {
    console.error('邀請員工失敗:', error);
    toast.error('邀請失敗：' + error.message);
  } finally {
    setIsInviting(false);
  }
};
```

---

### 方案 3：修改資料庫 Unique Constraint（不推薦）

**優點**：
- ✅ 可以保留完整的歷史記錄
- ✅ 允許多次邀請

**缺點**：
- ❌ 需要修改資料庫結構
- ❌ 可能產生大量重複記錄
- ❌ 查詢邏輯變複雜

**實作**：修改 Supabase 資料庫

```sql
-- 1. 刪除舊的 unique constraint
ALTER TABLE staff_relationships
DROP CONSTRAINT IF EXISTS staff_relationships_owner_id_staff_id_key;

-- 2. 創建新的 unique constraint（只對 active 和 pending 狀態生效）
CREATE UNIQUE INDEX staff_relationships_active_unique
ON staff_relationships (owner_id, staff_id)
WHERE status IN ('active', 'pending');
```

---

## 📊 方案對比

| 方案 | 實作難度 | 資料完整性 | 推薦度 | 說明 |
|------|----------|-----------|--------|------|
| 方案 1：拒絕時刪除記錄 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 最簡單，最直觀 |
| 方案 2：再次邀請時刪除舊記錄 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 保留歷史，邏輯較複雜 |
| 方案 3：修改資料庫結構 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | 最複雜，不推薦 |

---

## 🎯 推薦實作：方案 1（拒絕時刪除記錄）

### 為什麼選擇方案 1？

1. ✅ **最簡單**：只需要修改一個函數
2. ✅ **最直觀**：拒絕邀請 = 刪除記錄
3. ✅ **最乾淨**：資料庫不會累積無用的記錄
4. ✅ **最安全**：不需要修改資料庫結構

### 完整的修復代碼

**檔案**：`components/staff/StaffInvitationDialog.tsx`

**修改**：`handleReject()` 函數

```typescript
// 拒絕邀請
const handleReject = async () => {
  if (!user || !invitation) return;

  const confirmed = confirm(
    '確定要拒絕邀請嗎？\n\n' +
    '拒絕後，您將繼續使用原有身份。'
  );

  if (!confirmed) return;

  setIsProcessing(true);

  try {
    toast.loading('正在處理...', { id: 'reject-invitation' });

    // ✅ 直接刪除記錄（而不是更新 status 為 revoked）
    const { error } = await supabase
      .from('staff_relationships')
      .delete()
      .eq('id', invitation.id);

    if (error) throw error;

    toast.success('✅ 已拒絕邀請', { id: 'reject-invitation' });

    // 關閉對話框
    setIsOpen(false);
    setInvitation(null);

  } catch (error: any) {
    console.error('拒絕邀請失敗:', error);
    toast.error('拒絕邀請失敗：' + error.message, { id: 'reject-invitation' });
  } finally {
    setIsProcessing(false);
  }
};
```

---

## 🔄 額外改進：顯示拒絕通知（可選）

### 問題

使用者A（老闆）沒有收到使用者B拒絕邀請的通知。

### 解決方案

**選項 1：即時通知（需要 Supabase Realtime）**

```typescript
// 在 StaffManagement.tsx 中監聽 staff_relationships 變化
useEffect(() => {
  if (!user) return;

  const channel = supabase
    .channel('staff_relationships_changes')
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'staff_relationships',
        filter: `owner_id=eq.${user.id}`,
      },
      (payload) => {
        console.log('員工關係已刪除:', payload);
        toast.info('員工已拒絕邀請');
        loadStaffList();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);
```

**選項 2：輪詢檢查（簡單但不即時）**

```typescript
// 在 StaffManagement.tsx 中定期檢查
useEffect(() => {
  if (!user) return;

  const interval = setInterval(() => {
    loadStaffList();
  }, 30000); // 每 30 秒檢查一次

  return () => clearInterval(interval);
}, [user]);
```

**選項 3：手動刷新（最簡單）**

在 `StaffManagement.tsx` 中添加刷新按鈕：

```typescript
<button
  onClick={loadStaffList}
  className="p-2 rounded-xl bg-[#FAFAF8] hover:bg-[#F0F0EE] transition-colors"
  title="刷新列表"
>
  <RotateCcw className="w-4 h-4 text-[#7B9FA6]" />
</button>
```

---

## 🧪 測試計劃

### 測試 1：拒絕邀請後刪除記錄

**步驟**：
1. 使用者A邀請使用者B
2. 使用者B登入，點擊「拒絕」
3. 檢查 Supabase Dashboard 的 `staff_relationships` 表
4. **驗證**：記錄已被刪除（不是 `status = 'revoked'`）

**預期結果**：
- ✅ 記錄已完全刪除
- ✅ 使用者B繼續使用原有身份

### 測試 2：再次邀請

**步驟**：
1. 使用者A再次邀請使用者B
2. **驗證**：邀請成功發送

**預期結果**：
- ✅ 沒有「此用戶已經是您的員工」錯誤
- ✅ 使用者B再次收到邀請

### 測試 3：接受邀請（回歸測試）

**步驟**：
1. 使用者A邀請使用者B
2. 使用者B登入，點擊「接受」
3. **驗證**：成功成為員工

**預期結果**：
- ✅ 接受邀請功能仍然正常

---

## 📝 總結

### 問題根源

✅ **你的分析完全正確**：
- 拒絕邀請時，只更新 `status` 為 `revoked`，記錄仍然存在
- 再次邀請時，資料庫 unique constraint 衝突
- 老闆沒有收到拒絕通知

### 解決方案

✅ **推薦使用方案 1**：拒絕邀請時直接刪除記錄

**關鍵修改**：
```typescript
// ❌ 舊代碼：更新 status
const { error } = await supabase
  .from('staff_relationships')
  .update({ status: 'revoked' })
  .eq('id', invitation.id);

// ✅ 新代碼：直接刪除
const { error } = await supabase
  .from('staff_relationships')
  .delete()
  .eq('id', invitation.id);
```

### 預期效果

修復後：
- ✅ 員工拒絕邀請後，記錄被刪除
- ✅ 老闆可以再次邀請同一個員工
- ✅ 資料庫更乾淨，沒有無用的記錄

### 額外改進（可選）

- 💡 添加即時通知（Supabase Realtime）
- 💡 添加刷新按鈕
- 💡 添加邀請歷史記錄頁面

---

**報告完成時間**：2026-02-26  
**問題類型**：🐛 邏輯錯誤（拒絕邀請後無法再次邀請）  
**嚴重度**：🟡 中（影響用戶體驗）  
**建議優先級**：🟡 高（應盡快修復）
