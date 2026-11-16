# Account Deletion AD4 Preparation

Date: 2026-08-21

Status: preparation complete; AD4 execution and release evidence remain incomplete

2026-11-02 handler adoption: [local product/sales receipt integration](ACCOUNT_DELETION_PHOTO_HANDLER_RECEIPTS_2026_11_02.md)
passes sixteen grouped checks through existing handler factories, captured BFF SQL
and loopback S3. The new flag is off, requires the barrier and rejects deployed/
remote targets. Same-attempt compensation protects existing photos; unknown writes
remain held. Production target/migration/all-producer enforcement and safe same-photo
retry/readback remain incomplete. No cloud changes, commit/publish or deletion
enablement. The earlier statement that handlers have no integration is historical;
local integration does not complete AD4/Gate 2 or certify production readiness.

2026-11-02 terminal-PUT evidence: [five isolated and three real staging groups](ACCOUNT_DELETION_TERMINAL_PUT_2026_11_02.md)
add single-attempt SDK writes, durable intent/200 receipts, target binding and a
ledger-backed drain adapter checked again inside reconciliation commit. The single
staging marker is confirmed absent; unknown provider responses remain held. This
writer is restricted to disposable local/staging scope and is not adopted by the
product/sales handlers. All-producer adoption, production configuration/migration
and release evidence remain incomplete. No production SQL/Auth/config changes or
deletion enablement; Gate 2/AD4 remain closed.

2026-11-02 uncertain reconciliation: [local worker/SQL evidence](ACCOUNT_DELETION_UPLOAD_RECONCILIATION_2026_11_02.md)
adds scoped drain attestation contracts, metadata CAS, DB-clock checks and atomic
immutable receipts with exact-evidence retries. Ten new isolated SQL groups include
two-session review/expiry races and successful finalize with a lost response. The
drain attestor and object observations are fixtures, not provider proof; no production
adapter, migration, route, scheduler or auto-release is enabled. Real transport/provider
termination evidence and HTTP/R2 integration remain release blockers. Gate 2/AD4 stay closed.

2026-11-02 upload/freeze slice: [local barrier evidence](ACCOUNT_DELETION_UPLOAD_BARRIER_2026_11_02.md)
adds a private attempt ledger, serialized actor/owner freeze locks, per-PUT/finalize
authorization, fail-closed quiescence and retained old/new manifest keys. Eight
isolated SQL groups and actual handler scenarios pass. Unknown outcomes remain
held for review, with no automatic release or recovery endpoint. The gate is off,
loopback-only, and not deployed. Real HTTP/R2 integration, reviewed migration,
all-producer rollout and uncertain reconciliation remain incomplete; AD4/Gate 2
and productionUploadRaceClosed remain false. Earlier staging evidence is reused.

2026-11-02 live R2 staging slice: [8 real S3 groups](ACCOUNT_DELETION_R2_LIVE_STAGING_2026_11_02.md)
passed on three self-created disposable markers, all finally confirmed absent.
This adds real staging DELETE/HEAD/412/403 evidence with fixture lease/ack faults;
it does not certify the production adapter, in-flight server PUT quiescence,
backups or released cleanup. Runtime adapters still reject hosted endpoints.
The production real-R2/release blocker remains; no AD4/Gate 2 completion is implied.

2026-11-02 fourth slice: [captured access fences](ACCOUNT_DELETION_ACCESS_FENCE_2026_11_02.md)
classifies all 134 captured routines and preserves 5 view masks and 45 public-table
triggers. Exact actor/lease/step exceptions, pre-DECLARE guards, TRUNCATE restrictions
and private access-catalog attestation passed 19 access/operational and 16 billing
cases. These fences are not a production migration. Separately, snapshot privacy
repair 095 is deployed and metadata-verified; it performs no cleanup at installation.
Production API/service-table paths, managed Auth triggers, real R2/provider/vault,
reviewed migration/release evidence remain incomplete. AD4 stays ready=false (13
blockers), with no production deletion worker or enablement.

2026-11-02 third engine slice: [billing detachment/retention](ACCOUNT_DELETION_BILLING_ENGINE_2026_11_02.md)
adds subject-only minimized evidence, scoped original-ledger deletion, retired
bindings, reference clearances, key versioning, review/holds and DB-clock purge.
14 new isolated SQL scenarios and 7 operational regressions passed. This does not
clear the billing release blocker: real provider/processor evidence, ingress,
vault, all access fences and a reviewed production migration remain incomplete.

2026-11-02 second engine slice: [deployed catalog and operational coverage](ACCOUNT_DELETION_OPERATIONAL_COVERAGE_2026_11_02.md)
records 45 relations/134 routines from read-only production metadata, 40-table
isolated column/FK/check verification, two captured event guards, and the billing
minimization contract. Actual billing detachment/purge, all remaining RPC/view/
projection-trigger fencing and real R2 acceptance are still incomplete. Catalog
capture is evidence, not permission to enable deletion. Release blockers stay closed.

2026-11-02: [isolated deletion engine](ACCOUNT_DELETION_ENGINE_2026_11_02.md) adds real
PostgreSQL cleanup, durable receipts, lease fencing, Auth Admin deletion and bounded
S3 operations. Its draft rejects every database except the disposable test database;
its adapters reject hosted endpoints. This does not clear cleanup/billing/R2 release
blockers: deployed-schema coverage, retained billing subjects, real R2 inventory and
production access fencing remain incomplete. There is no runtime worker registration.

2026-11-01 bounded source update: [the request workflow slice](ACCOUNT_DELETION_REQUEST_WORKFLOW_2026_11_01.md)
adds local-only confirmation/cancellation routes and Settings UI. The scanner keeps
the authenticated-entry and confirm/cancel blockers: source presence and isolated
evidence do not certify a released deletion runtime. No remote migration, cleanup,
public deletion resource, store integration, or AD4/AD5 completion is implied.

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
