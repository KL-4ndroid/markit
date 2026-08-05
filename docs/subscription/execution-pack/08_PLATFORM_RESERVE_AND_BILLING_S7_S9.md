# 08｜Platform Reserve 與 Billing：S7–S9

日期：2026-07-24

最後更新：2026-08-03

狀態：S7、S8 planning-only 已完成；S9 未核准

# S7｜Brand Growth Reserve Data Design

狀態：2026-07-29 已完成 planning-only 設計；未新增 schema、route 或 runtime。

Canonical contract：

```text
docs/subscription/STRATEGIC_GROWTH_DATA_RESERVE_DESIGN.md
tests/subscription-strategic-growth-data-reserve.test.ts
```

僅規劃：

```text
brand_profile
product_commerce_profile
market_context
collaboration_readiness_snapshot
public_partner_snapshot
benchmark_opt_in
```

原則：

- owner-private financial data 與 partner-facing data 分離；
- partner snapshot 必須 owner 明確 publish；
- benchmark 必須 opt-in；
- 不公開成本、利潤、供應商備註、staff activity、私密市場資訊；
- 不做 creator UI、marketplace、matching、chat 或公開 route。

# S8｜Billing Provider Decision Plan

狀態：2026-07-30 已完成 planning-only 決策；未安裝 SDK、建立
checkout、callback route、schema、migration 或 billing runtime。

Canonical contracts：

```text
docs/subscription/BILLING_PROVIDER_DECISION.md
docs/subscription/BILLING_LIFECYCLE_STATE_MACHINE.md
docs/subscription/BILLING_TEST_MATRIX.md
```

採用方向：

- 台灣 Web 首選為藍新信用卡定期定額，前提是 merchant onboarding、必要 API 申請、sandbox、費率、發票 / 稅務與退款流程全部通過；
- 綠界定期定額只作單一備援，不同時接入；
- Paddle 因官方貨幣清單目前無 `TWD`，不作台灣首發主方案；
- Stripe 在台灣法律主體資格未確認前不採用；
- 未來 iOS 使用 Apple IAP、Android 使用 Google Play Billing，RevenueCat 僅保留為 native store aggregation 候選；
- Capacitor、native SDK 與 store product 實作仍受 Web-first Gate 2 阻擋。

跨平台共同核心由 BoothBook server-owned billing ledger、price assignment、
plan-change quote 與 Supabase entitlement projection 組成。支付 callback 只觸發
reconciliation，不能單獨授權；client、local cache 與模擬方案都不是 billing
authority。

創始鎖價必備驗證：

- Pro / Team 公開價的 versioned catalog 與生效日；
- `pro_founder_annual_65` 在每個 storefront 的精確支援價格；
- 既有訂閱者保留價、新價 cohort 與任何價格同意通知流程；
- `cancel_at_period_end` 撤銷、payment retry、grace、full refund、chargeback、dispute 與重訂的精確事件語意；
- Web、Apple、Google 同一 owner 的價格指派與跨平台沖突處理；
- Pro → Team 立即生效、依實付 Pro 金額計算未使用價值、Team 當時價收費、不延伸 65% 優惠；
- Team → Pro 延後至 renewal boundary，連續付費時恢復 dormant Pro 鎖價；
- Team 取消且無 Pro 接續時，鎖價只在付費 entitlement 實際 lapse 後 forfeited；
- provider 能提供 exact quote 時回傳 charge、credit / refund、effective time、next renewal date、quote id 與 expiry；若台灣 provider 沒有 proration quote，只有經核准的 server-side resolver 能以 provider-confirmed transaction snapshot 產生 immutable、single-use、expiring signed quote；兩者皆無法做到時 flow 必須 `support_required`，且無法確定的欄位留 `null`；
- 已採用的 dormant 商業規則如何 mapping 到 Web、Apple、Google，不得以 provider 差異改成 Team 65% 折扣或沒收鎖價。

Founder acquisition 初始只規劃於 Web。原生商店能否取得 Founder 價，需先在
Apple / Google sandbox 證明取消、價格 cohort、plan switch 與 dormant restore；
Web Founder 未來可在原生 App 登入後使用共同 entitlement，但不得建立第二份
subscription。

Apple、Google 與 provider 政策必須在實作、staging 與送審前重新查證。

# S9｜Billing Implementation

```text
NOT APPROVED
```

S8 已完成條件式 provider 選定、policy route、callback / reconciliation 與測試
設計；但在商家 / API activation、F1 純 domain model、schema / RLS 批准、安全
審查、support / refund / tax policy、sandbox tests 前仍不得開始交易實作。

禁止自行安裝 Stripe、建 checkout、付款卡、trial、cancel endpoint、native purchase、webhook、subscription table 或顯示付款成功。

# Founder Annual Price F0–F4

- F0：產品政策與單位經濟，本次已完成 docs-only 方向。
- F1：2026-07-30 已完成純 price catalog / lock / plan-change quote resolver；所有價格仍是 candidate，resolver 不可收款或授權。
- F2：owner-only 誠實呈現，需明確批准，S9 前不得顯示可交易或已取得。
- F3：data/security 與 provider-neutral read/reconciliation contract 已完成；F3A migration `066` 與 F3B migration `067` 已在選定 sandbox 完成 external verification；這不是 Production evidence；F3C-F3E、writer、callback 與 runtime 未批准。
- F4：provider price cohort / checkout / reconciliation，未批准。

鎖價是固定續訂金額，不是有限期折扣到期後回到標準價的一般 coupon。任何 provider 實作都必須能與 server-owned `SubscriptionPriceAssignment` 對帳。

F1 canonical implementation：

```text
lib/subscription/subscription-pricing.ts
tests/subscription-pricing.test.ts
```

F1 沒有建立 assignment id、簽署 quote、保存 ledger、呼叫 provider 或授予
entitlement。F3-design 已通過 schema / RLS / idempotency threat-model 文件與純 read
contract 守門；F3A 只建立 non-billable private foundation，F2 在 billing availability
可被真實證明前仍阻擋。

F3-design canonical contracts：

```text
docs/subscription/BILLING_DATA_SECURITY_DESIGN.md
docs/subscription/BILLING_PROVIDER_ADAPTER_CONTRACT.md
lib/subscription/billing-provider-contract.ts
tests/subscription-billing-data-security-design.test.ts
supabase/migrations/066_add_subscription_price_catalog_foundation.sql
supabase/verification/066_subscription_price_foundation_read_only.sql
docs/subscription/F3A_PRICE_CATALOG_MIGRATION_RUNBOOK.md
tests/subscription-price-catalog-foundation.test.ts
supabase/migrations/067_add_billing_event_transaction_ledger.sql
supabase/verification/067_billing_event_transaction_ledger_read_only.sql
docs/subscription/F3B_BILLING_LEDGER_MIGRATION_RUNBOOK.md
tests/subscription-billing-ledger-foundation.test.ts
```

下一步是保存 F3A/F3B selected-sandbox evidence 並等待 NewebPay activation 回覆；
不得重新套用 `066`/`067`，也不是 checkout、callback、writer 或 provider mutation。

方案異動額外規則：

- 未確認的 quote 不授予 Team；
- exact quote 的 stale / expired 狀態必須重新向 provider 取得；
- provider 交易失敗時保留原 Pro entitlement 與鎖價狀態；
- webhook / store notification 重複到達不得重複折抵、退款或轉移 lock state；
- 確認畫面不得用 client clock 或本地公式顯示最終金額與日期。

# Promotion Reward P0–P5

推薦獎勵不是 billing slice 的附帶功能。P0–P5 的正式範圍與 stop conditions 只以：

```text
docs/SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md
docs/subscription/SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md
```

為準。P0 僅規劃；P1–P2 需明確批准；P3 referral ledger、P4 Pro Pass grant、P5 paid credit 均未獲批准。不得建立多層、現金、抽成、contact import 或 client-authoritative reward。
