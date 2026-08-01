# Role / Permission Distribution Notes

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
