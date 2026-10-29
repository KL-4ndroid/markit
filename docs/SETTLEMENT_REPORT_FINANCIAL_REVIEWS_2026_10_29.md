# 獨立報告頁批次 2：成本核對與明確零值

日期：2026-10-29。最新狀態：使用者確認 094 完成，雲端 RPC 的真實保存與回讀已通過；僅 `.env.local` 啟用新功能。未 commit／push／部署，Vercel 未啟用新旗標。依據 [完整計畫](SETTLEMENT_REPORT_IMPLEMENTATION_PLAN_2026_10_29.md)，接續[第一批進度](SETTLEMENT_REPORT_IMPLEMENTATION_PROGRESS_2026_10_29.md)。

## 雲端接通後的實際驗收

- 使用既有測試老闆與兩個合成場次，未另建市集或成交、未改角色／方案。雲端 094 完成狀態由使用者回覆，實際 RPC 保存／讀取另由本輪驗證；沒有把使用者回覆當作全套端到端通過。
- `[驗收1027-O] 線上出攤完整流程`（`622aa8bc-c4f2-4068-9592-1cf8c872af90`）：10/28 銷售成本確認 0 後，單場淨利由待確認變成 21 元。10/27 原成本 40 核對為 50 時，當日銷售利潤變 210、整場淨利變 11；撤回後回到原成本與淨利 21。收入始終 261、成交 4、待補照片仍 1 筆。
- 測試結束保留 10/28 零成本確認，10/27 更正已撤回；雲端新登入的獨立 client 已確認兩筆狀態。未改原始成交或成本投影。
- `[驗收1025-N] 收攤導向測試`（`de5d2ead-5ee7-4115-9015-6919459c6984`）：保存固定費用零值與 10/25 零收入後，單場淨利為 0、成交 0。兩種確認分別撤回會恢復待確認，再確認、整頁重載後仍存在。雲端 source 的該日收入、成交數與有效成交事件數仍全部為 0。
- 實際發現並修正每日表現空狀態：有零收入確認時原先仍寫「尚無營運紀錄」。新增只在可信讀取 overlay 產生的 `financialZeroIncomeConfirmed`，每日卡片顯示「已確認零收入」，有紀錄／無紀錄篩選也採相同分類；不寫入原投影、不製造成交。新增 shared helper `hasDailyRevenueRecord` 與零結果分類／總計測試，staff 的 hideProfit 流程仍採原資料，不套用 owner overlay。
- 輸入 `1.001` 被表單拒絕、輸入保留；點「重新讀取來源，保留輸入」後仍為相同輸入，取消後已保存淨利仍為 21。未以不合法值建立雲端核對。
- 報告返回保留十月與來源場次。收入仍 6,142、成交 18；小計由原 2 場 570，經 O 確認變 3 場 591，再含 N 零收入場為 4 場 591。其他紀錄缺漏仍讓全期淨利顯示待確認，沒有把小計當全期。
- 390×844、1024×768、1440×900 實際頁面內容寬度與可視寬度分別同為 382／1016／1432，無橫向溢出；臨時視窗尺寸已恢復。
- 新[真實 API 驗證腳本](../scripts/verify-financial-reviews-live.mjs)只使用暫時程序環境的測試帳密，不使用管理密鑰／瀏覽器儲存。獨立登入老闆讀回保存結果；員工讀取及不合法保存請求皆先以 `42501 FINANCE_SCOPE` 拒絕，匿名無執行權。只登出這兩個記憶體 client，不登出瀏覽器、不修改員工角色。免費／異 owner／修訂衝突的細節仍由隔離測試覆蓋，未宣稱全部角色已再做完整 UI 巡檢。
- 實際由「儲存 PDF」下載本期報告，5 頁 A4、69,379 bytes；逐頁渲染確認中文字、表格、長名稱與提示未溢出。收入 6,142、小計 4 場 591、O 場次 261／21、N 場次 0／0 與 Web 相符。證據：`.codex-artifacts/financial-review-live-report.pdf`、`financial-review-live-report.txt`、`financial-review-live-page-1.png` 至 `-5.png`。
- **自動 PDF 預覽仍未驗收**：「預覽 PDF 報告」被 Browser Use 安全政策阻擋；沒有改用 raw CDP／另一瀏覽器繞過。下載與本機檔案渲染在阻擋前已完成，不把檔案檢查當成瀏覽器預覽通過。
- 手機證據：`.codex-artifacts/financial-review-owner-saved-mobile.png`、`financial-review-zero-reopened-mobile.png`、`financial-review-zero-day-mobile.png`；API 日誌 `financial-reviews-live-acceptance.log`。目前不需要使用者補執行新的 SQL。

仍待整合驗收：另一實際裝置的同步與競爭修改、真實免費／到期身分負向操作、網路中斷／未知送達後的 UI 重試、瀏覽器 PDF 預覽及正式部署。這些不影響下一批跨頁財務摘要一致性的開發；不能因此把整份計畫勾選為全部完成。

## 可使用的流程與邊界

- 付費老闆在單場「回顧」可選日期，核對每日銷售成本總額、確認沒有收入／成交，或確認整場固定費用為零；可撤回每日核對與固定費確認。
- 成本核對是每日總額的額外讀取層，**不是個別成交編輯**。原成交、商品明細、庫存、照片、原 dailyStats 投影不變；原成本與核對金額可能不同，表單會說明。原始資料重建後仍須符合已保存的來源條件才能套用。
- 零收入確認不建立零元成交，不增加成交數或待補照片。只允許已過日期，或當日已收攤／場次完成的日期；未來日期不能確認。當日重新開攤，確認停止適用。
- 固定費為攤位／報名同一筆費用及自付設備租金；保證金排除，抽成另計。原費用有負數或不合法值，不能透過相抵後總額為零而確認免費。
- 保存明確使用者操作、線上送出、雲端回讀後確認成功；離線不加入待寫佇列，不自動重送。失敗保留表單與同一次 mutation ID；可重新讀取來源並保留輸入，不能默默覆蓋別台裝置的新修訂。

## 資料與權限

- [094 遷移](../supabase/migrations/094_add_owner_financial_reviews.sql)新增目前核對表與冪等回條；不改舊成交／收入／費用。保存／撤回有版本，回條保留原請求與結果；重播舊回條不覆蓋新修訂。
- Server 以已登入使用者、付費有效方案及場次 owner 三者交集授權。免費、員工、其他 owner、已刪除場次均拒絕，包含重試。兩表啟用 RLS、無客戶端直接存取；私人 helper 不提供客戶端執行權，只授予兩個受保護 RPC。
- Server 從場次日期、費用與有效成交／刪除事件重建來源。每日指紋包含來源歷史，新增再刪除成交也會使舊確認失效；有效收入／成交數另與本機原投影比對。零值 basis 是內容比較，不能作授權憑證。
- 新增 Dexie v11 的 owner 範圍**讀取快取**，不是財務寫入或復原主來源；帳號重設／清除會移除並使舊請求失效。網路狀態沿 `lib/platform`，未新增瀏覽器專用商業邏輯、原生套件或付款能力。
- 報告、PDF 報告模型、單場淨利與每日表現讀取相同 overlay。來源尚未同步／讀取失敗時保守顯示待核對，不把舊快取當最新已確認。其他分析／列表摘要的全面統一仍屬批次 3，不能宣稱全專案已一致。

## 程式入口

| 用途 | 檔案 |
| --- | --- |
| 型別、驗證、讀取覆蓋 | [financial-reviews](../lib/markets/financial-reviews.ts)、[財務品質](../lib/analytics/financial-record-quality.ts) |
| 保存／回讀／帳號隔離 | [repository](../lib/markets/financial-review-repository.ts)、[scope](../lib/markets/financial-review-scope.ts)、[Supabase adapter](../lib/supabase/financial-reviews.ts) |
| 查詢與同步阻擋 | [hook](../hooks/useFinancialReviews.ts) |
| 手機核對表單 | [FinancialReviewPanel](../components/markets/FinancialReviewPanel.tsx)、[單場](../components/markets/MarketDetailScreen.tsx)、[每日表現](../components/markets/DailyRevenueStats.tsx) |
| 完整報告 | [Screen](../components/reports/settlement/SettlementReportScreen.tsx)、[reading](../lib/reporting/settlement-report-reading.ts) |
| 快取版本／清除 | [db](../lib/db/index.ts)、[帳號重設](../lib/db/clear-user-data.ts)、[型別](../types/db.ts) |
| 每日空狀態 | [daily-revenue-totals](../lib/ui/daily-revenue-totals.ts)、[分類／總計測試](../tests/daily-revenue-totals.test.ts) |
| 驗證 | [共用／repository 測試](../tests/financial-reviews.test.ts)、[隔離 SQL](../scripts/verify-financial-reviews-sql.mjs)、[真實 RPC](../scripts/verify-financial-reviews-live.mjs)、[雲端唯讀驗證](../supabase/verification/094_owner_financial_reviews_readiness.sql) |

## 啟用前的歷史驗證（由上方最新紀錄取代目前狀態）

- 隔離 PGlite 的 10 組 SQL 測試通過：遷移重跑／ACL、實際來源日期與總額、保存重試、衝突與偽造輸入、負費用抵銷、舊回條、明確零值、來源失效、當日收攤／重開、越權／降級／已刪除場次拒絕。未使用雲端或真實帳號資料。
- repository／模型測試涵蓋原資料不變、1,000 收入減 200 銷售成本得 800 淨利、零收入成交數仍為 0、來源變更、失效／阻擋、不同裝置覆蓋後不能誤報成功，以及請求中切帳號／清除快取。
- Web production build、mobile static build 及 35 項 segment aliases 已通過；相關測試與最終 lint／TypeScript 結果見進度檔。這不代替真實 UI 保存或 iPhone／Android 實機測試。
- **雲端尚未套用**。Chrome provider 連線逾時，原生瀏覽器控制亦因無法可靠辨識網址而被工具停止；沒有 SQL 管理連線，所以本輪無法直接執行。
- 下一步在同一專案 `fgejncfsvvsayiequubm` 完整執行 094，再執行唯讀驗證。確認成功後，才在本機測試環境啟用 `.env.example` 所列 `NEXT_PUBLIC_FINANCIAL_REVIEWS_ENABLED=true`，以合成場次驗收保存→重開→原場次／報告→PDF、錯誤保留輸入與返回定位。通過後才能安排發布環境啟用。
- 尚未啟用 `.env.local`／Vercel 新旗標；尚未建立本輪雲端測試成交或修改測試員工角色。正式 UI 截圖、雲端重開、跨裝置、線上權限負向測試及 PDF 新來源實際產生仍待驗收。

## 回退

關閉旗標並重建／重新載入 UI，可停止新流程；既有核對與回條資料保留。不刪表、不批次改原財務資料。必要時可由管理員撤回 authenticated 對兩個新 RPC 的 EXECUTE 權限，阻止舊頁面繼續送出；重新開啟前依 094／唯讀驗證核對權限。旗標關閉時舊報告不使用已核對成本，不能宣稱關閉後仍與新版金額相同。
