import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = join(__dirname, '..');
const read = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

const workspaceSource = read('components/sales/TransactionWorkspace.tsx');
const quickRevenueSource = read('components/sales/QuickInteractionButtons.tsx');
const productSaleSource = read('components/sales/QuickTransactionGrid.tsx');
const paymentSelectorSource = read('components/sales/PaymentMethodSelector.tsx');
const addRevenueSource = read('components/markets/AddRevenueDialog.tsx');
const flowDialogSource = read('components/markets/SalesPhotoEvidenceFlowDialog.tsx');
const flowHookSource = read('hooks/useSalesPhotoEvidenceFlow.ts');
const ownerPageSource = read('components/markets/MarketDetailScreen.tsx');
const staffPageSource = read('components/markets/StaffMarketDetailView.tsx');
const manifestSource = read('scripts/test-files.txt');

assert.match(workspaceSource, /role="tablist"/);
assert.match(workspaceSource, /aria-controls=\{`transaction-panel-quick-/);
assert.match(workspaceSource, /aria-controls=\{`transaction-panel-products-/);
assert.match(workspaceSource, /hidden=\{mode !== 'quick'\}/);
assert.match(workspaceSource, /hidden=\{mode !== 'products'\}/);
assert.match(workspaceSource, /markit:last-sales-payment-method/);
assert.match(workspaceSource, /<QuickInteractionButtons/);
assert.match(workspaceSource, /<QuickTransactionGrid/);
assert.match(workspaceSource, /本場需拍照/);
assert.doesNotMatch(workspaceSource, /role="switch"|onTogglePhotoRequirement/);

for (const source of [quickRevenueSource, productSaleSource, addRevenueSource]) {
  assert.match(source, /<PaymentMethodSelector/);
  assert.match(source, /recordDealWithOptionalSalesPhotoEvidence/);
  assert.match(source, /onSalesPhotoEvidenceResult/);
}
assert.match(quickRevenueSource, /完成收款 NT\$/);
assert.match(productSaleSource, /完成交易 NT\$/);
assert.doesNotMatch(productSaleSource, /handlePayment\(['"]cash['"]\)|grid-cols-5/);
assert.match(paymentSelectorSource, /SALES_PAYMENT_METHOD_LABELS/);
assert.match(paymentSelectorSource, /role="radiogroup"/);

assert.equal((flowDialogSource.match(/<Dialog(?:\s|>)/g) ?? []).length, 1);
assert.match(flowDialogSource, /DialogPanel/);
assert.match(flowDialogSource, /state: SaleCompletionFlowState/);
assert.match(flowDialogSource, /safe-area-inset-bottom/);
assert.match(flowDialogSource, /state\.returnTo === 'closed' \? '稍後補' : '忽略'/);
assert.match(flowDialogSource, /state\.returnTo === 'closed' \? onBack : onClose/);
assert.match(flowHookSource, /reduceSaleCompletionFlow/);
assert.match(flowHookSource, /pendingCreationFromSalesPhotoEvidenceResult/);
assert.match(flowHookSource, /補登完成，照片已列入待補/);
assert.match(flowHookSource, /catch \(refreshError\)/);
assert.match(staffPageSource, /item\.marketId === marketId/);

for (const source of [ownerPageSource, staffPageSource]) {
  assert.match(source, /<TransactionWorkspace/);
  assert.match(source, /<SalesPhotoEvidenceFlowDialog/);
  assert.doesNotMatch(source, /<SalesPhotoEvidencePostSalePrompt|<SalesPhotoEvidencePendingListDialog|<SalesPhotoEvidenceCapturePreviewDialog/);
}

const firstBackfillClose = addRevenueSource.indexOf('onClose();');
const firstBackfillResult = addRevenueSource.indexOf('if (onSalesPhotoEvidenceResult)');
assert.ok(firstBackfillClose > 0 && firstBackfillClose < firstBackfillResult);
assert.doesNotMatch(addRevenueSource, /toast\.success\(['"]✅ 收入補登成功/);
assert.match(manifestSource, /tsx tests\/sales-checkout-photo-evidence-uiux\.test\.ts/);

console.log('PASS sales checkout and photo evidence UI/UX contracts');
