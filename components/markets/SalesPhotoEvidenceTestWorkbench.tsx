'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { SalesPhotoEvidencePendingListDialog } from '@/components/markets/SalesPhotoEvidencePendingListDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { useMarkets } from '@/lib/db/hooks';
import { captureAndStoreSalesPhotoEvidenceWithFileInput } from '@/lib/sales/photo-evidence-browser-adapter';
import { uploadPendingSalesPhotoEvidenceManually } from '@/lib/sales/photo-evidence-manual-upload-client';
import {
  listLocalSalesPhotoEvidencePendingCreationsForMarket,
  type SalesPhotoEvidencePendingCreationListItem,
} from '@/lib/sales/photo-evidence-pending-creation-read-model';
import {
  recordDealWithOptionalSalesPhotoEvidence,
  type SalesPhotoEvidenceRuntimeResult,
} from '@/lib/sales/photo-evidence-runtime-enqueue';
import { getSalesPhotoEvidenceRuntimeGateStatus } from '@/lib/sales/photo-evidence-runtime-flags';
import { useAuth } from '@/lib/supabase/auth-context';

type RouteReadiness = {
  metadataClaim: boolean;
  r2Upload: boolean;
  imageRead: boolean;
  r2Configured: boolean;
};

interface SalesPhotoEvidenceTestWorkbenchProps {
  routeReadiness: RouteReadiness;
}

function getCaptureFailureMessage(reason: string): string {
  if (reason === 'capture_cancelled') return '已取消選擇照片。';
  if (reason === 'adapter_unavailable') return '目前瀏覽器不支援拍照或圖片處理。';
  if (reason === 'source_decode_failed') return '照片讀取失敗，請重新選擇。';
  if (reason === 'compression_failed') return '照片壓縮失敗，請重新選擇。';
  return '照片格式或大小不符合限制。';
}

function ReadinessItem({ ready, label }: { ready: boolean; label: string }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
      <span className="text-sm text-foreground">{label}</span>
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${ready ? 'text-green-700' : 'text-red-700'}`}>
        {ready ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        {ready ? '就緒' : '未就緒'}
      </span>
    </div>
  );
}

export function SalesPhotoEvidenceTestWorkbench({
  routeReadiness,
}: SalesPhotoEvidenceTestWorkbenchProps) {
  const { user } = useAuth();
  const { userRole, isOwner } = useUserRole();
  const markets = useMarkets({ orderBy: 'startDate', order: 'desc' });
  const runtimeGate = useMemo(() => getSalesPhotoEvidenceRuntimeGateStatus(), []);
  const [selectedMarketId, setSelectedMarketId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [lastResult, setLastResult] = useState<SalesPhotoEvidenceRuntimeResult | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [items, setItems] = useState<SalesPhotoEvidencePendingCreationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
  const [capturingQueueId, setCapturingQueueId] = useState<string | null>(null);
  const [uploadingQueueId, setUploadingQueueId] = useState<string | null>(null);
  const [captureErrors, setCaptureErrors] = useState<Record<string, string | null>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string | null>>({});

  const selectedMarket = markets.find(market => market.id === selectedMarketId);
  const ownerId =
    selectedMarket?.relationship_owner_id ??
    selectedMarket?.owner_id ??
    userRole.ownerId ??
    (isOwner ? user?.id : null) ??
    null;
  const canCreate = Boolean(runtimeGate.enabled && user?.id && selectedMarket?.id && ownerId);

  useEffect(() => {
    if (!selectedMarketId && markets[0]?.id) setSelectedMarketId(markets[0].id);
  }, [markets, selectedMarketId]);

  const loadItems = useCallback(async () => {
    if (!selectedMarketId) {
      setItems([]);
      return [] as SalesPhotoEvidencePendingCreationListItem[];
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const nextItems = await listLocalSalesPhotoEvidencePendingCreationsForMarket(selectedMarketId);
      setItems(nextItems);
      setLastLoadedAt(Date.now());
      return nextItems;
    } catch (error) {
      console.error('load photo evidence test items failed:', error);
      setLoadError('待補照片讀取失敗。');
      return [] as SalesPhotoEvidencePendingCreationListItem[];
    } finally {
      setIsLoading(false);
    }
  }, [selectedMarketId]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleCreateTestSale = async () => {
    if (!selectedMarket?.id || !ownerId || !user?.id || !runtimeGate.enabled) return;

    setIsCreating(true);
    const submittedAt = new Date().toISOString();
    try {
      const result = await recordDealWithOptionalSalesPhotoEvidence({
        marketId: selectedMarket.id,
        items: [],
        totalAmount: 1,
        paymentMethod: 'other',
        isManualEntry: true,
        manualRevenue: 1,
        manualDealCount: 1,
        notes: '[TEST] 成交照片測試頁建立',
      }, undefined, {
        evidenceContext: {
          ownerId,
          marketId: selectedMarket.id,
          marketRequiresEvidence: true,
          capturedByStaffId: isOwner ? null : user.id,
          saleCompletedAt: submittedAt,
          now: submittedAt,
        },
      });

      setLastResult(result);
      await loadItems();
      setShowPending(true);
      if (result.evidence.status === 'created') {
        toast.success('測試成交與待補照片已建立。');
      } else {
        toast.warning(`測試成交已建立，照片任務狀態：${result.evidence.status}`);
      }
    } catch (error) {
      console.error('create photo evidence test sale failed:', error);
      toast.error('測試成交建立失敗。');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCapture = async (item: SalesPhotoEvidencePendingCreationListItem) => {
    setCapturingQueueId(item.queueId);
    setCaptureErrors(previous => ({ ...previous, [item.queueId]: null }));
    try {
      const result = await captureAndStoreSalesPhotoEvidenceWithFileInput({ queueItem: item });
      if (result.action === 'capture_stored_locally') {
        toast.success('照片已暫存在本機。');
        await loadItems();
        return;
      }

      const message = getCaptureFailureMessage(result.failure.reason);
      setCaptureErrors(previous => ({ ...previous, [item.queueId]: message }));
      if (result.failure.reason !== 'capture_cancelled') toast.error(message);
    } finally {
      setCapturingQueueId(null);
    }
  };

  const handleUpload = async (item: SalesPhotoEvidencePendingCreationListItem) => {
    setUploadingQueueId(item.queueId);
    setUploadErrors(previous => ({ ...previous, [item.queueId]: null }));
    try {
      const result = await uploadPendingSalesPhotoEvidenceManually(item);
      if (result.ok) {
        toast.success('測試照片已上傳。');
      } else {
        setUploadErrors(previous => ({ ...previous, [item.queueId]: result.message }));
        toast.error(result.message);
      }
      await loadItems();
    } catch (error) {
      console.error('upload photo evidence test item failed:', error);
      const message = '照片上傳失敗。';
      setUploadErrors(previous => ({ ...previous, [item.queueId]: message }));
      toast.error(message);
    } finally {
      setUploadingQueueId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b border-border bg-white px-5 py-5">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/" className="rounded-full p-2 text-muted-foreground hover:bg-background" aria-label="返回首頁">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <FlaskConical className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-medium text-foreground">成交照片測試</h1>
            <p className="text-sm text-muted-foreground">Local / Staging 專用</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-5 py-8">
        <section>
          <h2 className="mb-3 text-base font-medium text-foreground">環境狀態</h2>
          <div className="border-y border-border bg-white px-4">
            <ReadinessItem ready={runtimeGate.enabled} label="成交後建立照片任務" />
            <ReadinessItem ready={routeReadiness.metadataClaim} label="照片 metadata claim" />
            <ReadinessItem ready={routeReadiness.r2Upload && routeReadiness.r2Configured} label="R2 照片上傳" />
            <ReadinessItem ready={routeReadiness.imageRead} label="老闆端照片讀取" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-foreground">建立測試成交</h2>
          <label htmlFor="photo-evidence-test-market" className="mb-2 block text-sm font-medium text-foreground">
            市集
          </label>
          <select
            id="photo-evidence-test-market"
            value={selectedMarketId}
            onChange={event => setSelectedMarketId(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground"
          >
            {markets.length === 0 && <option value="">目前沒有可用市集</option>}
            {markets.map(market => (
              <option key={market.id} value={market.id}>{market.name}</option>
            ))}
          </select>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleCreateTestSale}
              disabled={!canCreate || isCreating}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              建立 NT$1 測試成交
            </button>
            <button
              type="button"
              onClick={() => {
                void loadItems();
                setShowPending(true);
              }}
              disabled={!selectedMarketId}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium text-foreground disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              待補照片 ({items.length})
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>此操作會寫入一筆標記為 [TEST] 的真實成交。</span>
            {selectedMarket?.id && (
              <Link href={`/markets/${selectedMarket.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                開啟市集 <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {!user?.id && <p className="mt-3 text-sm text-red-700">請先登入 owner 或 staff 帳號。</p>}
          {user?.id && !ownerId && <p className="mt-3 text-sm text-red-700">選定市集缺少 owner 關聯資料。</p>}
          {lastResult && (
            <p className="mt-3 text-sm text-foreground">
              最近結果：<span className="font-medium">{lastResult.evidence.status}</span>
            </p>
          )}
        </section>
      </main>

      <SalesPhotoEvidencePendingListDialog
        isOpen={showPending}
        items={items}
        isLoading={isLoading}
        loadError={loadError}
        lastLoadedAt={lastLoadedAt}
        captureEnabled={true}
        capturingQueueId={capturingQueueId}
        captureErrorByQueueId={captureErrors}
        uploadEnabled={true}
        uploadingQueueId={uploadingQueueId}
        uploadErrorByQueueId={uploadErrors}
        isLocalCaptureAllowed={item => !item.capturedByStaffId || item.capturedByStaffId === user?.id}
        onCaptureLocal={handleCapture}
        onUploadManual={handleUpload}
        onRefresh={loadItems}
        onClose={() => setShowPending(false)}
      />
    </div>
  );
}
