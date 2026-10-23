-- Run against the application's Supabase project after migration 072.
-- This uses only the specifically named disposable test market. Every event
-- and read-model change is inside one transaction which is always rolled back.
BEGIN;
SET LOCAL statement_timeout = '15s';
DO $test$
DECLARE
  fixture public.markets%ROWTYPE;
  actual TIME[];
  sample JSONB := '{"early_entry_time":"09:00","check_in_time":"11:00","operating_start_time":"14:00","operating_end_time":"20:00"}'::JSONB;
  scenario RECORD;
BEGIN
  SELECT * INTO STRICT fixture FROM public.markets
  WHERE id = 'aadc95b5-421c-4dc4-b5b5-91fdef1dc868' FOR UPDATE;
  IF fixture.name <> '[測試1020-02] 河岸週末市集' THEN
    RAISE EXCEPTION 'Wrong fixture; no verification writes allowed';
  END IF;

  FOR scenario IN SELECT * FROM (VALUES
    ('valid', sample, ARRAY['09:00','11:00','14:00','20:00']::TIME[]),
    ('absent_preserves', '{}'::JSONB, ARRAY['09:00','11:00','14:00','20:00']::TIME[]),
    ('explicit_null_clears', '{"early_entry_time":null,"check_in_time":null,"operating_start_time":null,"operating_end_time":null}'::JSONB, ARRAY[NULL,NULL,NULL,NULL]::TIME[]),
    ('reset_before_blank', sample, ARRAY['09:00','11:00','14:00','20:00']::TIME[]),
    ('blank_clears', '{"early_entry_time":"","check_in_time":" ","operating_start_time":"","operating_end_time":" "}'::JSONB, ARRAY[NULL,NULL,NULL,NULL]::TIME[]),
    ('reset_before_mixed', sample, ARRAY['09:00','11:00','14:00','20:00']::TIME[]),
    ('mixed_preserves_others', '{"check_in_time":null}'::JSONB, ARRAY['09:00',NULL,'14:00','20:00']::TIME[])
  ) AS cases(label, updates, expected)
  LOOP
    INSERT INTO public.events (id, type, actor_id, market_id, payload, timestamp, metadata)
    VALUES (gen_random_uuid(), 'market_updated', fixture.owner_id, fixture.id,
      jsonb_build_object('market_id', fixture.id, 'updates', scenario.updates),
      NOW(), '{"verification":"BW-01-072-rollback-only"}'::JSONB);
    SELECT ARRAY[early_entry_time, check_in_time, operating_start_time, operating_end_time]
      INTO actual FROM public.markets WHERE id = fixture.id;
    IF actual IS DISTINCT FROM scenario.expected THEN
      RAISE EXCEPTION 'Time projector verification failed: % (actual %, expected %)', scenario.label, actual, scenario.expected;
    END IF;
  END LOOP;

  -- A rejected invalid time must not leave an event or partial projection.
  BEGIN
    INSERT INTO public.events (id, type, actor_id, market_id, payload, timestamp, metadata)
    VALUES (gen_random_uuid(), 'market_updated', fixture.owner_id, fixture.id,
      jsonb_build_object('market_id', fixture.id, 'updates', '{"check_in_time":"25:99"}'::JSONB),
      NOW(), '{"verification":"BW-01-072-rollback-only"}'::JSONB);
    RAISE EXCEPTION 'Invalid time was unexpectedly accepted';
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    NULL;
  END;
  SELECT ARRAY[early_entry_time, check_in_time, operating_start_time, operating_end_time]
    INTO actual FROM public.markets WHERE id = fixture.id;
  IF actual IS DISTINCT FROM ARRAY['09:00',NULL,'14:00','20:00']::TIME[] THEN
    RAISE EXCEPTION 'Rejected time changed the projection';
  END IF;
END;
$test$;
ROLLBACK;

SELECT 'PASS: valid / absent / null / blank / mixed / invalid; verification transaction rolled back' AS result,
  early_entry_time, check_in_time, operating_start_time, operating_end_time,
  NOT EXISTS (SELECT 1 FROM public.events WHERE metadata->>'verification' = 'BW-01-072-rollback-only') AS no_test_events_persisted
FROM public.markets WHERE id = 'aadc95b5-421c-4dc4-b5b5-91fdef1dc868';
