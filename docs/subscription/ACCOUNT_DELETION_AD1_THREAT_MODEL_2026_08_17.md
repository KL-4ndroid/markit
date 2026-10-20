# Account Deletion AD1 Threat Model

Date: 2026-08-17

Scope: repository-local design and synthetic evidence only

Policy revision: `2026-08-17`

## 1. Assets And Trust Boundaries

Protected assets are the authenticated identity, owner workspace, staff access,
pending local writes, private R2 objects, subscription continuity, retained minimized
billing evidence, deletion request evidence, and the fact that deletion was requested.

Trust boundaries:

1. Web/iOS/Android client to stable HTTPS API;
2. API authentication and recent-reauth verification to server-owned request writer;
3. request writer to private deletion tables;
4. leased worker to Postgres, R2, auth administration, and store-verification state;
5. opaque status/support response back to the user;
6. backup restore to corrective-forward deletion reconciliation.

Shared clients may collect the approved pending-write resolution and display bounded
status, but cannot choose an actor ID, workspace ID, object key, billing subject,
cleanup step result, or completed state. No shared module imports Capacitor or browser
globals; platform-specific reauthentication and external links remain behind platform
ports in later slices.

## 2. Threat Register

| ID | Threat | Required mitigation | Synthetic/static AD1 evidence | Remaining runtime proof |
| --- | --- | --- | --- | --- |
| AD-T01 | Cross-owner or staff-to-owner deletion | derive scope only from verified session; never accept owner/staff IDs from client | contract has account kind but no target ID; draft has one active actor FK | AD2 route authorization and cross-owner integration tests |
| AD-T02 | Stolen/stale session initiates deletion | recent reauthentication and single-use server confirmation | `identityConfirmed` blocks completion; transition requires identity-confirmed phase | real auth age/challenge tests |
| AD-T03 | Client lies that local writes are clean | require explicit bounded resolution for UX, but never use it as server authorization | completion rejects null preflight; canonical pending report remains required | Web/mobile interruption tests and server independence proof |
| AD-T04 | Replay or duplicate request | hash idempotency key; one active request per actor | unique idempotency hash and partial unique active-actor index | concurrent request integration test |
| AD-T05 | Two workers execute a step | hashed lease token, expiry, bounded attempts, step PK | terminal states forbid lease; completion rejects active lease | transactional lease acquisition/race test |
| AD-T06 | Partial cleanup falsely reports success | every account-kind-required step completed with bounded count and SHA-256 evidence | pure evaluator blocks missing, duplicate, incomplete, invalid evidence | worker/object/database failure injection |
| AD-T07 | R2 metadata cascade leaves private objects | manifest, delete, physical absence as separate ordered evidence | owner required steps include manifest/delete/absence | R2 disposable object tests |
| AD-T08 | Billing `ON DELETE RESTRICT` bypassed by deleting evidence | detach to restricted pseudonymous billing subject before profile/auth deletion | owner required steps include billing detachment; draft retains private tables | reviewed AD3 migration and ledger invariants |
| AD-T09 | Pseudonym allows profile/email reidentification | server HMAC with purpose-separated secret; no raw actor/email in retained subject; erase active FK on completion | completed request requires null actor; 64-hex subject hash | key custody, rotation, access-log, correlation review |
| AD-T10 | Staff anonymization deletes owner facts or remains reversible | dedicated deleted-member outcome; preserve fact payload; no mapping table | staff requires attribution-anonymized evidence and not owner R2/billing steps | exact schema migration and linkage-resistance fixtures |
| AD-T11 | Store restore rebinds deleted workspace or two owners | store evidence restores entitlement only; atomic prior-binding release and single-owner check | no store token or workspace-restore field exists in request contract | Apple/Google server verification race tests |
| AD-T12 | Secrets, receipts, object keys, or content leak through evidence/status | bounded codes/counts/hashes only; opaque request ID | SQL constraints bound error codes/counts/hashes; no content columns | log/status response inspection |
| AD-T13 | Legacy destructive RPC bypasses new saga | replace Settings caller, then revoke authenticated execute before runtime launch | migration 033 caller is documented; AD1 draft records mandatory AD2 revoke | cutover test proving old RPC denied |
| AD-T14 | Auth user deleted before cleanup | auth deletion is a required final step after operational/profile evidence | required-step order is documented and fixtures assert full set | worker ordering/transaction tests |
| AD-T15 | Backup restore resurrects deleted identity/data | retain deletion tombstone/evidence separately; corrective-forward delete after restore | transition audit is restricted and deletion completion terminal | authorized non-Production backup/restore drill |

## 3. Data Minimization And Retention Mapping

| Data class | Current repository surface | Designed deletion result | Evidence form |
| --- | --- | --- | --- |
| Auth/profile/contact | `auth.users`, `profiles` | access frozen immediately; profile/auth deleted last | bounded step count/hash; auth denial test |
| Workspace/markets/products/events | owner tables and projections | owner delete; staff facts preserved only with irreversible actor tombstone | per-class counts/hash; cross-owner fixture |
| Staff/invitations/roles | relationships, invitations, market members | revoke immediately; remove identity joins | role denial and bounded count/hash |
| Pending local writes/cache | Dexie queues/payloads and browser/device cache | explicit sync/export/discard before request; current account cache after completion | client report codes/counts; never uploaded content |
| Product covers | R2 keys in `product_cover_photos` | delete objects, prove absence, then metadata cleanup | private manifest hash and absence result |
| Sales evidence | R2 keys in `sale_photo_evidence` | earlier 7-day lifecycle or deletion; prove absence | private manifest hash and absence result |
| Subscription price/billing | F3A/F3B restricted owner FKs | minimize and detach to pseudonymous billing subject | migration counts/hash; no email/profile join |
| Audit/security | existing logs plus deletion transition audit | pseudonymize/restrict; approved 180-day ceiling unless scoped hold | bounded transition/reason/evidence hash |
| Support cases | external/public support workflow not yet configured | minimize identifiers; approved two-year ceiling | external processor evidence required |
| Backups/processors | deployed providers not proven by repository | 90-day backup ceiling and corrective-forward deletion | human/provider and restore-drill evidence |

## 4. AD1 Security Decisions

- The request and audit tables receive RLS plus no `PUBLIC`, `anon`, `authenticated`,
  or `service_role` table grants from the draft. A future server writer needs a narrow,
  separately reviewed ownership path; a generic client/service-role grant is forbidden.
- The client idempotency value and active actor identifier are not retained as the
  long-term pseudonymous subject. Hashes must be purpose-separated and generated by
  trusted server code; plain SHA-256 of a UUID is insufficient.
- Completion evidence contains only fixed step codes, nonnegative counts, hashes, and
  bounded safe error codes. It excludes email, names, store tokens/receipts, R2 object
  keys, support text, and workspace content.
- The legacy `delete_current_user_app_data()` RPC is not a compliant deletion saga.
  AD2 must replace its caller and revoke `authenticated` execution before any account
  deletion UI is released.

## 5. Residual Risk And Approval Boundary

AD1 does not prove the deployed schema, server writer, HMAC/key custody, worker leases,
R2 absence, auth deletion, restore ownership, backup behavior, or store lifecycle.
Those remain AD2–AD5. The draft SQL contains `ROLLBACK`, is stored outside
`supabase/migrations`, and was not applied. No external account or user data was
accessed or mutated.
