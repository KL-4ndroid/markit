import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const workbench = read('components/markets/OperatingMarketWorkbench.tsx');
const interactionPanel = read('components/markets/OperatingInteractionPanel.tsx');
const fieldOps = read('components/markets/MarketFieldOpsSection.tsx');
const summary = read('components/markets/MarketWorkspaceSummary.tsx');
const bottomNavigation = read('components/BottomNavigation.tsx');
const owner = read('components/markets/MarketDetailScreen.tsx');
const staff = read('components/markets/StaffMarketDetailView.tsx');
const transaction = read('components/sales/TransactionWorkspace.tsx');
const quickSale = read('components/sales/QuickInteractionButtons.tsx');
const productSale = read('components/sales/QuickTransactionGrid.tsx');
const interactions = read('components/sales/InteractionButtons.tsx');
const photoFlow = read('components/markets/SalesPhotoEvidenceFlowDialog.tsx');

assert.match(workbench, /aria-label="收款與銷售"/);
assert.doesNotMatch(workbench, /fixed inset-x-0 bottom-0/);
assert.match(workbench, /grid grid-cols-2 gap-2/);
assert.match(workbench, />快速收款</);
assert.match(workbench, />商品銷售</);
assert.doesNotMatch(workbench, /InteractionButtons|待補照片|照片已齊|ImagePlus|CheckCircle2/);
assert.match(workbench, /<Dialog[\s\S]*presentation="sheet"/);
assert.match(workbench, /onTransactionCompleted=\{completeTransaction\}/);
assert.match(workbench, /disabled=\{isTransactionProcessing\}/);
assert.match(workbench, /onProcessingChange=\{setIsTransactionProcessing\}/);
assert.doesNotMatch(workbench, /recordDeal|recordInteraction|recordEvent|\bdb\./);
assert.match(bottomNavigation, /useSyncExternalStore/);
assert.match(bottomNavigation, /navigationStore\.getVisible\(\)/);

for (const source of [owner, staff]) {
  assert.match(source, /<OperatingMarketWorkbench/);
  assert.doesNotMatch(source, /pb-28 lg:pb-6/);
  assert.match(source, /hidden items-start gap-4 lg:grid/);
  assert.match(source, /<OperatingInteractionPanel/);
  assert.match(source, /collapsibleOnMobile/);
  assert.match(source, /handleOpenPendingSalesPhotoEvidence/);
  assert.doesNotMatch(source, /operating-workbench'\)/);
}
assert.doesNotMatch(owner, /OwnerLiveMobileView|ownerLiveMobileView|開啟現場工作|返回營業概況/);
assert.match(owner, /<OperatingInteractionPanel[\s\S]*canOpenSettings/);
assert.doesNotMatch(staff, /hideNavigation|showNavigation/);

assert.match(interactionPanel, /按鈕名稱可自由設定/);
assert.match(interactionPanel, /按鈕名稱由老闆設定/);
assert.match(interactionPanel, /href="\/settings\/sales"/);
assert.match(interactionPanel, /variant="inline"/);
assert.match(fieldOps, /collapsibleOnMobile\?: boolean/);
assert.match(fieldOps, /aria-expanded=\{isMobileExpanded\}/);
assert.match(fieldOps, />現場工作</);
assert.match(fieldOps, /主辦備註、交接筆記與待辦/);
assert.match(summary, /onClick\?: \(\) => void/);
assert.match(summary, /<SummaryValue item=\{item\}/);

assert.match(transaction, /presentation\?: TransactionPresentation/);
assert.match(transaction, /onTransactionCompleted=\{onTransactionCompleted\}/g);
for (const source of [quickSale, productSale]) {
  assert.match(source, /onTransactionCompleted\?\.\(\)/);
  assert.match(source, /presentation === 'sheet'[\s\S]*sticky bottom-0/);
}
assert.match(interactions, /variant\?: 'card' \| 'dock' \| 'inline'/);
assert.match(interactions, /bottom-\[calc\(100%\+0\.65rem\)\]/);
assert.match(photoFlow, /items-end justify-center sm:items-center/);
assert.match(photoFlow, /稍後上傳/);
assert.match(photoFlow, /返回待補清單/);

console.log('PASS operating market workbench contracts');
