import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const staff = read('components/settings/StaffManagement.tsx');
const marketDetail = read('components/markets/MarketDetailScreen.tsx');
const dailyRevenue = read('components/markets/DailyRevenueStats.tsx');
const addRevenue = read('components/markets/AddRevenueDialog.tsx');
const addProduct = read('components/products/AddProductForm.tsx');
const productCard = read('components/products/ProductCard.tsx');
const marketsPage = read('app/markets/page.tsx');
const productsPage = read('app/products/page.tsx');
const recoveryPage = read('app/recovery/page.tsx');

assert.match(staff, /flex flex-col gap-4[\s\S]*sm:flex-row/);
assert.match(staff, /aria-label=\{`修改 \$\{staff\.email\} 的角色`\}/);
assert.match(staff, /h-11 w-11/);

const liveFieldOps = marketDetail.indexOf("{resolvedOwnerWorkspaceView === 'live' && (");
const fieldOps = marketDetail.indexOf('<MarketFieldOpsSection', liveFieldOps);
assert.ok(liveFieldOps > 0 && fieldOps > liveFieldOps);
// Timeline and reference notes now belong to the live layout, with notes inside
// fieldwork rather than a separate duplicate panel in management.
const liveLayoutEnd = marketDetail.indexOf('{/* ✅ 當日流水帳', fieldOps);
const liveLayout = marketDetail.slice(liveFieldOps, liveLayoutEnd);
assert.ok(liveLayoutEnd > fieldOps);
assert.match(liveLayout, /<MarketLiveLayout/);
assert.match(liveLayout, /timeline=\{\s*<MarketTodayTimeline/);
assert.match(liveLayout, /fieldwork=\{[\s\S]*<MarketFieldOpsSection[\s\S]*referenceNote=\{market\.notes\}/);
assert.match(marketDetail, /<MarketRegistrationPanel/);
assert.match(marketDetail, /else handleStatusChangeRequest\(status\)/);
const registrationPanel = read('components/markets/MarketRegistrationPanel.tsx');
assert.match(registrationPanel, /更正／其他狀態/);
assert.match(registrationPanel, /aria-pressed=\{value === status\}/);

assert.match(dailyRevenue, /有紀錄 \$\{recordedDays\.length\}/);
assert.match(dailyRevenue, /全部 \$\{dailyData\.length\}/);
assert.match(dailyRevenue, /尚無紀錄 \$\{emptyPastDays\.length\}/);
assert.match(dailyRevenue, /market\.status === 'completed' && dailyData\.length > 7/);
assert.match(dailyRevenue, /這場市集尚無營運紀錄/);
assert.match(dailyRevenue, /補登最近場次/);
assert.match(marketDetail, /reviewMode=\{marketWorkspacePhase === 'ended'\}/);
assert.match(marketDetail, /\(market\.deposit \?\? 0\) > 0/);
assert.match(marketDetail, /label: '回顧'/);

assert.doesNotMatch(addRevenue, /mode === 'simple' && revenue[\s\S]*mode === 'full' && cart\.length > 0/);
assert.match(addRevenue, /disabled=\{isSubmitting \|\| !revenue \|\| Number\(revenue\) <= 0\}/);
assert.match(addRevenue, /disabled=\{isSubmitting \|\| cart\.length === 0\}/);

assert.ok(addProduct.indexOf('<ProductFormFields') < addProduct.indexOf('<ProductCoverPhotoField'));
assert.match(productCard, /aspect-square h-16 w-16/);
assert.ok(productCard.indexOf('aspect-square h-16 w-16') < productCard.indexOf('coverPhotoVersion ?'));
assert.match(productCard, /isOpening \? '開啟中\.\.\.'/);

assert.match(marketsPage, /router\.prefetch\(buildMarketDetailHref\(item\.market\.id\)\)/);
assert.match(productsPage, /router\.prefetch\(buildProductDetailHref\(product\.id, productOrigin\)\)/);
assert.match(productsPage, /router\.push\(buildProductDetailHref\(product\.id, productOrigin\)\)/);
assert.match(recoveryPage, /<details[\s\S]*進階診斷[\s\S]*<OwnerPendingOperationDiagnosticsPanel/);

console.log('PASS mobile UIUX optimization contracts');
