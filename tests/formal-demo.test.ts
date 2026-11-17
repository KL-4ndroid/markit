import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  INITIAL_DEMO_ACTIVITIES,
  DEMO_REGISTRATION_MARKET_ID,
  INITIAL_DEMO_MARKETS,
  INITIAL_DEMO_PRODUCTS,
  INITIAL_DEMO_SALES,
} from '../lib/demo/formal-demo-data';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const route = read('app/demo/page.tsx');
const appEntry = read('components/demo/FeriaDemoApp.tsx');
const app = read('components/demo/FormalDemoApp.tsx');
const comparison = read('components/demo/DemoMarketComparison.tsx');
const data = read('lib/demo/formal-demo-data.ts');
const appChrome = read('components/AppChrome.tsx');
const publicRoutes = read('lib/navigation/public-route.ts');
const bottomNavigation = read('components/BottomNavigation.tsx');
const sharedBottomNavigation = read('components/navigation/AppBottomNavigationBar.tsx');
const sharedWorkspaceHeader = read('components/layout/WorkspacePageHeader.tsx');
const sharedMarketListCard = read('components/markets/MarketListCard.tsx');
const sharedTodayMarketCard = read('components/home/TodayMarketCard.tsx');
const sharedSettingsShell = read('components/settings/SettingsPageShell.tsx');
const sharedSettingsMenu = read('components/settings/SettingsMenu.tsx');
const sharedCheckout = read('components/sales/QuickAmountCheckout.tsx');
const combinedDemoSource = `${route}\n${appEntry}\n${app}\n${comparison}\n${data}`;

assert.match(route, /FeriaDemoApp/);
assert.match(appEntry, /FormalDemoApp as FeriaDemoApp/);
assert.match(route, /title: '免登入體驗'/);
assert.match(publicRoutes, /STANDALONE_PUBLIC_ROUTES[\s\S]*['"]\/demo['"]/);
assert.match(appChrome, /\.\.\.STANDALONE_PUBLIC_ROUTES/);
assert.match(bottomNavigation, /HIDDEN_ROUTES[\s\S]*['"]\/demo['"]/);

for (const formalStyleContract of [
  'japanese-warm-header',
  'japanese-gradient-header',
  'bg-atelier-canvas',
  'bg-atelier-paper',
  'shadow-atelier',
  'bg-upcoming-section',
  'bg-upcoming-date-badge',
  '<Button',
  '<Tabs',
  '<AppDialog',
  '<FullScreenForm',
  '<ProductCard',
  '<DateRangeFilter',
  '<ActionableInsightsCard',
  '<AnalyticsSummaryHighlights',
  '<MarketWorkspaceNavigation',
  '<MarketWorkspaceDetailTabs',
  '<MarketWorkspaceSummary',
  '<WorkspacePageHeader',
  '<MarketListCard',
  '<AppBottomNavigationBar',
  '<TodayMarketCard',
  '<SettingsPageShell',
  '<MarketBasicFields',
  '<MarketTimelineFields',
  '<MarketCostFields',
  '<MarketEquipmentFields',
  '<MarketRegistrationPanel',
  '<MarketEquipmentSummary',
  '<QuickAmountCheckout',
  '<ProductFormFields',
  '<ConfirmDialog',
]) {
  assert.ok(app.includes(formalStyleContract), `missing formal UI contract: ${formalStyleContract}`);
}

for (const interactionContract of [
  'recordCartSale',
  'recordManualSale',
  'recordInteraction',
  'submitMarketForm',
  'submitProductForm',
  'changeMarketStatus',
  'toggleProductActive',
  'resetDemo',
  '記一筆現場收入',
  '看看哪些市集還沒繳費',
  '先自己逛逛',
  '重新開啟體驗引導',
  '試著安排一場市集',
  '快速收款',
  '每日表現',
  '剛新增',
  '開始記錄自己的市集',
]) {
  assert.ok(app.includes(interactionContract), `missing demo interaction: ${interactionContract}`);
}

const formalHome = read('app/page.tsx');
const formalMarkets = read('app/markets/page.tsx');
const formalProducts = read('app/products/page.tsx');
const formalAnalytics = read('app/analytics/page.tsx');
const formalBottomNavigation = read('components/BottomNavigation.tsx');

for (const formalPage of [formalMarkets, formalProducts, formalAnalytics]) {
  assert.match(formalPage, /WorkspacePageHeader/);
}
assert.match(app, /WorkspacePageHeader/);
assert.match(formalMarkets, /MarketListCard/);
assert.match(app, /MarketListCard/);
assert.match(formalMarkets, /buildMarketListGroups/);
assert.match(app, /buildMarketListGroups/);
assert.match(formalHome, /aria-labelledby="upcoming-title"/);
assert.ok(app.includes('bg-upcoming-section'));
assert.match(formalHome, /TodayMarketCard/);
assert.match(app, /TodayMarketCard/);
assert.match(formalHome, /buildTodayViewModel/);
assert.match(app, /buildTodayViewModel/);
assert.match(formalBottomNavigation, /AppBottomNavigationBar/);
assert.match(app, /AppBottomNavigationBar/);
assert.match(sharedBottomNavigation, /max-w-lg/);
assert.match(sharedWorkspaceHeader, /rounded-b-\[2rem\][\s\S]*border-b border-white\/15[\s\S]*shadow-atelier/);
assert.match(sharedMarketListCard, /aria-label=\{`開啟「\$\{item\.market\.name\}」詳情`\}/);
assert.doesNotMatch(sharedMarketListCard, /getMarketListActionLabel/);
assert.match(sharedMarketListCard, /contextLabel/);
assert.match(app, /data-demo-content-root/);
assert.match(app, /<AppBottomNavigationBar[^\n]*showOnDesktop/);
assert.match(app, /pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]/);
assert.match(sharedBottomNavigation, /fixed bottom-0/);
assert.doesNotMatch(
  `${sharedBottomNavigation}\n${sharedWorkspaceHeader}\n${sharedMarketListCard}\n${sharedTodayMarketCard}\n${sharedSettingsShell}\n${sharedSettingsMenu}\n${sharedCheckout}`,
  /@\/lib\/db|supabase|useAuth|useUserRole|indexedDB|localStorage|sessionStorage|fetch\s*\(/i,
  'shared demo/formal presentation components must remain platform-neutral and data-source free',
);
assert.doesNotMatch(app, /立即同步|已同步|開啟結算報表|主題實驗室/);

for (const viewLabel of ['今日', '市集', '商品', '分析', '更多']) {
  assert.ok(app.includes(viewLabel), `missing demo view: ${viewLabel}`);
}

assert.match(data, /INITIAL_DEMO_MARKETS/);
assert.match(data, /INITIAL_DEMO_PRODUCTS/);
assert.match(data, /INITIAL_DEMO_ACTIVITIES/);
assert.match(data, /INITIAL_DEMO_SALES/);
assert.ok(INITIAL_DEMO_MARKETS.length >= 13, 'demo should include a useful market history');
assert.equal(INITIAL_DEMO_MARKETS.filter(market => market.status === 'operating').length, 1);
assert.ok(INITIAL_DEMO_MARKETS.filter(market => market.status === 'preparing').length >= 2);
assert.ok(INITIAL_DEMO_MARKETS.filter(market => market.status === 'ended').length >= 10);
assert.equal(INITIAL_DEMO_MARKETS.find(market => market.id === DEMO_REGISTRATION_MARKET_ID)?.registrationStatus, 'registered');
assert.ok(INITIAL_DEMO_MARKETS.some(market => market.registrationStatus === 'accepted'));
assert.match(app, /open=\{guideOpen\}[\s\S]*title="你想先試什麼？"[\s\S]*presentation="sheet"/);
assert.match(app, /setGuideOpen\(false\); showPreparationList\('payment_due'\);/);
assert.doesNotMatch(app.slice(app.indexOf('function TodayPage'), app.indexOf('function MarketsPage')), /你想先試什麼|試著安排一場市集/);
assert.match(app, /onShowMarketList=\{\(\) => showPreparationList\('all'\)\}/);
assert.match(comparison, /下次去哪一場比較值得[\s\S]*出攤心得[\s\S]*淨利待確認/);

const scenarioLabels = INITIAL_DEMO_MARKETS.map(market => market.scenarioLabel);
assert.ok(scenarioLabels.every(Boolean), 'every demo market should explain its scenario');
assert.equal(new Set(scenarioLabels).size, scenarioLabels.length, 'demo scenarios should be distinct');

const completedConversions = INITIAL_DEMO_MARKETS
  .filter(market => market.status === 'ended' && market.interactions > 0)
  .map(market => market.deals / market.interactions);
assert.ok(completedConversions.some(conversion => conversion >= 0.6), 'demo should include a high-conversion market');
assert.ok(completedConversions.some(conversion => conversion <= 0.15), 'demo should include a low-conversion market');

const netResults = INITIAL_DEMO_MARKETS
  .filter(market => market.status === 'ended')
  .map(market => Math.round(market.revenue * market.grossMargin)
    - market.boothCost
    - market.tableRental
    - market.chairRental
    - market.umbrellaRental);
assert.ok(netResults.some(result => result > 0), 'demo should include profitable markets');
assert.ok(netResults.some(result => result < 0), 'demo should include a loss-making market');

assert.ok(INITIAL_DEMO_PRODUCTS.length >= 12, 'demo should include a varied product catalog');
assert.deepEqual(
  [...new Set(INITIAL_DEMO_PRODUCTS.map(product => product.category))].sort(),
  ['其他', '手作', '文具', '服飾', '藝術', '食品', '飾品'].sort(),
);
assert.ok(INITIAL_DEMO_PRODUCTS.some(product => !product.isActive), 'demo should include an inactive product');
assert.ok(INITIAL_DEMO_PRODUCTS.some(product => product.unlimitedStock), 'demo should include a service or unlimited-stock item');

assert.ok(INITIAL_DEMO_ACTIVITIES.length >= 10, 'demo should include a useful activity stream');
assert.ok(INITIAL_DEMO_ACTIVITIES.some(activity => activity.type === 'sale'));
assert.ok(INITIAL_DEMO_ACTIVITIES.some(activity => activity.type === 'interaction'));
assert.ok(INITIAL_DEMO_SALES.filter(sale => sale.photoPath).length >= 3, 'demo should include sales with actual photo evidence');
assert.match(app, /最近成交照片/);
assert.doesNotMatch(app, /夥伴銷售總覽|夥伴銷售排名|PartnerSalesOverview|partner-sales/);
assert.match(app, /analyticsMarkets[\s\S]*market\.status === 'ongoing'[\s\S]*market\.status === 'completed'/);
assert.match(app, /contextLabel=\{sourceMarket\?\.scenarioLabel\}/);
assert.doesNotMatch(
  combinedDemoSource,
  /@\/lib\/db|supabase|useAuth|useUserRole|indexedDB|localStorage|sessionStorage|fetch\s*\(/i,
  'demo must stay memory-only and independent from authentication or remote/local persistence',
);

console.log('PASS formal memory-only interactive demo');
