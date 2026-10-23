-- BW-01: absent time keys preserve existing values; explicit null/blank clears.
-- Patch only the four assignments in the existing projector. Abort on an
-- unexpected definition so a different deployed projector is never overwritten.
DO $migration$
DECLARE
  definition TEXT := pg_get_functiondef('public.update_market_read_model()'::regprocedure);
  field TEXT;
  previous_assignment TEXT;
  next_assignment TEXT;
BEGIN
  FOREACH field IN ARRAY ARRAY['early_entry_time', 'check_in_time', 'operating_start_time', 'operating_end_time']
  LOOP
    previous_assignment := format('%s = COALESCE((v_updates->>''%s'')::TIME, %s)', field, field, field);
    next_assignment := format('%s = CASE WHEN v_updates ? ''%s'' THEN NULLIF(BTRIM(v_updates->>''%s''), '''')::TIME ELSE %s END', field, field, field, field);
    IF position(previous_assignment IN definition) > 0 THEN
      definition := replace(definition, previous_assignment, next_assignment);
    ELSIF position(next_assignment IN definition) = 0 THEN
      RAISE EXCEPTION 'Unexpected market projector assignment for %; inspect before applying migration 072', field;
    END IF;
  END LOOP;
  EXECUTE definition;
END;
$migration$;
