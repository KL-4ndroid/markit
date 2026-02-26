# 商品同步問題修復報告

## 🐛 問題描述

**症狀**：
- 老闆帳號 A 新增兩個商品
- 員工帳號 B 登入後看不到老闆新增的商品
- 編輯商品也無法同步

## 🔍 根本原因分析

### 問題 1：`actor_id` 設置錯誤

**位置**：`lib/db/events.ts` - `recordEvent` 函數

**原始代碼**：
```typescript
const event: Event<T> = {
  id,
  type,
  payload,
  timestamp: Date.now(),
  actor_id: 'local', // ❌ 硬編碼為 'local'
  sync_status: 'local_only',
  // ...
};
```

**問題**：
- 所有本地創建的事件 `actor_id` 都是 `'local'`
- 上傳到 Supabase 時會被替換為真實用戶 ID
- 但這導致本地和雲端的 `actor_id` 不一致

### 問題 2：下載查詢條件錯誤

**位置**：`hooks/useSync.ts` - `pullAllEvents` 和 `pullIncrementalEvents` 函數

**原始代碼**：
```typescript
// ❌ 只查詢當前用戶自己的商品事件
if (marketIds.length > 0) {
  query = query.or(`market_id.in.(${marketIds.join(',')}),and(actor_id.eq.${userId},market_id.is.null)`);
}
```

**問題**：
- 商品事件的 `market_id` 是 `NULL`（商品不綁定市集）
- 查詢條件 `actor_id.eq.${userId}` 只查詢當前用戶創建的商品
- **結果**：員工 B 只能看到自己創建的商品，看不到老闆 A 的商品

### 問題 3：團隊協作邏輯缺失

**核心問題**：
- 商品應該在**團隊內共享**（老闆和員工都能看到）
- 但原始邏輯只查詢 `actor_id = 當前用戶` 的商品
- 缺少「查詢團隊成員的商品」的邏輯

## ✅ 解決方案

### 修復 1：獲取真實的 `actor_id`

**文件**：`lib/db/events.ts`

**修改內容**：
```typescript
// ✅ 獲取真實的用戶 ID（用於同步）
let actor_id = 'local'; // 預設值
if (typeof window !== 'undefined') {
  try {
    const { supabase } = await import('@/lib/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      actor_id = user.id;
    }
  } catch (error) {
    console.warn('⚠️ 無法獲取用戶 ID，使用預設值 "local"');
  }
}

const event: Event<T> = {
  id,
  type,
  payload,
  timestamp: Date.now(),
  actor_id, // ✅ 使用真實的用戶 ID
  sync_status: 'local_only',
  // ...
};
```

**效果**：
- 本地創建事件時就使用真實的用戶 ID
- 本地和雲端的 `actor_id` 保持一致

### 修復 2：查詢團隊成員的商品

**文件**：`hooks/useSync.ts`

**修改內容**：
```typescript
// ✅ 修復：查詢團隊成員的用戶 ID（包括老闆和員工）
let teamMemberIds: string[] = [userId]; // 至少包含自己

if (marketIds.length > 0) {
  // 查詢所有團隊成員
  const { data: teamMembers } = await supabase
    .from('market_members')
    .select('user_id')
    .in('market_id', marketIds);
  
  if (teamMembers && teamMembers.length > 0) {
    // 去重
    teamMemberIds = Array.from(new Set([userId, ...teamMembers.map(m => m.user_id)]));
  }
}

// ✅ 過濾條件：市集事件 OR 團隊成員的全局事件（包括商品）
if (marketIds.length > 0) {
  // 有市集：查詢市集事件 + 團隊成員的全局事件
  query = query.or(`market_id.in.(${marketIds.join(',')}),and(actor_id.in.(${teamMemberIds.join(',')}),market_id.is.null)`);
} else {
  // 沒有市集：只拉取自己的全局事件
  query = query.eq('actor_id', userId).is('market_id', null);
}
```

**效果**：
- 查詢所有團隊成員（通過 `market_members` 表關聯）
- 下載團隊成員的商品事件（`actor_id.in.(團隊成員ID列表)`）
- 員工可以看到老闆的商品，老闆也可以看到員工的商品

### 修復 3：同步增量事件邏輯

**文件**：`hooks/useSync.ts` - `pullIncrementalEvents` 函數

**修改內容**：同樣的團隊成員查詢邏輯

**效果**：
- 快照同步後的增量事件也能正確下載團隊成員的商品

## 📊 修復後的數據流

### 創建商品流程

```
老闆 A 創建商品
    ↓
recordEvent('product_created', {...})
    ↓
actor_id = A 的用戶 ID (✅ 真實 ID)
    ↓
存入本地 IndexedDB
    ↓
上傳到 Supabase (actor_id = A)
```

### 員工同步流程

```
員工 B 登入
    ↓
查詢 market_members 表
    ↓
找到團隊成員：[A, B]
    ↓
下載事件：
  - market_id IN (市集列表)
  - OR (actor_id IN [A, B] AND market_id IS NULL) ✅
    ↓
下載到老闆 A 的商品事件
    ↓
重放事件到本地 IndexedDB
    ↓
員工 B 可以看到老闆 A 的商品 ✅
```

## 🧪 測試建議

### 測試場景 1：新增商品

1. 老闆 A 登入，新增商品「手工陶杯」
2. 員工 B 登入，點擊同步
3. **預期結果**：員工 B 可以看到「手工陶杯」

### 測試場景 2：編輯商品

1. 老闆 A 編輯商品「手工陶杯」，改價格為 500
2. 員工 B 點擊同步
3. **預期結果**：員工 B 看到價格更新為 500

### 測試場景 3：員工新增商品

1. 員工 B 新增商品「手工項鍊」
2. 老闆 A 點擊同步
3. **預期結果**：老闆 A 可以看到「手工項鍊」

### 測試場景 4：多市集團隊

1. 老闆 A 創建市集 M1，邀請員工 B
2. 老闆 A 創建市集 M2，邀請員工 C
3. 老闆 A 新增商品「手工包」
4. **預期結果**：
   - 員工 B 可以看到「手工包」（通過 M1 關聯）
   - 員工 C 可以看到「手工包」（通過 M2 關聯）

## 🔒 權限說明

### Supabase RLS 政策

**已有的政策**（`015_fix_events_rls_policy.sql`）：

```sql
CREATE POLICY "用戶可以查看自己的事件和市集事件"
ON events FOR SELECT
TO authenticated
USING (
  -- 自己創建的事件（包括 market_id = NULL 的商品事件）
  actor_id = auth.uid()
  OR
  -- 自己參與的市集的事件
  (
    market_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM market_members
      WHERE market_id = events.market_id
        AND user_id = auth.uid()
    )
  )
);
```

**問題**：
- 這個政策**只允許查詢自己的商品事件**（`actor_id = auth.uid()`）
- 不允許查詢團隊成員的商品事件

### ⚠️ 需要更新 RLS 政策

**建議新增政策**：

```sql
-- 允許查詢團隊成員的商品事件
CREATE POLICY "用戶可以查看團隊成員的商品事件"
ON events FOR SELECT
TO authenticated
USING (
  -- 自己創建的事件
  actor_id = auth.uid()
  OR
  -- 自己參與的市集的事件
  (
    market_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM market_members
      WHERE market_id = events.market_id
        AND user_id = auth.uid()
    )
  )
  OR
  -- ✅ 新增：團隊成員的全局事件（商品）
  (
    market_id IS NULL AND
    actor_id IN (
      SELECT DISTINCT m2.user_id
      FROM market_members m1
      JOIN market_members m2 ON m1.market_id = m2.market_id
      WHERE m1.user_id = auth.uid()
    )
  )
);
```

## 📝 後續工作

### 必須執行

1. **更新 Supabase RLS 政策**（見上方建議）
2. **測試所有場景**（見測試建議）
3. **清理測試數據**（如果有）

### 可選優化

1. **商品權限細化**：
   - 目前所有團隊成員都能看到所有商品
   - 未來可以添加「私有商品」功能

2. **性能優化**：
   - 如果團隊成員很多，`actor_id.in.(...)` 查詢可能較慢
   - 可以考慮添加索引或使用視圖

3. **離線支持**：
   - 目前 `recordEvent` 需要網路才能獲取用戶 ID
   - 可以考慮緩存用戶 ID 到 localStorage

## ✅ 修復完成

**修改的文件**：
1. `lib/db/events.ts` - 修復 `actor_id` 獲取邏輯
2. `hooks/useSync.ts` - 修復下載查詢條件（2 處）

**預期效果**：
- ✅ 員工可以看到老闆的商品
- ✅ 老闆可以看到員工的商品
- ✅ 編輯商品可以正確同步
- ✅ 團隊協作功能正常運作

**注意事項**：
- ⚠️ 需要更新 Supabase RLS 政策（見上方）
- ⚠️ 建議清理舊的測試數據後重新測試
