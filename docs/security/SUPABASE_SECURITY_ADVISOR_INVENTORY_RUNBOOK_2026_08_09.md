# Supabase Security Advisor Read-only Inventory Runbook

Date: 2026-08-09

Status: Production SRA-000 executed 2026-08-24; sanitized evidence complete

Related plan item: `SRA-000` in
`docs/security/SUPABASE_SECURITY_ADVISOR_REMEDIATION_PLAN_2026_08_05.md`

Completed evidence:
`docs/security/SUPABASE_SECURITY_ADVISOR_INVENTORY_EVIDENCE_2026_08_24.md`

Canonical query:
`supabase/verification/security_advisor_read_only_inventory.sql`

## 1. Purpose

Capture the live definitions, owners, function configuration, RLS policies, EXECUTE
ACLs, trigger bindings, and dependencies required before proposing a corrective
security migration. This closes an evidence preparation gap only. It does not approve
or apply RLS, grant, view, function, Auth, or Production changes.

The SQL starts an explicit `READ ONLY` transaction and ends with `ROLLBACK`. It reads
only PostgreSQL catalogs and definition helpers. It does not query application rows.

## 2. Human-only Inputs

The operator must select the intended Supabase environment and retain outside this
repository:

- a dated, read-only Security Advisor export;
- a masked target label and execution timestamp;
- restricted raw query output, because function/view definitions and ACLs are internal
  security material and must not be committed;
- a screenshot or status record for Auth leaked-password protection;
- reviewer identity and the final mapping from live findings to `SRA-001` through
  `SRA-010`.

Do not put a project reference, URL, account email, access token, key, password,
customer data, invitation value, object key, or unredacted provider screenshot in Git.

## 3. Execution

1. Confirm the selected target and whether it is sandbox, staging, or Production.
2. Open the Supabase SQL editor using an authorized read-only review session.
3. Copy the canonical SQL without editing object filters or removing `READ ONLY` and
   `ROLLBACK`.
4. Execute once. A syntax or permission error is a failed inventory, not permission to
   broaden grants.
5. Save the raw result in the restricted evidence location.
6. Export current Security Advisor findings and record the Auth leaked-password status.
7. Compare each live object with repository migration lineage and application callers
   documented in the remediation plan.
8. Commit only sanitized counts, booleans, definition hashes, bounded finding IDs,
   masked target, date, and review outcome in a later evidence artifact.

## 4. Required Result Sections

| Section | Required use |
| --- | --- |
| `inventory_summary` | Counts used to detect incomplete exports. |
| `staff_view` | Exact three staff view definitions, ownership, reloptions, and hashes. |
| `view_select_acl` | Explicit/default SELECT privilege expansion for each staff view. |
| `public_function` | Function signature, owner, language, SECURITY DEFINER, configuration, body, and hash. |
| `rls_policy` | Policy roles, command, permissive mode, USING, and WITH CHECK. |
| `function_execute_acl` | Explicit/default EXECUTE privilege expansion by grantee. |
| `function_trigger` | Trigger-to-function bindings that must survive hardening. |
| `function_dependency` | Objects depending on each public function. |

The inventory is incomplete if any of the three expected staff views is missing without
an explained migration state, if the Advisor export and SQL target differ, or if the
Auth setting is not reviewed separately.

## 5. Review And Next Boundary

After execution, Codex may reconcile the sanitized result with migration history,
callers, role behavior, Dexie/sync risks, and the staged remediation order. Writing a
candidate corrective migration still requires explicit approval. Applying it to any
environment requires a separate target-specific review and denial/regression evidence.

Never use an Advisor bulk-fix action as a substitute for the object-by-object plan.
