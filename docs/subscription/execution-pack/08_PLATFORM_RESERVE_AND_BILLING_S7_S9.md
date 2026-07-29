# 08｜Platform Reserve 與 Billing：S7–S9

日期：2026-07-24  
最後更新：2026-07-29  
狀態：規劃保留

# S7｜Brand Growth Reserve Data Design

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

僅比較，不安裝 SDK。

交付：

```text
docs/subscription/BILLING_PROVIDER_DECISION.md
docs/subscription/BILLING_LIFECYCLE_STATE_MACHINE.md
docs/subscription/BILLING_TEST_MATRIX.md
```

研究 Web、iOS IAP、Android Play Billing、webhook、reconciliation、refund、trial、grace、cancel、cross-platform identity。

創始鎖價必備驗證：

- Pro / Team 公開價的 versioned catalog 與生效日；
- `pro_founder_annual_65` 在每個 storefront 的精確支援價格；
- 既有訂閱者保留價、新價 cohort 與任何價格同意通知流程；
- `cancel_at_period_end` 撤銷、payment retry、grace、full refund、chargeback、dispute 與重訂的精確事件語意；
- Web、Apple、Google 同一 owner 的價格指派與跨平台沖突處理；
- Pro → Team 立即生效、依實付 Pro 金額計算未使用價值、Team 當時價收費、不延伸 65% 優惠；
- Team → Pro 延後至 renewal boundary，連續付費時恢復 dormant Pro 鎖價；
- Team 取消且無 Pro 接續時，鎖價只在付費 entitlement 實際 lapse 後 forfeited；
- provider 能提供 exact quote 時回傳 charge、credit / refund、effective time、next renewal date、quote id 與 expiry；不支援時必須使用 provider-owned confirmation sheet，且無法確定的欄位留 `null`；
- 已採用的 dormant 商業規則如何 mapping 到 Web、Apple、Google，不得以 provider 差異改成 Team 65% 折扣或沒收鎖價。

Apple、Google 與 provider 政策必須在執行時重新查證。

# S9｜Billing Implementation

```text
NOT APPROVED
```

未完成 provider 選定、policy route、webhook 設計、schema / RLS 批准、安全審查、support / refund policy、staging tests 前，不得開始。

禁止自行安裝 Stripe、建 checkout、付款卡、trial、cancel endpoint、native purchase、webhook、subscription table 或顯示付款成功。

# Founder Annual Price F0–F4

- F0：產品政策與單位經濟，本次已完成 docs-only 方向。
- F1：純 price catalog / lock resolver，需明確批准。
- F2：owner-only 誠實呈現，需明確批准，S9 前不得顯示可交易或已取得。
- F3：server price assignment / audit ledger，未批准。
- F4：provider price cohort / checkout / reconciliation，未批准。

鎖價是固定續訂金額，不是有限期折扣到期後回到標準價的一般 coupon。任何 provider 實作都必須能與 server-owned `SubscriptionPriceAssignment` 對帳。

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
