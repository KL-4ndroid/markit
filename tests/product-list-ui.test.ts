import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const page = readFileSync(join(root, 'app/products/page.tsx'), 'utf8');
const card = readFileSync(join(root, 'components/products/ProductCard.tsx'), 'utf8');

assert.match(page, /useDeferredValue\(searchQuery\)/);
assert.match(page, /filterProductList\(allProducts/);
assert.match(page, /isActive:\s*isStaffMode \? true : undefined/);
assert.match(page, /ariaLabel="商品分類"/);
assert.match(page, /顯示停用商品/);
assert.match(page, /PRODUCT_LIST_RETURN_STATE_KEY/);
assert.match(page, /scrollY: window\.scrollY/);
assert.match(page, /dynamic\(/);
assert.match(page, /isFormOpen &&/);
assert.doesNotMatch(page, /EditProductForm|editingProduct|emoji/);

assert.match(card, /getProductStockState\(product\)/);
assert.match(card, /formatCurrency\(product\.price\)/);
assert.match(card, /查看與編輯/);
assert.doesNotMatch(card, /product\.cost|profitMargin|totalSold|canViewSensitiveData/);

console.log('PASS focused searchable product list UI');
