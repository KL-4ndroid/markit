# 01｜訂閱產品決策與待確認事項

日期：2026-07-24  
最後更新：2026-07-29  
狀態：產品決策基準  
重要：本文件中的「建議預設值」尚不等於正式商業批准。涉及價格、公開限制或付費上線時，仍需使用者明確確認。

## 1. 產品定位

目前產品類別：

```text
market-brand operating system
```

長期方向：

```text
small-brand commerce network
```

發展順序：

1. 幫助小品牌記錄市集營運。
2. 幫助品牌理解下一步。
3. 幫助小團隊安全協作。
4. 幫助品牌建立可信營運證據。
5. 有足夠 opt-in 資料後，才考慮 benchmark 與合作媒合。

## 2. 正式 runtime 方案

第一階段只保留：

```ts
type AccountPlanCode = 'free' | 'pro' | 'team';
```

Growth Reserve 改為策略能力：

```ts
type StrategicCapabilityCode =
  | 'collaboration_readiness'
  | 'public_partner_snapshot'
  | 'anonymous_benchmark';
```

原因：

- 尚未確定是方案、加購、邀請制或平台抽成；
- 避免 UI、測試與 entitlement resolver 過早承擔不存在的方案；
- 避免 AI 誤實作 marketplace。

## 3. 對外方案名稱

| runtime code | 對外名稱 | 產品承諾 |
|---|---|---|
| `free` | Free｜開始記錄 | 完成真實市集記錄 |
| `pro` | Pro｜看懂下一步 | 做出更好的市集與商品決策 |
| `team` | Team｜一起經營 | 多人協作但不失去控制 |

不得同時混用 Solo、Studio、Pro、Team 多套名稱。

## 4. 建議價格

以下尚未批准收費：

| 方案 | 月繳建議 | 年繳建議 |
|---|---:|---:|
| Free | NT$0 | — |
| Pro | NT$199 | NT$1,990 |
| Team | NT$499 | NT$4,990 |

已採用的產品方向（尚未批准實際收費）：

| 優惠 | 候選金額 | 核心條件 |
|---|---:|---|
| Pro 創始年繳鎖價 | NT$1,290 / 年 | 合格 Pro 試用期內完成年繳，付費關係不中斷即保留固定續訂金額 |

`NT$1,290` 是目前 `NT$1,990` 年繳公開價約 65% 的實用價格點。付費上線前必須依各 storefront 支援價格完成最後批准。

這等於每月毛收入 `NT$107.50`，比 `NT$1,990` 公開年繳價低約 35%，也比 `NT$199 x 12` 低約 46%。因此只能作為受控創始 cohort，不能成為每個未來 trial 的常態年繳價。候選開放範圍為 billing 上線後 90 天或前 300 個合格 owner workspace，以先到者為準，最終數字仍待批准。

鎖價原則：

- internal offer code 為 `pro_founder_annual_65`；
- 65% 只用於決定首次實際指派價，續訂不重新套用未來公開價；
- `cancel_at_period_end` 到期前保留權限與鎖價，只有期末實際中斷後才失效；
- 合法 payment retry / grace 不沒收鎖價，超過 grace 仍未恢復才 forfeited；
- 鎖價失效後重訂，依當時公開價；
- 已採用的規則是 Team 升級期間使 Pro 鎖價 dormant，連續付費不中斷時可恢復；S8 仍必須驗證各 provider 的精確金額、折抵、退款與續訂日行為；
- 價格不與其他百分比折扣、paid credit 或 checkout promotion 自動疊加；
- 這是有條件的「連續訂閱鎖價」，不對外稱「終身價」。

Pro 與 Team 未來調漲採 `priceVersionId` 新價格世代，預設先適用於新購買。不得用 UI 或設定檔靜默改寫既有價格指派。

內部候選價格世代：

| 價格世代 | Pro 月繳 / 年繳 | Team 月繳 / 年繳 | 啟用條件 |
|---|---:|---:|---|
| Launch | NT$199 / NT$1,990 | NT$499 / NT$4,990 | 第一版正式付費驗證 |
| V2 | NT$249 / NT$2,490 | NT$649 / NT$6,490 | 進階分析、報表、商品照片穩定，且已量測 support / storage cost |
| V3 | NT$299 / NT$2,990 | NT$799 / NT$7,990 | Team 協作、sales evidence、audit 與 retention 已經商業驗證 |

V2 / V3 只是內部候選，不是已排程漲價。每次啟用新價格世代都需獨立商業批准。

第一版不做額外座位費、儲存包、PDF 包或 Analytics add-on。

## 5. Pro 升級 Team 規則

- billing provider 確認升級交易後，Team entitlement 立即生效；
- Pro 未使用價值依「實際付款金額」折抵或退回，創始年繳者以 `NT$1,290` 為基礎，不得以 `NT$1,990` 公開價計算；
- Team 使用升級當時的 Team `priceVersionId`，Pro 65% 創始優惠不延伸至 Team；
- 創始 Pro 鎖價在 Team 連續付費期間轉為 `dormant`；
- Team 降回 Pro 預設於下次續訂邊界生效，付費未中斷時恢復 dormant Pro 鎖價；
- Team 取消且沒有安排 Pro 接續時，到期實際中斷後才 forfeited；
- monthly 轉 annual 可在 provider 確認折抵後立即生效；annual 轉 monthly 預設延後到續訂邊界；
- Feria UI 或 provider-owned confirmation sheet 必須顯示 provider 有提供的精確 charge、credit / refund、effective time 與 next renewal date；若 provider 無法在購買前提供 exact proration quote，Feria 不得在 client 自行估算最終金額。

## 6. Free 限制建議

建議使用 active products，不使用總商品數：

| 能力 | 建議 |
|---|---|
| Active products | 15 作為測試假設；beta 可先不 enforce |
| 歷史商品 | 保留，不刪除 |
| 歷史市集 | 保留可讀 |
| Staff seats | 0 |
| Product photo upload | 0 entitlement |
| Sales evidence upload | 0 entitlement |
| PDF / Excel | 不可用 |
| Basic single-market analytics and review | 不可用；僅保留資料完整度指引 |
| Advanced analytics | 不可用或有限預覽 |

15 是定價實驗；未取得 beta 商品數分布與正式批准前，不得成為 production enforcement。

## 7. Pro 與 Team 邊界

### Pro

- 僅 owner 使用；
- 不包含正式 staff account；
- 可包含單場基本分析與復盤、進階分析、商品照片、報表；
- 不建立 staff relationship。

### Team

- 承擔 staff / manager workflow；
- 包含角色安全、邀請、撤銷、稽核、同步；
- 可包含 sales photo evidence；
- 不代表所有 staff 都可看財務。

## 8. 待確認事項

1. Free active products 最終數字。
2. Free 市集是否需要公開限制。
3. Pro 商品照片儲存額度。
4. Team 預設 staff seats。
5. sales photo evidence 是否 Team-only。
6. PDF / Excel 每月限制。
7. past due grace period 天數。
8. manager 是否能下載報表。
9. Growth Reserve 最終商業模式。
10. billing provider 與 native store 路線。
11. 創始鎖價開放截止日、owner 上限或兩者並用。
12. 各 storefront 對應 65% 政策的精確支援價格。
13. 哪些 Pro 試用來源可取得鎖價；建議包含 server-marked standard trial 與合格 Pro Pass，但不疊加折扣。
14. 各 provider 對立即 Team 升級、實付 Pro 剩餘價值、續訂日與 dormant 鎖價恢復的精確 mapping。
15. V2 / V3 價格世代的精確啟用指標。

## 9. 初期推薦獎勵決策

採「品牌同行 Pro Pass」：

- 第一版為 pre-billing / controlled-beta 的 Free owner 推廣，billing 上線前需暫停或另行批准 paid-owner reward；
- 直接一層、雙邊、里程碑式；
- 被推薦品牌完成第一場真實市集並記錄成交或手動總額後，雙方各得一次 30 天 Pro Pass；
- Pass 在候選 90 天內由 owner 自行啟用；
- Pass 只授予 Pro，不授予 Team、staff 或 sales evidence；
- 不因註冊發獎勵；
- 不發現金、不轉讓、不做下線或第二層獎勵；
- 候選上限為每位 owner 滾動 12 個月六次，仍待 beta 驗證；
- attribution、qualification、reward ledger 與 grant 未經獨立 slice 批准不得實作。

遇到 open decision 時，AI 必須標記 `BLOCKED_PRODUCT_DECISION`，不得自行寫死 production 規則。
