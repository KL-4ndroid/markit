import assert from 'node:assert/strict';
import { buildBasicMonthlyTotals, selectBasicHistory } from '../lib/subscription/basic-business-summary';
import type { Event, DealClosedPayload, Market } from '../types/db';

const events = [
  {type:'deal_closed',payload:{dealDate:'2026-10-26',totalAmount:17}},
  {type:'deal_closed',payload:{dealDate:'2026-10-02',manualRevenue:500,manualDealCount:4}},
  {type:'deal_closed',payload:{dealDate:'2026-09-30',totalAmount:999}},
] as Event<DealClosedPayload>[];
assert.deepEqual(buildBasicMonthlyTotals(events,'2026-10'),{income:517,deals:5},'manual aggregate uses its count; recording date, not market start date, selects month');
assert.deepEqual(buildBasicMonthlyTotals([],'2026-10'),{income:0,deals:0});
assert.throws(()=>buildBasicMonthlyTotals(events,'2026-1'));
const markets = Object.freeze([
  {id:'a',owner_id:'owner',name:'台南週末',location:'南紡',startDate:'2026-10-20'},
  {id:'b',owner_id:'other',name:'台南其他品牌',startDate:'2026-10-22'},
  {id:'c',owner_id:'owner',name:'未來',startDate:'2026-11-01'},
  {id:'d',owner_id:'owner',name:'移除',startDate:'2026-10-21',isDeleted:true},
] as Market[]);
assert.deepEqual(selectBasicHistory(markets,'owner','2026-10-26','南紡').map(m=>m.id),['a']);
assert.equal(markets.length,4,'history filtering never changes source records');
console.log('PASS monthly totals, aggregate transactions, month boundary and owner-scoped history');
