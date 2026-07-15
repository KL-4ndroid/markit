'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';
import { toast } from 'sonner';

import { captureAndStoreSalesPhotoEvidenceWithFileInput } from '@/lib/sales/photo-evidence-browser-adapter';
import { uploadPendingSalesPhotoEvidenceManually } from '@/lib/sales/photo-evidence-manual-upload-client';
import type { LocalPendingSalesPhotoEvidenceCreation } from '@/lib/sales/photo-evidence-pending-creation';
import {
  listLocalSalesPhotoEvidencePendingTasksForMarket,
  type SalesPhotoEvidencePendingTaskItem,
} from '@/lib/sales/photo-evidence-pending-creation-read-model';
import type { LocalPendingSalesPhotoEvidencePayload } from '@/lib/sales/photo-evidence-pending-payload-storage';
import type { SalesPhotoEvidenceRuntimeResult } from '@/lib/sales/photo-evidence-runtime-enqueue';
import {
  INITIAL_SALE_COMPLETION_FLOW_STATE,
  pendingCreationFromSalesPhotoEvidenceResult,
  reduceSaleCompletionFlow,
  type SaleCompletionReturnTarget,
} from '@/lib/sales/sale-completion-flow';
import type { SalesTransactionSummary } from '@/lib/sales/sale-summary';
import { formatSalesPaymentMethod } from '@/lib/sales/payment-methods';

type CaptureSource = 'camera' | 'library';

interface UseSalesPhotoEvidenceFlowOptions {
  marketId: string;
  canHandleItem: (item: LocalPendingSalesPhotoEvidenceCreation) => boolean;
  onUploadCompleted?: () => void | Promise<void>;
}

function captureFailureMessage(reason: string): string {
  switch (reason) {
    case 'adapter_unavailable':
      return '目前瀏覽器無法開啟相機或相簿，請改用其他瀏覽器再試。';
    case 'source_decode_failed':
      return '照片讀取失敗，請重新拍照或選擇其他照片。';
    case 'compression_failed':
      return '照片處理失敗，請重新拍照或選擇其他照片。';
    case 'output_policy_rejected':
      return '這張照片無法使用，請重新拍攝或選擇其他照片。';
    default:
      return '照片處理失敗，請稍後再試。';
  }
}

function fallbackSummary(item: LocalPendingSalesPhotoEvidenceCreation): SalesTransactionSummary {
  return {
    dealEventId: item.saleEventId,
    totalAmount: 0,
    paymentMethod: 'other',
    itemCount: 1,
    itemLabel: '成交紀錄',
    completedAt: item.saleCompletedAt,
    isBackfill: false,
  };
}

function transactionToastDescription(summary: SalesTransactionSummary): string {
  const amount = summary.totalAmount > 0 ? `NT$${summary.totalAmount.toLocaleString()} · ` : '';
  return `${amount}${formatSalesPaymentMethod(summary.paymentMethod)} · ${summary.itemLabel}`;
}

export function useSalesPhotoEvidenceFlow({
  marketId,
  canHandleItem,
  onUploadCompleted,
}: UseSalesPhotoEvidenceFlowOptions) {
  const [state, dispatch] = useReducer(
    reduceSaleCompletionFlow,
    INITIAL_SALE_COMPLETION_FLOW_STATE
  );
  const [pendingItems, setPendingItems] = useState<SalesPhotoEvidencePendingTaskItem[]>([]);
  const [isLoadingPendingItems, setIsLoadingPendingItems] = useState(false);
  const [pendingItemsError, setPendingItemsError] = useState<string | null>(null);
  const [payloadRefreshByQueueId, setPayloadRefreshByQueueId] = useState<Record<string, string>>({});

  const loadPendingItems = useCallback(async () => {
    if (!marketId) {
      setPendingItems([]);
      return [];
    }

    setIsLoadingPendingItems(true);
    setPendingItemsError(null);
    try {
      const items = await listLocalSalesPhotoEvidencePendingTasksForMarket(marketId);
      setPendingItems(items);
      return items;
    } catch (error) {
      console.error('load pending sales photo tasks failed:', error);
      setPendingItemsError('待補照片讀取失敗，請稍後再試。');
      return [];
    } finally {
      setIsLoadingPendingItems(false);
    }
  }, [marketId]);

  useEffect(() => {
    void loadPendingItems();
  }, [loadPendingItems]);

  useEffect(() => {
    if (state.view !== 'completed') return;
    const timer = window.setTimeout(() => dispatch({ type: 'DISMISS_COMPLETED' }), 800);
    return () => window.clearTimeout(timer);
  }, [state.view]);

  const handleSalesPhotoEvidenceResult = useCallback(async (result: SalesPhotoEvidenceRuntimeResult) => {
    const summary = result.transaction;
    const pendingItem = pendingCreationFromSalesPhotoEvidenceResult(result);

    if (pendingItem) {
      void loadPendingItems();

      if (summary.isBackfill) {
        toast.success('補登完成，照片已列入待補', {
          description: transactionToastDescription(summary),
          action: {
            label: '現在補照片',
            onClick: () => dispatch({
              type: 'OPEN_PHOTO_TASK',
              item: pendingItem,
              summary,
              returnTo: 'closed',
            }),
          },
        });
        return;
      }

      dispatch({
        type: 'OPEN_PHOTO_TASK',
        item: pendingItem,
        summary,
        returnTo: 'closed',
      });
      return;
    }

    if (result.evidence.status === 'failed' || result.evidence.status === 'context_missing') {
      toast.warning('成交已記錄，照片功能暫時無法使用。', {
        description: '請先保留商品照片，稍後再補上紀錄。',
      });
      void loadPendingItems();
      return;
    }

    toast.success(summary.isBackfill ? '補登完成' : '成交完成', {
      description: transactionToastDescription(summary),
    });
  }, [loadPendingItems]);

  const openPendingList = useCallback(() => {
    dispatch({ type: 'OPEN_PENDING_LIST' });
    void loadPendingItems();
  }, [loadPendingItems]);

  const openTask = useCallback((item: SalesPhotoEvidencePendingTaskItem) => {
    dispatch({
      type: 'OPEN_PHOTO_TASK',
      item,
      summary: item.transaction ?? fallbackSummary(item),
      returnTo: 'pending_list',
    });
  }, []);

  const openPreview = useCallback((
    item: SalesPhotoEvidencePendingTaskItem,
    payload: LocalPendingSalesPhotoEvidencePayload
  ) => {
    dispatch({
      type: 'OPEN_PREVIEW_TASK',
      item,
      summary: item.transaction ?? fallbackSummary(item),
      returnTo: 'pending_list',
      payload,
    });
  }, []);

  const capture = useCallback(async (
    item: LocalPendingSalesPhotoEvidenceCreation,
    source: CaptureSource,
    options: {
      summary?: SalesTransactionSummary;
      returnTo?: SaleCompletionReturnTarget;
    } = {}
  ) => {
    if (!canHandleItem(item)) {
      toast.error('你目前無法處理這筆成交照片。');
      return null;
    }

    const currentActive = state.view !== 'closed' && state.view !== 'pending_list'
      && state.item.queueId === item.queueId;
    const taskSummary = pendingItems.find(task => task.queueId === item.queueId)?.transaction;
    const summary = currentActive ? state.summary : options.summary ?? taskSummary ?? fallbackSummary(item);
    const returnTo = currentActive ? state.returnTo : options.returnTo ?? 'pending_list';

    if (!currentActive) {
      dispatch({ type: 'OPEN_PHOTO_TASK', item, summary, returnTo });
    }
    dispatch({ type: 'START_CAPTURE' });

    try {
      const result = await captureAndStoreSalesPhotoEvidenceWithFileInput({
        queueItem: item,
        source,
      });

      if (result.action === 'capture_stored_locally') {
        setPayloadRefreshByQueueId(previous => ({
          ...previous,
          [item.queueId]: result.payload.updatedAt,
        }));
        dispatch({ type: 'CAPTURE_SELECTED', payload: result.payload });
        void loadPendingItems();
        return result.payload;
      }

      if (result.failure.reason === 'capture_cancelled') {
        dispatch({ type: 'CAPTURE_CANCELLED' });
        return null;
      }

      dispatch({ type: 'CAPTURE_FAILED', message: captureFailureMessage(result.failure.reason) });
      return null;
    } catch (error) {
      console.error('capture sales photo failed:', error);
      dispatch({ type: 'CAPTURE_FAILED', message: '照片處理失敗，請稍後再試。' });
      return null;
    }
  }, [canHandleItem, loadPendingItems, pendingItems, state]);

  const upload = useCallback(async (
    item: LocalPendingSalesPhotoEvidenceCreation,
    payload: LocalPendingSalesPhotoEvidencePayload,
    options: {
      summary?: SalesTransactionSummary;
      returnTo?: SaleCompletionReturnTarget;
    } = {}
  ) => {
    if (!canHandleItem(item)) {
      toast.error('你目前無法處理這筆成交照片。');
      return false;
    }

    const currentActive = state.view !== 'closed' && state.view !== 'pending_list'
      && state.item.queueId === item.queueId;
    const taskSummary = pendingItems.find(task => task.queueId === item.queueId)?.transaction;
    const summary = currentActive ? state.summary : options.summary ?? taskSummary ?? fallbackSummary(item);
    const returnTo = currentActive ? state.returnTo : options.returnTo ?? 'pending_list';

    if (!currentActive) {
      dispatch({ type: 'OPEN_PREVIEW_TASK', item, summary, returnTo, payload });
    }
    dispatch({ type: 'START_UPLOAD' });

    try {
      const result = await uploadPendingSalesPhotoEvidenceManually(item);
      if (!result.ok) {
        dispatch({ type: 'UPLOAD_FAILED', message: result.message });
        void loadPendingItems();
        return false;
      }

      dispatch({ type: 'UPLOAD_SUCCEEDED' });
      setPayloadRefreshByQueueId(previous => ({
        ...previous,
        [item.queueId]: new Date().toISOString(),
      }));
      await loadPendingItems();
      try {
        await onUploadCompleted?.();
      } catch (refreshError) {
        console.error('refresh sales photo album after upload failed:', refreshError);
      }
      return true;
    } catch (error) {
      console.error('upload sales photo failed:', error);
      dispatch({ type: 'UPLOAD_FAILED', message: '照片上傳失敗，照片仍安全保留在此裝置。' });
      void loadPendingItems();
      return false;
    }
  }, [canHandleItem, loadPendingItems, onUploadCompleted, pendingItems, state]);

  return {
    state,
    pendingItems,
    pendingCount: pendingItems.length,
    isLoadingPendingItems,
    pendingItemsError,
    payloadRefreshByQueueId,
    handleSalesPhotoEvidenceResult,
    loadPendingItems,
    openPendingList,
    openTask,
    openPreview,
    capture,
    upload,
    back: () => dispatch({ type: 'BACK' }),
    close: () => dispatch({ type: 'CLOSE' }),
  };
}
