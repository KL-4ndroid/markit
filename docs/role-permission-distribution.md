# Role / Permission Distribution Notes

## 2026-10-22 | Cloud sales projection alignment (073)

Migration 073 patches only the existing market/product deal branches. It preserves event insert authorization, RLS, actor attribution and existing trigger-function security settings. Private projection helpers are not executable by PUBLIC, anon or authenticated. Deletion compensation resolves an original event within the same market; product updates are restricted to that market owner's products. Duplicate and out-of-order tombstones are no-ops after their first effective compensation. Owner/staff read and write capabilities are unchanged. SQL rollback tests do not substitute for staff/cross-account RLS testing. Historical correction is separate; only the precisely named BW-10 test market was corrected.

Same-day legacy backfills may carry a future end-of-day timestamp. App startup demotes only the matching same-market/same-day deletion-order diagnostic to a warning; it does not rewrite records or relax strict backup/import/replay validation. New backfill timestamps are capped at the actual recording time. This compatibility rule infers the original device's offset and remains valid after a timezone change. Role freshness and all existing write authorization remain unchanged.

## 2026-10-22 | Offline pending-count presentation

`hooks/useSync.ts` observes pending/local-only event counts through `lib/sync/local-pending-count-observer.ts` even when cloud sync cannot run. The observer only reads the existing local event store; it performs no uploads, retries, actor binding, projection replacement or permission changes. It unsubscribes on identity change/unmount and ignores callbacks for an inactive sync identity. Owner/staff data scopes and all existing write capabilities remain unchanged.

The offline banner distinguishes authenticated sessions with paused cloud sync from the existing unauthenticated offline read-only branch. This changes guidance only, not authorization or offline write eligibility.

## 2026-08-14 | Recurring operations owner-only contract

Venue and weekly schedule management is owner-only. Manager, operator, viewer, and unresolved-role sessions receive no Venue/Schedule management read or write authority and no new role capability. Staff may read only the non-sensitive recurrence compatibility fields on an already materialized Market through `staff_accessible_markets`; existing Market operation capabilities continue to decide what each Staff role may do.

The new event types are fail-closed in the local role-freshness gate. Remote Venue and Schedule tables use owner-scoped RLS and are not included in Staff views. This does not change Market, product, finance, reporting, billing, recovery, or Staff capability semantics.

Migration 070 mirrors the same role rule remotely: an authenticated identity with an active Staff relationship cannot insert recurring-operation events or access Venue/Schedule management tables. A restrictive event policy and a before-insert trigger provide defense in depth while preserving the existing Market event policy.

## 2026-08-05 | Security Advisor remediation planning boundary

`docs/security/SUPABASE_SECURITY_ADVISOR_REMEDIATION_PLAN_2026_08_05.md`
records a planning-only workstream for pre-existing definer views, mutable
function search paths, permissive INSERT policies, function EXECUTE grants, and
Auth leaked-password protection.

No migration, RLS policy, RPC grant, provider setting, application permission,
data visibility, `PermissionGate`, `useUserRole`, sync, or Dexie behavior changes
in this documentation batch. In particular:

- owner remains the only complete data/finance administrator;
- viewer remains read-only;
- operator and manager retain only their existing capability-gated operations;
- staff continue to read the current redacted `staff_accessible_*` views until a
  separately approved replacement passes role, cross-owner, sync and Dexie tests;
- directly converting those views to invoker views is prohibited because the
  current owner-only base-table RLS would break staff reads;
- any later remediation that changes role behavior must update this file and the
  canonical staff role documents in the same commit.

## 2026-07-29｜S4 authoritative account capability read model

### Change summary

Added a read-only `GET /api/account-capabilities` BFF route and a server-only subscription account repository. The public endpoint always resolves the authenticated actor's own account id and does not accept an owner-workspace override.

### Permission impact

- an authenticated owner may read their own safe capability snapshot;
- a staff client cannot request the owner's full account capability or billing state through this endpoint;
- future feature-specific server routes may use the internal repository contract only after independently verifying an active owner/staff relationship;
- `subscription_accounts` grants no direct table access to `anon` or `authenticated`;
- only the server-only `service_role` RPC may read through the guarded relationship check;
- no role capability is added or broadened;
- staff still receive no owner billing controls, owner financial permission, or checkout action;
- unresolved, foreign, inactive, malformed, and unavailable states remain fail-closed.

S4 does not change product-cover, sales-evidence, analytics, report, Team, Dexie, or sync runtime behavior.

## 2026-07-29｜Subscription preview presentation alignment

### Change summary

Subscription UI now uses the shared Free / Pro / Team preview model. `TopNavigation` no longer hardcodes a current Free plan when no authoritative account capability source exists.

### Permission impact

- owners may see the non-transactional plan preview link;
- staff continue to see no billing controls or checkout actions;
- a plan presentation never overrides owner / manager / operator / viewer permissions;
- unresolved roles remain fail-closed;
- no role capability, staff relationship, RLS, RPC, data visibility, Dexie, or sync behavior changed.

This is a presentation-only change. Paid feature enforcement remains outside S2.

## 2026-07-30｜Production internal test surface boundary

Root `proxy.ts` denies every `/debug/*` request with an HTTP `404` before rendering in
production, while `app/debug/layout.tsx` remains a second server-side denial. Local
development remains available; preview/staging requires the explicit
`INTERNAL_TEST_SURFACES_ENABLED=1` gate. This route boundary does not grant or change
owner, manager, operator, viewer, Supabase, Dexie, sync, or subscription permissions.

`/demo` is intentionally excluded from this internal-route gate and retains the public,
static-example-data contract documented below.

## 2026-06-26｜Féria Demo Mode public route

### Change summary

新增公開展示路由：

```txt
/demo
```

`/demo` 是 Féria Demo Mode，僅使用 `lib/demo/*` 的靜態範例資料與 React local state。此路由不讀取正式市集、商品、銷售、成本、同步或角色資料。

### Auth / Role / Navigation boundary

為了讓 `/demo` 可作為對外展示頁，以下 guard 將 `/demo` 視為 public route：

- `components/auth/AuthGuard.tsx`
- `components/auth/RoleGuard.tsx`

`components/AppChrome.tsx` 會在 `/demo` 使用 standalone public chrome，只渲染 demo page 與 toast，不掛載正式 App 的 `AuthGuard`、`RoleGuard`、底部導航、PWA prompt、staff invitation、initial sync dialog 或 sync progress manager。

`RoleGuard` 對 public route 會直接 render children，不掛載 `ProtectedRoleGuard`，因此不會在 `/demo` 觸發 `useUserRole()` 查詢。

`components/BottomNavigation.tsx` 也會在 `/demo` 直接回傳 `null`，避免公開展示頁掛載正式 App 的底部導航與 role-dependent navigation behavior。

### Permission impact

本次沒有修改以下內容：

- staff role 定義
- viewer / operator / manager / owner 權限分配
- owner / staff 資料可見度
- `PermissionGate`
- `useUserRole` 的角色判斷與 fail-closed 行為
- Dexie / sync 權限行為
- Supabase 權限模型

### Demo safety rule

`/demo` 只允許使用：

```txt
useState
useMemo
static demo data
demo calculation helpers
```

不得 import 或呼叫：

```txt
useMarkets
useMonthlyStats
useAuth
useUserRole
useSyncContext
Dexie write
Supabase write
sync service
permission service
```

### Rationale

Demo Mode 的目的為對外展示 Féria 互動體驗，不應要求登入，也不應接觸封閉測試中的正式資料。此 public route exemption 是 route-level display boundary，不是角色權限模型變更。

## 冷登入恢復與匿名遷移邊界補充

- owner 重播校正只適用同 owner、完整雲端／本機事件 ID 集合相符、全部 synced，且存在舊刪除排序風險的場次；不將 staff 的部分 view 當完整歷史，不放寬 RLS 或角色 freshness。
- 身分或前景狀態改變時停止後續 owner 重播批次；舊身分不能發布新身分的同步進度或釋放新同步鎖。
- `detectAnonymousData` 與匿名遷移只處理 owner／actor 空白或 local、且尚未 synced 的紀錄。其他帳號快取、團隊成員事件、已同步 legacy local 紀錄皆不屬可遷移集合，不能因其 ID 不同於登入者就改綁。
- 照片本機清單為空僅表示本機沒有待補工作，不證明其他裝置上傳完成或歷史成交免拍；保留既有 owner album 與員工能力界線。
- 詳見 `docs/COLD_LOGIN_RESTORE_REVIEW_2026_10_22.md` 文末實作與驗收。本輪沒有修改 Demo、角色能力或雲端授權規則。

### 成交照片提醒恢復補充（2026-10-23）

- owner 提醒恢復只在登入者等於 owner、同 owner 的未刪市集，以及現行照片 runtime gate 啟用時啟動。metadata 使用登入者 client 與既有 RLS，完整讀取該 owner／market 未刪狀態，不含私有影像 key 或簽名連結。
- 本機照片要求快照只作提醒依據，不是拍攝／上傳授權憑證；手動上傳仍由原有 BFF 及 server RPC 重新檢查真實 owner／staff、來源成交與身分。
- 員工不使用 owner 恢復 reader／album fallback；本機工作只顯示同 owner 且拍攝員工為本人者。owner 可處理自己場次的工作；員工新裝置狀態核對需另外實作，沒有擴大相簿／讀圖能力。
- 舊事件要求未知不補猜，讀取失敗不判定全數完成，換帳號／場次或請求失效不發布舊結果／寫入殘留工作；已儲存照片及重試狀態保留。

### 訂閱制度優先與 Team 確認（2026-10-23）

- 使用者確認先前 Pro 為口誤：正式員工協作與 manager 仍屬 Team，依老闆工作空間權益與個別角色權限取交集，不要求員工另行購買 Team。
- 這是既有分級的確認，沒有移動方案功能、變更席次或授予帳號權益。員工新裝置照片擴充先暫緩，優先對齊訂閱與 server 限制。
- 共用有效期判斷已補強：有填但格式錯誤的到期日不再當成明確無期限授權；非有限評估時間拒絕授權；不因錯誤期限取得 fresh／離線 lease。保留既有有效管理員授權、角色與降級資料保留行為。
- 目前權益 API 及 migration 064 仍以既有 admin 授權測試路徑為主；billing 來源未接通，不能把 admin、UI 模擬或照片處理成功當作真實付款證據。
- 程式缺口、候選額度與後續順序見 `docs/subscription/SUBSCRIPTION_RULES_ALIGNMENT_2026_10_23.md`；沒有修改 DB／RLS、啟用收費或改變現有角色。
