-- Privacy repair only. Does not enable account deletion or execute snapshot cleanup.
BEGIN;
DO $$BEGIN
 IF md5(replace(pg_get_functiondef('public.get_latest_snapshot(uuid)'::regprocedure),chr(13),'')) NOT IN('0a6486b98704693f07e1ae726e32683a','0683d4eb751ae5148c72624b63c0e7d8')
 OR md5(replace(pg_get_functiondef('public.cleanup_old_snapshots(uuid)'::regprocedure),chr(13),'')) NOT IN('b73266c910d25963e13645bd75ebffd2','8acd35d91782110158bba12838f23b35')
 THEN RAISE EXCEPTION 'Snapshot RPC source changed: review deployed definitions before applying 095';END IF;
END$$;
CREATE OR REPLACE FUNCTION public.get_latest_snapshot(p_user_id uuid)
RETURNS TABLE(id uuid,snapshot_at timestamptz,event_count integer,data jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $snapshot_scope$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id)
 THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='snapshot_owner_scope';END IF;
 RETURN QUERY SELECT s.id,s.snapshot_at,s.event_count,s.data FROM public.snapshots s
  WHERE s.user_id=p_user_id ORDER BY s.snapshot_at DESC,s.id DESC LIMIT 1;
END;
$snapshot_scope$;
CREATE OR REPLACE FUNCTION public.cleanup_old_snapshots(p_user_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $snapshot_scope$
DECLARE affected integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id)
 THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='snapshot_owner_scope';END IF;
 WITH kept AS(SELECT s.id FROM public.snapshots s WHERE s.user_id=p_user_id ORDER BY s.snapshot_at DESC,s.id DESC LIMIT 2)
 DELETE FROM public.snapshots s WHERE s.user_id=p_user_id AND NOT EXISTS(SELECT 1 FROM kept k WHERE k.id=s.id);
 GET DIAGNOSTICS affected=ROW_COUNT;RETURN affected;
END;
$snapshot_scope$;
REVOKE ALL ON FUNCTION public.get_latest_snapshot(uuid),public.cleanup_old_snapshots(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_latest_snapshot(uuid),public.cleanup_old_snapshots(uuid) TO authenticated,service_role;
COMMIT;
