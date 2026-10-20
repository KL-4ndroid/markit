import assert from 'node:assert/strict';

import {
  filterProductList,
  getProductStockState,
} from '../lib/products/product-list-view-model';
import type { Product } from '../types/db';

function product(overrides: Partial<Product>): Product {
  return {
    id: 'product-1',
    name: '手作耳環',
    category: 'accessory',
    price: 500,
    stock: 10,
    isActive: true,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

const products = [
  product({ id: 'earring', name: '手作 耳環', description: '黃銅材質' }),
  product({ id: 'cake', name: '檸檬蛋糕', category: 'food' }),
  product({ id: 'inactive', name: '舊款耳環', isActive: false }),
];

assert.deepEqual(filterProductList(products, {
  category: 'accessory',
  query: '  黃銅  ',
  includeInactive: false,
}).map(item => item.id), ['earring']);

assert.deepEqual(filterProductList(products, {
  category: 'all',
  query: '耳環',
  includeInactive: true,
}).map(item => item.id), ['earring', 'inactive']);

assert.equal(getProductStockState(product({ unlimitedStock: true })).label, '不限庫存');
assert.deepEqual(getProductStockState(product({ stock: 0 })), { label: '已售完', tone: 'danger' });
assert.deepEqual(getProductStockState(product({ stock: 3 })), { label: '庫存 3', tone: 'warn' });
assert.deepEqual(getProductStockState(product({ isActive: false })), { label: '已停用', tone: 'neutral' });

console.log('PASS searchable product list model');
