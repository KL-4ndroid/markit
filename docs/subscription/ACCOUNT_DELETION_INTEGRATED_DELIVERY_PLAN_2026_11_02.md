# 帳號刪除：整合交付與驗證去重計畫

狀態：本輪安全讀回與 22 組候選驗收、選擇性提交、Preview 發布與最小部署確認已完成。正式 migration 的遠端安裝／啟用資格、遠端清理驗收與外部配套仍未完成，不能將本批稱為正式刪除全數完成。依使用者要求，將原七項待辦合為**一個整合交付批次**，自主推進至可審查、可部署驗證的候選版；內部有依賴順序，但不再逐小項交付、重跑大矩陣或要求使用者回覆「下一步」。正式不可逆刪除的啟用決策另行保留。

## 同一批次的範圍

| 原待辦 | 整合處理方式／完成標準 |
| --- | --- |
| 1 安全讀回與重送 | 商品／成交照片共同遵守「已確認同次成功、真正衝突、仍未知」判讀；同次成功讀回不重複 PUT／成交／扣庫存，衝突保留原圖，未知保持阻擋與待傳資料 |
| 2 進度與發布檢查器 | 分開列 implemented、isolated-tested、staging-tested、production-released／blocked；既有程式不再誤呈現完全缺少，但檔案存在或本機通過仍不能解除正式 gate |
| 3 SQL／設定整合 | 原草案整理為依序、可重跑且拒絕結構漂移的 production migration 候選；核對 target、權限、所有寫入入口強制保護、設定驗證與停用策略；不直接把 test DB／ROLLBACK 限制拿掉就發布 |
| 4 候選版整合驗證 | 沿用現有 GoTrue／PostgREST／captured SQL／handler／S3 工具串接候選版；真 staging 僅限自建可丟棄物件，Auth／照片／SQL 替身的證據分別標記 |
| 5 未知／舊上傳處置 | 同一資料模型追蹤待審原因、證據與處置結果；未登記、無法證明 provider 終止者持續阻擋，不以 HEAD 404、計時器或人工填任意 hash 代替證據 |
| 6 發布配套 | 工程端完成公開刪帳入口／說明、支持的資料與保存範圍、客服入口及部署檢查；備份／外部副本／客服地址等不可自行證明的資訊集中列為外部依賴，未確認內容不得冒稱已發布 |
| 7 提交／部署／受控驗證 | 穩定後選擇性提交本批檔案、保留無關 Demo／素材；按已授權環境部署同一候選版本，做最小部署差異確認，產出同一份結果與未完清單 |

內部順序：先固定判讀契約與狀態清冊 → 一起完成 runtime／SQL／檢查器／說明 → 執行候選版驗收 → 提交與部署驗證。這些是同一批的執行順序，不另拆四輪使用者批准或四份新計畫。

不在本批新增正式商店付款、取消扣款或原生 adapter。帳務保留接入沿用現有契約；既有或未來商店狀態需要真供應商證據時明確標為條件依賴，不能用 fixture 假裝完成。主清單的 Capacitor Gate 2 已標 complete；原生切片審查與 AD4 發布資格是不同條件。

## 減少 token 與重複測試

1. **一份工作清冊與一份最終結果**：本文件作整合入口；歷史報告與證據作引用，不為每個小修正再開一份長報告／重述全部背景。索引在整合結果定案時統一更新。
2. **先做一次影響盤點**：記錄本次更動的程式、schema、環境與相依案例；已有且適用的 SQL／R2／Auth 證據直接沿用，不重新製造測試框架或大批範例資料。
3. **開發時只跑相關快速檢查**：新判讀、重送、權限／交易安全有對應測試；細小文件／版面調整不啟動整套資料庫與 Web build。
4. **穩定後集中驗收**：可共用的隔離服務／資料在同一輪使用，案例以唯一 namespace／交易隔離；不為節省啟動成本而讓案例互相污染。沿用既有工具，加一個執行入口／清單即可，不另造通用測試平台。
5. **一次穩定版 build**：集中執行型別、lint、必要回歸及 Web build；部署後只核對版本／設定／遷移／權限與最短完整流程。部署環境與本機證據有實際差異時，仍需驗證該差異。
6. **失敗只重跑受影響範圍**：修改後重跑失敗案例及其相依安全鏈；共用權限、RLS、schema、刪除順序或 writer 契約改動，依影響擴大回歸，不能套用「永遠只測一次」。程式或環境已改動的舊證據不繼續當有效結果。
7. **簡短進度／精簡輸出**：只回報新增發現、已解除阻擋及需決策事項；工具保留完整證據，對話只顯示結論與必要錯誤。不反覆讀整份大文件或貼測試成功清單。

## 集中驗收必須覆蓋

- 同張／不同張照片重送、已提交但回應遺失、真正衝突、未知 provider 結果與 JPEG／WebP。
- 老闆／員工、跨品牌／匿名、訂閱失效與凍結後不能繼續寫入；私人資料與 service-role 對外路徑不洩漏。
- 上傳與刪除競爭、重複提交、工作重啟續跑、補償失敗、租約／證據過期、交易回復。
- 同一候選版的 DB／Auth／API／物件清理與保留規則；只使用合成帳號／自建物件，所有測試資源可追蹤並清除。
- 遷移安裝／重跑／漂移拒絕、設定指紋、公開說明與實際行為相符；停止／停用不能假裝回復已刪除資料。

本批新 capability 仍為 server／共用 API 契約；如需 browser／device 能力，遵守 `lib/platform` 邊界，不把 Web 假設放入共用規則。

## 外部依賴與交付邊界

缺少真實權限、供應商證據、備份事實或人工決策時，先繼續其他可獨立完成的工程；最後集中列出「缺什麼、阻擋哪個驗收、需要哪個人提供什麼」。必要資訊出現且阻擋工作時可提早一次集中詢問，不反覆詢問已授權操作。

一次整合交付應包含：完成程式／SQL 候選／配套文件、精簡驗收結果、證據來源、提交與授權環境部署狀態、唯一未完成清單。不能預先承諾缺少外部證據也能正式開啟刪除；未滿足的正式 gate 繼續關閉。預期可省下環境反覆啟動、重複大矩陣、重述歷史與逐批報告的消耗，不承諾未量測的 token 節省比例。

既有起點：[最新 handler 接入結果](ACCOUNT_DELETION_PHOTO_HANDLER_RECEIPTS_2026_11_02.md)、[終止證據](ACCOUNT_DELETION_TERMINAL_PUT_2026_11_02.md)、[發布資格](ACCOUNT_DELETION_AD4_PREPARATION_2026_08_21.md)、[全檔案索引](../SUBSCRIPTION_FILE_INDEX.mk)。


## 本輪整合結果（2026-11-02，唯一現行清單）

以下取代本文件連結歷史報告中的「下一步」；歷史 8／10／16 組的範圍與時間保持原樣，不重跑無關 Web／PDF／訂閱矩陣。

| 原項目 | 本輪交付 | 尚缺／界線 |
| --- | --- | --- |
| 1 安全讀回 | 兩個既有 handler 在 receipts 模式先讀 DB 與兩張物件實際內容，核對 SHA-256、MIME、長度、版本／尺寸及回條，再 CAS 確認；同次成功回 `replayed:true`、0 額外 PUT。衝突 409、不確定 409／503，保留本地 payload、不盲目重送 | 新路徑只允許隔離 loopback；未開放遠端或正式上傳模式。未收到 provider 終止證據者不自動解除 |
| 2 進度檢查器 | 分開 implemented、隔離證據、staging 證據、productionReleased；候選結果綁定來源 SHA-256，來源漂移即失效。原 AD4 `ready:false` 保留 | release blocker 名稱為歷史契約；`*_absent` 在此代表正式資格尚缺，不再據此推論沒有寫程式 |
| 3 SQL／設定 | [雜湊 manifest](candidate/manifest.json)、[唯讀結構／函式／ACL preflight](candidate/PREFLIGHT.sql)、明確安裝順序與拒絕遠端安裝的 guard | **已產出 096 交易式 migration 候選**，原子安裝、重跑、漂移拒絕及既有權限複驗見下節；原草案保留不動。候選未放入自動 migration 目錄，遠端執行未核准，managed target／provider 設定仍未驗證。安裝後 SQL CHECK 強制 runtime 關閉，不能只更新一列開啟 |
| 4 同版整合 | [22 組證據](evidence/account-deletion-integrated-candidate-2026-11-02.json)：真 GoTrue 密碼／bearer、真 PostgREST JWT／ACL／讀取／RPC、啟用 canonical write check、captured PostgreSQL、既有 Next handler、真 loopback S3 SDK，同環境跑完。無照片／帳務列的合成 owner 走完十步並用既有 identity adapter 真 hard delete、確認 sessions 無列 | 不是 managed Supabase Auth／Vercel handler HTTP／真 R2 的整套遠端驗收。既有 R2 staging 證據只涵蓋其原案例，不冒充新讀回已通過遠端。讀 events FK embed 的 PGRST200 依既有 repository 回退至權威 claim BFF；未造假 FK |
| 5 未知／舊資料 | 新 service-only 審查 BFF 以有效 processing lease、同一 frozen actor 核對，最小化回傳原因／attemptId／keyCount／摘要、最多 100 筆，不含 object key；unattributed legacy claim 計數屬全域保守阻擋。`canAutoRelease:false`。既有受控 reconciliation 繼續適用於能提供可驗證證據的已登記 attempt | **未知／未登記 provider 結果的正式處置 adapter 與營運復核仍未完成。** 不提供任意 hash／忽略／超時放行；相應帳號保持待審，不做不可逆刪除 |
| 6 公開配套 | 新 `/account-deletion` 頁與支援入口，遵循既有配色／返回設計；說明尚未開放自助刪除、員工／老闆範圍、不可回復與未來商店訂閱區別。沿用既有客服設定，未編造信箱／期限 | 使用者已確認無自行保留備份／副本及客服信箱可正常收信；實際處理期限、客服承接與公開政策仍待完成；頁面維持草案，不是已核准商店公開刪帳資源 |
| 7 交付 | 本批及先前未提交的相關刪帳工程選擇性提交，Demo／素材不納入；只發布 Preview 候選並做最小差異確認 | 正式站不 promote、不更改 production flags／SQL／R2／Auth；正式不可逆刪除未啟用 |

### 驗證與證據去重

- 新整合一次通過 22 組：商品／成交各 success、補償失敗、unknown PUT、finalize 回應遺失、SQL ack 遺失、412 conflict、freeze；另含 JPEG／WebP、不同 bytes 衝突、物件缺失、0 重複 PUT、跨品牌／Free／匿名拒絕、清理保持與十步 Auth 清理。
- 本輪相關 17 份測試檔通過；專用 tsconfig 通過，runtime／公開頁 lint 通過，Web production build 通過（首次診斷遇到 Next 中文 code-frame bug；修正公開 mailto 的 nullable href 後成功）。全域 `tsc` 仍有既有 tests fixture 的型別債，未當成本批回歸通過。
- preflight 在 PostgreSQL 17 空基線執行，178 行 metadata 結果、缺少來源全部拒絕；不查客戶資料、不修改 schema。不代表已比對正式 DB。
- AD4 檢查器：`candidateSourceVerified:true`、正式 `ready:false`。準備套件 `--check` 通過；來源／生成 preflight 被改動時拒絕。
- 複用先前專用 owner／staff ACL、billing 保留與真 R2 自建 marker 證據；本輪沒有刪除或上傳正式物件、沒有提升雲端權限。合成 GoTrue／PostgREST／PostgreSQL 容器與 loopback HTTP server 已清除。

### 審查處理順序（不另開切片）

1. 不確定照片：先用有效 lease 取得最小審查清單。相同已保存內容僅能由本次 readback 真讀回核對並 CAS 解除該 attempt；其他 attempt 不連帶放行。
2. 已登記且有可信單次 PUT receipt／drain：沿現有 reconciliation prepare → 逐 key 觀察 → metadata CAS → receipt；任一證據、租約或 target 不符即保持待審。
3. 未登記舊上傳／丟失 provider 回應：保留該帳號與證據，等待 provider／producer 的可驗證終止處理；不能以 HEAD 404、過期或手填摘要替代。正式接線與人工作業承接是剩餘工程，不能用「清單已存在」算完成。

### 集中未完成清單

工程：096 候選的 managed target／部署策略核對與正式安裝、安全 writer rollout／R2 target binding、managed Auth／PostgREST／真 R2／Vercel 同版受控驗收、未知／legacy 正式證據處理。這些仍需工程，不能全部歸因於使用者未提供資訊。

外部資訊（使用者 2026-11-02 最新確認）：沒有自行保留的資料備份／副本，刪除無法追回；`stallight.days@gmail.com` 可以正常收信。兩項事實已記錄，不再要求重複提供。正式告知須明確寫出不可復原；客服承接／案件流程及整體公開政策仍需文件化，不因地址與收信確認自動標記 legal／support 全部 approved。未來正式商店訂閱供應商通知另依原生任務，不擴入本批。

提交 `e45fb0af2f6cccef0ef4183ef86ca627c5cefcd2` 已推送至 `codex/account-deletion-integrated-candidate`，Vercel Preview `dpl_4oanjDV7CNKTuBmsA33aGqnM3SGb` Ready。用現有 Vercel CLI 身分核對 health=200、revision=e45fb0a、刪帳 GET／confirm POST／cancel POST 皆 501 disabled；沒有調整 Deployment Protection。初次直接 HTTP 讀取雖為 200，但實際轉到 Vercel 登入頁，未算通過。

公開頁初次部署被 AppChrome 登入殼遮住，已補 `lib/navigation/public-route.ts` 的 standalone public route，並在既有 public legal 測試確認 `/settings/account/deletion`／API／相似前綴仍不是公開路由。這個實際發現需要第二次候選建置；未重跑無關的 22 組 DB／照片矩陣。修正版 `5b2f5c3fcaf8d822b9344333d8cc16056496d9f1` 已推送，Preview `dpl_5NjRfsacxBJJH2UhA4hYt3866DP5` Ready。[/account-deletion 候選頁](https://markit-8o53b3y37-masons-projects-1db534c5.vercel.app/account-deletion)匿名可讀，草案／未開放自助文案、返回／隱私／支援連結、支援頁入口與沒有自助刪除連結皆確認；health=200、revision=5b2f5c3，刪帳 GET=501 disabled。前版 confirm／cancel POST=501，其 handler 在修正版無差異。公開路由及私有前綴邊界兩份既有測試通過；Vercel 修正版建置通過。第一次在建置中讀到平台 200 building 頁未列為應用程式證據，等 Ready 後才完成上述核對。

[最小部署證據](evidence/account-deletion-preview-2026-11-02.json)只記可核對的 revision／HTTP／頁面內容，不含 token、客服私訊或真帳號資料；非 AD4 正式候選資格證書。兩個程式提交均在 `codex/account-deletion-integrated-candidate`，未合併 main／promote 正式站。部署後純紀錄提交不改已驗證的 runtime 來源，無須重跑 22 組或另造 UI／PDF 大矩陣。


## 096 migration 候選收尾（2026-11-02，沿同一整合批次）

本段接續原項目 3，不另開新計畫。DB-only 安裝／驗證工具不使用 browser/device API，不變更 iOS／Android 共用商業規則、方案、收費或原生 adapter。

- [完整候選 SQL](candidate/096_account_deletion_candidate.sql)：整合 request、engine、營運／帳務保留、134 個既有函式與 views 的 reviewed rewrites、上傳 barrier／receipt／readback。要求 071 與已部署的 095、精確 catalog／ACL／RLS／view option／owner 基線；不重建公用資料表，不執行客戶清理。
- [生成／檢查入口](../../scripts/prepare-account-deletion-migration.ts)：`npx.cmd tsx scripts/prepare-account-deletion-migration.ts --write`／`--check`；[建構器](../../scripts/lib/account-deletion-migration.ts)與 [migration manifest](candidate/migration-manifest.json)綁定 payload、生成 SQL 與來源 SHA-256。
- [專用驗證](../../scripts/verify-account-deletion-migration.ts)：`npx.cmd tsx scripts/verify-account-deletion-migration.ts --isolated`，使用 desktop-linux PostgreSQL 17、network none、無 bind mounts，只有合成資料。不是遠端執行工具。
- 同一交易與 advisory lock 保護安裝；晚段 SQL 失敗會回復新 schema／函式／grant 與欄位變動。重跑只核對既有 version／payload／完整 schema fingerprint，不重新 CREATE 或把漂移覆寫成新基準；資料列不屬 schema 指紋，但重跑另比對合成市集／商品／事件／profile 內容不變。
- 所有原草案的 DB-only 執行限制，在生成時明確換成新的 `deletion_release_private.runtime_allowed()`；不是直接移除 guard。安裝後 `runtime_enabled=false` 受 CHECK 限制，資料 UPDATE 不能啟用；沒有 R2 target、billing key、worker route、排程或雲端設定。正式啟用需要後續審查的 DDL 與重新核准的結構基準。
- managed 分支要求 DBA、project／payload acknowledgment、provider 端 `app.settings.project_ref` 與 review digest；**這是待驗證的安裝要求，不是已取得的 provider／專案身分證明**。未確認正式 Supabase 是否提供可信設定、且未完成目標／部署審查前，不應在 SQL Editor 執行候選。沒有修改任何雲端 SQL／R2／Auth／環境變數。
- 生成 SQL 中 095 的 owner-scope／匿名禁止保留；原有函式基線採原始 MD5 精確核對；只有已部署 095 的兩個函式沿原唯讀驗證既定 CR 處理，沒有放寬其他函式內容、權限或 owner 差異。生成 SQL 內嵌既有 reviewed 函式，保留原尾端空白；`.gitattributes` 只對該生成檔忽略空白提示，任何內容變更仍由 payload／SQL／source SHA 檢查拒絕。

[18 組安裝／權限結果](evidence/account-deletion-migration-2026-11-02.json)已通過；包含目標／095／DBA／錯誤測試 DB／payload 修改拒絕、baseline 與安裝後 table／column／RLS／ACL／view option／routine／version 漂移、晚段失敗整筆回復、兩次安全重跑、無 R2 target／billing key、三角色遮罩、正常成交只投影一次／不重複扣庫存、snapshot owner scope、80 個 stored-data routines 凍結前置拒絕、5 views、匿名 token scope、禁止 TRUNCATE，以及重跑前後合成營運列內容 digest 不變。相關 TypeScript／lint 與兩個生成工具的 source check 通過。

本證據沒有測 managed Supabase 的 provider 設定，也沒有聲稱能隔離 DBA 惡意或未協調的並行 DDL；正式安裝需受控變更窗口與目標／部署審查。遷移 advisory lock 只協調同候選的安裝。候選 runtime 永久停用 CHECK 仍在，不能拿隔離結果作正式啟用資格。既有 22 組照片／Auth 候選結果沿用原 scope，本輪沒有重跑 Web／PDF 或遠端 R2 大矩陣。

### 已知營運資訊與品牌更新

- 顯示品牌（使用者最新定稿）：**拾光日子 / STALLIGHT DAYS**。使用者說明功能沿用原 Féria，僅更改名稱與介紹；資料庫識別、既有鎖 key、相容性契約不因顯示品牌改名而任意替換。
- 定位：給攤主的營業日誌與帳本；適用手作文創、固定夜市、餐車與固定／流動交錯的攤主。記錄每次擺攤、每筆營業、場地與商品表現，讓經營紀錄可回顧。
- 主句：**把每一次做生意的日子，好好留下來。** 後續對外刪帳／客服文案依[完整品牌規格](../brand/STALLIGHT_DAYS_BRAND_BRIEF_2026_11_02.md)使用新名稱；完整更名已排入 `IOS-BRAND-ROLLOUT` 低優先任務，不打斷目前安全工作。
- 公開客服信箱：`stallight.days@gmail.com`（使用者提供並確認可正常收信）；代理未寄測試郵件或回覆客戶。人工承接流程與公開政策尚未完整驗收，不因此標記 legal／support gate approved。
- 備份／其他副本：使用者已確認沒有自行保留的備份／副本；Supabase Free 備份頁亦顯示不包含專案備份。APP 不提供刪除後還原；不將這些觀察擴大解讀為已證明所有供應商內部留存立即消失。本輪未進行全站品牌置換或覆寫另一批 Demo／素材變更；對外頁面／環境設定套用與承接確認保留為發布配套。


## 正式環境唯讀核對與部署結論（2026-11-02）

**決定：目前不套用 096、不開啟正式刪除。** 這一輪完成真實目標查閱與部署方案評估，沒有重新執行既有 22／18 組本機矩陣，也未部署、修改環境變數、擴大權限、讀照片內容或改寫營運資料。

[安全摘要與比對證據](evidence/account-deletion-target-readonly-2026-11-02.json)；[可重用唯讀 SQL](../../supabase/verification/096_account_deletion_target_readonly.sql)。原始匯出僅為 pg_catalog metadata，180 列，小於 501 截斷上限；CSV／本機完整比較資料留於忽略的 `.codex-artifacts`，不是客戶營運資料備份。公開紀錄只保存來源指紋、比對範圍、計數、狀態及供應商非密鑰目標資訊。

### 已確認的真實狀態

| 面向 | 本輪證據 | 結論與界線 |
| --- | --- | --- |
| Supabase 身分 | 已登入 SQL Editor 的網址、所選專案與 main PRODUCTION 分支皆為 `fgejncfsvvsayiequubm`；資料庫 postgres、session user postgres、PG 17.6 | 目標來自可信管理頁脈絡；SQL 結果列中的固定 project label 不是獨立身分證明 |
| 結構／權限 | 45 個 relation、134 個 routine；columns／constraints／RLS／policies／grants／view definition／owner／options／trigger enabled 與來源指紋全部符合；無新增未知物件 | 095 的兩個 snapshot 函式與權限吻合。只讀 metadata，未呼叫清理 RPC、未掃描市集／成交內容 |
| 096 安裝要求 | `app.settings.project_ref` 與 `supabase.project_ref` 實際皆為 null；engine／release private schema 均不存在 | **現版 096 managed 分支會拒絕安裝。** 不是 schema drift，也不能以手填設定值冒充供應商驗證 |
| Vercel 正式站 | 明確 scoped CLI 核對 `markit-app`／既定 project ID；Production Ready，health revision `3638b91`；刪帳 GET 回 501 disabled | 目前正式站不是候選分支。連接器讀不到專案，改用既有登入 CLI；沒有換團隊、申請新權限或拉取 Production secrets |
| Vercel 非密鑰設定 | 使用者完成既有帳戶郵件驗證後，確認 `NEXT_PUBLIC_SUPABASE_URL` 指向上述專案，R2 endpoint 與 Cloudflare 該帳戶 S3 endpoint 相符 | 這是當前 project settings，不是部署中函式的 runtime attestation |
| 正式 bucket 綁定 | Production `R2_BUCKET_NAME` 為 Secret、沒有讀回入口；pre-production 為另一個 Config 設定 | **正式 Secret 的字面值仍未讀回。** 不把 dashboard bucket 相關性當已證明部署中的 bucket；郵件驗證不會讓 Secret 變成可讀 Config |
| R2 管理頁 | bucket `markit-media-production`；現列 2 個商品原圖／縮圖物件、6.45 KB，全部對應 DB 索引；無無引用物件；兩輪索引 SELECT 穩定，無 active photo leases | 複用既有盤點器的 dashboard input 模式，無 S3 GET／PUT／DELETE／HEAD／Abort。UI 未列出不能當 provider 404 或刪除證據；multipart 尚未驗證 |
| 到期成交圖 | 20 個未列出的 uploaded reference key 均已超過成交圖期限 | 紀錄索引／物件狀態差異，不判定商品圖遺失，也不自動修改 expired 狀態或清理 |
| R2 保留／存取 | 公開存取停用、無 custom domain／bucket lock；兩個成交圖 prefix 7 天刪除、multipart 7 天中止規則已啟用；object access logging、local uploads、on-demand migration 均未啟用 | 只讀設定。沒有權限升級／規則修改；既有未知上傳仍不能憑逾期或空列表解除 |
| 備份／客服 | 使用者確認沒有自行備份／副本、信箱正常收信；Supabase Free 備份頁顯示不包含專案備份 | 不再將這兩項使用者事實標成未回答。仍需處理公開不可復原告知與客服案件流程；供應商內部保留範圍依其政策說明，不承諾已證明零副本 |

管理頁曾顯示 CPU 使用量偏高；本輪只做有界 metadata 查詢，沒有壓力測試、升級方案或變更 compute。正式 DDL 應安排受控窗口，再以當時的狀態決定是否開始。

### 已具體化的後續部署順序

1. **修正 096 的 managed target 驗證契約**：以固定 project ref 的已驗證控制平面路徑或固定 host／TLS 連線作外部身分綁定，再記錄 SQL acknowledgement、payload digest、實際 session 與 catalog fingerprint。SQL 的自訂設定只能作部署確認紀錄，不能宣稱是 provider 自帶的專案證明。保留精確基線、交易回復、漂移拒絕及 CHECK 停用保護；不以臨時 `SET app.settings.project_ref` 規避目前拒絕。
2. **補部署端的內部唯讀目標比對**：同一部署 revision 以 server-only 環境讀取 endpoint／bucket，在既有驗證邊界內只回報帶 nonce／revision 的相符結果或指紋；不回傳 R2 key／Secret、不新增匿名公開診斷、不讀照片內容。直接比對 Secret 的實際 runtime 使用，避免把 project settings 或另一個 Preview 當 Production。此檢查尚未實作，不能用本次記錄當已通過。
3. **審查並受控安裝仍關閉的候選**：先固定 SQL／app revision／目標證據與安裝順序，決定變更窗口。完成前兩項且另有雲端變更授權後，才安排實際安裝；不是現在貼 SQL 即可完成。開關保持關閉，安裝不代表開啟清理。
4. **遠端 producer 保護與同版整合**：現有 coordinator／writer／readback 仍拒絕 hosted／VERCEL 或 production bucket，須完成明確遠端 adapter／target binding 與全部入口覆蓋，不能只改 env flag。再用合成帳號／自建物件核對 managed Auth、PostgREST、R2、Vercel；未知／legacy 結果仍保持待審。
5. **正式啟用另判**：完成客服／公開告知、未知資料處置、受控驗收與退出／停止策略後再審查不可逆清理資格；本輪不建立 remote migration approval 或 AD4 release approval 檔案。

官方依據：Supabase 的[固定 project ref query endpoint](https://supabase.com/docs/reference/api/v1-run-a-query)目前列為 experimental，若採用需固定版本與驗證，不當長期穩定承諾；亦可評估[資料庫連線方式](https://supabase.com/docs/guides/database/connecting-to-postgres)。[備份文件](https://supabase.com/docs/guides/platform/backups)與本次 Free 備份頁分開引用；無可用還原功能不等於已逐一證明所有供應商內部副本不存在。

## 096 目標驗證修正（v2）

本節更新上文 v1 的目標驗證結論。v2 改由[管理 API 工具](../../scripts/account-deletion-managed-migration.ts)向固定的 Supabase 專案 HTTPS 路徑送出請求，SQL 內的交易設定只記錄安裝確認。工具先核對生成檔及來源指紋，再透過唯讀查詢確認資料庫及角色。正式安裝需另外執行，並保留交易回復、基準比對和刪除功能的停用限制。

[20 組隔離測試結果](evidence/account-deletion-migration-v2.json)與目前候選 SQL 指紋一致。這些測試證明沒有舊專案識別設定時，v2 仍能在模擬環境完成安裝。另有[管理 API 模擬測試](../../tests/account-deletion-managed-target.test.ts)驗證錯誤目標、回應不符與中斷後不自動重送。

2026-11-08 接續時，Chrome 中正式專案停在登入頁，本機也未提供管理 API 工具所需的管理憑證。登入 SQL Editor 後可先唯讀確認正式資料庫是否已有 096；這項查詢與管理 API 實際驗證各自記錄。正式部署使用的 R2 bucket、遠端受控安裝及刪除啟用仍待完成。

登入後已在正式專案 market-pulse-collab（main PRODUCTION）執行一次 metadata SELECT。結果為 db=postgres、db_role=postgres、engine_present=false、release_present=false、receipt_present=false，確認尚無 096 安裝結構或安裝紀錄。這筆證據來自 SQL Editor，管理 API 工具的實際連線與部署使用的 R2 bucket 仍待驗證。

[正式環境唯讀查詢](https://supabase.com/dashboard/project/fgejncfsvvsayiequubm/sql/bce9228d-069c-4f92-8b46-84731de9dfaa)

2026-11-08 安裝前核對。新版工具的唯讀入口回報 `managed_access_token_required`，在送出管理 API 請求前停止。Vercel 連接器在既定 scope 查正式部署回 404，現行公開刪帳入口回 501 `account_deletion_disabled`。部署的 R2 bucket 仍需要來自實際執行環境的比對證據。

2026-11-09 正式 Supabase 管理 API 唯讀驗證通過。依操作者終端結果，`status=target_verified_only`、`installationAttempted=false`，結束碼 0。固定專案路徑的查詢確認 nonce 與資料庫名稱吻合，Supabase 回傳的 `supabase_read_only_user` 僅允許用於唯讀驗證，安裝檢查仍要求 `postgres`。9 項工具測試與候選指紋檢查通過。正式部署實際使用的 R2 bucket 及寫入路徑仍待驗證。

## R2 正式部署目標檢查

本機候選新增受既有 cron 授權保護的 HEAD。它僅在 Vercel Production 比對執行時設定的 R2 endpoint 與預期 bucket，回傳 204（相符）或 409（不符），附單次 nonce 及部署 ID。驗證請求沒有 S3 呼叫，不執行原 GET 的到期清理，也不回傳設定值。無授權或非正式環境回 404，缺部署 ID 回 503。

部署前先檢查指定版本及部署範圍。部署後以安全輸入取得既有 cron 憑證，向已核對的正式網域送一次 HEAD。只有 204 且 nonce 與部署 ID 均吻合才算通過。Vercel 的部署 ID 取自執行環境，需啟用系統環境變數。[Vercel 系統環境變數](https://vercel.com/docs/environment-variables/system-environment-variables)

這項核對只證明部署使用的儲存設定，正式 writer 的安全接線及遠端整合驗收另行驗證。HEAD 已通過本機驗證，正式部署結果待取得。096 仍等待受控安裝。

2026-11-09 已由現行正式版本 3638b91 建立獨立候選 188a102，只含 R2 HEAD 與測試。Vercel Production 候選 dpl_CLZDGuvuv7Xe3YEtzk42veCfFZT3 已 Ready，受保護的 health 回 healthy，無 cron 授權的 HEAD 回 404 且 no-store。公開正式網域健康端點仍回 3638b91。候選健康端點的 commitSha 為 unknown，此次來源依乾淨工作樹與部署 ID 紀錄。Production 環境清單未列 CRON_SECRET，不能取得有授權的 R2 結果。候選尚未 promote，096 尚未安裝。[Vercel 候選部署](https://vercel.com/masons-projects-1db534c5/markit-app/CLZDGuvuv7Xe3YEtzk42veCfFZT3)

2026-11-09 R2 核對通過。以正式版 3638b91 為基準的候選 c6f84f3 使用獨立短效核對憑證。Vercel Production 候選 dpl_8YvEUGGbuSaeUYsBckLdZLkbVsvv 已 Ready，保留 Vercel Authentication。受授權 HEAD 回 204、private no-store，nonce 與該部署 ID 均相符，確認這個部署的執行環境使用預期 R2 endpoint 與 bucket。臨時憑證已從本機移除。公開網域仍回報 3638b91，因此本證據綁定暫存的 Production 候選，既有公開部署未單獨執行此核對。無需把短效診斷推到公開網域。此結果未涉及 R2 物件讀寫或清理執行。[Vercel 部署紀錄](https://vercel.com/masons-projects-1db534c5/markit-app/8YvEUGGbuSaeUYsBckLdZLkbVsvv)

096 工具已修正安裝模式的查詢角色。安裝前及安裝後的查詢仍是固定 SELECT，但透過與 DDL 相同的管理 API 權限送出，以核對 postgres 並讀回私有安裝紀錄。唯讀模式維持原路徑及限制。9 項工具測試及候選指紋通過，SQL 本體未變。正式安裝尚需專案限定 Database Read-write 短效憑證、當時基線核對及受控變更窗口。

## 096 正式安裝與停用確認（2026-11-09）

經使用者授權，透過固定 Supabase 管理 API 對 `market-pulse-collab`（`fgejncfsvvsayiequubm`）安裝 096。安裝工具通過候選一致性與安裝前核對，交易提交後讀回回報 `installed_disabled_readback_verified`（結束碼 0，`installed=true`、`runtimeEnabled=false`）。

- 候選 SQL SHA-256：`bba0aa472ee7cfe26e6370dbe2a79e91b37f75846bc41f1c99ee29ebd92f8088`。
- 安裝 payload SHA-256：`c449baff62f39e53b6851e8c1af4e4866ca79baa923b78092eae5c50686cc40e`。
- 安裝後，公開正式站 `GET /api/account-deletion` 回 `501 account_deletion_disabled`。本輪未發布應用程式、未執行刪帳或照片清理。短效憑證未寫入檔案，執行後自工作程序與目前剪貼簿移除；供應商端撤銷未驗證。

下一階段為上傳寫入端安全接線，以及在同一受保護候選環境整合驗收 Auth、PostgREST、R2 和清理執行器。096 安裝完成不構成正式啟用或遠端整合驗收的證據。

## 託管測試版的照片寫入接線（2026-11-09）

商品與成交照片共用同一個服務端寫入入口。受保護的 Vercel Preview 可透過 `.env.example` 所列旗標選用新版流程，並限制為指定測試品牌、獨立 Supabase 專案及 `markit-account-deletion-preview` bucket。程式會在登記上傳前核對 Supabase 專案、R2 帳戶與目標指紋。資料庫必須先在 `deletion_upload_private.transport_target` 綁定同一指紋。若資料庫拒絕登記單次寫入，流程會在呼叫 R2 前停止。

兩個上傳入口都沿用單次條件寫入、回條與相同照片讀回。若寫入結果不明，既有人工審查規則仍適用。R2 的條件寫入會原子檢查物件是否已存在，而讀到 404 只代表當時找不到物件。[Cloudflare R2 一致性規格](https://developers.cloudflare.com/r2/reference/consistency/)

本輪 22 組隔離驗收通過，涵蓋 GoTrue、PostgREST、商品與成交照片重送，以及合成帳號的十步清理。驗收使用本機 S3 替身。另以模擬 RPC 驗證 Preview 目標不符及資料庫拒絕登記的情境，TypeScript 與既有手機靜態產物檢查亦通過。[隔離驗收結果](evidence/account-deletion-integrated-candidate-2026-11-02.json)

遠端整合驗收需備妥可丟棄的 Supabase 專案與合成品牌資料，以及只對上述測試 bucket 有權限的 R2 憑證。部署前確認 Vercel Authentication、資料庫基線與私有目標設定，再沿同一候選版驗收商品／成交重送、權限、未知回應與測試帳戶清理。正式 Supabase 和正式 bucket 會被此 Preview 模式拒絕，正式刪帳仍為停用。

2026-11-10 遠端資源核對。Supabase `test_prg` 的唯讀查詢顯示 5 個 Auth 帳號與 29 張 public 資料表，已有應用程式結構，尚未安裝刪帳及上傳保護 schema。此專案排除於合成帳號清理驗收。Supabase 建立專案頁確認免費名額已達上限，建立按鈕停用。先確認是否可暫停 `test_prg` 以騰出免費名額，或指定另一個可丟棄的空白專案。[Supabase 免費名額與暫停規則](https://supabase.com/docs/guides/platform/billing-on-supabase)

Vercel `markit-app` 已開啟 Require Log In，採 Standard Protection。遠端驗收需在部署後實測匿名請求確實被攔截。Cloudflare 管理頁目前要求重新登入，專用 bucket 及其憑證範圍待核對。本輪只有唯讀檢查，遠端整合驗收尚未開始。

使用者已確認 `test_prg` 原本就是測試用途，因此將它改列為遠端驗收候選。沿用前次唯讀結果，該庫有 29 張 public 資料表，096 的已核對基線則有 40 張資料表與 5 個檢視；現有管理安裝工具亦只允許正式專案。後續先用唯讀比對列出差異，審查可保留既有資料的升級路徑，再為測試專案建立獨立目標綁定。驗收使用新建合成帳號、專用 R2 bucket 與受保護的 Preview，原有 5 個帳號不列入清理範圍。

第一步使用單一唯讀查詢，將 `test_prg` 的資料庫結構與 096 的 45 個資料表和檢視逐項比對。輸出包含缺少、多出及類型不同的物件名稱，只查系統目錄。先依結果查找對應遷移，再用完整 preflight 核對欄位、函式和權限。現有測試庫的遷移歷史未知，因此升級清單須以實際差異為準。[測試庫唯讀盤點 SQL](../../supabase/verification/096_account_deletion_test_prg_inventory.sql) · [完整 preflight](candidate/PREFLIGHT.sql)

2026-11-10 收到 `test_prg` 盤點結果。45 個物件中 32 個名稱與類型相符，缺 11 張表和 2 個檢視，沒有多出或類型不符的物件。管理頁追加唯讀核對發現 `supabase_migrations.schema_migrations` 不存在，071 的申請表與讀取入口已存在。072 的四個時間欄位仍是舊版指定方式。073–075、080、084–091 的抽查標記皆未命中。商品照片版本欄位為 `integer`，083 所需的舊版 claim 和 finalize 函式各只有一個版本，均符合檢查的參數與安全屬性。095 的兩支快照函式皆未符合現行指紋。這些標記只用來排序演練，完整基線仍由 preflight 判定。[測試庫唯讀核對](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/b485c035-3e90-4c01-8ebe-a885c081c71a)

| 演練順序 | 來源與驗收重點 |
| --- | --- |
| 072–075 | 先核對既有市集／商品投影可否套用局部修正，再加縣市、繳費期限。現版 074 已含既有權限修正，以 074／075 的唯讀驗證確認。 |
| 076–081 | 076 加心得，077 加準備範本及套用紀錄，078 加現金紀錄，081 加工作流程回條。079 和 080 分別補上現金比較 RPC 和縣市補填入口，依賴前段結構。 |
| 082–091 | 082 加三張訂閱寫入設定表並安裝寫入檢查。083 將照片版本擴為 `bigint`。084–091 核對投影、照片授權、事件、員工及商品可見性。 |
| 092–095 | 092 加訂閱讀取設定與兩個老闆檢視。093 補現金保存檢查，094 加兩張財務核對表，095 限縮快照 RPC。完成後重跑 45 項盤點與完整 preflight。 |

優先用不含既有資料的隔離結構演練這段順序，特別確認依賴既有函式內容的 073、083、084、089 與 090。082 與 092 的全域強制開關維持遷移預設，驗收用的帳號權限另設。演練清單排除正式站啟用修正、現有帳號名單與資料補填操作。`test_prg` 這輪只完成唯讀核對，待演練通過再安排套用。

本機演練使用專案既有四階段 bootstrap 與 053–071。Docker Desktop 引擎逾時後，改用記憶體內的 PGlite 0.4.5 與合成帳號。071 的資料表和檢視盤點與 `test_prg` 回報完全一致。072–084 全部執行成功，每份遷移後合成 Auth 帳號和 profile 均保留原值。085 在交易中拒絕安裝，原因是 083 升級後只有含 `boolean` 參數的照片函式，而 085 要求另有不含該參數的基底函式。[本機 Docker 演練入口](../../scripts/verify-account-deletion-test-prg-upgrade.ts) · [PGlite 說明](https://pglite.dev/docs/about)

另一輪診斷回滾 085 後，086–095 可在同一類本機結構執行，45 個資料表和檢視名稱及類型均符合。完整 preflight 仍回報資料庫權限、函式及其他結構差異。此輪證明物件可補齊，也定位了第一個相容性阻擋。下一步先確認 `test_prg` 的兩支原始照片函式及執行權限，準備只對應該舊版形態的相容修正，再完整演練。`test_prg` 尚未套用遷移。

085 的測試庫相容修正已完成。本機使用合成帳號重跑 072–095，全數執行成功，085 連跑兩次亦通過。測試涵蓋服務端執行權限、照片版本超過 `integer` 上限、未具權益時拒絕，以及舊權益與 Free／Pro 判斷。合成帳號與 profile 保留原值，45 個資料表和檢視名稱及類型均符合。[085 相容修正](../../supabase/repairs/085_test_prg_boolean_photo_rpc_compatibility.sql) · [測試案例](../../supabase/tests/085_test_prg_boolean_photo_rpc_compatibility.sql)

本機 096 完整前置檢查有 189 項結果，其中 142 項顯示與既有正式基線不同，包括 26 個資料表或檢視、105 個函式指紋與 11 個額外函式。這是本機隔離庫的結果，`test_prg` 的實際差異仍需透過遠端唯讀盤點確認。先前已在 `test_prg` 查到舊版照片函式的簽章，但本輪 Chrome 管理連線逾時，兩支函式的執行權限與定義指紋仍待讀回。遠端測試庫尚未套用這批遷移。[照片函式唯讀查詢](../../supabase/verification/085_test_prg_boolean_photo_rpc_readiness.sql)

`test_prg` 的照片函式已完成遠端唯讀核對。兩支舊版函式的簽章、完整定義指紋及權益條件指紋都與本機演練一致。兩支函式均由 `postgres` 擁有，`service_role` 可執行，`anon` 與 `authenticated` 不可執行，且未發現其他執行授權。此結果確認 085 相容修正對應實際照片函式。下一步是在同一測試庫演練 072–095 並整批回滾，再依實際目錄差異審查 096 的測試庫基線。[Supabase 唯讀結果](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/c7c93201-1bdf-437f-afec-3476f76a0403)

2026-11-10 已在遠端 `test_prg` 完成 072–095 單一交易演練，085 採已核對的測試庫相容修正。交易內 40 張表和 5 個檢視均與 096 預期的名稱及類型相符。完整前置檢查仍列出 20 個資料表或檢視結構差異、22 個函式定義指紋差異，以及 1 個額外函式。095 快照檢查通過。演練以預期的 `REHEARSAL_COMPLETE_ROLLED_BACK` 結束。另一份查詢確認三個演練新增物件均已回滾、舊照片函式指紋恢復，Auth 帳號仍為 5 個。正式專案與 096 開關未動。下一步擷取差異物件名稱及欄位、權限或定義摘要，再審查哪些需要修正、哪些屬測試庫可接受的差異。[演練產生器](../../scripts/prepare-account-deletion-test-prg-rollback.mjs) · [雲端演練回條](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/3cad34a8-66bc-45ba-92bb-9b7300190743)

差異審查準備完成。執行 `node scripts/prepare-account-deletion-test-prg-rollback.mjs --details` 可產生同樣強制回滾的明細版。回條列出物件、不同的結構欄位、函式是否缺少，以及定義不同函式的 `SECURITY DEFINER` 和三個應用角色有效執行權限。本機用合成帳號驗證，明細數量符合本機摘要，並確認回滾後原始盤點與帳號資料一致。本輪 Chrome SQL Editor 連線逾時，未取得 43 項遠端明細。

審查順序先看資料歸屬、外鍵與刪除行為，再查 RLS、政策、授權、函式擁有者與執行權限，最後核對照片鍵與上傳狀態轉換。任何可能影響清理範圍、隔離性或照片完整性的差異都需要解決。單純的定義指紋差異須比對內容後才能歸因。明細回條是調查入口，仍須通過 096 安裝檢查對擁有者、物件設定與函式 ACL 的額外驗證。

### `test_prg` 遠端差異明細與判定

本輪已取得 20 個表或檢視、22 個預期函式及 1 個額外函式，共 43 項。獨立查詢確認三個新增物件均已回滾，原照片函式指紋一致，仍有 5 個 Auth 帳號。[遠端明細回條](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/f3fdd032-7299-4a77-8daf-8507387066b7) · [獨立回滾確認](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/287bfbbc-94a6-4b56-aea7-039b48cd23d1)

| 結構差異 | 受影響物件 |
| --- | --- |
| 欄位（8） | `events`、`market_members`、`markets`、`products`、`owner_accessible_events`、`owner_accessible_markets`、`staff_accessible_events`、`staff_accessible_markets` |
| 約束（2） | `events`、`staff_relationships` |
| 政策（16） | `account_entitlements`、`events`、`market_cash_records`、`market_invitations`、`market_journals`、`market_members`、`markets`、`operation_schedules`、`pending_operations`、`preparation_templates`、`product_cover_photos`、`products`、`profiles`、`sale_photo_evidence`、`staff_relationships`、`venues` |
| 授權（1） | `pending_operations` |

上表按差異欄位列出，同一物件可能出現在多列。先核對欄位與外鍵是否影響帳號歸屬和清理範圍。政策比較需使用角色名稱，因這份診斷的參考稿比對 PostgreSQL 角色 OID，而正式 096 安裝檢查使用角色名稱。尚無證據可將 16 項政策差異全數歸因於 OID。`pending_operations` 的授權差異需另核對實際角色與操作權限。

| 函式差異 | 判定及後續 |
| --- | --- |
| 4 支成交照片 RPC 缺少 | `bff_prepare_sale_photo_evidence_delete`、`bff_finalize_sale_photo_evidence_delete`、`bff_list_expired_sale_photo_evidence`、`bff_finalize_sale_photo_evidence_expiration`。已有 060／061 原始遷移，優先在回滾演練中補驗定義及僅供服務角色執行的權限。 |
| 4 支商品照片上傳 RPC | `claim_product_cover_photo_upload` 和 `finalize_product_cover_photo_upload` 各缺一個不含 `boolean` 的簽章，含 `boolean` 的簽章均存在但定義不同。後兩支均為 `SECURITY DEFINER`，應用角色中只允許 `service_role` 執行。依呼叫端與 085／096 契約核對兩組簽章用途，保留版本檢查與上傳協調。 |
| 14 支既有函式定義不同 | `auto_add_staff_to_new_market`、`cleanup_expired_invitations`、`drain_checklist_toggle_pending_operation`、`enforce_event_actor_authorization`、`enqueue_checklist_toggle_pending_operation`、`get_my_staff`、`handle_new_user`、`list_owner_pending_operation_diagnostics`、`product_cover_photo_write_allowed`、`restore_staff_relationship`、`staff_team_access_from_source_rows`、`sync_team_plan_staff_suspension`、`update_market_read_model`、`update_product_read_model`。先核對事件、團隊、產品權益及待處理操作的授權與定義，再檢查其他觸發器用途。 |
| 額外的 `user_market_ids(uuid)` | 舊 006 遷移曾定義同名函式。先查實際定義、有效授權、政策依賴與應用程式呼叫，再決定測試庫的相容修正。 |

目前 096 的安裝阻擋仍成立。下一次 `test_prg` 回滾演練可合併驗證 060／061 相容性、以角色名稱比較的政策明細，以及舊函式的依賴與權限，減少重複執行。

2026-11-11 已完成合併演練。`node scripts/prepare-account-deletion-test-prg-rollback.mjs --compatibility` 將 060／061 加入同一筆回滾交易，並直接沿用 096 安裝檔的政策資料及角色名稱比對方式。本機以合成帳號驗證回滾與四支函式的權限，託管 `test_prg` 的結果如下。

- **成交照片**：060／061 可補齊 4 支函式。定義指紋全部與 096 原值相符，函式由 `postgres` 持有，限服務角色執行。此輪驗證涵蓋資料庫定義及權限，尚未驗證應用程式與 R2 的實際清理。
- **資料政策**：原本 16 個物件的差異中，12 個改用角色名稱比對即相符。仍須比對 `events`、`markets`、`products`、`staff_relationships` 的政策內容。
- **舊函式**：`public.user_market_ids(uuid)` 以 `postgres` 權限執行，接受呼叫者傳入的帳號 ID，`anon` 和 `authenticated` 均可執行。目錄未列出依賴物件，public 函式文字與應用程式原始碼亦未找到呼叫。這些檢查無法排除外部呼叫。優先準備限 `test_prg` 的修正，在回滾中用 `RESTRICT` 驗證移除條件，並核對現用市集權限入口。

獨立查詢確認 4 支成交照片函式已回滾，抽查的升級新增表已回滾，仍有 5 個 Auth 帳號。096 尚未安裝於 `test_prg`。下一輪可合併驗證舊函式修正、4 組政策內容及前一輪其餘欄位、約束和函式差異。[託管相容性回條](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/7430eeb3-1800-42a7-a849-2169f2dc218b) · [獨立回滾查詢](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/407130c5-f485-403c-bab0-6a52e30a932d)

2026-11-11 的 `--harden-legacy` 演練以 `RESTRICT` 移除舊函式，並以合成老闆、查看者與無關帳號驗證 `owner_accessible_markets`、`staff_accessible_markets` 和 `current_user_market_ids()`。三種身分均符合預期。遠端首次執行因 087 要求明填標準員工權限而中止，補齊合成員工權限後，本機和遠端均通過。獨立查詢確認舊函式已恢復、合成市集及合成帳號均已回滾，原有 Auth 帳號仍有 5 個。[演練回條](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/28ffbff0-b144-4db5-9495-80f6526a0e44) · [回滾確認](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/5ad6c3e4-b2cb-44e7-84d1-f5e116677c9e)

4 個物件共有 13 條政策差異，6 條在測試庫缺少，7 條只存在測試庫。測試庫缺少 `events`、`markets` 和 `products` 的老闆限定讀取政策，另外有 5 條舊讀取政策。其餘差異涉及 `events` 的兩條寫入政策、`markets` 和 `products` 各一條插入政策，以及 `staff_relationships` 的一條刪除政策。已定位 041 為三條老闆限定讀取政策的來源。後續應從 096 基線核對各政策的角色和條件，並在同一筆演練中確認直接讀取與授權檢視各自符合預期。[041 讀取政策](../../supabase/migrations/041_tighten_base_table_select_rls.sql) · [市集權限演練 SQL](../../supabase/verification/096_test_prg_legacy_market_access_rehearsal.sql)

2026-11-11 的 `--repair-policies` 回滾演練已在本機與託管 `test_prg` 通過。只替換先前定位的政策，並以 096 安裝檔重新比對角色、命令與條件，結果為零政策差異。合成老闆可直接讀取自己的市集、商品和事件，且可透過事件新增商品、更新自己的同步欄位。查看者的市集入口與出攤助手的授權檢視均通過。出攤助手的三張基礎表查詢與事件更新都受阻，無關帳號也無法存取合成資料。員工關係的刪除政策與基線相符，資料表授權仍禁止應用端直接刪除，這輪未測試員工管理 RPC。獨立查詢確認原政策已恢復、合成商品和事件已回滾，Auth 帳號仍有 5 個。096 安裝前仍須處理非政策差異，包括欄位、約束、授權及函式。[演練 SQL](../../supabase/verification/096_test_prg_policy_rehearsal.sql) · [託管回條](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/a62686a1-a73d-4a8f-b538-0a9739420903) · [回滾確認](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/f56ef0fd-c7ac-4118-893f-13a0b29e7799)

`--audit-catalog` 沿用已驗證的回滾演練，另比對 096 的非政策基線。本機已驗證診斷可完成並回滾。`test_prg` 的回條列出 10 個資料表或檢視的 11 項差異，以及 18 支函式差異。政策差異仍為零，舊函式在交易中移除後也沒有額外 public 函式。獨立查詢確認演練已回滾，Auth 帳號仍為 5 個。[目錄差異回條](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/6cc7e0c1-674a-4a40-aa48-3697fc9999de) · [獨立回滾確認](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/a920cf58-f4ac-40df-8444-ba83444ee688)

| 差異 | 影響及後續驗證 |
| --- | --- |
| `events_market_id_fkey` 在測試庫使用 `ON DELETE CASCADE`，096 基線無此約束 | 096 明確先刪市集事件再刪市集。這條外鍵仍會影響其他刪除路徑，應驗證事件歸屬及清理範圍後再決定如何對齊。 |
| `staff_relationships` 缺 `no_self_invite`，`pending_operations` 多 `authenticated` 的 `DELETE` | 先以唯讀計數確認是否有既有自邀資料，再演練補約束。授權須核對應用程式的待處理操作流程，確認收回多餘授權時 RPC 仍可運作。 |
| `events`、`markets` 與 4 個授權檢視的 `sync_status` 是 `text`，096 預期同名 enum。`products` 多一個 `text` 欄位，`market_members` 只有欄位順序不同 | 先盤點現存狀態值及型別依賴，再決定轉換與檢視重建順序。欄位順序單獨列為基線差異。 |
| 18 支函式中，15 支定義不同，2 支缺少，1 支僅換行格式不同 | `restore_staff_relationship(uuid)` 僅換行格式不同。15 支中，`get_my_staff()` 另有設定差異，4 支帳號／市集／商品觸發器另有設定與 ACL 差異。詳見回條。 |
| 商品照片的 claim／finalize 各缺一個不含 `boolean` 的簽章，現用 `boolean` 簽章的兩支也有定義差異 | 上傳路由會明確傳入 `p_require_entitlement`，走 `boolean` 簽章。先審查 085 及 096 對兩組函式的呼叫，再驗證舊版相容性、權益檢查與照片版本。 |

下一輪先集中驗證會影響資料清理的外鍵、員工約束、待處理操作授權與商品照片函式。096 安裝檢查仍使用原基線。

2026-11-11 本機與託管 `test_prg` 通過 `--verify-cleanup-prerequisites`。移除額外外鍵後，刪除合成市集不再隱含刪除事件，明確限定市集的事件刪除保留另一個合成市集的事件。員工關係無自邀資料阻擋新增約束，合成自邀被該約束拒絕。收回 `authenticated` 的直接 `DELETE` 後，待處理操作仍能透過 RPC 入列與同步。

商品照片的 5 支函式取自已核對的 096 基線，演練中確認定義和授權相符。服務角色可透過現用簽章保存 `bigint` 版本與兩個物件鍵，過期版本被拒絕。演練只寫入合成資料庫中繼資料，R2 的物件清理仍待整合驗證。獨立查詢確認原外鍵已恢復、合成照片已回滾，原有 5 個測試帳號仍在。交易內剩 8 個欄位差異與 13 支函式差異。前一輪函式總數更正為 18 支。[前置驗證 SQL](../../supabase/verification/096_test_prg_cleanup_prerequisites_rehearsal.sql) · [託管回條](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/89489c8c-991d-46a8-b810-3714398d5659) · [回滾確認](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/1ef82ec2-0448-4755-810c-9084e13072b1)

2026-11-11 已準備 `sync_status` 的唯讀盤點，回傳三張表的狀態計數、型別、預設值、現有 enum 標籤及直接與間接檢視依賴。本機合成資料確認盤點能辨識間接依賴，文字轉 enum 保留原值及 `NULL`，未知值被拒絕，回滾後恢復文字型別。Chrome 連線逾時，原生瀏覽器操作也因無法可靠辨識網址停止。本輪沒有遠端盤點結果。取得 `test_prg` 實際狀態與依賴後，再核對目標 enum 標籤並演練實際檢視的權限還原。[同步欄位唯讀盤點 SQL](../../supabase/verification/096_test_prg_sync_status_inventory.sql)

遠端唯讀盤點已取得。`test_prg` 的 `events` 有 94 筆，`markets` 有 8 筆，`products` 有 2 筆。三張表的值和預設值均為 `synced`，欄位允許空值，測試庫原先沒有 `public.sync_status` enum。現有依賴包含各表的預設值、索引，以及兩個員工檢視。演練採用 096 測試基線既有的 enum 定義 `pending`、`synced`、`local_only`、`error`。[唯讀盤點結果](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/e384e828-96ad-4806-8524-9c80096eb57a)

`--verify-sync-status` 在本機與 `test_prg` 通過。`events`、`markets` 轉型前後逐筆比對同步狀態，結果一致。重建兩個老闆檢視與兩個員工檢視後，老闆、出攤助手和無關帳號的可見性符合預期，四個檢視的欄位、定義、擁有者、設定和授權均符合 096 基線。獨立查詢確認 enum 已回滾、原欄位恢復為 `text`，市集、事件筆數和 5 個 Auth 帳號均保留。交易內欄位差異由 8 個降為 2 個，剩 `products.sync_status` 和 `market_members` 欄位順序，另有 13 支函式待核對。[轉型演練 SQL](../../supabase/verification/096_test_prg_sync_status_rehearsal.sql) · [託管回條](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/c40858fc-80e1-49ac-8c40-be7f8f7f7034) · [回滾確認](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/b2ec9b63-7efd-46f5-9a31-020507f69261)

### 2026-11-12 函式基線演練

`--verify-routine-baseline` 暫時套入 13 支經 096 指紋驗證的函式和授權，再執行原有的市集、商品、照片中繼資料、待處理操作與角色隔離案例。這次新增帳號建立後的 profile 驗證，以及員工清單只對該名老闆可見的檢查。舊 `get_my_staff()` 少 `relationship_id` 與 `role`，首次託管演練因回傳型別不同中止。唯讀查詢確認目錄依賴與其他 public 函式引用均為零後，修正版只在已核對的舊簽章使用 `DROP FUNCTION … RESTRICT`，並在同一筆交易重建。使用舊簽章的本機隔離資料庫和託管 `test_prg` 均通過。[演練檢查](../../supabase/verification/096_test_prg_routine_baseline_rehearsal.sql) · [託管回條](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/09c7f2d1-b60b-40ff-9b1e-c5819c45e8c6)

託管交易內 45 個資料表與檢視名稱及類型符合預期，函式、額外 public 函式與政策差異均為零。獨立唯讀查詢確認交易前後的函式指紋、原有 5 個 Auth 帳號、2 筆商品與 23 筆市集成員關係一致，096 安裝結構仍未出現在測試庫。正式站 `9bc1321` 的刪帳 API 維持 `501 account_deletion_disabled`。[唯讀驗證 SQL](../../supabase/verification/096_test_prg_routine_baseline_inventory.sql) · [託管回滾確認](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/00eb247f-0fef-442f-bdbd-f23f382eefb0)

096 的託管測試前置檢查尚有兩項欄位差異。`products.sync_status` 為額外的可空 `text`，兩筆原商品與一筆合成商品在演練內均為 `synced`。目錄只列出該欄位的預設值與同步索引。`market_members` 的欄位集合、型別及可空性相同，`role` 與 `joined_at` 的順序不同。`role` 有約束、索引與刪除政策依賴，需用回滾交易驗證欄位順序對齊後的值及權限。通過完整前置檢查後，再接託管 Auth、PostgREST 與專用 R2 的清理驗收。[欄位與依賴盤點](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/528db1d8-8ae8-4aba-9f72-d2dd7eedd212)

### 2026-11-12 完整安裝前置檢查演練

`--verify-column-baseline` 在回滾交易內對齊最後兩項欄位。先核對 `products.sync_status` 均為 `synced` 且依賴僅限預設值與已知索引，再移除舊欄位。`market_members` 重排 `role`，並還原該欄位的約束、索引和刪除政策。逐筆比對保留資料，驗證合成商品的庫存更新，以及老闆、員工和無關帳號的成員刪除權限。[欄位演練 SQL](../../supabase/verification/096_test_prg_column_baseline_rehearsal.sql)

本機欄位與權限案例通過。託管 `test_prg` 另通過直接取自 096 安裝檔的完整目錄前置檢查，45 個資料表及檢視相符，欄位、函式及政策差異歸零。獨立查詢確認回滾後商品、成員關係與函式指紋相同，原有 5 個 Auth 帳號、2 筆商品、23 筆市集成員關係、兩個索引及原欄位順序均保留。096 安裝結構仍未出現在 `test_prg`，正式站的刪帳 API 回覆 `501 account_deletion_disabled`。[託管演練回條](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/d408f844-fbae-401b-a9e2-f852442e3152) · [獨立回滾確認](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/ad11bfc1-b534-4f3e-8906-4ded9754f1af)

託管整合驗收的下一步是建立只接受 `test_prg` 的安裝目標綁定，再部署受保護的 Preview。現有管理安裝器綁定正式專案。以專用 R2 bucket 與新建合成帳號驗收 Auth、PostgREST、照片上傳重送及清理。

### 2026-11-12 `test_prg` 專用安裝工具

專用入口固定使用 `test_prg` 的 Supabase Management API 與 `SUPABASE_TEST_PRG_ACCESS_TOKEN`。`--prepare` 離線產生測試 SQL 及 SHA-256。測試 SQL 沿用已審查的 096 payload，將安裝目標和安裝回條綁定到測試專案。正式版 096 SQL 與原檔逐位元組相同。[專用入口](../../scripts/account-deletion-test-prg-migration.ts)

`--verify-target` 只讀取目標回應、基線升級標記與安裝結構狀態。`--install-disabled` 要求測試版 SHA-256，先查基線標記，再執行 096 的完整目錄比對與交易式安裝。安裝後讀回專案、payload、目錄指紋和 `runtime_enabled=false`。回條指向其他專案時驗證失敗。目標回應或安裝結果不明時，先唯讀核對再決定下一步。[目標與回條測試](../../tests/account-deletion-managed-target.test.ts)

託管 `test_prg` 目前仍是已回滾的舊基線，需先審查可保留原資料的升級方案，再以測試專案限定的管理憑證核對與安裝。專用工具已生成 SQL，本機缺少測試管理憑證，真實 Management API 連線與安裝尚待驗證。

### 2026-11-12 保留原資料的基線升級演練

`node scripts/prepare-account-deletion-test-prg-rollback.mjs --verify-baseline-upgrade` 產生 `test_prg` 專用升級演練。它沿用 060／061、072–095 及已審查的基線對齊，排除先前用於操作驗收的合成資料。交易內比對既有 public 實體表、Auth 帳號及工作階段的筆數與原欄位 SHA-256 指紋。`products.sync_status` 經確認全為 `synced` 後依基線移除。最後執行 096 的完整目錄檢查。[資料保留比對](../../supabase/verification/096_test_prg_baseline_data_preservation.sql)

本機隔離試跑通過，並以刻意修改既有商品庫存的反例確認驗證會中止及回滾。託管 `test_prg` 通過 31 張表、167 筆原有資料的比對及完整 096 安裝前置檢查。獨立查詢確認回滾後仍有 5 個帳號、2 筆商品與 23 筆成員關係，商品與成員指紋及舊索引均一致，安裝結構尚未建立。[託管演練結果](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/6678b908-8dfb-404c-b5a8-1ab0d9fff3c8) · [回滾確認](https://supabase.com/dashboard/project/tzhbirwchhqabkxhqjdl/sql/2e22b720-1843-4042-97e2-8c0135bf8931)

### 2026-11-12 基線升級與停用版 096 合併安裝

`--prepare-upgrade-install` 生成 `test_prg` 專用 SQL。本次通過的 SQL SHA-256 為 `f1b2cc20109d742ee2483b513fc53b48c98be4157af8cae4156bfa3bb6d7eca6`。同一筆交易鎖定安裝、擷取既有資料指紋、升級基線、通過 096 的完整目錄檢查並安裝停用結構。提交前比對原資料，發現差異即中止整筆交易。安裝後讀回專案、版本、payload、目錄指紋、該次安裝識別與 `runtime_enabled=false`。若管理 API 回應遺失，先執行唯讀核對，再決定後續處置。[專用安裝入口](../../scripts/account-deletion-test-prg-migration.ts) · [合併 SQL 產生器](../../scripts/lib/account-deletion-test-prg-upgrade.ts)

本機以已核對的 095 目錄驗證 096 成功提交，並確認安裝後故意修改既有資料會讓兩個階段一起回滾。託管 Management API 的 SQL 重播與先前 SQL Editor 演練在函式主體的換行格式上有差異。修正會先核對移除 CR 後的完整定義，再依已審查定義還原個別行的 CRLF，只有精確指紋相符才重建。測試涵蓋保留 092／093 現金守衛的混合換行，以及任何實質定義變更維持原樣並由基線檢查拒絕。正式 096 SQL 的檔案指紋與本輪開始時一致。[本機安裝驗證](../../scripts/verify-account-deletion-migration.ts)

託管 `test_prg` 已提交基線與停用版 096。管理入口回報 `installed_disabled_readback_verified`、`installed=true`、`runtimeEnabled=false`。安裝前的函式基線失敗已確認完整回滾。一次性 `test_prg` Database Read-write token 已撤銷，唯讀探測確認 API 回覆 HTTP 401。下一步接受保護的 Preview 與專用 R2，使用合成帳號驗收 Auth、PostgREST、照片重送與清理。

### 2026-11-12 託管 Preview 測試資源與服務驗證

- Cloudflare 已建立私有 `markit-account-deletion-preview`。只限此貯體的 24 小時物件讀寫令牌通過真實 S3 測試：新物件條件寫入 200、重送同鍵回 412、清除合成物件後 HEAD 明確回 404。該令牌已撤銷並由管理清單確認移除。[專用貯體](https://dash.cloudflare.com/72293a95c36f98208b5d84567364c490/r2/default/buckets/markit-account-deletion-preview)
- `test_prg` 已登記一筆專用貯體指紋，讀回相符且 `runtime_enabled=false`。使用新建的合成帳號確認託管 Auth 密碼登入、bearer 身分與 PostgREST 自有 profile 讀取均回 200。上傳回條 RPC 對匿名及登入角色分別回 401／403，SQLSTATE 都是 `42501`。已登出並以 Supabase 管理介面清除該合成帳號。唯讀 SQL 確認既有帳號仍為 5 個，合成帳號的 sessions 及 profile 均為 0。這是測試資料清理，應用程式刪帳引擎仍待託管驗收。
- Vercel 既有 Preview 的匿名 health 請求回 302。候選分支尚無本輪的隔離環境變數，也尚未部署連到新貯體的應用程式。恢復後先為受保護 Preview 配置 `test_prg` 專用服務憑證、只限該貯體的短效讀寫令牌，以及新合成品牌的 owner ID。部署後用同一 revision 驗收商品與成交照片上傳／重送、資料庫回條與物件清理。清理引擎還需合成帳號限定的託管執行方式，現有 SQL 及服務端入口仍停用。

### 2026-11-16 本機修正 Preview 照片重送

依使用者安排，12 月 1 日前在本機開發、測試及提交。Preview 的寫入原本已採用專用貯體，但重送時的讀回只接受 loopback。現在讀回沿用通過檢查的同一組 S3 端點與貯體，逐一核對原圖和縮圖，再向資料庫確認回條指紋。已補本機回歸案例，確認 Preview 模式重送可查到資料庫回條。

本機提交 `db658f1` 含照片接線、設定範本與驗收證據。3 份針對性測試、專用 TypeScript 檢查及 22 組本機整合驗收通過。整合測試使用本機 GoTrue、PostgREST、PostgreSQL 與 S3 替身，涵蓋照片成功重送、回覆遺失、內容衝突、未知寫入需人工審查及合成帳號十步清理。[本機驗收證據](evidence/account-deletion-integrated-candidate-2026-11-02.json)

同日將整合驗收擴至 26 組。本機提交 `4fb1009` 使用同一合成老闆經兩條上傳入口建立商品照和成交照，確認刪帳十步清除四個物件、照片資料列、上傳嘗試紀錄、Auth 帳號與工作階段，其他帳號的物件保留。096 另通過 14 項管理入口測試、23 項隔離安裝檢查及舊基線回滾檢查。本機舊基線模型的目錄差異仍由 096 拒絕。12 月 1 日後以受保護的 Preview 補驗實際部署、Supabase 和 R2 的串接。[本機驗收證據](evidence/account-deletion-integrated-candidate-2026-11-02.json)
