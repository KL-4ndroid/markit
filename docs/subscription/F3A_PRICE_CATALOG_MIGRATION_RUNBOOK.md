# F3A Price Catalog Migration Runbook

日期：2026-08-05

狀態：migration 066 已在選定 sandbox 套用並完成 external verification；read-only
verifier 全部為 true，F3A Security Advisor 無相關 ERROR/WARN。這不是 Production 證據，
不得在相同 target 重複套用

Canonical evidence：

```text
docs/subscription/evidence/billing/f3a/2026-08-05/F3A_PRICE_CATALOG_LIVE_VERIFICATION_2026-08-05.md
```

## 1. Artifact

```text
supabase/migrations/066_add_subscription_price_catalog_foundation.sql
supabase/verification/066_subscription_price_foundation_read_only.sql
tests/subscription-price-catalog-foundation.test.ts
scripts/smoke-subscription-price-foundation.mjs
tests/subscription-price-foundation-live-smoke.test.ts
```

Migration 066 只建立：

- `subscription_price_versions`；
- `billing_storefront_price_mappings`；
- `subscription_price_assignments`；
- immutable / state-transition trigger functions；
- RLS、revoke、partial uniqueness；
- 五筆 `candidate` TWD price versions。

它不建立 active price、storefront mapping、owner assignment、writer RPC、callback、
provider adapter、checkout 或 entitlement mutation。

## 2. Why this slice is safe to stage first

- `candidate` row 的 `effective_at` 必須是 null；
- assignment trigger 只接受 active price 與 active storefront mapping；
- migration 不建立任何 active mapping，因此 assignment table 初始必為空；
- PUBLIC、anon、authenticated、service_role 都沒有直接 table privilege；
- 沒有 public RLS policy，也沒有 writer function；
- `subscription_accounts`、Team enforcement 與 capability read model 完全不變；
- owner deletion 不會 cascade erase financial assignment evidence；
- Founder unique index 即使 forfeited 仍阻擋第二次 acquisition；
- current-assignment partial index允許 Team current standard assignment與 dormant Founder reserve 共存，但不允許兩個 current commercial assignments。

## 3. Pre-apply gates

人工套用前全部確認：

1. 目標 project ref 與環境名稱明確，不對錯誤 project 操作。
2. Migration 063、064、065 已存在且 live smoke 結果仍有效。
3. `subscription_price_versions`、`billing_storefront_price_mappings`、`subscription_price_assignments` 均不存在。
4. Repository focused guard、完整 tests、lint、build、diff check 通過。
5. Migration 066 的 hash 與本次審查版本一致。
6. 尚未建立任何 checkout、provider callback 或 billing writer。
7. 操作者理解套用後仍不能收款，也不能手動將 row 改為 active。

任一條不成立就停止。

## 4. Apply procedure

Migration 必須以 Supabase migration workflow 或 SQL Editor 的單一 transaction 完整套用。
不要拆段執行，不要在執行前手動改 `candidate`、amount、RLS、revoke 或 trigger。

套用完成後立刻執行：

```text
supabase/verification/066_subscription_price_foundation_read_only.sql
```

每一列 `passed` 都必須是 `true`。預期資料狀態：

```text
subscription_price_versions: 5 candidate, 0 active
billing_storefront_price_mappings: 0
subscription_price_assignments: 0
subscription_accounts: unchanged
```

## 5. Required denial smoke

使用普通 publishable / anon 與 authenticated session 驗證：

- 三張 F3A tables 不能直接 select；
- 不能 insert、update 或 delete；
- 不能 execute 三個 trigger functions；
- 既有 `GET /api/account-capabilities` 行為不變；
- Free、admin Pro、admin Team 讀取不受影響；
- local subscription simulator 不能建立任何 F3A row。

Service secret 也沒有 direct table grant。未來 writer 必須是另行審查的 narrow
`SECURITY DEFINER` transaction contract，不能在 application code 直接 `.from(...).insert()`。

可重跑的 REST denial smoke：

```powershell
npm.cmd run smoke:subscription:price-foundation

$env:SUBSCRIPTION_SMOKE_USER_EMAIL='<isolated-test-email>'
$env:SUBSCRIPTION_SMOKE_USER_PASSWORD='<isolated-test-password>'
npm.cmd run smoke:subscription:price-foundation -- --require-authenticated
Remove-Item Env:SUBSCRIPTION_SMOKE_USER_EMAIL,Env:SUBSCRIPTION_SMOKE_USER_PASSWORD
```

第一個指令驗證 anonymous 與 server secret。第二個指令才可完成 authenticated
證據；測試帳密不得寫入 repository、`.env*` 或執行輸出。

## 6. Stop and rollback decision

發生以下任一情形就停止後續 F3B：

- 任何 seeded row 不是 candidate；
- 出現 active price、mapping 或 assignment；
- 任一 client role 有 table/function privilege；
- Founder / current partial unique index缺失；
- trigger 缺失或允許 catalog amount / policy 原地修改；
- migration 影響 `subscription_accounts` 或 Team RPC；
- verification 有任何 false；
- Supabase security advisor 出現新的 F3A high-severity finding。

因為 migration 尚無 runtime consumer，若必須 rollback，先確認 mapping 與 assignment 都是
零筆，再建立獨立、人工審查的 rollback migration。不得在 SQL Editor 臨時 drop，也不得
在已有 financial records 時 cascade drop。

## 7. Post-apply evidence

保存以下不含 secret / PII 的證據：

- project ref 的遮蔽識別與 environment；
- migration applied timestamp / hash；
- read-only verification 全 true 輸出；
- anon / authenticated denial error codes；
- security advisor result；
- capability read regression；
- operator、reviewer、日期與任何 deviation。

完成這些證據只代表 F3A foundation live。F3B event/transaction ledger、F3C writer、
provider activation、S9 與 F4 仍未核准。

## 8. 2026-08-01 initial live evidence snapshot

- migration apply：使用者確認已執行；target 遮蔽識別、timestamp 與 migration hash 待補；
- anonymous：三張表的 select / insert / update / delete 全部為 `401/42501`；
- server secret：三張表的 select / insert / update / delete 全部為 `403/42501`；
- capability regression：owner missing-row Free、active staff 與 foreign actor boundary 通過；
- Team regression：active relationship 全部有 admin Team backing，無 suspended membership leak；
- authenticated denial：內建瀏覽器既有 session 執行 12 個 table 與 3 個 function probe，`15/15` 通過；
- authenticated smoke surface：只限 loopback、非 deployed 且明確開啟測試旗標；production 固定 `404`；
- read-only SQL verifier 與 Security Advisor：當時待人工保存輸出；已由下節
  2026-08-05 external verification evidence 補齊。

## 9. 2026-08-05 external verification completion

- environment：選定 sandbox；不宣稱 Production；
- migration 066：先前已套用，本次沒有重新套用；
- migration hash 與 masked target：已記錄於 canonical evidence；
- read-only verifier：所有 `passed` 均為 `true`；
- expected state：5 筆 candidate、0 active、0 storefront mapping、0 assignment；
- Security Advisor：F3A objects 無相關 ERROR/WARN；`rls_enabled_no_policy` INFO 為
  private foundation 預期結果；
- F3A 因此完成本 gate 的 selected-sandbox external verification，但仍不能收款、
  activate candidate price、建立 mapping/assignment 或授予 entitlement。
