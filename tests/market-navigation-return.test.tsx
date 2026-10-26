import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildMarketDetailHref, buildMarketJournalsHref, resolveMarketDetailReturn, resolveMarketJournalsReturn } from '../lib/navigation/market-detail-route';
import { MarketReturnLink } from '../components/markets/MarketReturnLink';
import { MarketDetailLoadingShell } from '../components/markets/MarketDetailLoadingShell';

const base = 'https://example.test';
for (const [key, href, label] of [
  ['today', '/', '返回今日'], ['markets', '/markets', '返回市集'],
  ['journals', '/markets/journals', '返回心得'], ['analytics', '/analytics', '返回分析'],
  ['account', '/settings/account', '返回帳號'],
]) {
  assert.deepEqual(resolveMarketDetailReturn(key), { href, label });
  const url = new URL(buildMarketDetailHref('m-1', { returnTo: key, task: 'registration' }), base);
  assert.equal(url.searchParams.get('returnTo'), key);
  assert.equal(url.searchParams.get('task'), 'registration');
  const markup = renderToStaticMarkup(<MarketReturnLink returnTo={key} />);
  assert.match(markup, new RegExp(`href="${href}"`));
  assert.ok(markup.includes(`aria-label="${label}"`));
  assert.ok(markup.includes(`<span>${label}</span>`), 'return destination must be visible, not only a screen-reader label');
}
for (const value of [undefined, null, '', 'https://example.invalid', '//evil.test', 'javascript:alert(1)', '/settings', '__proto__', 'toString', 'constructor']) {
  assert.deepEqual(resolveMarketDetailReturn(value), { href: '/markets', label: '返回市集' });
  const href = new URL(buildMarketDetailHref('m-1', { returnTo: value }), base);
  assert.equal(href.origin, base);
  assert.equal(resolveMarketDetailReturn(href.searchParams.get('returnTo')).href, '/markets');
}
const collection = new URL(buildMarketJournalsHref('market/one?x=2', 'today'), base);
assert.equal(collection.pathname, '/markets/journals');
assert.equal(collection.searchParams.get('fromMarket'), 'market/one?x=2');
const returnToMarket = resolveMarketJournalsReturn(collection.searchParams.get('fromMarket'), collection.searchParams.get('marketReturnTo'));
const returnUrl = new URL(returnToMarket.href, base);
assert.equal(returnUrl.pathname, '/markets/detail/');
assert.equal(returnUrl.searchParams.get('id'), 'market/one?x=2');
assert.equal(returnUrl.searchParams.get('task'), 'journal');
assert.equal(returnUrl.searchParams.get('returnTo'), 'today');
assert.equal(returnToMarket.label, '返回原市集心得');
assert.equal(buildMarketJournalsHref(), '/markets/journals');
assert.deepEqual(resolveMarketJournalsReturn(null), { href: '/markets', label: '返回市集' });
assert.equal(new URL(resolveMarketJournalsReturn('https://evil.test').href, base).origin, base);

const loading = renderToStaticMarkup(<MarketDetailLoadingShell returnTo="today" />);
assert.match(loading, /<a[^>]*aria-label="返回今日"[^>]*href="\/"/);
assert.match(loading, /正在開啟市集/);
console.log('PASS explicit mobile entry/return destinations, safe direct links, journal round trips and usable loading return');
