# 測試、救援與開發工具：提示與介面文字

> 自動產生；請勿手動修改。重新產生：`node scripts/generate-ui-copy-inventory.mjs`。
> [總索引](../APP_UI_COPY_INDEX.md) · [完整 JSON](inventory.json) · [逐檔覆蓋](coverage.md)

共 507 筆來源位置；同字不同出處分開記錄。這是來源盤點，候選與未啟用分支不算已上線功能。

## app/api/dev/subscription-price-foundation-smoke/route.ts

測試／工具表面（另受建置或頁面 gate 限制）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-94d3c1d7550f<br>[app/api/dev/subscription-price-foundation-smoke/route.ts:41:63](../../app/api/dev/subscription-price-foundation-smoke/route.ts#L41) | Smoke authentication is unavailable. | **來源候選** · 候選，非已證實提示<br>createSubscriptionPriceFoundationSmokeRouteHandler 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | createSubscriptionPriceFoundationSmokeRouteHandler<br>actor === 'unavailable' |
| UI-267b04b99bea<br>[app/api/dev/subscription-price-foundation-smoke/route.ts:44:60](../../app/api/dev/subscription-price-foundation-smoke/route.ts#L44) | Smoke requires authentication. | **來源候選** · 候選，非已證實提示<br>createSubscriptionPriceFoundationSmokeRouteHandler 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | createSubscriptionPriceFoundationSmokeRouteHandler<br>!actor |
| UI-7df87f1ea6d8<br>[app/api/dev/subscription-price-foundation-smoke/route.ts:49:54](../../app/api/dev/subscription-price-foundation-smoke/route.ts#L49) | Price foundation smoke is unavailable. | **來源候選** · 候選，非已證實提示<br>createSubscriptionPriceFoundationSmokeRouteHandler 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | createSubscriptionPriceFoundationSmokeRouteHandler<br>!summary |
| UI-26960e69f4be<br>[app/api/dev/subscription-price-foundation-smoke/route.ts:76:55](../../app/api/dev/subscription-price-foundation-smoke/route.ts#L76) | Development tool is unavailable. | **來源候選** · 候選，非已證實提示<br>runWithCors 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | runWithCors<br>!isSubscriptionSimulationRequestAllowed(request) |
| UI-a971784eec20<br>[app/api/dev/subscription-price-foundation-smoke/route.ts:87:50](../../app/api/dev/subscription-price-foundation-smoke/route.ts#L87) | Development tool is unavailable. | **來源候選** · 候選，非已證實提示<br>OPTIONS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | OPTIONS<br>否則 isSubscriptionSimulationRequestAllowed(request) |

## app/api/dev/subscription-simulation/route.ts

測試／工具表面（另受建置或頁面 gate 限制）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-a3b78a651599<br>[app/api/dev/subscription-simulation/route.ts:54:61](../../app/api/dev/subscription-simulation/route.ts#L54) | Simulation authentication is unavailable. | **來源候選** · 候選，非已證實提示<br>resolveValidActor 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | resolveValidActor<br>actor === 'unavailable' |
| UI-85ee573ee86b<br>[app/api/dev/subscription-simulation/route.ts:57:58](../../app/api/dev/subscription-simulation/route.ts#L57) | Simulation requires authentication. | **來源候選** · 候選，非已證實提示<br>resolveValidActor 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | resolveValidActor<br>!actor |
| UI-b03312fa3395<br>[app/api/dev/subscription-simulation/route.ts:60:57](../../app/api/dev/subscription-simulation/route.ts#L60) | Subscription simulation is unavailable. | **來源候選** · 候選，非已證實提示<br>resolveValidActor 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | resolveValidActor<br>!UUID_PATTERN.test(actor.actorId) |
| UI-b7a6f3367d25<br>[app/api/dev/subscription-simulation/route.ts:80:54](../../app/api/dev/subscription-simulation/route.ts#L80) | Simulation request is invalid. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>catch：操作拋出例外 |
| UI-3e36a36e4f5b<br>[app/api/dev/subscription-simulation/route.ts:83:54](../../app/api/dev/subscription-simulation/route.ts#L83) | Simulation request is invalid. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>!body &#124;&#124; typeof body !== 'object' &#124;&#124; Array.isArray(body) |
| UI-aa7324ebaa2f<br>[app/api/dev/subscription-simulation/route.ts:89:54](../../app/api/dev/subscription-simulation/route.ts#L89) | Simulation plan is invalid. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>input.enabled !== true &#124;&#124; !isAccountPlanCode(input.planCode) |
| UI-1aeb9b11c0e8<br>[app/api/dev/subscription-simulation/route.ts:113:55](../../app/api/dev/subscription-simulation/route.ts#L113) | Development tool is unavailable. | **來源候選** · 候選，非已證實提示<br>runWithCors 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | runWithCors<br>!isSubscriptionSimulationRequestAllowed(request) |
| UI-c13f48f77698<br>[app/api/dev/subscription-simulation/route.ts:116:57](../../app/api/dev/subscription-simulation/route.ts#L116) | Cloud subscription test setup is required. | **來源候選** · 候選，非已證實提示<br>runWithCors 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | runWithCors<br>process.env.SUBSCRIPTION_WRITE_ENFORCEMENT_ENABLED === '1' &amp;&amp; !isCloudSubscriptionSimulationEnabled() |
| UI-678e08603f0d<br>[app/api/dev/subscription-simulation/route.ts:122:67](../../app/api/dev/subscription-simulation/route.ts#L122) | Subscription test setup is unavailable. | **來源候選** · 候選，非已證實提示<br>runWithCors 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | runWithCors<br>catch：操作拋出例外 |
| UI-546e765ca4d4<br>[app/api/dev/subscription-simulation/route.ts:131:50](../../app/api/dev/subscription-simulation/route.ts#L131) | Development tool is unavailable. | **來源候選** · 候選，非已證實提示<br>OPTIONS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | OPTIONS<br>否則 isSubscriptionSimulationRequestAllowed(request) |

## app/debug/flicker-test/page.web.tsx

測試／工具表面（另受建置或頁面 gate 限制）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-77e729b99746<br>[app/debug/flicker-test/page.web.tsx:104:17](../../app/debug/flicker-test/page.web.tsx#L104) | /* 滑動動畫參數 */ @keyframes slideFromRight { from { transform: translateX(${slideDistance}%); opacity: ${slideOpacity}; } to { transform: translateX(0); opacity: 1; } } @keyframes slideFromLeft { from { transform: translateX(-${slideDistance}%); opacity: ${slideOpacity}; } to { transform: translateX(0); opacity: 1; } } .slide-from-right { animation: slideFromRight ${slideDuration}ms cubic-bezier(0.4, 0, 0.2, 1); } .slide-from-left { animation: slideFromLeft ${slideDuration}ms cubic-bezier(0.4, 0, 0.2, 1); } /* 淡入動畫參數 */ @keyframes fadeIn { from { opacity: ${fadeOpacity}; } to { opacity: 1; } } .fade-in { animation: fadeIn ${fadeDuration}ms ease-out; } /* 背景色 */ .page-transition { background-color: ${backgroundColor}; } | **來源候選** · 候選，非已證實提示<br>css 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | css<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6e16d618d3b2<br>[app/debug/flicker-test/page.web.tsx:158:13](../../app/debug/flicker-test/page.web.tsx#L158) | ✅ CSS 參數已複製到剪貼簿！ 可以直接貼到 globals.css 中使用。 | **確認／通知** · 直接呈現定義<br>alert：提示操作結果、進度或要求使用者確認 | exportParams<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c4852568f1cc<br>[app/debug/flicker-test/page.web.tsx:169:62](../../app/debug/flicker-test/page.web.tsx#L169) | 測試標題 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | renderContent<br>contentType === 'text' |
| UI-7a9ab87631e4<br>[app/debug/flicker-test/page.web.tsx:170:48](../../app/debug/flicker-test/page.web.tsx#L170) | 這是一段測試文字，用於觀察閃爍效果。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | renderContent<br>contentType === 'text' |
| UI-af8525e686f9<br>[app/debug/flicker-test/page.web.tsx:171:48](../../app/debug/flicker-test/page.web.tsx#L171) | 請仔細觀察動畫過程中是否有明顯的閃爍或跳動。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | renderContent<br>contentType === 'text' |
| UI-a3df7c73eadd<br>[app/debug/flicker-test/page.web.tsx:181:46](../../app/debug/flicker-test/page.web.tsx#L181) | 📦 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | renderContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cb12518ade80<br>[app/debug/flicker-test/page.web.tsx:182:68](../../app/debug/flicker-test/page.web.tsx#L182) | 卡片 ${i} | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | renderContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-70febc9b2e04<br>[app/debug/flicker-test/page.web.tsx:183:67](../../app/debug/flicker-test/page.web.tsx#L183) | 測試內容 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | renderContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ceaa08bcf217<br>[app/debug/flicker-test/page.web.tsx:193:50](../../app/debug/flicker-test/page.web.tsx#L193) | 混合內容測試 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | renderContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-213bec2f80d7<br>[app/debug/flicker-test/page.web.tsx:194:45](../../app/debug/flicker-test/page.web.tsx#L194) | 包含漸層背景、文字和卡片 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | renderContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c3886cbb88b1<br>[app/debug/flicker-test/page.web.tsx:200:45](../../app/debug/flicker-test/page.web.tsx#L200) | 🎪 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | renderContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d735a98f82fc<br>[app/debug/flicker-test/page.web.tsx:201:68](../../app/debug/flicker-test/page.web.tsx#L201) | 項目 ${i} | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | renderContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0afa34980422<br>[app/debug/flicker-test/page.web.tsx:208:61](../../app/debug/flicker-test/page.web.tsx#L208) | 總收入 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | renderContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-42e599f3eb6c<br>[app/debug/flicker-test/page.web.tsx:209:63](../../app/debug/flicker-test/page.web.tsx#L209) | NT$ 12,345 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | renderContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-63a80f903b50<br>[app/debug/flicker-test/page.web.tsx:222:23](../../app/debug/flicker-test/page.web.tsx#L222) | @keyframes slideFromRight { from { transform: translateX(${slideDistance}%); opacity: ${slideOpacity}; } to { transform: translateX(0); opacity: 1; } } @keyframes slideFromLeft { from { transform: translateX(-${slideDistance}%); opacity: ${slideOpacity}; } to { transform: translateX(0); opacity: 1; } } @keyframes fadeIn { from { opacity: ${fadeOpacity}; } to { opacity: 1; } } | **DOM 訊息文字** · 直接呈現定義<br>style.innerHTML：寫入頁面文字或 HTML 訊息區 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-48d1dc988dd7<br>[app/debug/flicker-test/page.web.tsx:275:17](../../app/debug/flicker-test/page.web.tsx#L275) | 閃爍測試調試工具 | **畫面文字** · 直接呈現定義<br>h1：辨識畫面、區塊或對話框主題 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8a3a2cabb46f<br>[app/debug/flicker-test/page.web.tsx:278:17](../../app/debug/flicker-test/page.web.tsx#L278) | 實時調整動畫參數，找出最佳配置 🔧 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4c59fba775e1<br>[app/debug/flicker-test/page.web.tsx:286:15](../../app/debug/flicker-test/page.web.tsx#L286) | 已測試 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dd190a3eae48<br>[app/debug/flicker-test/page.web.tsx:286:74](../../app/debug/flicker-test/page.web.tsx#L286) | 次 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-400eb0b0e552<br>[app/debug/flicker-test/page.web.tsx:301:69](../../app/debug/flicker-test/page.web.tsx#L301) | 動畫類型 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-727cbac1bdcd<br>[app/debug/flicker-test/page.web.tsx:313:19](../../app/debug/flicker-test/page.web.tsx#L313) | 從右滑入 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f8b7429d20b5<br>[app/debug/flicker-test/page.web.tsx:323:19](../../app/debug/flicker-test/page.web.tsx#L323) | 從左滑入 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-241e3e10880c<br>[app/debug/flicker-test/page.web.tsx:333:19](../../app/debug/flicker-test/page.web.tsx#L333) | 淡入 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-decddddbda11<br>[app/debug/flicker-test/page.web.tsx:341:74](../../app/debug/flicker-test/page.web.tsx#L341) | 滑動動畫參數 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-dd4f06cdb960<br>[app/debug/flicker-test/page.web.tsx:347:72](../../app/debug/flicker-test/page.web.tsx#L347) | 滑動距離 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-2433fd668b56<br>[app/debug/flicker-test/page.web.tsx:348:89](../../app/debug/flicker-test/page.web.tsx#L348) | ${slideDistance}% | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-c9502d660561<br>[app/debug/flicker-test/page.web.tsx:360:29](../../app/debug/flicker-test/page.web.tsx#L360) | 0% | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-384a80370665<br>[app/debug/flicker-test/page.web.tsx:361:29](../../app/debug/flicker-test/page.web.tsx#L361) | 50% | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-745165682c55<br>[app/debug/flicker-test/page.web.tsx:362:29](../../app/debug/flicker-test/page.web.tsx#L362) | 100% | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-e0e5429f1008<br>[app/debug/flicker-test/page.web.tsx:369:72](../../app/debug/flicker-test/page.web.tsx#L369) | 起始透明度 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-a8ca723a5bab<br>[app/debug/flicker-test/page.web.tsx:382:29](../../app/debug/flicker-test/page.web.tsx#L382) | 0 (完全透明) | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-baf92714e1c3<br>[app/debug/flicker-test/page.web.tsx:383:29](../../app/debug/flicker-test/page.web.tsx#L383) | 0.5 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-81ce428ed3fc<br>[app/debug/flicker-test/page.web.tsx:384:29](../../app/debug/flicker-test/page.web.tsx#L384) | 1 (不透明) | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-05ab6882655d<br>[app/debug/flicker-test/page.web.tsx:391:72](../../app/debug/flicker-test/page.web.tsx#L391) | 動畫時長 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-bdb00dc3e623<br>[app/debug/flicker-test/page.web.tsx:392:89](../../app/debug/flicker-test/page.web.tsx#L392) | ${slideDuration}ms | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-12783a549f28<br>[app/debug/flicker-test/page.web.tsx:404:29](../../app/debug/flicker-test/page.web.tsx#L404) | 50ms | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-6c91b97ac8d2<br>[app/debug/flicker-test/page.web.tsx:405:29](../../app/debug/flicker-test/page.web.tsx#L405) | 250ms | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-c80b71207fb6<br>[app/debug/flicker-test/page.web.tsx:406:29](../../app/debug/flicker-test/page.web.tsx#L406) | 500ms | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>(animationType === 'slide-right' &#124;&#124; animationType === 'slide-left') |
| UI-abee68444b5f<br>[app/debug/flicker-test/page.web.tsx:416:74](../../app/debug/flicker-test/page.web.tsx#L416) | 淡入動畫參數 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | FlickerTestPage<br>animationType === 'fade' |
| UI-0f116be6e533<br>[app/debug/flicker-test/page.web.tsx:422:72](../../app/debug/flicker-test/page.web.tsx#L422) | 起始透明度 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | FlickerTestPage<br>animationType === 'fade' |
| UI-a111344da3f6<br>[app/debug/flicker-test/page.web.tsx:435:29](../../app/debug/flicker-test/page.web.tsx#L435) | 0 (完全透明) | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>animationType === 'fade' |
| UI-c42c16c8dd81<br>[app/debug/flicker-test/page.web.tsx:436:29](../../app/debug/flicker-test/page.web.tsx#L436) | 0.5 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>animationType === 'fade' |
| UI-726ccc1582ec<br>[app/debug/flicker-test/page.web.tsx:437:29](../../app/debug/flicker-test/page.web.tsx#L437) | 1 (不透明) | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>animationType === 'fade' |
| UI-7882643980b1<br>[app/debug/flicker-test/page.web.tsx:444:72](../../app/debug/flicker-test/page.web.tsx#L444) | 動畫時長 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | FlickerTestPage<br>animationType === 'fade' |
| UI-997e36bb8d77<br>[app/debug/flicker-test/page.web.tsx:445:88](../../app/debug/flicker-test/page.web.tsx#L445) | ${fadeDuration}ms | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>animationType === 'fade' |
| UI-d26286b24abf<br>[app/debug/flicker-test/page.web.tsx:457:29](../../app/debug/flicker-test/page.web.tsx#L457) | 50ms | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>animationType === 'fade' |
| UI-f32e724bacef<br>[app/debug/flicker-test/page.web.tsx:458:29](../../app/debug/flicker-test/page.web.tsx#L458) | 250ms | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>animationType === 'fade' |
| UI-06015144a1eb<br>[app/debug/flicker-test/page.web.tsx:459:29](../../app/debug/flicker-test/page.web.tsx#L459) | 500ms | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>animationType === 'fade' |
| UI-1e4476efb41f<br>[app/debug/flicker-test/page.web.tsx:470:69](../../app/debug/flicker-test/page.web.tsx#L470) | 其他設定 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-11957cb0ae55<br>[app/debug/flicker-test/page.web.tsx:476:79](../../app/debug/flicker-test/page.web.tsx#L476) | 測試內容 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c2bdfa7ac880<br>[app/debug/flicker-test/page.web.tsx:486:23](../../app/debug/flicker-test/page.web.tsx#L486) | 純文字 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ada2143572f0<br>[app/debug/flicker-test/page.web.tsx:496:23](../../app/debug/flicker-test/page.web.tsx#L496) | 卡片 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-314b8142f11d<br>[app/debug/flicker-test/page.web.tsx:506:23](../../app/debug/flicker-test/page.web.tsx#L506) | 混合 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dffb9a2e298f<br>[app/debug/flicker-test/page.web.tsx:513:79](../../app/debug/flicker-test/page.web.tsx#L513) | 背景顏色 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1289625d93b4<br>[app/debug/flicker-test/page.web.tsx:539:17](../../app/debug/flicker-test/page.web.tsx#L539) | 執行測試 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-213a4334eaa8<br>[app/debug/flicker-test/page.web.tsx:553:15](../../app/debug/flicker-test/page.web.tsx#L553) | 📋 複製 CSS 參數 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-56d15f0193a1<br>[app/debug/flicker-test/page.web.tsx:561:69](../../app/debug/flicker-test/page.web.tsx#L561) | 預覽區域 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bf78a645e0a4<br>[app/debug/flicker-test/page.web.tsx:567:34](../../app/debug/flicker-test/page.web.tsx#L567) | 動畫中 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>isAnimating |
| UI-059e1164a605<br>[app/debug/flicker-test/page.web.tsx:567:42](../../app/debug/flicker-test/page.web.tsx#L567) | 靜止 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>否則 isAnimating |
| UI-4398aca6564c<br>[app/debug/flicker-test/page.web.tsx:585:19](../../app/debug/flicker-test/page.web.tsx#L585) | 💡 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-13d4f9be6cc5<br>[app/debug/flicker-test/page.web.tsx:585:30](../../app/debug/flicker-test/page.web.tsx#L585) | 觀察重點： | **畫面文字** · 直接呈現定義<br>strong：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-61adb93c52a6<br>[app/debug/flicker-test/page.web.tsx:588:23](../../app/debug/flicker-test/page.web.tsx#L588) | • 動畫開始時是否有白屏閃爍？ | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ed9b28e88239<br>[app/debug/flicker-test/page.web.tsx:589:23](../../app/debug/flicker-test/page.web.tsx#L589) | • 內容是否平滑出現？ | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-141f7cd6247d<br>[app/debug/flicker-test/page.web.tsx:590:23](../../app/debug/flicker-test/page.web.tsx#L590) | • 是否有跳動或抖動？ | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dfdde32fac34<br>[app/debug/flicker-test/page.web.tsx:591:23](../../app/debug/flicker-test/page.web.tsx#L591) | • 整體視覺是否流暢？ | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | FlickerTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## app/debug/staff-role-test/page.web.tsx

測試／工具表面（另受建置或頁面 gate 限制）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-1f59042c54de<br>[app/debug/staff-role-test/page.web.tsx:22:29](../../app/debug/staff-role-test/page.web.tsx#L22) | Viewer | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ROLE_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-88b45c54d6f3<br>[app/debug/staff-role-test/page.web.tsx:23:31](../../app/debug/staff-role-test/page.web.tsx#L23) | Operator | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ROLE_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6d4ef7ec52fe<br>[app/debug/staff-role-test/page.web.tsx:24:30](../../app/debug/staff-role-test/page.web.tsx#L24) | Manager | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ROLE_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ef907d5986e8<br>[app/debug/staff-role-test/page.web.tsx:25:28](../../app/debug/staff-role-test/page.web.tsx#L25) | Owner | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ROLE_OPTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b222aadac0af<br>[app/debug/staff-role-test/page.web.tsx:29:12](../../app/debug/staff-role-test/page.web.tsx#L29) | 記錄互動 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6ba1020b6d4d<br>[app/debug/staff-role-test/page.web.tsx:30:12](../../app/debug/staff-role-test/page.web.tsx#L30) | 記錄成交 / 收入 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d74e0e1414d8<br>[app/debug/staff-role-test/page.web.tsx:31:12](../../app/debug/staff-role-test/page.web.tsx#L31) | 編輯成交紀錄 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5ecc096313ea<br>[app/debug/staff-role-test/page.web.tsx:31:50](../../app/debug/staff-role-test/page.web.tsx#L31) | 尚未開放 | **來源候選** · 候選，非已證實提示<br>ACTIONS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ACTIONS · note<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-22ad62401fab<br>[app/debug/staff-role-test/page.web.tsx:32:12](../../app/debug/staff-role-test/page.web.tsx#L32) | 建立 field note | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b87e0da13cc9<br>[app/debug/staff-role-test/page.web.tsx:33:12](../../app/debug/staff-role-test/page.web.tsx#L33) | 管理 field notes | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-849026e955a2<br>[app/debug/staff-role-test/page.web.tsx:34:12](../../app/debug/staff-role-test/page.web.tsx#L34) | 編輯市集基本資料 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a9936215d6ef<br>[app/debug/staff-role-test/page.web.tsx:35:12](../../app/debug/staff-role-test/page.web.tsx#L35) | 編輯商品基本資料 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-455e4a568389<br>[app/debug/staff-role-test/page.web.tsx:36:12](../../app/debug/staff-role-test/page.web.tsx#L36) | 管理 checklist | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-36bfb91862a0<br>[app/debug/staff-role-test/page.web.tsx:37:12](../../app/debug/staff-role-test/page.web.tsx#L37) | 切換 checklist | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-290ad9d1d32c<br>[app/debug/staff-role-test/page.web.tsx:39:12](../../app/debug/staff-role-test/page.web.tsx#L39) | 刪除自己同日紀錄 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-31f05b47a312<br>[app/debug/staff-role-test/page.web.tsx:43:12](../../app/debug/staff-role-test/page.web.tsx#L43) | 刪除別人同日紀錄 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d44605e81c7b<br>[app/debug/staff-role-test/page.web.tsx:46:11](../../app/debug/staff-role-test/page.web.tsx#L46) | manager 同日限定 | **來源候選** · 候選，非已證實提示<br>ACTIONS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ACTIONS · note<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3caa1f20340c<br>[app/debug/staff-role-test/page.web.tsx:48:12](../../app/debug/staff-role-test/page.web.tsx#L48) | 使用修復工具 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2455e5406245<br>[app/debug/staff-role-test/page.web.tsx:49:12](../../app/debug/staff-role-test/page.web.tsx#L49) | 管理員工 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-28067d297602<br>[app/debug/staff-role-test/page.web.tsx:50:12](../../app/debug/staff-role-test/page.web.tsx#L50) | 刪除市集 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACTIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-366642cfe31c<br>[app/debug/staff-role-test/page.web.tsx:68:50](../../app/debug/staff-role-test/page.web.tsx#L68) | Staff Role 測試頁 | **畫面文字** · 直接呈現定義<br>h1：辨識畫面、區塊或對話框主題 | StaffRoleTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5f8bc7b2076d<br>[app/debug/staff-role-test/page.web.tsx:70:13](../../app/debug/staff-role-test/page.web.tsx#L70) | 這個頁面只使用前端 mock，不連 Supabase、不寫 IndexedDB，適合驗收權限規則。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffRoleTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0405c6702b18<br>[app/debug/staff-role-test/page.web.tsx:77:67](../../app/debug/staff-role-test/page.web.tsx#L77) | 切換測試角色 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffRoleTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-92fff43e2470<br>[app/debug/staff-role-test/page.web.tsx:90:18](../../app/debug/staff-role-test/page.web.tsx#L90) | ${option.label} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | StaffRoleTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-39657740c7ca<br>[app/debug/staff-role-test/page.web.tsx:104:67](../../app/debug/staff-role-test/page.web.tsx#L104) | 動作矩陣 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffRoleTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-962c66c56cff<br>[app/debug/staff-role-test/page.web.tsx:114:22](../../app/debug/staff-role-test/page.web.tsx#L114) | ${action.label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | StaffRoleTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-861a00726e6d<br>[app/debug/staff-role-test/page.web.tsx:125:32](../../app/debug/staff-role-test/page.web.tsx#L125) | 允許 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffRoleTestPage<br>allowed |
| UI-07324cc6e63f<br>[app/debug/staff-role-test/page.web.tsx:125:39](../../app/debug/staff-role-test/page.web.tsx#L125) | 禁止 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | StaffRoleTestPage<br>否則 allowed |
| UI-4c3bdafefa7f<br>[app/debug/staff-role-test/page.web.tsx:134:67](../../app/debug/staff-role-test/page.web.tsx#L134) | P5-4e banner 模擬 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StaffRoleTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6dd9a8920d7f<br>[app/debug/staff-role-test/page.web.tsx:141:28](../../app/debug/staff-role-test/page.web.tsx#L141) | 測試：角色從 manager 降為 viewer，正在重新同步可見資料。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | StaffRoleTestPage · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0a9a57cf65c8<br>[app/debug/staff-role-test/page.web.tsx:149:15](../../app/debug/staff-role-test/page.web.tsx#L149) | 模擬降權 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffRoleTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ca818ac0ceb3<br>[app/debug/staff-role-test/page.web.tsx:156:28](../../app/debug/staff-role-test/page.web.tsx#L156) | 測試：本機 staff projection 已清理完成。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | StaffRoleTestPage · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-483225af4523<br>[app/debug/staff-role-test/page.web.tsx:162:15](../../app/debug/staff-role-test/page.web.tsx#L162) | 模擬完成 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffRoleTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1029505763c9<br>[app/debug/staff-role-test/page.web.tsx:169:28](../../app/debug/staff-role-test/page.web.tsx#L169) | 測試：員工關係已解除，寫入操作已鎖住。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | StaffRoleTestPage · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9ee42d0455d5<br>[app/debug/staff-role-test/page.web.tsx:175:15](../../app/debug/staff-role-test/page.web.tsx#L175) | 模擬移除 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | StaffRoleTestPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## app/mobile-runtime-smoke/page.smoke.tsx

測試／工具表面（另受建置或頁面 gate 限制）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-0835ddde9ee2<br>[app/mobile-runtime-smoke/page.smoke.tsx:24:23](../../app/mobile-runtime-smoke/page.smoke.tsx#L24) | Dexie read did not return the written probe. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | runDexieRoundTrip<br>stored?.value !== 'mobile-static-bundle' |
| UI-4f418a4d16ff<br>[app/mobile-runtime-smoke/page.smoke.tsx:29:23](../../app/mobile-runtime-smoke/page.smoke.tsx#L29) | Dexie probe was not deleted. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | runDexieRoundTrip<br>await probes.get('round-trip') |
| UI-c890e4d9c1cb<br>[app/mobile-runtime-smoke/page.smoke.tsx:69:11](../../app/mobile-runtime-smoke/page.smoke.tsx#L69) | Mobile static bundle | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MobileRuntimeSmokePage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-627b36acf0f2<br>[app/mobile-runtime-smoke/page.smoke.tsx:71:69](../../app/mobile-runtime-smoke/page.smoke.tsx#L71) | Runtime smoke verification | **畫面文字** · 直接呈現定義<br>h1：辨識畫面、區塊或對話框主題 | MobileRuntimeSmokePage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7b570666b0f7<br>[app/mobile-runtime-smoke/page.smoke.tsx:73:11](../../app/mobile-runtime-smoke/page.smoke.tsx#L73) | This route exists only in the dedicated runtime-smoke build and is excluded from production Web and mobile artifacts. | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MobileRuntimeSmokePage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-81ec80da2a6e<br>[app/mobile-runtime-smoke/page.smoke.tsx:79:15](../../app/mobile-runtime-smoke/page.smoke.tsx#L79) | Dexie write / read / delete | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | MobileRuntimeSmokePage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4e58f2171df4<br>[app/mobile-runtime-smoke/page.smoke.tsx:81:14](../../app/mobile-runtime-smoke/page.smoke.tsx#L81) | ${dexieStatus} | **動態文字入口** · 執行時綁定入口<br>dd 接收執行時文字；內容需追查所列綁定與生產端 | MobileRuntimeSmokePage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bca894ccd8ec<br>[app/mobile-runtime-smoke/page.smoke.tsx:85:15](../../app/mobile-runtime-smoke/page.smoke.tsx#L85) | Supabase browser SDK / CORS | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | MobileRuntimeSmokePage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a550dd8a95c0<br>[app/mobile-runtime-smoke/page.smoke.tsx:87:14](../../app/mobile-runtime-smoke/page.smoke.tsx#L87) | ${supabaseStatus} | **動態文字入口** · 執行時綁定入口<br>dd 接收執行時文字；內容需追查所列綁定與生產端 | MobileRuntimeSmokePage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2ab195fe10dc<br>[app/mobile-runtime-smoke/page.smoke.tsx:93:9](../../app/mobile-runtime-smoke/page.smoke.tsx#L93) | Use the real bottom navigation below to verify a client-side route transition. | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MobileRuntimeSmokePage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## app/recovery/page.tsx

測試／工具表面（另受建置或頁面 gate 限制）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-82698c9038cb<br>[app/recovery/page.tsx:31:13](../../app/recovery/page.tsx#L31) | 返回資料與救援 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | RecoveryPage<br>isRoleLoading |
| UI-00727c7da4a8<br>[app/recovery/page.tsx:34:13](../../app/recovery/page.tsx#L34) | 正在確認修復工具權限... | **畫面文字** · 直接呈現定義<br>section：呈現操作說明、資料標籤、狀態或注意事項 | RecoveryPage<br>isRoleLoading |
| UI-3e43fd77c39e<br>[app/recovery/page.tsx:50:13](../../app/recovery/page.tsx#L50) | 返回資料與救援 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | RecoveryPage<br>!canUseRepairTools |
| UI-35701c66584d<br>[app/recovery/page.tsx:55:53](../../app/recovery/page.tsx#L55) | 只有工作區擁有者可以使用修復工具 | **畫面文字** · 直接呈現定義<br>h1：辨識畫面、區塊或對話框主題 | RecoveryPage<br>!canUseRepairTools |
| UI-c8337181b10a<br>[app/recovery/page.tsx:58:15](../../app/recovery/page.tsx#L58) | 這些操作可能重建裝置上的統計或修補收入資料。為避免使用不完整的資料進行修復，團隊成員不會載入這個頁面。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RecoveryPage<br>!canUseRepairTools |
| UI-b11d76663958<br>[app/recovery/page.tsx:76:15](../../app/recovery/page.tsx#L76) | 返回資料與救援 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | RecoveryPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8675e2b63ef4<br>[app/recovery/page.tsx:83:72](../../app/recovery/page.tsx#L83) | 資料修復 | **畫面文字** · 直接呈現定義<br>h1：辨識畫面、區塊或對話框主題 | RecoveryPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1dd05777e6d8<br>[app/recovery/page.tsx:85:19](../../app/recovery/page.tsx#L85) | 這裡只處理本機資料健康、收入同步落差與統計投影異常。執行修復前會先提供預覽或備份，避免誤改資料。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RecoveryPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d670e58fc445<br>[app/recovery/page.tsx:98:13](../../app/recovery/page.tsx#L98) | 進階診斷 | **畫面文字** · 直接呈現定義<br>summary：辨識可點擊操作、導覽或展開入口 | RecoveryPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-91a3d73474c2<br>[app/recovery/page.tsx:101:13](../../app/recovery/page.tsx#L101) | 僅在一般檢查無法排除問題，或依客服指示時使用以下工具。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RecoveryPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-98927f75288a<br>[app/recovery/page.tsx:111:72](../../app/recovery/page.tsx#L111) | 使用建議 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | RecoveryPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-82a3d9be996c<br>[app/recovery/page.tsx:113:17](../../app/recovery/page.tsx#L113) | 先按「檢查」確認這台裝置的資料狀態；只有檢查顯示異常時才執行修復。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | RecoveryPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b2d619a6fda0<br>[app/recovery/page.tsx:114:17](../../app/recovery/page.tsx#L114) | 若新裝置或無痕登入後收入為 0 或與雲端不一致，先使用「收入差距修復」。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | RecoveryPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d61c7e52fd17<br>[app/recovery/page.tsx:115:17](../../app/recovery/page.tsx#L115) | 若收入數字重複增加，請展開「進階診斷」並依檢查結果修復統計。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | RecoveryPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0890b1cf8240<br>[app/recovery/page.tsx:116:17](../../app/recovery/page.tsx#L116) | 修復完成後重新整理頁面，再檢查市集詳情與分析頁的數字是否一致。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | RecoveryPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## app/settings/data/page.tsx

測試／工具表面（另受建置或頁面 gate 限制）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-fd4ccf581afb<br>[app/settings/data/page.tsx:24:9](../../app/settings/data/page.tsx#L24) | 正在載入資料檢查工具... | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | loading · loading<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-127fc58f9d4e<br>[app/settings/data/page.tsx:49:23](../../app/settings/data/page.tsx#L49) | 偵測到新的未同步資料，已停止清除。請重新確認目前狀態。 | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | confirmClearLocal<br>!cleared |
| UI-ba658ed28bd7<br>[app/settings/data/page.tsx:54:21](../../app/settings/data/page.tsx#L54) | 這台裝置的本機資料已清除 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | confirmClearLocal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7ab64238e9d9<br>[app/settings/data/page.tsx:58:19](../../app/settings/data/page.tsx#L58) | 清除失敗，請稍後再試 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | confirmClearLocal<br>catch：操作拋出例外 |
| UI-6e67ad7436ba<br>[app/settings/data/page.tsx:64:13](../../app/settings/data/page.tsx#L64) | 資料與救援 | **畫面文字** · 直接呈現定義<br>SettingsPageShell：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-af14d9a3362a<br>[app/settings/data/page.tsx:65:19](../../app/settings/data/page.tsx#L65) | 先檢查與修復資料；只有確定要重新開始時，才使用頁面最下方的清除操作。 | **畫面文字** · 直接呈現定義<br>SettingsPageShell：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-da514d3b9b36<br>[app/settings/data/page.tsx:71:26](../../app/settings/data/page.tsx#L71) | 正在確認資料權限 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage · title<br>isLoading |
| UI-fe3349ac9128<br>[app/settings/data/page.tsx:71:49](../../app/settings/data/page.tsx#L71) | 修復與清除工具只會提供給老闆帳號。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage · description<br>isLoading |
| UI-cda75389dd72<br>[app/settings/data/page.tsx:75:17](../../app/settings/data/page.tsx#L75) | 資料工具僅限老闆使用 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage · title<br>否則 isLoading → !isOwner |
| UI-a6af28c1a2e6<br>[app/settings/data/page.tsx:76:23](../../app/settings/data/page.tsx#L76) | 員工資料由所屬團隊管理，避免從局部資料範圍執行錯誤修復。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage · description<br>否則 isLoading → !isOwner |
| UI-19a88e64c307<br>[app/settings/data/page.tsx:81:107](../../app/settings/data/page.tsx#L81) | 檢查與修復 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | DataSettingsPage<br>否則 isLoading → 否則 !isOwner |
| UI-22614c7bd1ea<br>[app/settings/data/page.tsx:90:79](../../app/settings/data/page.tsx#L90) | 資料修復與救援備份 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage<br>否則 isLoading → 否則 !isOwner |
| UI-ce8640ac1099<br>[app/settings/data/page.tsx:91:88](../../app/settings/data/page.tsx#L91) | 檢查本機完整性、收入差距與統計投影。 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage<br>否則 isLoading → 否則 !isOwner |
| UI-610f3b9e98cc<br>[app/settings/data/page.tsx:101:90](../../app/settings/data/page.tsx#L101) | 清除資料 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | DataSettingsPage<br>否則 isLoading → 否則 !isOwner |
| UI-98cf7628b184<br>[app/settings/data/page.tsx:102:75](../../app/settings/data/page.tsx#L102) | 以下操作可能造成資料遺失，系統會在執行前再次確認。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage<br>否則 isLoading → 否則 !isOwner |
| UI-ade49b76810d<br>[app/settings/data/page.tsx:110:75](../../app/settings/data/page.tsx#L110) | 只清除這台裝置 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | DataSettingsPage<br>否則 isLoading → 否則 !isOwner |
| UI-e14ce3d58636<br>[app/settings/data/page.tsx:111:81](../../app/settings/data/page.tsx#L111) | 已同步資料可從雲端重新下載；未同步內容會永久遺失。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage<br>否則 isLoading → 否則 !isOwner |
| UI-2544586fc5c9<br>[app/settings/data/page.tsx:113:23](../../app/settings/data/page.tsx#L113) | 清除本機資料 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | DataSettingsPage<br>否則 isLoading → 否則 !isOwner |
| UI-8c989c8aaeac<br>[app/settings/data/page.tsx:123:71](../../app/settings/data/page.tsx#L123) | 刪除 Féria 帳號 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | DataSettingsPage<br>否則 isLoading → 否則 !isOwner |
| UI-54e8373159b3<br>[app/settings/data/page.tsx:125:23](../../app/settings/data/page.tsx#L125) | 安全刪除流程仍在驗證中。舊的雲端資料清除功能不等同帳號刪除，因此已停止從此頁執行。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage<br>否則 isLoading → 否則 !isOwner |
| UI-570805bf44b4<br>[app/settings/data/page.tsx:132:23](../../app/settings/data/page.tsx#L132) | 帳號刪除尚未啟用 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | DataSettingsPage<br>否則 isLoading → 否則 !isOwner |
| UI-707d6d8f4616<br>[app/settings/data/page.tsx:146:15](../../app/settings/data/page.tsx#L146) | 清除這台裝置的資料？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f222d5ab4af4<br>[app/settings/data/page.tsx:148:13](../../app/settings/data/page.tsx#L148) | 偵測到 ${localPendingReport.pendingEventCount} 筆未同步事件、${localPendingReport.unfinishedSyncQueueCount} 筆同步工作，以及 ${localPendingReport.pendingSalesPhotoEvidenceCreationCount + localPendingReport.pendingSalesPhotoEvidencePayloadCount} 筆待處理照片。清除後，尚未送達雲端的內容將無法復原。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage · description<br>localPendingReport?.isClean === false |
| UI-0cb416f39c6d<br>[app/settings/data/page.tsx:149:13](../../app/settings/data/page.tsx#L149) | 這會清除這台裝置上的市集、商品、統計與快取。已同步資料可在重新登入後從雲端取回。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage · description<br>否則 localPendingReport?.isClean === false |
| UI-cb8cc75b2ecd<br>[app/settings/data/page.tsx:150:22](../../app/settings/data/page.tsx#L150) | 清除本機資料 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e0cefe884d4c<br>[app/settings/data/page.tsx:152:67](../../app/settings/data/page.tsx#L152) | 清除本機 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | DataSettingsPage · confirmationText<br>localPendingReport?.isClean === false |

## app/tools/market-text-import-lab/page.tsx

測試／工具表面（另受建置或頁面 gate 限制）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-2b9832feb9d9<br>[app/tools/market-text-import-lab/page.tsx:17:17](../../app/tools/market-text-import-lab/page.tsx#L17) | 正在確認實驗室存取權限 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | MarketTextImportLabPage · title<br>!roleRefreshState.isAuthorizationFresh |
| UI-4a6f66990383<br>[app/tools/market-text-import-lab/page.tsx:18:23](../../app/tools/market-text-import-lab/page.tsx#L18) | 權限確認完成前，不會顯示解析或審核內容。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | MarketTextImportLabPage · description<br>!roleRefreshState.isAuthorizationFresh |
| UI-4931f5ede53c<br>[app/tools/market-text-import-lab/page.tsx:30:17](../../app/tools/market-text-import-lab/page.tsx#L30) | 這個實驗室僅限 owner 使用 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | MarketTextImportLabPage · title<br>!isOwner |
| UI-e722dcbadd36<br>[app/tools/market-text-import-lab/page.tsx:31:23](../../app/tools/market-text-import-lab/page.tsx#L31) | 它用於審核解析結果與建立規則改進線索，不會影響現有市集資料。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | MarketTextImportLabPage · description<br>!isOwner |

## components/dev/ThemeLab.tsx

測試／工具表面（另受建置或頁面 gate 限制）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-95ec30353dd0<br>[components/dev/ThemeLab.tsx:69:23](../../components/dev/ThemeLab.tsx#L69) | ${definition.label}選色器 | **輔助辨識** · 直接呈現定義<br>提供 input 的讀屏名稱、圖片替代文字或滑入說明 | ColorField · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5bdd9ec1ca9a<br>[components/dev/ThemeLab.tsx:75:14](../../components/dev/ThemeLab.tsx#L75) | ${definition.label} | **動態文字入口** · 執行時綁定入口<br>label 接收執行時文字；內容需追查所列綁定與生產端 | ColorField<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a4a9cb497a24<br>[components/dev/ThemeLab.tsx:89:27](../../components/dev/ThemeLab.tsx#L89) | ${definition.label} HEX 色碼 | **輔助辨識** · 直接呈現定義<br>提供 input 的讀屏名稱、圖片替代文字或滑入說明 | ColorField · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c7a714e588f8<br>[components/dev/ThemeLab.tsx:93:66](../../components/dev/ThemeLab.tsx#L93) | ${definition.description} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | ColorField<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-08dc75268899<br>[components/dev/ThemeLab.tsx:115:14](../../components/dev/ThemeLab.tsx#L115) | primary | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | PresetCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e783c26bc9e3<br>[components/dev/ThemeLab.tsx:115:25](../../components/dev/ThemeLab.tsx#L115) | secondary | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | PresetCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-244037170bb4<br>[components/dev/ThemeLab.tsx:115:38](../../components/dev/ThemeLab.tsx#L115) | softPink | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | PresetCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9be589786978<br>[components/dev/ThemeLab.tsx:115:50](../../components/dev/ThemeLab.tsx#L115) | softGreen | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | PresetCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d04e9a27bfcd<br>[components/dev/ThemeLab.tsx:120:63](../../components/dev/ThemeLab.tsx#L120) | ${preset.name} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | PresetCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-71a0e6252cf6<br>[components/dev/ThemeLab.tsx:121:89](../../components/dev/ThemeLab.tsx#L121) | ${preset.description} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | PresetCard<br>preset.description |
| UI-837a2f257314<br>[components/dev/ThemeLab.tsx:127:25](../../components/dev/ThemeLab.tsx#L127) | 刪除配色 ${preset.name} | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | PresetCard · aria-label<br>custom &amp;&amp; onDelete |
| UI-396a8fb59d7f<br>[components/dev/ThemeLab.tsx:135:9](../../components/dev/ThemeLab.tsx#L135) | 套用這組配色 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | PresetCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8c061eec5c54<br>[components/dev/ThemeLab.tsx:151:75](../../components/dev/ThemeLab.tsx#L151) | ${label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | ContrastRow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-99cf7712e4da<br>[components/dev/ThemeLab.tsx:154:27](../../components/dev/ThemeLab.tsx#L154) | :1 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ContrastRow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9fc12c08e767<br>[components/dev/ThemeLab.tsx:188:66](../../components/dev/ThemeLab.tsx#L188) | Féria 自訂配色 | **來源候選** · 候選，非已證實提示<br>exportPayload 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | exportPayload<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7b82ce4c34f2<br>[components/dev/ThemeLab.tsx:193:18](../../components/dev/ThemeLab.tsx#L193) | 已複製配色 JSON | **狀態設定** · 文案生產端，須查使用端<br>setMessage：更新畫面訊息；仍須依呼叫端確認是否被渲染 | copyJson<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-647cefd9ae71<br>[components/dev/ThemeLab.tsx:195:18](../../components/dev/ThemeLab.tsx#L195) | 無法使用剪貼簿，請改用下載 JSON | **狀態設定** · 文案生產端，須查使用端<br>setMessage：更新畫面訊息；仍須依呼叫端確認是否被渲染 | copyJson<br>catch：操作拋出例外 |
| UI-81e116c08553<br>[components/dev/ThemeLab.tsx:207:16](../../components/dev/ThemeLab.tsx#L207) | 已匯出配色檔 | **狀態設定** · 文案生產端，須查使用端<br>setMessage：更新畫面訊息；仍須依呼叫端確認是否被渲染 | downloadJson<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7c51a3dc8c81<br>[components/dev/ThemeLab.tsx:218:18](../../components/dev/ThemeLab.tsx#L218) | 已匯入「${imported.name}」 | **狀態設定** · 文案生產端，須查使用端<br>setMessage：更新畫面訊息；仍須依呼叫端確認是否被渲染 | importJson<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5b81d069fc5f<br>[components/dev/ThemeLab.tsx:220:59](../../components/dev/ThemeLab.tsx#L220) | 無法讀取配色檔 | **狀態設定** · 文案生產端，須查使用端<br>setMessage：更新畫面訊息；仍須依呼叫端確認是否被渲染 | importJson<br>catch：操作拋出例外 → 否則 error instanceof Error |
| UI-831300f13f5c<br>[components/dev/ThemeLab.tsx:227:18](../../components/dev/ThemeLab.tsx#L227) | 請先輸入配色名稱 | **狀態設定** · 文案生產端，須查使用端<br>setMessage：更新畫面訊息；仍須依呼叫端確認是否被渲染 | savePreset<br>!normalizedName |
| UI-993017b4df4c<br>[components/dev/ThemeLab.tsx:231:18](../../components/dev/ThemeLab.tsx#L231) | 目前配色有未通過 AA 的文字組合，請調整後再儲存 | **狀態設定** · 文案生產端，須查使用端<br>setMessage：更新畫面訊息；仍須依呼叫端確認是否被渲染 | savePreset<br>!paletteIsAccessible |
| UI-5c426e040b36<br>[components/dev/ThemeLab.tsx:236:16](../../components/dev/ThemeLab.tsx#L236) | 已儲存在這台裝置 | **狀態設定** · 文案生產端，須查使用端<br>setMessage：更新畫面訊息；仍須依呼叫端確認是否被渲染 | savePreset<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c6a9c88b76dd<br>[components/dev/ThemeLab.tsx:243:13](../../components/dev/ThemeLab.tsx#L243) | 主題實驗室 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4eed0d25c1f1<br>[components/dev/ThemeLab.tsx:244:20](../../components/dev/ThemeLab.tsx#L244) | 個人配色，只存在這台裝置，不會同步到帳號。${hasOverrides ? '目前已套用本機配色。' : ''} | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c91b544d8bee<br>[components/dev/ThemeLab.tsx:244:59](../../components/dev/ThemeLab.tsx#L244) | 目前已套用本機配色。 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab · description<br>hasOverrides |
| UI-0fa1c46b2b1a<br>[components/dev/ThemeLab.tsx:257:81](../../components/dev/ThemeLab.tsx#L257) | LIVE PREVIEW | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0bcd65075580<br>[components/dev/ThemeLab.tsx:258:59](../../components/dev/ThemeLab.tsx#L258) | 今天也一起，把市集過得從容。 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b4d10b863d21<br>[components/dev/ThemeLab.tsx:259:77](../../components/dev/ThemeLab.tsx#L259) | 頁首、卡片、文字與柔色會在整個 App 立即更新。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9079d1fa2465<br>[components/dev/ThemeLab.tsx:263:92](../../components/dev/ThemeLab.tsx#L263) | 暖暖市集 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1e4d7c2bfe4d<br>[components/dev/ThemeLab.tsx:264:92](../../components/dev/ThemeLab.tsx#L264) | 本週六 · 11:00 開始 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b7584c7108c0<br>[components/dev/ThemeLab.tsx:267:24](../../components/dev/ThemeLab.tsx#L267) | softPink | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-79730f652edf<br>[components/dev/ThemeLab.tsx:267:36](../../components/dev/ThemeLab.tsx#L267) | softGreen | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e61a329f2799<br>[components/dev/ThemeLab.tsx:267:49](../../components/dev/ThemeLab.tsx#L267) | info | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d3184e8bc654<br>[components/dev/ThemeLab.tsx:267:57](../../components/dev/ThemeLab.tsx#L267) | danger | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-eaaa5b4a820c<br>[components/dev/ThemeLab.tsx:276:25](../../components/dev/ThemeLab.tsx#L276) | 進階調整 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6e2d8ff3ad26<br>[components/dev/ThemeLab.tsx:277:89](../../components/dev/ThemeLab.tsx#L277) | 展開 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-22de1919c5fc<br>[components/dev/ThemeLab.tsx:278:96](../../components/dev/ThemeLab.tsx#L278) | 收合 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b64fd1a36a14<br>[components/dev/ThemeLab.tsx:283:94](../../components/dev/ThemeLab.tsx#L283) | 核心色彩 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c020122f08ca<br>[components/dev/ThemeLab.tsx:284:65](../../components/dev/ThemeLab.tsx#L284) | 輸入六位 HEX 色碼，或使用左側選色器。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a11bf64f2e81<br>[components/dev/ThemeLab.tsx:288:23](../../components/dev/ThemeLab.tsx#L288) | 恢復專案預設 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-97b313984514<br>[components/dev/ThemeLab.tsx:307:65](../../components/dev/ThemeLab.tsx#L307) | 儲存目前組合 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4c564e9a23fb<br>[components/dev/ThemeLab.tsx:308:69](../../components/dev/ThemeLab.tsx#L308) | 保留多組方案，方便來回比較。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e0c62cb3eed1<br>[components/dev/ThemeLab.tsx:312:21](../../components/dev/ThemeLab.tsx#L312) | 請先修正未通過 AA 的文字組合，再儲存這組配色。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>!paletteIsAccessible |
| UI-575ad817e723<br>[components/dev/ThemeLab.tsx:320:33](../../components/dev/ThemeLab.tsx#L320) | 例如：秋日市集 A | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | ThemeLab · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6c73b4a8d468<br>[components/dev/ThemeLab.tsx:321:32](../../components/dev/ThemeLab.tsx#L321) | 自訂配色名稱 | **輔助辨識** · 直接呈現定義<br>提供 input 的讀屏名稱、圖片替代文字或滑入說明 | ThemeLab · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-efd48df29f12<br>[components/dev/ThemeLab.tsx:332:21](../../components/dev/ThemeLab.tsx#L332) | 儲存 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ea2fee9ab54e<br>[components/dev/ThemeLab.tsx:339:87](../../components/dev/ThemeLab.tsx#L339) | 文字對比檢查 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fd126457163a<br>[components/dev/ThemeLab.tsx:340:77](../../components/dev/ThemeLab.tsx#L340) | AA ≥ 4.5:1 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cd3bc9ec33e0<br>[components/dev/ThemeLab.tsx:344:56](../../components/dev/ThemeLab.tsx#L344) | ${check.label} | **動態文字入口** · 執行時綁定入口<br>ContrastRow 接收執行時文字；內容需追查所列綁定與生產端 | ThemeLab · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f78cc31329b2<br>[components/dev/ThemeLab.tsx:349:19](../../components/dev/ThemeLab.tsx#L349) | 低於標準仍可自由預覽，但不能儲存為配色；關閉後會回復最近一次通過檢查的配色。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8454eda92db4<br>[components/dev/ThemeLab.tsx:354:83](../../components/dev/ThemeLab.tsx#L354) | 內建靈感 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-44a17873ba7c<br>[components/dev/ThemeLab.tsx:364:91](../../components/dev/ThemeLab.tsx#L364) | 我的配色 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | ThemeLab<br>customPresets.length &gt; 0 |
| UI-b93ee489ea7c<br>[components/dev/ThemeLab.tsx:380:65](../../components/dev/ThemeLab.tsx#L380) | 匯入與匯出 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-24e730e3441e<br>[components/dev/ThemeLab.tsx:381:69](../../components/dev/ThemeLab.tsx#L381) | JSON 可留存、分享或交給開發者轉成正式色票。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c3a0241c213c<br>[components/dev/ThemeLab.tsx:386:21](../../components/dev/ThemeLab.tsx#L386) | 匯入 JSON | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d99ade30d29a<br>[components/dev/ThemeLab.tsx:390:21](../../components/dev/ThemeLab.tsx#L390) | 下載 JSON | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ab03599464b7<br>[components/dev/ThemeLab.tsx:394:21](../../components/dev/ThemeLab.tsx#L394) | 複製 JSON | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ThemeLab<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f84f3f2a7e1e<br>[components/dev/ThemeLab.tsx:405:14](../../components/dev/ThemeLab.tsx#L405) | ${message} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | ThemeLab<br>message |

## components/examples/DataSanitizationExample.tsx

測試／工具表面（另受建置或頁面 gate 限制）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-4d5fb3ee85ee<br>[components/examples/DataSanitizationExample.tsx:25:22](../../components/examples/DataSanitizationExample.tsx#L25) | 商品 A | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | products · name<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0fa60ddd7afe<br>[components/examples/DataSanitizationExample.tsx:26:22](../../components/examples/DataSanitizationExample.tsx#L26) | 商品 B | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | products · name<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9b074b33dfe9<br>[components/examples/DataSanitizationExample.tsx:38:13](../../components/examples/DataSanitizationExample.tsx#L38) | 🔒 員工模式：成本與利潤資訊已隱藏 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ProductListExample<br>isDataSanitized |
| UI-b5872d2ffbd4<br>[components/examples/DataSanitizationExample.tsx:47:57](../../components/examples/DataSanitizationExample.tsx#L47) | ${product.name} | **動態文字入口** · 執行時綁定入口<br>h3 接收執行時文字；內容需追查所列綁定與生產端 | ProductListExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4435531bb723<br>[components/examples/DataSanitizationExample.tsx:50:49](../../components/examples/DataSanitizationExample.tsx#L50) | 售價： | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductListExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2028dcec7f91<br>[components/examples/DataSanitizationExample.tsx:51:47](../../components/examples/DataSanitizationExample.tsx#L51) | $${product.price} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductListExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dbc5d378c871<br>[components/examples/DataSanitizationExample.tsx:58:53](../../components/examples/DataSanitizationExample.tsx#L58) | 成本： | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductListExample<br>canViewSensitiveData(userRole) |
| UI-cdfb44b985bc<br>[components/examples/DataSanitizationExample.tsx:59:51](../../components/examples/DataSanitizationExample.tsx#L59) | $${product.cost} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductListExample<br>canViewSensitiveData(userRole) |
| UI-62202319b8b8<br>[components/examples/DataSanitizationExample.tsx:62:53](../../components/examples/DataSanitizationExample.tsx#L62) | 利潤率： | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductListExample<br>canViewSensitiveData(userRole) |
| UI-565e722f6c3f<br>[components/examples/DataSanitizationExample.tsx:64:65](../../components/examples/DataSanitizationExample.tsx#L64) | ${(product.profit_margin * 100).toFixed(1)}% | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductListExample<br>canViewSensitiveData(userRole) |
| UI-c4cf8373e27d<br>[components/examples/DataSanitizationExample.tsx:72:49](../../components/examples/DataSanitizationExample.tsx#L72) | 成本： | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProductListExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bbd6889b1354<br>[components/examples/DataSanitizationExample.tsx:103:53](../../components/examples/DataSanitizationExample.tsx#L103) | 總收入 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StatsExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3a0eba216d3e<br>[components/examples/DataSanitizationExample.tsx:105:13](../../components/examples/DataSanitizationExample.tsx#L105) | $${stats.total_revenue.toLocaleString()} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StatsExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-af170f44b3ba<br>[components/examples/DataSanitizationExample.tsx:111:53](../../components/examples/DataSanitizationExample.tsx#L111) | 銷售數量 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StatsExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d73fb6b66174<br>[components/examples/DataSanitizationExample.tsx:121:57](../../components/examples/DataSanitizationExample.tsx#L121) | 總成本 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StatsExample<br>canViewSensitiveData(userRole) |
| UI-00fde7e35611<br>[components/examples/DataSanitizationExample.tsx:123:17](../../components/examples/DataSanitizationExample.tsx#L123) | $${stats.total_cost.toLocaleString()} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StatsExample<br>canViewSensitiveData(userRole) |
| UI-d2318291c2a8<br>[components/examples/DataSanitizationExample.tsx:128:57](../../components/examples/DataSanitizationExample.tsx#L128) | 淨利潤 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StatsExample<br>canViewSensitiveData(userRole) |
| UI-cf744205ec55<br>[components/examples/DataSanitizationExample.tsx:130:17](../../components/examples/DataSanitizationExample.tsx#L130) | $${stats.net_profit.toLocaleString()} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | StatsExample<br>canViewSensitiveData(userRole) |

## components/examples/FormAutoSaveExample.tsx

測試／工具表面（另受建置或頁面 gate 限制）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-b10958cefcfa<br>[components/examples/FormAutoSaveExample.tsx:43:9](../../components/examples/FormAutoSaveExample.tsx#L43) | 偵測到未完成的表單，是否要恢復？ | **確認／通知** · 直接呈現定義<br>window.confirm：提示操作結果、進度或要求使用者確認 | shouldRestore<br>hasSavedData &amp;&amp; savedData |
| UI-15903ccf3ec0<br>[components/examples/FormAutoSaveExample.tsx:48:23](../../components/examples/FormAutoSaveExample.tsx#L48) | 表單資料已恢復 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | AddProductFormExample<br>hasSavedData &amp;&amp; savedData → shouldRestore |
| UI-df7b5a2e2fdc<br>[components/examples/FormAutoSaveExample.tsx:58:21](../../components/examples/FormAutoSaveExample.tsx#L58) | 已恢復 ${event.detail.count} 個表單的資料 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleFormRestored<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-95fe56a04b5d<br>[components/examples/FormAutoSaveExample.tsx:85:19](../../components/examples/FormAutoSaveExample.tsx#L85) | 產品已新增 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSubmit<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c56ce3d2810b<br>[components/examples/FormAutoSaveExample.tsx:94:13](../../components/examples/FormAutoSaveExample.tsx#L94) | 💾 偵測到未完成的表單 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AddProductFormExample<br>hasSavedData |
| UI-677feb84c06e<br>[components/examples/FormAutoSaveExample.tsx:100:31](../../components/examples/FormAutoSaveExample.tsx#L100) | 表單資料已恢復 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | AddProductFormExample · onClick<br>savedData |
| UI-97f4422eebb0<br>[components/examples/FormAutoSaveExample.tsx:105:13](../../components/examples/FormAutoSaveExample.tsx#L105) | 點擊恢復 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AddProductFormExample<br>hasSavedData |
| UI-8f8e311bfd01<br>[components/examples/FormAutoSaveExample.tsx:114:13](../../components/examples/FormAutoSaveExample.tsx#L114) | 產品名稱 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | AddProductFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a3648996f149<br>[components/examples/FormAutoSaveExample.tsx:121:25](../../components/examples/FormAutoSaveExample.tsx#L121) | 請輸入產品名稱 | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | AddProductFormExample · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-976df3849de3<br>[components/examples/FormAutoSaveExample.tsx:128:13](../../components/examples/FormAutoSaveExample.tsx#L128) | 售價 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | AddProductFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6a914ce1f52a<br>[components/examples/FormAutoSaveExample.tsx:135:25](../../components/examples/FormAutoSaveExample.tsx#L135) | 0 | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | AddProductFormExample · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8fc2d308c05d<br>[components/examples/FormAutoSaveExample.tsx:142:13](../../components/examples/FormAutoSaveExample.tsx#L142) | 成本 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | AddProductFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-38534c63d27e<br>[components/examples/FormAutoSaveExample.tsx:149:25](../../components/examples/FormAutoSaveExample.tsx#L149) | 0 | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | AddProductFormExample · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1193a3cf1088<br>[components/examples/FormAutoSaveExample.tsx:156:13](../../components/examples/FormAutoSaveExample.tsx#L156) | 描述 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | AddProductFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5353dc07e827<br>[components/examples/FormAutoSaveExample.tsx:162:25](../../components/examples/FormAutoSaveExample.tsx#L162) | 請輸入產品描述 | **輸入提示** · 直接呈現定義<br>在 textarea 提供輸入格式、範例或選擇提示 | AddProductFormExample · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3ab388abea1f<br>[components/examples/FormAutoSaveExample.tsx:173:13](../../components/examples/FormAutoSaveExample.tsx#L173) | 新增產品 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AddProductFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-34d413c9ffff<br>[components/examples/FormAutoSaveExample.tsx:189:13](../../components/examples/FormAutoSaveExample.tsx#L189) | 清除 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AddProductFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-17ece547a667<br>[components/examples/FormAutoSaveExample.tsx:197:11](../../components/examples/FormAutoSaveExample.tsx#L197) | 💡 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AddProductFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bace34a9498b<br>[components/examples/FormAutoSaveExample.tsx:197:22](../../components/examples/FormAutoSaveExample.tsx#L197) | 自動暫存： | **畫面文字** · 直接呈現定義<br>strong：呈現操作說明、資料標籤、狀態或注意事項 | AddProductFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-24a990564c69<br>[components/examples/FormAutoSaveExample.tsx:197:36](../../components/examples/FormAutoSaveExample.tsx#L197) | 您的表單資料會自動保存。 即使 Session 過期或意外關閉頁面，資料也不會丟失。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AddProductFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ed445a1d57eb<br>[components/examples/FormAutoSaveExample.tsx:230:18](../../components/examples/FormAutoSaveExample.tsx#L230) | 已恢復未完成的交易 | **確認／通知** · 直接呈現定義<br>toast.info：提示操作結果、進度或要求使用者確認 | QuickDealFormExample<br>hasSavedData &amp;&amp; savedData |
| UI-77b0f17025e1<br>[components/examples/FormAutoSaveExample.tsx:244:19](../../components/examples/FormAutoSaveExample.tsx#L244) | 交易已記錄 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSubmit<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4a93d7ce816b<br>[components/examples/FormAutoSaveExample.tsx:252:13](../../components/examples/FormAutoSaveExample.tsx#L252) | 產品 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | QuickDealFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e5b255dfe6bd<br>[components/examples/FormAutoSaveExample.tsx:259:30](../../components/examples/FormAutoSaveExample.tsx#L259) | 請選擇產品 | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | QuickDealFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-77792e5216af<br>[components/examples/FormAutoSaveExample.tsx:260:31](../../components/examples/FormAutoSaveExample.tsx#L260) | 產品 A | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | QuickDealFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-434a34ff03d4<br>[components/examples/FormAutoSaveExample.tsx:261:31](../../components/examples/FormAutoSaveExample.tsx#L261) | 產品 B | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | QuickDealFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-001ecb63a7d6<br>[components/examples/FormAutoSaveExample.tsx:267:13](../../components/examples/FormAutoSaveExample.tsx#L267) | 數量 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | QuickDealFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-65980e6098ae<br>[components/examples/FormAutoSaveExample.tsx:274:25](../../components/examples/FormAutoSaveExample.tsx#L274) | 0 | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | QuickDealFormExample · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-440770a3394b<br>[components/examples/FormAutoSaveExample.tsx:280:13](../../components/examples/FormAutoSaveExample.tsx#L280) | 金額 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | QuickDealFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3429bf0eca6e<br>[components/examples/FormAutoSaveExample.tsx:287:25](../../components/examples/FormAutoSaveExample.tsx#L287) | 0 | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | QuickDealFormExample · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ddb3fdac2a65<br>[components/examples/FormAutoSaveExample.tsx:295:11](../../components/examples/FormAutoSaveExample.tsx#L295) | 記錄交易 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | QuickDealFormExample<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/deployment/web-release-smoke.ts

測試／工具表面（另受建置或頁面 gate 限制）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-cf8cd2e53451<br>[lib/deployment/web-release-smoke.ts:52:56](../../lib/deployment/web-release-smoke.ts#L52) | argument_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>WebReleaseSmokeValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | requireHttpsOrigin<br>!value |
| UI-7cc78221c544<br>[lib/deployment/web-release-smoke.ts:57:46](../../lib/deployment/web-release-smoke.ts#L57) | argument_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>WebReleaseSmokeValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | requireHttpsOrigin<br>catch：操作拋出例外 |
| UI-807367190034<br>[lib/deployment/web-release-smoke.ts:67:46](../../lib/deployment/web-release-smoke.ts#L67) | argument_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>WebReleaseSmokeValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | requireHttpsOrigin<br>parsed.protocol !== 'https:' &#124;&#124; parsed.username &#124;&#124; parsed.password &#124;&#124; parsed.pathname !== '/' &#124;&#124; parsed.search &#124;&#124; parsed.hash |
| UI-f8555f0be823<br>[lib/deployment/web-release-smoke.ts:74:46](../../lib/deployment/web-release-smoke.ts#L74) | argument_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>WebReleaseSmokeValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | requireCommitSha<br>!value &#124;&#124; !/^[0-9a-f]{7,40}$/i.test(value) |
| UI-6a89e4baabc6<br>[lib/deployment/web-release-smoke.ts:81:46](../../lib/deployment/web-release-smoke.ts#L81) | argument_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>WebReleaseSmokeValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | requireLegalMode<br>value !== 'draft' &amp;&amp; value !== 'published' |
| UI-328d1138ffcc<br>[lib/deployment/web-release-smoke.ts:87:67](../../lib/deployment/web-release-smoke.ts#L87) | argument_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>WebReleaseSmokeValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseWebReleaseSmokeOptions<br>args.length !== 3 |
| UI-52fd1ceae74b<br>[lib/deployment/web-release-smoke.ts:92:48](../../lib/deployment/web-release-smoke.ts#L92) | argument_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>WebReleaseSmokeValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseWebReleaseSmokeOptions<br>!argument.startsWith('--') &#124;&#124; separator &lt;= 2 |
| UI-1b13ef992500<br>[lib/deployment/web-release-smoke.ts:97:48](../../lib/deployment/web-release-smoke.ts#L97) | argument_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>WebReleaseSmokeValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseWebReleaseSmokeOptions<br>!value &#124;&#124; values.has(key) |
| UI-7a0dcb11f7c6<br>[lib/deployment/web-release-smoke.ts:107:46](../../lib/deployment/web-release-smoke.ts#L107) | argument_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>WebReleaseSmokeValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | parseWebReleaseSmokeOptions<br>values.size !== 3 &#124;&#124; !values.has('base-url') &#124;&#124; !values.has('expected-commit') &#124;&#124; !values.has('legal-mode') |
| UI-a90de342a65e<br>[lib/deployment/web-release-smoke.ts:162:46](../../lib/deployment/web-release-smoke.ts#L162) | timestamp_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>WebReleaseSmokeValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | requireTimestamp<br>!Number.isFinite(parsed) &#124;&#124; new Date(parsed).toISOString() !== value |
| UI-4f34dacf21a5<br>[lib/deployment/web-release-smoke.ts:179:46](../../lib/deployment/web-release-smoke.ts#L179) | result_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>WebReleaseSmokeValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createWebReleaseSmokeReport<br>results.length !== WEB_RELEASE_SMOKE_CHECK_IDS.length &#124;&#124; results.some((result, index) =&gt; ( result.id !== WEB_RELEASE_SMOKE_CHECK_IDS[index] &#124;&#124; !['passed', 'failed', 'not_run'].includes(result.status) )) |
| UI-b46241436103<br>[lib/deployment/web-release-smoke.ts:189:46](../../lib/deployment/web-release-smoke.ts#L189) | result_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>WebReleaseSmokeValidationError：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createWebReleaseSmokeReport<br>firstNonPassIndex &gt;= 0 &amp;&amp; ( results[firstNonPassIndex].status !== 'failed' &#124;&#124; results.slice(firstNonPassIndex + 1).some(result =&gt; result.status !== 'not_run') ) |

## lib/subscription/subscription-price-foundation-smoke.server.ts

測試／工具表面（另受建置或頁面 gate 限制）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-03b2f7802665<br>[lib/subscription/subscription-price-foundation-smoke.server.ts:88:31](../../lib/subscription/subscription-price-foundation-smoke.server.ts#L88) | denial-smoke | **共用文案值** · 文案生產端，須查使用端<br>last_transition_reason：供畫面或訊息組裝使用的標籤／說明值 | TABLE_PROBES · last_transition_reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5a297ec2c01b<br>[lib/subscription/subscription-price-foundation-smoke.server.ts:92:182](../../lib/subscription/subscription-price-foundation-smoke.server.ts#L92) | denial-smoke | **共用文案值** · 文案生產端，須查使用端<br>last_transition_reason：供畫面或訊息組裝使用的標籤／說明值 | TABLE_PROBES · last_transition_reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/theme-lab.ts

測試／工具表面（另受建置或頁面 gate 限制）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-1d91693d8ecf<br>[lib/theme-lab.ts:68:28](../../lib/theme-lab.ts#L68) | 霧藍主色 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-64eaf669699c<br>[lib/theme-lab.ts:68:81](../../lib/theme-lab.ts#L68) | 頁首、主要按鈕與焦點 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c21cfcd07c89<br>[lib/theme-lab.ts:69:30](../../lib/theme-lab.ts#L69) | 暖木輔色 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bc54b415c02d<br>[lib/theme-lab.ts:69:85](../../lib/theme-lab.ts#L69) | 漸層、標記與溫暖點綴 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-911ebaf02c80<br>[lib/theme-lab.ts:70:31](../../lib/theme-lab.ts#L70) | 米白背景 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f7557bd42f89<br>[lib/theme-lab.ts:70:87](../../lib/theme-lab.ts#L70) | App 整體畫布 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-01b7ef00582e<br>[lib/theme-lab.ts:71:25](../../lib/theme-lab.ts#L71) | 卡片底色 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-61c2989d13ef<br>[lib/theme-lab.ts:71:75](../../lib/theme-lab.ts#L71) | 卡片、輸入框與浮層 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8c3cc37f1249<br>[lib/theme-lab.ts:72:31](../../lib/theme-lab.ts#L72) | 主要文字 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b5ab17a8dee1<br>[lib/theme-lab.ts:72:87](../../lib/theme-lab.ts#L72) | 標題與正文 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2a47b62389cc<br>[lib/theme-lab.ts:73:36](../../lib/theme-lab.ts#L73) | 次要文字 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fdcfff3e4989<br>[lib/theme-lab.ts:73:98](../../lib/theme-lab.ts#L73) | 說明、標籤與輔助資訊 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b136325052d4<br>[lib/theme-lab.ts:74:29](../../lib/theme-lab.ts#L74) | 柔粉 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-12b9a0072ec9<br>[lib/theme-lab.ts:74:82](../../lib/theme-lab.ts#L74) | 溫柔提示與分類底色 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fbdcc1266581<br>[lib/theme-lab.ts:75:30](../../lib/theme-lab.ts#L75) | 柔綠 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-42c163cd1d96<br>[lib/theme-lab.ts:75:84](../../lib/theme-lab.ts#L75) | 區塊底色與自然感 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0a16153873e0<br>[lib/theme-lab.ts:76:31](../../lib/theme-lab.ts#L76) | 柔黃 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-848c9cbbb955<br>[lib/theme-lab.ts:76:86](../../lib/theme-lab.ts#L76) | 暖光背景與提醒底色 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-646d67fb71c9<br>[lib/theme-lab.ts:77:34](../../lib/theme-lab.ts#L77) | 收班卡片底色 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a306f4e9be7d<br>[lib/theme-lab.ts:77:97](../../lib/theme-lab.ts#L77) | 首頁「今日已收班」整張卡片 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e5fd0b695fd9<br>[lib/theme-lab.ts:78:36](../../lib/theme-lab.ts#L78) | 近期市集區塊底色 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-41e7b448d24c<br>[lib/theme-lab.ts:78:102](../../lib/theme-lab.ts#L78) | 首頁「近期市集」整個橫向區塊 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-23865605ef1b<br>[lib/theme-lab.ts:79:38](../../lib/theme-lab.ts#L79) | 近期日期標籤底色 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a9aaf879ac70<br>[lib/theme-lab.ts:79:107](../../lib/theme-lab.ts#L79) | 近期市集內的日期標籤，例如 7/23（週四） | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2ee381082bf5<br>[lib/theme-lab.ts:80:27](../../lib/theme-lab.ts#L80) | 危險色 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a46b5cace1ab<br>[lib/theme-lab.ts:80:78](../../lib/theme-lab.ts#L80) | 刪除、錯誤與重要警示 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5e58a3ab9a9f<br>[lib/theme-lab.ts:81:25](../../lib/theme-lab.ts#L81) | 提醒色 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-68fbab95af12<br>[lib/theme-lab.ts:81:74](../../lib/theme-lab.ts#L81) | 待處理與注意狀態 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d802253f6adb<br>[lib/theme-lab.ts:82:25](../../lib/theme-lab.ts#L82) | 資訊色 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0984bf65ee79<br>[lib/theme-lab.ts:82:74](../../lib/theme-lab.ts#L82) | 一般資訊與次要狀態 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | THEME_TOKEN_DEFINITIONS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7b9d2f5a4187<br>[lib/theme-lab.ts:154:11](../../lib/theme-lab.ts#L154) | JapaneseD 暖霧 | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · name<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9b3b61971f9a<br>[lib/theme-lab.ts:155:18](../../lib/theme-lab.ts#L155) | 目前專案的霧藍、暖木與米白基準。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5bba2d65f49b<br>[lib/theme-lab.ts:160:11](../../lib/theme-lab.ts#L160) | 霧櫻日和 | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · name<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6fe736bb63cb<br>[lib/theme-lab.ts:161:18](../../lib/theme-lab.ts#L161) | 更柔和的櫻粉與灰藍，保留木質暖意。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ef66a49a28d3<br>[lib/theme-lab.ts:173:11](../../lib/theme-lab.ts#L173) | 青瓷晨光 | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · name<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d89f525a5d7a<br>[lib/theme-lab.ts:174:18](../../lib/theme-lab.ts#L174) | 帶一點青瓷綠的清爽日系配色。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-24f6947d1d29<br>[lib/theme-lab.ts:186:11](../../lib/theme-lab.ts#L186) | 暮光映畫 | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · name<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1d0fbd9095f7<br>[lib/theme-lab.ts:187:18](../../lib/theme-lab.ts#L187) | 以 Instagram 暮光感為靈感的暖紫粉版本。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d90e22df4481<br>[lib/theme-lab.ts:199:11](../../lib/theme-lab.ts#L199) | 蜂蜜奶茶 | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · name<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b36dbe04a210<br>[lib/theme-lab.ts:200:18](../../lib/theme-lab.ts#L200) | 焦糖棕、蜂蜜金與奶油米白，像午後咖啡店一樣溫暖。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e641f3edaed2<br>[lib/theme-lab.ts:212:11](../../lib/theme-lab.ts#L212) | 紫陽雨日 | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · name<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-43f283e47013<br>[lib/theme-lab.ts:213:18](../../lib/theme-lab.ts#L213) | 雨霧紫、繡球粉與微冷白，安靜又帶一點浪漫。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-54e2f36b9c4a<br>[lib/theme-lab.ts:225:11](../../lib/theme-lab.ts#L225) | 森町綠意 | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · name<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6e47e5a8a3e4<br>[lib/theme-lab.ts:226:18](../../lib/theme-lab.ts#L226) | 森林綠、木質棕與葉影柔色，適合自然系品牌。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-48852ec600c9<br>[lib/theme-lab.ts:238:11](../../lib/theme-lab.ts#L238) | 海鹽蘇打 | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · name<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c216524dc6f8<br>[lib/theme-lab.ts:239:18](../../lib/theme-lab.ts#L239) | 海水藍、珊瑚杏與清透白，帶來輕盈的夏日感。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3cf1f84cb815<br>[lib/theme-lab.ts:251:11](../../lib/theme-lab.ts#L251) | 莓果焦糖 | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · name<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bd0774631ed2<br>[lib/theme-lab.ts:252:18](../../lib/theme-lab.ts#L252) | 莓果紅、焦糖橙與暖粉背景，成熟而有手作質感。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | BUILT_IN_THEME_PRESETS · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b028bff1c352<br>[lib/theme-lab.ts:333:48](../../lib/theme-lab.ts#L333) | string | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | sanitizePreset · description<br>typeof source.description === 'string' |
| UI-589b5c081f54<br>[lib/theme-lab.ts:440:26](../../lib/theme-lab.ts#L440) | 主要文字 / 頁面背景 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | definitions · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1958e7e9da72<br>[lib/theme-lab.ts:441:27](../../lib/theme-lab.ts#L441) | 次要文字 / 卡片 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | definitions · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-85e06bb5c6f4<br>[lib/theme-lab.ts:442:35](../../lib/theme-lab.ts#L442) | 白字 / 主要按鈕 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | definitions · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d025e33d4300<br>[lib/theme-lab.ts:443:35](../../lib/theme-lab.ts#L443) | 白字 / 漸層輔色 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | definitions · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ecc92708c2c6<br>[lib/theme-lab.ts:444:28](../../lib/theme-lab.ts#L444) | 危險文字 / 卡片 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | definitions · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-aa74068745de<br>[lib/theme-lab.ts:461:26](../../lib/theme-lab.ts#L461) | 未命名配色 | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | createThemeLabExport · name<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3a8b223788bf<br>[lib/theme-lab.ts:470:32](../../lib/theme-lab.ts#L470) | 色票格式不完整，請確認所有色彩欄位皆為六位 HEX 色碼。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | parseThemeLabImport<br>!colors |
| UI-26a3402c3729<br>[lib/theme-lab.ts:472:34](../../lib/theme-lab.ts#L472) | string | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | parseThemeLabImport · name<br>typeof parsed.name === 'string' &amp;&amp; parsed.name.trim() |
| UI-bb55c03deaaf<br>[lib/theme-lab.ts:472:101](../../lib/theme-lab.ts#L472) | 匯入的配色 | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | parseThemeLabImport · name<br>否則 typeof parsed.name === 'string' &amp;&amp; parsed.name.trim() |

## public/clear-sw.html

獨立靜態測試／修復 HTML；直接網址與程式條件另核對

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-b5428d79ad51<br>[public/clear-sw.html:6:10](../../public/clear-sw.html#L6) | 清除 Service Worker | **畫面文字** · 直接呈現定義<br>title：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-00cad993cce8<br>[public/clear-sw.html:53:9](../../public/clear-sw.html#L53) | 🔧 Service Worker 管理工具 | **畫面文字** · 直接呈現定義<br>h1：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-c93e354951b2<br>[public/clear-sw.html:54:8](../../public/clear-sw.html#L54) | 如果遇到 Service Worker 相關錯誤，可以使用以下工具清除： | **畫面文字** · 直接呈現定義<br>p：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-67b9c766a7ce<br>[public/clear-sw.html:56:49](../../public/clear-sw.html#L56) | 註銷 Service Worker | **畫面文字** · 直接呈現定義<br>button：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-4c1291cc8fe5<br>[public/clear-sw.html:57:40](../../public/clear-sw.html#L57) | 清除所有快取 | **畫面文字** · 直接呈現定義<br>button：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-3b1cde446851<br>[public/clear-sw.html:58:40](../../public/clear-sw.html#L58) | 清除並重新載入 | **畫面文字** · 直接呈現定義<br>button：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-48964132749e<br>[public/clear-sw.html:72:31](../../public/clear-sw.html#L72) | ${message} | **動態文字入口** · 執行時綁定入口<br>showStatus 接收執行時文字；內容需追查所列綁定與生產端 | inline script / showStatus<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0bd4e22ab461<br>[public/clear-sw.html:77:20](../../public/clear-sw.html#L77) | This repair tool is only available on localhost. | **來源候選** · 候選，非已證實提示<br>unregisterServiceWorker 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / unregisterServiceWorker<br>!isLocalRepairPage() |
| UI-dbf45ec3c398<br>[public/clear-sw.html:86:24](../../public/clear-sw.html#L86) | ✅ 沒有已註冊的 Service Worker | **來源候選** · 候選，非已證實提示<br>unregisterServiceWorker 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / unregisterServiceWorker<br>'serviceWorker' in navigator → registrations.length === 0 |
| UI-85e0e3bfe69a<br>[public/clear-sw.html:94:22](../../public/clear-sw.html#L94) | ✅ 已註銷 ${registrations.length} 個 Service Worker | **來源候選** · 候選，非已證實提示<br>unregisterServiceWorker 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / unregisterServiceWorker<br>'serviceWorker' in navigator |
| UI-7fd411270964<br>[public/clear-sw.html:96:22](../../public/clear-sw.html#L96) | ❌ 瀏覽器不支援 Service Worker | **來源候選** · 候選，非已證實提示<br>unregisterServiceWorker 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / unregisterServiceWorker<br>否則 'serviceWorker' in navigator |
| UI-5522735f2329<br>[public/clear-sw.html:99:20](../../public/clear-sw.html#L99) | ❌ 註銷失敗: | **來源候選** · 候選，非已證實提示<br>unregisterServiceWorker 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / unregisterServiceWorker<br>catch：操作拋出例外 |
| UI-fa04b4a29d59<br>[public/clear-sw.html:105:20](../../public/clear-sw.html#L105) | This repair tool is only available on localhost. | **來源候選** · 候選，非已證實提示<br>clearAllCaches 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / clearAllCaches<br>!isLocalRepairPage() |
| UI-2ae7b3540282<br>[public/clear-sw.html:114:24](../../public/clear-sw.html#L114) | ✅ 沒有快取需要清除 | **來源候選** · 候選，非已證實提示<br>clearAllCaches 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / clearAllCaches<br>'caches' in window → cacheNames.length === 0 |
| UI-189833b5d201<br>[public/clear-sw.html:122:22](../../public/clear-sw.html#L122) | ✅ 已清除 ${cacheNames.length} 個快取 | **來源候選** · 候選，非已證實提示<br>clearAllCaches 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / clearAllCaches<br>'caches' in window |
| UI-1bf802434aa0<br>[public/clear-sw.html:124:22](../../public/clear-sw.html#L124) | ❌ 瀏覽器不支援 Cache API | **來源候選** · 候選，非已證實提示<br>clearAllCaches 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / clearAllCaches<br>否則 'caches' in window |
| UI-8028a66038c1<br>[public/clear-sw.html:127:20](../../public/clear-sw.html#L127) | ❌ 清除快取失敗: | **來源候選** · 候選，非已證實提示<br>clearAllCaches 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / clearAllCaches<br>catch：操作拋出例外 |
| UI-96b783ecbad2<br>[public/clear-sw.html:135:20](../../public/clear-sw.html#L135) | ✅ 清除完成，3 秒後重新載入... | **來源候選** · 候選，非已證實提示<br>clearAndReload 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / clearAndReload<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e990cf3fd8ee<br>[public/clear-sw.html:141:20](../../public/clear-sw.html#L141) | ❌ 操作失敗: | **來源候選** · 候選，非已證實提示<br>clearAndReload 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / clearAndReload<br>catch：操作拋出例外 |
| UI-414d4d818704<br>[public/clear-sw.html:152:11](../../public/clear-sw.html#L152) | 📊 當前狀態： | **來源候選** · 候選，非已證實提示<br>module 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / module<br>'serviceWorker' in navigator |
| UI-dca56679204d<br>[public/clear-sw.html:153:11](../../public/clear-sw.html#L153) | Service Worker: ${registrations.length} 個\n | **來源候選** · 候選，非已證實提示<br>module 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / module<br>'serviceWorker' in navigator |
| UI-082e3d5f7892<br>[public/clear-sw.html:154:11](../../public/clear-sw.html#L154) | 快取: ${cacheNames.length} 個 | **來源候選** · 候選，非已證實提示<br>module 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / module<br>'serviceWorker' in navigator |

## public/db-fix.html

獨立靜態測試／修復 HTML；直接網址與程式條件另核對

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-5ca2851e80f7<br>[public/db-fix.html:6:10](../../public/db-fix.html#L6) | Féria - 資料庫修復工具 | **畫面文字** · 直接呈現定義<br>title：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-a30b7518790a<br>[public/db-fix.html:161:9](../../public/db-fix.html#L161) | 🔧 資料庫修復工具 | **畫面文字** · 直接呈現定義<br>h1：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-1d4fbcaa2420<br>[public/db-fix.html:162:25](../../public/db-fix.html#L162) | Féria - 資料庫診斷與修復 | **畫面文字** · 直接呈現定義<br>p：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-9a2cf19930d5<br>[public/db-fix.html:166:36](../../public/db-fix.html#L166) | IndexedDB 支援 | **畫面文字** · 直接呈現定義<br>span：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-65adb3fdde42<br>[public/db-fix.html:167:59](../../public/db-fix.html#L167) | 檢查中... | **畫面文字** · 直接呈現定義<br>span：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-055634a116aa<br>[public/db-fix.html:170:36](../../public/db-fix.html#L170) | 資料庫狀態 | **畫面文字** · 直接呈現定義<br>span：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-78e1b7aad6d4<br>[public/db-fix.html:171:51](../../public/db-fix.html#L171) | 檢查中... | **畫面文字** · 直接呈現定義<br>span：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-4d3f5f81c0b6<br>[public/db-fix.html:174:36](../../public/db-fix.html#L174) | 儲存空間 | **畫面文字** · 直接呈現定義<br>span：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-e0284803d65c<br>[public/db-fix.html:175:56](../../public/db-fix.html#L175) | 檢查中... | **畫面文字** · 直接呈現定義<br>span：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-faeed6fc7d01<br>[public/db-fix.html:179:59](../../public/db-fix.html#L179) | 🔍 診斷資料庫 | **畫面文字** · 直接呈現定義<br>button：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-b290c0bb6dbf<br>[public/db-fix.html:180:58](../../public/db-fix.html#L180) | 🗑️ 重置資料庫 | **畫面文字** · 直接呈現定義<br>button：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-3016c36f7ecb<br>[public/db-fix.html:181:70](../../public/db-fix.html#L181) | 🏠 返回首頁 | **畫面文字** · 直接呈現定義<br>button：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-f086139e05c1<br>[public/db-fix.html:198:26](../../public/db-fix.html#L198) | [${new Date().toLocaleTimeString()}] ${message} | **DOM 訊息文字** · 直接呈現定義<br>line.textContent：寫入頁面文字或 HTML 訊息區 | inline script / log<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d526985c3b58<br>[public/db-fix.html:207:36](../../public/db-fix.html#L207) | ✅ 支援 | **DOM 訊息文字** · 直接呈現定義<br>el.textContent：寫入頁面文字或 HTML 訊息區 | inline script / checkIndexedDBSupport<br>supported |
| UI-368fc63c42cf<br>[public/db-fix.html:207:45](../../public/db-fix.html#L207) | ❌ 不支援 | **DOM 訊息文字** · 直接呈現定義<br>el.textContent：寫入頁面文字或 HTML 訊息區 | inline script / checkIndexedDBSupport<br>否則 supported |
| UI-e04ed86f2544<br>[public/db-fix.html:223:28](../../public/db-fix.html#L223) | ${used} MB / ${quota} MB (${percent}%) | **DOM 訊息文字** · 直接呈現定義<br>el.textContent：寫入頁面文字或 HTML 訊息區 | inline script / checkStorage<br>navigator.storage &amp;&amp; navigator.storage.estimate |
| UI-5e9b177c6668<br>[public/db-fix.html:226:15](../../public/db-fix.html#L226) | 儲存空間：已使用 ${used} MB，配額 ${quota} MB | **來源候選** · 候選，非已證實提示<br>checkStorage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkStorage<br>navigator.storage &amp;&amp; navigator.storage.estimate |
| UI-383c32e276b9<br>[public/db-fix.html:228:28](../../public/db-fix.html#L228) | ❌ 無法檢查 | **DOM 訊息文字** · 直接呈現定義<br>el.textContent：寫入頁面文字或 HTML 訊息區 | inline script / checkStorage<br>navigator.storage &amp;&amp; navigator.storage.estimate → catch：操作拋出例外 |
| UI-03aa45293ac2<br>[public/db-fix.html:230:15](../../public/db-fix.html#L230) | 檢查儲存空間失敗：${error.message} | **來源候選** · 候選，非已證實提示<br>checkStorage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkStorage<br>navigator.storage &amp;&amp; navigator.storage.estimate → catch：操作拋出例外 |
| UI-65329c8d9163<br>[public/db-fix.html:233:26](../../public/db-fix.html#L233) | ⚠️ 不支援 | **DOM 訊息文字** · 直接呈現定義<br>el.textContent：寫入頁面文字或 HTML 訊息區 | inline script / checkStorage<br>否則 navigator.storage &amp;&amp; navigator.storage.estimate |
| UI-2a031bc90543<br>[public/db-fix.html:240:11](../../public/db-fix.html#L240) | 開始診斷資料庫... | **來源候選** · 候選，非已證實提示<br>checkDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-be71054c57ba<br>[public/db-fix.html:248:15](../../public/db-fix.html#L248) | 找到 ${dbs.length} 個資料庫 | **來源候選** · 候選，非已證實提示<br>checkDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkDatabase<br>indexedDB.databases |
| UI-1a51efafb64b<br>[public/db-fix.html:252:17](../../public/db-fix.html#L252) | MarketPulseDB 存在，版本：${marketPulseDB.version} | **來源候選** · 候選，非已證實提示<br>checkDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkDatabase<br>indexedDB.databases → marketPulseDB |
| UI-f021a56e1fdf<br>[public/db-fix.html:254:17](../../public/db-fix.html#L254) | MarketPulseDB 不存在 | **來源候選** · 候選，非已證實提示<br>checkDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkDatabase<br>indexedDB.databases → 否則 marketPulseDB |
| UI-20c76d18cf15<br>[public/db-fix.html:263:15](../../public/db-fix.html#L263) | 資料庫版本：${db.version} | **來源候選** · 候選，非已證實提示<br>checkDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-db9ccc04e5dc<br>[public/db-fix.html:264:15](../../public/db-fix.html#L264) | 資料表：${Array.from(db.objectStoreNames).join(', ')} | **來源候選** · 候選，非已證實提示<br>checkDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4e203dafcd80<br>[public/db-fix.html:266:28](../../public/db-fix.html#L266) | ✅ 正常 | **DOM 訊息文字** · 直接呈現定義<br>el.textContent：寫入頁面文字或 HTML 訊息區 | inline script / checkDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-498fae75e24f<br>[public/db-fix.html:273:15](../../public/db-fix.html#L273) | 無法開啟資料庫：${request.error} | **來源候選** · 候選，非已證實提示<br>checkDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-befa1640e2aa<br>[public/db-fix.html:274:28](../../public/db-fix.html#L274) | ❌ 錯誤 | **DOM 訊息文字** · 直接呈現定義<br>el.textContent：寫入頁面文字或 HTML 訊息區 | inline script / checkDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6b1cee6fff24<br>[public/db-fix.html:279:13](../../public/db-fix.html#L279) | 診斷失敗：${error.message} | **來源候選** · 候選，非已證實提示<br>checkDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkDatabase<br>catch：操作拋出例外 |
| UI-7c17ad4ed427<br>[public/db-fix.html:280:26](../../public/db-fix.html#L280) | ❌ 錯誤 | **DOM 訊息文字** · 直接呈現定義<br>el.textContent：寫入頁面文字或 HTML 訊息區 | inline script / checkDatabase<br>catch：操作拋出例外 |
| UI-fe696016e59e<br>[public/db-fix.html:288:15](../../public/db-fix.html#L288) | This repair tool is only available on localhost. | **確認／通知** · 直接呈現定義<br>alert：提示操作結果、進度或要求使用者確認 | inline script / resetDatabase<br>!isLocalRepairPage() |
| UI-99daf9c70c0a<br>[public/db-fix.html:292:20](../../public/db-fix.html#L292) | ⚠️ 警告：此操作將刪除所有本地資料（市集、商品、交易記錄等），且無法復原。 確定要繼續嗎？ | **確認／通知** · 直接呈現定義<br>confirm：提示操作結果、進度或要求使用者確認 | inline script / resetDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-459bb6a5e7a1<br>[public/db-fix.html:296:11](../../public/db-fix.html#L296) | 開始重置資料庫... | **來源候選** · 候選，非已證實提示<br>resetDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / resetDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bf4570fe43f9<br>[public/db-fix.html:300:13](../../public/db-fix.html#L300) | 正在刪除 MarketPulseDB... | **來源候選** · 候選，非已證實提示<br>resetDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / resetDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0650976e38c5<br>[public/db-fix.html:306:17](../../public/db-fix.html#L306) | 資料庫被鎖定，請關閉其他分頁 | **來源候選** · 候選，非已證實提示<br>resetDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / resetDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-16dbd54784f0<br>[public/db-fix.html:307:30](../../public/db-fix.html#L307) | Database blocked | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | inline script / resetDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e989ce50317e<br>[public/db-fix.html:310:13](../../public/db-fix.html#L310) | ✅ 資料庫已刪除 | **來源候選** · 候選，非已證實提示<br>resetDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / resetDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8046d452e6c5<br>[public/db-fix.html:313:13](../../public/db-fix.html#L313) | 正在清除 localStorage... | **來源候選** · 候選，非已證實提示<br>resetDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / resetDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-38602f6a1d16<br>[public/db-fix.html:315:13](../../public/db-fix.html#L315) | ✅ localStorage 已清除 | **來源候選** · 候選，非已證實提示<br>resetDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / resetDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1d0ab7deedaf<br>[public/db-fix.html:318:13](../../public/db-fix.html#L318) | 正在清除 sessionStorage... | **來源候選** · 候選，非已證實提示<br>resetDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / resetDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d6fc41205d14<br>[public/db-fix.html:320:13](../../public/db-fix.html#L320) | ✅ sessionStorage 已清除 | **來源候選** · 候選，非已證實提示<br>resetDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / resetDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5acb8991f7de<br>[public/db-fix.html:323:60](../../public/db-fix.html#L323) | ✅ 已重置 | **DOM 訊息文字** · 直接呈現定義<br>document.getElementById('db-status').textContent：寫入頁面文字或 HTML 訊息區 | inline script / resetDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f1892fd53aaa<br>[public/db-fix.html:326:13](../../public/db-fix.html#L326) | 🎉 重置完成！ | **來源候選** · 候選，非已證實提示<br>resetDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / resetDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-28463bcf20a1<br>[public/db-fix.html:327:13](../../public/db-fix.html#L327) | 正在重新載入頁面... | **來源候選** · 候選，非已證實提示<br>resetDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / resetDatabase<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dcbed275001b<br>[public/db-fix.html:335:13](../../public/db-fix.html#L335) | ❌ 重置失敗：${error.message} | **來源候選** · 候選，非已證實提示<br>resetDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / resetDatabase<br>catch：操作拋出例外 |
| UI-ac0f09e57c74<br>[public/db-fix.html:336:15](../../public/db-fix.html#L336) | 重置失敗：${error.message}\n\n請嘗試手動清除瀏覽器資料。 | **確認／通知** · 直接呈現定義<br>alert：提示操作結果、進度或要求使用者確認 | inline script / resetDatabase<br>catch：操作拋出例外 |

## public/fix.html

獨立靜態測試／修復 HTML；直接網址與程式條件另核對

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-b3a442885f10<br>[public/fix.html:6:10](../../public/fix.html#L6) | 一鍵修復 - Féria | **畫面文字** · 直接呈現定義<br>title：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-800899064f41<br>[public/fix.html:142:9](../../public/fix.html#L142) | 🔧 一鍵修復 | **畫面文字** · 直接呈現定義<br>h1：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-ddc5fd0c8553<br>[public/fix.html:143:25](../../public/fix.html#L143) | 遇到資料庫錯誤？ | **畫面文字** · 直接呈現定義<br>p：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-02e3fb53f404<br>[public/fix.html:144:19](../../public/fix.html#L144) | 點擊下方按鈕立即修復 | **畫面文字** · 直接呈現定義<br>p：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-0eb35435e036<br>[public/fix.html:149:34](../../public/fix.html#L149) | ⚠️ 注意 | **畫面文字** · 直接呈現定義<br>div：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-d637d18acfe6<br>[public/fix.html:150:33](../../public/fix.html#L150) | 此操作將刪除所有本地資料（市集、商品、交易記錄等），且無法復原。 | **畫面文字** · 直接呈現定義<br>div：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-7a22eca0b3bd<br>[public/fix.html:155:48](../../public/fix.html#L155) | 🚀 立即修復 | **畫面文字** · 直接呈現定義<br>button：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-f593d6e3f614<br>[public/fix.html:159:70](../../public/fix.html#L159) | 返回首頁 | **畫面文字** · 直接呈現定義<br>button：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-6c0c6c17b47d<br>[public/fix.html:177:26](../../public/fix.html#L177) | ${message} | **動態文字入口** · 執行時綁定入口<br>log 接收執行時文字；內容需追查所列綁定與生產端 | inline script / log<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b402bedcb873<br>[public/fix.html:183:15](../../public/fix.html#L183) | This repair tool is only available on localhost. | **確認／通知** · 直接呈現定義<br>alert：提示操作結果、進度或要求使用者確認 | inline script / fixNow<br>!isLocalRepairPage() |
| UI-8085c9265170<br>[public/fix.html:187:20](../../public/fix.html#L187) | 確定要重置資料庫嗎？ 此操作將刪除所有本地資料，且無法復原。 | **確認／通知** · 直接呈現定義<br>confirm：提示操作結果、進度或要求使用者確認 | inline script / fixNow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c9f381fd2aa3<br>[public/fix.html:196:13](../../public/fix.html#L196) | 🗑️ 正在刪除資料庫... | **來源候選** · 候選，非已證實提示<br>fixNow 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / fixNow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2bfab74aa2f8<br>[public/fix.html:203:17](../../public/fix.html#L203) | ✅ 資料庫已刪除 | **來源候選** · 候選，非已證實提示<br>fixNow 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / fixNow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-967c5d0b5f98<br>[public/fix.html:208:17](../../public/fix.html#L208) | ❌ 刪除失敗: | **來源候選** · 候選，非已證實提示<br>fixNow 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / fixNow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-35ff8466ba98<br>[public/fix.html:213:17](../../public/fix.html#L213) | ⚠️ 資料庫被鎖定，請關閉其他分頁 | **來源候選** · 候選，非已證實提示<br>fixNow 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / fixNow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6c26054c784e<br>[public/fix.html:214:30](../../public/fix.html#L214) | Database blocked | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | inline script / fixNow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d9dc07706385<br>[public/fix.html:219:13](../../public/fix.html#L219) | 🗑️ 清除 localStorage... | **來源候選** · 候選，非已證實提示<br>fixNow 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / fixNow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7b4e1b59bf39<br>[public/fix.html:221:13](../../public/fix.html#L221) | ✅ localStorage 已清除 | **來源候選** · 候選，非已證實提示<br>fixNow 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / fixNow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a1d6478c7a5b<br>[public/fix.html:224:13](../../public/fix.html#L224) | 🗑️ 清除 sessionStorage... | **來源候選** · 候選，非已證實提示<br>fixNow 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / fixNow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-06bd6b3f7f20<br>[public/fix.html:226:13](../../public/fix.html#L226) | ✅ sessionStorage 已清除 | **來源候選** · 候選，非已證實提示<br>fixNow 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / fixNow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3f898a72637c<br>[public/fix.html:229:13](../../public/fix.html#L229) | 🎉 修復完成！ | **來源候選** · 候選，非已證實提示<br>fixNow 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / fixNow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0b6c8cc1d495<br>[public/fix.html:233:33](../../public/fix.html#L233) | 3 | **DOM 訊息文字** · 直接呈現定義<br>countdown.textContent：寫入頁面文字或 HTML 訊息區 | inline script / fixNow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c9b2aa1d28bc<br>[public/fix.html:236:13](../../public/fix.html#L236) | 正在重新載入頁面... | **來源候選** · 候選，非已證實提示<br>fixNow 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / fixNow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-593821cb9720<br>[public/fix.html:241:35](../../public/fix.html#L241) | ${count} | **動態文字入口** · 執行時綁定入口<br>timer 接收執行時文字；內容需追查所列綁定與生產端 | inline script / timer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-23ec78619cb3<br>[public/fix.html:249:13](../../public/fix.html#L249) | ❌ 修復失敗: | **來源候選** · 候選，非已證實提示<br>fixNow 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / fixNow<br>catch：操作拋出例外 |
| UI-ac0561e4094e<br>[public/fix.html:250:13](../../public/fix.html#L250) | 請嘗試手動清除瀏覽器資料 | **來源候選** · 候選，非已證實提示<br>fixNow 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / fixNow<br>catch：操作拋出例外 |

## public/sw-test.html

獨立靜態測試／修復 HTML；直接網址與程式條件另核對

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-a584088aa1b6<br>[public/sw-test.html:6:10](../../public/sw-test.html#L6) | Service Worker 測試 | **畫面文字** · 直接呈現定義<br>title：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-747c4fe149c8<br>[public/sw-test.html:55:7](../../public/sw-test.html#L55) | 🔧 Service Worker 測試頁面 | **畫面文字** · 直接呈現定義<br>h1：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-bc8d7eb86280<br>[public/sw-test.html:61:7](../../public/sw-test.html#L61) | 操作 | **畫面文字** · 直接呈現定義<br>h2：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-591069116aae<br>[public/sw-test.html:62:41](../../public/sw-test.html#L62) | 檢查註冊狀態 | **畫面文字** · 直接呈現定義<br>button：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-f075482928f7<br>[public/sw-test.html:63:35](../../public/sw-test.html#L63) | 檢查快取 | **畫面文字** · 直接呈現定義<br>button：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-ca98875260e2<br>[public/sw-test.html:64:35](../../public/sw-test.html#L64) | 測試離線功能 | **畫面文字** · 直接呈現定義<br>button：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-1b77e43a1835<br>[public/sw-test.html:65:35](../../public/sw-test.html#L65) | 強制更新 | **畫面文字** · 直接呈現定義<br>button：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-f9b4536e42ea<br>[public/sw-test.html:66:34](../../public/sw-test.html#L66) | 取消註冊 | **畫面文字** · 直接呈現定義<br>button：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-07912adf3dda<br>[public/sw-test.html:68:7](../../public/sw-test.html#L68) | 日誌 | **畫面文字** · 直接呈現定義<br>h2：提供靜態頁面標題、說明或操作標籤 | HTML document<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-49938e1b470d<br>[public/sw-test.html:81:53](../../public/sw-test.html#L81) | ${logs.join('\n')} | **動態文字入口** · 執行時綁定入口<br>log 接收執行時文字；內容需追查所列綁定與生產端 | inline script / log<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-652820743ab9<br>[public/sw-test.html:91:32](../../public/sw-test.html#L91) | &lt;strong&gt;✅ 瀏覽器支援 Service Worker&lt;/strong&gt; | **DOM 訊息文字** · 直接呈現定義<br>supportDiv.innerHTML：寫入頁面文字或 HTML 訊息區 | inline script / checkSupport<br>'serviceWorker' in navigator |
| UI-8ca8d12d25fd<br>[public/sw-test.html:91:41](../../public/sw-test.html#L91) | ✅ 瀏覽器支援 Service Worker | **HTML 範本文字** · 文案生產端，須查使用端<br>HTML 字串範本中的 strong 文字；須由 checkSupport 的呼叫端確認渲染時機 | inline script / checkSupport<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-9a6262c835d5<br>[public/sw-test.html:92:13](../../public/sw-test.html#L92) | 瀏覽器支援 Service Worker | **來源候選** · 候選，非已證實提示<br>checkSupport 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkSupport<br>'serviceWorker' in navigator |
| UI-058ce20b7c31<br>[public/sw-test.html:96:32](../../public/sw-test.html#L96) | &lt;strong&gt;❌ 瀏覽器不支援 Service Worker&lt;/strong&gt; | **DOM 訊息文字** · 直接呈現定義<br>supportDiv.innerHTML：寫入頁面文字或 HTML 訊息區 | inline script / checkSupport<br>否則 'serviceWorker' in navigator |
| UI-e6c6e61c15f8<br>[public/sw-test.html:96:41](../../public/sw-test.html#L96) | ❌ 瀏覽器不支援 Service Worker | **HTML 範本文字** · 文案生產端，須查使用端<br>HTML 字串範本中的 strong 文字；須由 checkSupport 的呼叫端確認渲染時機 | inline script / checkSupport<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-a56cd926be4f<br>[public/sw-test.html:97:13](../../public/sw-test.html#L97) | 瀏覽器不支援 Service Worker | **來源候選** · 候選，非已證實提示<br>checkSupport 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkSupport<br>否則 'serviceWorker' in navigator |
| UI-fbef397ef281<br>[public/sw-test.html:113:33](../../public/sw-test.html#L113) | &lt;strong&gt;✅ Service Worker 已註冊&lt;/strong&gt;&lt;br&gt; &lt;small&gt;Scope: ${registration.scope}&lt;/small&gt;&lt;br&gt; &lt;small&gt;狀態: ${registration.active ? '已激活' : '未激活'}&lt;/small&gt; | **DOM 訊息文字** · 直接呈現定義<br>statusDiv.innerHTML：寫入頁面文字或 HTML 訊息區 | inline script / checkRegistration<br>registration |
| UI-29c79d132226<br>[public/sw-test.html:114:21](../../public/sw-test.html#L114) | ✅ Service Worker 已註冊 | **HTML 範本文字** · 文案生產端，須查使用端<br>HTML 字串範本中的 strong 文字；須由 checkRegistration 的呼叫端確認渲染時機 | inline script / checkRegistration<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-ab218bcf6acf<br>[public/sw-test.html:115:20](../../public/sw-test.html#L115) | Scope: ${registration.scope} | **HTML 範本文字** · 文案生產端，須查使用端<br>HTML 字串範本中的 small 文字；須由 checkRegistration 的呼叫端確認渲染時機 | inline script / checkRegistration<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-958fee5835d6<br>[public/sw-test.html:116:20](../../public/sw-test.html#L116) | 狀態: ${registration.active ? '已激活' : '未激活'} | **HTML 範本文字** · 文案生產端，須查使用端<br>HTML 字串範本中的 small 文字；須由 checkRegistration 的呼叫端確認渲染時機 | inline script / checkRegistration<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-8cdb884617fb<br>[public/sw-test.html:116:48](../../public/sw-test.html#L116) | 已激活 | **DOM 訊息文字** · 直接呈現定義<br>statusDiv.innerHTML：寫入頁面文字或 HTML 訊息區 | inline script / checkRegistration<br>registration → registration.active |
| UI-527a625df41d<br>[public/sw-test.html:116:56](../../public/sw-test.html#L116) | 未激活 | **DOM 訊息文字** · 直接呈現定義<br>statusDiv.innerHTML：寫入頁面文字或 HTML 訊息區 | inline script / checkRegistration<br>registration → 否則 registration.active |
| UI-b46152c0d08a<br>[public/sw-test.html:118:15](../../public/sw-test.html#L118) | Service Worker 已註冊: ${registration.scope} | **來源候選** · 候選，非已證實提示<br>checkRegistration 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkRegistration<br>registration |
| UI-912efff0967b<br>[public/sw-test.html:121:17](../../public/sw-test.html#L121) | 有新版本等待激活 | **來源候選** · 候選，非已證實提示<br>checkRegistration 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkRegistration<br>registration → registration.waiting |
| UI-69c2aeefad97<br>[public/sw-test.html:125:17](../../public/sw-test.html#L125) | 正在安裝新版本 | **來源候選** · 候選，非已證實提示<br>checkRegistration 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkRegistration<br>registration → registration.installing |
| UI-833ecae8a4d6<br>[public/sw-test.html:129:33](../../public/sw-test.html#L129) | &lt;strong&gt;ℹ️ Service Worker 尚未註冊&lt;/strong&gt; | **DOM 訊息文字** · 直接呈現定義<br>statusDiv.innerHTML：寫入頁面文字或 HTML 訊息區 | inline script / checkRegistration<br>否則 registration |
| UI-ae97127e8e45<br>[public/sw-test.html:129:42](../../public/sw-test.html#L129) | ℹ️ Service Worker 尚未註冊 | **HTML 範本文字** · 文案生產端，須查使用端<br>HTML 字串範本中的 strong 文字；須由 checkRegistration 的呼叫端確認渲染時機 | inline script / checkRegistration<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-02101e2c8568<br>[public/sw-test.html:130:15](../../public/sw-test.html#L130) | Service Worker 尚未註冊 | **來源候選** · 候選，非已證實提示<br>checkRegistration 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkRegistration<br>否則 registration |
| UI-e779524bd4a4<br>[public/sw-test.html:134:31](../../public/sw-test.html#L134) | &lt;strong&gt;❌ 檢查失敗&lt;/strong&gt;&lt;br&gt;&lt;small&gt;${error.message}&lt;/small&gt; | **DOM 訊息文字** · 直接呈現定義<br>statusDiv.innerHTML：寫入頁面文字或 HTML 訊息區 | inline script / checkRegistration<br>catch：操作拋出例外 |
| UI-7a57d1462303<br>[public/sw-test.html:134:40](../../public/sw-test.html#L134) | ❌ 檢查失敗 | **HTML 範本文字** · 文案生產端，須查使用端<br>HTML 字串範本中的 strong 文字；須由 checkRegistration 的呼叫端確認渲染時機 | inline script / checkRegistration<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-12ca28aca04b<br>[public/sw-test.html:134:66](../../public/sw-test.html#L134) | ${error.message} | **HTML 範本文字** · 文案生產端，須查使用端<br>HTML 字串範本中的 small 文字；須由 checkRegistration 的呼叫端確認渲染時機 | inline script / checkRegistration<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-f19b7628156e<br>[public/sw-test.html:135:13](../../public/sw-test.html#L135) | 檢查註冊狀態失敗: ${error.message} | **來源候選** · 候選，非已證實提示<br>checkRegistration 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkRegistration<br>catch：操作拋出例外 |
| UI-fb50a4d77701<br>[public/sw-test.html:153:26](../../public/sw-test.html#L153) | &lt;br&gt;• ${cacheName}: ${keys.length} 個項目 | **來源候選** · 候選，非已證實提示<br>checkCaches 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkCaches<br>cacheNames.length &gt; 0 |
| UI-d06021d3f74c<br>[public/sw-test.html:153:31](../../public/sw-test.html#L153) | • ${cacheName}: ${keys.length} 個項目 | **HTML 範本文字** · 文案生產端，須查使用端<br>HTML 字串範本中的 HTML 文字；須由 checkCaches 的呼叫端確認渲染時機 | inline script / checkCaches<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-e9bffad3d512<br>[public/sw-test.html:154:17](../../public/sw-test.html#L154) | 快取 ${cacheName}: ${keys.length} 個項目 | **來源候選** · 候選，非已證實提示<br>checkCaches 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkCaches<br>cacheNames.length &gt; 0 |
| UI-cc0144d349c8<br>[public/sw-test.html:158:32](../../public/sw-test.html#L158) | &lt;strong&gt;✅ 找到 ${cacheNames.length} 個快取&lt;/strong&gt; ${cacheInfo} | **DOM 訊息文字** · 直接呈現定義<br>cacheDiv.innerHTML：寫入頁面文字或 HTML 訊息區 | inline script / checkCaches<br>cacheNames.length &gt; 0 |
| UI-acc3758064e5<br>[public/sw-test.html:159:21](../../public/sw-test.html#L159) | ✅ 找到 ${cacheNames.length} 個快取 | **HTML 範本文字** · 文案生產端，須查使用端<br>HTML 字串範本中的 strong 文字；須由 checkCaches 的呼叫端確認渲染時機 | inline script / checkCaches<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-bf34f466d2b1<br>[public/sw-test.html:159:59](../../public/sw-test.html#L159) | ${cacheInfo} | **HTML 範本文字** · 文案生產端，須查使用端<br>HTML 字串範本中的 HTML 文字；須由 checkCaches 的呼叫端確認渲染時機 | inline script / checkCaches<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-0428360f43d2<br>[public/sw-test.html:164:32](../../public/sw-test.html#L164) | &lt;strong&gt;ℹ️ 沒有快取&lt;/strong&gt; | **DOM 訊息文字** · 直接呈現定義<br>cacheDiv.innerHTML：寫入頁面文字或 HTML 訊息區 | inline script / checkCaches<br>否則 cacheNames.length &gt; 0 |
| UI-b4df0ec89ac3<br>[public/sw-test.html:164:41](../../public/sw-test.html#L164) | ℹ️ 沒有快取 | **HTML 範本文字** · 文案生產端，須查使用端<br>HTML 字串範本中的 strong 文字；須由 checkCaches 的呼叫端確認渲染時機 | inline script / checkCaches<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-7163cd1335ab<br>[public/sw-test.html:165:15](../../public/sw-test.html#L165) | 沒有快取 | **來源候選** · 候選，非已證實提示<br>checkCaches 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkCaches<br>否則 cacheNames.length &gt; 0 |
| UI-7a4222589a00<br>[public/sw-test.html:169:30](../../public/sw-test.html#L169) | &lt;strong&gt;❌ 檢查快取失敗&lt;/strong&gt;&lt;br&gt;&lt;small&gt;${error.message}&lt;/small&gt; | **DOM 訊息文字** · 直接呈現定義<br>cacheDiv.innerHTML：寫入頁面文字或 HTML 訊息區 | inline script / checkCaches<br>catch：操作拋出例外 |
| UI-84b37d411738<br>[public/sw-test.html:169:39](../../public/sw-test.html#L169) | ❌ 檢查快取失敗 | **HTML 範本文字** · 文案生產端，須查使用端<br>HTML 字串範本中的 strong 文字；須由 checkCaches 的呼叫端確認渲染時機 | inline script / checkCaches<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-e43740c90fdd<br>[public/sw-test.html:169:67](../../public/sw-test.html#L169) | ${error.message} | **HTML 範本文字** · 文案生產端，須查使用端<br>HTML 字串範本中的 small 文字；須由 checkCaches 的呼叫端確認渲染時機 | inline script / checkCaches<br>載入此靜態 HTML；含字串範本者需追查產生端 |
| UI-07fde9618e94<br>[public/sw-test.html:170:13](../../public/sw-test.html#L170) | 檢查快取失敗: ${error.message} | **來源候選** · 候選，非已證實提示<br>checkCaches 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / checkCaches<br>catch：操作拋出例外 |
| UI-429124bf9d50<br>[public/sw-test.html:176:11](../../public/sw-test.html#L176) | 開始測試離線功能... | **來源候選** · 候選，非已證實提示<br>testOffline 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / testOffline<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-50bdc109296b<br>[public/sw-test.html:177:11](../../public/sw-test.html#L177) | 請打開開發者工具 &gt; Network &gt; 勾選 Offline | **來源候選** · 候選，非已證實提示<br>testOffline 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / testOffline<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a027b5549eb8<br>[public/sw-test.html:178:11](../../public/sw-test.html#L178) | 然後重新整理頁面，看看是否能正常載入 | **來源候選** · 候選，非已證實提示<br>testOffline 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / testOffline<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f2e282e6527c<br>[public/sw-test.html:184:13](../../public/sw-test.html#L184) | This repair tool is only available on localhost. | **來源候選** · 候選，非已證實提示<br>forceUpdate 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / forceUpdate<br>!isLocalRepairPage() |
| UI-e06a1d8f96b7<br>[public/sw-test.html:192:15](../../public/sw-test.html#L192) | 正在檢查更新... | **來源候選** · 候選，非已證實提示<br>forceUpdate 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / forceUpdate<br>registration |
| UI-3845d9fae3f9<br>[public/sw-test.html:194:15](../../public/sw-test.html#L194) | 更新檢查完成 | **來源候選** · 候選，非已證實提示<br>forceUpdate 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / forceUpdate<br>registration |
| UI-69d8858334e7<br>[public/sw-test.html:200:15](../../public/sw-test.html#L200) | Service Worker 尚未註冊 | **來源候選** · 候選，非已證實提示<br>forceUpdate 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / forceUpdate<br>否則 registration |
| UI-d10536c42415<br>[public/sw-test.html:203:13](../../public/sw-test.html#L203) | 強制更新失敗: ${error.message} | **來源候選** · 候選，非已證實提示<br>forceUpdate 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / forceUpdate<br>catch：操作拋出例外 |
| UI-367ad9a96539<br>[public/sw-test.html:210:13](../../public/sw-test.html#L210) | This repair tool is only available on localhost. | **來源候選** · 候選，非已證實提示<br>unregister 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / unregister<br>!isLocalRepairPage() |
| UI-c92281ea08d7<br>[public/sw-test.html:214:20](../../public/sw-test.html#L214) | 確定要取消註冊 Service Worker 嗎？這會清除所有快取。 | **確認／通知** · 直接呈現定義<br>confirm：提示操作結果、進度或要求使用者確認 | inline script / unregister<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e99f0772425e<br>[public/sw-test.html:223:15](../../public/sw-test.html#L223) | Service Worker 已取消註冊 | **來源候選** · 候選，非已證實提示<br>unregister 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / unregister<br>registration |
| UI-c0cddcfdbc82<br>[public/sw-test.html:228:15](../../public/sw-test.html#L228) | 已清除 ${cacheNames.length} 個快取 | **來源候選** · 候選，非已證實提示<br>unregister 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / unregister<br>registration |
| UI-5d9c57288c5b<br>[public/sw-test.html:230:17](../../public/sw-test.html#L230) | 已取消註冊並清除快取，請重新整理頁面 | **確認／通知** · 直接呈現定義<br>alert：提示操作結果、進度或要求使用者確認 | inline script / unregister<br>registration |
| UI-708638358079<br>[public/sw-test.html:232:15](../../public/sw-test.html#L232) | Service Worker 尚未註冊 | **來源候選** · 候選，非已證實提示<br>unregister 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / unregister<br>否則 registration |
| UI-9e54ea59239f<br>[public/sw-test.html:235:13](../../public/sw-test.html#L235) | 取消註冊失敗: ${error.message} | **來源候選** · 候選，非已證實提示<br>unregister 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / unregister<br>catch：操作拋出例外 |
| UI-a6d7926e9730<br>[public/sw-test.html:241:11](../../public/sw-test.html#L241) | 頁面已載入 | **來源候選** · 候選，非已證實提示<br>module 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / module<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-89c860ac1eb4<br>[public/sw-test.html:250:13](../../public/sw-test.html#L250) | Service Worker 控制權已變更 | **來源候選** · 候選，非已證實提示<br>module 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | inline script / module<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
