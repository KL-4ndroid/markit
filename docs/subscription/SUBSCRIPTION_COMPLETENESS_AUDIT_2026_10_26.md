# 訂閱分級完整性盤點與補漏

日期：2026-10-26（Asia/Taipei）。範圍：26 份一般／公開／舊網址頁面來源、15 份 API route 來源，加上共用 gate、主要 RPC／資料路徑及背景中的權益更新。這是來源與針對性自動驗證，不是整批人工驗收，也不是全帳號正式付費上線。

## 結論

免費／輕量／高階的既定分界繼續沿用；本輪修正照片權限與 capability 回覆不一致、跨品牌照片讀取判斷不足、直接網址尾斜線及舊入口、停留畫面時的權益期限更新，以及商品照片跨來源 API 接線。沒有修改價格、商品／照片額度、降級保留政策、付款或取消機制。

082 仍只對指定測試帳號啟用。非指定帳號的商業寫入限制尚未全域打開，因此不能將本輪完成稱為所有訂閱制度均已正式生效。收費發布狀態仍以 canonical 任務與原生 gates 為準。

## 已修正的缺口

| 項目 | 原本情況 | 本輪結果與來源 |
| --- | --- | --- |
| 商品照片能力查詢 | open 模式可能回覆可管理，但 082 試行已拒絕保存 | capability API 額外使用與上傳相同的 `checkServerSubscriptionWrite`，拒絕時回覆既有 client 可辨識的 free_plan／entitlement_unavailable／permission_denied，不顯示假性可用 |
| 商品照片跨品牌讀取 | 單張 image 取得 access 物件時，非所有者即使沒有關係也可能得到 canEdit=false 的物件；image 僅檢查物件存在 | 非所有者必須有有效、已知角色的關係，且 owner 為有效高階；無關係、撤銷、未知角色、輕量／免費 owner、過期／停用或權益讀取失敗都拒絕 |
| 商品照片批次 metadata | 只檢查 active relationship，未完整核對 owner 高階身分 | 與單張 image／管理共用 `resolveProductCoverPhotoOwnerAccess`；每個 owner 核對一次，過濾後才讀照片 metadata |
| 員工照片管理 | 角色與方案的判斷分散 | manager 可管理；operator／viewer 在有效高階品牌下只可讀；現有角色範圍不擴大 |
| 直接網址與尾斜線 | `/analytics/`、`/settings/team/` 等未命中完全相等條件；mobile 靜態輸出確實使用 trailingSlash=true | 新共用 `surface-access.ts` 使用既有路徑邊界 matcher；涵蓋商品詳情、分析、報表、團隊子路徑與 `/staff` 舊入口。輕量分析維持基本月摘要，不落入進階頁 |
| 權益到期／畫面長時間停留 | provider 只按 refreshAfter 排程；較早的 entitlementEndsAt 與其他單獨 capability hook 不一定及時更新 | 統一在 useAccountCapabilities 排程提早更新、freshness 邊界與權益到期；邊界立即使畫面重算，再讀新權益。已過期時間不反覆輪詢；回前景沿既有 LifecyclePort 更新 |
| 隱藏照片功能仍讀資料 | 免費／輕量單場仍會預先取 owner 照片清單與刪除能力 | 單場只有高階提供照片讀取 ownerId；不再為被隱藏功能發出這兩類讀取 |
| 商品照片 API 的跨平台接線 | client 固定相對網址，五個 API 沒有共同的 CORS／OPTIONS | client 使用現有 buildAppApiUrl；五個 API 使用既有 allowlist 與共用 wrapper，在業務工作前拒絕不允許來源，允許來源的受控錯誤回覆也帶 CORS。沒有新增允許來源或萬用星號 |
| 認證服務失敗 | 商品照片 API 將驗證服務不可用一律回 401 | 區分 503 與真正未登入的 401，避免把服務故障當作登入過期 |
| 程式狀態登記過時 | salesPhotoEvidence 仍記為完全缺乏 entitlement enforcement | 登記為 pilot_authoritative_server／pilot_verified_global_pending，商品封面同樣保留全域上線 blocker；沒有把試行誤標成正式完成 |

主要來源：

- [路由呈現規則](../../lib/subscription/surface-access.ts)、[呈現 gate](../../components/subscription/SubscriptionSurfaceGate.tsx)。
- [期限計算](../../lib/subscription/capability-refresh.ts)、[capability hook](../../hooks/useAccountCapabilities.ts)、[provider](../../components/subscription/SubscriptionExperienceProvider.tsx)。
- [商品照片 owner／role／Team 判斷](../../lib/products/product-cover-photo-server.ts)、[capability API](../../app/api/product-cover-photo/capability/route.ts)、[批次 metadata](../../app/api/product-cover-photo/metadata/route.ts)。
- [CORS wrapper](../../lib/api/server/cors.ts)、[client API base](../../lib/products/product-cover-photo-client.ts)、[單場隱藏功能讀取](../../components/markets/MarketDetailScreen.tsx)。
- [實際接線狀態登記](../../lib/subscription/subscription-capability-implementation.ts)。

## 功能與權限矩陣

| 功能群 | 免費 | 輕量 | 高階 | 實際保護層／本輪判定 |
| --- | --- | --- | --- | --- |
| 首頁、報名／錄取／繳費提醒、場次搜尋與歷史行程 | 可用 | 可用 | 可用 | 原本 owner／登入／資料範圍；待處理場數不是付費分析 |
| 新增／編輯市集、縣市、報名費／攤位費／押金 | 可用 | 可用 | 可用 | 免費作繳費參考；不顯示費用加總、營收或利潤；074／075 相關 writer 保留 |
| 開攤／收攤基本狀態與時間軸 | 可用 | 可用 | 可用 | FreeMarketWorkspace 沿原 operating session writer，不要求先成交、照片或現金盤點 |
| 私人心得、集中頁、搜尋／日期／縣市篩選 | 可用 | 可用 | 可用 | 076 owner 私人 RLS／RPC；不附收入摘要，不分享私人全文 |
| 個人清單、範本、心得另建待辦 | 可用 | 可用 | 可用 | 077／081 owner writer；另建待辦不等於分享原始心得 |
| 固定出攤安排、縣市整理／補填 | 可用 | 可用 | 可用 | 070／080／081 owner metadata 功能，與付費縣市營收分析分開 |
| 成交、補登、互動計數、商品與基本庫存 | 不提供 | 可用 | 可用 | 單場／商品 gate；082 指定帳號的事件與 row trigger。非指定帳號尚未全域商業限制 |
| 單場成果、付款小計、成本與估計淨利 | 不提供 | 可用 | 可用 | 單場呈現分級；財務金額公式本輪不改 |
| 選填現金盤點／差額 | 不提供 | 老闆可用 | 老闆可用 | 078／079 的 owner RPC 及 082 寫入 trigger，不放大員工現金權限 |
| 本月收入／成交筆數、基本歷史查找 | 不提供 | 可用 | 可用 | 輕量以 BasicBusinessSummary 取代完整分析，不增加排名／比較 |
| 跨場、期間、商品、縣市等進階分析 | 不提供 | 不提供 | 可用 | surface gate＋analytics view-model／execute gate；計算由客戶端進行，沒有獨立的分析 HTTP API |
| 完整結算報告／新產生 PDF | 不提供 | 不提供 | 可用 | report／PDF execute gate、建立 view-model 前判斷；保留 owner 財務角色。沒有伺服器 PDF 產生 API |
| 新增／更換商品封面 | 不提供 | 可用 | 可用 | capability、上傳前／後 BFF、082 row trigger；另受既有照片 rollout flags 約束 |
| 成交照片及待補流程 | 不提供 | 不提供 | 可用 | UI／pending recovery gate、上傳前後 BFF、082 trigger；本輪不操作真實 R2 |
| 員工、manager、邀請、角色、協作備註 | 不提供 | 不提供 | 可用 | Team helper／064／065 RPC／角色 RLS，082 對 shared field_note 事件做高階限制；不因訂閱而跨品牌授權 |
| 帳號、同步、隱私、刪除帳號 | 可用 | 可用 | 可用 | 保留必要登入與角色驗證；不設成付費才能管理／刪除自己帳號 |

資料讀取與商業功能須分清：使用者自己既有原始資料的同步／讀取不是新啟用付費分析。付費分析與 PDF 在本機計算，不能宣稱可以阻止資料所有者在 App 外自行計算。未來若加伺服器計算／報表端點，該端點必須另做 authoritative entitlement 檢查。

## 刻意未改與尚未定案

1. 自己既有照片的 read_existing／delete_existing 沿既有 retained-operation 規則，不將這次跨品牌安全修正擴成降級後封鎖歷史照片。降級後的完整可讀／可改政策仍待下一階段制定。
2. 未同步成交到期後如何保存、到期後的唯讀／清理入口、舊訂戶商業條件遷移仍未完成；沒有清除佇列、改同步路由或新增寫入重試。
3. 商品／圖片容量與保存期尚未定案；既有照片技術 guard／rollout flags 不代表新商業額度，沒有承諾無限量。
4. 非指定帳號的全域 enforcement 尚未啟用；價格／優惠後台、正式購買／取消、商店 adapter 與商品啟用另屬後續工作，未改 native Gate 2／canonical release 狀態。
5. 救援與診斷工具屬使用者明確保留的測試工具；其收入差距／原始資料不是正式 Free 版經營分析。正式移除仍列發布工作，這次不操作修復、清除或備份匯入。
6. Excel 匯出仍 coming_soon／not_implemented，不列為已提供能力；DEMO、素材與公開介紹頁未操作或修改。
7. 商品照片預覽 Object URL、較舊分析快取中的瀏覽器呼叫仍有未來平台 port 整理工作；這次新增規則沒有瀏覽器 API，並已修正 API base／CORS 接線，不代表原生適配完成。

## 驗證證據與界線

- [完整性測試](../../tests/subscription-completeness.test.ts)：三方案／未知權益、直接網址／子路徑／尾斜線、免費基礎路徑、期限順序與停止輪詢、照片 owner／員工角色／其他品牌／停用到期／RPC 失敗、CORS 拒絕前零業務工作。
- 既有商品照片、權益模型、分析／結算／PDF、Team 等相關回歸保持通過；精確結果見下方完成紀錄。
- 真實本機 API：五條商品照片路徑的 OPTIONS 204 與未允許來源 403 通過；使用既有測試帳號唯讀檢查 capability 回覆為 canManage=false／free_plan，與雲端 product_photo preflight allowed=false 一致。
- 沒有新建市集、成交、商品、現金、照片或其他品牌資料；沒有寫入 R2、變更測試方案、改正式訂閱、執行新 SQL 或部署。
- 沒有進行整批人工操作、實際上傳、四小時等待或 iOS／Android 實機驗收。錯誤關係／角色／到期案例是隔離依賴測試，不冒充真實雲端保存證據。

## 頁面與 API 來源清單

以下是本次盤點的來源入口，數量指檔案，不指已驗收的正式功能數。DEMO、debug 與工具實驗頁不納入一般方案矩陣。

### 頁面

| 路徑 | 原始碼 |
| --- | --- |
| `/` | [app/page.tsx](../../app/page.tsx) |
| `/about` | [app/about/page.tsx](../../app/about/page.tsx) |
| `/analytics` | [app/analytics/page.tsx](../../app/analytics/page.tsx) |
| `/join` | [app/join/page.tsx](../../app/join/page.tsx) |
| `/markets` | [app/markets/page.tsx](../../app/markets/page.tsx) |
| `/markets/[id]` | [app/markets/[id]/page.web.tsx](../../app/markets/[id]/page.web.tsx) |
| `/markets/detail` | [app/markets/detail/page.tsx](../../app/markets/detail/page.tsx) |
| `/markets/journals` | [app/markets/journals/page.tsx](../../app/markets/journals/page.tsx) |
| `/markets/regions` | [app/markets/regions/page.tsx](../../app/markets/regions/page.tsx) |
| `/markets/schedules` | [app/markets/schedules/page.tsx](../../app/markets/schedules/page.tsx) |
| `/privacy` | [app/privacy/page.tsx](../../app/privacy/page.tsx) |
| `/products` | [app/products/page.tsx](../../app/products/page.tsx) |
| `/products/[id]` | [app/products/[id]/page.web.tsx](../../app/products/[id]/page.web.tsx) |
| `/products/detail` | [app/products/detail/page.tsx](../../app/products/detail/page.tsx) |
| `/recovery` | [app/recovery/page.tsx](../../app/recovery/page.tsx) |
| `/reports/settlement` | [app/reports/settlement/page.tsx](../../app/reports/settlement/page.tsx) |
| `/settings` | [app/settings/page.tsx](../../app/settings/page.tsx) |
| `/settings/account` | [app/settings/account/page.tsx](../../app/settings/account/page.tsx) |
| `/settings/app` | [app/settings/app/page.tsx](../../app/settings/app/page.tsx) |
| `/settings/data` | [app/settings/data/page.tsx](../../app/settings/data/page.tsx) |
| `/settings/sales` | [app/settings/sales/page.tsx](../../app/settings/sales/page.tsx) |
| `/settings/team` | [app/settings/team/page.tsx](../../app/settings/team/page.tsx) |
| `/staff` | [app/staff/page.tsx](../../app/staff/page.tsx) |
| `/subscription` | [app/subscription/page.tsx](../../app/subscription/page.tsx) |
| `/support` | [app/support/page.tsx](../../app/support/page.tsx) |
| `/terms` | [app/terms/page.tsx](../../app/terms/page.tsx) |

### API

| 路徑 | 方法來源 | 原始碼 |
| --- | --- | --- |
| `/api/account-capabilities` | GET / OPTIONS | [app/api/account-capabilities/route.ts](../../app/api/account-capabilities/route.ts) |
| `/api/account-deletion` | GET / OPTIONS / POST | [app/api/account-deletion/route.ts](../../app/api/account-deletion/route.ts) |
| `/api/cron/sales-photo-evidence-expiration` | GET | [app/api/cron/sales-photo-evidence-expiration/route.ts](../../app/api/cron/sales-photo-evidence-expiration/route.ts) |
| `/api/dev/subscription-price-foundation-smoke` | GET / OPTIONS | [app/api/dev/subscription-price-foundation-smoke/route.ts](../../app/api/dev/subscription-price-foundation-smoke/route.ts) |
| `/api/dev/subscription-simulation` | GET / OPTIONS / POST | [app/api/dev/subscription-simulation/route.ts](../../app/api/dev/subscription-simulation/route.ts) |
| `/api/health` |  | [app/api/health/route.ts](../../app/api/health/route.ts) |
| `/api/operational-events/sync` | OPTIONS / POST | [app/api/operational-events/sync/route.ts](../../app/api/operational-events/sync/route.ts) |
| `/api/product-cover-photo/capability` | GET / OPTIONS | [app/api/product-cover-photo/capability/route.ts](../../app/api/product-cover-photo/capability/route.ts) |
| `/api/product-cover-photo/image` | GET / OPTIONS | [app/api/product-cover-photo/image/route.ts](../../app/api/product-cover-photo/image/route.ts) |
| `/api/product-cover-photo/metadata` | OPTIONS / POST | [app/api/product-cover-photo/metadata/route.ts](../../app/api/product-cover-photo/metadata/route.ts) |
| `/api/product-cover-photo` | DELETE / OPTIONS | [app/api/product-cover-photo/route.ts](../../app/api/product-cover-photo/route.ts) |
| `/api/product-cover-photo/upload` | OPTIONS / POST | [app/api/product-cover-photo/upload/route.ts](../../app/api/product-cover-photo/upload/route.ts) |
| `/api/sales-photo-evidence/delete` | DELETE / GET / OPTIONS / PATCH / POST / PUT | [app/api/sales-photo-evidence/delete/route.ts](../../app/api/sales-photo-evidence/delete/route.ts) |
| `/api/sales-photo-evidence/image` | DELETE / GET / OPTIONS / PATCH / POST / PUT | [app/api/sales-photo-evidence/image/route.ts](../../app/api/sales-photo-evidence/image/route.ts) |
| `/api/sales-photo-evidence/upload` | DELETE / GET / OPTIONS / PATCH / POST / PUT | [app/api/sales-photo-evidence/upload/route.ts](../../app/api/sales-photo-evidence/upload/route.ts) |


補充：`/api/operational-events/sync` 是同步事件／事故的觀測回報，不是實際業務 events 的同步入口；業務事件仍走既有 Supabase 同步與 082 trigger。cron 僅系統認證，dev 僅受保護的本機工具；列出方法不代表每個方法／rollout 都已啟用。商品與市集的 `[id]` 舊網址沿既有 redirect／共用 detail screen，不是另一套無分級畫面。


## 本輪完成紀錄

- 18 份相關測試檔通過：subscription-completeness、product-cover-photo、subscription-experience、subscription-capability-implementation、subscription-feature-gates、subscription-plan-model、subscription-center-view、analytics-subscription-access、advanced-analytics-subscription-access、settlement-report-subscription-access、team-subscription-enforcement、app-api-server-cors、app-api-client、subscription-account-capability-api、subscription-capability-presentation、subscription-center-ui、platform-lifecycle-boundary、sales-photo-evidence-upload-route-disabled。
- 15 份本輪修改的產品來源 ESLint 通過。Web 生產建置與產品 TypeScript 檢查通過。
- 行動版靜態建置與資產邊界驗證通過：378 個檔案、19.73 MiB、35 個 segment aliases；不是原生實機驗收。
- 提示文案清單重產並 --check 通過：681 個來源、7,270 筆紀錄、18 個產物；文案產生器 10 項測試通過。
- 真實本機 API 的五組預檢／拒絕，以及商品照片 capability／雲端 preflight 一致性皆通過。沒有寫入營運資料或切換測試方案。
- 本輪沒有新增／修改 Supabase migration，不需要使用者再執行 SQL；沒有 commit／push／部署。既有 DEMO 與素材修改保留。
