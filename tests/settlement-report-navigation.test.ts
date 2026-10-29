import assert from 'node:assert/strict';
import { buildReportEntityHref, buildSettlementReportHref, defaultReportPeriod, isValidReportPeriod, readReportPeriod, resolveReportEntityReturn, readReportReaderView, presetReportPeriod } from '../lib/reporting/settlement-report-navigation';

const period = {kind:'monthly' as const,startDate:'2026-10-01',endDate:'2026-10-31'};
assert.deepEqual(defaultReportPeriod(new Date(2026,9,29)),period);
assert.deepEqual(presetReportPeriod('previous',new Date(2026,0,3)),{kind:'monthly',startDate:'2025-12-01',endDate:'2025-12-31'});
assert.equal(isValidReportPeriod({...period,startDate:'2026-02-31'}),false);
assert.equal(isValidReportPeriod({...period,startDate:'2026-11-01'}),false);
assert.equal(isValidReportPeriod({...period,startDate:'2024-02-29'}),true);
assert.equal(isValidReportPeriod({...period,kind:'daily' as 'monthly'}),false);
assert.deepEqual(readReportPeriod(new URLSearchParams(),period),{period,error:null});
const href = buildSettlementReportHref(period);
assert.deepEqual(readReportPeriod(new URL(href,'https://test.local').searchParams,period),{period,error:null});
assert.ok(readReportPeriod(new URLSearchParams('start=invalid'),period).error);
assert.throws(()=>buildSettlementReportHref({...period,endDate:'2026-01-01'}));
for (const type of ['market','product'] as const) {
  const entity = new URL(buildReportEntityHref(type,'test/id & 1',period),'https://test.local');
  assert.deepEqual(resolveReportEntityReturn(entity.searchParams),{label:'返回報告',href});
  assert.equal(entity.searchParams.get('id'),'test/id & 1');
}
assert.equal(resolveReportEntityReturn(new URLSearchParams('returnTo=https://evil.test')),null);
assert.equal(resolveReportEntityReturn(null),null);
assert.deepEqual(resolveReportEntityReturn(new URLSearchParams('fromReport=1&reportStart=invalid&returnTo=https://evil.test')),{label:'返回報告',href:'/reports/settlement'});
const view={markets:15,products:25,sort:'revenue' as const};
const origin=new URL(buildReportEntityHref('market','m12',period,view,'costs'),'https://test.local');
assert.equal(origin.searchParams.get('task'),'costs');
const returned=new URL(resolveReportEntityReturn(origin.searchParams)!.href,'https://test.local');
assert.deepEqual(readReportReaderView(returned.searchParams),{...view,focusMarket:'m12',focusProduct:undefined});
assert.equal(readReportReaderView(new URLSearchParams('markets=Infinity&products=-5&sort=javascript:evil')).markets,5);
assert.equal(new URL(buildReportEntityHref('market','m',period,view,'performance','2026-10-12'),'https://test.local').searchParams.get('reportDate'),'2026-10-12');
for (const date of ['2026-10-99','2026-09-30','https://evil.test']) assert.equal(new URL(buildReportEntityHref('market','m',period,view,'performance',date),'https://test.local').searchParams.get('reportDate'),null);
console.log('PASS report period validation, encoded entity links, safe return and period roundtrip');
