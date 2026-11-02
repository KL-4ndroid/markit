// Captured source/ACL reconstruction and local-only frozen access rewrites.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {capturedDeletionCatalog,quoteIdentifier as qi,quoteSql as q} from './account-deletion-catalog-fixture';
import {deletionRoutineMode,deletionArgumentReference} from '../../lib/subscription/account-deletion-access-policy';

export type AccessRoutine={name:string;definition:string;definitionMd5:string;language:string;securityDefiner:boolean;volatility:string;strict:boolean;returnsSet:boolean;returnType:string;argumentTypes:string;argumentNames:string[]|null;argumentModes:string[]|null;owner:string;config:string[]|null;grants:{role:string;privilege:string;grantable:boolean}[]};
export type AccessRelation={owner:string;kind:string;options:string[]|null;viewDefinition:string|null;policies:{name:string;permissive:boolean;command:string;roles:string[];using:string|null;check:string|null}[]};
type AccessCapture={projectRef:string;rows:({category:'routine';identity:string;detail:AccessRoutine}|{category:'relation';identity:string;detail:AccessRelation})[]};
export function capturedAccessDefinitions(){
 const data=JSON.parse(readFileSync('docs/subscription/evidence/account-deletion-access-definitions-2026-11-02.json','utf8')) as AccessCapture;
 const baseline=JSON.parse(readFileSync('docs/subscription/evidence/account-deletion-catalog-2026-11-02.json','utf8')) as {rows:{category:string;identity:string;detail:{definitionMd5?:string}}[]};
 if(data.projectRef!=='fgejncfsvvsayiequubm')throw new Error('Unexpected access capture project');
 const routines=data.rows.filter((r):r is {category:'routine';identity:string;detail:AccessRoutine}=>r.category==='routine');
 if(routines.length!==134)throw new Error('Captured routine count needs review');
 for(const r of routines){
  const expected=baseline.rows.find(b=>b.category==='routine'&&b.identity===r.identity)?.detail.definitionMd5;
  if(!expected||expected!==r.detail.definitionMd5||createHash('md5').update(r.detail.definition).digest('hex')!==expected)throw new Error('Captured routine fingerprint drift');
 }
 return {routines,relations:data.rows.filter((r):r is {category:'relation';identity:string;detail:AccessRelation}=>r.category==='relation')};
}
export function capturedRuntimeDefinitionsDdl(){
 const {routines,relations}=capturedAccessDefinitions();
 const functions=routines.map(r=>r.detail.definition+';').join('\n');
 const views=relations.filter(r=>r.detail.kind==='v').map(r=>`CREATE VIEW ${r.identity} WITH(security_barrier=true) AS ${r.detail.viewDefinition!.replace(/;\s*$/,'')};`).join('\n');
 return `SET check_function_bodies=off;\n${functions}\n${views}\nSET check_function_bodies=on;`;
}
export function capturedRuntimeSecurityDdl(){
 const {routines,relations}=capturedAccessDefinitions();const baseline=capturedDeletionCatalog();const out:string[]=[];
 for(const r of routines){
  const signature=`public.${qi(r.detail.name)}(${r.detail.argumentTypes})`;
  out.push(`REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC,anon,authenticated,service_role;`);
  for(const g of r.detail.grants)if(g.role!=='postgres')out.push(`GRANT EXECUTE ON FUNCTION ${signature} TO ${g.role==='PUBLIC'?'PUBLIC':qi(g.role)}${g.grantable?' WITH GRANT OPTION':''};`);
 }
 for(const r of relations){
  const b=baseline.find(b=>b.identity===r.identity)!.detail as typeof baseline[number]['detail']&{rls:boolean;grants:{grantee:string;privilege:string}[]};
  out.push(`REVOKE ALL ON ${r.identity} FROM PUBLIC,anon,authenticated,service_role;`);
  for(const g of b.grants)if(g.grantee!=='postgres')out.push(`GRANT ${g.privilege} ON ${r.identity} TO ${g.grantee==='PUBLIC'?'PUBLIC':qi(g.grantee)};`);
  if(r.detail.kind==='r'){
   out.push(`ALTER TABLE ${r.identity} ${b.rls?'ENABLE':'DISABLE'} ROW LEVEL SECURITY;`);
   for(const p of r.detail.policies){
    const cmd:Record<string,string>={r:'SELECT',a:'INSERT',w:'UPDATE',d:'DELETE','*':'ALL'};
    out.push(`CREATE POLICY ${qi(p.name)} ON ${r.identity} AS ${p.permissive?'PERMISSIVE':'RESTRICTIVE'} FOR ${cmd[p.command]} TO ${p.roles.map(x=>x==='PUBLIC'?'PUBLIC':qi(x)).join(',')}${p.using?` USING(${p.using})`:''}${p.check?` WITH CHECK(${p.check})`:''};`);
   }
  }
 }
 return out.join('\n');
}
export function capturedRuntimeTriggersDdl(){
 return capturedDeletionCatalog().flatMap(r=>r.detail.triggers.map(t=>t.definition.replace(/^CREATE TRIGGER/,'CREATE OR REPLACE TRIGGER')+';')).join('\n');
}
function bodyOf(definition:string){
 const found=/\bAS (\$[a-zA-Z0-9_]*\$)([\s\S]*)\1/.exec(definition);
 if(!found)throw new Error('Unsupported routine body');return {header:definition.slice(0,found.index),body:found[2].replaceAll('\r','')};
}
export function frozenRoutineDefinition(meta:AccessRoutine,currentDefinition:string){
 const mode=deletionRoutineMode(meta.name,meta.returnType);
 if(mode==='control'||mode==='pure')return null;
 const {header,body}=bodyOf(currentDefinition);
 if(/LEAKPROOF|PARALLEL SAFE/.test(header))throw new Error('Routine execution attribute needs review');
 const types=meta.argumentTypes?meta.argumentTypes.split(', '):[];const names=(meta.argumentNames??[]).slice(0,types.length);
 if(names.length!==types.length)throw new Error('Unnamed routine argument needs review');
 const scope=names.flatMap((n,i)=>{
  const kind=deletionArgumentReference(meta.name,n,types[i]);
  return kind==='none'?[]:[`jsonb_build_object('kind',${q(kind)},'value',to_jsonb(${qi(n)}))`];
 });
 const args=`jsonb_build_array(${scope.join(',')})`;
 let guard=mode==='false_on_denial'?`IF NOT deletion_engine_private.rpc_allowed(${args}) THEN RETURN false;END IF;`:`PERFORM deletion_engine_private.assert_rpc(${args});`;
 if(mode==='disabled_legacy')guard=`RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='legacy_account_delete_disabled';`;
 if(['get_latest_snapshot','cleanup_old_snapshots'].includes(meta.name))guard+=`
  IF auth.role() IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='snapshot_owner_scope';END IF;`;
 if(meta.name==='enforce_subscription_row_write')guard+=`
  IF deletion_engine_private.worker_row(TG_TABLE_NAME,CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END,TG_OP) THEN IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;`;
 let original=body.trim();let directives='';
 original=original.replace(/^((?:\s*#[^\n]*\n)+)/,m=>{directives=m;return '';});
 if(meta.language==='sql'){
  original=original.replace(/;\s*$/,'');
  if(!/^SELECT\b/i.test(original))throw new Error('SQL routine statement needs explicit review');
  original=meta.returnsSet?`RETURN QUERY ${original};`:`RETURN (${original});`;
  directives+='#variable_conflict use_column\n';
 }
 if(meta.name==='cleanup_old_snapshots')original=`DECLARE n integer;BEGIN
  WITH kept AS(SELECT id FROM public.snapshots WHERE user_id=p_user_id ORDER BY snapshot_at DESC LIMIT 2)
  DELETE FROM public.snapshots WHERE user_id=p_user_id AND id NOT IN(SELECT id FROM kept);
  GET DIAGNOSTICS n=ROW_COUNT;RETURN n;END;`;
 if(meta.name==='cleanup_expired_invitations')original=`DECLARE n integer;BEGIN
  DELETE FROM public.staff_invitations WHERE expires_at<now()
    AND deletion_engine_private.identity_allowed(owner_id,false)
    AND (owner_id=auth.uid() OR auth.role()='service_role');GET DIAGNOSTICS n=ROW_COUNT;RETURN n;END;`;
 if(meta.name==='bff_list_expired_sale_photo_evidence'){
  if(!original.includes('WHERE spe.deleted_at IS NULL'))throw new Error('Expiry listing source changed');
  original=original.replace('WHERE spe.deleted_at IS NULL','WHERE spe.deleted_at IS NULL AND deletion_engine_private.identity_allowed(spe.owner_id,false)');
 }
 if(!original.endsWith(';'))original+=';';
 return `${header.replace(/LANGUAGE sql\b/,'LANGUAGE plpgsql')}AS $access_fence$\n${directives}BEGIN\n${guard}\n${original}\nEND;\n$access_fence$;`;
}
export function frozenViewsDdl(){
 return capturedAccessDefinitions().relations.filter(r=>r.detail.kind==='v').map(r=>
  `CREATE OR REPLACE VIEW ${r.identity} WITH(security_barrier=true) AS SELECT visible.* FROM (${r.detail.viewDefinition!.replace(/;\s*$/,'')}) visible WHERE deletion_engine_private.visible_row(to_jsonb(visible));`
 ).join('\n');
}
export function frozenPublicSurfaceDdl(current:Record<string,string>){
 const routines=capturedAccessDefinitions().routines;
 const ddl=routines.flatMap(r=>{
  const definition=current[`${r.detail.name}(${r.detail.argumentTypes})`];if(!definition)throw new Error('Captured runtime routine missing');
  const changed=frozenRoutineDefinition(r.detail,definition);return changed?[changed]:[];
 });
 ddl.push(frozenViewsDdl());
 for(const r of routines.filter(r=>r.detail.returnType==='trigger'||r.detail.name==='delete_current_user_app_data'))
  ddl.push(`REVOKE ALL ON FUNCTION ${r.identity} FROM PUBLIC,anon,authenticated,service_role;`);
 ddl.push('REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC,anon,authenticated,service_role;');
 return ddl.join('\n');
}
export function fencedEventAuthorizerDdl(currentDefinition:string){
 const {header,body}=bodyOf(currentDefinition);
 return `${header}AS $access_fence$ BEGIN
  IF NOT deletion_engine_private.worker_matches((SELECT active_actor_id FROM public.account_deletion_requests
   WHERE id::text=current_setting('deletion_engine.request',true))) THEN RETURN false;END IF;
  ${body.trim().replace(/;?$/,';')}
 END;$access_fence$;`;
}
/** Local installation attests exactly the captured public surface plus reviewed controls.
 * The signature check runs before taking hashes: an unexpected routine is not approved.
 */
export function accessCatalogManifestDdl(){
 const signatures=capturedAccessDefinitions().routines.map(r=>`${r.detail.name}(${r.detail.argumentTypes})`);
 signatures.push('bff_confirm_account_deletion_request(uuid, uuid, text)',
  'bff_cancel_account_deletion_request(uuid, uuid, text)',
  'bff_account_deletion_engine(uuid, text, text, text, text, text)',
  'bff_clear_billing_reference(uuid, text, text, uuid, text, text, text, text)',
  'bff_prepare_billing_detachment(uuid, text, timestamp with time zone, text, text)',
  'bff_stage_billing_detachment(uuid, text, text, jsonb)',
  'bff_review_detached_billing(uuid, integer, uuid, timestamp with time zone, text)',
  'bff_purge_detached_billing(uuid, integer, uuid)',
  'bff_check_retired_billing_binding(text, text, text, text)');
 signatures.push('bff_begin_deletion_upload(uuid, uuid, uuid, uuid)',
  'bff_bind_deletion_upload(uuid, uuid, text, uuid, text[], text[], jsonb)',
  'bff_authorize_deletion_upload(uuid, uuid, text)','bff_finish_deletion_upload(uuid, uuid, text)');
 signatures.push('bff_reconcile_deletion_upload(uuid, text, uuid, text, jsonb)');
 signatures.push('bff_record_deletion_upload_put(uuid, uuid, text, text, jsonb)',
  'bff_get_deletion_upload_drain(uuid, text, uuid, text, text)');
 signatures.push('bff_read_recorded_photo_upload(uuid, uuid, text, uuid, jsonb, text)');
 signatures.push('bff_account_deletion_upload_reviews(uuid, text)');
 return `DO $$BEGIN IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND NOT (p.proname||'('||oidvectortypes(p.proargtypes)||')'=ANY(ARRAY[${signatures.map(q).join(',')}])) )
  THEN RAISE EXCEPTION 'Unreviewed public routine';END IF;END$$;
 CREATE FUNCTION deletion_engine_private.access_catalog() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $cat$
 SELECT jsonb_build_object('routines',(SELECT jsonb_agg(jsonb_build_array(p.oid::regprocedure::text,md5(pg_get_functiondef(p.oid)),p.proacl) ORDER BY p.oid)
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'),
  'relations',(SELECT jsonb_agg(jsonb_build_array(c.oid::regclass::text,c.relkind,c.reloptions,c.relacl,c.relrowsecurity,c.relforcerowsecurity,
    CASE WHEN c.relkind IN('v','m') THEN pg_get_viewdef(c.oid,true) END) ORDER BY c.oid)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN('r','p','v','m','f')),
  'triggers',(SELECT jsonb_agg(jsonb_build_array(pg_get_triggerdef(t.oid,true),t.tgenabled) ORDER BY t.oid) FROM pg_trigger t
   JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal),
  'policies',(SELECT jsonb_agg(jsonb_build_array(p.polrelid::regclass::text,p.polname,p.polpermissive,p.polcmd,p.polroles,
    pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.oid)
   FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'));
 $cat$;
 CREATE TABLE deletion_engine_private.approved_access AS SELECT deletion_engine_private.access_catalog() AS contract;
 ALTER FUNCTION deletion_engine_private.assert_catalog() RENAME TO assert_table_catalog;
 CREATE FUNCTION deletion_engine_private.assert_catalog() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$BEGIN
  PERFORM deletion_engine_private.assert_table_catalog();
  IF (SELECT contract FROM deletion_engine_private.approved_access) IS DISTINCT FROM deletion_engine_private.access_catalog()
  THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_unreviewed_access_catalog';END IF;
 END$$;
 REVOKE ALL ON FUNCTION deletion_engine_private.access_catalog(),deletion_engine_private.assert_catalog(),deletion_engine_private.assert_table_catalog()
  FROM PUBLIC,anon,authenticated,service_role;
 REVOKE ALL ON deletion_engine_private.approved_access FROM PUBLIC,anon,authenticated,service_role;`;
}
