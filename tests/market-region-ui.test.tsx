import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarketRegionField } from '../components/markets/MarketRegionField';

process.env.NEXT_PUBLIC_MARKET_REGION_ENABLED = 'true';
const html = renderToStaticMarkup(<MarketRegionField id="region" value="tw-tainan-city" onChange={() => {}} />);
assert.match(html, /<label[^>]*for="region"/);
assert.match(html, /aria-describedby="region-description"/);
assert.match(html, /value="tw-tainan-city" selected=""/);
assert.equal((html.match(/<option /g) ?? []).length, 23);
assert.match(html, /未分類（可稍後選擇）/);
assert.doesNotMatch(html, /disabled=""/);
assert.match(html, /min-h-12/);
process.env.NEXT_PUBLIC_MARKET_REGION_ENABLED = 'false';
const paused = renderToStaticMarkup(<MarketRegionField id="region" onChange={() => {}} />);
assert.match(paused, /disabled=""/);
assert.match(paused, /稍後可回來補填/);
console.log('PASS optional region selector, accessible labels and rollout state');
