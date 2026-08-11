import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  hideNavigation,
  navigationStore,
  showNavigation,
} from '../lib/navigation-store';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const workbench = read('components/markets/OperatingMarketWorkbench.tsx');
const bottomNavigation = read('components/BottomNavigation.tsx');
const owner = read('components/markets/MarketDetailScreen.tsx');
const staff = read('components/markets/StaffMarketDetailView.tsx');
const transaction = read('components/sales/TransactionWorkspace.tsx');
const quickSale = read('components/sales/QuickInteractionButtons.tsx');
const productSale = read('components/sales/QuickTransactionGrid.tsx');
const interactions = read('components/sales/InteractionButtons.tsx');
const photoFlow = read('components/markets/SalesPhotoEvidenceFlowDialog.tsx');

assert.match(workbench, /aria-label="營業工作台"/);
assert.match(workbench, /fixed inset-x-0 bottom-0/);
assert.match(workbench, /env\(safe-area-inset-bottom\)/);
assert.match(workbench, /<InteractionButtons[\s\S]*variant="dock"/);
assert.match(workbench, />快速收款</);
assert.match(workbench, />商品銷售</);
assert.match(workbench, />待補照片</);
assert.match(workbench, /<Dialog[\s\S]*presentation="sheet"/);
assert.match(workbench, /onTransactionCompleted=\{completeTransaction\}/);
assert.match(workbench, /disabled=\{isTransactionProcessing\}/);
assert.match(workbench, /onProcessingChange=\{setIsTransactionProcessing\}/);
assert.doesNotMatch(workbench, /recordDeal|recordInteraction|recordEvent|\bdb\./);
assert.match(bottomNavigation, /useSyncExternalStore/);
assert.match(bottomNavigation, /navigationStore\.getVisible\(\)/);

for (const source of [owner, staff]) {
  assert.match(source, /<OperatingMarketWorkbench/);
  assert.match(source, /pb-44 lg:pb-6/);
  assert.match(source, /hidden items-start gap-4 lg:grid/);
}
assert.match(owner, /hideNavigation\('owner-operating-workbench'\)/);
assert.match(staff, /hideNavigation\('staff-operating-workbench'\)/);
assert.match(owner, /aria-label=\{ownerLiveMobileView === 'field-ops' \? '返回營業概況' : '開啟現場工作'\}/);

assert.match(transaction, /presentation\?: TransactionPresentation/);
assert.match(transaction, /onTransactionCompleted=\{onTransactionCompleted\}/g);
for (const source of [quickSale, productSale]) {
  assert.match(source, /onTransactionCompleted\?\.\(\)/);
  assert.match(source, /presentation === 'sheet'[\s\S]*sticky bottom-0/);
}
assert.match(interactions, /variant\?: 'card' \| 'dock'/);
assert.match(interactions, /bottom-\[calc\(100%\+0\.65rem\)\]/);
assert.match(photoFlow, /items-end justify-center sm:items-center/);
assert.match(photoFlow, /稍後上傳/);
assert.match(photoFlow, /返回待補清單/);

showNavigation('legacy');
showNavigation('owner-operating-workbench');
const visibility: boolean[] = [];
const unsubscribe = navigationStore.subscribe(value => visibility.push(value));
hideNavigation('owner-operating-workbench');
hideNavigation('legacy');
showNavigation('legacy');
assert.equal(navigationStore.getVisible(), false);
showNavigation('owner-operating-workbench');
assert.equal(navigationStore.getVisible(), true);
unsubscribe();
assert.deepEqual(visibility, [false, true]);

console.log('PASS operating market workbench contracts');
