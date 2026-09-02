# 07｜Implementation Slices：S3–S6

日期：2026-07-24  
狀態：需逐 slice 明確批准

# S3｜Feature Gate Mapping Audit

建立 feature registry，涵蓋 product cover photo、sales evidence、advanced analytics、PDF、Excel、staff、manager、collaboration readiness。

每筆必須有：

```text
feature id
product tier
current UI source
current runtime source
server enforcement
role requirement
data requirement
production status
downgrade behavior
```

不啟用 route、不改權限。

# S4｜Server Capability Read Model

前置：S0–S3 完成且使用者批准。

可能檔案：

```text
app/api/account-capabilities/route.ts
lib/subscription/account-capability-client.ts
lib/subscription/account-capability-server.ts
tests/subscription-account-capability-api.test.ts
```

必須支援 Free、Admin Pro、Admin Team、stale、unavailable、staff 讀 owner capability。

禁止 client mutation、checkout、public env plan、localStorage plan。

# S5｜Product Cover Photo Alignment

實作狀態（2026-07-29）：本機完成；`open` 維持啟用，`required` 與 production activation 尚未批准。

前置：S4 完成且照片 gates 穩定。

規則：

- open mode 誠實；
- required mode server check；
- Free / downgrade 可 view / delete retained photo；
- 不可 upload / replace；
- 不可靠 client button。

# S6A｜Single-Market Analytics Presentation Gates

Free 保留來源資料與 data completeness，不提供 basic analytics 或 basic rejoin 結果。

Pro / Team 解鎖單場 basic analytics 與 basic rejoin。

不得修改 analytics 計算語意。

# S6B｜Advanced Analytics Presentation Gates

Free 僅保留 recent-three 營收比較與數量排行；Pro / Team 解鎖 comparison、recommendations、trend、advanced recap。

不得讓 Free 執行付費查詢或先計算後隱藏。

# S6C｜Report Tier Gates

前置：PDF / Excel 功能另行批准。S6C 僅完成報告分級；PDF 於 S6D 另行批准，Excel 仍未批准。

- Free：僅期間總營收、成交筆數、納入市集與資料完整度 limited preview；
- Pro / Team：顯示 approved full report preview；
- S6C 完成時 PDF 維持 runtime disabled，交由 S6D 處理；
- manager 不自動取得；
- staff 不顯示 owner-only financial report；
- downgrade 阻擋新產生，不刪 retained report；
- 觸及權限時同步更新權限 Markdown。

# S6D｜Pro / Team PDF Enablement

- Free：不建立 paid report / PDF view model，不顯示 PDF action；
- Pro / Team：需同時通過 server-authoritative full-report 與 PDF capability；
- 角色：僅 owner 且具備 `canImportExport`、`canViewOwnerFinance`；manager / staff 不因 Team 自動取得；
- runtime：`SETTLEMENT_PDF_RUNTIME_ENABLED=true`，保留 false rollback test；
- generation：使用既有 local report truth 與 `lib/platform` file preview port，在目前裝置產生，不送出 owner 財務 payload；
- visual：五頁固定 portrait A4，需以 PDF media box 測試與逐頁 PNG 檢查驗證；
- 仍阻擋：Excel、custom download UI、server PDF generation、generated-PDF storage、billing 與 role expansion。
