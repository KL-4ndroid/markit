import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { ProductCard } from '../components/products/ProductCard';
import type { Product } from '../types/db';

const product = {
  id: 'synthetic', name: '測試商品', category: 'handmade', price: 120,
  stock: 2, unlimitedStock: false, isActive: true, totalSold: 5,
  createdAt: 1, updatedAt: 1,
} as Product;
const router = { push() {}, replace() {}, prefetch() {}, back() {}, forward() {}, refresh() {} };
function render(showSoldCount: boolean, showOperationalData = true) {
  return renderToStaticMarkup(<AppRouterContext.Provider value={router}>
    <ProductCard product={product} showSoldCount={showSoldCount} showOperationalData={showOperationalData} />
  </AppRouterContext.Provider>);
}
const owner = render(true);
const staff = render(false);
assert.match(owner, /5 件/);
assert.doesNotMatch(owner, /已售數量尚未確認/);
assert.match(staff, /已售數量尚未確認/);
assert.doesNotMatch(staff, /5 件/);
assert.match(staff, /\$120/);
const viewer = render(false, false);
assert.doesNotMatch(viewer, /\$120|庫存 2|庫存不足|已售 5/);
assert.match(viewer, /未提供/);
assert.match(viewer, /測試商品/);
console.log('PASS staff product card avoids an unverified sold count while preserving price');
