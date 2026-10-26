# 收款、成交、成本與照片：提示與介面文字

> 自動產生；請勿手動修改。重新產生：`node scripts/generate-ui-copy-inventory.mjs`。
> [總索引](../APP_UI_COPY_INDEX.md) · [完整 JSON](inventory.json) · [逐檔覆蓋](coverage.md)

共 1004 筆來源位置；同字不同出處分開記錄。這是來源盤點，候選與未啟用分支不算已上線功能。

## app/api/cron/sales-photo-evidence-expiration/route.ts

API 回應／伺服器來源（須確認客戶端是否顯示）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-11a7ec6f40c4<br>[app/api/cron/sales-photo-evidence-expiration/route.ts:69:18](../../app/api/cron/sales-photo-evidence-expiration/route.ts#L69) | Sales photo evidence expiration cleanup is not enabled. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getInternal · message<br>!deps.isEnabled() |
| UI-95ee5092c354<br>[app/api/cron/sales-photo-evidence-expiration/route.ts:76:18](../../app/api/cron/sales-photo-evidence-expiration/route.ts#L76) | Cron authentication is required. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getInternal · message<br>!deps.isAuthorized(request) |
| UI-c1a4b5bd21f1<br>[app/api/cron/sales-photo-evidence-expiration/route.ts:94:18](../../app/api/cron/sales-photo-evidence-expiration/route.ts#L94) | Sales photo evidence expiration dependencies are unavailable. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getInternal · message<br>!repository &#124;&#124; !adapter |
| UI-519d89ab662d<br>[app/api/cron/sales-photo-evidence-expiration/route.ts:147:18](../../app/api/cron/sales-photo-evidence-expiration/route.ts#L147) | Sales photo evidence expiration cleanup did not finish. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getInternal · message<br>failedCount &gt; 0 |
| UI-a4753667b6ec<br>[app/api/cron/sales-photo-evidence-expiration/route.ts:190:18](../../app/api/cron/sales-photo-evidence-expiration/route.ts#L190) | Sales photo evidence expiration cleanup is temporarily unavailable. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | get · message<br>catch：操作拋出例外 |

## app/api/product-cover-photo/upload/route.ts

API 回應／伺服器來源（須確認客戶端是否顯示）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-1d0bcf115100<br>[app/api/product-cover-photo/upload/route.ts:92:81](../../app/api/product-cover-photo/upload/route.ts#L92) | r2_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | POST<br>!await putProductCoverPhotoObject(displayKey, display) |
| UI-a8d247f020d1<br>[app/api/product-cover-photo/upload/route.ts:93:85](../../app/api/product-cover-photo/upload/route.ts#L93) | r2_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | POST<br>!await putProductCoverPhotoObject(thumbnailKey, thumbnail) |
| UI-de10e7ea0631<br>[app/api/product-cover-photo/upload/route.ts:100:23](../../app/api/product-cover-photo/upload/route.ts#L100) | permission_changed | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | POST<br>!currentAccess?.canEdit &#124;&#124; currentAccess.ownerId !== access.ownerId |
| UI-a28d55c0d535<br>[app/api/product-cover-photo/upload/route.ts:112:23](../../app/api/product-cover-photo/upload/route.ts#L112) | entitlement_changed | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | POST<br>!currentPlanAccess.allowed |
| UI-507ce50b4887<br>[app/api/product-cover-photo/upload/route.ts:122:40](../../app/api/product-cover-photo/upload/route.ts#L122) | finalize_failed | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | POST<br>finalizeError |

## app/api/sales-photo-evidence/delete/route.ts

API 回應／伺服器來源（須確認客戶端是否顯示）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-21bedaa482ec<br>[app/api/sales-photo-evidence/delete/route.ts:53:14](../../app/api/sales-photo-evidence/delete/route.ts#L53) | Sales photo evidence deletion is not enabled. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | disabledResponse · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-eeeae1bcc8f6<br>[app/api/sales-photo-evidence/delete/route.ts:90:74](../../app/api/sales-photo-evidence/delete/route.ts#L90) | Evidence id is invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | deleteInternal · message<br>!evidenceId |
| UI-1d6bed9f6ce1<br>[app/api/sales-photo-evidence/delete/route.ts:98:18](../../app/api/sales-photo-evidence/delete/route.ts#L98) | Sales photo evidence authentication is temporarily unavailable. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | deleteInternal · message<br>actor === 'unavailable' |
| UI-b1827c7b9396<br>[app/api/sales-photo-evidence/delete/route.ts:105:18](../../app/api/sales-photo-evidence/delete/route.ts#L105) | Sales photo evidence deletion requires authentication. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | deleteInternal · message<br>!actor |
| UI-f73b375c3262<br>[app/api/sales-photo-evidence/delete/route.ts:119:18](../../app/api/sales-photo-evidence/delete/route.ts#L119) | Sales photo evidence is not available for deletion. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | deleteInternal · message<br>catch：操作拋出例外 |
| UI-1bf6e6dc5f37<br>[app/api/sales-photo-evidence/delete/route.ts:127:18](../../app/api/sales-photo-evidence/delete/route.ts#L127) | Only the market owner may delete sales photo evidence. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | deleteInternal · message<br>row.ownerId !== actor.actorId |
| UI-1d896c694335<br>[app/api/sales-photo-evidence/delete/route.ts:134:18](../../app/api/sales-photo-evidence/delete/route.ts#L134) | Sales photo evidence is not available for deletion. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | deleteInternal · message<br>row.deletedAt !== null &#124;&#124; row.status !== 'uploaded' &#124;&#124; !keysAreBound(row) |
| UI-112bf1653c04<br>[app/api/sales-photo-evidence/delete/route.ts:155:18](../../app/api/sales-photo-evidence/delete/route.ts#L155) | Sales photo evidence storage deletion failed. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | deleteInternal · message<br>!thumbnailDelete.ok |
| UI-f802f83b9c48<br>[app/api/sales-photo-evidence/delete/route.ts:174:18](../../app/api/sales-photo-evidence/delete/route.ts#L174) | Sales photo evidence storage deletion failed. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | deleteInternal · message<br>!imageDelete.ok |
| UI-488411864092<br>[app/api/sales-photo-evidence/delete/route.ts:195:18](../../app/api/sales-photo-evidence/delete/route.ts#L195) | Sales photo evidence metadata deletion did not finish. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | deleteInternal · message<br>catch：操作拋出例外 |
| UI-c275d83cadb8<br>[app/api/sales-photo-evidence/delete/route.ts:229:18](../../app/api/sales-photo-evidence/delete/route.ts#L229) | Sales photo evidence deletion is temporarily unavailable. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | deleteRequest · message<br>catch：操作拋出例外 |

## app/api/sales-photo-evidence/image/route.ts

API 回應／伺服器來源（須確認客戶端是否顯示）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-657ade1ea3d7<br>[app/api/sales-photo-evidence/image/route.ts:78:14](../../app/api/sales-photo-evidence/image/route.ts#L78) | Sales photo evidence image read is not enabled yet. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | disabledResponse · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-08ad280a0c29<br>[app/api/sales-photo-evidence/image/route.ts:106:18](../../app/api/sales-photo-evidence/image/route.ts#L106) | Sales photo evidence image request is invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getInternal · message<br>!query |
| UI-3cfda4f5faec<br>[app/api/sales-photo-evidence/image/route.ts:115:18](../../app/api/sales-photo-evidence/image/route.ts#L115) | Sales photo evidence authentication is temporarily unavailable. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getInternal · message<br>actor === 'unavailable' |
| UI-8f11173dafb3<br>[app/api/sales-photo-evidence/image/route.ts:122:18](../../app/api/sales-photo-evidence/image/route.ts#L122) | Sales photo evidence image read requires an authenticated user. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getInternal · message<br>!actor |
| UI-f4fc41bbd165<br>[app/api/sales-photo-evidence/image/route.ts:131:18](../../app/api/sales-photo-evidence/image/route.ts#L131) | Sales photo evidence image was not found. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getInternal · message<br>!row &#124;&#124; row.deleted_at !== null |
| UI-af8ec5ae785e<br>[app/api/sales-photo-evidence/image/route.ts:140:18](../../app/api/sales-photo-evidence/image/route.ts#L140) | Sales photo evidence expiration is invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getInternal · message<br>!Number.isFinite(expiresAt) |
| UI-ae21b23a685f<br>[app/api/sales-photo-evidence/image/route.ts:147:18](../../app/api/sales-photo-evidence/image/route.ts#L147) | Sales photo evidence has expired. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getInternal · message<br>expiresAt &lt;= (deps.now?.() ?? new Date()).getTime() |
| UI-2359387fc762<br>[app/api/sales-photo-evidence/image/route.ts:156:18](../../app/api/sales-photo-evidence/image/route.ts#L156) | Sales photo evidence status is invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getInternal · message<br>!isSalesPhotoEvidenceStatus(row.status) |
| UI-0a444e23829d<br>[app/api/sales-photo-evidence/image/route.ts:170:18](../../app/api/sales-photo-evidence/image/route.ts#L170) | Sales photo evidence image object is unavailable. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getInternal · message<br>!isSalesPhotoEvidenceObjectKeyBoundToIdentity({ key: objectKey, ownerId: row.owner_id, marketId: row.market_id, saleId: row.sale_id, evidenceId: row.id, kind: query.variant, }) |
| UI-1835af304276<br>[app/api/sales-photo-evidence/image/route.ts:209:18](../../app/api/sales-photo-evidence/image/route.ts#L209) | Sales photo evidence image storage read failed. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getInternal · message<br>!result.ok |
| UI-ea869e9d1e0a<br>[app/api/sales-photo-evidence/image/route.ts:235:18](../../app/api/sales-photo-evidence/image/route.ts#L235) | Sales photo evidence image object is invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getInternal · message<br>(result.contentType !== 'image/webp' &amp;&amp; result.contentType !== 'image/jpeg') &#124;&#124; result.body.byteLength &lt;= 0 &#124;&#124; result.body.byteLength &gt; 1_000_000 |
| UI-e45b4d0ea743<br>[app/api/sales-photo-evidence/image/route.ts:283:18](../../app/api/sales-photo-evidence/image/route.ts#L283) | Sales photo evidence image route is temporarily unavailable. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | get · message<br>catch：操作拋出例外 |
| UI-7208826da508<br>[app/api/sales-photo-evidence/image/route.ts:339:30](../../app/api/sales-photo-evidence/image/route.ts#L339) | Sales photo evidence metadata lookup failed. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | getEvidenceRowFromSupabase<br>error |

## app/api/sales-photo-evidence/upload/route.ts

API 回應／伺服器來源（須確認客戶端是否顯示）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-12290009341e<br>[app/api/sales-photo-evidence/upload/route.ts:96:12](../../app/api/sales-photo-evidence/upload/route.ts#L96) | Sales photo evidence upload is not enabled yet. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | DISABLED_RESPONSE_BODY · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e7f2922809e2<br>[app/api/sales-photo-evidence/upload/route.ts:128:14](../../app/api/sales-photo-evidence/upload/route.ts#L128) | Sales photo evidence R2 upload is not enabled yet. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | disabledR2UploadResponse · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-344fdd09b0e4<br>[app/api/sales-photo-evidence/upload/route.ts:137:14](../../app/api/sales-photo-evidence/upload/route.ts#L137) | Sales photo evidence server mutation is temporarily unavailable. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | serverMutationUnavailableResponse · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-70573ebeceb5<br>[app/api/sales-photo-evidence/upload/route.ts:214:18](../../app/api/sales-photo-evidence/upload/route.ts#L214) | Sales photo evidence upload requires multipart form data. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | postInternal · message<br>!wantsR2Upload |
| UI-45cdd81f3932<br>[app/api/sales-photo-evidence/upload/route.ts:225:18](../../app/api/sales-photo-evidence/upload/route.ts#L225) | Sales photo evidence upload request is too large. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | postInternal · message<br>wantsR2Upload &amp;&amp; isMultipartRequestTooLarge(request) |
| UI-b8555ddd2573<br>[app/api/sales-photo-evidence/upload/route.ts:235:18](../../app/api/sales-photo-evidence/upload/route.ts#L235) | Sales photo evidence authentication is temporarily unavailable. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | postInternal · message<br>actor === 'unavailable' |
| UI-f5eddc1efae8<br>[app/api/sales-photo-evidence/upload/route.ts:243:18](../../app/api/sales-photo-evidence/upload/route.ts#L243) | Sales photo evidence upload requires an authenticated user. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | postInternal · message<br>!actor |
| UI-ac9f35413568<br>[app/api/sales-photo-evidence/upload/route.ts:267:18](../../app/api/sales-photo-evidence/upload/route.ts#L267) | Sales photo evidence upload route failed unexpectedly. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | post · message<br>catch：操作拋出例外 |
| UI-2b7e10831224<br>[app/api/sales-photo-evidence/upload/route.ts:367:18](../../app/api/sales-photo-evidence/upload/route.ts#L367) | Sales photo evidence test fault request is not authorized. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | handleFormDataUpload · message<br>faultDecision.action === 'reject' |
| UI-a93410e81cac<br>[app/api/sales-photo-evidence/upload/route.ts:448:18](../../app/api/sales-photo-evidence/upload/route.ts#L448) | Sales photo evidence image storage failed. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | handleFormDataUpload · message<br>!imageUpload.ok |
| UI-59d0d6991c68<br>[app/api/sales-photo-evidence/upload/route.ts:462:20](../../app/api/sales-photo-evidence/upload/route.ts#L462) | Controlled sales photo evidence thumbnail upload failure. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | thumbnailUpload · message<br>( faultDecision.action === 'inject' &amp;&amp; faultDecision.mode === 'thumbnail_upload_failed' ) |
| UI-702d50f57c4a<br>[app/api/sales-photo-evidence/upload/route.ts:491:18](../../app/api/sales-photo-evidence/upload/route.ts#L491) | Sales photo evidence thumbnail storage failed. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | handleFormDataUpload · message<br>!thumbnailUpload.ok |
| UI-5422d2a23a3f<br>[app/api/sales-photo-evidence/upload/route.ts:519:25](../../app/api/sales-photo-evidence/upload/route.ts#L519) | Controlled sales photo evidence metadata finalize failure. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | handleFormDataUpload<br>faultDecision.action === 'inject' &amp;&amp; faultDecision.mode === 'metadata_finalize_failed' |
| UI-ce9ad5c41226<br>[app/api/sales-photo-evidence/upload/route.ts:547:18](../../app/api/sales-photo-evidence/upload/route.ts#L547) | Sales photo evidence metadata finalize failed. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | handleFormDataUpload · message<br>catch：操作拋出例外 |
| UI-f3318b433c8d<br>[app/api/sales-photo-evidence/upload/route.ts:637:32](../../app/api/sales-photo-evidence/upload/route.ts#L637) | Authenticated Supabase client is unavailable. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | createRouteSupabaseClient<br>!client |

## app/settings/sales/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-009eb387613b<br>[app/settings/sales/page.tsx:26:13](../../app/settings/sales/page.tsx#L26) | 銷售與照片 | **畫面文字** · 直接呈現定義<br>SettingsPageShell：呈現操作說明、資料標籤、狀態或注意事項 | SalesSettingsPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b1cab5527be1<br>[app/settings/sales/page.tsx:27:19](../../app/settings/sales/page.tsx#L27) | 管理品牌顯示、成交照片預設值與現場互動記錄方式。 | **畫面文字** · 直接呈現定義<br>SettingsPageShell：呈現操作說明、資料標籤、狀態或注意事項 | SalesSettingsPage · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-148140acd1f8<br>[app/settings/sales/page.tsx:33:26](../../app/settings/sales/page.tsx#L33) | 正在確認權限 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | SalesSettingsPage · title<br>isLoading |
| UI-6e50c013dc93<br>[app/settings/sales/page.tsx:33:47](../../app/settings/sales/page.tsx#L33) | 完成後會顯示可調整的營業偏好。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | SalesSettingsPage · description<br>isLoading |
| UI-7f3cd121be05<br>[app/settings/sales/page.tsx:37:17](../../app/settings/sales/page.tsx#L37) | 此頁僅限老闆使用 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | SalesSettingsPage · title<br>否則 isLoading → !isOwner |
| UI-c8d6f4ee30c2<br>[app/settings/sales/page.tsx:38:23](../../app/settings/sales/page.tsx#L38) | 員工會沿用目前市集與團隊設定，不會看到全域營業偏好。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | SalesSettingsPage · description<br>否則 isLoading → !isOwner |

## components/common/OwnerRevenueGapRepairPanel.tsx

僅由測試／工具頁靜態引用

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-647343c6a607<br>[components/common/OwnerRevenueGapRepairPanel.tsx:30:19](../../components/common/OwnerRevenueGapRepairPanel.tsx#L30) | 請先登入 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleDryRun<br>!user |
| UI-5476488bd8d2<br>[components/common/OwnerRevenueGapRepairPanel.tsx:34:19](../../components/common/OwnerRevenueGapRepairPanel.tsx#L34) | 角色權限確認中，請稍候 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleDryRun<br>isRoleLoading |
| UI-5a8916603fe0<br>[components/common/OwnerRevenueGapRepairPanel.tsx:38:19](../../components/common/OwnerRevenueGapRepairPanel.tsx#L38) | 員工帳號不能執行收入修復 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleDryRun<br>isStaff |
| UI-655b8cee9b72<br>[components/common/OwnerRevenueGapRepairPanel.tsx:55:23](../../components/common/OwnerRevenueGapRepairPanel.tsx#L55) | 掃描完成，沒有需要修復的市場 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleDryRun<br>result.repaired.length === 0 &amp;&amp; result.skipped.length === 0 |
| UI-3337de566161<br>[components/common/OwnerRevenueGapRepairPanel.tsx:57:20](../../components/common/OwnerRevenueGapRepairPanel.tsx#L57) | 掃描完成，沒有符合安全修復條件的市場 | **確認／通知** · 直接呈現定義<br>toast.info：提示操作結果、進度或要求使用者確認 | handleDryRun<br>否則 result.repaired.length === 0 &amp;&amp; result.skipped.length === 0 → result.repaired.length === 0 |
| UI-8c1a6be53637<br>[components/common/OwnerRevenueGapRepairPanel.tsx:59:23](../../components/common/OwnerRevenueGapRepairPanel.tsx#L59) | 掃描完成，發現 ${result.repaired.length} 個市場可修復，${result.skipped.length} 個略過 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleDryRun<br>否則 result.repaired.length === 0 &amp;&amp; result.skipped.length === 0 → 否則 result.repaired.length === 0 |
| UI-f3b4d5d6c632<br>[components/common/OwnerRevenueGapRepairPanel.tsx:62:60](../../components/common/OwnerRevenueGapRepairPanel.tsx#L62) | 預覽失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleDryRun<br>catch：操作拋出例外 → 否則 error instanceof Error |
| UI-59ac68830695<br>[components/common/OwnerRevenueGapRepairPanel.tsx:69:19](../../components/common/OwnerRevenueGapRepairPanel.tsx#L69) | 請先登入 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleExecute<br>!user |
| UI-c82d836ff37a<br>[components/common/OwnerRevenueGapRepairPanel.tsx:73:19](../../components/common/OwnerRevenueGapRepairPanel.tsx#L73) | 角色權限確認中，請稍候 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleExecute<br>isRoleLoading |
| UI-2030ef4eac40<br>[components/common/OwnerRevenueGapRepairPanel.tsx:77:19](../../components/common/OwnerRevenueGapRepairPanel.tsx#L77) | 員工帳號不能執行收入修復 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleExecute<br>isStaff |
| UI-8c10d91b8170<br>[components/common/OwnerRevenueGapRepairPanel.tsx:83:7](../../components/common/OwnerRevenueGapRepairPanel.tsx#L83) | 即將修復 ${previewResult.repaired.length} 個市場的本機收入資料。\n\n | **確認／通知** · 直接呈現定義<br>window.confirm：提示操作結果、進度或要求使用者確認 | confirmed<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e1a45f8ac50b<br>[components/common/OwnerRevenueGapRepairPanel.tsx:84:9](../../components/common/OwnerRevenueGapRepairPanel.tsx#L84) | 此操作會從雲端重新下載 ${previewResult.repaired.reduce((s, m) =&gt; s + m.replayedEvents, 0)} 個 deal_closed 事件，並只重建本機統計。\n\n | **確認／通知** · 直接呈現定義<br>window.confirm：提示操作結果、進度或要求使用者確認 | confirmed<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-277ce1c360bd<br>[components/common/OwnerRevenueGapRepairPanel.tsx:85:9](../../components/common/OwnerRevenueGapRepairPanel.tsx#L85) | 不會修改雲端資料，也不會刪除事件。是否繼續？ | **確認／通知** · 直接呈現定義<br>window.confirm：提示操作結果、進度或要求使用者確認 | confirmed<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-195026fcba62<br>[components/common/OwnerRevenueGapRepairPanel.tsx:101:23](../../components/common/OwnerRevenueGapRepairPanel.tsx#L101) | 已修復 ${repairedCount} 個市場，請重新整理頁面確認收入 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleExecute<br>repairedCount &gt; 0 |
| UI-c7ebc1ad1e33<br>[components/common/OwnerRevenueGapRepairPanel.tsx:103:20](../../components/common/OwnerRevenueGapRepairPanel.tsx#L103) | 沒有市場需要修復 | **確認／通知** · 直接呈現定義<br>toast.info：提示操作結果、進度或要求使用者確認 | handleExecute<br>否則 repairedCount &gt; 0 |
| UI-22cfec07e96e<br>[components/common/OwnerRevenueGapRepairPanel.tsx:109:60](../../components/common/OwnerRevenueGapRepairPanel.tsx#L109) | 修復失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleExecute<br>catch：操作拋出例外 → 否則 error instanceof Error |
| UI-3bcdd0ca42e5<br>[components/common/OwnerRevenueGapRepairPanel.tsx:123:15](../../components/common/OwnerRevenueGapRepairPanel.tsx#L123) | 收入差距修復 | **畫面文字** · 直接呈現定義<br>BlockedPanel：呈現操作說明、資料標籤、狀態或注意事項 | OwnerRevenueGapRepairPanel · title<br>!isLoggedIn |
| UI-ebd4b869d91b<br>[components/common/OwnerRevenueGapRepairPanel.tsx:124:17](../../components/common/OwnerRevenueGapRepairPanel.tsx#L124) | 請先登入老闆帳號，才能檢查雲端事件與本機收入是否一致。 | **畫面文字** · 直接呈現定義<br>BlockedPanel：呈現操作說明、資料標籤、狀態或注意事項 | OwnerRevenueGapRepairPanel · message<br>!isLoggedIn |
| UI-e7cfa4c26816<br>[components/common/OwnerRevenueGapRepairPanel.tsx:133:15](../../components/common/OwnerRevenueGapRepairPanel.tsx#L133) | 收入差距修復 | **畫面文字** · 直接呈現定義<br>BlockedPanel：呈現操作說明、資料標籤、狀態或注意事項 | OwnerRevenueGapRepairPanel · title<br>isRoleLoading |
| UI-2137a5835c89<br>[components/common/OwnerRevenueGapRepairPanel.tsx:134:17](../../components/common/OwnerRevenueGapRepairPanel.tsx#L134) | 正在確認角色權限，請稍候。 | **畫面文字** · 直接呈現定義<br>BlockedPanel：呈現操作說明、資料標籤、狀態或注意事項 | OwnerRevenueGapRepairPanel · message<br>isRoleLoading |
| UI-c56dc995fcce<br>[components/common/OwnerRevenueGapRepairPanel.tsx:143:15](../../components/common/OwnerRevenueGapRepairPanel.tsx#L143) | 收入差距修復 | **畫面文字** · 直接呈現定義<br>BlockedPanel：呈現操作說明、資料標籤、狀態或注意事項 | OwnerRevenueGapRepairPanel · title<br>isStaff |
| UI-b7029ef0866c<br>[components/common/OwnerRevenueGapRepairPanel.tsx:144:17](../../components/common/OwnerRevenueGapRepairPanel.tsx#L144) | 員工帳號無法執行資料修復。請改用老闆帳號操作。 | **畫面文字** · 直接呈現定義<br>BlockedPanel：呈現操作說明、資料標籤、狀態或注意事項 | OwnerRevenueGapRepairPanel · message<br>isStaff |
| UI-245dc340dec6<br>[components/common/OwnerRevenueGapRepairPanel.tsx:166:69](../../components/common/OwnerRevenueGapRepairPanel.tsx#L166) | 收入差距修復 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | OwnerRevenueGapRepairPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b6d207d781bc<br>[components/common/OwnerRevenueGapRepairPanel.tsx:168:15](../../components/common/OwnerRevenueGapRepairPanel.tsx#L168) | 用於新裝置或重新登入後，本機收入低於雲端 deal_closed 事件的情況。工具會先預覽可修復市場，執行時只重建本機資料，不修改雲端。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | OwnerRevenueGapRepairPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d474e1873289<br>[components/common/OwnerRevenueGapRepairPanel.tsx:177:59](../../components/common/OwnerRevenueGapRepairPanel.tsx#L177) | 可修復 (${previewResult.repaired.length}) | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | OwnerRevenueGapRepairPanel<br>hasPreview &amp;&amp; previewResult → previewResult.repaired.length &gt; 0 |
| UI-5a75644ff9c7<br>[components/common/OwnerRevenueGapRepairPanel.tsx:180:45](../../components/common/OwnerRevenueGapRepairPanel.tsx#L180) | ${r.marketId.slice(0, 8)}... 收入 ${formatMoney(r.localRevenueBefore)} → ${formatMoney(r.localRevenueAfter)}， 重放 ${r.replayedEvents} 筆事件 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | OwnerRevenueGapRepairPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-322224275009<br>[components/common/OwnerRevenueGapRepairPanel.tsx:188:71](../../components/common/OwnerRevenueGapRepairPanel.tsx#L188) | 略過 (${previewResult.skipped.length}) | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | OwnerRevenueGapRepairPanel<br>hasPreview &amp;&amp; previewResult → previewResult.skipped.length &gt; 0 |
| UI-bff506b0f700<br>[components/common/OwnerRevenueGapRepairPanel.tsx:191:45](../../components/common/OwnerRevenueGapRepairPanel.tsx#L191) | ${s.marketId.slice(0, 8)}... — ${s.reason} | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | OwnerRevenueGapRepairPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-793fe00d863a<br>[components/common/OwnerRevenueGapRepairPanel.tsx:196:21](../../components/common/OwnerRevenueGapRepairPanel.tsx#L196) | ...還有 ${previewResult.skipped.length - 5} 個 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | OwnerRevenueGapRepairPanel<br>hasPreview &amp;&amp; previewResult → previewResult.skipped.length &gt; 0 → previewResult.skipped.length &gt; 5 |
| UI-1a2fcfa1775a<br>[components/common/OwnerRevenueGapRepairPanel.tsx:204:62](../../components/common/OwnerRevenueGapRepairPanel.tsx#L204) | ${warning} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | OwnerRevenueGapRepairPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-62d37a0c0836<br>[components/common/OwnerRevenueGapRepairPanel.tsx:220:15](../../components/common/OwnerRevenueGapRepairPanel.tsx#L220) | 預覽修復範圍 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | OwnerRevenueGapRepairPanel<br>state === 'idle' |
| UI-54b8d1eb0b54<br>[components/common/OwnerRevenueGapRepairPanel.tsx:225:31](../../components/common/OwnerRevenueGapRepairPanel.tsx#L225) | 掃描中... | **畫面文字** · 直接呈現定義<br>BusyButton：辨識可點擊操作、導覽或展開入口 | OwnerRevenueGapRepairPanel · label<br>state === 'checking' |
| UI-a3b9319c3329<br>[components/common/OwnerRevenueGapRepairPanel.tsx:237:19](../../components/common/OwnerRevenueGapRepairPanel.tsx#L237) | 執行修復 ( | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | OwnerRevenueGapRepairPanel<br>hasPreview → hasRepairs |
| UI-4df416f078e0<br>[components/common/OwnerRevenueGapRepairPanel.tsx:237:56](../../components/common/OwnerRevenueGapRepairPanel.tsx#L237) | ) | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | OwnerRevenueGapRepairPanel<br>hasPreview → hasRepairs |
| UI-488c3523f42d<br>[components/common/OwnerRevenueGapRepairPanel.tsx:245:17](../../components/common/OwnerRevenueGapRepairPanel.tsx#L245) | 取消 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | OwnerRevenueGapRepairPanel<br>hasPreview |
| UI-807e156c999e<br>[components/common/OwnerRevenueGapRepairPanel.tsx:251:31](../../components/common/OwnerRevenueGapRepairPanel.tsx#L251) | 修復中... | **畫面文字** · 直接呈現定義<br>BusyButton：辨識可點擊操作、導覽或展開入口 | OwnerRevenueGapRepairPanel · label<br>state === 'executing' |
| UI-d09eb2988da2<br>[components/common/OwnerRevenueGapRepairPanel.tsx:279:68](../../components/common/OwnerRevenueGapRepairPanel.tsx#L279) | ${title} | **動態文字入口** · 執行時綁定入口<br>h2 接收執行時文字；內容需追查所列綁定與生產端 | BlockedPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3ebb43ed3dbb<br>[components/common/OwnerRevenueGapRepairPanel.tsx:280:62](../../components/common/OwnerRevenueGapRepairPanel.tsx#L280) | ${message} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | BlockedPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0ba387f8df3b<br>[components/common/OwnerRevenueGapRepairPanel.tsx:299:8](../../components/common/OwnerRevenueGapRepairPanel.tsx#L299) | ${label} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | BusyButton<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/markets/AddRevenueDialog.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-2776fc294eb8<br>[components/markets/AddRevenueDialog.tsx:112:19](../../components/markets/AddRevenueDialog.tsx#L112) | 請輸入有效的收入金額 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleSimpleSubmit<br>!revenueNum &#124;&#124; revenueNum &lt;= 0 |
| UI-d8b8f6d0b512<br>[components/markets/AddRevenueDialog.tsx:117:19](../../components/markets/AddRevenueDialog.tsx#L117) | 成交次數必須大於 0 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleSimpleSubmit<br>dealCountNum &lt;= 0 |
| UI-07c7d9e539b1<br>[components/markets/AddRevenueDialog.tsx:135:31](../../components/markets/AddRevenueDialog.tsx#L135) | 補登收入 - ${formatDate(selectedDate)} | **來源候選** · 候選，非已證實提示<br>handleSimpleSubmit 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handleSimpleSubmit · notes<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7a7e8bab9aef<br>[components/markets/AddRevenueDialog.tsx:139:19](../../components/markets/AddRevenueDialog.tsx#L139) | 補登失敗，請稍後再試 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleSimpleSubmit<br>catch：操作拋出例外 |
| UI-549279e93c34<br>[components/markets/AddRevenueDialog.tsx:151:26](../../components/markets/AddRevenueDialog.tsx#L151) | 收入補登成功 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSimpleSubmit<br>否則 onSalesPhotoEvidenceResult |
| UI-d7264b36c5f1<br>[components/markets/AddRevenueDialog.tsx:151:51](../../components/markets/AddRevenueDialog.tsx#L151) | 已記錄到 ${formatDate(selectedDate)} | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSimpleSubmit · description<br>否則 onSalesPhotoEvidenceResult |
| UI-eefaeafbc676<br>[components/markets/AddRevenueDialog.tsx:154:21](../../components/markets/AddRevenueDialog.tsx#L154) | 補登已完成，照片可從待補照片處理 | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | handleSimpleSubmit<br>catch：操作拋出例外 |
| UI-0d30740534f1<br>[components/markets/AddRevenueDialog.tsx:203:19](../../components/markets/AddRevenueDialog.tsx#L203) | 請至少添加一個商品 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleFullSubmit<br>cart.length === 0 |
| UI-6b4ffa9ceb92<br>[components/markets/AddRevenueDialog.tsx:222:29](../../components/markets/AddRevenueDialog.tsx#L222) | 補登收入 - ${formatDate(selectedDate)} | **來源候選** · 候選，非已證實提示<br>handleFullSubmit 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handleFullSubmit · notes<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-06aad7da5286<br>[components/markets/AddRevenueDialog.tsx:226:19](../../components/markets/AddRevenueDialog.tsx#L226) | 補登失敗，請稍後再試 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleFullSubmit<br>catch：操作拋出例外 |
| UI-badab6084bbc<br>[components/markets/AddRevenueDialog.tsx:238:26](../../components/markets/AddRevenueDialog.tsx#L238) | 收入補登成功 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleFullSubmit<br>否則 onSalesPhotoEvidenceResult |
| UI-9487b1c40bc0<br>[components/markets/AddRevenueDialog.tsx:238:51](../../components/markets/AddRevenueDialog.tsx#L238) | 已記錄到 ${formatDate(selectedDate)} | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleFullSubmit · description<br>否則 onSalesPhotoEvidenceResult |
| UI-abf5c46d663c<br>[components/markets/AddRevenueDialog.tsx:241:21](../../components/markets/AddRevenueDialog.tsx#L241) | 補登已完成，照片可從待補照片處理 | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | handleFullSubmit<br>catch：操作拋出例外 |
| UI-20872443705b<br>[components/markets/AddRevenueDialog.tsx:266:73](../../components/markets/AddRevenueDialog.tsx#L266) | 補登收入 | **畫面文字** · 直接呈現定義<br>DialogTitle：辨識畫面、區塊或對話框主題 | AddRevenueDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1840d7829d0a<br>[components/markets/AddRevenueDialog.tsx:276:28](../../components/markets/AddRevenueDialog.tsx#L276) | 關閉補登收入視窗 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | AddRevenueDialog · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cb985400e82e<br>[components/markets/AddRevenueDialog.tsx:292:17](../../components/markets/AddRevenueDialog.tsx#L292) | 簡化輸入 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AddRevenueDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-19845f57a375<br>[components/markets/AddRevenueDialog.tsx:302:17](../../components/markets/AddRevenueDialog.tsx#L302) | 完整輸入 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AddRevenueDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-821d589698db<br>[components/markets/AddRevenueDialog.tsx:315:21](../../components/markets/AddRevenueDialog.tsx#L315) | 收入金額 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | AddRevenueDialog<br>mode === 'simple' |
| UI-3d79c2e626b3<br>[components/markets/AddRevenueDialog.tsx:315:56](../../components/markets/AddRevenueDialog.tsx#L315) | * | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AddRevenueDialog<br>mode === 'simple' |
| UI-f8ea945674e6<br>[components/markets/AddRevenueDialog.tsx:323:35](../../components/markets/AddRevenueDialog.tsx#L323) | 請輸入收入金額 | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | AddRevenueDialog · placeholder<br>mode === 'simple' |
| UI-b07df817c50a<br>[components/markets/AddRevenueDialog.tsx:327:23](../../components/markets/AddRevenueDialog.tsx#L327) | 元 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AddRevenueDialog<br>mode === 'simple' |
| UI-3858b60f30e0<br>[components/markets/AddRevenueDialog.tsx:341:21](../../components/markets/AddRevenueDialog.tsx#L341) | 成本金額（可選） | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | AddRevenueDialog<br>mode === 'simple' |
| UI-e853639ca924<br>[components/markets/AddRevenueDialog.tsx:349:35](../../components/markets/AddRevenueDialog.tsx#L349) | 請輸入成本金額 | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | AddRevenueDialog · placeholder<br>mode === 'simple' |
| UI-30bc3b107968<br>[components/markets/AddRevenueDialog.tsx:353:23](../../components/markets/AddRevenueDialog.tsx#L353) | 元 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AddRevenueDialog<br>mode === 'simple' |
| UI-bb1487de43de<br>[components/markets/AddRevenueDialog.tsx:358:23](../../components/markets/AddRevenueDialog.tsx#L358) | → 銷售利潤： | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | AddRevenueDialog<br>mode === 'simple' → revenue |
| UI-6b0be9e5f6c0<br>[components/markets/AddRevenueDialog.tsx:364:51](../../components/markets/AddRevenueDialog.tsx#L364) | 尚未扣除整場攤位費與設備租金。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AddRevenueDialog<br>mode === 'simple' → revenue |
| UI-ecf029bea515<br>[components/markets/AddRevenueDialog.tsx:372:21](../../components/markets/AddRevenueDialog.tsx#L372) | 成交次數 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | AddRevenueDialog<br>mode === 'simple' |
| UI-558da073cd33<br>[components/markets/AddRevenueDialog.tsx:372:56](../../components/markets/AddRevenueDialog.tsx#L372) | * | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AddRevenueDialog<br>mode === 'simple' |
| UI-973ecf7bb5b4<br>[components/markets/AddRevenueDialog.tsx:384:23](../../components/markets/AddRevenueDialog.tsx#L384) | 筆 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AddRevenueDialog<br>mode === 'simple' |
| UI-a09c3c499f60<br>[components/markets/AddRevenueDialog.tsx:392:21](../../components/markets/AddRevenueDialog.tsx#L392) | 備註（可選） | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | AddRevenueDialog<br>mode === 'simple' |
| UI-99b778b1aa71<br>[components/markets/AddRevenueDialog.tsx:398:33](../../components/markets/AddRevenueDialog.tsx#L398) | 輸入備註... | **輸入提示** · 直接呈現定義<br>在 textarea 提供輸入格式、範例或選擇提示 | AddRevenueDialog · placeholder<br>mode === 'simple' |
| UI-19f2d783cd36<br>[components/markets/AddRevenueDialog.tsx:408:55](../../components/markets/AddRevenueDialog.tsx#L408) | 💡 提示： | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AddRevenueDialog<br>mode === 'simple' |
| UI-a5e3bac55bcc<br>[components/markets/AddRevenueDialog.tsx:409:24](../../components/markets/AddRevenueDialog.tsx#L409) | 補登收入不會扣除商品庫存，僅用於記錄遺漏的收入資料。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AddRevenueDialog<br>mode === 'simple' |
| UI-bdbe6e2b7327<br>[components/markets/AddRevenueDialog.tsx:419:76](../../components/markets/AddRevenueDialog.tsx#L419) | 選擇商品 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | AddRevenueDialog<br>mode === 'full' |
| UI-bb57d6e73c81<br>[components/markets/AddRevenueDialog.tsx:428:28](../../components/markets/AddRevenueDialog.tsx#L428) | ${product.name} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | AddRevenueDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f3b2f847327b<br>[components/markets/AddRevenueDialog.tsx:441:78](../../components/markets/AddRevenueDialog.tsx#L441) | 購物車 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | AddRevenueDialog<br>mode === 'full' → cart.length &gt; 0 |
| UI-7dc5180a1d4b<br>[components/markets/AddRevenueDialog.tsx:450:32](../../components/markets/AddRevenueDialog.tsx#L450) | ${item.product.name} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | AddRevenueDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-91222fa17c1d<br>[components/markets/AddRevenueDialog.tsx:454:43](../../components/markets/AddRevenueDialog.tsx#L454) | 移除${item.product.name} | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | AddRevenueDialog · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4891230063e3<br>[components/markets/AddRevenueDialog.tsx:458:31](../../components/markets/AddRevenueDialog.tsx#L458) | 移除 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AddRevenueDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c2efc05cc150<br>[components/markets/AddRevenueDialog.tsx:465:140](../../components/markets/AddRevenueDialog.tsx#L465) | 數量 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | AddRevenueDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1eee805bceb9<br>[components/markets/AddRevenueDialog.tsx:469:47](../../components/markets/AddRevenueDialog.tsx#L469) | 減少${item.product.name}數量 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | AddRevenueDialog · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-80a9cc45da11<br>[components/markets/AddRevenueDialog.tsx:473:35](../../components/markets/AddRevenueDialog.tsx#L473) | - | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AddRevenueDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c7a69b4fee9e<br>[components/markets/AddRevenueDialog.tsx:477:47](../../components/markets/AddRevenueDialog.tsx#L477) | ${item.product.name}數量 | **輔助辨識** · 直接呈現定義<br>提供 input 的讀屏名稱、圖片替代文字或滑入說明 | AddRevenueDialog · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bc1115a3dc01<br>[components/markets/AddRevenueDialog.tsx:485:47](../../components/markets/AddRevenueDialog.tsx#L485) | 增加${item.product.name}數量 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | AddRevenueDialog · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0af5554278e9<br>[components/markets/AddRevenueDialog.tsx:489:35](../../components/markets/AddRevenueDialog.tsx#L489) | + | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AddRevenueDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-78df06f5003b<br>[components/markets/AddRevenueDialog.tsx:496:137](../../components/markets/AddRevenueDialog.tsx#L496) | 單價 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | AddRevenueDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-db884534a721<br>[components/markets/AddRevenueDialog.tsx:499:45](../../components/markets/AddRevenueDialog.tsx#L499) | ${item.product.name}單價 | **輔助辨識** · 直接呈現定義<br>提供 input 的讀屏名稱、圖片替代文字或滑入說明 | AddRevenueDialog · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-614250292528<br>[components/markets/AddRevenueDialog.tsx:509:77](../../components/markets/AddRevenueDialog.tsx#L509) | 小計： | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AddRevenueDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0bff06dffbf6<br>[components/markets/AddRevenueDialog.tsx:523:78](../../components/markets/AddRevenueDialog.tsx#L523) | 支付方式 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | AddRevenueDialog<br>mode === 'full' → cart.length &gt; 0 |
| UI-315bd9f95813<br>[components/markets/AddRevenueDialog.tsx:535:117](../../components/markets/AddRevenueDialog.tsx#L535) | 備註（可選） | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | AddRevenueDialog<br>mode === 'full' → cart.length &gt; 0 |
| UI-496994ce8669<br>[components/markets/AddRevenueDialog.tsx:540:35](../../components/markets/AddRevenueDialog.tsx#L540) | 輸入備註... | **輸入提示** · 直接呈現定義<br>在 textarea 提供輸入格式、範例或選擇提示 | AddRevenueDialog · placeholder<br>mode === 'full' → cart.length &gt; 0 |
| UI-9f21f720d1ac<br>[components/markets/AddRevenueDialog.tsx:551:55](../../components/markets/AddRevenueDialog.tsx#L551) | 💡 提示： | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AddRevenueDialog<br>mode === 'full' |
| UI-d323679d6a6e<br>[components/markets/AddRevenueDialog.tsx:552:24](../../components/markets/AddRevenueDialog.tsx#L552) | 補登收入不會扣除商品庫存，僅用於記錄遺漏的收入資料。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | AddRevenueDialog<br>mode === 'full' |
| UI-b8f7386a5985<br>[components/markets/AddRevenueDialog.tsx:564:61](../../components/markets/AddRevenueDialog.tsx#L564) | 收入金額 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AddRevenueDialog<br>mode === 'simple' |
| UI-b54397fc8a8c<br>[components/markets/AddRevenueDialog.tsx:575:37](../../components/markets/AddRevenueDialog.tsx#L575) | 處理中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AddRevenueDialog<br>mode === 'simple' → isSubmitting |
| UI-d98202a2ef9e<br>[components/markets/AddRevenueDialog.tsx:575:48](../../components/markets/AddRevenueDialog.tsx#L575) | 確認補登 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AddRevenueDialog<br>mode === 'simple' → 否則 isSubmitting |
| UI-ecec11059c64<br>[components/markets/AddRevenueDialog.tsx:581:61](../../components/markets/AddRevenueDialog.tsx#L581) | 總金額 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AddRevenueDialog<br>否則 mode === 'simple' |
| UI-d2f18fe94e9a<br>[components/markets/AddRevenueDialog.tsx:592:37](../../components/markets/AddRevenueDialog.tsx#L592) | 處理中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AddRevenueDialog<br>否則 mode === 'simple' → isSubmitting |
| UI-6f9a99006902<br>[components/markets/AddRevenueDialog.tsx:592:48](../../components/markets/AddRevenueDialog.tsx#L592) | 確認補登 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | AddRevenueDialog<br>否則 mode === 'simple' → 否則 isSubmitting |

## components/markets/DailyDealsModal.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-f58fef939b0e<br>[components/markets/DailyDealsModal.tsx:34:23](../../components/markets/DailyDealsModal.tsx#L34) | 日 | **來源候選** · 候選，非已證實提示<br>weekdays 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | weekdays<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-14783f0a0fce<br>[components/markets/DailyDealsModal.tsx:34:28](../../components/markets/DailyDealsModal.tsx#L34) | 一 | **來源候選** · 候選，非已證實提示<br>weekdays 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | weekdays<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1bfa60cc0176<br>[components/markets/DailyDealsModal.tsx:34:33](../../components/markets/DailyDealsModal.tsx#L34) | 二 | **來源候選** · 候選，非已證實提示<br>weekdays 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | weekdays<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-06dea45a02be<br>[components/markets/DailyDealsModal.tsx:34:38](../../components/markets/DailyDealsModal.tsx#L34) | 三 | **來源候選** · 候選，非已證實提示<br>weekdays 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | weekdays<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5de3486fd252<br>[components/markets/DailyDealsModal.tsx:34:43](../../components/markets/DailyDealsModal.tsx#L34) | 四 | **來源候選** · 候選，非已證實提示<br>weekdays 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | weekdays<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1700b4cc33ed<br>[components/markets/DailyDealsModal.tsx:34:48](../../components/markets/DailyDealsModal.tsx#L34) | 五 | **來源候選** · 候選，非已證實提示<br>weekdays 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | weekdays<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-91b06ac18045<br>[components/markets/DailyDealsModal.tsx:34:53](../../components/markets/DailyDealsModal.tsx#L34) | 六 | **來源候選** · 候選，非已證實提示<br>weekdays 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | weekdays<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-da2f50ba2091<br>[components/markets/DailyDealsModal.tsx:54:23](../../components/markets/DailyDealsModal.tsx#L54) | 🧾 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DailyDealsModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e886bc1ff949<br>[components/markets/DailyDealsModal.tsx:55:36](../../components/markets/DailyDealsModal.tsx#L55) | 成交記錄 | **畫面文字** · 直接呈現定義<br>DialogTitle：辨識畫面、區塊或對話框主題 | DailyDealsModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8adc6e73887d<br>[components/markets/DailyDealsModal.tsx:58:17](../../components/markets/DailyDealsModal.tsx#L58) | 共 ${deals.length} 筆 · 總收入 NT$ ${totalRevenue.toLocaleString()} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyDealsModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c5ca29111b5e<br>[components/markets/DailyDealsModal.tsx:63:26](../../components/markets/DailyDealsModal.tsx#L63) | 關閉成交記錄 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | DailyDealsModal · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2d1ad07e60a2<br>[components/markets/DailyDealsModal.tsx:75:44](../../components/markets/DailyDealsModal.tsx#L75) | 📭 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DailyDealsModal<br>deals.length === 0 |
| UI-b173a80493e3<br>[components/markets/DailyDealsModal.tsx:76:59](../../components/markets/DailyDealsModal.tsx#L76) | 此日期尚無成交記錄 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyDealsModal<br>deals.length === 0 |
| UI-146cdda3d858<br>[components/markets/DailyDealsModal.tsx:78:19](../../components/markets/DailyDealsModal.tsx#L78) | 可以使用「補登」功能新增記錄 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyDealsModal<br>deals.length === 0 |
| UI-df89f1373298<br>[components/markets/DailyDealsModal.tsx:102:15](../../components/markets/DailyDealsModal.tsx#L102) | 關閉 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DailyDealsModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/markets/DailyRevenueStats.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-31a62ac40ed3<br>[components/markets/DailyRevenueStats.tsx:206:13](../../components/markets/DailyRevenueStats.tsx#L206) | 營運節奏 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7493d851bb3b<br>[components/markets/DailyRevenueStats.tsx:209:28](../../components/markets/DailyRevenueStats.tsx#L209) | 收入明細 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | DailyRevenueStats<br>isSingleDay |
| UI-8da2b62f86ae<br>[components/markets/DailyRevenueStats.tsx:209:37](../../components/markets/DailyRevenueStats.tsx#L209) | 每日表現 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | DailyRevenueStats<br>否則 isSingleDay |
| UI-228f91cc8db2<br>[components/markets/DailyRevenueStats.tsx:214:13](../../components/markets/DailyRevenueStats.tsx#L214) | 共 ${dateRange.length} 天 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>!isSingleDay |
| UI-c4f423cfc164<br>[components/markets/DailyRevenueStats.tsx:221:107](../../components/markets/DailyRevenueStats.tsx#L221) | 每日表現顯示範圍 | **輔助辨識** · 直接呈現定義<br>提供 div 的讀屏名稱、圖片替代文字或滑入說明 | DailyRevenueStats · aria-label<br>!isEmptyReview &amp;&amp; !isSingleDay &amp;&amp; dateRange.length &gt; 5 |
| UI-a512502fdccf<br>[components/markets/DailyRevenueStats.tsx:223:16](../../components/markets/DailyRevenueStats.tsx#L223) | recorded | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>!isEmptyReview &amp;&amp; !isSingleDay &amp;&amp; dateRange.length &gt; 5 |
| UI-c5bdf8e8c225<br>[components/markets/DailyRevenueStats.tsx:223:28](../../components/markets/DailyRevenueStats.tsx#L223) | 有紀錄 ${recordedDays.length} | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>!isEmptyReview &amp;&amp; !isSingleDay &amp;&amp; dateRange.length &gt; 5 |
| UI-44926730dbe1<br>[components/markets/DailyRevenueStats.tsx:224:16](../../components/markets/DailyRevenueStats.tsx#L224) | all | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>!isEmptyReview &amp;&amp; !isSingleDay &amp;&amp; dateRange.length &gt; 5 |
| UI-a3b2cdcb6939<br>[components/markets/DailyRevenueStats.tsx:224:23](../../components/markets/DailyRevenueStats.tsx#L224) | 全部 ${dailyData.length} | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>!isEmptyReview &amp;&amp; !isSingleDay &amp;&amp; dateRange.length &gt; 5 |
| UI-4b5f5c4a1402<br>[components/markets/DailyRevenueStats.tsx:225:16](../../components/markets/DailyRevenueStats.tsx#L225) | empty | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>!isEmptyReview &amp;&amp; !isSingleDay &amp;&amp; dateRange.length &gt; 5 |
| UI-4c6aec3fe963<br>[components/markets/DailyRevenueStats.tsx:225:25](../../components/markets/DailyRevenueStats.tsx#L225) | 尚無紀錄 ${emptyPastDays.length} | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>!isEmptyReview &amp;&amp; !isSingleDay &amp;&amp; dateRange.length &gt; 5 |
| UI-75f679cb5f94<br>[components/markets/DailyRevenueStats.tsx:238:18](../../components/markets/DailyRevenueStats.tsx#L238) | ${label} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | DailyRevenueStats<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cf78f7325109<br>[components/markets/DailyRevenueStats.tsx:247:64](../../components/markets/DailyRevenueStats.tsx#L247) | 這場市集尚無營運紀錄 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>isEmptyReview |
| UI-3b9ad6f08aaa<br>[components/markets/DailyRevenueStats.tsx:249:13](../../components/markets/DailyRevenueStats.tsx#L249) | 目前沒有收入、成交或顧客互動資料。可補登最近場次，或展開日期確認各日狀態。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>isEmptyReview |
| UI-7127d29dbf7c<br>[components/markets/DailyRevenueStats.tsx:259:17](../../components/markets/DailyRevenueStats.tsx#L259) | 補登最近場次 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DailyRevenueStats<br>isEmptyReview → canAddRevenue &amp;&amp; latestRecordableDate |
| UI-2631d93de125<br>[components/markets/DailyRevenueStats.tsx:268:39](../../components/markets/DailyRevenueStats.tsx#L268) | 收合日期 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DailyRevenueStats<br>isEmptyReview → showEmptyReviewDates |
| UI-ff1247f2c72a<br>[components/markets/DailyRevenueStats.tsx:268:48](../../components/markets/DailyRevenueStats.tsx#L268) | 查看全部日期 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DailyRevenueStats<br>isEmptyReview → 否則 showEmptyReviewDates |
| UI-d3a08e0baac8<br>[components/markets/DailyRevenueStats.tsx:280:80](../../components/markets/DailyRevenueStats.tsx#L280) | 這個篩選條件目前沒有日期。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>(!isEmptyReview &#124;&#124; showEmptyReviewDates) → visibleDailyData.length === 0 |
| UI-81d40755c436<br>[components/markets/DailyRevenueStats.tsx:286:15](../../components/markets/DailyRevenueStats.tsx#L286) | 查看 ${recordCount} 筆${recordCount === day.deals ? '成交' : '紀錄'} | **來源候選** · 候選，非已證實提示<br>viewLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | viewLabel<br>dealRecordCountByDate |
| UI-d2364e87db8d<br>[components/markets/DailyRevenueStats.tsx:286:65](../../components/markets/DailyRevenueStats.tsx#L286) | 成交 | **來源候選** · 候選，非已證實提示<br>viewLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | viewLabel<br>dealRecordCountByDate → recordCount === day.deals |
| UI-7238de81fae1<br>[components/markets/DailyRevenueStats.tsx:286:72](../../components/markets/DailyRevenueStats.tsx#L286) | 紀錄 | **來源候選** · 候選，非已證實提示<br>viewLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | viewLabel<br>dealRecordCountByDate → 否則 recordCount === day.deals |
| UI-cca669944d87<br>[components/markets/DailyRevenueStats.tsx:287:15](../../components/markets/DailyRevenueStats.tsx#L287) | 查看成交紀錄 | **來源候選** · 候選，非已證實提示<br>viewLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | viewLabel<br>否則 dealRecordCountByDate |
| UI-3cc9d1ec3cc5<br>[components/markets/DailyRevenueStats.tsx:310:104](../../components/markets/DailyRevenueStats.tsx#L310) | 今天 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>isToday |
| UI-6954d7a87894<br>[components/markets/DailyRevenueStats.tsx:311:120](../../components/markets/DailyRevenueStats.tsx#L311) | 尚未開始 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>isFuture |
| UI-f30393ebe757<br>[components/markets/DailyRevenueStats.tsx:316:72](../../components/markets/DailyRevenueStats.tsx#L316) | 當日收入 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8d22483ae129<br>[components/markets/DailyRevenueStats.tsx:326:27](../../components/markets/DailyRevenueStats.tsx#L326) | 銷售利潤 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>否則 hideProfit |
| UI-7a0324326467<br>[components/markets/DailyRevenueStats.tsx:332:25](../../components/markets/DailyRevenueStats.tsx#L332) | 成交 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-829d45d9f4fd<br>[components/markets/DailyRevenueStats.tsx:332:103](../../components/markets/DailyRevenueStats.tsx#L332) | ${day.deals} 筆 | **畫面文字** · 直接呈現定義<br>strong：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-90e0c4116c55<br>[components/markets/DailyRevenueStats.tsx:344:35](../../components/markets/DailyRevenueStats.tsx#L344) | ${formatDate(day.date)} ${viewLabel} | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | DailyRevenueStats · aria-label<br>!isFuture |
| UI-91048eb7f54f<br>[components/markets/DailyRevenueStats.tsx:347:24](../../components/markets/DailyRevenueStats.tsx#L347) | ${viewLabel} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | DailyRevenueStats<br>!isFuture |
| UI-21ba634015cd<br>[components/markets/DailyRevenueStats.tsx:354:31](../../components/markets/DailyRevenueStats.tsx#L354) | 補登收入 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | DailyRevenueStats · title<br>!isFuture → canAddRevenue |
| UI-095bea039ff2<br>[components/markets/DailyRevenueStats.tsx:355:37](../../components/markets/DailyRevenueStats.tsx#L355) | ${formatDate(day.date)}補登收入 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | DailyRevenueStats · aria-label<br>!isFuture → canAddRevenue |
| UI-6bc5a4f8f633<br>[components/markets/DailyRevenueStats.tsx:358:25](../../components/markets/DailyRevenueStats.tsx#L358) | 補登收入 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DailyRevenueStats<br>!isFuture → canAddRevenue |
| UI-282d30ece1d5<br>[components/markets/DailyRevenueStats.tsx:367:27](../../components/markets/DailyRevenueStats.tsx#L367) | 互動 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>showInteractions &amp;&amp; interactionButtons.length &gt; 0 &amp;&amp; !isFuture |
| UI-6c0fbfd20306<br>[components/markets/DailyRevenueStats.tsx:373:30](../../components/markets/DailyRevenueStats.tsx#L373) | ${button.label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | DailyRevenueStats<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-195fcfe8bf33<br>[components/markets/DailyRevenueStats.tsx:377:29](../../components/markets/DailyRevenueStats.tsx#L377) | 無紀錄 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>showInteractions &amp;&amp; interactionButtons.length &gt; 0 &amp;&amp; !isFuture → 否則 Object.values(day.interactions).some((count) =&gt; count &gt; 0) |
| UI-f4500179f5f6<br>[components/markets/DailyRevenueStats.tsx:391:60](../../components/markets/DailyRevenueStats.tsx#L391) | 這場市集合計 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>showTotals &amp;&amp; !isSingleDay &amp;&amp; !isEmptyReview |
| UI-c00f1a192fe8<br>[components/markets/DailyRevenueStats.tsx:397:17](../../components/markets/DailyRevenueStats.tsx#L397) | 銷售利潤合計 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>showTotals &amp;&amp; !isSingleDay &amp;&amp; !isEmptyReview → 否則 hideProfit |
| UI-37944afa3d71<br>[components/markets/DailyRevenueStats.tsx:403:15](../../components/markets/DailyRevenueStats.tsx#L403) | 總成交 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>showTotals &amp;&amp; !isSingleDay &amp;&amp; !isEmptyReview |
| UI-6b992fe45d22<br>[components/markets/DailyRevenueStats.tsx:403:107](../../components/markets/DailyRevenueStats.tsx#L403) | ${dailyTotals.totalDeals} 筆 | **畫面文字** · 直接呈現定義<br>strong：呈現操作說明、資料標籤、狀態或注意事項 | DailyRevenueStats<br>showTotals &amp;&amp; !isSingleDay &amp;&amp; !isEmptyReview |

## components/markets/DailyTransactionLog.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-57034a1d69c2<br>[components/markets/DailyTransactionLog.tsx:67:11](../../components/markets/DailyTransactionLog.tsx#L67) | 當日流水帳 | **來源候選** · 候選，非已證實提示<br>DailyTransactionLog 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | DailyTransactionLog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-35e2beb884de<br>[components/markets/DailyTransactionLog.tsx:136:27](../../components/markets/DailyTransactionLog.tsx#L136) | 成交 | **來源候選** · 候選，非已證實提示<br>description 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a52eb49a2ba5<br>[components/markets/DailyTransactionLog.tsx:139:25](../../components/markets/DailyTransactionLog.tsx#L139) | 手動輸入 - ${getDealEventCount(event)} 筆 | **來源候選** · 候選，非已證實提示<br>loadDailyLog 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | loadDailyLog<br>isManualDealEvent(event) |
| UI-b8f57b633132<br>[components/markets/DailyTransactionLog.tsx:142:25](../../components/markets/DailyTransactionLog.tsx#L142) | ${items.length} 項商品，共 ${itemCount} 件 | **來源候選** · 候選，非已證實提示<br>loadDailyLog 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | loadDailyLog<br>否則 isManualDealEvent(event) → items.length &gt; 0 |
| UI-245865f09ffc<br>[components/markets/DailyTransactionLog.tsx:216:21](../../components/markets/DailyTransactionLog.tsx#L216) | 記錄已刪除並同步到雲端 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleDeleteLog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0be2c245ff0b<br>[components/markets/DailyTransactionLog.tsx:219:19](../../components/markets/DailyTransactionLog.tsx#L219) | 刪除失敗，請稍後再試 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleDeleteLog<br>catch：操作拋出例外 |
| UI-c8cbe00d8327<br>[components/markets/DailyTransactionLog.tsx:237:12](../../components/markets/DailyTransactionLog.tsx#L237) | ${title} | **動態文字入口** · 執行時綁定入口<br>h2 接收執行時文字；內容需追查所列綁定與生產端 | DailyTransactionLog<br>isLoading |
| UI-5632629af529<br>[components/markets/DailyTransactionLog.tsx:241:61](../../components/markets/DailyTransactionLog.tsx#L241) | 載入中... | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>isLoading |
| UI-02c4dd086f54<br>[components/markets/DailyTransactionLog.tsx:253:12](../../components/markets/DailyTransactionLog.tsx#L253) | ${title} | **動態文字入口** · 執行時綁定入口<br>h2 接收執行時文字；內容需追查所列綁定與生產端 | DailyTransactionLog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-73b0d7da1fbb<br>[components/markets/DailyTransactionLog.tsx:264:63](../../components/markets/DailyTransactionLog.tsx#L264) | 成交 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>showSummary |
| UI-b18261fbecec<br>[components/markets/DailyTransactionLog.tsx:268:63](../../components/markets/DailyTransactionLog.tsx#L268) | 互動 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>showSummary |
| UI-3ee906a018bd<br>[components/markets/DailyTransactionLog.tsx:272:63](../../components/markets/DailyTransactionLog.tsx#L272) | 收入 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>showSummary |
| UI-e8cb7de03ac0<br>[components/markets/DailyTransactionLog.tsx:281:58](../../components/markets/DailyTransactionLog.tsx#L281) | 今日尚無交易記錄 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>logs.length === 0 |
| UI-6129802eadd2<br>[components/markets/DailyTransactionLog.tsx:282:82](../../components/markets/DailyTransactionLog.tsx#L282) | 完成第一筆收款或互動後會顯示在這裡。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>logs.length === 0 → compactEmpty |
| UI-123e01c330f3<br>[components/markets/DailyTransactionLog.tsx:298:22](../../components/markets/DailyTransactionLog.tsx#L298) | ${log.description} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | DailyTransactionLog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-667c9af47698<br>[components/markets/DailyTransactionLog.tsx:318:27](../../components/markets/DailyTransactionLog.tsx#L318) | 刪除記錄 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | DailyTransactionLog · title<br>canDeleteDailyLogEntry(allowDelete) |
| UI-6fb72e3ef93f<br>[components/markets/DailyTransactionLog.tsx:332:53](../../components/markets/DailyTransactionLog.tsx#L332) | 顯示最近 ${visibleLogs.length} 筆 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>logs.length &gt; 0 → visibleLogs.length &lt; logs.length |
| UI-562ac46af9e1<br>[components/markets/DailyTransactionLog.tsx:332:86](../../components/markets/DailyTransactionLog.tsx#L332) | 共 ${logs.length} 筆記錄 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>logs.length &gt; 0 → 否則 visibleLogs.length &lt; logs.length |
| UI-bd24de61adc2<br>[components/markets/DailyTransactionLog.tsx:335:15](../../components/markets/DailyTransactionLog.tsx#L335) | 查看全部 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DailyTransactionLog<br>logs.length &gt; 0 → visibleLogs.length &lt; logs.length &amp;&amp; onViewAll |
| UI-a69925572207<br>[components/markets/DailyTransactionLog.tsx:338:19](../../components/markets/DailyTransactionLog.tsx#L338) | 即時更新 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>logs.length &gt; 0 → 否則 visibleLogs.length &lt; logs.length &amp;&amp; onViewAll |
| UI-6be70135529d<br>[components/markets/DailyTransactionLog.tsx:363:17](../../components/markets/DailyTransactionLog.tsx#L363) | 確認刪除記錄？ | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | DailyTransactionLog<br>canDeleteDailyLogEntry(allowDelete) &amp;&amp; showDeleteConfirm &amp;&amp; isMounted &amp;&amp; selectedLog |
| UI-7c9fbfe2ef47<br>[components/markets/DailyTransactionLog.tsx:368:21](../../components/markets/DailyTransactionLog.tsx#L368) | 刪除此成交記錄後，將會： | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>canDeleteDailyLogEntry(allowDelete) &amp;&amp; showDeleteConfirm &amp;&amp; isMounted &amp;&amp; selectedLog → selectedLog.type === 'deal' |
| UI-99523b641519<br>[components/markets/DailyTransactionLog.tsx:370:21](../../components/markets/DailyTransactionLog.tsx#L370) | • 扣除收入 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>canDeleteDailyLogEntry(allowDelete) &amp;&amp; showDeleteConfirm &amp;&amp; isMounted &amp;&amp; selectedLog → selectedLog.type === 'deal' |
| UI-c9975f5b11fb<br>[components/markets/DailyTransactionLog.tsx:372:21](../../components/markets/DailyTransactionLog.tsx#L372) | • 更新市集統計 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>canDeleteDailyLogEntry(allowDelete) &amp;&amp; showDeleteConfirm &amp;&amp; isMounted &amp;&amp; selectedLog → selectedLog.type === 'deal' |
| UI-d67e30449530<br>[components/markets/DailyTransactionLog.tsx:374:21](../../components/markets/DailyTransactionLog.tsx#L374) | • 同步到雲端 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>canDeleteDailyLogEntry(allowDelete) &amp;&amp; showDeleteConfirm &amp;&amp; isMounted &amp;&amp; selectedLog → selectedLog.type === 'deal' |
| UI-b5619debe5e5<br>[components/markets/DailyTransactionLog.tsx:378:21](../../components/markets/DailyTransactionLog.tsx#L378) | 刪除此互動記錄後，將會： | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>canDeleteDailyLogEntry(allowDelete) &amp;&amp; showDeleteConfirm &amp;&amp; isMounted &amp;&amp; selectedLog → 否則 selectedLog.type === 'deal' |
| UI-0636eb9d81ec<br>[components/markets/DailyTransactionLog.tsx:380:21](../../components/markets/DailyTransactionLog.tsx#L380) | • 從流水帳中移除 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>canDeleteDailyLogEntry(allowDelete) &amp;&amp; showDeleteConfirm &amp;&amp; isMounted &amp;&amp; selectedLog → 否則 selectedLog.type === 'deal' |
| UI-a7f73fa5b2dc<br>[components/markets/DailyTransactionLog.tsx:382:21](../../components/markets/DailyTransactionLog.tsx#L382) | • 同步到雲端 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>canDeleteDailyLogEntry(allowDelete) &amp;&amp; showDeleteConfirm &amp;&amp; isMounted &amp;&amp; selectedLog → 否則 selectedLog.type === 'deal' |
| UI-88ddc6da39c9<br>[components/markets/DailyTransactionLog.tsx:391:66](../../components/markets/DailyTransactionLog.tsx#L391) | ${selectedLog.description} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | DailyTransactionLog<br>canDeleteDailyLogEntry(allowDelete) &amp;&amp; showDeleteConfirm &amp;&amp; isMounted &amp;&amp; selectedLog |
| UI-c21a2e397482<br>[components/markets/DailyTransactionLog.tsx:398:46](../../components/markets/DailyTransactionLog.tsx#L398) | • | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DailyTransactionLog<br>canDeleteDailyLogEntry(allowDelete) &amp;&amp; showDeleteConfirm &amp;&amp; isMounted &amp;&amp; selectedLog → selectedLog.amount |
| UI-e76448168fa2<br>[components/markets/DailyTransactionLog.tsx:414:19](../../components/markets/DailyTransactionLog.tsx#L414) | 取消 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DailyTransactionLog<br>canDeleteDailyLogEntry(allowDelete) &amp;&amp; showDeleteConfirm &amp;&amp; isMounted &amp;&amp; selectedLog |
| UI-b1c54648dcea<br>[components/markets/DailyTransactionLog.tsx:421:33](../../components/markets/DailyTransactionLog.tsx#L421) | 刪除中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DailyTransactionLog<br>canDeleteDailyLogEntry(allowDelete) &amp;&amp; showDeleteConfirm &amp;&amp; isMounted &amp;&amp; selectedLog → isDeleting |
| UI-9ecb69e3738e<br>[components/markets/DailyTransactionLog.tsx:421:44](../../components/markets/DailyTransactionLog.tsx#L421) | 確認刪除 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DailyTransactionLog<br>canDeleteDailyLogEntry(allowDelete) &amp;&amp; showDeleteConfirm &amp;&amp; isMounted &amp;&amp; selectedLog → 否則 isDeleting |

## components/markets/DealDetailModal.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-fdd76c899773<br>[components/markets/DealDetailModal.tsx:73:11](../../components/markets/DealDetailModal.tsx#L73) | 現金 | **來源候選** · 候選，非已證實提示<br>paymentLabels 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | paymentLabels · cash<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d70488e845ac<br>[components/markets/DealDetailModal.tsx:74:11](../../components/markets/DealDetailModal.tsx#L74) | 信用卡 | **來源候選** · 候選，非已證實提示<br>paymentLabels 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | paymentLabels · card<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ef8d45072983<br>[components/markets/DealDetailModal.tsx:75:13](../../components/markets/DealDetailModal.tsx#L75) | 行動支付 | **來源候選** · 候選，非已證實提示<br>paymentLabels 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | paymentLabels · mobile<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-27d9d5dd561d<br>[components/markets/DealDetailModal.tsx:76:12](../../components/markets/DealDetailModal.tsx#L76) | 其他 | **來源候選** · 候選，非已證實提示<br>paymentLabels 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | paymentLabels · other<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-592eba84a9b8<br>[components/markets/DealDetailModal.tsx:81:38](../../components/markets/DealDetailModal.tsx#L81) | 確定要刪除這筆成交記錄嗎？此操作無法恢復。 | **確認／通知** · 直接呈現定義<br>window.confirm：提示操作結果、進度或要求使用者確認 | handleDelete<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0f22b2c28d92<br>[components/markets/DealDetailModal.tsx:91:13](../../components/markets/DealDetailModal.tsx#L91) | 刪除失敗，請稍後再試 | **確認／通知** · 直接呈現定義<br>alert：提示操作結果、進度或要求使用者確認 | handleDelete<br>catch：操作拋出例外 |
| UI-11593b411104<br>[components/markets/DealDetailModal.tsx:109:15](../../components/markets/DealDetailModal.tsx#L109) | 成交詳情 | **畫面文字** · 直接呈現定義<br>DialogTitle：辨識畫面、區塊或對話框主題 | DealDetailModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-eb489629e839<br>[components/markets/DealDetailModal.tsx:113:26](../../components/markets/DealDetailModal.tsx#L113) | 關閉成交詳情 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | DealDetailModal · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-35eeb46733e7<br>[components/markets/DealDetailModal.tsx:128:19](../../components/markets/DealDetailModal.tsx#L128) | 成交時間 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fc004daff094<br>[components/markets/DealDetailModal.tsx:133:69](../../components/markets/DealDetailModal.tsx#L133) | 支付方式 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f94d48cb96f8<br>[components/markets/DealDetailModal.tsx:136:26](../../components/markets/DealDetailModal.tsx#L136) | ${paymentLabels[paymentMethod]} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | DealDetailModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ae9c63ed126d<br>[components/markets/DealDetailModal.tsx:148:19](../../components/markets/DealDetailModal.tsx#L148) | 成交照片 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | DealDetailModal<br>photoEvidence |
| UI-1627ea8c16ee<br>[components/markets/DealDetailModal.tsx:154:25](../../components/markets/DealDetailModal.tsx#L154) | 此筆成交的成交照片 | **輔助辨識** · 直接呈現定義<br>提供 SalesPhotoEvidenceOwnerAlbumImage 的讀屏名稱、圖片替代文字或滑入說明 | DealDetailModal · alt<br>photoEvidence |
| UI-628312c31370<br>[components/markets/DealDetailModal.tsx:164:28](../../components/markets/DealDetailModal.tsx#L164) | 成交照片已過期 | **輔助辨識** · 直接呈現定義<br>提供 section 的讀屏名稱、圖片替代文字或滑入說明 | DealDetailModal · aria-label<br>!photoEvidence &amp;&amp; expiredPhotoEvidence |
| UI-71a08d56e64b<br>[components/markets/DealDetailModal.tsx:170:72](../../components/markets/DealDetailModal.tsx#L170) | 成交照片已過期 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>!photoEvidence &amp;&amp; expiredPhotoEvidence |
| UI-8670fa149b33<br>[components/markets/DealDetailModal.tsx:173:27](../../components/markets/DealDetailModal.tsx#L173) | 照片已超過七天保留期限並完成雲端清理；成交紀錄與營收統計仍會保留。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>!photoEvidence &amp;&amp; expiredPhotoEvidence → expiredPhotoEvidence.cleanupCompleted |
| UI-f4f059dc30c1<br>[components/markets/DealDetailModal.tsx:174:27](../../components/markets/DealDetailModal.tsx#L174) | 照片已超過七天保留期限並停止查看，雲端檔案正在等待清理。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>!photoEvidence &amp;&amp; expiredPhotoEvidence → 否則 expiredPhotoEvidence.cleanupCompleted |
| UI-5b2113e44051<br>[components/markets/DealDetailModal.tsx:184:23](../../components/markets/DealDetailModal.tsx#L184) | 📦 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b003fce5eb2d<br>[components/markets/DealDetailModal.tsx:185:17](../../components/markets/DealDetailModal.tsx#L185) | 商品明細 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-af10fa48413a<br>[components/markets/DealDetailModal.tsx:197:65](../../components/markets/DealDetailModal.tsx#L197) | × ${getDealItemQuantity(item)} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d38789fde96b<br>[components/markets/DealDetailModal.tsx:199:27](../../components/markets/DealDetailModal.tsx#L199) | NT$ ${getDealItemRevenue(item).toLocaleString()} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0758daa4ff3d<br>[components/markets/DealDetailModal.tsx:206:21](../../components/markets/DealDetailModal.tsx#L206) | 快速成交（無商品明細） | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>否則 items.length &gt; 0 |
| UI-38d78cca1739<br>[components/markets/DealDetailModal.tsx:215:71](../../components/markets/DealDetailModal.tsx#L215) | 總計 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3b5015de7df3<br>[components/markets/DealDetailModal.tsx:217:19](../../components/markets/DealDetailModal.tsx#L217) | NT$ ${amount.toLocaleString()} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d4af8bdcfab4<br>[components/markets/DealDetailModal.tsx:225:69](../../components/markets/DealDetailModal.tsx#L225) | 備註 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>notes |
| UI-c237a119c38f<br>[components/markets/DealDetailModal.tsx:236:25](../../components/markets/DealDetailModal.tsx#L236) | 📝 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>isBackfillDealEvent(deal) |
| UI-29307d1b60ea<br>[components/markets/DealDetailModal.tsx:237:19](../../components/markets/DealDetailModal.tsx#L237) | 補登記錄 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>isBackfillDealEvent(deal) |
| UI-f6d0d3bffd2a<br>[components/markets/DealDetailModal.tsx:240:19](../../components/markets/DealDetailModal.tsx#L240) | 此筆成交為補登記錄，不影響當日庫存計算 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DealDetailModal<br>isBackfillDealEvent(deal) |
| UI-0fbb13406566<br>[components/markets/DealDetailModal.tsx:254:29](../../components/markets/DealDetailModal.tsx#L254) | 刪除中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DealDetailModal<br>isDeleting |
| UI-ce125106ae9e<br>[components/markets/DealDetailModal.tsx:254:40](../../components/markets/DealDetailModal.tsx#L254) | 刪除 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DealDetailModal<br>否則 isDeleting |
| UI-6214c621ca32<br>[components/markets/DealDetailModal.tsx:261:15](../../components/markets/DealDetailModal.tsx#L261) | 編輯 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DealDetailModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/markets/DealItem.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-c876f4d6450f<br>[components/markets/DealItem.tsx:21:7](../../components/markets/DealItem.tsx#L21) | ${getDealItemProductName(items[0]) &#124;&#124; '未命名商品'}${items.length &gt; 1 ? &#96; 等 ${items.length} 項&#96; : ''} | **來源候選** · 候選，非已證實提示<br>summary 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | summary<br>items.length &gt; 0 |
| UI-d425521d4d2b<br>[components/markets/DealItem.tsx:21:46](../../components/markets/DealItem.tsx#L21) | 未命名商品 | **來源候選** · 候選，非已證實提示<br>summary 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | summary<br>items.length &gt; 0 |
| UI-a5294444e736<br>[components/markets/DealItem.tsx:21:75](../../components/markets/DealItem.tsx#L21) | 等 ${items.length} 項 | **來源候選** · 候選，非已證實提示<br>summary 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | summary<br>items.length &gt; 0 → items.length &gt; 1 |
| UI-064403b9d1b9<br>[components/markets/DealItem.tsx:22:7](../../components/markets/DealItem.tsx#L22) | 總額紀錄（無商品明細） | **來源候選** · 候選，非已證實提示<br>summary 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | summary<br>否則 items.length &gt; 0 |
| UI-b22359df1921<br>[components/markets/DealItem.tsx:55:11](../../components/markets/DealItem.tsx#L55) | 現金 | **來源候選** · 候選，非已證實提示<br>paymentLabels 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | paymentLabels · cash<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f09caad3ca78<br>[components/markets/DealItem.tsx:56:11](../../components/markets/DealItem.tsx#L56) | 信用卡 | **來源候選** · 候選，非已證實提示<br>paymentLabels 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | paymentLabels · card<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4816a734a5ba<br>[components/markets/DealItem.tsx:57:13](../../components/markets/DealItem.tsx#L57) | 行動支付 | **來源候選** · 候選，非已證實提示<br>paymentLabels 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | paymentLabels · mobile<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9c53cd644a41<br>[components/markets/DealItem.tsx:58:12](../../components/markets/DealItem.tsx#L58) | 其他 | **來源候選** · 候選，非已證實提示<br>paymentLabels 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | paymentLabels · other<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-40a8eb68042b<br>[components/markets/DealItem.tsx:70:15](../../components/markets/DealItem.tsx#L70) | 🕐 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DealItem<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-313e2cb4916a<br>[components/markets/DealItem.tsx:77:11](../../components/markets/DealItem.tsx#L77) | NT$ ${amount.toLocaleString()} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | DealItem<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-eff6faf79ec3<br>[components/markets/DealItem.tsx:85:12](../../components/markets/DealItem.tsx#L85) | ${paymentLabels[paymentMethod]} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | DealItem<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-59183b21e5c9<br>[components/markets/DealItem.tsx:90:79](../../components/markets/DealItem.tsx#L90) | ${summary} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | DealItem<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/markets/MarketOverviewPhotoStory.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-e777def234d6<br>[components/markets/MarketOverviewPhotoStory.tsx:59:94](../../components/markets/MarketOverviewPhotoStory.tsx#L59) | 未記錄時間 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TransactionCaption<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-39012a1e352d<br>[components/markets/MarketOverviewPhotoStory.tsx:62:13](../../components/markets/MarketOverviewPhotoStory.tsx#L62) | NT$ ${transaction.amount.toLocaleString()} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TransactionCaption<br>transaction |
| UI-6d5506f61a71<br>[components/markets/MarketOverviewPhotoStory.tsx:69:12](../../components/markets/MarketOverviewPhotoStory.tsx#L69) | ${SALES_PAYMENT_METHOD_LABELS[transaction.paymentMethod]} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | TransactionCaption<br>transaction &amp;&amp; PaymentIcon |
| UI-223ce03e50df<br>[components/markets/MarketOverviewPhotoStory.tsx:114:13](../../components/markets/MarketOverviewPhotoStory.tsx#L114) | 市集片段 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MarketOverviewPhotoStory<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fdab1e1ead63<br>[components/markets/MarketOverviewPhotoStory.tsx:117:13](../../components/markets/MarketOverviewPhotoStory.tsx#L117) | 最近成交照片 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | MarketOverviewPhotoStory<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1ec305542673<br>[components/markets/MarketOverviewPhotoStory.tsx:119:68](../../components/markets/MarketOverviewPhotoStory.tsx#L119) | 每一張，都替這場市集留下一小段故事。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MarketOverviewPhotoStory<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-93d329033a9a<br>[components/markets/MarketOverviewPhotoStory.tsx:126:11](../../components/markets/MarketOverviewPhotoStory.tsx#L126) | 查看全部 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | MarketOverviewPhotoStory<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dab4d5bd477e<br>[components/markets/MarketOverviewPhotoStory.tsx:137:19](../../components/markets/MarketOverviewPhotoStory.tsx#L137) | 最近一筆成交照片 | **輔助辨識** · 直接呈現定義<br>提供 SalesPhotoEvidenceOwnerAlbumImage 的讀屏名稱、圖片替代文字或滑入說明 | MarketOverviewPhotoStory · alt<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-afe4cfd6b60d<br>[components/markets/MarketOverviewPhotoStory.tsx:156:25](../../components/markets/MarketOverviewPhotoStory.tsx#L156) | 成交照片 | **來源候選** · 候選，非已證實提示<br>MarketOverviewPhotoStory 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | MarketOverviewPhotoStory · alt<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-1c9e06b202ac<br>[components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx:65:15](../../components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx#L65) | 確認成交照片 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | SalesPhotoEvidenceCapturePreviewDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a41a67eb8075<br>[components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx:68:15](../../components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx#L68) | 成交已完成。確認照片清楚後上傳，或重新拍攝與選擇照片。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceCapturePreviewDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e8c1daaab36a<br>[components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx:76:24](../../components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx#L76) | 關閉照片預覽 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceCapturePreviewDialog · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c7541d4e8bbe<br>[components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx:87:21](../../components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx#L87) | 準備上傳的成交照片預覽 | **輔助辨識** · 直接呈現定義<br>提供 Image 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceCapturePreviewDialog · alt<br>previewUrl |
| UI-5f39f815eaa0<br>[components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx:97:41](../../components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx#L97) | ${payload.image.width} x ${payload.image.height} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceCapturePreviewDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b23cb1d727a8<br>[components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx:99:19](../../components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx#L99) | 照片已安全暫存在此裝置 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceCapturePreviewDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8714713cc3e8<br>[components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx:104:16](../../components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx#L104) | ${uploadError} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceCapturePreviewDialog<br>uploadError |
| UI-1c532029f0b7<br>[components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx:117:13](../../components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx#L117) | 重新拍攝或選擇 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceCapturePreviewDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f01e400fb00c<br>[components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx:126:28](../../components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx#L126) | 同步並上傳中 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceCapturePreviewDialog<br>isUploading |
| UI-07a2391608d6<br>[components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx:126:39](../../components/markets/SalesPhotoEvidenceCapturePreviewDialog.tsx#L126) | 確認並上傳照片 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceCapturePreviewDialog<br>否則 isUploading |

## components/markets/SalesPhotoEvidenceFlowDialog.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-2765704f45a6<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:58:45](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L58) | 待補照片 | **來源候選** · 候選，非已證實提示<br>titleForState 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | titleForState<br>state.view === 'pending_list' |
| UI-bc3ee963e1ae<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:59:42](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L59) | 已完成 | **來源候選** · 候選，非已證實提示<br>titleForState 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | titleForState<br>state.view === 'completed' |
| UI-601fb8638a24<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:60:39](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L60) | 成交照片 | **來源候選** · 候選，非已證實提示<br>titleForState 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | titleForState<br>state.view === 'closed' |
| UI-beac4e9c30b1<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:61:40](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L61) | 成交完成 | **來源候選** · 候選，非已證實提示<br>titleForState 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | titleForState<br>state.returnTo === 'closed' |
| UI-1990e55d9069<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:61:49](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L61) | 補上成交照片 | **來源候選** · 候選，非已證實提示<br>titleForState 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | titleForState<br>否則 state.returnTo === 'closed' |
| UI-4954c38413e5<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:69:25](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L69) | 此處列出這台裝置的待補工作。其他裝置尚未上傳的照片不會自動出現在此處，請回原裝置完成。 | **來源候選** · 候選，非已證實提示<br>SalesPhotoEvidenceFlowDialog 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SalesPhotoEvidenceFlowDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ea9297520fb6<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:115:30](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L115) | 返回待補照片 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceFlowDialog · aria-label<br>canGoBack |
| UI-a127cd34046d<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:122:20](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L122) | ${titleForState(state)} | **動態文字入口** · 執行時綁定入口<br>DialogTitle 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceFlowDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0f0d252417ad<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:123:79](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L123) | (${pendingItems.length}) | **畫面文字** · 直接呈現定義<br>DialogTitle：辨識畫面、區塊或對話框主題 | SalesPhotoEvidenceFlowDialog<br>state.view === 'pending_list' &amp;&amp; pendingItems.length &gt; 0 |
| UI-aec5ad38b153<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:126:61](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L126) | 依序完成尚未上傳的成交照片 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceFlowDialog<br>state.view === 'pending_list' |
| UI-57e5606ba780<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:135:26](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L135) | 關閉成交照片視窗 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceFlowDialog · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e4637c96e05d<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:143:76](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L143) | ${pendingScopeMessage} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceFlowDialog<br>state.view === 'pending_list' |
| UI-f8ac84f1d457<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:152:19](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L152) | 重新整理待補照片 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceFlowDialog<br>state.view === 'pending_list' → !pendingItemsError |
| UI-6986981e555a<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:157:56](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L157) | ${pendingItemsError} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceFlowDialog<br>state.view === 'pending_list' → pendingItemsError |
| UI-4fb1b6d0539f<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:164:21](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L164) | 再試一次 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceFlowDialog<br>state.view === 'pending_list' → pendingItemsError |
| UI-f40f4fa167a1<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:170:19](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L170) | 正在整理待補照片 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceFlowDialog<br>state.view === 'pending_list' → 否則 pendingItemsError → isLoadingPendingItems |
| UI-df34d8581a1d<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:175:75](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L175) | 這台裝置沒有待補照片 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceFlowDialog<br>state.view === 'pending_list' → 否則 pendingItemsError → 否則 isLoadingPendingItems → pendingItems.length === 0 |
| UI-6e870168ab53<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:176:69](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L176) | 這不代表其他裝置的照片已上傳完成。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceFlowDialog<br>state.view === 'pending_list' → 否則 pendingItemsError → 否則 isLoadingPendingItems → pendingItems.length === 0 |
| UI-96e3a042e15e<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:202:68](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L202) | 本次成交 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' |
| UI-efe692cda9c3<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:205:29](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L205) | NT$${state.summary.totalAmount.toLocaleString()} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → state.summary.totalAmount &gt; 0 |
| UI-6c18069d9427<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:206:29](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L206) | 成交紀錄 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → 否則 state.summary.totalAmount &gt; 0 |
| UI-feac041d9179<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:210:24](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L210) | ${formatSalesPaymentMethod(state.summary.paymentMethod)} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' |
| UI-b13ad656afac<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:211:24](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L211) | ${state.summary.itemLabel} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' |
| UI-30133667de06<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:222:80](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L222) | 請拍下本次售出的商品 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → state.view === 'photo_required' |
| UI-9aac23f3dbb3<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:224:25](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L224) | 照片會先保留在這台裝置，確認後才會上傳。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → state.view === 'photo_required' |
| UI-7e032d2420e0<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:230:26](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L230) | ${state.message} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → state.view === 'photo_required' → state.message |
| UI-0d81b73db836<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:241:25](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L241) | 拍照 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → state.view === 'photo_required' |
| UI-43d7168677e6<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:249:25](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L249) | 從相簿選擇 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → state.view === 'photo_required' |
| UI-f8e3cc115251<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:257:54](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L257) | 稍後補 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → state.view === 'photo_required' → state.returnTo === 'closed' |
| UI-ef65fb2baba9<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:257:62](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L257) | 忽略 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → state.view === 'photo_required' → 否則 state.returnTo === 'closed' |
| UI-ec42904f21fe<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:265:80](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L265) | 正在處理照片 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → state.view === 'processing_photo' |
| UI-47fc69c9bef9<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:266:71](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L266) | 完成後會立即顯示預覽 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → state.view === 'processing_photo' |
| UI-74e4a9c92e64<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:276:31](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L276) | 準備上傳的成交照片 | **輔助辨識** · 直接呈現定義<br>提供 Image 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceFlowDialog · alt<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → (state.view === 'previewing' &#124;&#124; state.view === 'uploading' &#124;&#124; state.view === 'upload_failed') → previewUrl |
| UI-a0d4e45e9f9d<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:285:53](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L285) | 正在儲存照片，請稍候 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → (state.view === 'previewing' &#124;&#124; state.view === 'uploading' &#124;&#124; state.view === 'upload_failed') → state.view === 'uploading' |
| UI-3653dd34612e<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:285:68](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L285) | 請確認商品清楚可辨識 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → (state.view === 'previewing' &#124;&#124; state.view === 'uploading' &#124;&#124; state.view === 'upload_failed') → 否則 state.view === 'uploading' |
| UI-b03ea8942adc<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:289:43](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L289) | 上傳未完成，照片仍安全保留在此裝置。 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → (state.view === 'previewing' &#124;&#124; state.view === 'uploading' &#124;&#124; state.view === 'upload_failed') → state.view === 'upload_failed' |
| UI-f7a6ab93ac8e<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:300:78](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L300) | 照片已儲存 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → state.view === 'completed' |
| UI-3eb67b735bef<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:302:54](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L302) | 可以開始下一筆交易 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → state.view === 'completed' → state.returnTo === 'closed' |
| UI-693ddef8c696<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:302:68](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L302) | 即將返回待補清單 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → state.view === 'completed' → 否則 state.returnTo === 'closed' |
| UI-d6e0b2a238b1<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:317:23](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L317) | 正在儲存照片 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → (state.view === 'previewing' &#124;&#124; state.view === 'upload_failed' &#124;&#124; state.view === 'uploading') &amp;&amp; payload → state.view === 'uploading' |
| UI-f10f1408b9ad<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:326:38](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L326) | 重新拍照 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceFlowDialog · aria-label<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → (state.view === 'previewing' &#124;&#124; state.view === 'upload_failed' &#124;&#124; state.view === 'uploading') &amp;&amp; payload → 否則 state.view === 'uploading' |
| UI-cb4bab4a5874<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:327:33](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L327) | 重新拍照 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceFlowDialog · title<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → (state.view === 'previewing' &#124;&#124; state.view === 'upload_failed' &#124;&#124; state.view === 'uploading') &amp;&amp; payload → 否則 state.view === 'uploading' |
| UI-143a21bf0d0f<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:335:38](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L335) | 從相簿換照片 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceFlowDialog · aria-label<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → (state.view === 'previewing' &#124;&#124; state.view === 'upload_failed' &#124;&#124; state.view === 'uploading') &amp;&amp; payload → 否則 state.view === 'uploading' |
| UI-b94d97beafbd<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:336:33](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L336) | 從相簿換照片 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceFlowDialog · title<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → (state.view === 'previewing' &#124;&#124; state.view === 'upload_failed' &#124;&#124; state.view === 'uploading') &amp;&amp; payload → 否則 state.view === 'uploading' |
| UI-243b63de4cdd<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:346:61](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L346) | 重新上傳 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → (state.view === 'previewing' &#124;&#124; state.view === 'upload_failed' &#124;&#124; state.view === 'uploading') &amp;&amp; payload → 否則 state.view === 'uploading' → state.view === 'upload_failed' |
| UI-986d3519b5e9<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:346:70](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L346) | 使用這張照片 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → (state.view === 'previewing' &#124;&#124; state.view === 'upload_failed' &#124;&#124; state.view === 'uploading') &amp;&amp; payload → 否則 state.view === 'uploading' → 否則 state.view === 'upload_failed' |
| UI-30c4875dcdf7<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:354:62](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L354) | 返回待補清單 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → (state.view === 'previewing' &#124;&#124; state.view === 'upload_failed' &#124;&#124; state.view === 'uploading') &amp;&amp; payload → 否則 state.view === 'uploading' → state.returnTo === 'pending_list' |
| UI-9f935842a59f<br>[components/markets/SalesPhotoEvidenceFlowDialog.tsx:354:73](../../components/markets/SalesPhotoEvidenceFlowDialog.tsx#L354) | 稍後上傳 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceFlowDialog<br>state.view !== 'closed' &amp;&amp; state.view !== 'pending_list' → (state.view === 'previewing' &#124;&#124; state.view === 'upload_failed' &#124;&#124; state.view === 'uploading') &amp;&amp; payload → 否則 state.view === 'uploading' → 否則 state.returnTo === 'pending_list' |

## components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx

僅由測試／工具頁靜態引用

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-975045620288<br>[components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx:29:31](../../components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx#L29) | 照片處理中 | **來源候選** · 候選，非已證實提示<br>label 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | label<br>isCapturing |
| UI-18998714cf24<br>[components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx:29:41](../../components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx#L29) | 拍攝/選擇照片 | **來源候選** · 候選，非已證實提示<br>label 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | label<br>否則 isCapturing |
| UI-0dc5f5cdad24<br>[components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx:32:9](../../components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx#L32) | 照片會先暫存在本機，尚未上傳雲端。 | **來源候選** · 候選，非已證實提示<br>helper 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | helper<br>captureEnabled → eligible |
| UI-a18ad37a5e0c<br>[components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx:33:9](../../components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx#L33) | 此筆狀態目前不能重新拍照。 | **來源候選** · 候選，非已證實提示<br>helper 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | helper<br>captureEnabled → 否則 eligible |
| UI-6c39beb9d5cc<br>[components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx:34:7](../../components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx#L34) | 目前無法拍攝或選擇照片。 | **來源候選** · 候選，非已證實提示<br>helper 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | helper<br>否則 captureEnabled |
| UI-0fd556c1d905<br>[components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx:47:74](../../components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx#L47) | ${label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceLocalCaptureAction<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/markets/SalesPhotoEvidenceLocalThumbnail.tsx

僅由測試／工具頁靜態引用

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-1ac5946fc70f<br>[components/markets/SalesPhotoEvidenceLocalThumbnail.tsx:65:65](../../components/markets/SalesPhotoEvidenceLocalThumbnail.tsx#L65) | 尚未選擇照片 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceLocalThumbnail<br>!payload &#124;&#124; !previewUrl |
| UI-c61dfce11a79<br>[components/markets/SalesPhotoEvidenceLocalThumbnail.tsx:66:63](../../components/markets/SalesPhotoEvidenceLocalThumbnail.tsx#L66) | 拍攝或從相簿選擇後會在這裡顯示預覽 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceLocalThumbnail<br>!payload &#124;&#124; !previewUrl |
| UI-219a331b11b5<br>[components/markets/SalesPhotoEvidenceLocalThumbnail.tsx:76:18](../../components/markets/SalesPhotoEvidenceLocalThumbnail.tsx#L76) | 開啟成交照片預覽 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceLocalThumbnail · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7fda9fe28f1c<br>[components/markets/SalesPhotoEvidenceLocalThumbnail.tsx:80:13](../../components/markets/SalesPhotoEvidenceLocalThumbnail.tsx#L80) | 已選擇的成交照片縮圖 | **輔助辨識** · 直接呈現定義<br>提供 Image 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceLocalThumbnail · alt<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1e518b2748cc<br>[components/markets/SalesPhotoEvidenceLocalThumbnail.tsx:87:9](../../components/markets/SalesPhotoEvidenceLocalThumbnail.tsx#L87) | 已選擇照片，點擊查看 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceLocalThumbnail<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/markets/SalesPhotoEvidenceManualUploadAction.tsx

僅由測試／工具頁靜態引用

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-3aabe7673370<br>[components/markets/SalesPhotoEvidenceManualUploadAction.tsx:29:31](../../components/markets/SalesPhotoEvidenceManualUploadAction.tsx#L29) | 照片上傳中 | **來源候選** · 候選，非已證實提示<br>label 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | label<br>isUploading |
| UI-737a89d874fa<br>[components/markets/SalesPhotoEvidenceManualUploadAction.tsx:29:41](../../components/markets/SalesPhotoEvidenceManualUploadAction.tsx#L29) | 上傳照片 | **來源候選** · 候選，非已證實提示<br>label 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | label<br>否則 isUploading |
| UI-e79e39aa9436<br>[components/markets/SalesPhotoEvidenceManualUploadAction.tsx:31:7](../../components/markets/SalesPhotoEvidenceManualUploadAction.tsx#L31) | 使用已選擇並壓縮的照片上傳，失敗時會保留本機照片供重試。 | **來源候選** · 候選，非已證實提示<br>helper 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | helper<br>eligible |
| UI-e754ed324213<br>[components/markets/SalesPhotoEvidenceManualUploadAction.tsx:32:7](../../components/markets/SalesPhotoEvidenceManualUploadAction.tsx#L32) | 這筆紀錄目前不需要上傳照片。 | **來源候選** · 候選，非已證實提示<br>helper 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | helper<br>否則 eligible |
| UI-fd624e9434e5<br>[components/markets/SalesPhotoEvidenceManualUploadAction.tsx:49:74](../../components/markets/SalesPhotoEvidenceManualUploadAction.tsx#L49) | ${label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceManualUploadAction<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/markets/SalesPhotoEvidenceOperatingCard.tsx

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-1ebc93ce0110<br>[components/markets/SalesPhotoEvidenceOperatingCard.tsx:35:63](../../components/markets/SalesPhotoEvidenceOperatingCard.tsx#L35) | 成交照片 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | SalesPhotoEvidenceOperatingCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7aa0a4621cf3<br>[components/markets/SalesPhotoEvidenceOperatingCard.tsx:38:17](../../components/markets/SalesPhotoEvidenceOperatingCard.tsx#L38) | 營業中可調整本場是否需要成交照片紀錄，變更只影響之後的成交。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOperatingCard<br>isOwner |
| UI-b3380bc2bc03<br>[components/markets/SalesPhotoEvidenceOperatingCard.tsx:39:17](../../components/markets/SalesPhotoEvidenceOperatingCard.tsx#L39) | 是否需要成交照片由老闆設定，員工可在成交後拍攝或稍後補上。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOperatingCard<br>否則 isOwner |
| UI-c4870e2dbea5<br>[components/markets/SalesPhotoEvidenceOperatingCard.tsx:54:17](../../components/markets/SalesPhotoEvidenceOperatingCard.tsx#L54) | 此市集需要成交照片 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOperatingCard<br>isOwner |
| UI-c482e3ed5bc2<br>[components/markets/SalesPhotoEvidenceOperatingCard.tsx:57:29](../../components/markets/SalesPhotoEvidenceOperatingCard.tsx#L57) | 目前已啟用 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOperatingCard<br>isOwner → required |
| UI-b041e2c5b9e4<br>[components/markets/SalesPhotoEvidenceOperatingCard.tsx:57:39](../../components/markets/SalesPhotoEvidenceOperatingCard.tsx#L57) | 目前未啟用 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOperatingCard<br>isOwner → 否則 required |
| UI-4cdbd3139822<br>[components/markets/SalesPhotoEvidenceOperatingCard.tsx:77:17](../../components/markets/SalesPhotoEvidenceOperatingCard.tsx#L77) | 此市集需要成交照片 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOperatingCard<br>否則 isOwner |
| UI-36fd1708c478<br>[components/markets/SalesPhotoEvidenceOperatingCard.tsx:80:29](../../components/markets/SalesPhotoEvidenceOperatingCard.tsx#L80) | 成交後請拍攝或選擇照片 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOperatingCard<br>否則 isOwner → required |
| UI-bb733800b92a<br>[components/markets/SalesPhotoEvidenceOperatingCard.tsx:80:45](../../components/markets/SalesPhotoEvidenceOperatingCard.tsx#L80) | 目前不需要成交照片 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOperatingCard<br>否則 isOwner → 否則 required |
| UI-bdf291a02056<br>[components/markets/SalesPhotoEvidenceOperatingCard.tsx:88:27](../../components/markets/SalesPhotoEvidenceOperatingCard.tsx#L88) | 已啟用 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOperatingCard<br>否則 isOwner → required |
| UI-292f76f99ae2<br>[components/markets/SalesPhotoEvidenceOperatingCard.tsx:88:35](../../components/markets/SalesPhotoEvidenceOperatingCard.tsx#L88) | 未啟用 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOperatingCard<br>否則 isOwner → 否則 required |
| UI-e211655b9bc0<br>[components/markets/SalesPhotoEvidenceOperatingCard.tsx:103:17](../../components/markets/SalesPhotoEvidenceOperatingCard.tsx#L103) | 待補照片 ${pendingCount} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOperatingCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-55edbad79153<br>[components/markets/SalesPhotoEvidenceOperatingCard.tsx:106:37](../../components/markets/SalesPhotoEvidenceOperatingCard.tsx#L106) | 查看並完成本機尚未上傳的照片 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOperatingCard<br>pendingCount &gt; 0 |
| UI-01d9f7138872<br>[components/markets/SalesPhotoEvidenceOperatingCard.tsx:106:56](../../components/markets/SalesPhotoEvidenceOperatingCard.tsx#L106) | 查看這台裝置的待補工作 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOperatingCard<br>否則 pendingCount &gt; 0 |

## components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-3aa4a29854ef<br>[components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx:43:23](../../components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx#L43) | ${null} | **動態文字入口** · 執行時綁定入口<br>useOwnerImageObjectUrl 接收執行時文字；內容需追查所列綁定與生產端 | useOwnerImageObjectUrl<br>!enabled |
| UI-2df32c45d94b<br>[components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx:49:21](../../components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx#L49) | ${null} | **動態文字入口** · 執行時綁定入口<br>useOwnerImageObjectUrl 接收執行時文字；內容需追查所列綁定與生產端 | useOwnerImageObjectUrl<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-815aefc1bb3e<br>[components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx:61:27](../../components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx#L61) | ${null} | **動態文字入口** · 執行時綁定入口<br>useOwnerImageObjectUrl 接收執行時文字；內容需追查所列綁定與生產端 | useOwnerImageObjectUrl<br>result.ok |
| UI-115c4a219b59<br>[components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx:66:25](../../components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx#L66) | ${result.message} | **動態文字入口** · 執行時綁定入口<br>useOwnerImageObjectUrl 接收執行時文字；內容需追查所列綁定與生產端 | useOwnerImageObjectUrl<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d1c8bc7d69a3<br>[components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx:72:25](../../components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx#L72) | 照片讀取失敗，請稍後再試。 | **狀態設定** · 文案生產端，須查使用端<br>setErrorMessage：更新畫面訊息；仍須依呼叫端確認是否被渲染 | useOwnerImageObjectUrl<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-32efcb8102e9<br>[components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx:107:14](../../components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx#L107) | ${alt} | **動態文字入口** · 執行時綁定入口<br>img 接收執行時文字；內容需追查所列綁定與生產端 | previewImage · alt<br>preview.objectUrl |
| UI-c390c3009d06<br>[components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx:120:22](../../components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx#L120) | 放大查看成交照片 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceOwnerAlbumImage · aria-label<br>preview.objectUrl |
| UI-d9046ef98ee0<br>[components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx:122:17](../../components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx#L122) | 放大查看 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceOwnerAlbumImage · title<br>preview.objectUrl |
| UI-9b0ca817deb0<br>[components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx:142:30](../../components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx#L142) | 關閉照片檢視 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceOwnerAlbumImage · aria-label<br>preview.objectUrl |
| UI-b8dccc751ffd<br>[components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx:151:24](../../components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx#L151) | ${alt} | **動態文字入口** · 執行時綁定入口<br>img 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceOwnerAlbumImage · alt<br>preview.objectUrl |
| UI-4570fa80c151<br>[components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx:155:164](../../components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx#L155) | 原始照片讀取中 | **輔助辨識** · 直接呈現定義<br>提供 span 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceOwnerAlbumImage · aria-label<br>preview.objectUrl → fullImage.isLoading |
| UI-4ebfd5f859da<br>[components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx:163:20](../../components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx#L163) | ${fullImage.errorMessage} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceOwnerAlbumImage<br>preview.objectUrl → fullImage.errorMessage |
| UI-0d2e5005d892<br>[components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx:182:32](../../components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx#L182) | 照片讀取中 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumImage<br>preview.isLoading |
| UI-9557e9ca0d7c<br>[components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx:182:66](../../components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx#L182) | 尚無可顯示照片 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumImage<br>否則 preview.isLoading |

## components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-f8232273ee08<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:46:12](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L46) | 待補拍 | **來源候選** · 候選，非已證實提示<br>DISPLAY_STATUS_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | DISPLAY_STATUS_LABELS · pending<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d2ecf60d398f<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:47:19](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L47) | 本機已拍攝 | **來源候選** · 候選，非已證實提示<br>DISPLAY_STATUS_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | DISPLAY_STATUS_LABELS · captured_local<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-be2eb3c3b360<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:48:21](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L48) | 已上傳 | **來源候選** · 候選，非已證實提示<br>DISPLAY_STATUS_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | DISPLAY_STATUS_LABELS · uploaded_private<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-56bf874444f8<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:49:18](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L49) | 上傳異常 | **來源候選** · 候選，非已證實提示<br>DISPLAY_STATUS_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | DISPLAY_STATUS_LABELS · upload_failed<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f7c6fb1715d0<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:50:12](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L50) | 已過期 | **來源候選** · 候選，非已證實提示<br>DISPLAY_STATUS_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | DISPLAY_STATUS_LABELS · expired<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-618205be61df<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:51:11](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L51) | 已免除 | **來源候選** · 候選，非已證實提示<br>DISPLAY_STATUS_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | DISPLAY_STATUS_LABELS · waived<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b92fc0234a6e<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:52:12](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L52) | 未要求 | **來源候選** · 候選，非已證實提示<br>DISPLAY_STATUS_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | DISPLAY_STATUS_LABELS · skipped<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-780c02e28e06<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:66:42](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L66) | 未記錄 | **來源候選** · 候選，非已證實提示<br>formatDateTime 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | formatDateTime<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e448b065ba58<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:79:45](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L79) | 24 小時內到期 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getRetentionNotice · label<br>remainingHours &lt;= 24 |
| UI-228f8acaa87b<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:80:19](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L80) | 剩餘 ${Math.ceil(remainingHours / 24)} 天 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getRetentionNotice · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-69fd3ba0e9bd<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:103:12](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L103) | 照片仍在本機流程，尚未提供雲端檢視。 | **來源候選** · 候選，非已證實提示<br>getItemCaption 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getItemCaption<br>item.displayStatus === 'captured_local' |
| UI-d267a7997973<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:107:12](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L107) | 上傳尚未完成，保留為待處理狀態。 | **來源候選** · 候選，非已證實提示<br>getItemCaption 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getItemCaption<br>item.displayStatus === 'upload_failed' |
| UI-1d7e1725ba3e<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:112:9](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L112) | 照片已於 ${formatDateTime(item.expiresAt)} 到期，雲端檔案已完成清理。 | **來源候選** · 候選，非已證實提示<br>getItemCaption 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getItemCaption<br>item.displayStatus === 'expired' → item.status === 'expired' |
| UI-9444a81ac2da<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:113:9](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L113) | 照片已於 ${formatDateTime(item.expiresAt)} 到期並停止查看，雲端清理排程中。 | **來源候選** · 候選，非已證實提示<br>getItemCaption 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getItemCaption<br>item.displayStatus === 'expired' → 否則 item.status === 'expired' |
| UI-c3fbe06fb0ee<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:116:10](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L116) | 目前沒有可顯示的照片物件。 | **來源候選** · 候選，非已證實提示<br>getItemCaption 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getItemCaption<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-df1b6810ebd2<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:121:48](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L121) | 日期未記錄 | **來源候選** · 候選，非已證實提示<br>expiredHistoryGroupLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | expiredHistoryGroupLabel<br>!Number.isFinite(date.getTime()) |
| UI-5588a414545a<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:122:10](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L122) | ${date.getFullYear()}年${date.getMonth() + 1}月 | **來源候選** · 候選，非已證實提示<br>expiredHistoryGroupLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | expiredHistoryGroupLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8ca10ff1cf3d<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:141:42](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L141) | ${label}過期照片 | **輔助辨識** · 直接呈現定義<br>提供 section 的讀屏名稱、圖片替代文字或滑入說明 | ExpiredPhotoHistory · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d51d47bd1c20<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:142:74](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L142) | ${label} | **動態文字入口** · 執行時綁定入口<br>h3 接收執行時文字；內容需追查所列綁定與生產端 | ExpiredPhotoHistory<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0b2d3fc94365<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:159:54](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L159) | 雲端檔案已清理 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ExpiredPhotoHistory<br>item.status === 'expired' |
| UI-9d19c2b9d356<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:159:66](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L159) | 等待雲端清理 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ExpiredPhotoHistory<br>否則 item.status === 'expired' |
| UI-61ac82850ab7<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:164:25](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L164) | NT$ ${transaction.amount.toLocaleString()} | **畫面文字** · 直接呈現定義<br>strong：呈現操作說明、資料標籤、狀態或注意事項 | ExpiredPhotoHistory<br>transaction |
| UI-979b2dae6ed7<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:170:83](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L170) | ${getItemCaption(item)} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | ExpiredPhotoHistory<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7f16f56f2ab2<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:173:29](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L173) | 到期時間 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ExpiredPhotoHistory<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9acf06959098<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:177:29](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L177) | 上傳時間 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ExpiredPhotoHistory<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-147ebc2a8e5f<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:182:31](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L182) | 支付方式 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ExpiredPhotoHistory<br>transaction &amp;&amp; PaymentMethodIcon |
| UI-49b77ba590b7<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:185:30](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L185) | ${SALES_PAYMENT_METHOD_LABELS[transaction.paymentMethod]} | **動態文字入口** · 執行時綁定入口<br>dd 接收執行時文字；內容需追查所列綁定與生產端 | ExpiredPhotoHistory<br>transaction &amp;&amp; PaymentMethodIcon |
| UI-4a53aa5b2e68<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:234:14](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L234) | ${label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | FilterButton<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e1501ede063d<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:272:29](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L272) | 目前 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | filterOptions · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3b18d0d99536<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:273:30](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L273) | 已上傳 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | filterOptions · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8da81d03d375<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:276:14](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L276) | 待處理 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | filterOptions · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-781e083194b9<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:279:28](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L279) | 上傳異常 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | filterOptions · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-aaace9a286a6<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:280:29](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L280) | 已過期 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | filterOptions · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-839dda737f5f<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:281:25](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L281) | 全部 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | filterOptions · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6add84c8a5e7<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:304:9](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L304) | 成交時間：${formatDateTime(deleteItem.saleCompletedAt)} | **來源候選** · 候選，非已證實提示<br>deleteDescription 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | deleteDescription<br>deleteItem |
| UI-54e1d0aa625a<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:306:13](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L306) | 成交金額：NT$ ${deleteTransaction.amount.toLocaleString()}（${SALES_PAYMENT_METHOD_LABELS[deleteTransaction.paymentMethod]}） | **來源候選** · 候選，非已證實提示<br>deleteDescription 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | deleteDescription<br>deleteItem → deleteTransaction |
| UI-1d4470a2e686<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:308:9](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L308) | 照片會從成交照片、每日表現與成交詳情中移除；成交紀錄、營收及統計不會改變。 | **來源候選** · 候選，非已證實提示<br>deleteDescription 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | deleteDescription<br>deleteItem |
| UI-c34d2ba61355<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:310:13](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L310) | 本市集要求成交照片。永久移除後，系統目前不會自動建立待補拍任務。 | **來源候選** · 候選，非已證實提示<br>deleteDescription 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | deleteDescription<br>deleteItem → marketRequiresEvidence |
| UI-e10b91e1883d<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:312:9](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L312) | 雲端照片檔案會一併刪除，且無法復原。 | **來源候選** · 候選，非已證實提示<br>deleteDescription 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | deleteDescription<br>deleteItem |
| UI-7df7396b9de8<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:324:68](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L324) | 市集影像紀錄 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7411e58d8502<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:325:73](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L325) | 成交照片 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | SalesPhotoEvidenceOwnerAlbumShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1cc4d6d38112<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:327:15](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L327) | 依成交時間整理照片、金額與支付方式。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-757c0712a887<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:339:13](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L339) | 重新整理 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceOwnerAlbumShell<br>onRefresh &amp;&amp; (viewModel.items.length &gt; 0 &#124;&#124; Boolean(loadError)) |
| UI-8961c97954a9<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:345:63](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L345) | 照片狀態篩選 | **輔助辨識** · 直接呈現定義<br>提供 div 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceOwnerAlbumShell · aria-label<br>viewModel.items.length &gt; 0 |
| UI-3f759036af8e<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:349:22](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L349) | ${option.label} | **動態文字入口** · 執行時綁定入口<br>FilterButton 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceOwnerAlbumShell · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-372b4489c851<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:360:12](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L360) | ${deleteCapabilityMessage} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceOwnerAlbumShell<br>onDelete &amp;&amp; deleteCapabilityMessage &amp;&amp; summary.countByDisplayStatus.uploaded_private &gt; 0 |
| UI-4d22d8a94625<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:366:12](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L366) | ${loadError} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceOwnerAlbumShell<br>loadError |
| UI-d071ade3f1c3<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:371:67](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L371) | 正在載入成交照片 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell<br>否則 loadError → isLoading &amp;&amp; viewModel.items.length === 0 |
| UI-d5f6d3ade844<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:377:45](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L377) | 目前沒有照片紀錄 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell<br>否則 loadError → 否則 isLoading &amp;&amp; viewModel.items.length === 0 → filteredItems.length === 0 → viewModel.items.length === 0 |
| UI-f91d2b34164c<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:377:58](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L377) | 此篩選沒有照片紀錄 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell<br>否則 loadError → 否則 isLoading &amp;&amp; viewModel.items.length === 0 → filteredItems.length === 0 → 否則 viewModel.items.length === 0 |
| UI-00e40be227db<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:382:19](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L382) | 完成成交拍照與上傳後，照片會依成交時間顯示在這裡。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell<br>否則 loadError → 否則 isLoading &amp;&amp; viewModel.items.length === 0 → filteredItems.length === 0 → viewModel.items.length === 0 → marketRequiresEvidence |
| UI-e03c6845b8a3<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:383:19](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L383) | 有成交照片後，會依成交時間顯示在這裡。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell<br>否則 loadError → 否則 isLoading &amp;&amp; viewModel.items.length === 0 → filteredItems.length === 0 → viewModel.items.length === 0 → 否則 marketRequiresEvidence |
| UI-d01eefa5cfef<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:384:17](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L384) | 可切換其他狀態查看歷史照片紀錄。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell<br>否則 loadError → 否則 isLoading &amp;&amp; viewModel.items.length === 0 → filteredItems.length === 0 → 否則 viewModel.items.length === 0 |
| UI-93323cd38cea<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:408:23](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L408) | 成交紀錄 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6b6cfd94001d<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:418:24](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L418) | ${getStatusIcon(item.displayStatus)} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceOwnerAlbumShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9a2cbf6c6b54<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:419:24](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L419) | ${DISPLAY_STATUS_LABELS[item.displayStatus]} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceOwnerAlbumShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6646cf311873<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:427:36](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L427) | 刪除成交照片 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceOwnerAlbumShell · aria-label<br>onDelete &amp;&amp; item.displayStatus === 'uploaded_private' |
| UI-0504d60f1bce<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:428:44](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L428) | 刪除成交照片 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceOwnerAlbumShell · title<br>onDelete &amp;&amp; item.displayStatus === 'uploaded_private' → canDelete |
| UI-5e5ff9986e9e<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:428:83](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L428) | 正在確認刪除功能 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceOwnerAlbumShell · title<br>onDelete &amp;&amp; item.displayStatus === 'uploaded_private' → 否則 canDelete |
| UI-355c42438127<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:440:25](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L440) | 成交照片 | **來源候選** · 候選，非已證實提示<br>SalesPhotoEvidenceOwnerAlbumShell 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SalesPhotoEvidenceOwnerAlbumShell · alt<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c450916bfe9c<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:449:23](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L449) | NT$ ${transaction.amount.toLocaleString()} | **畫面文字** · 直接呈現定義<br>strong：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell<br>transaction &amp;&amp; PaymentMethodIcon |
| UI-be7e6c29d620<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:453:24](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L453) | ${SALES_PAYMENT_METHOD_LABELS[transaction.paymentMethod]} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceOwnerAlbumShell<br>transaction &amp;&amp; PaymentMethodIcon |
| UI-fb91d7ab84c7<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:460:22](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L460) | ${caption} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceOwnerAlbumShell<br>caption |
| UI-60be4da89d56<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:466:25](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L466) | 上傳時間 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-82f707e0dcc5<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:470:25](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L470) | 到期時間 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-65e70a308d47<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:476:26](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L476) | ${retentionNotice.label} | **動態文字入口** · 執行時綁定入口<br>dd 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceOwnerAlbumShell<br>retentionNotice |
| UI-2714aeec1b67<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:498:15](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L498) | 刪除成交照片？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2de96d105f36<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:499:22](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L499) | ${deleteDescription} | **動態文字入口** · 執行時綁定入口<br>ConfirmDialog 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceOwnerAlbumShell · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-013fb4b8c57e<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:500:22](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L500) | 永久移除照片 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7c2852c68416<br>[components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx:502:52](../../components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx#L502) | 永久移除 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceOwnerAlbumShell · confirmationText<br>marketRequiresEvidence |

## components/markets/SalesPhotoEvidencePendingListDialog.tsx

僅由測試／工具頁靜態引用

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-ca1ea3e3f34c<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:51:27](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L51) | 等待銷售同步 | **來源候選** · 候選，非已證實提示<br>STATUS_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | STATUS_LABELS · waiting_for_event_sync<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-de8b2a2a0af6<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:52:13](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L52) | 建立中 | **來源候選** · 候選，非已證實提示<br>STATUS_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | STATUS_LABELS · creating<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-52df9be8b16b<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:53:12](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L53) | 已建立 | **來源候選** · 候選，非已證實提示<br>STATUS_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | STATUS_LABELS · created<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9d80d3c96d3a<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:54:21](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L54) | 可重試失敗 | **來源候選** · 候選，非已證實提示<br>STATUS_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | STATUS_LABELS · failed_retryable<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ab523d888714<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:55:21](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L55) | 永久失敗 | **來源候選** · 候選，非已證實提示<br>STATUS_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | STATUS_LABELS · failed_permanent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c1609c26743e<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:56:27](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L56) | 來源異常 | **來源候選** · 候選，非已證實提示<br>STATUS_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | STATUS_LABELS · blocked_invalid_source<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-47569c925de7<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:69:9](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L69) | 正常 | **來源候選** · 候選，非已證實提示<br>SEVERITY_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SEVERITY_LABELS · none<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ec71a72919d4<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:70:9](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L70) | 注意 | **來源候選** · 候選，非已證實提示<br>SEVERITY_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SEVERITY_LABELS · info<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-210f39ac03d3<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:71:12](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L71) | 需留意 | **來源候選** · 候選，非已證實提示<br>SEVERITY_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SEVERITY_LABELS · warning<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0d9b75054f23<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:72:13](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L72) | 需檢查 | **來源候選** · 候選，非已證實提示<br>SEVERITY_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SEVERITY_LABELS · critical<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b49280cf3cfe<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:86:9](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L86) | 目前不需要處理。 | **來源候選** · 候選，非已證實提示<br>RECOMMENDATION_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | RECOMMENDATION_LABELS · none<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-21437e50ee9b<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:87:23](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L87) | 等待這筆銷售同步完成後，系統才能建立照片需求。 | **來源候選** · 候選，非已證實提示<br>RECOMMENDATION_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | RECOMMENDATION_LABELS · wait_for_sale_sync<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1497152299cc<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:88:23](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L88) | 這筆資料仍可重試，請先保留本機資料。 | **來源候選** · 候選，非已證實提示<br>RECOMMENDATION_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | RECOMMENDATION_LABELS · retry_can_continue<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cc37ba2295f5<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:89:27](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L89) | 建立中狀態已逾時，之後需要經確認再恢復為可重試。 | **來源候選** · 候選，非已證實提示<br>RECOMMENDATION_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | RECOMMENDATION_LABELS · recover_stale_creating<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-76439cda6ebc<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:90:29](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L90) | 照片需求已建立，本機紀錄會在確認完成後清理。 | **來源候選** · 候選，非已證實提示<br>RECOMMENDATION_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | RECOMMENDATION_LABELS · retire_created_queue_row<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f52208d0e4f5<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:91:27](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L91) | 來源資料異常或已達永久失敗，需人工檢查後再處理。 | **來源候選** · 候選，非已證實提示<br>RECOMMENDATION_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | RECOMMENDATION_LABELS · manual_review_required<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-76a679278d55<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:167:100](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L167) | 待補照片 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | SalesPhotoEvidencePendingListDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a4ec65b75cb7<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:169:15](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L169) | 成交紀錄已保留。你可以拍攝或選擇照片，完成後再上傳。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingListDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f8fe2d9e233a<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:173:17](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L173) | 全部 ${items.length} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingListDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-10e92a71c62b<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:176:17](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L176) | 等待同步 ${statusCounts.waiting_for_event_sync} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingListDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cd7effe64236<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:179:17](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L179) | 需留意 ${needsAttentionCount} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingListDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-45250c976e86<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:184:17](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L184) | 最後讀取時間：${lastLoadedLabel} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingListDialog<br>lastLoadedLabel |
| UI-81730bca47ea<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:192:24](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L192) | 關閉待補照片 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidencePendingListDialog · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-24ca9e590916<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:201:16](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L201) | ${loadError} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidencePendingListDialog<br>loadError |
| UI-06f8fc5ba30d<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:206:15](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L206) | 讀取中 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingListDialog<br>否則 loadError → isLoading |
| UI-616ebe404c55<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:210:66](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L210) | 這台裝置沒有待補照片 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingListDialog<br>否則 loadError → 否則 isLoading → items.length === 0 |
| UI-52f8b009b6c5<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:212:17](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L212) | 此處僅列出本機工作；其他裝置未上傳的照片請回原裝置處理。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingListDialog<br>否則 loadError → 否則 isLoading → items.length === 0 |
| UI-22fceda23d6a<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:228:27](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L228) | 成交照片 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingListDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-66f544824eb9<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:231:27](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L231) | 成交時間 ${formatDisplayDateTime(item.saleCompletedAt)} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingListDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-63dacf443594<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:237:26](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L237) | ${getStatusIcon(item.status)} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidencePendingListDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bfebea5d595b<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:238:26](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L238) | ${STATUS_LABELS[item.status]} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidencePendingListDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-90a57ce0d024<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:249:30](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L249) | ${SEVERITY_LABELS[diagnostic.severity]} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidencePendingListDialog<br>diagnostic |
| UI-f17cc91dedb7<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:251:34](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L251) | ${RECOMMENDATION_LABELS[diagnostic.ownerRecommendation]} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidencePendingListDialog<br>diagnostic |
| UI-1d17118f89ac<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:278:26](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L278) | ${captureErrorByQueueId[item.queueId]} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidencePendingListDialog<br>captureErrorByQueueId[item.queueId] |
| UI-0e265b891995<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:284:26](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L284) | ${uploadErrorByQueueId[item.queueId]} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidencePendingListDialog<br>uploadErrorByQueueId[item.queueId] |
| UI-f24a418a44fd<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:290:52](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L290) | 重試次數：${item.retryCount} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingListDialog<br>(item.retryCount &gt; 0 &#124;&#124; item.lastErrorMessage) → item.retryCount &gt; 0 |
| UI-bddb0d5718c3<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:291:71](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L291) | 上次處理未完成，請依提示重試。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingListDialog<br>(item.retryCount &gt; 0 &#124;&#124; item.lastErrorMessage) → item.lastErrorMessage |
| UI-fb167af5c5ff<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:310:15](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L310) | 重新讀取 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidencePendingListDialog<br>onRefresh |
| UI-5c8e7df500ca<br>[components/markets/SalesPhotoEvidencePendingListDialog.tsx:318:13](../../components/markets/SalesPhotoEvidencePendingListDialog.tsx#L318) | 關閉 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidencePendingListDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/markets/SalesPhotoEvidencePendingTaskCard.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-9dbefc2e5d39<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:69:44](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L69) | 照片已保留，可重新上傳 | **來源候選** · 候選，非已證實提示<br>stateLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | stateLabel<br>payload → item.status === 'failed_retryable' |
| UI-367c067625b6<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:69:60](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L69) | 照片尚未上傳 | **來源候選** · 候選，非已證實提示<br>stateLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | stateLabel<br>payload → 否則 item.status === 'failed_retryable' |
| UI-eb6462783d03<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:70:20](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L70) | 尚未拍照 | **來源候選** · 候選，非已證實提示<br>stateLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | stateLabel<br>否則 payload → actionable |
| UI-b5ad9f3a1c3b<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:70:29](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L70) | 暫時不能處理 | **來源候選** · 候選，非已證實提示<br>stateLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | stateLabel<br>否則 payload → 否則 actionable |
| UI-94ef420ac509<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:78:17](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L78) | NT$${transaction.totalAmount.toLocaleString()} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingTaskCard<br>transaction?.totalAmount |
| UI-ef32db37ba8c<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:79:17](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L79) | 成交紀錄 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingTaskCard<br>否則 transaction?.totalAmount |
| UI-2ca70d95b22c<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:83:17](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L83) | ${formatSalesPaymentMethod(transaction.paymentMethod)} · ${transaction.itemLabel} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingTaskCard<br>transaction |
| UI-dde28f40e4d2<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:90:14](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L90) | ${stateLabel} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidencePendingTaskCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-282a69cfbba9<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:104:22](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L104) | 查看這筆成交照片 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidencePendingTaskCard · aria-label<br>否則 isLoading → payload &amp;&amp; previewUrl |
| UI-6c2bb936a243<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:108:17](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L108) | 待上傳的成交照片 | **輔助辨識** · 直接呈現定義<br>提供 Image 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidencePendingTaskCard · alt<br>否則 isLoading → payload &amp;&amp; previewUrl |
| UI-f5b4691ebd89<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:118:61](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L118) | 這筆交易還沒有照片 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePendingTaskCard<br>否則 isLoading → 否則 payload &amp;&amp; previewUrl |
| UI-a5f5699e2f9a<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:132:53](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L132) | 重新上傳 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidencePendingTaskCard<br>payload → item.status === 'failed_retryable' |
| UI-d8bad2da4d67<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:132:62](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L132) | 上傳照片 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidencePendingTaskCard<br>payload → 否則 item.status === 'failed_retryable' |
| UI-c991c6dde8a5<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:139:26](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L139) | 重新拍照 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidencePendingTaskCard · aria-label<br>payload |
| UI-d4caf48abc0a<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:140:21](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L140) | 重新拍照 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidencePendingTaskCard · title<br>payload |
| UI-7ca92493a45f<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:149:26](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L149) | 從相簿換照片 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidencePendingTaskCard · aria-label<br>payload |
| UI-1eb74794780b<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:150:21](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L150) | 從相簿換照片 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidencePendingTaskCard · title<br>payload |
| UI-5b4c6a21f77b<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:164:29](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L164) | 拍照 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidencePendingTaskCard<br>否則 payload → actionable |
| UI-726d0145d1bb<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:164:36](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L164) | 稍後再試 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidencePendingTaskCard<br>否則 payload → 否則 actionable |
| UI-70159209c87e<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:171:26](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L171) | 從相簿選擇 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidencePendingTaskCard · aria-label<br>否則 payload |
| UI-ebc1c6089c4f<br>[components/markets/SalesPhotoEvidencePendingTaskCard.tsx:172:21](../../components/markets/SalesPhotoEvidencePendingTaskCard.tsx#L172) | 從相簿選擇 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidencePendingTaskCard · title<br>否則 payload |

## components/markets/SalesPhotoEvidencePostSalePrompt.tsx

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-348c9fbd8d01<br>[components/markets/SalesPhotoEvidencePostSalePrompt.tsx:36:17](../../components/markets/SalesPhotoEvidencePostSalePrompt.tsx#L36) | 成交已儲存 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | SalesPhotoEvidencePostSalePrompt<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-432ecf5d958a<br>[components/markets/SalesPhotoEvidencePostSalePrompt.tsx:43:26](../../components/markets/SalesPhotoEvidencePostSalePrompt.tsx#L43) | 稍後補拍 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidencePostSalePrompt · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8057e160ade4<br>[components/markets/SalesPhotoEvidencePostSalePrompt.tsx:51:15](../../components/markets/SalesPhotoEvidencePostSalePrompt.tsx#L51) | 這個市集要求保留商品照片。可以現在拍攝，也可以稍後從待補照片繼續。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidencePostSalePrompt<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f4cbd6b6f78d<br>[components/markets/SalesPhotoEvidencePostSalePrompt.tsx:60:35](../../components/markets/SalesPhotoEvidencePostSalePrompt.tsx#L60) | 拍攝商品 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidencePostSalePrompt<br>isCaptureReady |
| UI-78b347846dcc<br>[components/markets/SalesPhotoEvidencePostSalePrompt.tsx:60:44](../../components/markets/SalesPhotoEvidencePostSalePrompt.tsx#L60) | 開啟待補照片 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidencePostSalePrompt<br>否則 isCaptureReady |
| UI-a50dec9c2ad9<br>[components/markets/SalesPhotoEvidencePostSalePrompt.tsx:68:17](../../components/markets/SalesPhotoEvidencePostSalePrompt.tsx#L68) | 稍後補拍 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidencePostSalePrompt<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/markets/SalesPhotoEvidenceTestWorkbench.tsx

僅由測試／工具頁靜態引用

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-d194ee9ee685<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:45:46](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L45) | 已取消選擇照片。 | **來源候選** · 候選，非已證實提示<br>getCaptureFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getCaptureFailureMessage<br>reason === 'capture_cancelled' |
| UI-a0cdf1b9dba5<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:46:48](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L46) | 目前瀏覽器不支援拍照或圖片處理。 | **來源候選** · 候選，非已證實提示<br>getCaptureFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getCaptureFailureMessage<br>reason === 'adapter_unavailable' |
| UI-16f8d8248aa9<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:47:49](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L47) | 照片讀取失敗，請重新選擇。 | **來源候選** · 候選，非已證實提示<br>getCaptureFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getCaptureFailureMessage<br>reason === 'source_decode_failed' |
| UI-e9e778cb9a86<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:48:47](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L48) | 照片壓縮失敗，請重新選擇。 | **來源候選** · 候選，非已證實提示<br>getCaptureFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getCaptureFailureMessage<br>reason === 'compression_failed' |
| UI-337c1483fc87<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:49:10](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L49) | 照片格式或大小不符合限制。 | **來源候選** · 候選，非已證實提示<br>getCaptureFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getCaptureFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-00db4294c392<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:55:50](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L55) | ${label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | ReadinessItem<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-514d94fbbc07<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:58:18](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L58) | 就緒 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ReadinessItem<br>ready |
| UI-046b9bac8a22<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:58:25](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L58) | 未就緒 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ReadinessItem<br>否則 ready |
| UI-ca30b9d4008f<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:112:20](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L112) | 待補照片讀取失敗。 | **來源候選** · 候選，非已證實提示<br>loadItems 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | loadItems<br>catch：操作拋出例外 |
| UI-93647eae8b28<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:137:16](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L137) | [TEST] 成交照片測試頁建立 | **來源候選** · 候選，非已證實提示<br>result 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | result · notes<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-45c3da54f1d3<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:153:23](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L153) | 測試成交與待補照片已建立。 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleCreateTestSale<br>result.evidence.status === 'created' |
| UI-93ca6e5c4f12<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:155:23](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L155) | 測試成交已建立，照片任務狀態：${result.evidence.status} | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | handleCreateTestSale<br>否則 result.evidence.status === 'created' |
| UI-56ea93859730<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:159:19](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L159) | 測試成交建立失敗。 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleCreateTestSale<br>catch：操作拋出例外 |
| UI-7340130447fc<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:171:23](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L171) | 照片已暫存在本機。 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleCapture<br>result.action === 'capture_stored_locally' |
| UI-642c369abc2e<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:178:70](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L178) | ${message} | **動態文字入口** · 執行時綁定入口<br>handleCapture 接收執行時文字；內容需追查所列綁定與生產端 | handleCapture<br>result.failure.reason !== 'capture_cancelled' |
| UI-139540ea3c61<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:190:23](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L190) | 測試照片已上傳。 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleUpload<br>result.ok |
| UI-e1b481690b1f<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:193:21](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L193) | ${result.message} | **動態文字入口** · 執行時綁定入口<br>handleUpload 接收執行時文字；內容需追查所列綁定與生產端 | handleUpload<br>否則 result.ok |
| UI-03ae1a9904e6<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:198:23](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L198) | 照片上傳失敗。 | **來源候選** · 候選，非已證實提示<br>message 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | message<br>catch：操作拋出例外 |
| UI-675bf550503e<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:200:19](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L200) | ${message} | **動態文字入口** · 執行時綁定入口<br>handleUpload 接收執行時文字；內容需追查所列綁定與生產端 | handleUpload<br>catch：操作拋出例外 |
| UI-1e072e507e00<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:210:108](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L210) | 返回首頁 | **輔助辨識** · 直接呈現定義<br>提供 Link 的讀屏名稱、圖片替代文字或滑入說明 | SalesPhotoEvidenceTestWorkbench · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-78f7fe016edf<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:215:65](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L215) | 成交照片測試 | **畫面文字** · 直接呈現定義<br>h1：辨識畫面、區塊或對話框主題 | SalesPhotoEvidenceTestWorkbench<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e6c958cdc893<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:216:58](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L216) | Local / Staging 專用 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceTestWorkbench<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7602078087d3<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:223:70](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L223) | 環境狀態 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | SalesPhotoEvidenceTestWorkbench<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bbb52620fa4d<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:225:62](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L225) | 成交後建立照片任務 | **畫面文字** · 直接呈現定義<br>ReadinessItem：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceTestWorkbench · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d99619d81ff6<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:226:71](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L226) | 照片 metadata claim | **畫面文字** · 直接呈現定義<br>ReadinessItem：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceTestWorkbench · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f866752ee85a<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:227:97](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L227) | R2 照片上傳 | **畫面文字** · 直接呈現定義<br>ReadinessItem：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceTestWorkbench · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d55776137552<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:228:67](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L228) | 老闆端照片讀取 | **畫面文字** · 直接呈現定義<br>ReadinessItem：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceTestWorkbench · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0dcd3b649867<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:233:70](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L233) | 建立測試成交 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | SalesPhotoEvidenceTestWorkbench<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-072f1b8902f5<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:235:13](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L235) | 市集 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | SalesPhotoEvidenceTestWorkbench<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0303ceb5b6cb<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:243:55](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L243) | 目前沒有可用市集 | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | SalesPhotoEvidenceTestWorkbench<br>markets.length === 0 |
| UI-f932b675799c<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:245:58](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L245) | ${market.name} | **動態文字入口** · 執行時綁定入口<br>option 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceTestWorkbench<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-344257f88c8e<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:257:15](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L257) | 建立 NT$1 測試成交 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceTestWorkbench<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-efeb40859483<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:269:15](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L269) | 待補照片 ( | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceTestWorkbench<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a5e90db7b47f<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:269:35](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L269) | ) | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceTestWorkbench<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-53be1132d552<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:274:19](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L274) | 此操作會寫入一筆標記為 [TEST] 的真實成交。 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceTestWorkbench<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d0b8d67d6c81<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:277:17](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L277) | 開啟市集 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceTestWorkbench<br>selectedMarket?.id |
| UI-4f2144c0d659<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:282:66](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L282) | 請先登入 owner 或 staff 帳號。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceTestWorkbench<br>!user?.id |
| UI-cb9b334f35e3<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:283:77](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L283) | 選定市集缺少 owner 關聯資料。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceTestWorkbench<br>user?.id &amp;&amp; !ownerId |
| UI-707e8dbe7d29<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:286:15](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L286) | 最近結果： | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceTestWorkbench<br>lastResult |
| UI-162a79f4d5cf<br>[components/markets/SalesPhotoEvidenceTestWorkbench.tsx:286:51](../../components/markets/SalesPhotoEvidenceTestWorkbench.tsx#L286) | ${lastResult.evidence.status} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SalesPhotoEvidenceTestWorkbench<br>lastResult |

## components/products/ProductCoverPhotoField.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-d4e20f4a9106<br>[components/products/ProductCoverPhotoField.tsx:46:13](../../components/products/ProductCoverPhotoField.tsx#L46) | unavailable | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | [capability, setCapability] · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-aee09205ecc3<br>[components/products/ProductCoverPhotoField.tsx:102:11](../../components/products/ProductCoverPhotoField.tsx#L102) | 請允許使用相機或照片後再試，或到裝置設定調整權限。 | **狀態設定** · 文案生產端，須查使用端<br>setError：更新畫面訊息；仍須依呼叫端確認是否被渲染 | choose<br>catch：操作拋出例外 → error instanceof CameraSelectionError &amp;&amp; error.reason === 'permission_denied' |
| UI-466c33c9ee7a<br>[components/products/ProductCoverPhotoField.tsx:104:13](../../components/products/ProductCoverPhotoField.tsx#L104) | 這部裝置沒有可用的相機，請改從相簿選取。 | **狀態設定** · 文案生產端，須查使用端<br>setError：更新畫面訊息；仍須依呼叫端確認是否被渲染 | choose<br>catch：操作拋出例外 → 否則 error instanceof CameraSelectionError &amp;&amp; error.reason === 'permission_denied' → error instanceof CameraSelectionError &amp;&amp; error.reason === 'camera_not_found' |
| UI-53308e673568<br>[components/products/ProductCoverPhotoField.tsx:106:15](../../components/products/ProductCoverPhotoField.tsx#L106) | 目前無法開啟相機或相簿，請稍後再試。 | **狀態設定** · 文案生產端，須查使用端<br>setError：更新畫面訊息；仍須依呼叫端確認是否被渲染 | choose<br>catch：操作拋出例外 → 否則 error instanceof CameraSelectionError &amp;&amp; error.reason === 'permission_denied' → 否則 error instanceof CameraSelectionError &amp;&amp; error.reason === 'camera_not_found' → error instanceof CameraSelectionError &amp;&amp; error.reason === 'adapter_unavailable' |
| UI-86fa08f86e60<br>[components/products/ProductCoverPhotoField.tsx:107:15](../../components/products/ProductCoverPhotoField.tsx#L107) | 無法處理這張照片，請使用 25MB 以下的 JPEG、PNG 或 WebP。 | **狀態設定** · 文案生產端，須查使用端<br>setError：更新畫面訊息；仍須依呼叫端確認是否被渲染 | choose<br>catch：操作拋出例外 → 否則 error instanceof CameraSelectionError &amp;&amp; error.reason === 'permission_denied' → 否則 error instanceof CameraSelectionError &amp;&amp; error.reason === 'camera_not_found' → 否則 error instanceof CameraSelectionError &amp;&amp; error.reason === 'adapter_unavailable' |
| UI-1504a203eab6<br>[components/products/ProductCoverPhotoField.tsx:123:16](../../components/products/ProductCoverPhotoField.tsx#L123) | 照片刪除失敗，請確認網路後再試一次。 | **狀態設定** · 文案生產端，須查使用端<br>setError：更新畫面訊息；仍須依呼叫端確認是否被渲染 | removeCloud<br>catch：操作拋出例外 |
| UI-e19597393734<br>[components/products/ProductCoverPhotoField.tsx:141:7](../../components/products/ProductCoverPhotoField.tsx#L141) | 目前身分無法管理商品照片 | **來源候選** · 候選，非已證實提示<br>unavailableTitle 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | unavailableTitle<br>capability.reason === 'permission_denied' |
| UI-63775bcd55cd<br>[components/products/ProductCoverPhotoField.tsx:143:9](../../components/products/ProductCoverPhotoField.tsx#L143) | 商品照片功能尚未啟用 | **來源候選** · 候選，非已證實提示<br>unavailableTitle 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | unavailableTitle<br>否則 capability.reason === 'permission_denied' → capability.reason === 'runtime_disabled' |
| UI-ee88812ed3f9<br>[components/products/ProductCoverPhotoField.tsx:145:11](../../components/products/ProductCoverPhotoField.tsx#L145) | 登入狀態需要重新確認 | **來源候選** · 候選，非已證實提示<br>unavailableTitle 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | unavailableTitle<br>否則 capability.reason === 'permission_denied' → 否則 capability.reason === 'runtime_disabled' → capability.reason === 'authentication_required' |
| UI-4e228cd163d9<br>[components/products/ProductCoverPhotoField.tsx:147:13](../../components/products/ProductCoverPhotoField.tsx#L147) | 暫時無法確認商品照片權限 | **來源候選** · 候選，非已證實提示<br>unavailableTitle 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | unavailableTitle<br>否則 capability.reason === 'permission_denied' → 否則 capability.reason === 'runtime_disabled' → 否則 capability.reason === 'authentication_required' → capability.reason === 'entitlement_unavailable' |
| UI-a16f1a3da6f1<br>[components/products/ProductCoverPhotoField.tsx:148:13](../../components/products/ProductCoverPhotoField.tsx#L148) | 暫時無法確認商品照片功能 | **來源候選** · 候選，非已證實提示<br>unavailableTitle 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | unavailableTitle<br>否則 capability.reason === 'permission_denied' → 否則 capability.reason === 'runtime_disabled' → 否則 capability.reason === 'authentication_required' → 否則 capability.reason === 'entitlement_unavailable' |
| UI-cf8ec2e6c59f<br>[components/products/ProductCoverPhotoField.tsx:153:102](../../components/products/ProductCoverPhotoField.tsx#L153) | 商品封面照片 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | ProductCoverPhotoField<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-78789328f22a<br>[components/products/ProductCoverPhotoField.tsx:154:59](../../components/products/ProductCoverPhotoField.tsx#L154) | 每項商品支援一張封面，系統會自動壓縮成適合顯示的尺寸。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ProductCoverPhotoField<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-09448ec7c727<br>[components/products/ProductCoverPhotoField.tsx:161:43](../../components/products/ProductCoverPhotoField.tsx#L161) | 待上傳的商品封面 | **輔助辨識** · 直接呈現定義<br>提供 img 的讀屏名稱、圖片替代文字或滑入說明 | ProductCoverPhotoField · alt<br>(canChoose &#124;&#124; value &#124;&#124; productId) → value |
| UI-8c8f8d50f6a2<br>[components/products/ProductCoverPhotoField.tsx:167:43](../../components/products/ProductCoverPhotoField.tsx#L167) | 商品 | **來源候選** · 候選，非已證實提示<br>ProductCoverPhotoField 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | ProductCoverPhotoField · productName<br>(canChoose &#124;&#124; value &#124;&#124; productId) → 否則 value → productId |
| UI-00ad0e425320<br>[components/products/ProductCoverPhotoField.tsx:183:62](../../components/products/ProductCoverPhotoField.tsx#L183) | 正在確認商品照片功能 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ProductCoverPhotoField<br>capabilityStatus === 'loading' |
| UI-f62eee200496<br>[components/products/ProductCoverPhotoField.tsx:195:27](../../components/products/ProductCoverPhotoField.tsx#L195) | 處理中 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductCoverPhotoField<br>否則 capabilityStatus === 'loading' → canChoose → processing |
| UI-fa63e2e0ffca<br>[components/products/ProductCoverPhotoField.tsx:195:63](../../components/products/ProductCoverPhotoField.tsx#L195) | 更換照片 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductCoverPhotoField<br>否則 capabilityStatus === 'loading' → canChoose → 否則 processing → value &#124;&#124; cloudPhotoExists |
| UI-e0288a87f9c3<br>[components/products/ProductCoverPhotoField.tsx:195:72](../../components/products/ProductCoverPhotoField.tsx#L195) | 加入照片 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductCoverPhotoField<br>否則 capabilityStatus === 'loading' → canChoose → 否則 processing → 否則 value &#124;&#124; cloudPhotoExists |
| UI-3b0ddb65ccd0<br>[components/products/ProductCoverPhotoField.tsx:199:13](../../components/products/ProductCoverPhotoField.tsx#L199) | 拍照 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductCoverPhotoField<br>否則 capabilityStatus === 'loading' → canChoose |
| UI-427fd7c75182<br>[components/products/ProductCoverPhotoField.tsx:203:15](../../components/products/ProductCoverPhotoField.tsx#L203) | 取消選取 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductCoverPhotoField<br>否則 capabilityStatus === 'loading' → canChoose → value |
| UI-411839584e6d<br>[components/products/ProductCoverPhotoField.tsx:208:15](../../components/products/ProductCoverPhotoField.tsx#L208) | 刪除照片 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductCoverPhotoField<br>否則 capabilityStatus === 'loading' → canChoose → !value &amp;&amp; canDeleteCloud |
| UI-da4c4c5f6f58<br>[components/products/ProductCoverPhotoField.tsx:223:18](../../components/products/ProductCoverPhotoField.tsx#L223) | ${planBlock.actionLabel} | **動態文字入口** · 執行時綁定入口<br>a 接收執行時文字；內容需追查所列綁定與生產端 | ProductCoverPhotoField<br>否則 capabilityStatus === 'loading' → 否則 canChoose → planBlock?.showPlanPreviewLink |
| UI-7703ae88055c<br>[components/products/ProductCoverPhotoField.tsx:235:17](../../components/products/ProductCoverPhotoField.tsx#L235) | 重新確認 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductCoverPhotoField<br>否則 capabilityStatus === 'loading' → 否則 canChoose → retryableCapability |
| UI-bdbbeee8578a<br>[components/products/ProductCoverPhotoField.tsx:241:15](../../components/products/ProductCoverPhotoField.tsx#L241) | 刪除 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | ProductCoverPhotoField<br>否則 capabilityStatus === 'loading' → 否則 canChoose → canDeleteCloud |
| UI-724afe51eb5c<br>[components/products/ProductCoverPhotoField.tsx:247:78](../../components/products/ProductCoverPhotoField.tsx#L247) | ${error} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | ProductCoverPhotoField<br>error |

## components/products/ProductCoverPhotoImage.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-c345d31b4814<br>[components/products/ProductCoverPhotoImage.tsx:63:12](../../components/products/ProductCoverPhotoImage.tsx#L63) | ${productName}的商品照片 | **輔助辨識** · 直接呈現定義<br>提供 img 的讀屏名稱、圖片替代文字或滑入說明 | ProductCoverPhotoImage · alt<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/sales/CartDrawer.tsx

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-6bf953d6354a<br>[components/sales/CartDrawer.tsx:117:19](../../components/sales/CartDrawer.tsx#L117) | 購物車是空的 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleCheckout<br>cart.size === 0 |
| UI-3b1ca30826cc<br>[components/sales/CartDrawer.tsx:151:21](../../components/sales/CartDrawer.tsx#L151) | 🎉 辛苦了！成交一筆 NT$${totalAmount.toLocaleString()} | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleCheckout<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a085f9941c12<br>[components/sales/CartDrawer.tsx:152:22](../../components/sales/CartDrawer.tsx#L152) | 共 ${totalItems} 件商品 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleCheckout · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1a38a510d23f<br>[components/sales/CartDrawer.tsx:162:19](../../components/sales/CartDrawer.tsx#L162) | 結帳失敗，請稍後再試 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleCheckout<br>catch：操作拋出例外 |
| UI-1a2bd60ac02f<br>[components/sales/CartDrawer.tsx:170:29](../../components/sales/CartDrawer.tsx#L170) | 現金 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | paymentMethods · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bff469638c17<br>[components/sales/CartDrawer.tsx:171:31](../../components/sales/CartDrawer.tsx#L171) | 行動支付 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | paymentMethods · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-85fd99a03bd4<br>[components/sales/CartDrawer.tsx:172:29](../../components/sales/CartDrawer.tsx#L172) | 信用卡 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | paymentMethods · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b4616279722b<br>[components/sales/CartDrawer.tsx:203:62](../../components/sales/CartDrawer.tsx#L203) | 購物車 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | CartDrawer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7099ebd98ad7<br>[components/sales/CartDrawer.tsx:206:32](../../components/sales/CartDrawer.tsx#L206) | ${totalItems} 件 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | CartDrawer<br>totalItems &gt; 0 |
| UI-9dc325157e0d<br>[components/sales/CartDrawer.tsx:219:78](../../components/sales/CartDrawer.tsx#L219) | 選擇商品 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | CartDrawer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-572aa8f726be<br>[components/sales/CartDrawer.tsx:245:26](../../components/sales/CartDrawer.tsx#L245) | ${product.name} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | CartDrawer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-280ae6397830<br>[components/sales/CartDrawer.tsx:248:25](../../components/sales/CartDrawer.tsx#L248) | $${product.price} | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | CartDrawer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cc208ade6c83<br>[components/sales/CartDrawer.tsx:260:77](../../components/sales/CartDrawer.tsx#L260) | 購物車明細 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | CartDrawer<br>cart.size &gt; 0 |
| UI-98dfff44c1ff<br>[components/sales/CartDrawer.tsx:265:21](../../components/sales/CartDrawer.tsx#L265) | 清空 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CartDrawer<br>cart.size &gt; 0 |
| UI-49c0288f9a75<br>[components/sales/CartDrawer.tsx:276:28](../../components/sales/CartDrawer.tsx#L276) | ${item.product.name} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | CartDrawer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-50faa8be068a<br>[components/sales/CartDrawer.tsx:279:27](../../components/sales/CartDrawer.tsx#L279) | $${item.product.price} × ${item.quantity} | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | CartDrawer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dca7800b005c<br>[components/sales/CartDrawer.tsx:299:27](../../components/sales/CartDrawer.tsx#L299) | $${(item.product.price * item.quantity).toLocaleString()} | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | CartDrawer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-504cb03bd8b3<br>[components/sales/CartDrawer.tsx:311:80](../../components/sales/CartDrawer.tsx#L311) | 支付方式 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | CartDrawer<br>cart.size &gt; 0 |
| UI-f8b1e2db10d8<br>[components/sales/CartDrawer.tsx:327:28](../../components/sales/CartDrawer.tsx#L327) | ${method.label} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | CartDrawer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d7b5ff9bd21c<br>[components/sales/CartDrawer.tsx:340:63](../../components/sales/CartDrawer.tsx#L340) | 總計 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | CartDrawer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fc80cc2a2d61<br>[components/sales/CartDrawer.tsx:342:17](../../components/sales/CartDrawer.tsx#L342) | $${totalAmount.toLocaleString()} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | CartDrawer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-80cf015c2fac<br>[components/sales/CartDrawer.tsx:350:31](../../components/sales/CartDrawer.tsx#L350) | 處理中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CartDrawer<br>isProcessing |
| UI-9266c4cc5c4a<br>[components/sales/CartDrawer.tsx:350:42](../../components/sales/CartDrawer.tsx#L350) | 完成結帳 ${totalItems &gt; 0 ? &#96;(${totalItems} 件)&#96; : ''} | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CartDrawer<br>否則 isProcessing |
| UI-9a47e24ab250<br>[components/sales/CartDrawer.tsx:350:67](../../components/sales/CartDrawer.tsx#L350) | (${totalItems} 件) | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CartDrawer<br>否則 isProcessing → totalItems &gt; 0 |

## components/sales/InteractionButtons.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-0ac47de9d3b0<br>[components/sales/InteractionButtons.tsx:57:21](../../components/sales/InteractionButtons.tsx#L57) | ${label}已復原 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleUndoInteraction<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e1983a326f60<br>[components/sales/InteractionButtons.tsx:61:19](../../components/sales/InteractionButtons.tsx#L61) | 復原失敗，請從最近紀錄處理 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleUndoInteraction<br>catch：操作拋出例外 |
| UI-afac6b269e6e<br>[components/sales/InteractionButtons.tsx:70:19](../../components/sales/InteractionButtons.tsx#L70) | 操作太快 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleInteraction<br>now - lastClickTime.current &lt; 500 |
| UI-05fca77bca3c<br>[components/sales/InteractionButtons.tsx:71:22](../../components/sales/InteractionButtons.tsx#L71) | 請稍等一下再記錄 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleInteraction · description<br>now - lastClickTime.current &lt; 500 |
| UI-5ec07b1a2832<br>[components/sales/InteractionButtons.tsx:87:21](../../components/sales/InteractionButtons.tsx#L87) | ${label} | **動態文字入口** · 執行時綁定入口<br>handleInteraction 接收執行時文字；內容需追查所列綁定與生產端 | handleInteraction<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ed7b3ee4c28d<br>[components/sales/InteractionButtons.tsx:88:22](../../components/sales/InteractionButtons.tsx#L88) | 互動已記錄 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleInteraction · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-59bd6af3255c<br>[components/sales/InteractionButtons.tsx:91:18](../../components/sales/InteractionButtons.tsx#L91) | 復原 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleInteraction · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fc46bfe96729<br>[components/sales/InteractionButtons.tsx:98:19](../../components/sales/InteractionButtons.tsx#L98) | 記錄失敗，請稍後再試 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleInteraction<br>catch：操作拋出例外 |
| UI-1f7739244f3f<br>[components/sales/InteractionButtons.tsx:130:130](../../components/sales/InteractionButtons.tsx#L130) | ${button.label} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | InteractionButtons<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-85a37a1541a6<br>[components/sales/InteractionButtons.tsx:136:38](../../components/sales/InteractionButtons.tsx#L136) | ${lastRecordedInteraction.label}已記錄 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | InteractionButtons<br>lastRecordedInteraction |
| UI-bb47cbbd300d<br>[components/sales/InteractionButtons.tsx:147:13](../../components/sales/InteractionButtons.tsx#L147) | 復原 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | InteractionButtons<br>lastRecordedInteraction |

## components/sales/LiveMetrics.tsx

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-e552d1eb319a<br>[components/sales/LiveMetrics.tsx:28:61](../../components/sales/LiveMetrics.tsx#L28) | 即時營業指標 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | LiveMetrics<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a1981af69fef<br>[components/sales/LiveMetrics.tsx:36:61](../../components/sales/LiveMetrics.tsx#L36) | 成交金額 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | LiveMetrics<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7c622f77ea25<br>[components/sales/LiveMetrics.tsx:39:13](../../components/sales/LiveMetrics.tsx#L39) | $${metrics.totalRevenue.toLocaleString()} | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | LiveMetrics<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e2588f6b14ee<br>[components/sales/LiveMetrics.tsx:42:33](../../components/sales/LiveMetrics.tsx#L42) | ${metrics.dealCount} 筆交易 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | LiveMetrics<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c2ca47aff5fc<br>[components/sales/LiveMetrics.tsx:50:61](../../components/sales/LiveMetrics.tsx#L50) | 客單價 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | LiveMetrics<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5cce577df339<br>[components/sales/LiveMetrics.tsx:53:13](../../components/sales/LiveMetrics.tsx#L53) | $${Math.round(metrics.averageOrderValue).toLocaleString()} | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | LiveMetrics<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-210b1691094b<br>[components/sales/LiveMetrics.tsx:56:13](../../components/sales/LiveMetrics.tsx#L56) | AOV | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | LiveMetrics<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e21a14a9fad0<br>[components/sales/LiveMetrics.tsx:64:61](../../components/sales/LiveMetrics.tsx#L64) | 互動次數 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | LiveMetrics<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-25b71d006071<br>[components/sales/LiveMetrics.tsx:70:13](../../components/sales/LiveMetrics.tsx#L70) | 次 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | LiveMetrics<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-17c23db925b4<br>[components/sales/LiveMetrics.tsx:78:61](../../components/sales/LiveMetrics.tsx#L78) | 轉換率 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | LiveMetrics<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fe6114f3097b<br>[components/sales/LiveMetrics.tsx:81:48](../../components/sales/LiveMetrics.tsx#L81) | ${metrics.conversionRate.toFixed(1)}% | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | LiveMetrics<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9ea84a3a76ba<br>[components/sales/LiveMetrics.tsx:84:13](../../components/sales/LiveMetrics.tsx#L84) | 成交 / 互動 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | LiveMetrics<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/sales/PaymentMethodSelector.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-288ac5cb8fc5<br>[components/sales/PaymentMethodSelector.tsx:31:69](../../components/sales/PaymentMethodSelector.tsx#L31) | 支付方式 | **畫面文字** · 直接呈現定義<br>legend：說明欄位或欄位群組 | PaymentMethodSelector<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-30b7ede57c78<br>[components/sales/PaymentMethodSelector.tsx:32:91](../../components/sales/PaymentMethodSelector.tsx#L32) | 支付方式 | **輔助辨識** · 直接呈現定義<br>提供 div 的讀屏名稱、圖片替代文字或滑入說明 | PaymentMethodSelector · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1048971d1a3e<br>[components/sales/PaymentMethodSelector.tsx:51:20](../../components/sales/PaymentMethodSelector.tsx#L51) | ${SALES_PAYMENT_METHOD_LABELS[method]} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | PaymentMethodSelector<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/sales/QuickDealModal.tsx

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-2e6f5d7114ba<br>[components/sales/QuickDealModal.tsx:27:46](../../components/sales/QuickDealModal.tsx#L27) | 現金 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | paymentMethods · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a9b6da111807<br>[components/sales/QuickDealModal.tsx:28:48](../../components/sales/QuickDealModal.tsx#L28) | LINE Pay | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | paymentMethods · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4209a9d52702<br>[components/sales/QuickDealModal.tsx:29:46](../../components/sales/QuickDealModal.tsx#L29) | 轉帳 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | paymentMethods · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3a8f908f49b4<br>[components/sales/QuickDealModal.tsx:30:47](../../components/sales/QuickDealModal.tsx#L30) | 其他 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | paymentMethods · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a3978a4b071c<br>[components/sales/QuickDealModal.tsx:37:19](../../components/sales/QuickDealModal.tsx#L37) | 請先輸入有效的金額 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handlePaymentMethodSelect<br>isNaN(amountNum) &#124;&#124; amountNum &lt;= 0 |
| UI-f4179da014f2<br>[components/sales/QuickDealModal.tsx:50:16](../../components/sales/QuickDealModal.tsx#L50) | 快速成交 | **來源候選** · 候選，非已證實提示<br>handlePaymentMethodSelect 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handlePaymentMethodSelect · notes<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a009fa96f02c<br>[components/sales/QuickDealModal.tsx:53:82](../../components/sales/QuickDealModal.tsx#L53) | 未知 | **來源候選** · 候選，非已證實提示<br>methodLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | methodLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-623a0009d25c<br>[components/sales/QuickDealModal.tsx:54:21](../../components/sales/QuickDealModal.tsx#L54) | 💰 成交成功！ | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handlePaymentMethodSelect<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6b5475aa2f37<br>[components/sales/QuickDealModal.tsx:55:22](../../components/sales/QuickDealModal.tsx#L55) | ${methodLabel} - $${amountNum.toLocaleString()} | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handlePaymentMethodSelect · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f2c01649f5b2<br>[components/sales/QuickDealModal.tsx:64:19](../../components/sales/QuickDealModal.tsx#L64) | 成交失敗，請稍後再試 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handlePaymentMethodSelect<br>catch：操作拋出例外 |
| UI-b7645b8bffd8<br>[components/sales/QuickDealModal.tsx:82:15](../../components/sales/QuickDealModal.tsx#L82) | 快速成交 | **畫面文字** · 直接呈現定義<br>DialogTitle：辨識畫面、區塊或對話框主題 | QuickDealModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ac34f6bf784f<br>[components/sales/QuickDealModal.tsx:97:17](../../components/sales/QuickDealModal.tsx#L97) | 成交金額 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | QuickDealModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d31389fef763<br>[components/sales/QuickDealModal.tsx:97:52](../../components/sales/QuickDealModal.tsx#L97) | * | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | QuickDealModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cc493f10822e<br>[components/sales/QuickDealModal.tsx:101:19](../../components/sales/QuickDealModal.tsx#L101) | $ | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | QuickDealModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9ce52c36e893<br>[components/sales/QuickDealModal.tsx:107:31](../../components/sales/QuickDealModal.tsx#L107) | 0 | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | QuickDealModal · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-263fc217dbdc<br>[components/sales/QuickDealModal.tsx:119:17](../../components/sales/QuickDealModal.tsx#L119) | 選擇支付方式完成交易 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | QuickDealModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0039f05b331f<br>[components/sales/QuickDealModal.tsx:132:24](../../components/sales/QuickDealModal.tsx#L132) | ${method.label} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | QuickDealModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8103c168561f<br>[components/sales/QuickDealModal.tsx:138:17](../../components/sales/QuickDealModal.tsx#L138) | 💡 點擊支付方式即可完成交易 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | QuickDealModal<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/sales/QuickInteractionButtons.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-e2c6eca5759a<br>[components/sales/QuickInteractionButtons.tsx:56:19](../../components/sales/QuickInteractionButtons.tsx#L56) | 請輸入金額 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleQuickDeal<br>!Number.isFinite(amount) &#124;&#124; amount &lt;= 0 |
| UI-18a34813313c<br>[components/sales/QuickInteractionButtons.tsx:87:19](../../components/sales/QuickInteractionButtons.tsx#L87) | 記錄失敗，資料已保留在本機等待同步 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleQuickDeal<br>catch：操作拋出例外 |
| UI-ee361b291b5c<br>[components/sales/QuickInteractionButtons.tsx:102:26](../../components/sales/QuickInteractionButtons.tsx#L102) | 成交完成 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleQuickDeal<br>否則 onSalesPhotoEvidenceResult |
| UI-8b5dcf41e7dd<br>[components/sales/QuickInteractionButtons.tsx:102:49](../../components/sales/QuickInteractionButtons.tsx#L102) | NT$${amount.toLocaleString()} | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleQuickDeal · description<br>否則 onSalesPhotoEvidenceResult |
| UI-e1b3df932dbf<br>[components/sales/QuickInteractionButtons.tsx:105:21](../../components/sales/QuickInteractionButtons.tsx#L105) | 交易已完成，請從待補照片補上紀錄 | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | handleQuickDeal<br>catch：操作拋出例外 |
| UI-4867257d9653<br>[components/sales/QuickInteractionButtons.tsx:117:61](../../components/sales/QuickInteractionButtons.tsx#L117) | 收款金額 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | QuickInteractionButtons<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0106555350d9<br>[components/sales/QuickInteractionButtons.tsx:118:51](../../components/sales/QuickInteractionButtons.tsx#L118) | 新台幣 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | QuickInteractionButtons<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e456bc8dc7a1<br>[components/sales/QuickInteractionButtons.tsx:124:13](../../components/sales/QuickInteractionButtons.tsx#L124) | NT$ ${amount.toLocaleString()} | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | QuickInteractionButtons<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-89fcaad3cdce<br>[components/sales/QuickInteractionButtons.tsx:131:24](../../components/sales/QuickInteractionButtons.tsx#L131) | 清除金額 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | QuickInteractionButtons · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f6f83cc78a93<br>[components/sales/QuickInteractionButtons.tsx:156:11](../../components/sales/QuickInteractionButtons.tsx#L156) | 00 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | QuickInteractionButtons<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6a6af9e3782d<br>[components/sales/QuickInteractionButtons.tsx:164:11](../../components/sales/QuickInteractionButtons.tsx#L164) | 0 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | QuickInteractionButtons<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6877878d6e65<br>[components/sales/QuickInteractionButtons.tsx:171:22](../../components/sales/QuickInteractionButtons.tsx#L171) | 刪除最後一位數字 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | QuickInteractionButtons · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2bfc24ee8b17<br>[components/sales/QuickInteractionButtons.tsx:190:25](../../components/sales/QuickInteractionButtons.tsx#L190) | 正在記錄交易 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | QuickInteractionButtons<br>isProcessing |
| UI-5e13e6ac17df<br>[components/sales/QuickInteractionButtons.tsx:190:36](../../components/sales/QuickInteractionButtons.tsx#L190) | 完成收款 NT$${amount.toLocaleString()} | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | QuickInteractionButtons<br>否則 isProcessing |

## components/sales/QuickTransactionGrid.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-041e22118a0e<br>[components/sales/QuickTransactionGrid.tsx:138:19](../../components/sales/QuickTransactionGrid.tsx#L138) | 記錄失敗，資料已保留在本機等待同步 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleCheckout<br>catch：操作拋出例外 |
| UI-05f67e4749e8<br>[components/sales/QuickTransactionGrid.tsx:152:26](../../components/sales/QuickTransactionGrid.tsx#L152) | 成交完成 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleCheckout<br>否則 onSalesPhotoEvidenceResult |
| UI-01ec501992d9<br>[components/sales/QuickTransactionGrid.tsx:152:49](../../components/sales/QuickTransactionGrid.tsx#L152) | NT$${totalAmount.toLocaleString()} | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleCheckout · description<br>否則 onSalesPhotoEvidenceResult |
| UI-d224cd11540a<br>[components/sales/QuickTransactionGrid.tsx:155:21](../../components/sales/QuickTransactionGrid.tsx#L155) | 交易已完成，請從待補照片補上紀錄 | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | handleCheckout<br>catch：操作拋出例外 |
| UI-582ac6bc4ba3<br>[components/sales/QuickTransactionGrid.tsx:166:63](../../components/sales/QuickTransactionGrid.tsx#L166) | 選擇商品 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | content<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8603e6b5c5a3<br>[components/sales/QuickTransactionGrid.tsx:167:60](../../components/sales/QuickTransactionGrid.tsx#L167) | 再次點選可增加數量 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | content<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-275104b888b0<br>[components/sales/QuickTransactionGrid.tsx:170:11](../../components/sales/QuickTransactionGrid.tsx#L170) | 管理商品 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | content<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1906e3366f50<br>[components/sales/QuickTransactionGrid.tsx:196:90](../../components/sales/QuickTransactionGrid.tsx#L196) | ${product.name} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | content<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f3f2561ec628<br>[components/sales/QuickTransactionGrid.tsx:198:19](../../components/sales/QuickTransactionGrid.tsx#L198) | NT$${product.price.toLocaleString()} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | content<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7d9f0838c05b<br>[components/sales/QuickTransactionGrid.tsx:207:56](../../components/sales/QuickTransactionGrid.tsx#L207) | 尚未建立可銷售商品 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | content<br>否則 products &amp;&amp; products.length &gt; 0 |
| UI-f8060146e825<br>[components/sales/QuickTransactionGrid.tsx:209:13](../../components/sales/QuickTransactionGrid.tsx#L209) | 前往新增商品 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | content<br>否則 products &amp;&amp; products.length &gt; 0 |
| UI-f95159935490<br>[components/sales/QuickTransactionGrid.tsx:217:65](../../components/sales/QuickTransactionGrid.tsx#L217) | 本次商品 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | content<br>cart.size &gt; 0 |
| UI-d6819b50de18<br>[components/sales/QuickTransactionGrid.tsx:225:15](../../components/sales/QuickTransactionGrid.tsx#L225) | 清空 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | content<br>cart.size &gt; 0 |
| UI-7621c57de2c1<br>[components/sales/QuickTransactionGrid.tsx:233:80](../../components/sales/QuickTransactionGrid.tsx#L233) | ${item.product.name} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | content<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b416030888be<br>[components/sales/QuickTransactionGrid.tsx:235:21](../../components/sales/QuickTransactionGrid.tsx#L235) | NT$${(item.product.price * item.quantity).toLocaleString()} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | content<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-efc12a0323bb<br>[components/sales/QuickTransactionGrid.tsx:238:79](../../components/sales/QuickTransactionGrid.tsx#L238) | ${item.product.name} 數量 | **輔助辨識** · 直接呈現定義<br>提供 div 的讀屏名稱、圖片替代文字或滑入說明 | content · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-00d6be3fc418<br>[components/sales/QuickTransactionGrid.tsx:244:33](../../components/sales/QuickTransactionGrid.tsx#L244) | 減少 ${item.product.name} 數量 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | content · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-275892566380<br>[components/sales/QuickTransactionGrid.tsx:256:33](../../components/sales/QuickTransactionGrid.tsx#L256) | 增加 ${item.product.name} 數量 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | content · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8d76e7a60196<br>[components/sales/QuickTransactionGrid.tsx:269:61](../../components/sales/QuickTransactionGrid.tsx#L269) | 交易總額 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | content<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-53f0a72b46bb<br>[components/sales/QuickTransactionGrid.tsx:270:63](../../components/sales/QuickTransactionGrid.tsx#L270) | NT$${totalAmount.toLocaleString()} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | content<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-09eb46e13fe3<br>[components/sales/QuickTransactionGrid.tsx:286:25](../../components/sales/QuickTransactionGrid.tsx#L286) | 正在記錄交易 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | content<br>isProcessing |
| UI-e63e10feeb42<br>[components/sales/QuickTransactionGrid.tsx:286:36](../../components/sales/QuickTransactionGrid.tsx#L286) | 完成交易 NT$${totalAmount.toLocaleString()} | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | content<br>否則 isProcessing |
| UI-177766a417b6<br>[components/sales/QuickTransactionGrid.tsx:298:11](../../components/sales/QuickTransactionGrid.tsx#L298) | 商品銷售 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | QuickTransactionGrid<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ea60f91de0f4<br>[components/sales/QuickTransactionGrid.tsx:307:24](../../components/sales/QuickTransactionGrid.tsx#L307) | 切換商品銷售區塊 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | QuickTransactionGrid · aria-label<br>onToggle |

## components/sales/TransactionWorkspace.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-bad553d6c49a<br>[components/sales/TransactionWorkspace.tsx:121:65](../../components/sales/TransactionWorkspace.tsx#L121) | 現場收款 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TransactionWorkspace<br>!isSheet |
| UI-74d0b0636184<br>[components/sales/TransactionWorkspace.tsx:122:71](../../components/sales/TransactionWorkspace.tsx#L122) | 把這筆交易收好 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | TransactionWorkspace<br>!isSheet |
| UI-8c5664a94181<br>[components/sales/TransactionWorkspace.tsx:124:13](../../components/sales/TransactionWorkspace.tsx#L124) | 成交後安全儲存 · ${salesPhotoEvidenceRequired ? '本場需拍照' : '本場免拍照'} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TransactionWorkspace<br>!isSheet |
| UI-c7cb6c818ed2<br>[components/sales/TransactionWorkspace.tsx:124:53](../../components/sales/TransactionWorkspace.tsx#L124) | 本場需拍照 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TransactionWorkspace<br>!isSheet → salesPhotoEvidenceRequired |
| UI-c220cfbd61bd<br>[components/sales/TransactionWorkspace.tsx:124:63](../../components/sales/TransactionWorkspace.tsx#L124) | 本場免拍照 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TransactionWorkspace<br>!isSheet → 否則 salesPhotoEvidenceRequired |
| UI-c9b4c87b74c0<br>[components/sales/TransactionWorkspace.tsx:132:25](../../components/sales/TransactionWorkspace.tsx#L132) | 待補照片 ${pendingPhotoCount} 筆 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | TransactionWorkspace · aria-label<br>!isSheet → pendingPhotoCount &gt; 0 |
| UI-5ed557b6ad41<br>[components/sales/TransactionWorkspace.tsx:135:13](../../components/sales/TransactionWorkspace.tsx#L135) | 待補 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | TransactionWorkspace<br>!isSheet → pendingPhotoCount &gt; 0 |
| UI-0ce46be27b13<br>[components/sales/TransactionWorkspace.tsx:141:205](../../components/sales/TransactionWorkspace.tsx#L141) | 查看本機待補照片 | **輔助辨識** · 直接呈現定義<br>提供 button 的讀屏名稱、圖片替代文字或滑入說明 | TransactionWorkspace · aria-label<br>!isSheet → 否則 pendingPhotoCount &gt; 0 |
| UI-92a3611e6f97<br>[components/sales/TransactionWorkspace.tsx:143:13](../../components/sales/TransactionWorkspace.tsx#L143) | 本機待補 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | TransactionWorkspace<br>!isSheet → 否則 pendingPhotoCount &gt; 0 |
| UI-23d51a3211b6<br>[components/sales/TransactionWorkspace.tsx:149:128](../../components/sales/TransactionWorkspace.tsx#L149) | 交易方式 | **輔助辨識** · 直接呈現定義<br>提供 div 的讀屏名稱、圖片替代文字或滑入說明 | TransactionWorkspace · aria-label<br>!isSheet |
| UI-e2b6c2780d8f<br>[components/sales/TransactionWorkspace.tsx:162:13](../../components/sales/TransactionWorkspace.tsx#L162) | 快速收款 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | TransactionWorkspace<br>!isSheet |
| UI-24297dbe3376<br>[components/sales/TransactionWorkspace.tsx:176:13](../../components/sales/TransactionWorkspace.tsx#L176) | 商品銷售 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | TransactionWorkspace<br>!isSheet |
| UI-ba82686d4af3<br>[components/sales/TransactionWorkspace.tsx:185:17](../../components/sales/TransactionWorkspace.tsx#L185) | 這筆收好了，已安全儲存 NT$${recentSale.amount.toLocaleString()} · ${formatSalesPaymentMethod(recentSale.paymentMethod)} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | TransactionWorkspace<br>!isSheet → recentSale |
| UI-2918fbaa02ac<br>[components/sales/TransactionWorkspace.tsx:202:40](../../components/sales/TransactionWorkspace.tsx#L202) | ${salesPhotoEvidenceContext} | **動態文字入口** · 執行時綁定入口<br>QuickInteractionButtons 接收執行時文字；內容需追查所列綁定與生產端 | TransactionWorkspace · salesPhotoEvidenceContext<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7e8ab34b07ba<br>[components/sales/TransactionWorkspace.tsx:220:40](../../components/sales/TransactionWorkspace.tsx#L220) | ${salesPhotoEvidenceContext} | **動態文字入口** · 執行時綁定入口<br>QuickTransactionGrid 接收執行時文字；內容需追查所列綁定與生產端 | TransactionWorkspace · salesPhotoEvidenceContext<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/settings/SalesPhotoEvidenceSettingsCard.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-c80bf6cbefd9<br>[components/settings/SalesPhotoEvidenceSettingsCard.tsx:32:21](../../components/settings/SalesPhotoEvidenceSettingsCard.tsx#L32) | 載入成交照片紀錄設定失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | SalesPhotoEvidenceSettingsCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ff97aba7c2da<br>[components/settings/SalesPhotoEvidenceSettingsCard.tsx:54:21](../../components/settings/SalesPhotoEvidenceSettingsCard.tsx#L54) | 成交照片紀錄設定已更新 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSave<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7b6d8d783e95<br>[components/settings/SalesPhotoEvidenceSettingsCard.tsx:57:37](../../components/settings/SalesPhotoEvidenceSettingsCard.tsx#L57) | 儲存成交照片紀錄設定失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleSave<br>catch：操作拋出例外 |
| UI-e2c801a5368f<br>[components/settings/SalesPhotoEvidenceSettingsCard.tsx:70:63](../../components/settings/SalesPhotoEvidenceSettingsCard.tsx#L70) | 成交照片紀錄 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | SalesPhotoEvidenceSettingsCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-28f7ffd46b3a<br>[components/settings/SalesPhotoEvidenceSettingsCard.tsx:72:13](../../components/settings/SalesPhotoEvidenceSettingsCard.tsx#L72) | 設定新建立的市集是否預設需要員工在成交後補上照片。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceSettingsCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-459d099f91e1<br>[components/settings/SalesPhotoEvidenceSettingsCard.tsx:84:71](../../components/settings/SalesPhotoEvidenceSettingsCard.tsx#L84) | 新市集預設需要成交照片 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceSettingsCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-946af46f2a15<br>[components/settings/SalesPhotoEvidenceSettingsCard.tsx:86:13](../../components/settings/SalesPhotoEvidenceSettingsCard.tsx#L86) | 只影響之後新增的市集，不會修改既有市集。 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SalesPhotoEvidenceSettingsCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fee20d74f9c9<br>[components/settings/SalesPhotoEvidenceSettingsCard.tsx:110:21](../../components/settings/SalesPhotoEvidenceSettingsCard.tsx#L110) | 儲存中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceSettingsCard<br>isSaving |
| UI-145e3eaf3828<br>[components/settings/SalesPhotoEvidenceSettingsCard.tsx:110:32](../../components/settings/SalesPhotoEvidenceSettingsCard.tsx#L110) | 儲存成交照片設定 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SalesPhotoEvidenceSettingsCard<br>否則 isSaving |

## hooks/useSalesPhotoEvidenceFlow.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-c972edd8222b<br>[hooks/useSalesPhotoEvidenceFlow.ts:42:14](../../hooks/useSalesPhotoEvidenceFlow.ts#L42) | 目前無法開啟相機或相簿，請稍後再試。 | **來源候選** · 候選，非已證實提示<br>captureFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | captureFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-69a29be9cd13<br>[hooks/useSalesPhotoEvidenceFlow.ts:44:14](../../hooks/useSalesPhotoEvidenceFlow.ts#L44) | 請允許使用相機或照片後再試，或到裝置設定調整權限。 | **來源候選** · 候選，非已證實提示<br>captureFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | captureFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-23b4c2109ac2<br>[hooks/useSalesPhotoEvidenceFlow.ts:46:14](../../hooks/useSalesPhotoEvidenceFlow.ts#L46) | 這部裝置沒有可用的相機，請改從相簿選取。 | **來源候選** · 候選，非已證實提示<br>captureFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | captureFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ad6512ca7f50<br>[hooks/useSalesPhotoEvidenceFlow.ts:48:14](../../hooks/useSalesPhotoEvidenceFlow.ts#L48) | 照片讀取失敗，請重新拍照或選擇其他照片。 | **來源候選** · 候選，非已證實提示<br>captureFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | captureFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8d9743985ceb<br>[hooks/useSalesPhotoEvidenceFlow.ts:50:14](../../hooks/useSalesPhotoEvidenceFlow.ts#L50) | 照片處理失敗，請重新拍照或選擇其他照片。 | **來源候選** · 候選，非已證實提示<br>captureFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | captureFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4d595a6abce2<br>[hooks/useSalesPhotoEvidenceFlow.ts:52:14](../../hooks/useSalesPhotoEvidenceFlow.ts#L52) | 這張照片無法使用，請重新拍攝或選擇其他照片。 | **來源候選** · 候選，非已證實提示<br>captureFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | captureFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9b39fe9a374f<br>[hooks/useSalesPhotoEvidenceFlow.ts:54:14](../../hooks/useSalesPhotoEvidenceFlow.ts#L54) | 照片處理失敗，請稍後再試。 | **來源候選** · 候選，非已證實提示<br>captureFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | captureFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cb0fd8ca8a30<br>[hooks/useSalesPhotoEvidenceFlow.ts:64:16](../../hooks/useSalesPhotoEvidenceFlow.ts#L64) | 成交紀錄 | **共用文案值** · 文案生產端，須查使用端<br>itemLabel：供畫面或訊息組裝使用的標籤／說明值 | fallbackSummary · itemLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c8f4cceac8d2<br>[hooks/useSalesPhotoEvidenceFlow.ts:91:29](../../hooks/useSalesPhotoEvidenceFlow.ts#L91) | 此處列出這台裝置的待補工作。其他裝置尚未上傳的照片不會自動出現在此處，請回原裝置完成。 | **來源候選** · 候選，非已證實提示<br>localScopeMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | localScopeMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8d7714e7e67a<br>[hooks/useSalesPhotoEvidenceFlow.ts:118:21](../../hooks/useSalesPhotoEvidenceFlow.ts#L118) | 已核對雲端照片紀錄並還原有依據的待補工作。${plan.unknownSaleCount &gt; 0 ? &#96;另有 ${plan.unknownSaleCount} 筆舊成交未記錄當時的照片要求，無法確認是否待補。&#96; : ''}其他裝置尚未上傳的原圖無法還原；可回原裝置上傳，或在此重新選取。 | **來源候選** · 候選，非已證實提示<br>loadPendingItems 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | loadPendingItems<br>recoveryOwnerId &amp;&amp; actorId === recoveryOwnerId &amp;&amp; isSalesPhotoEvidenceRuntimeEnqueueEnabled() |
| UI-e757ebf88b35<br>[hooks/useSalesPhotoEvidenceFlow.ts:119:15](../../hooks/useSalesPhotoEvidenceFlow.ts#L119) | 另有 ${plan.unknownSaleCount} 筆舊成交未記錄當時的照片要求，無法確認是否待補。 | **來源候選** · 候選，非已證實提示<br>loadPendingItems 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | loadPendingItems<br>recoveryOwnerId &amp;&amp; actorId === recoveryOwnerId &amp;&amp; isSalesPhotoEvidenceRuntimeEnqueueEnabled() → plan.unknownSaleCount &gt; 0 |
| UI-92cdefa11b54<br>[hooks/useSalesPhotoEvidenceFlow.ts:123:21](../../hooks/useSalesPhotoEvidenceFlow.ts#L123) | 目前無法核對雲端照片狀態，先顯示本機待補工作。請確認網路後按重新整理；本機無待補不代表其他裝置已完成。 | **來源候選** · 候選，非已證實提示<br>loadPendingItems 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | loadPendingItems<br>recoveryOwnerId &amp;&amp; actorId === recoveryOwnerId &amp;&amp; isSalesPhotoEvidenceRuntimeEnqueueEnabled() → catch：操作拋出例外 |
| UI-7c2483b3d020<br>[hooks/useSalesPhotoEvidenceFlow.ts:139:28](../../hooks/useSalesPhotoEvidenceFlow.ts#L139) | 待補照片讀取失敗，請稍後再試。 | **來源候選** · 候選，非已證實提示<br>loadPendingItems 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | loadPendingItems<br>catch：操作拋出例外 |
| UI-2f84fdb920c2<br>[hooks/useSalesPhotoEvidenceFlow.ts:170:23](../../hooks/useSalesPhotoEvidenceFlow.ts#L170) | 補登完成，照片已列入待補 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSalesPhotoEvidenceResult<br>pendingItem → summary.isBackfill |
| UI-a2c577e9d4ff<br>[hooks/useSalesPhotoEvidenceFlow.ts:173:20](../../hooks/useSalesPhotoEvidenceFlow.ts#L173) | 現在補照片 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSalesPhotoEvidenceResult · label<br>pendingItem → summary.isBackfill |
| UI-e08b0477f080<br>[hooks/useSalesPhotoEvidenceFlow.ts:195:21](../../hooks/useSalesPhotoEvidenceFlow.ts#L195) | 成交已記錄，照片功能暫時無法使用。 | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | handleSalesPhotoEvidenceResult<br>result.evidence.status === 'failed' &#124;&#124; result.evidence.status === 'context_missing' |
| UI-77b8facc2f05<br>[hooks/useSalesPhotoEvidenceFlow.ts:196:22](../../hooks/useSalesPhotoEvidenceFlow.ts#L196) | 請先保留商品照片，稍後再補上紀錄。 | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | handleSalesPhotoEvidenceResult · description<br>result.evidence.status === 'failed' &#124;&#124; result.evidence.status === 'context_missing' |
| UI-52e5ab14cc93<br>[hooks/useSalesPhotoEvidenceFlow.ts:202:40](../../hooks/useSalesPhotoEvidenceFlow.ts#L202) | 補登完成 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSalesPhotoEvidenceResult<br>summary.isBackfill |
| UI-ced17219f1b2<br>[hooks/useSalesPhotoEvidenceFlow.ts:202:49](../../hooks/useSalesPhotoEvidenceFlow.ts#L202) | 成交完成 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSalesPhotoEvidenceResult<br>否則 summary.isBackfill |
| UI-d5b30261d366<br>[hooks/useSalesPhotoEvidenceFlow.ts:243:19](../../hooks/useSalesPhotoEvidenceFlow.ts#L243) | 你目前無法處理這筆成交照片。 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | capture<br>!canHandleItem(item) |
| UI-b2a211246f4a<br>[hooks/useSalesPhotoEvidenceFlow.ts:287:49](../../hooks/useSalesPhotoEvidenceFlow.ts#L287) | 照片處理失敗，請稍後再試。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | capture · message<br>catch：操作拋出例外 → 否則 error instanceof CameraSelectionError |
| UI-4dc99a7c4f0d<br>[hooks/useSalesPhotoEvidenceFlow.ts:301:19](../../hooks/useSalesPhotoEvidenceFlow.ts#L301) | 你目前無法處理這筆成交照片。 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | upload<br>!canHandleItem(item) |
| UI-179e1d6050ea<br>[hooks/useSalesPhotoEvidenceFlow.ts:338:50](../../hooks/useSalesPhotoEvidenceFlow.ts#L338) | 照片上傳失敗，照片仍安全保留在此裝置。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | upload · message<br>catch：操作拋出例外 |
| UI-d87d647e04ef<br>[hooks/useSalesPhotoEvidenceFlow.ts:350:75](../../hooks/useSalesPhotoEvidenceFlow.ts#L350) | 正在確認待補照片的資料範圍。 | **共用文案值** · 文案生產端，須查使用端<br>pendingScopeMessage：供畫面或訊息組裝使用的標籤／說明值 | useSalesPhotoEvidenceFlow · pendingScopeMessage<br>否則 loadedScope === scopeKey |

## lib/db/deal-closed-projection.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-db1281fb2bf2<br>[lib/db/deal-closed-projection.ts:94:5](../../lib/db/deal-closed-projection.ts#L94) | 商品 | **來源候選** · 候選，非已證實提示<br>productName 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | productName<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/products/product-cover-photo-client.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-b4dae428170f<br>[lib/products/product-cover-photo-client.ts:29:52](../../lib/products/product-cover-photo-client.ts#L29) | authentication_required | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | token<br>!data.session?.access_token |
| UI-9f4bb9ab2f8b<br>[lib/products/product-cover-photo-client.ts:51:58](../../lib/products/product-cover-photo-client.ts#L51) | unavailable | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | getProductCoverPhotoCapability · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-25885f75f09d<br>[lib/products/product-cover-photo-client.ts:53:58](../../lib/products/product-cover-photo-client.ts#L53) | unavailable | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | getProductCoverPhotoCapability · reason<br>catch：操作拋出例外 |
| UI-527153ebdd30<br>[lib/products/product-cover-photo-client.ts:64:88](../../lib/products/product-cover-photo-client.ts#L64) | upload_failed | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | uploadProductCoverPhoto<br>!response.ok |
| UI-c576f4a79aa0<br>[lib/products/product-cover-photo-client.ts:71:37](../../lib/products/product-cover-photo-client.ts#L71) | delete_failed | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | deleteProductCoverPhoto<br>!response.ok |

## lib/products/product-cover-photo-server.ts

未追到正式頁面引用（待核對動態接線／保留碼）

同檔旗標（不代表每列均受它控制）：`NEXT_PUBLIC_SUPABASE_URL`。

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-45751f239669<br>[lib/products/product-cover-photo-server.ts:54:37](../../lib/products/product-cover-photo-server.ts#L54) | open_access | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveProductCoverPhotoPlanAccess · reason<br>!input.entitlementRequired |
| UI-d88a9a231fc2<br>[lib/products/product-cover-photo-server.ts:57:38](../../lib/products/product-cover-photo-server.ts#L57) | entitlement_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveProductCoverPhotoPlanAccess · reason<br>!input.repository |
| UI-ca6a196e48f2<br>[lib/products/product-cover-photo-server.ts:67:38](../../lib/products/product-cover-photo-server.ts#L67) | entitlement_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveProductCoverPhotoPlanAccess · reason<br>resolution.outcome !== 'available' |
| UI-7a59482c0348<br>[lib/products/product-cover-photo-server.ts:87:37](../../lib/products/product-cover-photo-server.ts#L87) | paid_active | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveProductCoverPhotoPlanAccess · reason<br>decision.allowed |
| UI-0b5189cb3c20<br>[lib/products/product-cover-photo-server.ts:90:38](../../lib/products/product-cover-photo-server.ts#L90) | free_plan | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveProductCoverPhotoPlanAccess · reason<br>decision.reason === 'plan_required' |
| UI-5de972b95a06<br>[lib/products/product-cover-photo-server.ts:96:38](../../lib/products/product-cover-photo-server.ts#L96) | subscription_inactive | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveProductCoverPhotoPlanAccess · reason<br>decision.reason === 'entitlement_inactive' &#124;&#124; decision.reason === 'promotion_reward_expired' |
| UI-03f4d4668f5d<br>[lib/products/product-cover-photo-server.ts:98:36](../../lib/products/product-cover-photo-server.ts#L98) | entitlement_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveProductCoverPhotoPlanAccess · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sales/payment-methods.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-a98d35232f38<br>[lib/sales/payment-methods.ts:13:9](../../lib/sales/payment-methods.ts#L13) | 現金 | **來源候選** · 候選，非已證實提示<br>SALES_PAYMENT_METHOD_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SALES_PAYMENT_METHOD_LABELS · cash<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-efffe3006c97<br>[lib/sales/payment-methods.ts:14:11](../../lib/sales/payment-methods.ts#L14) | 行動支付 | **來源候選** · 候選，非已證實提示<br>SALES_PAYMENT_METHOD_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SALES_PAYMENT_METHOD_LABELS · mobile<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5efa82627f29<br>[lib/sales/payment-methods.ts:15:9](../../lib/sales/payment-methods.ts#L15) | 信用卡／轉帳 | **來源候選** · 候選，非已證實提示<br>SALES_PAYMENT_METHOD_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SALES_PAYMENT_METHOD_LABELS · card<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c4efce78bee0<br>[lib/sales/payment-methods.ts:16:10](../../lib/sales/payment-methods.ts#L16) | 其他 | **來源候選** · 候選，非已證實提示<br>SALES_PAYMENT_METHOD_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SALES_PAYMENT_METHOD_LABELS · other<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sales/photo-evidence-browser-adapter-contract.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-b053c7d92127<br>[lib/sales/photo-evidence-browser-adapter-contract.ts:108:15](../../lib/sales/photo-evidence-browser-adapter-contract.ts#L108) | insecure_context | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifySalesPhotoEvidenceBrowserAdapterReadiness · reason<br>!snapshot.secureContext |
| UI-0fd18d5eda10<br>[lib/sales/photo-evidence-browser-adapter-contract.ts:109:16](../../lib/sales/photo-evidence-browser-adapter-contract.ts#L109) | Photo evidence capture requires a secure browser context. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | classifySalesPhotoEvidenceBrowserAdapterReadiness · message<br>!snapshot.secureContext |
| UI-9f809c0e4b53<br>[lib/sales/photo-evidence-browser-adapter-contract.ts:116:15](../../lib/sales/photo-evidence-browser-adapter-contract.ts#L116) | media_capture_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifySalesPhotoEvidenceBrowserAdapterReadiness · reason<br>!snapshot.mediaCaptureAvailable |
| UI-1ca39b100352<br>[lib/sales/photo-evidence-browser-adapter-contract.ts:117:16](../../lib/sales/photo-evidence-browser-adapter-contract.ts#L117) | Photo evidence capture is not available on this browser or device. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | classifySalesPhotoEvidenceBrowserAdapterReadiness · message<br>!snapshot.mediaCaptureAvailable |
| UI-3fe13a12a68f<br>[lib/sales/photo-evidence-browser-adapter-contract.ts:124:15](../../lib/sales/photo-evidence-browser-adapter-contract.ts#L124) | image_processing_unavailable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifySalesPhotoEvidenceBrowserAdapterReadiness · reason<br>!snapshot.imageProcessingAvailable |
| UI-f2d9f3a14430<br>[lib/sales/photo-evidence-browser-adapter-contract.ts:125:16](../../lib/sales/photo-evidence-browser-adapter-contract.ts#L125) | Photo evidence compression is not available on this browser or device. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | classifySalesPhotoEvidenceBrowserAdapterReadiness · message<br>!snapshot.imageProcessingAvailable |
| UI-6f0d57169551<br>[lib/sales/photo-evidence-browser-adapter-contract.ts:131:13](../../lib/sales/photo-evidence-browser-adapter-contract.ts#L131) | browser_adapter_supported | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifySalesPhotoEvidenceBrowserAdapterReadiness · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-642dd22e4d12<br>[lib/sales/photo-evidence-browser-adapter-contract.ts:160:15](../../lib/sales/photo-evidence-browser-adapter-contract.ts#L160) | capture_precheck_failed | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createSalesPhotoEvidenceBrowserAdapterPlan · reason<br>input.captureDecision.action !== 'prepare_compression' |
| UI-7edc76b4a153<br>[lib/sales/photo-evidence-browser-adapter-contract.ts:169:15](../../lib/sales/photo-evidence-browser-adapter-contract.ts#L169) | missing_compression_plan | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createSalesPhotoEvidenceBrowserAdapterPlan · reason<br>!plan |
| UI-bd4c4ab5a3d3<br>[lib/sales/photo-evidence-browser-adapter-contract.ts:170:16](../../lib/sales/photo-evidence-browser-adapter-contract.ts#L170) | Photo evidence browser adapter requires a prepared compression plan. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | createSalesPhotoEvidenceBrowserAdapterPlan · message<br>!plan |
| UI-9036214a634f<br>[lib/sales/photo-evidence-browser-adapter-contract.ts:176:13](../../lib/sales/photo-evidence-browser-adapter-contract.ts#L176) | compression_plan_ready | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createSalesPhotoEvidenceBrowserAdapterPlan · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sales/photo-evidence-browser-adapter.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-6fd209b694e1<br>[lib/sales/photo-evidence-browser-adapter.ts:77:38](../../lib/sales/photo-evidence-browser-adapter.ts#L77) | undefined | **共用文案值** · 文案生產端，須查使用端<br>secureContext：供畫面或訊息組裝使用的標籤／說明值 | getSalesPhotoEvidenceWebCapabilitySnapshot · secureContext<br>typeof window !== 'undefined' |
| UI-12fe080ac910<br>[lib/sales/photo-evidence-browser-adapter.ts:133:24](../../lib/sales/photo-evidence-browser-adapter.ts#L133) | Image decode failed | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | loadImageElement<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7bbafca3612e<br>[lib/sales/photo-evidence-browser-adapter.ts:154:19](../../lib/sales/photo-evidence-browser-adapter.ts#L154) | Image decode is unavailable | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | decodeImageFile<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cd0d7ce68812<br>[lib/sales/photo-evidence-browser-adapter.ts:176:21](../../lib/sales/photo-evidence-browser-adapter.ts#L176) | Web Crypto is unavailable | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | hashBlob<br>typeof crypto === 'undefined' &#124;&#124; !crypto.subtle |
| UI-766783019f27<br>[lib/sales/photo-evidence-browser-adapter.ts:190:21](../../lib/sales/photo-evidence-browser-adapter.ts#L190) | Canvas rendering is unavailable | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | renderCanvasVariant<br>typeof document === 'undefined' |
| UI-e2d70c1fc478<br>[lib/sales/photo-evidence-browser-adapter.ts:199:33](../../lib/sales/photo-evidence-browser-adapter.ts#L199) | Canvas 2D context is unavailable | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | renderCanvasVariant<br>!context |
| UI-9928f99ce634<br>[lib/sales/photo-evidence-browser-adapter.ts:222:19](../../lib/sales/photo-evidence-browser-adapter.ts#L222) | Unable to render ${variant.kind} within policy | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | renderCanvasVariant<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sales/photo-evidence-capture-compression.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-3ffd929ec147<br>[lib/sales/photo-evidence-capture-compression.ts:116:15](../../lib/sales/photo-evidence-capture-compression.ts#L116) | unsupported_mime_type | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planSalesPhotoEvidenceCaptureCompression · reason<br>!isSupportedSourceMimeType(image.mimeType) |
| UI-4fa04712dc75<br>[lib/sales/photo-evidence-capture-compression.ts:117:16](../../lib/sales/photo-evidence-capture-compression.ts#L117) | Captured image type is not supported for sales photo evidence. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | planSalesPhotoEvidenceCaptureCompression · message<br>!isSupportedSourceMimeType(image.mimeType) |
| UI-d9825078ea61<br>[lib/sales/photo-evidence-capture-compression.ts:124:15](../../lib/sales/photo-evidence-capture-compression.ts#L124) | invalid_file_size | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planSalesPhotoEvidenceCaptureCompression · reason<br>!isFinitePositiveInteger(image.fileSizeBytes) |
| UI-91e238278ba8<br>[lib/sales/photo-evidence-capture-compression.ts:125:16](../../lib/sales/photo-evidence-capture-compression.ts#L125) | Captured image file size is invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | planSalesPhotoEvidenceCaptureCompression · message<br>!isFinitePositiveInteger(image.fileSizeBytes) |
| UI-68a871531cdf<br>[lib/sales/photo-evidence-capture-compression.ts:132:15](../../lib/sales/photo-evidence-capture-compression.ts#L132) | source_file_too_large | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planSalesPhotoEvidenceCaptureCompression · reason<br>image.fileSizeBytes &gt; SALES_PHOTO_EVIDENCE_MAX_SOURCE_FILE_SIZE_BYTES |
| UI-af8f22cc6be6<br>[lib/sales/photo-evidence-capture-compression.ts:133:16](../../lib/sales/photo-evidence-capture-compression.ts#L133) | Captured image is too large to process safely on this device. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | planSalesPhotoEvidenceCaptureCompression · message<br>image.fileSizeBytes &gt; SALES_PHOTO_EVIDENCE_MAX_SOURCE_FILE_SIZE_BYTES |
| UI-8e7a40b550a5<br>[lib/sales/photo-evidence-capture-compression.ts:140:15](../../lib/sales/photo-evidence-capture-compression.ts#L140) | invalid_image_dimensions | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planSalesPhotoEvidenceCaptureCompression · reason<br>!isFinitePositiveInteger(image.width) &#124;&#124; !isFinitePositiveInteger(image.height) |
| UI-5415aa87720e<br>[lib/sales/photo-evidence-capture-compression.ts:141:16](../../lib/sales/photo-evidence-capture-compression.ts#L141) | Captured image dimensions are invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | planSalesPhotoEvidenceCaptureCompression · message<br>!isFinitePositiveInteger(image.width) &#124;&#124; !isFinitePositiveInteger(image.height) |
| UI-35932758a146<br>[lib/sales/photo-evidence-capture-compression.ts:147:13](../../lib/sales/photo-evidence-capture-compression.ts#L147) | supported_image | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planSalesPhotoEvidenceCaptureCompression · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6f49d1b8facc<br>[lib/sales/photo-evidence-capture-compression.ts:183:15](../../lib/sales/photo-evidence-capture-compression.ts#L183) | unsupported_output_mime_type | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifySalesPhotoEvidenceCompressionOutput · reason<br>output.mimeType !== 'image/webp' &amp;&amp; output.mimeType !== 'image/jpeg' |
| UI-ec1b8b3a6326<br>[lib/sales/photo-evidence-capture-compression.ts:184:16](../../lib/sales/photo-evidence-capture-compression.ts#L184) | Compressed image output type is not supported. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | classifySalesPhotoEvidenceCompressionOutput · message<br>output.mimeType !== 'image/webp' &amp;&amp; output.mimeType !== 'image/jpeg' |
| UI-cd70d4e4397c<br>[lib/sales/photo-evidence-capture-compression.ts:191:15](../../lib/sales/photo-evidence-capture-compression.ts#L191) | invalid_output_file_size | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifySalesPhotoEvidenceCompressionOutput · reason<br>!isFinitePositiveInteger(output.fileSizeBytes) |
| UI-4b1d6b2ddc1e<br>[lib/sales/photo-evidence-capture-compression.ts:192:16](../../lib/sales/photo-evidence-capture-compression.ts#L192) | Compressed image output size is invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | classifySalesPhotoEvidenceCompressionOutput · message<br>!isFinitePositiveInteger(output.fileSizeBytes) |
| UI-e8646b04fcbb<br>[lib/sales/photo-evidence-capture-compression.ts:199:15](../../lib/sales/photo-evidence-capture-compression.ts#L199) | output_too_large | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifySalesPhotoEvidenceCompressionOutput · reason<br>output.fileSizeBytes &gt; SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes |
| UI-ee30af1454a6<br>[lib/sales/photo-evidence-capture-compression.ts:200:16](../../lib/sales/photo-evidence-capture-compression.ts#L200) | Compressed image is still larger than the sales photo evidence limit. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | classifySalesPhotoEvidenceCompressionOutput · message<br>output.fileSizeBytes &gt; SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes |
| UI-c4f2dc73fb56<br>[lib/sales/photo-evidence-capture-compression.ts:207:15](../../lib/sales/photo-evidence-capture-compression.ts#L207) | invalid_output_dimensions | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifySalesPhotoEvidenceCompressionOutput · reason<br>!isFinitePositiveInteger(output.width) &#124;&#124; !isFinitePositiveInteger(output.height) |
| UI-f87cdd57ddd4<br>[lib/sales/photo-evidence-capture-compression.ts:208:16](../../lib/sales/photo-evidence-capture-compression.ts#L208) | Compressed image dimensions are invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | classifySalesPhotoEvidenceCompressionOutput · message<br>!isFinitePositiveInteger(output.width) &#124;&#124; !isFinitePositiveInteger(output.height) |
| UI-53d4653085e0<br>[lib/sales/photo-evidence-capture-compression.ts:214:13](../../lib/sales/photo-evidence-capture-compression.ts#L214) | within_policy | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifySalesPhotoEvidenceCompressionOutput · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sales/photo-evidence-deferred.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-17e4ce3bc4ec<br>[lib/sales/photo-evidence-deferred.ts:62:15](../../lib/sales/photo-evidence-deferred.ts#L62) | missing_deal_event_id | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planDeferredSalesPhotoEvidenceCreation · reason<br>!dealEventId |
| UI-b76c4a82c7fc<br>[lib/sales/photo-evidence-deferred.ts:69:15](../../lib/sales/photo-evidence-deferred.ts#L69) | not_deal_closed_event | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planDeferredSalesPhotoEvidenceCreation · reason<br>input.dealEvent.type !== 'deal_closed' |
| UI-15263f7ad09e<br>[lib/sales/photo-evidence-deferred.ts:77:15](../../lib/sales/photo-evidence-deferred.ts#L77) | deal_event_not_synced | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planDeferredSalesPhotoEvidenceCreation · reason<br>syncStatus !== 'synced' |
| UI-921b5fdfa09e<br>[lib/sales/photo-evidence-deferred.ts:98:17](../../lib/sales/photo-evidence-deferred.ts#L98) | market_not_required | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planDeferredSalesPhotoEvidenceCreation · reason<br>decision.action === 'not_required' |
| UI-cc86a0c09a0f<br>[lib/sales/photo-evidence-deferred.ts:106:17](../../lib/sales/photo-evidence-deferred.ts#L106) | active_evidence_exists | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planDeferredSalesPhotoEvidenceCreation · reason<br>decision.action === 'skip_existing' |
| UI-5756b08c7b6a<br>[lib/sales/photo-evidence-deferred.ts:113:15](../../lib/sales/photo-evidence-deferred.ts#L113) | synced_deal_requires_evidence | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planDeferredSalesPhotoEvidenceCreation · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-add188f3e703<br>[lib/sales/photo-evidence-deferred.ts:120:15](../../lib/sales/photo-evidence-deferred.ts#L120) | invalid_requirement_input | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planDeferredSalesPhotoEvidenceCreation · reason<br>catch：操作拋出例外 |

## lib/sales/photo-evidence-manual-upload-client.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-f175ecd5c583<br>[lib/sales/photo-evidence-manual-upload-client.ts:129:14](../../lib/sales/photo-evidence-manual-upload-client.ts#L129) | 成交資料仍在同步，照片已保留在此裝置。請確認網路後稍候再試。 | **來源候選** · 候選，非已證實提示<br>getUserFacingUploadFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getUserFacingUploadFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a1ac0085da42<br>[lib/sales/photo-evidence-manual-upload-client.ts:131:14](../../lib/sales/photo-evidence-manual-upload-client.ts#L131) | 成交資料驗證失敗，照片仍保留在此裝置。請稍候再試；若持續發生，請聯絡管理者檢查雲端資料設定。 | **來源候選** · 候選，非已證實提示<br>getUserFacingUploadFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getUserFacingUploadFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-78c86fd2343b<br>[lib/sales/photo-evidence-manual-upload-client.ts:134:14](../../lib/sales/photo-evidence-manual-upload-client.ts#L134) | 照片儲存服務上傳失敗，照片仍保留在此裝置，請稍後再試。 | **來源候選** · 候選，非已證實提示<br>getUserFacingUploadFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getUserFacingUploadFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-085bf33f9b26<br>[lib/sales/photo-evidence-manual-upload-client.ts:136:14](../../lib/sales/photo-evidence-manual-upload-client.ts#L136) | 照片已傳送但成交紀錄更新失敗，本機照片已保留，請稍後再試。 | **來源候選** · 候選，非已證實提示<br>getUserFacingUploadFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getUserFacingUploadFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4a7666ccb265<br>[lib/sales/photo-evidence-manual-upload-client.ts:139:14](../../lib/sales/photo-evidence-manual-upload-client.ts#L139) | 正式環境的照片上傳功能尚未完整啟用，請檢查 Vercel 的照片上傳環境變數。 | **來源候選** · 候選，非已證實提示<br>getUserFacingUploadFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getUserFacingUploadFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-be04b9535474<br>[lib/sales/photo-evidence-manual-upload-client.ts:141:14](../../lib/sales/photo-evidence-manual-upload-client.ts#L141) | 登入狀態已失效，請重新登入後再上傳照片。 | **來源候選** · 候選，非已證實提示<br>getUserFacingUploadFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getUserFacingUploadFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-89bfbcfd2fac<br>[lib/sales/photo-evidence-manual-upload-client.ts:144:14](../../lib/sales/photo-evidence-manual-upload-client.ts#L144) | 照片上傳服務暫時發生錯誤，照片已保留在此裝置，請稍後再試。 | **來源候選** · 候選，非已證實提示<br>getUserFacingUploadFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getUserFacingUploadFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d68ecb883664<br>[lib/sales/photo-evidence-manual-upload-client.ts:146:14](../../lib/sales/photo-evidence-manual-upload-client.ts#L146) | 照片上傳逾時，照片已保留在此裝置。請確認網路後再試。 | **來源候選** · 候選，非已證實提示<br>getUserFacingUploadFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getUserFacingUploadFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-42656a6969f0<br>[lib/sales/photo-evidence-manual-upload-client.ts:148:14](../../lib/sales/photo-evidence-manual-upload-client.ts#L148) | 目前帳號沒有上傳這筆成交照片的權限，照片仍保留在此裝置。 | **來源候選** · 候選，非已證實提示<br>getUserFacingUploadFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getUserFacingUploadFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-feb9845691fb<br>[lib/sales/photo-evidence-manual-upload-client.ts:151:14](../../lib/sales/photo-evidence-manual-upload-client.ts#L151) | 照片資料格式無法上傳，照片仍保留在此裝置，請重新選擇照片後再試。 | **來源候選** · 候選，非已證實提示<br>getUserFacingUploadFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getUserFacingUploadFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d0c0bb6224f1<br>[lib/sales/photo-evidence-manual-upload-client.ts:153:14](../../lib/sales/photo-evidence-manual-upload-client.ts#L153) | 照片上傳失敗，照片仍保留在此裝置，請稍後再試。 | **來源候選** · 候選，非已證實提示<br>getUserFacingUploadFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getUserFacingUploadFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dea0f363f10d<br>[lib/sales/photo-evidence-manual-upload-client.ts:259:45](../../lib/sales/photo-evidence-manual-upload-client.ts#L259) | 請先選擇照片，或重新選擇照片後再上傳。 | **來源候選** · 候選，非已證實提示<br>uploadPendingSalesPhotoEvidenceManually 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | uploadPendingSalesPhotoEvidenceManually<br>!payload |
| UI-54db3d9b35c3<br>[lib/sales/photo-evidence-manual-upload-client.ts:284:47](../../lib/sales/photo-evidence-manual-upload-client.ts#L284) | 登入狀態已失效，請重新登入後再上傳照片。 | **來源候選** · 候選，非已證實提示<br>uploadPendingSalesPhotoEvidenceManually 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | uploadPendingSalesPhotoEvidenceManually<br>!token |
| UI-b8cea98bcf45<br>[lib/sales/photo-evidence-manual-upload-client.ts:311:13](../../lib/sales/photo-evidence-manual-upload-client.ts#L311) | 網路連線失敗，照片已保留在此裝置。請確認網路後再試。 | **來源候選** · 候選，非已證實提示<br>result 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | result<br>catch：操作拋出例外 → 否則 isAppApiUrlError(error) → 否則 isAppApiRequestError(error) &amp;&amp; error.code === 'request_timeout' |

## lib/sales/photo-evidence-metadata-claim-adapter.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-c7f854cac0d8<br>[lib/sales/photo-evidence-metadata-claim-adapter.ts:138:15](../../lib/sales/photo-evidence-metadata-claim-adapter.ts#L138) | metadata_claim_failed | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | executeSalesPhotoEvidenceMetadataClaimAdapter · reason<br>catch：操作拋出例外 |
| UI-124d5341ff4c<br>[lib/sales/photo-evidence-metadata-claim-adapter.ts:139:16](../../lib/sales/photo-evidence-metadata-claim-adapter.ts#L139) | Sales photo evidence metadata lookup failed. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | executeSalesPhotoEvidenceMetadataClaimAdapter · message<br>catch：操作拋出例外 |
| UI-ec367336c5ab<br>[lib/sales/photo-evidence-metadata-claim-adapter.ts:227:15](../../lib/sales/photo-evidence-metadata-claim-adapter.ts#L227) | metadata_claim_failed | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | executeSalesPhotoEvidenceMetadataClaimAdapter · reason<br>catch：操作拋出例外 |
| UI-96524a4c2f2d<br>[lib/sales/photo-evidence-metadata-claim-adapter.ts:228:16](../../lib/sales/photo-evidence-metadata-claim-adapter.ts#L228) | Sales photo evidence metadata claim write failed. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | executeSalesPhotoEvidenceMetadataClaimAdapter · message<br>catch：操作拋出例外 |

## lib/sales/photo-evidence-metadata-claim.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-99843f164c7e<br>[lib/sales/photo-evidence-metadata-claim.ts:140:53](../../lib/sales/photo-evidence-metadata-claim.ts#L140) | Actor is not allowed to claim this sales photo evidence row. | **來源候選** · 候選，非已證實提示<br>createSalesPhotoEvidenceMetadataClaimPlan 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | createSalesPhotoEvidenceMetadataClaimPlan<br>!isAuthorizedClaimActor(input) |
| UI-57a474b7297b<br>[lib/sales/photo-evidence-metadata-claim.ts:144:50](../../lib/sales/photo-evidence-metadata-claim.ts#L144) | Sale event or evidence row does not match the requested owner and market scope. | **來源候選** · 候選，非已證實提示<br>createSalesPhotoEvidenceMetadataClaimPlan 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | createSalesPhotoEvidenceMetadataClaimPlan<br>!isSaleEventValid(input) &#124;&#124; !isExistingEvidenceValid(input) |
| UI-f7843ef4d470<br>[lib/sales/photo-evidence-metadata-claim.ts:156:15](../../lib/sales/photo-evidence-metadata-claim.ts#L156) | already_uploaded | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createSalesPhotoEvidenceMetadataClaimPlan · reason<br>transition.action === 'skip_upload_transition' |
| UI-f39d362fd945<br>[lib/sales/photo-evidence-metadata-claim.ts:168:11](../../lib/sales/photo-evidence-metadata-claim.ts#L168) | Local sales photo evidence payload is missing. | **來源候選** · 候選，非已證實提示<br>createSalesPhotoEvidenceMetadataClaimPlan 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | createSalesPhotoEvidenceMetadataClaimPlan<br>transition.action === 'reject_upload_transition' → transition.reason === 'payload_missing' |
| UI-2d558130585a<br>[lib/sales/photo-evidence-metadata-claim.ts:169:11](../../lib/sales/photo-evidence-metadata-claim.ts#L169) | Sales photo evidence row is not uploadable from its current status. | **來源候選** · 候選，非已證實提示<br>createSalesPhotoEvidenceMetadataClaimPlan 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | createSalesPhotoEvidenceMetadataClaimPlan<br>transition.action === 'reject_upload_transition' → 否則 transition.reason === 'payload_missing' |

## lib/sales/photo-evidence-model.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-ceac0ef1230e<br>[lib/sales/photo-evidence-model.ts:135:21](../../lib/sales/photo-evidence-model.ts#L135) | ${fieldName} is required | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | requireObjectKeySegment<br>typeof value !== 'string' &#124;&#124; value.length === 0 |
| UI-1cd3f8c847c2<br>[lib/sales/photo-evidence-model.ts:139:21](../../lib/sales/photo-evidence-model.ts#L139) | ${fieldName} contains invalid object-key characters | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | requireObjectKeySegment<br>!OBJECT_KEY_SEGMENT_PATTERN.test(value) |
| UI-451bbdc20597<br>[lib/sales/photo-evidence-model.ts:147:21](../../lib/sales/photo-evidence-model.ts#L147) | ${fieldName} is required | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | requireUuid<br>typeof value !== 'string' &#124;&#124; value.length === 0 |
| UI-e5f8102472b2<br>[lib/sales/photo-evidence-model.ts:151:21](../../lib/sales/photo-evidence-model.ts#L151) | ${fieldName} must be a UUID | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | requireUuid<br>!UUID_PATTERN.test(value) |
| UI-1171d342c814<br>[lib/sales/photo-evidence-model.ts:162:21](../../lib/sales/photo-evidence-model.ts#L162) | ${fieldName} must be a valid date | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | normalizeEvidenceDate<br>!Number.isFinite(time) |
| UI-bbee3032b949<br>[lib/sales/photo-evidence-model.ts:208:15](../../lib/sales/photo-evidence-model.ts#L208) | market_not_required | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createSalesPhotoEvidenceRequirementDecision · reason<br>!input.marketRequiresEvidence |
| UI-4220b1551ef2<br>[lib/sales/photo-evidence-model.ts:224:15](../../lib/sales/photo-evidence-model.ts#L224) | active_evidence_exists | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createSalesPhotoEvidenceRequirementDecision · reason<br>existingEvidence |
| UI-ae9cd0d266f6<br>[lib/sales/photo-evidence-model.ts:231:13](../../lib/sales/photo-evidence-model.ts#L231) | market_requires_evidence | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createSalesPhotoEvidenceRequirementDecision · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8f5f2b54c4f8<br>[lib/sales/photo-evidence-model.ts:252:21](../../lib/sales/photo-evidence-model.ts#L252) | extension is not supported for sales photo evidence | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | buildSalesPhotoEvidenceObjectKey<br>!OBJECT_KEY_EXTENSIONS.has(extension) |
| UI-048e1047dcbb<br>[lib/sales/photo-evidence-model.ts:300:21](../../lib/sales/photo-evidence-model.ts#L300) | uploadedAt must be a valid date | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | getSalesPhotoEvidenceExpiresAt<br>!Number.isFinite(uploadedTime) |

## lib/sales/photo-evidence-owner-album-read-model.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-6fd6580df569<br>[lib/sales/photo-evidence-owner-album-read-model.ts:216:15](../../lib/sales/photo-evidence-owner-album-read-model.ts#L216) | owner_only | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | buildSalesPhotoEvidenceOwnerAlbumViewModel · reason<br>input.actorRole !== 'owner' |
| UI-76f49bb4e2f7<br>[lib/sales/photo-evidence-owner-album-read-model.ts:217:16](../../lib/sales/photo-evidence-owner-album-read-model.ts#L217) | Sales photo evidence album is owner-only. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | buildSalesPhotoEvidenceOwnerAlbumViewModel · message<br>input.actorRole !== 'owner' |
| UI-52bc3384b3b7<br>[lib/sales/photo-evidence-owner-album-read-model.ts:224:15](../../lib/sales/photo-evidence-owner-album-read-model.ts#L224) | invalid_scope | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | buildSalesPhotoEvidenceOwnerAlbumViewModel · reason<br>!input.ownerId &#124;&#124; !input.marketId |
| UI-fe337af53c1a<br>[lib/sales/photo-evidence-owner-album-read-model.ts:225:16](../../lib/sales/photo-evidence-owner-album-read-model.ts#L225) | Sales photo evidence album requires owner and market scope. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | buildSalesPhotoEvidenceOwnerAlbumViewModel · message<br>!input.ownerId &#124;&#124; !input.marketId |
| UI-cda391b87055<br>[lib/sales/photo-evidence-owner-album-read-model.ts:245:13](../../lib/sales/photo-evidence-owner-album-read-model.ts#L245) | owner_album_ready | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | buildSalesPhotoEvidenceOwnerAlbumViewModel · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sales/photo-evidence-owner-album-read-source.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-dfe16a6b9a31<br>[lib/sales/photo-evidence-owner-album-read-source.ts:94:15](../../lib/sales/photo-evidence-owner-album-read-source.ts#L94) | owner_only | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan · reason<br>input.actorRole !== 'owner' |
| UI-84566020890b<br>[lib/sales/photo-evidence-owner-album-read-source.ts:95:16](../../lib/sales/photo-evidence-owner-album-read-source.ts#L95) | Sales photo evidence owner album read source is owner-only. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan · message<br>input.actorRole !== 'owner' |
| UI-80014a420ae4<br>[lib/sales/photo-evidence-owner-album-read-source.ts:102:15](../../lib/sales/photo-evidence-owner-album-read-source.ts#L102) | invalid_scope | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan · reason<br>!input.ownerId &#124;&#124; !input.marketId |
| UI-40d07ed71554<br>[lib/sales/photo-evidence-owner-album-read-source.ts:103:16](../../lib/sales/photo-evidence-owner-album-read-source.ts#L103) | Sales photo evidence owner album read source requires owner and market scope. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan · message<br>!input.ownerId &#124;&#124; !input.marketId |
| UI-7e256b6c62e0<br>[lib/sales/photo-evidence-owner-album-read-source.ts:109:13](../../lib/sales/photo-evidence-owner-album-read-source.ts#L109) | owner_scope_ready | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sales/photo-evidence-owner-delete-client.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-2ad242b30acb<br>[lib/sales/photo-evidence-owner-delete-client.ts:35:63](../../lib/sales/photo-evidence-owner-delete-client.ts#L35) | 成交照片刪除功能尚未啟用，照片沒有被刪除。 | **來源候選** · 候選，非已證實提示<br>failureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | failureMessage<br>code === 'sales_photo_evidence_delete_disabled' |
| UI-ce6879dfbcbf<br>[lib/sales/photo-evidence-owner-delete-client.ts:36:50](../../lib/sales/photo-evidence-owner-delete-client.ts#L36) | 登入狀態已失效，請重新登入後再刪除。 | **來源候選** · 候選，非已證實提示<br>failureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | failureMessage<br>code === 'authentication_required' |
| UI-cb5834526aaa<br>[lib/sales/photo-evidence-owner-delete-client.ts:37:53](../../lib/sales/photo-evidence-owner-delete-client.ts#L37) | 目前無法確認登入權限，照片沒有被刪除。請稍後再試。 | **來源候選** · 候選，非已證實提示<br>failureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | failureMessage<br>code === 'authentication_unavailable' |
| UI-f26110c6dfe1<br>[lib/sales/photo-evidence-owner-delete-client.ts:38:45](../../lib/sales/photo-evidence-owner-delete-client.ts#L38) | 只有市集擁有者可以刪除成交照片。 | **來源候選** · 候選，非已證實提示<br>failureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | failureMessage<br>code === 'unauthorized_actor' |
| UI-a1189dfe50f4<br>[lib/sales/photo-evidence-owner-delete-client.ts:39:36](../../lib/sales/photo-evidence-owner-delete-client.ts#L39) | 找不到這張照片，可能已經被移除。 | **來源候選** · 候選，非已證實提示<br>failureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | failureMessage<br>code === 'not_found' |
| UI-ba883107537f<br>[lib/sales/photo-evidence-owner-delete-client.ts:40:49](../../lib/sales/photo-evidence-owner-delete-client.ts#L40) | 這筆成交照片目前無法刪除。 | **來源候選** · 候選，非已證實提示<br>failureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | failureMessage<br>code === 'evidence_not_deletable' |
| UI-73f8733cd031<br>[lib/sales/photo-evidence-owner-delete-client.ts:41:42](../../lib/sales/photo-evidence-owner-delete-client.ts#L41) | 刪除照片逾時，請確認網路後再試。 | **來源候選** · 候選，非已證實提示<br>failureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | failureMessage<br>code === 'request_timeout' |
| UI-f50193a75410<br>[lib/sales/photo-evidence-owner-delete-client.ts:42:43](../../lib/sales/photo-evidence-owner-delete-client.ts#L42) | 照片儲存空間刪除失敗，資料尚未標記為刪除。 | **來源候選** · 候選，非已證實提示<br>failureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | failureMessage<br>code === 'r2_delete_failed' |
| UI-0d163cb8e4ae<br>[lib/sales/photo-evidence-owner-delete-client.ts:43:51](../../lib/sales/photo-evidence-owner-delete-client.ts#L43) | 照片檔案已處理，但紀錄更新尚未完成，請重新整理後再試。 | **來源候選** · 候選，非已證實提示<br>failureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | failureMessage<br>code === 'metadata_finalize_failed' |
| UI-7d8b13a33523<br>[lib/sales/photo-evidence-owner-delete-client.ts:44:10](../../lib/sales/photo-evidence-owner-delete-client.ts#L44) | 刪除成交照片失敗，請稍後再試。 | **來源候選** · 候選，非已證實提示<br>failureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | failureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0c2e92c72d36<br>[lib/sales/photo-evidence-owner-delete-client.ts:61:45](../../lib/sales/photo-evidence-owner-delete-client.ts#L61) | 目前無法使用照片刪除功能。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getSalesPhotoEvidenceOwnerDeleteCapability · message<br>!response.ok |
| UI-bb5ab730a9af<br>[lib/sales/photo-evidence-owner-delete-client.ts:67:40](../../lib/sales/photo-evidence-owner-delete-client.ts#L67) | 照片刪除功能尚未由系統管理員啟用。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getSalesPhotoEvidenceOwnerDeleteCapability · message<br>否則 body.enabled === true |
| UI-e13230a8ee66<br>[lib/sales/photo-evidence-owner-delete-client.ts:69:43](../../lib/sales/photo-evidence-owner-delete-client.ts#L69) | 目前無法確認照片刪除功能是否可用。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | getSalesPhotoEvidenceOwnerDeleteCapability · message<br>catch：操作拋出例外 |
| UI-32b60dcac4b9<br>[lib/sales/photo-evidence-owner-delete-client.ts:82:31](../../lib/sales/photo-evidence-owner-delete-client.ts#L82) | authentication_required | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>message：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | deleteSalesPhotoEvidenceAsOwner · message<br>!token |

## lib/sales/photo-evidence-owner-image-client.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-403fcd448fbb<br>[lib/sales/photo-evidence-owner-image-client.ts:40:14](../../lib/sales/photo-evidence-owner-image-client.ts#L40) | 登入狀態已失效，請重新登入後再查看照片。 | **來源候選** · 候選，非已證實提示<br>getOwnerImageFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getOwnerImageFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2162b5670f46<br>[lib/sales/photo-evidence-owner-image-client.ts:43:14](../../lib/sales/photo-evidence-owner-image-client.ts#L43) | 目前帳號沒有查看這張照片的權限。 | **來源候選** · 候選，非已證實提示<br>getOwnerImageFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getOwnerImageFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ec45c12765b6<br>[lib/sales/photo-evidence-owner-image-client.ts:46:14](../../lib/sales/photo-evidence-owner-image-client.ts#L46) | 找不到這張照片，可能已過期或移除。 | **來源候選** · 候選，非已證實提示<br>getOwnerImageFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getOwnerImageFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f5f1e1351078<br>[lib/sales/photo-evidence-owner-image-client.ts:48:14](../../lib/sales/photo-evidence-owner-image-client.ts#L48) | 這張照片已超過七天保留期限，無法再查看。 | **來源候選** · 候選，非已證實提示<br>getOwnerImageFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getOwnerImageFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-95fcea477d53<br>[lib/sales/photo-evidence-owner-image-client.ts:50:14](../../lib/sales/photo-evidence-owner-image-client.ts#L50) | 照片讀取逾時，請確認網路後再試。 | **來源候選** · 候選，非已證實提示<br>getOwnerImageFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getOwnerImageFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-65b30c0e65b4<br>[lib/sales/photo-evidence-owner-image-client.ts:52:14](../../lib/sales/photo-evidence-owner-image-client.ts#L52) | 照片讀取失敗，請稍後再試。 | **來源候選** · 候選，非已證實提示<br>getOwnerImageFailureMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getOwnerImageFailureMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ff8105695905<br>[lib/sales/photo-evidence-owner-image-client.ts:65:16](../../lib/sales/photo-evidence-owner-image-client.ts#L65) | 登入狀態已失效，請重新登入後再查看照片。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | fetchSalesPhotoEvidenceOwnerImageObjectUrl · message<br>!token |
| UI-33ef51705318<br>[lib/sales/photo-evidence-owner-image-client.ts:99:50](../../lib/sales/photo-evidence-owner-image-client.ts#L99) | request_timeout | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>message：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | fetchSalesPhotoEvidenceOwnerImageObjectUrl · message<br>catch：操作拋出例外 → 否則 isAppApiUrlError(error) → isAppApiRequestError(error) &amp;&amp; error.code === 'request_timeout' |
| UI-222951a5a40d<br>[lib/sales/photo-evidence-owner-image-client.ts:104:22](../../lib/sales/photo-evidence-owner-image-client.ts#L104) | 無法連線讀取銷售照片，請稍後再試。 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | fetchSalesPhotoEvidenceOwnerImageObjectUrl · message<br>catch：操作拋出例外 → 否則 isAppApiUrlError(error) → 否則 isAppApiRequestError(error) &amp;&amp; error.code === 'request_timeout' |

## lib/sales/photo-evidence-pending-creation-drain.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-b6468f91e4f1<br>[lib/sales/photo-evidence-pending-creation-drain.ts:132:18](../../lib/sales/photo-evidence-pending-creation-drain.ts#L132) | Source deal event was not found for pending sales photo evidence creation. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | failure · message<br>!sourceEvent |
| UI-e7d14f7f531a<br>[lib/sales/photo-evidence-pending-creation-drain.ts:201:18](../../lib/sales/photo-evidence-pending-creation-drain.ts#L201) | Pending sales photo evidence creation exceeded the retry limit. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | failure · message<br>decision.reason === 'max_retry_exceeded' |
| UI-64a4389f75e2<br>[lib/sales/photo-evidence-pending-creation-drain.ts:216:35](../../lib/sales/photo-evidence-pending-creation-drain.ts#L216) | Pending sales photo evidence creation is not runnable. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | failure · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sales/photo-evidence-pending-creation-recovery.ts

僅由測試／工具頁靜態引用

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-47a9dd205bf5<br>[lib/sales/photo-evidence-pending-creation-recovery.ts:43:21](../../lib/sales/photo-evidence-pending-creation-recovery.ts#L43) | ${fieldName} must be a valid date | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | normalizeDate<br>!Number.isFinite(date.getTime()) |
| UI-12f4ff125c95<br>[lib/sales/photo-evidence-pending-creation-recovery.ts:51:21](../../lib/sales/photo-evidence-pending-creation-recovery.ts#L51) | ${fieldName} must be a non-negative finite number | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | normalizeDuration<br>!Number.isFinite(value) &#124;&#124; value &lt; 0 |
| UI-9a1bcde66eb3<br>[lib/sales/photo-evidence-pending-creation-recovery.ts:81:18](../../lib/sales/photo-evidence-pending-creation-recovery.ts#L81) | Pending sales photo evidence creation was left in creating state and can be retried. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | classifyPendingSalesPhotoEvidenceCreationRecovery · message<br>item.status === 'creating' → itemAgeMs &gt;= staleCreatingAfterMs |
| UI-9ced66d9d72f<br>[lib/sales/photo-evidence-pending-creation-recovery.ts:88:16](../../lib/sales/photo-evidence-pending-creation-recovery.ts#L88) | Pending sales photo evidence creation is still within the creating grace period. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | classifyPendingSalesPhotoEvidenceCreationRecovery · message<br>item.status === 'creating' |
| UI-dbbf3d07f425<br>[lib/sales/photo-evidence-pending-creation-recovery.ts:97:18](../../lib/sales/photo-evidence-pending-creation-recovery.ts#L97) | Created local queue row can be retired without deleting sale or evidence metadata. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | classifyPendingSalesPhotoEvidenceCreationRecovery · message<br>item.status === 'created' → itemAgeMs &gt;= cleanupCreatedAfterMs |
| UI-b8de54653b1c<br>[lib/sales/photo-evidence-pending-creation-recovery.ts:104:16](../../lib/sales/photo-evidence-pending-creation-recovery.ts#L104) | Created local queue row is retained until the cleanup grace window passes. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | classifyPendingSalesPhotoEvidenceCreationRecovery · message<br>item.status === 'created' |
| UI-4ed632030270<br>[lib/sales/photo-evidence-pending-creation-recovery.ts:112:16](../../lib/sales/photo-evidence-pending-creation-recovery.ts#L112) | Terminal pending sales photo evidence failure requires owner-visible review before removal. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | classifyPendingSalesPhotoEvidenceCreationRecovery · message<br>item.status === 'failed_permanent' &#124;&#124; item.status === 'blocked_invalid_source' |
| UI-dc117cae25c7<br>[lib/sales/photo-evidence-pending-creation-recovery.ts:120:16](../../lib/sales/photo-evidence-pending-creation-recovery.ts#L120) | Runnable pending sales photo evidence creation must stay available for normal retry. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | classifyPendingSalesPhotoEvidenceCreationRecovery · message<br>item.status === 'waiting_for_event_sync' &#124;&#124; item.status === 'failed_retryable' |
| UI-2513a52c9d80<br>[lib/sales/photo-evidence-pending-creation-recovery.ts:127:14](../../lib/sales/photo-evidence-pending-creation-recovery.ts#L127) | Pending sales photo evidence creation status has no recovery or cleanup action. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | classifyPendingSalesPhotoEvidenceCreationRecovery · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sales/photo-evidence-pending-creation.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-ead83fd71a24<br>[lib/sales/photo-evidence-pending-creation.ts:81:21](../../lib/sales/photo-evidence-pending-creation.ts#L81) | ${fieldName} is required | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | requireUuid<br>typeof value !== 'string' &#124;&#124; value.length === 0 |
| UI-43b95b3b4726<br>[lib/sales/photo-evidence-pending-creation.ts:85:21](../../lib/sales/photo-evidence-pending-creation.ts#L85) | ${fieldName} must be a UUID | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | requireUuid<br>!UUID_PATTERN.test(value) |
| UI-e27696deac0e<br>[lib/sales/photo-evidence-pending-creation.ts:96:21](../../lib/sales/photo-evidence-pending-creation.ts#L96) | ${fieldName} must be a valid date | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | normalizeDate<br>!Number.isFinite(time) |
| UI-ea18866edeb9<br>[lib/sales/photo-evidence-pending-creation.ts:211:39](../../lib/sales/photo-evidence-pending-creation.ts#L211) | status_not_retryable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifyPendingSalesPhotoEvidenceCreationCandidate · reason<br>!isRunnableStatus(item.status) |
| UI-c2cdc02f4f7e<br>[lib/sales/photo-evidence-pending-creation.ts:215:39](../../lib/sales/photo-evidence-pending-creation.ts#L215) | max_retry_exceeded | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifyPendingSalesPhotoEvidenceCreationCandidate · reason<br>item.status === 'failed_retryable' &amp;&amp; item.retryCount &gt;= maxRetryCount |
| UI-204a43666797<br>[lib/sales/photo-evidence-pending-creation.ts:219:39](../../lib/sales/photo-evidence-pending-creation.ts#L219) | source_event_mismatch | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifyPendingSalesPhotoEvidenceCreationCandidate · reason<br>sourceEvent.id !== item.saleEventId |
| UI-d6e808e83447<br>[lib/sales/photo-evidence-pending-creation.ts:234:38](../../lib/sales/photo-evidence-pending-creation.ts#L234) | eligible | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | classifyPendingSalesPhotoEvidenceCreationCandidate · reason<br>plan.action === 'ready_to_create' |
| UI-5be75d3b141d<br>[lib/sales/photo-evidence-pending-creation.ts:238:39](../../lib/sales/photo-evidence-pending-creation.ts#L238) | event_not_synced | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifyPendingSalesPhotoEvidenceCreationCandidate · reason<br>plan.action === 'wait_for_event_sync' |
| UI-95d6c18beef7<br>[lib/sales/photo-evidence-pending-creation.ts:242:39](../../lib/sales/photo-evidence-pending-creation.ts#L242) | active_evidence_exists | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifyPendingSalesPhotoEvidenceCreationCandidate · reason<br>plan.action === 'skip_existing' |
| UI-eea1aee01ed9<br>[lib/sales/photo-evidence-pending-creation.ts:247:13](../../lib/sales/photo-evidence-pending-creation.ts#L247) | source_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifyPendingSalesPhotoEvidenceCreationCandidate · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sales/photo-evidence-pending-payload-storage.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-2b4f22950748<br>[lib/sales/photo-evidence-pending-payload-storage.ts:60:21](../../lib/sales/photo-evidence-pending-payload-storage.ts#L60) | ${fieldName} must be a valid date | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | normalizeDate<br>!Number.isFinite(time) |
| UI-24d0934cb267<br>[lib/sales/photo-evidence-pending-payload-storage.ts:91:24](../../lib/sales/photo-evidence-pending-payload-storage.ts#L91) | image | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | validateVariant · reason<br>!outputDecision.accepted → kind === 'image' |
| UI-fdd64b055380<br>[lib/sales/photo-evidence-pending-payload-storage.ts:91:34](../../lib/sales/photo-evidence-pending-payload-storage.ts#L91) | invalid_image_variant | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | validateVariant · reason<br>!outputDecision.accepted → kind === 'image' |
| UI-30d6a3f2c242<br>[lib/sales/photo-evidence-pending-payload-storage.ts:91:60](../../lib/sales/photo-evidence-pending-payload-storage.ts#L91) | invalid_thumbnail_variant | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | validateVariant · reason<br>!outputDecision.accepted → 否則 kind === 'image' |
| UI-848c150ac29b<br>[lib/sales/photo-evidence-pending-payload-storage.ts:99:15](../../lib/sales/photo-evidence-pending-payload-storage.ts#L99) | blob_metadata_mismatch | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | validateVariant · reason<br>!(variant.blob instanceof Blob) |
| UI-a58ae0e55e83<br>[lib/sales/photo-evidence-pending-payload-storage.ts:100:16](../../lib/sales/photo-evidence-pending-payload-storage.ts#L100) | ${kind} payload must include a Blob. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | validateVariant · message<br>!(variant.blob instanceof Blob) |
| UI-652aff9b9307<br>[lib/sales/photo-evidence-pending-payload-storage.ts:107:15](../../lib/sales/photo-evidence-pending-payload-storage.ts#L107) | blob_metadata_mismatch | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | validateVariant · reason<br>variant.blob.size !== variant.fileSizeBytes &#124;&#124; variant.blob.type !== variant.mimeType |
| UI-da0905eaf343<br>[lib/sales/photo-evidence-pending-payload-storage.ts:108:16](../../lib/sales/photo-evidence-pending-payload-storage.ts#L108) | ${kind} blob metadata must match validated output metadata. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | validateVariant · message<br>variant.blob.size !== variant.fileSizeBytes &#124;&#124; variant.blob.type !== variant.mimeType |
| UI-fc093db1a387<br>[lib/sales/photo-evidence-pending-payload-storage.ts:115:15](../../lib/sales/photo-evidence-pending-payload-storage.ts#L115) | content_hash_missing | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | validateVariant · reason<br>!isNonEmptyString(variant.contentHash) |
| UI-cfbc87230ad5<br>[lib/sales/photo-evidence-pending-payload-storage.ts:116:16](../../lib/sales/photo-evidence-pending-payload-storage.ts#L116) | ${kind} content hash is required before local payload storage. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | validateVariant · message<br>!isNonEmptyString(variant.contentHash) |
| UI-26d0bf6a30b6<br>[lib/sales/photo-evidence-pending-payload-storage.ts:134:15](../../lib/sales/photo-evidence-pending-payload-storage.ts#L134) | queue_scope_invalid | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | validatePendingSalesPhotoEvidencePayloadInput · reason<br>input.queueItem.queueId !== input.queueItem.saleEventId &#124;&#124; input.queueItem.queueId.length === 0 &#124;&#124; input.queueItem.ownerId.length === 0 &#124;&#124; input.queueItem.marketId.length === 0 |
| UI-28a50a8daed3<br>[lib/sales/photo-evidence-pending-payload-storage.ts:135:16](../../lib/sales/photo-evidence-pending-payload-storage.ts#L135) | Pending sales photo evidence payload scope is invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | validatePendingSalesPhotoEvidencePayloadInput · message<br>input.queueItem.queueId !== input.queueItem.saleEventId &#124;&#124; input.queueItem.queueId.length === 0 &#124;&#124; input.queueItem.ownerId.length === 0 &#124;&#124; input.queueItem.marketId.length === 0 |
| UI-c1f2c421e0a4<br>[lib/sales/photo-evidence-pending-payload-storage.ts:148:15](../../lib/sales/photo-evidence-pending-payload-storage.ts#L148) | total_payload_too_large | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | validatePendingSalesPhotoEvidencePayloadInput · reason<br>input.image.fileSizeBytes + input.thumbnail.fileSizeBytes &gt; SALES_PHOTO_EVIDENCE_PENDING_PAYLOAD_MAX_TOTAL_BYTES |
| UI-b8d220b5b131<br>[lib/sales/photo-evidence-pending-payload-storage.ts:149:16](../../lib/sales/photo-evidence-pending-payload-storage.ts#L149) | Pending sales photo evidence payload is too large for local temporary storage. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | validatePendingSalesPhotoEvidencePayloadInput · message<br>input.image.fileSizeBytes + input.thumbnail.fileSizeBytes &gt; SALES_PHOTO_EVIDENCE_PENDING_PAYLOAD_MAX_TOTAL_BYTES |
| UI-3795c382a012<br>[lib/sales/photo-evidence-pending-payload-storage.ts:158:15](../../lib/sales/photo-evidence-pending-payload-storage.ts#L158) | invalid_timestamp | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | validatePendingSalesPhotoEvidencePayloadInput · reason<br>catch：操作拋出例外 |
| UI-0c9e11fe6dbd<br>[lib/sales/photo-evidence-pending-payload-storage.ts:159:16](../../lib/sales/photo-evidence-pending-payload-storage.ts#L159) | Pending sales photo evidence payload timestamp is invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | validatePendingSalesPhotoEvidencePayloadInput · message<br>catch：操作拋出例外 |

## lib/sales/photo-evidence-post-sale.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-092b208a622a<br>[lib/sales/photo-evidence-post-sale.ts:81:41](../../lib/sales/photo-evidence-post-sale.ts#L81) | Invalid sale photo requirement context | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | recordDealWithPhotoEvidenceRequirement<br>!validSnapshot |

## lib/sales/photo-evidence-r2-read-adapter.server.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-e02020a509cf<br>[lib/sales/photo-evidence-r2-read-adapter.server.ts:39:21](../../lib/sales/photo-evidence-r2-read-adapter.server.ts#L39) | R2 response body size is outside the evidence limit. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertAllowedBodySize<br>size &lt;= 0 &#124;&#124; size &gt; SALES_PHOTO_EVIDENCE_MAX_FILE_SIZE_BYTES |
| UI-959b11298198<br>[lib/sales/photo-evidence-r2-read-adapter.server.ts:83:19](../../lib/sales/photo-evidence-r2-read-adapter.server.ts#L83) | Unsupported R2 response body. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | bodyToUint8Array<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cdffb6adee97<br>[lib/sales/photo-evidence-r2-read-adapter.server.ts:113:27](../../lib/sales/photo-evidence-r2-read-adapter.server.ts#L113) | R2 response content type is outside the evidence contract. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | readObject<br>response.ContentType !== 'image/webp' &amp;&amp; response.ContentType !== 'image/jpeg' |
| UI-7d4c6db8e7eb<br>[lib/sales/photo-evidence-r2-read-adapter.server.ts:127:20](../../lib/sales/photo-evidence-r2-read-adapter.server.ts#L127) | Sales photo evidence R2 read failed. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | readObject · message<br>catch：操作拋出例外 |

## lib/sales/photo-evidence-r2-upload-adapter.server.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-0028e7d47217<br>[lib/sales/photo-evidence-r2-upload-adapter.server.ts:85:20](../../lib/sales/photo-evidence-r2-upload-adapter.server.ts#L85) | Sales photo evidence R2 upload failed. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | uploadObject · message<br>catch：操作拋出例外 |
| UI-5f6b12c2a0bb<br>[lib/sales/photo-evidence-r2-upload-adapter.server.ts:109:20](../../lib/sales/photo-evidence-r2-upload-adapter.server.ts#L109) | Sales photo evidence R2 delete failed. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | deleteObject · message<br>catch：操作拋出例外 |

## lib/sales/photo-evidence-r2-upload-adapter.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-8f5c761e9cd3<br>[lib/sales/photo-evidence-r2-upload-adapter.ts:120:16](../../lib/sales/photo-evidence-r2-upload-adapter.ts#L120) | Sales photo evidence R2 object key is invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | validateSalesPhotoEvidenceR2UploadObjectInput · message<br>!isValidEvidenceObjectKey(input.key) |
| UI-e737cac328ed<br>[lib/sales/photo-evidence-r2-upload-adapter.ts:129:16](../../lib/sales/photo-evidence-r2-upload-adapter.ts#L129) | Sales photo evidence R2 object content type is invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | validateSalesPhotoEvidenceR2UploadObjectInput · message<br>!isAcceptedContentType(input.contentType) |
| UI-2557fd4088ab<br>[lib/sales/photo-evidence-r2-upload-adapter.ts:142:16](../../lib/sales/photo-evidence-r2-upload-adapter.ts#L142) | Sales photo evidence R2 object content length is invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | validateSalesPhotoEvidenceR2UploadObjectInput · message<br>!Number.isInteger(input.contentLength) &#124;&#124; input.contentLength &lt;= 0 &#124;&#124; input.contentLength &gt; SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes |
| UI-57aefd61c4c2<br>[lib/sales/photo-evidence-r2-upload-adapter.ts:151:16](../../lib/sales/photo-evidence-r2-upload-adapter.ts#L151) | Sales photo evidence R2 object body is invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | validateSalesPhotoEvidenceR2UploadObjectInput · message<br>!isValidUploadBody(input.body) |
| UI-8a7bf29a59b8<br>[lib/sales/photo-evidence-r2-upload-adapter.ts:167:14](../../lib/sales/photo-evidence-r2-upload-adapter.ts#L167) | Sales photo evidence R2 delete object key is invalid. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | validateSalesPhotoEvidenceR2DeleteObjectInput · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sales/photo-evidence-reminder-recovery.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-e24e76c13429<br>[lib/sales/photo-evidence-reminder-recovery.ts:83:45](../../lib/sales/photo-evidence-reminder-recovery.ts#L83) | Photo reminder scope changed | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertCurrent<br>!input.isCurrent() |
| UI-cb61a52ca94e<br>[lib/sales/photo-evidence-reminder-recovery.ts:86:93](../../lib/sales/photo-evidence-reminder-recovery.ts#L86) | Owner photo reminder scope required | **錯誤來源** · 文案生產端，須查使用端<br>SalesPhotoEvidenceReminderAccessError：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | recoverOwnerSalesPhotoEvidenceReminders<br>await getActorId() !== input.ownerId |
| UI-2c8912b880b0<br>[lib/sales/photo-evidence-reminder-recovery.ts:92:93](../../lib/sales/photo-evidence-reminder-recovery.ts#L92) | Photo reminder identity changed | **錯誤來源** · 文案生產端，須查使用端<br>SalesPhotoEvidenceReminderAccessError：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | recoverOwnerSalesPhotoEvidenceReminders<br>await getActorId() !== input.ownerId |
| UI-fe10491e08e0<br>[lib/sales/photo-evidence-reminder-recovery.ts:96:123](../../lib/sales/photo-evidence-reminder-recovery.ts#L96) | Owner market scope required | **錯誤來源** · 文案生產端，須查使用端<br>SalesPhotoEvidenceReminderAccessError：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | recoverOwnerSalesPhotoEvidenceReminders<br>!market &#124;&#124; market.owner_id !== input.ownerId &#124;&#124; market.isDeleted |
| UI-422ebb458dc8<br>[lib/sales/photo-evidence-reminder-recovery.ts:107:25](../../lib/sales/photo-evidence-reminder-recovery.ts#L107) | Photo reminder queue identity conflict | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | recoverOwnerSalesPhotoEvidenceReminders<br>existingItem &amp;&amp; (existingItem.ownerId !== input.ownerId &#124;&#124; existingItem.marketId !== input.marketId) |

## lib/sales/photo-evidence-runtime-flags.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

同檔旗標（不代表每列均受它控制）：`NEXT_PUBLIC_APP_ENV`、`NEXT_PUBLIC_SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_ALLOW_PRODUCTION`、`NEXT_PUBLIC_SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_ENABLED`。

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-e95e1c342dbf<br>[lib/sales/photo-evidence-runtime-flags.ts:32:41](../../lib/sales/photo-evidence-runtime-flags.ts#L32) | local_disabled | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveSalesPhotoEvidenceRuntimeGateStatus · reason<br>input.nodeEnv !== 'production' → explicitSetting === '0' |
| UI-e5f21857d24f<br>[lib/sales/photo-evidence-runtime-flags.ts:32:60](../../lib/sales/photo-evidence-runtime-flags.ts#L32) | local_default | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveSalesPhotoEvidenceRuntimeGateStatus · reason<br>input.nodeEnv !== 'production' → 否則 explicitSetting === '0' |
| UI-396f05c9f2b4<br>[lib/sales/photo-evidence-runtime-flags.ts:40:41](../../lib/sales/photo-evidence-runtime-flags.ts#L40) | staging_enabled | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveSalesPhotoEvidenceRuntimeGateStatus · reason<br>publicAppEnv === 'staging' &#124;&#124; publicAppEnv === 'preview' → explicitSetting === '1' |
| UI-981bd243e880<br>[lib/sales/photo-evidence-runtime-flags.ts:40:61](../../lib/sales/photo-evidence-runtime-flags.ts#L40) | staging_disabled | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveSalesPhotoEvidenceRuntimeGateStatus · reason<br>publicAppEnv === 'staging' &#124;&#124; publicAppEnv === 'preview' → 否則 explicitSetting === '1' |
| UI-e6b7a0c7ae47<br>[lib/sales/photo-evidence-runtime-flags.ts:50:33](../../lib/sales/photo-evidence-runtime-flags.ts#L50) | production_enabled | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveSalesPhotoEvidenceRuntimeGateStatus · reason<br>productionEnabled |
| UI-40b44b1c0a99<br>[lib/sales/photo-evidence-runtime-flags.ts:50:56](../../lib/sales/photo-evidence-runtime-flags.ts#L50) | production_locked | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | resolveSalesPhotoEvidenceRuntimeGateStatus · reason<br>否則 productionEnabled |

## lib/sales/photo-evidence-settings.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-d90c024c0db6<br>[lib/sales/photo-evidence-settings.ts:19:21](../../lib/sales/photo-evidence-settings.ts#L19) | owner id is required | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | saveDefaultSalesPhotoEvidenceRequired<br>!ownerId |

## lib/sales/photo-evidence-upload-contract.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-2344ef31a41c<br>[lib/sales/photo-evidence-upload-contract.ts:160:14](../../lib/sales/photo-evidence-upload-contract.ts#L160) | Sales photo evidence upload contract received invalid identifiers. | **來源候選** · 候選，非已證實提示<br>uploadRejectMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | uploadRejectMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1935f52a7dca<br>[lib/sales/photo-evidence-upload-contract.ts:162:14](../../lib/sales/photo-evidence-upload-contract.ts#L162) | Actor is not allowed by the upload contract for this evidence row. | **來源候選** · 候選，非已證實提示<br>uploadRejectMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | uploadRejectMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-82b8dc9eabb2<br>[lib/sales/photo-evidence-upload-contract.ts:164:14](../../lib/sales/photo-evidence-upload-contract.ts#L164) | Evidence must be captured locally before upload can be prepared. | **來源候選** · 候選，非已證實提示<br>uploadRejectMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | uploadRejectMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-70db27d3fe12<br>[lib/sales/photo-evidence-upload-contract.ts:166:14](../../lib/sales/photo-evidence-upload-contract.ts#L166) | Evidence upload variants must include one image and one thumbnail. | **來源候選** · 候選，非已證實提示<br>uploadRejectMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | uploadRejectMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2feb59bbea97<br>[lib/sales/photo-evidence-upload-contract.ts:168:14](../../lib/sales/photo-evidence-upload-contract.ts#L168) | Evidence upload variant type is not supported. | **來源候選** · 候選，非已證實提示<br>uploadRejectMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | uploadRejectMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-092d023e29d1<br>[lib/sales/photo-evidence-upload-contract.ts:170:14](../../lib/sales/photo-evidence-upload-contract.ts#L170) | Evidence upload variant size is invalid or too large. | **來源候選** · 候選，非已證實提示<br>uploadRejectMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | uploadRejectMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fbc84fb8c8ac<br>[lib/sales/photo-evidence-upload-contract.ts:172:14](../../lib/sales/photo-evidence-upload-contract.ts#L172) | Evidence upload variant dimensions are invalid. | **來源候選** · 候選，非已證實提示<br>uploadRejectMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | uploadRejectMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-751217f25f8b<br>[lib/sales/photo-evidence-upload-contract.ts:213:13](../../lib/sales/photo-evidence-upload-contract.ts#L213) | upload_allowed_by_contract | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createSalesPhotoEvidenceUploadContract · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c8853e764ed3<br>[lib/sales/photo-evidence-upload-contract.ts:262:51](../../lib/sales/photo-evidence-upload-contract.ts#L262) | Sales photo evidence signed read contract received invalid identifiers. | **來源候選** · 候選，非已證實提示<br>createSalesPhotoEvidenceSignedReadContract 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | createSalesPhotoEvidenceSignedReadContract<br>!hasValidIdentifiers(identifiers) |
| UI-a42e81f6d116<br>[lib/sales/photo-evidence-upload-contract.ts:266:51](../../lib/sales/photo-evidence-upload-contract.ts#L266) | Actor is not allowed by the signed read contract for this evidence row. | **來源候選** · 候選，非已證實提示<br>createSalesPhotoEvidenceSignedReadContract 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | createSalesPhotoEvidenceSignedReadContract<br>!isAuthorizedEvidenceActor(input.actorId, input.actorRole, input.ownerId, input.capturedByStaffId) |
| UI-feceb5bee603<br>[lib/sales/photo-evidence-upload-contract.ts:270:54](../../lib/sales/photo-evidence-upload-contract.ts#L270) | Evidence must be uploaded before signed read can be prepared. | **來源候選** · 候選，非已證實提示<br>createSalesPhotoEvidenceSignedReadContract 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | createSalesPhotoEvidenceSignedReadContract<br>input.status !== 'uploaded' |
| UI-ab773668f665<br>[lib/sales/photo-evidence-upload-contract.ts:274:51](../../lib/sales/photo-evidence-upload-contract.ts#L274) | Uploaded evidence must have a private object key. | **來源候選** · 候選，非已證實提示<br>createSalesPhotoEvidenceSignedReadContract 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | createSalesPhotoEvidenceSignedReadContract<br>typeof input.objectKey !== 'string' &#124;&#124; input.objectKey.length === 0 |
| UI-d01faa52d826<br>[lib/sales/photo-evidence-upload-contract.ts:282:44](../../lib/sales/photo-evidence-upload-contract.ts#L282) | Signed read TTL must be positive and within the approved short-lived window. | **來源候選** · 候選，非已證實提示<br>createSalesPhotoEvidenceSignedReadContract 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | createSalesPhotoEvidenceSignedReadContract<br>!Number.isInteger(input.requestedTtlSeconds) &#124;&#124; input.requestedTtlSeconds &lt;= 0 &#124;&#124; input.requestedTtlSeconds &gt; SALES_PHOTO_EVIDENCE_SIGNED_READ_MAX_TTL_SECONDS |
| UI-a2001e3bd45d<br>[lib/sales/photo-evidence-upload-contract.ts:287:13](../../lib/sales/photo-evidence-upload-contract.ts#L287) | signed_read_allowed_by_contract | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createSalesPhotoEvidenceSignedReadContract · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sales/photo-evidence-upload-form-data.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-0b076ad0966a<br>[lib/sales/photo-evidence-upload-form-data.ts:158:20](../../lib/sales/photo-evidence-upload-form-data.ts#L158) | Sales photo evidence upload form data is missing required text fields. | **來源候選** · 候選，非已證實提示<br>parseSalesPhotoEvidenceUploadFormData 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | parseSalesPhotoEvidenceUploadFormData<br>!ownerId &#124;&#124; !marketId &#124;&#124; !saleEventId &#124;&#124; !capturedAt |
| UI-f591b782334b<br>[lib/sales/photo-evidence-upload-form-data.ts:164:20](../../lib/sales/photo-evidence-upload-form-data.ts#L164) | Sales photo evidence upload form data must include one image and one thumbnail. | **來源候選** · 候選，非已證實提示<br>parseSalesPhotoEvidenceUploadFormData 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | parseSalesPhotoEvidenceUploadFormData<br>!image &#124;&#124; !thumbnail |
| UI-9861804b54a4<br>[lib/sales/photo-evidence-upload-form-data.ts:170:20](../../lib/sales/photo-evidence-upload-form-data.ts#L170) | Sales photo evidence upload form data is missing metadata. | **來源候選** · 候選，非已證實提示<br>parseSalesPhotoEvidenceUploadFormData 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | parseSalesPhotoEvidenceUploadFormData<br>!imageMetadataText &#124;&#124; !thumbnailMetadataText |
| UI-014be6e89b86<br>[lib/sales/photo-evidence-upload-form-data.ts:176:20](../../lib/sales/photo-evidence-upload-form-data.ts#L176) | Sales photo evidence upload form data metadata is invalid. | **來源候選** · 候選，非已證實提示<br>parseSalesPhotoEvidenceUploadFormData 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | parseSalesPhotoEvidenceUploadFormData<br>!imageMetadata &#124;&#124; !thumbnailMetadata |
| UI-01e89096efe1<br>[lib/sales/photo-evidence-upload-form-data.ts:180:20](../../lib/sales/photo-evidence-upload-form-data.ts#L180) | Sales photo evidence upload payload exceeds the combined size limit. | **來源候選** · 候選，非已證實提示<br>parseSalesPhotoEvidenceUploadFormData 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | parseSalesPhotoEvidenceUploadFormData<br>image.size + thumbnail.size &gt; SALES_PHOTO_EVIDENCE_MAX_TOTAL_PAYLOAD_BYTES |
| UI-81532a39f046<br>[lib/sales/photo-evidence-upload-form-data.ts:219:16](../../lib/sales/photo-evidence-upload-form-data.ts#L219) | Sales photo evidence upload payload signature does not match its declared MIME type. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | validateSalesPhotoEvidenceUploadPayloadSignatures · message<br>!imageSignatureValid &#124;&#124; !thumbnailSignatureValid |

## lib/sales/photo-evidence-writer-upload-types.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-607a7dde5e65<br>[lib/sales/photo-evidence-writer-upload-types.ts:132:15](../../lib/sales/photo-evidence-writer-upload-types.ts#L132) | already_uploaded | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createSalesPhotoEvidenceMetadataTransitionPlan · reason<br>input.currentStatus === 'uploaded' |
| UI-a920c6541e44<br>[lib/sales/photo-evidence-writer-upload-types.ts:147:15](../../lib/sales/photo-evidence-writer-upload-types.ts#L147) | status_not_uploadable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createSalesPhotoEvidenceMetadataTransitionPlan · reason<br>input.currentStatus !== null &amp;&amp; TERMINAL_NON_UPLOADABLE_STATUSES.has(input.currentStatus) |
| UI-738ee1f7b2a6<br>[lib/sales/photo-evidence-writer-upload-types.ts:159:15](../../lib/sales/photo-evidence-writer-upload-types.ts#L159) | status_not_uploadable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createSalesPhotoEvidenceMetadataTransitionPlan · reason<br>!UPLOADABLE_STATUSES.has(input.currentStatus) |
| UI-7b156faef69c<br>[lib/sales/photo-evidence-writer-upload-types.ts:171:15](../../lib/sales/photo-evidence-writer-upload-types.ts#L171) | payload_missing | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | createSalesPhotoEvidenceMetadataTransitionPlan · reason<br>!input.hasLocalPayload |

## lib/sales/sale-summary.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-45331828f4e0<br>[lib/sales/sale-summary.ts:38:24](../../lib/sales/sale-summary.ts#L38) | ${itemCount} 件商品 | **來源候選** · 候選，非已證實提示<br>itemLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | itemLabel<br>hasItems |
| UI-030508a4a3dc<br>[lib/sales/sale-summary.ts:39:35](../../lib/sales/sale-summary.ts#L39) | ${manualDealCount} 筆收入 | **來源候選** · 候選，非已證實提示<br>itemLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | itemLabel<br>manualDealCount &gt; 1 |
| UI-77f3504214c1<br>[lib/sales/sale-summary.ts:40:10](../../lib/sales/sale-summary.ts#L40) | 快速收款 | **來源候選** · 候選，非已證實提示<br>itemLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | itemLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/supabase/sales-photo-evidence-delete-repository.server.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-5427197f54c3<br>[lib/supabase/sales-photo-evidence-delete-repository.server.ts:102:21](../../lib/supabase/sales-photo-evidence-delete-repository.server.ts#L102) | Sales photo evidence delete RPC returned an invalid row. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | mapPreparedRow<br>!row &#124;&#124; row.id !== evidenceId &#124;&#124; typeof row.owner_id !== 'string' &#124;&#124; typeof row.market_id !== 'string' &#124;&#124; typeof row.sale_id !== 'string' &#124;&#124; row.status !== 'uploaded' &#124;&#124; typeof row.r2_object_key !== 'string' &#124;&#124; typeof row.r2_thumbnail_key !== 'string' &#124;&#124; (row.deleted_at !== null &amp;&amp; typeof row.deleted_at !== 'string') |
| UI-a23dd8f3247d<br>[lib/supabase/sales-photo-evidence-delete-repository.server.ts:144:39](../../lib/supabase/sales-photo-evidence-delete-repository.server.ts#L144) | Sales photo evidence delete RPC failed. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | runRpc<br>result.error |
| UI-05682481dd4d<br>[lib/supabase/sales-photo-evidence-delete-repository.server.ts:151:25](../../lib/supabase/sales-photo-evidence-delete-repository.server.ts#L151) | Sales photo evidence id is invalid. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | prepareDeletion<br>!UUID_PATTERN.test(evidenceId) |
| UI-14f5fe2ab6e3<br>[lib/supabase/sales-photo-evidence-delete-repository.server.ts:176:25](../../lib/supabase/sales-photo-evidence-delete-repository.server.ts#L176) | Sales photo evidence delete finalize RPC returned an invalid row. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | finalizeDeletion<br>!finalized &#124;&#124; finalized.id !== row.id &#124;&#124; finalized.owner_id !== row.ownerId &#124;&#124; finalized.market_id !== row.marketId &#124;&#124; finalized.sale_id !== row.saleId &#124;&#124; typeof finalized.deleted_at !== 'string' |

## lib/supabase/sales-photo-evidence-expiration-repository.server.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-9899e35c4ba2<br>[lib/supabase/sales-photo-evidence-expiration-repository.server.ts:107:21](../../lib/supabase/sales-photo-evidence-expiration-repository.server.ts#L107) | Sales photo evidence expiration RPC returned an invalid row. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | mapCandidate<br>!row &#124;&#124; typeof row.id !== 'string' &#124;&#124; !UUID_PATTERN.test(row.id) &#124;&#124; typeof row.owner_id !== 'string' &#124;&#124; !UUID_PATTERN.test(row.owner_id) &#124;&#124; typeof row.market_id !== 'string' &#124;&#124; !UUID_PATTERN.test(row.market_id) &#124;&#124; typeof row.sale_id !== 'string' &#124;&#124; !UUID_PATTERN.test(row.sale_id) &#124;&#124; typeof row.r2_object_key !== 'string' &#124;&#124; typeof row.r2_thumbnail_key !== 'string' &#124;&#124; typeof row.expires_at !== 'string' &#124;&#124; !Number.isFinite(new Date(row.expires_at).getTime()) |
| UI-2c7cf5b651c7<br>[lib/supabase/sales-photo-evidence-expiration-repository.server.ts:146:39](../../lib/supabase/sales-photo-evidence-expiration-repository.server.ts#L146) | Sales photo evidence expiration RPC failed. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | runRpc<br>result.error |
| UI-9185d7df7ffa<br>[lib/supabase/sales-photo-evidence-expiration-repository.server.ts:153:25](../../lib/supabase/sales-photo-evidence-expiration-repository.server.ts#L153) | Sales photo evidence expiration limit is invalid. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | listExpired<br>!Number.isInteger(limit) &#124;&#124; limit &lt; 1 &#124;&#124; limit &gt; 100 |
| UI-f04264e0c34a<br>[lib/supabase/sales-photo-evidence-expiration-repository.server.ts:157:25](../../lib/supabase/sales-photo-evidence-expiration-repository.server.ts#L157) | Sales photo evidence expiration list RPC returned invalid data. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | listExpired<br>!Array.isArray(data) |
| UI-adc6ed85cbc7<br>[lib/supabase/sales-photo-evidence-expiration-repository.server.ts:176:25](../../lib/supabase/sales-photo-evidence-expiration-repository.server.ts#L176) | Sales photo evidence expiration finalize RPC returned invalid data. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | finalizeExpiration<br>!row &#124;&#124; row.id !== candidate.id &#124;&#124; row.status !== 'expired' &#124;&#124; row.r2_object_key !== null &#124;&#124; row.r2_thumbnail_key !== null |

## lib/supabase/sales-photo-evidence-metadata-claim-repository.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-b636c3fb779d<br>[lib/supabase/sales-photo-evidence-metadata-claim-repository.ts:172:35](../../lib/supabase/sales-photo-evidence-metadata-claim-repository.ts#L172) | Sales photo evidence sale event lookup failed. | **來源候選** · 候選，非已證實提示<br>getSaleEventForEvidenceClaim 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getSaleEventForEvidenceClaim<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9c6560f181ba<br>[lib/supabase/sales-photo-evidence-metadata-claim-repository.ts:186:35](../../lib/supabase/sales-photo-evidence-metadata-claim-repository.ts#L186) | Sales photo evidence active row lookup failed. | **來源候選** · 候選，非已證實提示<br>getActiveEvidenceForSale 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getActiveEvidenceForSale<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a254bed24c7a<br>[lib/supabase/sales-photo-evidence-metadata-claim-repository.ts:199:35](../../lib/supabase/sales-photo-evidence-metadata-claim-repository.ts#L199) | Sales photo evidence staff relationship lookup failed. | **來源候選** · 候選，非已證實提示<br>isStaffRelationshipActive 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | isStaffRelationshipActive<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/supabase/sales-photo-evidence-reminders.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-63c0807958fc<br>[lib/supabase/sales-photo-evidence-reminders.ts:13:39](../../lib/supabase/sales-photo-evidence-reminders.ts#L13) | Photo reminder scope changed | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | listOwnerSalesPhotoEvidenceReminderRows<br>!isCurrent() |
| UI-f607b34bb9f8<br>[lib/supabase/sales-photo-evidence-reminders.ts:21:39](../../lib/supabase/sales-photo-evidence-reminders.ts#L21) | Photo reminder scope changed | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | listOwnerSalesPhotoEvidenceReminderRows<br>!isCurrent() |
| UI-a25ea11922c1<br>[lib/supabase/sales-photo-evidence-reminders.ts:26:68](../../lib/supabase/sales-photo-evidence-reminders.ts#L26) | Photo reminder cursor did not advance | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | listOwnerSalesPhotoEvidenceReminderRows<br>!nextId &#124;&#124; (afterId &amp;&amp; nextId &lt;= afterId) |

## lib/supabase/sales-photo-evidence-server-mutation-repository.server.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-41c0ecfc59e3<br>[lib/supabase/sales-photo-evidence-server-mutation-repository.server.ts:139:21](../../lib/supabase/sales-photo-evidence-server-mutation-repository.server.ts#L139) | Sales photo evidence server mutation returned an invalid row. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | mapClaimedRow<br>!row &#124;&#124; typeof row.id !== 'string' &#124;&#124; typeof row.owner_id !== 'string' &#124;&#124; typeof row.market_id !== 'string' &#124;&#124; typeof row.sale_id !== 'string' &#124;&#124; (row.captured_by_staff_id !== null &amp;&amp; typeof row.captured_by_staff_id !== 'string') &#124;&#124; typeof row.status !== 'string' &#124;&#124; !VALID_STATUSES.has(row.status as SalesPhotoEvidenceStatus) &#124;&#124; row.upload_attempt_id !== expectedAttemptId |
| UI-c4f08ee9f28e<br>[lib/supabase/sales-photo-evidence-server-mutation-repository.server.ts:162:21](../../lib/supabase/sales-photo-evidence-server-mutation-repository.server.ts#L162) | Sales photo evidence server mutation returned an out-of-scope row. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertRowScope<br>row.ownerId !== input.ownerId &#124;&#124; row.marketId !== input.marketId &#124;&#124; row.saleId !== input.saleId &#124;&#124; (input.evidenceId !== undefined &amp;&amp; row.id !== input.evidenceId) |
| UI-13cde7fdd682<br>[lib/supabase/sales-photo-evidence-server-mutation-repository.server.ts:208:23](../../lib/supabase/sales-photo-evidence-server-mutation-repository.server.ts#L208) | Sales photo evidence server mutation is unavailable. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | runMutation<br>catch：操作拋出例外 |
| UI-15ca943a8ac8<br>[lib/supabase/sales-photo-evidence-server-mutation-repository.server.ts:212:23](../../lib/supabase/sales-photo-evidence-server-mutation-repository.server.ts#L212) | Sales photo evidence server mutation failed. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | runMutation<br>result.error |
| UI-e5b17e70e2ef<br>[lib/supabase/sales-photo-evidence-server-mutation-repository.server.ts:218:23](../../lib/supabase/sales-photo-evidence-server-mutation-repository.server.ts#L218) | Sales photo evidence server mutation returned an unexpected status. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | runMutation<br>row.status !== expected.status |

## lib/supabase/sales-photo-evidence.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-750386021163<br>[lib/supabase/sales-photo-evidence.ts:92:15](../../lib/supabase/sales-photo-evidence.ts#L92) | supabase_error | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | listOwnerSalesPhotoEvidenceAlbumMetadataRows · reason<br>error |
| UI-9a0b7f3a669e<br>[lib/supabase/sales-photo-evidence.ts:93:16](../../lib/supabase/sales-photo-evidence.ts#L93) | Sales photo evidence owner album metadata read failed. | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | listOwnerSalesPhotoEvidenceAlbumMetadataRows · message<br>error |
| UI-7e99dcb55a52<br>[lib/supabase/sales-photo-evidence.ts:100:13](../../lib/supabase/sales-photo-evidence.ts#L100) | owner_album_metadata_loaded | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | listOwnerSalesPhotoEvidenceAlbumMetadataRows · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sync/owner-revenue-gap-repair.ts

僅由測試／工具頁靜態引用

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-45d8e0f77c0c<br>[lib/sync/owner-revenue-gap-repair.ts:109:21](../../lib/sync/owner-revenue-gap-repair.ts#L109) | ${name} must be a non-blank string | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertNonBlank<br>typeof value !== 'string' &#124;&#124; value.trim().length === 0 |
| UI-30915167d7b3<br>[lib/sync/owner-revenue-gap-repair.ts:238:42](../../lib/sync/owner-revenue-gap-repair.ts#L238) | local_market_not_found | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | runOwnerRevenueGapRepair · reason<br>marketIds &amp;&amp; marketIds.length &gt; 0 → !market |
| UI-8d0d8bab5f3d<br>[lib/sync/owner-revenue-gap-repair.ts:322:38](../../lib/sync/owner-revenue-gap-repair.ts#L322) | cloud_market_not_found | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | processOneMarket · reason<br>marketError &#124;&#124; !cloudMarket |
| UI-6aff2bb67a80<br>[lib/sync/owner-revenue-gap-repair.ts:368:72](../../lib/sync/owner-revenue-gap-repair.ts#L368) | local_daily_stats_exist | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | processOneMarket · reason<br>mode === 'hydrate_details_only' → !hasMissingDetailEventsOnly → localDailyStatsRevenueSum &gt; 0 |
| UI-2e61b55db62e<br>[lib/sync/owner-revenue-gap-repair.ts:368:100](../../lib/sync/owner-revenue-gap-repair.ts#L368) | already_in_sync | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | processOneMarket · reason<br>mode === 'hydrate_details_only' → !hasMissingDetailEventsOnly → 否則 localDailyStatsRevenueSum &gt; 0 |
| UI-18cebcdba369<br>[lib/sync/owner-revenue-gap-repair.ts:441:40](../../lib/sync/owner-revenue-gap-repair.ts#L441) | cloud_deal_events_empty | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | processOneMarket · reason<br>localRevenue === 0 &amp;&amp; localDeals.length === 0 &amp;&amp; localDailyStatsRevenueSum === 0 &amp;&amp; localDailyStatsDealCountSum === 0 &amp;&amp; cloudRevenue &gt; 0 &amp;&amp; cloudDeals &gt; 0 &amp;&amp; cloudDealEvents.length &gt; 0 → trulyMissing.length === 0 |
| UI-8ada57964e2e<br>[lib/sync/owner-revenue-gap-repair.ts:531:38](../../lib/sync/owner-revenue-gap-repair.ts#L531) | local_daily_stats_exist | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | processOneMarket · reason<br>否則 localRevenue === 0 &amp;&amp; localDeals.length === 0 &amp;&amp; localDailyStatsRevenueSum === 0 &amp;&amp; localDailyStatsDealCountSum === 0 &amp;&amp; cloudRevenue &gt; 0 &amp;&amp; cloudDeals &gt; 0 &amp;&amp; cloudDealEvents.length &gt; 0 → 否則 hasMissingDetailEventsOnly → 否則 hasInflatedLocalProjection → localDailyStatsRevenueSum &gt; 0 &#124;&#124; localDailyStatsDealCountSum &gt; 0 |
| UI-dfe99370e277<br>[lib/sync/owner-revenue-gap-repair.ts:533:38](../../lib/sync/owner-revenue-gap-repair.ts#L533) | already_in_sync | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | processOneMarket · reason<br>否則 localRevenue === 0 &amp;&amp; localDeals.length === 0 &amp;&amp; localDailyStatsRevenueSum === 0 &amp;&amp; localDailyStatsDealCountSum === 0 &amp;&amp; cloudRevenue &gt; 0 &amp;&amp; cloudDeals &gt; 0 &amp;&amp; cloudDealEvents.length &gt; 0 → 否則 hasMissingDetailEventsOnly → 否則 hasInflatedLocalProjection → 否則 localDailyStatsRevenueSum &gt; 0 &#124;&#124; localDailyStatsDealCountSum &gt; 0 → cloudRevenue === localRevenue &amp;&amp; localRevenue &gt; 0 |
| UI-a336aaaa6487<br>[lib/sync/owner-revenue-gap-repair.ts:535:38](../../lib/sync/owner-revenue-gap-repair.ts#L535) | local_revenue_exceeds_cloud | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | processOneMarket · reason<br>否則 localRevenue === 0 &amp;&amp; localDeals.length === 0 &amp;&amp; localDailyStatsRevenueSum === 0 &amp;&amp; localDailyStatsDealCountSum === 0 &amp;&amp; cloudRevenue &gt; 0 &amp;&amp; cloudDeals &gt; 0 &amp;&amp; cloudDealEvents.length &gt; 0 → 否則 hasMissingDetailEventsOnly → 否則 hasInflatedLocalProjection → 否則 localDailyStatsRevenueSum &gt; 0 &#124;&#124; localDailyStatsDealCountSum &gt; 0 → 否則 cloudRevenue === localRevenue &amp;&amp; localRevenue &gt; 0 → localRevenue &gt; cloudRevenue |
| UI-f62d0cf5725f<br>[lib/sync/owner-revenue-gap-repair.ts:537:38](../../lib/sync/owner-revenue-gap-repair.ts#L537) | partial_gap_not_supported | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | processOneMarket · reason<br>否則 localRevenue === 0 &amp;&amp; localDeals.length === 0 &amp;&amp; localDailyStatsRevenueSum === 0 &amp;&amp; localDailyStatsDealCountSum === 0 &amp;&amp; cloudRevenue &gt; 0 &amp;&amp; cloudDeals &gt; 0 &amp;&amp; cloudDealEvents.length &gt; 0 → 否則 hasMissingDetailEventsOnly → 否則 hasInflatedLocalProjection → 否則 localDailyStatsRevenueSum &gt; 0 &#124;&#124; localDailyStatsDealCountSum &gt; 0 → 否則 cloudRevenue === localRevenue &amp;&amp; localRevenue &gt; 0 → 否則 localRevenue &gt; cloudRevenue → localRevenue &gt; 0 &amp;&amp; localRevenue &lt; cloudRevenue |
| UI-5b74f784bc86<br>[lib/sync/owner-revenue-gap-repair.ts:539:38](../../lib/sync/owner-revenue-gap-repair.ts#L539) | local_deal_events_exist | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | processOneMarket · reason<br>否則 localRevenue === 0 &amp;&amp; localDeals.length === 0 &amp;&amp; localDailyStatsRevenueSum === 0 &amp;&amp; localDailyStatsDealCountSum === 0 &amp;&amp; cloudRevenue &gt; 0 &amp;&amp; cloudDeals &gt; 0 &amp;&amp; cloudDealEvents.length &gt; 0 → 否則 hasMissingDetailEventsOnly → 否則 hasInflatedLocalProjection → 否則 localDailyStatsRevenueSum &gt; 0 &#124;&#124; localDailyStatsDealCountSum &gt; 0 → 否則 cloudRevenue === localRevenue &amp;&amp; localRevenue &gt; 0 → 否則 localRevenue &gt; cloudRevenue → 否則 localRevenue &gt; 0 &amp;&amp; localRevenue &lt; cloudRevenue → localDeals.length &gt; 0 |
| UI-6705d819e643<br>[lib/sync/owner-revenue-gap-repair.ts:541:38](../../lib/sync/owner-revenue-gap-repair.ts#L541) | cloud_revenue_not_positive | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | processOneMarket · reason<br>否則 localRevenue === 0 &amp;&amp; localDeals.length === 0 &amp;&amp; localDailyStatsRevenueSum === 0 &amp;&amp; localDailyStatsDealCountSum === 0 &amp;&amp; cloudRevenue &gt; 0 &amp;&amp; cloudDeals &gt; 0 &amp;&amp; cloudDealEvents.length &gt; 0 → 否則 hasMissingDetailEventsOnly → 否則 hasInflatedLocalProjection → 否則 localDailyStatsRevenueSum &gt; 0 &#124;&#124; localDailyStatsDealCountSum &gt; 0 → 否則 cloudRevenue === localRevenue &amp;&amp; localRevenue &gt; 0 → 否則 localRevenue &gt; cloudRevenue → 否則 localRevenue &gt; 0 &amp;&amp; localRevenue &lt; cloudRevenue → 否則 localDeals.length &gt; 0 → cloudRevenue &lt;= 0 |
| UI-c041f0b03327<br>[lib/sync/owner-revenue-gap-repair.ts:543:38](../../lib/sync/owner-revenue-gap-repair.ts#L543) | cloud_deals_not_positive | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | processOneMarket · reason<br>否則 localRevenue === 0 &amp;&amp; localDeals.length === 0 &amp;&amp; localDailyStatsRevenueSum === 0 &amp;&amp; localDailyStatsDealCountSum === 0 &amp;&amp; cloudRevenue &gt; 0 &amp;&amp; cloudDeals &gt; 0 &amp;&amp; cloudDealEvents.length &gt; 0 → 否則 hasMissingDetailEventsOnly → 否則 hasInflatedLocalProjection → 否則 localDailyStatsRevenueSum &gt; 0 &#124;&#124; localDailyStatsDealCountSum &gt; 0 → 否則 cloudRevenue === localRevenue &amp;&amp; localRevenue &gt; 0 → 否則 localRevenue &gt; cloudRevenue → 否則 localRevenue &gt; 0 &amp;&amp; localRevenue &lt; cloudRevenue → 否則 localDeals.length &gt; 0 → 否則 cloudRevenue &lt;= 0 → cloudDeals &lt;= 0 |
| UI-f3cfb1ed4b37<br>[lib/sync/owner-revenue-gap-repair.ts:546:38](../../lib/sync/owner-revenue-gap-repair.ts#L546) | cloud_deal_events_empty | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | processOneMarket · reason<br>否則 localRevenue === 0 &amp;&amp; localDeals.length === 0 &amp;&amp; localDailyStatsRevenueSum === 0 &amp;&amp; localDailyStatsDealCountSum === 0 &amp;&amp; cloudRevenue &gt; 0 &amp;&amp; cloudDeals &gt; 0 &amp;&amp; cloudDealEvents.length &gt; 0 → 否則 hasMissingDetailEventsOnly → 否則 hasInflatedLocalProjection → 否則 localDailyStatsRevenueSum &gt; 0 &#124;&#124; localDailyStatsDealCountSum &gt; 0 → 否則 cloudRevenue === localRevenue &amp;&amp; localRevenue &gt; 0 → 否則 localRevenue &gt; cloudRevenue → 否則 localRevenue &gt; 0 &amp;&amp; localRevenue &lt; cloudRevenue → 否則 localDeals.length &gt; 0 → 否則 cloudRevenue &lt;= 0 → 否則 cloudDeals &lt;= 0 |
