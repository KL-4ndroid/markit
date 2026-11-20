# B04：Apple 訂閱後端本機整合

日期 2026-11-20；基線 `4e286c5`。對應 W04-01、W04-02、W04-03。

**本機來源與隔離整合完成；正式付款、商店與線上權益仍未開放。** 本輪只在一次性本機資料庫寫入合成資料，沒有遠端 SQL、推送、部署、取得商店金鑰、扣款、取消、退款或原生套件變更。[實作前技術審查](subscription/APPLE_B04_SOURCE_REVIEW_2026_11_20.md)依使用者要求 B04 的授權完成；不等於 Production 啟用批准。

## 已實作

| 範圍 | 交付與安全邊界 |
| --- | --- |
| 目前方案與版本 | 新增輕量月繳 59／年繳 588、高階月繳 249／年繳 2,490 的版本，舊 199／1,990／499／4,990 與創始方案版本保留、不轉換舊訂戶。新版本仍是 candidate；[Apple 最新商品交接](subscription/APPLE_STORE_CATALOG_CANDIDATE_2026_11_20.json)的 App／商品 ID 為空，不能購買。 |
| 伺服器價格來源 | B04 私有 repository 可讀取受 F3A 不可變規則保護的價格版本與商品映射。已實測只在 DB 新增未存在於程式碼中的未來版本，即可處理對應商品；舊價格不變。只有具此受保護資料庫來源的 server repository 可選用動態版本；記憶體／既有合約預設仍使用原靜態驗證。後台 UI、既有訂戶調價批次及通知尚未實作。 |
| 綁定與寫入 | 伺服器為老闆建立唯一 appAccountToken；不從 Email、裝置、client ownerId 判定歸屬。PostgreSQL owner／provider-chain 鎖、全域來源唯一約束、回條與 F3B 稽核／訂閱快照／subscription_accounts 原子提交。另一帳號不能認領同一 chain；admin／promotion 仍受保護。 |
| Apple 驗證 | 使用官方 Node library 3.1.0。正式 SDK constructor 只接受固定 Apple G3 DER root SHA、啟用 online certificate／OCSP checks，固定環境、Bundle ID、群組，Production 需 appAppleId。未加入自行簽章信任、Xcode／local-testing bypass 或任意 API endpoint。 |
| 最新狀態 | 購買 JWS 只用來驗證身分及找出 chain；權益必須另查 Get All Subscription Statuses，驗證內層交易與續訂 JWS、App／商品／環境／token／chain，才能交 writer。舊查詢按開始時間排序，較晚回來不代表較新。 |
| 通知 | 外層與交易驗證後才查 owner；沿用 F3B inbox，防重送／不同內容相同 UUID、處理 lease 與期限、失敗重試。程序中斷後可重新查最新狀態；不依通知類型或 client 宣稱直接授權。 |
| 生命週期 | 取消續訂仍保留已驗證期間；到期／退款或撤銷限制權益、保留營運資料。試用、優惠、grace／billing retry、未知狀態等以 review_required 保留，不自行延長或啟用。沒有自動取消另一來源或轉移帳號。 |
| API 邊界 | 實際 handler factories 做登入、方法、64 KiB body 限制、簽章、逾時及固定安全代碼；沒有回傳 JWS／token／provider reference。未建立公開 API route 或環境啟用旗標。B05 接購買來源時仍需依核定的正式邊界接線。 |

## 集中驗收

工具：[一次性整合](../scripts/verify-apple-b04.ts)；[一般來源／簽章測試](../tests/apple-b04.test.ts)；[機器證據](evidence/ios-windows-b04-apple-local-2026-11-20.json)。

環境為 Windows／Node 24、本機 PostgreSQL 17、真實 GoTrue 登入與 PostgREST、原始 migrations 063／066／067，以及有資料庫名稱守門的 [B04 SQL 草案](subscription/drafts/APPLE_B04_LOCAL_WRITER.sql)。測試使用臨時生成的 ES256／x5c root→intermediate→leaf，交由官方 SDK 做真實密碼學驗證；**該 root 與 provider HTTP 均為替身，不是 Apple Sandbox 通過**。測試結束移除容器、私有網路與臨時私鑰。

27 組整合案例通過，包含：

- 匿名、一般登入者、一般 service_role、員工及缺 verified marker 的 writer 拒絕。
- 篡改簽章、錯誤 App／環境／商品／帳號／交易型態／Family Sharing 不授權；非 Apple root 不能使用正式 constructor。
- 同帳號同時購買、重送、真正提交後回應遺失；沒有重複 subscription，也沒有憑牌價捏造已扣款交易。
- 通知重送、provider 暫停後重試、取消續訂、恢復最新方案、延遲的舊購買 proof、舊查詢慢回覆。
- 試用／優惠及 grace 明確待政策審查；期限／撤銷、帳號競爭只有一位勝出。
- SQL 已執行 apply 後、COMMIT 前發生錯誤，F3B snapshot、回條、稽核與投影全部回滾。
- 處理 lease 過期後重取；inbox 最後無 processing 殘留；原有營運資料仍存在。
- 新的 DB 價格版本不需改程式；舊價格及受保護 admin 資格保留。
- 已存在另一個有效來源時保留待處理，既有有效權益不被取代，也不自動取消／退款。

一般定向測試涵蓋原價格／價格基礎、reconciliation、catalog、verification contract 及新 B04 測試；沿用 B01／B03 已驗的 UI、離線與草稿。沒有重跑完整 479 檔或照片／刪除引擎大矩陣。最終型別、ESLint、manifest 與行動產物檢查見機器證據。

### 修正與取捨

1. 測試資料最初每次查詢都產生不同的 purchase／expiry 時間，使相同交易看似新快照。改為固定合成期間；沒有放寬重送判斷。
2. provider 查詢先開始卻較慢返回，可能蓋掉更新的狀態。改用查詢開始時間並以驗證過的購買／撤銷日期作因果下限；真實並行案例證明舊結果回來後為 stale，查詢期間發生的合法續訂也不會誤當未來資料。
3. 簽章與 server mapping 不是一回事；candidate／缺少映射仍拒絕授權。新價格的 DB authority 只存在私有 repository，不接受 request 中的價格、owner、環境或權益欄位。
4. 官方 SDK 新增相依的 jsrsasign 有上游停維護警告；本輪 npm audit 名單沒有新 SDK／pg 套件，但專案既有 Next 等有實際安全通報。保留稽核摘要到 B06，發布前集中修補與驗收；沒有為 B04 順帶大幅升級框架或宣稱全專案無漏洞。
5. SDK 將 OCSP／憑證服務暫時失敗標示為 retryable；通知入口回 503 讓供應商重試，與真正無效簽章的 400 分開。單元測試已覆蓋此分支，真實 OCSP 服務仍待 E02。

## 執行／停止

```powershell
node --conditions=react-server --import tsx scripts/verify-apple-b04.ts --isolated
node --conditions=react-server --import tsx tests/apple-b04.test.ts
```

整合工具拒絕活躍 `.env`、供應商憑證、遠端 Docker 與部署環境；固定 Docker Desktop context、loopback ports、專用 label。只接受資料庫 `stallight_b04_test`，安裝草案和各 writer 操作皆再次核對。**不要在 Supabase SQL Editor 執行這份草案，不要移除 local target guard。** 正式 migration 編號及安裝策略等 E02 審查後再選，不改寫已執行的 096／097。

本機 npm 一般安裝遇到既有 dev log 被占用，使用 package-lock-only 及忽略目錄的隔離安裝提供這三項新相依的本機 junction；沒有停掉使用者的 dev server 或刪除 log。乾淨 checkout 可由正常 package lock 安裝，不需要這些本機 junction。新增 SDK／pg／types 及 hasown 的 patch 解析均記於鎖檔；沒有改 Capacitor 版本。

## 尚待完成，集中接續

| 時點 | 必須補齊 |
| --- | --- |
| B05 | 購買／恢復／管理訂閱 adapter 與畫面接線；以本輪目前四方案商品交接取代舊 Apple handoff，依商店實際價格顯示，不能將內部牌價視為扣款金額。Windows 用注入 bridge 驗流程。 |
| E02 | Apple Developer／App Store Connect 身分、Bundle ID、App Apple ID、訂閱群組、四個商品、Issuer／Key ID／私鑰及正式憑證配置。完成真實 API、OCSP 與通知測試；不在對話或日誌貼金鑰。 |
| E02／正式啟用審查 | 重新讀目標 schema、準備正式 migration／唯讀驗證、最小 DB login／pool、rate limit 與監控、provider outage／漏通知的排程核對、正式 CORS／TLS。B04 的 SQL 不能直接部署。 |
| 刪帳整合／W06 | 新 binding／receipt 等私有資料的匿名化與保留、帳務副本及刪帳 fence 必須納入更新；binding 的 owner FK 目前 RESTRICT，未處理前會阻止刪除 owner。不能直接解除 FK 或沿舊 096 指紋放行。 |
| 人工集中決策 | 若首發要試用、優惠、grace／付款重試或 Family Sharing，另核定政策及商品設定；目前皆不自動開放。調價通知與既有訂戶批次仍依既定 60 天等政策，未由本輪新版本測試自動執行。 |
| H01 | 真 iPhone StoreKit 購買／恢復，供應商沙盒退款／續訂／到期、背景中斷與跨 Web 權益。不能用本機管理員方案或本機 CA 代替。 |

現有 capability reader 仍將 billing 視為未接通，SQL 的已保存投影不會單憑 B04 讓正式使用者取得付費權益。canonical 的 writer／Apple runtime 啟用批准保持未完成，只補上本機已實作的證據。下一批為 **B05：購買體驗與來源接線**。
