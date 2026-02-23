# Phase C 測試指南 - UI 組件權限顯示

## 🎯 測試目標

驗證 UI 組件正確顯示權限信息，並根據權限控制敏感數據的顯示。

---

## ✅ 當前狀態檢查

### 已實現的組件

1. **MarketCard** (`components/markets/MarketCard.tsx`)
   - ✅ 顯示員工模式標籤
   - ✅ 根據權限隱藏利潤數據
   - ✅ 使用 `useStaffPermissions` hook

2. **ProductCard** (`components/products/ProductCard.tsx`)
   - ✅ 顯示員工模式標籤
   - ✅ 根據權限隱藏成本和利潤率
   - ✅ 使用 `useStaffPermissions` hook

3. **useStaffPermissions** (`hooks/useStaffPermissions.ts`)
   - ✅ 提供權限檢查函數
   - ✅ 支援 owner/staff 角色判斷
   - ✅ 支援敏感數據查看權限

---

## 🧪 測試流程

### 測試 1：老闆模式（預設）

**目的**：確認老闆可以看到所有數據

**步驟**：
1. 確保員工模式已關閉：
```javascript
localStorage.removeItem('feature_staff_mode');
location.reload();
```

2. 查看市集列表頁面（`/markets`）
3. 查看商品列表頁面（`/products`）

**預期結果**：
- ✅ 市集卡片顯示「淨利潤」
- ✅ 商品卡片顯示「成本」和「利潤率」
- ✅ 沒有「員工模式」標籤
- ✅ 所有數據正常顯示

---

### 測試 2：員工模式（自己的市集）

**目的**：確認自己創建的市集仍然顯示為老闆

**步驟**：
1. 啟用員工模式：
```javascript
localStorage.setItem('feature_staff_mode', 'true');
location.reload();
```

2. 等待同步完成（約 5-10 秒）
3. 查看市集列表頁面
4. 查看商品列表頁面

**預期結果**：
- ✅ 自己創建的市集：
  - 顯示「淨利潤」
  - 沒有「員工模式」標籤
  - `access_type: "owner"`
- ✅ 自己創建的商品：
  - 顯示「成本」和「利潤率」
  - 沒有「員工模式」標籤
  - `access_type: "owner"`

---

### 測試 3：員工模式（被邀請的市集）

**前置條件**：需要有另一個帳號邀請你成為員工

**步驟**：
1. 確保員工模式已啟用
2. 查看市集列表（應該包含被邀請的市集）
3. 查看商品列表（應該包含該市集的商品）

**預期結果**：
- ✅ 被邀請的市集：
  - 顯示「員工模式」標籤（綠色，帶 Shield 圖標）
  - **不顯示**「淨利潤」（敏感數據）
  - 顯示「收入」（公開數據）
  - `access_type: "staff"`
- ✅ 該市集的商品：
  - 顯示「員工」標籤（綠色，帶 Shield 圖標）
  - **不顯示**「成本」和「利潤率」（敏感數據）
  - 顯示「價格」（公開數據）
  - `access_type: "staff"`

---

## 📋 Phase C 總結

### ✅ 已完成的功能

1. **UI 組件已支援員工模式**
   - `MarketCard` 顯示員工標籤並隱藏敏感數據
   - `ProductCard` 顯示員工標籤並隱藏敏感數據
   - 使用統一的 `useStaffPermissions` hook

2. **權限檢查邏輯**
   - 區分 owner/staff 角色
   - 控制敏感數據顯示
   - 向後兼容（沒有權限欄位時正常顯示）

3. **視覺設計**
   - 員工標籤使用柔和的綠色
   - Shield 圖標清晰標識
   - 符合日系設計風格

---

## 🎊 Phase A + B + C 完成！

恭喜！員工模式的核心功能已經全部實現：

- ✅ **Phase A**：數據庫 Schema 擴展
- ✅ **Phase B**：Supabase 視圖和同步邏輯
- ✅ **Phase C**：UI 組件權限顯示

---

## 🧪 快速測試

由於目前只有一個帳號，我們可以進行以下測試：

### 測試 1：確認老闆模式正常

```javascript
// 關閉員工模式
localStorage.removeItem('feature_staff_mode');
location.reload();
```

查看市集和商品頁面，確認：
- ✅ 顯示所有數據（利潤、成本、利潤率）
- ✅ 沒有員工標籤

### 測試 2：確認員工模式不影響自己的數據

```javascript
// 啟用員工模式
localStorage.setItem('feature_staff_mode', 'true');
location.reload();
```

查看市集和商品頁面，確認：
- ✅ 自己的市集/商品仍然顯示所有數據
- ✅ 沒有員工標籤（因為 `access_type: "owner"`）

### 測試 3：檢查權限欄位

```javascript
// 檢查數據庫
const request = indexedDB.open('MarketPulseDB');
request.onsuccess = function(event) {
  const db = event.target.result;
  const tx = db.transaction(['markets'], 'readonly');
  const store = tx.objectStore('markets');
  const req = store.getAll();
  req.onsuccess = function() {
    console.log('市集權限:', req.result[0]);
  };
};
```

確認：
- ✅ `access_type: "owner"`
- ✅ `permissions: {can_view: true, can_edit: true}`
- ✅ `relationship_owner_id` 存在

---

## 📝 測試報告模板

請執行上述測試並填寫：

**測試 1（老闆模式）**：
- [ ] 市集顯示利潤
- [ ] 商品顯示成本和利潤率
- [ ] 沒有員工標籤

**測試 2（員工模式 - 自己的數據）**：
- [ ] 市集顯示利潤
- [ ] 商品顯示成本和利潤率
- [ ] 沒有員工標籤

**測試 3（權限欄位）**：
- [ ] `access_type` 正確
- [ ] `permissions` 正確
- [ ] `relationship_owner_id` 存在

**遇到的問題**：
- （如果有問題，請描述）

---

**準備好測試了嗎？** 🚀
