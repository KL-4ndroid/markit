import assert from 'node:assert/strict';

import {
  createEmptyProductFormValues,
  getFirstProductFormError,
  toProductCreatedPayload,
  validateProductForm,
} from '../lib/products/product-form';

const empty = createEmptyProductFormValues();
assert.equal(empty.unlimitedStock, true);
assert.equal(empty.isActive, true);

const requiredErrors = validateProductForm(empty);
assert.equal(requiredErrors.name, '請輸入商品名稱');
assert.equal(requiredErrors.price, '售價必須大於 0');
assert.equal(getFirstProductFormError(requiredErrors), 'name');

const managerErrors = validateProductForm({
  ...empty,
  name: '',
  price: 500,
  cost: -10,
}, { requireIdentity: false });
assert.deepEqual(managerErrors, {});

const stockErrors = validateProductForm({
  ...empty,
  name: '手作陶杯',
  price: 500,
  unlimitedStock: false,
  stock: -1,
});
assert.equal(stockErrors.stock, '庫存不可小於 0');

assert.deepEqual(toProductCreatedPayload({
  ...empty,
  name: '  手作陶杯  ',
  description: '  霧面釉色  ',
  price: 500,
  cost: 180,
  stock: 7,
  unlimitedStock: true,
}), {
  name: '手作陶杯',
  category: 'handmade',
  price: 500,
  cost: 180,
  stock: 0,
  unlimitedStock: true,
  description: '霧面釉色',
});

console.log('PASS shared product form validation and normalization');
