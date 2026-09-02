'use client';

import { ExternalLink, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { getInAppPurchasePort } from '@/lib/platform/in-app-purchase-capability';
import type { InAppPurchaseAvailability } from '@/lib/platform/contracts/in-app-purchase';
import {
  openNativeSubscriptionManagement,
  runNativePurchaseRestore,
  type NativePurchaseWorkflowState,
} from '@/lib/subscription/native-purchase-workflow';

export function NativeSubscriptionActions({
  canManageSubscription,
  accountBindingToken = null,
  verificationRuntimeAvailable = false,
}: {
  canManageSubscription: boolean;
  accountBindingToken?: string | null;
  verificationRuntimeAvailable?: boolean;
}) {
  const [availability, setAvailability] = useState<InAppPurchaseAvailability | null>(null);
  const [workflow, setWorkflow] = useState<NativePurchaseWorkflowState | null>(null);

  useEffect(() => {
    let active = true;
    void getInAppPurchasePort().getAvailability().then(value => {
      if (active) setAvailability(value);
    });
    return () => { active = false; };
  }, []);

  const operationReady = availability?.available === true
    && verificationRuntimeAvailable
    && Boolean(accountBindingToken);
  const isBusy = workflow?.phase === 'restoring' || workflow?.phase === 'managing';

  const restorePurchase = async () => {
    if (!operationReady || !accountBindingToken) return;
    setWorkflow({ phase: 'restoring', products: [], evidence: [], errorCode: null, retryable: false });
    setWorkflow(await runNativePurchaseRestore({
      port: getInAppPurchasePort(),
      request: { accountBinding: { opaqueAccountToken: accountBindingToken } },
    }));
  };

  const manageSubscription = async () => {
    if (!availability?.available || !canManageSubscription) return;
    setWorkflow({ phase: 'managing', products: [], evidence: [], errorCode: null, retryable: false });
    setWorkflow(await openNativeSubscriptionManagement(getInAppPurchasePort()));
  };

  const statusLabel = availability === null
    ? '正在確認商店服務'
    : availability.available
      ? verificationRuntimeAvailable
        ? '商店服務可用'
        : '商店驗證服務尚未啟用'
      : availability.reason === 'web_checkout_deferred'
        ? 'Web 付款將於後續開放'
        : '此裝置尚未連接商店服務';

  return (
    <section className="mt-4 border-t border-atelier-line pt-4" aria-label="訂閱操作">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          {availability === null || isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          )}
          <span>{statusLabel}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="compact"
            leadingIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            disabled={!operationReady || isBusy}
            onClick={() => void restorePurchase()}
          >
            恢復購買
          </Button>
          <Button
            variant="secondary"
            size="compact"
            leadingIcon={<ExternalLink className="h-4 w-4" aria-hidden="true" />}
            disabled={!availability?.available || !canManageSubscription || isBusy}
            onClick={() => void manageSubscription()}
          >
            管理訂閱
          </Button>
        </div>
      </div>
      {workflow?.phase === 'pending' && (
        <p className="mt-2 text-xs text-atelier-clay" role="status">商店正在處理購買，確認後會重新檢查方案。</p>
      )}
      {workflow?.phase === 'awaiting_server_verification' && (
        <p className="mt-2 text-xs text-atelier-clay" role="status">購買資料已收到，正在等待伺服器驗證。</p>
      )}
      {workflow?.phase === 'failed' && (
        <p className="mt-2 text-xs text-danger" role="alert">目前無法完成訂閱操作，請稍後再試。</p>
      )}
    </section>
  );
}
