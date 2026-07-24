import assert from 'node:assert/strict';

import {
  getAppNavigationItems,
  isAppNavigationItemActive,
} from '../lib/navigation/app-navigation';

const ownerItems = getAppNavigationItems({ isStaff: false, roleReady: true });
assert.deepEqual(
  ownerItems.map(item => [item.id, item.label]),
  [
    ['today', '今日'],
    ['markets', '市集'],
    ['products', '商品'],
    ['analytics', '分析'],
    ['more', '更多'],
  ],
);

const staffItems = getAppNavigationItems({ isStaff: true, roleReady: true });
assert.deepEqual(staffItems.map(item => item.id), ['today', 'markets', 'products', 'more']);
assert.equal(staffItems.some(item => item.id === 'analytics'), false);

const unresolvedItems = getAppNavigationItems({ isStaff: false, roleReady: false });
assert.deepEqual(unresolvedItems.map(item => item.id), ['today', 'markets', 'products', 'more']);

const byId = new Map(ownerItems.map(item => [item.id, item]));
assert.equal(isAppNavigationItemActive('/', byId.get('today')!), true);
assert.equal(isAppNavigationItemActive('/markets/market-1', byId.get('markets')!), true);
assert.equal(isAppNavigationItemActive('/products/product-1', byId.get('products')!), true);
assert.equal(isAppNavigationItemActive('/reports/settlement', byId.get('analytics')!), true);
assert.equal(isAppNavigationItemActive('/recovery', byId.get('more')!), true);
assert.equal(isAppNavigationItemActive('/subscription', byId.get('more')!), true);
assert.equal(isAppNavigationItemActive('/markets', byId.get('today')!), false);
assert.equal(isAppNavigationItemActive('/analytics', byId.get('more')!), false);

console.log('PASS role-aware app navigation');
