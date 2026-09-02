# Billing Provider Adapter Contract

日期：2026-07-30

狀態：F3-design provider-neutral read / reconciliation contract；無 provider implementation

Canonical type contract：

```text
lib/subscription/billing-provider-contract.ts
```

## 1. Scope

目前只定義安全接收 notification 與查詢 authoritative provider state 所需的介面。

Included：

- provider origin / environment identity；
- capabilities discovered from merchant contract and sandbox evidence；
- raw notification verification input；
- verified normalized event；
- customer、subscription、transaction query snapshots；
- safe and retryable error taxonomy；
- idempotent read / reconciliation semantics。

Excluded：

- checkout session creation；
- recurring mandate creation or modification；
- charge、capture、refund、credit；
- cancellation or cancellation reversal；
- Apple / Google purchase SDK；
- webhook route、secret loading、network client、database writer；
- entitlement、Founder assignment 或 subscription projection mutation。

Mutation methods 只有在 S9、merchant sandbox 與 F3 schema slices 各自核准後才能另建
contract；不得偷偷加進 read adapter。

## 2. Dependency direction

```text
provider-specific server adapter
  -> implements billing-provider-contract.ts
  -> returns normalized verified snapshots
  -> reconciliation orchestration validates owner binding and lifecycle
  -> approved F3 writer persists ledger and projection
```

反向依賴禁止：

- shared pricing model 不 import provider adapter；
- React / page / client component 不 import provider adapter；
- provider adapter 不 import UI、Dexie 或 browser storage；
- provider adapter 不呼叫 account-capability client；
- database trigger 不呼叫 provider network；
- provider metadata 不直接決定 internal owner / plan / price。

## 3. Identity binding

Provider callback 可能包含 email、merchant order id 或 custom metadata，但這些只能用來尋找
候選。真正 owner binding 必須來自 durable `billing_customer_links`，並符合：

```text
billing origin
provider environment
provider customer reference
expected subscription customer reference
trusted BoothBook owner id
```

任何 mismatch 都回 `identity_mismatch`，不建立新 customer link、不改 projection。

## 4. Raw notification verification

Adapter 必須接收 raw bytes，不先 JSON parse 後再重組；不同 provider 依最新文件驗證：

- signature / checksum；
- timestamp tolerance；
- merchant / app identity；
- environment；
- content type and body bounds；
- certificate / key rotation where applicable。

驗證成功後只輸出 allowlisted `VerifiedProviderEvent`。Raw payload persistence、encryption、
retention 與 access 由 event inbox layer 負責，不附帶在 normalized event 供全系統流通。

## 5. Provider capabilities

Capabilities 是 activation evidence，不是 marketing assumption：

```text
authoritativeSubscriptionQuery
authoritativeTransactionQuery
stableEventReference
eventSequence
exactProrationQuote
cancellationReversal
recurringMandateModification
partialRefund
```

每個 production adapter 都要由 dated merchant account / sandbox evidence 建立 capability
snapshot。若能力 false：

- orchestration 必須採已核准 fallback；或
- 自助 flow `support_required`；
- 不以 client calculation、delay、盲目 retry 或 provider 名稱猜測支援。

## 6. Snapshot rules

### Customer

- 回傳 provider customer ref 與 provider observed time；
- 不回完整付款資料；
- card brand / last4 只有未來 owner billing UI 確有需要且 provider / privacy review 通過才另加 safe projection。

### Subscription

- normalized status 不直接等於 entitlement；
- period start / end、cancel-at-period-end、product / price refs 保留；
- unknown provider value maps to `unknown`，不能預設 active；
- provider sequence 缺失時回 null，不自製 sequence；
- snapshot hash 由 server canonical serializer 產生，不使用 JavaScript object insertion order。

### Transaction

- amount 必須 integer minor units；
- refund / credit 以 kind 表示方向，amount 不用負數；
- settled、failed、reversed 分開；
- transaction ref / parent ref 保留 provider identity；
- unknown currency、invalid amount 或 identity mismatch 整筆 fail closed。

## 7. Error contract

Provider adapter 不向 UI 洩漏原始 upstream body、stack、secret、merchant id、signature 或
personal data。它只回：

```text
configuration_unavailable
authentication_failed
verification_failed
identity_mismatch
not_found
rate_limited
provider_unavailable
timeout
invalid_provider_response
unsupported_operation
unknown
```

`retryable` 必須由 adapter 明確分類。Orchestrator 不因 HTTP status 或字串自行猜測：

- verification / identity / invalid response 預設不 retry business effect；
- rate limit / timeout / provider unavailable 可排程 bounded reconciliation retry；
- configuration unavailable 觸發 billing-write disable and operator alert；
- unknown fail closed and requires evidence。

## 8. Time and ordering

- 所有時間是有 offset 的 ISO instant；
- provider occurred、observed、local received 分欄；
- local client clock 不出現在 adapter input；
- provider sequence 若有，保留原始 bounded string，不能轉浮點；
- query snapshot 優先於 notification arrival order；
- invalid time 不以 current time 補值。

## 9. Logging and observability

Allowed：

```text
origin
environment
operation
correlation id
event / snapshot hash prefix
safe error code
latency bucket
retry count
```

Forbidden：

```text
raw body
authorization header
signature / checksum secret
full provider customer / transaction reference in general logs
email, card, address, tax identity
checkout token
```

Full provider references 只進 access-controlled billing records；一般 logs 使用不可逆 hash 或
短期 correlation id。

## 10. Provider-specific activation

### Apple App Store / Google Play priority

- 原始 store transaction、product、environment 與 account-binding evidence 必須保留；
- client purchase result 只能送交 server verification，不能直接授予 entitlement；
- Apple signed transaction / server notification 與 Google purchase token / RTDN
  都必須以當時官方規格驗證；
- restore 只能恢復至同一 trusted Féria owner binding；
- active paid origin 衝突時凍結新購買與方案異動，轉 support reconciliation；
- authoritative subscription / transaction query verified；
- duplicate and out-of-order behavior recorded；
- refund / cancellation / failed renewal evidence；
- sandbox and production secret separation。

### ECPay deferred Web phase

ECPay 不屬於 native launch blocker。Web checkout 重新啟動後，adapter 必須符合完全相同
normalized contract；storefront mapping 使用 `server_amount`，不因 API 能力較少而降低
quote、refund、verification 或 idempotency acceptance。

### NewebPay historical status

NewebPay 是 `not_selected`，只保留歷史決策與 evidence，不建立新 adapter、SDK、callback
或 activation 工作。

RevenueCat 若採用，只是 native aggregation adapter；原始 store、transaction id 與
environment 仍須保留。不得用 RevenueCat customer alias 取代 trusted Supabase owner binding。

## 11. Test contract

每個 adapter 未來至少要有：

- official sandbox fixture and one independently corrupted fixture；
- signature / checksum before parse test；
- body / header bounds；
- environment and merchant mismatch；
- duplicate event and missing event ref；
- unknown enum / field additive compatibility；
- query 404、401、429、5xx、timeout、malformed response；
- transaction amount / currency / parent identity validation；
- secret and PII log scan；
- deterministic canonical snapshot hash；
- no UI、Dexie、browser、Capacitor or entitlement mutation import。

## 12. Completion boundary

這份 contract 與純 TypeScript interfaces 完成後，仍不代表 provider 已接入。Production
readiness 必須由 provider-specific implementation、merchant sandbox、F3 migrations、callback
route security、reconciliation integration、support runbook 與 `BILLING_TEST_MATRIX.md` 證據共同證明。
