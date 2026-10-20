import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const plan = read('docs/APP_WIDE_UIUX_REMEDIATION_EXECUTION_PLAN_2026_08_12.md');
const marketsPage = read('app/markets/page.tsx');
const marketCard = read('components/markets/MarketListCard.tsx');
const marketModel = read('lib/markets/market-list-view-model.ts');
const productsPage = read('app/products/page.tsx');
const productCard = read('components/products/ProductCard.tsx');
const settingsPage = read('app/settings/page.tsx');
const settingsMenu = read('components/settings/SettingsMenu.tsx');
const settingsShell = read('components/settings/SettingsPageShell.tsx');
const productFields = read('components/products/ProductFormFields.tsx');
const addProduct = read('components/products/AddProductForm.tsx');
const editProduct = read('components/products/EditProductForm.tsx');
const fullScreenForm = read('components/ui/FullScreenForm.tsx');
const addMarket = read('components/markets/AddMarketForm.tsx');
const editMarket = read('components/markets/EditMarketForm.tsx');

assert.match(plan, /UX-R4 - Desktop Collections, Details, And Settings/);

assert.match(marketsPage, /widthMode="workspace"/);
for (const label of ['市集與狀態', '日期', '地點', '結果']) {
  assert.ok(marketsPage.includes(label), `desktop market list missing ${label}`);
}
assert.match(marketCard, /xl:grid-cols-\[minmax\(14rem,1\.35fr\)/);
assert.match(marketCard, /getMarketListProgressLabel\(item\)/);
assert.match(marketModel, /item\.completionSummary \? '成果已記錄'/);

assert.match(productsPage, /widthMode="workspace"/);
assert.match(productsPage, /sm:grid-cols-2 xl:grid-cols-1/);
for (const label of ['商品', '售價', '庫存', '已售', '操作']) {
  assert.ok(productsPage.includes(label), `desktop product list missing ${label}`);
}
assert.match(productCard, /product\.totalSold \?\? 0/);
assert.match(productCard, /xl:hidden/);
assert.doesNotMatch(productCard, /product\.cost|profitMargin|canViewSensitiveData/);

assert.match(settingsPage, /lg:grid-cols-\[15rem_minmax\(0,1fr\)\]/);
assert.match(settingsPage, /aria-label="設定分類"/);
assert.match(settingsPage, /groups\.map\(group =>/);
assert.match(settingsMenu, /id=\{id\}/);
assert.match(settingsShell, /maxWidthClass = 'max-w-3xl'/);
assert.match(settingsPage, /maxWidthClass="max-w-5xl"/);

assert.match(addProduct, /size="lg"/);
assert.match(editProduct, /size="lg"/);
assert.match(productFields, /lg:grid-cols-\[minmax\(0,\.8fr\)_minmax\(0,1\.2fr\)\]/);
assert.match(fullScreenForm, /desktopWidth\?: 'focused' \| 'workspace'/);
assert.match(addMarket, /desktopWidth="workspace"/);
assert.match(editMarket, /desktopWidth="workspace"/);

console.log('PASS UX-R4 desktop density contracts');
