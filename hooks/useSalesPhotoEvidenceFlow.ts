'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { toast } from 'sonner';

import { captureAndStoreSalesPhotoEvidenceWithFileInput } from '@/lib/sales/photo-evidence-browser-adapter';
import { resolvePhotoCamera } from '@/lib/platform/camera-capability';
import { CameraSelectionError } from '@/lib/platform/contracts/camera';
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
import { recoverOwnerSalesPhotoEvidenceReminders, SalesPhotoEvidenceReminderAccessError } from '@/lib/sales/photo-evidence-reminder-recovery';
import { isSalesPhotoEvidenceRuntimeEnqueueEnabled } from '@/lib/sales/photo-evidence-runtime-flags';

type CaptureSource = 'camera' | 'library';

interface UseSalesPhotoEvidenceFlowOptions {
  marketId: string;
  canHandleItem: (item: LocalPendingSalesPhotoEvidenceCreation) => boolean;
  onUploadCompleted?: () => void | Promise<void>;
  initialView?: 'pending_list';
  actorId?: string | null;
  recoveryOwnerId?: string | null;
}

function captureFailureMessage(reason: string): string {
  switch (reason) {
    case 'adapter_unavailable':
      return '目前無法開啟相機或相簿，請稍後再試。';
    case 'permission_denied':
      return '請允許使用相機或照片後再試，或到裝置設定調整權限。';
    case 'camera_not_found':
      return '這部裝置沒有可用的相機，請改從相簿選取。';
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
  initialView,
  actorId,
  recoveryOwnerId,
}: UseSalesPhotoEvidenceFlowOptions) {
  const [state, dispatch] = useReducer(
    reduceSaleCompletionFlow,
    INITIAL_SALE_COMPLETION_FLOW_STATE
  );
  const [pendingItems, setPendingItems] = useState<SalesPhotoEvidencePendingTaskItem[]>([]);
  const [isLoadingPendingItems, setIsLoadingPendingItems] = useState(true);
  const [pendingItemsError, setPendingItemsError] = useState<string | null>(null);
  const [payloadRefreshByQueueId, setPayloadRefreshByQueueId] = useState<Record<string, string>>({});
  const localScopeMessage = '此處列出這台裝置的待補工作。其他裝置尚未上傳的照片不會自動出現在此處，請回原裝置完成。';
  const [pendingScopeMessage, setPendingScopeMessage] = useState(localScopeMessage);
  const scopeKey = `${actorId ?? ''}:${recoveryOwnerId ?? ''}:${marketId}`;
  const currentScope = useRef(scopeKey);
  currentScope.current = scopeKey;
  const loadGeneration = useRef(0);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);

  const loadPendingItems = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const isCurrent = () => currentScope.current === scopeKey && loadGeneration.current === generation;
    if (!marketId) {
      setPendingItems([]);
      setLoadedScope(scopeKey);
      setIsLoadingPendingItems(false);
      return [];
    }

    setIsLoadingPendingItems(true);
    setPendingItemsError(null);
    try {
      let hiddenSaleIds = new Set<string>();
      let message = localScopeMessage;
      if (recoveryOwnerId && actorId === recoveryOwnerId && isSalesPhotoEvidenceRuntimeEnqueueEnabled()) {
        try {
          const plan = await recoverOwnerSalesPhotoEvidenceReminders({ ownerId: recoveryOwnerId, marketId, isCurrent });
          hiddenSaleIds = plan.hiddenSaleIds;
          message = `已核對雲端照片紀錄並還原有依據的待補工作。${plan.unknownSaleCount > 0
            ? `另有 ${plan.unknownSaleCount} 筆舊成交未記錄當時的照片要求，無法確認是否待補。` : ''}其他裝置尚未上傳的原圖無法還原；可回原裝置上傳，或在此重新選取。`;
        } catch (error) {
          // A network failure may show cached work; an identity rejection must not.
          if (error instanceof SalesPhotoEvidenceReminderAccessError) throw error;
          message = '目前無法核對雲端照片狀態，先顯示本機待補工作。請確認網路後按重新整理；本機無待補不代表其他裝置已完成。';
        }
      }
      if (!isCurrent()) return [];
      const localItems = await listLocalSalesPhotoEvidencePendingTasksForMarket(marketId, { limit: Number.MAX_SAFE_INTEGER });
      if (!isCurrent()) return [];
      const items = localItems.filter(item => !hiddenSaleIds.has(item.saleEventId) && canHandleItem(item));
      setPendingItems(items);
      setPendingScopeMessage(message);
      setLoadedScope(scopeKey);
      return items;
    } catch (error) {
      if (!isCurrent()) return [];
      console.error('load pending sales photo tasks failed:', error);
      setPendingItems([]);
      setLoadedScope(scopeKey);
      setPendingItemsError('待補照片讀取失敗，請稍後再試。');
      return [];
    } finally {
      if (isCurrent()) setIsLoadingPendingItems(false);
    }
  }, [actorId, canHandleItem, localScopeMessage, marketId, recoveryOwnerId, scopeKey]);

  const cancelPendingLoads = useCallback(() => { loadGeneration.current++; }, []);
  useEffect(() => {
    void loadPendingItems();
    return cancelPendingLoads;
  }, [cancelPendingLoads, loadPendingItems]);

  useEffect(() => {
    dispatch({ type: initialView === 'pending_list' ? 'OPEN_PENDING_LIST' : 'CLOSE' });
  }, [actorId, marketId, initialView]);

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
      const camera = await resolvePhotoCamera();
      const result = await captureAndStoreSalesPhotoEvidenceWithFileInput({
        queueItem: item,
        source,
      }, {
        getCapabilitySnapshot: () => camera.getCapabilitySnapshot(),
        selectFile: captureSource => camera.selectImage(captureSource),
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
      dispatch({ type: 'CAPTURE_FAILED', message: error instanceof CameraSelectionError
        ? captureFailureMessage(error.reason) : '照片處理失敗，請稍後再試。' });
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
    pendingItems: loadedScope === scopeKey ? pendingItems : [],
    pendingCount: loadedScope === scopeKey ? pendingItems.length : 0,
    isLoadingPendingItems: isLoadingPendingItems || loadedScope !== scopeKey,
    pendingItemsError: loadedScope === scopeKey ? pendingItemsError : null,
    pendingScopeMessage: loadedScope === scopeKey ? pendingScopeMessage : '正在確認待補照片的資料範圍。',
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
