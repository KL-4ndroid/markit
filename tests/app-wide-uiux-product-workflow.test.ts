import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const plan = readFileSync(join(root, 'docs/APP_WIDE_UIUX_REMEDIATION_EXECUTION_PLAN_2026_08_12.md'), 'utf8');
const detail = readFileSync(join(root, 'components/products/ProductDetailScreen.tsx'), 'utf8');
const card = readFileSync(join(root, 'components/products/ProductCard.tsx'), 'utf8');
const photo = readFileSync(join(root, 'components/products/ProductCoverPhotoImage.tsx'), 'utf8');
const editForm = readFileSync(join(root, 'components/products/EditProductForm.tsx'), 'utf8');
const dialog = readFileSync(join(root, 'components/ui/AppDialog.tsx'), 'utf8');

assert.match(plan, /UX-R2 - Product Workflow And First-Viewport Quality/);

assert.match(detail, /aria-label="返回商品列表"/);
assert.match(detail, /min-h-11/);
assert.match(detail, /aspect-square h-24 w-24/);
assert.doesNotMatch(detail, /aspect-\[4\/3\]/);
assert.match(detail, /販售中/);
assert.match(detail, /編輯與管理/);
assert.match(detail, /成本/);
assert.match(detail, /利潤率/);
assert.match(detail, /庫存/);
assert.match(detail, /已售出/);
assert.ok(detail.indexOf('product-summary-heading') < detail.indexOf('商品描述'));

assert.match(card, /aspect-square h-16 w-16/);
assert.doesNotMatch(card, /aspect-\[4\/3\]/);
assert.ok(card.indexOf('aspect-square h-16 w-16') < card.indexOf('coverPhotoVersion ?'));

assert.match(photo, /fetchProductCoverPhoto\(productId, variant\)/);
assert.match(photo, /h-full w-full object-cover/);
assert.match(detail, /fallback=\{<CategoryIcon/);

assert.doesNotMatch(detail, /\bupdateProduct\b|\bdeleteProduct\b/);
assert.match(editForm, /aria-labelledby="product-management-heading"/);
assert.match(editForm, /open=\{showStatusConfirm\}/);
assert.match(editForm, /open=\{showDeleteConfirm\}/);
assert.match(editForm, /!isManagerMode\s*&&\s*\(/);
assert.match(editForm, /onDeleted\?\.\(\)/);

assert.match(dialog, /max-h-\[90dvh\]/);
assert.match(dialog, /overflow-y-auto px-5 py-5/);
assert.match(dialog, /<footer className=/);

console.log('PASS UX-R2 product workflow and first-viewport contracts');
