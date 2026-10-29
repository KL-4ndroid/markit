# 獨立報告頁實作進度：共用判讀與閱讀改善

## Git 交付範圍

使用者於 2026-10-29 要求 commit／push。本次交付包含獨立報告閱讀、共用判讀、成本與零值核對、094、測試及相關文件；Demo／素材不納入。下方「未 commit／push」是驗收當時的歷史狀態，實際提交以 Git 紀錄為準。提交不代表 Vercel 部署已驗收，也不更改線上新旗標；核對功能目前仍僅本機啟用。

## 最新：094 接通與核心保存複驗完成

使用者確認 094 完成後，已只在 `.env.local` 啟用新旗標。真實 UI 完成成本 0／更正／撤回、固定費零值／零收入確認／撤回、重新載入與返回報告；原收入、成交與照片任務不變。修正零收入確認後每日表現仍顯示空紀錄的矛盾，新分類只存在可信 overlay。報告與實際下載的五頁 PDF 相符，十月收入仍 6,142，已確認小計由 2 場 570 變為 4 場 591；全期仍待確認。

獨立雲端登入已讀回保存狀態，員工 read／save 與匿名呼叫皆被拒絕；未使用 service key、未改角色或瀏覽器 session。詳見[本批完整證據與剩餘限制](SETTLEMENT_REPORT_FINANCIAL_REVIEWS_2026_10_29.md)。自動 PDF 預覽被工具安全政策阻擋，另列未驗；跨實際裝置、未知送達的 UI 重試與全部角色仍需整合驗收。Vercel 新旗標未啟用，未 commit／push／部署，沒有新的 SQL 需要使用者執行。

本輪最後修正後重新通過：8 個針對性測試檔（financial-reviews、financial-record-quality、daily-revenue-totals、settlement-report-reading／reader／navigation、clear-user-data、settlement-report-subscription-access）、10 組隔離 SQL、mobile TypeScript、修改檔 ESLint、Web production build、mobile static build 與 35 項 segment aliases。日誌 `.codex-artifacts/financial-review-live-*.log`；真實 RPC 結果為 `financial-reviews-live-acceptance.log`。這是本輪實際重跑結果，不宣稱 repo 全測試或全部角色 UI 都已通過。

## 啟用前歷史紀錄：批次 2 本機已實作

2026-10-29 更新：[成本核對與明確零值實作紀錄](SETTLEMENT_REPORT_FINANCIAL_REVIEWS_2026_10_29.md)。owner 專用 RPC、094 遷移／唯讀驗證、線上明確保存／撤回、帳號隔離讀取快取與手機表單已備妥；報告及單場已串接，但受新旗標控制，**保持關閉，未套用雲端或發布**。舊成交／投影／庫存／照片不重寫。完整批次 2 仍需雲端保存、重開、返回與角色負向驗收；下方「未新增 SQL／沒有保存按鈕」等敘述是第一批的歷史狀態，由本段取代。

下一個外部步驟為執行 094 與唯讀驗證；成功後再啟用本機旗標驗收。Chrome 連線及原生瀏覽器網址辨識均未成功，本輪沒有可用雲端 SQL 管理操作路徑。完整跨頁一致仍是後續批次，沒有以本機測試宣稱線上已完成。

本批驗證：10 組隔離 SQL 通過；10 個針對性測試檔通過（financial-record-quality、financial-reviews、settlement-report-reading／reader／navigation、market-cash、market-journal-persistence、settlement-report-preview-ui、settlement-report-subscription-access、clear-user-data，其中帳號清除 7 個案例）。mobile TypeScript 與修改檔 ESLint 通過；最終 Web production build 通過、mobile static build 及 35 項 segment aliases 通過。日誌在 `.codex-artifacts/financial-reviews-*.log`；隔離 SQL 可用 `node scripts/verify-financial-reviews-sql.mjs` 重現。沒有把已知舊 hide-profit 字串斷言或尚未執行的真實保存驗收算入通過數。

## 第一批歷史紀錄

日期：2026-10-29。狀態：本機第一批實作；未 commit／push／部署。依據 [實作計畫](SETTLEMENT_REPORT_IMPLEMENTATION_PLAN_2026_10_29.md)。

## 已完成的來源盤點（批次 0）

| 項目 | 來源／路徑 | 本輪結論 |
| --- | --- | --- |
| 補登收入 | AddRevenueDialog → photo-evidence-runtime-enqueue → hooks.recordDeal → events.recordEvent | 仍使用原成交事件與照片流程；空成本在表單被轉成 0，無法事後只靠金額區分未知與確定零 |
| 每日收入／成本／利潤／成交 | deal_closed／deal_deleted → lib/db/events.ts、deal-closed-projection.ts → dailyStats | 是投影，不應直接改表充當成交修正；既有庫存與照片副作用需保留 |
| 單場全期估算 | market-financial-summary、MarketDetailScreen | 保留原摘要估算，新增與報告同判讀來源的限制提示 |
| 報告本期估算 | settlement-report-reading + dailyStats | 使用活動日期分攤，保留完整性限制；局部合格場次可額外顯示小計 |
| 商品件數／收入 | DailyStats.productsSold → report.productRows | 與總額收入可能只部分對應，需顯示涵蓋金額，不推算缺漏商品 |
| 商品毛利 | 商品目前成本 + 已記錄商品收入 | 維持次要估算與非歷史成本說明，不回寫歷史成本 |
| 場次固定費 | market-booth-fee + market-financial-summary | 單一攤位費、設備租金；保證金排除；跨期按活動日分攤 |
| 成交編輯 | MarketDetailScreen.handleEditDeal | 目前只有「編輯功能即將推出」提示，無正式保存路徑，不能把新成本提示當成修正流程已完成 |

本輪未改原成交、投影 writer、庫存、付款或照片；未清除本機／雲端資料。

## 已實作

### 共用判讀契約（批次 1）

- 新增 `lib/analytics/financial-record-quality.ts`，區分 unknown／recorded／confirmed-zero／invalid。
- 費用與每日銷售成本各自判讀；收入非負、成交數為安全整數，成本與利潤需相符。
- 零值確認包含種類與來源 basis。basis 是來源內容比對契約，**不是授權憑證或防偽簽章**；未來只能由已驗證的持久化／權限路徑提供，不能信任 URL、任意本機物件或表單傳來的確認。
- 每日 basis 對應場次、日期、收入、成本、利潤與成交數；場次費 basis 對應日期、費用／免費設備與抽成。財務來源改變會失效；無關備註與刷新時間不影響確認。
- 報告 builder 已能接收按場次／日期分組的確認契約，測試涵蓋免費與零收入；**正式 Screen 尚未傳入此參數，沒有新增保存按鈕或把舊 0 值批次確認**。
- 保留舊已完成場次零統計的既有相容分類。未完成場次仍不因零統計自動當成確定零收入；畫面改稱「收入結果待確認」，避免一律斷言只有互動。

### 報告閱讀與資料範圍（批次 3–5 的可獨立部分）

- 全期淨利待確認時，可展開「已確認 X 場估計淨利小計」；列出納入場次與未納入數，明示非全期。沒有合格場次不顯示 0 元小計。
- 前期／本期以對齊表格呈現收入、場次、場次紀錄日與平均，保留同長基準、實際起訖及資料不足不比較的限制。
- 商品明細收入／總收入可直接對照；不完整、矛盾、無明細分開判讀，不硬截比率、不推算商品。只有單品或並列時不強選熱銷商品；目前庫存明確標示。
- 已成功跨期分攤歸為計算說明，營業中歸為狀態，需補正才計入待確認；沒有問題時不顯示空提醒卡。
- 場次數摘要分清有紀錄、其中部分日期待補、尚無收入結果與未開攤，避免直接把重疊數字相加。
- 尚未開攤移為折疊清單；只有一場時隱藏排序；去除沒有依據的通用商品建議。
- PDF 小計與涵蓋金額沿同一模型。事實模式的商品頁不再突出第一列／任選首項商品；版面維持五頁。

### 導航與單場限制提示（批次 2、3 的讀取部分）

- 銷售成本改進每日表現，固定費仍進成本設備；銷售成本提示列出需核對日期。
- 導航可攜帶經日期與期別驗證的 reportDate；每日表現顯示指定日期標記與跳轉連結，多日期內部清單定位至該日期。
- 返回保留報告期別、排序、展開筆數與來源場次。沒有增加任意外部 return URL。
- 單場淨利摘要保留依已填費用估算的原值，補上同一報告模型判定的待確認原因。只在既有付費老闆工作區掛載，按 owner_id 再限制本機讀取，未擴大員工／免費資料權益。
- 此入口目前是「核對」而非可保存的「修正」；文案避免引導重複補登同筆收入。

## 驗證紀錄

- 共用判讀、來源失效與來源不變、reading、SSR 閱讀與導航測試通過；案例包含 800 元免費場次、零收入負 100 元且成交 0、局部 -40 元小計、部分商品涵蓋、明細矛盾與並列。
- 既有報告模型、預覽 model／UI、PDF view model／模板／預覽按鈕、訂閱存取測試通過。此為針對性檢查，未宣稱整個測試套件全通過。
- `daily-revenue-stats-hide-profit.test.ts` 的底部「總利潤」字串斷言失敗；對 HEAD 原檔執行相同 regex 也為 false。本輪未修改原有利潤顯示條件，保留為既有測試問題，不以它宣稱員工角色驗收完成。
- 修改檔 lint 與 mobile TypeScript 檢查通過；建置結果另見下方狀態，不能沿用前輪結果。
- 真實測試老闆：九月完整範例仍為收入 4,000／淨利 2,900，前期 3,000、兩期各 1 場 2 日；單場排序與空提醒卡未出現。
- 真實十月：收入 6,142、全期淨利待確認，展開小計為 2 場 570 元，列出納入場次，其餘 11 場已到期場次未納入；另有 2 場未開攤。
- 由銷售成本入口進入 10/28 的每日表現，看到單場 21 元估算與銷售成本待確認的說明；原日期／成交皆未修改。
- PDF 使用既有隔離十場／十商品 fixture 實際產生五頁 A4，全部渲染視覺檢查，確認小計及長提示未溢出。輸出 `.codex-artifacts/report-facts-check.pdf`，圖片 `report-batch1-page-1.png` 至 `report-batch1-page-5.png`。
- 手機比較截圖 `.codex-artifacts/report-implementation-comparison-mobile.png`；其他尺寸、日期返回與最終建置結果執行後補記。

## 尚待完成的主要工作

1. **批次 2 保存**：確定零元／零收入的持久化、來源一致性、owner／方案限制、冪等、衝突、同步／重開與舊客戶端保護。尚未新增 SQL 或啟用雲端功能，現在沒有使用者需要手動執行的遷移。
2. **既有成本修正**：新增可靠的來源修正保存契約，處理統計重建、庫存／照片不變與重試；不能重複新增 deal_closed 取代修正。
3. **跨頁全面一致**：目前單場已補限制提示；列表／分析其他摘要與正式確認來源，仍需在保存契約完成後核對，不能宣稱全專案已統一。
4. **端到端驗收**：完整保存→同步→重開→返回、真實角色負向驗證及必要的資料庫隔離測試，依後續 writer 實作執行。這輪沒有變更角色或建立新雲端測試交易。
5. **發布**：尚未提交、推送或正式部署；iPhone／Android 實機仍另行驗收。

下一個寫入批次應採最小、可核對的契約：確認／更正記錄需包含 owner、場次、日期／來源 ID、來源版本、確認種類或更正金額、修訂與 mutation ID。Server 重新檢查 active 成交、日期與來源，拒絕錯帳號／失效來源／重複變動；原事件保留。最終採追加事件或專用 owner RPC，須先依既有同步投影與雲端限制完成設計／隔離測試，不在報告元件直接更改 dailyStats。

## 建置與剩餘驗收狀態

- 最終 14 個針對性測試檔通過，輸出保存於 `.codex-artifacts/implementation-*.log`；既有 hide-profit 字串斷言另列，未混入通過數。
- 最終修改檔 ESLint、mobile TypeScript 檢查通過；Web production build 與 mobile static build 通過，靜態 segment aliases 35 項。日誌：`report-implementation-web-build.log`、`report-implementation-mobile-build.log`、`report-implementation-lint.log`。
- 真實頁面量測：390／1024／1440 視窗寬度下，document 可視寬度與內容寬度分別同為 382／1016／1432，無橫向溢出。截圖：`report-implementation-overview-mobile.png`、`report-implementation-comparison-mobile.png`、`report-implementation-date-mobile.png`、`report-implementation-tablet.png`、`report-implementation-desktop.png`。
- 實際點擊指定日期連結，10/28 呈現指定標記；返回報告保留十月、5 筆展開數及來源場次，「繼續查看」可跳到該場。瀏覽器尺寸已恢復。
- React 檢查：沒有新增重複網路請求／事件監聽或瀏覽器全域讀取；衍生狀態直接計算、hook 順序固定，新增查詢按 owner 範圍、畫面保留語意表格與 details／焦點操作。PDF 沿用檔案 port。
- 尚未完成批次 2 的雲端保存與完整角色／跨裝置驗收，以上結果不代表整份計畫已完成或已發布。
