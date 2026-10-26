# 同步、離線與資料狀態：提示與介面文字

> 自動產生；請勿手動修改。重新產生：`node scripts/generate-ui-copy-inventory.mjs`。
> [總索引](../APP_UI_COPY_INDEX.md) · [完整 JSON](inventory.json) · [逐檔覆蓋](coverage.md)

共 367 筆來源位置；同字不同出處分開記錄。這是來源盤點，候選與未啟用分支不算已上線功能。

## app/api/operational-events/sync/route.ts

API 回應／伺服器來源（須確認客戶端是否顯示）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-36cbb956bb11<br>[app/api/operational-events/sync/route.ts:111:65](../../app/api/operational-events/sync/route.ts#L111) | Sync incident authentication is unavailable. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>actor === 'unavailable' |
| UI-b23f9f1977bc<br>[app/api/operational-events/sync/route.ts:114:62](../../app/api/operational-events/sync/route.ts#L114) | Sync incident reporting requires authentication. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>!actor |
| UI-c0470e9dc531<br>[app/api/operational-events/sync/route.ts:117:63](../../app/api/operational-events/sync/route.ts#L117) | Sync incident reports require JSON. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>!isJsonRequest(request) |
| UI-d680039d1244<br>[app/api/operational-events/sync/route.ts:123:59](../../app/api/operational-events/sync/route.ts#L123) | Sync incident report is too large. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>!body.ok → body.code === 'body_too_large' |
| UI-55bcf995df97<br>[app/api/operational-events/sync/route.ts:124:57](../../app/api/operational-events/sync/route.ts#L124) | Sync incident report is invalid. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>!body.ok → 否則 body.code === 'body_too_large' |
| UI-daf424d1c379<br>[app/api/operational-events/sync/route.ts:129:60](../../app/api/operational-events/sync/route.ts#L129) | Sync incident report is invalid. | **來源候選** · 候選，非已證實提示<br>POST 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | POST<br>!report |

## components/common/DatabaseRecoveryPanel.tsx

僅由測試／工具頁靜態引用

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-718dc6aae276<br>[components/common/DatabaseRecoveryPanel.tsx:38:17](../../components/common/DatabaseRecoveryPanel.tsx#L38) | ${nextStatus} | **動態文字入口** · 執行時綁定入口<br>handleCheck 接收執行時文字；內容需追查所列綁定與生產端 | handleCheck<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dc7fa8e02757<br>[components/common/DatabaseRecoveryPanel.tsx:40:42](../../components/common/DatabaseRecoveryPanel.tsx#L40) | 本機資料庫狀態正常 | **來源候選** · 候選，非已證實提示<br>handleCheck 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handleCheck<br>nextStatus.state === 'healthy' |
| UI-b02b6652f339<br>[components/common/DatabaseRecoveryPanel.tsx:40:56](../../components/common/DatabaseRecoveryPanel.tsx#L40) | 本機資料庫需要處理 | **來源候選** · 候選，非已證實提示<br>handleCheck 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handleCheck<br>否則 nextStatus.state === 'healthy' |
| UI-98f515eb363b<br>[components/common/DatabaseRecoveryPanel.tsx:43:60](../../components/common/DatabaseRecoveryPanel.tsx#L43) | 資料庫檢查失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleCheck<br>catch：操作拋出例外 → 否則 error instanceof Error |
| UI-9e9a2813c421<br>[components/common/DatabaseRecoveryPanel.tsx:53:17](../../components/common/DatabaseRecoveryPanel.tsx#L53) | ${nextStatus} | **動態文字入口** · 執行時綁定入口<br>handleRetry 接收執行時文字；內容需追查所列綁定與生產端 | handleRetry<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-db58c697f930<br>[components/common/DatabaseRecoveryPanel.tsx:55:42](../../components/common/DatabaseRecoveryPanel.tsx#L55) | 重新檢查完成，資料庫正常 | **來源候選** · 候選，非已證實提示<br>handleRetry 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handleRetry<br>nextStatus.state === 'healthy' |
| UI-46afb272a878<br>[components/common/DatabaseRecoveryPanel.tsx:55:59](../../components/common/DatabaseRecoveryPanel.tsx#L55) | 重新檢查後仍有問題 | **來源候選** · 候選，非已證實提示<br>handleRetry 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | handleRetry<br>否則 nextStatus.state === 'healthy' |
| UI-df55f1fe2c74<br>[components/common/DatabaseRecoveryPanel.tsx:58:60](../../components/common/DatabaseRecoveryPanel.tsx#L58) | 重新檢查失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleRetry<br>catch：操作拋出例外 → 否則 error instanceof Error |
| UI-8b5ee2c3a47d<br>[components/common/DatabaseRecoveryPanel.tsx:69:21](../../components/common/DatabaseRecoveryPanel.tsx#L69) | 已建立並匯出本機備份 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleExport<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-20aa5024fbeb<br>[components/common/DatabaseRecoveryPanel.tsx:71:60](../../components/common/DatabaseRecoveryPanel.tsx#L71) | 建立備份失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleExport<br>catch：操作拋出例外 → 否則 error instanceof Error |
| UI-387a5e951fb6<br>[components/common/DatabaseRecoveryPanel.tsx:83:17](../../components/common/DatabaseRecoveryPanel.tsx#L83) | ${nextStatus} | **動態文字入口** · 執行時綁定入口<br>handleRepairDailyStats 接收執行時文字；內容需追查所列綁定與生產端 | handleRepairDailyStats<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c5970c980575<br>[components/common/DatabaseRecoveryPanel.tsx:86:23](../../components/common/DatabaseRecoveryPanel.tsx#L86) | 已修復 ${result.repairedDailyStats} 筆每日統計，並已匯出修復前備份 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleRepairDailyStats<br>result.integrity.ok |
| UI-2d23a0ba9f54<br>[components/common/DatabaseRecoveryPanel.tsx:88:23](../../components/common/DatabaseRecoveryPanel.tsx#L88) | 已修復 ${result.repairedDailyStats} 筆每日統計，但仍有其他項目需要檢查 | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | handleRepairDailyStats<br>否則 result.integrity.ok |
| UI-7d1ac27607b4<br>[components/common/DatabaseRecoveryPanel.tsx:91:60](../../components/common/DatabaseRecoveryPanel.tsx#L91) | 每日統計修復失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleRepairDailyStats<br>catch：操作拋出例外 → 否則 error instanceof Error |
| UI-e0835aace1d4<br>[components/common/DatabaseRecoveryPanel.tsx:104:17](../../components/common/DatabaseRecoveryPanel.tsx#L104) | ${nextStatus} | **動態文字入口** · 執行時綁定入口<br>handleRepairProducts 接收執行時文字；內容需追查所列綁定與生產端 | handleRepairProducts<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-88b3c0688afb<br>[components/common/DatabaseRecoveryPanel.tsx:107:20](../../components/common/DatabaseRecoveryPanel.tsx#L107) | 沒有需要修復的商品缺口 | **確認／通知** · 直接呈現定義<br>toast.info：提示操作結果、進度或要求使用者確認 | handleRepairProducts<br>result.repairedProducts === 0 |
| UI-3a61facf6330<br>[components/common/DatabaseRecoveryPanel.tsx:110:11](../../components/common/DatabaseRecoveryPanel.tsx#L110) | 已修復 ${result.repairedProducts} 個商品（雲端 ${result.fromCloud.length} 個、佔位 ${result.asPlaceholder.length} 個），並已匯出修復前備份 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleRepairProducts<br>否則 result.repairedProducts === 0 → result.integrity.ok |
| UI-9ab53b82ad70<br>[components/common/DatabaseRecoveryPanel.tsx:114:11](../../components/common/DatabaseRecoveryPanel.tsx#L114) | 已修復 ${result.repairedProducts} 個商品，但仍有其他項目需要檢查 | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | handleRepairProducts<br>否則 result.repairedProducts === 0 → 否則 result.integrity.ok |
| UI-089f5706e355<br>[components/common/DatabaseRecoveryPanel.tsx:118:60](../../components/common/DatabaseRecoveryPanel.tsx#L118) | 商品修復失敗 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleRepairProducts<br>catch：操作拋出例外 → 否則 error instanceof Error |
| UI-dab5f5c3d662<br>[components/common/DatabaseRecoveryPanel.tsx:145:28](../../components/common/DatabaseRecoveryPanel.tsx#L145) | 資料庫狀態正常 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | DatabaseRecoveryPanel<br>isHealthy |
| UI-5d2dbef0d8f8<br>[components/common/DatabaseRecoveryPanel.tsx:145:40](../../components/common/DatabaseRecoveryPanel.tsx#L145) | 資料庫健康檢查 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | DatabaseRecoveryPanel<br>否則 isHealthy |
| UI-e24394ad5419<br>[components/common/DatabaseRecoveryPanel.tsx:149:19](../../components/common/DatabaseRecoveryPanel.tsx#L149) | 本機資料完整性檢查已通過。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DatabaseRecoveryPanel<br>isHealthy |
| UI-0e5209cb7cf0<br>[components/common/DatabaseRecoveryPanel.tsx:150:19](../../components/common/DatabaseRecoveryPanel.tsx#L150) | 檢查本機 IndexedDB 是否有格式錯誤或統計快取異常。修復前會建立備份。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DatabaseRecoveryPanel<br>否則 isHealthy |
| UI-84d2635530fe<br>[components/common/DatabaseRecoveryPanel.tsx:163:13](../../components/common/DatabaseRecoveryPanel.tsx#L163) | 檢查 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DatabaseRecoveryPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-25374e5540bc<br>[components/common/DatabaseRecoveryPanel.tsx:172:13](../../components/common/DatabaseRecoveryPanel.tsx#L172) | 重試 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DatabaseRecoveryPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6bb3322573b3<br>[components/common/DatabaseRecoveryPanel.tsx:181:13](../../components/common/DatabaseRecoveryPanel.tsx#L181) | 備份 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DatabaseRecoveryPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-deec9b80a701<br>[components/common/DatabaseRecoveryPanel.tsx:190:13](../../components/common/DatabaseRecoveryPanel.tsx#L190) | 修復統計 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DatabaseRecoveryPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9f055e7967ec<br>[components/common/DatabaseRecoveryPanel.tsx:199:13](../../components/common/DatabaseRecoveryPanel.tsx#L199) | 修復商品 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DatabaseRecoveryPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-00d1dacd317c<br>[components/common/DatabaseRecoveryPanel.tsx:208:15](../../components/common/DatabaseRecoveryPanel.tsx#L208) | 發現每日統計快取欄位異常。可先按「備份」，再按「修復統計」將無效數值正規化。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DatabaseRecoveryPanel<br>(errors.length &gt; 0 &#124;&#124; warnings.length &gt; 0) → hasDailyStatsNumericErrors |
| UI-19372ed4aee2<br>[components/common/DatabaseRecoveryPanel.tsx:213:15](../../components/common/DatabaseRecoveryPanel.tsx#L213) | 發現成交記錄引用了已刪除或不存在的商品。可先按「備份」，再按「修復商品」從雲端補回或建立佔位商品。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DatabaseRecoveryPanel<br>(errors.length &gt; 0 &#124;&#124; warnings.length &gt; 0) → hasProductReferenceErrors |
| UI-1d72e84bda16<br>[components/common/DatabaseRecoveryPanel.tsx:217:54](../../components/common/DatabaseRecoveryPanel.tsx#L217) | ${error} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | DatabaseRecoveryPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-080513974053<br>[components/common/DatabaseRecoveryPanel.tsx:220:58](../../components/common/DatabaseRecoveryPanel.tsx#L220) | ${warning} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | DatabaseRecoveryPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/common/RecordSyncStatus.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-8bbd2238532a<br>[components/common/RecordSyncStatus.tsx:26:69](../../components/common/RecordSyncStatus.tsx#L26) | ${presentation.accessibleLabel} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | RecordSyncStatus · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3d13a49d081d<br>[components/common/RecordSyncStatus.tsx:30:14](../../components/common/RecordSyncStatus.tsx#L30) | ${presentation.label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | RecordSyncStatus<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bd65726b103a<br>[components/common/RecordSyncStatus.tsx:31:155](../../components/common/RecordSyncStatus.tsx#L31) | 9+ | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | RecordSyncStatus<br>state.pendingCount &gt; 0 &amp;&amp; presentation.kind !== 'pending' → state.pendingCount &gt; 9 |
| UI-3d7cc1ab4c87<br>[components/common/RecordSyncStatus.tsx:31:182](../../components/common/RecordSyncStatus.tsx#L31) | ${state.pendingCount &gt; 9 ? '9+' : state.pendingCount} 筆 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | RecordSyncStatus<br>state.pendingCount &gt; 0 &amp;&amp; presentation.kind !== 'pending' |
| UI-355e12fa358b<br>[components/common/RecordSyncStatus.tsx:33:65](../../components/common/RecordSyncStatus.tsx#L33) | 紀錄同步狀態 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | RecordSyncStatus · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4dd2fdc07d1d<br>[components/common/RecordSyncStatus.tsx:35:153](../../components/common/RecordSyncStatus.tsx#L35) | 關閉 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | RecordSyncStatus · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f737607f1d19<br>[components/common/RecordSyncStatus.tsx:37:132](../../components/common/RecordSyncStatus.tsx#L37) | ${presentation.actionLabel} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | RecordSyncStatus · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2c15ea6b84ca<br>[components/common/RecordSyncStatus.tsx:41:39](../../components/common/RecordSyncStatus.tsx#L41) | ${presentation.label} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | RecordSyncStatus<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d105f2876887<br>[components/common/RecordSyncStatus.tsx:44:134](../../components/common/RecordSyncStatus.tsx#L44) | ${state.error} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | RecordSyncStatus<br>state.error &amp;&amp; presentation.kind === 'error' |
| UI-54b32b45301b<br>[components/common/RecordSyncStatus.tsx:46:15](../../components/common/RecordSyncStatus.tsx#L46) | 上次完成同步 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | RecordSyncStatus<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-975fdb0cfce1<br>[components/common/RecordSyncStatus.tsx:46:31](../../components/common/RecordSyncStatus.tsx#L46) | ${presentation.lastSyncLabel} | **動態文字入口** · 執行時綁定入口<br>dd 接收執行時文字；內容需追查所列綁定與生產端 | RecordSyncStatus<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-734a53ad0293<br>[components/common/RecordSyncStatus.tsx:47:15](../../components/common/RecordSyncStatus.tsx#L47) | 待同步紀錄 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | RecordSyncStatus<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d82ebe624d5a<br>[components/common/RecordSyncStatus.tsx:47:50](../../components/common/RecordSyncStatus.tsx#L47) | ${state.pendingCount} 筆 | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | RecordSyncStatus<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a5ccf5d00b95<br>[components/common/RecordSyncStatus.tsx:49:86](../../components/common/RecordSyncStatus.tsx#L49) | 此處顯示市集、商品與成交等紀錄的同步狀態。心得、現金草稿與照片是否送達，請查看各功能中的狀態。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RecordSyncStatus<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/common/SyncStatusIndicator.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-b623b6d5cfc5<br>[components/common/SyncStatusIndicator.tsx:39:16](../../components/common/SyncStatusIndicator.tsx#L39) | 已要求檢查紀錄同步狀態 | **確認／通知** · 直接呈現定義<br>toast.info：提示操作結果、進度或要求使用者確認 | handleSync<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c122c53723a0<br>[components/common/SyncStatusIndicator.tsx:39:53](../../components/common/SyncStatusIndicator.tsx#L39) | sync-manual | **確認／通知** · 直接呈現定義<br>toast.info：提示操作結果、進度或要求使用者確認 | handleSync · id<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/sync/InitialSyncContent.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-187622051330<br>[components/sync/InitialSyncContent.tsx:10:11](../../components/sync/InitialSyncContent.tsx#L10) | ${view.description} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | InitialSyncContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-11c2fdec98b7<br>[components/sync/InitialSyncContent.tsx:13:42](../../components/sync/InitialSyncContent.tsx#L13) | 目前同步步驟 | **輔助辨識** · 直接呈現定義<br>提供 div 的讀屏名稱、圖片替代文字或滑入說明 | InitialSyncContent · aria-label<br>view.progress |
| UI-59ef0a9796e3<br>[components/sync/InitialSyncContent.tsx:17:57](../../components/sync/InitialSyncContent.tsx#L17) | 目前步驟：${view.progress.current} / ${view.progress.total} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | InitialSyncContent<br>view.progress |
| UI-8b08713be32b<br>[components/sync/InitialSyncContent.tsx:19:106](../../components/sync/InitialSyncContent.tsx#L19) | ${error} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | InitialSyncContent<br>error &amp;&amp; view.failed |
| UI-08eff0ff7984<br>[components/sync/InitialSyncContent.tsx:20:65](../../components/sync/InitialSyncContent.tsx#L20) | ${view.hint} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | InitialSyncContent<br>view.hint |

## components/sync/InitialSyncDialog.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-b620865da0aa<br>[components/sync/InitialSyncDialog.tsx:71:78](../../components/sync/InitialSyncDialog.tsx#L71) | ${view.title} | **動態文字入口** · 執行時綁定入口<br>AppDialog 接收執行時文字；內容需追查所列綁定與生產端 | InitialSyncDialog · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-aac4670ae436<br>[components/sync/InitialSyncDialog.tsx:73:153](../../components/sync/InitialSyncDialog.tsx#L73) | 先查看本機資料 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | InitialSyncDialog · footer<br>view.canContinue |
| UI-599b02874e22<br>[components/sync/InitialSyncDialog.tsx:75:114](../../components/sync/InitialSyncDialog.tsx#L75) | 連線後再載入 | **來源候選** · 候選，非已證實提示<br>InitialSyncDialog 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | InitialSyncDialog · footer<br>view.canContinue → !view.syncing → !isOnline |
| UI-16c233fef7d9<br>[components/sync/InitialSyncDialog.tsx:75:125](../../components/sync/InitialSyncDialog.tsx#L75) | 重新載入 | **來源候選** · 候選，非已證實提示<br>InitialSyncDialog 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | InitialSyncDialog · footer<br>view.canContinue → !view.syncing → 否則 !isOnline |

## components/sync/SyncConfirmDialog.tsx

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-607d18905198<br>[components/sync/SyncConfirmDialog.tsx:91:23](../../components/sync/SyncConfirmDialog.tsx#L91) | 資料同步設定 | **畫面文字** · 直接呈現定義<br>Dialog.Title：辨識畫面、區塊或對話框主題 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a669b43f6abe<br>[components/sync/SyncConfirmDialog.tsx:94:23](../../components/sync/SyncConfirmDialog.tsx#L94) | 選擇如何處理本地和雲端資料 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-382308a2b6e4<br>[components/sync/SyncConfirmDialog.tsx:103:73](../../components/sync/SyncConfirmDialog.tsx#L103) | 本地資料 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4ce097c84328<br>[components/sync/SyncConfirmDialog.tsx:105:68](../../components/sync/SyncConfirmDialog.tsx#L105) | 筆記錄 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-45ccd7cceeba<br>[components/sync/SyncConfirmDialog.tsx:108:73](../../components/sync/SyncConfirmDialog.tsx#L108) | 雲端資料 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-525359161fcb<br>[components/sync/SyncConfirmDialog.tsx:110:68](../../components/sync/SyncConfirmDialog.tsx#L110) | 筆記錄 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-64dfcc1a1c5a<br>[components/sync/SyncConfirmDialog.tsx:129:66](../../components/sync/SyncConfirmDialog.tsx#L129) | 上傳本地資料到雲端 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ad9c3046b7e6<br>[components/sync/SyncConfirmDialog.tsx:130:68](../../components/sync/SyncConfirmDialog.tsx#L130) | 保留本地資料，同步到雲端 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-571471d51710<br>[components/sync/SyncConfirmDialog.tsx:146:66](../../components/sync/SyncConfirmDialog.tsx#L146) | 下載雲端資料到本地 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-29b3850b5628<br>[components/sync/SyncConfirmDialog.tsx:147:68](../../components/sync/SyncConfirmDialog.tsx#L147) | 合併雲端資料到本地 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e75ca7417ddb<br>[components/sync/SyncConfirmDialog.tsx:163:66](../../components/sync/SyncConfirmDialog.tsx#L163) | 清除本地資料 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1985a72bdda6<br>[components/sync/SyncConfirmDialog.tsx:164:68](../../components/sync/SyncConfirmDialog.tsx#L164) | 刪除本地資料，從雲端重新開始 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d74a9f4e0cb8<br>[components/sync/SyncConfirmDialog.tsx:174:53](../../components/sync/SyncConfirmDialog.tsx#L174) | 提示： | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2b5c3025f8c9<br>[components/sync/SyncConfirmDialog.tsx:175:23](../../components/sync/SyncConfirmDialog.tsx#L175) | 建議先上傳本地資料，再下載雲端資料，以確保資料完整性。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d2b6066aeee4<br>[components/sync/SyncConfirmDialog.tsx:186:19](../../components/sync/SyncConfirmDialog.tsx#L186) | 稍後決定 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SyncConfirmDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/sync/SyncProgressDialog.tsx

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-67654c908ab7<br>[components/sync/SyncProgressDialog.tsx:37:29](../../components/sync/SyncProgressDialog.tsx#L37) | 上傳完成 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · title<br>type === 'upload' → isComplete |
| UI-856cdbda80fe<br>[components/sync/SyncProgressDialog.tsx:37:38](../../components/sync/SyncProgressDialog.tsx#L37) | 正在上傳資料 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · title<br>type === 'upload' → 否則 isComplete |
| UI-b84b1a5ae44a<br>[components/sync/SyncProgressDialog.tsx:38:35](../../components/sync/SyncProgressDialog.tsx#L38) | 已上傳 ${total} 筆記錄 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · description<br>type === 'upload' → isComplete |
| UI-f3ccfc1c8ecb<br>[components/sync/SyncProgressDialog.tsx:38:56](../../components/sync/SyncProgressDialog.tsx#L38) | ${current} / ${total} 筆記錄 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · description<br>type === 'upload' → 否則 isComplete |
| UI-71f558127d4a<br>[components/sync/SyncProgressDialog.tsx:45:29](../../components/sync/SyncProgressDialog.tsx#L45) | 快照載入完成 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · title<br>phase === 'snapshot' → isComplete |
| UI-d273ee33d301<br>[components/sync/SyncProgressDialog.tsx:45:40](../../components/sync/SyncProgressDialog.tsx#L45) | 正在載入雲端快照 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · title<br>phase === 'snapshot' → 否則 isComplete |
| UI-55a19d9d04b0<br>[components/sync/SyncProgressDialog.tsx:46:35](../../components/sync/SyncProgressDialog.tsx#L46) | 快照已載入 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · description<br>phase === 'snapshot' → isComplete |
| UI-ce782a09d8db<br>[components/sync/SyncProgressDialog.tsx:46:45](../../components/sync/SyncProgressDialog.tsx#L46) | 載入數據快照中... | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · description<br>phase === 'snapshot' → 否則 isComplete |
| UI-7a9da1ef58e5<br>[components/sync/SyncProgressDialog.tsx:52:29](../../components/sync/SyncProgressDialog.tsx#L52) | 增量同步完成 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · title<br>phase === 'incremental' → isComplete |
| UI-0959ef5d8260<br>[components/sync/SyncProgressDialog.tsx:52:40](../../components/sync/SyncProgressDialog.tsx#L52) | 正在同步增量事件 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · title<br>phase === 'incremental' → 否則 isComplete |
| UI-8bd3bcca0180<br>[components/sync/SyncProgressDialog.tsx:53:35](../../components/sync/SyncProgressDialog.tsx#L53) | 已同步 ${total} 筆新事件 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · description<br>phase === 'incremental' → isComplete |
| UI-ace4029d70f2<br>[components/sync/SyncProgressDialog.tsx:53:57](../../components/sync/SyncProgressDialog.tsx#L53) | ${current} / ${total} 筆新事件 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · description<br>phase === 'incremental' → 否則 isComplete |
| UI-9cf622af4eab<br>[components/sync/SyncProgressDialog.tsx:59:27](../../components/sync/SyncProgressDialog.tsx#L59) | 同步完成 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · title<br>isComplete |
| UI-435d17f53042<br>[components/sync/SyncProgressDialog.tsx:59:36](../../components/sync/SyncProgressDialog.tsx#L59) | 正在下載資料 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · title<br>否則 isComplete |
| UI-2c62e7c0a781<br>[components/sync/SyncProgressDialog.tsx:60:33](../../components/sync/SyncProgressDialog.tsx#L60) | 已處理 ${total} 筆記錄 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · description<br>isComplete |
| UI-6b5c3677c3c1<br>[components/sync/SyncProgressDialog.tsx:60:54](../../components/sync/SyncProgressDialog.tsx#L60) | ${current} / ${total} 筆記錄 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getPhaseInfo · description<br>否則 isComplete |
| UI-0187d13dbca1<br>[components/sync/SyncProgressDialog.tsx:115:22](../../components/sync/SyncProgressDialog.tsx#L115) | ${title} | **動態文字入口** · 執行時綁定入口<br>Dialog.Title 接收執行時文字；內容需追查所列綁定與生產端 | SyncProgressDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-556940135abd<br>[components/sync/SyncProgressDialog.tsx:120:22](../../components/sync/SyncProgressDialog.tsx#L120) | ${description} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | SyncProgressDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-eebc469b7f06<br>[components/sync/SyncProgressDialog.tsx:132:49](../../components/sync/SyncProgressDialog.tsx#L132) | 1/2 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SyncProgressDialog<br>type === 'download' &amp;&amp; phase → phase === 'snapshot' |
| UI-cf2248c685b5<br>[components/sync/SyncProgressDialog.tsx:132:57](../../components/sync/SyncProgressDialog.tsx#L132) | 2/2 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SyncProgressDialog<br>type === 'download' &amp;&amp; phase → 否則 phase === 'snapshot' |
| UI-296188714108<br>[components/sync/SyncProgressDialog.tsx:158:33](../../components/sync/SyncProgressDialog.tsx#L158) | ${percentage}% | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncProgressDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2e24f88809ad<br>[components/sync/SyncProgressDialog.tsx:174:23](../../components/sync/SyncProgressDialog.tsx#L174) | ✓ 所有資料已同步完成 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncProgressDialog<br>isComplete |

## components/sync/SyncStatus.tsx

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-f2bec40192a1<br>[components/sync/SyncStatus.tsx:67:16](../../components/sync/SyncStatus.tsx#L67) | 同步中 | **來源候選** · 候選，非已證實提示<br>getStatusText 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getStatusText<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-38daf4a7f379<br>[components/sync/SyncStatus.tsx:69:16](../../components/sync/SyncStatus.tsx#L69) | 已同步 | **來源候選** · 候選，非已證實提示<br>getStatusText 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getStatusText<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a5b5516e738c<br>[components/sync/SyncStatus.tsx:71:16](../../components/sync/SyncStatus.tsx#L71) | 同步失敗 | **來源候選** · 候選，非已證實提示<br>getStatusText 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getStatusText<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-89bd2a703078<br>[components/sync/SyncStatus.tsx:73:16](../../components/sync/SyncStatus.tsx#L73) | 離線 | **來源候選** · 候選，非已證實提示<br>getStatusText 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getStatusText<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3d33ea02b6a6<br>[components/sync/SyncStatus.tsx:75:16](../../components/sync/SyncStatus.tsx#L75) | 閒置 | **來源候選** · 候選，非已證實提示<br>getStatusText 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getStatusText<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-55d2f311023d<br>[components/sync/SyncStatus.tsx:96:29](../../components/sync/SyncStatus.tsx#L96) | 從未同步 | **來源候選** · 候選，非已證實提示<br>formatLastSync 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | formatLastSync<br>!lastSyncAt |
| UI-58a06c279598<br>[components/sync/SyncStatus.tsx:101:30](../../components/sync/SyncStatus.tsx#L101) | 剛剛 | **來源候選** · 候選，非已證實提示<br>formatLastSync 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | formatLastSync<br>diff &lt; 60000 |
| UI-35ffa16aeaec<br>[components/sync/SyncStatus.tsx:102:32](../../components/sync/SyncStatus.tsx#L102) | ${Math.floor(diff / 60000)} 分鐘前 | **來源候選** · 候選，非已證實提示<br>formatLastSync 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | formatLastSync<br>diff &lt; 3600000 |
| UI-9a123c188413<br>[components/sync/SyncStatus.tsx:103:33](../../components/sync/SyncStatus.tsx#L103) | ${Math.floor(diff / 3600000)} 小時前 | **來源候選** · 候選，非已證實提示<br>formatLastSync 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | formatLastSync<br>diff &lt; 86400000 |
| UI-69b46693d994<br>[components/sync/SyncStatus.tsx:104:12](../../components/sync/SyncStatus.tsx#L104) | ${Math.floor(diff / 86400000)} 天前 | **來源候選** · 候選，非已證實提示<br>formatLastSync 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | formatLastSync<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8df51de0bf0f<br>[components/sync/SyncStatus.tsx:121:10](../../components/sync/SyncStatus.tsx#L121) | ${getStatusIcon()} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | SyncStatus<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d37f7794aab6<br>[components/sync/SyncStatus.tsx:123:12](../../components/sync/SyncStatus.tsx#L123) | ${getStatusText()} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SyncStatus<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-50a5702b8d9b<br>[components/sync/SyncStatus.tsx:138:63](../../components/sync/SyncStatus.tsx#L138) | 狀態 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SyncStatus<br>showTooltip |
| UI-e2a4a6f0969e<br>[components/sync/SyncStatus.tsx:140:18](../../components/sync/SyncStatus.tsx#L140) | ${getStatusIcon()} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | SyncStatus<br>showTooltip |
| UI-0ad1e71a5cd3<br>[components/sync/SyncStatus.tsx:141:56](../../components/sync/SyncStatus.tsx#L141) | ${getStatusText()} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SyncStatus<br>showTooltip |
| UI-52d8a989961b<br>[components/sync/SyncStatus.tsx:147:63](../../components/sync/SyncStatus.tsx#L147) | 網路 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SyncStatus<br>showTooltip |
| UI-462b55fa7658<br>[components/sync/SyncStatus.tsx:149:29](../../components/sync/SyncStatus.tsx#L149) | 🟢 已連線 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SyncStatus<br>showTooltip → isOnline |
| UI-bab5bfad0b1f<br>[components/sync/SyncStatus.tsx:149:40](../../components/sync/SyncStatus.tsx#L149) | ⚪ 離線 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SyncStatus<br>showTooltip → 否則 isOnline |
| UI-a0548f1ea08c<br>[components/sync/SyncStatus.tsx:155:63](../../components/sync/SyncStatus.tsx#L155) | 最後同步 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SyncStatus<br>showTooltip |
| UI-36ffd9b8dfa5<br>[components/sync/SyncStatus.tsx:164:65](../../components/sync/SyncStatus.tsx#L164) | 待同步 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SyncStatus<br>showTooltip → pendingCount &gt; 0 |
| UI-c6f7d81a22fa<br>[components/sync/SyncStatus.tsx:166:34](../../components/sync/SyncStatus.tsx#L166) | ${pendingCount} 個事件 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SyncStatus<br>showTooltip → pendingCount &gt; 0 |
| UI-92c7204c264e<br>[components/sync/SyncStatus.tsx:175:19](../../components/sync/SyncStatus.tsx#L175) | ⚠️ ${error} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SyncStatus<br>showTooltip → error |
| UI-f84035c8f333<br>[components/sync/SyncStatus.tsx:191:17](../../components/sync/SyncStatus.tsx#L191) | 立即同步 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | SyncStatus<br>showTooltip → status !== SyncStatusEnum.SYNCING |

## hooks/useSync.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-8d2399f35387<br>[hooks/useSync.ts:163:16](../../hooks/useSync.ts#L163) | 同步因權限錯誤暫停，稍後會自動重試 | **來源候選** · 候選，非已證實提示<br>sync 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | sync · error<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a69c4d67e4ec<br>[hooks/useSync.ts:187:25](../../hooks/useSync.ts#L187) | SYNC_CONTEXT_CHANGED | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | assertActive<br>currentIdentityRef.current !== syncIdentity &#124;&#124; getActiveSyncIdentity() !== syncIdentity &#124;&#124; getLifecyclePort().getCurrentState() !== 'active' |
| UI-91848bf5f82a<br>[hooks/useSync.ts:198:62](../../hooks/useSync.ts#L198) | 正在確認同步資料 | **來源候選** · 候選，非已證實提示<br>sync 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | sync · currentItem<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-72816512b9ba<br>[hooks/useSync.ts:248:18](../../hooks/useSync.ts#L248) | 網路連線失敗 | **來源候選** · 候選，非已證實提示<br>sync 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | sync · error<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e874a8ffa6a9<br>[hooks/useSync.ts:265:20](../../hooks/useSync.ts#L265) | 同步因權限錯誤暫停，稍後會自動重試 | **來源候選** · 候選，非已證實提示<br>sync 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | sync · error<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1831d3b01bd9<br>[hooks/useSync.ts:284:16](../../hooks/useSync.ts#L284) | 同步失敗，請稍後重試 | **來源候選** · 候選，非已證實提示<br>sync 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | sync · error<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/db/clear-user-data.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-af821fc4b802<br>[lib/db/clear-user-data.ts:446:23](../../lib/db/clear-user-data.ts#L446) | 發現 ${foreignMarkets.length} 個其他用戶的市集 | **來源候選** · 候選，非已證實提示<br>validateDataIsolation 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validateDataIsolation<br>foreignMarkets.length &gt; 0 |
| UI-642d034eea9d<br>[lib/db/clear-user-data.ts:455:23](../../lib/db/clear-user-data.ts#L455) | 發現 ${foreignProducts.length} 個其他用戶的商品 | **來源候選** · 候選，非已證實提示<br>validateDataIsolation 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validateDataIsolation<br>foreignProducts.length &gt; 0 |
| UI-d129ff296f4b<br>[lib/db/clear-user-data.ts:464:23](../../lib/db/clear-user-data.ts#L464) | 發現 ${foreignEvents.length} 個其他用戶的事件 | **來源候選** · 候選，非已證實提示<br>validateDataIsolation 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validateDataIsolation<br>foreignEvents.length &gt; 0 |
| UI-c44a4b945dc2<br>[lib/db/clear-user-data.ts:475:20](../../lib/db/clear-user-data.ts#L475) | 驗證過程發生錯誤 | **來源候選** · 候選，非已證實提示<br>validateDataIsolation 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validateDataIsolation · violations<br>catch：操作拋出例外 |

## lib/db/data-canonicalization.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-04d8454cc2e7<br>[lib/db/data-canonicalization.ts:252:66](../../lib/db/data-canonicalization.ts#L252) | 建立本機備份中 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | runLocalDataCanonicalization · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a9530183da00<br>[lib/db/data-canonicalization.ts:254:66](../../lib/db/data-canonicalization.ts#L254) | 本機備份已建立 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | runLocalDataCanonicalization · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c80463a57146<br>[lib/db/data-canonicalization.ts:275:18](../../lib/db/data-canonicalization.ts#L275) | 整理事件 ${processedEvents}/${events.length} | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | runLocalDataCanonicalization · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1c9909091050<br>[lib/db/data-canonicalization.ts:305:18](../../lib/db/data-canonicalization.ts#L305) | 整理統計 ${processedStats}/${stats.length} | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | runLocalDataCanonicalization · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9c4dbbed5957<br>[lib/db/data-canonicalization.ts:310:69](../../lib/db/data-canonicalization.ts#L310) | 檢查整理後資料 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | runLocalDataCanonicalization · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-79bf760eb149<br>[lib/db/data-canonicalization.ts:313:64](../../lib/db/data-canonicalization.ts#L313) | 資料格式整理完成 | **共用文案值** · 文案生產端，須查使用端<br>message：供畫面或訊息組裝使用的標籤／說明值 | runLocalDataCanonicalization · message<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/db/events.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-10ba30432954<br>[lib/db/events.ts:124:21](../../lib/db/events.ts#L124) | Invalid ${type} payload: expected an object | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertRecord<br>!payload &#124;&#124; typeof payload !== 'object' &#124;&#124; Array.isArray(payload) |
| UI-6eb24bee4c98<br>[lib/db/events.ts:132:21](../../lib/db/events.ts#L132) | Invalid ${type} payload: missing ${field} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertString<br>typeof value !== 'string' &#124;&#124; value.trim().length === 0 |
| UI-67f9993918e8<br>[lib/db/events.ts:138:21](../../lib/db/events.ts#L138) | Invalid ${type} payload: ${field} must be a finite number | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertNumber<br>typeof value !== 'number' &#124;&#124; !Number.isFinite(value) |
| UI-3789a7fe9c31<br>[lib/db/events.ts:144:21](../../lib/db/events.ts#L144) | Invalid ${type} payload: missing market_id | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertMarketId<br>!pickMarketId(record) |
| UI-4dee3421674e<br>[lib/db/events.ts:170:25](../../lib/db/events.ts#L170) | Invalid ${type} payload: updates must be an object | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateEventPayload<br>!record.updates &#124;&#124; typeof record.updates !== 'object' &#124;&#124; Array.isArray(record.updates) |
| UI-6d79b4779426<br>[lib/db/events.ts:185:25](../../lib/db/events.ts#L185) | Invalid ${type} payload: recurrence must be an object | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateEventPayload<br>!record.recurrence &#124;&#124; typeof record.recurrence !== 'object' &#124;&#124; Array.isArray(record.recurrence) |
| UI-2381c5db6e3d<br>[lib/db/events.ts:188:25](../../lib/db/events.ts#L188) | Invalid ${type} payload: defaults must be an object | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateEventPayload<br>!record.defaults &#124;&#124; typeof record.defaults !== 'object' &#124;&#124; Array.isArray(record.defaults) |
| UI-c04ad2789d71<br>[lib/db/events.ts:195:25](../../lib/db/events.ts#L195) | Invalid ${type} payload: updates must be an object | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateEventPayload<br>!record.updates &#124;&#124; typeof record.updates !== 'object' &#124;&#124; Array.isArray(record.updates) |
| UI-f8d2e8fb6dfa<br>[lib/db/events.ts:208:25](../../lib/db/events.ts#L208) | Invalid ${type} payload: updates must be an object | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateEventPayload<br>!record.updates &#124;&#124; typeof record.updates !== 'object' &#124;&#124; Array.isArray(record.updates) |
| UI-8d6dcfeeac96<br>[lib/db/events.ts:233:25](../../lib/db/events.ts#L233) | Invalid ${type} payload: updates must be an object | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateEventPayload<br>!record.updates &#124;&#124; typeof record.updates !== 'object' &#124;&#124; Array.isArray(record.updates) |
| UI-7cabd404f438<br>[lib/db/events.ts:256:25](../../lib/db/events.ts#L256) | Invalid ${type} payload: items must be an array | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateEventPayload<br>!Array.isArray(record.items) |
| UI-2befa7bde986<br>[lib/db/events.ts:264:27](../../lib/db/events.ts#L264) | Invalid ${type} payload: items[${index}].quantity must be greater than zero | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateEventPayload<br>(saleItem.quantity as number) &lt;= 0 |
| UI-28edab85247d<br>[lib/db/events.ts:295:25](../../lib/db/events.ts#L295) | Invalid ${type} payload: completed must be a boolean | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateEventPayload<br>record.completed !== undefined &amp;&amp; typeof record.completed !== 'boolean' |
| UI-677bee2d36aa<br>[lib/db/events.ts:304:25](../../lib/db/events.ts#L304) | Invalid ${type} payload: completed must be a boolean | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateEventPayload<br>record.completed !== undefined &amp;&amp; typeof record.completed !== 'boolean' |
| UI-48a4cd863183<br>[lib/db/events.ts:307:25](../../lib/db/events.ts#L307) | Invalid ${type} payload: text or completed is required | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateEventPayload<br>record.text === undefined &amp;&amp; record.completed === undefined |
| UI-6355a7dcb6b2<br>[lib/db/events.ts:446:67](../../lib/db/events.ts#L446) | 固定營業不設定報名繳費期限 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | recordEvent<br>type === 'market_updated' → readPaymentDeadline(updatePayload.updates) → target?.sessionOrigin === 'schedule' |
| UI-595b27cfdd73<br>[lib/db/events.ts:554:38](../../lib/db/events.ts#L554) | Venue not found: ${event.payload.venueId} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | module<br>updated !== 1 |
| UI-6eb0379e1c3c<br>[lib/db/events.ts:562:38](../../lib/db/events.ts#L562) | Venue not found: ${event.payload.venueId} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | module<br>updated !== 1 |
| UI-ecc8204810a9<br>[lib/db/events.ts:582:38](../../lib/db/events.ts#L582) | Operation schedule not found: ${event.payload.scheduleId} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | module<br>updated !== 1 |
| UI-00a7349ed238<br>[lib/db/events.ts:594:38](../../lib/db/events.ts#L594) | Operation schedule not found: ${event.payload.scheduleId} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | updateOperationScheduleStatus<br>updated !== 1 |
| UI-2896c129c4d6<br>[lib/db/events.ts:741:21](../../lib/db/events.ts#L741) | Market not found for ${event.type}: ${market_id} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | module<br>updated === 0 |
| UI-29bebe7d3c53<br>[lib/db/events.ts:763:21](../../lib/db/events.ts#L763) | Market not found for ${event.type}: ${market_id} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | module<br>updated === 0 |
| UI-4f8231393e47<br>[lib/db/events.ts:785:21](../../lib/db/events.ts#L785) | Market not found for ${event.type}: ${market_id} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | module<br>updated === 0 |
| UI-e9a650887497<br>[lib/db/events.ts:810:21](../../lib/db/events.ts#L810) | Market not found for ${event.type}: ${marketId} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | module<br>updated === 0 |
| UI-a8b9ce971639<br>[lib/db/events.ts:862:21](../../lib/db/events.ts#L862) | Product not found for ${event.type}: ${productId} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | module<br>updated === 0 |
| UI-e122bc6dac1b<br>[lib/db/events.ts:1037:15](../../lib/db/events.ts#L1037) | ${product.name} 庫存不足！目前庫存：${currentStock}，需要：${item.quantity} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | module<br>否則 isManualEntry → product → !isBackfill &amp;&amp; !product.unlimitedStock → currentStock &lt; item.quantity |
| UI-bbcdf12e1dc6<br>[lib/db/events.ts:1112:36](../../lib/db/events.ts#L1112) | 簡化補登 | **來源候選** · 候選，非已證實提示<br>modeText 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | modeText<br>isManualEntry |
| UI-9b83ae986212<br>[lib/db/events.ts:1112:58](../../lib/db/events.ts#L1112) | 完整補登 | **來源候選** · 候選，非已證實提示<br>modeText 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | modeText<br>否則 isManualEntry → isBackfill |
| UI-0e46ee59867d<br>[lib/db/events.ts:1112:67](../../lib/db/events.ts#L1112) | 正常交易 | **來源候選** · 候選，非已證實提示<br>modeText 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | modeText<br>否則 isManualEntry → 否則 isBackfill |
| UI-147ef3cfd9ed<br>[lib/db/events.ts:1191:21](../../lib/db/events.ts#L1191) | deal_deleted is missing market_id: ${event.id ?? eventId} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | module<br>!market_id |
| UI-da2b015a7889<br>[lib/db/events.ts:1412:23](../../lib/db/events.ts#L1412) | Snapshot rebuild produced inconsistent data:\n${integrity.errors.join('\n')} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | rebuildSnapshots<br>!integrity.ok |

## lib/db/hooks.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-eda628c87536<br>[lib/db/hooks.ts:84:48](../../lib/db/hooks.ts#L84) | 市集資料暫時無法讀取 | **來源候選** · 候選，非已證實提示<br>result 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | result · error<br>catch：操作拋出例外 |
| UI-3c0116ba9cb2<br>[lib/db/hooks.ts:189:21](../../lib/db/hooks.ts#L189) | 市集不存在：ID ${marketId.substring(0, 8)}... | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | updateMarketStatus<br>!market |
| UI-31279c97a25b<br>[lib/db/hooks.ts:390:25](../../lib/db/hooks.ts#L390) | 商品不存在：ID ${item.productId} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | recordDeal<br>data.items &amp;&amp; data.items.length &gt; 0 → !product |
| UI-1fa23559b640<br>[lib/db/hooks.ts:401:15](../../lib/db/hooks.ts#L401) | ${product.name} 庫存不足！\n目前庫存：${currentStock}，需要：${item.quantity} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | recordDeal<br>data.items &amp;&amp; data.items.length &gt; 0 → !isBackfill &amp;&amp; !isManualEntry → !product.unlimitedStock → currentStock &lt; item.quantity |

## lib/db/import-recovery-classifier.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-ebfb9127af16<br>[lib/db/import-recovery-classifier.ts:50:23](../../lib/db/import-recovery-classifier.ts#L50) | Successful import outcome can only be classified from the completed phase. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | classifyImportOutcome<br>input.ok → input.phase !== 'completed' |
| UI-5f0f465d8dd8<br>[lib/db/import-recovery-classifier.ts:73:21](../../lib/db/import-recovery-classifier.ts#L73) | Failed import outcome must identify the failed phase. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | classifyImportOutcome<br>input.phase === 'completed' |

## lib/db/import-safety-status.ts

僅由測試／工具頁靜態引用

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-bbd1a5caf0da<br>[lib/db/import-safety-status.ts:38:14](../../lib/db/import-safety-status.ts#L38) | Import safety status is only available in the browser. | **來源候選** · 候選，非已證實提示<br>getImportSafetyStatus 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getImportSafetyStatus · error<br>typeof window === 'undefined' |
| UI-0b5860503dfa<br>[lib/db/import-safety-status.ts:63:16](../../lib/db/import-safety-status.ts#L63) | Emergency backup metadata is invalid. | **來源候選** · 候選，非已證實提示<br>getImportSafetyStatus 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getImportSafetyStatus · error<br>!isMetadata(parsedMetadata) |

## lib/db/index.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-5917e8bf570a<br>[lib/db/index.ts:333:41](../../lib/db/index.ts#L333) | 資料庫初始化超時 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | timeoutPromise<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ef22ada6e471<br>[lib/db/index.ts:370:58](../../lib/db/index.ts#L370) | 超時 | **來源候選** · 候選，非已證實提示<br>initializeDatabase 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | initializeDatabase<br>catch：操作拋出例外 → error instanceof Error |
| UI-4a492e3507b5<br>[lib/db/index.ts:485:23](../../lib/db/index.ts#L485) | Database did not open after initialization | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | initializeDatabaseSafely<br>!db.isOpen() |
| UI-77640637b2b3<br>[lib/db/index.ts:492:26](../../lib/db/index.ts#L492) | Database integrity check failed:\n${integrity.errors.join('\n')} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | initializeDatabaseSafely · error<br>!integrity.ok |
| UI-ed7a910d295d<br>[lib/db/index.ts:545:21](../../lib/db/index.ts#L545) | 無法建立匯入前緊急備份，已取消匯入以保護現有資料 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | createEmergencyBackupBeforeImport<br>catch：操作拋出例外 |
| UI-9d04acd71c5c<br>[lib/db/index.ts:556:21](../../lib/db/index.ts#L556) | 備份資料完整性檢查失敗：\n${preImportCheck.errors.join('\n')} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | runPreImportIntegrityCheck<br>!preImportCheck.ok |
| UI-fb9ee932029a<br>[lib/db/index.ts:566:21](../../lib/db/index.ts#L566) | Backup events are not safe to replay before import:\n${replayReadiness.errors.join('\n')} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | runReplayReadinessCheck<br>!replayReadiness.ok |
| UI-21c5b017568a<br>[lib/db/index.ts:618:21](../../lib/db/index.ts#L618) | 匯入後資料完整性檢查失敗：\n${postImportCheck.errors.join('\n')} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | runPostImportIntegrityCheck<br>!postImportCheck.ok |

## lib/db/integrity.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-fb18618b6647<br>[lib/db/integrity.ts:483:19](../../lib/db/integrity.ts#L483) | Backup has snapshots but no events; snapshots cannot be independently replayed | **來源候選** · 候選，非已證實提示<br>validateBackupReplayReadiness 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validateBackupReplayReadiness<br>data.events.length === 0 &amp;&amp; (data.markets.length &gt; 0 &#124;&#124; data.products.length &gt; 0 &#124;&#124; data.dailyStats.length &gt; 0) |
| UI-5cde1717a1f3<br>[lib/db/integrity.ts:499:21](../../lib/db/integrity.ts#L499) | 備份檔不是有效的 JSON | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | parseBackupData<br>catch：操作拋出例外 |
| UI-0277c8afe747<br>[lib/db/integrity.ts:503:21](../../lib/db/integrity.ts#L503) | 備份資料格式錯誤：根節點必須是物件 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | parseBackupData<br>!isRecord(parsed) |
| UI-a8cd91f1c142<br>[lib/db/integrity.ts:516:21](../../lib/db/integrity.ts#L516) | 備份資料缺少有效版本 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | parseBackupData<br>!isNumber(data.version) |
| UI-484d0a3a6005<br>[lib/db/integrity.ts:520:21](../../lib/db/integrity.ts#L520) | 不支援的備份版本：${data.version} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | parseBackupData<br>!SUPPORTED_BACKUP_VERSIONS.has(data.version) |
| UI-cf07df507dd3<br>[lib/db/integrity.ts:524:21](../../lib/db/integrity.ts#L524) | 備份資料缺少有效匯出時間 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | parseBackupData<br>!isNumber(data.exportedAt) |
| UI-6dbebbdfb6d2<br>[lib/db/integrity.ts:529:23](../../lib/db/integrity.ts#L529) | 備份資料缺少有效陣列欄位：${key} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | parseBackupData<br>!Array.isArray(data[key]) |
| UI-27cd4cb8f34f<br>[lib/db/integrity.ts:535:23](../../lib/db/integrity.ts#L535) | 備份資料缺少有效陣列欄位：venues | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | parseBackupData<br>data.version === 2 → !Array.isArray(data.venues) |
| UI-3bfae77824c2<br>[lib/db/integrity.ts:538:23](../../lib/db/integrity.ts#L538) | 備份資料缺少有效陣列欄位：operationSchedules | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | parseBackupData<br>data.version === 2 → !Array.isArray(data.operationSchedules) |
| UI-56c9ab014594<br>[lib/db/integrity.ts:703:50](../../lib/db/integrity.ts#L703) | events[${index}] 缺少有效 id | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNonEmptyString(event.id) |
| UI-367732bc5359<br>[lib/db/integrity.ts:704:51](../../lib/db/integrity.ts#L704) | events[${index}] 事件類型不支援：${String(event.type)} | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!EVENT_TYPES.has(event.type) |
| UI-ab5981b79c95<br>[lib/db/integrity.ts:705:49](../../lib/db/integrity.ts#L705) | events[${index}] 缺少有效 timestamp | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(event.timestamp) |
| UI-a8164a68cf65<br>[lib/db/integrity.ts:706:47](../../lib/db/integrity.ts#L706) | events[${index}] payload 必須是物件 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isRecord(event.payload) |
| UI-30bb7ce66a18<br>[lib/db/integrity.ts:709:19](../../lib/db/integrity.ts#L709) | events[${index}] 指向不存在的 market_id：${event.market_id} | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>event.market_id &amp;&amp; !marketIds.has(event.market_id) |
| UI-3c005b61dc29<br>[lib/db/integrity.ts:726:51](../../lib/db/integrity.ts#L726) | markets[${index}] 缺少有效 id | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNonEmptyString(market.id) |
| UI-6125fddaab0e<br>[lib/db/integrity.ts:727:53](../../lib/db/integrity.ts#L727) | markets[${index}] 缺少有效 name | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNonEmptyString(market.name) |
| UI-662c97868219<br>[lib/db/integrity.ts:728:57](../../lib/db/integrity.ts#L728) | markets[${index}] 缺少有效 location | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNonEmptyString(market.location) |
| UI-851b51fbf802<br>[lib/db/integrity.ts:729:59](../../lib/db/integrity.ts#L729) | markets[${index}] startDate 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isValidDateString(market.startDate) |
| UI-038c333f6f0e<br>[lib/db/integrity.ts:730:57](../../lib/db/integrity.ts#L730) | markets[${index}] endDate 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isValidDateString(market.endDate) |
| UI-c4fe9ebee446<br>[lib/db/integrity.ts:731:71](../../lib/db/integrity.ts#L731) | markets[${index}] registrationFee 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isLegacyMarketCostValue(market.registrationFee) |
| UI-f5c10e844a9c<br>[lib/db/integrity.ts:732:65](../../lib/db/integrity.ts#L732) | markets[${index}] boothCost 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isLegacyMarketCostValue(market.boothCost) |
| UI-ea7b2297c5b5<br>[lib/db/integrity.ts:733:50](../../lib/db/integrity.ts#L733) | markets[${index}] createdAt 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(market.createdAt) |
| UI-2bb805fcca66<br>[lib/db/integrity.ts:734:50](../../lib/db/integrity.ts#L734) | markets[${index}] updatedAt 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(market.updatedAt) |
| UI-a9a8d9cc0811<br>[lib/db/integrity.ts:737:19](../../lib/db/integrity.ts#L737) | markets[${index}] dates 必須是陣列 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>market.dates &amp;&amp; !Array.isArray(market.dates) |
| UI-9c0f9c52d42b<br>[lib/db/integrity.ts:739:19](../../lib/db/integrity.ts#L739) | markets[${index}] dates 包含無效日期 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>否則 market.dates &amp;&amp; !Array.isArray(market.dates) → market.dates?.some(date =&gt; !isValidDateString(date)) |
| UI-4494691f3d86<br>[lib/db/integrity.ts:742:19](../../lib/db/integrity.ts#L742) | markets[${index}] 指向不存在的 venueId：${market.venueId} | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>market.venueId &amp;&amp; !venueIds.has(market.venueId) |
| UI-e77ee7e25945<br>[lib/db/integrity.ts:745:19](../../lib/db/integrity.ts#L745) | markets[${index}] 指向不存在的 scheduleId：${market.scheduleId} | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>market.scheduleId &amp;&amp; !scheduleIds.has(market.scheduleId) |
| UI-0dbb9a559ab3<br>[lib/db/integrity.ts:763:50](../../lib/db/integrity.ts#L763) | venues[${index}] 缺少有效 id | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNonEmptyString(venue.id) |
| UI-f769634ce2b1<br>[lib/db/integrity.ts:764:56](../../lib/db/integrity.ts#L764) | venues[${index}] 缺少有效 owner_id | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNonEmptyString(venue.owner_id) |
| UI-599b600bf520<br>[lib/db/integrity.ts:765:52](../../lib/db/integrity.ts#L765) | venues[${index}] 缺少有效 name | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNonEmptyString(venue.name) |
| UI-9a485345f654<br>[lib/db/integrity.ts:766:69](../../lib/db/integrity.ts#L766) | venues[${index}] status 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!['active', 'archived'].includes(venue.status) |
| UI-c63cd9db765d<br>[lib/db/integrity.ts:767:49](../../lib/db/integrity.ts#L767) | venues[${index}] createdAt 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(venue.createdAt) |
| UI-2978f9556e7e<br>[lib/db/integrity.ts:768:49](../../lib/db/integrity.ts#L768) | venues[${index}] updatedAt 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(venue.updatedAt) |
| UI-3067833cf03d<br>[lib/db/integrity.ts:772:53](../../lib/db/integrity.ts#L772) | operationSchedules[${index}] 缺少有效 id | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNonEmptyString(schedule.id) |
| UI-e04d03a1fdd6<br>[lib/db/integrity.ts:773:59](../../lib/db/integrity.ts#L773) | operationSchedules[${index}] 缺少有效 owner_id | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNonEmptyString(schedule.owner_id) |
| UI-4b936ae5e704<br>[lib/db/integrity.ts:775:19](../../lib/db/integrity.ts#L775) | operationSchedules[${index}] 指向不存在的 venueId：${String(schedule.venueId)} | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNonEmptyString(schedule.venueId) &#124;&#124; !venueIds.has(schedule.venueId) |
| UI-52f271ffcf87<br>[lib/db/integrity.ts:777:59](../../lib/db/integrity.ts#L777) | operationSchedules[${index}] timezone 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNonEmptyString(schedule.timezone) |
| UI-198c3cdcc589<br>[lib/db/integrity.ts:779:19](../../lib/db/integrity.ts#L779) | operationSchedules[${index}] status 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!['active', 'paused', 'archived'].includes(schedule.status) |
| UI-d7057c41a2ad<br>[lib/db/integrity.ts:782:19](../../lib/db/integrity.ts#L782) | operationSchedules[${index}] revision 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(schedule.revision) &#124;&#124; schedule.revision &lt; 1 |
| UI-ee8953fd2acb<br>[lib/db/integrity.ts:785:19](../../lib/db/integrity.ts#L785) | operationSchedules[${index}] recurrence 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>schedule.recurrence?.frequency !== 'weekly' &#124;&#124; schedule.recurrence?.interval !== 1 |
| UI-a2e90441b887<br>[lib/db/integrity.ts:788:21](../../lib/db/integrity.ts#L788) | operationSchedules[${index}] recurrence.startDate 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>否則 schedule.recurrence?.frequency !== 'weekly' &#124;&#124; schedule.recurrence?.interval !== 1 → !isValidDateString(schedule.recurrence.startDate) |
| UI-f469a455c9da<br>[lib/db/integrity.ts:791:21](../../lib/db/integrity.ts#L791) | operationSchedules[${index}] recurrence.endDate 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>否則 schedule.recurrence?.frequency !== 'weekly' &#124;&#124; schedule.recurrence?.interval !== 1 → schedule.recurrence.endDate &amp;&amp; !isValidDateString(schedule.recurrence.endDate) |
| UI-f7944c46f9a0<br>[lib/db/integrity.ts:794:21](../../lib/db/integrity.ts#L794) | operationSchedules[${index}] recurrence.weekdays 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>否則 schedule.recurrence?.frequency !== 'weekly' &#124;&#124; schedule.recurrence?.interval !== 1 → !Array.isArray(schedule.recurrence.weekdays) &#124;&#124; schedule.recurrence.weekdays.some(day =&gt; !Number.isInteger(day) &#124;&#124; day &lt; 0 &#124;&#124; day &gt; 6) |
| UI-d4efa1aff59e<br>[lib/db/integrity.ts:798:19](../../lib/db/integrity.ts#L798) | operationSchedules[${index}] time 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!/^\d{2}:\d{2}$/.test(schedule.startTime) &#124;&#124; !/^\d{2}:\d{2}$/.test(schedule.endTime) |
| UI-67f189c755c5<br>[lib/db/integrity.ts:800:52](../../lib/db/integrity.ts#L800) | operationSchedules[${index}] createdAt 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(schedule.createdAt) |
| UI-bea23c17de37<br>[lib/db/integrity.ts:801:52](../../lib/db/integrity.ts#L801) | operationSchedules[${index}] updatedAt 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(schedule.updatedAt) |
| UI-0cda77005587<br>[lib/db/integrity.ts:805:52](../../lib/db/integrity.ts#L805) | products[${index}] 缺少有效 id | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNonEmptyString(product.id) |
| UI-103ffd7ad22a<br>[lib/db/integrity.ts:806:54](../../lib/db/integrity.ts#L806) | products[${index}] 缺少有效 name | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNonEmptyString(product.name) |
| UI-091cb8af648c<br>[lib/db/integrity.ts:807:47](../../lib/db/integrity.ts#L807) | products[${index}] price 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(product.price) |
| UI-8fbc1d010f44<br>[lib/db/integrity.ts:808:76](../../lib/db/integrity.ts#L808) | products[${index}] cost 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>product.cost !== undefined &amp;&amp; !isNumber(product.cost) |
| UI-117ab9a0f19b<br>[lib/db/integrity.ts:810:19](../../lib/db/integrity.ts#L810) | products[${index}] stock 無效或為負數 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>product.stock !== undefined &amp;&amp; (!isNumber(product.stock) &#124;&#124; product.stock &lt; 0) |
| UI-22b399ec0de3<br>[lib/db/integrity.ts:813:19](../../lib/db/integrity.ts#L813) | products[${index}] 指向不存在的 market_id：${product.market_id} | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>product.market_id &amp;&amp; !marketIds.has(product.market_id) |
| UI-4f33a15fc52a<br>[lib/db/integrity.ts:815:51](../../lib/db/integrity.ts#L815) | products[${index}] createdAt 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(product.createdAt) |
| UI-94a2fae0a395<br>[lib/db/integrity.ts:816:51](../../lib/db/integrity.ts#L816) | products[${index}] updatedAt 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(product.updatedAt) |
| UI-900a237c5970<br>[lib/db/integrity.ts:820:52](../../lib/db/integrity.ts#L820) | dailyStats[${index}] date 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isValidDateString(stat.date) |
| UI-2d1dde52274d<br>[lib/db/integrity.ts:822:19](../../lib/db/integrity.ts#L822) | dailyStats[${index}] 指向不存在的 marketId：${stat.marketId} | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>stat.marketId &amp;&amp; !marketIds.has(stat.marketId) |
| UI-241dad2a7100<br>[lib/db/integrity.ts:824:72](../../lib/db/integrity.ts#L824) | dailyStats[${index}] touchCount 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(stat.touchCount) &#124;&#124; stat.touchCount &lt; 0 |
| UI-c29781a21d62<br>[lib/db/integrity.ts:825:76](../../lib/db/integrity.ts#L825) | dailyStats[${index}] inquiryCount 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(stat.inquiryCount) &#124;&#124; stat.inquiryCount &lt; 0 |
| UI-39c4e88094d5<br>[lib/db/integrity.ts:826:70](../../lib/db/integrity.ts#L826) | dailyStats[${index}] dealCount 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(stat.dealCount) &#124;&#124; stat.dealCount &lt; 0 |
| UI-10b39e649205<br>[lib/db/integrity.ts:827:66](../../lib/db/integrity.ts#L827) | dailyStats[${index}] revenue 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(stat.revenue) &#124;&#124; stat.revenue &lt; 0 |
| UI-e233878d811f<br>[lib/db/integrity.ts:828:89](../../lib/db/integrity.ts#L828) | dailyStats[${index}] cost 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>stat.cost !== undefined &amp;&amp; (!isNumber(stat.cost) &#124;&#124; stat.cost &lt; 0) |
| UI-fa1ccb63e339<br>[lib/db/integrity.ts:829:74](../../lib/db/integrity.ts#L829) | dailyStats[${index}] profit 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>stat.profit !== undefined &amp;&amp; !isNumber(stat.profit) |
| UI-1be2ca2a685e<br>[lib/db/integrity.ts:831:19](../../lib/db/integrity.ts#L831) | dailyStats[${index}] productsSold 必須是陣列 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!Array.isArray(stat.productsSold) |
| UI-838f2e8417ce<br>[lib/db/integrity.ts:835:25](../../lib/db/integrity.ts#L835) | dailyStats[${index}].productsSold[${soldIndex}] 指向不存在的 productId：${soldItem.productId} | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!productIds.has(soldItem.productId) |
| UI-4a2088565004<br>[lib/db/integrity.ts:838:23](../../lib/db/integrity.ts#L838) | dailyStats[${index}].productsSold[${soldIndex}] quantity 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(soldItem.quantity) &#124;&#124; soldItem.quantity &lt; 0 |
| UI-0afca44268b0<br>[lib/db/integrity.ts:841:23](../../lib/db/integrity.ts#L841) | dailyStats[${index}].productsSold[${soldIndex}] revenue 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(soldItem.revenue) &#124;&#124; soldItem.revenue &lt; 0 |
| UI-8fbd7162e7bf<br>[lib/db/integrity.ts:845:48](../../lib/db/integrity.ts#L845) | dailyStats[${index}] updatedAt 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(stat.updatedAt) |
| UI-fa324188a4a5<br>[lib/db/integrity.ts:849:73](../../lib/db/integrity.ts#L849) | settings[${index}] theme 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!['light', 'dark', 'auto'].includes(setting.theme) |
| UI-95fcb6a88cc6<br>[lib/db/integrity.ts:850:75](../../lib/db/integrity.ts#L850) | settings[${index}] language 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!['zh-TW', 'zh-CN', 'en'].includes(setting.language) |
| UI-d43101897c6b<br>[lib/db/integrity.ts:851:65](../../lib/db/integrity.ts#L851) | settings[${index}] defaultCurrency 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNonEmptyString(setting.defaultCurrency) |
| UI-b41527da3300<br>[lib/db/integrity.ts:852:71](../../lib/db/integrity.ts#L852) | settings[${index}] enableNotifications 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>typeof setting.enableNotifications !== 'boolean' |
| UI-e43b199ad472<br>[lib/db/integrity.ts:853:62](../../lib/db/integrity.ts#L853) | settings[${index}] autoBackup 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>typeof setting.autoBackup !== 'boolean' |
| UI-fc5898462c20<br>[lib/db/integrity.ts:854:51](../../lib/db/integrity.ts#L854) | settings[${index}] updatedAt 無效 | **來源候選** · 候選，非已證實提示<br>checkBackupIntegrity 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | checkBackupIntegrity<br>!isNumber(setting.updatedAt) |

## lib/db/recovery.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-35974838e18e<br>[lib/db/recovery.ts:278:17](../../lib/db/recovery.ts#L278) | 已刪除商品 | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | placeholder · name<br>!existing |

## lib/db/snapshot.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-23e13af0f36e<br>[lib/db/snapshot.ts:117:23](../../lib/db/snapshot.ts#L117) | 沒有事件記錄，無法創建快照 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | createSnapshot<br>!lastEvent |

## lib/supabase/migration.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-e9793f481969<br>[lib/supabase/migration.ts:162:23](../../lib/supabase/migration.ts#L162) | No cloud events were found. Local data was kept unchanged. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | clearLocalDataAndPullFromCloud<br>events.length === 0 |

## lib/sync-context.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-2805cb10ebcc<br>[lib/sync-context.tsx:66:8](../../lib/sync-context.tsx#L66) | ${children} | **動態文字入口** · 執行時綁定入口<br>SyncContext.Provider 接收執行時文字；內容需追查所列綁定與生產端 | SyncProvider<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2ac6bcac847c<br>[lib/sync-context.tsx:74:21](../../lib/sync-context.tsx#L74) | useSyncContext must be used within SyncProvider | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | useSyncContext<br>!context |

## lib/sync/event-sync-service.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-3ba4e9059fb9<br>[lib/sync/event-sync-service.ts:27:21](../../lib/sync/event-sync-service.ts#L27) | ${name} must be a non-blank string | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertNonBlank<br>typeof value !== 'string' &#124;&#124; value.trim().length === 0 |
| UI-f510ce60a02c<br>[lib/sync/event-sync-service.ts:41:21](../../lib/sync/event-sync-service.ts#L41) | Event not found: ${eventId} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | bindEventActor<br>!existing |
| UI-915e3a842923<br>[lib/sync/event-sync-service.ts:56:21](../../lib/sync/event-sync-service.ts#L56) | Event not found: ${eventId} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | markEventSynced<br>!existing |
| UI-2cadddec9575<br>[lib/sync/event-sync-service.ts:71:21](../../lib/sync/event-sync-service.ts#L71) | Event not found: ${eventId} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | markEventLocalOnly<br>!existing |
| UI-6878b15a35bc<br>[lib/sync/event-sync-service.ts:92:21](../../lib/sync/event-sync-service.ts#L92) | Event not found: ${eventId} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | markEventBlocked<br>!existing |

## lib/sync/initial-sync-presentation.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-15f5375903d0<br>[lib/sync/initial-sync-presentation.ts:27:24](../../lib/sync/initial-sync-presentation.ts#L27) | 本次紀錄同步完成 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getInitialSyncPresentation · title<br>succeeded |
| UI-68a58c1571f4<br>[lib/sync/initial-sync-presentation.ts:27:47](../../lib/sync/initial-sync-presentation.ts#L27) | 已登入，目前無法連線 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getInitialSyncPresentation · title<br>否則 succeeded → offline |
| UI-15b60a67280a<br>[lib/sync/initial-sync-presentation.ts:28:18](../../lib/sync/initial-sync-presentation.ts#L28) | 已登入，資料尚未準備完成 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getInitialSyncPresentation · title<br>否則 succeeded → 否則 offline → failed |
| UI-33c266d3b694<br>[lib/sync/initial-sync-presentation.ts:28:35](../../lib/sync/initial-sync-presentation.ts#L28) | 已登入，正在準備資料 | **共用文案值** · 文案生產端，須查使用端<br>title：供畫面或訊息組裝使用的標籤／說明值 | getInitialSyncPresentation · title<br>否則 succeeded → 否則 offline → 否則 failed |
| UI-93bd4d346f10<br>[lib/sync/initial-sync-presentation.ts:29:30](../../lib/sync/initial-sync-presentation.ts#L29) | 即將開啟應用程式。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getInitialSyncPresentation · description<br>succeeded |
| UI-9e0ea86759d2<br>[lib/sync/initial-sync-presentation.ts:30:19](../../lib/sync/initial-sync-presentation.ts#L30) | 無法讀取最新雲端資料，請恢復連線後重新載入。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getInitialSyncPresentation · description<br>否則 succeeded → offline |
| UI-c7d298cfe1e3<br>[lib/sync/initial-sync-presentation.ts:31:18](../../lib/sync/initial-sync-presentation.ts#L31) | 本次同步尚未完成，可重試或先查看這台裝置已有的資料。 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getInitialSyncPresentation · description<br>否則 succeeded → 否則 offline → failed |
| UI-cf9fa0069aca<br>[lib/sync/initial-sync-presentation.ts:32:34](../../lib/sync/initial-sync-presentation.ts#L32) | 正在確認並整理雲端紀錄… | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | getInitialSyncPresentation · description<br>否則 succeeded → 否則 offline → 否則 failed |
| UI-69ef69f24ffd<br>[lib/sync/initial-sync-presentation.ts:33:50](../../lib/sync/initial-sync-presentation.ts#L33) | 本機已有的資料仍保留；尚未送達雲端的內容不代表已完成同步。 | **共用文案值** · 文案生產端，須查使用端<br>hint：供畫面或訊息組裝使用的標籤／說明值 | getInitialSyncPresentation · hint<br>否則 succeeded → failed &#124;&#124; offline |
| UI-6e54cbc73ca5<br>[lib/sync/initial-sync-presentation.ts:34:32](../../lib/sync/initial-sync-presentation.ts#L34) | 仍在處理中，可先查看本機資料；資料可能尚未完整。 | **共用文案值** · 文案生產端，須查使用端<br>hint：供畫面或訊息組裝使用的標籤／說明值 | getInitialSyncPresentation · hint<br>否則 succeeded → 否則 failed &#124;&#124; offline → input.isTakingLonger |
| UI-9d5c0a1c495c<br>[lib/sync/initial-sync-presentation.ts:35:9](../../lib/sync/initial-sync-presentation.ts#L35) | 完成後會自動開啟，請保持此頁開啟。 | **共用文案值** · 文案生產端，須查使用端<br>hint：供畫面或訊息組裝使用的標籤／說明值 | getInitialSyncPresentation · hint<br>否則 succeeded → 否則 failed &#124;&#124; offline → 否則 input.isTakingLonger |

## lib/sync/local-projection-repair.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-fc4748507b4e<br>[lib/sync/local-projection-repair.ts:536:64](../../lib/sync/local-projection-repair.ts#L536) | blank_market_id | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | repairLocalMarketProjections · reason<br>!nonBlankString(marketId) |
| UI-776c9c607902<br>[lib/sync/local-projection-repair.ts:542:40](../../lib/sync/local-projection-repair.ts#L542) | local_market_not_found | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | repairLocalMarketProjections · reason<br>!market |
| UI-9552774648e4<br>[lib/sync/local-projection-repair.ts:548:40](../../lib/sync/local-projection-repair.ts#L548) | no_deal_events | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | repairLocalMarketProjections · reason<br>!plan |
| UI-f671c59ecb22<br>[lib/sync/local-projection-repair.ts:555:40](../../lib/sync/local-projection-repair.ts#L555) | already_consistent | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | repairLocalMarketProjections · reason<br>projectionsAreEqual(before, after) |
| UI-9562d23d01d8<br>[lib/sync/local-projection-repair.ts:561:42](../../lib/sync/local-projection-repair.ts#L561) | projection_lower_than_events | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | repairLocalMarketProjections · reason<br>!projectionIsInflated(before, after) → projectionIsLowerThanEvents(before, after) |
| UI-45953d0727e6<br>[lib/sync/local-projection-repair.ts:563:42](../../lib/sync/local-projection-repair.ts#L563) | already_consistent | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | repairLocalMarketProjections · reason<br>!projectionIsInflated(before, after) → 否則 projectionIsLowerThanEvents(before, after) |
| UI-142e858fba38<br>[lib/sync/local-projection-repair.ts:569:40](../../lib/sync/local-projection-repair.ts#L569) | local_events_incomplete | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | repairLocalMarketProjections · reason<br>projectionMayUseIncompleteLocalEvents(before, after) |

## lib/sync/owner-event-replay.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-f1d437d763f2<br>[lib/sync/owner-event-replay.ts:17:36](../../lib/sync/owner-event-replay.ts#L17) | Cloud event is missing its ID | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | visit<br>!event.id |
| UI-14be44d4731c<br>[lib/sync/owner-event-replay.ts:19:49](../../lib/sync/owner-event-replay.ts#L19) | Cyclic cloud event dependency | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | visit<br>visiting.has(event.id) |
| UI-8dcde13d8911<br>[lib/sync/owner-event-replay.ts:35:25](../../lib/sync/owner-event-replay.ts#L35) | Deletion source is missing or belongs to another market | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | visit<br>event.type === 'deal_deleted' &#124;&#124; event.type === 'interaction_deleted' → !original &#124;&#124; original.type !== expected &#124;&#124; !getEventMarketId(event) &#124;&#124; getEventMarketId(original) !== getEventMarketId(event) |
| UI-b0362c244ea9<br>[lib/sync/owner-event-replay.ts:71:39](../../lib/sync/owner-event-replay.ts#L71) | Unsupported cloud event type: ${event.type} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | replayOwnerEvents<br>!handler |

## lib/sync/owner-pending-operation-diagnostics.ts

僅由測試／工具頁靜態引用

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-7396571cbe6d<br>[lib/sync/owner-pending-operation-diagnostics.ts:57:21](../../lib/sync/owner-pending-operation-diagnostics.ts#L57) | ownerId is required | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | listOwnerPendingOperationDiagnostics<br>!ownerId |
| UI-2a66528a6a88<br>[lib/sync/owner-pending-operation-diagnostics.ts:69:38](../../lib/sync/owner-pending-operation-diagnostics.ts#L69) | Failed to load pending operation diagnostics | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | listOwnerPendingOperationDiagnostics<br>error |
| UI-ff4519dedace<br>[lib/sync/owner-pending-operation-diagnostics.ts:81:21](../../lib/sync/owner-pending-operation-diagnostics.ts#L81) | operationId is required | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | recoverStaleProcessingPendingOperation<br>!operationId |
| UI-44aedb3fa37c<br>[lib/sync/owner-pending-operation-diagnostics.ts:85:21](../../lib/sync/owner-pending-operation-diagnostics.ts#L85) | Supabase is not configured | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | recoverStaleProcessingPendingOperation<br>!isSupabaseConfigured() |
| UI-2701a4fae767<br>[lib/sync/owner-pending-operation-diagnostics.ts:93:38](../../lib/sync/owner-pending-operation-diagnostics.ts#L93) | Failed to recover stale processing operation | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | recoverStaleProcessingPendingOperation<br>error |
| UI-4adf59a51b89<br>[lib/sync/owner-pending-operation-diagnostics.ts:116:21](../../lib/sync/owner-pending-operation-diagnostics.ts#L116) | Supabase is not configured | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | retryDrainOwnerChecklistTogglePendingOperation<br>!isSupabaseConfigured() |
| UI-3b4bad3abe46<br>[lib/sync/owner-pending-operation-diagnostics.ts:124:38](../../lib/sync/owner-pending-operation-diagnostics.ts#L124) | Failed to retry pending operation drain | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | retryDrainOwnerChecklistTogglePendingOperation<br>error |
| UI-893fe353137e<br>[lib/sync/owner-pending-operation-diagnostics.ts:136:21](../../lib/sync/owner-pending-operation-diagnostics.ts#L136) | operationId is required | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertRetryDrainAllowed<br>!operationId |
| UI-6b0c021d4933<br>[lib/sync/owner-pending-operation-diagnostics.ts:140:21](../../lib/sync/owner-pending-operation-diagnostics.ts#L140) | currentUserId is required | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertRetryDrainAllowed<br>!currentUserId |
| UI-1b4b33c1e011<br>[lib/sync/owner-pending-operation-diagnostics.ts:144:21](../../lib/sync/owner-pending-operation-diagnostics.ts#L144) | diagnosticsRow is required | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertRetryDrainAllowed<br>!diagnosticsRow |
| UI-6ba2425d2478<br>[lib/sync/owner-pending-operation-diagnostics.ts:148:21](../../lib/sync/owner-pending-operation-diagnostics.ts#L148) | diagnostics row does not match operationId | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertRetryDrainAllowed<br>diagnosticsRow.operationId !== operationId |
| UI-e3335ab2f5b6<br>[lib/sync/owner-pending-operation-diagnostics.ts:152:21](../../lib/sync/owner-pending-operation-diagnostics.ts#L152) | Only failed_retryable pending operations can be retried | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertRetryDrainAllowed<br>diagnosticsRow.status !== 'failed_retryable' |
| UI-bbbd052cd31d<br>[lib/sync/owner-pending-operation-diagnostics.ts:156:21](../../lib/sync/owner-pending-operation-diagnostics.ts#L156) | Only owner-created pending operations can be retried by this action | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertRetryDrainAllowed<br>diagnosticsRow.actorId !== currentUserId |
| UI-7fd56a758626<br>[lib/sync/owner-pending-operation-diagnostics.ts:160:21](../../lib/sync/owner-pending-operation-diagnostics.ts#L160) | Only checklist_item_toggle pending operations can be retried | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertRetryDrainAllowed<br>diagnosticsRow.operationType !== 'checklist_item_toggle' |
| UI-0415485aabdf<br>[lib/sync/owner-pending-operation-diagnostics.ts:164:21](../../lib/sync/owner-pending-operation-diagnostics.ts#L164) | Only checklist_item pending operations can be retried | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertRetryDrainAllowed<br>diagnosticsRow.entityType !== 'checklist_item' |

## lib/sync/owner-pull-service.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-4414312341d8<br>[lib/sync/owner-pull-service.ts:27:20](../../lib/sync/owner-pull-service.ts#L27) | 正在讀取市集與歷史紀錄 | **來源候選** · 候選，非已證實提示<br>pullOwnerEvents 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | pullOwnerEvents<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2b50fb00b4dc<br>[lib/sync/owner-pull-service.ts:66:20](../../lib/sync/owner-pull-service.ts#L66) | 正在補齊市集資料 | **來源候選** · 候選，非已證實提示<br>pullOwnerEvents 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | pullOwnerEvents<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7d2d0fed10dc<br>[lib/sync/owner-pull-service.ts:68:46](../../lib/sync/owner-pull-service.ts#L68) | Market hydration failed | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | pullOwnerEvents<br>hydration.failed.size |
| UI-2a44f37e236d<br>[lib/sync/owner-pull-service.ts:71:35](../../lib/sync/owner-pull-service.ts#L71) | 正在整理歷史紀錄 | **來源候選** · 候選，非已證實提示<br>pullOwnerEvents 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | pullOwnerEvents<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bbd8173cc53c<br>[lib/sync/owner-pull-service.ts:74:64](../../lib/sync/owner-pull-service.ts#L74) | 正在整理歷史紀錄 | **來源候選** · 候選，非已證實提示<br>onProgress 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | onProgress · onProgress<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sync/pending-operation-model.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-a5035214f685<br>[lib/sync/pending-operation-model.ts:93:21](../../lib/sync/pending-operation-model.ts#L93) | ${fieldName} is required | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | requireNonBlank<br>typeof value !== 'string' &#124;&#124; value.trim().length === 0 |
| UI-b1c374972929<br>[lib/sync/pending-operation-model.ts:101:21](../../lib/sync/pending-operation-model.ts#L101) | payload must be an object | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | requirePayload<br>!value &#124;&#124; typeof value !== 'object' &#124;&#124; Array.isArray(value) |
| UI-138faf4a4136<br>[lib/sync/pending-operation-model.ts:109:21](../../lib/sync/pending-operation-model.ts#L109) | roleSnapshot is required | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | requireRoleSnapshot<br>!value &#124;&#124; typeof value !== 'object' |
| UI-48b27fc65171<br>[lib/sync/pending-operation-model.ts:113:21](../../lib/sync/pending-operation-model.ts#L113) | roleSnapshot.capabilities must be an array | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | requireRoleSnapshot<br>!Array.isArray(value.capabilities) |
| UI-2d95fc88b599<br>[lib/sync/pending-operation-model.ts:239:39](../../lib/sync/pending-operation-model.ts#L239) | status_not_retryable | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifyPendingOperationWorkerCandidate · reason<br>operation.status !== 'failed_retryable' |
| UI-19a017c82595<br>[lib/sync/pending-operation-model.ts:243:39](../../lib/sync/pending-operation-model.ts#L243) | max_retry_exceeded | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifyPendingOperationWorkerCandidate · reason<br>operation.retryCount &gt;= maxRetryCount |
| UI-16e0c1d767af<br>[lib/sync/pending-operation-model.ts:247:39](../../lib/sync/pending-operation-model.ts#L247) | unsupported_operation | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifyPendingOperationWorkerCandidate · reason<br>operation.operationType !== 'checklist_item_toggle' |
| UI-f1dd0ea270d1<br>[lib/sync/pending-operation-model.ts:251:39](../../lib/sync/pending-operation-model.ts#L251) | unsupported_entity | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifyPendingOperationWorkerCandidate · reason<br>operation.entityType !== 'checklist_item' |
| UI-b872599a1a37<br>[lib/sync/pending-operation-model.ts:255:39](../../lib/sync/pending-operation-model.ts#L255) | invalid_operation_id | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | classifyPendingOperationWorkerCandidate · reason<br>!finalEventId |
| UI-3c76176800dd<br>[lib/sync/pending-operation-model.ts:258:36](../../lib/sync/pending-operation-model.ts#L258) | eligible | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | classifyPendingOperationWorkerCandidate · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sync/projection-reconciliation.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-77f32f5fa4dc<br>[lib/sync/projection-reconciliation.ts:108:51](../../lib/sync/projection-reconciliation.ts#L108) | dry_run | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | reconcileTouchedMarketProjections · reason<br>comparison.status === 'inflated' → options.dryRun |
| UI-257dc45fd77b<br>[lib/sync/projection-reconciliation.ts:121:34](../../lib/sync/projection-reconciliation.ts#L121) | ${error} | **動態文字入口** · 執行時綁定入口<br>message 接收執行時文字；內容需追查所列綁定與生產端 | reconcileTouchedMarketProjections · message<br>catch：操作拋出例外 |

## lib/sync/sync-completion.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-a9898798d8b4<br>[lib/sync/sync-completion.ts:10:31](../../lib/sync/sync-completion.ts#L10) | 部分資料尚未送達雲端，已保存在這台裝置。 | **來源候選** · 候選，非已證實提示<br>completeSyncState 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | completeSyncState · error<br>pendingCount &gt; 0 |

## lib/sync/sync-conflict-resolution-service.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-d475736164ac<br>[lib/sync/sync-conflict-resolution-service.ts:40:15](../../lib/sync/sync-conflict-resolution-service.ts#L40) | local data is newer | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolveMarketConflict · reason<br>localUpdatedAt &gt; remoteUpdatedAt |
| UI-d8d8be5860ef<br>[lib/sync/sync-conflict-resolution-service.ts:47:15](../../lib/sync/sync-conflict-resolution-service.ts#L47) | remote data is newer | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolveMarketConflict · reason<br>remoteUpdatedAt &gt; localUpdatedAt |
| UI-58ce506fdbd1<br>[lib/sync/sync-conflict-resolution-service.ts:60:15](../../lib/sync/sync-conflict-resolution-service.ts#L60) | market stats differ | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolveMarketConflict · reason<br>localRevenue !== remoteRevenue &#124;&#124; localDeals !== remoteDeals |
| UI-ddfe40291b61<br>[lib/sync/sync-conflict-resolution-service.ts:66:13](../../lib/sync/sync-conflict-resolution-service.ts#L66) | data is equivalent | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolveMarketConflict · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-db7c34a877a9<br>[lib/sync/sync-conflict-resolution-service.ts:119:15](../../lib/sync/sync-conflict-resolution-service.ts#L119) | local data is newer | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolveProductConflict · reason<br>localUpdatedAt &gt; remoteUpdatedAt |
| UI-d8b9bd289518<br>[lib/sync/sync-conflict-resolution-service.ts:126:15](../../lib/sync/sync-conflict-resolution-service.ts#L126) | remote data is newer | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolveProductConflict · reason<br>remoteUpdatedAt &gt; localUpdatedAt |
| UI-be3b83d2ded8<br>[lib/sync/sync-conflict-resolution-service.ts:139:15](../../lib/sync/sync-conflict-resolution-service.ts#L139) | product stock or sales stats differ | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolveProductConflict · reason<br>localStock !== remoteStock &#124;&#124; localSold !== remoteSold |
| UI-6a66097ed1ed<br>[lib/sync/sync-conflict-resolution-service.ts:145:13](../../lib/sync/sync-conflict-resolution-service.ts#L145) | data is equivalent | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | resolveProductConflict · reason<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sync/sync-error-policy.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-a7912da8ac61<br>[lib/sync/sync-error-policy.ts:16:19](../../lib/sync/sync-error-policy.ts#L16) | 同步暫時因權限檢查失敗而暫停；本地資料已保留，稍後會自動重試。 | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | handlePermissionSyncError<br>typeof window !== 'undefined' |
| UI-f68bb42d3ee8<br>[lib/sync/sync-error-policy.ts:33:22](../../lib/sync/sync-error-policy.ts#L33) | Failed to fetch | **來源候選** · 候選，非已證實提示<br>classifySyncFailure 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | classifySyncFailure<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/sync/sync-gate-d-flags.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-a12351584282<br>[lib/sync/sync-gate-d-flags.ts:11:32](../../lib/sync/sync-gate-d-flags.ts#L11) | D3c-2d controlled runtime verification | **來源候選** · 候選，非已證實提示<br>CONTROLLED_TEST_REASON 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | CONTROLLED_TEST_REASON<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a584603155b2<br>[lib/sync/sync-gate-d-flags.ts:54:21](../../lib/sync/sync-gate-d-flags.ts#L54) | Gate D controlled test flags cannot be enabled in production builds. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | setSyncGateDControlledTestFlags<br>process.env.NODE_ENV === 'production' |
| UI-13b2afa96f8d<br>[lib/sync/sync-gate-d-flags.ts:58:21](../../lib/sync/sync-gate-d-flags.ts#L58) | Gate D controlled test flags require the approved D3c-2d reason. | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | setSyncGateDControlledTestFlags<br>reason !== CONTROLLED_TEST_REASON |
| UI-7c556cd29807<br>[lib/sync/sync-gate-d-flags.ts:63:23](../../lib/sync/sync-gate-d-flags.ts#L63) | Unknown Gate D flag: ${flagName} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | setSyncGateDControlledTestFlags<br>!isSyncGateDFlagName(flagName) |
| UI-c40074a7ec6b<br>[lib/sync/sync-gate-d-flags.ts:67:23](../../lib/sync/sync-gate-d-flags.ts#L67) | Gate D flag cannot be changed by the controlled test harness: ${flagName} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | setSyncGateDControlledTestFlags<br>!CONTROLLED_TEST_FLAG_NAMES.has(flagName) |

## lib/sync/sync-presentation.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-e571d634a4d0<br>[lib/sync/sync-presentation.ts:37:31](../../lib/sync/sync-presentation.ts#L37) | 離線・未同步 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · label<br>!input.isOnline &#124;&#124; input.status === SyncStatus.OFFLINE |
| UI-ec341486dd5a<br>[lib/sync/sync-presentation.ts:37:58](../../lib/sync/sync-presentation.ts#L37) | 離線，${input.pendingCount} 筆紀錄待同步，查看同步狀態 | **共用文案值** · 文案生產端，須查使用端<br>accessibleLabel：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · accessibleLabel<br>!input.isOnline &#124;&#124; input.status === SyncStatus.OFFLINE |
| UI-edfb3d9c04c0<br>[lib/sync/sync-presentation.ts:40:11](../../lib/sync/sync-presentation.ts#L40) | ${input.pendingCount} 筆紀錄尚未送達雲端，只保存在這台裝置。請恢復連線後再確認同步。 | **來源候選** · 候選，非已證實提示<br>getSyncPresentation 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getSyncPresentation · detail<br>!input.isOnline &#124;&#124; input.status === SyncStatus.OFFLINE → input.pendingCount &gt; 0 |
| UI-f503ac66c9de<br>[lib/sync/sync-presentation.ts:41:11](../../lib/sync/sync-presentation.ts#L41) | 目前無法確認雲端更新，請恢復連線後再檢查。 | **來源候選** · 候選，非已證實提示<br>getSyncPresentation 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getSyncPresentation · detail<br>!input.isOnline &#124;&#124; input.status === SyncStatus.OFFLINE → 否則 input.pendingCount &gt; 0 |
| UI-f817c44afd56<br>[lib/sync/sync-presentation.ts:42:37](../../lib/sync/sync-presentation.ts#L42) | 重試連線與同步 | **共用文案值** · 文案生產端，須查使用端<br>actionLabel：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · actionLabel<br>!input.isOnline &#124;&#124; input.status === SyncStatus.OFFLINE → input.isOnline |
| UI-20d847add3fc<br>[lib/sync/sync-presentation.ts:42:49](../../lib/sync/sync-presentation.ts#L42) | 連線後再同步 | **共用文案值** · 文案生產端，須查使用端<br>actionLabel：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · actionLabel<br>!input.isOnline &#124;&#124; input.status === SyncStatus.OFFLINE → 否則 input.isOnline |
| UI-4d4907fe1206<br>[lib/sync/sync-presentation.ts:49:14](../../lib/sync/sync-presentation.ts#L49) | 同步中 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · label<br>input.status === SyncStatus.SYNCING |
| UI-799bd5b6cf81<br>[lib/sync/sync-presentation.ts:50:24](../../lib/sync/sync-presentation.ts#L50) | 紀錄同步中，${input.pendingCount} 筆待處理，查看同步狀態 | **共用文案值** · 文案生產端，須查使用端<br>accessibleLabel：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · accessibleLabel<br>input.status === SyncStatus.SYNCING |
| UI-0c678df08374<br>[lib/sync/sync-presentation.ts:54:15](../../lib/sync/sync-presentation.ts#L54) | 正在傳送本機紀錄並讀取雲端更新，完成後此處會顯示結果。 | **來源候選** · 候選，非已證實提示<br>getSyncPresentation 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getSyncPresentation · detail<br>input.status === SyncStatus.SYNCING |
| UI-991dee86afd1<br>[lib/sync/sync-presentation.ts:55:20](../../lib/sync/sync-presentation.ts#L55) | 同步進行中 | **共用文案值** · 文案生產端，須查使用端<br>actionLabel：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · actionLabel<br>input.status === SyncStatus.SYNCING |
| UI-23031e4c3c8f<br>[lib/sync/sync-presentation.ts:62:14](../../lib/sync/sync-presentation.ts#L62) | 同步需要重試 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · label<br>input.status === SyncStatus.ERROR |
| UI-83d713a74cc9<br>[lib/sync/sync-presentation.ts:63:24](../../lib/sync/sync-presentation.ts#L63) | 紀錄同步未完成，${input.pendingCount} 筆待同步${input.error ? &#96;：${input.error}&#96; : ''}，查看同步狀態 | **共用文案值** · 文案生產端，須查使用端<br>accessibleLabel：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · accessibleLabel<br>input.status === SyncStatus.ERROR |
| UI-412e590657ea<br>[lib/sync/sync-presentation.ts:63:75](../../lib/sync/sync-presentation.ts#L63) | ：${input.error} | **共用文案值** · 文案生產端，須查使用端<br>accessibleLabel：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · accessibleLabel<br>input.status === SyncStatus.ERROR → input.error |
| UI-c18b3d71aad0<br>[lib/sync/sync-presentation.ts:68:11](../../lib/sync/sync-presentation.ts#L68) | ${input.pendingCount} 筆紀錄尚未送達雲端，仍保存在這台裝置。請查看原因後重試。 | **來源候選** · 候選，非已證實提示<br>getSyncPresentation 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getSyncPresentation · detail<br>input.status === SyncStatus.ERROR → input.pendingCount &gt; 0 |
| UI-a22b3fd790ba<br>[lib/sync/sync-presentation.ts:69:11](../../lib/sync/sync-presentation.ts#L69) | 本次同步未完成，暫時無法確認最新雲端資料。請查看原因後重試。 | **來源候選** · 候選，非已證實提示<br>getSyncPresentation 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getSyncPresentation · detail<br>input.status === SyncStatus.ERROR → 否則 input.pendingCount &gt; 0 |
| UI-7905d87dbd34<br>[lib/sync/sync-presentation.ts:70:20](../../lib/sync/sync-presentation.ts#L70) | 重新同步 | **共用文案值** · 文案生產端，須查使用端<br>actionLabel：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · actionLabel<br>input.status === SyncStatus.ERROR |
| UI-edfb9233d2fa<br>[lib/sync/sync-presentation.ts:77:14](../../lib/sync/sync-presentation.ts#L77) | ${input.pendingCount} 筆待同步 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · label<br>input.pendingCount &gt; 0 |
| UI-05dceb15d0ea<br>[lib/sync/sync-presentation.ts:78:24](../../lib/sync/sync-presentation.ts#L78) | ${input.pendingCount} 筆紀錄待同步，查看同步狀態 | **共用文案值** · 文案生產端，須查使用端<br>accessibleLabel：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · accessibleLabel<br>input.pendingCount &gt; 0 |
| UI-3baa53987c75<br>[lib/sync/sync-presentation.ts:82:15](../../lib/sync/sync-presentation.ts#L82) | 這些紀錄目前只保存在這台裝置，尚未送達雲端。請完成同步後再換裝置使用。 | **來源候選** · 候選，非已證實提示<br>getSyncPresentation 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getSyncPresentation · detail<br>input.pendingCount &gt; 0 |
| UI-ce3cd4c235e2<br>[lib/sync/sync-presentation.ts:83:20](../../lib/sync/sync-presentation.ts#L83) | 立即同步 | **共用文案值** · 文案生產端，須查使用端<br>actionLabel：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · actionLabel<br>input.pendingCount &gt; 0 |
| UI-b664069b6b31<br>[lib/sync/sync-presentation.ts:90:14](../../lib/sync/sync-presentation.ts#L90) | 已同步 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · label<br>input.lastSyncAt !== null |
| UI-f2a1add8fa9b<br>[lib/sync/sync-presentation.ts:91:24](../../lib/sync/sync-presentation.ts#L91) | 上次完成紀錄同步於${lastSyncLabel}，查看同步狀態 | **共用文案值** · 文案生產端，須查使用端<br>accessibleLabel：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · accessibleLabel<br>input.lastSyncAt !== null |
| UI-80648b505f12<br>[lib/sync/sync-presentation.ts:95:15](../../lib/sync/sync-presentation.ts#L95) | 目前沒有待同步的紀錄。上次完成同步後，仍可檢查其他裝置的新紀錄。 | **來源候選** · 候選，非已證實提示<br>getSyncPresentation 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getSyncPresentation · detail<br>input.lastSyncAt !== null |
| UI-f28fa549e1aa<br>[lib/sync/sync-presentation.ts:96:20](../../lib/sync/sync-presentation.ts#L96) | 檢查雲端更新 | **共用文案值** · 文案生產端，須查使用端<br>actionLabel：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · actionLabel<br>input.lastSyncAt !== null |
| UI-0b1611618de3<br>[lib/sync/sync-presentation.ts:102:12](../../lib/sync/sync-presentation.ts#L102) | 正在確認同步狀態 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d3118b8d5c46<br>[lib/sync/sync-presentation.ts:103:22](../../lib/sync/sync-presentation.ts#L103) | 正在確認同步狀態，查看詳情 | **共用文案值** · 文案生產端，須查使用端<br>accessibleLabel：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · accessibleLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4fd27545877b<br>[lib/sync/sync-presentation.ts:107:13](../../lib/sync/sync-presentation.ts#L107) | 尚未完成本次紀錄同步檢查，目前不能確認雲端是否為最新。 | **來源候選** · 候選，非已證實提示<br>getSyncPresentation 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | getSyncPresentation · detail<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a380ab6bd39f<br>[lib/sync/sync-presentation.ts:108:18](../../lib/sync/sync-presentation.ts#L108) | 檢查同步狀態 | **共用文案值** · 文案生產端，須查使用端<br>actionLabel：供畫面或訊息組裝使用的標籤／說明值 | getSyncPresentation · actionLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
