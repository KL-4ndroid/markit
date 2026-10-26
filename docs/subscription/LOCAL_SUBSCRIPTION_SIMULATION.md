# Local Subscription Identity Simulation

> 2026-10-26 現況：本機已使用指定帳號的雲端測試模式，畫面與保存權益共用限時覆寫；最後測試完成後已還原原有方案。請先看本文末節及 [啟用紀錄](SUBSCRIPTION_WRITE_GUARD_PILOT_2026_10_26.md)。下方 2026-07-30 的記憶體模擬說明為舊模式，仍保留作為未開啟雲端模式時的參考，不代表正式收費啟用。

Date: 2026-07-30
Status: implemented and authenticated UI-smoke verified for local validation only
Scope: Free, Pro, and Team account-capability simulation

## Purpose

Allow an authenticated owner to validate subscription presentation and access
gates without creating a paid row or changing billing data. This is a test
harness, not an entitlement source and not a billing substitute.

## Activation

The server-only environment variable must be set in a local ignored environment
file and the request URL must use a loopback host:

```text
SUBSCRIPTION_SIMULATION_ENABLED=true
```

Supported loopback hosts are `localhost`, `127.0.0.1`, and `[::1]`. The tool is
disabled when the variable is absent or false, for non-loopback URLs, and when a
Vercel deployment marker exists. No `NEXT_PUBLIC_*` variable grants access.

The local workspace uses ignored `.env.development.local` and
`.env.production.local` files so both `next dev` and local `next start` can run
the harness. Those files are not deployment configuration.

## Runtime Contract

- The owner opens `/subscription` and enables the local simulation switch.
- The UI calls authenticated `GET` and `POST`
  `/api/dev/subscription-simulation` requests.
- State is stored in server process memory, keyed by authenticated actor id.
- A state expires after four hours, is removed when disabled, and is lost when
  the server restarts.
- `GET /api/account-capabilities` checks the simulation only after bearer-token
  authentication and only for a loopback request with the private flag enabled.
- A simulated snapshot uses the existing plan model and returns the explicit
  `simulation_enabled` read status.

## Independent Gates

Simulation can exercise client/local capabilities that already consume the S4
account-capability read, including analytics, settlement report tiers, and local
PDF generation. It does not bypass:

- owner, manager, operator, viewer, or unresolved role decisions;
- runtime/environment feature flags;
- data-completeness requirements;
- RLS, RPC, ownership, active relationship, or server-write authorization;
- product-cover or sales-evidence upload routes;
- payment, checkout, founder pricing, promotion, or referral state.

Team simulation therefore does not turn a staff account into an owner and does
not authorize high-cost cloud writes. This separation is intentional: it allows
tests to prove that plan inclusion alone cannot bypass another required gate.

## Validation Matrix

| Simulated plan | Single-market and advanced analytics | Full settlement/PDF | Team model capabilities |
| --- | --- | --- | --- |
| Free | blocked or approved Free preview | Free summary; PDF blocked | false |
| Pro | included, subject to role/runtime/data | included for owner, subject to runtime/data | false |
| Team | inherits Pro | inherits Pro | true in capability model; role/server gates remain independent |

## Recorded Validation Evidence

Authenticated browser smoke passed on 2026-07-30:

- Free kept the bounded recent-three and basic-settlement previews while paid
  analytics, PDF, and Team collaboration actions remained blocked;
- Pro opened paid analytics, full settlement, and PDF presentation while Team
  collaboration remained blocked;
- Team inherited Pro presentation and exposed Team capability state, but every
  cloud-mutating Team control remained disabled by simulation mode;
- subscription, Team, and settlement surfaces had no horizontal overflow at
  390px, 768px, 1440px, and 1920px widths;
- no console error occurred, no auth/browser storage was inspected, and no
  subscription or collaboration data was mutated.

## Production Stop Conditions

- Never configure `SUBSCRIPTION_SIMULATION_ENABLED` in staging or production.
- Never persist simulation in Supabase, Dexie, browser storage, cookies, or an
  operational event.
- Never accept a plan from the account-capability query string, request header,
  local storage, or public environment.
- Never let simulation authorize a paid server write, upload claim, billing
  mutation, referral grant, or founder-price assignment.
- Remove or disable the local environment flag before collecting deployment
  evidence.
# 2026-10-26 三方案測試入口增量

設定頁新增免費／輕量／高階切換及還原原方案；原生代碼仍為 free／pro／team，功能依[新三方案規格](SUBSCRIPTION_FEATURE_TIERS_2026_10_26.md)。面板改直接選方案，移除使用者切換流程內的資料庫 smoke 按鈕；原獨立檢查工具仍保留。模擬的登入、loopback、非部署、server flag 及四小時期限不變，不修改雲端 entitlement／角色／付款；詳見[本輪紀錄](THREE_TIER_EXPERIENCE_IMPLEMENTATION_2026_10_26.md)。以下既有英文紀錄是較早基線。


## 2026-10-26 雲端測試增量（本機已啟用）

新增可選的雲端模式，使指定帳號的畫面與寫入權益一致，詳見 [雲端寫入試行手冊](SUBSCRIPTION_WRITE_GUARD_PILOT_2026_10_26.md)。必須先完成 082、測試帳號啟用及唯讀驗證，再設定 `SUBSCRIPTION_SIMULATION_CLOUD_ENABLED=1`、`SUBSCRIPTION_WRITE_ENFORCEMENT_ENABLED=1`。模式開啟後不採記憶體模擬回退，四小時期限跨伺服器重啟保留，還原／到期顯露原始帳號方案，不改正式訂閱帳本。原本 loopback、非 Vercel、驗證登入與伺服器開關仍全部適用。

2026-10-26 啟用結果：使用者完成雲端設定後，已確認指定帳號就緒並啟用本機新開關；三方案 capability API 與 18 項雲端權限檢查通過，最後已還原原有方案。私人 helper／設定表的 authenticated 存取被拒絕，未登錄控制帳號未啟用。實際營運資料保存與四小時實際等待未測。詳見上述手冊的真實雲端核對紀錄。
