# Event Handler Interaction Deleted Characterization - 2026-06-29

Scope: low-risk Phase D fixture expansion only.

This record documents the first post-C2.28B event-handler characterization slice. It does not change runtime handler behavior, Supabase schema, RLS, RPCs, cache replacement, pending-operation workers, or production data.

## Covered Handler

- `interaction_deleted` in `lib/db/events.ts`

## Locked Behavior

- The handler is registered in `eventHandlers`.
- It reads `payload.market_id` as the market lookup key.
- It reads `payload.interactionType` as the interaction counter key.
- It decrements `market.totalInteractions` and clamps at `0`.
- It derives the daily stat lookup date from the tombstone event timestamp.
- It decrements `dailyStats.touchCount` for `interactionType: "touch"` and clamps at `0`.
- It decrements `dailyStats.inquiryCount` for `interactionType: "inquiry"`.
- It decrements `dailyStats.extraInteractions[interactionType]` for custom interaction types.
- It removes a custom `extraInteractions` key when the decremented count reaches `0`.
- It does not create a missing daily stat row.

## Guardrail

- `tests/event-handler-interaction-deleted.test.ts`

## Safety Review

- No production code was modified.
- No event projection logic was changed.
- No migration or live database command is required.
- This test intentionally characterizes current behavior, including the current camelCase payload contract. Snake_case fallback support would require a separate design decision.

## Next Eligible Low-Risk Work

- Additional narrow handler characterization tests for existing behavior.
- Additional cache replacement preview fixtures.
- No broad `lib/db/events.ts` refactor without a new decision.
