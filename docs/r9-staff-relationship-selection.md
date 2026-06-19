# R9 Staff Relationship Selection

## Scope

R9 fixes the existing `staff_relationships.limit(1)` ambiguity in runtime role checks.

When a staff user has more than one historical active relationship row, Supabase can return any matching row unless the query has an explicit ordering. Role resolution must be deterministic because `useUserRole()` is the front-end source of truth for staff owner, role, and capabilities.

## Implementation

- `hooks/useUserRole.ts`
  - Keeps the existing `staff_id + status = active + limit(1)` shape.
  - Adds ordering by `updated_at DESC`, `created_at DESC`, then `id DESC`.
- `hooks/useStaffStatusMonitor.ts`
  - Keeps the existing `staff_id + owner_id + status = active + limit(1)` shape.
  - Adds the same deterministic ordering.

This does not add new permissions, change `infoLevel`, alter Dexie cleanup, or touch RLS/migrations.

## Verification

Run:

```bash
npx tsx tests/r9-staff-relationship-selection.test.ts
npx tsx tests/p5-4b-role-cache-invalidation.test.ts
npx tsx tests/p5-4a-downgrade-detection.test.ts
npm run lint
npm run build
```
