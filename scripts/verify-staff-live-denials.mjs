/** Opt-in verification for the named synthetic account/market only. Never log tokens. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { parse } from 'dotenv';

assert.ok(process.argv.includes('--live'), 'Requires explicit --live and an authorized test-role window.');
const expected = process.env.STAFF_ACCEPTANCE_ROLE;
assert.ok(['viewer', 'operator', 'manager'].includes(expected));
const password = process.env.STAFF_ACCEPTANCE_PASSWORD;
assert.ok(password, 'Set the test password in process environment; never store it in this file.');
const env = parse(readFileSync('.env.local'));
const base = env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(base).hostname, 'fgejncfsvvsayiequubm.supabase.co');
const apikey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const auth = await fetch(`${base}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: '1234@1234', password }),
});
assert.equal(auth.status, 200, 'Test sign-in failed; response body is intentionally not logged.');
const session = await auth.json();
const headers = { apikey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
const get = async path => {
  const response = await fetch(`${base}/rest/v1/${path}`, { headers });
  assert.equal(response.status, 200);
  return response.json();
};
const relationships = await get(`staff_relationships?staff_id=eq.${session.user.id}&status=eq.active&select=role,owner_id`);
assert.equal(relationships.length, 1, 'Require exactly one active test relationship.');
assert.equal(relationships[0].role, expected, 'Role changed: abort before submitting any probe.');
const marketId = '622aa8bc-c4f2-4068-9592-1cf8c872af90';
const markets = await get(`staff_accessible_markets?id=eq.${marketId}&select=id,name,owner_id`);
assert.equal(markets.length, 1);
assert.ok(markets[0].name.startsWith('[驗收1027-O]'));
assert.equal(markets[0].owner_id, relationships[0].owner_id);
assert.deepEqual(await get(`products?id=eq.1fc5f0d5-78ec-4c1c-9525-55918fee1b01&select=id,cost`), [], 'Staff must not bypass the masked view through products.');
assert.deepEqual(await get(`markets?id=eq.${marketId}&select=id,total_profit`), [], 'Staff must not bypass the masked view through markets.');
const masked = await get('staff_accessible_products?id=eq.1fc5f0d5-78ec-4c1c-9525-55918fee1b01&select=id,cost');
assert.ok(masked.length > 0 && masked.every(row => row.cost === null), 'Product view must mask owner cost.');
const id = randomUUID();
const payload = expected === 'viewer'
  ? { market_id: marketId, interactionType: 'touch', acceptanceProbe: true }
  : expected === 'operator'
    ? { market_id: marketId, noteId: randomUUID(), content: '[驗收1028] 此寫入應被拒絕' }
    : { market_id: marketId, updates: { boothCost: 999999 } };
const type = expected === 'viewer' ? 'interaction_recorded' : expected === 'operator' ? 'field_note_created' : 'market_updated';
const response = await fetch(`${base}/rest/v1/events`, {
  method: 'POST', headers: { ...headers, Prefer: 'return=minimal' },
  body: JSON.stringify({ id, actor_id: session.user.id, market_id: marketId, type, payload, timestamp: new Date().toISOString() }),
});
if (response.ok) throw new Error(`Unexpected allowed probe: ${expected} ${type}, synthetic event ${id}. Stop and review this test fixture.`);
const failure = await response.json();
assert.equal(response.status, 403);
assert.equal(failure.code, '42501');
assert.match(failure.message, /^EVENT_AUTH_(ROLE|FIELD)/);
const ownerPassword = process.env.OWNER_ACCEPTANCE_PASSWORD;
assert.ok(ownerPassword, 'Owner verification password is required to confirm absence under owner RLS.');
const ownerAuth = await fetch(`${base}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: '123@123', password: ownerPassword }),
});
assert.equal(ownerAuth.status, 200);
const ownerSession = await ownerAuth.json();
assert.equal(ownerSession.user.id, relationships[0].owner_id);
const ownerCheck = await fetch(`${base}/rest/v1/events?id=eq.${id}&select=id`, {
  headers: { apikey, Authorization: `Bearer ${ownerSession.access_token}` },
});
assert.equal(ownerCheck.status, 200);
assert.deepEqual(await ownerCheck.json(), [], 'Owner RLS must confirm denied probe did not persist.');
const productCheck = await fetch(`${base}/rest/v1/products?id=eq.1fc5f0d5-78ec-4c1c-9525-55918fee1b01&select=price,cost,stock,total_sold,description`, {
  headers: { apikey, Authorization: `Bearer ${ownerSession.access_token}` },
});
assert.equal(productCheck.status, 200);
const [product] = await productCheck.json();
console.log({ syntheticProduct: { price: product.price, stock: product.stock, sold: product.total_sold, description: product.description }, originalCostRetained: product.cost === 40 });
console.log(`PASS live ${expected}: ${type} rejected (403/42501/${failure.message}); owner confirmed absence; direct finance reads blocked and view cost masked.`);
