-- Execute only after same-target preflight confirms version and name columns.
-- Metadata only: never export migration statements or application rows.
BEGIN;
SET TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
ROLLBACK;
