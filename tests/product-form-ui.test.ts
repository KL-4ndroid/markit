import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const addForm = readFileSync(join(root, 'components/products/AddProductForm.tsx'), 'utf8');
const editForm = readFileSync(join(root, 'components/products/EditProductForm.tsx'), 'utf8');
const fields = readFileSync(join(root, 'components/products/ProductFormFields.tsx'), 'utf8');
const detailPage = readFileSync(join(root, 'components/products/ProductDetailScreen.tsx'), 'utf8');

for (const source of [addForm, editForm]) {
  assert.match(source, /<ProductFormFields/);
  assert.match(source, /validateProductForm\(/);
  assert.match(source, /getFirstProductFormError\(/);
  assert.match(source, /\.focus\(\)/);
  assert.match(source, /<AppDialog/);
  assert.match(source, /<ConfirmDialog/);
  assert.doesNotMatch(source, /\b(?:window\.)?alert\s*\(|\bwindow\.confirm\s*\(/);
}

assert.match(fields, /mode\?: 'owner' \| 'manager'/);
assert.match(fields, /!isManagerMode &&[\s\S]*?商品名稱/);
assert.match(fields, /!isManagerMode &&[\s\S]*?label="成本"/);
assert.match(fields, /label="售價"/);
assert.match(fields, /aria-label="商品分類"/);
assert.match(fields, /min-h-11/);

assert.match(detailPage, /const EditProductForm = dynamic\(/);
assert.match(detailPage, /product && showEditForm &&/);

console.log('PASS shared product form UI and lazy-loading guardrails');
