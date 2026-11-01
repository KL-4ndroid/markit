# 正式版發布整理與驗收去重

日期：2026-11-01。範圍：測試／救援入口、未完成入口與測試資料清冊。這不是另一輪首次登入效能優化，也不代表全站、所有角色或手機實機驗收完成。

狀態：程式 `426e485` 已提交、推送及正式發布，最小範圍線上確認通過。本機與發布前正式站 `49296dc` 的證據保留為歷史對照；最新結果見「正式發布與最小線上確認」。

## 沿用的完成證據

| 已結案批次 | 程式版本 | 本輪處理 |
| --- | --- | --- |
| 財務一致性／成本核對啟用、有限時間差 | `f126e99`／`efd6a67` | 沿用[正式發布與 PDF 證據](FINANCIAL_PRODUCTION_RELEASE_2026_10_31.md)；不重驗成本保存或 PDF |
| 私人核對草稿／帳號隔離／衝突 | `bd9acca` | 沿用[草稿生命週期](FINANCIAL_DRAFT_LIFECYCLE_2026_10_31.md)；不重做帳號切換 |
| 首次財務／成交讀取恢復 | `8b42c1b` | 沿用[讀取恢復](FIRST_LOGIN_READ_RECOVERY_2026_11_01.md)；不重做斷線注入 |
| 大量歷史下載與相同事件不重寫 | `71db0e3` | 沿用[下載優化](FIRST_LOGIN_LARGE_HISTORY_PERFORMANCE_2026_11_01.md)；不再量測下載 |
| 手動收入／互動批次重播 | `9c7cba7` | 沿用[重播量測及正式複驗](OWNER_REPLAY_PROJECTION_PERFORMANCE_2026_11_01.md)；不再跑 5,000／20,000 筆 |

每批部署後的相同金額、明細返回與手機寬度確認屬於該版回歸證據，不算新功能。文件更新不觸發整批重測。大型混合事件的整段登入計時保留為後續效能驗收項，沒有新瓶頸或規模需求前不自動另開優化批次。

## 入口盤點與實作

| 入口 | 發布前實際狀態／規則 | 本輪結果 |
| --- | --- | --- |
| `/debug/flicker-test`、`/debug/staff-role-test`、`/debug/sales-photo-evidence` | 正式站 GET 均 404／no-store；既有 server layout＋proxy | 沿用，不新增開關 |
| `/recovery`、`/settings/data` | 正式站 GET 均 404／no-store；既有產品 release channel 控制 | 沿用，不撤掉同步／復原底層 |
| `/tools/market-text-import-lab` | 正式站 GET 200；所有老闆在「App 與版本」可見，原先只有 owner／fresh authorization 限制 | 修正：沿用 `TEST_TOOLS_ENABLED`；正式版隱藏連結、server layout 阻擋、proxy 真正回 404；手機靜態匯出排除目錄 |
| `/api/dev/subscription-simulation`、`/api/dev/subscription-price-foundation-smoke` | 正式站 GET 均 404／no-store，部署拒絕先於身分驗證 | 沿用；本機指定測試帳號的 082 工具與 allowlist 不變 |
| 新增市集內的文字解析 | 另有市場文字解析 release gate，不是研究實驗室 | 保留現有規則，不因隔離研究入口撤掉產品功能 |
| 外觀設定 | 已正式開放的主題選擇功能 | 保留，不因舊檔名含 `theme-lab` 而當作測試功能 |

設定沿用 [測試工具版本界線](TEST_TOOLS_RELEASE_BOUNDARY.md)：本機開發預設保留、明確 `FERIA_RELEASE_CHANNEL=test` 保留、正式版及其他未知明確值關閉。測試版實驗室仍須原有 owner／fresh authorization 檢查；不以測試版本取代使用者權限。

新增 layout 與 proxy 只處理路由／呈現，沒有新增平台 API、資料模型、權益、付款、SQL 或雲端 writer。手機匯出沿用既有已驗證路徑與符號連結拒絕規則，只多排除實驗室目錄。

## 未完成入口的分類

- 成交詳情「編輯功能即將推出」已在 `f126e99` 移除，本輪搜尋正式 app／components 未發現同文案的殘留入口；成交更正保存仍屬未實作功能，不把隱藏按鈕當成已完成更正。
- 訂閱／服務條款／支援頁的「尚未開放付款」保留：是目前事實與必要揭露，不補假購買、取消或退款按鈕。
- 縣市補填、固定安排縣市、心得待辦等 rollout 關閉時的準備／不可用訊息保留：由相應 feature gate 決定，不憑搜尋字串批次刪除。沒有在此輪重新跑全部 flags 或雲端啟用矩陣。
- 待送照片、未完成草稿、來源讀取失敗的提示及恢復入口保留；不可為了介面乾淨而清除待送資料。
- Demo／素材為既有獨立工作，本輪不檢視、不修改、不提交。

## 測試資料

使用普通測試老闆 `123@123` 的獨立、無持久 session 登入，核對同一 Supabase 專案後，只讀該 owner 的市集／商品 `id,name` 並完整分頁；不使用 service role。查詢未讀取成交 payload、照片內容或其他帳號資料，也沒有改角色、方案、登出既有瀏覽器或送出資料操作。

`2026-11-01T08:46:21.356Z`：可見 41 場市集、9 個商品；26 場與 3 個商品有明確測試前綴，其餘 15 場／6 個商品保持未分類。完整 ID 清冊見 [測試資料清冊](TEST_DATA_INVENTORY_2026_11_01.md)。

分類只用來盤點，不是刪除授權。固定安排同名可能是多個合法 occurrence；成交、庫存、現金、心得、財務核對及照片均可能有關聯，不做直接資料表刪除，也不新增一套清理 writer。原有待送照片不在本輪雲端清冊範圍。

## 本輪驗證

只跑本次受影響的路由、release gate、靜態打包與入口 guard，不重跑已完成的登入、角色、財務或效能全矩陣。

| 檢查 | 結果 |
| --- | --- |
| 5 個相關測試檔 | test-tools-release-boundary、market-text-import-lab、web-production-surface-boundary、market-text-import-gate9-release、settings-navigation 全部通過；沿用既有測試檔擴充本次邊界，未另造測試框架 |
| 型別與 lint | mobile TypeScript、修改 TS／TSX 及 Web／匯出 scripts 的 lint 通過 |
| Web 正式建置 | `npm.cmd run build` 通過；只是本機工作樹建置，不是新部署證據 |
| 實際本機正式回應 | `next start` 暫時綁定 `127.0.0.1:41060`；實驗室與 `/review` 子路徑 404／no-store／noindex，尾斜線先標準 308 後到 canonical 404；救援／資料工具及 dev GET 仍 404；`/settings/app`、`/markets` 公開 HTML shell 200，未宣稱再次完成登入操作 |
| 手機正式產物 | `build:mobile`、`verify:mobile`、`smoke:mobile` 全部通過；33 個 segment aliases、371 個靜態檔案、20.03 MiB；靜態主機實驗室網址 404、11 個既有資產／路由成功 |
| 清理 | 已停止本輪 41060 臨時正式伺服器；原有 3000 開發服務仍監聽，未關閉使用者分頁或改待送資料 |

發布前正式站的 8 個 GET 基準只確認當時版本與入口隔離，不操作 Demo、不跑購買／角色切換或寫入探針。當時尚未部署修正，實驗室為 200；下節已確認發布後改為 404。

證據（忽略於 Git）：`.codex-artifacts/release-cleanup-production-baseline.json`、`release-cleanup-inventory.json`、`release-cleanup-local-routes.json`、`release-cleanup-web-build.log`、`release-cleanup-mobile-build.log`、`release-cleanup-mobile-verify.log`、`release-cleanup-mobile-smoke.log`。

## 正式發布與最小線上確認

- 程式：`426e485fa76840bad4358f99589cd4d7ff61db0c`，已推送 `KL-4ndroid/markit` 的 main；17 個本批檔案，既有 Demo／素材變更保留在本機。
- Vercel：`markit-app`／`prj_dWZtQILgK88xXK0CA2x4xtH80DJN`／既定 team `team_unaNhyTnsu4mWsnTcbmShoVR` 的 Production，部署 `dpl_2EYbpTJkfmpKqzGw2ih712RQsrEH` Ready，Git SHA 相同、主要 alias 已指向新部署。
- 正式網域 `https://markit-app-mocha.vercel.app/api/health`：healthy、`commitSha:426e485`、buildTime `2026-11-01T09:13:56.386Z`。
- `2026-11-01T09:15:25.2852355Z` 完成以下公開 GET。只記狀態與標頭，不登入、不操作資料，不重跑登入效能／PDF／角色／財務驗收。

| 路由 | 正式結果 |
| --- | --- |
| `/tools/market-text-import-lab`、尾斜線、`/review` 子路徑 | 全部最終 404、no-store、noindex/nofollow |
| `/recovery`、`/settings/data`、抽查 `/debug/staff-role-test` | 404、no-store、noindex/nofollow |
| `/settings/app`、`/markets` | 公開 HTML shell 200；不擴張宣稱完整登入後操作皆重驗 |

線上證據：`.codex-artifacts/release-cleanup-production-acceptance.json`。本節為發布後文件收尾，執行碼不再變動；文件提交部署後只確認 Ready 與主要 health 版本，不重跑上述路由或其他矩陣。本批實作與線上部分結案。

## 完成條件與後續界線

本批以實驗室入口／網址／手機打包有一致版本隔離、測試資料有明確清冊、既有成果可直接引用為完成條件。不因仍缺 iPhone、正式付款或大型整段計時就重新開啟已結案效能任務。

提交發布後只需核對正式版本及上述受影響的公開路由；不重跑完整登入／PDF／角色矩陣。清理資料、正式付款與原生實機各有獨立工作範圍，本批不擴充。
