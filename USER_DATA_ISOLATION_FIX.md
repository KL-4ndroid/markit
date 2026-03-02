# 🔒 用戶數據隔離問題修復報告

## 📋 問題描述

**嚴重性**：🔴 高危

### 問題現象

1. 用戶 A 登入並創建商品
2. 用戶 A 登出
3. 用戶 B 登入
4. **用戶 B 看到用戶 A 的商品數據**

### 根本原因

#### 原因 1：登出時數據清除不完整

雖然 `clearAllData()` 會清除所有數據，但在某些情況下（如網路錯誤、異步執行失敗），清除可能不完整。

#### 原因 2：用戶切換時沒有檢測和清理

當用戶 A 登出後，用戶 B 登入時，系統沒有檢測到用戶切換，也沒有清除用戶 A 的殘留數據。

#### 原因 3：員工模式同步時沒有驗證用戶

在 `syncProductsToIndexedDB` 函數中，沒有驗證商品是否屬於當前用戶，直接將所有視圖返回的數據寫入 IndexedDB。

#### 原因 4：lastSyncAt 全局污染

`lastSyncAt` 是全局的時間戳，當用戶 A 同步後，用戶 B 登入時會使用用戶 A 的 `lastSyncAt`，導致數據混合。

---

## ✅ 修復方案

### 修復 1：創建專用的數據清除工具

**文件**：`lib/db/clear-user-data.ts`

新增三個函數：

1. **`clearUserData(userId, options)`**：清除特定用戶的數據
2. **`clearOtherUsersData(currentUserId)`**：清除其他用戶的數據
3. **`validateDataIsolation(expectedUserId)`**：驗證數據隔離性

```typescript
// 清除其他用戶的數據
export async function clearOtherUsersData(currentUserId: string): Promise<void> {
  // 1. 清除其他用戶的市集
  const allMarkets = await db.markets.toArray();
  for (const market of allMarkets) {
    if (market.owner_id && market.owner_id !== currentUserId && market.owner_id !== 'local') {
      await db.markets.delete(market.id);
    }
  }
  
  // 2. 清除其他用戶的商品
  // 3. 清除其他用戶的事件
  // 4. 清除孤立的統計數據
}
```

---

### 修復 2：檢測用戶切換並清除舊數據

**文件**：`lib/supabase/auth-context.tsx`

在 `onAuthStateChange` 中添加用戶切換檢測：

```typescript
// ✅ 登入事件：檢測用戶切換
if (event === 'SIGNED_IN') {
  const newUserId = session?.user?.id;
  const previousUserId = user?.id;
  
  // ✅ 檢測用戶切換（不同用戶登入）
  if (previousUserId && newUserId && previousUserId !== newUserId) {
    console.warn('⚠️ 檢測到用戶切換', {
      from: previousUserId.substring(0, 8),
      to: newUserId.substring(0, 8),
    });
    
    // ✅ 清除前一個用戶的數據
    const { clearOtherUsersData } = await import('@/lib/db/clear-user-data');
    await clearOtherUsersData(newUserId);
  }
}
```

---

### 修復 3：增強登出時的數據清除

**文件**：`lib/supabase/auth-context.tsx`

在 `clearUserData` 函數中添加更多清除項目：

```typescript
const clearUserData = async (reason: string) => {
  // 1. 清除本地資料庫（完整清除）
  const { clearAllData } = await import('@/lib/db');
  await clearAllData();
  
  // 2. 清除 localStorage（包括員工模式標記）
  const keysToRemove = [
    'user_role_cache',
    'logout_history',
    'hasCompletedInitialSync',
    'staff_mode_enabled',  // ✅ 新增：清除員工模式標記
    'lastSyncAt',          // ✅ 新增：清除同步時間戳
  ];
  
  // 3. 清除 sessionStorage
  sessionStorage.clear();
};
```

---

### 修復 4：員工模式同步時驗證用戶

**文件**：`hooks/useSync.ts`

#### 4.1 在 `pullEventsFromViews` 中添加清除邏輯

```typescript
async function pullEventsFromViews(userId: string, ...): Promise<void> {
  // ✅ 步驟 0：清除其他用戶的數據（防止數據混合）
  const { clearOtherUsersData } = await import('@/lib/db/clear-user-data');
  await clearOtherUsersData(userId);
  
  // 1. 拉取市集數據
  // 2. 拉取商品數據
  // 3. 拉取事件數據
  
  // 4. 同步到 IndexedDB（傳入 userId）
  await syncMarketsToIndexedDB(marketsData || [], userId);
  await syncProductsToIndexedDB(productsData || [], userId);
  
  // ✅ 驗證數據隔離性
  const { validateDataIsolation } = await import('@/lib/db/clear-user-data');
  const validation = await validateDataIsolation(userId);
  
  if (!validation.isValid) {
    console.error('❌ 數據隔離性驗證失敗:', validation.violations);
  }
}
```

#### 4.2 在 `syncProductsToIndexedDB` 中添加驗證

```typescript
async function syncProductsToIndexedDB(products: any[], currentUserId: string): Promise<void> {
  for (const product of products) {
    // ✅ 驗證：確保商品屬於當前用戶或當前用戶可訪問
    const isOwner = product.access_type === 'owner' && product.owner_id === currentUserId;
    const isStaff = product.access_type === 'staff' && product.relationship_owner_id;
    
    if (!isOwner && !isStaff) {
      console.warn(`⚠️ 跳過不屬於當前用戶的商品: ${product.name}`);
      continue;
    }
    
    // 同步商品
    await db.products.add(productData);
  }
}
```

---

## 🧪 測試步驟

### 測試 1：正常登出和登入

1. **用戶 A 登入**
   - 創建 3 個商品
   - 檢查 IndexedDB：應該有 3 個商品

2. **用戶 A 登出**
   - 檢查控制台：應該看到 `🔒 清除用戶數據 (原因: manual_signout)`
   - 檢查 IndexedDB：應該是空的

3. **用戶 B 登入**
   - 檢查 IndexedDB：應該是空的（沒有用戶 A 的商品）
   - 創建 2 個商品
   - 檢查 IndexedDB：應該只有 2 個商品（用戶 B 的）

---

### 測試 2：用戶切換檢測

1. **用戶 A 登入**
   - 創建商品

2. **不登出，直接用戶 B 登入**（模擬異常情況）
   - 檢查控制台：應該看到 `⚠️ 檢測到用戶切換`
   - 檢查控制台：應該看到 `✅ 已清除前一個用戶的數據`
   - 檢查 IndexedDB：應該沒有用戶 A 的商品

---

### 測試 3：員工模式數據隔離

1. **老闆 A 登入**
   - 創建 5 個商品
   - 邀請員工 B

2. **員工 B 登入**
   - 啟用員工模式
   - 檢查商品：應該看到老闆 A 的 5 個商品
   - 檢查 IndexedDB：商品的 `owner_id` 應該是老闆 A 的 ID

3. **員工 B 登出**
   - 檢查 IndexedDB：應該是空的

4. **老闆 C 登入**
   - 創建 3 個商品
   - 檢查 IndexedDB：應該只有 3 個商品（老闆 C 的）
   - **不應該看到老闆 A 的商品**

---

### 測試 4：數據隔離性驗證

在瀏覽器控制台執行：

```javascript
// 檢查數據隔離性
(async () => {
  const { supabase } = await import('./lib/supabase/client.ts');
  const { validateDataIsolation } = await import('./lib/db/clear-user-data.ts');
  
  const { data: { user } } = await supabase.auth.getUser();
  const validation = await validateDataIsolation(user.id);
  
  console.log('數據隔離性驗證:', validation);
  
  if (!validation.isValid) {
    console.error('❌ 發現數據混合:', validation.violations);
  } else {
    console.log('✅ 數據隔離正常');
  }
})();
```

---

## 📊 修復效果

### 修復前

```
用戶 A 登入 → 創建商品 → 登出
用戶 B 登入 → ❌ 看到用戶 A 的商品
```

### 修復後

```
用戶 A 登入 → 創建商品 → 登出 → ✅ 數據已清除
用戶 B 登入 → ✅ 檢測到用戶切換 → ✅ 清除殘留數據 → ✅ 只看到自己的商品
```

---

## 🔐 安全性增強

### 1. 多層防護

- **第一層**：登出時完整清除數據
- **第二層**：登入時檢測用戶切換並清除舊數據
- **第三層**：同步時驗證數據所有權
- **第四層**：同步後驗證數據隔離性

### 2. 防禦性編程

- 即使某一層失敗，其他層仍能保護數據隔離
- 添加詳細的日誌記錄，便於追蹤問題

### 3. 自動驗證

- 每次同步後自動驗證數據隔離性
- 發現問題時立即報警

---

## 📝 後續建議

### 1. 添加單元測試

為數據清除和驗證函數添加單元測試：

```typescript
describe('clearOtherUsersData', () => {
  it('應該清除其他用戶的數據', async () => {
    // 測試邏輯
  });
});
```

### 2. 添加監控

在生產環境中添加數據隔離性監控：

```typescript
// 定期檢查數據隔離性
setInterval(async () => {
  const validation = await validateDataIsolation(currentUserId);
  if (!validation.isValid) {
    // 發送警報
    sendAlert('數據隔離性異常', validation.violations);
  }
}, 60000); // 每分鐘檢查一次
```

### 3. 用戶教育

在 UI 中添加提示：

- 登出時提示「正在清除本地數據...」
- 切換用戶時提示「檢測到用戶切換，正在清理數據...」

---

## ✅ 修復完成

所有修復已完成，請按照測試步驟驗證修復效果。

如果還有問題，請執行數據隔離性驗證腳本並提供結果。
