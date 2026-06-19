# Staff Role Matrix

> 對齊 production 狀態（2026-06-18）
> 對齊對象：042 / 043 / 044 / 045 / 046 / P4a / P4c
> 風險等級：Green（本文件為文件，無 runtime 變更）
> P5 runtime update（2026-06-19）：operator 互動紀錄、manager 基本資料編輯、field note、checklist、role status test UI、direct-route staff guards 已接上。新增/刪除市集、新增/刪除商品、成交/收入寫入與成交紀錄刪改仍需高風險決策。

## 1. Current Status

### 已完成

| 階段 | 內容 | 對應產出 |
|---|---|---|
| 042 | staff view / rental 修正 | migration 042 |
| 043 | staff role foundation | `update_staff_role` RPC + role enum |
| 044 | `get_my_staff` 回傳 `role` | migration 044 |
| 045 | `get_my_staff` 回傳 `relationship_id` | migration 045 |
| 046 | `permissions.infoLevel` 與 role matrix 對齊 | migration 046 |
| P4a | `updateStaffRole` wrapper | `lib/supabase/staff.ts` |
| P4c-1 | UI 計畫 | 本文件 + plan |
| P4c-2 | 老闆端 role change Dialog | `components/settings/StaffManagement.tsx` |
| P4c-3 | 本文件（docs） | `docs/staff-role-matrix.md` |
| P5-4a~d | downgrade detection / role cache invalidation / Dexie cleanup / write freshness gate | `hooks/useStaffStatusMonitor.ts`, `hooks/useUserRole.ts`, `lib/db/clear-user-data.ts`, `lib/permissions/role-freshness.ts` |
| P5-4e / P5-7 | role status banner + non-production role test UI + role-aware permission card | `components/staff/RoleStatusBanner.tsx`, `app/debug/staff-role-test/page.tsx`, `components/staff/StaffPermissionCard.tsx` |
| P5-5 | operator interaction gate | `components/markets/StaffMarketDetailView.tsx`, `tests/p5-5-operator-interaction.test.ts` |
| P5-6 | manager basic market/product edits | `components/markets/EditMarketForm.tsx`, `components/products/EditProductForm.tsx`, `tests/p5-6-manager-basic-edit.test.ts` |
| P5 field ops | field notes + checklist | `components/markets/FieldNotesPanel.tsx`, `components/markets/ChecklistPanel.tsx` |
| P5 route guards | direct `/products/[id]` and `/markets/[id]` staff route guards | `tests/p5-product-detail-staff-gate.test.ts`, `tests/p5-market-detail-staff-route-gate.test.ts` |

### 目前確認能力

- ✅ 老闆可以修改員工角色
- ✅ 角色會寫入 `staff_relationships.role`
- ✅ 角色會同步寫入 `staff_relationships.permissions.infoLevel`
- ✅ 老闆端 `StaffManagement` 顯示 `RoleBadge` + 角色 helper copy

### 目前仍保留 owner-only / high-risk decision

- 新增市集、新增商品仍是 owner-only。
- 刪除市集、刪除商品仍是 owner-only。
- 成交/收入寫入、成交紀錄編輯/刪除、庫存/營收 projection 相關變更仍需獨立高風險決策。

## 2. Role Matrix

### 角色總覽

| Role | 中文 | infoLevel | can_edit (JSON) | 目前資料可見度 | 目前操作權限 |
|---|---|---|---|---|---|
| `owner` | 擁有者 | 3（或 owner full access） | true | 全部 | 完整管理 |
| `manager` | 管理員 | 2 | true | 較完整（與 operator 接近） | 基本資料編輯、field note、checklist；owner-only / high-risk 仍關閉 |
| `operator` | 出攤助手 | 2 | true | 較完整市集資訊 | 互動紀錄、field note / 自己同日紀錄能力；owner-only / high-risk 仍關閉 |
| `viewer` | 查看者 | 0 | false | 僅查看必要資訊 | 不可新增 / 編輯 / 刪除 |

### viewer（查看者）

```text
infoLevel   : 0
can_edit    : false
目前可見度  : 僅查看必要資訊
目前操作    : 不可新增 / 編輯 / 刪除
未來        : 維持查看角色
永遠不開放  : 成本、利潤、淨利、員工管理、角色管理、刪除資料、系統設定、資料維修、批次匯入 / 匯出
```

### operator（出攤助手）

```text
infoLevel   : 2
can_edit    : true（DB 已寫入；runtime 操作以 role-capabilities gate 為準，不直接等同完整 canEdit）
目前可見度  : 可查看較完整的市集資訊
目前操作    : 可記錄互動；field note / 自己同日紀錄能力依 capability 開放
仍需決策    : 成交/收入寫入、成交紀錄編輯/刪除、庫存/營收 projection 相關變更
永遠不開放  : 成本、利潤、淨利、員工管理、角色管理、系統設定、刪除資料、資料維修、批次匯入 / 匯出
```

### manager（管理員）

```text
infoLevel   : 2
can_edit    : true（DB 已寫入；runtime 操作以 role-capabilities gate 為準，不直接等同完整 canEdit）
目前可見度  : 與 operator 接近，可查看較完整資訊
目前操作    : 可編輯市集/商品基本資料白名單欄位，可使用 field note / checklist
仍需決策    : 成交/收入寫入、成交紀錄編輯/刪除、庫存/營收 projection 相關變更
永遠不開放  : 成本、利潤、淨利、員工管理、角色管理、系統設定、刪除資料、資料維修、批次匯入 / 匯出
```

### owner（擁有者）

```text
infoLevel   : 3 或 owner full access
can_edit    : true
目前可見度  : 完整
目前操作    : 完整管理
永遠保留    : 成本、利潤、淨利、敏感財務資料、員工管理、角色管理、新增市集、刪除市集、新增商品、刪除商品、系統設定、資料維修、批次匯入 / 匯出、完整分析報表
```

> owner 並非 `staff_relationships.role` 的 enum 值；
> owner = `auth.users` 中作為 `staff_relationships.owner_id` 的本人，
> 在 `useUserRole` / `PermissionGate` 中以「是否為 owner」獨立判斷。

## 3. Important Implementation Notes

### DB 設計主從關係

- `role` 是 **DB 設計上的主要語意來源**（`staff_relationships.role`）。
- runtime 目前主要仍透過 `permissions.infoLevel` 控制資料可見度。
- `update_staff_role` RPC 會在改 role 時 **同步更新** 三個欄位：
  - `staff_relationships.role`
  - `staff_relationships.permissions.can_edit`
  - `staff_relationships.permissions.infoLevel`
- 046 已修正 legacy `permissions.infoLevel` 缺失問題。

### 常見誤解（重要）

- ⚠️ 不要把 `permissions.can_edit` 誤認為完整前端 `canEdit`。實際操作權限需看 `role-capabilities` 與各寫入 gate。
- ⚠️ `useUserRole` / `PermissionGate` / `sync` / `Dexie` 仍負責資料可見度、fail-closed 與同步安全；按鈕與寫入流程需另外接 role-aware capability。
- ⚠️ `operator` / `manager` 雖然 DB 已寫入 `can_edit=true`，但 runtime 只開放已接上 capability gate 的白名單功能。
- ⚠️ 員工 role 改完後，P5 已有 role cache invalidation 與 status monitor；若網路或同步失敗，仍需以 fail-closed 與重新整理作為人工驗證手段。

### 角色文案來源

- 員工列表顯示：`RoleBadge`（`components/staff/RoleBadge.tsx`）
- 員工列表 helper copy：`ROLE_HELPER_COPY`（`StaffManagement.tsx`）
- 角色修改 Dialog 文案：`ROLE_LABEL` / `ROLE_DIALOG_COPY`（`StaffManagement.tsx`）
- 角色 enum：`StaffRole`（`types/staff.ts`）

## 4. Post-release Smoke Test Checklist

production 套用 P4c-2 後，手動或 QA 建議執行：

```text
- [ ] Owner can open staff management page
- [ ] Owner can open role dialog for active staff
- [ ] Pending staff cannot be edited（按鈕 disabled）
- [ ] Missing relationship_id disables role edit（按鈕 disabled）
- [ ] viewer → operator succeeds
- [ ] operator → manager succeeds
- [ ] manager → viewer succeeds
- [ ] Toast success appears（"已更新員工角色"）
- [ ] Dialog closes after success
- [ ] Staff list reloads after success
- [ ] Badge updates after reload
- [ ] Helper copy updates after reload
- [ ] SQL confirms role and permissions.infoLevel are aligned
```

### 套用後驗證 SQL

```sql
-- 1) 看最近 10 筆 staff_relationships 全貌
SELECT
  staff_email,
  status,
  role,
  permissions
FROM staff_relationships
ORDER BY updated_at DESC
LIMIT 10;

-- 2) 驗證 role × can_edit × infoLevel 對齊
SELECT
  role,
  permissions->>'can_edit' AS can_edit,
  permissions->>'infoLevel' AS info_level,
  COUNT(*) AS count
FROM staff_relationships
GROUP BY role, can_edit, info_level
ORDER BY role, can_edit, info_level;
```

### 預期結果

```text
viewer   → can_edit=false, infoLevel=0
operator → can_edit=true,  infoLevel=2
manager  → can_edit=true,  infoLevel=2
```

若看到 `role IS NULL` 或 `can_edit` / `info_level` 為 NULL，請回報。

## 5. P5 Boundary

### P5 是什麼

- **P5 才會開始設計 operator / manager 的實際操作權限。**
- **P5 屬於 Red risk。**
- **P5 會涉及以下範圍**：
  - `useUserRole`
  - `PermissionGate`
  - `role-fail-closed`
  - `useSync`
  - `Dexie`
  - 資料脫敏（infoLevel-aware masking）
  - 按鈕顯示與實際新增 / 編輯 / 刪除流程

### P5 前必須先做（順序）

```text
P5-0  Role Runtime Impact Audit
      - 盤點所有受 role / can_edit / infoLevel 影響的 UI 與資料流
P5-1  PermissionGate Design
      - 設計 PermissionGate role-aware 的統一 gate pattern
P5-2  Operator Action Scope
      - 釐清 operator 開放的操作邊界（現場記錄、互動、成交、備註）
P5-3  Manager Action Scope
      - 釐清 manager 開放的操作邊界（市集 / 商品基本資料協助管理）
P5-4  Sync / Dexie Safety Review
      - 確保 role 變更同步至 Dexie 不破壞現有 Local-First 架構
```

### P5 進入條件（gate）

```text
[ ] P5-0 audit 完成並 review
[ ] P5-1 PermissionGate design 通過
[ ] P5-2 operator scope 通過
[ ] P5-3 manager scope 通過
[ ] P5-4 sync / Dexie safety 通過
[ ] production 端 042-046 + P4c 觀察期 ≥ 7 天無異常
[ ] 至少有 1 位 owner 已在 production 真實使用 P4c role change 功能
```

## 6. References

### Migration

- 042 / 043 / 044 / 045 / 046：`supabase/migrations/`

### Code

- `lib/supabase/staff.ts` — `updateStaffRole` wrapper
- `lib/supabase/staff.ts` — `getMyStaffMembers` / mapping relationship_id
- `components/settings/StaffManagement.tsx` — 老闆端 role change Dialog
- `components/staff/RoleBadge.tsx` — role badge 顯示
- `types/staff.ts` — `StaffRole` / `StaffPermissions` 型別

### Related Docs

- `docs/ROLE_ACCESS_MODEL.md` — 既有 role 存取模型（應與本文件對齊）
- `docs/STAFF_DATA_FLOW_AUDIT.md` — staff 資料流審查
- `docs/ROLE_SECURITY_CHECKLIST.md` — role 安全檢查清單
- `docs/OWNER_STAFF_REVENUE_HARDENING_PLAN.md` — owner / staff revenue 強化計畫

---

**本文件為 P4c-3 階段產出**
**生效日期：2026-06-18**
**下次 review 時機：P5-0 audit 啟動前**
