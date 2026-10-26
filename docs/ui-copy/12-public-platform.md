# 公開政策、支援與平台文字：提示與介面文字

> 自動產生；請勿手動修改。重新產生：`node scripts/generate-ui-copy-inventory.mjs`。
> [總索引](../APP_UI_COPY_INDEX.md) · [完整 JSON](inventory.json) · [逐檔覆蓋](coverage.md)

共 132 筆來源位置；同字不同出處分開記錄。這是來源盤點，候選與未啟用分支不算已上線功能。

## app/privacy/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-27a9fc29e944<br>[app/privacy/page.tsx:11:13](../../app/privacy/page.tsx#L11) | 隱私政策 | **畫面文字** · 直接呈現定義<br>PublicDocumentShell：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-04d938deb93e<br>[app/privacy/page.tsx:12:19](../../app/privacy/page.tsx#L12) | Féria 如何蒐集、使用、保存與保護帳號及市集營運資料。 | **畫面文字** · 直接呈現定義<br>PublicDocumentShell：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8a1868a92cfe<br>[app/privacy/page.tsx:13:22](../../app/privacy/page.tsx#L13) | ${config.effectiveDate} | **動態文字入口** · 執行時綁定入口<br>PublicDocumentShell 接收執行時文字；內容需追查所列綁定與生產端 | PrivacyPage · effectiveDate<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-053d5c4852ee<br>[app/privacy/page.tsx:17:63](../../app/privacy/page.tsx#L17) | 1. 資料控管者與適用範圍 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a3a37c8f6cd0<br>[app/privacy/page.tsx:19:11](../../app/privacy/page.tsx#L19) | 本政策適用於 Féria 出攤筆記的 Web 應用、同步服務、支援流程及您選擇啟用的媒體功能。正式資料控管者為本頁公開設定的服務營運者；若營運者資訊未完整顯示，本版本仍是上架前草案，不得視為已完成對外告知。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a08a8801c4bb<br>[app/privacy/page.tsx:24:63](../../app/privacy/page.tsx#L24) | 2. 蒐集的資料 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-173da8ba0efa<br>[app/privacy/page.tsx:26:15](../../app/privacy/page.tsx#L26) | 帳號識別資料：電子郵件、使用者 ID、登入與權限狀態。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f596b81b8a0d<br>[app/privacy/page.tsx:27:15](../../app/privacy/page.tsx#L27) | 品牌營運資料：品牌設定、市集、商品、成本、成交、互動、備註與分析結果。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-96459fbb9c4b<br>[app/privacy/page.tsx:28:15](../../app/privacy/page.tsx#L28) | 團隊資料：邀請、成員關係、角色、權限與必要的操作紀錄。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a0325e588a63<br>[app/privacy/page.tsx:29:15](../../app/privacy/page.tsx#L29) | 選用媒體：商品封面，以及啟用成交照片功能時所提交的照片與其狀態資料。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c945faa3ad26<br>[app/privacy/page.tsx:30:15](../../app/privacy/page.tsx#L30) | 技術與安全資料：版本、錯誤碼、請求時間、必要的稽核與事故診斷資料。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-30f079cce079<br>[app/privacy/page.tsx:33:11](../../app/privacy/page.tsx#L33) | 自由文字、備註與照片可能包含您自行輸入的第三人資料；請只提供完成市集營運目的所必要且有合法依據的內容。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8c95001d372d<br>[app/privacy/page.tsx:38:63](../../app/privacy/page.tsx#L38) | 3. 使用目的與方式 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-937ad68d0755<br>[app/privacy/page.tsx:40:11](../../app/privacy/page.tsx#L40) | 資料用於驗證帳號、維持工作空間權限、同步與重建資料、呈現營運紀錄、產生您可見的分析與報表、提供支援、偵測濫用及處理安全事故。Féria 不以出售個人資料為營運方式，也不會把品牌營運資料提供給其他品牌作商業使用。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9b5fcea78fef<br>[app/privacy/page.tsx:45:63](../../app/privacy/page.tsx#L45) | 4. 雲端服務與裝置暫存 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-76c7135d0911<br>[app/privacy/page.tsx:47:11](../../app/privacy/page.tsx#L47) | 登入後的雲端資料是帳號復原與跨裝置同步的主要可信來源。裝置端資料僅用於效能與離線操作，部分尚未同步的變更可能暫時只存在該裝置；清除瀏覽器資料前應先確認同步狀態。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-af0b833c2970<br>[app/privacy/page.tsx:50:11](../../app/privacy/page.tsx#L50) | 為提供服務，資料可能由受託服務商處理，包括 Supabase 的驗證與資料庫、Vercel 的 Web 主機與伺服器執行環境，以及功能啟用後用於私人照片物件的 Cloudflare R2。實際區域、跨境傳輸與受託契約須在正式上架前完成審查。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2f31d291f63a<br>[app/privacy/page.tsx:55:63](../../app/privacy/page.tsx#L55) | 5. 保存與刪除 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-843e0494d0d5<br>[app/privacy/page.tsx:57:15](../../app/privacy/page.tsx#L57) | 帳號與品牌營運資料原則上保存至帳號存續、使用者刪除資料或完成經驗證的刪除請求為止。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2b4d34a86e9f<br>[app/privacy/page.tsx:58:15](../../app/privacy/page.tsx#L58) | 裝置離線暫存保存至完成同步、使用者清除資料、瀏覽器移除網站資料或裝置政策淘汰為止。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a1a4ebcd355d<br>[app/privacy/page.tsx:59:15](../../app/privacy/page.tsx#L59) | 成交照片物件自成功上傳起保存七日；到期後成交金額與狀態資料仍可能保留，避免形成破損紀錄。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ea4c735184ba<br>[app/privacy/page.tsx:60:15](../../app/privacy/page.tsx#L60) | 商品封面保存至替換、刪除商品、主動刪除或帳號清理流程完成為止。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-484f671d49cb<br>[app/privacy/page.tsx:61:15](../../app/privacy/page.tsx#L61) | 安全、稽核、支援及未來帳務資料，依處理目的、爭議處理與適用法令保存；各類上限須在正式法務核准前記錄於內部資料保留表。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8e26f016e35a<br>[app/privacy/page.tsx:64:11](../../app/privacy/page.tsx#L64) | 依法、爭議處理、安全調查或尚未完成同步所必要的資料，可能在原目的結束後有限度保留；不再需要時會刪除、去識別化或停止利用。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-33938fa32b32<br>[app/privacy/page.tsx:69:63](../../app/privacy/page.tsx#L69) | 6. 您的選擇與權利 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-28ba5e6e2f27<br>[app/privacy/page.tsx:71:11](../../app/privacy/page.tsx#L71) | 經身分驗證後，您可依法請求查詢、閱覽、取得複本、更正、補充、停止蒐集或利用，以及刪除個人資料。工作空間擁有者提出的品牌資料刪除，不會自動取代個別成員對其帳號資料的權利。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-880d5264871a<br>[app/privacy/page.tsx:74:11](../../app/privacy/page.tsx#L74) | 請透過 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-720caa775259<br>[app/privacy/page.tsx:74:109](../../app/privacy/page.tsx#L74) | 支援中心 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5d0e4f043e95<br>[app/privacy/page.tsx:74:121](../../app/privacy/page.tsx#L74) | 提出申請。處理前可能要求合理的身分與工作空間權限證明；不需在來信中提供密碼或完整付款資料。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e60be90dcc97<br>[app/privacy/page.tsx:79:63](../../app/privacy/page.tsx#L79) | 7. 安全與事件通知 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5d4357bd9470<br>[app/privacy/page.tsx:81:11](../../app/privacy/page.tsx#L81) | Féria 使用傳輸加密、資料列權限、私有媒體物件、最小權限及操作紀錄等措施降低風險。若知悉個人資料遭竊取、竄改、毀損、滅失或洩漏，會採取必要應變，並依適用法令通知受影響使用者與主管機關。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-956549ed8f1b<br>[app/privacy/page.tsx:86:63](../../app/privacy/page.tsx#L86) | 8. 兒少與政策更新 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ca063d43fc87<br>[app/privacy/page.tsx:88:11](../../app/privacy/page.tsx#L88) | 本服務面向市集品牌營運者，不以兒童為主要使用者，也不主動設計兒童個資蒐集流程。重大政策變更會標示新生效日並在生效前提供合理通知；若用途超出原告知範圍，會依適用法令取得必要同意。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PrivacyPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## app/support/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-d84c2fa4568e<br>[app/support/page.tsx:11:12](../../app/support/page.tsx#L11) | 帳號與登入 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | SUPPORT_TOPICS · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-10a47a1ad4bd<br>[app/support/page.tsx:12:18](../../app/support/page.tsx#L12) | 登入異常、帳號疑似遭他人使用、團隊歸屬或權限問題。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | SUPPORT_TOPICS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dda87a07254a<br>[app/support/page.tsx:13:14](../../app/support/page.tsx#L13) | 帳號與登入 | **來源候選** · 候選，非已證實提示<br>SUPPORT_TOPICS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUPPORT_TOPICS · subject<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d5603a46bdb5<br>[app/support/page.tsx:17:12](../../app/support/page.tsx#L17) | 資料與隱私 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | SUPPORT_TOPICS · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a39a20b82c1c<br>[app/support/page.tsx:18:18](../../app/support/page.tsx#L18) | 申請查閱、更正、停止利用、刪除帳號或回報疑似資料外洩。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | SUPPORT_TOPICS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1ae6f28dce89<br>[app/support/page.tsx:19:14](../../app/support/page.tsx#L19) | 資料與隱私 | **來源候選** · 候選，非已證實提示<br>SUPPORT_TOPICS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUPPORT_TOPICS · subject<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7523388d5202<br>[app/support/page.tsx:23:12](../../app/support/page.tsx#L23) | 訂閱與付款 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | SUPPORT_TOPICS · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3b1f1a07acfb<br>[app/support/page.tsx:24:18](../../app/support/page.tsx#L24) | 目前尚未開放付款。未來將由此受理方案、扣款、取消與退款問題。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | SUPPORT_TOPICS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-94daaca8c576<br>[app/support/page.tsx:25:14](../../app/support/page.tsx#L25) | 訂閱與付款 | **來源候選** · 候選，非已證實提示<br>SUPPORT_TOPICS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUPPORT_TOPICS · subject<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fe13febec481<br>[app/support/page.tsx:29:12](../../app/support/page.tsx#L29) | 安全事件 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | SUPPORT_TOPICS · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-559a92be2ae9<br>[app/support/page.tsx:30:18](../../app/support/page.tsx#L30) | 回報可疑連結、未授權操作、帳號接管或其他安全風險。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | SUPPORT_TOPICS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d02b99cef30f<br>[app/support/page.tsx:31:14](../../app/support/page.tsx#L31) | 安全事件 | **來源候選** · 候選，非已證實提示<br>SUPPORT_TOPICS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUPPORT_TOPICS · subject<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6ead10c2dd21<br>[app/support/page.tsx:41:13](../../app/support/page.tsx#L41) | 支援中心 | **畫面文字** · 直接呈現定義<br>PublicDocumentShell：呈現操作說明、資料標籤、狀態或注意事項 | SupportPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bee7e09398b7<br>[app/support/page.tsx:42:19](../../app/support/page.tsx#L42) | 帳號、資料、訂閱與安全事件的單一公開聯絡入口。 | **畫面文字** · 直接呈現定義<br>PublicDocumentShell：呈現操作說明、資料標籤、狀態或注意事項 | SupportPage · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ad0e73a3a992<br>[app/support/page.tsx:43:22](../../app/support/page.tsx#L43) | ${config.effectiveDate} | **動態文字入口** · 執行時綁定入口<br>PublicDocumentShell 接收執行時文字；內容需追查所列綁定與生產端 | SupportPage · effectiveDate<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-76648fef93aa<br>[app/support/page.tsx:52:67](../../app/support/page.tsx#L52) | 聯絡支援 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | SupportPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2611a96db5f8<br>[app/support/page.tsx:56:19](../../app/support/page.tsx#L56) | 公開支援信箱： | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SupportPage<br>config.supportEmail |
| UI-5c3ee21cb7cd<br>[app/support/page.tsx:59:19](../../app/support/page.tsx#L59) | 來信請附上帳號信箱、問題發生時間與可重現步驟。請勿傳送密碼、API 金鑰、完整卡號或未遮蔽的正式資料匯出檔。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SupportPage<br>config.supportEmail |
| UI-ed0c6529c73b<br>[app/support/page.tsx:64:17](../../app/support/page.tsx#L64) | 正式支援信箱尚未設定，因此本版本不可對外上架或收費。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SupportPage<br>否則 config.supportEmail |
| UI-add21d203221<br>[app/support/page.tsx:72:63](../../app/support/page.tsx#L72) | 問題分類 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | SupportPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fcc75cc12942<br>[app/support/page.tsx:83:82](../../app/support/page.tsx#L83) | ${topic.title} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | content<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e0b666f9b12b<br>[app/support/page.tsx:84:89](../../app/support/page.tsx#L84) | ${topic.description} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | content<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-98cb75f0724e<br>[app/support/page.tsx:108:63](../../app/support/page.tsx#L108) | 資料刪除與裝置暫存 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | SupportPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0ac58adc94a3<br>[app/support/page.tsx:110:11](../../app/support/page.tsx#L110) | 帳號或雲端資料刪除目前由支援窗口核對身分後處理。裝置可能仍有尚未同步的離線變更；在收到處理確認前，請勿清除瀏覽器資料或解除安裝，以免未同步內容無法復原。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SupportPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bfeed245d3d2<br>[app/support/page.tsx:115:63](../../app/support/page.tsx#L115) | 服務營運者 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | SupportPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2258030de5e2<br>[app/support/page.tsx:118:63](../../app/support/page.tsx#L118) | 營運者名稱 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | SupportPage<br>config.operatorIdentityReady |
| UI-377c6babce75<br>[app/support/page.tsx:120:63](../../app/support/page.tsx#L120) | 代表人 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | SupportPage<br>config.operatorIdentityReady |
| UI-0be3d7466e51<br>[app/support/page.tsx:122:63](../../app/support/page.tsx#L122) | 營業地址 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | SupportPage<br>config.operatorIdentityReady |
| UI-247a7ae6eda0<br>[app/support/page.tsx:127:13](../../app/support/page.tsx#L127) | 正式營運者名稱、代表人或營業地址尚未完成公開設定。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SupportPage<br>否則 config.operatorIdentityReady |

## app/terms/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-946fb50e4dce<br>[app/terms/page.tsx:11:13](../../app/terms/page.tsx#L11) | 服務條款 | **畫面文字** · 直接呈現定義<br>PublicDocumentShell：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-989c36837644<br>[app/terms/page.tsx:12:19](../../app/terms/page.tsx#L12) | 使用 Féria 出攤筆記時，營運者與帳號使用者共同遵守的服務邊界。 | **畫面文字** · 直接呈現定義<br>PublicDocumentShell：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-47891151f348<br>[app/terms/page.tsx:13:22](../../app/terms/page.tsx#L13) | ${config.effectiveDate} | **動態文字入口** · 執行時綁定入口<br>PublicDocumentShell 接收執行時文字；內容需追查所列綁定與生產端 | TermsPage · effectiveDate<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e3c22a3807ca<br>[app/terms/page.tsx:17:63](../../app/terms/page.tsx#L17) | 1. 適用範圍與同意 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-caf6035941e2<br>[app/terms/page.tsx:19:11](../../app/terms/page.tsx#L19) | Féria 出攤筆記提供市集、商品、成交、成本、互動、分析與團隊協作功能。建立帳號或使用服務，表示您已閱讀並同意本條款與隱私政策。未滿法定成年年齡者，須由法定代理人同意後使用。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a6009a244624<br>[app/terms/page.tsx:24:63](../../app/terms/page.tsx#L24) | 2. 帳號與團隊責任 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-317019c491a7<br>[app/terms/page.tsx:26:15](../../app/terms/page.tsx#L26) | 您應提供可聯絡的帳號資料、妥善保管登入方式，並在發現未授權使用時立即通知支援。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-af91617ae3aa<br>[app/terms/page.tsx:27:15](../../app/terms/page.tsx#L27) | 工作空間擁有者負責邀請成員、指派角色與確認成員有權接觸品牌營運資料。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-48882c586153<br>[app/terms/page.tsx:28:15](../../app/terms/page.tsx#L28) | 團隊成員只能在授權範圍內處理資料，不得規避權限或冒用其他帳號。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-891dd191a157<br>[app/terms/page.tsx:33:63](../../app/terms/page.tsx#L33) | 3. 服務使用與可用性 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b59a16220ab0<br>[app/terms/page.tsx:35:11](../../app/terms/page.tsx#L35) | 服務支援離線暫存與登入後同步，但網路、裝置、瀏覽器或第三方雲端服務異常可能造成延遲。尚未同步的裝置資料在清除瀏覽器資料或解除安裝後可能無法復原。分析與報表是營運輔助資訊，不構成會計、稅務、法律或投資建議。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-67fecc325905<br>[app/terms/page.tsx:40:63](../../app/terms/page.tsx#L40) | 4. 您的內容與必要授權 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2b9a707f4981<br>[app/terms/page.tsx:42:11](../../app/terms/page.tsx#L42) | 您保有自行輸入內容的權利。為提供同步、備援、分析、團隊協作與您啟用的照片功能，您授權營運者及受託服務商在必要範圍內儲存、處理、傳輸與呈現該內容。您應確保輸入的第三人資料、照片與其他內容具有合法使用依據。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e5375813fddf<br>[app/terms/page.tsx:47:63](../../app/terms/page.tsx#L47) | 5. 禁止行為 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ea0f133e7c53<br>[app/terms/page.tsx:49:15](../../app/terms/page.tsx#L49) | 使用服務進行違法、侵權、詐騙、騷擾或危害他人的活動。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dbf98014305f<br>[app/terms/page.tsx:50:15](../../app/terms/page.tsx#L50) | 未經授權存取他人工作空間、測試帳號、管理介面或非公開資料。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-12e33546e6db<br>[app/terms/page.tsx:51:15](../../app/terms/page.tsx#L51) | 干擾服務、繞過安全與訂閱限制，或以自動化方式造成不合理負載。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a46d2b7cc95a<br>[app/terms/page.tsx:52:15](../../app/terms/page.tsx#L52) | 上傳惡意程式、機密驗證資料或無權處理的個人資料。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-375ef12e335f<br>[app/terms/page.tsx:57:63](../../app/terms/page.tsx#L57) | 6. 免費功能與未來訂閱 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-74296bb22ab3<br>[app/terms/page.tsx:59:11](../../app/terms/page.tsx#L59) | 目前版本尚未開放真實付款、定期扣款、續訂、取消或退款，因此不會向使用者收取訂閱費。正式收費前，將在付款確認前清楚揭露方案內容、總價、幣別、計費週期、試用條件、自動續訂、取消方式、服務生效時間、退款與法定解除權資訊，並取得明確同意。頁面上的方案規劃不等於已成立的付費契約。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a543aa2fb882<br>[app/terms/page.tsx:64:63](../../app/terms/page.tsx#L64) | 7. 停權、終止與資料處理 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7a18e96f1f4a<br>[app/terms/page.tsx:66:11](../../app/terms/page.tsx#L66) | 發生重大違法、安全風險、權限濫用或持續破壞服務時，營運者得採取必要的限制措施，並在可行範圍內說明原因與申訴方式。您可透過支援中心提出帳號或資料刪除請求；實際刪除範圍與保留例外依隱私政策、尚未同步資料狀態及適用法令處理。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d2d856c57457<br>[app/terms/page.tsx:71:63](../../app/terms/page.tsx#L71) | 8. 責任邊界 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-44ae2ff15527<br>[app/terms/page.tsx:73:11](../../app/terms/page.tsx#L73) | 營運者會採取合理措施維持服務與保護資料，但無法保證網路與第三方基礎設施永不中斷。任何責任限制均以適用法令允許範圍為限，不排除因故意或重大過失應負的責任，也不影響使用者依法不得預先排除的消費者權利與救濟。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-57a92c4cec56<br>[app/terms/page.tsx:78:63](../../app/terms/page.tsx#L78) | 9. 條款更新與聯絡 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b4421991ae4e<br>[app/terms/page.tsx:80:11](../../app/terms/page.tsx#L80) | 重大變更會在生效前以服務內公告或可聯絡方式通知，並標示新的生效日。付費條件若變更，會依適用法令及訂閱契約處理，不會以本條款單方面消除已成立的權利。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f2d633742bb3<br>[app/terms/page.tsx:83:11](../../app/terms/page.tsx#L83) | 問題或申訴請前往 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-76985318d5e1<br>[app/terms/page.tsx:83:114](../../app/terms/page.tsx#L83) | 支援中心 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ed021816b84e<br>[app/terms/page.tsx:83:125](../../app/terms/page.tsx#L83) | 。準據法、管轄與通訊交易解除權的正式文字，須在付款啟用前完成台灣法務審查，不得以草案自行排除法定權利。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TermsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/public/PublicDocumentShell.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-ab3fa7c748a7<br>[components/public/PublicDocumentShell.tsx:14:30](../../components/public/PublicDocumentShell.tsx#L14) | 支援中心 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | PUBLIC_LINKS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ce6231385d74<br>[components/public/PublicDocumentShell.tsx:15:30](../../components/public/PublicDocumentShell.tsx#L15) | 隱私政策 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | PUBLIC_LINKS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6898d5d42069<br>[components/public/PublicDocumentShell.tsx:16:28](../../components/public/PublicDocumentShell.tsx#L16) | 服務條款 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | PUBLIC_LINKS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-71621ff6925d<br>[components/public/PublicDocumentShell.tsx:17:28](../../components/public/PublicDocumentShell.tsx#L17) | 關於 Féria | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | PUBLIC_LINKS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-34d0d4054398<br>[components/public/PublicDocumentShell.tsx:36:13](../../components/public/PublicDocumentShell.tsx#L36) | 返回 Féria | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | PublicDocumentShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-284046a4edd2<br>[components/public/PublicDocumentShell.tsx:38:71](../../components/public/PublicDocumentShell.tsx#L38) | Féria 出攤筆記 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PublicDocumentShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b5f84a8246cc<br>[components/public/PublicDocumentShell.tsx:39:86](../../components/public/PublicDocumentShell.tsx#L39) | ${title} | **動態文字入口** · 執行時綁定入口<br>h1 接收執行時文字；內容需追查所列綁定與生產端 | PublicDocumentShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0cd21ded6cd2<br>[components/public/PublicDocumentShell.tsx:40:82](../../components/public/PublicDocumentShell.tsx#L40) | ${description} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | PublicDocumentShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9991b39fe80b<br>[components/public/PublicDocumentShell.tsx:56:37](../../components/public/PublicDocumentShell.tsx#L56) | 正式政策版本 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PublicDocumentShell<br>publicationReady |
| UI-434490f60af5<br>[components/public/PublicDocumentShell.tsx:56:48](../../components/public/PublicDocumentShell.tsx#L56) | 上架前草案 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PublicDocumentShell<br>否則 publicationReady |
| UI-d2313e4409de<br>[components/public/PublicDocumentShell.tsx:60:21](../../components/public/PublicDocumentShell.tsx#L60) | 生效日：${effectiveDate} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PublicDocumentShell<br>publicationReady |
| UI-38b24518e519<br>[components/public/PublicDocumentShell.tsx:61:21](../../components/public/PublicDocumentShell.tsx#L61) | 正式營運者資料或核准證據尚未齊全，本頁不得作為已核准的付費條款。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PublicDocumentShell<br>否則 publicationReady |
| UI-9f25b23f7059<br>[components/public/PublicDocumentShell.tsx:70:12](../../components/public/PublicDocumentShell.tsx#L70) | ${children} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | PublicDocumentShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-19dcb1f3d3b2<br>[components/public/PublicDocumentShell.tsx:82:16](../../components/public/PublicDocumentShell.tsx#L82) | ${item.label} | **動態文字入口** · 執行時綁定入口<br>Link 接收執行時文字；內容需追查所列綁定與生產端 | PublicDocumentShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## public/manifest.json

Web manifest；不代表 iOS／Android 原生商店文案

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-1a9633bcade4<br>[public/manifest.json:2:11](../../public/manifest.json#L2) | Féria - 出攤筆記 | **平台安裝文字** · 直接呈現定義<br>name：提供 Web App 安裝名稱、說明、截圖或捷徑標籤 | manifest · name<br>Web 安裝提示、捷徑或商店式 PWA 展示依瀏覽器支援而定 |
| UI-c38e21a0bb78<br>[public/manifest.json:3:17](../../public/manifest.json#L3) | Féria | **平台安裝文字** · 直接呈現定義<br>short_name：提供 Web App 安裝名稱、說明、截圖或捷徑標籤 | manifest · short_name<br>Web 安裝提示、捷徑或商店式 PWA 展示依瀏覽器支援而定 |
| UI-9fbd40069b15<br>[public/manifest.json:4:18](../../public/manifest.json#L4) | 手作品牌的市集經營筆記 - 輕鬆管理銷售、統計數據、追蹤成本 | **平台安裝文字** · 直接呈現定義<br>description：提供 Web App 安裝名稱、說明、截圖或捷徑標籤 | manifest · description<br>Web 安裝提示、捷徑或商店式 PWA 展示依瀏覽器支援而定 |
| UI-0eee4ca8268a<br>[public/manifest.json:68:16](../../public/manifest.json#L68) | Féria 今日營運與市集工作台 | **平台安裝文字** · 直接呈現定義<br>screenshots.0.label：提供 Web App 安裝名稱、說明、截圖或捷徑標籤 | manifest · screenshots.0.label<br>Web 安裝提示、捷徑或商店式 PWA 展示依瀏覽器支援而定 |
| UI-afa0025c4d08<br>[public/manifest.json:74:15](../../public/manifest.json#L74) | 新增市集 | **平台安裝文字** · 直接呈現定義<br>shortcuts.0.name：提供 Web App 安裝名稱、說明、截圖或捷徑標籤 | manifest · shortcuts.0.name<br>Web 安裝提示、捷徑或商店式 PWA 展示依瀏覽器支援而定 |
| UI-e78e4bea0c9c<br>[public/manifest.json:75:21](../../public/manifest.json#L75) | 新增市集 | **平台安裝文字** · 直接呈現定義<br>shortcuts.0.short_name：提供 Web App 安裝名稱、說明、截圖或捷徑標籤 | manifest · shortcuts.0.short_name<br>Web 安裝提示、捷徑或商店式 PWA 展示依瀏覽器支援而定 |
| UI-fad695d86bc0<br>[public/manifest.json:76:22](../../public/manifest.json#L76) | 快速新增市集記錄 | **平台安裝文字** · 直接呈現定義<br>shortcuts.0.description：提供 Web App 安裝名稱、說明、截圖或捷徑標籤 | manifest · shortcuts.0.description<br>Web 安裝提示、捷徑或商店式 PWA 展示依瀏覽器支援而定 |
| UI-af100e5595ff<br>[public/manifest.json:81:15](../../public/manifest.json#L81) | 新增商品 | **平台安裝文字** · 直接呈現定義<br>shortcuts.1.name：提供 Web App 安裝名稱、說明、截圖或捷徑標籤 | manifest · shortcuts.1.name<br>Web 安裝提示、捷徑或商店式 PWA 展示依瀏覽器支援而定 |
| UI-e8192e95f05e<br>[public/manifest.json:82:21](../../public/manifest.json#L82) | 新增商品 | **平台安裝文字** · 直接呈現定義<br>shortcuts.1.short_name：提供 Web App 安裝名稱、說明、截圖或捷徑標籤 | manifest · shortcuts.1.short_name<br>Web 安裝提示、捷徑或商店式 PWA 展示依瀏覽器支援而定 |
| UI-5d787ebfca95<br>[public/manifest.json:83:22](../../public/manifest.json#L83) | 快速新增商品 | **平台安裝文字** · 直接呈現定義<br>shortcuts.1.description：提供 Web App 安裝名稱、說明、截圖或捷徑標籤 | manifest · shortcuts.1.description<br>Web 安裝提示、捷徑或商店式 PWA 展示依瀏覽器支援而定 |
| UI-f8e422622d05<br>[public/manifest.json:88:15](../../public/manifest.json#L88) | 數據分析 | **平台安裝文字** · 直接呈現定義<br>shortcuts.2.name：提供 Web App 安裝名稱、說明、截圖或捷徑標籤 | manifest · shortcuts.2.name<br>Web 安裝提示、捷徑或商店式 PWA 展示依瀏覽器支援而定 |
| UI-04cd4160b233<br>[public/manifest.json:89:21](../../public/manifest.json#L89) | 分析 | **平台安裝文字** · 直接呈現定義<br>shortcuts.2.short_name：提供 Web App 安裝名稱、說明、截圖或捷徑標籤 | manifest · shortcuts.2.short_name<br>Web 安裝提示、捷徑或商店式 PWA 展示依瀏覽器支援而定 |
| UI-416a9e3a6160<br>[public/manifest.json:90:22](../../public/manifest.json#L90) | 查看數據分析 | **平台安裝文字** · 直接呈現定義<br>shortcuts.2.description：提供 Web App 安裝名稱、說明、截圖或捷徑標籤 | manifest · shortcuts.2.description<br>Web 安裝提示、捷徑或商店式 PWA 展示依瀏覽器支援而定 |

## public/offline.html

靜態離線頁；未證實目前 SW 會自動導向

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-08f36961285b<br>[public/offline.html:6:10](../../public/offline.html#L6) | 離線模式 - Féria | **畫面文字** · 直接呈現定義<br>title：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-e4ca1d3e5eff<br>[public/offline.html:122:23](../../public/offline.html#L122) | 📡 | **畫面文字** · 直接呈現定義<br>div：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-a5f387fe8167<br>[public/offline.html:123:9](../../public/offline.html#L123) | 目前處於離線模式 | **畫面文字** · 直接呈現定義<br>h1：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-a81d44697899<br>[public/offline.html:124:8](../../public/offline.html#L124) | 無法連接到網路，但您仍可以使用已快取的功能。Féria 的所有數據都安全地儲存在您的裝置上。 | **畫面文字** · 直接呈現定義<br>p：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-772b0b09c6e6<br>[public/offline.html:126:63](../../public/offline.html#L126) | 重新連線 | **畫面文字** · 直接呈現定義<br>button：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-cc5830c18de1<br>[public/offline.html:131:11](../../public/offline.html#L131) | 💡 離線模式下可用功能 | **畫面文字** · 直接呈現定義<br>h2：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-5f55c7f7efdf<br>[public/offline.html:133:13](../../public/offline.html#L133) | 查看已有的市集和商品資料 | **畫面文字** · 直接呈現定義<br>li：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-117a5b63fedf<br>[public/offline.html:134:13](../../public/offline.html#L134) | 記錄新的銷售和互動 | **畫面文字** · 直接呈現定義<br>li：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-f44ee45ef33c<br>[public/offline.html:135:13](../../public/offline.html#L135) | 查看本地數據分析 | **畫面文字** · 直接呈現定義<br>li：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-a1c8257a08ec<br>[public/offline.html:136:13](../../public/offline.html#L136) | 所有數據會在恢復網路後自動同步 | **畫面文字** · 直接呈現定義<br>li：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |

## public/sw.js

Web 推送處理碼存在；不代表推送服務已啟用

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-5c8984090f5b<br>[public/sw.js:101:44](../../public/sw.js#L101) | 您有新的通知 | **共用文案值** · 文案生產端，須查使用端<br>body：供畫面或訊息組裝使用的標籤／說明值 | options · body<br>否則 event.data |
| UI-c28f36d74444<br>[public/sw.js:112:16](../../public/sw.js#L112) | 查看 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | options · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c419b384db17<br>[public/sw.js:117:16](../../public/sw.js#L117) | 關閉 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | options · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f0877fae72ce<br>[public/sw.js:124:40](../../public/sw.js#L124) | Féria | **確認／通知** · 直接呈現定義<br>self.registration.showNotification：提示操作結果、進度或要求使用者確認 | module<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
