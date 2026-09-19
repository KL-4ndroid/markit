# Account Deletion AD4 Preparation

Date: 2026-08-21

Status: preparation complete; AD4 execution and release evidence remain incomplete

## 1. Boundary

Step 2K authorizes repository-only AD4 preparation: blocker inventory, evidence matrix,
release-candidate template, and fail-closed readiness automation. It does not authorize
Capacitor installation, native project creation, store-account changes, public legal
publication, remote migration, runtime enablement, or Production deletion.

`npm.cmd run check:account-deletion:ad4-prep` reports current blockers. The reporting
command exits successfully so it can be used during preparation. Release automation must
use `npm.cmd run check:account-deletion:ad4-prep -- --require-ready`, which fails while any
blocker remains. Even after AD4 is ready, Production runtime remains disabled until AD5.

## 2. Current blockers

Capacitor Gate 2 was completed on 2026-08-24 and is no longer a current blocker.
The readiness model keeps its blocker ID so it will fail closed if the canonical Gate
regresses, but the current report must omit it.

| Blocker ID | Required exit evidence | Primary owner |
| --- | --- | --- |
| `native_projects_absent` | separately approved iOS and Android Capacitor projects | engineering |
| `native_store_adapters_absent` | reviewed platform adapters and server-authoritative entitlement integration | engineering + security |
| `public_deletion_resource_absent` | public HTTPS deletion resource reachable without app installation | product + legal/privacy |
| `authenticated_deletion_entry_absent` | easy-to-find Settings entry on the exact iOS/Android build | product + engineering |
| `confirmation_route_absent` | recent-reauth confirmation route and tests | engineering + security |
| `cancellation_route_absent` | safe cancellation route and tests | engineering + security |
| `cleanup_executor_absent` | idempotent real cleanup-step executor and failure recovery evidence | engineering + security |
| `billing_detachment_absent` | real paid-account billing identity detachment schema and lifecycle evidence | accounting + engineering + security |
| `real_r2_purge_absent` | real non-Production R2 purge and absence proof | engineering + security |
| `external_accounts_incomplete` | protected Apple/Google accounts and agreements completed in canonical inventory | account owners |
| `public_legal_support_incomplete` | published legal/deletion URLs, monitored mailbox, and release-bound smoke evidence | legal/privacy + support |
| `remote_migration_strategy_unapproved` | reviewed remote history/baseline strategy for the existing duplicate migration versions | database + security + release owner |
| `release_candidate_absent` | sanitized evidence JSON bound to exact commit, iOS build, and Android build | release owner + evidence reviewer |

The 2026-08-21 AD3A localhost run used synthetic identities, fake R2, and no billing
rows. It proves the local foundation, not paid-account detachment, real R2 deletion,
store behavior, remote migration safety, or release readiness.

## 3. Platform requirements refreshed for AD4

- Apple requires an easy-to-find in-app account-deletion initiation path. If deletion is
  completed on the web, the app may link directly to that page. The flow must explain
  that App Store subscriptions are managed separately and provide a cancellation path.
  Source: <https://developer.apple.com/support/offering-account-deletion-in-your-app/>.
- Google Play requires an in-app deletion path and a web resource where users can request
  deletion without reinstalling the app; the Data safety answers must match the actual
  flow. Source: <https://support.google.com/googleplay/android-developer/answer/13327111>.
- Store cancellation and entitlement expiry are distinct. The server must reconcile
  verified store state and must not infer entitlement loss only from a client action or
  local timer. Sources: <https://developer.android.com/google/play/billing/lifecycle> and
  <https://developer.android.com/google/play/billing/lifecycle/subscriptions>.

## 4. Execution order

1. **AD4A — prerequisite gates.** Gate 2 is complete. Approve a remote-safe migration
   strategy next; do not apply migration 071 remotely yet.
2. **AD4B — runtime gap closure.** In separately reviewed implementation slices, add
   confirm/cancel routes, rate limits, concrete cleanup executors, paid billing-subject
   detachment, real R2 purge, observability, retry/manual-review handling, and auth deletion
   last. Keep all runtime flags off by default.
3. **AD4C — user and public surfaces.** Add authenticated Settings initiation and the
   public HTTPS deletion resource using legally reviewed copy and store-management links.
4. **AD4D — native bootstrap.** Only after Gate 2 closes and a separate slice is approved,
   create native projects and store adapters behind `lib/platform`.
5. **AD4E — Apple sandbox/device evidence.** Exercise owner/staff and paid/unpaid deletion,
   active subscription disclosure, cancellation navigation, restore, retry, and reinstall.
6. **AD4F — Google sandbox/device evidence.** Repeat the matrix, including Play lifecycle
   reconciliation and the public web deletion resource.
7. **AD4G — release alignment.** Verify exact public policy/support URLs, Data safety/store
   declarations, monitored support escalation, and both exact release-candidate builds.
8. **AD4H — evidence freeze.** Fill the template without secrets, run `--require-ready`,
   obtain release/security/legal/support sign-off, and leave Production deployment to AD5.

## 5. Required release-candidate test matrix

Each row needs sanitized machine evidence and the exact release identifiers:

- owner and staff self-deletion; paid and unpaid accounts;
- unresolved local writes: explicit discard/sync/cancel with no silent data loss;
- active subscription: deletion remains available, billing warning and management link work;
- subscription cancellation: entitlement remains until verified expiry where applicable;
- restore: entitlement may return, but deleted workspace objects never return;
- anonymous, cross-owner, replay, expired reauth, duplicate confirmation, and lease race;
- partial cleanup: no false completion, bounded retry, and visible manual-review escalation;
- offline/reconnect, app reinstall, and public web request path;
- public policy, support mailbox, Apple build, Android build, and commit all match.

Never store passwords, session tokens, raw receipts, purchase tokens, complete email
addresses, full account IDs, or raw object keys in evidence.
