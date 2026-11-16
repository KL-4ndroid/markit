-- ISOLATED ONLY, after reconciliation and before catalog capture. No production migration.
BEGIN;
DO $$BEGIN IF current_database()<>'deletion_engine_test' THEN RAISE EXCEPTION 'Disposable DB required';END IF;END$$;
CREATE TABLE deletion_upload_private.transport_target(slot boolean PRIMARY KEY CHECK(slot),target_hash text NOT NULL CHECK(target_hash ~ '^[a-f0-9]{64}$'));
-- Reviewed installer must set exactly one target; missing/unmatched target always rejects.
CREATE TABLE deletion_upload_private.puts(
 attempt_id uuid NOT NULL REFERENCES deletion_upload_private.attempts(id) ON DELETE CASCADE,
 object_key text NOT NULL,ticket uuid NOT NULL UNIQUE,target_hash text NOT NULL,body_hash text NOT NULL,
 receipt jsonb,PRIMARY KEY(attempt_id,object_key)
);
REVOKE ALL ON deletion_upload_private.transport_target,deletion_upload_private.puts FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.bff_record_deletion_upload_put(p_id uuid,p_token uuid,p_key text,p_action text,p_data jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$DECLARE a deletion_upload_private.attempts%ROWTYPE;old deletion_upload_private.puts%ROWTYPE;BEGIN
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id;
 PERFORM deletion_upload_private.lock_pair(a.actor_id,a.owner_id);
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.token_hash IS DISTINCT FROM encode(extensions.digest(p_token::text,'sha256'),'hex')
  OR p_data IS NULL OR jsonb_typeof(p_data)<>'object' OR p_key IS NULL OR NOT p_key=ANY(a.issued_keys)
  OR coalesce(p_data->>'targetHash','') IS DISTINCT FROM (SELECT target_hash FROM deletion_upload_private.transport_target WHERE slot)
  OR coalesce(p_data->>'bodyHash','') !~ '^[a-f0-9]{64}$' OR p_data->>'ticket' IS NULL
  THEN RAISE EXCEPTION 'terminal_put_scope' USING ERRCODE='55000';END IF;
 IF p_action='issue' THEN
  IF a.state<>'open' OR a.deadline<=clock_timestamp() OR NOT deletion_engine_private.actor_enabled(a.actor_id) OR NOT deletion_engine_private.actor_enabled(a.owner_id)
   THEN RAISE EXCEPTION 'terminal_put_frozen' USING ERRCODE='55000';END IF;
  INSERT INTO deletion_upload_private.puts(attempt_id,object_key,ticket,target_hash,body_hash)
   VALUES(p_id,p_key,(p_data->>'ticket')::uuid,p_data->>'targetHash',p_data->>'bodyHash');
 ELSIF p_action='ack' THEN
  SELECT * INTO old FROM deletion_upload_private.puts WHERE attempt_id=p_id AND object_key=p_key FOR UPDATE;
  IF NOT FOUND OR old.ticket::text IS DISTINCT FROM p_data->>'ticket' OR old.body_hash IS DISTINCT FROM p_data->>'bodyHash' OR old.target_hash IS DISTINCT FROM p_data->>'targetHash'
   OR p_data->>'profile' IS DISTINCT FROM 's3-single-put-200-v1' OR p_data->>'attempts' IS DISTINCT FROM '1'
   OR p_data->>'status' IS DISTINCT FROM '200' OR coalesce(p_data->>'etagHash','') !~ '^[a-f0-9]{64}$'
   OR (old.receipt IS NOT NULL AND old.receipt IS DISTINCT FROM p_data)
   THEN RAISE EXCEPTION 'terminal_put_ack_conflict' USING ERRCODE='55000';END IF;
  -- A provider response can be persisted after freeze. It cannot authorize another PUT.
  UPDATE deletion_upload_private.puts SET receipt=p_data WHERE attempt_id=p_id AND object_key=p_key AND receipt IS NULL;
 ELSE RAISE EXCEPTION 'terminal_put_action' USING ERRCODE='22023';END IF;
END$$;
CREATE FUNCTION deletion_upload_private.terminal_proof(p_id uuid,p_source text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a deletion_upload_private.attempts%ROWTYPE;t text;rows jsonb;BEGIN
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id;
 SELECT target_hash INTO t FROM deletion_upload_private.transport_target WHERE slot;
 IF a.id IS NULL OR t IS NULL OR EXISTS(SELECT 1 FROM unnest(a.issued_keys)k WHERE NOT EXISTS(
    SELECT 1 FROM deletion_upload_private.puts p WHERE p.attempt_id=p_id AND p.object_key=k AND p.receipt IS NOT NULL AND p.target_hash=t))
  OR EXISTS(SELECT 1 FROM deletion_upload_private.puts p WHERE p.attempt_id=p_id AND (NOT p.object_key=ANY(a.issued_keys) OR p.receipt IS NULL OR p.target_hash<>t))
  THEN RAISE EXCEPTION 'terminal_put_unconfirmed' USING ERRCODE='55000';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_array(object_key,ticket,body_hash,receipt) ORDER BY object_key),'[]') INTO rows
  FROM deletion_upload_private.puts WHERE attempt_id=p_id;
 RETURN encode(extensions.digest(jsonb_build_array('terminal-put-v1',p_id,p_source,t,to_jsonb(a.issued_keys),rows)::text,'sha256'),'hex');
END$$;
CREATE OR REPLACE FUNCTION deletion_upload_private.validate_drain_evidence(a uuid,s text,h text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$BEGIN
 IF h IS DISTINCT FROM deletion_upload_private.terminal_proof(a,s) THEN RAISE EXCEPTION 'terminal_put_proof_mismatch' USING ERRCODE='55000';END IF;
END$$;
CREATE FUNCTION public.bff_get_deletion_upload_drain(p_request uuid,p_token text,p_id uuid,p_source text,p_target text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$DECLARE c jsonb;h text;BEGIN
 -- Reuses exact live deletion lease/freeze/scope checks and retains their locks.
 c:=public.bff_reconcile_deletion_upload(p_request,p_token,p_id,'inspect',NULL);
 IF c->>'outcome' IS DISTINCT FROM 'review_required' OR c->>'sourceHash' IS DISTINCT FROM p_source
  OR p_target IS NULL OR p_target IS DISTINCT FROM (SELECT target_hash FROM deletion_upload_private.transport_target WHERE slot)
  THEN RAISE EXCEPTION 'terminal_put_review_scope' USING ERRCODE='55000';END IF;
 h:=deletion_upload_private.terminal_proof(p_id,p_source);
 RETURN jsonb_build_object('scopeHash',p_source,'evidenceHash',h,'expiresAt',clock_timestamp()+interval '60 seconds');
END$$;
REVOKE ALL ON FUNCTION deletion_upload_private.terminal_proof(uuid,text),deletion_upload_private.validate_drain_evidence(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.bff_record_deletion_upload_put(uuid,uuid,text,text,jsonb),public.bff_get_deletion_upload_drain(uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_record_deletion_upload_put(uuid,uuid,text,text,jsonb),public.bff_get_deletion_upload_drain(uuid,text,uuid,text,text) TO service_role;
ROLLBACK;
