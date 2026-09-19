# Recurring Hybrid Operations — Production Apply Runbook

Status: manual gate required. Codex must not execute this production migration.

## Scope

Apply `supabase/migrations/069_add_recurring_hybrid_operations.sql`, then run the read-only verifier. The migration is additive: it creates owner-only Venue/Schedule snapshots, adds nullable Market compatibility fields, updates the event allow-list and exposes only materialized Market recurrence metadata to Staff.

It does not backfill legacy Markets, create Venues automatically, merge rows, add a server cron, or expand Staff schedule authority.

## Required operator evidence before apply

- Target Supabase project ID and environment name.
- Current migration list proving `069` is not already occupied by a different migration.
- Current database backup/PITR status and recovery owner.
- Read-only verifier output captured before apply. Missing tables/columns are expected; any existing duplicate occurrence report is a STOP condition.
- Confirmation that the operator is applying to staging first.

## Staging procedure

1. Confirm the checked-out commit and review the migration diff.
2. Run `supabase/verification/069_recurring_hybrid_operations_read_only.sql` and retain output.
3. Apply migration 069 through the normal Supabase migration workflow.
4. Run the verifier again. Confirm:
   - both tables exist and RLS is enabled;
   - only owner-scoped SELECT/INSERT/UPDATE policies exist;
   - the event CHECK includes all eight recurring-operation event types;
   - the partial unique occurrence index exists;
   - the projection trigger exists;
   - the Staff Market view contains all seven compatibility fields;
   - duplicate and owner-mismatch queries return zero rows.
5. Run application sync smoke tests with one Owner and one Staff fixture. Owner may create/sync a Venue and schedule; Staff cannot read the management tables or write schedule events; Staff can read and operate an already materialized Market according to existing Market capabilities.
6. Record staging evidence and approval before production.

## Production procedure

Repeat the staging procedure against production only after explicit human approval. Do not create synthetic production rows. Do not clean, merge, or choose a canonical winner for duplicate occurrences.

If the migration fails inside its transaction, retain the exact error and stop. If it succeeds but verification fails, disable release rollout and investigate; do not drop the new tables or columns after writes may have occurred. Recovery must use the approved database backup/PITR process.

## Evidence to return

- Applied migration filename and checksum.
- Staging and production timestamps.
- Verifier outputs before and after apply.
- RLS smoke-test identities and outcomes (IDs redacted as appropriate).
- Duplicate report row count.
- Approver and recovery owner.

Production apply remains incomplete until this evidence is reviewed.
