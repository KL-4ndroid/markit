# 首頁市集日期篩選優化

## 問題描述

首頁的「今日市集」和「即將到來的市集」區塊使用 `startDate` 和 `endDate` 來判斷是否顯示市集。

對於多選日期的市集（例如：選擇 2/15, 2/17, 2/20），如果今天是 2/16，舊邏輯會錯誤地將該市集顯示在「今日市集」中，因為 2/16 在 startDate (2/15) 和 endDate (2/20) 之間，但實際上 2/16 並未被選擇。

## 解決方案

改為優先檢查 `dates` 陣列，只有當今天的日期存在於陣列中時才顯示。

### 1. 今日市集篩選

**修改前**：
```typescript
const todayMarkets = (() => {
  const markets = allMarkets?.filter(market => 
    market.startDate <= today && 
    market.endDate >= today &&
    market.status !== 'cancelled' && 
    market.status !== 'completed'
  ) || [];
  // ...
})();
```

**修改後**：
```typescript
const todayMarkets = (() => {
  const markets = allMarkets?.filter(market => {
    // 過濾已取消和已完成的市集
    if (market.status === 'cancelled' || market.status === 'completed') {
      return false;
    }
    
    // 優先檢查 dates 陣列（多選日期）
    if (market.dates && market.dates.length > 0) {
      return market.dates.includes(today);
    }
    
    // 降級：使用 startDate 和 endDate（連續日期）
    return market.startDate <= today && market.endDate >= today;
  }) || [];
  // ...
})();
```

### 2. 即將到來的市集篩選

**修改前**：
```typescript
const upcomingMarkets = allMarkets?.filter(market => 
  market.startDate > today && 
  (market.status === 'paid' || market.status === 'ongoing')
) || [];
```

**修改後**：
```typescript
const upcomingMarkets = allMarkets?.filter(market => {
  // 只顯示已繳費或如期舉行的市集
  if (market.status !== 'paid' && market.status !== 'ongoing') {
    return false;
  }
  
  // 優先檢查 dates 陣列（多選日期）
  if (market.dates && market.dates.length > 0) {
    // 檢查是否有任何日期在今天之後
    return market.dates.some(date => date > today);
  }
  
  // 降級：使用 startDate（連續日期）
  return market.startDate > today;
}) || [];
```

## 測試場景

### 場景 1：多選不連續日期
- **市集日期**：`['2024-02-15', '2024-02-17', '2024-02-20']`
- **今天**：`2024-02-16`
- **預期結果**：
  - ❌ 不顯示在「今日市集」（因為 2/16 不在 dates 陣列中）
  - ✅ 顯示在「即將到來的市集」（因為有日期 > 今天）

### 場景 2：多選連續日期
- **市集日期**：`['2024-02-15', '2024-02-16', '2024-02-17']`
- **今天**：`2024-02-16`
- **預期結果**：
  - ✅ 顯示在「今日市集」（因為 2/16 在 dates 陣列中）
  - ✅ 顯示在「即將到來的市集」（因為有日期 > 今天）

### 場景 3：連續日期（舊邏輯）
- **市集日期**：`dates` 為空或 undefined
- **startDate**：`2024-02-15`
- **endDate**：`2024-02-17`
- **今天**：`2024-02-16`
- **預期結果**：
  - ✅ 顯示在「今日市集」（降級到 startDate/endDate 判斷）
  - ✅ 不顯示在「即將到來的市集」（startDate 不大於今天）

### 場景 4：多選日期，最後一天
- **市集日期**：`['2024-02-15', '2024-02-17', '2024-02-20']`
- **今天**：`2024-02-20`
- **預期結果**：
  - ✅ 顯示在「今日市集」（因為 2/20 在 dates 陣列中）
  - ❌ 不顯示在「即將到來的市集」（沒有日期 > 今天）

## 關鍵改進

1. **精確判斷**：多選日期市集只在實際選擇的日期顯示
2. **向後兼容**：連續日期市集（無 dates 陣列）仍使用舊邏輯
3. **邏輯清晰**：優先檢查 dates 陣列，降級到 startDate/endDate

## 相關文件

- `app/page.tsx` - 首頁市集篩選邏輯
- `lib/utils.ts` - 日期工具函數
- `components/markets/MarketCard.tsx` - 市集卡片顯示邏輯
