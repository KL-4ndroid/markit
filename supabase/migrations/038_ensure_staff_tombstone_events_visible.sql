-- ============================================================
-- Migration: 038_ensure_staff_tombstone_events_visible
-- Date: 2026-06-13
-- Purpose:
--   Ensure deal_deleted and interaction_deleted tombstone events
--   are explicitly included in staff_accessible_events so that
--   staff-side tombstone logic can correctly filter out
--   deleted deals after pulling from the view.
--
-- Background:
--   The existing view (030_fix_data_isolation.sql) has 4 UNION
--   branches using "e.*", which in theory includes all event
--   types including tombstones. However, the join path for
--   deal_deleted events (owner creates them with market_id =
--   market UUID) depends on market_members containing a row for
--   that market + owner combination.
--
--   This migration adds an explicit dedicated branch for
--   tombstone events, making the intent unambiguous and
--   resilient to edge cases in the market_members join chain.
--
-- Verification SQL (run as authenticated staff user):
--   SELECT type, COUNT(*)
--   FROM staff_accessible_events
--   WHERE market_id = 'YOUR_MARKET_UUID'
--   GROUP BY type;
--   -- Should show non-zero counts for deal_deleted and
--   -- interaction_deleted if tombstones exist for that market.
-- ============================================================

CREATE OR REPLACE VIEW staff_accessible_events AS

-- 1. Staff sees owner's market-scoped events (all types including tombstones)
SELECT
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' AS access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
  AND sr.status = 'active'

UNION ALL

-- 2. Staff sees owner's global events (market_id IS NULL, all types)
SELECT
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' AS access_type
FROM events e
JOIN staff_relationships sr ON sr.owner_id = e.actor_id
WHERE sr.staff_id = auth.uid()
  AND sr.status = 'active'
  AND e.market_id IS NULL

UNION ALL

-- 3. Owner sees own events (all types)
SELECT
  e.*,
  e.actor_id AS relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb AS permissions,
  'owner' AS access_type
FROM events e
WHERE e.actor_id = auth.uid()

UNION ALL

-- 4. Owner sees all events in own markets (all types, including tombstones
--    created by staff)
SELECT
  e.*,
  mm.user_id AS relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb AS permissions,
  'owner' AS access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
WHERE mm.user_id = auth.uid()
  AND e.actor_id != auth.uid();

-- ============================================================
-- Verification: Ensure deal_deleted is visible in the view
-- Run this as a staff user with an active relationship:
--
-- SELECT type, COUNT(*) AS cnt
-- FROM staff_accessible_events
-- WHERE type IN ('deal_deleted', 'interaction_deleted')
--   AND market_id = 'YOUR_MARKET_UUID'
-- GROUP BY type;
-- ============================================================
