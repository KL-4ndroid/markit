-- Rollback-only rehearsal of a test_prg policy layered on the installed 096 candidate.
BEGIN;
SET LOCAL search_path = pg_catalog;
SET LOCAL lock_timeout = '5s';

DO $review$
BEGIN
  IF session_user <> 'postgres' OR current_database() <> 'postgres'
    OR (SELECT count(*) FROM deletion_release_private.installation) <> 1
    OR NOT EXISTS (SELECT 1 FROM deletion_release_private.installation
      WHERE project_ref = 'tzhbirwchhqabkxhqjdl' AND version = '096-account-deletion-candidate-v2'
        AND payload_sha = 'c449baff62f39e53b6851e8c1af4e4866ca79baa923b78092eae5c50686cc40e')
    OR NOT EXISTS (SELECT 1 FROM deletion_release_private.controls WHERE slot AND NOT runtime_enabled)
  THEN RAISE EXCEPTION 'preview_deletion_test_target_required'; END IF;
  PERFORM deletion_engine_private.assert_catalog();
END;
$review$;

CREATE TABLE deletion_release_private.preview_grant (
  slot boolean PRIMARY KEY CHECK (slot),
  request_id uuid NOT NULL REFERENCES public.account_deletion_requests(id),
  actor_id uuid NOT NULL,
  target_hash text NOT NULL CHECK (target_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL
);
REVOKE ALL ON deletion_release_private.preview_grant FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION deletion_release_private.register_preview_grant(
  target_request uuid, target_actor uuid, target_hash text, until_at timestamptz
) RETURNS void LANGUAGE plpgsql SET search_path = '' AS $register$
DECLARE now_at timestamptz := clock_timestamp();
BEGIN
  IF until_at IS NULL OR until_at <= now_at OR until_at > now_at + interval '30 minutes'
    OR NOT EXISTS (SELECT 1 FROM auth.users u JOIN public.account_deletion_requests r ON r.active_actor_id = u.id
      WHERE u.id = target_actor AND r.id = target_request AND r.account_kind = 'owner'
        AND r.status = 'identity_confirmed' AND r.identity_confirmed_at IS NOT NULL
        AND u.email ~ '^candidate-cleanup-[0-9a-f]{12}@example[.]test$'
        AND u.created_at BETWEEN now_at - interval '30 minutes' AND now_at)
    OR NOT EXISTS (SELECT 1 FROM deletion_upload_private.transport_target t
      WHERE t.slot AND t.target_hash = register_preview_grant.target_hash)
  THEN RAISE EXCEPTION 'preview_deletion_invalid_grant' USING ERRCODE = '55000'; END IF;
  INSERT INTO deletion_release_private.preview_grant VALUES (true, target_request, target_actor, target_hash, until_at);
END;
$register$;

CREATE FUNCTION deletion_release_private.require_preview_grant(target_request uuid)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $require$
BEGIN
  -- Hold both rows through the enclosing RPC. The actor reference deliberately
  -- survives the Auth deletion until request finalization has completed.
  PERFORM 1 FROM deletion_release_private.preview_grant g
  JOIN public.account_deletion_requests r ON r.id = g.request_id AND r.active_actor_id = g.actor_id
  JOIN deletion_upload_private.transport_target t ON t.slot AND t.target_hash = g.target_hash
  WHERE g.slot AND g.request_id = target_request AND r.account_kind = 'owner'
    AND g.expires_at > clock_timestamp() FOR UPDATE OF r FOR SHARE OF g, t;
  IF NOT FOUND THEN RAISE EXCEPTION 'preview_deletion_scope' USING ERRCODE = '55000'; END IF;
END;
$require$;
REVOKE ALL ON FUNCTION deletion_release_private.register_preview_grant(uuid,uuid,text,timestamptz),
  deletion_release_private.require_preview_grant(uuid) FROM PUBLIC, anon, authenticated, service_role;

DO $wire$
DECLARE
  routine regprocedure := 'public.bff_account_deletion_engine(uuid,text,text,text,text,text)'::regprocedure;
  original text := pg_get_functiondef(routine);
  guard text := 'IF NOT deletion_release_private.runtime_allowed() THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_local_only''; END IF;';
BEGIN
  IF (length(original) - length(replace(original, guard, ''))) <> length(guard) THEN
    RAISE EXCEPTION 'preview_deletion_engine_guard_changed';
  END IF;
  EXECUTE replace(original, guard, 'PERFORM deletion_release_private.require_preview_grant(p_request_id);');
  UPDATE deletion_engine_private.approved_access SET contract = deletion_engine_private.access_catalog();
  PERFORM deletion_engine_private.assert_catalog();
END;
$wire$;
ROLLBACK;
