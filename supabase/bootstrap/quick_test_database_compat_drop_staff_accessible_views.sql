-- Féria quick test database compatibility patch
--
-- PostgreSQL cannot CREATE OR REPLACE VIEW when the replacement changes
-- existing column names or order. Historical staff hardening migrations reshape
-- staff_accessible_* views several times, so disposable bootstrap needs to drop
-- the old view shape before recreating the next one.

drop view if exists public.staff_accessible_events;
drop view if exists public.staff_accessible_products;
drop view if exists public.staff_accessible_markets;
