# 員工權限系統更新報告

## 📋 更新概要

根據需求，已將員工權限系統從「兩級權限」簡化為「固定權限」，所有員工擁有相同的權限。

---

## ✅ 更新內容

### 1. **移除權限選擇功能**

#### 修改檔案：`components/settings/StaffManagement.tsx`

**變更前：**
- 邀請員工時可以選擇「僅查看」或「可編輯」
- 使用 radio button 選擇權限

**變更後：**
- 移除權限選擇 UI
- 所有員工固定權限：`can_view: true, can_edit: false`
- 顯示固定權限說明卡片

```typescript
// ✅ 固定權限：所有員工都可以查看和記錄互動/成交，但不能編輯
const permissions = {
  can_view: true,
  can_edit: false,  // ✅ 固定為 false，員工不能編輯
};
```

---

### 2. **更新權限說明文字**

#### 修改檔案：
- `components/settings/StaffManagement.tsx`
- `components/staff/StaffInvitationDialog.tsx`
- `components/staff/StaffPermissionCard.tsx`

**新的權限說明：**

✅ **員工可以做的事：**
- 查看市集和商品
- 記錄互動
- 記錄成交

❌ **員工不能做的事：**
- 編輯商品
- 編輯市集
- 新增商品
- 新增市集

🔒 **敏感數據保護：**
- 商品成本
- 利潤
- 總收入

---

### 3. **簡化 useUserRole Hook**

#### 修改檔案：`hooks/useUserRole.ts`

**變更前：**
```typescript
canEdit: userRole.isStaff ? (userRole.permissions?.can_edit ?? false) : true,
```

**變更後：**
```typescript
canEdit: !userRole.isStaff, // ✅ 只有老闆可以編輯，員工固定不能編輯
```

---

### 4. **更新員工列表顯示**

#### 修改檔案：`components/settings/StaffManagement.tsx`

**變更前：**
- 顯示「可編輯」或「僅查看」

**變更後：**
- 統一顯示「可查看與記錄」

---

### 5. **更新權限卡片**

#### 修改檔案：`components/staff/StaffPermissionCard.tsx`

**變更前：**
- 根據 `can_edit` 動態顯示權限

**變更後：**
- 固定顯示所有員工的權限列表

```typescript
const permissionList: Permission[] = [
  { label: '查看市集和商品', allowed: true },
  { label: '記錄互動和成交', allowed: true },
  { label: '編輯商品資訊', allowed: false },
  { label: '新增商品', allowed: false },
  { label: '編輯市集資訊', allowed: false },
  { label: '新增市集', allowed: false },
  { label: '查看成本和利潤', allowed: false },
  { label: '管理員工', allowed: false },
];
```

---

## 🔒 現有的權限控制（已實作）

### 1. **新增商品按鈕隱藏**
- 檔案：`app/products/page.tsx`
- 實作：`{!isStaff && <Plus button />}`

### 2. **新增市集按鈕隱藏**
- 檔案：`app/markets/page.tsx`
- 實作：`{!isStaff && <Plus button />}`

### 3. **編輯按鈕隱藏**
- 檔案：`app/markets/[id]/page.tsx`
- 實作：`{!isStaff && <Edit button />}`

### 4. **商品卡片編輯禁用**
- 檔案：`components/products/ProductCard.tsx`
- 實作：使用 `useStaffPermissions` hook 檢查權限

### 5. **敏感數據隱藏**
- 檔案：`lib/data-sanitization.ts`
- 實作：自動過濾成本、利潤等敏感數據

### 6. **員工專屬視圖**
- 檔案：`components/markets/StaffMarketDetailView.tsx`
- 實作：簡化版市集詳情，隱藏編輯功能

---

## 📊 權限對比表

| 功能 | 老闆 | 員工（舊版-僅查看） | 員工（舊版-可編輯） | 員工（新版-固定） |
|------|------|-------------------|-------------------|------------------|
| 查看市集 | ✅ | ✅ | ✅ | ✅ |
| 查看商品 | ✅ | ✅ | ✅ | ✅ |
| 記錄互動 | ✅ | ❌ | ✅ | ✅ |
| 記錄成交 | ✅ | ❌ | ✅ | ✅ |
| 編輯商品 | ✅ | ❌ | ✅ | ❌ |
| 新增商品 | ✅ | ❌ | ❌ | ❌ |
| 編輯市集 | ✅ | ❌ | ❌ | ❌ |
| 新增市集 | ✅ | ❌ | ❌ | ❌ |
| 查看成本 | ✅ | ❌ | ❌ | ❌ |
| 查看利潤 | ✅ | ❌ | ❌ | ❌ |
| 管理員工 | ✅ | ❌ | ❌ | ❌ |

---

## 🎯 更新後的使用流程

### 老闆邀請員工

1. 進入「設定」→「員工管理」
2. 點擊「邀請員工」
3. 輸入員工 Email
4. 查看固定權限說明（不需選擇）
5. 點擊「確認邀請」

### 員工接受邀請

1. 登入後看到邀請對話框
2. 查看權限說明：
   - ✅ 可以查看市集和商品
   - ✅ 可以記錄互動、成交
   - ❌ 不能編輯商品、市集
   - ❌ 不能新增商品、市集
   - ❌ 無法查看成本、利潤
3. 閱讀警告提示
4. 選擇「接受邀請」或「拒絕邀請」

### 員工日常使用

1. **可以做的事：**
   - 查看所有進行中的市集
   - 查看所有商品
   - 在營業中的市集記錄互動
   - 在營業中的市集記錄成交

2. **不能做的事：**
   - 看不到「新增商品」按鈕
   - 看不到「新增市集」按鈕
   - 看不到「編輯」按鈕
   - 點擊商品卡片不會進入編輯模式
   - 看不到成本、利潤等敏感數據

---

## 🔧 技術實作細節

### 資料庫結構（未變更）

```sql
-- staff_relationships 表
CREATE TABLE staff_relationships (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  staff_email TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending' | 'active' | 'revoked'
  permissions JSONB NOT NULL, -- { can_view: true, can_edit: false }
  created_at TIMESTAMP,
  accepted_at TIMESTAMP
);
```

**注意：** 雖然資料庫仍保留 `permissions` 欄位，但前端固定設置為：
```json
{
  "can_view": true,
  "can_edit": false
}
```

### 權限檢查邏輯

```typescript
// hooks/useUserRole.ts
export function useUserRole() {
  return {
    userRole,
    isLoading,
    isStaff: userRole.isStaff,
    isOwner: !userRole.isStaff,
    canEdit: !userRole.isStaff, // ✅ 簡化：只有老闆可以編輯
    canViewSensitiveData: !userRole.isStaff,
  };
}
```

### UI 條件渲染

```tsx
// 新增按鈕
{!isStaff && (
  <button onClick={handleOpenForm}>
    <Plus />
  </button>
)}

// 編輯按鈕
{!isStaff && (
  <button onClick={handleEdit}>
    <Edit />
  </button>
)}

// 敏感數據
{canViewSensitiveData && (
  <div>成本：{formatCurrency(cost)}</div>
)}
```

---

## ✅ 測試檢查清單

### 老闆端測試

- [ ] 可以邀請員工
- [ ] 邀請時看到固定權限說明
- [ ] 可以移除員工
- [ ] 員工列表顯示「可查看與記錄」

### 員工端測試

- [ ] 登入後看到邀請對話框
- [ ] 對話框顯示固定權限說明
- [ ] 接受邀請後本地數據被清除
- [ ] 可以查看市集列表
- [ ] 可以查看商品列表
- [ ] 看不到「新增市集」按鈕
- [ ] 看不到「新增商品」按鈕
- [ ] 看不到「編輯」按鈕
- [ ] 可以記錄互動
- [ ] 可以記錄成交
- [ ] 看不到商品成本
- [ ] 看不到利潤數據
- [ ] 看不到總收入

### 權限卡片測試

- [ ] 設定頁面顯示正確的權限列表
- [ ] 8 項權限顯示正確（2 個 ✅，6 個 ❌）

---

## 🐛 已知問題修復

### 問題：員工「僅查看」權限仍可記錄互動和成交

**原因：**
- 市集詳情頁面沒有檢查 `can_edit` 權限
- 互動按鈕和快速交易功能沒有權限控制

**解決方案：**
- 簡化權限系統，所有員工固定可以記錄互動和成交
- 移除「僅查看」權限選項
- 統一員工權限為「可查看與記錄」

---

## 📝 未來擴展建議

### 1. 如果需要恢復多級權限

可以在邀請時添加權限選擇，並在各功能點檢查 `canEdit`：

```typescript
// 記錄互動按鈕
{canEdit && <InteractionButtons />}

// 記錄成交按鈕
{canEdit && <QuickTransactionGrid />}
```

### 2. 更細緻的權限控制

可以擴展 `permissions` 欄位：

```json
{
  "can_view": true,
  "can_edit": false,
  "can_record_interaction": true,
  "can_record_deal": true,
  "can_view_cost": false,
  "can_view_profit": false
}
```

### 3. 權限模板

可以預設幾種權限模板：
- 「僅查看」：只能查看，不能操作
- 「記錄員」：可以記錄互動和成交
- 「管理員」：可以編輯商品和市集

---

## 📚 相關文檔

- [員工管理功能說明](./STAFF_MANAGEMENT_GUIDE.md)
- [數據過濾系統](./lib/data-sanitization.ts)
- [權限檢查 Hook](./hooks/useUserRole.ts)
- [員工權限 Hook](./hooks/useStaffPermissions.ts)

---

**更新日期：** 2025-02-27  
**更新人員：** AI Assistant  
**版本：** v2.0 - 簡化權限系統
