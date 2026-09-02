# Native Store Verification Contract

Date: 2026-08-06

Status: N3 contract complete locally; adapter runtime and writes pending approval

## Boundary

`lib/subscription/native-store-verification-contract.ts` defines the shared
request, trusted server context, verified snapshot, query, parser, bounds, and
adapter interface for Apple App Store and Google Play subscription evidence.

This contract does not add an API route, StoreKit/Play SDK, server notification
handler, provider query, database writer, entitlement mutation, or Production
configuration.

## Trust Split

The untrusted client request contains only:

```text
schemaVersion
store
productId
opaqueVerificationPayload
```

It cannot submit `ownerId`, email, plan code, entitlement status, price, billing
status, environment, or an active-origin decision. Authentication middleware must
derive `authenticatedOwnerId`; server configuration chooses the environment; a
server-owned binding service supplies `expectedAccountBindingToken`.

The adapter may return `verification: verified` only after all of these pass:

1. current Apple/Google cryptographic or authenticated API verification;
2. app/bundle/package and environment match;
3. verified product, base-plan, and offer identifiers map to one approved immutable
   internal price version; a client-selected purchase option never performs this mapping;
4. transaction and subscription identity are authoritative;
5. store account binding matches the authenticated Féria owner;
6. current store state is queried when notification or client evidence can be stale;
7. timestamps, status, auto-renew state, and snapshot hash are deterministic.

An unverified, unmatched, malformed, stale, unavailable, or unknown result never
becomes a `VerifiedNativeStoreSubscription`.

## Bounds And Logging

- product ID: 256 characters maximum;
- opaque verification payload: 65,536 characters maximum;
- expected account binding: 512 characters maximum;
- reject extra request fields and unknown schema versions;
- never log the opaque payload, account binding, adapter-local purchase option ID,
  Google offer token, full transaction/subscription reference, signed data,
  authorization header, owner ID, or email;
- general logs may contain only store, environment, operation, safe error code,
  latency bucket, retry count, correlation ID, and hash prefix.

`VerifiedNativeStoreSubscription` records the provider-observed `productId`,
`basePlanId`, and `offerId` plus the exact `mappedPriceVersionId`. Google requires
base-plan/offer identity to distinguish purchasable options under one subscription;
Apple offer identity is nullable for a standard product. These fields come from the
trusted adapter response, never from client entitlement claims.

## Future Runtime Gate

Before implementation, separately approve official Apple and Google libraries,
credentials, server endpoints, notification routes, replay/idempotency storage,
provider query behavior, mapping configuration, F3C entitlement writer, rollback,
observability, and sandbox evidence. `STORE-VERIFICATION` remains incomplete in
the Native launch matrix until both store runtimes pass those gates.
