# Native reconciliation foundation source review

Date: 2026-10-20

Reviewer: Codex technical review under the user's authorization to continue work
that can be completed on Windows. This accepts a bounded repository-only source
slice, not live billing, a remote migration, a native SDK or a release.

## Accepted scope before implementation

Implement shared deterministic reconciliation decisions and a server-only service
that verifies purchase input, queries the current subscription, and uses an injected
atomic repository boundary. Exercise that boundary with synthetic in-memory state.
The service derives its owner/environment/binding context from a trusted server
dependency; client input uses the existing exact-key verification request parser.

The repository contract must require owner serialization, cross-owner provider
reference uniqueness, and atomic decision/snapshot/projection commit or rollback.
No concrete Supabase writer, RPC, migration, endpoint, provider SDK, notification
receiver, secret, runtime activation or existing capability-reader change is part
of this slice. In-memory transaction tests cannot prove database isolation.

## Decision constraints

- Check owner, store, environment, account match, current-state freshness, bounded
  references, exact active mapping and active immutable internal price version.
- Reject untrusted/malformed input, mismatched context and cross-owner references.
- Distinguish duplicate, stale, equal-time conflicting and winning snapshots.
- Preserve exact-query replay protection while allowing a newly observed restore
  to rebuild a missing Free projection; match the existing inclusive period end.
- Only propose billing-owned projections; preserve admin/promotion projections.
- Retain verified access and require review on overlapping active subscriptions;
  never cancel/refund or choose a winning store automatically.
- Apply only established active, cancel-at-period-end, cancelled/refunded and
  period-expiry semantics. Trial, past-due/grace and disputed outcomes require
  commercial policy review; this slice must not invent their access rules.
- No synthetic IAP client result is accepted as server evidence. The service must
  call the trusted verification adapter and authoritative current-state query.
- Return fixed safe result codes; do not return/log receipts, bindings, owners or
  provider references. Only the private repository receives normalized state.

## Platform boundary and verification

Decision logic stays platform-neutral. Server-only orchestration may use Node's
SHA-256 for a deterministic private reconciliation key, but no browser/Capacitor
API or shared UI imports it. Device purchase adapters remain separately gated.

Required source tests: request denial, verification/query failure, altered current
products, mapping/environment/owner mismatch, candidate prices, lifecycle rules,
duplicates/replays, stale/conflicting snapshots, duplicate origins, protected
projections, concurrent requests, rollback and safe errors. Run mobile types and
the shared regression manifest. Keep the actual writer and release gates open.
