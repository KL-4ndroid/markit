# Staff Role Permissions

## 2026-06-20 Field Notes / Checklist Permission Update

Field notes and checklist are shared market-detail features for owner and staff views. They are stored as market-scoped events and shown through shared reusable panels.

| Role | Field notes | Checklist |
|---|---|---|
| `owner` | read, create, edit, delete | read, create, edit text, delete, toggle |
| `manager` | read, create, edit, delete | read, create, edit text, delete, toggle |
| `operator` | read-only | read and toggle completed only |
| `viewer` | read-only | read-only |

Implementation notes:

- `canManageFieldNotes` gates all field note writes.
- `canManageChecklist` gates checklist create/edit text/delete.
- `canToggleChecklistItem` gates completed-only checklist updates.
- `checklist_item_updated` with only `completed` is treated as a toggle; if the payload includes `text`, it requires `canManageChecklist`.
- Owner market detail passes full management props to the shared panels.
- Staff market detail always renders both panels; controls are enabled or disabled by role capability.
- No RLS policy, repair tool, owner finance, market deletion, product deletion, new market, or new product permission was broadened by this update.

## 2026-06-19 Decision Update

- `operator` and `manager` can write deal/revenue records through `canRecordDeal`.
- Staff deal record editing remains closed for now.
- Transaction-log deletion scope:
  - `operator`: own same-day deal/interaction records only.
  - `manager`: same-day deal/interaction records, including records created by other staff.
  - `owner`: unchanged owner delete behavior.
- Repair tools remain owner-only; staff users must not load `/recovery` repair panels.
- New market and new product creation remain owner-only for now.

本文件是 Féria 員工角色權限分布的主要查閱文件。

未來任何與 staff role、資料可見度、操作權限、PermissionGate、useUserRole、sync / Dexie 權限行為有關的修改，都需要同步更新本文件。

---

## 0. P5 Runtime Status Update - 2026-06-19

目前 P5 已不再只是設計文件，以下 runtime gate 已接上並推送：

* `role-capabilities` 已成為 operator / manager 實際操作權限的主要判斷來源。
* operator 已開放 `canRecordInteraction` 與 `canRecordDeal`，可在 staff 市集頁記錄互動、成交與收入。
* manager 已開放市集基本資料編輯，但不可改市集名稱、地點、財務欄位，也不可新增/刪除市集。
* manager 已開放商品基本資料編輯，但不可改商品名稱、分類、成本，也不可新增/刪除商品。
* manager 已開放 checklist；manager/operator 依 capability 可使用 field note 與自己建立的同日現場紀錄編輯/刪除能力。
* staff direct-route guard 已補上：`/products/[id]` 會依 role 隱藏成本/毛利與 owner-only 操作；`/markets/[id]` staff 會先進入 `StaffMarketDetailView`。
* P5 downgrade safety 已有 role cache invalidation、Dexie staff projection cleanup、write freshness gate、role status banner，以及 `/debug/staff-role-test` 非正式環境測試頁。

仍刻意保持關閉或需要高風險決策的部分：

* 新增市集、新增商品仍是 owner-only。
* 刪除市集、刪除商品仍是 owner-only。
* 成交紀錄編輯仍未實作；成交紀錄刪除維持「自己建立 + 同日」的保守限制；庫存/營收 projection 管理權限不擴權。

---

## 1. Role Design Principle

Féria 的員工權限分成四個層級：

```text
viewer   = 只看，不寫
operator = 現場記錄
manager  = 基本資料協作管理
owner    = 完整管理
```

設計原則：

* 「看得到什麼」與「做得到什麼」必須分開設計。
* `infoLevel` 控制資料可見度。
* `role` 控制未來可開放的操作範圍。
* operator 與 manager 目前同為 L2，但未來操作權限不同。
* 成本、利潤、淨利、員工管理、角色管理、刪除、系統設定永遠只給 owner。
* `permissions.can_edit` 是 DB 過渡欄位，用來記錄 operator / manager 具備可寫入的語意；但目前前端實際操作權限仍需透過 P5 的 role-aware gate 設計逐步接上，不能只因 `can_edit=true` 就視為已開放所有編輯能力。換句話說：`can_edit=true` 不是「完整編輯權限」。

---

## 2. Role Summary

| Role     | 中文名稱 | 定位       | 資料層級             | 目前操作能力         | 未來方向          |
| -------- | ---- | -------- | ---------------- | -------------- | ------------- |
| viewer   | 查看者  | 只看必要資訊   | L0               | 不可新增 / 編輯 / 刪除 | 維持純查看         |
| operator | 出攤助手 | 現場協助記錄   | L2               | 已開放互動紀錄、成交/收入寫入 | 刪除限自己同日紀錄 |
| manager  | 管理員  | 協作管理基本資料 | L2               | 已開放基本資料白名單、field note、checklist | 高風險管理需另行決策 |
| owner    | 擁有者  | 完整管理     | L3 / full access | 完整管理           | 永遠保留最高權限      |

---

## 3. Permission Matrix

| 功能          | viewer |         operator |          manager | owner |
| ----------- | -----: | ---------------: | ---------------: | ----: |
| 查看市集基本資訊    |      ✅ |                ✅ |                ✅ |     ✅ |
| 查看商品基本資訊    |      ✅ |                ✅ |                ✅ |     ✅ |
| 查看售價        |      ❌ |                ✅ |                ✅ |     ✅ |
| 查看收入        |      ❌ |                ✅ |                ✅ |     ✅ |
| 查看成交統計      |      ❌ |                ✅ |                ✅ |     ✅ |
| 查看互動統計      |      ❌ |                ✅ |                ✅ |     ✅ |
| 查看成本        |      ❌ |                ❌ |                ❌ |     ✅ |
| 查看利潤        |      ❌ |                ❌ |                ❌ |     ✅ |
| 查看淨利        |      ❌ |                ❌ |                ❌ |     ✅ |
| 查看敏感財務資料    |      ❌ |                ❌ |                ❌ |     ✅ |
| 新增互動紀錄      |      ❌ |         ✅ 第一階段建議 |                ✅ |     ✅ |
| 新增成交紀錄      |      ❌ |                ✅ |                ✅ |     ✅ |
| 新增現場備註      |      ❌ |                ❌ |                ✅ |     ✅ |
| 編輯自己建立的當日紀錄 |      ❌ |   field note / 互動紀錄可用；成交編輯未實作 |   field note / 互動紀錄可用；成交編輯未實作 |     ✅ |
| 刪除自己建立的當日紀錄 |      ❌ | 自己 + 同日 | 自己 + 同日 |     ✅ |
| 編輯市集基本資料    |      ❌ |                ❌ |         ✅ 第一階段建議 |     ✅ |
| 編輯商品基本資料    |      ❌ |                ❌ |         ✅ 第一階段建議 |     ✅ |
| 編輯商品售價      |      ❌ |                ❌ |    可考慮 / 需 audit |     ✅ |
| 編輯商品成本      |      ❌ |                ❌ |                ❌ |     ✅ |
| 新增市集        |      ❌ |                ❌ |                ❌ |     ✅ |
| 刪除市集        |      ❌ |                ❌ |                ❌ |     ✅ |
| 新增商品        |      ❌ |                ❌ |                ❌ |     ✅ |
| 刪除商品        |      ❌ |                ❌ |                ❌ |     ✅ |
| 員工管理        |      ❌ |                ❌ |                ❌ |     ✅ |
| 修改員工角色      |      ❌ |                ❌ |                ❌ |     ✅ |
| 系統設定        |      ❌ |                ❌ |                ❌ |     ✅ |
| 資料維修        |      ❌ |                ❌ |                ❌ |     ✅ |
| 批次匯入 / 匯出   |      ❌ |                ❌ |                ❌ |     ✅ |
| 分析報表        |      ❌ |                ❌ |                ❌ |     ✅ |

---

## 4. Viewer

### 定位

viewer 是只查看必要資訊的人，不是一般員工的預設工作角色。

適合：

* 臨時幫忙的人
* 家人幫忙看攤
* 只需要知道市集地點、時間、攤位資訊的人
* 只需要確認商品與市集安排的人

### 可以看

* 市集名稱
* 日期 / 時間
* 地點
* 攤位資訊
* 基本商品名稱
* 簡單備註 / 注意事項
* 出攤必要資訊

### 不可以看

* 收入
* 成交數
* 互動統計
* 商品定價策略
* 成本
* 利潤
* 淨利
* 分析報表

### 不可以做

* 不可新增成交
* 不可新增互動
* 不可新增備註
* 不可編輯商品
* 不可編輯市集
* 不可刪除任何資料
* 不可管理員工
* 不可修改角色

---

## 5. Operator

### 定位

operator 是出攤助手，核心任務是現場協助記錄。

適合：

* 市集現場幫手
* 共同出攤夥伴
* 負責接待 / 記錄成交的人
* 負責記錄客人反應的人

### 可以看

* viewer 可看的全部
* 商品售價
* 成交金額
* 互動統計
* 成交統計
* 市集收入概況
* 較完整的市集資訊

### 第一階段建議開放

* 新增互動紀錄

### 第二階段可考慮

* 新增成交紀錄
* 新增現場備註

### 延後處理

* 編輯自己建立的當日紀錄
* 刪除自己建立的當日紀錄

這些需要 audit log、責任歸屬、時間窗限制與衝突處理，不能在第一階段直接開放。

### 不可以做

* 不可編輯商品
* 不可編輯市集
* 不可修改成本
* 不可查看利潤
* 不可查看淨利
* 不可刪除資料
* 不可管理員工
* 不可修改角色
* 不可進系統設定
* 不可使用資料維修工具
* 不可使用批次匯入 / 匯出

---

## 6. Manager

### 定位

manager 是可信任的協作管理角色，可以協助整理基本資料，但不是 owner。

適合：

* 長期合作夥伴
* 共同經營品牌的人
* 可以協助整理商品 / 市集資料的人
* 但不應看到成本與利潤的人

### 可以看

* operator 可看的全部
* 較完整的市集資訊
* 較完整的商品資訊

### 第一階段建議開放

* 編輯市集基本資料
* 編輯商品基本資料
* 編輯攤位備註
* 管理 checklist

### 市集基本資料可包含

* 市集名稱
* 地點
* 日期
* 時間
* 攤位號碼
* 公開備註
* 出攤提醒

### 商品基本資料可包含

* 商品名稱
* 商品描述
* 商品分類
* 商品是否上架
* 商品售價

### 不可以做

* 不可編輯商品成本
* 不可查看利潤
* 不可查看淨利
* 不可管理員工
* 不可修改角色
* 不可刪除市集
* 不可刪除商品
* 不可進系統設定
* 不可使用資料維修工具
* 不可批次匯入 / 匯出完整資料

---

## 7. Owner

### 定位

owner 是資料與權限的唯一完整管理者。

### 永遠只給 owner 的權限

* 查看成本
* 查看利潤
* 查看淨利
* 查看敏感財務資料
* 員工管理
* 修改員工角色
* 新增市集
* 刪除市集
* 新增商品
* 刪除商品
* 系統設定
* 資料維修
* 批次匯入 / 匯出
* 完整分析報表

> 注意：owner 不是 `staff_relationships.role` 的 enum 值。owner 指的是 auth 使用者本人作為資料擁有者，也就是 `staff_relationships.owner_id` 對應的帳號。在 `useUserRole` / `PermissionGate` 中以「是否為 owner」獨立判斷。

---

## 8. Current Implementation Status

目前已完成：

* owner 可以修改員工角色
* `staff_relationships.role` 已存在
* `update_staff_role` RPC 已存在
* `permissions.infoLevel` 已與 role matrix 對齊
* viewer = L0
* operator = L2
* manager = L2
* owner = L3 / full access

目前尚未完成：

* operator 實際新增互動紀錄
* operator 實際新增成交紀錄
* manager 實際編輯市集基本資料
* manager 實際編輯商品基本資料
* useUserRole role-aware
* PermissionGate role-aware
* StaffPermissionCard role-aware
* Dexie 降權 cache 安全處理

---

## 9. P5 Implementation Direction

P5 不應一次開放所有權限。

> 進入 P5 前，仍需參考 `docs/staff-role-matrix.md` 的 P5 Boundary 與進入條件。P5 屬於 Red risk，不能因為本文件列出實作方向就直接開始實作。
>
> P5 開始前至少需要完成 P5-0 audit review，並確認 production P4 role change 功能穩定。

建議順序：

1. 員工端顯示自己的角色與權限說明
2. operator 可新增互動紀錄
3. operator 可新增成交紀錄
4. manager 可編輯市集基本資料
5. manager 可編輯商品基本資料
6. 自己建立的當日紀錄可編輯 / 刪除

第一個實際操作權限建議從：

```text
operator 可新增互動紀錄
```

開始。

原因：

* 不牽涉金額
* 不碰成本 / 利潤
* 不改既有市集 / 商品資料
* 風險最低
* 最符合出攤助手的定位

---

## 10. Maintenance Rule

任何未來與以下內容相關的修改，都必須同步更新本文件：

* staff role
* viewer / operator / manager / owner 權限
* infoLevel
* can_edit
* useUserRole
* PermissionGate
* role-fail-closed
* sync / Dexie 權限行為
* 員工端可見資料
* 員工端可操作功能
* owner-only 權限
