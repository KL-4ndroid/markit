# 06｜Implementation Slices：S0–S2

日期：2026-07-24  
最後更新：2026-07-28  
狀態：第一階段允許執行  
每個 slice 單獨 commit。

# S0A｜訂閱現況稽核

## 目標

找出 hardcoded、分散與不誠實的訂閱呈現及 gate。

## 只做

- 搜尋 hardcoded currentPlan；
- 搜尋 free / pro / team UI 判斷；
- 搜尋 fake renewal、payment card、cancel、upgrade success；
- 搜尋 localStorage / public env / query string 授權；
- 搜尋照片、報表、staff、analytics gate；
- 建立 audit 文件。

## 產物

```text
docs/subscription/SUBSCRIPTION_CURRENT_STATE_AUDIT.md
docs/subscription/SUBSCRIPTION_FEATURE_GATE_REGISTRY.md
```

## 不做

不改 runtime、API、RLS、role、upload、export。

## Acceptance

每個 paid-looking feature 都列 feature id、UI source、runtime source、server enforcement、status、risk。

## Commit

```text
docs: audit subscription presentation and feature gates
```

# S0B｜靜態守衛與測試

## 目標

阻止假付費狀態。

## 建議檔案

```text
tests/subscription-capability-presentation.test.ts
lib/subscription/subscription-presentation.ts
```

## 測試

- 無 authoritative source 不可顯示 active Pro / Team；
- staff 不顯示 billing；
- 無 provider 不顯示付款卡、續訂、取消成功；
- coming soon 不可變 available；
- Growth Reserve 不可顯示可購買。

## Commit

```text
test: add truthful subscription presentation guardrails
```

# S1A｜Pure Plan Definitions

## 檔案

```text
lib/subscription/subscription-plans.ts
tests/subscription-plan-model.test.ts
```

## Acceptance

- Plan code 僅 free / pro / team；
- Free 無 photo upload；
- Pro 有 product cover photo model capability；
- Team 有 staff collaboration 與 sales evidence model capability；
- 無 browser dependency；
- 不接 billing。

## Commit

```text
feat: add pure subscription plan definitions
```

# S1B｜Capabilities 與 Access Resolver

## 檔案

```text
lib/subscription/subscription-capabilities.ts
lib/subscription/subscription-access.ts
tests/subscription-feature-gates.test.ts
```

## Acceptance

- billingStatus 與 entitlementStatus 分離；
- capabilityEvaluatedAt、capabilityRefreshAfter、entitlementEndsAt 分離；
- trusted timestamps 算出的 stale paid capability 在 approved offline lease 結束後 fail closed；
- planSource 支援 model-only 的 `promotion`，但不授權 reward grant；
- role forbidden 優先於 upgrade prompt；
- 不新增 API、Supabase、localStorage。

## Commit

```text
feat: add subscription capability and access domain model
```

# S2A｜Shared Presentation Model

## 檔案

```text
lib/subscription/subscription-presentation.ts
components/subscription/PricingCard.tsx
components/subscription/UpgradePrompt.tsx
components/subscription/FeatureLimitDialog.tsx
```

## 規則

- current、preview、available、coming soon 分開；
- blocked reason 不一律顯示升級；
- staff 不顯示 billing action；
- 無 fake payment 或 active plan。

## Commit

```text
refactor: centralize subscription presentation model
```

# S2B｜替換 Hardcoded UI

## 可能檔案

```text
components/TopNavigation.tsx
components/settings/AccountSyncPanel.tsx
app/subscription/page.tsx
```

## Acceptance

- 不改 actual enforcement；
- billing unavailable 時只能顯示說明、coming soon 或等待名單；
- build / tests 通過；
- 若觸及角色顯示邏輯，更新權限 Markdown。

## Commit

```text
refactor: align account and pricing UI with subscription truth
```
