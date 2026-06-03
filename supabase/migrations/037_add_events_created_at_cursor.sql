-- ============================================
-- Migration: 037_add_events_created_at_cursor
-- Date: 2026-06-03
-- ============================================
-- Purpose:
--   Add created_at column to events table to serve as a reliable sync cursor.
--
-- Design rationale:
--   - timestamp: Business event time, may be backfilled with historical dates
--     (e.g. deal_closed backfilled to 2026-05-23 while inserted today).
--     Using timestamp as sync cursor causes these events to be skipped
--     when lastSyncAt > timestamp, which is the root cause of owner sync miss.
--
--   - created_at: Cloud-side INSERT/write time. Always >= actual INSERT time
--     (PostgreSQL default NOW()). Cannot be backfilled to arbitrary historical
--     dates by design, making it a reliable cursor for incremental sync.
--
--   - Existing rows: Backfilled to migration time (NOW()) so that any events
--     previously missed due to the timestamp cursor bug will have
--     created_at > lastSyncAt, and will be re-discovered on the next sync.
--
--   - Replay ordering: All replay logic (pullAllEvents, pullIncrementalEvents)
--     continues to use ORDER BY timestamp ASC to preserve business chronology.
--     created_at is only used as a WHERE cursor filter, never for sorting.
-- ============================================

-- Step 1: Add column (nullable initially)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

-- Step 2: Backfill existing rows to NOW()
-- All existing rows get created_at = migration execution time.
-- This ensures they will be re-evaluated by the created_at cursor on next sync.
UPDATE public.events
SET created_at = NOW()
WHERE created_at IS NULL;

-- Step 3: Set default for future inserts
ALTER TABLE public.events
ALTER COLUMN created_at SET DEFAULT NOW();

-- Step 4: Enforce NOT NULL
ALTER TABLE public.events
ALTER COLUMN created_at SET NOT NULL;

-- Step 5: Create index for created_at > lastSyncAt queries
CREATE INDEX IF NOT EXISTS idx_events_created_at
ON public.events(created_at DESC);

-- ============================================
-- Verification queries (can be run manually)
-- ============================================

-- Check 1: created_at column exists
-- Expected: 1 row
-- SELECT 1 FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'events'
--   AND column_name = 'created_at';

-- Check 2: created_at NULL count = 0
-- Expected: 0
-- SELECT COUNT(*) FROM public.events WHERE created_at IS NULL;

-- Check 3: index idx_events_created_at exists
-- Expected: 1 row
-- SELECT 1 FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'events'
--   AND indexname = 'idx_events_created_at';

-- Check 4: Verify target market's deal_closed events have created_at
-- Expected: 2 rows with non-null created_at
-- SELECT id, type, market_id, timestamp, created_at
-- FROM public.events
-- WHERE market_id = '5bfb9ff4-15b3-4b5e-831c-d96439b4d0bb'
--   AND type = 'deal_closed';
