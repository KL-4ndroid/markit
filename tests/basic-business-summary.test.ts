import assert from 'node:assert/strict';
import { selectBasicHistory } from '../lib/subscription/basic-business-summary';
import type { Market } from '../types/db';

const markets = Object.freeze([
  {id:'a',owner_id:'owner',name:'台南週末',location:'南紡',startDate:'2026-10-20'},
  {id:'b',owner_id:'other',name:'台南其他品牌',startDate:'2026-10-22'},
  {id:'c',owner_id:'owner',name:'未來',startDate:'2026-11-01'},
  {id:'d',owner_id:'owner',name:'移除',startDate:'2026-10-21',isDeleted:true},
] as Market[]);
assert.deepEqual(selectBasicHistory(markets,'owner','2026-10-26','南紡').map(m=>m.id),['a']);
assert.equal(markets.length,4,'history filtering never changes source records');
console.log('PASS owner-scoped history');
