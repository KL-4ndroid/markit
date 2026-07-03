# Form Draft and Role Refresh Stability Plan

Date: 2026-07-03

Status: active sliced execution. Slice 1 and Slice 2 have been implemented as low-risk form-draft protection. Slice 3 dirty close guard is implemented in the same bounded AddMarketForm surface. Slice 4A role refresh state model is implemented as a pure non-runtime contract. Slice R1 adds a RoleProvider shell under AuthProvider. Slice R2 migrates RoleGuard to the shared role refresh state. Slice R3 migrates SyncProvider to the shared role refresh state while keeping sync paused until the role snapshot is ready. Page-level consumers remain on their existing `useUserRole()` calls until later slices.

## Problem

When a user opens the add-market form, switches away to another browser page or app, and then returns, the app can briefly show the role/auth loading skeleton again. If that loading path unmounts the protected route tree, the add-market form is remounted and its local React state resets.

This is disruptive for the intended workflow: users often copy market details from another page while filling out a new market.

## Current Evidence

Read-only checks found the active risk path:

- `AppChrome` wraps protected routes with `AuthGuard` and `RoleGuard`.
- `RoleGuard` currently returns `RoleLoadingFallback` whenever `useUserRole()` reports loading or error.
- `RoleLoadingFallback` now renders a skeleton, but it still replaces the protected route children.
- `AddMarketForm` stores draft input in component-local state.
- `lib/form-autosave.ts` already exists, but `AddMarketForm` does not use it.
- `useUserRole()` has existing stale async commit guards and role-cache invalidation handling.
- Current role safety tests pass:
  - `tests/role-fail-closed.test.ts`
  - `tests/p5-4b-role-cache-invalidation.test.ts`
  - `tests/c2-28b-render-guard-static-audit.test.ts`

## Non-Goals

- Do not change market creation calculations.
- Do not change sync event semantics.
- Do not weaken owner/staff permission boundaries.
- Do not make local browser drafts a durable backup or recovery feature.
- Do not expose staff-sensitive or owner-only data while role state is unresolved.

## Execution Readiness Assessment

This plan should not be executed as one direct implementation.

Overall readiness:

- Phase 1 is executable soon, but only as small slices.
- Phase 2 is not directly executable. It touches auth, role, sync, route mounting, and permission fail-closed behavior.
- Phase 3 is not urgent and should wait until Phase 1 proves stable.

The immediate safest path is to start with draft protection, because it solves the user-visible data-loss problem without changing role semantics.

However, the current codebase has one important blocker before directly wiring `AddMarketForm` to `lib/form-autosave.ts`:

- `lib/form-autosave.ts` currently logs saved and loaded form data to `console`.
- The security requirement in this plan says draft content must not be written to logs.
- Therefore Phase 1 must start with a utility hardening slice before form integration.

## Direct Execution Decision

Do not execute the full plan directly.

Execute only the following low-risk slices automatically:

1. Documentation and static guardrail tests.
2. `form-autosave` utility hardening that removes draft payload logging and preserves existing sessionStorage behavior.
3. `AddMarketForm` draft save/restore integration with user-scoped keys.
4. Targeted tests for draft restore, submit-clear, close-preserve, empty-default non-overwrite, and user isolation.

Stop before:

- RoleProvider introduction.
- Changing `RoleGuard` mount/unmount behavior.
- Changing `useUserRole()` load-state semantics.
- Changing sync enablement or `deriveSafeInfoLevel(...)`.
- Adding broad navigation blockers.
- Persisting drafts to Supabase, Dexie, localStorage, analytics, or recovery flows.

Reason:

The role refresh work can improve UX, but it changes the app-wide auth/permission contract. That is a higher-sensitivity architecture slice and needs its own design review after draft autosave is proven.

## Safe Slice Plan

### Slice 0: Plan and Guardrail Alignment

Status: planning/documentation only.

Scope:

- Keep this document aligned with the actual codebase.
- Confirm the risk boundary between form draft protection and role refresh architecture.
- Add or update tests that check the plan text if useful.

Allowed:

- Docs.
- Static tests.

Not allowed:

- Runtime behavior changes.
- Auth, role, sync, or storage behavior changes.

### Slice 1: Form Autosave Utility Hardening

Status: implemented.

Goal: make the existing autosave helper safe enough to reuse.

Scope:

- Remove or sanitize console logging that includes draft payloads.
- Keep `sessionStorage` as the storage backend.
- Keep the existing expiration behavior unless a later product decision changes it.
- Do not add cloud, Dexie, sync, or analytics integration.

Acceptance:

- Tests verify saved draft payloads are not logged.
- Existing form autosave behavior still works.
- `npm.cmd run build` passes.

Risk: low.

### Slice 2: AddMarketForm Draft Restore and Autosave

Status: implemented.

Goal: preserve add-market input through remount, tab switching, and accidental route loading replacement.

Scope:

- Add a user-scoped draft id, for example `add-market:${user.id}`.
- Save a single draft object containing:
  - `formData`
  - `noEarlyEntry`
  - `tableFree`
  - `chairFree`
  - `umbrellaFree`
- Restore once when the form opens and before autosave can overwrite the saved draft.
- Save only when `isOpen=true` and the draft contains meaningful user input.
- Clear only after successful `createMarket()`.
- Preserve draft when the modal closes without successful submit.

Acceptance:

- Remount restores draft.
- Close and reopen restores draft.
- Successful submit clears draft.
- Empty default state does not overwrite a saved draft.
- Drafts are isolated by authenticated user id.
- No draft data appears in console logs.
- `npm.cmd run build` passes.

Risk: low to medium.

Reason for medium edge:

- `AddMarketForm` has multiple independent local states beyond `formData`, so restore order matters.

### Slice 3: Dirty Close Guard for AddMarketForm

Status: implemented for AddMarketForm modal close, backdrop close, cancel button, and browser reload/close guard.

Goal: prevent accidental discard from close/backdrop/reload after draft autosave exists.

Scope:

- Confirm dirty state from meaningful draft content.
- Intercept modal close and backdrop close first.
- Add `beforeunload` only while dirty.
- Offer two choices:
  - keep draft
  - discard draft

Acceptance:

- Dirty close prompts.
- Keep draft preserves draft.
- Discard draft clears draft.
- Successful submit bypasses warning.
- `beforeunload` is active only while dirty.

Risk: medium.

Reason:

- UX can become annoying if dirty detection is too broad.
- Browser unload prompts have limited custom UI support.

### Slice 4: Role Refresh Architecture Design and Model Only

Status: partially implemented as a pure model and tests. No runtime wiring.

Goal: prepare a safe future change without touching runtime behavior yet.

Scope:

- Design `RoleProvider` / shared role snapshot contract.
- Define `isInitialLoading`, `isRefreshing`, and hard error semantics.
- Define how `RoleGuard`, `SyncProvider`, `BottomNavigation`, and pages consume the same snapshot.
- Define fail-closed rules during refresh.

Acceptance:

- Design document or this plan is updated.
- Static tests can assert intended boundaries.
- No runtime auth/role/sync behavior changes.
- `deriveRoleRefreshState(...)` defines:
  - initial loading blocks protected children;
  - background refresh keeps protected children mounted only when a previous usable role snapshot exists;
  - background refresh still disables owner privileges and uses sync info level `0`;
  - refresh errors block and fail closed.

Risk: low as design only; high if implemented directly.

Implemented files:

- `lib/permissions/role-refresh-state.ts`
- `tests/role-refresh-state.test.ts`

### Slice R1: RoleProvider Shell

Status: implemented.

Goal: establish a shared role context boundary without changing existing runtime consumers.

Scope:

- Add `RoleProvider` and `useRoleContext()` as a thin wrapper around existing `useUserRole()`.
- Mount `RoleProvider` under `AuthProvider` and above `SyncProvider`.
- Keep `RoleGuard`, `SyncProvider`, pages, navigation, and repair panels on their existing `useUserRole()` calls.
- Add static tests proving this is only a provider shell and not a consumer replacement.

Acceptance:

- `RoleProvider` does not query Supabase directly.
- `RoleProvider` does not read or write storage directly.
- `RoleProvider` does not import sync, Dexie, Gate D, recovery, or pending operation code.
- Layout order is `AuthProvider -> RoleProvider -> SyncProvider -> NavigationProvider -> AppChrome`.
- `RoleGuard` and `SyncProvider` still use the existing hook until their own dedicated slices.

Risk: low to medium.

Reason:

- The shell itself is low risk, but it introduces one additional provider-level call to the existing role hook until consumers are migrated. This is acceptable only as a short-lived transition slice.

Implemented files:

- `lib/role-context.tsx`
- `tests/role-provider-r1.test.ts`
- `app/layout.tsx`

### Slice R2: RoleGuard Consumer Replacement

Status: implemented.

Goal: let `RoleGuard` read the shared RoleProvider snapshot and use `deriveRoleRefreshState(...)` so background refresh can keep protected children mounted while privileged behavior remains fail-closed.

Scope:

- `RoleProvider` tracks whether the same authenticated user has previously completed a successful role resolution.
- Account/user changes synchronously reset that previous-role marker.
- `RoleGuard` reads `roleRefreshState.shouldShowBlockingFallback` from `useRoleContext()`.
- `RoleGuard` no longer owns a separate `useUserRole()` instance.
- `SyncProvider` and page-level consumers remain unchanged.

Acceptance:

- First unresolved role load still blocks protected children.
- Background refresh after a successful same-user role resolution can keep protected children mounted.
- Background refresh state remains fail-closed through `deriveRoleRefreshState(...)`.
- SyncProvider remains on its existing fail-closed `useUserRole()` path until Slice R3.

Implemented files:

- `lib/role-context.tsx`
- `components/auth/RoleGuard.tsx`
- `tests/role-provider-r1.test.ts`
- `tests/c2-28b-render-guard-static-audit.test.ts`

### Slice R3: SyncProvider Consumer Replacement

Status: implemented.

Goal: let `SyncProvider` consume shared role refresh state without allowing sync to run with stale owner permissions during background refresh.

Scope:

- `SyncProvider` reads `roleRefreshState` from `useRoleContext()`.
- `SyncProvider` no longer owns a separate `useUserRole()` instance.
- Sync `roleInfoLevel` uses `roleRefreshState.syncInfoLevel`.
- Sync runs only when `roleRefreshState.stage === 'ready'`.
- Initial loading, background refresh, and blocked role states all keep sync at info level `0`.
- `useSync()` internals, event upload/download logic, cloud routing, and pending operation behavior are unchanged.

Acceptance:

- Background role refresh does not run sync with stale owner permissions.
- Initial role loading and role errors keep sync disabled.
- Owner/staff info levels still come from the shared fail-closed role refresh model.
- RoleGuard remains on the same shared role refresh state from Slice R2.

Implemented files:

- `lib/sync-context.tsx`
- `tests/role-provider-r1.test.ts`
- `tests/c2-28b-render-guard-static-audit.test.ts`

### Slice R4: Page and Local Consumer Consolidation

Status: not implemented.

Goal: gradually replace page-level and local component `useUserRole()` calls with shared role context where it reduces duplicate role reads without weakening local fail-closed gates.

Stop before implementation unless this slice is explicitly approved after R3 verification.

### Slice 5: Role Refresh Implementation

Status: not approved by this plan for broad automatic execution.

This is a separate high-sensitivity implementation track.

Minimum prerequisites:

- Phase 1 draft autosave is complete and verified.
- Existing role fail-closed tests pass.
- New tests prove background refresh keeps children mounted while disabling privileged writes and sensitive reads.
- Sync behavior during refresh is explicitly tested with safe info level `0`.

Stop for human confirmation before starting this slice.

## Recommended Execution Order

### Phase 1: Add AddMarketForm Draft Autosave

Goal: protect user input immediately, even if the page is remounted or reloaded.

Use the existing `lib/form-autosave.ts` utilities, but scope the draft carefully.

Implementation requirements:

- Use a draft id scoped by user and form, for example `add-market:${user.id}`.
- Save all form-controlled state, not only `formData`:
  - `formData`
  - `noEarlyEntry`
  - `tableFree`
  - `chairFree`
  - `umbrellaFree`
- Restore draft before autosave begins, so default empty values do not overwrite an existing draft.
- Save only when the form is open and contains meaningful data.
- Clear draft only after successful `createMarket()`.
- Closing the modal should not silently clear the draft.
- If a saved draft exists, reopening the form should restore it.

Safety requirements:

- Use `sessionStorage`, not `localStorage`, unless a later product decision explicitly asks for durable drafts.
- Never save auth tokens or derived permission state in the form draft.
- Do not sync draft data to Supabase or Dexie.
- Do not include draft data in analytics, logs, or toast messages.
- Draft restore must be user-scoped to prevent account-switch leakage.

Suggested tests:

- Add-market draft is saved after user enters required fields.
- Remounting `AddMarketForm` restores the draft.
- Successful submit clears the draft.
- Closing and reopening the modal restores the draft.
- Empty default form does not overwrite an existing saved draft on mount.
- Drafts are isolated by user id.
- Independent state values restore correctly:
  - `noEarlyEntry`
  - `tableFree`
  - `chairFree`
  - `umbrellaFree`

Acceptance gate:

- Targeted autosave tests pass.
- Existing role/security tests still pass.
- `npm.cmd run build` passes.

### Phase 2: Split Initial Role Loading From Background Refresh

Goal: avoid unmounting the protected app when role state is being refreshed after an already-resolved role exists.

This should be treated as an auth/role architecture change, not a UI-only change.

Implementation direction:

- Introduce a shared role state layer, preferably a `RoleProvider`, under `AuthProvider`.
- Make `RoleGuard`, `SyncProvider`, `BottomNavigation`, and pages consume the same role snapshot instead of each creating independent `useUserRole()` state.
- Split role load state into at least:
  - `isInitialLoading`: no usable current role snapshot exists yet.
  - `isRefreshing`: a previous role snapshot exists, and the app is validating freshness in the background.
  - `roleError`: role refresh failed or role state cannot be trusted.
- `RoleGuard` should only replace children with a blocking fallback during `isInitialLoading` or hard `roleError`.
- During `isRefreshing`, keep children mounted.

Critical safety rule:

Keeping children mounted during refresh does not mean keeping full permissions active.

During `isRefreshing`, privileged behavior must remain fail-closed:

- `canEdit=false`
- `canViewSensitiveData=false`
- owner-only actions disabled
- `deriveSafeInfoLevel(...)` should return `0` or an explicitly safe refreshing level
- sync should either pause or use the lowest safe info level

Important design detail:

The UI may remain visible to preserve user input, but sensitive actions and data access must be gated by the refreshed permission snapshot. Do not use stale owner permissions for writes or sensitive reads during refresh.

Suggested tests:

- Initial unknown role still blocks protected route rendering.
- Background refresh with existing role keeps route children mounted.
- Background refresh disables owner-only actions.
- Background refresh uses safe info level `0` for sync/data sanitization.
- Role refresh success restores normal role permissions.
- Role refresh error fails closed and surfaces a visible blocked or limited state.
- Existing stale async commit tests continue to pass.
- Bottom navigation still treats unresolved/refreshing role as staff-like for restricted areas such as analytics.

Acceptance gate:

- `tests/role-fail-closed.test.ts`
- `tests/p5-4b-role-cache-invalidation.test.ts`
- updated `tests/c2-28b-render-guard-static-audit.test.ts`
- new role refresh persistence tests
- `npm.cmd run build`

### Phase 3: Add Dirty-Form Navigation Guard

Goal: avoid accidental data loss when the user intentionally closes the form, navigates away, reloads, or accepts a PWA update.

This is a UX guard, not the primary data-protection mechanism. It must complement autosave.

Implementation requirements:

- Track whether `AddMarketForm` has meaningful unsaved data.
- Intercept high-risk exits first:
  - close button
  - backdrop click
  - browser reload/close via `beforeunload`
  - PWA update reload flow
- Show a simple choice:
  - keep draft
  - discard draft
- Keep draft should close or navigate while preserving session draft.
- Discard draft should clear the autosaved draft and reset local state.

Risks to avoid:

- Do not attempt a broad custom App Router navigation blocker unless needed. Next App Router cancellation is easy to make brittle.
- Do not block background auth/session handling.
- Do not show sensitive draft content in confirmation text.

Suggested tests:

- Dirty close asks for confirmation.
- Keep draft preserves draft and allows reopening.
- Discard draft clears draft.
- Successful submit bypasses dirty warning and clears draft.
- `beforeunload` guard is active only when form is dirty.

Acceptance gate:

- Targeted dirty-form tests pass.
- Existing add-market behavior remains unchanged after successful submit.
- `npm.cmd run build` passes.

## Security Review Checklist

Before shipping any phase:

- Loading or refreshing role state must not grant owner permissions.
- Staff users must not gain analytics, repair tools, owner-only market controls, or sensitive financial data while role state is unresolved.
- Sync must not run with stale owner-level `infoLevel` during role refresh.
- Drafts must be scoped to the authenticated user.
- Drafts must not be written to cloud, Dexie event tables, or backup/recovery flows.
- Account switch must not reveal another user's draft.
- Staff revoked / role invalidated paths must still trigger fail-closed behavior.

## Recommended First Implementation Slice

Start with Phase 1 only:

1. Add user-scoped draft save/load to `AddMarketForm`.
2. Add tests for restore, submit-clear, close-preserve, and user isolation.
3. Run targeted tests plus `npm.cmd run build`.

Reasoning:

- It directly prevents user input loss.
- It does not require changing auth, role, sync, or data permissions.
- It remains useful even after RoleProvider work, because browser tab discard or full reload can still happen.

After Phase 1 is stable, plan Phase 2 as a controlled auth/role safety slice with updated fail-closed guardrail tests.
