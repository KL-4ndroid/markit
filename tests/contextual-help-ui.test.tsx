import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContextHelp } from '../components/ui/ContextHelp';
import { ProductFormFields } from '../components/products/ProductFormFields';
import { MarketBasicFields } from '../components/markets/MarketFormFields';
import { createEmptyProductFormValues } from '../lib/products/product-form';
import { StaffPermissionCard } from '../components/staff/StaffPermissionCard';

// Help inside a form must never submit it, and essential content cannot depend on opening it.
const closed = renderToStaticMarkup(<form><ContextHelp label="盤點說明"><p>補充規則</p></ContextHelp></form>);
assert.match(closed, /<button type="button"[^>]*aria-label="查看盤點說明"[^>]*aria-haspopup="dialog"[^>]*aria-expanded="false"/);
assert.doesNotMatch(closed, /補充規則/);
assert.match(closed, /min-h-11 min-w-11/);
const compact = renderToStaticMarkup(<ContextHelp label="客單價說明" iconOnly><p>詳細公式</p></ContextHelp>);
assert.match(compact, /aria-label="查看客單價說明"/);

const write = () => { throw new Error('rendering help and forms must not mutate data'); };
const values = { ...createEmptyProductFormValues(), name: '陶杯', price: 300, unlimitedStock: false, stock: 8 };
const product = renderToStaticMarkup(<ProductFormFields idPrefix="product" values={values} errors={{ price: '金額待確認' }} onChange={write} />);
for (const label of ['商品名稱', '售價（元）', '成本（元）', '庫存數量', '商品描述（選填）']) assert.ok(product.includes(label));
assert.match(product, /aria-invalid="true"/);
assert.match(product, /金額待確認/);
assert.match(product, /只有老闆可查看與修改/);
assert.doesNotMatch(product, /先完成銷售時一定會用到的資料|依商品需要調整，不影響快速建立/);
const manager = renderToStaticMarkup(<ProductFormFields idPrefix="manager" mode="manager" values={values} errors={{}} onChange={write} />);
assert.doesNotMatch(manager, /商品名稱|成本（元）|只有老闆/);
assert.match(manager, /售價（元）/);

const market = renderToStaticMarkup(<MarketBasicFields idPrefix="market" name="夜市" location="南紡" dates={['2026-10-25']} errors={{name:'名稱待確認'}} onNameChange={write} onLocationChange={write} onDatesChange={write} />);
assert.match(market, /市集日期（可複選）/);
assert.match(market, /地標或地址皆可/);
assert.match(market, /名稱待確認/);
assert.doesNotMatch(market, /名稱、地點與日期是市集的核心資料|例如：華山文創市集/);

for (const role of ['viewer', 'operator', 'manager'] as const) {
  const html = renderToStaticMarkup(<StaffPermissionCard staffRole={role} authorizationFresh />);
  assert.match(html, /aria-label="查看角色工作範圍"/);
  assert.ok(!html.includes('以下為角色規則'), 'supplemental detail starts closed');
  if (role === 'viewer') assert.match(html, /不能記錄或修改資料/);
}
const stale = renderToStaticMarkup(<StaffPermissionCard staffRole="operator" authorizationFresh={false} />);
assert.match(stale, /存取資格尚未確認/);
console.log('PASS supplemental help stays optional while labels, units, field errors, owner privacy and access warnings remain visible');
