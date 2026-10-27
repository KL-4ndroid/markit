/** Isolated PostgreSQL checks. No credentials, network or production access. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
const {PGlite}=await import(pathToFileURL(resolve('.codex-artifacts/region-sql-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
const pg=new PGlite();
const owner=randomUUID(),other=randomUUID(),product=randomUUID(),photo=randomUUID(),replacement=randomUUID();
try {
 await pg.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$SELECT null::uuid$$;
 CREATE TABLE profiles(id UUID PRIMARY KEY); CREATE TABLE products(id UUID PRIMARY KEY,owner_id UUID,is_active BOOLEAN DEFAULT true);
 CREATE TABLE staff_relationships(owner_id UUID,staff_id UUID,role TEXT,status TEXT);
 ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;`);
 await pg.exec(readFileSync('supabase/migrations/062_add_product_cover_photos.sql','utf8'));
 await pg.query('INSERT INTO profiles VALUES($1),($2)',[owner,other]);
 await pg.query('INSERT INTO products(id,owner_id) VALUES($1,$2)',[product,owner]);
 const version=Date.now();
 await assert.rejects(pg.query('SELECT claim_product_cover_photo_upload($1,$2,$3,$4::integer,100,1000000,false)',[owner,product,photo,version]),/out of range/);
 console.log('PASS old integer signature reproduces millisecond overflow');
 await pg.query("INSERT INTO product_cover_photos(id,owner_id,product_id,status,version,display_object_key,thumbnail_object_key) VALUES($1,$2,$3,'uploaded',7,'original-display','original-thumbnail')",[photo,owner,product]);
 const migration=readFileSync('supabase/migrations/083_widen_product_photo_versions.sql','utf8');
 await pg.exec(migration); await pg.exec(migration);
 await pg.exec(readFileSync('supabase/verification/083_product_photo_version_readiness.sql','utf8'));
 const preserved=(await pg.query('SELECT version,display_object_key,thumbnail_object_key FROM product_cover_photos')).rows[0];
 assert.equal(Number(preserved.version),7);assert.equal(preserved.display_object_key,'original-display');assert.equal(preserved.thumbnail_object_key,'original-thumbnail');
 console.log('PASS migration is repeatable and preserves existing versions and objects');
 await pg.query('SELECT claim_product_cover_photo_upload($1,$2,$3,$4::bigint,100,1000000,false)',[owner,product,replacement,version]);
 const pending=(await pg.query('SELECT version,pending_version,status FROM product_cover_photos')).rows[0];
 assert.equal(Number(pending.version),7);assert.equal(Number(pending.pending_version),version);assert.equal(pending.status,'uploaded');
 await assert.rejects(pg.query('SELECT claim_product_cover_photo_upload($1,$2,$3,$4::bigint,100,1000000,false)',[other,product,randomUUID(),version+1]),/permission_denied/);
 await pg.query(`SELECT finalize_product_cover_photo_upload($1,$2,$3,$4::bigint,'new-display','new-thumbnail','hash-d','hash-t','image/webp','image/webp',60,40,640,480,false)`,[owner,product,replacement,version]);
 const finalized=(await pg.query('SELECT id,version,pending_version,status,display_object_key FROM product_cover_photos')).rows[0];
 assert.equal(finalized.id,replacement);assert.equal(Number(finalized.version),version);assert.equal(finalized.pending_version,null);assert.equal(finalized.status,'uploaded');assert.equal(finalized.display_object_key,'new-display');
 console.log('PASS claim and finalize accept millisecond versions; owner boundary and pending replacement remain intact');
 await pg.exec('SET ROLE authenticated');
 await assert.rejects(pg.query('SELECT claim_product_cover_photo_upload($1,$2,$3,$4::bigint,100,1000000,false)',[owner,product,randomUUID(),version+1]),/permission denied/);
 console.log('PASS authenticated clients cannot directly execute the privileged RPC');
} finally {await pg.close();}

// Reproduce the live OpenAPI shape: six claim / fourteen finalize arguments,
// without the newer boolean switch. Cover both int4 and a partly widened DB.
for (const [legacyType,bodyFormat] of [['integer','original'],['bigint','original'],['integer','crlf-lowercase'],['integer','same-line'],['integer','compiler-directive']]) {
 const legacyPg=new PGlite();
 try {
  await legacyPg.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
   CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$SELECT null::uuid$$;
   CREATE TABLE profiles(id UUID PRIMARY KEY); CREATE TABLE products(id UUID PRIMARY KEY,owner_id UUID,is_active BOOLEAN DEFAULT true);
   CREATE TABLE staff_relationships(owner_id UUID,staff_id UUID,role TEXT,status TEXT);
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;`);
  let legacySql=readFileSync('supabase/migrations/062_add_product_cover_photos.sql','utf8')
   .replace(/  IF p_require_entitlement AND NOT EXISTS \([\s\S]*?THEN RAISE EXCEPTION 'paid_entitlement_required'; END IF;\r?\n/g,'')
   .replace(/,\s*p_require_entitlement boolean/g,'')
   .split('\n').map(line=>/ON FUNCTION public\.(claim|finalize)_product_cover_photo_upload/.test(line)?line.replace(', boolean)',')'):line).join('\n');
  assert.ok(!legacySql.includes('p_require_entitlement'));
  if(bodyFormat==='crlf-lowercase') legacySql=legacySql.replace(/\bBEGIN\b/g,'begin').replace(/\r?\n/g,'\r\n');
  if(bodyFormat==='same-line') legacySql=legacySql.replace(/\bBEGIN\s+/g,'BEGIN ');
  if(bodyFormat==='compiler-directive') legacySql=legacySql.replace(/AS \$\$\r?\n/g,()=> 'AS $$\n#variable_conflict use_column\n');
  // The previous migration rejects both valid deployed formatting variants.
  if(bodyFormat==='crlf-lowercase'||bodyFormat==='same-line') assert.ok(!legacySql.includes('BEGIN\n'));
  await legacyPg.exec(legacySql);
  if(legacyType==='bigint') {
   for(const signature of [
    'claim_product_cover_photo_upload(uuid,uuid,uuid,integer,integer,bigint)',
    'finalize_product_cover_photo_upload(uuid,uuid,uuid,integer,text,text,text,text,text,text,integer,integer,integer,integer)'
   ]) {
    const definition=(await legacyPg.query('SELECT pg_get_functiondef($1::regprocedure) AS definition',[signature])).rows[0].definition;
    await legacyPg.exec(definition.replace('p_version integer','p_version bigint'));
    await legacyPg.exec('DROP FUNCTION '+signature);
   }
  }
  const baseSignature=`claim_product_cover_photo_upload(uuid,uuid,uuid,${legacyType},integer,bigint)`;
  const original=(await legacyPg.query('SELECT prosrc,proconfig,proowner FROM pg_proc WHERE oid=$1::regprocedure',[baseSignature])).rows[0];
  const migration=readFileSync('supabase/migrations/083_widen_product_photo_versions.sql','utf8');
  await legacyPg.exec(migration);await legacyPg.exec(migration);
  await legacyPg.exec(readFileSync('supabase/verification/083_product_photo_version_readiness.sql','utf8'));
  const preserved=(await legacyPg.query("SELECT prosrc,proconfig,proowner FROM pg_proc WHERE oid='claim_product_cover_photo_upload(uuid,uuid,uuid,bigint,integer,bigint)'::regprocedure")).rows[0];
  assert.deepEqual(preserved,original,'deployed body, search_path and function owner must be unchanged');
  const variants=(await legacyPg.query("SELECT pronargs,pronargdefaults FROM pg_proc WHERE proname='claim_product_cover_photo_upload' ORDER BY pronargs")).rows;
  assert.deepEqual(variants,[{pronargs:6,pronargdefaults:0},{pronargs:7,pronargdefaults:0}]);
  await legacyPg.query('INSERT INTO profiles VALUES($1),($2)',[owner,other]);
  await legacyPg.query('INSERT INTO products(id,owner_id) VALUES($1,$2)',[product,owner]);
  const version=Date.now();
  await assert.rejects(legacyPg.query('SELECT claim_product_cover_photo_upload($1,$2,$3,$4::bigint,100,1000000,true)',[owner,product,photo,version]),/paid_entitlement_required/);
  await assert.rejects(legacyPg.query('SELECT claim_product_cover_photo_upload($1,$2,$3,$4::bigint,100,1000000,NULL)',[owner,product,photo,version]),/paid_entitlement_required/);
  await assert.rejects(legacyPg.query('SELECT claim_product_cover_photo_upload($1,$2,$3,$4::bigint,100,1000000,false)',[other,product,photo,version]),/permission_denied/);
  await legacyPg.query('SELECT claim_product_cover_photo_upload($1,$2,$3,$4::bigint,100,1000000,false)',[owner,product,photo,version]);
  await assert.rejects(legacyPg.query(`SELECT finalize_product_cover_photo_upload($1,$2,$3,$4::bigint,'d','t','dh','th','image/webp','image/webp',60,40,640,480,true)`,[owner,product,photo,version]),/paid_entitlement_required/);
  await legacyPg.query(`SELECT finalize_product_cover_photo_upload($1,$2,$3,$4::bigint,'d','t','dh','th','image/webp','image/webp',60,40,640,480,false)`,[owner,product,photo,version]);
  const row=(await legacyPg.query('SELECT version,status FROM product_cover_photos')).rows[0];
  assert.equal(Number(row.version),version);assert.equal(row.status,'uploaded');
  await legacyPg.exec('SET ROLE authenticated');
  await assert.rejects(legacyPg.query('SELECT claim_product_cover_photo_upload($1,$2,$3,$4::bigint,100,1000000,false)',[owner,product,photo,version]),/permission denied/);
  await assert.rejects(legacyPg.query('SELECT claim_product_cover_photo_upload($1,$2,$3,$4::bigint,100,1000000)',[owner,product,photo,version]),/permission denied/);
  console.log(`PASS legacy ${legacyType} / ${bodyFormat}: original body/config/owner preserved, repeatable migration, upload, owner/service boundary, true/null fail closed`);
 } finally {await legacyPg.close();}
}

const ambiguousPg=new PGlite();
try {
 await ambiguousPg.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE TABLE product_cover_photos(version integer,pending_version integer);
  INSERT INTO product_cover_photos VALUES(7,8);
  CREATE FUNCTION claim_product_cover_photo_upload(uuid,uuid,uuid,integer,integer,bigint)
    RETURNS product_cover_photos LANGUAGE SQL SECURITY DEFINER AS $$SELECT NULL::product_cover_photos$$;
  CREATE FUNCTION claim_product_cover_photo_upload(uuid,uuid,uuid,integer,integer,bigint,boolean)
    RETURNS product_cover_photos LANGUAGE SQL SECURITY DEFINER AS $$SELECT NULL::product_cover_photos$$;`);
 await assert.rejects(ambiguousPg.exec(readFileSync('supabase/migrations/083_widen_product_photo_versions.sql','utf8')),/Expected one original photo RPC/);
 await ambiguousPg.exec('ROLLBACK');
 const types=(await ambiguousPg.query("SELECT data_type FROM information_schema.columns WHERE table_name='product_cover_photos' ORDER BY ordinal_position")).rows;
 assert.deepEqual(types,[{data_type:'integer'},{data_type:'integer'}]);
 assert.deepEqual((await ambiguousPg.query('SELECT * FROM product_cover_photos')).rows,[{version:7,pending_version:8}]);
 console.log('PASS ambiguous deployment fails closed and rolls back column/data changes');
} finally {await ambiguousPg.close();}

// Old deployments may return JSON/void rather than the row type. Preserve the
// actual catalog return contract; do not infer it from the repo's newer SQL.
for(const returnType of ['jsonb','void']) {
 const returnPg=new PGlite();
 try {
  await returnPg.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
   CREATE TABLE product_cover_photos(version integer,pending_version integer);`);
  const claimArgs='p_actor_id uuid,p_product_id uuid,p_photo_id uuid,p_version integer,p_requested_bytes integer,p_max_account_bytes bigint';
  const finalizeArgs='p_actor_id uuid,p_product_id uuid,p_photo_id uuid,p_version integer,p_display_object_key text,p_thumbnail_object_key text,p_display_content_hash text,p_thumbnail_content_hash text,p_display_mime_type text,p_thumbnail_mime_type text,p_display_size_bytes integer,p_thumbnail_size_bytes integer,p_width integer,p_height integer';
  for(const [name,args] of [['claim_product_cover_photo_upload',claimArgs],['finalize_product_cover_photo_upload',finalizeArgs]]) {
   const body=returnType==='jsonb'?"LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$SELECT jsonb_build_object('version',p_version)$$":"LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$begin return; end$$";
   await returnPg.exec(`CREATE FUNCTION ${name}(${args}) RETURNS ${returnType} ${body}`);
  }
  await returnPg.exec(readFileSync('supabase/migrations/083_widen_product_photo_versions.sql','utf8'));
  await returnPg.exec(readFileSync('supabase/migrations/083_widen_product_photo_versions.sql','utf8'));
  await returnPg.exec(readFileSync('supabase/verification/083_product_photo_version_readiness.sql','utf8'));
  await assert.rejects(returnPg.query('SELECT claim_product_cover_photo_upload($1,$2,$3,$4::bigint,100,1000000,true)',[owner,product,photo,Date.now()]),/paid_entitlement_required/);
  const version=Date.now();
  const value=(await returnPg.query('SELECT claim_product_cover_photo_upload($1,$2,$3,$4::bigint,100,1000000,false) AS result',[owner,product,photo,version])).rows[0].result;
  if(returnType==='jsonb') assert.deepEqual(value,{version});
  const result=(await returnPg.query("SELECT pg_get_function_result('claim_product_cover_photo_upload(uuid,uuid,uuid,bigint,integer,bigint,boolean)'::regprocedure) AS result")).rows[0].result;
  assert.equal(result,returnType);
  console.log(`PASS legacy ${returnType} return contract and SQL/PLpgSQL language preserved with fail-closed wrapper`);
 } finally {await returnPg.close();}
}
