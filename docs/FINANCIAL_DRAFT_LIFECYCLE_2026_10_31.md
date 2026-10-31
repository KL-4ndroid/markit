# 財務核對草稿：到期、帳號切換、重新開啟與版本衝突

日期：2026-10-31。承接 [正式財務驗收](FINANCIAL_PRODUCTION_RELEASE_2026_10_31.md) 的下一個 slice。此批實作範圍為「核對成本與零收入」表單，不宣稱所有記帳、現金、心得及商品表單皆已統一改造。正式付款、取消訂閱、商店通知及原生專案皆未新增。

## 使用者流程

1. 開啟核對表單時重新讀取本人場次的雲端來源，建立本機草稿。
2. 輸入即時串行保存至裝置；顯示「儲存中／已保存／尚未保存」狀態。只有按「保存核對紀錄」才送出核對。
3. 「稍後繼續」、關閉表單、重新載入或關閉分頁不移除草稿。重開顯示「有未完成草稿」，使用者可繼續或確認捨棄。
4. 繼續時先重新讀取雲端。若來源或核對版本改變，保留輸入、顯示新舊金額，禁止直接保存；使用者明確選擇採用最新來源後，仍需再次手動保存。
5. 保存結果不明時，本機保留原 mutation ID 與完整相同請求。重開先核對結果；若已保存，清理本機草稿，不重送。若已被其他更新取代，回到衝突處理，不以舊回條覆寫新資料。

## 資料與權限邊界

- 新增 `financialReviewDrafts`，IndexedDB schema 12；主鍵含 owner、場次與日期／費用 key，另有草稿世代識別與本機修訂號。沒有新增 Supabase migration 或雲端草稿同步。
- 本機草稿是未完成的私人輸入，不是收入／成交事件、不加入自動同步佇列、不進入統計或 PDF。正式核對仍使用既有 094 RPC、資料來源指紋、預期修訂與冪等回條。
- 到期／降級仍沿用現有 Free／Light／Advanced 與 owner gate；無有效權益時不呈現付費草稿介面，不因保存草稿延長權益。恢復權益後也不自動送出。
- 登出／身分切換重建雲端快取時保留草稿，但失效所有舊 financial scope。下一個帳號不能透過 repository 讀取或恢復另一個 owner 的草稿；同 owner 回來且場次重建後才可繼續。
- scope 失效會通知已掛載的 hook 重建 repository；不同身分／讀取批次的舊請求不得覆寫新 scope 的載入結果。
- 「清空本機全部資料」的既有 `clearAllData()` 會移除草稿。一般 auth cache reset 刻意不移除。這份裝置資料不是帳號恢復備份，清除瀏覽器資料或換裝置不會從雲端重建未送出草稿。未來正式帳號刪除 client 收尾也必須將此表列入本機抹除清單；本輪未開啟帳號刪除或改動其雲端 saga。
- 多視窗同一份草稿以世代＋本機修訂做比較交換，避免舊視窗覆寫、丟棄新草稿，或草稿刪除再建立後被舊版本誤認。
- local storage 失敗時，不假報已保存，不繼續雲端保存，也不直接關閉尚未保存的表單；輸入留在畫面，可重試本機保存。未完成的非同步寫入若遭作業系統終止，不能保證最後尚在「儲存中」的字元已落盤。

## 跨平台設計

domain、串行編輯 session、驗證與資料模型維持純 TypeScript／既有 Dexie；網路狀態沿用 `lib/platform`。沒有新增 window、document、navigator、Web Storage 或裝置 API。Web／未來 Capacitor 使用同一版來源、衝突與請求識別規則。

## 程式與測試導航

- [草稿模型與來源判讀](../lib/markets/financial-review-drafts.ts)
- [編輯生命週期](../lib/markets/financial-review-draft-session.ts)
- [owner repository 與 local compare-and-swap](../lib/markets/financial-review-repository.ts)
- [手機表單與繼續／捨棄／衝突選項](../components/markets/FinancialReviewPanel.tsx)
- [owner／場次 component key](../components/markets/MarketDetailScreen.tsx)、[權益／scope 改變時重建 repository](../hooks/useFinancialReviews.ts)、[scope 訂閱通知](../lib/markets/financial-review-scope.ts)
- [schema／全部清除](../lib/db/index.ts)、[保留草稿的 auth cache reset](../lib/db/clear-user-data.ts)
- [帳號頁登出前的草稿保留說明](../components/settings/AccountSyncPanel.tsx)
- [方案無法確認時沿用既有登入視窗的入口](../components/subscription/SubscriptionFeatureNotice.tsx)
- [生命週期、到期、雙裝置與失敗測試](../tests/financial-review-drafts.test.ts)、[實際渲染存取邊界](../tests/financial-review-draft-access.test.tsx)

## 隔離驗收

`financial-review-drafts.test.ts` 使用 fake IndexedDB 與兩個獨立的資料庫，共用受權益、修訂與冪等檢查的 fake cloud：

- 快速連續輸入不被較慢寫入回滾；關閉／重開資料庫可恢復；沒有自動雲端寫入。
- `now` 跨過 entitlementEndsAt 後拒絕讀取／保存；保留輸入，合法恢復權益後可繼續。這是權益時間邊界的隔離重現，不是正式商店付款到期通知。
- 執行實際 `resetAuthenticatedCache('role_switch'／'full')`；舊 repository 失效、B 帳號看不到 A 草稿、A 回來可恢復。
- 兩份獨立資料庫：B 保存後 A 的舊修訂被拒絕；A 保留金額，須重讀與明確接受新來源才可再保存。
- 雲端已 commit 但回應遺失，重新建立 session 後只核對成功結果，不重送；保存回應途中切換帳號也不誤刪草稿或重播舊帳號操作。
- 同裝置兩視窗不可覆寫或捨棄新輸入；同修訂號但不同草稿世代仍拒絕。
- 模擬 quota/storage 失敗，禁止雲端保存，保留畫面輸入並允許本機重試。
- 原收入、成交、商品與日統計未被草稿改寫；明確 clearAllData 仍會移除草稿。

`financial-review-draft-access.test.tsx` 渲染確認到期／未解決身分／另一 owner 介面為空，渲染不觸發任何雲端操作。

既有 094 隔離 SQL 腳本 10 組通過：含 stale revision、舊回條不覆寫新紀錄、免費／其他 owner／staff 拒絕及撤回等邊界。未修改 SQL 或正式角色。

## 本機實際操作與限制

使用既有合成場次 `[配色驗收1030] 收款與回顧`（`93f96c9b-f036-498a-9046-3dddb981acbb`）；基準收入 50、成交 1、攤位費 100、已確認成本 0。

| 案例 | 結果 |
| --- | --- |
| 輸入 12、稍後繼續、重新載入、關閉分頁重開 | 金額仍是 12，沒有自動改動收入或雲端成本 |
| 另一個 origin 對同一場次保存成本 10 | 原草稿 12 仍保留；首次保存結果不明時沒有假報成功，重讀後顯示雲端 10／草稿 12，禁止直接保存 |
| 明確採用最新來源再保存 | 手動保存 12 成功，雲端 RPC 保存／回讀為 200，淨利 -62；之後透過相同 UI 還原成本 0，收入 50／成交 1／淨利 -50 |
| 獨立 `127.0.0.1:41037`、老闆草稿 13 → 登出 → 另一測試帳號登入 | 另一帳號開啟原場次顯示找不到市集，沒有展示或恢復老闆草稿；本輪未調整員工角色／會員方案 |
| 切回原老闆、重建雲端資料後繼續草稿 | 原金額 13 恢復，重新核對來源完成，只有使用者按保存才會送出；測試後只捨棄此專用本機草稿，雲端維持成本 0 |
| 原 `localhost:3000` 登出保護 | 發現 9 筆未送達照片，取消登出，沒有強制丟棄、清空照片或切換原瀏覽器帳號 |

多裝置真實操作證據來自兩個獨立 origin 的瀏覽器儲存空間與同一雲端資料庫；不是兩台實際手機。到期時間邊界由隔離權益時鐘測試覆蓋，沒有為測試而改正式方案到期日，也沒有模擬收到 Apple／Google 的正式商店通知。

截圖在本機忽略目錄：`.codex-artifacts/financial-draft-reopened-390.png`、`financial-draft-conflict-390.png`、`financial-draft-account-return.png`。最後一張的實際 CSS 視窗為 520×1125（瀏覽器縮放影響），沒有把它當成 390px 證據。

### 實測發現並修正：重新登入卡在同步失敗

帳號 A → B → A 的真實流程發現 `ConstraintError`。以本機開發診斷精準定位為 `venue_created`；唯讀雲端查詢配合全新 fake IndexedDB 重播可成功，表示不是缺少原事件。根因是 auth cache reset 清了事件，卻保留 `venues`／`operationSchedules` 投影，再次完整重播就嘗試建立已存在的 ID。

修正只把這兩張可由來源事件重建的快取表加入既有 guarded reset 的同一個 transaction；私人 financialReviewDrafts 繼續保留。沒有改成忽略所有 ConstraintError、沒有改事件 handler、沒有放寬 pending／照片檢查或改雲端資料。臨時診斷 log 已移除。

回歸先在修補前失敗（role reset 後 venue 數量仍為 1），修補後 full／role reset 都清投影，原 owner 能再次重播據點與固定安排並恢復私人草稿。實際正常登出／登入重跑後，畫面「已同步」、收入 50／成交 1／淨利 -50，草稿 13 可恢復，修正成立。

### 原本機舊分頁的登入恢復

恢復 `localhost:3000` 服務後，舊登入的 account-capabilities 回應為 401，原介面只有重試、沒有重新登入入口。補上方案 unavailable 時的「重新登入」，沿用既有 AuthManager／LoginModal，不直接登出或強制清除本機資料，也不把未知身分當成有權益。這是 UI 入口補齊，沒有改驗證 provider、token 保存、權限或付款。

實際按重新登入 → 原帳號登入後，恢復付費功能、紀錄已同步，原成本草稿 12 仍在且來源重讀成功，沒有清空未送照片。最後只透過草稿確認視窗捨棄本輪測試的 12 元輸入；兩個測試 origin 的專用草稿均已清理，雲端仍為收入 50／成交 1／成本 0／淨利 -50。未宣稱照片上傳本身在此輪全數送達。

## 最終檢查

- 16 個相關測試檔通過（15 個財務／權限／快取／現金／手機 UI 回歸，另加固定安排 local persistence）；最新草稿測試包含上述據點／排程重建案例，auth destruction guard 另重跑通過。
- 既有 094 隔離 SQL：10 組通過，不修改雲端 SQL。
- 修改檔 ESLint、mobile TypeScript：通過。
- 最終 Web production build、mobile static build 及 35 項 static segment aliases：通過。不是全 repo 測試或實機通過證明。

## 發布執行

使用者已於本批驗收後授權「提交、發布，再完成線上複驗」。目標為 GitHub `KL-4ndroid/markit` 的 main，以及 Vercel `markit-app`（`prj_dWZtQILgK88xXK0CA2x4xtH80DJN`、`team_unaNhyTnsu4mWsnTcbmShoVR`）的 Production／`markit-app-mocha.vercel.app`。發布前已 fetch，HEAD 與 origin/main 同為 `6c44cf1`，沒有分歧。

本次只提交此文件所列的草稿、權益讀取、快取修正、登入入口及測試／導航文件；既有 Demo、素材與 storage 文件不包含。沿既有 Git 自動部署，避免把本機其他未提交資料上傳。沒有新 SQL、旗標、價格、角色或付款變更。正式部署與操作結果將於下方更新後才算發布驗收完成。

iPhone／Android 實機程序終止、真實商店到期通知與兩台實際手機不屬於此 Windows 隔離／瀏覽器證據。
