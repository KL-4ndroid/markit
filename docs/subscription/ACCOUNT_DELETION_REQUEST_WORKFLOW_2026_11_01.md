# 帳號刪除第一批：申請、確認、狀態與撤回

日期：2026-11-01。使用者授權先做影響／安全評估後實作。本文件是本批唯一計畫與進度來源，承接 AD1–AD3A，不重造刪除引擎。

2026-11-02 後續：[隔離刪除引擎與驗證](ACCOUNT_DELETION_ENGINE_2026_11_02.md)已完成獨立受限實作；下方第一／二批「尚未新增 cleanup」是當時範圍。正式部署 schema、帳務保留／subject 遷移及真 R2 等 release 項目仍未完成，不能開啟正式刪除。

## 範圍與交付

沿用既有 request status、近期重新驗證、HMAC、API authentication/CORS、私人 request 表與狀態轉移 trigger。補確認／撤回 API、actor-scoped 原子資料操作草案、共用 client、手機優先操作畫面與隔離驗證。第一批不新增 worker、R2／Auth 刪除、資料凍結、正式 SQL 套用、正式啟用或原生套件。AD4／整體刪除任務保持未完成。

狀態：本批共用程式、API、操作畫面與隔離驗收已完成；未提交／發布，正式功能仍關閉。不是完整帳號刪除服務完成或 AD4／AD5 通過。

## 流程與產品決策

1. 設定→帳號與同步→刪除帳號；本批入口只在明確開啟的測試版本中出現。
2. 先讀自己的申請與這台裝置的 pending report。看不到狀態不等於沒有申請；提供重新讀取，不自動重送。
3. 清楚說明：本人品牌資料的影響、員工自刪不刪老闆品牌、刪帳號不等於取消商店訂閱、申請與完成不同。
4. 本批只接受 `clean` 的本機檢查。未送出成交、照片、心得／現金／財務草稿或同步中、讀取失敗、帳號混用都阻擋申請／確認；保留資料並提供回帳號同步、回市集處理與重查。既有 export/discard 合約保留，但本批不新增略過、假匯出或自動丟棄按鈕。
5. 明確勾選了解影響→送出申請 `requested`→重新驗證本人→最後確認 `identity_confirmed`。這是等待執行，不顯示已刪除。
6. 清理開始前可撤回；若已進入 processing／有 lease／任何清理步驟開始，拒絕撤回並重新讀取。沒有強制等待期。
7. 申請送出結果不明先查詢；同一次重試沿用同 idempotency key，重開則先 GET。確認／撤回不自動重送。帳號／session 切換及元件卸載後丟棄舊回應。

## 安全與影響評估

| 風險 | 本批處理與驗證 |
| --- | --- |
| 誤刪另一帳號／品牌 | actor 僅來自 verified bearer；client 不得指定 actor／owner／email／object key；requestId 必須同 actor，查不到一律不揭露 |
| 舊 token 借用其他裝置的最近登入 | 驗證 bearer 後只信其 session AMR 時間；不使用 user.last_sign_in_at 或 token_refresh 當成重新驗證；拒絕缺少／錯誤 sub、session、amr、過期或未來時間 |
| 確認與撤回／worker 競爭 | SQL SELECT FOR UPDATE 鎖相同 request；只允許 requested→identity_confirmed、requested/identity_confirmed→cancelled，並檢查 lease 與 step；重試回同一安全狀態 |
| 重複申請或遺失回應 | 沿用 HMAC idempotency 與每 actor 一筆 active 唯一索引；不建第二套 outbox；GET 恢復結果，不假報成功 |
| 待送資料或私人草稿遺失 | 讀取既有 pending report，補財務草稿檢查；每次申請／確認重新查，不自動 sync、export、discard 或 clear |
| 畫面說已完成但實際未清理 | 狀態使用既有 status enum；identity_confirmed 顯示已確認待執行；failed/manual review 仍明確顯示未完成 |
| 錯誤、憑證或個資外洩 | 狀態只傳既有 safe status；錯誤只固定 code；密碼只用於 provider 重新驗證、不送刪除 API／持久化／log |
| 意外接到正式 Supabase | 本批 runtime gate 預設關閉，拒絕部署環境及非 loopback 的 Supabase；新 UI 另需 TEST_TOOLS＋公開明確旗標。隔離 harness 不載 .env、不連雲端 |
| 費用／訂閱誤解 | 刪帳號不取消 Apple/Google 扣款；不要求先退訂才可刪；不實作取消／退款或保留期新政策 |
| 原生不相容 | 純 TS 契約／client／判讀共用；API 沿用可配置 HTTPS base、外部連結使用 lib/platform port；測試工具留 scripts，不進產品 domain |

延後：本機清理與多裝置殘留、真實 worker/R2/計費身分分離、公共網頁入口、正式啟用、商店與真機驗證。不能把 source 檔存在當成上架 gate 完成。

## 實作順序與停止條件

- A：共用請求契約、session-bound reauth、嚴格 local-only gate。
- B：確認／撤回 handler 與 storage adapter；SQL 只放 drafts、預設 ROLLBACK，不建立正式 migration。
- C：共用 client、設定入口與手機操作畫面；狀態／pending／錯誤與返回路徑。
- D：隔離 SQL 驗證跨 actor／競爭／終態、路由與 client 故障測試、同一產品元件的手機隔離操作；必要的 Web／手機建置與邊界檢查。

完成條件：可在隔離環境走過申請→確認→撤回、重開查詢、未送資料阻擋、錯誤不假成功、跨帳號與處理中撤回拒絕；正式環境仍不可用。完成這些即結束本批，不重跑登入效能、PDF 或既有三角色矩陣。

## 外部要求核對

2026-11-01 核對官方資料，只作產品設計依據，不宣稱本批符合完整審查／法務要求：

- [Apple：帳號刪除](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)：入口容易找到、流程清楚、區分申請與刪除並說明訂閱處理。
- [Google Play：帳號刪除](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)：App 路徑與公開網頁資源；本批不把 gated 測試頁當成公開資源。
- [Supabase JWT claims](https://supabase.com/docs/guides/auth/jwt-fields)：sub/session_id/amr 為 session 證據；token_refresh 不是本批接受的互動式重新驗證方法。

## 實作與驗收紀錄

| 階段 | 結果與來源 |
| --- | --- |
| A 共用契約／重新驗證 | `account-deletion-api-contract.ts` 增加嚴格 action body；`account-deletion-request-workflow.server.ts` 在 Auth 驗證同一 bearer 後，取該 session 的 AMR，拒絕 token_refresh／錯誤 sub／缺失 session；既有 5 分鐘／未來時間限制沿用。未改全站 Auth 行為。 |
| B API／SQL | 沿用根 API 與 storage repository，增加 confirm／cancel；SQL 草案只放 `drafts/` 且預設 ROLLBACK。相同 row lock 串行化撤回與 lease，cross-actor 不揭露。read RPC 草案可讀回自己的已撤回結果。未套用雲端。 |
| C 操作畫面 | `/settings/account/deletion` 與 `AccountDeletionPanel`，入口 gate 同時要求測試 build、明確公開旗標與 loopback DB；本人 session 變動立即隱藏舊狀態，延遲回應不能覆蓋新帳號。待送資料重新檢查、不丟棄；財務草稿只加刪除專用檢查，不改一般登出的草稿保留規則。 |
| D 驗收 | 以下自動與實際操作證據完成；不重跑登入效能、PDF 或角色管理矩陣。 |

### 自動驗證

- 7 個相關測試檔通過：新 request-workflow、既有 implementation-proposal、AD1 contract、AD2 foundation、AD3A migration/repository、AD4 readiness、settings-navigation。新測試已加入 `scripts/test-files.txt`。
- 涵蓋匿名／跨 actor、stale proof、舊 AMR 搭配新 token_refresh 仍拒絕、嚴格 body、重複申請、確認／撤回狀態衝突、撤回後重讀、financial draft／照片／讀取失敗／離線／同步中阻擋、遺失回應後只讀恢復、格式錯誤成功回應視為結果不明、預設 route 關閉。關閉分支以帶 RoleProvider 的元件渲染驗證，不把缺少 provider 的測試錯誤當成產品錯誤。
- `scripts/verify-account-deletion-request-workflow.mjs --isolated`：11 組真實 PostgreSQL 檢查通過。使用現有 Docker Desktop 的獨立 `postgres:17-alpine`，無網路、無 host port、無 workspace mount、不讀 `.env`；結束移除該精確生成的容器及其匿名 volume。
- SQL 包含 owner／staff self-request、cross-actor、同 key 冪等／每人一筆 active、終態、ACL、任何清理 step 已開始即拒絕撤回、**兩個獨立 psql session** 的撤回先／lease 先雙向競爭。沒有執行任何 cleanup step、Auth／R2／計費刪除或正式資料寫入。
- mobile TypeScript、專用 `tsconfig.account-deletion-workflow.json`、修改來源及隔離工具 lint 通過；scripts 另以 `--no-ignore` 檢查。Web production build 與 mobile static build／verify／smoke 通過；手機最終產物為 36 個 segment aliases、385 個檔案、20.15 MiB。
- AD4 readiness 仍阻擋 authenticated entry／confirm／cancel 的正式資格；來源存在不代表 runtime 已發布，整體 launch task 不改成 complete。

### 實際手機尺寸操作

使用 `npx.cmd tsx scripts/serve-account-deletion-workflow.ts 41080` 的 loopback-only harness；沿用產品同一個 Panel／client／實際 route handler factory，只有 auth／repository／裝置檢查是明確的合成 fixture。沒有載入真實帳號、雲端密鑰或 R2，CSP 只允許同源連線。測試密碼 `synthetic` 不是使用者的密碼。

| 情境 | 實際結果 |
| --- | --- |
| 待送照片／草稿 | 勾選了解影響後，提出申請仍 disabled；原資料不捨棄。 |
| 提出申請後遺失回應 | 顯示結果尚待確認、隱藏寫入按鈕；重新 GET 找到同一 requested，不自動重送。 |
| 過期重新驗證 | confirm 被拒絕，顯示本人驗證；驗證後仍需手動讀回與再按確認。 |
| 確認 | 顯示「已確認，等待處理」及尚未完成刪除，不顯示成功刪除。 |
| 有待送資料仍撤回 | 允許撤回；重開分頁後保持 cancelled；沒有清除 pending。 |
| session 切換與舊回應 | 刻意延遲老闆的 GET，再切到合成員工；延遲回應返回後，員工仍是自己無申請的狀態；回老闆可讀回自己的申請。 |
| 已開始處理 | 合成 processing 顯示無法撤回，沒有撤回按鈕；實際 SQL 也拒絕同情況。 |
| 版面 | CSS 390×844、scrollWidth 390；主要重讀／提出按鈕高約 45.6px。瀏覽器縮放下座標點擊有工具偏移，實際流程以可存取鍵盤操作；不宣稱 iPhone／Android 觸控或真實 provider 重新驗證通過。 |

截圖：`.codex-artifacts/account-deletion-withdrawn-mobile.jpg`。已關閉本輪分頁及 41080／41081 臨時伺服器，還原裝置尺寸；原有 3000 與使用者分頁未關閉。

### 正式模式仍關閉

本機 `next start` 的 Production 模式實際 GET `/api/account-deletion`、POST `/confirm`、POST `/cancel` 均為 **501／no-store／account_deletion_disabled**，在初始化資料 repository 前拒絕。`/settings/account/deletion` 匿名 GET 是 200 的 AuthGuard shell，不包含登入後文案；已修正最初把匿名 SSR 當成頁面內容的檢查假設。UI 關閉分支另以元件渲染確認沒有密碼欄位或提出申請按鈕。

證據（忽略於 Git）：`.codex-artifacts/account-deletion-workflow-sql.log`、`account-deletion-workflow-types.log`、`account-deletion-workflow-harness-types.log`、`account-deletion-workflow-lint.log`、`account-deletion-workflow-web-build.log`、`account-deletion-workflow-mobile-build.log`、`account-deletion-workflow-mobile-verify.log`、`account-deletion-workflow-mobile-smoke.log`、`account-deletion-workflow-production-closed.json`。

### 本批之後仍缺的工作

真正 cleanup executor、計費身分分離、R2 absence、Auth 最後刪除、production migration／rate limiting／監控、OAuth／原生重新驗證操作、公開刪除資源、精確保留揭露與商店／實機證據仍未完成。第一批當時的 UI→handler→合成 repository 與真實 SQL 鎖驗證為分開證據；真實 Supabase Auth→PostgREST 整合已由下方第二批補齊，不再當成未完成任務。root default runtime 多一層 local-only gate，舊 production allow flag 不能繞過；未修改正式環境設定。

撤回只針對目前 requestId，不會代替另一裝置撤回後重新提出的新申請；使用者可重新讀取最新狀態。未完成結果不得當作已刪除，也不在本批自動清除裝置快取。

正式資料、角色、方案、照片及既有待送佇列均未變更。使用者本輪不需手動執行 SQL；後續若進入真正刪除的範圍，另依已定計畫確認實際影響及環境，不以本批隔離通過直接開啟正式刪除。

## 第二批：真實本機 Supabase 整合（2026-11-01）

使用者接受「真實 Auth→API→私人資料表→同一畫面」的下一個範圍。只補上一批合成 repository 以外的整合證據，不重跑競爭／效能／PDF 矩陣。

計畫：使用獨立 workdir 與專案 `deletion-request-real-20261101`，僅本機 API 55381、DB 55382、驗收頁 41082；沿用快取 CLI 2.116.0，不更新專案套件、不載正式 `.env` 或連結雲端。只配置 Auth、PostgREST、Kong、DB，套用最小合成品牌／員工基礎加既有 071 及 ROLLBACK 草案的本機提交副本；不重建正式完整歷史。

初步核對：CLI 預設把端口綁所有介面，建立帳號前已停止新 DB／Kong 並保留同一測試 volume，重建為 **127.0.0.1 only**。只有確認 workdir／label／端口／本機 URL 後才允許 admin 建立合成帳號。CLI status 的本機 secret／publishable key 只進忽略於 Git 的私人檔案與 server 記憶體，不輸出或打包 secret。

驗收：真實登入、申請／確認／撤回；API 與 DB 重啟後讀回；staff 不能 confirm／cancel owner request；匿名、直接資料表與 client RPC 拒絕；把合成 session AMR 時間調舊後透過真實 refresh 取新簽章 token，確認仍拒絕 stale proof；本人重新登入後可繼續。保留所有 operational/Auth 資料、不啟動 worker／任何 cleanup step。

停止條件：上述新增邊界通過即結束；正式 migration、正式啟用與真正刪除仍不在範圍。**狀態：本批已完成，未提交／發布。**

### 真實整合結果

新增的 `scripts/lib/account-deletion-local-supabase.ts` 核對本機 Docker context、精確 project／workdir labels、API／DB 的 loopback bindings 及 CLI URL／modern key 型態後才允許合成資料初始化。`scripts/serve-account-deletion-supabase.ts` 直接呼叫產品匯出的 GET／POST／confirm／cancel，沒有注入假的 auth 或 repository；`supabase-browser.tsx` 使用真實 Supabase SDK、裝置 pending report 及產品同一個 Panel／client。只以最小合成 schema 支援目標流程，不冒充整個 App 的全站整合測試。

`scripts/verify-account-deletion-supabase.ts` 的四階段共 **16 項新增整合檢查**通過：

| 邊界 | 實際證據 |
| --- | --- |
| Auth／API／PostgREST／DB | 本機 GoTrue 以密碼登入，簽發真實 JWT；原本的 API 與 storage repository 以 `sb_secret_` 呼叫 service-only RPC，202 requested，重複同 key 回同一 request。沒有修改 key 驗證或放寬 SQL grant。 |
| 存取限制 | 匿名 API 401；staff token confirm／cancel owner request 都 404；真正 authenticated 直接讀私人表／呼叫 confirm RPC 為 42501；modern secret key 直接讀表也被 SQL grant 拒絕，僅允許窄 RPC。 |
| staff 自己的申請 | 真實 staff Auth 自己建立、撤回，DB `account_kind=staff`，不改 owner request。 |
| DB 重啟 | 只 restart 指定 disposable DB，重新登入同一身分後 GET 仍讀回相同 requested ID。 |
| API 重啟 | 關閉再啟動 41082 API process，沒有 in-memory repository；GET 同一 request ID／requested，證明狀態不靠 server 記憶體。 |
| stale proof／token refresh | 只把合成 session 的 AMR 置為 10 分鐘前，再透過真實 Auth refresh 取得新簽章 token；confirm 409 `recent_reauth_required`。是可控時間邊界，不是等待真實時間經過或假造 JWT。 |
| 不借用另一 session 的登入 | 同帳號另一次真實 sign-in 後，舊 bearer 的 confirm 仍 409；新 bearer 才能確認。 |
| confirm／cancel | 新 bearer confirm 200／identity_confirmed；stale expectedStatus 撤回 409；正確狀態撤回 200／cancelled，GET 保留結果。 |
| 資料保留 | 自動檢查及瀏覽器完成後，Auth users 2、profiles 2、合成 markets 1、staff relationship 1，startedCleanup 0；最終 3 筆申請皆 cancelled，沒有透過引擎執行任何資料清理。 |

### 真實手機尺寸操作

在新建的 `127.0.0.1:41082` origin、CSS 390×844、scrollWidth 390，實際走過：本機 Auth 登入→POST 202 申請→把合成 AMR 調舊並真實 refresh→確認遭拒與重新驗證提示→在產品密碼欄輸入合成帳號密碼→真實 sign-in→手動確認→identity_confirmed→手動撤回→重開分頁並再次登入→讀回 cancelled。

所有登入、重新驗證、API 與 DB 都是真實本機服務，非第一批 simulator。原 App `127.0.0.1:3000`、正式站及其帳號／照片／草稿沒有操作。手機尺寸流程使用可存取鍵盤操作，不宣稱原生觸控、相機或商店驗收。商店管理按鈕未實際開啟。

截圖：`.codex-artifacts/account-deletion-real-supabase-mobile.jpg`；安全證據：`deletion-real-acceptance.json`（四階段／16 項）、`deletion-real-final-preservation.json`（`2026-11-01T14:40:19.972Z` 最終計數）、`deletion-real-api.log`（只含 method/path/status）。證據不含密碼、JWT、完整 account ID、email 或 server key。

### 本輪檢查與清理

專用 TypeScript 與四個新增工具／UI 的 `eslint --no-ignore` 通過；整合畫面以 production-optimized esbuild bundle 執行。產品 API／Panel／client／SQL 本輪沒有修改，沿用上一批 Web／mobile 建置及其他矩陣，不重做首次登入效能、PDF、競爭鎖或三角色驗收。

已關閉測試分頁與 41082 process、還原 viewport；`supabase stop --no-backup` 只針對驗證過的獨立 project，移除其容器與合成 DB volume，另移除空的專用 network。本機 key／HMAC／identity checkpoint／含憑證的 CLI 暫存日誌均已移除；保留不含憑證的 config 與驗收證據。這是銷毀可丟棄測試環境，不是透過產品刪除引擎執行正式帳號刪除。

來源：[Supabase 本機開發](https://supabase.com/docs/guides/local-development/cli/getting-started)、[API key 與本機 modern keys](https://supabase.com/docs/guides/getting-started/api-keys)。本機使用 publishable／secret key，沒有為方便測試引入 legacy key fallback 或降低正式安全限制。

這個真實整合缺口現在結案。正式 cleanup、production／public resource、商店與實機項目仍按原界線保留，不能用本批結果開啟正式刪除；本輪不需使用者手動操作 SQL。
