-- BoothBook / Markit quick test seed
-- Run this only AFTER:
--   1. quick_test_database_schema_001_052_recommended.sql has completed.
--   2. You created one test owner in Supabase Dashboard > Authentication > Users.
--   3. You copied that Auth user's UUID.
--
-- Edit these two placeholders before running:
--   <OWNER_AUTH_USER_ID>
--   <OWNER_EMAIL>
--
-- This creates:
--   - public.profiles row for the owner, if missing
--   - one test market
--   - owner market_members row
--   - one checklist_item_created event
--   - one field_note_created event
--
-- It returns owner_profile_id, market_id, checklist_item_id, and field_note_id.

with params as (
  select
    '<OWNER_AUTH_USER_ID>'::uuid as owner_id,
    '<OWNER_EMAIL>'::text as owner_email,
    gen_random_uuid() as market_id,
    gen_random_uuid()::text as checklist_item_id,
    gen_random_uuid()::text as field_note_id
),
upsert_profile as (
  insert into public.profiles (
    id,
    email,
    display_name
  )
  select
    owner_id,
    owner_email,
    'D3c Test Owner'
  from params
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = excluded.display_name,
    updated_at = now()
  returning id
),
insert_market as (
  insert into public.markets (
    id,
    owner_id,
    name,
    location,
    start_date,
    end_date,
    status,
    operating_start_time,
    operating_end_time,
    check_in_time,
    notes
  )
  select
    market_id,
    owner_id,
    'D3c Staging Test Market',
    'Staging Test Location',
    current_date,
    current_date,
    'registered',
    '11:00'::time,
    '18:00'::time,
    '10:30'::time,
    'Seeded for D3c checklist / field note / pending operation tests.'
  from params
  returning id
),
insert_owner_member as (
  insert into public.market_members (
    market_id,
    user_id,
    role
  )
  select
    market_id,
    owner_id,
    'owner'
  from params
  on conflict (market_id, user_id) do update
  set role = excluded.role
  returning market_id, user_id
),
insert_checklist_event as (
  insert into public.events (
    id,
    type,
    payload,
    actor_id,
    market_id,
    timestamp,
    metadata
  )
  select
    gen_random_uuid(),
    'checklist_item_created',
    jsonb_build_object(
      'market_id', market_id,
      'itemId', checklist_item_id,
      'text', 'D3c staging checklist item',
      'completed', false
    ),
    owner_id,
    market_id,
    now(),
    jsonb_build_object(
      'source', 'quick_test_seed',
      'purpose', 'd3c_checklist_pending_operation_test'
    )
  from params
  returning id
),
insert_field_note_event as (
  insert into public.events (
    id,
    type,
    payload,
    actor_id,
    market_id,
    timestamp,
    metadata
  )
  select
    gen_random_uuid(),
    'field_note_created',
    jsonb_build_object(
      'market_id', market_id,
      'noteId', field_note_id,
      'text', 'D3c staging field note: owner/manager can edit; operator/viewer should read only.'
    ),
    owner_id,
    market_id,
    now(),
    jsonb_build_object(
      'source', 'quick_test_seed',
      'purpose', 'field_notes_checklist_ui_test'
    )
  from params
  returning id
)
select
  params.owner_id as owner_profile_id,
  params.market_id,
  params.checklist_item_id,
  params.field_note_id,
  insert_checklist_event.id as checklist_created_event_id,
  insert_field_note_event.id as field_note_created_event_id
from params
cross join insert_checklist_event
cross join insert_field_note_event;

-- Optional verification after the seed returns ids:
--
-- select id, email, display_name
-- from public.profiles
-- where id = '<OWNER_AUTH_USER_ID>'::uuid;
--
-- select id, owner_id, name, location, start_date, end_date
-- from public.markets
-- where owner_id = '<OWNER_AUTH_USER_ID>'::uuid
-- order by created_at desc
-- limit 5;
--
-- select id, type, payload, actor_id, market_id, created_at, metadata
-- from public.events
-- where market_id = '<RETURNED_MARKET_ID>'::uuid
-- order by created_at desc;
