// Review package only. Never connects to a DB or reads dotenv/credentials.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {candidateSourceHashes} from './lib/account-deletion-candidate-sources';
import {capturedDeletionCatalog,quoteSql as q} from './lib/account-deletion-catalog-fixture';
import {capturedAccessDefinitions} from './lib/account-deletion-access-fixture';
import assert from 'node:assert/strict';
const sources=candidateSourceHashes();
const target='docs/subscription/candidate';const manifest={schemaVersion:1,status:'review_package_not_remote_installable',sources,
 runtimeEnabled:false,remoteInstallationApproved:false,
 requiredBeforeRemote:['review generated guard rewrites and full deployed catalog','production target binding and mandatory producer rollout','backup/external-copy handling evidence','managed Auth/API/service-role paths','legal/support publication confirmation'],
 rollback:'Disable entry/writer/worker gates to stop new work. Already deleted data cannot be rolled back. Never use data restore as an assumed undo.',
 validationEntry:'npx.cmd tsx scripts/verify-account-deletion-upload-race.ts --candidate-isolated',
 installOrder:'071 baseline -> request -> engine -> approved columns/operational -> billing guard rewrites/retention -> captured trigger/access rewrites -> upload barrier/reconciliation/terminal/readback -> explicit target -> final access attestation',
};
assert.deepEqual(process.argv.slice(2),[process.argv[2]]);assert.ok(['--write','--check'].includes(process.argv[2]));
if(process.argv[2]==='--write'){
 mkdirSync(target,{recursive:true});
 writeFileSync(target+'/PREFLIGHT.sql',preflight());writeFileSync(target+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 writeFileSync(target+'/INSTALL_BLOCKED.sql',"-- REVIEW PACKAGE: original source guards are intentionally preserved.\n-- This file is NOT the production migration. Do not remove the guard to deploy.\nDO $$BEGIN RAISE EXCEPTION 'account_deletion_candidate_requires_remote_strategy_and_evidence';END$$;\n");
 console.log('Prepared hashed source package; remote install and runtime remain blocked.');
}else{assert.equal(readFileSync(target+'/PREFLIGHT.sql','utf8'),preflight(),'Read-only preflight drift');assert.deepEqual(JSON.parse(readFileSync(target+'/manifest.json','utf8')),manifest,'Candidate source drift: regenerate/review the affected evidence before release');console.log('PASS candidate source fingerprints match; remote install remains blocked.');}

function preflight(){
 const relations=capturedDeletionCatalog();
 const tableRows=relations.map(r=>`(${q(r.identity)},${q(JSON.stringify(r.detail))}::jsonb)`).join(',\n');
 const routines=capturedAccessDefinitions().routines.filter(r=>!['get_latest_snapshot','cleanup_old_snapshots'].includes(r.detail.name));
 const routineRows=routines.map(r=>`(${q(`public.${r.detail.name}(${r.detail.argumentTypes})`)},${q(r.detail.definitionMd5)})`).join(',\n');
 return `-- REVIEW PREFLIGHT ONLY: reads pg_catalog, never customer data. Does not approve installation.
-- Differences (including additions) require a refreshed capture and reviewed candidate.
BEGIN READ ONLY;
WITH expected(identity,detail)AS(VALUES ${tableRows}),
checks AS(SELECT e.identity,c.oid IS NOT NULL AND
 e.detail->>'kind'=c.relkind::text AND (e.detail->>'rls')::boolean=c.relrowsecurity AND (e.detail->>'forceRls')::boolean=c.relforcerowsecurity
 AND e.detail->'columns'=(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'nullable',NOT a.attnotnull)ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped)
 AND e.detail->'constraints'=(SELECT coalesce(jsonb_agg(jsonb_build_object('name',co.conname,'definition',pg_get_constraintdef(co.oid,true))ORDER BY co.conname),'[]')FROM pg_constraint co WHERE co.conrelid=c.oid)
 AND e.detail->'triggers'=(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid,true))ORDER BY t.tgname),'[]')FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal)
 AND e.detail->'policies'=(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'permissive',p.polpermissive,'command',p.polcmd,'roles',p.polroles::text,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid))ORDER BY p.polname),'[]')FROM pg_policy p WHERE p.polrelid=c.oid)
 AND e.detail->'grants'=(SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',g.grantee,'privilege',g.privilege_type)ORDER BY g.grantee,g.privilege_type),'[]')FROM information_schema.table_privileges g WHERE g.table_schema='public' AND g.table_name=c.relname)
 AND e.detail->>'viewDefinition' IS NOT DISTINCT FROM CASE WHEN c.relkind IN('v','m')THEN pg_get_viewdef(c.oid,true)END AS passed
 FROM expected e LEFT JOIN pg_class c ON c.oid=to_regclass(e.identity))
SELECT 'relation_drift'AS check_name,identity,coalesce(passed,false)AS passed FROM checks ORDER BY identity;
WITH expected(signature,fingerprint)AS(VALUES ${routineRows})
SELECT 'routine_drift'AS check_name,e.signature,coalesce(md5(pg_get_functiondef(p.oid))=e.fingerprint,false)AS passed
FROM expected e LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.signature) ORDER BY e.signature;
SELECT 'unexpected_relations'AS check_name,c.oid::regclass::text AS identity,false AS passed FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE(n.nspname='public' OR n.nspname LIKE 'billing_%' OR n.nspname LIKE 'deletion_%')AND c.relkind IN('r','p','v','m','f')AND c.oid::regclass::text<>ALL(ARRAY[${relations.map(r=>q(r.identity.replace('public.',''))).join(',')}]);
SELECT 'unexpected_routines'AS check_name,p.oid::regprocedure::text AS identity,false AS passed FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace\nWHERE n.nspname='public'AND(p.proname||'('||oidvectortypes(p.proargtypes)||')')<>ALL(ARRAY[${capturedAccessDefinitions().routines.map(r=>q(`${r.detail.name}(${r.detail.argumentTypes})`)).join(',')}]);\n${readFileSync('supabase/verification/095_snapshot_owner_scope_readiness.sql','utf8')}
ROLLBACK;
`;
}
