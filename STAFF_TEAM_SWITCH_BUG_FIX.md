# 員工切換團隊 BUG 修復方案

## 🐛 問題描述

**場景**：
1. 使用者 B 接受使用者 A 的邀請並載入數據
2. 使用者 B 離開使用者 A 的團隊
3. 使用者 B 登出清除本地資料
4. 使用者 C 邀請使用者 B 成為員工
5. 使用者 B 接受使用者 C 的邀請並載入數據 ← **此時出錯**

## 🔍 根本原因

### 1. 離開團隊時清除不完整

在 `useSync.ts` 的 `handlePermissionRevoked()` 函數中：

```typescript
// 只清除 is_collaborative = 1 的市集
const collaborativeMarkets = await db.markets
  .where('is_collaborative')
  .equals(1)
  .toArray();
```

**問題**：
- 只清除協作市集，但員工可能還有其他關聯數據
- 商品、事件等關聯數據可能沒有完全清除
- `market_members` 記錄沒有清除

### 2. 登出時 IndexedDB 刪除可能失敗

在 `auth-context.tsx` 的 `handleSignOut()` 函數中：

```typescript
const deleteRequest = window.indexedDB.deleteDatabase(dbName);

deleteRequest.onblocked = () => {
  console.warn('⚠️ 資料庫刪除被阻擋，強制重新載入');
  // 即使被阻擋也會重新載入，但數據可能沒清除
};
```

**問題**：
- 如果有其他標籤頁打開，刪除會被阻擋
- 強制重新載入後，舊數據可能還在
- 下次登入時會載入到舊數據

### 3. 重新載入時沒有檢查數據所有權

在 `useSync.ts` 的 `pullEventsFromViews()` 函數中：

```typescript
await syncMarketsToIndexedDB(marketsData || []);
```

**問題**：
- 沒有檢查本地是否有其他老闆的數據
- 直接合併可能導致數據混亂
- 權限信息可能不正確

## ✅ 解決方案

### 方案 1：離開團隊時完整清除（推薦）

在 `useSync.ts` 中增強 `handlePermissionRevoked()` 函數：

```typescript
async function handlePermissionRevoked(): Promise<void> {
  console.warn('⚠️ 權限已被撤銷，清除本地協作資料');
  
  try {
    // ✅ 方案 1：清除所有非自己創建的數據
    const { user } = await import('@/lib/supabase/auth-context').then(m => m.useAuth());
    const currentUserId = user?.id;
    
    if (!currentUserId) {
      console.error('無法獲取當前用戶 ID');
      return;
    }
    
    // 1. 清除所有非自己擁有的市集
    const allMarkets = await db.markets.toArray();
    for (const market of allMarkets) {
      if (market.owner_id !== currentUserId) {
        console.log(`🗑️ 清除非自己的市集: ${market.name}`);
        
        // 刪除市集
        if (market.id) {
          await db.markets.delete(market.id);
          
          // 刪除相關商品
          await db.products.where('market_id').equals(market.id).delete();
          
          // 刪除相關事件
          await db.events.where('market_id').equals(market.id).delete();
        }
      }
    }
    
    // 2. 清除所有非自己創建的商品（全局商品）
    const allProducts = await db.products.toArray();
    for (const product of allProducts) {
      if (product.owner_id !== currentUserId && !product.market_id) {
        console.log(`🗑️ 清除非自己的商品: ${product.name}`);
        if (product.id) {
          await db.products.delete(product.id);
        }
      }
    }
    
    // 3. 清除所有非自己創建的事件（全局事件）
    const allEvents = await db.events.toArray();
    for (const event of allEvents) {
      if (event.actor_id !== currentUserId && event.actor_id !== 'local' && !event.market_id) {
        console.log(`🗑️ 清除非自己的事件: ${event.type}`);
        if (event.id) {
          await db.events.delete(event.id);
        }
      }
    }
    
    console.log('✅ 非自己的數據已全部清除');
    
    // 提示用戶
    if (typeof window !== 'undefined') {
      const { toast } = await import('sonner');
      toast.info('已清除協作數據，請重新載入');
      
      // 延遲 2 秒後重新載入頁面
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  } catch (error) {
    console.error('清除協作資料失敗:', error);
  }
}
```

### 方案 2：接受邀請前先清除舊數據

在接受邀請的流程中，先清除本地所有數據：

```typescript
// 在 acceptInvitation 之後，pullEventsFromViews 之前
async function clearLocalDataBeforeSync(): Promise<void> {
  console.log('🧹 清除本地數據，準備載入新團隊數據...');
  
  try {
    // 清除所有表
    await db.markets.clear();
    await db.products.clear();
    await db.events.clear();
    await db.dailyStats.clear();
    
    console.log('✅ 本地數據已清除');
  } catch (error) {
    console.error('清除本地數據失敗:', error);
    throw error;
  }
}
```

### 方案 3：載入前檢查數據所有權

在 `syncMarketsToIndexedDB` 和 `syncProductsToIndexedDB` 中增加檢查：

```typescript
async function syncMarketsToIndexedDB(markets: any[]): Promise<void> {
  console.log(`📝 同步 ${markets.length} 個市集到 IndexedDB...`);
  
  // ✅ 檢查本地是否有其他老闆的數據
  const { user } = await import('@/lib/supabase/auth-context').then(m => m.useAuth());
  const currentUserId = user?.id;
  
  if (!currentUserId) {
    throw new Error('無法獲取當前用戶 ID');
  }
  
  // ✅ 檢查本地市集的所有權
  const localMarkets = await db.markets.toArray();
  const hasOtherOwnerData = localMarkets.some(m => 
    m.owner_id && 
    m.owner_id !== currentUserId && 
    m.relationship_owner_id !== currentUserId
  );
  
  if (hasOtherOwnerData) {
    console.warn('⚠️ 檢測到其他老闆的數據，建議先清除');
    
    // 選項 1：拋出錯誤，要求用戶重新登入
    throw new Error('檢測到舊的協作數據，請重新登入以清除');
    
    // 選項 2：自動清除（較激進）
    // await clearLocalDataBeforeSync();
  }
  
  // 繼續同步...
  for (const market of markets) {
    // ...
  }
}
```

## 🎯 推薦實作順序

### 第一步：增強離開團隊的清除邏輯

修改 `useSync.ts` 中的 `handlePermissionRevoked()` 函數，使用**方案 1**。

### 第二步：增強登出清除邏輯

修改 `auth-context.tsx` 中的 `handleSignOut()` 函數：

```typescript
// 在刪除 IndexedDB 之前，先嘗試手動清除
try {
  const { db } = await import('@/lib/db');
  await db.markets.clear();
  await db.products.clear();
  await db.events.clear();
  await db.dailyStats.clear();
  console.log('✅ 手動清除數據成功');
} catch (error) {
  console.error('手動清除數據失敗:', error);
}

// 然後再刪除整個資料庫
const deleteRequest = window.indexedDB.deleteDatabase(dbName);
```

### 第三步：增加載入前檢查

修改 `useSync.ts` 中的 `pullEventsFromViews()` 函數，在載入前檢查數據所有權（**方案 3**）。

### 第四步：增加接受邀請時的清除

在接受邀請的 UI 流程中，增加清除本地數據的步驟（**方案 2**）。

## 🧪 測試步驟

### 測試 1：正常流程
1. 使用者 B 接受 A 的邀請
2. 驗證數據正確載入
3. 使用者 B 離開 A 的團隊
4. 驗證本地數據已清除
5. 使用者 B 登出
6. 驗證 IndexedDB 已刪除

### 測試 2：切換團隊
1. 使用者 B 接受 A 的邀請
2. 使用者 B 離開 A 的團隊
3. 使用者 B 接受 C 的邀請
4. **驗證只有 C 的數據，沒有 A 的殘留**

### 測試 3：登出被阻擋
1. 開啟兩個標籤頁
2. 在標籤頁 1 登出
3. 驗證標籤頁 2 的數據狀態
4. 關閉標籤頁 2
5. 重新登入
6. 驗證數據是否正確

## 📊 預期效果

### 修復前
- ❌ 切換團隊時數據混亂
- ❌ 舊團隊的數據殘留
- ❌ 權限信息不正確
- ❌ 可能看到不該看到的數據

### 修復後
- ✅ 切換團隊時自動清除舊數據
- ✅ 只顯示當前團隊的數據
- ✅ 權限信息正確
- ✅ 數據隔離完整

## 🔒 安全性考量

1. **數據隔離**：確保員工只能看到當前老闆的數據
2. **權限檢查**：載入前檢查數據所有權
3. **清除完整性**：離開團隊時完整清除所有關聯數據
4. **防止數據洩漏**：登出時強制清除所有數據

---

**優先級**：🔴 高（影響多人協作核心功能）  
**預估工時**：2-3 小時  
**風險等級**：中（需要仔細測試，避免誤刪用戶自己的數據）
