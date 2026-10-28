# Staff role / data visibility consistency diagnosis

2026-10-28 update: the subsequent [isolated event authorization investigation and
086/087 cloud fixes](EVENT_WRITE_AUTHORIZATION_FIX_2026_10_28.md) supersede this
report's earlier "not yet reviewed" server status. The new consistency guard
rejects future contradictions without repairing the one existing relationship.
The following local presentation slice and historical findings remain scoped
as written; the observed zero values are not yet corrected.

2026-10-28 subsequent acceptance: the user explicitly approved the documented
operator data scope for test employee 1234@1234. Its own relationship was
updated through `update_staff_role`, retaining the operator role and setting the
canonical L2 permissions. Price 120, stock 2 and the test market's three sales
were visible again; owner-only financial detail remained restricted. A later
staff synchronization still reset the product sold count from 2 to 0. The local
product screens now display an unconfirmed marker to staff instead of asserting
that number is zero; this is a UI mitigation, not a sync-projection repair.
Owner-confirmed viewer/manager/operator switching was exercised and restored
to operator; manager-created and operator-completed synthetic checklist events
were confirmed in cloud. Full role write and data-access matrix remains open.

## Confirmed behavior

The role matrix remains current in both migration 043 and the latest role writer
in migration 064: viewer uses `can_edit=false, infoLevel=0`; operator and manager
use `can_edit=true, infoLevel=2`. These JSON fields do not grant owner editing or
cost/profit access. Capability gates still define the allowed staff operations.

The existing online acceptance record reports an active operator relationship
whose JSON contains viewer permissions. A read-only subscription account query
reported Team access allowed and active entitlement. This rules out a currently
inactive plan as the explanation for that JSON value; it does not identify which
historical write created it or establish that billing is active.

The local characterization test confirms the following path without an account,
browser, real IndexedDB, or cloud writes:

1. `deriveSafeInfoLevel` preserves an explicitly stored `infoLevel=0`, even when
   `staffRole=operator`.
2. `PermissionGate` removes product price/stock and filters `deal_closed` events
   at L0. Price 120 is therefore absent before mapping, stock 2 is absent, and
   three deal events become zero imported deals.
3. `productRowToLocal` defaults absent price to 0; product detail defaults absent
   stock to 0. Staff market summary similarly defaults absent statistics to 0.

This explains a complete local mechanism matching the observed zeros. It is not
proof that every observed screen or event used that exact sync snapshot.

## Write authorization is a separate dimension

The role matrix explicitly says JSON `can_edit` is not runtime `canEdit` and
staff writes use the role capability whitelist. `lib/db/events.ts` calls
`assertFreshStaffCapability`, whose parsed cache only includes identity, role,
and timestamp. A fresh operator cache permits the `canRecordDeal` capability even
with legacy JSON `can_edit=false`; viewer remains denied. The characterization
test covers both without actually creating an event. `deriveRolePermissions`
still keeps general staff `canEdit=false` and owner-sensitive data disabled.

The repository's migration 082 `check_subscription_write_for_actor` checks the
active relationship role, Team backing, feature, and plan. It does not read the
JSON `can_edit` or `infoLevel`. Server deployment definitions and event policies
still require live read-only review before making a complete server-side claim.
The similarly named `preflightStaffEventImport` checks references during download;
it is not a write authorization gate.

Thus `can_edit=false` is not currently specified as a separate runtime veto over
operator capabilities. The contradictory stored fields are an integrity defect;
these facts alone do not demonstrate a forbidden write bypass or prove that every
server write path is secure. No real staff write was attempted in this slice.

## Writer findings and remaining uncertainty

- The deployed `update_staff_role` definition was inspected read-only during this
  investigation: it updates role and matching JSON together.
- The deployed `update_staff_permissions` definition was also inspected: it only
  checks that input is a JSON object, then replaces permissions without changing
  role. This is a currently available path that can produce a mismatch. No current
  UI caller was found; a wrapper remains in `lib/supabase/staff.ts`.
- Migration 046's older `accept_invitation_and_bind` conflict branch overwrites
  permissions with viewer JSON while preserving the existing role. Reaccepting a
  revoked operator could therefore have produced this exact state historically.
- The deployed acceptance function now resets both role and permissions to viewer,
  matching migration 064. The historical branch is not evidence that the current
  deployment still has that bug.
- The affected row's previous values and writer audit history are unavailable.
  Neither identified path can be asserted to have caused that particular row.

The full read-only diagnostic is
[`staff_role_consistency_readonly.sql`](../supabase/verification/staff_role_consistency_readonly.sql).
It requests the scoped relationship/timestamps, deployed writer definitions,
triggers, constraints, ACLs, and policies inside a read-only transaction. It does
not execute the writers or alter rows. The complete script ran successfully in
the deployed SQL Editor. Its final six rows showed both role/permission RPCs
executable by authenticated and service_role, but not anon. The editor only showed
the last result set, so this does not establish manual review of every intermediate
result. The three writer definitions above were inspected separately.

## Local change

The owner team summary now says “角色與資料權限不一致” when a qualified active
member's role and JSON differ, and explains that displayed zeros may reflect
restricted visibility. Pending, suspended, simulation, and unconfirmed Team
states retain their existing priority. The pure diagnostic helper is presentation
only; it is never used to calculate access, unblock actions, or rewrite settings.

Effective L0 stays L0. The existing role dialog still cannot submit an unchanged
role. No automatic repair, role/plan change, SQL migration, data deletion,
cache clearing, upload, deployment, or commit is included.

All changed logic is platform-neutral and has no browser/device/API capability.
The existing owner team component only passes the already-loaded permissions to
the shared presentation function; no new platform adapter is needed.

## Required human decision

Before changing the affected relationship, confirm whether the owner's intended
access is the documented operator scope or whether the restricted JSON was an
intentional override. A reviewed correction must update role and JSON together
through the canonical owner-authorized path; this investigation does not execute
that correction. Separately decide whether to retire or constrain the legacy
JSON-only writer and how to handle any other inconsistent rows. Do not backfill
all rows or infer permission grants from role alone.

After an approved correction, verify a fresh staff role load and staff-view sync
show the permitted values while owner-only costs, profits, and routes stay
restricted. Existing full staff pulls do not use the incremental event cursor;
this does not justify clearing local data or introducing automatic recovery.

## Verification

- `npx.cmd tsx tests/staff-role-consistency.test.ts`: passed.
- `npx.cmd tsx tests/role-fail-closed.test.ts`: 18 passed.
- `npx.cmd tsx tests/permission-gate.test.ts`: passed.
- `npx.cmd tsx tests/team-subscription-enforcement.test.ts`: passed.
- `npx.cmd tsx tests/staff-relationship-id-fallback.test.ts`: 6 passed.
- `npx.cmd tsx tests/p5-4e-p5-7-role-ui.test.ts`: 7 passed.
- `npx.cmd tsc --noEmit -p tsconfig.mobile.json`: passed.
- `npm.cmd run build`: passed.
- `npm.cmd run build:mobile`: passed, including 35 static segment aliases.
- `npm.cmd run verify:mobile`: passed (378 files, 19.71 MiB).

This report contains no credentials, auth tokens, real UUIDs, or additional
personal data. The scoped SQL retains only the test email pair already supplied
for this investigation; its result should be reviewed locally before sharing.
