# 市集列表篩選邏輯修復

## 問題描述

對於多日期市集（不連續日期），原本的篩選邏輯使用 `startDate` 和 `endDate` 來判斷市集是否已結束。這導致以下問題：

**範例場景：**
- 市集日期：`['2024-02-10', '2024-02-15', '2024-02-20']`
- 今天：`2024-02-12`
- 問題：市集會被歸類為「已結束」，因為 `startDate (2024-02-10) < today`

**正確行為：**
- 因為還有未來的日期（`2024-02-15` 和 `2024-02-20`），應該歸類為「待舉辦」

## 修復方案

### 核心邏輯

1. **待舉辦（Upcoming）**
   - 檢查 `dates` 陣列中是否有**任何日期** >= 今天
   - 使用 `Array.some()`

2. **已結束（Completed）**
   - 檢查 `dates` 陣列中的**所有日期**是否都 < 今天
   - 使用 `Array.every()`

### 修改文件

#### `app/markets/page.tsx`

##### 1. 篩選函數 `getFilteredMarkets()`

**待舉辦邏輯：**
```typescript
case 'upcoming':
  return allMarkets.filter(m => {
    if (m.status !== 'paid' && m.status !== 'ongoing') return false;
    
    // ✅ 檢查 dates 陣列中是否有任何日期 >= 今天
    if (m.dates && m.dates.length > 0) {
      return m.dates.some(date => date >= today);
    }
    
    // 降級：使用 startDate（向後兼容）
    return m.startDate >= today;
  });
```

**已結束邏輯：**
```typescript
case 'completed':
  return allMarkets.filter(m => {
    if (m.status !== 'paid' && m.status !== 'ongoing') return false;
    
    // ✅ 檢查 dates 陣列中的所有日期是否都 < 今天
    if (m.dates && m.dates.length > 0) {
      return m.dates.every(date => date < today);
    }
    
    // 降級：使用 endDate（向後兼容）
    return m.endDate < today;
  });
```

##### 2. Tab 計數邏輯

同樣的邏輯也應用到 Tab 的計數：

```typescript
{ id: 'upcoming' as TabType, label: '待舉辦', count: (() => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return allMarkets?.filter(m => {
    if (m.status !== 'paid' && m.status !== 'ongoing') return false;
    // ✅ 檢查是否有任何日期 >= 今天
    if (m.dates && m.dates.length > 0) {
      return m.dates.some(date => date >= today);
    }
    return m.startDate >= today;
  }).length || 0;
})() },

{ id: 'completed' as TabType, label: '已結束', count: (() => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return allMarkets?.filter(m => {
    if (m.status !== 'paid' && m.status !== 'ongoing') return false;
    // ✅ 檢查所有日期是否都 < 今天
    if (m.dates && m.dates.length > 0) {
      return m.dates.every(date => date < today);
    }
    return m.endDate < today;
  }).length || 0;
})() },
```

## 測試場景

### 場景 1：單日市集
- 日期：`['2024-02-15']`
- 今天：`2024-02-10`
- 結果：待舉辦 ✅

### 場景 2：連續日期市集
- 日期：`['2024-02-10', '2024-02-11', '2024-02-12']`
- 今天：`2024-02-11`
- 結果：待舉辦 ✅（還有 2024-02-11 和 2024-02-12）

### 場景 3：不連續日期市集（部分已過）
- 日期：`['2024-02-10', '2024-02-15', '2024-02-20']`
- 今天：`2024-02-12`
- 結果：待舉辦 ✅（還有 2024-02-15 和 2024-02-20）

### 場景 4：不連續日期市集（全部已過）
- 日期：`['2024-02-10', '2024-02-15', '2024-02-20']`
- 今天：`2024-02-25`
- 結果：已結束 ✅（所有日期都已過）

### 場景 5：不連續日期市集（最後一天）
- 日期：`['2024-02-10', '2024-02-15', '2024-02-20']`
- 今天：`2024-02-20`
- 結果：待舉辦 ✅（今天還在進行）

## 向後兼容

對於沒有 `dates` 陣列的舊市集數據，會降級使用 `startDate` 和 `endDate`：

```typescript
// 降級邏輯
if (m.dates && m.dates.length > 0) {
  // 使用 dates 陣列
  return m.dates.some(date => date >= today);
}
// 降級：使用 startDate
return m.startDate >= today;
```

## 關鍵方法

### `Array.some()`
檢查陣列中是否**至少有一個**元素滿足條件：
```typescript
m.dates.some(date => date >= today)
// 只要有一個日期 >= 今天，就返回 true
```

### `Array.every()`
檢查陣列中是否**所有**元素都滿足條件：
```typescript
m.dates.every(date => date < today)
// 所有日期都 < 今天，才返回 true
```

## 影響範圍

- ✅ 市集列表頁面的「待舉辦」篩選
- ✅ 市集列表頁面的「已結束」篩選
- ✅ Tab 計數顯示
- ✅ 支援單日、連續、不連續日期市集
- ✅ 向後兼容舊數據

## 相關文件

- `app/markets/page.tsx` - 市集列表頁面
- `FEATURE-home-page-date-filtering.md` - 首頁日期篩選文檔（類似邏輯）
