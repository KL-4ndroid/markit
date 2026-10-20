# Native reconciliation foundation evidence

Date: 2026-10-20 (Asia/Taipei)

## Completed Windows source slice

The shared reconciliation decision module and private server orchestration are
implemented. Scope/review: `NATIVE_RECONCILIATION_FOUNDATION_REVIEW_2026_10_20.md`.

`native-reconciliation-decision.ts` checks normalized trusted adapter snapshots,
owner/environment/reference ownership, exact active store mappings, canonical
immutable price metadata, current-state freshness and snapshot ordering. It
proposes only billing projections, preserves admin/promotion, and holds overlapping
subscriptions or policy-dependent states for review. Active/cancel-at-period-end
access follows the existing shared inclusive end-time boundary; cancelled/refunded
state is inactive. Trial/past-due/grace/dispute policy is not invented or enabled.

`native-reconciliation.server.ts` accepts the existing exact-key client evidence
request, obtains context from a trusted owner-authentication dependency, calls the
verification adapter, then queries authoritative current subscription state. A
current product can differ from the original receipt product; only current mapping
is considered. Both read-only provider operations have bounded deadlines, without
automatic retries or late-result writes. Final freshness is checked again after
waiting for the transaction lock.

The injected repository contract requires owner serialization, global provider
binding uniqueness, and atomic audit/snapshot/billing-projection commit or rollback.
Review decisions can receive a corrective-forward resolution under the same key;
repeated unchanged holds do not duplicate audit decisions. Only an applied
projection is terminal for an exact query snapshot. The key includes authoritative
query-observation time, so a fresh restore may rebuild a missing Free projection
even when the underlying subscription hash is unchanged. Adapters must stamp the
time of their authoritative current query; an old receipt timestamp is not fresh
query evidence. All outward results contain fixed outcome/code fields.

## Behavioral evidence

`tests/native-reconciliation-foundation.test.ts` passes with synthetic snapshots
and an isolated in-memory transaction repository:

- extra client fields and missing authentication are rejected before verification;
- malformed/foreign-owner/foreign-environment snapshots and provider references
  are rejected; no raw payload is accepted as a normalized server result;
- candidate/inactive/wrong-product/wrong-offer/future-effective/altered immutable
  mappings cannot propose paid access;
- Apple and Google share decision logic without native/browser dependencies;
- established lifecycle states, exact period boundary and conservative unknown
  policy handling are checked;
- eight concurrent identical requests produce one projection change;
- stale purchase delivery cannot overwrite a later refund;
- equal-time conflicting snapshots require review;
- admin/promotion projections and overlapping paid subscriptions are preserved;
- resolving a held subscription conflict permits a subsequent verified apply;
- failed apply rolls back audit and projection together in the memory fixture;
- a committed write with a lost response is safe to replay without another apply;
- fresh authoritative restore can rebuild a cleared projection from unchanged
  store state without weakening exact-query replay protection;
- lock wait cannot extend snapshot freshness;
- provider failure/deadline and late completion cannot trigger writes; errors do
  not expose private provider/database details.

## Validation and remaining work

Full regression manifest: PASS, 403 files, exit 0. Focused final restore/replay
checks, existing verification/entitlement/F3C contract checks, mobile TypeScript,
scoped ESLint, script syntax, workflow YAML, task graph and generated checklist:
PASS. Web and API-enabled mobile builds: PASS. Static boundary verification:
PASS (374 files / 19.51 MiB); HTTP smoke: PASS (11 routes/assets). The final
restore refinements were additionally checked with the focused behavior test and
mobile types; no application import or billing activation was added.

Local logs: `%TEMP%/feria-reconciliation-tests-20261020.log` and
`%TEMP%/feria-reconciliation-builds-20261020.log`. CI includes the new Windows
source check; no hosted CI result is inferred from editing YAML.
Local Node is 22.11.0; repository CI requires Node 24.

No provider SDK, Apple/Google query, endpoint, notification receiver, database RPC,
migration, grant, production repository, capability-reader change or account
mutation is installed. No mock result grants a real plan. Existing billing stays
disabled; this is the completed `NATIVE-RECONCILIATION-FOUNDATION` source task,
not completion of `ENTITLEMENT-WRITER-RUNTIME` or store verification.

Next integration needs concrete reviewed database schema/transaction/uniqueness
enforcement and real isolation tests, authoritative store verification/account
binding, approved product mappings/policy, notification handling, observability,
sandbox evidence and a separate protected-environment activation decision.
Memory rollback/concurrency tests are not evidence of Postgres isolation, real
transaction provenance, cryptographic verification or release readiness.
