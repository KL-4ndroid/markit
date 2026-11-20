'use client';

import { useState } from 'react';
import { AppDialog } from '@/components/ui/AppDialog';
import { Button } from '@/components/ui/Button';
import { getExternalLinkPort } from '@/lib/platform/interaction-capabilities';
import type { ApplePurchaseState, ApplePurchaseConfiguration } from '@/lib/subscription/apple-purchase-session';
import { APP_BRAND } from '@/lib/app-brand';

export function ApplePurchaseView({ state, configuration, activeSubscription, billingOrigin, online, authorized = true, purchase, restore, retry, manage }: {
  state: ApplePurchaseState; configuration: ApplePurchaseConfiguration; activeSubscription: boolean; billingOrigin: string | null; online: boolean; authorized?: boolean;
  purchase(id: string): Promise<void>; restore(): Promise<void>; retry(): Promise<void>; manage(): Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const busy = ['loading', 'purchasing', 'restoring', 'verifying'].includes(state.phase);
  const canBuy = online && authorized && configuration.copyReviewed && !activeSubscription && ['ready', 'cancelled', 'empty'].includes(state.phase);
  const selected = state.products.find(item => item.productId === selectedId);
  const selectedPhase = selected?.purchaseOptions[0]?.pricePhases[0];
  async function legal(url: string) { try { setLinkError(!await getExternalLinkPort().open(url)); } catch { setLinkError(true); } }
  return <section className="mt-4 space-y-4 border-t border-atelier-line pt-4" aria-label="App Store 訂閱">
    <h3 className="font-semibold text-foreground">App Store 訂閱</h3>
    {!online ? <p className="text-sm text-muted-foreground" role="status">目前離線，連線後可繼續確認原有購買。</p> : null}
    {online && !authorized ? <p className="text-sm text-muted-foreground" role="status">正在確認帳號與方案，完成後可操作。</p> : null}
    {activeSubscription ? <p className="text-sm leading-6 text-muted-foreground">{billingOrigin === 'apple_app_store' ? '已有 Apple 訂閱；調整方案或取消續訂請使用管理訂閱。' : '已有其他來源的方案。請先到原購買來源管理，避免重複訂閱。'}</p> : null}
    <div className="grid gap-3 sm:grid-cols-2">
      {!activeSubscription && state.products.map(product => {
        const phase = product.purchaseOptions[0].pricePhases[0];
        return <div key={product.productId} className="rounded-control border border-atelier-line p-4">
          <h4 className="font-medium text-foreground">{product.displayName}</h4>
          <p className="my-2 text-lg font-semibold text-foreground">{phase.displayPrice}<span className="ml-1 text-sm font-normal">／{phase.billingPeriod === 'P1Y' ? '年' : '月'}</span></p>
          <Button className="w-full" disabled={!canBuy || busy} onClick={() => setSelectedId(product.productId)}>選擇{product.displayName}</Button>
        </div>;
      })}
    </div>
    <p className="text-sm leading-6 text-muted-foreground" role="status" aria-live="polite" aria-atomic="true">{state.message}</p>
    <div className="flex flex-wrap gap-2">
      {billingOrigin === 'apple_app_store' ? <Button variant="secondary" disabled={busy || !online || !authorized} onClick={() => void manage()}>管理訂閱</Button> : null}
      <Button variant="secondary" disabled={busy || !online || !authorized} onClick={() => void restore()}>恢復購買</Button>
      {['retry', 'pending', 'refresh_required', 'management_returned', 'blocked', 'empty', 'review'].includes(state.phase) ? <Button variant="secondary" disabled={busy || !online || !authorized} onClick={() => void retry()}>重新檢查（不會再次購買）</Button> : null}
    </div>
    <p className="text-xs leading-5 text-muted-foreground">不訂閱仍可使用免費版的市集安排、報名與繳費記錄。交易須經伺服器確認後才會更新方案。</p>
    <div className="flex flex-wrap gap-3">
      <Button variant="ghost" onClick={() => void legal(configuration.termsUrl)}>服務條款</Button>
      <Button variant="ghost" onClick={() => void legal(configuration.privacyUrl)}>隱私權政策</Button>
    </div>
    {linkError ? <p role="alert" className="text-sm text-danger">無法開啟說明，請稍後再試。</p> : null}
    <AppDialog open={Boolean(selected)} onClose={() => setSelectedId(null)} title="確認訂閱內容" presentation="sheet"
      footer={<><Button variant="secondary" onClick={() => setSelectedId(null)}>返回</Button><Button disabled={!canBuy || busy} onClick={() => {
        if (selected) { setSelectedId(null); void purchase(selected.productId); }
      }}>前往 App Store 確認</Button></>}>
      <div className="space-y-3 text-sm leading-6 text-foreground">
        <p className="font-semibold">{selected?.displayName} · {selectedPhase?.displayPrice}／{selectedPhase?.billingPeriod === 'P1Y' ? '年' : '月'}</p>
        <p>除非在續訂日前取消，方案將依 App Store 顯示的價格與週期自動續訂。可在原購買商店管理或取消。</p>
        <p>購買將綁定目前登入的{APP_BRAND.name}帳號。App Store 會再顯示最終確認畫面。</p>
        <Button variant="ghost" onClick={() => void legal(configuration.termsUrl)}>服務條款</Button>
        <Button variant="ghost" onClick={() => void legal(configuration.privacyUrl)}>隱私權政策</Button>
      </div>
    </AppDialog>
  </section>;
}
