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
| 6 公開配套 | 新 `/account-deletion` 頁與支援入口，遵循既有配色／返回設計；說明尚未開放自助刪除、員工／老闆範圍、不可回復與未來商店訂閱區別。沿用既有客服設定，未編造信箱／期限 | 備份／外部副本清單、實際處理期限、客服信箱可收件與人工承接尚待確認；頁面維持草案，不是已核准商店公開刪帳資源 |
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

外部資訊：使用者已提供公開客服信箱 `stallight.days@gmail.com`；收信實測與刪除需求承接尚未明確確認，Supabase／R2 以外副本／備份及保留方式也尚未回答。已一次合併詢問，不再索取已知信箱；未確認項目仍阻擋正式啟用。未來正式商店訂閱供應商通知另依原生任務，不擴入本批。

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

- 顯示品牌：**拾光日子 × STALLIGHT**。使用者說明功能沿用原 Féria，僅更改名稱與介紹；資料庫識別、既有鎖 key、相容性契約不因顯示品牌改名而任意替換。
- 定位：給攤主的營業日誌與帳本；適用手作文創、固定夜市、餐車與固定／流動交錯的攤主。記錄每次擺攤、每筆營業、場地與商品表現，讓經營紀錄可回顧。
- 主句：**把每一次做生意的日子，好好留下來。** 後續對外刪帳／客服文案使用此品牌，不再新增 Féria 的行銷名稱。
- 公開客服信箱：`stallight.days@gmail.com`（使用者提供）；**已知地址不等於已完成收信／人工承接驗收**。未寄測試郵件、未替使用者回覆客戶，也沒有因此標記 legal／support gate approved。
- 備份／其他副本：尚未確認，不解讀為「沒有備份」。本輪未進行全站品牌置換或覆寫另一批 Demo／素材變更；對外頁面／環境設定套用與承接確認保留為發布配套。
