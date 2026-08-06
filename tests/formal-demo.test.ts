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
const publicRoutes = read('lib/navigation/public-route.ts');
const bottomNavigation = read('components/BottomNavigation.tsx');
const sharedBottomNavigation = read('components/navigation/AppBottomNavigationBar.tsx');
const sharedWorkspaceHeader = read('components/layout/WorkspacePageHeader.tsx');
const sharedMarketListCard = read('components/markets/MarketListCard.tsx');
const sharedTodayMarketCard = read('components/home/TodayMarketCard.tsx');
const sharedSettingsShell = read('components/settings/SettingsPageShell.tsx');
const sharedSettingsMenu = read('components/settings/SettingsMenu.tsx');
const combinedDemoSource = `${route}\n${appEntry}\n${app}\n${data}`;

assert.match(route, /FeriaDemoApp/);
assert.match(appEntry, /FormalDemoApp as FeriaDemoApp/);
assert.match(route, /免登入、使用記憶體假資料/);
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

for (const formalPage of [formalMarkets, formalProducts, formalAnalytics]) {
  assert.match(formalPage, /WorkspacePageHeader/);
}
assert.match(app, /WorkspacePageHeader/);
assert.match(formalMarkets, /MarketListCard/);
assert.match(app, /MarketListCard/);
assert.match(formalMarkets, /buildMarketListGroups/);
assert.match(app, /buildMarketListGroups/);
assert.ok(formalHome.includes('bg-upcoming-section'));
assert.ok(app.includes('bg-upcoming-section'));
assert.match(formalHome, /TodayMarketCard/);
assert.match(app, /TodayMarketCard/);
assert.match(formalHome, /buildTodayViewModel/);
assert.match(app, /buildTodayViewModel/);
assert.match(app, /SharedSettingsActionRow/);
assert.match(app, /SharedSettingsSection/);
assert.match(formalBottomNavigation, /AppBottomNavigationBar/);
assert.match(app, /AppBottomNavigationBar/);
assert.match(sharedBottomNavigation, /max-w-lg/);
assert.match(sharedWorkspaceHeader, /rounded-b-\[2rem\][\s\S]*border-b border-white\/15[\s\S]*shadow-atelier/);
assert.match(sharedMarketListCard, /getMarketListActionLabel/);
assert.doesNotMatch(
  `${sharedBottomNavigation}\n${sharedWorkspaceHeader}\n${sharedMarketListCard}\n${sharedTodayMarketCard}\n${sharedSettingsShell}\n${sharedSettingsMenu}`,
  /@\/lib\/db|supabase|useAuth|useUserRole|indexedDB|localStorage|sessionStorage|fetch\s*\(/i,
  'shared demo/formal presentation components must remain platform-neutral and data-source free',
);
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
