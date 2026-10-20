\set ON_ERROR_STOP on
\if :ad3a_local_confirmed
\else
\quit
\endif

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a2000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'ad3a-race@example.test', 'synthetic', now(),
  '{}'::jsonb, '{"display_name":"AD3A race"}'::jsonb, now(), now()
);

SELECT request_id
FROM public.bff_create_account_deletion_request(
  'a2000000-0000-4000-8000-000000000001', repeat('e', 64), repeat('f', 64),
  '2026-08-17', 'clean'
);

UPDATE public.account_deletion_requests
SET status = 'identity_confirmed', identity_confirmed_at = clock_timestamp()
WHERE active_actor_id = 'a2000000-0000-4000-8000-000000000001';
