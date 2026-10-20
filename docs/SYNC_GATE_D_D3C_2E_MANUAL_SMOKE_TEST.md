# Féria Sync Gate D D3c-2e Manual Smoke Test

Created: 2026-06-21
Status: manual cloud smoke test completed once against disposable production checklist data; guarded script remains manual-only

Last verified: 2026-06-22 Asia/Taipei

Verification evidence:
- Target type: `production-disposable`
- Market id: `91af7db1-bab3-4d45-b2e3-95b07c268b9f`
- Checklist item id: `0747e758-2f39-4aa2-bf31-60eba3d24771`
- Operation id: `512d40e6-1192-45dd-ad03-3e437f3d562d`
- Result: `pending_operations.status = 'synced'`
- Final event: `checklist_item_updated`
- Final completed value: `false`
- Follow-up preflight: item remains active; only the synced audit row remains for this item.

## 0. Purpose

This document defines the manual smoke test for the checklist-toggle pending-operation path:

- `049_enqueue_checklist_toggle_pending_operation.sql`
- `050_drain_checklist_toggle_pending_operation.sql`

The smoke script verifies the cloud RPC path only. It does not replace the app runtime tests that prove local event write remains primary.

Run the read-only preflight before the write smoke test. The preflight checks the chosen target and does not write cloud data.

## 1. Safety Boundary

This smoke test is intentionally manual:

- It is not wired to `npm test`.
- It is not wired to any `package.json` script.
- It requires explicit confirmation text.
- It requires a real signed-in test user.
- It requires one disposable or non-production checklist item.
- It uses the anon key and refuses service-role-looking keys.
- It does not direct-write tables with insert, update, upsert, or delete.
- It calls only the approved 049/050 RPCs.

Still not approved:

- Turning `pendingOperationWriteRouting` on by default.
- Turning `pendingOperationDrainAfterEnqueue` on by default.
- Broad worker or automatic retry behavior.
- UI, RLS, migration, cache replacement, revenue, inventory, product, or market changes.

## 2. Required Inputs

Before running the script, choose one checklist item where changing the completed value is safe.

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GATE_D_SMOKE_TARGET`
- `GATE_D_SMOKE_CONFIRM`
- `GATE_D_SMOKE_EMAIL`
- `GATE_D_SMOKE_PASSWORD`
- `GATE_D_SMOKE_MARKET_ID`
- `GATE_D_SMOKE_CHECKLIST_ITEM_ID`
- `GATE_D_SMOKE_COMPLETED`

Allowed `GATE_D_SMOKE_TARGET` values:

- `local`
- `staging`
- `production-disposable`

Required confirmation:

```powershell
$env:GATE_D_SMOKE_CONFIRM='D3c-2e writes one checklist toggle pending operation'
```

If using `production-disposable`, this extra confirmation is required:

```powershell
$env:GATE_D_SMOKE_PRODUCTION_CONFIRM='I am using disposable production checklist data'
```

## 3. Command

### Read-Only Preflight

Run this first after filling the preflight inputs:

```powershell
$env:GATE_D_PREFLIGHT_TARGET='production-disposable'
$env:GATE_D_PREFLIGHT_CONFIRM='D3c-2e read-only preflight'
$env:GATE_D_PREFLIGHT_PRODUCTION_CONFIRM='I am checking disposable production checklist data'
$env:GATE_D_PREFLIGHT_EMAIL='test@example.com'
$env:GATE_D_PREFLIGHT_PASSWORD='password'
$env:GATE_D_PREFLIGHT_MARKET_ID='<market_id>'
$env:GATE_D_PREFLIGHT_CHECKLIST_ITEM_ID='<itemId>'

node .\scripts\gate-d-checklist-toggle-preflight.mjs
```

Expected preflight output:

```text
[gate-d-preflight] PASS read-only target validation completed.
```

### Write Smoke Test

Run this only after the read-only preflight passes:

```powershell
node .\scripts\gate-d-checklist-toggle-smoke.mjs
```

Expected success output:

```text
[gate-d-smoke] PASS pending operation synced and final checklist event verified.
```

## 4. What The Script Does

The script:

- signs in using `GATE_D_SMOKE_EMAIL` and `GATE_D_SMOKE_PASSWORD`;
- generates a new `operation_id`;
- calls `enqueue_checklist_toggle_pending_operation`;
- calls `drain_checklist_toggle_pending_operation`;
- reads the resulting `pending_operations` row;
- reads the resulting `events` row;
- verifies:
  - pending status is `synced`;
  - final event id equals operation id;
  - final event type is `checklist_item_updated`;
  - final event payload contains `market_id`, `itemId`, and `completed`;
  - final event payload does not contain checklist text;
  - actor and market match the signed-in test user and target market.

## 5. Manual Follow-Up Query

After the script passes, optionally verify in Supabase SQL editor using the printed `operation_id`:

```sql
select
  operation_id,
  operation_type,
  entity_type,
  entity_id,
  market_id,
  status,
  retry_count,
  last_error_code,
  last_error_message,
  updated_at
from public.pending_operations
where operation_id = '<operation_id>';
```

```sql
select
  id,
  type,
  payload,
  actor_id,
  market_id,
  metadata
from public.events
where id = '<operation_id>';
```

Expected:

- `pending_operations.status = 'synced'`
- `events.type = 'checklist_item_updated'`
- `events.payload->>'itemId'` matches the chosen checklist item
- `events.payload` has no `text` key

## 6. Rollback

There is no automatic rollback, because the smoke test intentionally verifies durable event creation.

If the chosen item was disposable, leave the generated pending row and event as audit evidence. If cleanup is required, make it a separate owner-approved data cleanup action. Do not add automatic deletion to this smoke test.

The 2026-06-22 verification left the generated synced pending row and matching event in place as audit evidence.

## 7. Stop Conditions

Stop and do not retry broadly if:

- enqueue fails with permission denied;
- drain returns `blocked_permission`;
- drain returns `failed_permanent`;
- final event exists but payload does not match;
- any non-disposable production item was selected by mistake.

In those cases, inspect the single printed `operation_id` before any further testing.
