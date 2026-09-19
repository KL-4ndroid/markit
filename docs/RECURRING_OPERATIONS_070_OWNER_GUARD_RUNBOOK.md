# Recurring Operations 070 Owner Guard Runbook

Status: manual production apply required.

## Why 070 is required

Migration 069 correctly added owner-scoped rows, but the existing application role model treats any authenticated user with an active `staff_relationships` row as Staff. The legacy global-event INSERT path permits `market_id IS NULL`, so UI-only blocking was not sufficient for the eight Venue/Schedule event types.

070 adds the missing remote role check without changing existing Market, Product, interaction, deal, note, or checklist permissions.

## Apply

1. Confirm 069 is applied and its verifier remains green.
2. Review and apply `supabase/migrations/070_enforce_recurring_operations_owner_role.sql` through the normal staging workflow.
3. Run `supabase/verification/070_recurring_operations_owner_role_read_only.sql`.
4. Confirm all `*_ready` and `existing_market_event_policy_preserved` values are `true`; both guarded policy counts must be `3`.
5. With staging identities, verify:
   - Owner recurring event succeeds.
   - Manager, Operator, and Viewer recurring events fail with SQLSTATE `42501`.
   - Existing allowed Staff Market event behavior is unchanged.
6. Apply to production only after staging evidence is reviewed.

Do not create synthetic production data or change an actual user relationship for verification. Production role smoke evidence should use an already approved test identity or remain a staging-only behavioral proof.
