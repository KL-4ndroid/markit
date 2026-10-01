# Quick Test Database Bootstrap

Use these files only for a new or disposable Supabase test project. Do not run
them on production or on a database that already contains real user data.

## Files

- `quick_test_database_preflight.sql`
  - Run this first if a previous bootstrap attempt failed.
  - It tells you whether core tables such as `markets`, `events`,
    `staff_relationships`, and `pending_operations` exist.

- `quick_test_database_schema_001_052_recommended.sql`
  - Recommended one-shot schema bootstrap.
  - Generated from mainline migrations `001_` through `052_`, plus the required
    `20240220_staff_system_simple.sql` foundation before `021_` because
    `021_auto_add_staff_to_markets.sql` already depends on `staff_relationships`.
  - Excludes `20240220_add_staff_roles.sql` and rollback scripts.
  - Removes non-functional `COMMENT ON` statements and `RAISE NOTICE` output to
    reduce SQL Editor bootstrap failures.

- `quick_test_database_schema_fresh_v2.sql`
  - Same content as the recommended one-shot schema bootstrap, but with a new
    filename to avoid accidentally pasting an older cached SQL Editor tab.

- `quick_test_database_phase_1_core_001_020.sql`
- `quick_test_database_phase_2_staff_foundation_021_035.sql`
- `quick_test_database_phase_3_staff_hardening_037_046_v6.sql`
- `quick_test_database_phase_4_field_ops_pending_047_052.sql`
  - Recommended if SQL Editor struggles with the one-shot file.
  - Run these four files in order on a fresh/reset test project.
  - Stop immediately if any phase fails, and do not continue to later phases.

- `quick_test_database_compat_sync_status_columns.sql`
  - Compatibility patch for disposable bootstrap only.
  - Use it if phase 2 fails with `column "sync_status" does not exist`.

- `quick_test_database_schema_001_052.sql`
  - Full traceable concat version.
  - Keep as reference, but prefer the recommended file above.

- `quick_test_database_recover_after_staff_relationships_error_v2.sql`
  - Use this only if the first bootstrap failed with:
    `relation "staff_relationships" does not exist`.
  - It creates the missing staff relationship foundation, then resumes from
    migration `021_` through `052_`.

- `quick_test_database_recover_after_staff_relationships_error.sql`
  - Superseded by the `_v2` file above. Do not use this older recovery file.

- `quick_test_seed_owner_market_checklist.sql`
  - Run after creating one Supabase Auth owner user.
  - Creates profile, market, owner membership, one checklist item, and one field
    note event.

## Execution Order For A Fresh Or Reset Test Project

1. Open Supabase Dashboard for the new test project.
2. Go to SQL Editor.
3. Prefer the phased bootstrap:
   - Run `quick_test_database_phase_1_core_001_020.sql`
   - Run `quick_test_database_phase_2_staff_foundation_021_035.sql`
   - Run `quick_test_database_phase_3_staff_hardening_037_046_v6.sql`
   - Run `quick_test_database_phase_4_field_ops_pending_047_052.sql`
4. If you intentionally want one paste instead, run
   `quick_test_database_schema_fresh_v2.sql`.
5. Go to Authentication > Users and create one test owner user.
6. Copy the new Auth user's UUID.
7. Open `quick_test_seed_owner_market_checklist.sql`.
8. Replace:
   - `<OWNER_AUTH_USER_ID>`
   - `<OWNER_EMAIL>`
9. Paste and run the seed SQL.
10. Copy the returned:
   - `owner_profile_id`
   - `market_id`
   - `checklist_item_id`
   - `field_note_id`

## Recovery If You Already Hit `staff_relationships` Error

If SQL Editor stopped with:

```text
relation "staff_relationships" does not exist
```

first run `quick_test_database_preflight.sql`.

If `has_markets = true` and `has_staff_relationships = false`:

1. Go to SQL Editor.
2. Paste and run `quick_test_database_recover_after_staff_relationships_error_v2.sql`.
3. If it succeeds, continue from the Auth owner creation and seed steps above.

If the recovery file fails with:

```text
relation "markets" does not exist
```

the earlier failed bootstrap did not leave the core schema behind. Treat the
database as empty or partially rolled back, then use the full corrected bootstrap:

1. Prefer resetting this disposable test project/database if any partial objects
   were created.
2. Run `quick_test_database_schema_fresh_v2.sql`.
3. Continue from the Auth owner creation and seed steps above.

## If SQL Editor Fails

Copy the first error message, the line number, and which file you were running.
Do not continue to the seed step until the schema step succeeds.

If phase 2 fails with:

```text
column "sync_status" does not exist
```

run:

```text
quick_test_database_compat_sync_status_columns.sql
```

Then rerun:

```text
quick_test_database_phase_2_staff_foundation_021_035.sql
```

If the old phase 3 file fails with:

```text
cannot change name of view column
```

run the corrected phase 3 file instead:

```text
quick_test_database_phase_3_staff_hardening_037_046_v4.sql
```

If phase 3 fails with:

```text
relation "v_owner_id" does not exist
```

run:

```text
quick_test_database_phase_3_staff_hardening_037_046_v6.sql
```

If phase 3 fails with:

```text
operator does not exist: text = boolean
```

run:

```text
quick_test_database_phase_3_staff_hardening_037_046_v4.sql
```
