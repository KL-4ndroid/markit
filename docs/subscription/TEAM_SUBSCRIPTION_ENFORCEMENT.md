# Team Subscription Enforcement Runbook

Date: 2026-08-01
Status: migrations 064/065, all 22 live structural checks, authenticated local simulation UI smoke, and the isolated 57-check server-authoritative state-transition smoke pass; release-deployment UI evidence remains pending

## Purpose

This runbook activates the Team-only staff collaboration contract implemented by
`supabase/migrations/064_enforce_team_subscription.sql`.

Migration `065_fix_team_invitation_verification_return_type.sql` is applied
immediately after 064. The first live 064 smoke found PostgreSQL error `42804`
because `auth.users.email` required an explicit cast to the RPC's declared
`TEXT` return type. The hotfix changes only that read-only verification function.

The migration is intentionally fail-closed:

- only an effective `admin` Team row currently authorizes Team database writes;
- billing, promotion, local simulation, browser state, and public environment
  values do not authorize writes;
- downgrade retains staff relationships and activity history but changes active
  relationships to `suspended_by_plan` and removes their `market_members` rows;
- re-upgrade does not restore access automatically;
- Free and Pro owners retain cleanup actions: revoke staff and delete invitation
  links.

## Deployment Order

1. Run the read-only impact inventory below.
2. Review every active relationship that will become suspended.
3. Apply migration 064, then migration 065.
4. Run the database permission and transition smoke.
5. Deploy the matching Web code only after the new RPCs exist.
6. Complete authenticated `/settings/team` smoke for Free, Pro, Team, downgrade,
   and explicit restore.

Deploying the Web code before migration 064 leaves the new mutation RPCs missing.
Applying migration 064 before reviewing the inventory can unexpectedly remove
existing staff workspace access, even though it does not delete history.

## Read-Only Impact Inventory

Run in the Supabase SQL Editor before migration 064:

```sql
SELECT
  sr.owner_id,
  COUNT(*) FILTER (WHERE sr.status = 'active') AS active_staff,
  sa.plan_code,
  sa.plan_source,
  sa.entitlement_status,
  sa.entitlement_ends_at
FROM public.staff_relationships AS sr
LEFT JOIN public.subscription_accounts AS sa ON sa.owner_id = sr.owner_id
WHERE sr.status = 'active'
GROUP BY
  sr.owner_id,
  sa.plan_code,
  sa.plan_source,
  sa.entitlement_status,
  sa.entitlement_ends_at
ORDER BY active_staff DESC, sr.owner_id;

SELECT status, COUNT(*)
FROM public.staff_relationships
GROUP BY status
ORDER BY status;

SELECT COUNT(*) AS active_invitation_links
FROM public.staff_invitations
WHERE expires_at > now();
```

Expected before launch: every owner without an effective admin Team row is an
intentional suspension candidate. Do not create a fake billing row to avoid the
backfill.

## Permission Verification

After applying migrations 064 and 065:

```sql
SELECT status, COUNT(*)
FROM public.staff_relationships
GROUP BY status
ORDER BY status;

SELECT
  has_table_privilege('authenticated', 'public.staff_relationships', 'INSERT') AS rel_insert,
  has_table_privilege('authenticated', 'public.staff_relationships', 'UPDATE') AS rel_update,
  has_table_privilege('authenticated', 'public.staff_relationships', 'DELETE') AS rel_delete,
  has_table_privilege('authenticated', 'public.staff_invitations', 'INSERT') AS invite_insert,
  has_table_privilege('authenticated', 'public.staff_invitations', 'DELETE') AS invite_delete;

SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE specific_schema = 'public'
  AND routine_name IN (
    'invite_staff_member',
    'create_staff_invitation',
    'delete_staff_invitation',
    'accept_staff_email_invitation',
    'decline_staff_email_invitation',
    'restore_staff_relationship',
    'revoke_staff_member',
    'update_staff_role'
  )
ORDER BY routine_name, grantee;

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('staff_relationships', 'staff_invitations')
ORDER BY tablename, policyname;
```

Expected:

- all five direct authenticated mutation privilege values are `false`;
- mutation RPC execution is available to `authenticated`, not `anon`;
- staff and owners retain scoped `SELECT` policies;
- no direct staff acceptance or owner all-operation policy remains.

## Live Structural Smoke Evidence

Recorded on 2026-07-30 with
`npm.cmd run smoke:subscription:team-enforcement`:

- all 22 checks passed;
- relationship status contract passed with two retained
  `suspended_by_plan` relationships;
- both suspended owner/staff pairs have no leaked staff `market_members` rows;
- every active relationship is backed by authoritative Team entitlement; the
  current fixture has no active relationship rows;
- six anonymous direct table mutation probes were denied with PostgreSQL
  `42501`;
- all eleven protected Team mutation RPCs denied anonymous execution with
  PostgreSQL `42501`;
- unknown invitation-token verification returned invalid without an RPC error,
  confirming the `065` return-type fix;
- the read-model smoke still resolves the owner as default Free because the live
  source has no explicit subscription row.

This evidence proves migration shape, retained suspension cleanup, and anonymous
boundaries. It does not prove authenticated Free/Pro denial, Team mutation
success, downgrade/re-upgrade transitions, or explicit restoration.

## Authenticated Local Simulation UI Evidence

Recorded on 2026-07-30 with an authenticated owner at `localhost:3010`:

- Free and Pro both showed the Team requirement and disabled invitation, role,
  restore, and new invitation-link controls;
- Team removed the presentation gate but kept every cloud mutation control
  disabled with an explicit simulation-only reason;
- retained `suspended_by_plan` relationships remained readable without regaining
  workspace access;
- Team inherited Pro analytics, full settlement, and PDF presentation;
- 390px, 768px, 1440px, and 1920px checks found no horizontal overflow on the
  subscription, Team, or settlement surfaces;
- no console error was observed. The only warning was the expected small-sample
  analytics warning;
- no authentication token, browser storage, subscription row, relationship, or
  invitation record was read outside the normal UI or mutated for this smoke.

This proves authenticated UI gating and simulation write suppression. It still
does not prove server-authoritative Team mutation success or state transitions.

## Isolated Live State-Transition Evidence

Recorded on 2026-08-01 with a disposable owner/staff Auth pair, one disposable
market, and one admin-source subscription projection created only for the smoke:

- all 57 checks passed, including fixture cleanup;
- all six authenticated direct relationship/invitation table mutations were
  denied with PostgreSQL `42501`;
- default Free and explicit Pro denied invitation, link creation, role change,
  and restore RPCs with `42501`;
- Team allowed email invitation, invitation-link create/delete, acceptance, and
  viewer to operator to manager role transitions;
- Team to Pro changed the active manager relationship to `suspended_by_plan`,
  removed its market membership, and removed the staff owner/market RPC scopes;
- Pro to Free preserved suspension;
- Team re-upgrade did not auto-restore the relationship or membership;
- explicit owner restore reactivated the relationship and recreated the staff
  membership and owner/market scopes;
- a separate residual audit found zero smoke Auth users, profiles, markets, or
  recovery-journal files after cleanup;
- the original 22-check structural smoke and subscription read-model regression
  remained green after the transition run.

Run the guarded smoke only against an explicitly confirmed project ref:

```powershell
npm.cmd run smoke:subscription:team-transition -- --execute=isolated-fixture-only --project-ref=<project-ref>
```

The script never reuses existing accounts or relationships. It keeps only user
IDs and the project ref in a temporary recovery journal that requests mode
`0600` on platforms that honor POSIX modes, never stores the generated password,
and refuses a new run while a prior journal exists. To recover after
interruption, use the same exact confirmation plus
`--cleanup-leftover`; cleanup targets only the two recorded Auth user IDs.

## State Transition Smoke

Use approved test accounts. The local subscription simulator is presentation
evidence only and must not be used for database-write evidence.

### Free And Pro

- existing active staff is `suspended_by_plan` after downgrade/backfill;
- staff can no longer read the owner workspace;
- invite by email, create link, role change, and restore fail server-side;
- owner can still revoke a retained relationship and delete an invitation link;
- direct REST insert/update/delete on the two staff tables is denied.

### Team

- an effective admin Team owner can invite a registered user;
- an invited user can accept only while the owner still has Team;
- invitation-link creation and acceptance work;
- role change works only for an active relationship;
- owner-only financial permissions remain unchanged.

### Downgrade And Restore

1. Start with an effective admin Team owner and one active staff member.
2. Change the subscription account to explicit Free or inactive entitlement.
3. Confirm the relationship becomes `suspended_by_plan`.
4. Confirm the owner's staff `market_members` rows are removed.
5. Confirm the staff client invalidates its role and cannot sync owner data.
6. Restore the owner's Team entitlement.
7. Confirm the relationship remains suspended.
8. Use the owner restore action for that relationship.
9. Confirm the relationship becomes active and eligible market membership rows
   are recreated.

### Minimum Approved Fixture

Repeat the state-transition smoke only with an isolated fixture:

1. Use one dedicated owner test account and one dedicated staff test account.
2. Record the original subscription, relationship, invitation, and market-member
   state before any mutation.
3. Confirm default Free and explicit Pro both deny invite, role change, and
   restore through authenticated RPC calls.
4. Create an explicit `admin` Team subscription row for the test owner only,
   then verify invitation, acceptance, role change, and manager permission paths.
5. Downgrade the fixture and verify suspension, membership removal, role-cache
   invalidation, and denied staff workspace access.
6. Re-upgrade to Team and verify access remains suspended until the owner invokes
   explicit restore.
7. Remove or restore every fixture row to its recorded original state and retain
   sanitized evidence without tokens, emails, or user identifiers.

Do not reuse a real merchant account, the local simulator, or an inferred paid
state as this fixture.

## Local Simulation Rule

On localhost, simulated Team may reveal Team controls so identity gates can be
reviewed. The controls that mutate staff data remain disabled and the server does
not accept `simulation_enabled` as entitlement evidence. A successful simulated
cloud mutation is a security defect.

## Rollback Boundary

Do not automatically convert `suspended_by_plan` rows back to `active` during a
rollback. That would silently restore access without owner confirmation. A
rollback must preserve relationship status and history, then use an approved,
owner-confirmed restoration procedure after the authorization model is repaired.

## Remaining Launch Evidence

- authenticated owner/staff UI evidence on the selected release deployment;
- real-client staff role-cache/local-projection cleanup evidence during a
  production-like downgrade session;
- deployment smoke on the real HTTPS environment;
- future billing-webhook reconciliation before billing can become authoritative.
