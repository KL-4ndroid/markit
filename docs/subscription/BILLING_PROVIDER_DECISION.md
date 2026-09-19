# Billing Provider Decision

日期：2026-08-06

狀態：S8 planning-only complete

適用範圍：Féria native-first 訂閱收費與延後的 Web 收費路線

## 1. 決策摘要

本文件只凍結供應商方向、責任邊界與上架閘門，不代表已核准收款實作。

1. 第一批付費 acquisition 使用 Apple In-App Purchase 與 Google Play Billing。
2. 已驗證的訂閱綁定 Supabase owner UUID 對應的 Féria 帳號，不綁裝置；同一帳號的方案可在 iOS、Android 與 Web 使用。
3. 原始商店仍負責續訂、取消、退款與爭議；Féria server-owned entitlement projection 負責跨平台功能授權。
4. Web checkout 延後。未來 Web 台灣定期定額選擇 `ECPay recurring payment`（綠界），目前狀態是 `deferred_web_phase`，不是 native launch blocker。
5. NewebPay 不再是選定供應商，狀態為 `not_selected`；不繼續 activation、SDK 或 callback 工作。
6. 原生購買聚合可再評估 RevenueCat，但目前不安裝；它不能取代原始 store evidence 或 trusted Supabase owner binding。
7. Paddle 不作為台灣首發主方案，因為官方支援貨幣清單目前沒有 `TWD`。它只保留為未來國際 SaaS、使用支援貨幣時的 Merchant of Record 候選。
8. Stripe 不作為僅有台灣法律主體時的預設，因為 Stripe 官方全球可用地區目前未列出台灣。只有在可合法使用的支援地區主體與帳號完成驗證後才能重評估。
9. 客戶端、localStorage、IndexedDB、模擬訂閱身分、purchase success callback 和裝置狀態都不能授予付費權限。

這是發行方向，不是已可上線的金流。Apple、Google 與延後的 ECPay 各自需要獨立 adapter、sandbox、法律、支援與 canary evidence；任何供應商不得自動替代另一個 origin。

## 2. 為什麼不是單一跨平台供應商

Féria 的首發客群是台灣市集品牌。Apple StoreKit、Google Play Billing 與未來 ECPay 是三個不同交易來源；把它們強行視為同一 checkout 會傷害商店政策合規、退款責任與 Founder 鎖價可稽核性。

因此採用以下分工：

| 層級 | 責任 | 初始決策 |
| --- | --- | --- |
| Native payment origin | 原生 App 的數位功能購買 | Apple IAP / Google Play Billing，第一優先 |
| Web payment origin | 台幣信用卡收款、續扣、退款與交易查詢 | ECPay，延後且通過 activation gates 後才生效 |
| Shared billing domain | price version、Founder assignment、continuity、quote、plan change、idempotency | Féria server-owned shared core |
| Entitlement projection | 將已驗證交易映射為 Free / Pro / Team capability | Supabase authoritative projection |
| Client cache | 顯示最近一次 server 結果 | 僅快取；過期或不明時付費寫入 fail closed |

支付 API 是 server integration，不應混入共享 React 元件。未來的原生 purchase capability 才需要經 `lib/platform` port 暴露；價格與資格規則仍留在 platform-neutral shared core。

## 3. 供應商比較

| 選項 | TWD 定期收款 | 方案異動 | 稅務角色 | 跨原生商店 | 結論 |
| --- | --- | --- | --- | --- | --- |
| NewebPay | 是 | 官方定期定額文件包含暫停、終止，以及申請制的金額與週期異動 | 商家仍須自行處理營業、稅務與發票責任 | 否 | 不選用；保留歷史決策證據 |
| ECPay | 是 | 官方公開 API 支援補授權與取消；更複雜異動需實測或重建委託 | 商家自行負責 | 否 | 延後的單一 Web provider |
| Paddle Billing | 官方清單目前無 TWD | 有內建 proration modes | Merchant of Record | 可與 RevenueCat 整合，但不是原生商店替代 | 不適合台灣 TWD 首發；保留國際化候選 |
| RevenueCat Billing / Stripe Billing | 依 Stripe 帳號與地區資格 | 成熟的 subscription / proration | 通常不是台灣本地主體的 MoR 解法 | RevenueCat 可聚合 entitlement | 台灣主體資格未確認前不採用 |
| Apple / Google stores | 使用商店支援價格點 | 依各商店規則 | 商店交易規則適用 | 各自只負責其 storefront | 第一批付費 acquisition 路線 |
| 自建卡號扣款 | 不適用 | 可完全客製 | 全部責任自負 | 否 | 拒絕；不持有卡號、不自建 PCI 收單 |

重要限制：Paddle 的 Acceptable Use Policy 禁止讓非 Paddle sellers 在產品內銷售的 digital marketplace。BoothBook 現階段販售的是自己的 SaaS 訂閱，仍屬可評估範圍；未來品牌媒合、帶貨抽成或 marketplace 收費必須與 SaaS billing 分離並重新做供應商與法規審查。

## 4. 延後的 Web ECPay 啟用條件

ECPay 目前是 `deferred_web_phase`。以下全部完成前不得改成
`selected_pending_activation` 或 production-ready：

- Féria 的實際收款主體完成綠界商務帳戶、商店與網域審核；
- 書面確認可販售本專案的 B2B / prosumer SaaS 訂閱；
- 開通信用卡定期定額、交易查詢、取消 / 退款與每期通知；
- 申請並確認定期定額、補授權、取消、退款、交易查詢與通知所需權限；
- 確認月繳、年繳、最大期數、首期扣款與卡片更新規則能支援預期續訂年限；
- 在 sandbox 驗證每個 callback 欄位、驗證碼 / 加密規則、重送行為、timeout 與正式 endpoint；
- 取得正式費率、請退款費用、撥款週期、reserve、爭議款與 chargeback 規則；
- 由會計或稅務顧問確認電子發票、營業稅、收入認列、退款與對帳流程；
- 確認隱私權政策、服務條款、退款政策、付款人同意與取消方式；
- 完成 `BILLING_TEST_MATRIX.md` 的 Web P0 launch gates。

此清單不阻擋 native launch。Web 工作流重新啟動時，再依當時官方文件和商務核准重新驗證，不得直接沿用舊假設。

## 5. Source Of Truth 與身分

### 5.1 穩定身分

- Billing customer 的內部主鍵使用 Supabase owner UUID，不使用 email、裝置 ID 或 staff ID。
- 一個 owner workspace 同一時間只能有一個 active paid billing origin。
- Staff 與 manager 不擁有訂閱、不建立 checkout、不取消、不升降級。
- 帳號 email 變更不改變 billing identity。
- owner transfer 在正式支援前必須阻擋或經 support migration，不可直接把歷史付款綁到新 owner。

### 5.2 權威順序

1. 原始交易來源的查詢結果或 signed server notification。
2. BoothBook durable billing event inbox 與 transaction ledger。
3. BoothBook subscription / price-assignment projection。
4. server-issued account capabilities。
5. client cache。

Notification 是觸發 reconciliation 的訊號，不是單憑一個 callback 欄位就授權。付款返回頁只顯示「正在確認」，直到 server reconciliation 完成。

### 5.3 Plan source 分離

`billing`、`promotion`、`admin` 和 `free` 是不同來源。Pro Pass、測試身分或人工補償不得覆寫 provider transaction，也不能生成 Founder lock。Billing audit history 不可因改成 promotion 或 Free 而刪除。

## 6. 價格版本與 Founder 鎖價

### 6.1 Web launch catalog

以下仍是候選價格，直到商家、sandbox 與正式 checkout 全部驗證：

| Internal assignment | Candidate amount | 週期 |
| --- | ---: | --- |
| `pro_launch_monthly_twd` | NT$199 | monthly |
| `pro_launch_annual_twd` | NT$1,990 | annual |
| `pro_founder_annual_65` | NT$1,290 | annual |
| `team_launch_monthly_twd` | NT$499 | monthly |
| `team_launch_annual_twd` | NT$4,990 | annual |

- 金額以 TWD 最小單位的整數保存；TWD 不使用浮點數。
- `planCode`、`priceVersionId`、`providerPriceRef` 與 `assignedAmount` 分開保存。
- Founder 是 server 指派的固定年繳金額，不是之後依公開價重算 65%，也不是到期回原價的一般 coupon。
- 公開價調漲要建立新 `priceVersionId`，不得原地改寫既有 Founder assignment。
- Founder acquisition 是否在 Apple / Google 首發開放，需由各 store sandbox 與價格 cohort evidence 決定；不得把 Web 候選價格直接視為 store price。

### 6.2 原生 storefront

Apple 可保留既有訂閱者價格，Google 也有 legacy price cohort，但兩者對取消後重訂、base plan 變更與價格恢復的行為不完全等於 BoothBook 的 `dormant -> restore` 規則。

所以：

- 原生 Founder acquisition 在 Apple / Google sandbox 證明前保持關閉；
- 不對外承諾原生商店可取得 Founder 價；
- 任何既有 paid origin 使用者在另一平台登入時只讀取共同 entitlement，不建立第二份 store subscription；
- billing origin 變更必須是明示 migration/support flow，不能由 App 自動 cancel and rebuy；
- 同一 workspace 偵測到兩個 active paid origins 時，保留已驗證權限但凍結自助方案異動並建立人工對帳案件。

## 7. Pro -> Team 與 Team -> Pro

各商店與 ECPay 的方案異動能力不同。Féria 必須採用以下其中一種模式，不能由前端自行估算：

1. `provider_quote`：供應商回傳具期限的 exact quote。
2. `server_signed_quote`：server 先查詢 provider-confirmed 已付款交易，再以核准的純函式計算實付 Pro 未使用價值，保存不可變 quote input/output、`quoteId`、expiry、rounding rule 與 provider snapshot reference。
3. `provider_confirmation`：供應商確認頁能顯示最終金額與日期。
4. `support_required`：前三者都無法滿足時，禁止自助升級；不可顯示虛構金額。

任何 origin 的自助升級都必須先通過 F1、F3 與 provider runtime 的獨立核准；無法證明 exact quote 時只能使用 `support_required` 或商店原生方案切換流程。

Pro -> Team saga：

- quote 只根據實際已付 Pro 金額，不用目前 Pro list price；
- Team 使用當時有效的 Team price assignment，Founder 65% 不轉移；
- Team charge / replacement transaction 經 provider 確認後才授予 Team；
- unused Pro value 以 provider-confirmed credit 或 refund 結案；
- Founder lock 在連續付費 Team 期間改為 `dormant`；
- duplicate click、callback 重送或 retry 不得產生第二次 charge / refund；
- charge 成功但 credit / refund 暫時失敗時，Team 可依已付款事實生效，但必須建立不可遺失的 receivable-to-customer liability、停止再次退款並告警人工處理；使用者的未使用價值不得消失。

Team -> Pro：

- 預設於已驗證 renewal boundary 生效；
- boundary 前仍維持 Team 權限與價格；
- 連續付費未中斷時恢復 dormant Founder Pro assignment；
- Team paid entitlement 真正 lapse 且沒有 replacement 後才 forfeited；
- provider 異動失敗時維持原 Team，不得先降權。

## 8. 原生商店政策路線

- iOS / Android App 內販售數位功能時，預設使用 Apple IAP / Google Play Billing。
- 多平台使用者可以登入存取在另一商店購買的同一服務，但 App 內是否能導向外部付款受 storefront、地區與 entitlement 規則限制。
- 台灣原生 App 首版不放外部 checkout steering link；先提供登入、權限同步與商店內購買。
- 一般 Pro / Team 必須各自在原生商店提供相應產品，不能只讓其他平台買家解鎖而完全不提供 IAP。
- Store fee、grace、account hold、價格點與通知期限都是 deployment configuration / evidence，不硬編碼進 shared business rules。
- RevenueCat 僅是未來可選的 native store adapter / aggregator；即使採用，Supabase projection 仍是 protected server writes 的授權來源。

## 9. S9 允許與禁止

S8 完成後，S9 仍是 `NOT APPROVED`。

F1 純價格與鎖價 model、F3 logical data/security design、provider-neutral read contract，
以及 F3A/F3B non-billable foundations 已完成；migration 066、067 已在選定 sandbox
完成 external verification，但不是 Production evidence。
下一個批次不是 live checkout，而是：

1. 完成 account-bound entitlement core、IAP platform port 與 fake adapter tests。
2. 保存 F3A/F3B selected-sandbox evidence，不重新套用 066 或 067。
3. F3C-F3E、Apple/Google verification runtime 與 provider-specific adapters 必須逐片另行核准。
4. Store notification、writer、purchase UI 與 money/entitlement mutation 維持後續分批審查。
5. ECPay 商務申請與 Web runtime 保持延後，不阻擋 native groundwork。

本文件沒有授權：

- 安裝綠界、RevenueCat、Stripe、Paddle、StoreKit 或 Play Billing 套件；
- 建立 checkout、payment method UI、付款成功畫面或取消 endpoint；
- 以 S8 本身建立 webhook / callback route 或超出已另行審查的 F3A migration / RLS；
- 在 Phase 2 Gate 2 完成前建立 native project 或 Capacitor adapter；
- 公開 Founder offer、實際扣款或聲稱通過商店審查。

## 10. 官方查證來源

政策與供應商能力在實作、staging、上架前三個時間點都要重新查證：

- [藍新 API 文件下載](https://www.newebpay.com/website/Page/content/download_api)
- [藍新信用卡定期定額服務](https://www.newebpay.com/website/Page/content/service_creditcard)
- [綠界信用卡定期定額](https://developers.ecpay.com.tw/2868/)
- [綠界定期定額訂單作業](https://developers.ecpay.com.tw/16618/)
- [Paddle supported currencies](https://developer.paddle.com/concepts/sell/supported-currencies/)
- [Paddle acceptable use policy](https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle)
- [Stripe global availability](https://stripe.com/global)
- [RevenueCat Web overview](https://www.revenuecat.com/docs/web/overview)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple subscription pricing](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions)
- [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)
- [Google Play subscription pricing](https://support.google.com/googleplay/android-developer/answer/12154973)
