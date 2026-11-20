# B04 implementation review

2026-11-20; user explicitly requested B04 under the Windows execution plan.
Accepted by Codex for local source and disposable-database integration only.
This extends the October foundation review; it does not approve Production writes,
remote SQL, store products, checkout or native SDK installation.

## Reviewed design before implementation

- Reuse the exact-key purchase contract and reconciliation orchestration/decisions.
  Add a concrete PostgreSQL transaction repository with owner and provider locks,
  immutable account binding, globally unique provider chains, append-only decisions,
  and atomic existing F3B ledger / subscription_accounts projection. Protect
  admin/promotion, preserve business data, and keep billing-disconnected readers.
- Add current immutable price versions for pro 59/month, 588/year and team
  249/month, 2490/year (existing project amountMinor convention: integer TWD).
  Preserve historical IDs/values; no automatic conversion or founder offer.
  Current actual App Store products remain unconfigured. Local fixtures explicitly
  activate synthetic mappings; missing/candidate mappings cannot grant access.
- A private DB repository may declare its immutable F3A price registry authoritative.
  Only this server dependency can opt into registered future version IDs; client
  input cannot select that policy. The old static contract remains the default.
  Test a future price version registered only in DB, with historical prices intact.
- Use Apple's official Node server library for certificate/JWS validation and
  authenticated current-status queries; never implement our own certificate trust.
  Production construction pins Apple roots, enables revocation checks, fixes
  environment and App identity, and requires appAppleId for Production.
  Tests may inject cryptographic fixtures through a separately named test port.
- Never grant from the client JWS alone. Verify it, bind appAccountToken to the
  authenticated owner, query current state, verify returned transaction/renewal,
  and validate matching chain, app, product, environment and account again.
- Notification verification precedes owner lookup. Persist minimal dedupe intent,
  query current state and use the same reconciliation path. A transient failure
  is retryable; a completed notification is deduplicated. Equal-time conflicts,
  other active origins and unresolved commercial policy require review.
- Keep trial / grace / billing retry / disputed policy held. No invented free
  grace extension, cancellation, refund or account transfer. Expiry is evaluated
  from verified period end; cancelled renewal retains access until that end.
- Draft SQL is guarded for an explicitly named disposable local database. No
  client or general service-role grant to the private writer. A reviewed formal
  migration/read activation/deletion-fence update belongs to the remote release
  review after E02. Existing 096 drift gates must continue rejecting new tables.

## Platform and verification boundary

All changes are shared domain or server code. Node crypto, PostgreSQL and Apple
network/SDK access stay server-only; no browser or Capacitor dependency is added.
Concentrated tests must cover genuine signed fixtures, signature/app/environment/
account/product denial, expired proof vs current state, replay, owner races,
notification retry/out-of-order, rollback and role denial. Use real disposable
PostgreSQL and the actual HTTP handler functions, with a synthetic Apple API.
Do not describe synthetic signing roots/API responses as actual Apple sandbox.

Official references checked for this slice:
- https://github.com/apple/app-store-server-library-node
- https://apple.github.io/app-store-server-library-node/classes/SignedDataVerifier.html
- https://developer.apple.com/documentation/appstoreserverapi/get-all-subscription-statuses
- https://developer.apple.com/documentation/appstoreservernotifications/responding-to-app-store-server-notifications

Remote runtime and release remain gated. Commercial choices and actual Apple
identifiers/credentials are collected for E02/B05, not required to build the local
implementation or its rejection paths.
