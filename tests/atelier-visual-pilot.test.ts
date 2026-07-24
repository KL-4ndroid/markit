import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const globalCss = read('app/globals.css');
const tailwind = read('tailwind.config.ts');
const home = read('app/page.tsx');
const appChrome = read('components/AppChrome.tsx');
const appLayout = read('app/layout.tsx');
const themeConfig = read('lib/theme-config.ts');
const manifest = JSON.parse(read('public/manifest.json')) as {
  background_color: string;
  theme_color: string;
};
const settingsShell = read('components/settings/SettingsPageShell.tsx');
const appDialog = read('components/ui/AppDialog.tsx');
const fullScreenForm = read('components/ui/FullScreenForm.tsx');
const formSectionDisclosure = read('components/ui/FormSectionDisclosure.tsx');
const addMarketForm = read('components/markets/AddMarketForm.tsx');
const editMarketForm = read('components/markets/EditMarketForm.tsx');
const marketFormFields = read('components/markets/MarketFormFields.tsx');
const ownerMarket = read('components/markets/MarketDetailScreen.tsx');
const staffMarket = read('components/markets/StaffMarketDetailView.tsx');
const photoStory = read('components/markets/MarketOverviewPhotoStory.tsx');
const transactionWorkspace = read('components/sales/TransactionWorkspace.tsx');
const quickIncome = read('components/sales/QuickInteractionButtons.tsx');
const productSale = read('components/sales/QuickTransactionGrid.tsx');
const paymentSelector = read('components/sales/PaymentMethodSelector.tsx');
const interactions = read('components/sales/InteractionButtons.tsx');
const bottomNavigation = read('components/BottomNavigation.tsx');
const implementationNote = read('docs/ATELIER_VISUAL_PILOT_IMPLEMENTATION_2026_07_15.md');

for (const token of ['atelier-canvas', 'atelier-paper', 'atelier-ink', 'atelier-line', 'atelier-clay', 'atelier-blue', 'atelier-rose']) {
  assert.match(globalCss, new RegExp(`--${token}:`));
  assert.match(tailwind, new RegExp(`'${token}'`));
}

assert.match(home, /bg-atelier-canvas/);
assert.match(home, /shadow-atelier/);
assert.match(home, /japanese-warm-header/);
assert.match(appChrome, /japanese-app/);
assert.match(globalCss, /\.japanese-gradient-header/);
assert.match(globalCss, /\.japanese-surface-card/);
assert.match(themeConfig, /gradient: 'japanese-gradient-header'/);
assert.match(settingsShell, /getGradientClass\(isStaff\)/);
assert.match(appDialog, /japanese-surface-card/);
assert.match(fullScreenForm, /bg-atelier-paper/);
assert.match(fullScreenForm, /shadow-atelier-lift/);
assert.match(fullScreenForm, /japanese-gradient-header/);
assert.match(fullScreenForm, /japanese-form-scroll/);
assert.match(formSectionDisclosure, /shadow-atelier/);
assert.match(addMarketForm, /japanese-surface-card/);
assert.match(editMarketForm, /japanese-surface-card/);
assert.match(addMarketForm, /eyebrow="市集管理"/);
assert.match(editMarketForm, /eyebrow="市集管理"/);
assert.match(marketFormFields, /bg-soft-pink/);
assert.match(appLayout, /#7B9FA6/);
assert.equal(manifest.background_color, '#FAFAF8');
assert.equal(manifest.theme_color, '#7B9FA6');
assert.match(bottomNavigation, /bg-atelier-paper\/95/);
assert.match(bottomNavigation, /bg-primary text-white/);
assert.match(bottomNavigation, /bg-atelier-clay/);

assert.match(ownerMarket, /<MarketOverviewPhotoStory/);
assert.match(ownerMarket, /bg-atelier-canvas/);
assert.match(staffMarket, /bg-atelier-canvas/);
assert.match(photoStory, /buildSalesPhotoEvidenceOwnerAlbumViewModel/);
assert.match(photoStory, /buildSalesPhotoEvidenceTransactionIndex/);
assert.match(photoStory, /SalesPhotoEvidenceOwnerAlbumImage/);
assert.doesNotMatch(photoStory, /supabase|recordInteraction|addSale|updateSale|useLiveQuery/);

assert.match(transactionWorkspace, /addEventListener\('deal-closed'/);
assert.match(transactionWorkspace, /aria-live="polite"/);
assert.match(transactionWorkspace, /已安全儲存/);
assert.match(quickIncome, /min-h-14/);
assert.match(productSale, /min-h-14/);
assert.match(paymentSelector, /min-h-12/);
assert.match(interactions, /await recordInteraction\(marketId, buttonId\)/);
assert.doesNotMatch(interactions, /z-\[9999\]|animate-ping|float-up/);

assert.match(implementationNote, /不修改：/);
assert.match(implementationNote, /360px、390px 手機與 1440px 桌面/);

console.log('PASS atelier visual pilot contracts');
