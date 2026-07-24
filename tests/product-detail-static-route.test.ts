import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PRODUCT_DETAIL_PATH,
  buildProductDetailHref,
  normalizeProductDetailId,
} from '../lib/navigation/product-detail-route';

const root = join(__dirname, '..');
const staticPagePath = join(root, 'app/products/detail/page.tsx');
const queryScreenPath = join(root, 'components/products/ProductDetailQueryScreen.tsx');
const legacyDynamicPagePath = join(root, 'app/products/[id]/page.tsx');
const legacyWebPagePath = join(root, 'app/products/[id]/page.web.tsx');
const productListSource = readFileSync(join(root, 'app/products/page.tsx'), 'utf8');
const productCardSource = readFileSync(join(root, 'components/products/ProductCard.tsx'), 'utf8');

assert.equal(PRODUCT_DETAIL_PATH, '/products/detail/');
assert.equal(buildProductDetailHref('product-1'), '/products/detail/?id=product-1');
assert.equal(buildProductDetailHref(' product / 1 '), '/products/detail/?id=product%20%2F%201');
assert.equal(normalizeProductDetailId(' product-1 '), 'product-1');
assert.equal(normalizeProductDetailId(null), '');
assert.throws(() => buildProductDetailHref('  '), /product id is required/i);

assert.equal(existsSync(staticPagePath), true, 'fixed product detail route must exist');
assert.equal(existsSync(legacyDynamicPagePath), false, 'legacy dynamic product route must be removed');
assert.equal(existsSync(legacyWebPagePath), true, 'Web must retain legacy product bookmarks');

const staticPageSource = readFileSync(staticPagePath, 'utf8');
const queryScreenSource = readFileSync(queryScreenPath, 'utf8');
const legacyWebPageSource = readFileSync(legacyWebPagePath, 'utf8');

assert.match(staticPageSource, /<Suspense\s+fallback=/);
assert.match(staticPageSource, /<ProductDetailQueryScreen\s*\/>/);
assert.match(queryScreenSource, /useSearchParams\(\)/);
assert.match(queryScreenSource, /searchParams\.get\(['"]id['"]\)/);
assert.match(legacyWebPageSource, /import \{ redirect \} from ['"]next\/navigation['"]/);
assert.match(legacyWebPageSource, /redirect\(buildProductDetailHref\(id\)\)/);
assert.match(productListSource, /router\.push\(buildProductDetailHref\(product\.id\)\)/);
assert.match(productCardSource, /router\.push\(buildProductDetailHref\(product\.id\)\)/);
assert.doesNotMatch(productListSource, /`\/products\/\$\{product\.id\}`/);
assert.doesNotMatch(productCardSource, /`\/products\/\$\{product\.id\}`/);

console.log('PASS product detail fixed static route and URL builder');
