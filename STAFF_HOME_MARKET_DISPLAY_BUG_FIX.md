# 員工模式首頁顯示其他老闆市集 - Bug 修復報告

## 🐛 問題現象

### 實測結果

1. **首頁「即將到來的市集」區塊**
   - ✅ 顯示老闆的市集
   - ❌ **也顯示其他老闆的市集**（不應該顯示）

2. **導航列「市集列表」頁面**
   - ✅ 正確顯示老闆的市集
   - ✅ 不顯示其他老闆的市集

### 問題分析

**根本原因**：
- 首頁使用 `getAccessibleMarkets()` 從 Supabase 獲取市集
- `getAccessibleMarkets()` 使用 `staff_accessible_markets` 視圖
- 視圖可能返回了多個老闆的市集（如果員工同時為多個老闆工作）
- 但是首頁沒有過濾，顯示了所有市集

**預期行為**：
- 員工模式下，首頁應該只顯示**當前老闆**的市集
- 不應該顯示其他老闆的市集

---

## 🔍 代碼分析

### 問題代碼 1：首頁市集查詢邏輯

**位置**：`app/page.tsx` - 第 30-60 行

```typescript
// ✅ 員工模式：從 Supabase 獲取市集列表
useEffect(() => {
  if (isStaff && user) {
    setIsLoadingSupabase(true);
    import('@/lib/supabase/markets').then(({ getAccessibleMarkets }) => {
      getAccessibleMarkets()
        .then(data => {
          // 轉換 Supabase 數據格式為本地格式
          const convertedMarkets = data.map((m: any) => ({
            id: m.id,
            name: m.name,
            // ... 其他欄位
          }));
          
          // ✅ 去重：使用 Map 確保每個 ID 只出現一次
          const uniqueMarkets = Array.from(
            convertedMarkets.reduce((map, market) => {
              if (!map.has(market.id)) {
                map.set(market.id, market);
              }
              return map;
            }, new Map<string, any>())
          ).map(([_, market]) => market);
          
          // ❌ 問題：沒有過濾，直接設置所有市集
          setSupabaseMarkets(uniqueMarkets);
        })
        // ...
    });
  }
}, [isStaff, user]);
```

**問題**：
- `getAccessibleMarkets()` 返回所有可訪問的市集（可能包括多個老闆）
- 沒有根據 `userRole.ownerId` 過濾
- 導致顯示了其他老闆的市集

### 問題代碼 2：市集列表頁面（正確的實現）

**位置**：`app/markets/page.tsx` - 第 20-30 行

```typescript
// 查詢所有市集
const allMarkets = useMarkets({ orderBy: 'startDate', order: 'desc' });
```

**為什麼市集列表頁面是正確的？**
- 市集列表頁面使用 `useMarkets()` Hook
- `useMarkets()` 從 **IndexedDB** 讀取數據
- IndexedDB 的數據是通過 `useSync` 同步的
- `useSync` 會正確過濾只屬於當前老闆的市集

### 問題代碼 3：useSync 的同步邏輯

**位置**：`hooks/useSync.ts` - 第 950-1000 行

```typescript
async function pullAllEvents(
  userId: string,
  onProgress?: (current: number, total: number, currentItem?: string, phase?: 'snapshot' | 'incremental') => void
): Promise<void> {
  // ✅ 檢查是否啟用員工模式
  const { isStaffModeEnabled } = await import('@/lib/db/feature-flags');
  const staffModeEnabled = isStaffModeEnabled();
  
  if (staffModeEnabled) {
    try {
      console.log('📊 員工模式已啟用，嘗試從視圖拉取數據...');
      await pullEventsFromViews(userId, onProgress); // ❌ 這個函數不存在！
      console.log('✅ 視圖拉取成功');
      return;
    } catch (error) {
      console.warn('⚠️ 從視圖拉取失敗，降級到原邏輯:', error);
    }
  }
  
  // ... 原邏輯
}
```

**問題**：
- `pullEventsFromViews()` 函數被調用但**沒有實現**
- 導致員工模式下同步失敗，降級到原邏輯
- 原邏輯會同步所有可訪問的市集（包括其他老闆）

---

## 🔧 修復方案

### 方案 1：首頁過濾市集（推薦）

**優點**：
- ✅ 最簡單、最直接
- ✅ 不需要修改同步邏輯
- ✅ 只影響首頁顯示

**缺點**：
- ❌ 仍然會從 Supabase 獲取所有市集（浪費流量）

**實作**：修改 `app/page.tsx`

```typescript
// ✅ 員工模式：從 Supabase 獲取市集列表
useEffect(() => {
  if (isStaff && user) {
    setIsLoadingSupabase(true);
    import('@/lib/supabase/markets').then(({ getAccessibleMarkets }) => {
      getAccessibleMarkets()
        .then(data => {
          // 轉換 Supabase 數據格式為本地格式
          const convertedMarkets = data.map((m: any) => ({
            id: m.id,
            name: m.name,
            location: m.location || '',
            // ... 其他欄位
          }));
          
          // ✅ 過濾：只保留當前老闆的市集
          const filteredMarkets = convertedMarkets.filter((market: any) => {
            // 如果有 relationship_owner_id，使用它來過濾
            if (market.relationship_owner_id && userRole.ownerId) {
              return market.relationship_owner_id === userRole.ownerId;
            }
            // 降級：使用 owner_id（但這可能不準確）
            return market.owner_id === userRole.ownerId;
          });
          
          // ✅ 去重
          const uniqueMarkets = Array.from(
            filteredMarkets.reduce((map, market) => {
              if (!map.has(market.id)) {
                map.set(market.id, market);
              }
              return map;
            }, new Map<string, any>())
          ).map(([_, market]) => market);
          
          setSupabaseMarkets(uniqueMarkets);
        })
        .catch(error => {
          console.error('獲取 Supabase 市集列表失敗:', error);
        })
        .finally(() => {
          setIsLoadingSupabase(false);
        });
    });
  }
}, [isStaff, user, userRole.ownerId]); // ✅ 添加 userRole.ownerId 依賴
```

---

### 方案 2：首頁使用 IndexedDB（推薦）

**優點**：
- ✅ 與市集列表頁面保持一致
- ✅ 離線優先，性能更好
- ✅ 自動過濾，不需要額外邏輯

**缺點**：
- ❌ 需要確保 useSync 正確同步數據

**實作**：修改 `app/page.tsx`

```typescript
export default function HomePage() {
  const router = useRouter();
  
  // ✅ 統一使用 IndexedDB（無論老闆還是員工模式）
  const allMarkets = useMarkets({ orderBy: 'startDate', order: 'asc' });
  
  const monthlyStats = useMonthlyStats();
  const { user, signOut, isConfigured } = useAuth();
  const { userRole, isStaff } = useUserRole();
  const { status, lastSyncAt, pendingCount, error, sync, isOnline } = useSync({
    enabled: !!user && isConfigured,
  });
  
  // ❌ 刪除：不再需要 supabaseMarkets 和 isLoadingSupabase
  // const [supabaseMarkets, setSupabaseMarkets] = useState<any[]>([]);
  // const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);
  
  // ❌ 刪除：不再需要從 Supabase 獲取市集
  // useEffect(() => {
  //   if (isStaff && user) {
  //     // ...
  //   }
  // }, [isStaff, user]);
  
  // ✅ 載入狀態檢查
  const isLoading = allMarkets === undefined || monthlyStats === undefined;
  
  // ... 其他代碼保持不變
}
```

---

### 方案 3：實作 pullEventsFromViews 函數（最完整）

**優點**：
- ✅ 從根本解決問題
- ✅ 優化同步性能（使用視圖）
- ✅ 支持員工模式的完整功能

**缺點**：
- ❌ 實作較複雜
- ❌ 需要測試多種場景

**實作**：在 `hooks/useSync.ts` 中添加函數

```typescript
/**
 * 從視圖拉取數據（員工模式優化）
 * 
 * 使用 staff_accessible_markets 和 staff_accessible_products 視圖
 * 直接同步到 IndexedDB，避免事件重放
 */
async function pullEventsFromViews(
  userId: string,
  onProgress?: (current: number, total: number, currentItem?: string, phase?: 'snapshot' | 'incremental') => void
): Promise<void> {
  console.log('📊 從視圖拉取數據（員工模式）...');
  
  // ✅ 步驟 1：獲取當前用戶的員工關係
  const { data: staffRelationships, error: relError } = await supabase
    .from('staff_relationships')
    .select('owner_id, status')
    .eq('staff_id', userId)
    .eq('status', 'active');
  
  if (relError) throw relError;
  
  if (!staffRelationships || staffRelationships.length === 0) {
    console.log('ℹ️ 用戶不是任何團隊的員工，跳過視圖同步');
    return;
  }
  
  // ✅ 獲取當前老闆 ID（假設員工只為一個老闆工作）
  const currentOwnerId = staffRelationships[0].owner_id;
  console.log(`📋 當前老闆 ID: ${currentOwnerId.substring(0, 8)}...`);
  
  // ✅ 步驟 2：從視圖獲取市集
  if (onProgress) {
    onProgress(0, 2, '獲取市集...', 'snapshot');
  }
  
  const { data: markets, error: marketsError } = await supabase
    .from('staff_accessible_markets')
    .select('*')
    .eq('relationship_owner_id', currentOwnerId) // ✅ 只獲取當前老闆的市集
    .order('created_at', { ascending: false });
  
  if (marketsError) throw marketsError;
  
  console.log(`📦 獲取到 ${markets?.length || 0} 個市集`);
  
  // ✅ 步驟 3：同步市集到 IndexedDB
  if (markets && markets.length > 0) {
    await syncMarketsToIndexedDB(markets);
  }
  
  if (onProgress) {
    onProgress(1, 2, '獲取商品...', 'snapshot');
  }
  
  // ✅ 步驟 4：從視圖獲取商品
  const { data: products, error: productsError } = await supabase
    .from('staff_accessible_products')
    .select('*')
    .eq('relationship_owner_id', currentOwnerId) // ✅ 只獲取當前老闆的商品
    .order('created_at', { ascending: false });
  
  if (productsError) throw productsError;
  
  console.log(`📦 獲取到 ${products?.length || 0} 個商品`);
  
  // ✅ 步驟 5：同步商品到 IndexedDB
  if (products && products.length > 0) {
    await syncProductsToIndexedDB(products);
  }
  
  if (onProgress) {
    onProgress(2, 2, '同步完成', 'snapshot');
  }
  
  // ✅ 步驟 6：更新最後同步時間
  await updateLastSyncTimestamp();
  
  console.log('✅ 視圖同步完成');
}
```

---

## 📊 方案對比

| 方案 | 實作難度 | 性能 | 推薦度 | 說明 |
|------|----------|------|--------|------|
| 方案 1：首頁過濾 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 最簡單，但仍會獲取所有市集 |
| 方案 2：使用 IndexedDB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 最推薦，與市集列表一致 |
| 方案 3：實作 pullEventsFromViews | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 最完整，但實作複雜 |

---

## 🎯 推薦實作：方案 2（使用 IndexedDB）

### 為什麼選擇方案 2？

1. ✅ **與市集列表頁面保持一致**：都使用 IndexedDB
2. ✅ **離線優先**：即使網路斷線也能正常顯示
3. ✅ **性能最佳**：不需要每次都從 Supabase 獲取
4. ✅ **自動過濾**：useSync 已經正確過濾數據
5. ✅ **實作最簡單**：只需要刪除代碼，不需要添加

### 完整的修復代碼

**檔案**：`app/page.tsx`

**修改 1**：刪除 supabaseMarkets 相關代碼

**修改 2**：統一使用 allMarkets

---

## 🧪 測試計劃

### 測試 1：員工模式首頁

**步驟**：
1. 使用者B以員工身分登入（為老闆A工作）
2. 查看首頁「即將到來的市集」
3. **驗證**：只顯示老闆A的市集

**預期結果**：
- ✅ 只顯示老闆A的市集
- ✅ 不顯示其他老闆的市集

### 測試 2：員工模式市集列表

**步驟**：
1. 使用者B點擊「市集列表」
2. **驗證**：只顯示老闆A的市集

**預期結果**：
- ✅ 與首頁顯示一致
- ✅ 只顯示老闆A的市集

### 測試 3：多老闆場景（如果支持）

**步驟**：
1. 使用者B同時為老闆A和老闆C工作
2. 查看首頁和市集列表
3. **驗證**：只顯示當前老闆的市集

**預期結果**：
- ✅ 根據 userRole.ownerId 正確過濾
- ✅ 不會混淆不同老闆的市集

---

## 📝 總結

### 問題根源

✅ **首頁使用了不同的數據源**：
- 首頁：直接從 Supabase 獲取（`getAccessibleMarkets()`）
- 市集列表：從 IndexedDB 獲取（`useMarkets()`）
- 導致顯示不一致

### 解決方案

✅ **推薦使用方案 2**：統一使用 IndexedDB

**關鍵修改**：
```typescript
// ❌ 舊代碼：員工模式使用 Supabase
const allMarkets = isStaff ? supabaseMarkets : localMarkets;

// ✅ 新代碼：統一使用 IndexedDB
const allMarkets = useMarkets({ orderBy: 'startDate', order: 'asc' });
```

### 預期效果

修復後：
- ✅ 首頁和市集列表顯示一致
- ✅ 員工只看到當前老闆的市集
- ✅ 離線優先，性能更好
- ✅ 自動同步，無需手動刷新

---

**報告完成時間**：2026-02-26  
**問題類型**：🐛 數據過濾錯誤（顯示其他老闆的市集）  
**嚴重度**：🟡 中（影響用戶體驗和數據隔離）  
**建議優先級**：🔴 高（應盡快修復）
