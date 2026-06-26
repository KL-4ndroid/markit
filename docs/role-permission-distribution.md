# Role / Permission Distribution Notes

## 2026-06-26｜Féria Demo Mode public route

### Change summary

新增公開展示路由：

```txt
/demo
```

`/demo` 是 Féria Demo Mode，僅使用 `lib/demo/*` 的靜態範例資料與 React local state。此路由不讀取正式市集、商品、銷售、成本、同步或角色資料。

### Auth / Role boundary

為了讓 `/demo` 可作為對外展示頁，以下 guard 將 `/demo` 視為 public route：

- `components/auth/AuthGuard.tsx`
- `components/auth/RoleGuard.tsx`

`RoleGuard` 對 public route 會直接 render children，不掛載 `ProtectedRoleGuard`，因此不會在 `/demo` 觸發 `useUserRole()` 查詢。

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
