# 完整結算報告：網頁閱讀優先

後續更新：[事實判讀與手機閱讀改善](SETTLEMENT_REPORT_FACTS_AND_UX_2026_10_29.md)已取代本文件初版的評分、成本覆蓋百分比、固定淨利排序與返回僅保留期間的行為；下列為第一輪交付紀錄。

日期：2026-10-29。使用者核准將高階報告改為「分析 → 查看完整報告 → 獨立報告頁」，PDF 為選用匯出。本文件取代舊報告設計文件中「只供預覽／檢查工作區」的畫面定位，未改動結算公式、價格或訂閱權限。

## 本次實作

- 沿用 `/reports/settlement`，不建立第二套計算引擎。分析頁提供可見文字入口「查看完整報告」。
- 五段閱讀：本期總覽、市集表現、商品表現、成本與改善建議、資料完整度。手機使用單欄卡片；768px 起使用市集／商品比較表格。
- 期間預設本月，可選週報／月報與起訖日期。套用後寫入 `kind/start/end` URL；重新整理及進入詳情後返回保留期間。無效日期不生成報告，欄位附標籤及錯誤提示。
- 市集／商品先顯示五筆，每次增加十筆，直到讀完全部模型資料。商品原始資料不存在時提供待補提示，不產生失效商品連結。
- 場次與商品詳情提供「返回報告」，回到原期間報告的頂端，再使用章節索引跳至需要的內容。避免非同步載入與瀏覽器捲動還原互相覆蓋；未宣稱自動返回原捲動位置。
- 成本明細與超過三項的建議收合；低可信度不呈現正式評分或再參加結論，優先列出補齊紀錄的建議。資料完整度保留所有缺漏說明及處理建議。
- 頁尾「匯出 PDF（選用）」預設收合；展開才顯示既有預覽／儲存按鈕。產檔仍須使用者按下按鈕，沿用既有五頁模板、列數限制、檔案操作 port。網頁可讀取全部報告列。
- 方案介紹同步標示「完整週／月結算報告（網頁閱讀）」與「PDF 選用匯出」。完整報告及其 PDF 仍限高階老闆，未開放輕量版、免費版或員工報告權限。

## 檔案與邊界

- `app/reports/settlement/page.tsx`：Suspense 路由入口。
- `components/reports/settlement/SettlementReportScreen.tsx`：既有角色／訂閱 gate、owner scope、報告模型與 PDF view model 協調。
- `components/reports/settlement/SettlementReportReader.tsx`：閱讀介面與日期表單，不寫入營運資料。
- `lib/reporting/settlement-report-navigation.ts`：共用日期驗證、可還原期間的固定內部連結；不接受任意返回 URL。章節索引使用一般頁內連結，無新增瀏覽器存取或原生 SDK；PDF 使用既有檔案 port。
- `components/markets/MarketReturnLink.tsx`、`components/products/ProductDetailScreen.tsx`：報告來源返回入口，其他既有來源沿原規則。

未新增 SQL、API、付費流程、雲端 writer、同步策略或照片操作；未處理 Demo。123@123 維持使用者指定的高階測試基準，員工狀態不變。

## 驗證

- 17 個相關測試檔案全數通過：報告／預覽／PDF view model、品質等價、付費權限、PDF 按鈕與檔案操作，以及下列閱讀／導覽與方案回歸。
- 新增 `settlement-report-navigation.test.ts`：有效與無效日期、閏日、編碼 ID、期間往返、拒絕任意返回 URL。
- 新增 `settlement-report-reader.test.tsx`：實際模型金額、五章、卡片／表格、選用匯出、低可信度限制、未知商品、空期間與超過 PDF 列數的報告。
- 既有商品靜態路由、場次返回、商品返回、App 導覽、方案介紹／分級測試通過。品牌測試更新至目前既有 `showReportUsage` 介面。
- 修改範圍 ESLint、Web production build、mobile 靜態建置（含 35 個 segment aliases）通過。一次 Windows 建置於 worker 結束時遇到 `kill EPERM`，重新執行後完成，不以失敗那次作為通過證據。
- 內建瀏覽器以 localhost 獨立工作階段登入指定測試老闆：390×844、1024×768、1440×900 無橫向溢出；手機無可見表格、平板／電腦可見兩張比較表格。已驗分析入口、日期套用、反向日期提示且不套用錯誤期間、場次／商品返回期間、五筆展開至十五筆、PDF 預設收合及展開後按鈕。最終商品返回確認報告標頭位於頂端（scrollTop=0）。
- 本機 127.0.0.1 的另一工作階段仍有兩筆待同步照片，因此取消登出並保留資料，未強制捨棄。
- `role-provider-r1.test.ts` 的報告搬移檢查通過，但既有首頁全域檢查仍有一項失敗：HEAD 的首頁已存在 `ownerId: currentOwnerId`（照片提醒範圍），與舊版全檔禁止字串斷言矛盾。本次未改首頁或放寬權限斷言，不能宣稱全測試套件通過。

本機截圖：`.codex-artifacts/report-reader-mobile.png`、`.codex-artifacts/report-reader-desktop.png`。本輪未重做實機、正式站發布或既有 PDF 的逐頁視覺驗收；上述瀏覽器尺寸不等同原生實機驗收。
