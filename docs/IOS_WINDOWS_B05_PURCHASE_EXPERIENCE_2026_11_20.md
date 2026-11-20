# B05 購買／恢復與對外資料交付

日期：2026-11-20。基線：5eeda86；本機修改見本輪提交。W05-01、W05-02、W06-01、W06-02 的 Windows 來源、注入流程、文案及交接清單已完成。正式購買、真實商品、Swift 編譯、沙盒及最終對外批准**未完成**。沒有 push、部署、雲端 SQL 或真實扣款。

## 本批結果

- [來源審查](subscription/APPLE_B05_SOURCE_REVIEW_2026_11_20.md)選擇直接 StoreKit 2；不增加聚合帳務供應商。新增[私有 Swift plugin](../plugins/stallight-purchases/ios/Sources/StallightPurchasesPlugin/StallightPurchasesPlugin.swift)、SPM／Podspec／file package 宣告；未生成原生專案，未升級 Capacitor。Windows 本輪以注入 bridge 驗證。
- [平台 adapter](../lib/platform/capacitor/apple-purchases.ts)接商品、購買、恢復、unfinished、finish 及管理；[原生 loader](../lib/platform/capacitor/load-apple-purchases.ts)必須明確配置且有實際 plugin。現在 loadIosPlatform 仍裝入 unavailableNativePurchases；沒有從環境變數或網址偷偷啟用。
- [共用 session](../lib/subscription/apple-purchase-session.ts)串起購買與 B04。未完成交易交由 StoreKit 保存；只有原生 Keychain 的不確定旗標，不把 JWS 寫到 Web／Dexie／auth storage。取消、pending、斷線、回應遺失、重開、切帳號、重複點擊、finish 失敗分開處理。後端 review／不明不 finish；retry 不呼叫 purchase。
- [API client](../lib/subscription/apple-purchase-client.ts)沿既有 API base／timeout，POST 不自動重送。請求僅有 schema、store、product、JWS；owner／價格／環境來自伺服器。只有 B04 projection_ready／duplicate 才視為已保存，200 的 hold 不能當成功。能力 refresh 必須讀回目前 owner 的可信付費權益才可回 true。
- [畫面](../components/subscription/ApplePurchaseView.tsx)使用商店 displayPrice／月年週期，手機單欄、平板雙欄；選方案後以底部確認面板揭露續訂、帳號綁定、條款與隱私，再進 App Store。尚未取得四個有效商品或必要審查未完成不得購買。已有方案時不展示四張停用卡片，優先管理／恢復。免費帳號仍可恢復。
- [接線元件](../components/subscription/NativeSubscriptionActions.tsx)處理網路、前景及 StoreKit 更新；登入世代／cleanup 阻止舊結果更新新帳號。缺 capability 不誤稱離線。管理畫面返回只提示重新檢查，不宣稱新交易已保存。
- [Runtime registry](../lib/subscription/apple-purchase-runtime.ts)預設 null，目前沒有正式 installer。舊 Web／原生方案預覽保持不變；沒有以本機成功開放收費。正式 bootstrap、authenticated binding endpoint、B04 route／writer／reader 仍由 E02 整批審查部署。

## 驗收與證據

[機器證據](evidence/ios-windows-b05-purchase-2026-11-20.json)記錄 6 組跨層整合：真實 GoTrue 登入、本機 PostgreSQL、B04 handler、官方 SDK 密碼學驗證、合成 CA／Apple HTTP。沿用 B04 的 writer 安全與生命週期矩陣，不重新跑其 27 組。這不是 Apple Sandbox。

[18 組流程測試](../tests/apple-purchase-session.test.ts)涵蓋成功、重複點擊、回應遺失後重開、review／rejected 不交付、離線／過期能力／員工拒絕、切帳號、取消、pending 重開、finish 失敗、免費恢復／錯綁定、來源管理、商品／價格缺漏、讀取權益失敗與 API 精確資料契約。

本機瀏覽器在 400×844、320×740 CSS 像素 操作實際 React 接線與確認面板：正常購買、回應遺失→重新檢查、取消、pending、錯誤帳號、其他來源、Apple 管理。回應遺失恢復後購買呼叫仍 1 次、驗證 2 次。窄螢幕無購買卡片橫向排擠，確認面板可返回。實際發現並修正已有訂閱卡片推擠管理入口、管理返回誤稱交易已保存等問題。測試頁只由 [loopback 工具](../scripts/serve-apple-b05-ui.ts)打包 [fixture](../tests/fixtures/apple-purchase-browser.tsx)，無正式 test route。

瀏覽器 viewport 受主機縮放影響，以 DOM 實際寬度 320／400、scrollWidth 相同與按鈕高 44 CSS px 核對；部分截圖擷取未能保存，因此不把截圖存檔列為完成證據。

13 檔定向檢查全部通過，包含原生 port／workflow／disclosure、方案中心、現行商品文案／CLI、資料揭露／商店文案、原生啟動與驗證合約。TypeScript、變更元件 ESLint 與 mobile build 通過；37 個 aliases、397 個檔案／20.41 MiB，靜態邊界與 11 個路由／資產 smoke 通過。建置使用 .invalid 公開合成 API 設定，不可直接拿 out 上架，B06 需用最後確認的公開來源重建。沒有重跑照片／刪帳大矩陣。

新私有 package 只以 lock-only 登錄；乾淨 checkout／Mac 先正常 npm ci 再生成／sync，不能把本機忽略目錄或先前的 node_modules junction 當作交接內容。npm 仍回報既有安全項目，本批沒有額外引入第三方商店 SDK；修補安排 B06。097 相容 manifest 只同步測試清單的來源指紋，SQL、資料清理與正式開關不變。

```powershell
node --import tsx tests/apple-purchase-session.test.ts
node --conditions=react-server --import tsx scripts/verify-apple-b04.ts --b05-isolated
node --import tsx scripts/serve-apple-b05-ui.ts --local
```

UI 工具僅接受 loopback 41435，輸入 stop 停止。所有測試使用合成憑證；無正式 key／receipt／token 輸出。整合工具結束清除容器／網路／臨時簽章私鑰。

## W06 對外資料

[完整商店／資料流／人工交接包](subscription/IOS_B05_STORE_HANDOFF_2026_11_20.md)已依 B03／B04／B05 分清現在與付費首發目標：

- 目前 Apple 四商品候選與 [商品文案 JSON](subscription/NATIVE_STORE_PRODUCT_METADATA_2026_08_06.json)一致，不再用舊 199／1990 的 Apple ID 或創始方案。歷史價格資料不改寫；Google 舊 catalog 留 Android 工作流獨立審查，不能照抄建立商品。
- 繁中／英文商店說明保留品牌與三方案功能差別，不寫死實際扣款金額、不宣稱無限／完整專業會計或已上架。
- [資料揭露 JSON](subscription/NATIVE_STORE_DATA_DISCLOSURE_BASELINE_2026_08_06.json)補私有 StoreKit source、B04 交易／binding 資料來源與原生不確定旗標；上游 Apple／Supabase／R2 保留及最終 binary 隱私審查未冒稱完成。
- 客服信箱 stallight.days@gmail.com 已由使用者確認可收信，不再重問。正式法務、保留期限、商店最終填寫及真原生截圖集中於交接包。

## 下一批與界線

下一批 **B06：Windows 候選交接**。集中處理既有 npm audit 實際安全項目、固定 revision 的 Web／mobile／發布檢查與 Mac 命令；不要把本輪 source-only Swift 當作已編譯。

E01 仍按 12/1 後做 test_prg 刪帳託管整合；E02 需要正式 binding／writer migration 與 reader、刪帳 FK／保留整合、route／CORS／TLS／限流監控、實際 Apple 商品與金鑰。H01 才驗 Swift、真 StoreKit、帳號交錯、Ask to Buy、原生終止／重裝、退款／到期及跨 Web 權益。

原生不確定旗標寧可保留待核對，不會以等待時間推斷未扣款或自動允許再買。若 StoreKit 沒有任何可核實交易但旗標仍存在，需 E02／客服讀回結果後設計受控解除，不能加「直接清除重買」按鈕。沒有把這個保守分支當成真機已驗證。
