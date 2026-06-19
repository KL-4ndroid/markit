# P5-4 Downgrade Safety Test Plan

Status: P5-4f test plan
Date: 2026-06-19

## Scope

This plan covers the downgrade-safety gates required before P5-5 operator interaction work.

P5-4 must protect these paths:
- role downgrade detection
- role cache invalidation and mounted-hook revalidation
- staff Dexie projection cleanup
- staff local write freshness gate

P5-4 does not enable new operator or manager UI write surfaces.

## Automated Coverage

### Role Downgrade Detection

Command:

```bash
npx tsx tests/p5-4a-downgrade-detection.test.ts
```

Coverage:
- operator to viewer is downgrade
- manager to viewer is downgrade
- manager to operator is downgrade
- viewer to operator / manager are upgrades
- downgrade triggers invalidation callback
- known role cache is updated after downgrade
- repeated poll after downgrade does not re-trigger

### Role Cache Invalidation Revalidation

Command:

```bash
npx tsx tests/p5-4b-role-cache-invalidation.test.ts
```

Coverage:
- `invalidateRoleCache()` clears `user_role_cache`
- `invalidateRoleCache()` dispatches `boothbook:role-cache-invalidated`
- mounted listeners receive invalidation
- unsubscribe cleanup works
- dispatch failure does not throw
- no storage event or BroadcastChannel is introduced
- no reload, deleteDatabase, or resetAuthenticatedCache is introduced
- async role revalidation has unmount and stale-user guards

### Dexie Staff Projection Cleanup

Command:

```bash
npx tsx tests/p5-4c-dexie-projection-cleanup.test.ts
```

Coverage:
- staff projection predicate accepts staff relationship rows
- owner rows are not treated as staff projections
- another owner relationship is not cleared
- `clearStaffLocalProjections()` targets `markets`, `products`, `events`, and `dailyStats`
- `settings` and `syncQueue` are preserved
- no `deleteDatabase`, reload, or full wipe is introduced
- downgrade path calls projection cleanup and dispatches `trigger-sync`

### Role Freshness Gate

Command:

```bash
npx tsx tests/p5-4d-role-freshness-gate.test.ts
```

Coverage:
- cached role parsing
- unknown staff role fails closed to `null`
- event to capability mapping
- owner cache bypass
- no-cache local/owner flow bypass
- fresh operator can record interaction
- fresh manager can record deal
- stale staff cache blocks write
- viewer cannot record interaction
- operator cannot record deal
- `recordEvent()` is wired to the gate before event validation/write

## Regression Suite

Run before P5-5 work:

```bash
npm run build
npm run lint
npx tsx tests/p5-4a-downgrade-detection.test.ts
npx tsx tests/p5-4b-role-cache-invalidation.test.ts
npx tsx tests/p5-4c-dexie-projection-cleanup.test.ts
npx tsx tests/p5-4d-role-freshness-gate.test.ts
npx tsx tests/role-capabilities.test.ts
npx tsx tests/role-fail-closed.test.ts
npx tsx tests/role-mode.test.ts
npx tsx tests/permission-gate.test.ts
npx tsx tests/permission-gate.integration.test.ts
```

## Known Limitations

- Multi-tab invalidation is not implemented in P5-4. There is no storage event or BroadcastChannel fanout.
- P5-4e UI lock/banner is optional and not required before P5-5.
- The freshness gate relies on `user_role_cache` for staff identification. Owner/no-cache flows are preserved to avoid breaking existing owner writes.
- Server-side authorization remains the final authority. Client gates are defensive UX/runtime guards, not a replacement for RLS/RPC checks.

## P5-5 Entry Gate

P5-5 may start only when:
- P5-4a through P5-4d tests pass
- build passes
- lint has no new warnings beyond the existing `hooks/useSync.ts` dependency warning
- no P5-4 runtime change added reload/deleteDatabase to downgrade cleanup
- no operator/manager UI write surface was enabled during P5-4
