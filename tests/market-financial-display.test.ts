import assert from 'node:assert/strict';
import { calculateTrackedMarketFixedCost, calculateEstimatedMarketNetProfit } from '../lib/analytics/market-financial-summary';
import type { Market } from '../types/db';

const market = Object.freeze({ totalRevenue: 2000, totalProfit: 1000, boothCost: 100,
  registrationFee: 30, tableclothRental: 20, tableRental: 40, chairRental: 10, umbrellaRental: 80,
  tableFree: false, chairFree: true, umbrellaFree: true, commissionRate: 10, deposit: 500,
} as Market);
assert.equal(calculateTrackedMarketFixedCost(market), 190);
assert.equal(calculateEstimatedMarketNetProfit(market), 610, 'includes recorded fees and commission, excludes free equipment and refundable deposit');
assert.equal(calculateEstimatedMarketNetProfit({ ...market, totalProfit: 0 }), -390, 'recorded zero profit must never fall back to revenue');
assert.equal(calculateEstimatedMarketNetProfit({ ...market, totalProfit: undefined }), 1610, 'missing sales profit follows existing estimated fallback');
assert.equal(calculateTrackedMarketFixedCost({ ...market, tableclothFree: true }), 170);
assert.equal(calculateEstimatedMarketNetProfit({ ...market, totalRevenue: 0, totalProfit: 0 }), -190, 'no sales does not erase recorded fixed costs');
assert.equal(calculateEstimatedMarketNetProfit({ ...market, deposit: 9999 }), 610, 'deposit is not a cost');
assert.equal(market.totalProfit, 1000, 'presentation never changes stored revenue or profit');
console.log('PASS unified recorded-cost estimate, explicit zero, missing-profit estimate, free equipment and refundable deposit');
