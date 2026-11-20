# iOS 商店、隱私與人工交接包

2026-11-20；候選文案，尚未提交 App Store Connect。對外核定集中進行，這份文件不是已發布／法律批准證據。工程與測試見 [B05](../IOS_WINDOWS_B05_PURCHASE_EXPERIENCE_2026_11_20.md)。

## 首發產品與品牌

台灣名稱：拾光日子；海外：STALLIGHT DAYS。定位「給攤主的營業日誌與帳本」；品牌句「把每一次做生意的日子，好好留下來。」英文定位 A journal for market sellers.；品牌句 Keep the days behind every stall.。中文與英文各自自然呈現；不改現存 Bundle／project／DB ID 來更名。

| 方案 | 能力 | 內部規劃牌價，非商店扣款報價 |
| --- | --- | --- |
| 免費 | 市集安排／報名／錄取／繳費、設備與租金條件、抽成比例、準備、私人心得；無銷售與財務分析 | 免費，不建立商店商品 |
| 輕量 | 免費能力＋成交／互動、商品／庫存／封面、單場成果、基本月摘要、固定成本／抽成金額／估計淨利、選填現金核對 | 月 59／年 588 |
| 高階 | 輕量能力＋跨場比較、完整網頁報告與選用 PDF、成交照片、員工協作及管理分工 | 月 249／年 2490 |

Apple 建立四個 SKU、同一訂閱群組，對應 [目前 catalog](APPLE_STORE_CATALOG_CANDIDATE_2026_11_20.json)四個 `_2026_10_v1` 價格 ID；實際 bundle、群組與 SKU 皆待 App Store Connect。舊價格 ID 保留歷史記錄，不拿舊 Apple handoff 建商品。無創始、試用、優惠、Family Sharing 或自動 grace；要開啟需另審政策，不能只改商店開關。Swift 目前對 intro offer 商品不提供可購買選項。

英文商品在同一群組的當地化草稿如下，均不把價格寫入名稱或說明：

| 版本 | Display name，30 字元以內 | Description，45 字元以內 |
| --- | --- | --- |
| pro monthly | Light · Monthly | Record sales and products, review each market |
| pro annual | Light · Annual | Record sales and products, review each market |
| team monthly | Advanced · Monthly | Compare markets, reports, PDFs and staff |
| team annual | Advanced · Annual | Compare markets, reports, PDFs and staff |

正式 connect／source API 的 hasActiveSubscription 必須把 admin／promotion 等受保護的有效付費資格一併視為不可再購買；不能只看 Apple billing row。原始來源未知也不得自行假設可重複購買。Native plugin 的 config.enabled 亦預設 false，只有完成 E02 審查的配置才能開啟；JS registry、native config、正式後端與可信 reader 必須一起符合條件。

App 使用商店顯示的當地幣別、總價與週期；不由內部牌價推算商店報價、不隱藏年繳總額、不用月均價替代。購買／恢復只由老闆登入操作，員工不得購買品牌資格。既有其他來源不自動轉移或取消。

## 商店欄位與揭露

繁中／英文名稱、副標、說明、關鍵字、類別及 reviewNotes 草稿由 [繁中 JSON](NATIVE_STORE_LISTING_METADATA_2026_08_06.json)、[英文 JSON](NATIVE_STORE_LISTING_METADATA_EN_US.json)提供；[商品顯示名／能力](NATIVE_STORE_PRODUCT_METADATA_2026_08_06.json)可複製，但 final review flags 仍待人工與實際 binary。

| 欄位 | 可用內容／核對 |
| --- | --- |
| 客服 | stallight.days@gmail.com，使用者已確認能收信；不需再次驗證此事實 |
| 支援頁候選 | https://markit-app-mocha.vercel.app/support |
| 隱私頁候選 | https://markit-app-mocha.vercel.app/privacy |
| 條款候選 | https://markit-app-mocha.vercel.app/terms |
| 刪帳說明候選 | https://markit-app-mocha.vercel.app/account-deletion |
| 網域 | stallightdays.com 尚未購買／確認商標，不填成已擁有網址 |
| 正式版本現況 | 付款未開、刪帳引擎未開；公開頁維持實際狀態，不能先宣稱可直接完成刪帳 |

URL 為既有站路徑候選，本批沒有重新部署或聲稱所有公開設定已核定。最終商店必須填可公開讀取的網址，privacy／terms 不得只連需登入頁。商店最終聯絡人姓名／電話／法律主體仍由使用者填 App Store Connect，不放 repo。

付費確認繁中：方案名稱、商店價格／週期、除非於續訂日前取消將自動續訂、可從原商店管理、綁定目前帳號、免費版仍可用、服務條款／隱私連結。英文候選：Your subscription renews automatically at the price and interval shown by the App Store unless you cancel before renewal. Manage or cancel in the original store. Your verified purchase is linked to your signed-in STALLIGHT DAYS account. Free market planning remains available without a subscription.。英文 App UI 尚無完整 i18n，不把英文商店文案視為已支援全英文介面。

## 資料流與保留對照

| 資料 | 處理者／用途 | 本機來源證據與發布待補 |
| --- | --- | --- |
| 信箱、使用者／品牌 ID、登入權限 | Supabase Auth／DB；登入與品牌資料隔離 | 既有 auth／capability，iOS Keychain；不將登入 token 寫交易日誌 |
| 市集、商品、營業與心得 | 本機 Local-First＋Supabase，備份／同步與功能 | 依方案限制查閱；降級保留，不承諾未訂閱永久可閱銷售 |
| 商品封面、成交照片 | R2 物件、DB 版本／引用、Vercel handler | 成交照片 7 日等既有政策；新 writer 不改照片保存規則 |
| 購買 JWS、交易／鏈 ID、商品、到期／撤銷狀態 | StoreKit→Vercel Apple 官方 SDK→Apple API→私有 DB／F3B | 屬連結帳號的 Purchase History；App 不收信用卡號。JWS 在傳輸／驗證期間，不放 JS 持久化／console |
| appAccountToken | 私有 binding，對應目前 owner、確認同一商店訂閱 | 是可連結使用者的 identifier，不應因 opaque 而宣稱匿名；正式刪帳保留必須核對 |
| 未完成交易／不確定旗標 | StoreKit 保存交易，私有 device-only Keychain 只放每 binding 布林旗標 | 不產生權益、不得靠逾時清除；Keychain 可跨重裝存在，H01 要實測；退出帳號不轉移另一帳號 |
| 操作稽核、重送回條、通知 UUID | DB inbox／receipts，防重複與問題追查 | 不記錄原始 JWS／金鑰／access token；精確期限、去識別化與限制存取於正式部署前核定 |
| 支援信件 | Gmail 人工支援 | 使用者提供的申請資料；不要求密碼、驗證碼、完整付款資料。明確保留／刪除作業待營運核定 |

使用者已確認沒有自行資料備份／副本；**這不等於 Supabase、Apple、Cloudflare、Vercel 沒有供應商備援／帳務紀錄**。實際 provider 保留、log redaction、備援刪除限制與地區需在控制台／合約核對。不能宣稱刪帳立即清空全部供應商資料，也不能隨意移除 B04 binding RESTRICT FK 繞過刪帳。

新增私有 StoreKit package 使用系統 StoreKit／Security，沒有新增 RevenueCat、廣告或分析 SDK。Apple server SDK／pg 只在 server，不能進手機包。最終 PrivacyInfo.xcprivacy／required-reason API 與 transitive binary inventory，待 B06／Mac resolved package 與實際 archive 核對；來源無追蹤設計不替代商店 privacy 問卷批准。

## 審查腳本與素材

1. 由安全管道在 App Store Connect 填非到期 review owner 帳號與合成品牌；不要把 reviewer 密碼寫 repo。此帳號可進免費安排、輕量記錄、高階報告與測試員工，且無客戶資料。
2. 登入→今日／市集→新增場次→報名／錄取／繳費；展示免費版設備／抽成條件，不出現銷售或利潤。
3. 設定→方案中心→選輕量／高階月或年→確認名稱／價格／週期／續訂／條款→App Store 沙盒購買→伺服器確認→回到對應功能。
4. 再進方案中心→管理訂閱；以相同 Apple 與 App 帳號主動恢復。驗取消、pending、離線重開、切錯 App 帳號、提交回應遺失；不能因 review 而讓測試覆寫方案冒充商店購買。
5. 高階→分析→查看完整報告→網頁閱讀→選用 PDF。輕量只有基本摘要，不展示高階 PDF 入口。
6. 設定→帳號與資料→刪帳申請／確認／撤回；正式執行需 E01／E02 安全與資料保留整合後才可給審查員操作。取消商店訂閱與刪 App 帳號不同；實際申請不應被永久導向人工信箱替代可用的 in-app deletion。

截圖分鏡：①今日市集／提醒，②免費報名與準備，③快速記帳／成交，④選填現金對帳，⑤私人心得回顧，⑥高階完整網頁報告與商品／場次比較。每張標示適用方案，移除合成驗收工具、debug、測試身分切換、救援入口；以真實 iPhone 候選截圖，不能拿本機注入畫面宣稱真購買成功。

圖示與原有品牌規格沿 [品牌 brief](../brand/STALLIGHT_DAYS_BRAND_BRIEF_2026_11_02.md)，Mac archive 核對 AppIcon 1024、實際 alpha／裁切／顯示名、launch screen 與各支援螢幕尺寸；不自行承諾不存在的平板原生支援。Windows 報表／比較維持大螢幕資訊密度；首發 iPhone 以單欄與觸控操作為主。

## 集中人工／外部清單

| 時點 | 必須補齊 | 已知可沿用 |
| --- | --- | --- |
| B06 | 既有 npm audit 安全項目修補、Mac／bootstrap 命令／lock 與 packaging 檢查；定 revision 的 Web／mobile 發布驗收 | B01–B05 已有本機證據，不重跑未變更大矩陣 |
| E01，12/1 後 | test_prg 目前目錄、受保護 Preview、專用 R2、完整刪帳串接與停止／清理 | 客服收信與無自行備份已確認 |
| E02，Apple 設定可用 | Developer 會員、法律主體／合約／稅務／銀行、Bundle／App Apple ID、群組／四 SKU、API key／通知URL／沙盒；正式 binding API、writer／reader、限流、監控、定期補核對 | 價格／三方案既定分界；不要求現在貼 key 或先買 Mac |
| 正式 SQL 前 | billing 私有 binding／receipt／audit 保存、刪帳 fence／FK／去識別化、provider 副本、具體 retention／事故支援責任 | B04 local-only SQL 不可直接跑正式庫；不沿舊 096 指紋直接放行 |
| H01 | macOS／Xcode 26、Swift 編譯、簽署、iPhone／TestFlight、真 StoreKit 全生命週期與背景／重裝／兩裝置 | Windows 注入 bridge 與真 SDK 簽章不替代真機 |
| 送審前一次核定 | 對外網址、文案、法律／隱私、保留期限、聯絡人、問卷、review 帳號及真截圖 | 核定內容後再填控制台；本批皆維持 disabled／pending |

目前不需要使用者跑 SQL、交付密碼或挑選新商業政策。若不開試用／優惠／grace／family，沿本批保守首發範圍前進即可。
