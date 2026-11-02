# 後續收尾進度：財務一致性、線上與 iOS 前置

## 2026-11-02 整合候選：同版 22 組通過，正式資格仍未齊

[唯一整合交付／結果／未完成清單](subscription/ACCOUNT_DELETION_INTEGRATED_DELIVERY_PLAN_2026_11_02.md)。同張照片真讀回／零重複 PUT、最小 unknown 審查清單、進度校正、SQL 指紋套件與公開草案頁完成；真 GoTrue／PostgREST＋captured SQL＋既有 handler＋loopback S3 共 22 組通過，清理合成 owner 十步及 Auth hard delete 驗證。正式可重跑 migration、遠端整套與 unknown／legacy 正式處置仍需工程，備份／客服承接待外部確認；候選部署不等於 production 刪除開放。以下歷史「下一步」以本次集中清單為準，不要求重跑既有 Web／PDF 大矩陣。


## 2026-11-02 商品／成交 handler 回條接入：本機 16 組通過

[本批結果與下一步](subscription/ACCOUNT_DELETION_PHOTO_HANDLER_RECEIPTS_2026_11_02.md)：兩個既有 handler 以預設關閉的 receipts gate 使用單次 writer；成功、補償失敗、未知 PUT、finalize／ack 遺失、412 保護及回應前 freeze 共 14 條分支，加設定邊界與單筆核對共 16 組整合通過。實際 claim／finalize／freeze SQL 與 loopback S3 SDK 執行，auth／plan gate 為測試注入。只清理本次已確認建立的物件；已提交成功照片保留，其他 unknown attempt 仍阻擋清理。舊 handler／coordinator 回歸、TypeScript／lint／Web build 通過，容器與 HTTP server 清理。沒有 staging／正式照片、雲端 SQL／Auth／設定變更，未提交發布，正式刪除仍關閉。下一步補同張照片的安全讀回／重送，避免已成功但持續重試；再處理正式 migration／target／所有 producers 強制接入。

## 2026-11-02 單次 PUT 回條：HTTP／SQL／真 staging R2 通過

[本批證據與界線](subscription/ACCOUNT_DELETION_TERMINAL_PUT_2026_11_02.md)：原 upload registry 上新增單次 create-only SDK PUT、intent／成功回條、target 指紋與 DB-backed drain。5 組真 loopback HTTP／SDK／SQL 及 3 組真 staging R2 通過，包含 freeze 後完成、SQL ack／producer HTTP 回應遺失、假 digest／錯誤 target 拒絕。未知 R2 回應即使 HEAD 404 或逾期仍不放行。唯一 staging marker 已 DELETE／HEAD 確認不存在，兩個隔離 DB／HTTP servers 清理；相關型別／lint／單測通過。正式商品／成交 handler 尚未接入，新 writer 拒絕 production bucket；未改正式資料、雲端 SQL／Auth／設定，未提交發布，正式刪除／AD4 保持關閉。下一步接入兩個既有 handler 的本機預設關閉模式；不重跑既有 Web／PDF／效能／帳務大矩陣。

## 2026-11-02 uncertain 核對與恢復：隔離核心完成

[本批流程與限制](subscription/ACCOUNT_DELETION_UPLOAD_RECONCILIATION_2026_11_02.md)：重用 upload registry／凍結／原 manifest，新增內部 prepare／commit、可信停止證據契約、逐 key 觀察、metadata CAS 與原子回條，解除經核對的單筆阻擋。10 組真實隔離 SQL 包含雙連線競爭、等待鎖時到期、真 finalize 成功但回應遺失、核對 ack 重試及員工跨品牌保留；相關單測／TypeScript／ESLint 通過，容器移除。未綁定／舊版未知 claim 仍須審查；正式停止證據 adapter 未實作，fixture 不能用於正式解除。無雲端 SQL／R2／Auth／設定變更、未提交發布，正式刪除維持關閉。下一步是可查驗的 producer 終止證據及真 HTTP＋staging R2 整合，不重跑既有 SQL／效能／Web／PDF 大矩陣。

## 2026-11-02 在途上傳／凍結協調：本機修補完成

[本批紀錄](subscription/ACCOUNT_DELETION_UPLOAD_BARRIER_2026_11_02.md)：商品／成交上傳在 claim 前登記，逐 PUT／finalize 授權；凍結後等待已發出的 PUT 結束，manifest 納入舊／新 key。未知結果、過期 open attempt 及補償失敗皆不自動放行。員工刪帳保留其他品牌的 key、移除 actor 歸屬。另修正商品舊圖清理失敗誤刪新圖及同 key replay。8 組真隔離 PostgreSQL、商品 9 handler 情境、成交既有 28 加新 6 情境、相關單測／TypeScript／ESLint／Web build 通過。R2 為 deferred/stub，沿用前批真 staging 證據；未改雲端 SQL／正式照片／設定、未提交發布，正式刪除仍關閉。下一步為 uncertain 核對／恢復，之後才審查 production 接入與真 HTTP＋R2 競爭；不再重跑既有大矩陣。

## 2026-11-02 真實 staging R2：8 組完成，測試物件已清除

[驗證與限制](subscription/ACCOUNT_DELETION_R2_LIVE_STAGING_2026_11_02.md)：staging 專用 exact-key／run metadata probe 建立 3 個 marker，真實 HEAD／conditional PUT 412／錯誤簽章 403／DELETE／404、原 executor 搭配 fixture 租約與 ack 遺失、跨 actor 保護通過。最後所有嘗試建立的 key 均確認不存在；沒有正式照片、SQL、Auth 或權限變更。原 adapter 仍 loopback-only，正式刪除仍關閉。已驗證不存在的 key 仍可被有寫權限的 client 重建，故下一批聚焦既有 server PUT 在凍結後完成的競爭；不把本批當成整體刪除／Gate 2／AD4 完成。既有 SQL、Web／PDF／登入效能矩陣不重跑。

## 2026-11-02 R2 唯讀盤點：本機配置已查，正式目標仍待確認

最新續記：[Cloudflare 實體清單比對](subscription/ACCOUNT_DELETION_R2_INVENTORY_2026_11_02.md#最新結果cloudflare-登入後的實體物件比對)完成：`markit-media-production` 有 4 個物件，全部對應 DB、無未到期引用不符／無引用物件；18 個未列出的 key 全已過期，不能誤報成目前照片遺失。已確認成交原圖／縮圖 7 天刪除及 multipart 7 天中止規則，未修改設定。API credential 對 production 為 403，使用合法登入 dashboard 清單＋同一分析器比對，不讀金鑰、不擴權、不下載照片。部署 Secret 值、production multipart／HEAD／備份及真刪除仍未完成；下一個獨立切片為 staging 可丟棄前綴真 R2 測試。下段為前一次登入前歷史。

後續管理頁核對已確認：使用者完成 Vercel 二次驗證後，共用 endpoint 與本機一致；pre-production bucket 明確為 `markit-sales-photo-staging`，也與本機一致。Production bucket 仍是不可讀回的 Secret，不能用 staging 空桶推定正式照片狀況。對應 Cloudflare R2 管理頁已開啟，目前需使用者登入或提供非密鑰的正式 bucket 名稱。沒有下載環境檔、讀密鑰或改設定。原始碼也確認現有照片走 server PUT，不應把尚未實作的 presigned URL 工作列成現階段必做；下一批應聚焦現有上傳 lease 的凍結競爭。

[本批結果與限制](subscription/ACCOUNT_DELETION_R2_INVENTORY_2026_11_02.md)：完成有界 metadata／R2 objects／multipart／HEAD 比對工具及針對性測試。DB 1 筆商品照片＋10 筆成交照片 uploaded、22 keys；本機配置指向的 R2 完整列舉為空，10 個抽樣 HEAD 404，lifecycle 403。正式部署目標尚未核對，不能宣稱照片遺失或孤兒清理完成；正式環境設定下載操作遭自動核准審查拒絕。未刪照片、未改配置／權限、未啟用正式刪除；下一步先確認正式 bucket／endpoint 及唯讀資訊，再沿用同一工具。既有 SQL／帳務／Web／PDF／效能矩陣不重跑。

## 2026-11-02 刪除引擎第四批：完整來源存取凍結隔離完成

[134 函式／5 檢視／45 原觸發器與相容性紀錄](subscription/ACCOUNT_DELETION_ACCESS_FENCE_2026_11_02.md)：逐一分類與 outer guard、保留員工金額遮罩、精確 lease／actor／next-step、匿名化例外及存取 manifest，19 組營運／權限與 16 組帳務整合通過。TypeScript、純邏輯／生成器及 ESLint 通過，容器已清除；未重跑 Web／PDF／登入效能或真 Auth／R2。另既有 snapshot RPC 跨帳號隱私風險以 095 獨立修補，已套用雲端並核對定義／權限，未讀取快照內容或執行清理。其餘凍結 SQL 仍 local-only、未提交／發布；正式刪除仍關閉，AD4 ready=false、13 blockers。不需使用者手動 SQL。下一個切片為真實 R2 範圍／孤兒／在途物件證據；直接 service-role 基表查詢及 managed Auth trigger 等完整發布整合仍待驗證。

## 2026-11-02 刪除引擎第三批：帳務分離／保留到期的隔離切片完成

[實作、安全界線與 14 組結果](subscription/ACCOUNT_DELETION_BILLING_ENGINE_2026_11_02.md)：沿用最小化契約，實作 private subject-only 保留區、prepare/stage/detach、來源 hash 變更拒絕、原 ledger guard 的受限 DELETE 例外與整批回復；provider ref 退役／key version、來源指標分類與 absence 回條、明確 review、legal hold／revision／DB-clock purge／冪等回條也已完成隔離驗證。既有 7 組營運回歸及純邏輯、TypeScript、ESLint 通過。未執行雲端 SQL、真商店扣款／取消、真 blob／vault 或公開 worker；後續通知的匿名帳務 ingress、所有 RPC/view/trigger fence、原生商店及正式發布仍未完成。下一個切片是 RPC/view 凍結相容性，不重跑已完成帳務矩陣。未提交／發布，不需手動 SQL。

## 2026-11-02 刪除引擎第二批：部署結構對照與營運清理

[新實作與分開列示的未完成項目](subscription/ACCOUNT_DELETION_OPERATIONAL_COVERAGE_2026_11_02.md)：已透過 Supabase SQL Editor 唯讀取得 40 表／5 view／134 函式，建立 45 relation 分類與真欄位／FK／CHECK fixture，補 archive、snapshot、雲端 pending、邀請、範本、心得、盤點、財務核對及固定安排清理順序。7 組新 SQL 案例、原 engine 10 組回歸、帳務最小化／跨帳號／null actor 測試、工具型別與 ESLint 通過。沒有雲端 DDL/DML 或正式 worker。帳務 detach／purge 仍待實作，本批只有專用 subject／HMAC 輸出契約；全部 RPC/view/投影 trigger fence、真 R2 與正式發布仍未完成。未提交／發布，不需手動 SQL。已完成的 public catalog／營運切片不再重開。

## 2026-11-02 刪除引擎：隔離版完成，正式站保持關閉

[設計與 10 組新整合結果](subscription/ACCOUNT_DELETION_ENGINE_2026_11_02.md)：沿用 saga 建立逐步執行層、資料庫 lease fence／收據、每批 20 個物件進度、員工匿名化及 Auth 最後刪除。真實可丟棄 PostgreSQL／GoTrue 通過員工與老闆刪帳、session 清除、遺失回條、部分物件失敗、403 不冒充 absence、交易回復、跨 owner 保護、帳務／未知 schema 停止與 DB 重啟。S3 是 loopback HTTP 協定替身，未使用真 R2；isolated schema 明確拒絕正式 DB，沒有新增正式 worker／排程。尚須實際 catalog 逐表補齊、帳務保留與 subject 遷移、真 R2／孤兒物件及全部 API fence，AD4 仍 ready=false。未提交／發布，不需要手動 SQL。原有申請整合維持結案，未重跑效能／PDF／UI 矩陣。

## 2026-11-01 帳號刪除第二批：真實本機整合完成，未正式啟用

[同一計畫的真實整合結果](subscription/ACCOUNT_DELETION_REQUEST_WORKFLOW_2026_11_01.md#第二批真實本機-supabase-整合2026-11-01)：真實本機 GoTrue→產品匯出 API→PostgREST→私人申請表→同一手機面板已串通。16 項新增整合檢查包含 DB／API 重啟持久性、跨 actor／grant 拒絕、真實 refresh 的 stale AMR 拒絕、同帳號新登入不能替舊 bearer 更新證據、confirm／cancel／重開。Auth／profile／合成市場與員工關係數不變，cleanup 未開始；獨立測試服務及 private keys 已清理。產品 runtime 無新改動，沿用上一批建置；不重跑效能／PDF／鎖競爭。未提交／發布，不啟用正式刪除，不需要手動 SQL。

## 2026-11-01 帳號刪除第一批：本機／隔離完成，未正式啟用

[唯一計畫、安全評估與驗收](subscription/ACCOUNT_DELETION_REQUEST_WORKFLOW_2026_11_01.md)：沿用 AD2／AD3A，新增申請確認／撤回、手機操作畫面與 session-bound 近期驗證；待送資料／草稿保護、遺失回應讀回及 session 切換隔離。7 個相關測試、11 組獨立 PostgreSQL（含雙連線競爭）、同元件手機尺寸流程及 Web／手機打包通過。SQL 僅 ROLLBACK 草案，未套用雲端；預設關閉且拒絕遠端 DB／部署環境。未提交／發布，未新增 worker、R2／Auth／正式資料刪除；AD4／整體上架資格保持未完成。既有登入效能、PDF、正式發布批次繼續結案，不因本批重開。

## 目前狀態：2026-11-01 正式版發布整理

[本輪入口盤點與驗收去重](FORMAL_RELEASE_CLEANUP_2026_11_01.md)：首次讀取恢復（`8b42c1b`）、歷史下載（`71db0e3`）、重播批次（`9c7cba7`）均已發布及核心複驗完成，本輪不重跑效能量測。市集文字解析研究實驗室的正式／測試版本隔離已於 `426e485` 提交、推送及發布；Production `dpl_2EYbpTJkfmpKqzGw2ih712RQsrEH` Ready、主要 health 同版。實驗室含尾斜線／子路徑 404，救援／資料工具與抽查 debug 仍 404，設定／市集公開 HTML shell 200；保留既有本機測試及其他產品功能。[測試資料清冊](TEST_DATA_INVENTORY_2026_11_01.md)只盤點、不刪除。本批結案；發布後文件收尾只確認部署版本，不再跑操作矩陣。

下方按時間追加的段落是各批歷史；其中「本批未提交」「瀏覽器停用」「首次讀取待修」等舊狀態已由後續同項結果取代，不能當成新待辦反覆執行。以本段及各批文件頂部／最終結果為目前狀態。

## 最新：2026-11-01 完整歷史重播效能（已發布與核心複驗）

[本批量測與修正](OWNER_REPLAY_PROJECTION_PERFORMANCE_2026_11_01.md)：在每 50 筆 transaction 內對手動收入／互動共用投影讀取，沿用既有 handler 計算，集中寫回；商品、刪除及其他事件保留原路徑。真實 IndexedDB 與 production-optimized 共享程式三輪量測：5,000 筆中位數 11.62→4.84 秒，20,000 筆 45.55→18.06 秒；不是整段登入或實機速度保證。失敗回滾／重試／context 失效、14 個相關測試、兩份型別檢查、lint 與 Web／手機靜態建置全部通過。程式 `9c7cba7` 已推送 main，Production `dpl_GjhvEqEYo4Rxz2RY3V3q8TMbcBAQ` Ready、主要網域 health 同版；[線上複驗](OWNER_REPLAY_PROJECTION_PERFORMANCE_2026_11_01.md#正式發布與線上複驗)通過慢網路乾淨登入、唯讀故障恢復、重開不重複累加、明細返回、重連與手機畫面。

## 最新：2026-11-01 大量歷史與慢速網路（已發布）

程式 `71db0e3` 已推送 main，Production `dpl_Ennx12181gWMAfzchNGkX5sqTjHq` Ready，主要網域 health 同版。正式部署乾淨登入、慢速同步、收入 50／淨利 -50／成交 1、明細進入／返回與手機畫面通過；詳見[發布紀錄](FIRST_LOGIN_LARGE_HISTORY_PERFORMANCE_2026_11_01.md#正式發布)。下段未發布為驗收前歷史狀態；完整投影重播另批處理。

[量測及本批優化](FIRST_LOGIN_LARGE_HISTORY_PERFORMANCE_2026_11_01.md)：歷史下載最多兩頁並行、市集 ID 完整分頁、metadata 100 ID 分組、移除巨型事件篩選 URL、改按相關事件 ID 讀取，並避免重新核對時重寫相同 synced payload。保留 pending、完整依賴排序、50 筆 transaction 及最後才推進游標。1,201 場市集及 1,501 筆可用事件完整性測試通過；5,000 筆隔離量測的下載／重複歷史核對改善明確，但完整首載仍受投影重播與測試環境影響，不能換算為所有裝置的速度保證。慢速瀏覽器能正確完成，沒有改正式資料或清除照片；本批尚未提交／發布。

## 最新：2026-11-01 首次登入讀取恢復（已發布與核心線上複驗）

[本輪修正與驗收](FIRST_LOGIN_READ_RECOVERY_2026_11_01.md)：乾淨登入重現財務過早讀取及摘要 1 筆／明細 0 筆後，加入本人快取準備觀察、暫時性財務讀取有限重試、重連／前景恢復、舊回應隔離，以及成交／互動雲端重播的即時更新。程式 `8b42c1b` 已推送 main，Production `dpl_8y3Ay1gFLrmM8UAjunGp1WUeR3vi` Ready，主要網域 health 同版。正式部署的乾淨登入／單次讀取故障及主要網域斷線重連均自動恢復收入 50、淨利 -50、成交 1；成交進入／返回及 390×844 畫面通過。不清本機資料、不自動保存草稿／重送 outbox；原生實機、其他表單及全站異常矩陣仍待後續。

## 最新：財務核對草稿生命週期（已正式發布）

[規則、修正與驗收](FINANCIAL_DRAFT_LIFECYCLE_2026_10_31.md)：本輪「核對成本與零收入」加入裝置私人草稿、帳號隔離、來源／版本衝突確認及保存結果不明時的冪等恢復。真實瀏覽器完成重開、兩 origin 修改衝突、A→B→A 登入及草稿恢復；並修正切換帳號後據點／固定安排投影未清而阻擋歷史重播的問題。到期時間邊界為隔離測試，未改正式訂閱；原瀏覽器 9 筆未送達照片保留。已正式發布，結果見下段；不宣稱所有表單、正式商店到期或兩台實機皆已完成。

更新：`bd9acca` 已提交／推送，正式部署 `dpl_4GUCMCyfvSo5TRn7ny6xpZki6gnx` Ready，主要網域 health 同版；核心線上草稿／衝突保存／還原／A→B→A／390px 畫面已複驗。主要正式網域另外發現 3 筆未送達照片，正常 guard 阻止登出並保留；帳號切換使用同一部署的乾淨 alias。前段未提交為發布前歷史狀態。後續追蹤首載財務讀取需重試的可靠性、可讀歷史監控及實機；不擴張為全站／所有異常矩陣通過。

2026-11-01 收尾：兩個正式 origin 的專用測試草稿均已清理，成本 0／收入 50／成交 1／淨利 -50 已再次確認；只提交驗收與導航文件，程式不變，待自動部署完成後核對文件提交的正式版本。

## 最新：正式發布與異常追蹤

[正式發布紀錄](FINANCIAL_PRODUCTION_RELEASE_2026_10_31.md)：`f126e99` 財務一致性及 `efd6a67` 方案時間差修正已推送並在正式站 Ready，094 成本核對已實際啟用，保存／重開／撤回／還原／列表與報告返回、三尺寸報告及正式 PDF 下載／五頁渲染通過。時鐘修正後重跑斷線→重連→重讀來源案例，草稿仍在且沒有自動重送；修正前丟失表單的同案例已排除。真正到期、切換帳號、關閉重開與多裝置競態的完整矩陣仍未完成，不能把重連通過當成所有草稿生命週期皆有保護。後面未提交／正式站仍舊版為先前歷史狀態。

## 最新：2026-10-31 實際操作複驗

瀏覽器已恢復。[本輪實際驗收與修正](FINANCIAL_CROSS_PAGE_ACCEPTANCE_2026_10_31.md)完成測試成本 0→10→撤回→恢復 0、重開、列表／單場／分析／報告返回及 PDF 下載渲染，並補正每日銷售利潤仍誤顯示確定金額的遺漏。四頁三尺寸無橫向溢出。正式版仍是舊提交，沒有啟用核對表單；本批尚未提交／發布。下方瀏覽器停用為前批歷史狀態。

日期：2026-10-31。依使用者「依照建議完成後續未完成項目」推進。以下區分程式完成、自動驗證、既有線上版本與外部依賴，不作為全站／實機驗收通過證明。

## 本批已實作

- 新增平台中立 `lib/analytics/market-financial-reading.ts`，沿用獨立報告對來源、成本、零值、日期、抽成及固定費的判讀。市集列表、單場頂端摘要、分析回顧／參加建議／淨利趨勢／排名使用同一結果：讀取中、待確認、可估算。
- 新增 `hooks/useMarketFinancialReadings.ts`，每頁批次讀取本人場次，不在各卡片重複發請求。只供具有銷售權益的老闆使用；免費版及員工不增加私人財務讀取。方案權益不變。
- 094 開啟時使用既有可信核對 overlay；旗標未開啟時，非零且相符的既有成本仍可判讀，但未知零成本不再透過舊總利潤欄位變成確定金額。沒有新增雲端 writer 或改寫歷史投影。
- 核對讀取失敗、離線、來源變動、重複日統計與部分營業日缺漏均保留待確認。列表與分析頁提供重讀入口。
- 淨利待確認時不判定值得再次參加；每小時淨利排名排除待確認場次，確認後以共用結果重算。客單價等獨立資料保留；進階評分／象限增加財務完整度條件。
- 場次數量不能取代來源完整度；任一場財務仍待確認時，分析整體信心不會僅因樣本多而升為中／高。
- 舊報名費與攤位費皆非零且不同時，固定費先保留待確認，使用既有老闆確認流程決定實際費用，不自動遷移或相加。等額兩欄只算一次。
- 已完成且有效的零收入紀錄保留固定支出與負淨利，不因收入為零而從回顧／趨勢消失。未填紀錄仍與零收入分開。
- 移除成交詳情原本只提示「即將推出」的編輯入口。彈窗只在呼叫端提供真正操作時顯示按鈕。**成交編輯保存本身尚未實作**，不能把隱藏入口當成完成更正功能。

範例：收入 50、攤位費 100、銷售成本尚未確認為 0 時，各入口淨利均待確認；可信確認成本為 0 後，共用模型、列表、回顧、趨勢與整場報告均為 -50。原始成交、收入、成本投影、庫存與照片不改。

## 本輪外部證據

| 項目 | 實際結果 | 限制 |
| --- | --- | --- |
| 正式版部署 | Vercel production `dpl_GxWUzMwdfeiRvoCuYnNWsaMm6Jjx` Ready，正式網域指向 `57b838566b4488be5e90ed5e9412278132ac0670` | 是本批修改前的最新已推送版本；本批未提交／推送／部署 |
| 094 雲端 | 重跑 `verify-financial-reviews-live.mjs`：老闆讀回保存／更正撤回／零收入／零費用；員工 read 與無效 save 拒絕、匿名拒絕 | 普通測試登入、暫時程序環境；無有效寫入、角色或瀏覽器 session 變更。不能代替新 UI 重開／保存驗收 |
| 瀏覽器控制 | CUA 回報 `Local browser use is disabled in Work settings` | 已請使用者重新啟用；無本輪跨尺寸、線上互動或新畫面截圖，不宣稱通過 |
| iOS 預檢 | `check:ios-bootstrap`：`ok:true`、`sourceReady:true` | `readyForGeneration:false`、`nativeProjectPresent:false`；阻擋為 `ios_app_id_missing`、`macos_required` |

094 正式旗標仍需按正式部署及實際介面驗收確認。環境清單工具結果遭截斷，沒有把「未看到該鍵」當作已關閉的證據；本輪未改 Vercel 旗標。

## 自動驗證

16 個相關測試檔通過：財務 reading／完整度／核對、市集列表模型／UI、回顧、趨勢、metrics、分析建議、報告 reading／reader／訂閱邊界／PDF view model／返回、單一攤位費、每日合計。新增 reading 測試加入 `scripts/test-files.txt`。fixture 與 fake IndexedDB 不連正式資料庫。

最終版本的 mobile TypeScript、修改檔 ESLint、Web production build、mobile static build 與 35 項 segment aliases 均通過。這不是 repo 全部測試或所有 UI 都通過。

證據：`.codex-artifacts/financial-consistency-*.log`；iOS 預檢為 `.codex-artifacts/windows-readiness-ios-preflight-2026-10-31.log`。跨尺寸、觸控與實際 PDF 操作需等瀏覽器恢復後複驗。

## 後續與外部依賴

| 工作 | 接續方式／條件 |
| --- | --- |
| 本批畫面複驗 | Work 設定恢復瀏覽器後，驗 390／1024／1440 的列表→詳情→分析→報告、待確認／零值／負淨利、錯誤重試與返回 |
| 094 正式版收尾 | 核對正式旗標與同版部署，真實核對後重開、Web／PDF 對照；再依發布指示提交／部署 |
| 完整矩陣 | 三角色、三方案、多日／營業狀態、中斷／待同步／帳號切換、照片異常與 PDF。既有證據保留，本輪未全部重跑 |
| 成交更正 | 尚無更正事件保存路徑；後續須一起設計庫存補償、照片關聯、同步冪等與權限，不能直接改統計投影或先刪後新增充當完成 |
| 正式版測試介面 | 依既定帳號範圍稽核救援／測試入口與 flags；不批次清除資料、不擅自撤掉仍需使用的救援能力 |
| 首次 Mac 建置 | 最終 Bundle ID、Mac／Xcode；執行既有產生與 unsigned build 工具。Windows 無法編譯 iOS binary |
| iPhone／TestFlight | Apple Developer、簽章及實際 iPhone；驗相機、權限、安全儲存、背景切換、分享／PDF、路由，再交付內部 TestFlight |
| 正式付費上架 | 依任務圖完成 Apple 商品、驗證／通知／權益 writer、購買／恢復、退款到期、隱私／帳號刪除、商店素材與審查。Web ECPay 延後；背景／原生通知留到 iOS |

計算與資料模型沒有新增瀏覽器／裝置 API，檔案與 PDF 仍沿用 `lib/platform`。本批未安裝原生套件、產生 iOS 專案、修改價格／方案／角色，或清除營運資料；原有 Demo／素材變更保留。
