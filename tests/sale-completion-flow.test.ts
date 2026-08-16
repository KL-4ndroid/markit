import assert from 'node:assert/strict';
import {
  INITIAL_SALE_COMPLETION_FLOW_STATE,
  pendingCreationFromSalesPhotoEvidenceResult,
  reduceSaleCompletionFlow,
  type SaleCompletionFlowState,
} from '../lib/sales/sale-completion-flow';
import { buildSalesTransactionSummary } from '../lib/sales/sale-summary';
import { formatSalesPaymentMethod } from '../lib/sales/payment-methods';
import { buildSalesPhotoEvidencePendingTaskItems } from '../lib/sales/photo-evidence-pending-creation-read-model';
import type { SalesPhotoEvidenceRuntimeResult } from '../lib/sales/photo-evidence-runtime-enqueue';
import type { LocalPendingSalesPhotoEvidencePayload } from '../lib/sales/photo-evidence-pending-payload-storage';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MARKET_ID = '22222222-2222-4222-8222-222222222222';
const SALE_ID = '33333333-3333-4333-8333-333333333333';
const timestamp = '2026-07-15T04:00:00.000Z';

const transaction = buildSalesTransactionSummary({
  marketId: MARKET_ID,
  items: [{ productId: '44444444-4444-4444-8444-444444444444', quantity: 2, price: 600 }],
  totalAmount: 1200,
  paymentMethod: 'cash',
}, SALE_ID, timestamp);

const result: SalesPhotoEvidenceRuntimeResult = {
  dealEventId: SALE_ID,
  transaction,
  evidence: {
    status: 'created',
    decision: {
      action: 'create_pending',
      reason: 'market_requires_evidence',
      draft: {
        owner_id: OWNER_ID,
        market_id: MARKET_ID,
        sale_id: SALE_ID,
        captured_by_staff_id: null,
        sale_completed_at: timestamp,
        status: 'pending_capture',
        created_at: timestamp,
        updated_at: timestamp,
      },
    },
  },
};

const item = pendingCreationFromSalesPhotoEvidenceResult(result);
assert.ok(item);

const payload = {
  queueId: SALE_ID,
  saleEventId: SALE_ID,
  ownerId: OWNER_ID,
  marketId: MARKET_ID,
  capturedByStaffId: null,
  image: { blob: new Blob(['image']), mimeType: 'image/jpeg', fileSizeBytes: 5, width: 800, height: 600, contentHash: 'a' },
  thumbnail: { blob: new Blob(['thumb']), mimeType: 'image/jpeg', fileSizeBytes: 5, width: 200, height: 150, contentHash: 'b' },
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies LocalPendingSalesPhotoEvidencePayload;

let state: SaleCompletionFlowState = INITIAL_SALE_COMPLETION_FLOW_STATE;
state = reduceSaleCompletionFlow(state, {
  type: 'OPEN_PHOTO_TASK',
  item,
  summary: transaction,
  returnTo: 'closed',
});
assert.equal(state.view, 'photo_required');

state = reduceSaleCompletionFlow(state, { type: 'START_CAPTURE' });
assert.equal(state.view, 'processing_photo');
state = reduceSaleCompletionFlow(state, { type: 'CAPTURE_SELECTED', payload });
assert.equal(state.view, 'previewing');
state = reduceSaleCompletionFlow(state, { type: 'START_UPLOAD' });
assert.equal(state.view, 'uploading');
assert.equal(reduceSaleCompletionFlow(state, { type: 'CLOSE' }).view, 'uploading');
state = reduceSaleCompletionFlow(state, { type: 'UPLOAD_SUCCEEDED' });
assert.equal(state.view, 'completed');
state = reduceSaleCompletionFlow(state, { type: 'DISMISS_COMPLETED' });
assert.equal(state.view, 'closed');

const cancelled = reduceSaleCompletionFlow(
  reduceSaleCompletionFlow({ view: 'pending_list' }, {
    type: 'OPEN_PHOTO_TASK',
    item,
    summary: transaction,
    returnTo: 'pending_list',
  }),
  { type: 'START_CAPTURE' }
);
assert.equal(reduceSaleCompletionFlow(cancelled, { type: 'CAPTURE_CANCELLED' }).view, 'photo_required');

let failedUpload = reduceSaleCompletionFlow({
  view: 'previewing',
  item,
  summary: transaction,
  returnTo: 'pending_list',
  payload,
}, { type: 'START_UPLOAD' });
failedUpload = reduceSaleCompletionFlow(failedUpload, {
  type: 'UPLOAD_FAILED',
  message: 'temporary failure',
});
assert.equal(failedUpload.view, 'upload_failed');
assert.equal(failedUpload.view === 'upload_failed' ? failedUpload.payload : null, payload);
assert.equal(reduceSaleCompletionFlow(failedUpload, { type: 'START_UPLOAD' }).view, 'uploading');
assert.equal(reduceSaleCompletionFlow(failedUpload, { type: 'BACK' }).view, 'pending_list');

assert.deepEqual(
  reduceSaleCompletionFlow(INITIAL_SALE_COMPLETION_FLOW_STATE, {
    type: 'CAPTURE_SELECTED',
    payload,
  }),
  INITIAL_SALE_COMPLETION_FLOW_STATE
);

const openedPreview = reduceSaleCompletionFlow({ view: 'pending_list' }, {
  type: 'OPEN_PREVIEW_TASK',
  item,
  summary: transaction,
  returnTo: 'pending_list',
  payload,
});
assert.equal(openedPreview.view, 'previewing');
assert.equal(reduceSaleCompletionFlow(openedPreview, { type: 'CLOSE' }).view, 'closed');

assert.equal(transaction.totalAmount, 1200);
assert.equal(transaction.itemCount, 2);
assert.equal(transaction.itemLabel, '2 件商品');
assert.equal(formatSalesPaymentMethod('card'), '信用卡／轉帳');

const [task] = buildSalesPhotoEvidencePendingTaskItems([item], [{
  id: SALE_ID,
  type: 'deal_closed',
  timestamp,
  payload: {
    market_id: MARKET_ID,
    items: [{ productId: 'product-1', product_name: '手作耳環', quantity: 2, price: 600 }],
    totalAmount: 1200,
    paymentMethod: 'cash',
  },
}]);
assert.equal(task.transaction?.totalAmount, 1200);
assert.equal(task.transaction?.itemLabel, '2 件商品');

console.log('PASS sale completion flow state machine and summary contracts');
