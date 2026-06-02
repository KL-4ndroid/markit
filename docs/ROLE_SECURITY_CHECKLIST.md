# 角色安全驗證清單（Role Security Checklist）

> 文件版本：2026-06-02 v3
> 用途：老闆 / 員工權限系統的安全驗證參照，確認 RLS、資料流、UI 遮罩與同步邏輯的正確性。

---

## 0. Migration 狀態

| Migration | 檔案 | 狀態 | 說明 |
|---|---|---|---|
| 035 | `035_fix_p0_rls_security.sql` | **已套用並通過 P0 驗證** | Phase 8E/8F。Owner membership backfill 完成（V10 預檢由 4 rows → 0 rows）。`market_members` RLS、INSERT/SELECT/DELETE policy、`markets_select_secure`、`products_select_temp` 移除均已驗證。|

> ✅ **Migration 035 已套用到 Supabase**：2026-06-02 完成 V10 backfill 及 P0 驗證。

---

## 1. 角色來源驗證

### 1.1 useUserRole 是否唯一角色來源

| 檢查項 | 實作位置 | 狀態 | 備註 |
|---|---|---|---|
| `useUserRole()` 是 UI 層唯一角色來源 | `hooks/useUserRole.ts` | 通過 | 所有元件透過此 hook 取得 `isStaff` |
| 元件未直接查 `staff_relationships` | 所有 `.tsx` 元件 | 通過 | Phase 7 前直接查詢已收斂 |
| `useSync` 接收 `roleMode` 而非自行判斷角色 | `hooks/useSync.ts` | 通過 | Phase 6A-1 |

### 1.2 SyncProvider 是否使用 roleMode

| 檢查項 | 實作位置 | 狀態 | 備註 |
|---|---|---|---|
| `SyncProvider` 接收 `roleMode` prop | `app/providers.tsx` | 通過 | |
| `useSync()` 使用 `resolveRoleMode(userRole)` | `hooks/useSync.ts` | 通過 | |
| `roleMode === 'staff'` 時走 `pullEventsFromViews()` | `hooks/useSync.ts` | 通過 | |
| `roleMode === 'owner'` 時走 `pullEventsWithSnapshot()` | `hooks/useSync.ts` | 通過 | |

### 1.3 feature_staff_mode 是否已移除

| 檢查項 | 實作位置 | 狀態 | 備註 |
|---|---|---|---|
| `lib/db/feature-flags.ts` 已刪除 | — | 通過 | Phase 6B-2 |
| `diagnose-staff-products.js` 已刪除 | — | 通過 | Phase 6B-2 |
| `enableStaffMode()` 無任何呼叫 | `LoginModal`, `StaffInvitationDialog`, `join/page` | 通過 | Phase 6B-1, 6A-2 |
| `isStaffModeEnabled()` 無任何引用 | 全域 | 通過 | Phase 6B-2 |

---

## 2. 員工資料存取驗證

### 2.1 存取範圍控制

| 檢查項 | 實作位置 | 狀態 | 備註 |
|---|---|---|---|
| staff 只能看到 owner 的 markets | `staff_accessible_markets` 視圖（migration 020） | 通過 | JOIN 條件 `sr.staff_id = auth.uid() AND sr.status = 'active'` |
| staff 只能看到 owner 的 products | `staff_accessible_products` 視圖（migration 029） | 通過 | JOIN 條件同上 |
| staff 只能同步授權範圍內的 events | `staff_accessible_events` 視圖（migration 027） | 通過 | JOIN 條件同上 |
| 視圖過濾只取 `status = 'active'` 的關係 | 各 staff_accessible_* 視圖 | 通過 | `sr.status = 'active'` |

### 2.2 員工 revoke 後的存取控制

| 檢查項 | 實作位置 | 狀態 | 備註 |
|---|---|---|---|
| `status` 改為 `'revoked'` 而非物理刪除 | `revokeStaff()` in `lib/supabase/staff.ts` | 通過 | Phase 7B-3 |
| `removeStaff()` 清理 `market_members` | `lib/supabase/staff.ts` | 通過 | Phase 7B-2 |
| `staff_accessible_*` 視圖立即排除 revoked 員工 | 各視圖 WHERE 條件 | 通過 | `sr.status = 'active'` |
| 員工端角色快取最多 5 分鐘後失效 | `ROLE_CACHE_TTL_MS` = 5 分鐘 | 通過 | Phase 5B-1 |
| 同步遇到 permission error 後停止 10 分鐘 | `hooks/useSync.ts` sync pause | 通過 | 10 分鐘 pause on permission error |

---

## 3. RLS 檢查表

> 注意：以下為 migration 中定義的 RLS 政策。**需於 Supabase Dashboard 確認實際政策是否存在且正確。**

### 3.1 staff_relationships

| 政策名稱 | 操作 | 條件 | 狀態 |
|---|---|---|---|
| Owners can manage their staff | ALL | `auth.uid() = owner_id` | 待確認 |
| Staff can view their relationships | SELECT | `auth.uid() = staff_id` | 待確認 |
| Staff can accept invitations | UPDATE | `auth.uid() = staff_id AND status = 'pending'` | 待確認 |

### 3.2 staff_invitations

| 政策名稱 | 操作 | 條件 | 狀態 |
|---|---|---|---|
| — | — | — | 待確認 |

### 3.3 market_members

| 政策名稱 | 操作 | 條件 | 狀態 |
|---|---|---|---|
| `market_members_select_secure` | SELECT | `market_id IN current_user_market_ids()`（SECURITY DEFINER helper）| 通過（Supabase 已驗證）|
| `market_members_delete_owner_or_self_staff` | DELETE | `role = 'staff' AND (user_id = auth.uid() OR market_id IN current_user_owned_market_ids())` | 通過（Supabase 已驗證）|
| — | INSERT | 無 client-side INSERT policy；寫入由 SECURITY DEFINER RPC 控制 | 通過（Supabase 已驗證）|
| — | — | `rowsecurity = true`（V1）| 通過（Supabase 已驗證）|

> ✅ P0 驗證已完成：V1–V4 及 V10 均通過。

### 3.4 markets

| 政策名稱 | 操作 | 條件 | 狀態 |
|---|---|---|---|
| `markets_select_secure` | SELECT | `id IN current_user_market_ids()`（SECURITY DEFINER helper）| 通過（Supabase 已驗證）|
| `markets_select_temp` | SELECT | — | 已移除（Supabase 已驗證，V5）|

> ✅ P0 驗證已完成：V5 / V6 均通過。

### 3.5 products

| 政策名稱 | 操作 | 條件 | 狀態 |
|---|---|---|---|
| `products_select_temp` | SELECT | — | 已移除（Supabase 已驗證，V7）|
| Migration 014 SELECT policy | SELECT | `owner_id = auth.uid() OR owner_id IN (...) OR is_shared = true` | 待確認（P1 清理後需重新驗證）|

> ⚠️ Migration 014 SELECT policy 尚未完整驗證。P1 階段需確認 `is_shared = true` 是否可能讓 staff 看到不應看到的商品。

### 3.6 events

| 政策名稱 | 操作 | 條件 | 狀態 |
|---|---|---|---|
| — | — | — | 待確認 |

### 3.7 profiles

| 政策名稱 | 操作 | 條件 | 狀態 |
|---|---|---|---|
| — | — | — | 待確認 |

> ⚠️ **驗證方法**：在 Supabase Dashboard → Table Editor → 選取資料表 → Policies，逐一確認各表的 RLS 政策。若有政策顯示 `SECURITY DEFINER`，代表跳過 RLS，需確認函式內容。

---

## 4. 敏感資料檢查

### 4.1 UI 遮罩元件

| 敏感欄位 | 元件 | 狀態 | 備註 |
|---|---|---|---|
| 商品成本（`cost`）| `SensitiveDataMask` | 通過 | DOM 遮罩 |
| 商品利潤（`profit`）| `SensitiveDataMask` | 通過 | DOM 遮罩 |
| 淨利（`net_profit`）| `SensitiveDataMask` | 通過 | DOM 遮罩 |
| 毛利率（`profit_margin`）| `SensitiveDataMask` | 通過 | DOM 遮罩 |
| 供應商資訊（`supplier_info`）| `SensitiveDataMask` | 通過 | DOM 遮罩 |
| 月收入統計（`total_revenue`）| `SensitiveDataMask` | 通過 | DOM 遮罩 |
| 成本明細（`cost_breakdown`）| `SensitiveDataMask` | 通過 | DOM 遮罩 |

### 4.2 風險說明

> ⚠️ **DOM 遮罩非安全防線**：敏感資料遮罩目前僅在 UI 層執行，`SensitiveDataMask` 是 `use client` 元件，攻擊者仍可透過 DevTools 或 API 攔截取得原始資料。
>
> **真正的安全防線是 Supabase RLS**，需確保 Supabase 層級已過濾敏感欄位。

### 4.3 data-sanitization.ts 狀態

| 檢查項 | 狀態 | 備註 |
|---|---|---|
| `lib/data-sanitization.ts` 已定義脫敏邏輯 | 通過 | Phase 9B：`sanitizeObject()` / `sanitizeArray()` / `sanitizeEvents()` / `sanitizeStats()` |
| staff sync 寫入 IndexedDB 前執行脫敏 | 通過 | Phase 9C：`syncMarketsToIndexedDB` / `syncProductsToIndexedDB` / `syncEventsToIndexedDB` |
| mapper 後二次脫敏（移除假 0 欄位）| 通過 | Phase 9E：避免 mapper 補出 `boothCost: 0` 等假 0 |
| handler replay 後清理衍生 projection | 通過 | Phase 9D：`sanitizeStaffProjectionsAfterReplay()` 清理 `totalProfit` / `cost` 等 |
| Supabase view / RLS 層過濾敏感欄位 | **待確認** | view 本身不刪欄位，RLS 需人工驗證 Supabase Dashboard |

> ⚠️ **仍待確認**：client-side sanitizer 已完整接入 staff sync data flow，但 **Supabase view 定義的 RLS 政策需人工在 Supabase Dashboard 驗證是否已正確設定**，確認 staff 視圖不會因 RLS 漏洞而漏出成本 / 利潤欄位。

---

## 5. 員工操作權限

| 動作 | UI 限制方式 | 狀態 | 備註 |
|---|---|---|---|
| 可記錄互動 | UI 無鎖，`canEdit` 不影響 | 通過 | staff 可正常記錄 |
| 可記錄成交 | UI 無鎖，`canEdit` 不影響 | 通過 | staff 可正常記錄 |
| 不可新增市集 | UI 無操作入口 | 通過 | |
| 不可新增商品 | UI 無操作入口 | 通過 | |
| 不可編輯商品 | `canEdit = !isStaff` 硬鎖 | 通過 | |
| 不可刪除資料 | UI 無操作入口 | 通過 | |
| 不可管理員工 | UI 無操作入口（員工端） | 通過 | `/settings` 中無員工管理元件 |

> **注意**：`permissions.can_edit` 欄位存在但 `canEdit` 硬編碼為 `!isStaff`，`permissions.can_edit` 目前被忽略（見 `hooks/useUserRole.ts`）。

---

## 6. 移除員工驗證

### 6.1 revoke 語意落地

| 檢查項 | 實作位置 | 狀態 | 備註 |
|---|---|---|---|
| `staff_relationships.status` 設為 `'revoked'` | `revokeStaff()` in `lib/supabase/staff.ts` | 通過 | Phase 7B-3 |
| `market_members` 相關記錄已清除 | `removeStaff()` in `lib/supabase/staff.ts` | 通過 | Phase 7B-2 |
| `getMyStaffMembers()` 排除 revoked | `lib/supabase/staff.ts` filter | 通過 | Phase 7B-1 |
| `staff_accessible_*` 視圖即時排除 revoked | 各視圖 WHERE `status = 'active'` | 通過 | |

### 6.2 員工端失效時效

| 檢查項 | 實作位置 | 狀態 | 備註 |
|---|---|---|---|
| 角色快取 TTL 為 5 分鐘 | `hooks/useUserRole.ts` | 通過 | Phase 5B-1 |
| 同步遇到 permission error 後停止 10 分鐘 | `hooks/useSync.ts` | 通過 | 防止 revoked 員工繼續同步 |
| `removeStaff()` 未呼叫 `invalidateRoleCache()` | `lib/supabase/staff.ts` | 待修正 | 老闆端無法主動清除員工快取 |

> ⚠️ **待修正**：老闆端無法直接清除員工裝置上的 localStorage role cache。目前靠 5 分鐘 TTL 被動失效，未來可考慮 Supabase Realtime 推送失效訊息。

---

## 7. 測試場景

### 7.1 老闆相關

| 場景 | 預期行為 | 狀態 |
|---|---|---|
| 老闆正常使用 | 可新增/編輯市集與商品，可查看所有統計 | 待確認 |
| 老闆邀請員工 | `inviteStaff()` 正確建立 `pending` 關係 | 待確認 |
| 老闆移除員工 | `staff_relationships.status = 'revoked'`，`market_members` 清除 | 待確認 |
| 老闆重新邀請已 revoke 的員工 | 可重新建立關係（視圖即時更新） | 待確認 |

### 7.2 員工接受邀請

| 場景 | 預期行為 | 狀態 |
|---|---|---|
| 員工點擊邀請連結 | 來到 `/join` 頁面 | 待確認 |
| 員工接受邀請 | `staff_relationships.status = 'active'`，`market_members` 建立，`invalidateRoleCache()` 呼叫 | 待確認 |
| 接受後馬上切換身份 | 5 分鐘內快取失效前，可能短暫保持舊身份 | 待確認 |

### 7.3 員工正常操作

| 場景 | 預期行為 | 狀態 |
|---|---|---|
| 員工查看市集列表 | 看到 `staff_accessible_markets` 視圖內容 | 待確認 |
| 員工查看商品列表 | 看到 `staff_accessible_products` 視圖內容 | 待確認 |
| 員工記錄互動 | 可正常寫入 events（`access_type = 'staff'`） | 待確認 |
| 員工記錄成交 | 可正常寫入 events（`access_type = 'staff'`） | 待確認 |
| 員工嘗試新增市集 | UI 無操作入口 | 待確認 |
| 員工嘗試新增商品 | UI 無操作入口 | 待確認 |
| 員工嘗試編輯商品 | `canEdit = !isStaff` 阻止 | 待確認 |

### 7.4 敏感資料存取

| 場景 | 預期行為 | 狀態 |
|---|---|---|
| 員工嘗試查看商品成本 | DOM 遮罩顯示鎖定圖示 | 待確認 |
| 員工透過 API 攔截查看原始成本 | Supabase RLS 應攔截；若視圖未限制則可能洩漏 | 待確認 |
| 員工嘗試查看月收入統計 | DOM 遮罩顯示鎖定圖示 | 待確認 |
| 員工透過 DevTools 查看原始收入 | 同上，取決於 RLS | 待確認 |

### 7.5 員工被移除

| 場景 | 預期行為 | 狀態 |
|---|---|---|
| 老闆移除員工後，員工視角市集列表 | 即時消失（視圖條件 `sr.status = 'active'`） | 待確認 |
| 員工端 localStorage 快取 | 最多 5 分鐘後失效，`isStaff` 變 `false` | 待確認 |
| 員工被移除後嘗試同步 | 10 分鐘 pause on permission error | 待確認 |
| 員工被移除後重新登入 | 角色重新查詢，確定為 owner | 待確認 |
| 員工被重新邀請並接受 | 可重新成為 staff | 待確認 |

---

## 8. 狀態彙總

| 區塊 | 通過 | 待確認 | 失敗 | 需修正 |
|---|---|---|---|---|
| 1. 角色來源驗證 | 8 | 0 | 0 | 0 |
| 2. 員工資料存取驗證 | 5 | 0 | 0 | 0 |
| 3. RLS 檢查表 | 7 | 7 | 0 | 0 |
| 4. 敏感資料檢查 | 7 | 1 | 0 | 0 |
| 5. 員工操作權限 | 7 | 0 | 0 | 0 |
| 6. 移除員工驗證 | 4 | 0 | 0 | 1 |
| **總計** | **38** | **8** | **0** | **1** |

### 待修正項目

| # | 項目 | 說明 | 建議 |
|---|---|---|---|
| 1 | `removeStaff()` 未呼叫 `invalidateRoleCache()` | 老闆端無法主動使員工快取失效 | 考慮 Supabase Realtime 推送或同步時主動 revalidate |

### 待確認項目（P1/P2 安全清理，仍需驗證）

- `staff_accessible_*` 視圖是否應將敏感欄位改為 `typed NULL`（P1）
- `events` payload 是否需 SQL 層 sanitization（目前依賴 client-side）
- `get_my_staff` RPC 是否應在 SQL 層排除 `revoked` 員工
- `markets` / `products` INSERT/UPDATE policy 是否過寬（P1）
- Section 7 Smoke Test 是否已完成

---

## 9. 驗證方法

### 9.1 RLS 政策驗證步驟

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇專案 → **Authentication** → **Policies**
3. 逐一檢查 Section 3 所列資料表
4. 確認每個政策使用 `auth.uid()` 而非硬編碼 user_id

### 9.2 功能驗證步驟

1. 以老闆身份建立兩個測試帳號（A = 老闆，B = 員工）
2. 老闆（A）建立一個市集和一個商品
3. 老闆（A）邀請員工（B）並接受邀請
4. 以員工（B）身份驗證 Section 7 的所有場景
5. 老闆（A）移除員工（B），驗證移除後行為
6. 重複邀請員工（B），驗證重新加入流程

### 9.3 API 層驗證

```bash
# 以員工身份嘗試直接查詢敏感資料
curl -H "apikey: <ANON_KEY>" \
     -H "Authorization: Bearer <STAFF_TOKEN>" \
     "https://<PROJECT>.supabase.co/rest/v1/products?select=cost,profit,name"

# 預期：若 RLS 未正確設定，員工可看到 cost/profit
# 理想：403 Forbidden 或結果為空
```
