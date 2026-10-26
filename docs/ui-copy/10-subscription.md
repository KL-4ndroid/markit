# 訂閱、方案與資格：提示與介面文字

> 自動產生；請勿手動修改。重新產生：`node scripts/generate-ui-copy-inventory.mjs`。
> [總索引](../APP_UI_COPY_INDEX.md) · [完整 JSON](inventory.json) · [逐檔覆蓋](coverage.md)

共 292 筆來源位置；同字不同出處分開記錄。這是來源盤點，候選與未啟用分支不算已上線功能。

## app/api/account-capabilities/route.ts

API 回應／伺服器來源（須確認客戶端是否顯示）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-6169a6f7fdf3<br>[app/api/account-capabilities/route.ts:44:65](../../app/api/account-capabilities/route.ts#L44) | Account capability authentication is unavailable. | **來源候選** · 候選，非已證實提示<br>GET 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | GET<br>actor === 'unavailable' |
| UI-9d2381ac7073<br>[app/api/account-capabilities/route.ts:47:62](../../app/api/account-capabilities/route.ts#L47) | Account capability access requires authentication. | **來源候選** · 候選，非已證實提示<br>GET 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | GET<br>!actor |
| UI-72a403f386e5<br>[app/api/account-capabilities/route.ts:51:61](../../app/api/account-capabilities/route.ts#L51) | Account capabilities are temporarily unavailable. | **來源候選** · 候選，非已證實提示<br>GET 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | GET<br>!UUID_PATTERN.test(actor.actorId) |
| UI-b4a9c8211b4f<br>[app/api/account-capabilities/route.ts:60:64](../../app/api/account-capabilities/route.ts#L60) | The requested owner workspace is not available. | **來源候選** · 候選，非已證實提示<br>GET 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | GET<br>resolution.outcome === 'forbidden' |
| UI-bc40124026c6<br>[app/api/account-capabilities/route.ts:63:61](../../app/api/account-capabilities/route.ts#L63) | Account capabilities are temporarily unavailable. | **來源候選** · 候選，非已證實提示<br>GET 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | GET<br>resolution.outcome === 'unavailable' |

## app/api/product-cover-photo/capability/route.ts

API 回應／伺服器來源（須確認客戶端是否顯示）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-4428634c3665<br>[app/api/product-cover-photo/capability/route.ts:19:53](../../app/api/product-cover-photo/capability/route.ts#L19) | authentication_required | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | GET · reason<br>!auth.ok |
| UI-808a78a5e5c1<br>[app/api/product-cover-photo/capability/route.ts:24:87](../../app/api/product-cover-photo/capability/route.ts#L24) | unavailable | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | GET · reason<br>!client |
| UI-48994fd32684<br>[app/api/product-cover-photo/capability/route.ts:27:87](../../app/api/product-cover-photo/capability/route.ts#L27) | permission_denied | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | GET · reason<br>!access |
| UI-b0301d53200a<br>[app/api/product-cover-photo/capability/route.ts:30:53](../../app/api/product-cover-photo/capability/route.ts#L30) | permission_denied | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | GET · reason<br>!access.canEdit |

## app/subscription/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-25fc2e169405<br>[app/subscription/page.tsx:21:67](../../app/subscription/page.tsx#L21) | ${SUBSCRIPTION_PRESENTATION.title} | **動態文字入口** · 執行時綁定入口<br>h1 接收執行時文字；內容需追查所列綁定與生產端 | SubscriptionPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f218221372b6<br>[app/subscription/page.tsx:23:14](../../app/subscription/page.tsx#L23) | ${SUBSCRIPTION_PRESENTATION.description} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | SubscriptionPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-039c89dd1363<br>[app/subscription/page.tsx:40:67](../../app/subscription/page.tsx#L40) | 目前狀態 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | SubscriptionPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a01aa28fe731<br>[app/subscription/page.tsx:42:16](../../app/subscription/page.tsx#L42) | ${SUBSCRIPTION_PRESENTATION.notice} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | SubscriptionPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-26349969135d<br>[app/subscription/page.tsx:47:72](../../app/subscription/page.tsx#L47) | 未來方案預覽 | **輔助辨識** · 直接呈現定義<br>提供 section 的讀屏名稱、圖片替代文字或滑入說明 | SubscriptionPage · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/subscription/FeatureLimitDialog.tsx

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-09505d184397<br>[components/subscription/FeatureLimitDialog.tsx:39:20](../../components/subscription/FeatureLimitDialog.tsx#L39) | 關閉功能說明 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | FeatureLimitDialog · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c4dff7378e0c<br>[components/subscription/FeatureLimitDialog.tsx:54:18](../../components/subscription/FeatureLimitDialog.tsx#L54) | ${presentation.title} | **動態文字入口** · 執行時綁定入口<br>h2 接收執行時文字；內容需追查所列綁定與生產端 | FeatureLimitDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7844a3b6e2b1<br>[components/subscription/FeatureLimitDialog.tsx:57:18](../../components/subscription/FeatureLimitDialog.tsx#L57) | ${presentation.description} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | FeatureLimitDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-627ccb5739df<br>[components/subscription/FeatureLimitDialog.tsx:64:26](../../components/subscription/FeatureLimitDialog.tsx#L64) | 關閉 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | FeatureLimitDialog · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b12f044c6bb0<br>[components/subscription/FeatureLimitDialog.tsx:76:15](../../components/subscription/FeatureLimitDialog.tsx#L76) | 關閉 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | FeatureLimitDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-be90a325271f<br>[components/subscription/FeatureLimitDialog.tsx:84:18](../../components/subscription/FeatureLimitDialog.tsx#L84) | ${presentation.actionLabel} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | FeatureLimitDialog<br>presentation.showPlanPreviewLink &amp;&amp; presentation.actionLabel |

## components/subscription/NativeSubscriptionActions.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-0e09279e2266<br>[components/subscription/NativeSubscriptionActions.tsx:56:7](../../components/subscription/NativeSubscriptionActions.tsx#L56) | 正在確認商店服務 | **來源候選** · 候選，非已證實提示<br>statusLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | statusLabel<br>availability === null |
| UI-13e7dcc21ca9<br>[components/subscription/NativeSubscriptionActions.tsx:59:11](../../components/subscription/NativeSubscriptionActions.tsx#L59) | 商店服務可用 | **來源候選** · 候選，非已證實提示<br>statusLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | statusLabel<br>否則 availability === null → availability.available → verificationRuntimeAvailable |
| UI-e19ec47a0b3f<br>[components/subscription/NativeSubscriptionActions.tsx:60:11](../../components/subscription/NativeSubscriptionActions.tsx#L60) | 商店驗證服務尚未啟用 | **來源候選** · 候選，非已證實提示<br>statusLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | statusLabel<br>否則 availability === null → availability.available → 否則 verificationRuntimeAvailable |
| UI-ff4d1f61116a<br>[components/subscription/NativeSubscriptionActions.tsx:62:11](../../components/subscription/NativeSubscriptionActions.tsx#L62) | Web 付款將於後續開放 | **來源候選** · 候選，非已證實提示<br>statusLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | statusLabel<br>否則 availability === null → 否則 availability.available → availability.reason === 'web_checkout_deferred' |
| UI-8a3c6dab8d23<br>[components/subscription/NativeSubscriptionActions.tsx:63:11](../../components/subscription/NativeSubscriptionActions.tsx#L63) | 此裝置尚未連接商店服務 | **來源候選** · 候選，非已證實提示<br>statusLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | statusLabel<br>否則 availability === null → 否則 availability.available → 否則 availability.reason === 'web_checkout_deferred' |
| UI-e4cbcad96579<br>[components/subscription/NativeSubscriptionActions.tsx:66:76](../../components/subscription/NativeSubscriptionActions.tsx#L66) | 訂閱操作 | **輔助辨識** · 直接呈現定義<br>提供 section 的讀屏名稱、圖片替代文字或滑入說明 | NativeSubscriptionActions · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-69f25f2033c7<br>[components/subscription/NativeSubscriptionActions.tsx:74:18](../../components/subscription/NativeSubscriptionActions.tsx#L74) | ${statusLabel} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | NativeSubscriptionActions<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-78a698b0b0ab<br>[components/subscription/NativeSubscriptionActions.tsx:84:13](../../components/subscription/NativeSubscriptionActions.tsx#L84) | 恢復購買 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | NativeSubscriptionActions<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e2106fa4ce68<br>[components/subscription/NativeSubscriptionActions.tsx:93:13](../../components/subscription/NativeSubscriptionActions.tsx#L93) | 管理訂閱 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | NativeSubscriptionActions<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9748c7c0c409<br>[components/subscription/NativeSubscriptionActions.tsx:98:69](../../components/subscription/NativeSubscriptionActions.tsx#L98) | 商店正在處理購買，確認後會重新檢查方案。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | NativeSubscriptionActions<br>workflow?.phase === 'pending' |
| UI-fb10ae40fb0a<br>[components/subscription/NativeSubscriptionActions.tsx:101:69](../../components/subscription/NativeSubscriptionActions.tsx#L101) | 購買資料已收到，正在等待伺服器驗證。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | NativeSubscriptionActions<br>workflow?.phase === 'awaiting_server_verification' |
| UI-63c1b6de55ea<br>[components/subscription/NativeSubscriptionActions.tsx:104:62](../../components/subscription/NativeSubscriptionActions.tsx#L104) | 目前無法完成訂閱操作，請稍後再試。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | NativeSubscriptionActions<br>workflow?.phase === 'failed' |

## components/subscription/PricingCard.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-7e5742a1456f<br>[components/subscription/PricingCard.tsx:38:67](../../components/subscription/PricingCard.tsx#L38) | ${plan.name} | **動態文字入口** · 執行時綁定入口<br>h2 接收執行時文字；內容需追查所列綁定與生產端 | PricingCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6b0e3b972b2f<br>[components/subscription/PricingCard.tsx:39:61](../../components/subscription/PricingCard.tsx#L39) | ${plan.priceLabel} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | PricingCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5b9a73216059<br>[components/subscription/PricingCard.tsx:40:77](../../components/subscription/PricingCard.tsx#L40) | ${plan.description} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | PricingCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3bb46831e19c<br>[components/subscription/PricingCard.tsx:41:67](../../components/subscription/PricingCard.tsx#L41) | 適合：${plan.audience} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | PricingCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fd951721a1bb<br>[components/subscription/PricingCard.tsx:52:16](../../components/subscription/PricingCard.tsx#L52) | ${feature.label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | PricingCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-84152d1b60a0<br>[components/subscription/PricingCard.tsx:54:70](../../components/subscription/PricingCard.tsx#L54) | （規劃中） | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | PricingCard<br>feature.status === 'coming_soon' |

## components/subscription/SubscriptionAccountSummary.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-d1b7b7f03e8b<br>[components/subscription/SubscriptionAccountSummary.tsx:14:22](../../components/subscription/SubscriptionAccountSummary.tsx#L14) | 無固定期限 | **來源候選** · 候選，非已證實提示<br>formatEntitlementEnd 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | formatEntitlementEnd<br>!value |
| UI-962957a026f2<br>[components/subscription/SubscriptionAccountSummary.tsx:61:70](../../components/subscription/SubscriptionAccountSummary.tsx#L61) | 目前方案 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionAccountSummary<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ba187ad9cb92<br>[components/subscription/SubscriptionAccountSummary.tsx:63:16](../../components/subscription/SubscriptionAccountSummary.tsx#L63) | ${view.planLabel} | **動態文字入口** · 執行時綁定入口<br>h2 接收執行時文字；內容需追查所列綁定與生產端 | SubscriptionAccountSummary<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f23648f6cc82<br>[components/subscription/SubscriptionAccountSummary.tsx:65:74](../../components/subscription/SubscriptionAccountSummary.tsx#L65) | ${view.sourceDescription} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | SubscriptionAccountSummary<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-11a07d0c2502<br>[components/subscription/SubscriptionAccountSummary.tsx:69:12](../../components/subscription/SubscriptionAccountSummary.tsx#L69) | ${view.sourceLabel} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SubscriptionAccountSummary<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5d653336982a<br>[components/subscription/SubscriptionAccountSummary.tsx:76:59](../../components/subscription/SubscriptionAccountSummary.tsx#L76) | 功能狀態 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionAccountSummary<br>view.state === 'available' |
| UI-507a78f5e059<br>[components/subscription/SubscriptionAccountSummary.tsx:77:73](../../components/subscription/SubscriptionAccountSummary.tsx#L77) | ${view.entitlementLabel} | **動態文字入口** · 執行時綁定入口<br>dd 接收執行時文字；內容需追查所列綁定與生產端 | SubscriptionAccountSummary<br>view.state === 'available' |
| UI-0f34af18febe<br>[components/subscription/SubscriptionAccountSummary.tsx:80:59](../../components/subscription/SubscriptionAccountSummary.tsx#L80) | 付款狀態 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionAccountSummary<br>view.state === 'available' |
| UI-8b51a68f865e<br>[components/subscription/SubscriptionAccountSummary.tsx:81:94](../../components/subscription/SubscriptionAccountSummary.tsx#L81) | 不適用 | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionAccountSummary<br>view.state === 'available' |
| UI-2f0b039a215d<br>[components/subscription/SubscriptionAccountSummary.tsx:84:59](../../components/subscription/SubscriptionAccountSummary.tsx#L84) | 有效期限 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionAccountSummary<br>view.state === 'available' |
| UI-d4df5cd3b6e0<br>[components/subscription/SubscriptionAccountSummary.tsx:85:73](../../components/subscription/SubscriptionAccountSummary.tsx#L85) | ${formatEntitlementEnd(view.entitlementEndsAt)} | **動態文字入口** · 執行時綁定入口<br>dd 接收執行時文字；內容需追查所列綁定與生產端 | SubscriptionAccountSummary<br>view.state === 'available' |
| UI-0206823b946f<br>[components/subscription/SubscriptionAccountSummary.tsx:88:59](../../components/subscription/SubscriptionAccountSummary.tsx#L88) | 購買來源 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionAccountSummary<br>view.state === 'available' |
| UI-9e0df5c7684d<br>[components/subscription/SubscriptionAccountSummary.tsx:89:100](../../components/subscription/SubscriptionAccountSummary.tsx#L89) | 非商店訂閱 | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionAccountSummary<br>view.state === 'available' |
| UI-bea24b8ed5e3<br>[components/subscription/SubscriptionAccountSummary.tsx:102:11](../../components/subscription/SubscriptionAccountSummary.tsx#L102) | 重新檢查方案 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | SubscriptionAccountSummary<br>view.canRetry |

## components/subscription/SubscriptionBackButton.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-be1483f1fba2<br>[components/subscription/SubscriptionBackButton.tsx:14:18](../../components/subscription/SubscriptionBackButton.tsx#L14) | 返回 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SubscriptionBackButton · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/subscription/SubscriptionSimulationPanel.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-abae3e9126ad<br>[components/subscription/SubscriptionSimulationPanel.tsx:28:26](../../components/subscription/SubscriptionSimulationPanel.tsx#L28) | Free | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | PLAN_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-384cb61c26e3<br>[components/subscription/SubscriptionSimulationPanel.tsx:29:25](../../components/subscription/SubscriptionSimulationPanel.tsx#L29) | Pro | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | PLAN_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5117f3073398<br>[components/subscription/SubscriptionSimulationPanel.tsx:30:26](../../components/subscription/SubscriptionSimulationPanel.tsx#L30) | Team | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | PLAN_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-522482e75a57<br>[components/subscription/SubscriptionSimulationPanel.tsx:34:32](../../components/subscription/SubscriptionSimulationPanel.tsx#L34) | 分析 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | VERIFY_LINKS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-492e5e505b7f<br>[components/subscription/SubscriptionSimulationPanel.tsx:35:41](../../components/subscription/SubscriptionSimulationPanel.tsx#L35) | 報表與 PDF | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | VERIFY_LINKS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c5d17cd23d1c<br>[components/subscription/SubscriptionSimulationPanel.tsx:36:36](../../components/subscription/SubscriptionSimulationPanel.tsx#L36) | 團隊 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | VERIFY_LINKS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-64bf86b3d493<br>[components/subscription/SubscriptionSimulationPanel.tsx:79:21](../../components/subscription/SubscriptionSimulationPanel.tsx#L79) | ${null} | **動態文字入口** · 執行時綁定入口<br>applySimulation 接收執行時文字；內容需追查所列綁定與生產端 | applySimulation<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f0f33e631868<br>[components/subscription/SubscriptionSimulationPanel.tsx:88:23](../../components/subscription/SubscriptionSimulationPanel.tsx#L88) | 無法更新模擬方案，請重新整理後再試。 | **狀態設定** · 文案生產端，須查使用端<br>setErrorMessage：更新畫面訊息；仍須依呼叫端確認是否被渲染 | applySimulation<br>!result.ok |
| UI-7c3baf3c479c<br>[components/subscription/SubscriptionSimulationPanel.tsx:113:33](../../components/subscription/SubscriptionSimulationPanel.tsx#L113) | 資料庫權限驗證無法完成。 | **來源候選** · 候選，非已證實提示<br>handlePermissionSmoke 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handlePermissionSmoke<br>!result.ok |
| UI-867fa24294d0<br>[components/subscription/SubscriptionSimulationPanel.tsx:119:11](../../components/subscription/SubscriptionSimulationPanel.tsx#L119) | 資料庫權限驗證通過 ${result.passedChecks}/${result.totalChecks} | **來源候選** · 候選，非已證實提示<br>handlePermissionSmoke 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handlePermissionSmoke<br>result.passed |
| UI-4a034fc30620<br>[components/subscription/SubscriptionSimulationPanel.tsx:120:11](../../components/subscription/SubscriptionSimulationPanel.tsx#L120) | 資料庫權限驗證失敗 ${result.passedChecks}/${result.totalChecks} | **來源候選** · 候選，非已證實提示<br>handlePermissionSmoke 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handlePermissionSmoke<br>否則 result.passed |
| UI-ce258914ab1c<br>[components/subscription/SubscriptionSimulationPanel.tsx:138:17](../../components/subscription/SubscriptionSimulationPanel.tsx#L138) | 本機訂閱身分模擬 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | SubscriptionSimulationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5c2ed9719261<br>[components/subscription/SubscriptionSimulationPanel.tsx:141:17](../../components/subscription/SubscriptionSimulationPanel.tsx#L141) | 僅限測試 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionSimulationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e8b24b72868a<br>[components/subscription/SubscriptionSimulationPanel.tsx:145:15](../../components/subscription/SubscriptionSimulationPanel.tsx#L145) | 不修改付款與訂閱資料，也不授權雲端上傳或角色權限。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionSimulationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5d07f28c88db<br>[components/subscription/SubscriptionSimulationPanel.tsx:154:22](../../components/subscription/SubscriptionSimulationPanel.tsx#L154) | 切換訂閱身分模擬 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SubscriptionSimulationPanel · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-774f0c1cfbc3<br>[components/subscription/SubscriptionSimulationPanel.tsx:159:34](../../components/subscription/SubscriptionSimulationPanel.tsx#L159) | 已開啟 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionSimulationPanel<br>state.enabled |
| UI-d4cc765b0594<br>[components/subscription/SubscriptionSimulationPanel.tsx:159:42](../../components/subscription/SubscriptionSimulationPanel.tsx#L159) | 已關閉 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionSimulationPanel<br>否則 state.enabled |
| UI-876eb16c61a0<br>[components/subscription/SubscriptionSimulationPanel.tsx:173:75](../../components/subscription/SubscriptionSimulationPanel.tsx#L173) | 模擬方案 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionSimulationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dd50f8f733f9<br>[components/subscription/SubscriptionSimulationPanel.tsx:186:20](../../components/subscription/SubscriptionSimulationPanel.tsx#L186) | ${option.label} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | SubscriptionSimulationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ea05e8cffb08<br>[components/subscription/SubscriptionSimulationPanel.tsx:202:19](../../components/subscription/SubscriptionSimulationPanel.tsx#L202) | 正在切換... | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionSimulationPanel<br>isBusy |
| UI-6491bfa9b27c<br>[components/subscription/SubscriptionSimulationPanel.tsx:204:21](../../components/subscription/SubscriptionSimulationPanel.tsx#L204) | 目前模擬：${state.planCode.toUpperCase()} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionSimulationPanel<br>否則 isBusy → state.enabled &amp;&amp; state.planCode |
| UI-9f016e88d338<br>[components/subscription/SubscriptionSimulationPanel.tsx:205:21](../../components/subscription/SubscriptionSimulationPanel.tsx#L205) | 使用正式 capability 來源 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SubscriptionSimulationPanel<br>否則 isBusy → 否則 state.enabled &amp;&amp; state.planCode |
| UI-cb8c8f623158<br>[components/subscription/SubscriptionSimulationPanel.tsx:209:60](../../components/subscription/SubscriptionSimulationPanel.tsx#L209) | 訂閱阻擋驗證入口 | **輔助辨識** · 直接呈現定義<br>提供 nav 的讀屏名稱、圖片替代文字或滑入說明 | SubscriptionSimulationPanel · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c044baf5c3ac<br>[components/subscription/SubscriptionSimulationPanel.tsx:222:15](../../components/subscription/SubscriptionSimulationPanel.tsx#L222) | 驗證資料庫權限 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SubscriptionSimulationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a77fa2aad673<br>[components/subscription/SubscriptionSimulationPanel.tsx:233:20](../../components/subscription/SubscriptionSimulationPanel.tsx#L233) | ${item.label} | **動態文字入口** · 執行時綁定入口<br>Link 接收執行時文字；內容需追查所列綁定與生產端 | SubscriptionSimulationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0c87d8bfdb82<br>[components/subscription/SubscriptionSimulationPanel.tsx:241:73](../../components/subscription/SubscriptionSimulationPanel.tsx#L241) | ${errorMessage} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | SubscriptionSimulationPanel<br>errorMessage |
| UI-449f0d50711b<br>[components/subscription/SubscriptionSimulationPanel.tsx:249:14](../../components/subscription/SubscriptionSimulationPanel.tsx#L249) | ${permissionSmokeMessage} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | SubscriptionSimulationPanel<br>permissionSmokeMessage |

## components/subscription/UpgradePrompt.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-6d506ee9f765<br>[components/subscription/UpgradePrompt.tsx:37:65](../../components/subscription/UpgradePrompt.tsx#L37) | ${presentation.title} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | UpgradePrompt<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5a514534fbc2<br>[components/subscription/UpgradePrompt.tsx:38:72](../../components/subscription/UpgradePrompt.tsx#L38) | ${presentation.description} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | UpgradePrompt<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9f4ad6703352<br>[components/subscription/UpgradePrompt.tsx:45:16](../../components/subscription/UpgradePrompt.tsx#L45) | ${presentation.actionLabel} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | UpgradePrompt<br>presentation.showPlanPreviewLink &amp;&amp; presentation.actionLabel |
| UI-96baf4b1b135<br>[components/subscription/UpgradePrompt.tsx:56:15](../../components/subscription/UpgradePrompt.tsx#L56) | 重新檢查權限 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | UpgradePrompt<br>onRetry |
| UI-590d6e787200<br>[components/subscription/UpgradePrompt.tsx:65:24](../../components/subscription/UpgradePrompt.tsx#L65) | 關閉 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | UpgradePrompt · aria-label<br>showClose |

## lib/platform/unavailable-native-purchases.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-66534ef46d2a<br>[lib/platform/unavailable-native-purchases.ts:5:77](../../lib/platform/unavailable-native-purchases.ts#L5) | native_adapter_not_installed | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | getAvailability · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/platform/web/in-app-purchase.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-1b209117e6bc<br>[lib/platform/web/in-app-purchase.ts:19:15](../../lib/platform/web/in-app-purchase.ts#L19) | web_checkout_deferred | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | getAvailability · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/reporting/settlement-subscription-view.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-19d11f3386fd<br>[lib/reporting/settlement-subscription-view.ts:30:11](../../lib/reporting/settlement-subscription-view.ts#L30) | runtime_disabled | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | PDF_RUNTIME_DISABLED_DECISION · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/subscription/account-capability-access.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-1b5132135d3f<br>[lib/subscription/account-capability-access.ts:52:11](../../lib/subscription/account-capability-access.ts#L52) | capability_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | evaluateAccountCapabilityClientAccess · reason<br>!capabilityResult?.ok → 否則 capabilityResult |

## lib/subscription/account-capability-storage.server.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-5f20246c52c8<br>[lib/subscription/account-capability-storage.server.ts:78:21](../../lib/subscription/account-capability-storage.server.ts#L78) | account_capability_lookup_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | mapLookupResult<br>!row &#124;&#124; row.access_allowed !== true &#124;&#124; typeof row.owner_id !== 'string' |
| UI-83d302b90628<br>[lib/subscription/account-capability-storage.server.ts:83:52](../../lib/subscription/account-capability-storage.server.ts#L83) | account_capability_lookup_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | mapLookupResult<br>row.account_exists !== true |
| UI-d5c9c832bbf8<br>[lib/subscription/account-capability-storage.server.ts:121:34](../../lib/subscription/account-capability-storage.server.ts#L121) | account_capability_lookup_failed | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | readForActor<br>error |

## lib/subscription/account-deletion-storage.server.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-8bb0963b4037<br>[lib/subscription/account-deletion-storage.server.ts:148:39](../../lib/subscription/account-deletion-storage.server.ts#L148) | Account deletion RPC failed. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | rpc<br>result.error |
| UI-e6f2bb6b845e<br>[lib/subscription/account-deletion-storage.server.ts:154:56](../../lib/subscription/account-deletion-storage.server.ts#L154) | Account deletion actor is invalid. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | readCurrentForActor<br>!UUID_PATTERN.test(actorId) |
| UI-b45c445520cc<br>[lib/subscription/account-deletion-storage.server.ts:161:25](../../lib/subscription/account-deletion-storage.server.ts#L161) | Account deletion request is invalid. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | createForActor<br>!UUID_PATTERN.test(input.actorId) &#124;&#124; !SHA256_HEX.test(input.subjectRefHash) &#124;&#124; !SHA256_HEX.test(input.idempotencyHash) |
| UI-e587f22cc4cf<br>[lib/subscription/account-deletion-storage.server.ts:173:64](../../lib/subscription/account-deletion-storage.server.ts#L173) | Account deletion request id is invalid. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | claimLease<br>!UUID_PATTERN.test(input.requestId) |
| UI-df02a7e5dbb4<br>[lib/subscription/account-deletion-storage.server.ts:180:79](../../lib/subscription/account-deletion-storage.server.ts#L180) | Invalid lease response. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | claimLease<br>!isRecord(row) &#124;&#124; typeof row.claimed !== 'boolean' |
| UI-0f33e6c8b514<br>[lib/subscription/account-deletion-storage.server.ts:183:83](../../lib/subscription/account-deletion-storage.server.ts#L183) | Invalid lease response. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | claimLease<br>!LEASE_TOKEN.test(String(row.leaseToken)) &#124;&#124; !snapshot |
| UI-e4dd2b89ab5a<br>[lib/subscription/account-deletion-storage.server.ts:189:25](../../lib/subscription/account-deletion-storage.server.ts#L189) | Account deletion lease is invalid. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | recordStepResult<br>!UUID_PATTERN.test(input.requestId) &#124;&#124; !LEASE_TOKEN.test(input.leaseToken) |
| UI-b226d1f1b264<br>[lib/subscription/account-deletion-storage.server.ts:206:25](../../lib/subscription/account-deletion-storage.server.ts#L206) | Account deletion completion input is invalid. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | finalizeCompletion<br>!UUID_PATTERN.test(input.requestId) &#124;&#124; !LEASE_TOKEN.test(input.leaseToken) &#124;&#124; input.requiredSteps.some(step =&gt; !ACCOUNT_DELETION_STEP_CODES.includes(step)) |
| UI-74663fe9e6c6<br>[lib/subscription/account-deletion-storage.server.ts:213:25](../../lib/subscription/account-deletion-storage.server.ts#L213) | Invalid completion response. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | finalizeCompletion<br>value !== 'completed' &amp;&amp; value !== 'incomplete' &amp;&amp; value !== 'lease_lost' |

## lib/subscription/native-account-entitlement.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-ef1d380a460c<br>[lib/subscription/native-account-entitlement.ts:137:38](../../lib/subscription/native-account-entitlement.ts#L137) | authentication_required | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | evaluateNativePurchaseEligibility · reason<br>!isNonEmptyIdentifier(input.authenticatedOwnerId) |
| UI-580de9311948<br>[lib/subscription/native-account-entitlement.ts:157:15](../../lib/subscription/native-account-entitlement.ts#L157) | current_entitlement_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | evaluateNativePurchaseEligibility · reason<br>unavailable |
| UI-63b487ea61a9<br>[lib/subscription/native-account-entitlement.ts:165:38](../../lib/subscription/native-account-entitlement.ts#L165) | multiple_active_origins | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | evaluateNativePurchaseEligibility · reason<br>activeOrigins.size &gt; 1 |
| UI-847f2c727063<br>[lib/subscription/native-account-entitlement.ts:173:15](../../lib/subscription/native-account-entitlement.ts#L173) | manage_existing_subscription | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | evaluateNativePurchaseEligibility · reason<br>existing.origin === input.requestedOrigin |
| UI-9f72790b1c78<br>[lib/subscription/native-account-entitlement.ts:179:13](../../lib/subscription/native-account-entitlement.ts#L179) | active_origin_conflict | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | evaluateNativePurchaseEligibility · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/subscription/native-purchase-disclosure.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-32800eac00c6<br>[lib/subscription/native-purchase-disclosure.ts:113:26](../../lib/subscription/native-purchase-disclosure.ts#L113) | 除非在續訂日前取消，方案將依商店顯示的週期與價格自動續訂。 | **共用文案值** · 文案生產端，須查使用端<br>autoRenewalNotice：供畫面或訊息組裝使用的標籤／說明值 | prepareNativePurchaseDisclosure · autoRenewalNotice<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0d5953f9d1e1<br>[lib/subscription/native-purchase-disclosure.ts:114:27](../../lib/subscription/native-purchase-disclosure.ts#L114) | 可前往原購買商店管理或取消訂閱。 | **共用文案值** · 文案生產端，須查使用端<br>cancellationNotice：供畫面或訊息組裝使用的標籤／說明值 | prepareNativePurchaseDisclosure · cancellationNotice<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2500e85a3897<br>[lib/subscription/native-purchase-disclosure.ts:115:25](../../lib/subscription/native-purchase-disclosure.ts#L115) | 不訂閱仍可繼續使用 Free 的核心市集記錄功能。 | **共用文案值** · 文案生產端，須查使用端<br>freeAccessNotice：供畫面或訊息組裝使用的標籤／說明值 | prepareNativePurchaseDisclosure · freeAccessNotice<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2cee577f4896<br>[lib/subscription/native-purchase-disclosure.ts:116:28](../../lib/subscription/native-purchase-disclosure.ts#L116) | 商店交易通過伺服器驗證後，方案綁定 Féria 帳號並可跨裝置使用。 | **共用文案值** · 文案生產端，須查使用端<br>accountAccessNotice：供畫面或訊息組裝使用的標籤／說明值 | prepareNativePurchaseDisclosure · accountAccessNotice<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/subscription/native-reconciliation.server.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-2b2597da0d5d<br>[lib/subscription/native-reconciliation.server.ts:51:50](../../lib/subscription/native-reconciliation.server.ts#L51) | provider_deadline | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | bounded<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/subscription/native-store-catalog-config.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-23652ff66a93<br>[lib/subscription/native-store-catalog-config.ts:121:55](../../lib/subscription/native-store-catalog-config.ts#L121) | mapping_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseEntry<br>!isRecord(value) &#124;&#124; !hasExactKeys(value, [ 'store', 'priceVersionId', 'productId', 'basePlanId', 'offerId', 'status', ]) |
| UI-d7078fc5937e<br>[lib/subscription/native-store-catalog-config.ts:131:55](../../lib/subscription/native-store-catalog-config.ts#L131) | mapping_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseEntry<br>!isStore(value.store) &#124;&#124; !isSubscriptionPriceVersionId(value.priceVersionId) &#124;&#124; !isNullableString(value.productId) &#124;&#124; !isNullableString(value.basePlanId) &#124;&#124; !isNullableString(value.offerId) &#124;&#124; !isStatus(value.status) |
| UI-1012ee676597<br>[lib/subscription/native-store-catalog-config.ts:136:57](../../lib/subscription/native-store-catalog-config.ts#L136) | mapping_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseEntry<br>value.status !== 'candidate' → value.productId !== null &#124;&#124; value.basePlanId !== null &#124;&#124; value.offerId !== null |
| UI-9f4a0deeab1e<br>[lib/subscription/native-store-catalog-config.ts:139:55](../../lib/subscription/native-store-catalog-config.ts#L139) | mapping_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseEntry<br>否則 value.status !== 'candidate' → value.productId === null |
| UI-ecff60e46298<br>[lib/subscription/native-store-catalog-config.ts:163:55](../../lib/subscription/native-store-catalog-config.ts#L163) | document_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreCatalogConfig<br>!isRecord(value) &#124;&#124; !Array.isArray(value.mappings) &#124;&#124; !hasExactKeys(value, [ 'schemaVersion', 'sourceDocument', 'updatedAt', 'environment', 'activationStatus', 'mappings', ]) |
| UI-eb9d46472f91<br>[lib/subscription/native-store-catalog-config.ts:166:55](../../lib/subscription/native-store-catalog-config.ts#L166) | schema_version_unsupported | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreCatalogConfig<br>value.schemaVersion !== NATIVE_STORE_CATALOG_CONFIG_SCHEMA_VERSION |
| UI-fa3123d4f7fd<br>[lib/subscription/native-store-catalog-config.ts:169:55](../../lib/subscription/native-store-catalog-config.ts#L169) | source_document_mismatch | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreCatalogConfig<br>value.sourceDocument !== NATIVE_STORE_CATALOG_CONFIG_SOURCE_DOCUMENT |
| UI-fe9459105f89<br>[lib/subscription/native-store-catalog-config.ts:172:55](../../lib/subscription/native-store-catalog-config.ts#L172) | updated_date_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreCatalogConfig<br>!isValidDateOnly(value.updatedAt) |
| UI-6c525209b172<br>[lib/subscription/native-store-catalog-config.ts:175:55](../../lib/subscription/native-store-catalog-config.ts#L175) | environment_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreCatalogConfig<br>value.environment !== 'sandbox' |
| UI-eba78ce13542<br>[lib/subscription/native-store-catalog-config.ts:178:55](../../lib/subscription/native-store-catalog-config.ts#L178) | activation_status_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreCatalogConfig<br>value.activationStatus !== 'disabled' |
| UI-ea3829d818d1<br>[lib/subscription/native-store-catalog-config.ts:181:55](../../lib/subscription/native-store-catalog-config.ts#L181) | mapping_count_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreCatalogConfig<br>value.mappings.length !== EXPECTED_MAPPING_KEYS.length |
| UI-35318a5b2ec2<br>[lib/subscription/native-store-catalog-config.ts:189:57](../../lib/subscription/native-store-catalog-config.ts#L189) | mapping_unknown | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreCatalogConfig<br>!EXPECTED_MAPPING_KEYS.includes(key) |
| UI-74194fff8b6c<br>[lib/subscription/native-store-catalog-config.ts:191:74](../../lib/subscription/native-store-catalog-config.ts#L191) | mapping_duplicate | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreCatalogConfig<br>keys.has(key) |
| UI-efdafa2445d2<br>[lib/subscription/native-store-catalog-config.ts:195:55](../../lib/subscription/native-store-catalog-config.ts#L195) | mapping_unknown | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreCatalogConfig<br>EXPECTED_MAPPING_KEYS.some(key =&gt; !keys.has(key)) |
| UI-59b8840aee56<br>[lib/subscription/native-store-catalog-config.ts:211:57](../../lib/subscription/native-store-catalog-config.ts#L211) | mapping_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreCatalogConfigValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreCatalogConfig<br>!validation.ok |

## lib/subscription/native-store-product-metadata.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-fae469ed465a<br>[lib/subscription/native-store-product-metadata.ts:190:57](../../lib/subscription/native-store-product-metadata.ts#L190) | capability_mismatch | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseCapabilityCodes<br>!Array.isArray(value) &#124;&#124; !value.every(item =&gt; typeof item === 'string') |
| UI-ac9500c64ad5<br>[lib/subscription/native-store-product-metadata.ts:194:57](../../lib/subscription/native-store-product-metadata.ts#L194) | capability_mismatch | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseCapabilityCodes<br>!sameStrings(value, expected) |
| UI-4d78ae68a322<br>[lib/subscription/native-store-product-metadata.ts:198:59](../../lib/subscription/native-store-product-metadata.ts#L198) | capability_mismatch | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseCapabilityCodes<br>getSubscriptionPlanFeatureStatus(planCode as AccountPlanCode, capabilityCode) !== 'included' |
| UI-f9c2989c55d5<br>[lib/subscription/native-store-product-metadata.ts:208:57](../../lib/subscription/native-store-product-metadata.ts#L208) | apple_metadata_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseAppleProduct<br>!isRecord(value) &#124;&#124; !hasExactKeys(value, APPLE_PRODUCT_KEYS) |
| UI-3d610be26a9e<br>[lib/subscription/native-store-product-metadata.ts:217:57](../../lib/subscription/native-store-product-metadata.ts#L217) | apple_metadata_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseAppleProduct<br>!isSubscriptionPriceVersionId(value.priceVersionId) &#124;&#124; !isProductPlanCode(value.planCode) &#124;&#124; !isBoundedPublicText(value.displayName, 2, 30) &#124;&#124; !isBoundedPublicText(value.description, 1, 45) &#124;&#124; (value.disposition !== 'candidate_requires_manual_review' &amp;&amp; value.disposition !== 'deferred_pending_mechanism') |
| UI-37c6b1e973ad<br>[lib/subscription/native-store-product-metadata.ts:232:57](../../lib/subscription/native-store-product-metadata.ts#L232) | google_metadata_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseGoogleSubscription<br>!isRecord(value) &#124;&#124; !hasExactKeys(value, GOOGLE_SUBSCRIPTION_KEYS) |
| UI-1fa67bc0d136<br>[lib/subscription/native-store-product-metadata.ts:243:57](../../lib/subscription/native-store-product-metadata.ts#L243) | google_metadata_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseGoogleSubscription<br>!isProductPlanCode(value.planCode) &#124;&#124; value.disposition !== 'candidate_requires_manual_review' &#124;&#124; !isBoundedPublicText(value.name, 1, 55) &#124;&#124; !Array.isArray(value.benefits) &#124;&#124; value.benefits.length &lt; 1 &#124;&#124; value.benefits.length &gt; 4 &#124;&#124; !value.benefits.every(benefit =&gt; isBoundedPublicText(benefit, 1, 40)) &#124;&#124; new Set(value.benefits).size !== value.benefits.length |
| UI-94550d3ca5ca<br>[lib/subscription/native-store-product-metadata.ts:257:57](../../lib/subscription/native-store-product-metadata.ts#L257) | document_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreProductMetadata<br>!isRecord(value) &#124;&#124; !hasExactKeys(value, ROOT_KEYS) |
| UI-1e8b98a1d244<br>[lib/subscription/native-store-product-metadata.ts:260:57](../../lib/subscription/native-store-product-metadata.ts#L260) | schema_version_unsupported | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreProductMetadata<br>value.schemaVersion !== NATIVE_STORE_PRODUCT_METADATA_SCHEMA_VERSION |
| UI-cc5016ad8267<br>[lib/subscription/native-store-product-metadata.ts:263:57](../../lib/subscription/native-store-product-metadata.ts#L263) | source_document_mismatch | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreProductMetadata<br>value.sourceDocument !== NATIVE_STORE_PRODUCT_METADATA_SOURCE_DOCUMENT |
| UI-aa202900ca15<br>[lib/subscription/native-store-product-metadata.ts:266:57](../../lib/subscription/native-store-product-metadata.ts#L266) | updated_date_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreProductMetadata<br>!isValidDateOnly(value.updatedAt) |
| UI-3415e626190c<br>[lib/subscription/native-store-product-metadata.ts:269:57](../../lib/subscription/native-store-product-metadata.ts#L269) | document_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreProductMetadata<br>value.locale !== 'zh-TW' |
| UI-34a30c2b3e1c<br>[lib/subscription/native-store-product-metadata.ts:272:57](../../lib/subscription/native-store-product-metadata.ts#L272) | activation_status_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreProductMetadata<br>value.activationStatus !== 'disabled' |
| UI-6f0dbf3f7b81<br>[lib/subscription/native-store-product-metadata.ts:275:57](../../lib/subscription/native-store-product-metadata.ts#L275) | submission_status_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreProductMetadata<br>value.submissionStatus !== 'disabled' |
| UI-f0747c072d7c<br>[lib/subscription/native-store-product-metadata.ts:286:57](../../lib/subscription/native-store-product-metadata.ts#L286) | review_status_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreProductMetadata<br>!reviewStatuses.every(isReviewStatus) |
| UI-f5afe4ff1918<br>[lib/subscription/native-store-product-metadata.ts:294:57](../../lib/subscription/native-store-product-metadata.ts#L294) | apple_metadata_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreProductMetadata<br>!isRecord(value.apple) &#124;&#124; !hasExactKeys(value.apple, ['subscriptionGroupDisplayName', 'products']) &#124;&#124; !isBoundedPublicText(value.apple.subscriptionGroupDisplayName, 2, 30) &#124;&#124; !Array.isArray(value.apple.products) &#124;&#124; value.apple.products.length !== EXPECTED_APPLE_PRODUCTS.length |
| UI-1e4ecc73625a<br>[lib/subscription/native-store-product-metadata.ts:300:57](../../lib/subscription/native-store-product-metadata.ts#L300) | google_metadata_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreProductMetadata<br>!isRecord(value.google) &#124;&#124; !hasExactKeys(value.google, ['subscriptions']) &#124;&#124; !Array.isArray(value.google.subscriptions) &#124;&#124; value.google.subscriptions.length !== PRODUCT_PLAN_CODES.length |
| UI-aa8ac2c249e1<br>[lib/subscription/native-store-product-metadata.ts:306:59](../../lib/subscription/native-store-product-metadata.ts#L306) | apple_metadata_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreProductMetadata<br>product.priceVersionId !== expected.priceVersionId &#124;&#124; product.planCode !== expected.planCode |
| UI-6c49f2f9f1fa<br>[lib/subscription/native-store-product-metadata.ts:310:59](../../lib/subscription/native-store-product-metadata.ts#L310) | founder_disposition_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreProductMetadata<br>!isFounder &amp;&amp; product.disposition !== 'candidate_requires_manual_review' |
| UI-f7afd3f745ae<br>[lib/subscription/native-store-product-metadata.ts:314:59](../../lib/subscription/native-store-product-metadata.ts#L314) | founder_disposition_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreProductMetadata<br>isFounder &amp;&amp; product.disposition === 'candidate_requires_manual_review' &amp;&amp; value.founderPolicyDecisionStatus !== 'complete' |
| UI-d11cf6ee34da<br>[lib/subscription/native-store-product-metadata.ts:320:59](../../lib/subscription/native-store-product-metadata.ts#L320) | google_metadata_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>NativeStoreProductMetadataValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseNativeStoreProductMetadata<br>!googleSubscriptions.every((subscription, index) =&gt; ( subscription.planCode === PRODUCT_PLAN_CODES[index] )) |

## lib/subscription/subscription-access.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-4e1a7b32ac34<br>[lib/subscription/subscription-access.ts:137:13](../../lib/subscription/subscription-access.ts#L137) | allowed | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | evaluateCapabilityAccess · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/subscription/subscription-capabilities.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-a073df49c470<br>[lib/subscription/subscription-capabilities.ts:89:21](../../lib/subscription/subscription-capabilities.ts#L89) | free_source_requires_free_plan | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | assertValidPlanSource<br>planSource === 'free' &amp;&amp; planCode !== 'free' |
| UI-6d42d4039e7f<br>[lib/subscription/subscription-capabilities.ts:92:21](../../lib/subscription/subscription-capabilities.ts#L92) | promotion_source_requires_pro_plan | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | assertValidPlanSource<br>planSource === 'promotion' &amp;&amp; planCode !== 'pro' |

## lib/subscription/subscription-capability-implementation.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-fb330d653688<br>[lib/subscription/subscription-capability-implementation.ts:32:17](../../lib/subscription/subscription-capability-implementation.ts#L32) | Keep open mode until required-mode deployment evidence is approved. | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_CAPABILITY_IMPLEMENTATION 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_CAPABILITY_IMPLEMENTATION · nextGate<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d71141549220<br>[lib/subscription/subscription-capability-implementation.ts:39:17](../../lib/subscription/subscription-capability-implementation.ts#L39) | Add authoritative Team capability enforcement before paid launch. | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_CAPABILITY_IMPLEMENTATION 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_CAPABILITY_IMPLEMENTATION · nextGate<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a6d42b27e941<br>[lib/subscription/subscription-capability-implementation.ts:46:17](../../lib/subscription/subscription-capability-implementation.ts#L46) | Complete paid-state deployment UI smoke. | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_CAPABILITY_IMPLEMENTATION 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_CAPABILITY_IMPLEMENTATION · nextGate<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0ba787b2b1ac<br>[lib/subscription/subscription-capability-implementation.ts:53:17](../../lib/subscription/subscription-capability-implementation.ts#L53) | Complete paid-state deployment UI smoke. | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_CAPABILITY_IMPLEMENTATION 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_CAPABILITY_IMPLEMENTATION · nextGate<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a056c0697887<br>[lib/subscription/subscription-capability-implementation.ts:60:17](../../lib/subscription/subscription-capability-implementation.ts#L60) | Complete paid-state deployment UI smoke. | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_CAPABILITY_IMPLEMENTATION 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_CAPABILITY_IMPLEMENTATION · nextGate<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a963394e922f<br>[lib/subscription/subscription-capability-implementation.ts:67:17](../../lib/subscription/subscription-capability-implementation.ts#L67) | Complete paid-state deployment PDF smoke. | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_CAPABILITY_IMPLEMENTATION 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_CAPABILITY_IMPLEMENTATION · nextGate<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b4f8f804f399<br>[lib/subscription/subscription-capability-implementation.ts:74:17](../../lib/subscription/subscription-capability-implementation.ts#L74) | Approve an export scope before adding UI or runtime. | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_CAPABILITY_IMPLEMENTATION 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_CAPABILITY_IMPLEMENTATION · nextGate<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9f953401b72f<br>[lib/subscription/subscription-capability-implementation.ts:81:17](../../lib/subscription/subscription-capability-implementation.ts#L81) | Complete release-environment owner and staff transition smoke. | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_CAPABILITY_IMPLEMENTATION 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_CAPABILITY_IMPLEMENTATION · nextGate<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-455af7295829<br>[lib/subscription/subscription-capability-implementation.ts:88:17](../../lib/subscription/subscription-capability-implementation.ts#L88) | Complete release-environment role-cache and projection cleanup smoke. | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_CAPABILITY_IMPLEMENTATION 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_CAPABILITY_IMPLEMENTATION · nextGate<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a3ec131f25c5<br>[lib/subscription/subscription-capability-implementation.ts:96:40](../../lib/subscription/subscription-capability-implementation.ts#L96) | subscription_capability_implementation_missing:${feature} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | getSubscriptionCapabilityImplementation<br>!implementation |

## lib/subscription/subscription-center-view.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-f6af3d0851a5<br>[lib/subscription/subscription-center-view.ts:24:17](../../lib/subscription/subscription-center-view.ts#L24) | 藍新（歷史來源） | **來源候選** · 候選，非已證實提示<br>BILLING_ORIGIN_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | BILLING_ORIGIN_LABELS · newebpay_web<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b0747624ede8<br>[lib/subscription/subscription-center-view.ts:25:14](../../lib/subscription/subscription-center-view.ts#L25) | 綠界 | **來源候選** · 候選，非已證實提示<br>BILLING_ORIGIN_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | BILLING_ORIGIN_LABELS · ecpay_web<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0343193cee79<br>[lib/subscription/subscription-center-view.ts:26:20](../../lib/subscription/subscription-center-view.ts#L26) | Apple App Store | **來源候選** · 候選，非已證實提示<br>BILLING_ORIGIN_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | BILLING_ORIGIN_LABELS · apple_app_store<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-04e9cec9c6c4<br>[lib/subscription/subscription-center-view.ts:27:16](../../lib/subscription/subscription-center-view.ts#L27) | Google Play | **來源候選** · 候選，非已證實提示<br>BILLING_ORIGIN_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | BILLING_ORIGIN_LABELS · google_play<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c865460b1ba0<br>[lib/subscription/subscription-center-view.ts:28:25](../../lib/subscription/subscription-center-view.ts#L28) | 原生商店聚合 | **來源候選** · 候選，非已證實提示<br>BILLING_ORIGIN_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | BILLING_ORIGIN_LABELS · revenuecat_aggregate<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d46357b922dc<br>[lib/subscription/subscription-center-view.ts:38:16](../../lib/subscription/subscription-center-view.ts#L38) | 無法確認 | **共用文案值** · 文案生產端，須查使用端<br>planLabel：供畫面或訊息組裝使用的標籤／說明值 | emptyView · planLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fb84f8ad83a7<br>[lib/subscription/subscription-center-view.ts:39:18](../../lib/subscription/subscription-center-view.ts#L39) | 尚無可信方案來源 | **共用文案值** · 文案生產端，須查使用端<br>sourceLabel：供畫面或訊息組裝使用的標籤／說明值 | emptyView · sourceLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a5c4aba267c4<br>[lib/subscription/subscription-center-view.ts:40:24](../../lib/subscription/subscription-center-view.ts#L40) | 系統不會在方案資料不可用時推測付費權限。 | **共用文案值** · 文案生產端，須查使用端<br>sourceDescription：供畫面或訊息組裝使用的標籤／說明值 | emptyView · sourceDescription<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-98a5d5e4527d<br>[lib/subscription/subscription-center-view.ts:41:23](../../lib/subscription/subscription-center-view.ts#L41) | 無法確認 | **共用文案值** · 文案生產端，須查使用端<br>entitlementLabel：供畫面或訊息組裝使用的標籤／說明值 | emptyView · entitlementLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c99e3205dc22<br>[lib/subscription/subscription-center-view.ts:54:27](../../lib/subscription/subscription-center-view.ts#L54) | 使用中 | **來源候選** · 候選，非已證實提示<br>entitlementLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | entitlementLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e53703364db3<br>[lib/subscription/subscription-center-view.ts:55:26](../../lib/subscription/subscription-center-view.ts#L55) | 寬限期 | **來源候選** · 候選，非已證實提示<br>entitlementLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | entitlementLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d56731dff3c1<br>[lib/subscription/subscription-center-view.ts:56:29](../../lib/subscription/subscription-center-view.ts#L56) | 未啟用 | **來源候選** · 候選，非已證實提示<br>entitlementLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | entitlementLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8915561faf2b<br>[lib/subscription/subscription-center-view.ts:57:21](../../lib/subscription/subscription-center-view.ts#L57) | 無法確認 | **來源候選** · 候選，非已證實提示<br>entitlementLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | entitlementLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-516ed2e55914<br>[lib/subscription/subscription-center-view.ts:63:29](../../lib/subscription/subscription-center-view.ts#L63) | 試用中 | **來源候選** · 候選，非已證實提示<br>billingLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | billingLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d3b909d28dae<br>[lib/subscription/subscription-center-view.ts:64:27](../../lib/subscription/subscription-center-view.ts#L64) | 續訂中 | **來源候選** · 候選，非已證實提示<br>billingLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | billingLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7adc09550de6<br>[lib/subscription/subscription-center-view.ts:65:29](../../lib/subscription/subscription-center-view.ts#L65) | 付款待處理 | **來源候選** · 候選，非已證實提示<br>billingLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | billingLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4157e649676f<br>[lib/subscription/subscription-center-view.ts:66:41](../../lib/subscription/subscription-center-view.ts#L66) | 已排定取消 | **來源候選** · 候選，非已證實提示<br>billingLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | billingLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-504634b0b00f<br>[lib/subscription/subscription-center-view.ts:67:30](../../lib/subscription/subscription-center-view.ts#L67) | 已取消 | **來源候選** · 候選，非已證實提示<br>billingLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | billingLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1cbd6c439d2a<br>[lib/subscription/subscription-center-view.ts:68:29](../../lib/subscription/subscription-center-view.ts#L68) | 已退款 | **來源候選** · 候選，非已證實提示<br>billingLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | billingLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ec87d06a56ef<br>[lib/subscription/subscription-center-view.ts:69:29](../../lib/subscription/subscription-center-view.ts#L69) | 交易爭議處理中 | **來源候選** · 候選，非已證實提示<br>billingLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | billingLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f3e66c589bec<br>[lib/subscription/subscription-center-view.ts:70:28](../../lib/subscription/subscription-center-view.ts#L70) | 付款狀態無法確認 | **來源候選** · 候選，非已證實提示<br>billingLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | billingLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d86449ed9052<br>[lib/subscription/subscription-center-view.ts:84:18](../../lib/subscription/subscription-center-view.ts#L84) | 由品牌主管理 | **共用文案值** · 文案生產端，須查使用端<br>planLabel：供畫面或訊息組裝使用的標籤／說明值 | buildSubscriptionCenterView · planLabel<br>input.viewer === 'staff' |
| UI-6e06aee8b5cc<br>[lib/subscription/subscription-center-view.ts:85:20](../../lib/subscription/subscription-center-view.ts#L85) | 團隊成員 | **共用文案值** · 文案生產端，須查使用端<br>sourceLabel：供畫面或訊息組裝使用的標籤／說明值 | buildSubscriptionCenterView · sourceLabel<br>input.viewer === 'staff' |
| UI-431882aa72f4<br>[lib/subscription/subscription-center-view.ts:86:26](../../lib/subscription/subscription-center-view.ts#L86) | 訂閱購買、恢復與方案管理只由品牌主操作。 | **共用文案值** · 文案生產端，須查使用端<br>sourceDescription：供畫面或訊息組裝使用的標籤／說明值 | buildSubscriptionCenterView · sourceDescription<br>input.viewer === 'staff' |
| UI-91877aede416<br>[lib/subscription/subscription-center-view.ts:87:25](../../lib/subscription/subscription-center-view.ts#L87) | 依品牌方案與角色決定 | **共用文案值** · 文案生產端，須查使用端<br>entitlementLabel：供畫面或訊息組裝使用的標籤／說明值 | buildSubscriptionCenterView · entitlementLabel<br>input.viewer === 'staff' |
| UI-7cf31c5adbb6<br>[lib/subscription/subscription-center-view.ts:92:18](../../lib/subscription/subscription-center-view.ts#L92) | 尚未登入 | **共用文案值** · 文案生產端，須查使用端<br>planLabel：供畫面或訊息組裝使用的標籤／說明值 | buildSubscriptionCenterView · planLabel<br>!input.isLoading &amp;&amp; !input.isAuthenticated |
| UI-f507bcb3b22a<br>[lib/subscription/subscription-center-view.ts:93:20](../../lib/subscription/subscription-center-view.ts#L93) | 需要登入 | **共用文案值** · 文案生產端，須查使用端<br>sourceLabel：供畫面或訊息組裝使用的標籤／說明值 | buildSubscriptionCenterView · sourceLabel<br>!input.isLoading &amp;&amp; !input.isAuthenticated |
| UI-8f3ca218087e<br>[lib/subscription/subscription-center-view.ts:94:26](../../lib/subscription/subscription-center-view.ts#L94) | 登入後才能確認品牌帳號的方案與功能權限。 | **共用文案值** · 文案生產端，須查使用端<br>sourceDescription：供畫面或訊息組裝使用的標籤／說明值 | buildSubscriptionCenterView · sourceDescription<br>!input.isLoading &amp;&amp; !input.isAuthenticated |
| UI-59cbc6f4942c<br>[lib/subscription/subscription-center-view.ts:95:25](../../lib/subscription/subscription-center-view.ts#L95) | 未檢查 | **共用文案值** · 文案生產端，須查使用端<br>entitlementLabel：供畫面或訊息組裝使用的標籤／說明值 | buildSubscriptionCenterView · entitlementLabel<br>!input.isLoading &amp;&amp; !input.isAuthenticated |
| UI-92d74fb0d2e9<br>[lib/subscription/subscription-center-view.ts:102:20](../../lib/subscription/subscription-center-view.ts#L102) | 尚未登入 | **共用文案值** · 文案生產端，須查使用端<br>planLabel：供畫面或訊息組裝使用的標籤／說明值 | buildSubscriptionCenterView · planLabel<br>!input.capabilityResult.ok → input.capabilityResult.code === 'authentication_required' |
| UI-be5fa04665fa<br>[lib/subscription/subscription-center-view.ts:103:22](../../lib/subscription/subscription-center-view.ts#L103) | 需要登入 | **共用文案值** · 文案生產端，須查使用端<br>sourceLabel：供畫面或訊息組裝使用的標籤／說明值 | buildSubscriptionCenterView · sourceLabel<br>!input.capabilityResult.ok → input.capabilityResult.code === 'authentication_required' |
| UI-c8176b6a51ee<br>[lib/subscription/subscription-center-view.ts:104:28](../../lib/subscription/subscription-center-view.ts#L104) | 登入後才能確認品牌帳號的方案與功能權限。 | **共用文案值** · 文案生產端，須查使用端<br>sourceDescription：供畫面或訊息組裝使用的標籤／說明值 | buildSubscriptionCenterView · sourceDescription<br>!input.capabilityResult.ok → input.capabilityResult.code === 'authentication_required' |
| UI-006c2760d028<br>[lib/subscription/subscription-center-view.ts:105:27](../../lib/subscription/subscription-center-view.ts#L105) | 未檢查 | **共用文案值** · 文案生產端，須查使用端<br>entitlementLabel：供畫面或訊息組裝使用的標籤／說明值 | buildSubscriptionCenterView · entitlementLabel<br>!input.capabilityResult.ok → input.capabilityResult.code === 'authentication_required' |

## lib/subscription/subscription-plans.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-c79e27f99b72<br>[lib/subscription/subscription-plans.ts:90:15](../../lib/subscription/subscription-plans.ts#L90) | 剛開始建立市集營運紀錄的小品牌 | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_PLAN_DEFINITIONS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_PLAN_DEFINITIONS · audience<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ef794b3cbc22<br>[lib/subscription/subscription-plans.ts:91:14](../../lib/subscription/subscription-plans.ts#L91) | 完成每一場市集最重要的營運記錄。 | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_PLAN_DEFINITIONS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_PLAN_DEFINITIONS · promise<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c36ea8dfa652<br>[lib/subscription/subscription-plans.ts:92:18](../../lib/subscription/subscription-plans.ts#L92) | 保留市集、商品、成交、成本與互動記錄，不把日常營運流程鎖在付費牆後。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | SUBSCRIPTION_PLAN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5c4e4c312749<br>[lib/subscription/subscription-plans.ts:105:15](../../lib/subscription/subscription-plans.ts#L105) | 想看懂市集與商品決策的品牌主 | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_PLAN_DEFINITIONS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_PLAN_DEFINITIONS · audience<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3510351647b1<br>[lib/subscription/subscription-plans.ts:106:14](../../lib/subscription/subscription-plans.ts#L106) | 知道哪些市集與商品值得投入更多力氣。 | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_PLAN_DEFINITIONS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_PLAN_DEFINITIONS · promise<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5a2234b2face<br>[lib/subscription/subscription-plans.ts:107:18](../../lib/subscription/subscription-plans.ts#L107) | 加入單場復盤、進階比較、商品建議、結算報告預覽與商品封面照片能力，正式協作仍不在 Pro。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | SUBSCRIPTION_PLAN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-970b1fc5f3c7<br>[lib/subscription/subscription-plans.ts:120:15](../../lib/subscription/subscription-plans.ts#L120) | 有員工、manager 或重複分工需求的品牌 | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_PLAN_DEFINITIONS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_PLAN_DEFINITIONS · audience<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9f3214cdf4b7<br>[lib/subscription/subscription-plans.ts:121:14](../../lib/subscription/subscription-plans.ts#L121) | 一起營運，同時保護品牌主敏感資料。 | **來源候選** · 候選，非已證實提示<br>SUBSCRIPTION_PLAN_DEFINITIONS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SUBSCRIPTION_PLAN_DEFINITIONS · promise<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-24aa627c3da8<br>[lib/subscription/subscription-plans.ts:122:18](../../lib/subscription/subscription-plans.ts#L122) | 包含 Pro，並加入正式員工協作、manager 流程與成交照片證據能力。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | SUBSCRIPTION_PLAN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/subscription/subscription-presentation.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-58befc6325a5<br>[lib/subscription/subscription-presentation.ts:55:29](../../lib/subscription/subscription-presentation.ts#L55) | 市集、成本與營運資料管理 | **來源候選** · 候選，非已證實提示<br>PLAN_FEATURE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_FEATURE_LABELS · 'core.market_operations'<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-93b43e28fe91<br>[lib/subscription/subscription-presentation.ts:56:27](../../lib/subscription/subscription-presentation.ts#L56) | 快速成交與收攤後總額記錄 | **來源候選** · 候選，非已證實提示<br>PLAN_FEATURE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_FEATURE_LABELS · 'core.sales_recording'<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-96c3c7d44306<br>[lib/subscription/subscription-presentation.ts:57:27](../../lib/subscription/subscription-presentation.ts#L57) | 文字商品目錄與庫存資料 | **來源候選** · 候選，非已證實提示<br>PLAN_FEATURE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_FEATURE_LABELS · 'core.product_catalog'<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-619c31fc20fd<br>[lib/subscription/subscription-presentation.ts:58:22](../../lib/subscription/subscription-presentation.ts#L58) | 文字與事件資料同步 | **來源候選** · 候選，非已證實提示<br>PLAN_FEATURE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_FEATURE_LABELS · 'core.cloud_sync'<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b6d474e91606<br>[lib/subscription/subscription-presentation.ts:59:22](../../lib/subscription/subscription-presentation.ts#L59) | 單場基本分析與復盤 | **來源候選** · 候選，非已證實提示<br>PLAN_FEATURE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_FEATURE_LABELS · 'analytics.basic'<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-34ddaa1fe8de<br>[lib/subscription/subscription-presentation.ts:60:25](../../lib/subscription/subscription-presentation.ts#L60) | 跨市集比較與商品決策建議 | **來源候選** · 候選，非已證實提示<br>PLAN_FEATURE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_FEATURE_LABELS · 'analytics.advanced'<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-31b23f9a2f95<br>[lib/subscription/subscription-presentation.ts:61:32](../../lib/subscription/subscription-presentation.ts#L61) | 週／月結算報告預覽 | **來源候選** · 候選，非已證實提示<br>PLAN_FEATURE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_FEATURE_LABELS · 'report.settlement_preview'<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8010b9260fcd<br>[lib/subscription/subscription-presentation.ts:62:17](../../lib/subscription/subscription-presentation.ts#L62) | 設計版 PDF 報告 | **來源候選** · 候選，非已證實提示<br>PLAN_FEATURE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_FEATURE_LABELS · 'report.pdf'<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bca8d6dbcdaf<br>[lib/subscription/subscription-presentation.ts:63:19](../../lib/subscription/subscription-presentation.ts#L63) | Excel 報表 | **來源候選** · 候選，非已證實提示<br>PLAN_FEATURE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_FEATURE_LABELS · 'report.excel'<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-69e31cad1cbe<br>[lib/subscription/subscription-presentation.ts:64:26](../../lib/subscription/subscription-presentation.ts#L64) | 商品封面照片 | **來源候選** · 候選，非已證實提示<br>PLAN_FEATURE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_FEATURE_LABELS · 'photo.product_cover'<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a834e89a391f<br>[lib/subscription/subscription-presentation.ts:65:27](../../lib/subscription/subscription-presentation.ts#L65) | 成交照片證據 | **來源候選** · 候選，非已證實提示<br>PLAN_FEATURE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_FEATURE_LABELS · 'photo.sales_evidence'<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f6138acaa43c<br>[lib/subscription/subscription-presentation.ts:66:31](../../lib/subscription/subscription-presentation.ts#L66) | 正式員工協作 | **來源候選** · 候選，非已證實提示<br>PLAN_FEATURE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_FEATURE_LABELS · 'team.staff_collaboration'<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a8377e74b73c<br>[lib/subscription/subscription-presentation.ts:67:28](../../lib/subscription/subscription-presentation.ts#L67) | Manager 分工流程 | **來源候選** · 候選，非已證實提示<br>PLAN_FEATURE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_FEATURE_LABELS · 'team.manager_workflow'<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9907590d740a<br>[lib/subscription/subscription-presentation.ts:92:9](../../lib/subscription/subscription-presentation.ts#L92) | 免費核心方向 | **來源候選** · 候選，非已證實提示<br>PLAN_PRICE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_PRICE_LABELS · free<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f9acb2333a99<br>[lib/subscription/subscription-presentation.ts:93:8](../../lib/subscription/subscription-presentation.ts#L93) | 價格規劃中 | **來源候選** · 候選，非已證實提示<br>PLAN_PRICE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_PRICE_LABELS · pro<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a1a28075dea6<br>[lib/subscription/subscription-presentation.ts:94:9](../../lib/subscription/subscription-presentation.ts#L94) | 價格規劃中 | **來源候選** · 候選，非已證實提示<br>PLAN_PRICE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | PLAN_PRICE_LABELS · team<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fd645454746c<br>[lib/subscription/subscription-presentation.ts:111:18](../../lib/subscription/subscription-presentation.ts#L111) | 尚未開放 | **共用文案值** · 文案生產端，須查使用端<br>actionLabel：供畫面或訊息組裝使用的標籤／說明值 | buildPlanPreview · actionLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1d16107564e6<br>[lib/subscription/subscription-presentation.ts:139:16](../../lib/subscription/subscription-presentation.ts#L139) | Free（預設） | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3ae1719d5d22<br>[lib/subscription/subscription-presentation.ts:140:22](../../lib/subscription/subscription-presentation.ts#L140) | 伺服器未找到方案指派，付費能力維持關閉。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-232f25d38272<br>[lib/subscription/subscription-presentation.ts:145:16](../../lib/subscription/subscription-presentation.ts#L145) | Free | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b78ef7f16109<br>[lib/subscription/subscription-presentation.ts:146:22](../../lib/subscription/subscription-presentation.ts#L146) | 伺服器已確認此帳號使用 Free 方案。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-029f45f23a06<br>[lib/subscription/subscription-presentation.ts:151:16](../../lib/subscription/subscription-presentation.ts#L151) | 管理員已啟用 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6d64d0abb599<br>[lib/subscription/subscription-presentation.ts:152:22](../../lib/subscription/subscription-presentation.ts#L152) | 方案能力來自伺服器端管理員指派，不代表已付款。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f7ab38213568<br>[lib/subscription/subscription-presentation.ts:157:16](../../lib/subscription/subscription-presentation.ts#L157) | 管理員指派已停用 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-897ecdc59d74<br>[lib/subscription/subscription-presentation.ts:158:22](../../lib/subscription/subscription-presentation.ts#L158) | 保留指派紀錄，但不開放新的付費能力操作。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-234259998b2b<br>[lib/subscription/subscription-presentation.ts:163:16](../../lib/subscription/subscription-presentation.ts#L163) | 本機模擬方案 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-56848f8db855<br>[lib/subscription/subscription-presentation.ts:164:22](../../lib/subscription/subscription-presentation.ts#L164) | 目前能力來自本機測試工具，不代表付款、正式訂閱或雲端寫入授權。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-721e8ce7f57b<br>[lib/subscription/subscription-presentation.ts:169:16](../../lib/subscription/subscription-presentation.ts#L169) | 商店訂閱 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cfe227ca02b4<br>[lib/subscription/subscription-presentation.ts:170:22](../../lib/subscription/subscription-presentation.ts#L170) | 方案能力來自伺服器已驗證的付款來源。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-da17c563593d<br>[lib/subscription/subscription-presentation.ts:175:16](../../lib/subscription/subscription-presentation.ts#L175) | 商店訂閱未啟用 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-710142d0f572<br>[lib/subscription/subscription-presentation.ts:176:22](../../lib/subscription/subscription-presentation.ts#L176) | 保留帳務紀錄，但目前不開放新的付費能力操作。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8373b14fc026<br>[lib/subscription/subscription-presentation.ts:181:16](../../lib/subscription/subscription-presentation.ts#L181) | 付款尚未連接 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a789fefb8e22<br>[lib/subscription/subscription-presentation.ts:182:22](../../lib/subscription/subscription-presentation.ts#L182) | 系統不會在付款來源尚未完成驗證時授予付費能力。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-693cff1cd6a0<br>[lib/subscription/subscription-presentation.ts:187:16](../../lib/subscription/subscription-presentation.ts#L187) | 推廣獎勵尚未連接 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-feb3d17e088b<br>[lib/subscription/subscription-presentation.ts:188:22](../../lib/subscription/subscription-presentation.ts#L188) | 系統不會在推廣資格與獎勵流程尚未完成時授予 Pro。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f77913ae4700<br>[lib/subscription/subscription-presentation.ts:193:16](../../lib/subscription/subscription-presentation.ts#L193) | 推廣獎勵 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0ce9dc5c5315<br>[lib/subscription/subscription-presentation.ts:194:22](../../lib/subscription/subscription-presentation.ts#L194) | 方案能力來自伺服器已驗證的限期推廣資格，不代表已付款。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5f6a7faa517c<br>[lib/subscription/subscription-presentation.ts:199:16](../../lib/subscription/subscription-presentation.ts#L199) | 推廣獎勵已結束 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-99990b880cc5<br>[lib/subscription/subscription-presentation.ts:200:22](../../lib/subscription/subscription-presentation.ts#L200) | 保留獎勵紀錄，但目前不開放新的 Pro 能力操作。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1b0c704475d3<br>[lib/subscription/subscription-presentation.ts:205:16](../../lib/subscription/subscription-presentation.ts#L205) | 方案狀態無法確認 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dddb7752f345<br>[lib/subscription/subscription-presentation.ts:206:22](../../lib/subscription/subscription-presentation.ts#L206) | 系統不會在來源不可用時推測付費狀態。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getAccountCapabilitySourcePresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e0799771bd13<br>[lib/subscription/subscription-presentation.ts:218:7](../../lib/subscription/subscription-presentation.ts#L218) | 付費 | **來源候選** · 候選，非已證實提示<br>requiredPlanName 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | requiredPlanName<br>否則 requiredPlan |
| UI-de15fd67451c<br>[lib/subscription/subscription-presentation.ts:225:16](../../lib/subscription/subscription-presentation.ts#L225) | 需要 ${requiredPlanName} 方案 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-293823eace09<br>[lib/subscription/subscription-presentation.ts:226:22](../../lib/subscription/subscription-presentation.ts#L226) | 目前只能查看方案規劃；訂閱與付款尚未開放。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8df212630aaf<br>[lib/subscription/subscription-presentation.ts:228:22](../../lib/subscription/subscription-presentation.ts#L228) | 查看方案預覽 | **共用文案值** · 文案生產端，須查使用端<br>actionLabel：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · actionLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fa0611486931<br>[lib/subscription/subscription-presentation.ts:232:16](../../lib/subscription/subscription-presentation.ts#L232) | 目前身分沒有此操作權限 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-12a7b65ecec7<br>[lib/subscription/subscription-presentation.ts:233:22](../../lib/subscription/subscription-presentation.ts#L233) | 方案不會覆蓋 owner、manager、operator 或 viewer 的角色限制。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-61832f9efa6a<br>[lib/subscription/subscription-presentation.ts:239:16](../../lib/subscription/subscription-presentation.ts#L239) | 功能目前尚未開放 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a5a25cb0a89a<br>[lib/subscription/subscription-presentation.ts:240:22](../../lib/subscription/subscription-presentation.ts#L240) | 功能仍受獨立的安全與部署檢查控制。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6aafc48d1c7e<br>[lib/subscription/subscription-presentation.ts:246:16](../../lib/subscription/subscription-presentation.ts#L246) | 目前資料還不足 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-54450850c33e<br>[lib/subscription/subscription-presentation.ts:247:22](../../lib/subscription/subscription-presentation.ts#L247) | 繼續累積真實市集與商品資料後再查看此分析。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-92d40242553b<br>[lib/subscription/subscription-presentation.ts:253:16](../../lib/subscription/subscription-presentation.ts#L253) | 請先登入 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-35b0fe88e5d4<br>[lib/subscription/subscription-presentation.ts:254:22](../../lib/subscription/subscription-presentation.ts#L254) | 登入後才能確認帳號範圍與功能權限。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e91b16fa7fd3<br>[lib/subscription/subscription-presentation.ts:260:16](../../lib/subscription/subscription-presentation.ts#L260) | 目前無法確認品牌工作區 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9800701752cf<br>[lib/subscription/subscription-presentation.ts:261:22](../../lib/subscription/subscription-presentation.ts#L261) | 重新整理帳號與團隊狀態後再試一次。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3b65467aa6aa<br>[lib/subscription/subscription-presentation.ts:269:16](../../lib/subscription/subscription-presentation.ts#L269) | 目前無法確認方案權限 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5f5b2d2dea54<br>[lib/subscription/subscription-presentation.ts:270:22](../../lib/subscription/subscription-presentation.ts#L270) | 系統不會在權限資料過期或不可用時推測付費狀態。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getSubscriptionBlockedPresentation · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1d5e6ff2fd86<br>[lib/subscription/subscription-presentation.ts:281:17](../../lib/subscription/subscription-presentation.ts#L281) | 方案功能預覽 | **共用文案值** · 文案生產端，須查使用端<br>accountLabel：供畫面或訊息組裝使用的標籤／說明值 | SUBSCRIPTION_PRESENTATION · accountLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8b60f3f15285<br>[lib/subscription/subscription-presentation.ts:282:10](../../lib/subscription/subscription-presentation.ts#L282) | Free、Pro 與 Team | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | SUBSCRIPTION_PRESENTATION · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2597f547eefa<br>[lib/subscription/subscription-presentation.ts:283:16](../../lib/subscription/subscription-presentation.ts#L283) | 以下是方案功能方向。訂閱、付款、續訂與方案切換尚未開放。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | SUBSCRIPTION_PRESENTATION · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-426ba29646d9<br>[lib/subscription/subscription-presentation.ts:284:11](../../lib/subscription/subscription-presentation.ts#L284) | 目前實際可使用的功能仍依帳號角色、資料完整度與各功能 runtime gate 決定，不以此預覽授權。 | **共用文案值** · 文案生產端，須查使用端<br>notice：供畫面或訊息組裝使用的標籤／說明值 | SUBSCRIPTION_PRESENTATION · notice<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bbf42aaf7ba9<br>[lib/subscription/subscription-presentation.ts:285:16](../../lib/subscription/subscription-presentation.ts#L285) | 尚未開放 | **共用文案值** · 文案生產端，須查使用端<br>actionLabel：供畫面或訊息組裝使用的標籤／說明值 | SUBSCRIPTION_PRESENTATION · actionLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/subscription/subscription-pricing.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-cb0b7d65d558<br>[lib/subscription/subscription-pricing.ts:258:55](../../lib/subscription/subscription-pricing.ts#L258) | invalid_assignment | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveRenewalPrice · reason<br>!assignment.assignmentId.trim() &#124;&#124; !isNonNegativeMinorAmount(assignment.assignedAmountMinor) &#124;&#124; assignment.currency !== 'TWD' |
| UI-c8448611d4f9<br>[lib/subscription/subscription-pricing.ts:263:57](../../lib/subscription/subscription-pricing.ts#L263) | founder_lock_dormant | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveRenewalPrice · reason<br>assignment.policy === 'founder_locked' → assignment.founderLockStatus === 'dormant' |
| UI-ebd8e9193221<br>[lib/subscription/subscription-pricing.ts:266:57](../../lib/subscription/subscription-pricing.ts#L266) | founder_lock_forfeited | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveRenewalPrice · reason<br>assignment.policy === 'founder_locked' → assignment.founderLockStatus === 'forfeited' |
| UI-1f7b79bf57ac<br>[lib/subscription/subscription-pricing.ts:272:57](../../lib/subscription/subscription-pricing.ts#L272) | invalid_assignment | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveRenewalPrice · reason<br>assignment.policy === 'founder_locked' → assignment.founderOfferCode !== FOUNDER_OFFER_CODE &#124;&#124; (assignment.founderLockStatus !== 'active' &amp;&amp; assignment.founderLockStatus !== 'grace') |
| UI-38947bec03af<br>[lib/subscription/subscription-pricing.ts:328:15](../../lib/subscription/subscription-pricing.ts#L328) | forfeited | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolveFounderLockTransition · reason<br>currentStatus === 'forfeited' |
| UI-354673466ea3<br>[lib/subscription/subscription-pricing.ts:337:15](../../lib/subscription/subscription-pricing.ts#L337) | forfeited | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolveFounderLockTransition · reason<br>FORFEITURE_EVENTS.includes(event) |
| UI-5258165241df<br>[lib/subscription/subscription-pricing.ts:346:15](../../lib/subscription/subscription-pricing.ts#L346) | entered_grace | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveFounderLockTransition · reason<br>event === 'grace_started' &amp;&amp; currentStatus === 'active' |
| UI-49d8b692d2c0<br>[lib/subscription/subscription-pricing.ts:358:15](../../lib/subscription/subscription-pricing.ts#L358) | recovered | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolveFounderLockTransition · reason<br>(event === 'payment_recovered' &#124;&#124; event === 'renewal_succeeded') &amp;&amp; currentStatus === 'grace' |
| UI-6600b6fab5a6<br>[lib/subscription/subscription-pricing.ts:371:15](../../lib/subscription/subscription-pricing.ts#L371) | dormant_under_team | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveFounderLockTransition · reason<br>event === 'team_upgrade_confirmed' &amp;&amp; (currentStatus === 'active' &#124;&#124; currentStatus === 'grace') &amp;&amp; input.trustedPaidContinuityUnbroken |
| UI-7ebc8af08284<br>[lib/subscription/subscription-pricing.ts:384:15](../../lib/subscription/subscription-pricing.ts#L384) | restored | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolveFounderLockTransition · reason<br>event === 'team_to_pro_confirmed' &amp;&amp; currentStatus === 'dormant' &amp;&amp; input.trustedPaidContinuityUnbroken |
| UI-afdb1af09efd<br>[lib/subscription/subscription-pricing.ts:407:15](../../lib/subscription/subscription-pricing.ts#L407) | preserved | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolveFounderLockTransition · reason<br>preservesActive &#124;&#124; preservesGrace &#124;&#124; preservesDormant |
| UI-d8f28b612e7a<br>[lib/subscription/subscription-pricing.ts:415:13](../../lib/subscription/subscription-pricing.ts#L415) | invalid_transition | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveFounderLockTransition · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9f8ab6c3bf74<br>[lib/subscription/subscription-pricing.ts:458:15](../../lib/subscription/subscription-pricing.ts#L458) | invalid_input | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolvePlanChangePolicy · reason<br>evaluatedAt === null &#124;&#124; periodEndsAt === null &#124;&#124; requestedTarget.planCode !== input.toPlanCode |
| UI-f492ff2c50d8<br>[lib/subscription/subscription-pricing.ts:471:15](../../lib/subscription/subscription-pricing.ts#L471) | unsupported_transition | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolvePlanChangePolicy · reason<br>input.fromPlanCode === input.toPlanCode |
| UI-3c8bca24856e<br>[lib/subscription/subscription-pricing.ts:490:17](../../lib/subscription/subscription-pricing.ts#L490) | invalid_input | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolvePlanChangePolicy · reason<br>input.fromPlanCode === 'pro' &amp;&amp; input.toPlanCode === 'team' → input.founderLockStatus === 'dormant' &#124;&#124; ((input.founderLockStatus === 'active' &#124;&#124; input.founderLockStatus === 'grace') &amp;&amp; input.trustedProviderTransitionConfirmed &amp;&amp; !input.trustedPaidContinuityUnbroken) |
| UI-86139aab4afa<br>[lib/subscription/subscription-pricing.ts:503:17](../../lib/subscription/subscription-pricing.ts#L503) | payment_required | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolvePlanChangePolicy · reason<br>input.fromPlanCode === 'pro' &amp;&amp; input.toPlanCode === 'team' → !input.trustedProviderTransitionConfirmed |
| UI-a31dee7cf3ce<br>[lib/subscription/subscription-pricing.ts:519:15](../../lib/subscription/subscription-pricing.ts#L519) | confirmed | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolvePlanChangePolicy · reason<br>input.fromPlanCode === 'pro' &amp;&amp; input.toPlanCode === 'team' |
| UI-7c27d5c0198f<br>[lib/subscription/subscription-pricing.ts:544:17](../../lib/subscription/subscription-pricing.ts#L544) | invalid_input | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolvePlanChangePolicy · reason<br>input.fromPlanCode === 'team' &amp;&amp; input.toPlanCode === 'pro' → canRestoreFounder &amp;&amp; (!founderPrice &#124;&#124; founderPrice.policy !== 'founder_locked' &#124;&#124; founderPrice.planCode !== 'pro') |
| UI-997abec88a88<br>[lib/subscription/subscription-pricing.ts:564:17](../../lib/subscription/subscription-pricing.ts#L564) | renewal_boundary | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolvePlanChangePolicy · reason<br>input.fromPlanCode === 'team' &amp;&amp; input.toPlanCode === 'pro' → evaluatedAt &lt; periodEndsAt |
| UI-370eb6754123<br>[lib/subscription/subscription-pricing.ts:577:17](../../lib/subscription/subscription-pricing.ts#L577) | provider_confirmation_required | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolvePlanChangePolicy · reason<br>input.fromPlanCode === 'team' &amp;&amp; input.toPlanCode === 'pro' → !input.trustedProviderTransitionConfirmed |
| UI-34acbbe76f20<br>[lib/subscription/subscription-pricing.ts:600:15](../../lib/subscription/subscription-pricing.ts#L600) | confirmed | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolvePlanChangePolicy · reason<br>input.fromPlanCode === 'team' &amp;&amp; input.toPlanCode === 'pro' |
| UI-7095d1237f3e<br>[lib/subscription/subscription-pricing.ts:612:13](../../lib/subscription/subscription-pricing.ts#L612) | unsupported_transition | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolvePlanChangePolicy · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-89130ce80b86<br>[lib/subscription/subscription-pricing.ts:723:15](../../lib/subscription/subscription-pricing.ts#L723) | exact_quote_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolvePlanChangeQuote · reason<br>input.mode === 'support_required' |
| UI-f6012fbb33d1<br>[lib/subscription/subscription-pricing.ts:740:15](../../lib/subscription/subscription-pricing.ts#L740) | provider_snapshot_unverified | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolvePlanChangeQuote · reason<br>!input.trustedProviderSnapshotVerified |
| UI-f2db3506360f<br>[lib/subscription/subscription-pricing.ts:757:15](../../lib/subscription/subscription-pricing.ts#L757) | invalid_input | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolvePlanChangeQuote · reason<br>!input.quoteId.trim() &#124;&#124; !input.providerSnapshotRef.trim() &#124;&#124; evaluatedAt === null &#124;&#124; expiresAt === null &#124;&#124; expiresAt &lt;= evaluatedAt |
| UI-c11db90fdbac<br>[lib/subscription/subscription-pricing.ts:789:17](../../lib/subscription/subscription-pricing.ts#L789) | invalid_input | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolvePlanChangeQuote · reason<br>input.mode === 'provider_quote' → input.values.currency !== 'TWD' &#124;&#124; nonNegativeMoneyValues.some( (value) =&gt; value !== null &amp;&amp; !isNonNegativeMinorAmount(value), ) &#124;&#124; (input.values.netAmountMinor !== null &amp;&amp; !Number.isSafeInteger(input.values.netAmountMinor)) &#124;&#124; !isValidOptionalInstant(input.values.effectiveAt) &#124;&#124; !isValidOptionalInstant(input.values.nextRenewalAt) &#124;&#124; (effectiveAt !== null &amp;&amp; nextRenewalAt !== null &amp;&amp; nextRenewalAt &lt;= effectiveAt) |
| UI-6399551fdfe7<br>[lib/subscription/subscription-pricing.ts:829:15](../../lib/subscription/subscription-pricing.ts#L829) | invalid_input | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolvePlanChangeQuote · reason<br>periodStartsAt === null &#124;&#124; periodEndsAt === null &#124;&#124; effectiveAt === null &#124;&#124; periodStartsAt &gt;= periodEndsAt &#124;&#124; effectiveAt &lt; periodStartsAt &#124;&#124; effectiveAt &gt; periodEndsAt &#124;&#124; effectiveAt &lt; evaluatedAt &#124;&#124; effectiveAt &gt; expiresAt &#124;&#124; !isNonNegativeMinorAmount(input.actualPaidAmountMinor) &#124;&#124; targetPrice.planCode !== 'team' &#124;&#124; (input.trustedNextRenewalAt !== null &amp;&amp; (nextRenewalAt === null &#124;&#124; nextRenewalAt &lt;= effectiveAt)) |
| UI-235ff4adc424<br>[lib/subscription/subscription-pricing.ts:846:15](../../lib/subscription/subscription-pricing.ts#L846) | invalid_input | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolvePlanChangeQuote · reason<br>unusedValueMinor === null |
