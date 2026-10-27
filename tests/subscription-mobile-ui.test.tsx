import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { marketFeeDisplayRows, salesSettingsPresentation, isCurrentPlan, subscriptionExperienceIsLoading } from '../lib/subscription/ui-presentation';
import { marketRegistrationPresentation } from '../lib/markets/market-registration-presentation';
import { getTodayMarketActionLabel } from '../lib/home/today-view-model';
import { buildMarketDetailHref, resolveMarketDetailReturn, resolveMarketJournalsReturn } from '../lib/navigation/market-detail-route';
import { staffAccessPresentation } from '../lib/permissions/staff-access-presentation';
import { MarketOperatingSessionControl } from '../components/markets/MarketOperatingSessionControl';
import { MarketRegistrationPanel } from '../components/markets/MarketRegistrationPanel';
import { MarketWorkspaceDetailTabs } from '../components/markets/MarketWorkspaceDetailTabs';
import type { MarketOperatingSession } from '../lib/markets/market-operating-session';
import { resolveProductMarketReturn } from '../lib/navigation/market-product-return';
import { Store } from 'lucide-react';

assert.deepEqual(marketFeeDisplayRows({ boothCost: 1500, registrationFee: 0, deposit: 100 }), [
  {label:'攤位費',value:1500}, {label:'保證金',value:100},
]);
const legacy = {registrationFee:300,boothCost:1500,deposit:100};
assert.deepEqual(marketFeeDisplayRows(legacy).map(row=>row.value),[1500,100]);
assert.deepEqual(legacy,{registrationFee:300,boothCost:1500,deposit:100});
assert.equal(marketRegistrationPresentation('accepted').label,'待繳費');
assert.equal(salesSettingsPresentation('free').title,'品牌設定');
assert.equal(salesSettingsPresentation('light').title,'品牌與互動設定');
assert.equal(salesSettingsPresentation('advanced').title,'銷售與照片');
assert.equal(isCurrentPlan('free','unavailable'),false);
assert.equal(isCurrentPlan('free','free'),true);
assert.equal(isCurrentPlan('pro','light'),true);
assert.equal(isCurrentPlan('team','advanced'),true);
assert.equal(isCurrentPlan('team','light'),false);
assert.equal(getTodayMarketActionLabel('ended',false,false),'查看今日市集');
assert.equal(getTodayMarketActionLabel('ended',false,true),'查看今日回顧');
assert.equal(getTodayMarketActionLabel('ended',true,false),'查看今日紀錄');
assert.match(resolveProductMarketReturn({fromMarket:'test',marketReturnTo:'records'})!.href,/returnTo=records/);
assert.equal(resolveMarketDetailReturn('records').label,'返回營業紀錄');
assert.match(buildMarketDetailHref('test',{returnTo:'records'}),/returnTo=records/);
assert.match(resolveMarketJournalsReturn('test','records').href,/returnTo=records/);
assert.equal(resolveMarketDetailReturn('https://invalid.example').href,'/markets');
const onAction = () => {throw new Error('render must not change operational data');};
for (const phase of ['unavailable','upcoming','ended'] as const) {
  const session = {phase} as MarketOperatingSession;
  assert.equal(renderToStaticMarkup(<MarketOperatingSessionControl session={session} canManage onStartEarly={onAction} />),'');
}
const closed = {phase:'closed',label:'今日已收攤',message:'fallback',canCloseToday:false,canStartEarly:false} as MarketOperatingSession;
const closedHtml = renderToStaticMarkup(<MarketOperatingSessionControl session={closed} canManage description="可以寫心得" onStartEarly={onAction} />);
assert.equal((closedHtml.match(/今日已收攤/g)??[]).length,1);
assert.match(closedHtml,/可以寫心得/);
assert.doesNotMatch(closedHtml,/fallback|<button/);
const readOnly = renderToStaticMarkup(<MarketRegistrationPanel status="registered" readOnly onChange={onAction}><p>保留費用</p></MarketRegistrationPanel>);
assert.match(readOnly,/保留費用/);
assert.doesNotMatch(readOnly,/<button|<details/);
const endedPaid = renderToStaticMarkup(<MarketRegistrationPanel status="paid" ended onChange={onAction} />);
assert.match(endedPaid,/本場繳費已記錄/);
assert.doesNotMatch(endedPaid,/準備出攤/);
for(const count of [5,6]) {
 const items=Array.from({length:count},(_,i)=>({id:String(i),label:String(i),icon:Store}));
 const html=renderToStaticMarkup(<MarketWorkspaceDetailTabs value="0" items={items} onChange={onAction} ariaLabel="回顧項目" />);
 assert.equal((html.match(/role="tab"/g)??[]).length,count);
 assert.equal((html.match(/tabindex="0"/g)??[]).length,1);
 assert.match(html,/min-h-11/);
 if(count===5) assert.equal((html.match(/col-span-3/g)??[]).length,2);
}
const suspended = {status:'suspended_by_plan' as const,canView:true,teamAllowed:true};
assert.match(staffAccessPresentation(suspended).summary,/目前方案符合/);
assert.match(staffAccessPresentation({...suspended,teamAllowed:false}).summary,/有效的高階版/);
const ready = {roleStage: 'ready' as const, capabilityEnabled: true, capabilityLoading: false, hasCapabilityResult: true};
assert.equal(subscriptionExperienceIsLoading(ready),false);
assert.equal(subscriptionExperienceIsLoading({...ready,hasCapabilityResult:false}),true);
assert.equal(subscriptionExperienceIsLoading({...ready,capabilityLoading:true}),true);
assert.equal(subscriptionExperienceIsLoading({...ready,roleStage:'initial_loading',capabilityEnabled:false}),true);
for(const roleStage of ['blocked','background_refresh_failed'] as const) {
  assert.equal(subscriptionExperienceIsLoading({...ready,roleStage,capabilityEnabled:false,hasCapabilityResult:false}),false,'A role error must allow the failure/retry state');
}
const detailSource = readFileSync(join(__dirname,'../components/markets/MarketDetailScreen.tsx'),'utf8');
assert.match(detailSource,/owner-overview-detail-panel-tab-\$\{visibleOverviewDetail\}/,'After hiding a paid tab, the panel must reference the visible fallback tab');
console.log('PASS tier mobile presentation: fee preservation, operation visibility, naming, navigation, responsive tabs and paused staff');
