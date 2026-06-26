-- BoothBook / Markit quick test database compatibility patch
--
-- Why this exists:
-- Historical migrations and runtime code reference sync_status on read models,
-- but the current migration archive does not explicitly add that column before
-- migration 034 creates idx_events_sync_status.
--
-- Run this only for disposable test database bootstrap when rebuilding schema
-- from the archived SQL files.

alter table if exists public.events
add column if not exists sync_status text default 'synced';

alter table if exists public.markets
add column if not exists sync_status text default 'synced';

alter table if exists public.products
add column if not exists sync_status text default 'synced';

create index if not exists idx_markets_sync_status
on public.markets(sync_status);

create index if not exists idx_products_sync_status
on public.products(sync_status);
