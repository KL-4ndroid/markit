import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {resolveMarketBoothFee,getMarketBoothFee,confirmedMarketBoothFee,materializedMarketBoothFee} from '../lib/markets/market-booth-fee';
import {MarketFeeConflictNotice} from '../components/markets/MarketFeeConflictNotice';
import {calculateTrackedMarketFixedCost,calculateEstimatedMarketNetProfit} from '../lib/analytics/market-financial-summary';
import {marketFeeDisplayRows} from '../lib/subscription/ui-presentation';
import type {Market} from '../types/db';
for(const [fields,expected] of [
 [{},0], [{boothCost:0,registrationFee:300},300], [{boothCost:300,registrationFee:0},300],
 [{boothCost:300,registrationFee:300},300], [{boothCost:300,registrationFee:500},300],
 [{boothCost:NaN,registrationFee:200},200], [{boothCost:150,registrationFee:Infinity},150],
 [{boothCost:-50,registrationFee:0},-50],
] as const) assert.equal(getMarketBoothFee(fields),expected);
const different=Object.freeze({boothCost:300,registrationFee:500,deposit:100});
assert.equal(resolveMarketBoothFee(different).conflict,true);
assert.equal(resolveMarketBoothFee({boothCost:300,registrationFee:300}).conflict,false);
assert.deepEqual(materializedMarketBoothFee(different),{boothCost:300,registrationFee:500});
assert.deepEqual(materializedMarketBoothFee({boothCost:0,registrationFee:500}),{boothCost:500,registrationFee:0});
assert.deepEqual(confirmedMarketBoothFee(0),{boothCost:0,registrationFee:0});
for(const amount of [-1,NaN,Infinity]) assert.throws(()=>confirmedMarketBoothFee(amount),/invalid_booth_fee/);
assert.deepEqual(marketFeeDisplayRows(different),[{label:'攤位費',value:300},{label:'保證金',value:100}]);
const market={...different,totalRevenue:1000,totalProfit:700,commissionRate:10,tableRental:50} as Market;
assert.equal(calculateTrackedMarketFixedCost(market),350);
assert.equal(calculateEstimatedMarketNetProfit(market),250);
assert.equal(calculateTrackedMarketFixedCost({...market,boothCost:0}),550,'Legacy-only charges remain counted once');
assert.equal(different.registrationFee,500,'Reading and rendering never migrate stored history');
const html=renderToStaticMarkup(<MarketFeeConflictNotice market={different}/>);
assert.match(html,/待確認/);assert.match(html,/500/);assert.match(html,/300/);
assert.equal(renderToStaticMarkup(<MarketFeeConflictNotice market={{boothCost:300,registrationFee:300}}/>),'');
console.log('PASS single booth fee, legacy fallback, equal duplicates, explicit conflicts, confirmed zero, immutable history and deposit separation');
