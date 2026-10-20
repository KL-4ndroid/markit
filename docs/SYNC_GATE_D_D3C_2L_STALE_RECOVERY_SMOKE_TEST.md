# Féria Sync Gate D3c-2l Stale Processing Recovery Smoke Test

Created: 2026-06-22
Status: manual verification plan and guarded script only; no automatic execution

## 0. Purpose

This document verifies the D3c-2k owner-confirmed one-row stale `processing` recovery action.

The verification target must be disposable or non-production data. Do not use a business-critical pending operation.

## 1. Scope

This smoke test may:
- sign in as a normal authenticated owner;
- read one specified `pending_operations` row;
- verify it is `status = 'processing'`;
- verify it is stale by the 15-minute threshold;
- call `recover_stale_processing_pending_operation` for that one operation id;
- read the row again and confirm the final status matches the RPC result.

This smoke test must not:
- create pending operations;
- create events;
- call `drain_checklist_toggle_pending_operation`;
- call `enqueue_checklist_toggle_pending_operation`;
- directly insert, update, upsert, or delete table rows;
- use service-role credentials;
- run as batch recovery;
- run from `npm test` or package scripts.

## 2. Required Target

Choose exactly one stale row:
- `pending_operations.operation_id`
- `status = 'processing'`
- `updated_at < now() - interval '15 minutes'`
- market owned by the signed-in owner account
- disposable or non-production

Read-only SQL to find a target:

```sql
select
  operation_id,
  operation_type,
  entity_type,
  entity_id,
  market_id,
  status,
  actor_id,
  retry_count,
  updated_at,
  last_error_code,
  last_error_message
from public.pending_operations
where status = 'processing'
  and updated_at < now() - interval '15 minutes'
order by updated_at asc
limit 20;
```

If no row exists, stop. Do not create a fake production row without a separate decision.

## 3. Script

Script:

```text
scripts/gate-d-stale-processing-recovery-smoke.mjs
```

It is intentionally not wired to `package.json`.

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GATE_D_STALE_RECOVERY_TARGET=local | staging | production-disposable
GATE_D_STALE_RECOVERY_CONFIRM=D3c-2l recover one stale processing pending operation
GATE_D_STALE_RECOVERY_EMAIL=<owner email>
GATE_D_STALE_RECOVERY_PASSWORD=<owner password>
GATE_D_STALE_RECOVERY_OPERATION_ID=<operation id>
```

For `production-disposable`, also set:

```text
GATE_D_STALE_RECOVERY_PRODUCTION_CONFIRM=I am using a disposable stale processing pending operation
```

Run manually:

```powershell
npm.cmd exec -- node scripts/gate-d-stale-processing-recovery-smoke.mjs
```

Expected output:

```text
[gate-d-stale-recovery] PASS stale processing recovery verified.
```

## 4. Supabase Verification

After the script runs:

```sql
select
  operation_id,
  status,
  retry_count,
  updated_at,
  last_error_code,
  last_error_message
from public.pending_operations
where operation_id = '<operation_id>';
```

Allowed final statuses:
- `synced`
- `failed_permanent`
- `failed_retryable`

Check final-event evidence. This query is safe even if the operation id is not a UUID:

```sql
select
  po.operation_id,
  po.status,
  e.id as final_event_id,
  e.type as final_event_type,
  e.actor_id as final_event_actor_id,
  e.market_id as final_event_market_id,
  e.metadata as final_event_metadata
from public.pending_operations po
left join public.events e
  on po.operation_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and e.id = po.operation_id::uuid
where po.operation_id = '<operation_id>';
```

The recovery RPC must not create a new event. If an event exists, it should have existed before recovery and be the final-event evidence used by the RPC.

## 5. Stop Conditions

Stop and inspect manually if:
- target row is not `processing`;
- target row is newer than 15 minutes;
- signed-in user is not the owner of the row's market;
- RPC returns an unexpected status;
- row status after recovery does not match the RPC result;
- Supabase returns permission errors.

## 6. Rollback

This smoke test changes one pending row state. There is no generic rollback.

If the target was not disposable, stop and inspect before attempting any correction.
