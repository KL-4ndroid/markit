# 員工模式數據同步修復

## 問題描述

當使用者 B 登入員工帳號時（員工模式），並沒有正確取得使用者 A（老闆）的市集數據。

## 根本原因

員工視圖只有 `staff_accessible_markets` 和 `staff_accessible_products`，**缺少 `staff_accessible_events` 視圖**。

而且在 `useSync.ts` 的 `pullEventsFromViews` 函數中，也只拉取了市集和商品，沒有拉取事件。

**事件是 Event Sourcing 架構的核心**，沒有事件就無法重建讀取模型（市集統計、商品庫存等）。

## 解決方案

### 1. 創建員工事件視圖（Supabase）

在 Supabase Dashboard 的 SQL Editor 中執行以下 SQL：

```sql
-- ==================== 創建員工事件視圖 ====================
-- 版本：027 - 支援員工模式拉取事件
-- 日期：2026-02-28

-- 刪除舊視圖（如果存在）
DROP VIEW IF EXISTS staff_accessible_events;

-- 創建員工事件視圖
CREATE OR REPLACE VIEW staff_accessible_events AS
-- 1. 員工可以查看老闆市集的事件
SELECT 
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'

UNION ALL

-- 2. 員工可以查看老闆的全局事件（商品事件等，market_id = NULL）
SELECT 
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM events e
JOIN staff_relationships sr ON sr.owner_id = e.actor_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'
AND e.market_id IS NULL

UNION ALL

-- 3. 老闆可以查看自己的所有事件
SELECT 
  e.*,
  e.actor_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM events e
WHERE e.actor_id = auth.uid()

UNION ALL

-- 4. 老闆可以查看自己市集的所有事件（包括員工創建的）
SELECT 
  e.*,
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
WHERE mm.user_id = auth.uid()
AND e.actor_id != auth.uid(); -- 避免與上面的 UNION 重複

-- 註解
COMMENT ON VIEW staff_accessible_events IS 
'員工可訪問的事件視圖：包含老闆市集的事件和老闆的全局事件';
```

### 2. 更新前端代碼（已完成）

已更新 `hooks/useSync.ts`：

1. ✅ 在 `pullEventsFromViews` 函數中添加事件拉取邏輯
2. ✅ 創建 `syncEventsToIndexedDB` 函數，重放事件以更新讀取模型
3. ✅ 支援駝峰式/底線式轉換（Supabase 使用底線式，前端使用駝峰式）

## 執行步驟

### 步驟 1：執行 SQL Migration

1. 打開 Supabase Dashboard
2. 進入 SQL Editor
3. 複製上面的 SQL 代碼
4. 執行

### 步驟 2：測試員工模式

1. 使用老闆帳號登入，創建市集和商品
2. 邀請員工（使用者 B）
3. 使用員工帳號登入
4. 接受邀請
5. 檢查是否能看到老闆的市集、商品和統計數據

### 步驟 3：驗證數據同步

打開瀏覽器控制台，應該看到：

```
📊 員工模式已啟用，嘗試從視圖拉取數據...
📥 拉取到 X 個市集
📥 拉取到 X 個商品
📥 拉取到 X 個事件
📝 同步 X 個事件到 IndexedDB...
✅ 事件同步完成：處理 X，跳過 X，總計 X
✅ 視圖數據同步完成
```

## 技術細節

### Event Sourcing 架構

本系統使用 Event Sourcing 架構：

- **事件表（events）**：記錄所有操作的事件流
- **讀取模型（markets, products）**：從事件重建的快照

員工模式必須拉取事件，才能正確重建讀取模型。

### 視圖設計

`staff_accessible_events` 視圖包含 4 種事件：

1. **老闆市集的事件**：員工可以查看老闆市集的所有事件
2. **老闆的全局事件**：員工可以查看老闆的商品事件（market_id = NULL）
3. **老闆自己的事件**：老闆可以查看自己的所有事件
4. **市集內的事件**：老闆可以查看市集內所有成員的事件（包括員工創建的）

### 權限控制

視圖自動附加權限信息：

- `access_type`：'staff' 或 'owner'
- `permissions`：JSON 格式的權限設定
- `relationship_owner_id`：關係的擁有者 ID

前端可以根據這些信息控制 UI 顯示和操作權限。

## 相關文件

- `supabase/migrations/027_add_staff_events_view.sql` - SQL Migration
- `hooks/useSync.ts` - 同步邏輯
- `lib/db/events.ts` - 事件處理器
- `lib/db/feature-flags.ts` - 員工模式開關

## 注意事項

1. **必須先執行 SQL Migration**，否則前端會報錯（視圖不存在）
2. **員工接受邀請後需要重新載入頁面**，才會觸發視圖拉取
3. **事件重放順序很重要**，必須按 timestamp 升序處理
4. **駝峰式/底線式轉換**：Supabase 使用底線式，前端使用駝峰式，需要轉換
5. **lastSyncAt 跨用戶污染問題**：員工模式不使用 lastSyncAt 過濾，每次都完整同步

## 已知問題與修復

### 問題 1：員工登入後只同步最新的 2 個市集

**症狀**：
- 員工 A 登入後同步了所有市集
- 員工 B 登入後只能看到最新的 2 個市集
- 舊的市集數據被忽略

**根本原因**：
`lastSyncAt` 是存儲在 IndexedDB 的 `settings` 表中，**這個時間戳是全局的，不區分用戶**。

當員工 A 登入並同步後，`lastSyncAt` 被更新為最新時間。然後員工 B 登入時，系統讀取到的 `lastSyncAt` 是員工 A 的同步時間，所以只會拉取在那之後的新事件，導致舊的市集數據被忽略。

**解決方案**：
員工模式從視圖拉取時，**不使用 `lastSyncAt` 過濾**，每次都完整同步所有可訪問的數據。

理由：
1. 視圖已經處理了權限過濾（只返回該員工可訪問的數據）
2. `lastSyncAt` 是全局的，會被其他用戶污染
3. 員工切換時需要完整同步所有可訪問的數據
4. 員工模式的數據量通常不大（只有老闆的市集），完整同步不會有性能問題

**修復代碼**：
已在 `hooks/useSync.ts` 的 `pullEventsFromViews` 函數中移除 `lastSyncAt` 過濾邏輯。

### 問題 2：員工模式使用快照同步導致數據不完整

**症狀**：
- 員工登入後只能看到部分市集
- 控制台顯示 `📊 已載入: 4 市集`，但實際應該有更多

**根本原因**：
員工模式使用了快照同步（`pullEventsWithSnapshot`），但快照是老闆創建的，**不包含員工視圖的權限信息**（`access_type`, `permissions`, `relationship_owner_id`）。

快照同步流程：
1. 載入快照（4 個市集，但沒有權限信息）
2. 重放增量事件（包括刪除事件）
3. 最終市集數量不正確，且缺少權限信息

**解決方案**：
員工模式**不使用快照同步**，直接從視圖拉取完整數據（包含權限信息）。

在 `pullEventsWithSnapshot` 函數開頭添加員工模式檢查：

```typescript
// ✅ 檢查是否為員工模式
const { isStaffModeEnabled } = await import('@/lib/db/feature-flags');
const staffModeEnabled = isStaffModeEnabled();

if (staffModeEnabled) {
  console.log('👥 員工模式：跳過快照，直接從視圖拉取');
  await pullAllEvents(userId, onProgress);
  return false; // 沒有使用快照
}
```

**修復代碼**：
已在 `hooks/useSync.ts` 的 `pullEventsWithSnapshot` 函數中添加員工模式檢查，跳過快照同步。

## 測試清單

- [ ] SQL Migration 執行成功
- [ ] 員工可以看到老闆的市集列表
- [ ] 員工可以看到老闆的商品列表
- [ ] 員工可以看到市集的統計數據（收入、利潤、互動、成交）
- [ ] 員工可以記錄互動和成交
- [ ] 員工無法編輯市集和商品
- [ ] 員工無法查看成本和利潤（UI 隱藏）
