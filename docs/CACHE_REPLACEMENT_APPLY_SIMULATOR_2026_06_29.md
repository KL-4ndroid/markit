# Cache Replacement Apply Simulator - 2026-06-29

Scope: high-risk plan follow-up, non-mutating simulator only.

This slice adds a pure operation-report simulator for cache replacement planning. It does not execute cache replacement, write IndexedDB, call Supabase, import production sync paths, or authorize a future execute path.

## Added

- `lib/sync/cache-replacement-apply-simulator.ts`
- `tests/sync-cache-replacement-apply-simulator.test.ts`

## Behavior

- Converts `CacheReplacementPreview` into operation records:
  - `add`
  - `update`
  - `keep`
  - `skip_pending`
  - `skip_local_only`
  - `skip_blocked`
  - `delete_candidate`
- Always returns `canExecute: false`.
- Always returns `requiresExplicitExecuteApproval: true`.
- Marks `delete_candidate` operations as destructive and approval-required.
- Preserves preview warnings.
- Does not mutate the preview object.

## Safety Boundary

Still not approved:

- Replace-cache execute/apply/delete.
- Wiring simulator output into owner/staff pull services.
- Staff-view destructive replacement.
- IndexedDB writes.
- Supabase writes.

Next possible low-risk work:

- More simulator fixtures for owner/staff/report-only cases.
- Static guardrails that keep production sync from importing simulator modules.
- Design discussion before any execute implementation.

## Fixture Expansion

Additional low-risk fixtures cover:

- Owner full-scope impact reports with add/update/keep/delete-candidate operations.
- Staff partial-scope reports where outside-scope local and remote records remain warnings/report-only.
- Protected `pending`, `local_only`, and blocked records staying skip operations.

These fixtures still do not authorize or implement replace-cache execute/apply/delete.
