# Féria Session 1 Policy Decision Worksheet

Date: 2026-08-17

Status: Steps 1A–1K and deletion Steps 2A–2G policy approvals complete; implementation, security test evidence, store evidence, and remaining Session 1 operations await completion; no billing, deletion runtime, destructive test, or legal publication is authorized

Machine item status: `docs/MANUAL_LAUNCH_ITEM_STATUS_2026_08_17.json`

Subscription support draft: `docs/subscription/NATIVE_SUBSCRIPTION_SUPPORT_RUNBOOK_2026_08_17.md`

Deletion legal/security review packet: `docs/subscription/ACCOUNT_DELETION_LEGAL_SECURITY_REVIEW_PACKET_2026_08_17.md`

## 1. Approval Rules

- `proposed_ai` means the repository and current official rules support a bounded proposal. It remains unchecked until the responsible human role approves it.
- `pending_human` means required facts, protected accounts, professional review, or real operational evidence are unavailable to AI.
- `approved` requires a date, approving role, and repository-safe evidence pointer in the machine item-status file.
- Product-owner approval cannot substitute for legal, privacy, accounting, security, or support-owner approval where those roles are listed.
- This worksheet is an engineering/product decision record, not legal or accounting advice.

## 2. Step 1 — Commercial Launch Policy

### 2.1 Recommended first-launch package

| Item ID | AI proposal | Required human approval |
| --- | --- | --- |
| `commercial.pro` | Taiwan-first; Pro `NT$199/month` and `NT$1,990/year`; final console price must be a supported store price point; purchase UI uses store-localized tax-inclusive display | product owner + accounting |
| `commercial.team` | Taiwan-first; Team `NT$499/month` and `NT$4,990/year`; same store-authoritative display rule | product owner + accounting |
| `commercial.trial` | One 14-day Pro trial per eligible Féria owner account and eligible store account; monthly or annual Pro may expose the offer; Team has no launch trial; Founder eligibility remains a separate server flag | product owner + accounting + store review |
| `commercial.apple-grace` | Enable Apple Billing Grace Period for 16 days app-wide; entitlement remains during verified grace and ends when verified expired/revoked | product owner + support |
| `commercial.google-grace` | Configure 7-day grace; keep entitlement only during verified grace; use Google’s automatically calculated account-hold duration and remove paid entitlement during account hold | product owner + support |
| `commercial.upgrade` | Pro → Team becomes effective only after provider-confirmed payment/replacement; preserve actual unused paid value through store proration; active `FERIA50` moves to the corresponding Team launch price without a lapse; Founder behavior remains under `commercial.founder-transition` | product owner + accounting |
| `commercial.downgrade` | Team → Pro defaults to next renewal boundary; active `FERIA50` moves to the corresponding Pro launch price without a lapse; no new trial; suspend rather than delete staff access/history; Founder behavior remains under `commercial.founder-transition` | product owner + accounting + support operations |
| `commercial.cancel-expiry` | Cancellation keeps access through verified paid/trial expiry; renewal restored before expiry preserves `FERIA50`; verified expiry/refund/chargeback/revocation downgrades to Free, forfeits launch price, preserves readable data, blocks new paid-only writes, and does not delete workspace data | product owner + accounting + support operations |
| `commercial.price-change` | New price versions apply to new subscribers. Preserve existing standard subscriber prices and fixed `FERIA50` launch prices by default; do not recalculate launch prices against a future public price; any cohort migration or existing-subscriber price decrease needs a separate product/accounting and store notice/consent decision | product owner + accounting |

### 2.1.1 Step 1A approved record

Approved on 2026-08-17 by `product_owner` and `accounting_owner`:

- Taiwan is the first launch region and TWD is the launch currency.
- Pro is `NT$199/month` or `NT$1,990/year`.
- Team is `NT$499/month` or `NT$4,990/year`.
- The purchase UI must display the localized, tax-inclusive price and billing period returned by Apple App Store or Google Play. Product code must not calculate or hardcode the final charge shown at checkout.

The machine statuses `commercial.pro` and `commercial.team` are therefore `approved`. This approves the policy only; it does not authorize store catalog creation, native billing implementation, or a charge.

### 2.1.2 Step 1B launch promotion code approved record

Product direction received on 2026-08-17: provide a launch promotion code that can discount both monthly and annual subscriptions by 50%. The cross-store design is documented in
`docs/subscription/NATIVE_LAUNCH_PROMOTION_CODE_DESIGN_2026_08_17.md`.

Approved on 2026-08-17 by `product_owner` and `accounting_owner`:

| Item ID | Approved policy | Approval |
| --- | --- | --- |
| `commercial.launch-promo` | Place a collapsed “有優惠碼？” entry beside the selected plan and before the purchase CTA. Eligible Taiwan new subscribers receive the nearest supported 50%-off store price for Pro or Team, monthly or annual. Pro may combine it with the approved 14-day trial; Team has no launch trial. While the verified store subscription remains uninterrupted, every renewal retains the applicable plan's launch price. Effective expiry, user cancellation followed by expiry, refund, chargeback, or a disqualifying plan change forfeits it. One redemption per owner/store account; no stacking with Founder or another discount | approved; scope clarified as Pro + Team on 2026-08-17 |
| `commercial.launch-promo-operations` | Public code `FERIA50`; starts when the native apps are publicly available; closes 90 calendar days later; no product-imposed redemption cap and no volume-based early stop. Store technical limits still apply, and an emergency abuse/security suspension is not a marketing early-stop rule | approved |
| `commercial.launch-promo-continuity` | Prove a store-supported launch-price cohort that cannot be acquired by ineligible users and preserves the price only through uninterrupted renewals, including restore, lapse, refund, chargeback, monthly/annual changes, and campaign closure | store review; pending sandbox evidence |

The machine statuses `commercial.launch-promo` and `commercial.launch-promo-operations` are therefore `approved`. The 90-day close is calculated from one canonical server-owned `publicLaunchAt` timestamp and stored in UTC; Taiwan-facing copy may display Asia/Taipei dates. “No cap” means Féria does not impose a campaign quota, not that storefront technical limits cease to exist. `FERIA50` is public campaign input, not a secret or sufficient proof of eligibility.

Product clarified on 2026-08-17 that `FERIA50` applies to both Pro and Team monthly/annual subscriptions. Pro retains the 14-day trial behavior; Team enters the launch-price cohort only after a verified successful first charge. Cross-plan continuity is decided separately in the upgrade/downgrade policy.

Apple and Google discount offer phases are time-bounded and return to the standard base price. They cannot by themselves fulfill the newly approved uninterrupted-price promise. A candidate implementation therefore needs a dedicated store price cohort or equivalent store-supported catalog topology. `commercial.launch-promo-continuity` remains unchecked until both sandboxes prove that topology. Public copy and runtime activation remain blocked until then.

### 2.1.3 Step 1C trial approved record

Approved on 2026-08-17 by `product_owner` and `accounting_owner`:

| Item ID | Approved policy | Approval |
| --- | --- | --- |
| `commercial.trial` | Pro monthly and Pro annual each offer a 14-day free trial to an eligible new owner/store account. Team has no launch trial. The trial may be combined with `FERIA50`: no charge occurs during the 14 days, and the first successful renewal after trial uses the store-returned launch price. Trial eligibility is one-time per eligible Féria owner and store account | approved |
| `commercial.trial-sandbox` | Prove eligibility, 14-day duration, monthly/annual paths, `FERIA50` stacking, cancellation with no first charge, restore before expiry, expiry, and repeat-trial denial | store review; pending sandbox evidence |

Users may turn off renewal at any point during the 14-day trial. Entitlement continues only until the verified store expiry time, and no first renewal charge should occur. If the trial expires, the subscription and launch-price continuity are interrupted. Re-enabling renewal before verified expiry does not create a new trial and does not by itself interrupt continuity. Féria must use verified Apple/Google state, not a client timer, to decide access, charge transition, and launch-price retention.

### 2.1.4 Step 1D Apple Billing Grace Period approved record

Approved on 2026-08-17 by `product_owner`:

| Item ID | Approved policy | Approval |
| --- | --- | --- |
| `commercial.apple-grace` | Enable Apple Billing Grace Period app-wide for 16 days. Verified grace preserves paid entitlement and `FERIA50` continuity. Recovery within verified grace preserves the subscription and launch price. Verified expiry or revocation downgrades to Free and forfeits the launch price. The app shows a payment-warning state and Apple subscription/payment-management entry, and never extends access from a client timer | product policy approved |
| `commercial.apple-grace-support` | Approve payment-failure wording, management-link routing, escalation ownership, covered hours, and support runbook | approved by `support_owner` on 2026-08-17; launch evidence pending separately |

This policy approval does not configure App Store Connect. Console configuration, StoreKit state handling, notification behavior, and sandbox recovery/expiry evidence remain part of the later gated native implementation. Step 1K later approved the support-policy subitem; launch evidence remains separate.

### 2.1.5 Step 1E Google grace and account hold approved record

Approved on 2026-08-17 by `product_owner`:

| Item ID | Approved policy | Approval |
| --- | --- | --- |
| `commercial.google-grace` | Configure Google grace for 7 days. Verified grace preserves paid entitlement and `FERIA50`. During verified account hold, paid entitlement is paused but launch-price eligibility remains reserved while Play still reports the subscription recoverable. Verified recovery restores entitlement and the launch price. Verified `EXPIRED` or `REVOKED` downgrades to Free and forfeits the launch price. Account-hold duration is read from Play state and never hardcoded | product policy approved |
| `commercial.google-grace-support` | Approve payment-failure/account-hold wording, Google Play management-link routing, escalation ownership, covered hours, and support runbook | approved by `support_owner` on 2026-08-17; launch evidence pending separately |

The app must distinguish entitlement from price continuity: account hold removes paid access, but does not by itself migrate a still-recoverable subscriber out of the launch cohort. Only verified recovery restores access. This policy approval does not configure Play Console, RTDN, Developer API access, or runtime behavior. Step 1K later approved the support-policy subitem; launch evidence remains separate.

### 2.1.6 Step 1F Pro to Team upgrade approved record

Approved on 2026-08-17 by `product_owner` and `accounting_owner`:

| Item ID | Approved policy | Approval |
| --- | --- | --- |
| `commercial.upgrade` | Pro → Team becomes effective immediately only after the active store confirms subscription replacement and payment. Apple/Google owns proration and unused-value handling; the client never calculates a charge. An active `FERIA50` subscriber moves to the corresponding Team monthly/annual launch price without a verified lapse; a standard subscriber uses the standard Team price. Upgrading during the 14-day Pro trial requires explicit immediate-charge confirmation, ends the Pro trial, and starts paid Team without a second trial. Failed, canceled, pending, or unverified replacement leaves Pro unchanged. Team features, seats, and roles open only after server verification | approved |

The purchase confirmation must show the current store-returned charge timing, price, billing period, unused-value treatment when supplied, and loss of the remaining Pro trial when applicable. Founder behavior is not approved here and remains tracked by `commercial.founder-transition`.

### 2.1.7 Step 1G Team to Pro downgrade approved record

Approved on 2026-08-17 by `product_owner` and `accounting_owner`:

| Item ID | Approved policy | Approval |
| --- | --- | --- |
| `commercial.downgrade` | Team → Pro takes effect at the next verified renewal boundary with no immediate refund. Full Team entitlement remains until that boundary. An active `FERIA50` subscriber moves to the corresponding Pro monthly/annual launch-price cohort without a verified lapse; a standard subscriber uses the standard Pro price. No new 14-day trial is granted. Staff relationships, operational history, and invitation records are preserved, while Team-only staff access, active invitations, seats, and writes are suspended when downgrade becomes effective. Re-upgrade may restore the preserved relationships. A canceled, failed, pending, or unverified change leaves Team unchanged | approved |
| `commercial.downgrade-support` | Approve downgrade notices, staff-access explanation, escalation ownership, and the re-upgrade/restore runbook | approved by `support_owner` on 2026-08-17; launch evidence pending separately |

The app must show the effective renewal boundary and resulting store-returned Pro renewal price before confirmation. Downgrade must not delete staff-owned identity or owner operational facts. Founder behavior is not approved here and remains tracked by `commercial.founder-transition`.

### 2.1.8 Step 1H cancellation and expiry approved record

Approved on 2026-08-17 by `product_owner` and `accounting_owner`:

| Item ID | Approved policy | Approval |
| --- | --- | --- |
| `commercial.cancel-expiry` | User cancellation turns off renewal but retains entitlement until the verified paid or trial expiry. Restoring renewal before that expiry preserves `FERIA50`; verified effective expiry forfeits it. Resubscription after expiry uses the then-current public standard price and cannot reuse the consumed launch code. A verified full refund, chargeback, or revocation removes paid entitlement and forfeits the launch price. Cancellation/expiry never deletes the workspace: readable data remains, new paid-only writes are blocked, and Team staff access is suspended while staff relationships and operational history remain. Store/server state, not a client date, controls every transition | approved |
| `commercial.cancel-expiry-support` | Approve cancellation, expiry, refund and revocation wording; appeal and mistaken-revocation recovery; escalation ownership and covered hours | approved by `support_owner` on 2026-08-17; launch evidence pending separately |

The user-facing state must distinguish “renewal turned off but still active” from “expired.” Destructive account deletion is a separate explicit flow and must never be triggered by subscription cancellation, refund, chargeback, or expiry.

### 2.1.9 Step 1I price-version policy approved record

Approved on 2026-08-17 by `product_owner` and `accounting_owner`:

| Item ID | Approved policy | Approval |
| --- | --- | --- |
| `commercial.price-change` | New public prices apply to new subscribers. Existing standard subscribers preserve their current store price by default. `FERIA50` subscribers preserve the fixed launch-cohort price originally acquired for the applicable Pro/Team monthly/annual plan; it is not recalculated as 50% of a future public price. A verified uninterrupted crossgrade uses the fixed corresponding launch cohort approved by Steps 1F/1G. Ending a legacy/launch cohort, migrating existing subscribers, or applying a later price decrease to existing cohorts requires a separate dated product/accounting decision and the Apple/Google notice, consent, refusal, and failure behavior then in force. The client never computes a migrated charge | approved |

If a subscriber does not accept a store-required increase or renewal fails, Féria follows verified store state: access remains only through the verified entitlement period, then the cancellation/expiry policy applies. This approval creates no scheduled price change and authorizes no console mutation.

Apple currently offers 3, 16, or 28-day app-wide grace choices. Google’s current default account hold is automatically calculated and initially equals 60 days minus configured grace; runtime must query verified store state rather than hardcode that duration.

### 2.2 Step 1J Founder first-release deferral approved record

Approved on 2026-08-17 by `product_owner`; price/catalog non-activation also acknowledged by `accounting_owner` through the dated commercial record:

| Item ID | First-release decision | Status |
| --- | --- | --- |
| `commercial.founder-price` | Do not create or publish the `NT$1,290/year` Founder product | `not_applicable` |
| `commercial.founder-eligibility` | Do not enroll owners or evaluate Founder eligibility | `not_applicable` |
| `commercial.founder-continuity` | No first-release Founder subscription exists, so continuity rules do not run | `not_applicable` |
| `commercial.founder-transition` | Founder does not participate in first-release Pro/Team crossgrades or restore | `not_applicable` |
| `commercial.founder-mechanism` | Explicitly defer Founder; launch standard Pro/Team and `FERIA50` only | approved |
| `commercial.founder-sandbox` | No first-release Founder acquisition path exists to test | `not_applicable` |

Founder is economically redundant during the 90-day `FERIA50` campaign: the proposed annual Founder amount is higher than the launch-code price while requiring a second permanent-price mechanism. The deferral prevents contradictory public copy and catalog complexity. It does not delete the design history. Any future Founder release must reopen all five `not_applicable` items, define a differentiated benefit, receive fresh product/accounting/support approval, and pass Apple and Google sandbox evidence before public copy or acquisition runtime.

### 2.3 Step 1K subscription support policy approved record

Approved on 2026-08-17 by `support_owner` using
`docs/subscription/NATIVE_SUBSCRIPTION_SUPPORT_RUNBOOK_2026_08_17.md`:

- proposed staffed hours: Taiwan business days, 09:00–18:00 Asia/Taipei;
- billing/cancellation first response: one business day;
- credible continuing-charge risk: same-business-day escalation during staffed hours;
- Apple grace, Google grace/account hold, downgrade, cancellation, expiry and revocation message intent approved;
- entitlement and mistaken-revocation recovery require verified store/server state;
- screenshots, client timers, local cache and raw promotion codes cannot authorize entitlement changes.

This approval closes the four commercial support-policy items. Public mailbox, backup responder, tested management links, synthetic cases, final UI copy review, release SHA, and repository-safe evidence remain separate launch checks.

## 3. Step 2 — Account Deletion And Retention

### 3.1 Deletion behavior proposal

| Item ID | AI proposal | Required human approval |
| --- | --- | --- |
| `deletion.timing` | Offer immediate deletion after recent reauthentication and explicit pending-write resolution. Do not require a waiting period. A future optional scheduled-at-expiry choice may coexist only if immediate deletion remains available. Active store billing does not block deletion and cleanup failure never reports false completion | product approved; legal/privacy pending separately |
| `deletion.staff-history` | Staff self-deletion removes identity/relationship access and irreversibly anonymizes actor references while retaining non-identifying owner operational facts | product approved; legal/privacy/security review pending separately |
| `deletion.billing-identity` | Detach retained billing/accounting evidence to a restricted pseudonymous billing subject before deleting `profiles.id`; never retain email merely as a join key | product/accounting approved; legal/privacy/security review pending separately |
| `deletion.active-store` | Warn that deleting Féria does not cancel Apple/Google billing; provide store management links; allow immediate Féria deletion; later restore requires one-owner anti-replay verification and never restores deleted workspace data | product/support approved; legal/privacy/security review pending separately |
| `deletion.third-party-data` | Owner workspace deletion removes/anonymizes workspace-controlled third-party data; staff self-deletion must not delete the owner workspace or other people’s accounts | product approved; legal/privacy/security review pending separately |
| `deletion.support` | Failed cleanup remains `failed_retryable` or `manual_review`, never falsely `completed`; expose safe request status and appeal without requesting secrets | product/support approved; legal/privacy/security review pending separately |

Apple requires apps that support account creation to offer account deletion and says an active subscription may be handled with a later scheduled option only when immediate deletion also remains available. Google requires both an in-app deletion path and an external Web resource, and temporary freezing does not qualify as deletion.

### 3.1.1 Step 2A deletion timing approved record

Approved on 2026-08-17 by `product_owner`:

| Item ID | Approved policy | Approval |
| --- | --- | --- |
| `deletion.timing` | After recent reauthentication, the user may request immediate deletion without a mandatory waiting or withdrawal period. Before submission, every discoverable local pending write must be shown and resolved by sync, an available safe export path, or explicit informed discard; no silent discard is allowed. Active Apple/Google billing does not block Féria deletion, and the UI states that account deletion does not cancel the store subscription and provides store-management access. An optional delete-at-subscription-expiry choice may be added only alongside immediate deletion. Cleanup failure remains `failed_retryable` or `manual_review`, never `completed`; deletion cannot be implemented as a freeze or sign-out | product policy approved |
| `deletion.timing-legal` | Approve immediate timing, pending-write choice, active-store disclosure, optional scheduled path, and legally necessary retention exceptions | approved by `legal_privacy_owner` on 2026-08-17 |

This product approval authorizes no destructive migration, route, worker, object deletion, auth-user deletion, or Production operation. Legal/privacy approval and the remaining data-class decisions are still required before runtime review.

### 3.1.2 Step 2D staff and third-party data approved record

Approved on 2026-08-17 by `product_owner`:

| Item ID | Approved policy | Approval |
| --- | --- | --- |
| `deletion.staff-history` | Staff self-deletion removes the staff identity, login, roles, pending invitations, and workspace relationships without deleting the owner workspace or another account. Owner-owned sales, events, and operational facts may remain, but actor attribution becomes an irreversible “deleted member” representation with no email, name, `profiles.id`, or reversible lookup. An owner removing staff is relationship revocation, not deletion of that person's Féria account | product policy approved |
| `deletion.third-party-data` | Owner workspace deletion removes or irreversibly anonymizes workspace-controlled staff/third-party data and clears shared photos/objects according to the approved object-retention policy. Staff self-deletion may retain staff-created content only where it is an owner operational fact and only with irreversible attribution anonymization | product policy approved |
| `deletion.staff-third-party-legal` | Approve controller/ownership boundaries, third-party rights, shared-object treatment, appeal, and retained-fact boundary | approved by `legal_privacy_owner` on 2026-08-17 |
| `deletion.staff-third-party-review` | Approve exact anonymized fields/algorithm, absence of reidentification lookup, linkage resistance, and evidence | approved by `security_owner` on 2026-08-17; implementation evidence remains |

No anonymization mapping may be retained if it can restore the deleted identity. Runtime design must prove owner and staff paths separately and fail closed rather than cascading one person's request into another person's account or workspace.

### 3.1.3 Step 2E active-store deletion and support approved record

Approved on 2026-08-17 by `product_owner` and `support_owner`:

| Item ID | Approved policy | Approval |
| --- | --- | --- |
| `deletion.active-store` | An active Apple/Google subscription does not block immediate Féria deletion. Confirmation explicitly states that deletion does not cancel storefront charging and provides the originating-store management path; canceling renewal is optional. After deletion, Féria service remains unavailable until the user creates a new account and completes verified purchase restore. Deleted workspace/operational data never returns. An uninterrupted store subscription may retain its store-owned `FERIA50` price and bind to one new Féria owner only after the backend proves the prior binding is deleted/released, the purchase is not bound elsewhere, and anti-replay checks pass | product/support policy approved |
| `deletion.support` | Cleanup failure remains `failed_retryable` or `manual_review`. The user receives a safe opaque request ID, current state, next-action timing, and appeal route. Support never requests a password, raw receipt, or purchase token and never grants entitlement from screenshots. Completion is sent only after all required cleanup steps succeed; entitlement correction requires fresh verified store/server evidence | product/support policy approved |
| `deletion.active-store-support-legal` | Approve active-billing disclosure, restore/data boundary, launch-price disclosure, request status, appeal, and evidence requirements | approved by `legal_privacy_owner` on 2026-08-17 |
| `deletion.active-store-support-review` | Approve prior-binding release, single-owner enforcement, anti-replay/race, request evidence security, and fraud/error recovery | approved by `security_owner` on 2026-08-17; implementation evidence remains |

Restore is a purchase-entitlement operation, not data recovery. A newly created account cannot recover deleted workspace content from billing evidence, backups, or a former owner identifier.

### 3.2 Proposed retention table

These are conservative engineering ceilings pending Taiwan legal/accounting review:

| Data class | On verified deletion | Proposed maximum | Review note |
| --- | --- | ---: | --- |
| Auth identity, profile, contact, workspace settings | disable access immediately; delete from primary systems | 30 days | backup purge separately bounded |
| Owner markets, products, sales, events, notes, checklist | delete with workspace, except legally required accounting evidence | 30 days | do not treat user operational data as Féria accounting books by default |
| Staff relationships and invitations | revoke immediately; delete or anonymize | 30 days | owner facts may retain anonymous actor label |
| Audit/security logs | restrict and pseudonymize where possible | 180 days | extend only for an active incident/legal hold |
| Support cases | remove unnecessary account identifiers; retain bounded case evidence | 2 years proposed | legal/support approval required |
| Product-cover R2 objects and metadata | delete and prove absence | 30 days | do not wait for ordinary replacement lifecycle |
| Sales-photo R2 objects | delete and prove absence | earlier of current 7-day lifecycle or deletion cleanup | metadata history must not retain object access |
| Price assignments and subscription state | detach from profile; retain only necessary commercial evidence | 5 years proposed | exact classification requires accounting review |
| Accounting ledger/book records | restricted pseudonymous retention | 10 years where legally classified as books | Taiwan Ministry of Finance guidance distinguishes 10-year books and 5-year vouchers |
| Store transaction/refund evidence | restricted, minimized, no raw receipt/token in general logs | 5 years proposed | unresolved disputes/legal holds may require longer |
| Device cache and pending writes | user resolves sync/discard before request; clear device cache after completion | immediate on controlled device | remote service cannot promise deletion from inaccessible devices |
| Backups | encrypted, access restricted, no routine restore of deleted identity | 90 days proposed | corrective-forward deletion reapplied after disaster restore |

### 3.2.1 Step 2B operational retention ceilings approved record

Approved on 2026-08-17 by `product_owner`:

| Item ID | Approved product/engineering ceiling | Approval |
| --- | --- | --- |
| `deletion.retention` | Disable account access immediately. Delete auth identity, profile, contact, workspace settings, owner operational data, and staff relationship/invitation identity from primary systems within 30 days, using irreversible anonymization only where owner operational meaning must remain. Delete and prove absence of product-cover objects within 30 days and sales-photo objects by the earlier of their existing seven-day lifecycle or deletion cleanup. Clear cache on the controlled device after completion; do not promise remote erasure from inaccessible devices. Restrict encrypted backups and purge within 90 days, and reapply corrective-forward deletion after disaster restore. Any legal hold is scoped to necessary data classes and duration, not the entire account | product/engineering policy approved |
| `deletion.retention-legal` | Approve legal bases, exact periods, backup treatment, legal-hold boundaries, processor propagation, and the completed table | approved by `legal_privacy_owner` on 2026-08-17; pre-runtime evidence remains |

Ordinary markets, products, sales, events, notes, and checklists are not classified as Féria accounting books merely because they contain business data. A legally required accounting subset must be minimized and detached from the profile under the later billing-identity decision; it cannot justify retaining the whole workspace.

### 3.2.2 Step 2C regulated-record engineering classification approved record

Approved on 2026-08-17 by `product_owner`, `accounting_owner`, and `support_owner`:

| Item ID | Approved engineering classification | Approval |
| --- | --- | --- |
| `deletion.retention-regulated` | Audit/security logs: 180 days, extended only for a scoped active incident or legal hold. Minimized support cases: 2 years. Detached price assignments, subscription state, and store transaction/refund evidence: 5 years. Only records legally classified as Féria accounting books use 10 years, and only legally classified vouchers use 5 years; unresolved accounting matters follow the legally required exception. Raw receipts and purchase tokens never enter general logs. When a period ends, automatic deletion or irreversible anonymization is required | product/accounting/support engineering policy approved |
| `deletion.retention-security` | Approve audit scope, pseudonymization, restricted access, evidence integrity, incident/legal-hold extension, and purge verification | approved by `security_owner` on 2026-08-17; implementation evidence remains |
| `deletion.billing-identity` | Before deleting `profiles.id`, minimize and detach legally necessary billing/subscription evidence to a restricted pseudonymous billing subject. Email and `profiles.id` cannot remain retained join keys, and ordinary workspace data is not retained as accounting evidence | product/accounting direction approved |
| `deletion.billing-identity-legal` | Approve legal bases, minimized fields, erasure boundary, and data-subject behavior | approved by `legal_privacy_owner` on 2026-08-17 |
| `deletion.billing-identity-review` | Approve pseudonymous key design, access controls, encryption, audit, and reidentification prevention | approved by `security_owner` on 2026-08-17; implementation evidence remains |

The 10-year/5-year periods are classification-dependent minimums for actual books/vouchers, not a blanket retention rule for every subscription or customer record. Legal/privacy approved this policy table subject to exact schema/record classification evidence before destructive runtime review.

### 3.2.3 Step 2F legal/privacy review approved record

Approved on 2026-08-17 by `legal_privacy_owner` using
`docs/subscription/ACCOUNT_DELETION_LEGAL_SECURITY_REVIEW_PACKET_2026_08_17.md`:

- immediate deletion timing, pending-write choice, active-store disclosure, and scoped retention exceptions;
- legal bases and exact policy retention table, including backups, holds, and processor propagation requirements;
- billing-subject minimization, erasure boundary, and prohibition on retained email/`profiles.id` join keys;
- staff/third-party controller boundaries, retained owner-fact boundary, shared-object treatment, appeal, and irreversible deleted-member outcome;
- active-billing disclosure, restore/data boundary, launch-price disclosure, request status, appeal, and evidence requirements.

The policy item `deletion.retention-table` is approved by product, accounting, support, and legal/privacy. This does not satisfy exact schema/processor evidence, threat modeling, synthetic fixtures, destructive runtime review, future law/store-policy recheck, or Production approval.

### 3.2.4 Step 2G security review approved record

Approved on 2026-08-17 by `security_owner` using
`docs/subscription/ACCOUNT_DELETION_LEGAL_SECURITY_REVIEW_PACKET_2026_08_17.md`:

- audit scope, pseudonymization, restricted access, evidence integrity, scoped incident/legal-hold extension, and purge verification;
- pseudonymous billing-subject key design, access controls, encryption, audit, and prevention of retained reidentification joins;
- irreversible staff/third-party anonymization fields and algorithm, linkage resistance, and absence of a recovery lookup;
- prior-binding release, single-owner enforcement, restore anti-replay/race controls, request-evidence protection, and fraud/error recovery.

With the earlier product, accounting, support, and legal/privacy approvals, the dated
cross-role account-deletion policy approval is complete. This closes
`ACCOUNT-DELETION-POLICY` only. It does not authorize migrations, destructive tests,
external-account changes, non-Production deployment, Production deletion, or public
legal publication; implementation and test evidence remain under
`ACCOUNT-DELETION-RUNTIME` and the `ACCOUNT-DELETION` native gate.

The Taiwan Personal Data Protection Act gives data subjects deletion rights and requires deletion/cessation when the collection purpose disappears or the period expires, subject to a necessary business/legal exception. It also gives a 30-day decision period for Article 11 requests, extendable once by up to 30 days with written reasons; that is a response decision deadline, not permission to retain every data class for 30 days.

## 4. Step 3 — Legal, Privacy, Subscription And Support

### 4.1 Facts AI cannot supply

The following must be provided without placing private identity documents in Git:

- legal operator name and entity type;
- representative’s public legal name;
- lawful public business address;
- governing law and proposed first-instance court;
- public support mailbox;
- primary and backup responder roles;
- Taiwan legal reviewer and accounting reviewer roles;
- final observability provider and its region/retention settings.

### 4.2 Legal/privacy draft boundaries

| Item ID | AI-prepared position | Required human approval |
| --- | --- | --- |
| `legal.privacy` | Notice must identify operator, purpose, data categories, period, region, recipients/processors, methods, rights and effect of not providing data | legal/privacy |
| `legal.subprocessors` | Disclose Supabase, Vercel, Cloudflare, and later observability provider according to verified deployment regions/DPA/deletion behavior; do not guess regions | legal/privacy + security |
| `legal.deletion` | Publish immediate request path, reauthentication, pending-write handling, retained-data categories/periods, backup purge, completion evidence and appeal | legal/privacy + support |
| `legal.subscription` | Show store-returned price/currency/period, trial phases, automatic renewal, cancellation management, effective time, refund route, tax/invoice responsibility and disputes | legal + accounting + product |
| `legal.withdrawal-right` | Do not claim the Taiwan seven-day right is excluded unless counsel confirms the actual recurring SaaS service meets an exception and the required advance disclosure/consent | Taiwan legal reviewer |
| `legal.security` | Define incident severity, owner notification, evidence preservation, regulator/legal escalation, support routing and drill ownership | security + legal/privacy + support |

### 4.3 Support SLA proposal

| Case | First response | Escalation target | Resolution/update rhythm |
| --- | ---: | ---: | --- |
| General product | 2 business days | 3 business days if blocked | update every 3 business days |
| Billing/cancellation/refund guidance | 1 business day | same business day for continuing-charge risk | daily update while open |
| Privacy/account deletion | 3 business days | legal/privacy within 5 business days | formal decision within applicable legal deadline |
| Critical security/privacy incident | 4 hours during covered hours | security + legal + operator immediately | at least daily, more often while active |

The SLA is not complete until a public mailbox, primary/backup responders, a synthetic support case, and a non-Production incident drill are proven.

## 5. Official Sources Checked On 2026-08-17

- Taiwan Personal Data Protection Act: https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0050021
- Taiwan Consumer Protection Act Article 19: https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=J0170001&flno=19
- Executive Yuan communication-transaction exceptions: https://cpc.ey.gov.tw/Upload/RelFile/2022/732504/dab37c8d-df9d-4fe1-ad73-4ef34bbf8a64.pdf
- Ministry of Finance accounting retention guidance: https://www.etax.nat.gov.tw/etwmain/tax-info/understanding/tax-q-and-a/national/profit-seeking-enterprise-income-tax/imputation-credit-account/GA8Rb37
- Apple Billing Grace Period: https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions
- Apple subscription pricing: https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions/
- Apple account deletion: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Google subscriptions and recovery: https://support.google.com/googleplay/android-developer/answer/12154973
- Apple subscription offer codes: https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes/
- Google Play promo codes: https://developer.android.com/google/play/billing/promo
- Google Play subscription offers: https://support.google.com/googleplay/android-developer/answer/12154973
- Google Play Billing integration: https://developer.android.com/google/play/billing/integrate
- Google Play subscription lifecycle and trial cancellation: https://developer.android.com/google/play/billing/subscriptions
- Google Play verified cancellation/expiry state: https://developer.android.com/google/play/billing/lifecycle/subscriptions
- Apple subscription pricing and introductory-offer eligibility: https://developer.apple.com/help/app-store-connect/reference/pricing-and-availability/in-app-purchase-and-subscriptions-pricing-and-availability
- Google account deletion: https://support.google.com/googleplay/android-developer/answer/13327111

## 6. Approval Sequence

1. Product owner answers Step 1 commercial choices.
2. AI records approved/rejected decisions and regenerates the Checklist.
3. Product, legal/privacy, security, support and accounting review Step 2.
4. Legal operator/support facts are supplied and Step 3 receives role-specific approvals.
5. AI verifies every Session 1 item. Only then may the three parent tasks be considered for canonical `complete` status.
