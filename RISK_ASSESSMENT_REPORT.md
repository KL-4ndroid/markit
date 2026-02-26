# 修復方案風險評估與影響分析報告

## 📋 修復計劃概覽

### 修復順序
1. ✅ 修改 `handleLeaveTeam()` 函數（方案 1）
2. ✅ 修改 `handlePermissionRevoked()` 函數
3. ✅ 修改 `handleSignOut()` 函數
4. ✅ 重構 `handleLeaveTeam()` 使用方案 2

---

## 🔍 深度影響分析

### 修復 1：`handleLeaveTeam()` 函數

#### 📍 修改位置
- **檔案**：`app/settings/page.tsx`
- **函數**：`handleLeaveTeam()`
- **影響範圍**：員工離開團隊流程

#### ✅ 安全性分析

**1. 數據庫操作安全性**

```typescript
// 新增的操作
const { db } = await import('@/lib/db');
await db.markets.clear();
await db.products.clear();
await db.events.clear();
await db.dailyStats.clear();
```

**風險評估**：✅ **安全**
- `db.markets.clear()` 等方法是 Dexie 的標準 API
- 已在 `lib/db/index.ts` 的 `clearAllData()` 函數中使用
- 不會影響其他用戶的數據（本地操作）
- 不會影響雲端數據

**2. localStorage 和 sessionStorage 清除**

```typescript
localStorage.clear();
sessionStorage.clear();
```

**風險評估**：⚠️ **需要注意**
- 會清除所有 localStorage 數據，包括：
  - 角色緩存 (`user_role_cache`)
  - 互動按鈕設定 (`interaction_buttons`)
  - 快速操作設定 (`quick_action_buttons`)
  - 其他應用設定

**潛在問題**：
- 用戶的個人設定會被清除
- 互動按鈕需要重新設定

**解決方案**：
```typescript
// ✅ 改進：只清除特定的緩存，保留用戶設定
const keysToRemove = [
  'user_role_cache',
  'logout_history',
  'hasCompletedInitialSync',
];

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
});

sessionStorage.clear(); // sessionStorage 可以全部清除
```

**3. 同步標記重置**

```typescript
const { resetInitialSyncFlag } = await import('@/hooks/useSync');
const { clearRoleCache } = await import('@/hooks/useUserRole');
resetInitialSyncFlag();
clearRoleCache();
```

**風險評估**：✅ **安全**
- `resetInitialSyncFlag()` 已在 `useSync.ts` 中定義
- `clearRoleCache()` 已在 `useUserRole.ts` 中定義
- 這些函數專門設計用於清除狀態

**4. 頁面重新載入**

```typescript
window.location.href = '/';
```

**風險評估**：✅ **安全**
- 使用 `href` 而不是 `reload()`，確保完全刷新
- 導向首頁，避免停留在設定頁面

#### ⚠️ 潛在問題

**問題 1：多標籤頁情況**

**場景**：
- 用戶在標籤頁 A 點擊「離開團隊」
- 標籤頁 B 仍然打開

**影響**：
- 標籤頁 B 的 IndexedDB 連接可能阻擋刪除
- 標籤頁 B 可能還顯示舊數據

**解決方案**：
```typescript
// ✅ 已在方案 1 中處理
// 先手動清除數據表，再刪除 IndexedDB
// 即使 IndexedDB 刪除被阻擋，數據表也已清空
```

**問題 2：錯誤處理**

**場景**：
- 步驟 1（刪除雲端關係）成功
- 步驟 2（刪除 market_members）失敗
- 步驟 3（清除本地數據）未執行

**影響**：
- 雲端已刪除關係，但本地數據還在
- 用戶處於「半離開」狀態

**解決方案**：
```typescript
// ✅ 已在方案 1 中處理
// 在 catch 區塊中，提示用戶清除本地數據
catch (error: any) {
  const shouldClearLocal = confirm(
    '離開團隊時發生錯誤，但建議清除本地數據以避免數據混亂。\n\n' +
    '是否清除本地數據並重新載入？'
  );
  
  if (shouldClearLocal) {
    // 強制清除本地數據
  }
}
```

#### 🎯 依賴關係檢查

**依賴的模組**：
1. ✅ `@/lib/db` - 已存在，導出 `db` 實例
2. ✅ `@/hooks/useSync` - 已存在，導出 `resetInitialSyncFlag()`
3. ✅ `@/hooks/useUserRole` - 已存在，導出 `clearRoleCache()`

**依賴的函數**：
1. ✅ `db.markets.clear()` - Dexie 標準 API
2. ✅ `db.products.clear()` - Dexie 標準 API
3. ✅ `db.events.clear()` - Dexie 標準 API
4. ✅ `db.dailyStats.clear()` - Dexie 標準 API

**結論**：✅ **所有依賴都存在，無需額外實作**

---

### 修復 2：`handlePermissionRevoked()` 函數

#### 📍 修改位置
- **檔案**：`hooks/useSync.ts`
- **函數**：`handlePermissionRevoked()`
- **影響範圍**：權限撤銷時的清除邏輯

#### ✅ 安全性分析

**1. 獲取當前用戶 ID**

```typescript
const { user } = await import('@/lib/supabase/auth-context').then(m => m.useAuth());
const currentUserId = user?.id;
```

**風險評估**：⚠️ **需要注意**
- 在 React Hook 外部調用 `useAuth()` 可能有問題
- `useAuth()` 是一個 React Hook，只能在組件內使用

**解決方案**：
```typescript
// ✅ 改進：直接從 Supabase 獲取用戶
const { data: { user } } = await supabase.auth.getUser();
const currentUserId = user?.id;
```

**2. 清除非自己擁有的數據**

```typescript
const allMarkets = await db.markets.toArray();
for (const market of allMarkets) {
  if (market.owner_id !== currentUserId) {
    // 刪除市集和相關數據
  }
}
```

**風險評估**：✅ **安全**
- 只刪除 `owner_id` 不等於當前用戶的市集
- 不會誤刪自己的市集

**3. 清除全局商品和事件**

```typescript
const allProducts = await db.products.toArray();
for (const product of allProducts) {
  if (product.owner_id !== currentUserId && !product.market_id) {
    // 刪除商品
  }
}
```

**風險評估**：✅ **安全**
- 只刪除非自己創建的全局商品（`!product.market_id`）
- 不會刪除市集內的商品（已在步驟 2 中刪除）

#### ⚠️ 潛在問題

**問題 1：在 Hook 外部調用 `useAuth()`**

**影響**：
- 可能導致 React Hook 規則錯誤
- 可能無法獲取用戶信息

**解決方案**：
```typescript
// ❌ 錯誤：在 Hook 外部調用 useAuth()
const { user } = await import('@/lib/supabase/auth-context').then(m => m.useAuth());

// ✅ 正確：直接從 Supabase 獲取用戶
import { supabase } from '@/lib/supabase/client';
const { data: { user } } = await supabase.auth.getUser();
```

**問題 2：性能問題**

**場景**：
- 用戶有大量數據（1000+ 市集、商品、事件）
- 需要遍歷所有數據

**影響**：
- 清除過程可能需要幾秒鐘
- 可能阻塞 UI

**解決方案**：
```typescript
// ✅ 使用 Dexie 的批次刪除，提升性能
await db.markets.where('owner_id').notEqual(currentUserId).delete();
await db.products.where('owner_id').notEqual(currentUserId).and(p => !p.market_id).delete();
```

#### 🎯 依賴關係檢查

**依賴的模組**：
1. ✅ `@/lib/supabase/client` - 已存在，導出 `supabase`
2. ✅ `@/lib/db` - 已存在，導出 `db` 實例

**結論**：✅ **所有依賴都存在，但需要修正 `useAuth()` 的調用方式**

---

### 修復 3：`handleSignOut()` 函數

#### 📍 修改位置
- **檔案**：`lib/supabase/auth-context.tsx`
- **函數**：`handleSignOut()`
- **影響範圍**：用戶登出流程

#### ✅ 安全性分析

**1. 手動清除數據表**

```typescript
const { db } = await import('@/lib/db');
await db.markets.clear();
await db.products.clear();
await db.events.clear();
await db.dailyStats.clear();
```

**風險評估**：✅ **安全**
- 在刪除 IndexedDB 之前先清除數據表
- 確保即使 IndexedDB 刪除失敗，數據也已清空

**2. 刪除 IndexedDB**

```typescript
const deleteRequest = window.indexedDB.deleteDatabase(dbName);
```

**風險評估**：✅ **安全**
- 已有的邏輯，只是增強了前置清除

**3. 清除緩存**

```typescript
localStorage.clear();
sessionStorage.clear();
```

**風險評估**：⚠️ **需要注意**
- 同樣的問題：會清除所有用戶設定

**解決方案**：
```typescript
// ✅ 改進：保留用戶設定
const keysToRemove = [
  'user_role_cache',
  'logout_history',
  'hasCompletedInitialSync',
];

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
});

// 互動按鈕設定和快速操作設定保留
// 用戶下次登入時仍可使用
```

#### ⚠️ 潛在問題

**問題 1：登出後重新登入**

**場景**：
- 用戶登出
- 立即重新登入

**影響**：
- 如果清除了互動按鈕設定，用戶需要重新設定
- 影響用戶體驗

**解決方案**：
```typescript
// ✅ 只清除與身份相關的緩存，保留用戶設定
```

**問題 2：員工登出後，老闆的數據**

**場景**：
- 員工登出
- 老闆的數據仍在雲端

**影響**：
- 無影響，這是正確的行為
- 員工登出只清除本地數據，不影響雲端

**結論**：✅ **這是預期行為**

#### 🎯 依賴關係檢查

**依賴的模組**：
1. ✅ `@/lib/db` - 已存在
2. ✅ `@/hooks/useSync` - 已存在
3. ✅ `@/hooks/useUserRole` - 已存在

**結論**：✅ **所有依賴都存在**

---

### 修復 4：重構 `handleLeaveTeam()` 使用方案 2

#### 📍 修改位置
- **檔案**：`app/settings/page.tsx`
- **函數**：`handleLeaveTeam()`
- **影響範圍**：重構後的離開團隊流程

#### ✅ 安全性分析

**1. 調用 `handlePermissionRevoked()`**

```typescript
const { handlePermissionRevoked } = await import('@/hooks/useSync');
await handlePermissionRevoked();
```

**風險評估**：✅ **安全**
- 重用現有的清除邏輯
- 避免重複實作

**前提條件**：
- ✅ 必須先完成修復 2（修改 `handlePermissionRevoked()` 函數）
- ✅ 確保 `handlePermissionRevoked()` 邏輯正確

#### ⚠️ 潛在問題

**問題 1：`handlePermissionRevoked()` 是否會自動重新載入頁面？**

**檢查**：
```typescript
// 在 handlePermissionRevoked() 中
if (typeof window !== 'undefined') {
  const { toast } = await import('sonner');
  toast.info('已清除協作數據，請重新載入');
  
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}
```

**結論**：✅ **會自動重新載入**

**問題 2：是否需要額外的錯誤處理？**

**建議**：
```typescript
try {
  await handlePermissionRevoked();
} catch (error) {
  console.error('清除數據失敗:', error);
  // 即使失敗，也強制重新載入
  window.location.href = '/';
}
```

#### 🎯 依賴關係檢查

**依賴的函數**：
1. ✅ `handlePermissionRevoked()` - 需要先完成修復 2

**結論**：✅ **依賴關係清晰，但需要按順序執行**

---

## 🚨 關鍵風險總結

### 🔴 高風險（必須處理）

#### 風險 1：在 Hook 外部調用 `useAuth()`

**位置**：`handlePermissionRevoked()` 函數

**問題**：
```typescript
// ❌ 錯誤
const { user } = await import('@/lib/supabase/auth-context').then(m => m.useAuth());
```

**解決方案**：
```typescript
// ✅ 正確
import { supabase } from '@/lib/supabase/client';
const { data: { user } } = await supabase.auth.getUser();
```

**影響**：如果不修正，可能導致無法獲取用戶 ID，清除邏輯失敗

---

### 🟠 中風險（建議處理）

#### 風險 2：清除所有 localStorage

**位置**：`handleLeaveTeam()` 和 `handleSignOut()` 函數

**問題**：
```typescript
localStorage.clear(); // 會清除所有用戶設定
```

**解決方案**：
```typescript
// ✅ 只清除特定的緩存
const keysToRemove = [
  'user_role_cache',
  'logout_history',
  'hasCompletedInitialSync',
];

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
});
```

**影響**：如果不修正，用戶的互動按鈕設定會被清除，需要重新設定

---

### 🟡 低風險（可選處理）

#### 風險 3：性能問題

**位置**：`handlePermissionRevoked()` 函數

**問題**：
```typescript
// 遍歷所有數據，可能較慢
const allMarkets = await db.markets.toArray();
for (const market of allMarkets) {
  if (market.owner_id !== currentUserId) {
    await db.markets.delete(market.id);
  }
}
```

**解決方案**：
```typescript
// ✅ 使用 Dexie 的批次刪除
await db.markets.where('owner_id').notEqual(currentUserId).delete();
```

**影響**：如果不修正，大量數據時可能需要幾秒鐘

---

## ✅ 修復順序與依賴關係

### 階段 1：基礎修復（可並行）

```
修復 1: handleLeaveTeam() (方案 1)
  ↓
  無依賴，可立即執行
  
修復 3: handleSignOut()
  ↓
  無依賴，可立即執行
```

### 階段 2：核心修復（必須先完成）

```
修復 2: handlePermissionRevoked()
  ↓
  修正 useAuth() 調用方式
  ↓
  測試清除邏輯
```

### 階段 3：重構（依賴階段 2）

```
修復 4: handleLeaveTeam() (方案 2)
  ↓
  依賴修復 2 完成
  ↓
  重構為調用 handlePermissionRevoked()
```

---

## 🧪 測試計劃

### 測試 1：基礎功能測試

**目標**：驗證修復後的基本功能

**步驟**：
1. ✅ 員工點擊「離開團隊」
2. ✅ 驗證雲端關係已刪除
3. ✅ 驗證本地數據已清除
4. ✅ 驗證頁面重新載入

**預期結果**：
- 雲端 `staff_relationships` 記錄已刪除
- 雲端 `market_members` 記錄已刪除
- 本地 IndexedDB 已清空
- 頁面重新載入到首頁

### 測試 2：多標籤頁測試

**目標**：驗證多標籤頁情況下的清除邏輯

**步驟**：
1. ✅ 開啟兩個標籤頁
2. ✅ 在標籤頁 A 點擊「離開團隊」
3. ✅ 驗證標籤頁 B 的狀態
4. ✅ 關閉標籤頁 B
5. ✅ 驗證數據是否完全清除

**預期結果**：
- 即使 IndexedDB 刪除被阻擋，數據表也已清空
- 標籤頁 B 重新載入後，沒有舊數據

### 測試 3：錯誤處理測試

**目標**：驗證錯誤情況下的處理邏輯

**步驟**：
1. ✅ 模擬網路錯誤（步驟 1 失敗）
2. ✅ 驗證錯誤提示
3. ✅ 驗證本地數據狀態
4. ✅ 模擬部分成功（步驟 1 成功，步驟 2 失敗）
5. ✅ 驗證數據一致性

**預期結果**：
- 顯示清晰的錯誤提示
- 提示用戶清除本地數據
- 用戶可以選擇強制清除

### 測試 4：切換團隊測試

**目標**：驗證切換團隊時的數據隔離

**步驟**：
1. ✅ 使用者B接受A的邀請
2. ✅ 使用者B創建互動和成交紀錄
3. ✅ 使用者B離開A的團隊
4. ✅ 使用者B接受C的邀請
5. ✅ 驗證只有C的數據，沒有A的殘留

**預期結果**：
- 本地只有C的市集和商品
- 沒有A的任何數據殘留
- 數據所有權正確

### 測試 5：用戶設定保留測試

**目標**：驗證用戶設定是否正確保留

**步驟**：
1. ✅ 設定互動按鈕
2. ✅ 離開團隊
3. ✅ 重新登入
4. ✅ 驗證互動按鈕設定是否保留

**預期結果**：
- 互動按鈕設定保留（如果使用改進方案）
- 或需要重新設定（如果使用 `localStorage.clear()`）

---

## 📊 修復方案對比

### 方案 A：完全清除 localStorage（當前方案）

**優點**：
- ✅ 簡單直接
- ✅ 確保沒有任何殘留

**缺點**：
- ❌ 用戶設定會被清除
- ❌ 需要重新設定互動按鈕
- ❌ 影響用戶體驗

### 方案 B：選擇性清除 localStorage（改進方案）

**優點**：
- ✅ 保留用戶設定
- ✅ 更好的用戶體驗
- ✅ 只清除必要的緩存

**缺點**：
- ⚠️ 需要維護清除列表
- ⚠️ 可能遺漏某些緩存

**建議**：✅ **使用方案 B（選擇性清除）**

---

## 🎯 最終建議

### 立即執行（階段 1）

1. **修復 `handleLeaveTeam()` 函數（方案 1）**
   - ✅ 使用選擇性清除 localStorage（方案 B）
   - ✅ 增加錯誤處理
   - ✅ 測試多標籤頁情況

2. **修復 `handleSignOut()` 函數**
   - ✅ 使用選擇性清除 localStorage（方案 B）
   - ✅ 先手動清除數據表
   - ✅ 再刪除 IndexedDB

### 後續執行（階段 2）

3. **修復 `handlePermissionRevoked()` 函數**
   - ✅ 修正 `useAuth()` 調用方式（使用 `supabase.auth.getUser()`）
   - ✅ 使用批次刪除提升性能
   - ✅ 測試清除邏輯

### 最後執行（階段 3）

4. **重構 `handleLeaveTeam()` 函數（方案 2）**
   - ✅ 調用 `handlePermissionRevoked()`
   - ✅ 簡化代碼
   - ✅ 統一清除邏輯

---

## 📝 修復檢查清單

### 修復前檢查

- [ ] 備份當前代碼
- [ ] 確認所有依賴模組存在
- [ ] 確認測試環境準備就緒

### 修復中檢查

- [ ] 修正 `useAuth()` 調用方式
- [ ] 使用選擇性清除 localStorage
- [ ] 增加錯誤處理
- [ ] 增加性能優化

### 修復後檢查

- [ ] 執行所有測試計劃
- [ ] 驗證多標籤頁情況
- [ ] 驗證切換團隊流程
- [ ] 驗證用戶設定保留
- [ ] 驗證錯誤處理

---

## 🚀 結論

### ✅ 可以安全執行

經過深度分析，修復方案是**安全的**，但需要注意以下幾點：

1. **必須修正**：`handlePermissionRevoked()` 中的 `useAuth()` 調用方式
2. **建議修正**：使用選擇性清除 localStorage，保留用戶設定
3. **可選優化**：使用批次刪除提升性能

### 🎯 執行順序

1. ✅ 立即執行修復 1 和修復 3（無依賴）
2. ✅ 執行修復 2（修正關鍵問題）
3. ✅ 執行修復 4（重構優化）

### 📊 預期效果

修復後：
- ✅ 員工離開團隊時，本地數據完全清除
- ✅ 切換團隊時，沒有數據混亂
- ✅ 多標籤頁情況下，清除邏輯正常
- ✅ 用戶設定保留（如果使用改進方案）
- ✅ 錯誤處理完善

---

**報告完成時間**：2026-02-26  
**風險等級**：🟢 低風險（需要修正關鍵問題）  
**建議執行**：✅ 可以安全執行，按階段進行
