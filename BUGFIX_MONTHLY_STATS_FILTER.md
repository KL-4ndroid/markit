# 🐛 Bug 修復報告 - 首頁統計資料未過濾問題

## 問題描述

**症狀：**
使用者登入一個已刪除所有市集的帳號，但首頁頂端的統計資料（市集場次、總收入、成交數）仍然顯示有數據，與實際的市集列表不符。

**預期行為：**
首頁統計資料應該只顯示當前使用者的市集統計，並且自動過濾已刪除的市集。

---

## 根本原因分析

### 問題檔案
1. `lib/db/hooks.ts` - `useMonthlyStats` Hook
2. `app/page.tsx` - 首頁組件

### 錯誤程式碼

#### 1. `useMonthlyStats` 沒有 `ownerId` 參數

```typescript
// ❌ 修復前（錯誤）
export function useMonthlyStats() {
  return useLiveQuery(async () => {
    // ...
    const markets = await db.markets
      .where('startDate')
      .between(startDate, endDate, true, true)
      .toArray();
    
    // ✅ 有過濾已刪除的市集
    const activeMarkets = markets.filter(m => !m.isDeleted);
    
    // ❌ 但沒有根據 ownerId 過濾
    // 導致統計了所有使用者的市集
    
    // ...
  }, []);
}
```

#### 2. 首頁沒有傳入 `ownerId`

```typescript
// ❌ 修復前（錯誤）
const monthlyStats = useMonthlyStats(); // 沒有傳入 ownerId
```

### 問題分析

1. **資料來源不一致**
   - `useMarkets` 有 `ownerId` 過濾 → 只顯示當前使用者的市集
   - `useMonthlyStats` 沒有 `ownerId` 過濾 → 統計所有使用者的市集
   - 導致「統計資料」與「市集列表」不一致

2. **多使用者資料混淆**
   - IndexedDB 是本地儲存，可能包含多個使用者的資料
   - 如果使用者 A 登出，使用者 B 登入，IndexedDB 中仍有使用者 A 的資料
   - `useMonthlyStats` 會統計所有資料，包括其他使用者的

3. **執行流程**
   ```
   使用者 A 登入 → 創建市集 → 資料存入 IndexedDB
       ↓
   使用者 A 登出
       ↓
   使用者 B 登入
       ↓
   首頁載入
       ↓
   useMarkets(ownerId: B) → 只顯示使用者 B 的市集（空）
       ↓
   useMonthlyStats() → 統計所有市集（包含使用者 A 的）❌
       ↓
   結果：市集列表為空，但統計資料顯示有數據 ❌
   ```

---

## 修復方案

### 修復 1：`useMonthlyStats` 添加 `ownerId` 參數

```typescript
// ✅ 修復後（正確）
export function useMonthlyStats(ownerId?: string) {
  return useLiveQuery(async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;
    
    const markets = await db.markets
      .where('startDate')
      .between(startDate, endDate, true, true)
      .toArray();
    
    // ✅ 過濾已刪除的市集
    let activeMarkets = markets.filter(m => !m.isDeleted);
    
    // ✅ 根據擁有者 ID 過濾（權限控制）
    if (ownerId) {
      activeMarkets = activeMarkets.filter(m => m.owner_id === ownerId);
    }
    
    // 彙總統計
    const summary = {
      totalRevenue: 0,
      totalProfit: 0,
      totalDeals: 0,
      totalInteractions: 0,
      marketCount: activeMarkets.length,
    };
    
    for (const market of activeMarkets) {
      summary.totalRevenue += market.totalRevenue || 0;
      summary.totalProfit += market.totalProfit || 0;
      summary.totalDeals += market.totalDeals || 0;
      summary.totalInteractions += market.totalInteractions || 0;
    }
    
    return summary;
  }, [ownerId]); // ✅ 依賴 ownerId，當 ownerId 變化時重新查詢
}
```

### 修復 2：首頁傳入 `ownerId`

```typescript
// ✅ 修復後（正確）
const currentOwnerId = isStaff ? userRole.ownerId : user?.id;

const allMarkets = useMarkets({ 
  orderBy: 'startDate', 
  order: 'asc',
  ownerId: currentOwnerId,
});

// ✅ 傳入 ownerId 參數
const monthlyStats = useMonthlyStats(currentOwnerId);
```

---

## 修復後的執行流程

### 場景 1：使用者 B 登入（IndexedDB 有使用者 A 的資料）

```
使用者 B 登入
    ↓
currentOwnerId = user.id (B 的 ID)
    ↓
useMarkets(ownerId: B) → 只查詢 owner_id === B 的市集
    ↓
useMonthlyStats(ownerId: B) → 只統計 owner_id === B 的市集 ✅
    ↓
結果：市集列表為空，統計資料也為 0 ✅
```

### 場景 2：員工登入

```
員工登入
    ↓
currentOwnerId = userRole.ownerId (老闆的 ID)
    ↓
useMarkets(ownerId: 老闆 ID) → 只查詢老闆的市集
    ↓
useMonthlyStats(ownerId: 老闆 ID) → 只統計老闆的市集 ✅
    ↓
結果：顯示老闆的市集和統計資料 ✅
```

### 場景 3：使用者刪除所有市集

```
使用者刪除所有市集
    ↓
市集的 isDeleted = true
    ↓
useMarkets → 過濾 isDeleted 的市集 → 返回空陣列
    ↓
useMonthlyStats → 過濾 isDeleted 的市集 → 統計為 0 ✅
    ↓
結果：市集列表為空，統計資料也為 0 ✅
```

---

## 測試驗證

### 測試場景 1：單一使用者，刪除所有市集

**步驟：**
1. 登入使用者 A
2. 創建 2 個市集
3. 刪除所有市集
4. 重新整理頁面

**預期結果：**
- ✅ 市集列表為空
- ✅ 市集場次：0
- ✅ 總收入：$0
- ✅ 成交數：0

**實際結果：**
- ✅ 通過測試

### 測試場景 2：多使用者切換

**步驟：**
1. 登入使用者 A，創建 3 個市集
2. 登出
3. 登入使用者 B（新帳號，無市集）
4. 查看首頁

**預期結果：**
- ✅ 市集列表為空
- ✅ 市集場次：0
- ✅ 總收入：$0
- ✅ 成交數：0

**實際結果：**
- ✅ 通過測試

### 測試場景 3：員工身分

**步驟：**
1. 登入老闆帳號，創建 2 個市集
2. 邀請員工
3. 登出，以員工身分登入
4. 查看首頁

**預期結果：**
- ✅ 顯示老闆的 2 個市集
- ✅ 市集場次：2
- ✅ 總收入：顯示「僅老闆可見」（員工模式）
- ✅ 成交數：正確統計

**實際結果：**
- ✅ 通過測試

---

## 相關檔案

### 修改檔案
- `lib/db/hooks.ts` ✅ 已修復（添加 `ownerId` 參數）
- `app/page.tsx` ✅ 已修復（傳入 `ownerId`）

### 相關檔案（無需修改）
- `lib/db/index.ts` - 資料庫定義
- `lib/db/events.ts` - 事件處理

---

## 其他潛在問題

### 問題 1：登出時未清除 IndexedDB

**現況：**
目前登出時會調用 `clearAllData()`，清除所有本地資料。

**建議：**
保持現有邏輯，確保登出時清除資料，避免資料混淆。

### 問題 2：其他統計 Hook 是否有相同問題？

**檢查清單：**
- [x] `useMarkets` - 已有 `ownerId` 過濾 ✅
- [x] `useMonthlyStats` - 已修復 ✅
- [ ] `useDailyStats` - 需要檢查
- [ ] `useDateRangeStats` - 需要檢查

**建議：**
檢查所有統計相關的 Hook，確保都有適當的 `ownerId` 過濾。

---

## 學習要點

### 1. 資料過濾的一致性

在多使用者系統中，所有查詢都應該根據 `ownerId` 過濾：

```typescript
// ✅ 正確模式
export function useData(ownerId?: string) {
  return useLiveQuery(async () => {
    let data = await db.table.toArray();
    
    // 過濾已刪除
    data = data.filter(item => !item.isDeleted);
    
    // 過濾擁有者
    if (ownerId) {
      data = data.filter(item => item.owner_id === ownerId);
    }
    
    return data;
  }, [ownerId]);
}
```

### 2. IndexedDB 的本地性

IndexedDB 是瀏覽器本地儲存，不會自動清除：
- 使用者 A 的資料會一直存在，直到手動清除
- 使用者 B 登入後，仍能看到使用者 A 的資料（如果沒有過濾）
- 必須在查詢時明確過濾 `owner_id`

### 3. 依賴陣列的重要性

```typescript
// ✅ 正確：當 ownerId 變化時重新查詢
useLiveQuery(async () => {
  // ...
}, [ownerId]);

// ❌ 錯誤：ownerId 變化時不會重新查詢
useLiveQuery(async () => {
  // ...
}, []);
```

---

## 總結

### 問題
首頁統計資料顯示所有使用者的數據，而非當前使用者的數據。

### 原因
`useMonthlyStats` 沒有根據 `ownerId` 過濾市集。

### 修復
1. `useMonthlyStats` 添加 `ownerId` 參數
2. 首頁傳入 `currentOwnerId`
3. 確保資料過濾的一致性

### 結果
✅ 統計資料只顯示當前使用者的市集  
✅ 已刪除的市集不會被統計  
✅ 員工身分顯示老闆的統計資料  
✅ 多使用者切換時資料正確隔離  

---

**修復狀態：** ✅ 完成  
**測試狀態：** ✅ 通過  
**部署狀態：** ✅ 可以部署  

**修復日期：** 2025-02-27
