-- Read only. Must return one matching installation; no runtime enablement.
BEGIN READ ONLY;
DO $readback$
BEGIN
 IF (SELECT count(*) FROM deletion_release_private.installation)<>1
  OR NOT EXISTS(SELECT 1 FROM deletion_release_private.installation i
   CROSS JOIN deletion_release_private.controls c WHERE c.slot AND NOT c.runtime_enabled
    AND i.project_ref='tzhbirwchhqabkxhqjdl'
    AND i.version='096-account-deletion-candidate-v2' AND i.payload_sha='c449baff62f39e53b6851e8c1af4e4866ca79baa923b78092eae5c50686cc40e'
    AND i.target_ack->'registration097'->>'version'='097-account-deletion-registration-v1'
    AND i.target_ack->'registration097'->>'source097Sha'='62ab13ea038f0813d922f6da078c12b774f5e215c02c8df5dc7079f038bb7ae6'
    AND i.target_ack->'registration097'->>'payloadSha'='4e267826eb84b971035142097da47e90073e376621138a4edec0a52b693d154a'
    AND i.schema_hash=(SELECT md5(jsonb_build_object(
   'relations',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relkind,c.relowner::regrole::text,c.relacl,c.reloptions,c.relrowsecurity,c.relforcerowsecurity,
     CASE WHEN c.relkind IN('v','m')THEN pg_get_viewdef(c.oid,true)END,
     (SELECT jsonb_agg(jsonb_build_array(a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid),a.attidentity,a.attgenerated)ORDER BY a.attnum)
       FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
     (SELECT jsonb_agg(jsonb_build_array(x.conname,pg_get_constraintdef(x.oid,true),x.convalidated)ORDER BY x.conname)FROM pg_constraint x WHERE x.conrelid=c.oid),
     (SELECT jsonb_agg(pg_get_indexdef(x.indexrelid)ORDER BY x.indexrelid)FROM pg_index x WHERE x.indrelid=c.oid))ORDER BY n.nspname,c.relname)
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (n.nspname='public' OR n.nspname LIKE 'deletion_%')AND c.relkind IN('r','p','v','m','f','S')),
   'routines',(SELECT jsonb_agg(jsonb_build_array(n.nspname,p.oid::regprocedure::text,md5(pg_get_functiondef(p.oid)),p.proowner::regrole::text,p.proacl)ORDER BY n.nspname,p.oid::regprocedure::text)
     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' OR n.nspname LIKE 'deletion_%')AND p.prokind IN('f','p')),
   'triggers',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid,true),t.tgenabled)ORDER BY n.nspname,c.relname,t.tgname)
     FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND(n.nspname='public' OR n.nspname LIKE 'deletion_%')),
   'policies',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,p.polname,p.polpermissive,p.polcmd,p.polroles,pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid))ORDER BY n.nspname,c.relname,p.polname)
     FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' OR n.nspname LIKE 'deletion_%'),
   'schemas',(SELECT jsonb_agg(jsonb_build_array(nspname,nspowner::regrole::text,nspacl)ORDER BY nspname)FROM pg_namespace WHERE nspname='public' OR nspname LIKE 'deletion_%')
  )::text)))
 THEN RAISE EXCEPTION 'registration_compat_readback_failed'; END IF;
 PERFORM deletion_engine_private.assert_catalog();
END;
$readback$;
SELECT project_ref,version,NOT runtime_enabled AS runtime_disabled,
 target_ack->'registration097'->>'version' AS registration_compat_version
FROM deletion_release_private.installation CROSS JOIN deletion_release_private.controls;
ROLLBACK;
