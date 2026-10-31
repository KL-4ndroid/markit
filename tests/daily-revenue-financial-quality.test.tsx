import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DailyRevenueStats } from '../components/markets/DailyRevenueStats';
import { dailyFinancialBasis, type FinancialZeroConfirmation } from '../lib/analytics/financial-record-quality';
import type { DailyStats, Market } from '../types/db';

const market: Market = {id:'m',name:'fixture',location:'fixture',startDate:'2026-10-30',endDate:'2026-10-31',status:'completed',boothCost:100,createdAt:0,updatedAt:0};
const stat: DailyStats = {marketId:'m',date:'2026-10-30',revenue:50,cost:0,profit:50,dealCount:1,touchCount:0,inquiryCount:0,productsSold:[],updatedAt:0};
function render(stats: DailyStats[], confirmations?: Record<string, readonly FinancialZeroConfirmation[]>, hideProfit=false) {
  return renderToStaticMarkup(<DailyRevenueStats market={market} reviewedStats={stats} financialConfirmations={confirmations}
    hideProfit={hideProfit} reviewMode onAddRevenue={()=>{}} onDateClick={()=>{}} />);
}
const unknown = render([stat]);
assert.match(unknown,/銷售利潤/);
assert.match(unknown,/待核對/,'unknown zero cost is not shown as a known daily profit');
assert.match(unknown,/銷售利潤合計[\s\S]*待核對/,'multi-day totals keep the same uncertainty');
const confirmation = {[stat.date]:[{kind:'zero-sales-cost' as const,basis:dailyFinancialBasis(stat)}]};
assert.doesNotMatch(render([stat],confirmation),/待核對/,'trusted zero-cost proof is consumed by daily cards');
assert.match(render([{...stat,cost:10,profit:40}]),/\$40/);
assert.match(render([{...stat,financialReviewPending:true}],confirmation),/待核對/);
assert.match(render([{...stat,revenue:60,profit:60}],confirmation),/待核對/,'stale confirmation cannot validate changed sales');
assert.match(render([stat,stat],confirmation),/待核對/,'duplicate daily sources do not become a reliable last-row profit');
assert.doesNotMatch(render([stat],confirmation,true),/銷售利潤|待核對/,'staff profit visibility remains closed');
console.log('PASS rendered daily cards/totals: unknown cost, confirmed zero, reviewed cost, stale/offline/duplicate sources and staff privacy');
