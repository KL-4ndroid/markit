# 市集文字匯入 Gate 9 發布準備報告

- 執行日期：2026-09-17～2026-09-19
- 範圍：不接入 LLM 的「貼上資訊 → 本機分析 → 逐欄確認 → 套用 → 使用者自行建立市集」流程
- 前置證據：Gate 8 holdout 已通過，precision 100%、supported recall 95.04%，hard-zero 指標全數為 0
- 狀態：**已完成（2026-09-19）**

## 1. 完整建置與回歸

Gate 9 的發布候選必須同時通過：

1. 所有 `market-text-import` 契約、Gold、holdout、merge、UI 與發布守門測試。
2. repository 完整測試清單。
3. ESLint。
4. Next.js production build。
5. 實際瀏覽器載入、錯誤 overlay、主要互動元素、鍵盤及 390×844、1024×768、1440×900 響應式檢查。

瀏覽器檢查不取代 parser 的 Gold／holdout 評估；兩者分別覆蓋 UI 可用性與欄位判定品質。

實際結果：

- `npm test`：完整清單通過，exit code 0。
- `npm run lint`：通過，exit code 0。
- `npm run build`：Next.js 16.2.6 production build 與 TypeScript 通過，exit code 0。
- Gate 1～8 回歸：83 個 Gold、30 個 holdout、merge、UI 與 Gate 9 release guardrail 全數通過；holdout precision 100%、supported recall 95.04%、unsafe apply 0。

## 2. 隱私邊界

- 原始貼上文字只交給同裝置內的純 TypeScript parser，不呼叫 API、LLM、第三方分析或 telemetry。
- 原文只可存在 React 記憶體與使用者範圍的 `sessionStorage` 未完成草稿，TTL 為 30 分鐘。
- 建立市集 payload 只由既有表單欄位組成，不包含 `marketTextImportInput`、完整解析 draft、evidence 或 sensitive spans。
- 建立成功、使用者捨棄草稿時沿用既有清除流程；登出或切換帳號由使用者範圍 draft key 隔離。
- 錯誤訊息及 console 訊息不得附帶原文或 parser error payload。
- UI 明示「本機分析、最多保留 30 分鐘、不傳給 LLM、不寫入市集或分析紀錄」。

## 3. 跨平台可攜性

- `parser.ts`、`types.ts`、`validation.ts`、`merge.ts` 不依賴 DOM、browser storage、Next.js、React 或 Capacitor。
- 貼上動作由使用者操作文字框，不讀取系統剪貼簿，因此目前不需要新增 platform port。
- `sessionStorage`、focus 與 unload 提示仍位於既有 Web 表單／autosave 邊界，不進入共享 parser 或 merge。
- 未安裝 Capacitor 套件、未建立 iOS／Android 專案，也未宣稱原生裝置驗證完成。

## 4. 可及性與響應式決策

- 文字框有可見 label；狀態訊息使用 `role="status"`／`aria-live="polite"`。
- event 與 option 使用 fieldset、legend、radio；可套用欄位以整列 label 提供至少 44px 觸控區。
- details summary、按鈕與選項維持至少 44px 高度；圖示均為裝飾性並從輔助技術隱藏。
- 小螢幕採單欄，`sm` 以上才切換雙欄或水平排列；流程不依賴 hover、滑鼠或桌面寬度。
- 分析、選取與套用都不是 submit；最後仍須由使用者操作「建立市集」。

實際瀏覽器結果：

- 使用隔離的本機測試頁載入正式 `MarketTextImportPanel`；完成後已移除測試頁，不進入產品。
- 390×844、1024×768、1440×900 均無水平溢出。
- 三種 viewport 均無 Next.js error overlay 或 page error。
- 鍵盤焦點可由原文框移至「清除原文」等操作；互動元件可由 accessibility tree 辨識。
- 已實際完成貼上、分析、候選勾選與「套用已選欄位」；只產生表單 patch，未觸發建立市集。

## 5. 漸進開放與回退

新增雙重發布開關：

- Local：預設開啟，可用 `NEXT_PUBLIC_MARKET_TEXT_IMPORT_ENABLED=0` 關閉。
- Preview／staging：只有 `NEXT_PUBLIC_MARKET_TEXT_IMPORT_ENABLED=1` 才顯示。
- Production：必須同時設定 `NEXT_PUBLIC_MARKET_TEXT_IMPORT_ENABLED=1` 與 `NEXT_PUBLIC_MARKET_TEXT_IMPORT_ALLOW_PRODUCTION=1`。

建議順序：local 完整驗證 → preview／staging owner smoke → production 明確放行。若發生 UI、效能或判定風險，將 `ALLOW_PRODUCTION` 設為 `0` 並重新部署即可隱藏入口；既有新增市集表單、已填欄位與建立流程不依賴 parser，仍可照常使用。回退不刪除市集資料，也不執行自動修復。

## 6. 使用者安全說明與已知限制

- 系統只提出有 evidence 的候選；「系統推定」「需要選擇」「資訊衝突」會明確顯示。
- 表單既有內容預設不選取覆蓋；使用者可查看判定原文。
- 不支援或不確定資訊保持空白、警告或要求選擇，不會假裝已理解。
- 套用只更新表單，不自動送出。
- Gate 8 剩餘 7 個漏填屬保守空白／選項，不是錯填；發布後不得為提高填入率而放寬 hard-zero 安全門檻。

## 7. Gate 9 關閉條件

- [x] 完整測試、lint 與 production build 通過。
- [x] 瀏覽器載入、主要流程、鍵盤與三種 viewport 證據完成。
- [x] 原文、payload、telemetry 與 30 分鐘草稿邊界有可執行 guardrail。
- [x] 共享核心平台中立 guardrail 完成。
- [x] 漸進開放、production 雙重放行與回退方式完成。
- [x] 使用者可見的推定、隱私與自行確認說明完成。

Gate 9 完成門檻全數達成。Production 仍維持 fail-closed，只有部署環境同時明確設定兩個 release 變數後才會顯示入口；這份結論是發布準備完成，不代表已替 production 開啟功能。
