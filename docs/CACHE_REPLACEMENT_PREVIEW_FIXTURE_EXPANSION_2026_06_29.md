# Cache Replacement Preview Fixture Expansion - 2026-06-29

Scope: low-risk Phase D fixture expansion only.

This record documents an additional preview-only guardrail for future replace-cache planning. It does not execute cache replacement, delete local records, write Supabase data, change sync pull routing, or introduce a pending-operation worker.

## Covered Module

- `lib/sync/cache-replacement-preview.ts`

## Locked Behavior

- `authorizedIds` are normalized by removing empty ids, deduplicating, and sorting.
- Owner preview keeps authorized local records that match the remote copy.
- Owner preview adds authorized remote records that are missing locally.
- Owner preview ignores local records outside the authorized scope.
- Local records outside the owner authorized scope do not become delete candidates.
- No warning is emitted for owner-full local records outside the authorized scope.

## Guardrail

- `tests/sync-cache-replacement-preview.test.ts`

## Safety Review

- No production sync path imports the preview module.
- No execute/apply/delete path is introduced.
- This is a characterization fixture for future design, not a runtime behavior change.

## Next Eligible Low-Risk Work

- Additional preview fixtures that classify report-only impact.
- Additional narrow event handler characterization tests.
- No replace-cache execute path without a separate explicit decision.
