# Supabase Security Advisor Read-only Inventory Evidence

Date: 2026-08-24

Executed at: `2026-08-24T20:20:37+08:00`

Status: SRA-000 inventory complete; remediation not approved

Environment: Production / Northeast Asia

Masked target: `supabase-project-sha256:9b9284e718b0...`

Operator: AI under the project owner's explicit SRA-000 instruction

Reviewer role: `security_owner`

This evidence contains no project reference, URL, account identity, token, key,
customer data, raw function/view definition, ACL detail, or unredacted provider
screenshot. Restricted raw evidence is stored outside the repository under the
local vault reference `local-vault:sra-000/2026-08-24`.

## Execution boundary

- Canonical query: `supabase/verification/security_advisor_read_only_inventory.sql`
- Canonical query SHA-256:
  `6692d6e79f799bdd9b6118f74bacd92bbcbce992143c69847572e2436cdfc19c`
- The editor showed the canonical header, `BEGIN`, `SET TRANSACTION READ ONLY`,
  and terminal `ROLLBACK` boundaries before execution.
- The query completed once with 441 rows and no syntax or permission error.
- No SQL, Advisor, Auth, RLS, ACL, function, policy, or project setting was changed.

## Restricted evidence manifest

| Artifact | Rows | SHA-256 |
| --- | ---: | --- |
| Raw catalog inventory | 441 | `54418b13ffb6e4e9f5ad4ef5418deeb5af0f785e4d18865527a661d988109dc8` |
| Security Advisor errors | 3 | `0230f4a2ba4e4d59d84bf069a176ff412878aa853929c79bd62aaf068f230c7a` |
| Security Advisor warnings | 71 | `22d25d4b9abc4c622988e62911edb19879a1c72a4ec97acc2094b36514a735ba` |
| Security Advisor info | 12 | `d8081efcb03f695a63498e7c9fb41d8d3dec4ac607c3483e13025b88ec032916` |

The downloaded files were moved out of the default Downloads folder, renamed to
remove the provider project reference, and retained only in the restricted local
vault.

## Required section completeness

| Section | Rows | Result |
| --- | ---: | --- |
| `inventory_summary` | 1 | PASS |
| `staff_view` | 3 | PASS |
| `view_select_acl` | 12 | PASS |
| `public_function` | 79 | PASS |
| `rls_policy` | 48 | PASS |
| `function_execute_acl` | 224 | PASS |
| `function_trigger` | 30 | PASS |
| `function_dependency` | 44 | PASS |

Inventory summary:

- target staff views: 3;
- public functions: 79;
- SECURITY DEFINER functions: 63;
- functions without a configured search path: 9;
- public policies: 48;
- SELECT ACL rows for target views: 12;
- function EXECUTE ACL rows: 224;
- trigger bindings: 30;
- function dependencies: 44.

## Live finding mapping

| Plan ID | Live evidence | Review classification |
| --- | --- | --- |
| `SRA-001` | one Security Definer View error for the staff events boundary | confirmed live |
| `SRA-002` | one Security Definer View error for the staff products boundary | confirmed live |
| `SRA-003` | one Security Definer View error for the staff markets boundary | confirmed live |
| `SRA-004` | 9 mutable/missing function search-path warnings; inventory also reports 9 missing settings | confirmed live |
| `SRA-005` | inventory contains 15 `search_path=public` and 2 `search_path=public, pg_temp` definitions | confirmed live inventory candidates; requires object-by-object review |
| `SRA-006` | 2 always-true RLS policy warnings on the markets boundary | confirmed live |
| `SRA-007` | 1 always-true RLS policy warning on the products boundary | confirmed live |
| `SRA-008` | 19 anonymous plus 39 authenticated SECURITY DEFINER executable warnings | confirmed live; exact intent must be reviewed per function |
| `SRA-009` | anonymous `verify_invitation_token` executable warning is present within the SRA-008 set | confirmed intentional candidate; adversarial review still required |
| `SRA-010` | one `auth_leaked_password_protection` warning | confirmed disabled; no setting was changed |

The 12 informational findings are `rls_enabled_no_policy` suggestions on billing and
account-deletion service tables. They are retained in the restricted export and are
classified outside the pre-existing non-billing SRA-001 through SRA-010 remediation
register. They are not silently dismissed and must be reviewed under their own billing
and account-deletion server-only boundaries before the final security release decision.

## Outcome and next boundary

SRA-000 passes inventory completeness and evidence hygiene. Production security
readiness does not pass: the live errors and warnings remain open. This evidence does
not authorize Advisor bulk fixes, leaked-password configuration changes, migrations,
RLS/ACL changes, function replacement, or any Production remediation. The next task is
a separately reviewed, bounded remediation proposal beginning with the current
`SEC-REMEDIATION` dependency.
