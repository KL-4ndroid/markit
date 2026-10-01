# Féria Sync Gate D3c-2m Synthetic Stale Processing Recovery Test Plan

Created: 2026-06-22
Status: staging/local test plan only; no production execution, runtime code, migration, RLS, worker, retry, drain, or cleanup action is approved

## 0. Purpose

This document defines the safest way to verify stale `processing` recovery when production has no natural disposable stale row.

Best decision:
- Do not manufacture stale `processing` rows in production.
- Use only local Supabase or staging Supabase.
- Test the missing-final-event recovery path first because it mutates only one synthetic `pending_operations` row and does not create an `events` row.

## 1. Approved Scope

D3c-2m approves a plan for one synthetic fixture path:
- target environment: `local` or `staging` only;
- target row: one synthetic `pending_operations` row;
- initial state: `status = 'processing'`;
- initial age: `updated_at < now() - interval '15 minutes'`;
- final-event state: no matching `events` row exists;
- manual recovery call: use the existing D3c-2l guarded smoke script;
- expected result: RPC returns `failed_retryable`;
- expected row state: `status = 'failed_retryable'`, `last_error_code = 'stale_processing_reset'`, `retry_count` increments by 1.

This plan does not approve:
- production synthetic data;
- production SQL insert/update;
- production service-role usage;
- creation of synthetic `events` rows;
- final-event collision fixtures;
- matching-final-event fixtures;
- retry/drain after recovery;
- batch recovery;
- cleanup/delete automation;
- runtime or UI changes.

## 2. Required Environment

Use one of:
- Local Supabase with migrations 048 through 052 applied.
- Staging Supabase with migrations 048 through 052 applied.

Do not use:
- the production Supabase project;
- production user data;
- production market ids;
- production checklist item ids.

The owner account used by the smoke script must own the staging/local market used by the fixture.

## 3. Fixture Data Requirements

Required existing staging/local records:
- one `profiles.id` for the owner account;
- one `markets.id` owned by that profile;
- one disposable checklist item id represented in the app's event-sourced checklist data.

The synthetic `pending_operations` row must use:
- `operation_type = 'checklist_item_toggle'`;
- `entity_type = 'checklist_item'`;
- `entity_id = <checklist_item_id>`;
- `market_id = <staging_or_local_market_id>`;
- `actor_id = <owner_profile_id>`;
- `payload.market_id = <same market id as text>`;
- `payload.itemId = <same checklist item id>`;
- `payload.completed = true` or `false`;
- `status = 'processing'`;
- `updated_at` at least 15 minutes in the past;
- a unique `idempotency_key`.

## 4. Preflight SQL

Run only in local/staging:

```sql
select
  m.id as market_id,
  m.owner_id,
  p.email
from public.markets m
join public.profiles p
  on p.id = m.owner_id
where m.id = '<staging_or_local_market_id>';
```

Confirm:
- `owner_id` matches the account that will sign in for the smoke script;
- the market and checklist item are disposable test data;
- the database is local/staging, not production.

## 5. Synthetic Row Creation SQL

Run only in local/staging. Replace every placeholder before execution.

```sql
begin;

insert into public.pending_operations (
  operation_id,
  operation_type,
  entity_type,
  entity_id,
  market_id,
  payload,
  idempotency_key,
  actor_id,
  role_snapshot,
  status,
  retry_count,
  last_error_code,
  last_error_message,
  created_at,
  updated_at
)
values (
  gen_random_uuid()::text,
  'checklist_item_toggle',
  'checklist_item',
  '<staging_or_local_checklist_item_id>',
  '<staging_or_local_market_id>'::uuid,
  jsonb_build_object(
    'market_id', '<staging_or_local_market_id>',
    'itemId', '<staging_or_local_checklist_item_id>',
    'completed', false
  ),
  'd3c-2m-synthetic-stale:' || gen_random_uuid()::text,
  '<staging_or_local_owner_profile_id>'::uuid,
  jsonb_build_object(
    'isOwner', true,
    'staffRole', null,
    'capabilities', jsonb_build_array('canToggleChecklistItem')
  ),
  'processing',
  0,
  null,
  null,
  now() - interval '20 minutes',
  now() - interval '20 minutes'
)
returning
  operation_id,
  operation_type,
  entity_type,
  entity_id,
  market_id,
  actor_id,
  status,
  retry_count,
  updated_at;

commit;
```

Copy the returned `operation_id`.

## 6. No Final Event Check

Run only in local/staging before the smoke script:

```sql
select
  po.operation_id,
  po.status,
  e.id as final_event_id
from public.pending_operations po
left join public.events e
  on po.operation_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and e.id = po.operation_id::uuid
where po.operation_id = '<operation_id>';
```

Expected:
- `status = 'processing'`;
- `final_event_id is null`.

## 7. Manual Smoke Execution

Run the existing D3c-2l script only against local/staging:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL='<local_or_staging_url>'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='<local_or_staging_anon_key>'
$env:GATE_D_STALE_RECOVERY_TARGET='local'
$env:GATE_D_STALE_RECOVERY_CONFIRM='D3c-2l recover one stale processing pending operation'
$env:GATE_D_STALE_RECOVERY_EMAIL='<owner_email>'
$env:GATE_D_STALE_RECOVERY_PASSWORD='<owner_password>'
$env:GATE_D_STALE_RECOVERY_OPERATION_ID='<operation_id>'

npm.cmd exec -- node scripts/gate-d-stale-processing-recovery-smoke.mjs
```

For staging, use:

```powershell
$env:GATE_D_STALE_RECOVERY_TARGET='staging'
```

Do not use `production-disposable` for D3c-2m synthetic fixtures.

## 8. Expected Verification SQL

Run only in local/staging after the script:

```sql
select
  operation_id,
  status,
  retry_count,
  last_error_code,
  last_error_message,
  updated_at
from public.pending_operations
where operation_id = '<operation_id>';
```

Expected:
- `status = 'failed_retryable'`;
- `retry_count = 1`;
- `last_error_code = 'stale_processing_reset'`;
- `last_error_message = 'Stale processing operation reset to retryable without draining'`.

Confirm that no event was created:

```sql
select
  e.id,
  e.type,
  e.metadata
from public.events e
where '<operation_id>' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and e.id = '<operation_id>'::uuid;
```

Expected:
- no rows.

## 9. Cleanup

Cleanup is allowed only in local/staging:

```sql
delete from public.pending_operations
where operation_id = '<operation_id>'
  and idempotency_key like 'd3c-2m-synthetic-stale:%'
  and status = 'failed_retryable'
  and last_error_code = 'stale_processing_reset';
```

Do not add application cleanup code. Do not run cleanup in production.

## 10. Stop Conditions

Stop before running the script if:
- the environment is production;
- the target market is not disposable;
- the signed-in user is not the market owner;
- the row is not `processing`;
- the row is newer than 15 minutes;
- a matching final event already exists;
- the SQL requires service-role credentials in production.

Stop after running the script if:
- the RPC returns anything other than `failed_retryable`;
- a final event was created;
- more than one pending row changed;
- any production data was touched.

## 11. Future Work Not Approved

The following require separate approval:
- matching-final-event synthetic fixture that expects `synced`;
- event-id-collision synthetic fixture that expects `failed_permanent`;
- retry/drain action after reset to `failed_retryable`;
- owner UI retry button;
- batch worker;
- production synthetic verification.
