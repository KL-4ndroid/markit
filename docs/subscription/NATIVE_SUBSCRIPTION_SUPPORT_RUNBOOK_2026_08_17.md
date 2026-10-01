# Native Subscription Support Runbook

Date: 2026-08-17

Status: support policy approved by `support_owner` on 2026-08-17; launch evidence remains pending; no public mailbox, console action, refund, entitlement grant, or production customer message is authorized by this document alone

Related items:

- `commercial.apple-grace-support`
- `commercial.google-grace-support`
- `commercial.downgrade-support`
- `commercial.cancel-expiry-support`

## 1. Proposed ownership and coverage

- One named role, `support_owner`, owns billing case triage, runbook maintenance, and escalation decisions.
- A backup responder role must be assigned before launch.
- Proposed staffed hours: Taiwan business days, 09:00–18:00 Asia/Taipei.
- Billing/cancellation cases receive a first response within one business day.
- A credible continuing-charge risk is escalated to `support_owner` and accounting the same business day during staffed hours.
- This draft does not promise 24/7 coverage. Critical security/privacy incidents follow the separate incident runbook and SLA.
- The public support mailbox remains TBD and must be proven with a synthetic case before launch.

## 2. State authority

- Apple/Google verified transaction state and the Féria server projection are authoritative.
- Support must not grant, extend, remove, or restore paid entitlement from a screenshot, client timer, local cache, promotion code, or customer statement alone.
- Never request or store a raw receipt, purchase token, full payment-card detail, Apple password, or Google password in a support case.
- Collect only the minimum safe identifiers: Féria account ID, store, app version, approximate event time, store-safe order reference when needed, and current server correlation ID.
- A mismatch remains `manual_review`; do not silently force a paid/free state.

## 3. User-facing message templates

### Apple billing grace

Title: `付款尚未完成，訂閱目前仍在寬限期`

Body: `Apple 正在嘗試更新付款。寬限期內可繼續使用目前方案；請前往 Apple 訂閱管理確認付款方式。實際權益與到期時間以 Apple 驗證狀態為準。`

Actions: `管理 Apple 訂閱` and `聯絡客服`.

### Google grace

Title: `付款尚未完成，訂閱目前仍在寬限期`

Body: `Google Play 正在嘗試更新付款。寬限期內可繼續使用目前方案；請前往 Google Play 訂閱管理確認付款方式。實際權益與到期時間以 Google Play 驗證狀態為準。`

Actions: `管理 Google Play 訂閱` and `聯絡客服`.

### Google account hold

Title: `訂閱付款待處理，付費功能已暫停`

Body: `Google Play 回報付款尚未恢復，因此付費功能暫停。更新付款方式並由 Google Play 確認恢復後，Féria 會恢復權益；首發價格資格在可恢復期間暫時保留。`

Actions: `更新付款方式` and `聯絡客服`.

### Scheduled Team to Pro downgrade

Title: `方案將於下次續訂日改為 Pro`

Body: `在商店顯示的生效日前仍可使用 Team。生效後，Team staff 存取與寫入會暫停，但 staff 關係與營運歷史不會刪除。`

Actions: `查看方案變更` and `管理訂閱`.

### Renewal turned off but still active

Title: `訂閱已取消續訂，目前仍可使用`

Body: `你仍可使用目前方案至商店驗證的到期時間。到期前恢復續訂可維持未中斷狀態；實際價格與日期以商店畫面為準。`

Actions: `管理訂閱` and `查看到期狀態`.

### Verified expiry or revocation

Title: `付費訂閱已到期`

Body: `商店已確認訂閱到期或撤銷。Féria 已切換為 Free；資料不會因訂閱到期而刪除，但付費功能與新的付費寫入已暫停。`

Actions: `查看方案` and `聯絡客服`.

## 4. Case routing

1. Identify store, Féria account, approximate timestamp, app version, and safe correlation ID.
2. Read server-projected subscription state and last verified store event; do not mutate it during triage.
3. Compare the expected policy transition with verified state:
   - Apple grace: entitlement and `FERIA50` continuity remain until verified recovery or expiry/revocation.
   - Google grace: entitlement and continuity remain.
   - Google account hold: entitlement pauses; recoverable launch-price eligibility remains reserved.
   - cancellation before expiry: entitlement remains through verified expiry.
   - verified expiry/refund/chargeback/revocation: paid entitlement and launch-price continuity end.
4. If state is consistent, explain it using the approved template and provide the official store-management path.
5. If state conflicts, open `manual_review`, preserve correlation evidence, and escalate. Never make a client-only correction.

## 5. Mistaken-revocation recovery

- Recovery requires fresh verified store/server evidence that the subscription is active or recovered.
- Restore the server projection idempotently; do not create a synthetic purchase or alter a store receipt.
- Recalculate entitlement from verified product, base plan/SKU, expiry, renewal and cohort identifiers.
- Preserve an audit event with actor role, reason, previous state, verified source, new state, timestamp, and release SHA. Do not log raw purchase tokens.
- If store state remains revoked/expired, support cannot manually promise paid entitlement. Escalate refund/store guidance or an approved service-credit path separately.

## 6. Launch evidence required after policy approval

- Named `support_owner` and backup responder role.
- Public mailbox and access recovery confirmed.
- Templates reviewed in Traditional Chinese and matched to final product UI.
- Apple and Google management deep links tested on supported devices.
- Synthetic Apple grace, Google grace/account-hold, scheduled downgrade, cancellation, expiry, and mistaken-revocation cases completed without customer data.
- Case timestamps, responder role, outcome, screenshot/reference, and release SHA recorded in repository-safe evidence.

These are launch-completion checks, not prerequisites for approving the runbook policy. They remain tracked by the external-account, native sandbox, support-case, and release-evidence checklist items and must not be auto-completed from a document approval.

## 7. Approval

Approval must state the date and approving `support_owner` role. It approves the proposed ownership, staffed hours, response targets, message intent, routing, and recovery rules for the four related support-policy items. It does not prove the Section 6 launch evidence and does not approve legal subscription terms, public privacy text, refunds outside store policy, native implementation, or production console changes.

Approved on 2026-08-17 by `support_owner` for:

- Taiwan business-day coverage proposal, 09:00–18:00 Asia/Taipei;
- one-business-day billing/cancellation first response;
- same-business-day escalation for credible continuing-charge risk during staffed hours;
- Apple grace, Google grace/account-hold, downgrade, cancellation, expiry and revocation message intent;
- verified-state-only routing and mistaken-revocation recovery.

Still required separately: public mailbox, backup responder, tested store-management links, synthetic cases, final UI copy review, release SHA, and repository-safe launch evidence.
