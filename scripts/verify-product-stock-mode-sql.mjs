/** Disposable PostgreSQL verification only; no credentials or cloud writes. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
const {PGlite}=await import(pathToFileURL(resolve('.codex-artifacts/region-sql-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
const pg=new PGlite();const id=randomUUID(),owner=randomUUID();
try {
 await pg.exec(`CREATE TABLE products(id UUID PRIMARY KEY,owner_id UUID,name TEXT,price NUMERIC,cost NUMERIC,stock INTEGER,unlimited_stock BOOLEAN,is_shared BOOLEAN,is_active BOOLEAN,total_sold INTEGER DEFAULT 0,updated_at TIMESTAMPTZ);
 CREATE TABLE events(id UUID PRIMARY KEY,type TEXT,payload JSONB,actor_id UUID,market_id UUID,timestamp TIMESTAMPTZ DEFAULT now());`);
 const old=process.argv.includes('--deployed') ? readFileSync('tests/fixtures/product-stock-deployed-2026-10-27.sql','utf8') : readFileSync('supabase/migrations/014_products_ownership.sql','utf8').match(/CREATE OR REPLACE FUNCTION update_product_read_model\(\)[\s\S]*?\$\$ LANGUAGE plpgsql SECURITY DEFINER;/)?.[0];
 assert.ok(old);await pg.exec(old);
 await pg.exec('CREATE TRIGGER fixture_product AFTER INSERT ON events FOR EACH ROW EXECUTE FUNCTION update_product_read_model()');
 await pg.query('INSERT INTO products(id,owner_id,stock,unlimited_stock,total_sold) VALUES($1,$2,0,true,0)',[id,owner]);
 const event=async(type,payload)=>pg.query('INSERT INTO events(id,type,payload,actor_id) VALUES($1,$2,$3,$4)',[randomUUID(),type,JSON.stringify(payload),owner]);
 await event('product_updated',{productId:id,updates:{stock:3,unlimitedStock:false}});
 assert.equal((await pg.query('SELECT unlimited_stock FROM products')).rows[0].unlimited_stock,true);
 console.log('PASS original projection reproduces ignored inventory mode');
 const before=(await pg.query(`SELECT proacl,prosecdef,proconfig FROM pg_proc WHERE oid='update_product_read_model()'::regprocedure`)).rows[0];
 const sql=readFileSync('supabase/migrations/084_project_product_stock_mode.sql','utf8');await pg.exec(sql);await pg.exec(sql);
 await pg.exec(readFileSync('supabase/verification/084_product_stock_mode_readiness.sql','utf8'));
 assert.equal((await pg.query('SELECT unlimited_stock FROM products')).rows[0].unlimited_stock,true,'Migration must not rewrite history');
 const after=(await pg.query(`SELECT proacl,prosecdef,proconfig FROM pg_proc WHERE oid='update_product_read_model()'::regprocedure`)).rows[0];assert.deepEqual(after,before);
 await event('product_updated',{productId:id,updates:{stock:3,unlimitedStock:false}});
 assert.equal((await pg.query('SELECT unlimited_stock FROM products')).rows[0].unlimited_stock,false);
 if(!process.argv.includes('--deployed')) {
  await event('deal_closed',{items:[{productId:id,quantity:1}]});
  assert.deepEqual((await pg.query('SELECT stock,total_sold FROM products')).rows[0],{stock:2,total_sold:1});
 } // Deployed deal projection has its own dependency graph; exercise it through the online fixture.
 await event('product_updated',{productId:id,updates:{name:'metadata only'}});
 assert.equal((await pg.query('SELECT unlimited_stock FROM products')).rows[0].unlimited_stock,false);
 await event('product_updated',{productId:id,updates:{unlimited_stock:true}});
 assert.equal((await pg.query('SELECT unlimited_stock FROM products')).rows[0].unlimited_stock,true);
 console.log('PASS repeatable patch preserves history, ACL/security and false/true/absent fields'+(process.argv.includes('--deployed')?'; deployed deal deduction is tested separately online':'; stock deduction works'));
} finally {await pg.close();}
