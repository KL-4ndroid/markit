-- Isolated candidate only; installed after terminal-PUT, before access attestation.
BEGIN;
DO $$BEGIN IF current_database()<>'deletion_engine_test' THEN RAISE EXCEPTION 'Disposable DB required';END IF;END$$;
CREATE TABLE deletion_upload_private.readbacks(
 attempt_id uuid NOT NULL REFERENCES deletion_upload_private.attempts(id) ON DELETE CASCADE,
 source_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(attempt_id,source_hash)
);
REVOKE ALL ON deletion_upload_private.readbacks FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.bff_read_recorded_photo_upload(p_actor uuid,p_owner uuid,p_kind text,p_entity uuid,p_spec jsonb,p_source text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$DECLARE m jsonb;photo_keys text[];h text;candidate uuid;write_allowed jsonb;BEGIN
 IF p_actor IS NULL OR p_owner IS NULL OR p_entity IS NULL OR p_kind IS NULL OR p_kind NOT IN('product','sale') OR jsonb_typeof(p_spec) IS DISTINCT FROM 'object'
  THEN RAISE EXCEPTION 'photo_readback_input' USING ERRCODE='22023';END IF;
 PERFORM deletion_upload_private.lock_pair(p_actor,p_owner);
 IF NOT deletion_engine_private.actor_enabled(p_actor) OR NOT deletion_engine_private.actor_enabled(p_owner)
  THEN RAISE EXCEPTION 'photo_readback_frozen' USING ERRCODE='55000';END IF;
 write_allowed:=public.check_subscription_write_for_actor(p_actor,p_owner,CASE p_kind WHEN 'product' THEN 'product_photo' ELSE 'sales_photo' END);
 IF write_allowed->>'allowed' IS DISTINCT FROM 'true' OR (p_actor<>p_owner AND NOT EXISTS(SELECT 1 FROM public.staff_relationships
  WHERE staff_id=p_actor AND owner_id=p_owner AND status='active' AND role=ANY(CASE p_kind WHEN 'product' THEN ARRAY['manager'] ELSE ARRAY['manager','operator'] END)))
  THEN RAISE EXCEPTION 'photo_readback_permission' USING ERRCODE='42501';END IF;
 IF p_kind='product' THEN
  IF NOT EXISTS(SELECT 1 FROM public.products WHERE id=p_entity AND owner_id=p_owner AND is_active) THEN RAISE EXCEPTION 'photo_readback_scope' USING ERRCODE='42501';END IF;
  SELECT to_jsonb(p) INTO m FROM public.product_cover_photos p WHERE owner_id=p_owner AND product_id=p_entity AND deleted_at IS NULL FOR UPDATE;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.events e JOIN public.markets v ON v.id=e.market_id WHERE e.id=p_entity AND e.type='deal_closed' AND v.owner_id=p_owner AND v.id::text=p_spec->>'marketId')
   THEN RAISE EXCEPTION 'photo_readback_scope' USING ERRCODE='42501';END IF;
  SELECT to_jsonb(p) INTO m FROM public.sale_photo_evidence p WHERE owner_id=p_owner AND sale_id=p_entity AND deleted_at IS NULL FOR UPDATE;
  IF m IS NOT NULL AND p_actor<>p_owner AND m->>'captured_by_staff_id' IS DISTINCT FROM p_actor::text THEN RAISE EXCEPTION 'photo_readback_attribution' USING ERRCODE='42501';END IF;
 END IF;
 IF m IS NULL THEN RETURN jsonb_build_object('outcome','absent');END IF;
 IF m->>'status'<>'uploaded' OR m->>'upload_lease_expires_at' IS NOT NULL THEN
  IF EXISTS(SELECT 1 FROM deletion_upload_private.attempts WHERE owner_id=p_owner AND kind=p_kind
    AND entity_id=CASE p_kind WHEN 'product' THEN p_entity ELSE (m->>'id')::uuid END AND state<>'settled')
   THEN RETURN jsonb_build_object('outcome','pending');END IF;
  RETURN jsonb_build_object('outcome','absent');
 END IF;
 IF p_kind='product' AND (m->>'id' IS DISTINCT FROM p_spec->>'photoId' OR m->>'version' IS DISTINCT FROM p_spec->>'version') THEN
  IF (p_spec->>'version')::bigint>(m->>'version')::bigint THEN RETURN jsonb_build_object('outcome','absent');END IF;
  RETURN jsonb_build_object('outcome','conflict');
 END IF;
 IF p_kind='sale' AND (m->>'expires_at' IS NULL OR (m->>'expires_at')::timestamptz<=clock_timestamp()) THEN RETURN jsonb_build_object('outcome','conflict');END IF;
 photo_keys:=CASE p_kind WHEN 'product' THEN ARRAY[m->>'display_object_key',m->>'thumbnail_object_key'] ELSE ARRAY[m->>'r2_object_key',m->>'r2_thumbnail_key'] END;
 IF m->>'width' IS DISTINCT FROM p_spec->>'width' OR m->>'height' IS DISTINCT FROM p_spec->>'height'
  OR EXISTS(SELECT 1 FROM unnest(photo_keys)k WHERE NOT deletion_upload_private.key_owned(k,p_owner))
  THEN RETURN jsonb_build_object('outcome','conflict');END IF;
 IF p_kind='product' AND (m->>'display_content_hash' IS DISTINCT FROM p_spec->>'imageHash' OR m->>'thumbnail_content_hash' IS DISTINCT FROM p_spec->>'thumbnailHash'
  OR m->>'display_mime_type' IS DISTINCT FROM p_spec->>'imageMime' OR m->>'thumbnail_mime_type' IS DISTINCT FROM p_spec->>'thumbnailMime'
  OR m->>'display_size_bytes' IS DISTINCT FROM p_spec->>'imageBytes' OR m->>'thumbnail_size_bytes' IS DISTINCT FROM p_spec->>'thumbnailBytes')
  THEN RETURN jsonb_build_object('outcome','conflict');END IF;
 SELECT a.id INTO candidate FROM deletion_upload_private.attempts a
 WHERE a.owner_id=p_owner AND a.kind=p_kind AND a.entity_id=CASE p_kind WHEN 'product' THEN p_entity ELSE (m->>'id')::uuid END
  AND photo_keys<@a.write_keys AND cardinality(a.issued_keys)=2
  AND EXISTS(SELECT 1 FROM deletion_upload_private.puts p WHERE p.attempt_id=a.id AND p.object_key=photo_keys[1] AND p.body_hash=p_spec->>'imageHash' AND p.receipt IS NOT NULL AND p.target_hash=(SELECT target_hash FROM deletion_upload_private.transport_target WHERE slot))
  AND EXISTS(SELECT 1 FROM deletion_upload_private.puts p WHERE p.attempt_id=a.id AND p.object_key=photo_keys[2] AND p.body_hash=p_spec->>'thumbnailHash' AND p.receipt IS NOT NULL AND p.target_hash=(SELECT target_hash FROM deletion_upload_private.transport_target WHERE slot))
 ORDER BY a.created_at DESC LIMIT 1 FOR UPDATE;
 IF candidate IS NULL THEN RETURN jsonb_build_object('outcome','conflict');END IF;
 h:=encode(extensions.digest(jsonb_build_array(m,p_spec,candidate,deletion_upload_private.terminal_proof(candidate,'readback'))::text,'sha256'),'hex');
 IF p_source IS NOT NULL THEN
  IF p_source<>h THEN RAISE EXCEPTION 'photo_readback_changed' USING ERRCODE='40001';END IF;
  INSERT INTO deletion_upload_private.readbacks(attempt_id,source_hash) VALUES(candidate,h) ON CONFLICT DO NOTHING;
  UPDATE deletion_upload_private.attempts SET state='settled' WHERE id=candidate;
 END IF;
 RETURN jsonb_build_object('outcome','confirmed','sourceHash',h,'keys',to_jsonb(photo_keys),'evidenceId',m->>'id');
END$$;
REVOKE ALL ON FUNCTION public.bff_read_recorded_photo_upload(uuid,uuid,text,uuid,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_read_recorded_photo_upload(uuid,uuid,text,uuid,jsonb,text) TO service_role;
CREATE FUNCTION public.bff_account_deletion_upload_reviews(p_request uuid,p_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$DECLARE r public.account_deletion_requests%ROWTYPE;items jsonb;legacy_n integer;BEGIN
 SELECT * INTO r FROM public.account_deletion_requests WHERE id=p_request FOR UPDATE;
 IF NOT FOUND OR r.status<>'processing' OR r.active_actor_id IS NULL OR r.lease_expires_at IS NULL OR r.lease_expires_at<=clock_timestamp()
  OR r.lease_token_hash IS DISTINCT FROM encode(extensions.digest(p_token,'sha256'),'hex')
  OR NOT EXISTS(SELECT 1 FROM deletion_engine_private.frozen WHERE request_id=p_request AND actor_hash=encode(extensions.digest(r.active_actor_id::text,'sha256'),'hex'))
  THEN RAISE EXCEPTION 'upload_review_queue_scope' USING ERRCODE='55000';END IF;
 PERFORM deletion_engine_private.lock_upload_actor(r.active_actor_id);
 IF r.lease_expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'upload_review_lease_expired' USING ERRCODE='55000';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('attemptId',a.id,'kind',a.kind,'state',a.state,'keyCount',cardinality(a.keys),
  'reason',CASE WHEN a.kind IS NULL THEN 'unbound_claim' WHEN EXISTS(SELECT 1 FROM unnest(a.issued_keys)k WHERE NOT EXISTS(SELECT 1 FROM deletion_upload_private.puts p WHERE p.attempt_id=a.id AND p.object_key=k AND p.receipt IS NOT NULL)) THEN 'provider_outcome_unknown'
   WHEN a.deadline<=clock_timestamp() AND a.state='open' THEN 'expired_open' ELSE 'needs_evidence_review' END) ORDER BY a.created_at),'[]') INTO items
  FROM (SELECT * FROM deletion_upload_private.attempts WHERE (actor_id=r.active_actor_id OR owner_id=r.active_actor_id) AND state<>'settled' ORDER BY created_at,id LIMIT 100)a;
 SELECT count(*) INTO legacy_n FROM (
  SELECT 'product' k,to_jsonb(p) j FROM public.product_cover_photos p WHERE upload_lease_expires_at IS NOT NULL OR status='uploading'
  UNION ALL SELECT 'sale',to_jsonb(p) FROM public.sale_photo_evidence p WHERE upload_lease_expires_at IS NOT NULL OR status='uploading')x
  WHERE NOT EXISTS(SELECT 1 FROM deletion_upload_private.attempts a WHERE a.kind=x.k AND a.claim_hash=deletion_upload_private.claim_hash(x.k,x.j));
 RETURN jsonb_build_object('items',items,'limit',100,'truncated',jsonb_array_length(items)=100,'unattributedLegacyClaimCount',legacy_n,'canAutoRelease',false,
  'sourceHash',encode(extensions.digest(jsonb_build_array(p_request,items,legacy_n)::text,'sha256'),'hex'));
END$$;
REVOKE ALL ON FUNCTION public.bff_account_deletion_upload_reviews(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_account_deletion_upload_reviews(uuid,text) TO service_role;
ROLLBACK;
