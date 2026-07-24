# P5 Field Notes / Checklist Shared Execution Plan

Date: 2026-06-19

Status: implemented through Phase 7 on 2026-06-20; Phase 8 verification/docs is in progress in the final rollout commit.

Implemented commits:

- `3975221 docs(staff): add note checklist execution plan`
- `20ffd51 fix(events): support note and checklist event types`
- `aa829e5 fix(supabase): allow note and checklist events`
- `bcf522c feat(staff): refine note and checklist permissions`
- `d8c95f5 feat(markets): separate checklist toggle from management`
- `f0d6fa7 refactor(markets): make note and checklist panels reusable`
- `1ff4f32 feat(staff): wire shared note and checklist permissions`
- `aba884e feat(owner): show market notes and checklist`

Production Supabase note: migration `047_add_note_checklist_event_types.sql` has been added to source control only. Applying it to production remains a manual gate.

## 0. Goal

Make Field notes and Checklist stable, sync-safe, and shared between owner and staff market detail views.

Target user workflow:

- Manager adds market-specific checklist items for a market session.
- Operator can see checklist items and toggle completed / incomplete, but cannot edit item text or delete items.
- Viewer can see checklist items but cannot operate them.
- Manager adds field notes to tell staff what to pay attention to for that market session.
- Operator and viewer can read field notes only.
- Owner can see and manage the same Field notes and Checklist data created by managers.

This plan must keep sensitive owner-only surfaces protected:

- Do not merge the whole owner and staff market detail pages.
- Do not widen cost, profit, repair, import/export, market delete, product delete, or staff-management permissions.
- Do not touch deal/revenue/projection calculations except where tests require event type compatibility.
- Do not delete existing local events during rollout.

## 1. Current Problem Summary

The current Field notes / Checklist implementation is conceptually useful but incomplete.

Known gaps:

- `field_note_*` and `checklist_item_*` events are written through services, but they are not first-class `EventType` values in `types/db.ts`.
- Local integrity checks reject these events as unsupported, which can make market pages show database errors after a note/checklist write.
- Supabase `events_type_check` does not include these six event types, so cloud insert can fail during sync.
- Field note edit/delete currently piggybacks on own-record capabilities, which does not match the desired policy.
- Owner market detail UI does not currently render the staff-created notes/checklist panels.
- Staff UI currently shows Field notes to operator because own-record capabilities are true; desired behavior is read-only for operator.

## 2. Target Permission Matrix

| Role | Field notes read | Field notes create/edit/delete | Checklist read | Checklist create/edit/delete text | Checklist toggle |
|---|---:|---:|---:|---:|---:|
| owner | yes | yes | yes | yes | yes |
| manager | yes | yes | yes | yes | yes |
| operator | yes | no | yes | no | yes |
| viewer | yes | no | yes | no | no |

Policy notes:

- Owner has the same Field notes / Checklist powers as manager.
- Operator toggle writes must be allowed without granting checklist text edit/delete.
- Viewer is read-only for both features.
- Field notes are manager/owner-authored instructions; operator/viewer cannot create, edit, or delete them.

## 3. Architecture Direction

Keep route/page separation:

- Owner market detail remains the owner management surface.
- Staff market detail remains the staff operation surface.

Share feature components:

- `FieldNotesPanel` and `ChecklistPanel` become reusable panels controlled by explicit props.
- Panels must not infer owner/staff internally.
- Pages derive role/capabilities and pass precise permissions into the panels.

Event-sourced storage remains the source of truth:

- `getActiveFieldNotesForMarket(marketId)`
- `getActiveChecklistItemsForMarket(marketId)`
- `recordEvent(...)`

## 4. Phase Plan

### Phase 1: First-Class Event Type Support

Purpose: prevent local database health errors and make the event model honest.

Files likely touched:

- `types/db.ts`
- `lib/db/events.ts`
- `lib/db/integrity.ts`
- `tests/integrity.test.ts` or a new focused test
- `tests/p5-field-notes.test.ts`
- `tests/p5-checklist.test.ts`

Tasks:

- Add these event types to `EventType`:
  - `field_note_created`
  - `field_note_updated`
  - `field_note_deleted`
  - `checklist_item_created`
  - `checklist_item_updated`
  - `checklist_item_deleted`
- Add payload types to `EventPayloadMap`.
- Remove unnecessary `as EventType` casts where possible.
- Add payload validation in `validateEventPayload()`.
- Add integrity support in `EVENT_TYPES`.
- Add backup/integrity validation rules:
  - field note events require `market_id`, `noteId`; create/update require non-empty `text`.
  - checklist events require `market_id`, `itemId`; create/update text updates require non-empty `text`; toggle/update may include `completed`.
- Ensure replay readiness treats these events as market-scoped.

Acceptance criteria:

- A local `field_note_created` event passes `checkAppIntegrity(..., { profile: 'staff_scoped' })`.
- A local `checklist_item_created` event passes `checkAppIntegrity(..., { profile: 'staff_scoped' })`.
- `npm run lint` does not introduce new errors.
- Targeted tests pass.

Commit suggestion:

```text
fix(events): support note and checklist event types
```

### Phase 2: Supabase Event Type Migration

Purpose: make cloud sync accept the new market-scoped events.

Files likely touched:

- `supabase/migrations/047_add_note_checklist_event_types.sql` or next available migration number
- `tests` source-level migration test, if existing pattern supports it

Tasks:

- Drop and recreate `events_type_check` with all current event types plus:
  - `field_note_created`
  - `field_note_updated`
  - `field_note_deleted`
  - `checklist_item_created`
  - `checklist_item_updated`
  - `checklist_item_deleted`
- Confirm `staff_accessible_events` branch 1 already includes all market-scoped event types through `events e JOIN markets m ON m.id = e.market_id`.
- Do not widen base-table SELECT policies.
- Do not change INSERT policy unless actual testing shows RLS rejects manager/operator writes for these market-scoped events.

Acceptance criteria:

- Migration source includes all six new event types.
- Existing allowed event types remain allowed.
- No owner-only event type is accidentally added beyond the existing set.
- Staff still cannot direct SELECT base `events`; staff reads through `staff_accessible_events`.

Manual gate:

- This phase requires manual confirmation before applying migration to production Supabase.

Commit suggestion:

```text
fix(supabase): allow note and checklist events
```

### Phase 3: Permission Model Refinement

Purpose: match the desired role behavior exactly.

Files likely touched:

- `lib/permissions/role-capabilities.ts`
- `lib/permissions/role-freshness.ts`
- `components/staff/StaffPermissionCard.tsx`
- `app/debug/staff-role-test/page.tsx`
- `tests/role-capabilities.test.ts`
- `tests/p5-4e-p5-7-role-ui.test.ts`

Suggested capability shape:

- Keep `canManageChecklist` for create/edit/delete checklist text.
- Add `canToggleChecklistItem` for checkbox toggle.
- Add `canManageFieldNotes` or explicitly use `canCreateFieldNote` plus `canEditFieldNote` / `canDeleteFieldNote`.

Recommended minimal capability model:

```text
canManageFieldNotes
canManageChecklist
canToggleChecklistItem
```

Role mapping:

- owner: all true
- manager: all true
- operator: `canToggleChecklistItem=true`, notes/checklist management false
- viewer: all false

Freshness gate mapping:

- `field_note_created` -> `canManageFieldNotes`
- `field_note_updated` -> `canManageFieldNotes`
- `field_note_deleted` -> `canManageFieldNotes`
- `checklist_item_created` -> `canManageChecklist`
- `checklist_item_updated` needs special handling:
  - text edit/delete-level update -> `canManageChecklist`
  - completed-only toggle -> `canToggleChecklistItem`
- `checklist_item_deleted` -> `canManageChecklist`

Implementation note:

- To separate checklist toggle from text edit, the event payload should make update intent clear.
- Recommended shape:
  - text edit: payload includes `text`
  - toggle: payload includes only `completed`
  - mixed update with both `text` and `completed` requires `canManageChecklist`

Acceptance criteria:

- Operator can pass freshness gate for completed-only checklist update.
- Operator fails freshness gate for checklist create/text update/delete.
- Operator fails freshness gate for all field note writes.
- Manager passes all field note/checklist writes.
- Viewer fails all writes.

Commit suggestion:

```text
feat(staff): refine note and checklist permissions
```

### Phase 4: Service-Level Safety

Purpose: make service APIs enforce intent even if UI props are wrong.

Files likely touched:

- `lib/markets/field-notes.ts`
- `lib/markets/checklist.ts`
- tests for these services

Tasks:

- Field notes:
  - Manager/owner create/edit/delete through capability-gated events.
  - Remove operator own-note edit/delete path.
  - Keep read model unchanged.
- Checklist:
  - Keep create/edit text/delete in manager-only service paths.
  - Add a dedicated toggle function if needed:
    - `toggleChecklistItem(marketId, itemId, completed)`
  - Ensure toggle emits `checklist_item_updated` with `completed` only.

Acceptance criteria:

- Service tests prove a completed-only update payload is distinct from text edit.
- No service grants note write via own-record capability.
- Existing read functions continue to return active notes/items in timestamp order.

Commit suggestion:

```text
feat(markets): separate checklist toggle from management
```

### Phase 5: Shared Panel Component Props

Purpose: make panels reusable between owner and staff pages without embedding role logic inside the panels.

Files likely touched:

- `components/markets/FieldNotesPanel.tsx`
- `components/markets/ChecklistPanel.tsx`
- tests for panel source contracts

Target props:

```ts
type FieldNotesPanelProps = {
  marketId: string;
  canManage: boolean;
};

type ChecklistPanelProps = {
  marketId: string;
  canManage: boolean;
  canToggle: boolean;
};
```

UI behavior:

- Field notes:
  - Always show existing notes.
  - Show create/edit/delete only if `canManage`.
- Checklist:
  - Always show existing items.
  - Show create/edit text/delete only if `canManage`.
  - Enable checkbox toggle if `canToggle || canManage`.
  - Viewer sees disabled/read-only checkboxes.

Acceptance criteria:

- Panels do not import `useUserRole`.
- Panels do not check `staffRole` or `isOwner`.
- No hidden write button appears when permissions are false.
- Empty read-only states are professional and non-confusing.

Commit suggestion:

```text
refactor(markets): make note and checklist panels reusable
```

### Phase 6: Staff Market Detail Wiring

Purpose: implement desired staff behavior in the existing staff page.

Files likely touched:

- `components/markets/StaffMarketDetailView.tsx`
- `tests/p5-field-notes.test.ts`
- `tests/p5-checklist.test.ts`
- `tests/p5-market-detail-staff-route-gate.test.ts`

Tasks:

- Always render Field notes and Checklist for viewer/operator/manager staff detail views.
- Pass:
  - manager: `FieldNotesPanel canManage=true`; `ChecklistPanel canManage=true canToggle=true`
  - operator: `FieldNotesPanel canManage=false`; `ChecklistPanel canManage=false canToggle=true`
  - viewer: `FieldNotesPanel canManage=false`; `ChecklistPanel canManage=false canToggle=false`
- Keep existing transaction/revenue/deletion permissions unchanged.

Acceptance criteria:

- Viewer sees both panels with read-only state.
- Operator sees both panels, can only toggle checklist.
- Manager has full note/checklist controls.
- No cost/profit/repair/owner-only UI becomes visible to staff.

Commit suggestion:

```text
feat(staff): wire shared note and checklist permissions
```

### Phase 7: Owner Market Detail Wiring

Purpose: let owner see and manage manager-created notes/checklist in owner market detail UI.

Files likely touched:

- `app/markets/[id]/page.tsx`
- tests for owner market detail source contract

Tasks:

- Add shared panels to the owner market detail page.
- Pass owner permissions:
  - `FieldNotesPanel canManage=true`
  - `ChecklistPanel canManage=true canToggle=true`
- Place the panels in a low-sensitive section, preferably near operational information or transaction log, not near delete/repair/cost controls.
- Do not refactor the whole owner page.

Acceptance criteria:

- Owner detail page renders both panels.
- Owner can see events created by managers because read model reads market-scoped events.
- Owner can create/edit/delete/toggle.
- Existing owner functions keep working.

Commit suggestion:

```text
feat(owner): show market notes and checklist
```

### Phase 8: Verification And Rollout

Run targeted tests after each phase:

```text
npx tsx tests/role-capabilities.test.ts
npx tsx tests/p5-field-notes.test.ts
npx tsx tests/p5-checklist.test.ts
npx tsx tests/p5-market-detail-staff-route-gate.test.ts
npx tsx tests/event-deletion-service.test.ts
npx tsx tests/staff-event-preflight.test.ts
npm run lint
npm run build
```

Add tests as needed:

- integrity accepts all note/checklist event types
- role freshness allows operator checklist toggle only
- owner market detail includes shared panels
- migration source includes all six new event types

Manual QA checklist:

- Owner creates market.
- Manager creates field note.
- Manager creates checklist item.
- Operator sees note read-only.
- Operator toggles checklist item on/off.
- Operator cannot edit checklist text.
- Viewer sees note/checklist read-only.
- Owner sees manager-created note/checklist.
- Owner can edit/delete note and checklist item.
- Reload app after each write; no database health error appears.
- Trigger sync; no pending event gets stuck as unsupported event type.

## 5. Rollback Strategy

If a phase fails before migration:

- Revert UI exposure first.
- Keep service/read model changes only if tests remain green.

If migration has not been applied:

- Do not expose manager/operator writes in production.

If migration has been applied but UI has issues:

- Hide panels behind UI gates.
- Keep event type support; it is forward-compatible and should not corrupt data.

If local users already created unsupported events before Phase 1:

- Phase 1 should make those existing events valid.
- Avoid deleting local events.

## 6. High-Risk Decision Gates

Stop for user confirmation before:

- Applying Supabase migration to production.
- Changing RLS INSERT policy for `events`.
- Changing owner/staff page routing strategy.
- Deleting or transforming existing Field notes / Checklist events.
- Broadening any owner-only permission outside this feature.

## 7. Definition Of Done

The project goal is complete only when:

- Local integrity accepts note/checklist events.
- Supabase accepts note/checklist events.
- Owner and manager can manage both features.
- Operator can toggle checklist only.
- Viewer is read-only.
- Owner market detail sees manager-created data.
- Staff market detail exposes the correct role-specific controls.
- Reload/sync/build/lint all pass.
- Documentation is updated in `docs/staff-role-matrix.md` and `docs/staff-role-permissions.md`.
