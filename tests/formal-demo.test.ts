import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const route = read('app/demo/page.tsx');
const appEntry = read('components/demo/FeriaDemoApp.tsx');
const app = read('components/demo/FormalDemoApp.tsx');
const data = read('lib/demo/formal-demo-data.ts');
const appChrome = read('components/AppChrome.tsx');
const bottomNavigation = read('components/BottomNavigation.tsx');
const combinedDemoSource = `${route}\n${appEntry}\n${app}\n${data}`;

assert.match(route, /FeriaDemoApp/);
assert.match(appEntry, /FormalDemoApp as FeriaDemoApp/);
assert.match(route, /免登入、使用記憶體假資料/);
assert.match(appChrome, /STANDALONE_PUBLIC_ROUTES[\s\S]*['"]\/demo['"]/);
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
  '<MarketWorkspaceSummary',
  '<MarketBasicFields',
  '<MarketTimelineFields',
  '<MarketCostFields',
  '<MarketEquipmentFields',
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
  'exportDemoData',
  'resetDemo',
  'THEME_LAB_OPEN_EVENT',
]) {
  assert.ok(app.includes(interactionContract), `missing demo interaction: ${interactionContract}`);
}

const formalHome = read('app/page.tsx');
const formalMarkets = read('app/markets/page.tsx');
const formalProducts = read('app/products/page.tsx');
const formalAnalytics = read('app/analytics/page.tsx');
const formalBottomNavigation = read('components/BottomNavigation.tsx');

for (const sharedFormalClass of [
  'rounded-b-[2rem]',
  'border-b border-white/15',
  'shadow-atelier',
]) {
  assert.ok(formalMarkets.includes(sharedFormalClass));
  assert.ok(formalProducts.includes(sharedFormalClass));
  assert.ok(formalAnalytics.includes(sharedFormalClass));
  assert.ok(app.includes(sharedFormalClass));
}
assert.ok(formalHome.includes('bg-upcoming-section'));
assert.ok(app.includes('bg-upcoming-section'));
assert.ok(formalBottomNavigation.includes('max-w-lg'));
assert.ok(app.includes('max-w-lg'));
assert.doesNotMatch(app, /展示資料|安全的展示環境/);

for (const viewLabel of ['今日', '市集', '商品', '分析', '更多']) {
  assert.ok(app.includes(viewLabel), `missing demo view: ${viewLabel}`);
}

assert.match(data, /INITIAL_DEMO_MARKETS/);
assert.match(data, /INITIAL_DEMO_PRODUCTS/);
assert.match(data, /INITIAL_DEMO_ACTIVITIES/);
assert.doesNotMatch(
  combinedDemoSource,
  /@\/lib\/db|supabase|useAuth|useUserRole|indexedDB|localStorage|sessionStorage|fetch\s*\(/i,
  'demo must stay memory-only and independent from authentication or remote/local persistence',
);

console.log('PASS formal memory-only interactive demo');
