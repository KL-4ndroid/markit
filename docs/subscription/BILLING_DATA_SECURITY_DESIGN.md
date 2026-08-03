# Billing Data Security Design

日期：2026-08-03

狀態：F3-design complete；F3A live；F3B local migration complete but not applied；F3C-F3E 與 writer/runtime 未核准

依賴：

```text
docs/subscription/BILLING_PROVIDER_DECISION.md
docs/subscription/BILLING_LIFECYCLE_STATE_MACHINE.md
docs/subscription/BILLING_TEST_MATRIX.md
lib/subscription/subscription-pricing.ts
```

## 1. 決策摘要

F3 採用「private billing ledger + narrow capability projection」架構：

- `subscription_accounts` 保持一個 owner 一列的有效方案 projection；
- provider customer、subscription、transaction、event、quote 與 Founder assignment 不加入 `subscription_accounts`；
- 所有 billing records 對 `anon` 與 `authenticated` 預設無直接 CRUD；
- callback 先驗證並 durable ingest，再由 reconciliation 查 provider current state；
- price assignment 與 transaction ledger 是 append/audit oriented，不能被 UI 或一般 profile update 覆寫；
- provider adapter 不決定 owner、capability 或 Founder eligibility；
- client 只收到 allowlisted capability / billing presentation，不收到 raw provider references、payload、secret 或 internal risk state；
- local IndexedDB、localStorage、subscription simulator 與 market events 都不是 billing truth。

本文件描述完整 logical records 與 constraints。F3A 的三個 foundation records 已由
`066_add_subscription_price_catalog_foundation.sql` 實作並套用；F3B 的五個 private ledger
records 已由 `067_add_billing_event_transaction_ledger.sql` 在 repo 實作但尚未套用。F3C-F3E
records 仍是 future design，不構成 writer、callback、provider 或 runtime 核准。

## 2. Current-state boundary

已套用的 `063_add_subscription_accounts.sql` 提供：

- `subscription_accounts` 最小 projection；
- `free`、`admin`、`promotion`、`billing` source shape；
- service-role-only `read_subscription_account_for_actor`；
- 對 public、anon、authenticated 的 table revoke；
- billing / promotion runtime 未存在時的 fail-closed 註解。

F3 不取代這個 read model。未來 billing reconciliation 只能透過受限 server writer 更新
`plan_source='billing'` projection，不得放寬現有 public read 權限，也不得讓 billing
writer 修改 `admin` 或 `promotion` rows。

## 3. Logical record model

除 3.4 到 3.6 已由本機 F3A migration 定義但尚未套用外，以下名稱都是設計名稱，
不是 live physical tables。

### 3.1 `billing_customer_links`

用途：把 trusted owner workspace 與某一 payment origin 的 customer identity 綁定。

必要欄位：

```text
id
owner_id
billing_origin
provider_environment
provider_customer_ref
status
created_at
updated_at
```

不變條件：

- owner identity 來自 BoothBook authenticated server context，不從 callback `customData` 或 email 建立；
- unique `(owner_id, billing_origin, provider_environment)`；
- unique `(billing_origin, provider_environment, provider_customer_ref)`；
- email、display name、card data 不作 identity key；
- owner transfer 必須是獨立 audited migration，不直接 update owner id。

### 3.2 `billing_subscriptions`

用途：保存 provider / storefront subscription 的 normalized current snapshot。

必要欄位：

```text
id
billing_customer_link_id
owner_id
billing_origin
provider_environment
provider_subscription_ref
provider_product_ref
provider_price_ref
normalized_plan_code
normalized_cadence
normalized_billing_status
cancel_at_period_end
current_period_starts_at
current_period_ends_at
provider_observed_at
provider_sequence
snapshot_hash
last_reconciled_at
created_at
updated_at
```

不變條件：

- unique `(billing_origin, provider_environment, provider_subscription_ref)`；
- `owner_id` 必須和 customer link 相同，不能只相信 provider metadata；
- provider status 與 app entitlement 分離；
- snapshot hash 用於稽核 / out-of-order 比較，不替代 provider query；
- 同 owner 正常狀態最多一個 active paid origin；偵測衝突時凍結方案異動並交 support，不自動取消。

### 3.3 `billing_transactions`

用途：append-oriented 保存 charge、refund、credit、dispute、chargeback 與 reversal。

必要欄位：

```text
id
owner_id
billing_subscription_id
billing_origin
provider_environment
provider_transaction_ref
provider_parent_transaction_ref
transaction_kind
transaction_status
currency
amount_minor
provider_effective_at
settled_at
provider_observed_at
snapshot_hash
created_at
```

不變條件：

- 所有 amount 都是 integer minor units；
- `amount_minor >= 0`，方向由 `transaction_kind` 表示；
- provider identity / kind 的 idempotency key 必須唯一；
- 已 settled transaction 不可被 delete 或原地改金額；更正使用 reversal / adjustment record；
- transaction existence 不直接授予 capability，reconciliation 必須同時驗證 subscription state。

### 3.4 `subscription_price_versions`

用途：把已核准的 immutable commercial catalog 映射到 provider storefront references。

必要欄位：

```text
id
plan_code
cadence
currency
amount_minor
price_policy
offer_code
commercial_status
effective_at
retired_at
created_at
```

不變條件：

- code catalog 與 database rows 必須用 deployment guard 比對；
- `candidate` 不得被 checkout 或 assignment writer 使用；
- active price row 不原地改 plan、currency、amount 或 policy；調價建立新 id；
- Founder offer code 與 price version id 分開；
- provider mapping 另存，不把 external ref 當 internal price id。

### 3.5 `billing_storefront_price_mappings`

用途：一個 internal price version 對應一個 billing origin / environment 的 provider product and price reference。

不變條件：

- unique `(price_version_id, billing_origin, provider_environment)`；
- unique provider price ref 不可指向兩個 active internal versions；
- `mapping_mode='provider_price_object'` 必須保存 provider price reference；
- `mapping_mode='server_amount'` 使用 server-owned amount，不建立虛構 provider price reference；
- sandbox 與 production mapping 絕不共用；
- mapping activation 需要 dated dashboard / API evidence；
- 未驗證的 Apple / Google Founder mapping 保持 absent，不用 fallback public price 假裝 Founder。

### 3.6 `subscription_price_assignments`

用途：保存 owner 實際取得的價格、Founder continuity 與 lock lifecycle。

必要欄位：

```text
id
owner_id
billing_subscription_id
price_version_id
price_policy
assigned_currency
assigned_amount_minor
founder_offer_code
founder_lock_status
continuity_started_at
dormant_at
forfeited_at
forfeiture_reason
assigned_at
superseded_at
created_at
updated_at
```

不變條件：

- Founder acquisition 每 owner 最多一次；forfeited 不可重新 active；
- renewal 使用 `assigned_amount_minor`，不 join current public price 重算；
- dormant assignment 不產生 Pro entitlement，也不折扣 Team；
- active / grace / dormant / forfeited transition 必須符合 F1 resolver；
- transition 需要 provider snapshot / transaction / support action evidence reference；
- 一個 billing subscription 同時間最多一個 current assignment；
- assignment 不由 client、referral code、query string 或 simulator 建立。

### 3.7 `billing_plan_change_quotes`

用途：保存 provider quote 或待 server signature 的 exact plan-change contract。

必要欄位：

```text
id
owner_id
from_price_assignment_id
target_price_version_id
quote_mode
provider_snapshot_ref
actual_paid_amount_minor
unused_value_minor
charge_amount_minor
refund_or_credit_amount_minor
net_amount_minor
currency
effective_at
next_renewal_at
rounding_policy_version
expires_at
consumed_at
status
created_at
```

不變條件：

- immutable input / output；變更任何 input 都建立新 quote；
- `server_signed_quote` 必須先通過 F1 resolver，之後才由 server signing layer 簽章；
- single-use；同一 quote 重送回原 outcome，不重複 money movement；
- expired、stale snapshot、price retired、subscription changed 全部拒絕；
- unavailable money / date 保持 null；
- quote consumed 與 plan-change saga 使用同一 idempotency boundary。

### 3.8 `billing_event_inbox`

用途：保存 provider callback / store notification 的 durable ingestion state。

必要欄位：

```text
id
billing_origin
provider_environment
provider_event_ref
payload_hash
verification_status
event_kind
provider_occurred_at
received_at
processing_status
attempt_count
next_attempt_at
last_safe_error_code
processed_at
raw_payload_ciphertext_ref
```

不變條件：

- insert 前先限制 body / header 大小與 content type；
- raw body 必須保留至 provider-specific signature / checksum 驗證完成；
- invalid event 不進 reconciliation；
- unique provider event ref；沒有 event ref 時使用已核准的 deterministic dedupe key；
- payload hash 不包含 secret 且不可用來重建敏感 payload；
- event processing at-least-once，business effect idempotent；
- raw payload 不出現在一般 logs 或 owner UI。

### 3.9 `billing_reconciliation_runs`

用途：記錄 provider query 到 ledger / projection 更新的每一次判定。

必要欄位：

```text
id
owner_id
billing_origin
trigger_kind
trigger_event_inbox_id
provider_snapshot_ref
provider_observed_at
status
before_projection_hash
after_projection_hash
decision_code
safe_error_code
started_at
completed_at
```

不變條件：

- 不保存 service key、signature、完整 raw payload 或卡片資料；
- older snapshot 不得覆寫 newer projection；
- no-change 也留下 decision code，方便證明 duplicate / stale event 已處理；
- failure 可 retry，但 retry 不重複 transaction / assignment effect。

### 3.10 `billing_adjustment_obligations`

用途：處理 Team charge 成功但 unused Pro refund / credit 暫時失敗的 customer liability。

不變條件：

- unique plan-change quote / obligation kind；
- amount 來自 consumed exact quote，不重新試算；
- 狀態為 open、processing、settled、waived-by-approved-policy；
- waived 需要雙重審核與 reason，不能由一般 support 自由歸零；
- open obligation 會阻擋同類第二次 refund 並產生告警；
- settlement 需 provider transaction evidence。

### 3.11 `billing_support_actions`

用途：append-only 記錄人工 reconcile、退款補救、origin migration、lock forfeiture 與特殊更正。

必要欄位：

```text
id
owner_id
support_actor_id
action_type
reason_code
case_reference
idempotency_key
before_state_hash
after_state_hash
provider_evidence_ref
approved_by
created_at
```

不變條件：

- support actor 不等於 workspace owner / staff role；
- 沒有自由文字 SQL 或任意 plan / price mutation；
- 高風險 action 需要 second approver；
- 所有 action 先 dry-run preview，再 explicit confirm；
- Founder restore after forfeiture 預設不提供 action；例外需獨立商業 / 法務決策。

## 4. Projection writer contract

Future writer 的唯一責任是把已 reconcile 的 billing truth materialize 到
`subscription_accounts`。它不能呼叫 provider，也不能接受 client-supplied plan。

必要 input：

```text
owner_id
expected_previous_projection_version
source_reconciliation_run_id
normalized plan / billing / entitlement state
entitlement_ends_at
provider observed timestamp
```

必要行為：

1. Lock owner billing state (`FOR UPDATE` or equivalent transaction lock).
2. 驗證 reconciliation run completed、origin / owner 一致、snapshot 未過期。
3. 驗證 plan-source transition，不覆寫 active admin / promotion grant。
4. 驗證 price assignment / entitlement / plan intersection。
5. Compare-and-swap projection version，避免 stale worker 回滾。
6. 更新 projection 與 audit hash 在同一 transaction。
7. 觸發既有 Team downgrade suspension only after committed entitlement transition。
8. 回傳 narrow result，不回 raw billing records。

`subscription_accounts` 未來需加入的欄位只能是 projection freshness / version /
reconciliation reference，不加入 provider customer、transaction、amount、card、tax 或
raw event data。

## 5. RLS 與 privilege matrix

所有 future billing tables 若位於 exposed `public` schema：

- 必須 `ENABLE ROW LEVEL SECURITY`；
- `REVOKE ALL` from `PUBLIC, anon, authenticated`；
- 不建立 permissive owner direct-select policy；
- service secret 只存在 server，不能進 browser / mobile bundle；
- mutation 透過 allowlisted server client 與 narrow RPC / transaction boundary；
- future owner billing-history API 使用明確欄位 allowlist，不 `SELECT *`；
- staff / manager 沒有 billing history、price assignment 或 support action access；
- callback HTTP endpoint 不使用 user session，也不因此獲得任意 database authority。

任何 `SECURITY DEFINER` function：

- 只有確實需要跨 RLS atomic mutation 時使用；
- `SET search_path = ''` 並 fully qualify every relation；
- revoke execute from public、anon、authenticated；
- grant only to service_role or future narrower database role；
- 固定輸入型別、限制字串長度、驗證 owner / origin / environment；
- 不接受 caller-supplied role、price、eligibility、provider verified flag 作為唯一證據；
- migration tests 必須檢查 privilege 與 search path。

Supabase 官方說明 service / secret keys 可 bypass RLS，因此 RLS 不是 service-role
writer 的唯一安全界線；server module allowlist、RPC constraints、database constraints
與 audit 必須同時存在。

## 6. Idempotency 與 concurrency

### 6.1 Idempotency layers

| Boundary | Key | Duplicate outcome |
| --- | --- | --- |
| callback ingest | origin + environment + provider event ref / approved hash key | return existing inbox id |
| provider transaction | origin + environment + provider transaction identity + kind | return existing ledger record |
| checkout / future mutation | owner + operation type + client request id bound to server intent | return original result; conflicting payload rejected |
| quote consumption | quote id | return original saga state; no second provider call |
| price assignment | owner + founder offer acquisition uniqueness | duplicate acquisition rejected |
| projection writer | reconciliation run id + expected projection version | no-op or stale conflict |
| support action | support actor + case + idempotency key | return original action |

### 6.2 Lock order

Future database transaction 使用固定 lock order，避免 deadlock：

```text
owner billing scope
-> billing subscription
-> quote / operation intent
-> transaction / assignment
-> subscription_accounts projection
```

不在 database transaction 內等待 provider network。Provider call 前建立 durable intent，
call 後以 provider transaction identity reconcile。Process crash 由 query + idempotency
恢復，不以「再扣一次試試」恢復。

### 6.3 Out-of-order rule

Event arrival time 不能單獨決定新舊。排序依序使用：

1. provider authoritative sequence / version（若有）；
2. provider observed / effective timestamp；
3. provider current-state query；
4. local received timestamp 只作稽核，不作交易真相。

無法判定時保持 current projection、標記 `needs_reconciliation`，不得降為 Free 或升為
Team 猜測結果。

## 7. Threat model

| Threat | Required control | Failure behavior |
| --- | --- | --- |
| forged callback | provider-specific raw-body signature / checksum verification | reject; no reconcile |
| replayed callback | durable unique event key and idempotent ledger | existing result; no duplicate effect |
| out-of-order notification | provider query and snapshot version comparison | stale no-op |
| callback body flood | size, content-type, timeout and rate limits before parsing | reject / throttle |
| client changes plan / amount | ignore client commercial fields; resolve server catalog and assignment | 400/403 fail closed |
| staff attempts billing mutation | owner-only server role check plus no table grants | 403 |
| cross-owner provider ref | unique customer link plus expected-customer query check | security alert; no projection update |
| sandbox / production mix | environment in every unique key and secret set | reject mismatch |
| duplicate active origins | one-origin invariant and anomaly case | freeze self-service changes |
| stale quote | expiry, snapshot, assignment and price-version compare | quote rejected |
| charge success / projection failure | durable provider transaction and reconciliation retry | grant after verified recovery; no re-charge |
| refund failure after Team charge | adjustment obligation | Team remains paid; liability preserved |
| service key leak | server-only env, bundle scans, rotation runbook | disable billing writes and rotate |
| raw payload / PII leak | encryption reference, redacted logs, least access | incident workflow |
| support misuse | scoped actions, reason, preview, second approval | action denied / audited |
| account deletion | legal hold and pseudonymized financial linkage | no premature ledger deletion |
| simulator abuse | no billing table / writer import or route access | presentation only |

## 8. Retention、privacy 與 deletion

本節是工程 policy proposal，不是台灣稅務或法律保存期限的最終判定。

| Data class | Initial rule | Final gate |
| --- | --- | --- |
| raw callback payload | encrypt, strict access, shortest period needed for disputes / debugging | provider + legal review |
| payload hash / event metadata | retain longer than raw payload for idempotency evidence | security review |
| settled transactions / refunds / disputes | immutable financial record with legal hold support | accountant / legal retention decision |
| price assignments / Founder transitions | retain for subscription lifetime plus approved dispute period | commercial + legal review |
| quote drafts never consumed | short operational TTL then redact/delete sensitive refs | security review |
| consumed quotes / obligations | retain with transaction and support evidence | accounting review |
| reconciliation diagnostics | bounded retention; safe error codes only | operations review |
| support actions | append-only, access logged | legal / security review |

禁止保存：完整卡號、CVC、provider secret、signature secret、可重放 checkout token、未遮蔽
Authorization header。Owner account deletion先解除產品資料與公開 identity，再依核准保存規則
保留或 pseudonymize 法定 financial evidence；不能 cascade delete 使 chargeback 無法對帳。

## 9. Support and operational controls

Launch 前必須具備：

- owner 可見的付款狀態、方案、下次日期與取消入口；
- `payment_pending`、`payment_failed`、`reconciliation_delayed`、`refund_pending`、`origin_conflict` 的安全文案；
- support case id，禁止請使用者提供完整卡號或 secret；
- read-only account timeline；
- narrow manual reconcile；
- quote / event / transaction / projection correlation id；
- provider outage、callback backlog、past-due spike、open adjustment obligation 告警；
- refund、dispute、Founder forfeiture 與 origin migration runbooks；
- emergency billing-write disable switch，不影響既有 read-only data access；
- daily settlement variance report與 launch canary review。

## 10. Future migration slices

每一片都需另行核准。F3A 已套用；F3B 已核准並完成本機實作，但尚未套用：

1. `F3A catalog-and-assignment foundation`：migration `066_add_subscription_price_catalog_foundation.sql` 已套用；只建立 candidate price versions、空 storefront mapping、空 assignment constraints；無 provider event writer。
2. `F3B event-and-transaction ledger`：migration `067_add_billing_event_transaction_ledger.sql` 已在 repo 完成但尚未套用；建立空 customer link、subscription、transaction、event inbox、reconciliation records；仍無 public route、writer 或 direct grant。
3. `F3C projection writer`：service-role-only CAS writer 與 read-only verification SQL。
4. `F3D quote-and-obligation`：single-use quote、plan-change saga state、adjustment obligation。
5. `F3E support audit`：read-only timeline 與 narrow approved action RPC；不含任意 mutation console。

每片都要有 rollback / disable strategy、RLS / privilege tests、anonymous / authenticated
denial smoke、service-role positive fixture、cross-owner adversarial fixture 與 production-readiness
evidence。不得用一個大型 migration 同時開 schema、writer、callback、checkout 與 UI。

## 11. F3-design and F3A acceptance

目前完成只表示：

- logical records、ownership、uniqueness、immutability 與 projection boundary 已定義；
- RLS、service-role、SECURITY DEFINER、idempotency、concurrency、retention 與 support threat model 已定義；
- migration 已拆成可個別審查 slices；F3A 已套用，F3B migration、read-only verifier、denial smoke 與 runbook 已在 repo 完成但尚未套用；
- provider-neutral read / reconciliation adapter contract 可以進行；
- F3C-F3E、writer、callback route、provider SDK、checkout、refund 與 entitlement mutation 仍未核准；F3B 尚未套用且不提供 runtime authority。

## 12. 官方安全參考

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase database functions](https://supabase.com/docs/guides/database/functions)
- [Supabase securing your data](https://supabase.com/docs/guides/database/secure-data)
- [Supabase security advisors](https://supabase.com/docs/guides/database/database-advisors)
