-- BoothBook / Markit quick test database preflight
-- Run this before choosing a bootstrap/recovery file.
--
-- Decision guide:
--   has_markets = false
--     The earlier failed bootstrap did not leave the core schema behind.
--     Use quick_test_database_schema_001_052_recommended.sql on a fresh/reset
--     test database.
--
--   has_markets = true and has_staff_relationships = false
--     The database has 001-021 core schema but is missing staff foundation.
--     Use quick_test_database_recover_after_staff_relationships_error.sql.
--
--   has_markets = true and has_staff_relationships = true
--     Do not rerun broad bootstrap blindly. Check has_pending_operations and
--     share this output if later migrations are still missing.

select
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) as has_profiles,
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'markets'
  ) as has_markets,
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'events'
  ) as has_events,
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'staff_relationships'
  ) as has_staff_relationships,
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'pending_operations'
  ) as has_pending_operations;

select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;
