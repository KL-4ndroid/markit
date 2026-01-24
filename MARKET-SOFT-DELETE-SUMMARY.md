# 市集軟刪除功能 - 實施總結

## ✅ 已完成的修改

### 1. **TypeScript 類型定義** (`types/db.ts`)
   - ✅ 添加 `isDeleted?: boolean` 到 `Market` 介面
   - ✅ 添加 `'market_deleted'` 事件類型
   - ✅ 添加 `MarketDeletedPayload` 介面

### 2. **事件處理器** (`lib/db/events.ts`)
   - ✅ 註冊 `market_deleted` 事件處理器
   - ✅ 軟刪除：設置 `isDeleted = true`

### 3. **本地資料庫** (`lib/db/index.ts`)
   - ✅ 添加 `isDeleted` 索引到 markets 表
   - ✅ 遷移時預設 `isDeleted = false`

### 4. **資料庫 Hooks** (`lib/db/hooks.ts`)
   - ✅ `useMarkets()` - 自動過濾已刪除的市集
   - ✅ `useUpcomingMarkets()` - 自動過濾已刪除的市集
   - ✅ `useMonthlyStats()` - 統計時排除已刪除的市集
   - ✅ 新增 `deleteMarket()` 函數

### 5. **市集詳情頁** (`app/markets/[id]/page.tsx`)
   - ✅ 修改「刪除記錄」按鈕使用軟刪除
   - ✅ 更新確認對話框文字說明

### 6. **Supabase Migration** (`016_market_soft_delete.sql`)
   - ✅ 添加 `is_deleted` 欄位
   - ✅ 添加索引
   - ✅ 更新 Trigger 處理 `market_deleted` 事件

### 7. **文檔** (`MARKET-SOFT-DELETE.md`)
   - ✅ 功能說明
   - ✅ 使用範例
   - ✅ 部署指南

---

## 🎯 核心功能

### 兩種不同的狀態

| 狀態 | 欄位 | 顯示 | 用途 | 按鈕位置 |
|------|------|------|------|---------|
| **已取消** | `status = 'cancelled'` | ✅ 顯示 | 市集因故取消，保留記錄 | 報名狀態區 |
| **已刪除** | `isDeleted = true` | ❌ 隱藏 | 用戶不想看到，從列表移除 | 頁面底部「刪除記錄」 |

---

## 📱 用戶體驗

### 刪除記錄流程

1. 用戶點擊「刪除記錄」按鈕
2. 顯示確認對話框：
   ```
   確認刪除記錄？
   
   刪除後，此市集將不再顯示在列表中，但數據仍會保留。
   提示：如果只是市集取消，建議使用「已取消」狀態。
   ```
3. 用戶確認後：
   - 記錄 `market_deleted` 事件
   - 設置 `isDeleted = true`
   - 顯示成功提示：「市集已刪除 - 記錄已從列表中移除」
   - 1 秒後返回市集列表

### 列表顯示

- ✅ 正常市集：顯示在列表中
- ✅ 已取消市集：顯示在列表中（狀態標記為「已取消」）
- ❌ 已刪除市集：不顯示在列表中

---

## 🔧 技術實現

### 軟刪除函數

```typescript
// lib/db/hooks.ts
export async function deleteMarket(marketId: string, reason?: string): Promise<void> {
  await recordEvent('market_deleted', { marketId, reason });
}
```

### 事件處理

```typescript
// lib/db/events.ts
registerEventHandler('market_deleted', async (event, db) => {
  const { marketId } = event.payload;
  
  await db.markets.update(marketId, {
    isDeleted: true,
    updatedAt: event.timestamp,
  });
  
  console.log(`🗑️ 市集已刪除（軟刪除）：ID ${marketId}`);
});
```

### 自動過濾

```typescript
// lib/db/hooks.ts
export function useMarkets(options?: { includeDeleted?: boolean }) {
  return useLiveQuery(async () => {
    const markets = await db.markets.toArray();
    
    // ✅ 自動過濾已刪除的市集
    return options?.includeDeleted 
      ? markets 
      : markets.filter(m => !m.isDeleted);
  }, [options?.includeDeleted]);
}
```

---

## 🚀 部署步驟

### 步驟 1：執行 Supabase Migration

在 Supabase Dashboard 的 SQL Editor 執行：

```sql
-- 複製並執行 supabase/migrations/016_market_soft_delete.sql
```

### 步驟 2：驗證結構

```sql
-- 檢查欄位
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'markets' AND column_name = 'is_deleted';

-- 應該看到：
-- is_deleted | boolean | false
```

### 步驟 3：測試功能

1. 打開市集詳情頁
2. 滾動到底部，點擊「刪除記錄」
3. 確認刪除
4. 返回市集列表，確認該市集不再顯示

---

## 📊 數據影響

### 統計自動排除已刪除的市集

```typescript
// 本月統計
export function useMonthlyStats() {
  return useLiveQuery(async () => {
    const markets = await db.markets
      .where('startDate')
      .between(startDate, endDate)
      .toArray();
    
    // ✅ 過濾已刪除的市集
    const activeMarkets = markets.filter(m => !m.isDeleted);
    
    return {
      marketCount: activeMarkets.length,  // 不包含已刪除的
      totalRevenue: activeMarkets.reduce((sum, m) => sum + (m.totalRevenue || 0), 0),
      // ...
    };
  }, []);
}
```

---

## 🎉 優勢

### 1. 用戶體驗
- ✅ 清爽的列表（不顯示不需要的市集）
- ✅ 明確的狀態區分（取消 vs 刪除）
- ✅ 友好的提示文字

### 2. 數據安全
- ✅ 不會真正刪除數據
- ✅ 可以隨時恢復（如果需要）
- ✅ 保留完整的事件歷史

### 3. 實現簡單
- ✅ 只需過濾 `isDeleted = false`
- ✅ 添加索引，查詢快速
- ✅ 不影響現有功能

---

## 📝 相關文檔

- `MARKET-SOFT-DELETE.md` - 詳細功能說明
- `supabase/migrations/016_market_soft_delete.sql` - 資料庫 Migration
- `types/db.ts` - TypeScript 類型定義
- `lib/db/hooks.ts` - 資料庫 Hooks
- `lib/db/events.ts` - 事件處理器
- `app/markets/[id]/page.tsx` - 市集詳情頁

---

## 🎯 總結

市集軟刪除功能已完整實現！

**核心概念**：
- 「已取消」= 業務狀態（市集因故取消，仍顯示）
- 「已刪除」= 軟刪除標記（用戶不想看到，隱藏）

**用戶操作**：
- 點擊「刪除記錄」→ 軟刪除 → 不再顯示在列表中

**技術實現**：
- 簡單：只需過濾 `isDeleted = false`
- 安全：數據不會真正刪除
- 高效：添加索引，查詢快速

現在只需執行 Supabase Migration 即可上線！ 🚀
