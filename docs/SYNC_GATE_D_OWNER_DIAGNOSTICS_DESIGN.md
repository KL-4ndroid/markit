# BoothBook Sync Gate D Owner Diagnostics Design

Created: 2026-06-22
Status: design and guardrail plan only; no runtime, UI, RPC, RLS, or worker implementation is approved by this document

## 0. Purpose

This document defines the safety contract for a future owner-only diagnostics surface for `pending_operations`.

The goal is observability, not repair:
- Let the owner inspect whether pending-operation delivery is healthy.
- Make blocked or failed rows understandable.
- Keep the existing event model as the source of truth.
- Prevent diagnostics from becoming an unreviewed drain, retry, cleanup, or worker path.

## 1. Current Context

Completed before this design:
- `048_add_pending_operations_schema.sql` created `pending_operations`.
- `049_enqueue_checklist_toggle_pending_operation.sql` added the narrow checklist-toggle enqueue RPC.
- `050_drain_checklist_toggle_pending_operation.sql` added the narrow single-operation drain RPC.
- D3c-2e completed one manual cloud smoke verification:
  - operation id `512d40e6-1192-45dd-ad03-3e437f3d562d`
  - status `synced`
  - final event `checklist_item_updated`

Still default-off:
- `pendingOperationWriteRouting`
- `pendingOperationDrainAfterEnqueue`

Still not approved:
- Any broad worker.
- Any production flag default change.
- Any cache replacement execute behavior.
- Any staff diagnostics inbox.
- Any owner UI that can mutate pending rows.

## 2. Recommendation

Recommended next implementation slice:
- Add an owner-only read diagnostics design first.
- If implemented later, prefer a read-only SECURITY DEFINER RPC or owner-scoped view over direct client table access.
- Keep all mutation actions out of the first diagnostics UI.

Why this is the safest next step:
- A successful smoke test proves the narrow enqueue/drain path once, but it does not prove broad operational handling.
- Diagnostics gives the owner visibility before adding retry, worker, or recovery behavior.
- Read-only observability can be rolled back by hiding the UI or removing the read path.
- It does not alter staff capabilities, event replay, sync cursors, local cache, revenue, inventory, products, or markets.

## 3. Approved Diagnostic Scope

First diagnostics scope may display:
- `operation_id`
- `operation_type`
- `entity_type`
- `entity_id`
- `market_id`
- `status`
- `retry_count`
- `actor_id`
- `created_at`
- `updated_at`
- `last_error_code`
- `last_error_message`
- safe metadata keys:
  - `source`
  - `idempotencyKey`
  - `pendingOperationId`
  - `drainedAt`

First diagnostics scope may derive:
- age bucket
- terminal state
- retryable state
- blocked-permission state
- missing final-event warning for rows that should have a final event
- final-event mismatch warning only as a read-only warning

First diagnostics scope must not expose:
- full arbitrary payload JSON by default
- checklist text for future checklist text operations
- field note body text
- revenue, cost, profit, product cost, supplier, booth cost, or owner finance
- staff private profile data beyond actor id or display name already safe for owner

## 4. Status Classification

Diagnostics may group rows into:
- Healthy:
  - `synced`
- Needs attention:
  - `failed_retryable`
  - `blocked_permission`
  - `failed_permanent`
- In progress:
  - `pending`
  - `processing`

Important rule:
- The diagnostics surface must not treat `pending`, `processing`, `failed_retryable`, `blocked_permission`, or `failed_permanent` as durable business events.
- The durable business record remains the final `events` row.

## 5. Owner-Only Access Model

The first read path must be owner-only.

Allowed approaches for a future implementation:

### Option A: SECURITY DEFINER read RPC

Recommendation:
- Prefer this for the first implementation.

Shape:
- `public.list_owner_pending_operation_diagnostics(p_owner_id UUID default auth.uid())`

Rules:
- Caller must be authenticated.
- Caller can only read rows for markets they own.
- Staff cannot call the RPC successfully, including manager and operator.
- The RPC returns an explicit column list, not `select *`.
- The RPC redacts or omits payload by default.

### Option B: Owner-scoped view

Acceptable later if reviewed:
- A view can be used only if security mode and RLS interaction are audited.
- The view must expose an explicit column list.
- The view must not become a staff-accessible view.

### Option C: Direct client table read

Recommendation:
- Do not choose first.

Reason:
- It depends on table RLS remaining perfectly aligned with diagnostics needs.
- It tempts UI code to query broader columns than needed.
- It makes future payload redaction harder to enforce centrally.

## 6. Prohibited In First Diagnostics Slice

The first diagnostics slice must not:
- call `drain_checklist_toggle_pending_operation`
- call `enqueue_checklist_toggle_pending_operation`
- update `pending_operations`
- delete `pending_operations`
- insert into `events`
- retry operations
- reset `processing` rows
- mark rows abandoned
- create a batch worker
- expose service role credentials
- read or mutate local IndexedDB cache
- change sync cursors
- change event replay or projection logic
- add staff-visible diagnostics UI
- add toast spam for background delivery failures

## 7. Recovery And Repair Boundary

Diagnostics can recommend next steps, but it must not execute them.

Future repair actions must be separate approval slices:
- retry one `failed_retryable` row
- reset stale `processing` rows
- abandon one bad row
- owner-acknowledge a `blocked_permission` row
- cleanup disposable smoke-test rows

Each repair action must have:
- explicit owner confirmation
- one-row scope first
- idempotency checks
- audit evidence
- rollback or no-rollback statement
- static tests proving it is not wired to broad automation

## 8. Suggested UI Placement

Recommended placement for a future UI:
- owner-only `/recovery` diagnostic panel, not staff market detail

Reason:
- `/recovery` already represents owner maintenance behavior.
- It avoids adding sync internals to ordinary market-detail workflows.
- Staff routes already intentionally avoid owner-only repair tools.

First UI should be read-only:
- table or compact list
- filters by status and market
- copy operation id
- link to a manual SQL inspection guide
- no retry, drain, delete, or cleanup buttons

## 9. Observability Queries

Read-only SQL for manual inspection:

```sql
select
  operation_id,
  operation_type,
  entity_type,
  entity_id,
  market_id,
  status,
  retry_count,
  actor_id,
  created_at,
  updated_at,
  last_error_code,
  last_error_message
from public.pending_operations
where status in (
  'pending',
  'processing',
  'failed_retryable',
  'failed_permanent',
  'blocked_permission'
)
order by updated_at desc
limit 100;
```

Manual event match check:

```sql
select
  po.operation_id,
  po.status,
  e.id as final_event_id,
  e.type as final_event_type,
  e.metadata
from public.pending_operations po
left join public.events e
  on e.id = po.operation_id::uuid
where po.operation_id = '<operation_id>';
```

These queries are for manual diagnostics only. They do not approve application code to issue broad reads.

## 10. Rollback

If a future diagnostics UI is implemented and causes confusion:
- hide the owner-only panel;
- keep `pending_operations` rows untouched;
- keep feature flags default-off;
- keep existing event-sourced UI behavior unchanged.

Do not drop `pending_operations` while rows exist unless rows are exported, drained, or explicitly abandoned through a separate owner-approved cleanup plan.

## 11. Next Approval Boundary

This document approves no implementation by itself.

The next high-risk decision is choosing one implementation slice:
- D3c-2f: owner-only read RPC draft for diagnostics
- D3c-2g: read-only owner diagnostics UI shell
- D3c-2h: stale `processing` recovery design

Recommended next slice:
- D3c-2f owner-only read RPC draft, with static SQL tests and no UI/runtime caller.

