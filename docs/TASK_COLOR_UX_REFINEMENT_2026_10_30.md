# 手機任務流程與色彩分工修正

日期：2026-10-30。承接配色收斂與 WCAG 修正，依「找待繳費場次、記錄收入、閱讀回顧」檢查實際操作。這次沒有換掉九套品牌主題。

## 本次修正

| 情境 | 原問題 | 修正 |
| --- | --- | --- |
| 期限提醒 | 清單和詳情只有逾期一致；今天／近期截止仍像普通資訊 | 共用 `marketPaymentReminderClasses`：逾期危險色，今天／三天內提醒色，未設定／遠期／關閉提醒採中性；保留原標籤與日期 |
| 付款方式 | 選中付款方式與送出收款同樣使用實心主色 | 選項改淡主色底、外框、深字與勾選符號；確認收款維持實心主色與金額／付款方式文字 |
| 金額鍵盤 | 00、退格、數字各有彩色底或 hover | 數字及輔助鍵使用中性色階，清除／退格保留圖示與名稱；移除金額框的裝飾色條 |
| 商品選單 | 依商品位置輪流套四種彩底，沒有代表商品分類 | 未選卡片中性；已選卡片淡主色、外框與數量徽章；保留原商品名稱、金額、購物車與數量操作 |
| 回顧摘要 | 摘要元件所有數值都固定中性色 | 加入明確的 `tone` 呈現契約：已知負淨利採危險文字色，其他數字中性；保留負號與「估計淨利」標籤，讀取中／待確認不著警告色 |

這些調整不增加付款或記錄步驟；選取與警告同時有文字、勾選、數量或外框線索。主要按鈕 hover 沿用上一輪已驗證的不透明深色 token。

## 程式位置

- 期限樣式：[共用呈現](../lib/presentation/market-payment-reminder.ts)、[清單](../components/markets/MarketListCard.tsx)、[詳情提醒](../components/markets/MarketPaymentDeadlineNotice.tsx)。
- 收款：[付款選項](../components/sales/PaymentMethodSelector.tsx)、[金額鍵盤](../components/sales/QuickInteractionButtons.tsx)、[商品選單](../components/sales/QuickTransactionGrid.tsx)。
- 回顧：[摘要](../components/markets/MarketWorkspaceSummary.tsx)、[老闆場次頁](../components/markets/MarketDetailScreen.tsx)。

## 實際操作證據

使用既有測試老闆帳號，以內建瀏覽器 390×844 操作正式功能。未改方案、登入狀態、個人主題、原有商品庫存或既有場次。

1. **待繳費**：首頁「待繳費 1 場」→ 篩選清單 → 月光夜市集管理。入口兩次點擊可達，原場次只查看。
2. **隔離測試資料**：新增 `[配色驗收1030] 收款與回顧`，ID `93f96c9b-f036-498a-9046-3dddb981acbb`，日期 2026/10/30，00:00–23:59，攤位費 100 元，地點明示測試。期限設當天結束前，經等待錄取→已錄取，驗證「今天截止」。清單與詳情實際背景皆 `rgb(255,248,230)`、文字皆 `rgb(122,90,18)`；標記已繳費後提醒移除。
3. **快速收款**：只關閉該測試場次的照片要求。由現場開啟快速收款，輸入 50；切換行動支付時，確認按鈕同步顯示「50 · 行動支付」；切回現金並提交。成功後收入 50、成交 1，最近紀錄出現一筆手動收入，無待補照片。
4. **商品選取**：開啟商品銷售，等待原商品資料載入。選取既有 `[驗收1026-M] 流程測試商品`，可見選框與數量 1，完成交易按鈕顯示 50 元且可操作。接著清空購物車並關閉，**沒有送出商品交易、扣除庫存或新增商品**。
5. **回顧與收尾**：回顧顯示總收入 50、成交 1。為該合成收入保存本日銷售成本 0 的核對紀錄；摘要仍按既有完整度規則顯示「待確認」，沒有強制改成已知淨利。測試場次已確認收攤；原有待準備數回到 8、待錄取 5、待繳費 1，已結束增加到 31。

測試場次、50 元現金收入與一筆零銷售成本核對留在測試帳號中，便於重開查看。這些是真實保存的合成測試資料，不是正式營業收入。

截圖：`.codex-artifacts/task-color-ux-deadline-mobile.png`、`task-color-ux-sale-mobile.png`、`task-color-ux-products-mobile.png`、`task-color-ux-review-mobile.png`。

## 檢查結果

- 本次修改檔 ESLint、mobile TypeScript、Web production build、mobile static build 與 35 項 segment aliases 通過。
- 320×740 清單內容寬 312、390×844 收款視窗內容寬 390、1440×900 清單內容寬 1432，未見橫向溢出。清單負值 `估計淨利 -$50` 的實際文字色為 `rgb(155,58,42)`，負號與標籤保留。結束後已恢復原尺寸與使用者原本的小農生活市集頁。
- 既有 `market-payment-deadline`、`market-payment-deadline-ui`、`market-workspace`、`market-list-ui`、`market-navigation-return`、`theme-lab`、`market-financial-display`、`financial-record-quality`、`financial-reviews` 測試通過。
- **既有測試差異**：`sales-checkout-photo-evidence-uiux.test.ts` 仍要求 `markit:last-sales-payment-method` 字串，與目前「新交易預設現金」實作不同。提交前 HEAD 的 TransactionWorkspace 也沒有該字串，本次沒有更動付款預設或為通過測試恢復記住上次付款方式。失敗日誌保留於 `task-color-ux-existing-checkout-test.log`，不算通過。
- 既有九套主題的淡主色選中、文字與外框計算測試仍通過。這次沒有新增瀏覽器 API、同步／權限規則、資料庫遷移或平台依賴；呈現純函式與共用元件可供 Web／未來原生封裝共用。

## 限制與另外追蹤

- 此輪是開發者的可完成性、狀態與版面複驗，沒有真人使用者完成時間／誤按率的對照實驗；不能宣稱已量化證明更快。
- 新合成場次在清單顯示估計淨利 -50，詳情的完整度模型則顯示「待確認」。兩處對資料完整度的處理需另行核對；本次沒有改財務口徑或把待確認資料強制當零。負值摘要的呈現接線已完成，但沒有把這個尚待確認的場次當成負值摘要實機通過證據。
- 其他表單、功能專用頁面、深色模式與全站 WCAG 驗證另列工作，不由這次三條流程的抽查代替。
