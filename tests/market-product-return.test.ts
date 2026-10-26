import assert from 'node:assert/strict';
import { buildProductManagementHref, resolveProductMarketReturn } from '../lib/navigation/market-product-return';
import { buildProductDetailHref } from '../lib/navigation/product-detail-route';

const base = 'https://app.invalid';
const origin = { fromMarket: 'market-123', marketReturnTo: 'today' };
const management = new URL(buildProductManagementHref(origin), base);
assert.equal(management.pathname, '/products');
const detail = new URL(buildProductDetailHref('product?one', origin), base);
assert.equal(detail.searchParams.get('id'), 'product?one');
const restored = { fromMarket: detail.searchParams.get('fromMarket'), marketReturnTo: detail.searchParams.get('marketReturnTo') };
assert.equal(buildProductManagementHref(restored), management.pathname + management.search);
const back = resolveProductMarketReturn(restored)!;
const target = new URL(back.href, base);
assert.equal(target.origin, base);
assert.equal(target.searchParams.get('id'), origin.fromMarket);
assert.equal(target.searchParams.get('task'), 'products');
assert.equal(target.searchParams.get('returnTo'), 'today');
for (const value of [null, '', 'https://evil.invalid', '//evil.invalid', 'a?task=admin', '../settings', '<script>']) {
  assert.equal(resolveProductMarketReturn({ fromMarket: value }), null);
  assert.equal(buildProductManagementHref({ fromMarket: value }), '/products');
}
const safe = new URL(resolveProductMarketReturn({ fromMarket: 'market-123', marketReturnTo: 'https://evil.invalid' })!.href, base);
assert.equal(safe.searchParams.get('returnTo'), 'markets');
assert.equal(buildProductDetailHref('plain'), '/products/detail/?id=plain', 'ordinary product navigation stays unchanged');
console.log('PASS market → products → product detail → original sale round trip and internal-only destination validation');
