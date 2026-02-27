# 🐛 Bug 修復報告 - 首頁統計應只計算有效狀態的市集

## 問題描述

**症狀：**
首頁頂端的「市集場次」統計包含了所有狀態的市集，包括「已取消」、「已完成」等不應該計入的市集。

**預期行為：**
首頁統計應該只計算「已繳費」(paid) 和「如期舉行」(ongoing) 狀態的市集。

---

## 根本原因分析

### 問題檔案
`lib/db/hooks.ts` - `useMonthlyStats` Hook

### 錯誤程式碼

```typescript
// ❌ 修復前（錯誤）
export function useMonthlyStats(ownerId?: string) {
  return useLiveQuery(async () => {
    // ...
    
    // ✅ 有過濾已刪除的市集
    let activeMarkets = markets.filter(m => !m.isDeleted);
    
    // ✅ 有根據 ownerId 過濾
    if (ownerId) {
      activeMarkets = activeMarkets.filter(m => m.owner_id === ownerId);
    }
    
    // ❌ 但沒有根據狀態過濾
    // 導致統計了所有狀態的市集（包括已取消、已完成等）
    
    const summary = {
      marketCount: activeMarkets.length, // ❌ 包含所有狀態
      // ...
    };
    
    for (const market of activeMarkets) {
      summary.totalRevenue += market.totalRevenue || 0;
      // ...
    }
    
    return summary;
  }, [ownerId]);
}
```

### 問題分析

1. **市集狀態定義**
   ```typescript
   type MarketStatus = 
     | 'pending'    // 待繳費
     | 'paid'       // 已繳費 ✅ 應該計入
     | 'ongoing'    // 如期舉行 ✅ 應該計入
     | 'cancelled'  // 已取消 ❌ 不應計入
     | 'completed'  // 已完成 ❌ 不應計入（已結束）
   ```

2. **統計邏輯問題**
   - 目前只過濾了 `isDeleted` 和 `ownerId`
   - 沒有根據 `status` 過濾
   - 導致「已取消」和「已完成」的市集也被計入統計

3. **業務邏輯**
   - 「市集場次」應該代表「有效的市集數量」
   - 「已取消」的市集不應該計入（沒有實際舉辦）
   - 「已完成」的市集可能需要根據業務需求決定是否計入
   - 根據使用者需求，只計算「已繳費」和「如期舉行」的市集

---

## 修復方案

### 修復程式碼

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
    
    // ✅ 根據擁有者 ID 過濾
    if (ownerId) {
      activeMarkets = activeMarkets.filter(m => m.owner_id === ownerId);
    }
    
    // ✅ 只統計「已繳費」和「如期舉行」狀態的市集
    const validMarkets = activeMarkets.filter(m => 
      m.status === 'paid' || m.status === 'ongoing'
    );
    
    // 彙總統計
    const summary = {
      totalRevenue: 0,
      totalProfit: 0,
      totalDeals: 0,
      totalInteractions: 0,
      marketCount: validMarkets.length,  // ✅ 只計算有效狀態的市集
    };
    
    // ✅ 只累加有效市集的統計
    for (const market of validMarkets) {
      summary.totalRevenue += market.totalRevenue || 0;
      summary.totalProfit += market.totalProfit || 0;
      summary.totalDeals += market.totalDeals || 0;
      summary.totalInteractions += market.totalInteractions || 0;
    }
    
    return summary;
  }, [ownerId]);
}
```

### 修復要點

1. **添加狀態過濾**
   ```typescript
   const validMarkets = activeMarkets.filter(m => 
     m.status === 'paid' || m.status === 'ongoing'
   );
   ```

2. **只統計有效市集**
   - 市集場次：`validMarkets.length`
   - 總收入、成交數等：只累加 `validMarkets` 的數據

3. **過濾順序**
   ```
   1. 過濾已刪除的市集 (isDeleted)
   2. 過濾擁有者 (owner_id)
   3. 過濾狀態 (status === 'paid' || 'ongoing')
   4. 統計數據
   ```

---

## 修復後的行為

### 場景 1：本月有 5 個市集

```
市集 A: status = 'paid'      ✅ 計入統計
市集 B: status = 'ongoing'   ✅ 計入統計
市集 C: status = 'cancelled' ❌ 不計入統計
市集 D: status = 'completed' ❌ 不計入統計
市集 E: status = 'pending'   ❌ 不計入統計

結果：市集場次 = 2（只有 A 和 B）
```

### 場景 2：市集被取消

```
使用者創建市集 → status = 'paid'
    ↓
首頁顯示：市集場次 = 1 ✅
    ↓
使用者取消市集 → status = 'cancelled'
    ↓
首頁顯示：市集場次 = 0 ✅
```

### 場景 3：市集完成

```
市集進行中 → status = 'ongoing'
    ↓
首頁顯示：市集場次 = 1 ✅
    ↓
市集結束 → status = 'completed'
    ↓
首頁顯示：市集場次 = 0 ✅
```

---

## 測試驗證

### 測試場景 1：只有已繳費的市集

**步驟：**
1. 創建 3 個市集，狀態都是 'paid'
2. 查看首頁統計

**預期結果：**
- ✅ 市集場次：3

**實際結果：**
- ✅ 通過測試

### 測試場景 2：混合狀態的市集

**步驟：**
1. 創建 5 個市集：
   - 2 個 'paid'
   - 1 個 'ongoing'
   - 1 個 'cancelled'
   - 1 個 'completed'
2. 查看首頁統計

**預期結果：**
- ✅ 市集場次：3（2 個 paid + 1 個 ongoing）

**實際結果：**
- ✅ 通過測試

### 測試場景 3：取消市集

**步驟：**
1. 創建 2 個市集，狀態都是 'paid'
2. 首頁顯示：市集場次 = 2
3. 取消其中 1 個市集（status 改為 'cancelled'）
4. 重新整理首頁

**預期結果：**
- ✅ 市集場次：1

**實際結果：**
- ✅ 通過測試

---

## 相關檔案

### 修改檔案
- `lib/db/hooks.ts` ✅ 已修復（添加狀態過濾）

### 相關檔案（無需修改）
- `app/page.tsx` - 首頁組件（已正確使用 `useMonthlyStats`）
- `types/db.ts` - 市集狀態定義

---

## 業務邏輯說明

### 市集狀態流程

```
創建市集
    ↓
status = 'pending' (待繳費) ❌ 不計入統計
    ↓
繳費完成
    ↓
status = 'paid' (已繳費) ✅ 計入統計
    ↓
市集開始
    ↓
status = 'ongoing' (如期舉行) ✅ 計入統計
    ↓
市集結束
    ↓
status = 'completed' (已完成) ❌ 不計入統計

或者：
    ↓
取消市集
    ↓
status = 'cancelled' (已取消) ❌ 不計入統計
```

### 為什麼「已完成」不計入？

1. **業務邏輯**
   - 「市集場次」代表「即將舉行或正在舉行的市集」
   - 「已完成」的市集已經結束，不應該計入「當前有效」的市集

2. **使用者體驗**
   - 使用者關心的是「還有多少市集要參加」
   - 已經結束的市集不需要再關注

3. **統計意義**
   - 如果需要查看「本月總共舉辦了多少市集」，應該使用其他統計 API
   - 首頁的「市集場次」應該是「有效市集數量」

---

## 其他建議

### 建議 1：添加「本月已完成市集」統計

如果需要查看本月總共舉辦了多少市集，可以添加一個新的統計：

```typescript
export function useMonthlyCompletedStats(ownerId?: string) {
  // 統計所有狀態的市集（包括已完成）
  // 用於歷史記錄和報表
}
```

### 建議 2：市集列表頁面的過濾

確保市集列表頁面也使用相同的過濾邏輯：

```typescript
// 市集列表應該顯示所有狀態（包括已完成）
const allMarkets = useMarkets({ ownerId });

// 但可以提供篩選器讓使用者選擇
const activeMarkets = allMarkets.filter(m => 
  m.status === 'paid' || m.status === 'ongoing'
);
```

### 建議 3：統一過濾邏輯

建立一個工具函數來統一過濾邏輯：

```typescript
// lib/utils/market-filters.ts
export function isActiveMarket(market: Market): boolean {
  return !market.isDeleted && 
         (market.status === 'paid' || market.status === 'ongoing');
}

// 使用
const validMarkets = markets.filter(isActiveMarket);
```

---

## 總結

### 問題
首頁統計包含了所有狀態的市集，包括已取消和已完成的市集。

### 原因
`useMonthlyStats` 沒有根據市集狀態過濾。

### 修復
添加狀態過濾，只統計「已繳費」(paid) 和「如期舉行」(ongoing) 的市集。

### 結果
✅ 市集場次只計算有效狀態的市集  
✅ 已取消的市集不計入統計  
✅ 已完成的市集不計入統計  
✅ 統計數據更符合業務邏輯  

---

**修復狀態：** ✅ 完成  
**測試狀態：** ✅ 通過  
**部署狀態：** ✅ 可以部署  

**修復日期：** 2025-02-27
