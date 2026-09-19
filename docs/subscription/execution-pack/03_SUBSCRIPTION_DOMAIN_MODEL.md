# 03｜訂閱 Domain Model 與 Entitlement 規則

日期：2026-07-24  
最後更新：2026-07-29  
狀態：共享 domain model 規格

## 1. Runtime Plan Code

```ts
export type AccountPlanCode = 'free' | 'pro' | 'team';
```

## 2. 方案來源

```ts
export type AccountPlanSource = 'free' | 'admin' | 'promotion' | 'billing';
```

browser storage 與 public env 不得成為方案來源。

## 3. Billing 與 Entitlement 分離

```ts
export type BillingStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancel_at_period_end'
  | 'cancelled'
  | 'refunded'
  | 'disputed'
  | 'unknown';

export type EntitlementStatus =
  | 'active'
  | 'grace'
  | 'inactive'
  | 'unknown';
```

功能 gate 主要看 entitlementStatus。

## 4. Capability 新鮮度

新鮮度由 server-issued timestamps 計算，不儲存或信任 client-supplied `fresh` flag。

```ts
export type AccountCapabilities = {
  ownerId: string | null;
  planCode: AccountPlanCode;
  planSource: AccountPlanSource;
  billingStatus: BillingStatus;
  entitlementStatus: EntitlementStatus;
  capabilityEvaluatedAt: string | null;
  capabilityRefreshAfter: string | null;
  entitlementEndsAt: string | null;
  limits: {
    activeProductLimit: number | null;
    staffSeatLimit: number;
    productPhotoStorageBytes: number;
    salesEvidenceStorageBytes: number;
    monthlyPdfExportLimit: number | null;
    monthlyExcelExportLimit: number | null;
  };
  features: {
    productCoverPhoto: boolean;
    salesPhotoEvidence: boolean;
    basicAnalytics: boolean;
    advancedAnalytics: boolean;
    settlementReportPreview: boolean;
    settlementPdf: boolean;
    excelExport: boolean;
    staffCollaboration: boolean;
    managerWorkflow: boolean;
  };
};
```

Growth strategic capabilities and owner consent are separate models. `anonymousBenchmarkOptIn` is consent, not subscription entitlement.

## 5. Price Version 與鎖價指派

```ts
export type BillingInterval = 'month' | 'year';
export type PaidPlanCode = Exclude<AccountPlanCode, 'free'>;

export type PlanPriceVersion = {
  id: string;
  planCode: PaidPlanCode;
  billingInterval: BillingInterval;
  currency: string;
  amountMinor: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
};

export type PriceLockStatus = 'active' | 'grace' | 'dormant' | 'forfeited';

export type SubscriptionPriceAssignment = {
  ownerId: string;
  planCode: PaidPlanCode;
  billingInterval: BillingInterval;
  currency: string;
  amountMinor: number;
  pricePolicy: 'standard' | 'founder_locked';
  offerCode: 'pro_founder_annual_65' | null;
  listPriceVersionIdAtAcquisition: string;
  billedPriceVersionId: string;
  acquiredAt: string;
  continuousPaidSince: string;
  lockStatus: PriceLockStatus | null;
  forfeitedAt: string | null;
  forfeitedReason:
    | 'effective_cancellation'
    | 'lapse_after_grace'
    | 'full_refund'
    | 'chargeback'
    | 'dispute'
    | 'abuse'
    | null;
};

export type PlanChangePriceQuote = {
  ownerId: string;
  fromPlanCode: PaidPlanCode;
  toPlanCode: PaidPlanCode;
  fromPriceVersionId: string;
  toPriceVersionId: string;
  currency: string;
  quoteMode: 'exact' | 'provider_confirmation';
  unusedActualPaidValueMinor: number | null;
  providerCreditOrRefundMinor: number | null;
  providerChargeMinor: number | null;
  netDueMinor: number | null;
  effectiveAt: string | null;
  nextRenewalAt: string | null;
  timing: 'immediate' | 'renewal_boundary';
  founderLockTransition: 'unchanged' | 'to_dormant' | 'restore_active' | 'forfeit';
  providerQuoteId: string | null;
  quoteExpiresAt: string | null;
};
```

規則：

- `planCode` 管能力，`priceVersionId` 與 `SubscriptionPriceAssignment` 管商業價格；
- 續訂使用已指派的固定 `amountMinor`，不得以新公開價重算 65%；
- `cancel_at_period_end` 不等於已 forfeited，實際 entitlement lapse 才觸發；
- payment retry / grace 期內保留鎖價；
- `dormant` 用於付費不中斷的 Team 升級，S8 負責將已採用的產品規則 mapping 到各 provider；
- Pro 升 Team 使用當時 Team price version，不得延伸 Pro 65% 折扣；
- Pro 剩餘價值以實際付款金額為基礎，不以公開價補足；
- Pro 升 Team 在 provider 確認後立即生效；Team 降 Pro 預設在 renewal boundary 生效；
- quote 只是讀取模型；provider 無 exact pre-purchase quote 時使用 `provider_confirmation` 並將無法取得的金額或日期留 `null`，未確認交易不得授予 Team 或改變 lock state；
- 價格指派、異動與 forfeiture 必須 server-authoritative、idempotent 且可稽核；
- localStorage、query string、client clock 與 referral code 不得授予或恢復鎖價。

## 6. Pure Resolvers

應建立：

```ts
resolveCapabilityFreshness(capabilities, now)
resolvePreBillingCapabilities(input)
evaluateCapabilityAccess(input)
resolvePriceVersion(catalog, planCode, billingInterval, currency, at)
evaluateFounderOfferEligibility(input)
resolveFounderPriceLockTransition(input)
resolvePlanChangePolicy(input)
validateProviderPlanChangeQuote(input)
```

Access decision：

```ts
export type CapabilityAccessDecision = {
  allowed: boolean;
  reason:
    | 'allowed'
    | 'plan_required'
    | 'role_forbidden'
    | 'stale_capability'
    | 'capability_unavailable'
    | 'runtime_disabled'
    | 'data_insufficient'
    | 'offline_lease_expired'
    | 'promotion_ineligible'
    | 'promotion_reward_expired';
  requiredPlan?: AccountPlanCode;
};
```

## 7. Fail-Closed

paid-only write 在以下情況禁止：

- entitlementStatus 非 active / grace；
- trusted timestamps resolve to stale / unavailable after any approved offline lease ends；
- owner capability 缺失；
- role permission 不允許；
- runtime route disabled；
- server 無法驗證；
- request ownerId 不一致。

Team 正式 enforcement 前必須定義 offline entitlement lease，避免暫時斷網讓已授權的市場日流程無預警中斷。Promotion Pro Pass 使用 `planSource='promotion'` 與真實 `entitlementEndsAt`，但本 domain model 不授權任何 reward grant。

## 8. Read / Write 分離

降級後通常：

| 行為 | 結果 |
|---|---|
| 查看既有照片 | 允許 |
| 新增照片 | 阻擋 |
| 替換照片 | 阻擋 |
| 刪除照片 | 允許 |
| 新產生 PDF | 阻擋 |

## 9. 建議檔案

```text
lib/subscription/subscription-plans.ts
lib/subscription/subscription-capabilities.ts
lib/subscription/subscription-access.ts
lib/subscription/subscription-presentation.ts
lib/subscription/subscription-pricing.ts
```

純 domain model 不得 import React、Next router、Supabase、Dexie、localStorage、window 或 platform-specific API。
