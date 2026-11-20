import type { RecoverablePurchasePort, InAppPurchaseProduct, StorePurchaseEvidence } from '@/lib/platform/contracts/in-app-purchase';
import { prepareNativePurchaseDisclosure } from './native-purchase-disclosure';

export type ApplePurchaseContext = Readonly<{
  ownerId: string; accountToken: string; online: boolean; ownerAuthorized: boolean; capabilityFresh: boolean;
  billingOrigin: string | null; hasActiveSubscription: boolean;
}>;
export type ApplePurchaseConfiguration = Readonly<{
  enabled: boolean; productIds: readonly string[]; copyReviewed: boolean; termsUrl: string; privacyUrl: string;
}>;
export interface ApplePurchaseServerPort {
  /** Bound to the supplied owner's live session. Never retry using another account's token. */
  verify(ownerId: string, evidence: StorePurchaseEvidence): Promise<'committed' | 'review' | 'retry' | 'rejected'>;
  /** True only after a fresh authoritative read confirms paid access for this owner. */
  refresh(ownerId: string): Promise<boolean>;
}
export type ApplePurchasePhase = 'idle' | 'loading' | 'ready' | 'purchasing' | 'restoring' | 'verifying' | 'pending' | 'cancelled' | 'confirmed' | 'refresh_required' | 'management_returned' | 'retry' | 'review' | 'blocked' | 'empty';
export type ApplePurchaseState = Readonly<{ phase: ApplePurchasePhase; products: readonly InAppPurchaseProduct[]; message: string }>;
const messages: Record<ApplePurchasePhase, string> = {
  idle: '', loading: '正在讀取 App Store 方案…', ready: '價格與續訂週期依 App Store 顯示。', purchasing: '請在 App Store 確認購買，請勿重複操作。',
  restoring: '正在檢查原有購買…', verifying: '正在確認交易與帳號，請勿再次購買。', pending: '購買仍待商店確認；返回 App 時會再次檢查。請勿再次購買。',
  cancelled: '已取消此次操作，未建立新的訂閱。', confirmed: '交易已確認，方案資料已更新。', refresh_required: '交易已保存，方案尚待更新。請重新檢查，無須再次購買。',
  retry: '尚未確認完成，請重新檢查。這不會再次購買。', review: '這筆購買需要進一步確認，請勿再次購買；可聯絡客服協助。',
  blocked: '目前無法購買，請確認網路、登入帳號與方案狀態。', empty: '這個 Apple 帳號沒有可恢復的訂閱。',
  management_returned: '已返回 App。若剛調整訂閱，可重新檢查方案狀態。',
};

/** One session per mounted account; StoreKit unfinished is the durable receipt queue. */
export function createApplePurchaseSession(deps: {
  port: RecoverablePurchasePort; server: ApplePurchaseServerPort; configuration: ApplePurchaseConfiguration;
  context(): ApplePurchaseContext | null; changed(state: ApplePurchaseState): void;
}) {
  let state: ApplePurchaseState = { phase: 'idle', products: [], message: '' };
  let busy = false; let disposed = false; let committed = false; let waitingForApproval = false; let purchaseUncertain = false;
  let recoveryQueued = false; let retryOperation: () => Promise<void> = async () => {};
  const initialOwner = deps.context()?.ownerId;
  const current = (owner: string) => !disposed && owner === initialOwner && deps.context()?.ownerId === owner;
  const publish = (phase: ApplePurchasePhase, owner: string) => {
    if (current(owner)) { state = { ...state, phase, message: messages[phase] }; deps.changed(state); }
  };
  function context() {
    const value = deps.context();
    return value && current(value.ownerId) && value.online && value.ownerAuthorized && value.capabilityFresh && value.accountToken && deps.configuration.enabled ? value : null;
  }
  async function exclusive(work: (ctx: ApplePurchaseContext) => Promise<void>) {
    if (busy || disposed) return;
    const ctx = context();
    if (!ctx) { if (initialOwner) publish('blocked', initialOwner); return; }
    busy = true;
    try { await work(ctx); } catch { publish('retry', ctx.ownerId); } finally {
      busy = false;
      if (recoveryQueued && !disposed) { recoveryQueued = false; void retryOperation(); }
    }
  }
  async function verify(values: readonly StorePurchaseEvidence[], ctx: ApplePurchaseContext) {
    publish('verifying', ctx.ownerId);
    let unfinished = false;
    for (const value of values) {
      if (!current(ctx.ownerId)) return;
      if (!context()) { publish('retry', ctx.ownerId); return; }
      const result = await deps.server.verify(ctx.ownerId, value);
      if (!current(ctx.ownerId)) return;
      if (!context()) { publish('retry', ctx.ownerId); return; }
      if (result !== 'committed') { publish(result === 'review' || result === 'rejected' ? 'review' : 'retry', ctx.ownerId); return; }
      committed = true;
      const finished = await deps.port.finish(value, { opaqueAccountToken: ctx.accountToken });
      unfinished ||= !finished.ok;
    }
    if (!current(ctx.ownerId)) return;
    const refreshed = await deps.server.refresh(ctx.ownerId);
    publish(unfinished ? 'retry' : refreshed ? 'confirmed' : 'refresh_required', ctx.ownerId);
  }
  async function recover(ctx: ApplePurchaseContext, interactive: boolean): Promise<boolean> {
    const binding = { opaqueAccountToken: ctx.accountToken };
    const result = interactive ? await deps.port.restore({ accountBinding: binding }) : await deps.port.recover(binding);
    if (!current(ctx.ownerId)) return true;
    if (!result.ok) {
      if (result.error.code === 'purchase_pending') waitingForApproval = true;
      publish(result.error.code === 'invalid_account_binding' ? 'review' : result.error.code === 'purchase_pending' ? 'pending' : 'retry', ctx.ownerId); return true;
    }
    if (result.value.length) { await verify(result.value, ctx); return true; }
    return false;
  }
  const operations = {
    getState: () => state,
    dispose() { disposed = true; state = { phase: 'idle', products: [], message: '' }; },
    initialize: () => exclusive(async ctx => {
      publish('loading', ctx.ownerId);
      if (await recover(ctx, false)) return;
      const availability = await deps.port.getAvailability();
      if (!availability.available || availability.store !== 'apple_app_store') { publish('blocked', ctx.ownerId); return; }
      const result = await deps.port.listProducts(deps.configuration.productIds);
      if (!current(ctx.ownerId)) return;
      if (!result.ok || result.value.length !== 4) { publish('retry', ctx.ownerId); return; }
      state = { ...state, products: result.value }; publish('ready', ctx.ownerId);
    }),
    purchase: (productId: string) => exclusive(async ctx => {
      if (!['ready', 'cancelled', 'empty'].includes(state.phase)) return;
      if (ctx.hasActiveSubscription || committed) { publish('blocked', ctx.ownerId); return; }
      const product = state.products.find(item => item.productId === productId); const option = product?.purchaseOptions[0];
      if (!product || !option) { publish('blocked', ctx.ownerId); return; }
      const disclosure = prepareNativePurchaseDisclosure({ authenticated: true, ownerAuthorized: ctx.ownerAuthorized, accountBindingReady: true,
        verificationRuntimeAvailable: deps.configuration.enabled, productCopyReviewed: deps.configuration.copyReviewed,
        billingCopyReviewed: deps.configuration.copyReviewed, freePlanAvailable: true, subscriptionManagementAvailable: true,
        termsUrl: deps.configuration.termsUrl, privacyUrl: deps.configuration.privacyUrl, product, option });
      if (!disclosure.ready) { publish('blocked', ctx.ownerId); return; }
      publish('purchasing', ctx.ownerId);
      if (await recover(ctx, false) || !current(ctx.ownerId)) return;
      if (!context()) { publish('retry', ctx.ownerId); return; }
      purchaseUncertain = true;
      const result = await deps.port.purchase({ productId, purchaseOptionId: option.purchaseOptionId, accountBinding: { opaqueAccountToken: ctx.accountToken } });
      if (!current(ctx.ownerId)) return;
      if (!result.ok) { waitingForApproval = result.error.code === 'purchase_pending'; if (result.error.code === 'user_cancelled') purchaseUncertain = false; publish(result.error.code === 'user_cancelled' ? 'cancelled' : waitingForApproval ? 'pending' : 'retry', ctx.ownerId); return; }
      await verify([result.value], ctx);
    }),
    restore: () => exclusive(async ctx => { publish('restoring', ctx.ownerId); if (!await recover(ctx, true)) publish('empty', ctx.ownerId); }),
    retry: () => {
      if (busy) { recoveryQueued = true; return Promise.resolve(); }
      return exclusive(async ctx => {
      const shouldRefresh = committed || state.phase === 'management_returned';
      publish('verifying', ctx.ownerId);
      if (!await recover(ctx, false)) {
        if (shouldRefresh) publish(await deps.server.refresh(ctx.ownerId) ? 'confirmed' : 'refresh_required', ctx.ownerId);
        else if (waitingForApproval || purchaseUncertain) publish('pending', ctx.ownerId);
        else {
          const result = await deps.port.listProducts(deps.configuration.productIds);
          if (result.ok && result.value.length === 4) { state = { ...state, products: result.value }; publish('ready', ctx.ownerId); }
          else publish('retry', ctx.ownerId);
        }
      }
      });
    },
    manage: () => exclusive(async ctx => {
      if (ctx.billingOrigin !== 'apple_app_store' && !committed) { publish('blocked', ctx.ownerId); return; }
      const result = await deps.port.openSubscriptionManagement();
      if (!result.ok) publish('retry', ctx.ownerId);
      else publish('management_returned', ctx.ownerId);
    }),
  };
  retryOperation = operations.retry;
  return operations;
}
