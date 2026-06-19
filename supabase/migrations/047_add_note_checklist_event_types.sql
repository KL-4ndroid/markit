-- Migration: 047_add_note_checklist_event_types
-- Date: 2026-06-20
-- Purpose:
--   Allow market-scoped Field notes and Checklist events to sync to Supabase.
--
-- Safety notes:
--   - This migration only updates the events.type CHECK constraint.
--   - It does not change RLS policies.
--   - It does not widen staff base-table SELECT access.
--   - staff_accessible_events already exposes market-scoped events through
--     the events -> markets -> staff_relationships branch.

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_type_check;

ALTER TABLE public.events ADD CONSTRAINT events_type_check CHECK (
  type IN (
    -- Market events
    'market_created',
    'market_updated',
    'market_status_changed',
    'market_started',
    'market_ended',
    'market_deleted',

    -- Product events
    'product_created',
    'product_updated',
    'product_deleted',

    -- Interaction and deal events
    'interaction_recorded',
    'interaction_deleted',
    'deal_closed',
    'deal_deleted',

    -- Field notes
    'field_note_created',
    'field_note_updated',
    'field_note_deleted',

    -- Checklist
    'checklist_item_created',
    'checklist_item_updated',
    'checklist_item_deleted',

    -- Settings
    'settings_updated'
  )
);

COMMENT ON CONSTRAINT events_type_check ON public.events IS
  'Allowed event types, including market-scoped field note and checklist events added in migration 047.';

