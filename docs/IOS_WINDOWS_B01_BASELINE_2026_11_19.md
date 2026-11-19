# B01：Windows 發布基線與品質校正

日期：2026-11-19。對應 [Windows 計畫](IOS_WINDOWS_EXECUTION_PLAN_2026_11_19.md) 的 W01-01、W01-02。

## 版本與執行環境

- 工作樹：`markit-main-sync-ba2f7a8`，分支 `codex/sync-main-ba2f7a8`。
- 開始時本機 HEAD、`origin/main` 與正式站 `/api/health` 均為 `19752f66992d273acafd368414c309642552e0f1`。`git fetch origin main` 後沒有前後差異。
- Windows、Node.js 24.22.3；本批只有本機來源／文件修改，沒有雲端 SQL、方案、R2、正式環境變數或刪帳啟用操作。
- GitHub Actions run `43999230015`：Windows mobile preparation 與 hex-budget 成功；Web job 在測試階段被舊照片元件斷言阻擋，沒有走到該 job 的 Web build。因此不把這次 CI 說成完整成功。

## 本批實作

1. 校正照片列表、現場區塊、商品返回、角色資料範圍、市集頁籤、歷史同步的舊斷言。保留讀取權限、照片刪除、安全重送與同步邊界檢查，使用目前正式元件及資料流驗證。
2. 訂閱測試面板已改成測試身分切換；測試同步核對目前面板、登入 token 綁定與不可用時隱藏。原有 authenticated denial API 測試繼續保留。
3. 修正 `RetainedDataAccessNotice` 的巢狀 `main`。它位於既有 AppChrome 的主內容內，改成一般容器並保留標題、說明及返回按鈕；`main` 的所有權仍由 route shell 管理。此變更不使用裝置能力，也不改資料權限。
4. 修正 33 個測試檔的 68 個型別錯誤：補齊市集費用、每日統計、照片草稿欄位；更新商品分類；Dexie mock 使用 Dexie Promise；非同步 callback 以可追蹤容器取代被型別分析誤認為永遠為 null 的變數；修正 PDF Document 呼叫、ES2017 正規表示式及測試輸入型別。明確的無效／舊資料測試仍保留在測試邊界。沒有新增 ts-ignore、關閉 strict 或排除測試來取得通過。
5. canonical 任務加入本輪 Windows 計畫，刪帳 runtime 的 evidence 改為包含最新實作／整合候選。其 `pending_approval` 狀態保留；原本最新實作存在、真實發布未完成的情況可由新證據區分。重新產生人工清單，不手動勾選外部項目。

## 集中驗收與沿用界線

| 檢查 | 結果／範圍 |
| --- | --- |
| 完整測試 manifest | 479 個檔案逐一執行一次，471 成功、8 失敗；完整錯誤收集後才定向修正。使用與正式入口相同的 manifest 和 react-server 條件，沒有因第一個失敗停止。 |
| 修改後回歸 | 修正的 8 個失敗及原 CI 照片斷言通過；型別修正後重新執行受影響的 41 個檔案。Dexie 匯入順序的回歸已修復並單獨重驗。完整初次結果與受影響重驗合併作本批證據，沒有再跑全部 479 檔。 |
| TypeScript | `tsc --noEmit --incremental false` 通過，完整預設 tsconfig 的 68 個測試錯誤已清除；保留初始錯誤清單及來源指紋。 |
| ESLint | 對本批元件及 41 個修改測試執行，退出碼 0；只檢查受影響來源。 |
| 任務與清單 | `check-launch-execution-plan`、`update-manual-launch-checklist --check` 通過；59 任務狀態仍為 15 complete、11 pending_manual、6 pending_approval、24 blocked_dependency、3 deferred。 |
| 裝置／發布 gates | `check:native-launch-readiness` 的 not_ready 與 `check:ios-bootstrap` 的缺少 App ID／需要 macOS 均屬實際外部缺項。bootstrap 來源 ready、尚無 native project，不能推定 iPhone 通過。 |
| 建置 | 沿用 SHA `19752f6` 的 Windows mobile CI 證據；本批沒有更換 native adapter、資產、路由或 build 設定。完整候選的 Web／mobile API build 於 B06 集中執行，來源改變後不冒用舊結果。 |
| Actions 保存 | 現行 workflow 沒有 upload-artifact 步驟；唯讀所見 2 份 cache、372,665,980 bytes。未刪 cache、未加付費保存或多餘的 CI run。 |

[機器證據與初始錯誤清單](evidence/ios-windows-b01-baseline-2026-11-19.json)記錄版本、測試檔與實際完成界線。原始日誌保存在本機 ignored 目錄，不提交未過濾的日誌或敏感設定。

## 後續批次與外部事項

- **B02／W02-01、W02-02**：處理 097 對既有 096 目錄、檢視與 trigger 的影響。現有安裝指紋會拒絕未審查漂移；不能只把指紋重新蓋章或直接改寫已安裝的 096。先完成相容／回滾設計與隔離證據，再準備候選。
- **E01／W02-03**：最新遠端 096／097 的精確目錄及受保護 Preview 接線，依既定排程留到 12 月 1 日後。既有雲端安裝回條只代表當時狀態。
- **B03–B06**：按 Windows 計畫執行核心手機流程、Apple runtime／購買來源、商店資料及最終候選。已取得的有效檢查直接引用，只有相關變更或新問題才擴大回歸。
- **E02／H01**：Apple 會員／Bundle ID／商品、Mac 簽署編譯、iPhone、TestFlight 及真實沙盒尚待各自證據。此次不啟用正式付款或不可逆刪除。
