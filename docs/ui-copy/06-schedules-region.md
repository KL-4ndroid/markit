# 固定安排與縣市整理：提示與介面文字

> 自動產生；請勿手動修改。重新產生：`node scripts/generate-ui-copy-inventory.mjs`。
> [總索引](../APP_UI_COPY_INDEX.md) · [完整 JSON](inventory.json) · [逐檔覆蓋](coverage.md)

共 364 筆來源位置；同字不同出處分開記錄。這是來源盤點，候選與未啟用分支不算已上線功能。

## app/markets/regions/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-8a896ad7aa9f<br>[app/markets/regions/page.tsx:33:15](../../app/markets/regions/page.tsx#L33) | 市集縣市整理 | **畫面文字** · 直接呈現定義<br>WorkspacePageHeader：呈現操作說明、資料標籤、狀態或注意事項 | MarketRegionsPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-80034adae21c<br>[app/markets/regions/page.tsx:34:17](../../app/markets/regions/page.tsx#L34) | 資料整理 | **來源候選** · 候選，非已證實提示<br>MarketRegionsPage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | MarketRegionsPage · eyebrow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-348f8ca5294e<br>[app/markets/regions/page.tsx:42:11](../../app/markets/regions/page.tsx#L42) | 返回市集清單 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | MarketRegionsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9b4dad9f7560<br>[app/markets/regions/page.tsx:48:19](../../app/markets/regions/page.tsx#L48) | 請使用老闆帳號整理縣市 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | MarketRegionsPage · title<br>!user &#124;&#124; userRole.isStaff &#124;&#124; !roleRefreshState.shouldMountProtectedChildren |
| UI-332ccded6077<br>[app/markets/regions/page.tsx:49:25](../../app/markets/regions/page.tsx#L49) | 員工可讀取原市集分類，分類調整由老闆處理。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | MarketRegionsPage · description<br>!user &#124;&#124; userRole.isStaff &#124;&#124; !roleRefreshState.shouldMountProtectedChildren |
| UI-5662b3f441d2<br>[app/markets/regions/page.tsx:98:52](../../app/markets/regions/page.tsx#L98) | ${regionBackfillError(e)} | **動態文字入口** · 執行時綁定入口<br>reload 接收執行時文字；內容需追查所列綁定與生產端 | reload<br>catch：操作拋出例外 → version === generation.current |
| UI-db7f3ba82ec9<br>[app/markets/regions/page.tsx:123:25](../../app/markets/regions/page.tsx#L123) | 請為每個勾選場次指定縣市。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | prepare<br>items.length !== chosen.length |
| UI-db9cbada542a<br>[app/markets/regions/page.tsx:127:16](../../app/markets/regions/page.tsx#L127) | ${regionBackfillError(e)} | **動態文字入口** · 執行時綁定入口<br>prepare 接收執行時文字；內容需追查所列綁定與生產端 | prepare<br>catch：操作拋出例外 |
| UI-e302fa8ebc17<br>[app/markets/regions/page.tsx:144:11](../../app/markets/regions/page.tsx#L144) | 已確認 ${count} 場補填送達雲端。原地點、營收及營業日期保留。 | **狀態設定** · 文案生產端，須查使用端<br>setStatus：更新畫面訊息；仍須依呼叫端確認是否被渲染 | submit<br>version === generation.current |
| UI-2ab77e9ed25f<br>[app/markets/regions/page.tsx:150:52](../../app/markets/regions/page.tsx#L150) | ${regionBackfillError(e)} | **動態文字入口** · 執行時綁定入口<br>submit 接收執行時文字；內容需追查所列綁定與生產端 | submit<br>catch：操作拋出例外 → version === generation.current |
| UI-063ec20b5661<br>[app/markets/regions/page.tsx:160:41](../../app/markets/regions/page.tsx#L160) | 未分類場次 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4ca7072d409e<br>[app/markets/regions/page.tsx:161:30](../../app/markets/regions/page.tsx#L161) | 補填範圍 | **畫面文字** · 直接呈現定義<br>ContextHelp：呈現操作說明、資料標籤、狀態或注意事項 | BackfillWorkspace · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a7d7108145bd<br>[app/markets/regions/page.tsx:162:16](../../app/markets/regions/page.tsx#L162) | 只補填你選取並確認的場次，不從地點文字猜測縣市，也不修改場地預設或其他營業日。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dfdf914900d4<br>[app/markets/regions/page.tsx:163:16](../../app/markets/regions/page.tsx#L163) | 已有縣市的更正請回原市集編輯。關閉頁面前尚未確認的選擇不會送出。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e8543fa6f139<br>[app/markets/regions/page.tsx:166:12](../../app/markets/regions/page.tsx#L166) | 每批最多 20 場，指定縣市後先預覽；需連線確認。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c86de756bfb2<br>[app/markets/regions/page.tsx:170:12](../../app/markets/regions/page.tsx#L170) | ${status} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | BackfillWorkspace<br>status |
| UI-c6b70d17177c<br>[app/markets/regions/page.tsx:178:12](../../app/markets/regions/page.tsx#L178) | ${error} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | BackfillWorkspace<br>error |
| UI-3b76eb3cee14<br>[app/markets/regions/page.tsx:186:9](../../app/markets/regions/page.tsx#L186) | 重新讀取未分類市集 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cfff41112d58<br>[app/markets/regions/page.tsx:189:26](../../app/markets/regions/page.tsx#L189) | 正在讀取未分類清單 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | BackfillWorkspace · title<br>loading |
| UI-c8cc009456c4<br>[app/markets/regions/page.tsx:193:22](../../app/markets/regions/page.tsx#L193) | 縣市補填預覽 | **輔助辨識** · 直接呈現定義<br>提供 section 的讀屏名稱、圖片替代文字或滑入說明 | BackfillWorkspace · aria-label<br>否則 loading → preview |
| UI-7f904ce4f1cd<br>[app/markets/regions/page.tsx:196:13](../../app/markets/regions/page.tsx#L196) | 確認這 ${preview.items.length} 場的縣市 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | BackfillWorkspace<br>否則 loading → preview |
| UI-f960f8bf7da0<br>[app/markets/regions/page.tsx:206:59](../../app/markets/regions/page.tsx#L206) | ${row?.name} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-410388bcaeb0<br>[app/markets/regions/page.tsx:208:37](../../app/markets/regions/page.tsx#L208) | ${row?.location} · ${row?.startDate}～${row?.endDate} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b6b74be2c894<br>[app/markets/regions/page.tsx:211:21](../../app/markets/regions/page.tsx#L211) | 未分類 → ${marketRegionLabel(item.regionCode)} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-59245dfcaf40<br>[app/markets/regions/page.tsx:218:13](../../app/markets/regions/page.tsx#L218) | 預覽後若有場次被修改或分類，整批會停止；重新讀取後再確認。確認後可回原市集編輯更正。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | BackfillWorkspace<br>否則 loading → preview |
| UI-bf7537660603<br>[app/markets/regions/page.tsx:222:15](../../app/markets/regions/page.tsx#L222) | 多筆補填準備中，目前可先回原市集編輯。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | BackfillWorkspace<br>否則 loading → preview → !regionBackfillEnabled() |
| UI-683a22abd093<br>[app/markets/regions/page.tsx:231:15](../../app/markets/regions/page.tsx#L231) | 確認補填到雲端 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | BackfillWorkspace<br>否則 loading → preview |
| UI-32db58b8b653<br>[app/markets/regions/page.tsx:238:15](../../app/markets/regions/page.tsx#L238) | 返回調整 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | BackfillWorkspace<br>否則 loading → preview |
| UI-36d608232fea<br>[app/markets/regions/page.tsx:243:51](../../app/markets/regions/page.tsx#L243) | 未分類市集清單 | **輔助辨識** · 直接呈現定義<br>提供 section 的讀屏名稱、圖片替代文字或滑入說明 | BackfillWorkspace · aria-label<br>否則 loading → 否則 preview |
| UI-eb152753b322<br>[app/markets/regions/page.tsx:245:13](../../app/markets/regions/page.tsx#L245) | 搜尋市集或地點 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | BackfillWorkspace<br>否則 loading → 否則 preview |
| UI-a0a4a3cebfee<br>[app/markets/regions/page.tsx:257:15](../../app/markets/regions/page.tsx#L257) | 已勾選 ${chosen.length} 場／未分類 ${rows.length} 場 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | BackfillWorkspace<br>否則 loading → 否則 preview |
| UI-b541b6ce13b8<br>[app/markets/regions/page.tsx:260:15](../../app/markets/regions/page.tsx#L260) | 共同縣市 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | BackfillWorkspace<br>否則 loading → 否則 preview |
| UI-e01d4278c6a6<br>[app/markets/regions/page.tsx:266:34](../../app/markets/regions/page.tsx#L266) | 選擇共同縣市 | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | BackfillWorkspace<br>否則 loading → 否則 preview |
| UI-bfab6a582bd5<br>[app/markets/regions/page.tsx:269:22](../../app/markets/regions/page.tsx#L269) | ${r.label} | **動態文字入口** · 執行時綁定入口<br>option 接收執行時文字；內容需追查所列綁定與生產端 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e7e01f7425b4<br>[app/markets/regions/page.tsx:284:15](../../app/markets/regions/page.tsx#L284) | 將縣市套用到勾選場次 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | BackfillWorkspace<br>否則 loading → 否則 preview |
| UI-af8e2a443c3a<br>[app/markets/regions/page.tsx:302:48](../../app/markets/regions/page.tsx#L302) | ${row.name} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5729a18b42c0<br>[app/markets/regions/page.tsx:305:32](../../app/markets/regions/page.tsx#L305) | ${row.location} · ${row.startDate}～${row.endDate} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-15aa9ac51748<br>[app/markets/regions/page.tsx:308:18](../../app/markets/regions/page.tsx#L308) | ${row.name} | **動態文字入口** · 執行時綁定入口<br>label 接收執行時文字；內容需追查所列綁定與生產端 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-18545357986c<br>[app/markets/regions/page.tsx:308:28](../../app/markets/regions/page.tsx#L308) | 縣市 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5b2f21ed1886<br>[app/markets/regions/page.tsx:321:36](../../app/markets/regions/page.tsx#L321) | 尚未指定 | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6b721094a609<br>[app/markets/regions/page.tsx:324:24](../../app/markets/regions/page.tsx#L324) | ${r.label} | **動態文字入口** · 執行時綁定入口<br>option 接收執行時文字；內容需追查所列綁定與生產端 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7ef1bf13150a<br>[app/markets/regions/page.tsx:333:17](../../app/markets/regions/page.tsx#L333) | 回原市集查看 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | BackfillWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-958053166fde<br>[app/markets/regions/page.tsx:338:41](../../app/markets/regions/page.tsx#L338) | 目前沒有符合條件的未分類市集。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | BackfillWorkspace<br>否則 loading → 否則 preview → filtered.length === 0 |
| UI-c74a3c28ca86<br>[app/markets/regions/page.tsx:342:15](../../app/markets/regions/page.tsx#L342) | 顯示更多市集 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | BackfillWorkspace<br>否則 loading → 否則 preview → filtered.length &gt; limit |
| UI-82fd86c26fff<br>[app/markets/regions/page.tsx:350:13](../../app/markets/regions/page.tsx#L350) | 預覽補填內容 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | BackfillWorkspace<br>否則 loading → 否則 preview |

## app/markets/schedules/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-b7737386c168<br>[app/markets/schedules/page.tsx:26:52](../../app/markets/schedules/page.tsx#L26) | 週日 | **來源候選** · 候選，非已證實提示<br>WEEKDAY_LABEL 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | WEEKDAY_LABEL · 0<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d67062d01063<br>[app/markets/schedules/page.tsx:26:61](../../app/markets/schedules/page.tsx#L26) | 週一 | **來源候選** · 候選，非已證實提示<br>WEEKDAY_LABEL 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | WEEKDAY_LABEL · 1<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5e976d8f69f3<br>[app/markets/schedules/page.tsx:26:70](../../app/markets/schedules/page.tsx#L26) | 週二 | **來源候選** · 候選，非已證實提示<br>WEEKDAY_LABEL 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | WEEKDAY_LABEL · 2<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ea6df766a97a<br>[app/markets/schedules/page.tsx:26:79](../../app/markets/schedules/page.tsx#L26) | 週三 | **來源候選** · 候選，非已證實提示<br>WEEKDAY_LABEL 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | WEEKDAY_LABEL · 3<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-38ce81ef390c<br>[app/markets/schedules/page.tsx:26:88](../../app/markets/schedules/page.tsx#L26) | 週四 | **來源候選** · 候選，非已證實提示<br>WEEKDAY_LABEL 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | WEEKDAY_LABEL · 4<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4c3608b32511<br>[app/markets/schedules/page.tsx:26:97](../../app/markets/schedules/page.tsx#L26) | 週五 | **來源候選** · 候選，非已證實提示<br>WEEKDAY_LABEL 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | WEEKDAY_LABEL · 5<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-380e0f32aaf6<br>[app/markets/schedules/page.tsx:26:106](../../app/markets/schedules/page.tsx#L26) | 週六 | **來源候選** · 候選，非已證實提示<br>WEEKDAY_LABEL 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | WEEKDAY_LABEL · 6<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-08c4976490d9<br>[app/markets/schedules/page.tsx:53:19](../../app/markets/schedules/page.tsx#L53) | 權限狀態已變更，請重新整理後再試。 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | act<br>!canManage |
| UI-a3878d2ef01a<br>[app/markets/schedules/page.tsx:69:32](../../app/markets/schedules/page.tsx#L69) | pause | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | act<br>action === 'pause' |
| UI-964e20b81ef7<br>[app/markets/schedules/page.tsx:69:42](../../app/markets/schedules/page.tsx#L69) | 固定安排已暫停 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | act<br>action === 'pause' |
| UI-a52df3afd449<br>[app/markets/schedules/page.tsx:69:65](../../app/markets/schedules/page.tsx#L69) | resume | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | act<br>否則 action === 'pause' → action === 'resume' |
| UI-9b5333d9d0ba<br>[app/markets/schedules/page.tsx:69:76](../../app/markets/schedules/page.tsx#L69) | 固定安排已恢復 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | act<br>否則 action === 'pause' → action === 'resume' |
| UI-8ea68b11a9c8<br>[app/markets/schedules/page.tsx:69:88](../../app/markets/schedules/page.tsx#L69) | 固定安排已封存 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | act<br>否則 action === 'pause' → 否則 action === 'resume' |
| UI-e73c85fe5d9e<br>[app/markets/schedules/page.tsx:73:19](../../app/markets/schedules/page.tsx#L73) | 固定安排尚未更新，請確認連線後再試一次。 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | act<br>catch：操作拋出例外 |
| UI-beae24a9c1fe<br>[app/markets/schedules/page.tsx:80:64](../../app/markets/schedules/page.tsx#L80) | 正在確認權限 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage · title<br>roleRefreshState.stage !== 'ready' |
| UI-dcf6fecbbab3<br>[app/markets/schedules/page.tsx:80:85](../../app/markets/schedules/page.tsx#L80) | 完成後會顯示固定營業安排。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage · description<br>roleRefreshState.stage !== 'ready' |
| UI-e83c8caeea1b<br>[app/markets/schedules/page.tsx:88:15](../../app/markets/schedules/page.tsx#L88) | 此頁僅限老闆使用 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage · title<br>!canManage |
| UI-c20df3db78ad<br>[app/markets/schedules/page.tsx:89:21](../../app/markets/schedules/page.tsx#L89) | 員工可以操作已排定的營業場次，但不能查看或管理固定規律。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage · description<br>!canManage |
| UI-fa9f2d278145<br>[app/markets/schedules/page.tsx:90:88](../../app/markets/schedules/page.tsx#L90) | 返回市集 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | FixedSchedulesPage · action<br>!canManage |
| UI-a58be65b8c10<br>[app/markets/schedules/page.tsx:98:15](../../app/markets/schedules/page.tsx#L98) | 固定安排 | **畫面文字** · 直接呈現定義<br>WorkspacePageHeader：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3d53c1899f0c<br>[app/markets/schedules/page.tsx:99:17](../../app/markets/schedules/page.tsx#L99) | 營運管理 | **來源候選** · 候選，非已證實提示<br>FixedSchedulesPage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | FixedSchedulesPage · eyebrow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b0d2bf82af04<br>[app/markets/schedules/page.tsx:102:35](../../app/markets/schedules/page.tsx#L102) | 新增固定安排 | **畫面文字** · 直接呈現定義<br>IconButton：辨識可點擊操作、導覽或展開入口 | FixedSchedulesPage · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c425e7de2777<br>[app/markets/schedules/page.tsx:106:11](../../app/markets/schedules/page.tsx#L106) | 返回市集 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | FixedSchedulesPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b69f91dd50bd<br>[app/markets/schedules/page.tsx:110:45](../../app/markets/schedules/page.tsx#L110) | 正在載入固定安排 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage · title<br>data === undefined |
| UI-39839a7178eb<br>[app/markets/schedules/page.tsx:110:68](../../app/markets/schedules/page.tsx#L110) | 正在整理常用據點與每週時間。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage · description<br>data === undefined |
| UI-e065e9f69836<br>[app/markets/schedules/page.tsx:115:19](../../app/markets/schedules/page.tsx#L115) | 固定安排暫時無法載入 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage · title<br>否則 data === undefined → data.error |
| UI-3f7e51cb8b0f<br>[app/markets/schedules/page.tsx:116:25](../../app/markets/schedules/page.tsx#L116) | 本機資料仍會保留；請重新整理後再試一次。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage · description<br>否則 data === undefined → data.error |
| UI-1c5081c797fb<br>[app/markets/schedules/page.tsx:117:92](../../app/markets/schedules/page.tsx#L117) | 返回市集 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | FixedSchedulesPage · action<br>否則 data === undefined → data.error |
| UI-4947fc87bc6d<br>[app/markets/schedules/page.tsx:123:19](../../app/markets/schedules/page.tsx#L123) | 還沒有固定安排 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage · title<br>否則 data === undefined → 否則 data.error → visibleSchedules.length === 0 |
| UI-3a19d9d9c818<br>[app/markets/schedules/page.tsx:124:25](../../app/markets/schedules/page.tsx#L124) | 建立常用地點、星期與時間後，就不用每週重新輸入。 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage · description<br>否則 data === undefined → 否則 data.error → visibleSchedules.length === 0 |
| UI-b3cc14d8e3b2<br>[app/markets/schedules/page.tsx:125:106](../../app/markets/schedules/page.tsx#L125) | 建立第一個固定安排 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | FixedSchedulesPage · action<br>否則 data === undefined → 否則 data.error → visibleSchedules.length === 0 |
| UI-03df857eed57<br>[app/markets/schedules/page.tsx:138:123](../../app/markets/schedules/page.tsx#L138) | 固定營業 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | FixedSchedulesPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5fa600cdaee0<br>[app/markets/schedules/page.tsx:143:35](../../app/markets/schedules/page.tsx#L143) | 已暫停 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage<br>isPaused |
| UI-2123c4546c5a<br>[app/markets/schedules/page.tsx:143:43](../../app/markets/schedules/page.tsx#L143) | 進行中 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage<br>否則 isPaused |
| UI-9dfae980fb1c<br>[app/markets/schedules/page.tsx:147:25](../../app/markets/schedules/page.tsx#L147) | ${scheduleRuleLabel(schedule)} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | FixedSchedulesPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3dc5e1dc766d<br>[app/markets/schedules/page.tsx:148:78](../../app/markets/schedules/page.tsx#L148) | ${schedule.startTime}–${schedule.endTime}${schedule.endsNextDay ? '（隔日）' : ''} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d831b17972c8<br>[app/markets/schedules/page.tsx:148:121](../../app/markets/schedules/page.tsx#L148) | （隔日） | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage<br>schedule.endsNextDay |
| UI-ff5e79abc711<br>[app/markets/schedules/page.tsx:149:66](../../app/markets/schedules/page.tsx#L149) | 自 ${schedule.recurrence.startDate} 起${schedule.recurrence.endDate ? &#96;，至 ${schedule.recurrence.endDate}&#96; : ''} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e8a12d2bc735<br>[app/markets/schedules/page.tsx:149:132](../../app/markets/schedules/page.tsx#L149) | ，至 ${schedule.recurrence.endDate} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage<br>schedule.recurrence.endDate |
| UI-9428d539518f<br>[app/markets/schedules/page.tsx:150:66](../../app/markets/schedules/page.tsx#L150) | 縣市：${marketRegionLabel(venue?.regionCode)} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-766d9120f63d<br>[app/markets/schedules/page.tsx:153:199](../../app/markets/schedules/page.tsx#L153) | 編輯未來縣市 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | FixedSchedulesPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c78b88bf9e13<br>[app/markets/schedules/page.tsx:155:189](../../app/markets/schedules/page.tsx#L155) | 恢復 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | FixedSchedulesPage<br>isPaused |
| UI-6e4763ba26ae<br>[app/markets/schedules/page.tsx:157:189](../../app/markets/schedules/page.tsx#L157) | 暫停 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | FixedSchedulesPage<br>否則 isPaused |
| UI-cc1261fa1dc8<br>[app/markets/schedules/page.tsx:159:183](../../app/markets/schedules/page.tsx#L159) | 封存 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | FixedSchedulesPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8d9cd5565bd2<br>[app/markets/schedules/page.tsx:167:92](../../app/markets/schedules/page.tsx#L167) | 已封存 ${archivedSchedules.length} 個固定安排 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage<br>archivedSchedules.length &gt; 0 |
| UI-1e1d567f24aa<br>[app/markets/schedules/page.tsx:170:108](../../app/markets/schedules/page.tsx#L170) | 固定安排已建立 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | FixedSchedulesPage · onSuccess<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7c90f189bb15<br>[app/markets/schedules/page.tsx:175:15](../../app/markets/schedules/page.tsx#L175) | 封存這個固定安排？ | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e8a40b41ca79<br>[app/markets/schedules/page.tsx:176:21](../../app/markets/schedules/page.tsx#L176) | 封存後不再建立未來場次；既有與已完成的營業資料不會刪除。 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a6f69c6cff0e<br>[app/markets/schedules/page.tsx:180:80](../../app/markets/schedules/page.tsx#L180) | 取消 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | FixedSchedulesPage · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8000178b764f<br>[app/markets/schedules/page.tsx:181:147](../../app/markets/schedules/page.tsx#L181) | 確認封存 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | FixedSchedulesPage · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ee14effd9ba8<br>[app/markets/schedules/page.tsx:185:64](../../app/markets/schedules/page.tsx#L185) | 需要再次使用時，請建立新的固定安排。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | FixedSchedulesPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/analytics/RegionAnalyticsPanel.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-dc279bb463d4<br>[components/analytics/RegionAnalyticsPanel.tsx:56:58](../../components/analytics/RegionAnalyticsPanel.tsx#L56) | 尚無金額 | **來源候選** · 候選，非已證實提示<br>percentage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | percentage<br>否則 total &gt; 0 |
| UI-719f8f5ec3e7<br>[components/analytics/RegionAnalyticsPanel.tsx:58:25](../../components/analytics/RegionAnalyticsPanel.tsx#L58) | 縣市分析 | **輔助辨識** · 直接呈現定義<br>提供 section 的讀屏名稱、圖片替代文字或滑入說明 | RegionAnalyticsPanel · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-40517698292a<br>[components/analytics/RegionAnalyticsPanel.tsx:60:47](../../components/analytics/RegionAnalyticsPanel.tsx#L60) | 縣市表現 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ad6ddc4f67c9<br>[components/analytics/RegionAnalyticsPanel.tsx:62:11](../../components/analytics/RegionAnalyticsPanel.tsx#L62) | 按這段期間的有效成交統計。場次狀態與有成交紀錄的日數分開；尚未確認的零成交出攤日不列入平均。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a80ab1133da4<br>[components/analytics/RegionAnalyticsPanel.tsx:66:13](../../components/analytics/RegionAnalyticsPanel.tsx#L66) | 分析起日 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-73e58c790af6<br>[components/analytics/RegionAnalyticsPanel.tsx:76:13](../../components/analytics/RegionAnalyticsPanel.tsx#L76) | 分析迄日 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2864882555c6<br>[components/analytics/RegionAnalyticsPanel.tsx:91:11](../../components/analytics/RegionAnalyticsPanel.tsx#L91) | 整理未分類縣市 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9e550c261f8a<br>[components/analytics/RegionAnalyticsPanel.tsx:95:26](../../components/analytics/RegionAnalyticsPanel.tsx#L95) | 正在整理縣市成交資料 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel · title<br>result === null |
| UI-9efb7167628b<br>[components/analytics/RegionAnalyticsPanel.tsx:97:26](../../components/analytics/RegionAnalyticsPanel.tsx#L97) | 日期範圍待確認 | **畫面文字** · 直接呈現定義<br>StateView：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel · title<br>否則 result === null → result.error |
| UI-746e1c861fde<br>[components/analytics/RegionAnalyticsPanel.tsx:97:49](../../components/analytics/RegionAnalyticsPanel.tsx#L97) | ${result.error} | **動態文字入口** · 執行時綁定入口<br>StateView 接收執行時文字；內容需追查所列綁定與生產端 | RegionAnalyticsPanel · description<br>否則 result === null → result.error |
| UI-59e6f83fa89e<br>[components/analytics/RegionAnalyticsPanel.tsx:104:23](../../components/analytics/RegionAnalyticsPanel.tsx#L104) | 已記錄營收 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model |
| UI-28858d2ceb6d<br>[components/analytics/RegionAnalyticsPanel.tsx:110:23](../../components/analytics/RegionAnalyticsPanel.tsx#L110) | 縣市分類覆蓋 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model |
| UI-0177650565f8<br>[components/analytics/RegionAnalyticsPanel.tsx:112:50](../../components/analytics/RegionAnalyticsPanel.tsx#L112) | ${model.classifiedMarketCount}／${model.totalMarkets} 場 | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model |
| UI-637cad0086d6<br>[components/analytics/RegionAnalyticsPanel.tsx:116:23](../../components/analytics/RegionAnalyticsPanel.tsx#L116) | 已分類收入佔比 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model |
| UI-d06a2a305388<br>[components/analytics/RegionAnalyticsPanel.tsx:125:23](../../components/analytics/RegionAnalyticsPanel.tsx#L125) | 有效成交紀錄 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model |
| UI-1ab93f706e4a<br>[components/analytics/RegionAnalyticsPanel.tsx:126:41](../../components/analytics/RegionAnalyticsPanel.tsx#L126) | ${model.saleCount} 筆 | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model |
| UI-937ce4f5b0ac<br>[components/analytics/RegionAnalyticsPanel.tsx:130:17](../../components/analytics/RegionAnalyticsPanel.tsx#L130) | 包含未分類的收入；成交紀錄筆數不等於補登內的成交次數。取消場次若仍有有效成交，收入保留並單列狀態。這不是各縣市淨利排行。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model |
| UI-3bbc6edbc9dd<br>[components/analytics/RegionAnalyticsPanel.tsx:142:46](../../components/analytics/RegionAnalyticsPanel.tsx#L142) | 資料範圍待確認 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model → (model.pendingCount &gt; 0 &#124;&#124; model.projectionMismatchCount &gt; 0 &#124;&#124; model.undatedCount &gt; 0 &#124;&#124; model.invalidAmountCount &gt; 0 &#124;&#124; model.futureCount &gt; 0) |
| UI-b91a440101cd<br>[components/analytics/RegionAnalyticsPanel.tsx:144:43](../../components/analytics/RegionAnalyticsPanel.tsx#L144) | ${model.pendingCount} 筆本機成交／撤回尚未確認同步。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model → (model.pendingCount &gt; 0 &#124;&#124; model.projectionMismatchCount &gt; 0 &#124;&#124; model.undatedCount &gt; 0 &#124;&#124; model.invalidAmountCount &gt; 0 &#124;&#124; model.futureCount &gt; 0) → model.pendingCount &gt; 0 |
| UI-1c46ac359811<br>[components/analytics/RegionAnalyticsPanel.tsx:149:21](../../components/analytics/RegionAnalyticsPanel.tsx#L149) | ${model.projectionMismatchCount}${" "} 場的成交明細與整場總額尚不一致，可能仍有資料未完整載入。以下保留已讀到的紀錄。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model → (model.pendingCount &gt; 0 &#124;&#124; model.projectionMismatchCount &gt; 0 &#124;&#124; model.undatedCount &gt; 0 &#124;&#124; model.invalidAmountCount &gt; 0 &#124;&#124; model.futureCount &gt; 0) → model.projectionMismatchCount &gt; 0 |
| UI-8a19ac46998b<br>[components/analytics/RegionAnalyticsPanel.tsx:155:21](../../components/analytics/RegionAnalyticsPanel.tsx#L155) | ${model.undatedCount}${" "} 筆成交缺少有效營業日，尚未納入期間統計。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model → (model.pendingCount &gt; 0 &#124;&#124; model.projectionMismatchCount &gt; 0 &#124;&#124; model.undatedCount &gt; 0 &#124;&#124; model.invalidAmountCount &gt; 0 &#124;&#124; model.futureCount &gt; 0) → model.undatedCount &gt; 0 |
| UI-f7643ded239a<br>[components/analytics/RegionAnalyticsPanel.tsx:160:48](../../components/analytics/RegionAnalyticsPanel.tsx#L160) | ${model.invalidAmountCount} 筆期間內金額待確認，未當成零元。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model → (model.pendingCount &gt; 0 &#124;&#124; model.projectionMismatchCount &gt; 0 &#124;&#124; model.undatedCount &gt; 0 &#124;&#124; model.invalidAmountCount &gt; 0 &#124;&#124; model.futureCount &gt; 0) → model.invalidAmountCount &gt; 0 |
| UI-712410deea9b<br>[components/analytics/RegionAnalyticsPanel.tsx:164:42](../../components/analytics/RegionAnalyticsPanel.tsx#L164) | ${model.futureCount} 筆日期晚於今天的成交未列入。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model → (model.pendingCount &gt; 0 &#124;&#124; model.projectionMismatchCount &gt; 0 &#124;&#124; model.undatedCount &gt; 0 &#124;&#124; model.invalidAmountCount &gt; 0 &#124;&#124; model.futureCount &gt; 0) → model.futureCount &gt; 0 |
| UI-9014df041235<br>[components/analytics/RegionAnalyticsPanel.tsx:175:52](../../components/analytics/RegionAnalyticsPanel.tsx#L175) | ${row.label} | **動態文字入口** · 執行時綁定入口<br>h3 接收執行時文字；內容需追查所列綁定與生產端 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0fbdd575fb67<br>[components/analytics/RegionAnalyticsPanel.tsx:182:61](../../components/analytics/RegionAnalyticsPanel.tsx#L182) | 期間場次 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-16037411c1d0<br>[components/analytics/RegionAnalyticsPanel.tsx:183:45](../../components/analytics/RegionAnalyticsPanel.tsx#L183) | ${row.marketCount} 場 | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-53c2f2584adb<br>[components/analytics/RegionAnalyticsPanel.tsx:186:61](../../components/analytics/RegionAnalyticsPanel.tsx#L186) | 有成交紀錄場次 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-542f1993a499<br>[components/analytics/RegionAnalyticsPanel.tsx:187:53](../../components/analytics/RegionAnalyticsPanel.tsx#L187) | ${row.recordedMarketCount} 場 | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e5fe64628476<br>[components/analytics/RegionAnalyticsPanel.tsx:191:25](../../components/analytics/RegionAnalyticsPanel.tsx#L191) | 有成交紀錄場次日 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e0674a0d0ed1<br>[components/analytics/RegionAnalyticsPanel.tsx:193:50](../../components/analytics/RegionAnalyticsPanel.tsx#L193) | ${row.recordedDayCount} 天 | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e6f13647f0ec<br>[components/analytics/RegionAnalyticsPanel.tsx:196:61](../../components/analytics/RegionAnalyticsPanel.tsx#L196) | 紀錄日平均營收 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ed77d954af1c<br>[components/analytics/RegionAnalyticsPanel.tsx:199:29](../../components/analytics/RegionAnalyticsPanel.tsx#L199) | 尚無成交日紀錄 | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>row.averageCents === null |
| UI-f66b2633f0ac<br>[components/analytics/RegionAnalyticsPanel.tsx:205:21](../../components/analytics/RegionAnalyticsPanel.tsx#L205) | 報名中${" "} ${(row.statuses.registered ?? 0) + (row.statuses.accepted ?? 0) + (row.statuses.paid ?? 0)}${" "} 場 · 取消 ${row.statuses.cancelled ?? 0} 場 · 延期${" "} ${row.statuses.postponed ?? 0} 場 · 其他狀態${" "} ${(row.statuses.ongoing ?? 0) + (row.statuses.completed ?? 0)}${" "} 場 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5b12ed74ef7c<br>[components/analytics/RegionAnalyticsPanel.tsx:217:23](../../components/analytics/RegionAnalyticsPanel.tsx#L217) | 樣本仍少，先看原始紀錄，不據此判斷哪個縣市較好賣。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>row.recordedMarketCount &lt; 3 |
| UI-47f7868fd0ac<br>[components/analytics/RegionAnalyticsPanel.tsx:222:23](../../components/analytics/RegionAnalyticsPanel.tsx#L222) | 商品表現與場次明細 | **畫面文字** · 直接呈現定義<br>summary：辨識可點擊操作、導覽或展開入口 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-676d969568d7<br>[components/analytics/RegionAnalyticsPanel.tsx:225:23](../../components/analytics/RegionAnalyticsPanel.tsx#L225) | 商品明細收入覆蓋： ${percentage(row.detailRevenueCents, row.revenueCents)} 。純金額補登不推算商品；整單折扣按商品原價占比分配，可能有分位差。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-53c6a62720e2<br>[components/analytics/RegionAnalyticsPanel.tsx:230:46](../../components/analytics/RegionAnalyticsPanel.tsx#L230) | 尚無可歸屬商品明細。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>row.products.length === 0 |
| UI-319772d94984<br>[components/analytics/RegionAnalyticsPanel.tsx:236:32](../../components/analytics/RegionAnalyticsPanel.tsx#L236) | ${p.name} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d888c4e74273<br>[components/analytics/RegionAnalyticsPanel.tsx:237:44](../../components/analytics/RegionAnalyticsPanel.tsx#L237) | （識別資料不足） | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>p.unknown |
| UI-f19202629cab<br>[components/analytics/RegionAnalyticsPanel.tsx:239:46](../../components/analytics/RegionAnalyticsPanel.tsx#L239) | ${p.quantity} 件 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e5bdc7469669<br>[components/analytics/RegionAnalyticsPanel.tsx:256:30](../../components/analytics/RegionAnalyticsPanel.tsx#L256) | ${m.name} | **動態文字入口** · 執行時綁定入口<br>Link 接收執行時文字；內容需追查所列綁定與生產端 | RegionAnalyticsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ae5968d06201<br>[components/analytics/RegionAnalyticsPanel.tsx:266:15](../../components/analytics/RegionAnalyticsPanel.tsx#L266) | 同日兩場計兩個場次日，多日同一市集仍計一場。縣市更正後按目前場次快照重新歸類；不使用自由文字猜測。資料來自這台裝置，尚未送達或未載入的其他裝置紀錄可能使結果改變。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model |
| UI-dc4f71d3af99<br>[components/analytics/RegionAnalyticsPanel.tsx:268:19](../../components/analytics/RegionAnalyticsPanel.tsx#L268) | 本機場次更新：${new Date(model.updatedAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | RegionAnalyticsPanel<br>否則 result === null → 否則 result.error → model → model.updatedAt &gt; 0 |

## components/markets/MarketRegionField.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-14704e5333cf<br>[components/markets/MarketRegionField.tsx:18:30](../../components/markets/MarketRegionField.tsx#L18) | 縣市（選填） | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | MarketRegionField · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cfca1499477a<br>[components/markets/MarketRegionField.tsx:19:33](../../components/markets/MarketRegionField.tsx#L19) | 縣市分類準備中，稍後可回來補填。 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | MarketRegionField · hint<br>否則 ready |
| UI-0b6d137ee6b5<br>[components/markets/MarketRegionField.tsx:27:28](../../components/markets/MarketRegionField.tsx#L27) | 未分類（可稍後選擇） | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | MarketRegionField<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b114f77ab5a8<br>[components/markets/MarketRegionField.tsx:28:88](../../components/markets/MarketRegionField.tsx#L28) | ${region.label} | **動態文字入口** · 執行時綁定入口<br>option 接收執行時文字；內容需追查所列綁定與生產端 | MarketRegionField<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/recurring-operations/AddOperationDialog.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-5bf81968bf8e<br>[components/recurring-operations/AddOperationDialog.tsx:22:13](../../components/recurring-operations/AddOperationDialog.tsx#L22) | 新增營業 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | AddOperationDialog · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-717786fdca0e<br>[components/recurring-operations/AddOperationDialog.tsx:26:11](../../components/recurring-operations/AddOperationDialog.tsx#L26) | 管理固定安排 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | AddOperationDialog · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7f7e2677efe7<br>[components/recurring-operations/AddOperationDialog.tsx:36:77](../../components/recurring-operations/AddOperationDialog.tsx#L36) | 單次營業 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AddOperationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-38fecdf96a24<br>[components/recurring-operations/AddOperationDialog.tsx:37:82](../../components/recurring-operations/AddOperationDialog.tsx#L37) | 適合市集、快閃或臨時活動 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AddOperationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-24679150d1a8<br>[components/recurring-operations/AddOperationDialog.tsx:47:77](../../components/recurring-operations/AddOperationDialog.tsx#L47) | 每週固定 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AddOperationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f3e10f4cc36a<br>[components/recurring-operations/AddOperationDialog.tsx:48:82](../../components/recurring-operations/AddOperationDialog.tsx#L48) | 設定常用地點、星期與時間 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AddOperationDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/recurring-operations/FixedScheduleForm.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-acb1627839c6<br>[components/recurring-operations/FixedScheduleForm.tsx:31:22](../../components/recurring-operations/FixedScheduleForm.tsx#L31) | 一 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | WEEKDAYS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-976eedbd3f7c<br>[components/recurring-operations/FixedScheduleForm.tsx:31:48](../../components/recurring-operations/FixedScheduleForm.tsx#L31) | 二 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | WEEKDAYS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-34c95bb1eb0e<br>[components/recurring-operations/FixedScheduleForm.tsx:31:74](../../components/recurring-operations/FixedScheduleForm.tsx#L31) | 三 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | WEEKDAYS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-38f77161df81<br>[components/recurring-operations/FixedScheduleForm.tsx:32:22](../../components/recurring-operations/FixedScheduleForm.tsx#L32) | 四 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | WEEKDAYS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-403d76fbe769<br>[components/recurring-operations/FixedScheduleForm.tsx:32:48](../../components/recurring-operations/FixedScheduleForm.tsx#L32) | 五 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | WEEKDAYS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fd1d06380bfe<br>[components/recurring-operations/FixedScheduleForm.tsx:32:74](../../components/recurring-operations/FixedScheduleForm.tsx#L32) | 六 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | WEEKDAYS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3ddc01b7a17d<br>[components/recurring-operations/FixedScheduleForm.tsx:33:22](../../components/recurring-operations/FixedScheduleForm.tsx#L33) | 日 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | WEEKDAYS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-08f46c407e20<br>[components/recurring-operations/FixedScheduleForm.tsx:38:23](../../components/recurring-operations/FixedScheduleForm.tsx#L38) | 報名費 | **來源候選** · 候選，非已證實提示<br>numberFields 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | numberFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-85e478fc4b4b<br>[components/recurring-operations/FixedScheduleForm.tsx:38:45](../../components/recurring-operations/FixedScheduleForm.tsx#L38) | 攤位費 | **來源候選** · 候選，非已證實提示<br>numberFields 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | numberFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-09af92543473<br>[components/recurring-operations/FixedScheduleForm.tsx:38:65](../../components/recurring-operations/FixedScheduleForm.tsx#L38) | 保證金 | **來源候選** · 候選，非已證實提示<br>numberFields 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | numberFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-267445ce0317<br>[components/recurring-operations/FixedScheduleForm.tsx:39:19](../../components/recurring-operations/FixedScheduleForm.tsx#L39) | 桌子租金 | **來源候選** · 候選，非已證實提示<br>numberFields 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | numberFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5f5b4a35f00a<br>[components/recurring-operations/FixedScheduleForm.tsx:39:44](../../components/recurring-operations/FixedScheduleForm.tsx#L39) | 椅子租金 | **來源候選** · 候選，非已證實提示<br>numberFields 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | numberFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-61fee1f3e9ed<br>[components/recurring-operations/FixedScheduleForm.tsx:39:72](../../components/recurring-operations/FixedScheduleForm.tsx#L39) | 傘具租金 | **來源候選** · 候選，非已證實提示<br>numberFields 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | numberFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2436ab83c5ac<br>[components/recurring-operations/FixedScheduleForm.tsx:40:24](../../components/recurring-operations/FixedScheduleForm.tsx#L40) | 桌巾租金 | **來源候選** · 候選，非已證實提示<br>numberFields 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | numberFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3f6594997517<br>[components/recurring-operations/FixedScheduleForm.tsx:40:52](../../components/recurring-operations/FixedScheduleForm.tsx#L40) | 營業額抽成（%） | **來源候選** · 候選，非已證實提示<br>numberFields 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | numberFields<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8b5bcb47f168<br>[components/recurring-operations/FixedScheduleForm.tsx:78:45](../../components/recurring-operations/FixedScheduleForm.tsx#L78) | 請輸入營業據點名稱 | **來源候選** · 候選，非已證實提示<br>validate 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validate<br>!venueName.trim() |
| UI-b1150022c037<br>[components/recurring-operations/FixedScheduleForm.tsx:79:48](../../components/recurring-operations/FixedScheduleForm.tsx#L79) | 請至少選擇一個星期 | **來源候選** · 候選，非已證實提示<br>validate 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validate<br>weekdays.length === 0 |
| UI-dbc0ea7010d8<br>[components/recurring-operations/FixedScheduleForm.tsx:80:60](../../components/recurring-operations/FixedScheduleForm.tsx#L80) | 請選擇開始時間 | **來源候選** · 候選，非已證實提示<br>validate 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validate<br>!/^\d{2}:\d{2}$/.test(startTime) |
| UI-5ff643c24f63<br>[components/recurring-operations/FixedScheduleForm.tsx:81:56](../../components/recurring-operations/FixedScheduleForm.tsx#L81) | 請選擇結束時間 | **來源候選** · 候選，非已證實提示<br>validate 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validate<br>!/^\d{2}:\d{2}$/.test(endTime) |
| UI-80430574cb90<br>[components/recurring-operations/FixedScheduleForm.tsx:82:66](../../components/recurring-operations/FixedScheduleForm.tsx#L82) | 請選擇起始日期 | **來源候選** · 候選，非已證實提示<br>validate 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validate<br>!/^\d{4}-\d{2}-\d{2}$/.test(startDate) |
| UI-247fff6b5564<br>[components/recurring-operations/FixedScheduleForm.tsx:83:56](../../components/recurring-operations/FixedScheduleForm.tsx#L83) | 結束日期不可早於起始日期 | **來源候選** · 候選，非已證實提示<br>validate 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | validate<br>endDate &amp;&amp; endDate &lt; startDate |
| UI-cfae0321c21f<br>[components/recurring-operations/FixedScheduleForm.tsx:93:22](../../components/recurring-operations/FixedScheduleForm.tsx#L93) | 權限狀態已變更，請重新整理後再試。 | **來源候選** · 候選，非已證實提示<br>submit 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | submit<br>roleRefreshState.stage !== 'ready' &#124;&#124; !isOwner &#124;&#124; !user?.id |
| UI-e2b30a766b85<br>[components/recurring-operations/FixedScheduleForm.tsx:108:15](../../components/recurring-operations/FixedScheduleForm.tsx#L108) | ${venueName.trim()}固定營業 | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | submit · name<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1a8f9556ff75<br>[components/recurring-operations/FixedScheduleForm.tsx:130:22](../../components/recurring-operations/FixedScheduleForm.tsx#L130) | 固定安排尚未建立，請確認連線與權限後再試一次。 | **來源候選** · 候選，非已證實提示<br>submit 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | submit<br>catch：操作拋出例外 |
| UI-accfae532496<br>[components/recurring-operations/FixedScheduleForm.tsx:143:15](../../components/recurring-operations/FixedScheduleForm.tsx#L143) | 固定營業 | **來源候選** · 候選，非已證實提示<br>FixedScheduleForm 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | FixedScheduleForm · eyebrow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b7915c8e2bcd<br>[components/recurring-operations/FixedScheduleForm.tsx:144:13](../../components/recurring-operations/FixedScheduleForm.tsx#L144) | 設定每週固定安排 | **畫面文字** · 直接呈現定義<br>FullScreenForm：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d0dccab6cf71<br>[components/recurring-operations/FixedScheduleForm.tsx:148:81](../../components/recurring-operations/FixedScheduleForm.tsx#L148) | 取消 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | FixedScheduleForm · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6ed9ab25a730<br>[components/recurring-operations/FixedScheduleForm.tsx:149:85](../../components/recurring-operations/FixedScheduleForm.tsx#L149) | 建立固定安排 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | FixedScheduleForm · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5dd79b874ea0<br>[components/recurring-operations/FixedScheduleForm.tsx:160:89](../../components/recurring-operations/FixedScheduleForm.tsx#L160) | 固定營業資訊 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | FixedScheduleForm<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8d3bb0cd5930<br>[components/recurring-operations/FixedScheduleForm.tsx:165:52](../../components/recurring-operations/FixedScheduleForm.tsx#L165) | 營業據點名稱 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d1f6cd3c1fe2<br>[components/recurring-operations/FixedScheduleForm.tsx:170:51](../../components/recurring-operations/FixedScheduleForm.tsx#L170) | 地點（選填） | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9e450cf8a965<br>[components/recurring-operations/FixedScheduleForm.tsx:170:65](../../components/recurring-operations/FixedScheduleForm.tsx#L170) | 地標或地址皆可。 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm · hint<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4ca6a97353c4<br>[components/recurring-operations/FixedScheduleForm.tsx:176:48](../../components/recurring-operations/FixedScheduleForm.tsx#L176) | 每週星期 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b4b062fc9f1b<br>[components/recurring-operations/FixedScheduleForm.tsx:178:90](../../components/recurring-operations/FixedScheduleForm.tsx#L178) | 每週營業日 | **輔助辨識** · 直接呈現定義<br>提供 div 的讀屏名稱、圖片替代文字或滑入說明 | FixedScheduleForm · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-70a9bb4d8892<br>[components/recurring-operations/FixedScheduleForm.tsx:185:24](../../components/recurring-operations/FixedScheduleForm.tsx#L185) | ${day.label} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | FixedScheduleForm<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-626500801b86<br>[components/recurring-operations/FixedScheduleForm.tsx:194:52](../../components/recurring-operations/FixedScheduleForm.tsx#L194) | 開始時間 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a2204a3cace5<br>[components/recurring-operations/FixedScheduleForm.tsx:197:50](../../components/recurring-operations/FixedScheduleForm.tsx#L197) | 結束時間 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-191e0e8cd000<br>[components/recurring-operations/FixedScheduleForm.tsx:197:118](../../components/recurring-operations/FixedScheduleForm.tsx#L197) | 將視為隔日結束。 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm · hint<br>endTime &lt;= startTime |
| UI-c6e1d039cc27<br>[components/recurring-operations/FixedScheduleForm.tsx:200:52](../../components/recurring-operations/FixedScheduleForm.tsx#L200) | 起始日期 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-21f4ee1d4634<br>[components/recurring-operations/FixedScheduleForm.tsx:203:50](../../components/recurring-operations/FixedScheduleForm.tsx#L203) | 結束日期 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f4c0465460dd<br>[components/recurring-operations/FixedScheduleForm.tsx:203:85](../../components/recurring-operations/FixedScheduleForm.tsx#L203) | 選填；留空表示持續進行。 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm · hint<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-eb4c4308fba6<br>[components/recurring-operations/FixedScheduleForm.tsx:210:40](../../components/recurring-operations/FixedScheduleForm.tsx#L210) | 更多預設 | **畫面文字** · 直接呈現定義<br>FormSectionDisclosure：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c2fd815e2cb4<br>[components/recurring-operations/FixedScheduleForm.tsx:210:59](../../components/recurring-operations/FixedScheduleForm.tsx#L210) | 費用、設備與每次共用的備註 | **畫面文字** · 直接呈現定義<br>FormSectionDisclosure：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f7dd7960051f<br>[components/recurring-operations/FixedScheduleForm.tsx:213:69](../../components/recurring-operations/FixedScheduleForm.tsx#L213) | ${label} | **動態文字入口** · 執行時綁定入口<br>FormField 接收執行時文字；內容需追查所列綁定與生產端 | FixedScheduleForm · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-42a7b918636c<br>[components/recurring-operations/FixedScheduleForm.tsx:219:19](../../components/recurring-operations/FixedScheduleForm.tsx#L219) | tableFree | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c39c14e17536<br>[components/recurring-operations/FixedScheduleForm.tsx:219:32](../../components/recurring-operations/FixedScheduleForm.tsx#L219) | 免費提供桌子 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-43b02841d934<br>[components/recurring-operations/FixedScheduleForm.tsx:219:44](../../components/recurring-operations/FixedScheduleForm.tsx#L219) | chairFree | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4c3d65197dbb<br>[components/recurring-operations/FixedScheduleForm.tsx:219:57](../../components/recurring-operations/FixedScheduleForm.tsx#L219) | 免費提供椅子 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-95b4f8eb8360<br>[components/recurring-operations/FixedScheduleForm.tsx:219:69](../../components/recurring-operations/FixedScheduleForm.tsx#L219) | umbrellaFree | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2b6464de3739<br>[components/recurring-operations/FixedScheduleForm.tsx:219:85](../../components/recurring-operations/FixedScheduleForm.tsx#L219) | 免費提供傘具 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7076ae2587c4<br>[components/recurring-operations/FixedScheduleForm.tsx:219:97](../../components/recurring-operations/FixedScheduleForm.tsx#L219) | tableclothFree | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ac2ae32fa9f7<br>[components/recurring-operations/FixedScheduleForm.tsx:219:115](../../components/recurring-operations/FixedScheduleForm.tsx#L219) | 免費提供桌巾 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fbba013df82d<br>[components/recurring-operations/FixedScheduleForm.tsx:222:20](../../components/recurring-operations/FixedScheduleForm.tsx#L222) | ${label} | **動態文字入口** · 執行時綁定入口<br>label 接收執行時文字；內容需追查所列綁定與生產端 | FixedScheduleForm<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-02348111dac0<br>[components/recurring-operations/FixedScheduleForm.tsx:226:47](../../components/recurring-operations/FixedScheduleForm.tsx#L226) | 備註模板 | **畫面文字** · 直接呈現定義<br>FormField：呈現操作說明、資料標籤、狀態或注意事項 | FixedScheduleForm · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8d1e342b17ad<br>[components/recurring-operations/FixedScheduleForm.tsx:227:254](../../components/recurring-operations/FixedScheduleForm.tsx#L227) | 每次營業都需要記得的事項 | **輸入提示** · 直接呈現定義<br>在 textarea 提供輸入格式、範例或選擇提示 | FixedScheduleForm · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f97f55e2d72d<br>[components/recurring-operations/FixedScheduleForm.tsx:232:166](../../components/recurring-operations/FixedScheduleForm.tsx#L232) | ${submitError} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | FixedScheduleForm<br>submitError |

## components/recurring-operations/FutureScheduleEditDialog.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-536b9a6e5176<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:18:22](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L18) | 一 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | WEEKDAYS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dd6830fba18f<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:18:48](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L18) | 二 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | WEEKDAYS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3b8d565d890b<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:18:74](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L18) | 三 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | WEEKDAYS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5faebfd20570<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:19:22](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L19) | 四 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | WEEKDAYS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-37e90a770750<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:19:48](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L19) | 五 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | WEEKDAYS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-46f1e7f68353<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:19:74](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L19) | 六 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | WEEKDAYS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2977fb0251ed<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:20:22](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L20) | 日 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | WEEKDAYS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-31afc0bb8dec<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:50:19](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L50) | 請至少選擇一個星期，並確認目前權限。 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | save<br>!schedule &#124;&#124; weekdays.length === 0 &#124;&#124; !user?.id &#124;&#124; !isOwner &#124;&#124; roleRefreshState.stage !== 'ready' |
| UI-1ef6ce8965ed<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:62:21](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L62) | 已更新這次之後的固定安排 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | save<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cd1a36c544df<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:66:19](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L66) | 未來安排尚未更新；已有營業活動的場次不會被改寫。 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | save<br>catch：操作拋出例外 |
| UI-f9d49553e910<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:76:13](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L76) | 從這次開始都修改 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2141368d7385<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:77:20](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L77) | 自 ${effectiveDate} 起套用新的星期與營業時間；過去與已有活動的場次不會改變。 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b5969d27a014<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:80:83](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L80) | 取消 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | FutureScheduleEditDialog · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-468189a3e5ab<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:80:151](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L80) | 更新未來安排 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | FutureScheduleEditDialog · footer<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4d07f6677786<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:82:65](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L82) | 正在載入固定安排… | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>!schedule |
| UI-a2e73c259fd7<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:85:69](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L85) | 每週星期 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-4617d0eb0466<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:86:79](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L86) | 未來每週營業日 | **輔助辨識** · 直接呈現定義<br>提供 div 的讀屏名稱、圖片替代文字或滑入說明 | FutureScheduleEditDialog · aria-label<br>否則 !schedule |
| UI-5d31d6c39b9a<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:89:355](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L89) | ${day.label} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | FutureScheduleEditDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0e7fd34c8308<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:94:68](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L94) | 開始時間 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-8eb464a2b862<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:95:68](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L95) | 結束時間 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-a21bd70c0bc9<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:97:40](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L97) | 更多預設 | **畫面文字** · 直接呈現定義<br>FormSectionDisclosure：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog · title<br>否則 !schedule |
| UI-2442699f0899<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:97:59](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L97) | 從這次之後使用的費用與備註 | **畫面文字** · 直接呈現定義<br>FormSectionDisclosure：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog · description<br>否則 !schedule |
| UI-6772c5cb4943<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:19](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | registrationFee | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-346e76bbbb3e<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:38](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | 報名費 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-8288707abc3d<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:47](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | boothCost | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-923cf0ee6a1c<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:60](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | 攤位費 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-5d7523e4f898<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:69](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | deposit | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-b067e8805da0<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:80](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | 保證金 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-c753c4a0618c<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:89](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | tableRental | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-c383ed073ca8<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:104](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | 桌子租金 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-19a527890b00<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:114](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | chairRental | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-4acca9a12971<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:129](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | 椅子租金 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-06e3ab300e28<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:139](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | umbrellaRental | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-83fdb2a7e22b<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:157](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | 傘具租金 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-1924ca19d8b8<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:167](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | tableclothRental | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-a2a1499fa3ca<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:187](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | 桌巾租金 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-a7169853f821<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:197](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | commissionRate | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-95b5ddb01140<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:99:215](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L99) | 營業額抽成（%） | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | FutureScheduleEditDialog<br>否則 !schedule |
| UI-5b70bc05bb0a<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:100:85](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L100) | ${label} | **動態文字入口** · 執行時綁定入口<br>label 接收執行時文字；內容需追查所列綁定與生產端 | FutureScheduleEditDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1e095b93e912<br>[components/recurring-operations/FutureScheduleEditDialog.tsx:103:79](../../components/recurring-operations/FutureScheduleEditDialog.tsx#L103) | 備註模板 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | FutureScheduleEditDialog<br>否則 !schedule |

## components/recurring-operations/VenueRegionEditDialog.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-19e50e5df465<br>[components/recurring-operations/VenueRegionEditDialog.tsx:54:52](../../components/recurring-operations/VenueRegionEditDialog.tsx#L54) | ${ownerFollowupError(e)} | **動態文字入口** · 執行時綁定入口<br>load 接收執行時文字；內容需追查所列綁定與生產端 | load<br>catch：操作拋出例外 → version === generation.current |
| UI-ba46dd0de5aa<br>[components/recurring-operations/VenueRegionEditDialog.tsx:82:11](../../components/recurring-operations/VenueRegionEditDialog.tsx#L82) | 雲端已確認：${result.updatedCount} 場已更新，${result.protectedCount} 場受到保護而保留原分類。 | **狀態設定** · 文案生產端，須查使用端<br>setSuccess：更新畫面訊息；仍須依呼叫端確認是否被渲染 | save<br>version === generation.current |
| UI-b910f06399c3<br>[components/recurring-operations/VenueRegionEditDialog.tsx:85:52](../../components/recurring-operations/VenueRegionEditDialog.tsx#L85) | ${ownerFollowupError(e)} | **動態文字入口** · 執行時綁定入口<br>save 接收執行時文字；內容需追查所列綁定與生產端 | save<br>catch：操作拋出例外 → version === generation.current |
| UI-0f19dae9ab41<br>[components/recurring-operations/VenueRegionEditDialog.tsx:96:13](../../components/recurring-operations/VenueRegionEditDialog.tsx#L96) | 編輯固定安排縣市 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | VenueRegionEditDialog · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-565c41ebbdad<br>[components/recurring-operations/VenueRegionEditDialog.tsx:97:19](../../components/recurring-operations/VenueRegionEditDialog.tsx#L97) | 更新場地預設及今天起可調整的未來場次；先預覽再確認。 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | VenueRegionEditDialog · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-12d513a524f1<br>[components/recurring-operations/VenueRegionEditDialog.tsx:103:13](../../components/recurring-operations/VenueRegionEditDialog.tsx#L103) | 固定安排縣市編輯準備中，完成雲端啟用後即可使用。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | VenueRegionEditDialog<br>!venueRegionEditEnabled() |
| UI-868a8ed83dbe<br>[components/recurring-operations/VenueRegionEditDialog.tsx:108:14](../../components/recurring-operations/VenueRegionEditDialog.tsx#L108) | ${error} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | VenueRegionEditDialog<br>error |
| UI-7cbd7e329eb9<br>[components/recurring-operations/VenueRegionEditDialog.tsx:117:15](../../components/recurring-operations/VenueRegionEditDialog.tsx#L117) | 完成 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | VenueRegionEditDialog<br>success |
| UI-96dea14a3442<br>[components/recurring-operations/VenueRegionEditDialog.tsx:128:17](../../components/recurring-operations/VenueRegionEditDialog.tsx#L128) | 重新讀取預覽資料 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | VenueRegionEditDialog<br>否則 success → venueRegionEditEnabled() |
| UI-83db9caf5f0c<br>[components/recurring-operations/VenueRegionEditDialog.tsx:133:17](../../components/recurring-operations/VenueRegionEditDialog.tsx#L133) | 正在確認雲端未來場次… | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | VenueRegionEditDialog<br>否則 success → loading |
| UI-0971b246267c<br>[components/recurring-operations/VenueRegionEditDialog.tsx:138:48](../../components/recurring-operations/VenueRegionEditDialog.tsx#L138) | ${preview.name} | **動態文字入口** · 執行時綁定入口<br>h3 接收執行時文字；內容需追查所列綁定與生產端 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading |
| UI-57f7453fd8ba<br>[components/recurring-operations/VenueRegionEditDialog.tsx:140:19](../../components/recurring-operations/VenueRegionEditDialog.tsx#L140) | 此場地共用於 ${preview.schedules.length}${" "} 個進行中／暫停的固定安排。變更會影響它們之後新產生的場次，不改自由地點文字。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading |
| UI-8ab43ea5f707<br>[components/recurring-operations/VenueRegionEditDialog.tsx:144:19](../../components/recurring-operations/VenueRegionEditDialog.tsx#L144) | 新的縣市 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading |
| UI-9303530a0166<br>[components/recurring-operations/VenueRegionEditDialog.tsx:155:38](../../components/recurring-operations/VenueRegionEditDialog.tsx#L155) | 未分類（清除縣市） | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading |
| UI-103613bbcfc5<br>[components/recurring-operations/VenueRegionEditDialog.tsx:158:26](../../components/recurring-operations/VenueRegionEditDialog.tsx#L158) | ${r.label} | **動態文字入口** · 執行時綁定入口<br>option 接收執行時文字；內容需追查所列綁定與生產端 | VenueRegionEditDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bc982af005b0<br>[components/recurring-operations/VenueRegionEditDialog.tsx:164:19](../../components/recurring-operations/VenueRegionEditDialog.tsx#L164) | 場地預設： | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading |
| UI-db3738573f3a<br>[components/recurring-operations/VenueRegionEditDialog.tsx:164:25](../../components/recurring-operations/VenueRegionEditDialog.tsx#L164) | ${marketRegionLabel(preview.regionCode)} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading |
| UI-db4f9d30bf58<br>[components/recurring-operations/VenueRegionEditDialog.tsx:164:64](../../components/recurring-operations/VenueRegionEditDialog.tsx#L164) | → | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading |
| UI-1c361d712869<br>[components/recurring-operations/VenueRegionEditDialog.tsx:165:20](../../components/recurring-operations/VenueRegionEditDialog.tsx#L165) | ${marketRegionLabel(region)} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading |
| UI-7a5f46426e21<br>[components/recurring-operations/VenueRegionEditDialog.tsx:167:19](../../components/recurring-operations/VenueRegionEditDialog.tsx#L167) | 可更新 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading |
| UI-d007467ea695<br>[components/recurring-operations/VenueRegionEditDialog.tsx:167:45](../../components/recurring-operations/VenueRegionEditDialog.tsx#L167) | 場；保留受保護的 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading |
| UI-e9f884f649ae<br>[components/recurring-operations/VenueRegionEditDialog.tsx:169:19](../../components/recurring-operations/VenueRegionEditDialog.tsx#L169) | 場。過去、單場覆寫、取消／跳過及已有成交、心得、現金或待辦的場次不改。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading |
| UI-77e22d252c17<br>[components/recurring-operations/VenueRegionEditDialog.tsx:177:33](../../components/recurring-operations/VenueRegionEditDialog.tsx#L177) | · | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | VenueRegionEditDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f0d525696f25<br>[components/recurring-operations/VenueRegionEditDialog.tsx:177:36](../../components/recurring-operations/VenueRegionEditDialog.tsx#L177) | ${row.name} | **動態文字入口** · 執行時綁定入口<br>li 接收執行時文字；內容需追查所列綁定與生產端 | VenueRegionEditDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ed133aaab87b<br>[components/recurring-operations/VenueRegionEditDialog.tsx:179:61](../../components/recurring-operations/VenueRegionEditDialog.tsx#L179) | ${marketRegionLabel(row.regionCode)} →${" "} ${marketRegionLabel(region)} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | VenueRegionEditDialog<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-29b68e7487a5<br>[components/recurring-operations/VenueRegionEditDialog.tsx:190:21](../../components/recurring-operations/VenueRegionEditDialog.tsx#L190) | 顯示更多將更新場次 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading → plan.changes.length &gt; limit |
| UI-fa08385ea1ee<br>[components/recurring-operations/VenueRegionEditDialog.tsx:194:19](../../components/recurring-operations/VenueRegionEditDialog.tsx#L194) | 預覽後若有場次、安排或操作紀錄改變，整批會停止，需重新讀取。相關場次的本機未同步變更與私人草稿也須先處理。此操作需要連線。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading |
| UI-989685316764<br>[components/recurring-operations/VenueRegionEditDialog.tsx:204:33](../../components/recurring-operations/VenueRegionEditDialog.tsx#L204) | 更新中… | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading → requestId → busy |
| UI-d304af8b5b7c<br>[components/recurring-operations/VenueRegionEditDialog.tsx:204:42](../../components/recurring-operations/VenueRegionEditDialog.tsx#L204) | 確認更新場地與未來場次 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading → requestId → 否則 busy |
| UI-4241d582d6d8<br>[components/recurring-operations/VenueRegionEditDialog.tsx:214:25](../../components/recurring-operations/VenueRegionEditDialog.tsx#L214) | 返回調整 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading → requestId |
| UI-f47af44ea5cd<br>[components/recurring-operations/VenueRegionEditDialog.tsx:225:23](../../components/recurring-operations/VenueRegionEditDialog.tsx#L225) | 確認以上變更範圍 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | VenueRegionEditDialog<br>否則 success → preview &amp;&amp; plan &amp;&amp; !loading → 否則 requestId |

## lib/analytics/region-analytics.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-0037449babe1<br>[lib/analytics/region-analytics.ts:85:21](../../lib/analytics/region-analytics.ts#L85) | 請選擇有效的起訖日期。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | buildRegionAnalytics<br>!input.ownerId &#124;&#124; !validRegionDate(input.startDate) &#124;&#124; !validRegionDate(input.endDate) &#124;&#124; !validRegionDate(input.today) &#124;&#124; input.startDate &gt; input.endDate |
| UI-d5686d52ddcf<br>[lib/analytics/region-analytics.ts:225:25](../../lib/analytics/region-analytics.ts#L225) | 未識別商品 | **共用文案值** · 文案生產端，須查使用端<br>name：供畫面或訊息組裝使用的標籤／說明值 | details · name<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5e882e4c8f17<br>[lib/analytics/region-analytics.ts:301:21](../../lib/analytics/region-analytics.ts#L301) | 金額超出安全計算範圍。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | buildRegionAnalytics<br>!Number.isSafeInteger(totalRevenueCents) |

## lib/markets/market-region-backfill.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

同檔旗標（不代表每列均受它控制）：`NEXT_PUBLIC_MARKET_REGION_BACKFILL_ENABLED`。

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-5f45046669bf<br>[lib/markets/market-region-backfill.ts:28:21](../../lib/markets/market-region-backfill.ts#L28) | 請選擇 1 至 20 場並指定縣市。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | prepareRegionBackfill<br>selected.length === 0 &#124;&#124; selected.length &gt; 20 |
| UI-bd2a15859305<br>[lib/markets/market-region-backfill.ts:37:25](../../lib/markets/market-region-backfill.ts#L37) | 選擇已變更，請重新讀取未分類清單。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | prepareRegionBackfill<br>!row &#124;&#124; !isMarketRegionCode(code) &#124;&#124; !Number.isFinite(Date.parse(row.updatedAt)) |
| UI-be4de23e1094<br>[lib/markets/market-region-backfill.ts:45:12](../../lib/markets/market-region-backfill.ts#L45) | 預覽後有場次已被修改或分類。這批沒有更新，請重新讀取並確認。 | **來源候選** · 候選，非已證實提示<br>regionBackfillError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | regionBackfillError<br>message.includes("REGION_CONFLICT") |
| UI-705bdd131be6<br>[lib/markets/market-region-backfill.ts:47:12](../../lib/markets/market-region-backfill.ts#L47) | 帳號或場次存取狀態已改變，未更新分類。 | **來源候選** · 候選，非已證實提示<br>regionBackfillError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | regionBackfillError<br>message.includes("REGION_SCOPE") |
| UI-cba0e26ee66a<br>[lib/markets/market-region-backfill.ts:49:12](../../lib/markets/market-region-backfill.ts#L49) | 有選取場次尚未同步，請先完成同步再補填。 | **來源候選** · 候選，非已證實提示<br>regionBackfillError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | regionBackfillError<br>message.includes("REGION_PENDING") |
| UI-b2589d2eab14<br>[lib/markets/market-region-backfill.ts:51:12](../../lib/markets/market-region-backfill.ts#L51) | 目前離線，請連線後再確認補填；選擇仍保留。 | **來源候選** · 候選，非已證實提示<br>regionBackfillError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | regionBackfillError<br>message.includes("REGION_OFFLINE") |
| UI-6fbce3953d61<br>[lib/markets/market-region-backfill.ts:53:10](../../lib/markets/market-region-backfill.ts#L53) | 尚未確認雲端送達，預覽仍保留；請使用同一批重試或重新讀取確認。 | **來源候選** · 候選，非已證實提示<br>regionBackfillError 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | regionBackfillError<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/markets/market-region-rollout.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

同檔旗標（不代表每列均受它控制）：`NEXT_PUBLIC_MARKET_REGION_ENABLED`。

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-8a711da01941<br>[lib/markets/market-region-rollout.ts:16:21](../../lib/markets/market-region-rollout.ts#L16) | 縣市分類尚未開放儲存，請稍後再試；其他市集資料仍可使用 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertMarketRegionWriteReady<br>(updates ? region !== undefined : region != null) &amp;&amp; !isMarketRegionWriteEnabled() |

## lib/markets/market-region.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-fbb02f2ef22f<br>[lib/markets/market-region.ts:3:36](../../lib/markets/market-region.ts#L3) | 臺北市 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9e4f6e8a2bd4<br>[lib/markets/market-region.ts:4:40](../../lib/markets/market-region.ts#L4) | 新北市 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d0d44cecf4de<br>[lib/markets/market-region.ts:5:37](../../lib/markets/market-region.ts#L5) | 基隆市 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0d3cdbe5f290<br>[lib/markets/market-region.ts:6:37](../../lib/markets/market-region.ts#L6) | 桃園市 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0769ba5bfc85<br>[lib/markets/market-region.ts:7:37](../../lib/markets/market-region.ts#L7) | 新竹市 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5bdfb31cbb36<br>[lib/markets/market-region.ts:8:39](../../lib/markets/market-region.ts#L8) | 新竹縣 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6c1a2e9ff2d0<br>[lib/markets/market-region.ts:9:38](../../lib/markets/market-region.ts#L9) | 苗栗縣 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0b4fd295b801<br>[lib/markets/market-region.ts:10:38](../../lib/markets/market-region.ts#L10) | 臺中市 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fd372b279706<br>[lib/markets/market-region.ts:11:40](../../lib/markets/market-region.ts#L11) | 彰化縣 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-13b17d998e6d<br>[lib/markets/market-region.ts:12:38](../../lib/markets/market-region.ts#L12) | 南投縣 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-80ca3c4d32c5<br>[lib/markets/market-region.ts:13:38](../../lib/markets/market-region.ts#L13) | 雲林縣 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8ffd6aea84ab<br>[lib/markets/market-region.ts:14:36](../../lib/markets/market-region.ts#L14) | 嘉義市 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3aaafe49fbc3<br>[lib/markets/market-region.ts:15:38](../../lib/markets/market-region.ts#L15) | 嘉義縣 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-548d623ff9e1<br>[lib/markets/market-region.ts:16:36](../../lib/markets/market-region.ts#L16) | 臺南市 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-12357c1c631a<br>[lib/markets/market-region.ts:17:39](../../lib/markets/market-region.ts#L17) | 高雄市 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5a8f8857aed8<br>[lib/markets/market-region.ts:18:40](../../lib/markets/market-region.ts#L18) | 屏東縣 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-28e7a474eaf0<br>[lib/markets/market-region.ts:19:37](../../lib/markets/market-region.ts#L19) | 宜蘭縣 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9b107bef1348<br>[lib/markets/market-region.ts:20:39](../../lib/markets/market-region.ts#L20) | 花蓮縣 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-af3ee76575bd<br>[lib/markets/market-region.ts:21:39](../../lib/markets/market-region.ts#L21) | 臺東縣 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-27074503adb1<br>[lib/markets/market-region.ts:22:38](../../lib/markets/market-region.ts#L22) | 澎湖縣 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4d6f6a2cda48<br>[lib/markets/market-region.ts:23:38](../../lib/markets/market-region.ts#L23) | 金門縣 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ab1c7c1bf522<br>[lib/markets/market-region.ts:24:42](../../lib/markets/market-region.ts#L24) | 連江縣 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | MARKET_REGIONS · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-86c4ef9818b6<br>[lib/markets/market-region.ts:39:73](../../lib/markets/market-region.ts#L39) | 未分類 | **來源候選** · 候選，非已證實提示<br>marketRegionLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | marketRegionLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e5aa309212aa<br>[lib/markets/market-region.ts:44:41](../../lib/markets/market-region.ts#L44) | 台 | **來源候選** · 候選，非已證實提示<br>label 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b7cc5c9818eb<br>[lib/markets/market-region.ts:44:46](../../lib/markets/market-region.ts#L44) | 臺 | **來源候選** · 候選，非已證實提示<br>label 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b54aef0e6a68<br>[lib/markets/market-region.ts:53:21](../../lib/markets/market-region.ts#L53) | 請選擇有效的縣市，或選擇未分類 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | readMarketRegion<br>!isOptionalMarketRegion(camel) &#124;&#124; !isOptionalMarketRegion(snake) |
| UI-fac12484b105<br>[lib/markets/market-region.ts:56:21](../../lib/markets/market-region.ts#L56) | 縣市欄位不一致，請重新確認 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | readMarketRegion<br>camel !== undefined &amp;&amp; snake !== undefined &amp;&amp; camel !== snake |

## lib/recurring-operations/date-key.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-528ed8661d87<br>[lib/recurring-operations/date-key.ts:19:21](../../lib/recurring-operations/date-key.ts#L19) | ${field} must be a valid YYYY-MM-DD calendar date | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertDateKey<br>!isDateKey(value) |
| UI-a8223e4e62a8<br>[lib/recurring-operations/date-key.ts:30:48](../../lib/recurring-operations/date-key.ts#L30) | days must be an integer | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | addCalendarDays<br>!Number.isInteger(days) |
| UI-c9d59bfc4705<br>[lib/recurring-operations/date-key.ts:56:60](../../lib/recurring-operations/date-key.ts#L56) | instant must be a valid Date | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | toDateKeyInTimeZone<br>!Number.isFinite(instant.getTime()) |
| UI-76608e6a9fef<br>[lib/recurring-operations/date-key.ts:57:51](../../lib/recurring-operations/date-key.ts#L57) | Unsupported time zone: ${timeZone} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | toDateKeyInTimeZone<br>!isValidTimeZone(timeZone) |

## lib/recurring-operations/local-repository.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-662ee84e280e<br>[lib/recurring-operations/local-repository.ts:51:33](../../lib/recurring-operations/local-repository.ts#L51) | Operation schedule not found: ${scheduleId} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | updateOperationSchedule<br>!current |

## lib/recurring-operations/occurrence-identity.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

同檔旗標（不代表每列均受它控制）：`FERIA_RECURRING_OPERATIONS_NAMESPACE`。

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-8cf8c3f23454<br>[lib/recurring-operations/occurrence-identity.ts:13:46](../../lib/recurring-operations/occurrence-identity.ts#L13) | ownerId is required | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | buildScheduleOccurrenceKey<br>!input.ownerId.trim() |
| UI-1e85e21bce7a<br>[lib/recurring-operations/occurrence-identity.ts:14:49](../../lib/recurring-operations/occurrence-identity.ts#L14) | scheduleId is required | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | buildScheduleOccurrenceKey<br>!input.scheduleId.trim() |
| UI-db8bbeaba798<br>[lib/recurring-operations/occurrence-identity.ts:37:68](../../lib/recurring-operations/occurrence-identity.ts#L37) | revision must be a positive integer | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | deriveScheduleReconcileEventId<br>!Number.isInteger(revision) &#124;&#124; revision &lt; 1 |

## lib/recurring-operations/reconciliation.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-655bf7ff476e<br>[lib/recurring-operations/reconciliation.ts:58:85](../../lib/recurring-operations/reconciliation.ts#L58) | outside_schedule | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planScheduleReconciliation · reason<br>market.scheduleId !== scheduleAfter.id &#124;&#124; market.sessionOrigin !== 'schedule' |
| UI-e461a21b31fa<br>[lib/recurring-operations/reconciliation.ts:63:84](../../lib/recurring-operations/reconciliation.ts#L63) | owner_scope_mismatch | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planScheduleReconciliation · reason<br>market.owner_id &amp;&amp; market.owner_id !== scheduleAfter.owner_id |
| UI-1bb06e7fd642<br>[lib/recurring-operations/reconciliation.ts:70:85](../../lib/recurring-operations/reconciliation.ts#L70) | before_effective_date | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planScheduleReconciliation · reason<br>occurrenceDate &lt; effectiveDate |
| UI-ec12d2cdba50<br>[lib/recurring-operations/reconciliation.ts:74:85](../../lib/recurring-operations/reconciliation.ts#L74) | single_occurrence_override | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planScheduleReconciliation · reason<br>market.isScheduleOverride |
| UI-6b9fabf95317<br>[lib/recurring-operations/reconciliation.ts:78:85](../../lib/recurring-operations/reconciliation.ts#L78) | explicitly_skipped | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planScheduleReconciliation · reason<br>market.scheduleOccurrenceState === 'skipped' |
| UI-f99338531290<br>[lib/recurring-operations/reconciliation.ts:82:84](../../lib/recurring-operations/reconciliation.ts#L82) | ongoing_or_completed | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planScheduleReconciliation · reason<br>market.status === 'ongoing' &#124;&#124; market.status === 'completed' |
| UI-deed6f15f646<br>[lib/recurring-operations/reconciliation.ts:86:84](../../lib/recurring-operations/reconciliation.ts#L86) | user_activity_present | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planScheduleReconciliation · reason<br>hasScheduleMarketUserActivity(activityByMarketId[market.id]) |
| UI-3fb9ea2f8afd<br>[lib/recurring-operations/reconciliation.ts:92:87](../../lib/recurring-operations/reconciliation.ts#L92) | already_current | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planScheduleReconciliation · reason<br>scheduleAfter.status !== 'active' → market.scheduleOccurrenceState === 'suppressed' |
| UI-75e5bff1118d<br>[lib/recurring-operations/reconciliation.ts:101:87](../../lib/recurring-operations/reconciliation.ts#L101) | already_current | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planScheduleReconciliation · reason<br>!targetSet.has(occurrenceDate) → market.scheduleOccurrenceState === 'rule_removed' |
| UI-2c5debd1dceb<br>[lib/recurring-operations/reconciliation.ts:113:85](../../lib/recurring-operations/reconciliation.ts#L113) | already_current | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>reason：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | planScheduleReconciliation · reason<br>否則 market.scheduleOccurrenceState === 'suppressed' &#124;&#124; market.scheduleOccurrenceState === 'rule_removed' → 否則 market.scheduleRevision !== scheduleAfter.revision |

## lib/recurring-operations/schedule-operations.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-8de1b2a63a1b<br>[lib/recurring-operations/schedule-operations.ts:28:21](../../lib/recurring-operations/schedule-operations.ts#L28) | Owner authorization is required for schedule occurrence changes | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertOwnerAuthorization<br>!authorization.isOwner &#124;&#124; !authorization.ownerId &#124;&#124; schedule.owner_id !== authorization.ownerId |
| UI-72782b790205<br>[lib/recurring-operations/schedule-operations.ts:107:21](../../lib/recurring-operations/schedule-operations.ts#L107) | Active venue not found for schedule ${scheduleAfter.id} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | reconcileScheduleSnapshots<br>!venue &#124;&#124; venue.owner_id !== scheduleAfter.owner_id |
| UI-e6dca2c7eed3<br>[lib/recurring-operations/schedule-operations.ts:146:34](../../lib/recurring-operations/schedule-operations.ts#L146) | Scheduled Market not found: ${action.marketId} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | reconcileScheduleSnapshots<br>!market |
| UI-a353d0033432<br>[lib/recurring-operations/schedule-operations.ts:166:83](../../lib/recurring-operations/schedule-operations.ts#L166) | Scheduled Market not found | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | skipScheduledOccurrence<br>!market?.scheduleId &#124;&#124; market.sessionOrigin !== 'schedule' |
| UI-a9932aff6270<br>[lib/recurring-operations/schedule-operations.ts:168:34](../../lib/recurring-operations/schedule-operations.ts#L168) | Operation schedule not found | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | skipScheduledOccurrence<br>!schedule |
| UI-7f9b509d7400<br>[lib/recurring-operations/schedule-operations.ts:170:85](../../lib/recurring-operations/schedule-operations.ts#L170) | Active or completed occurrence cannot be skipped | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | skipScheduledOccurrence<br>market.status === 'ongoing' &#124;&#124; market.status === 'completed' |
| UI-e5d4ed29af5f<br>[lib/recurring-operations/schedule-operations.ts:172:43](../../lib/recurring-operations/schedule-operations.ts#L172) | Occurrence with user activity cannot be skipped | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | skipScheduledOccurrence<br>activity[marketId] |
| UI-bf596b926c22<br>[lib/recurring-operations/schedule-operations.ts:189:21](../../lib/recurring-operations/schedule-operations.ts#L189) | Skipped scheduled Market not found | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | restoreSkippedScheduledOccurrence<br>!market?.scheduleId &#124;&#124; market.sessionOrigin !== 'schedule' &#124;&#124; market.scheduleOccurrenceState !== 'skipped' &#124;&#124; market.status !== 'cancelled' |
| UI-398f2ea6628f<br>[lib/recurring-operations/schedule-operations.ts:192:34](../../lib/recurring-operations/schedule-operations.ts#L192) | Operation schedule not found | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | restoreSkippedScheduledOccurrence<br>!schedule |
| UI-0882ebea7a4a<br>[lib/recurring-operations/schedule-operations.ts:195:21](../../lib/recurring-operations/schedule-operations.ts#L195) | Operation schedule must be active before restoring an occurrence | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | restoreSkippedScheduledOccurrence<br>schedule.status !== 'active' |
| UI-dbffa8ebfa47<br>[lib/recurring-operations/schedule-operations.ts:200:52](../../lib/recurring-operations/schedule-operations.ts#L200) | Past occurrence cannot be restored | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | restoreSkippedScheduledOccurrence<br>localOccurrenceDate &lt; today |
| UI-b6f7bd36efc4<br>[lib/recurring-operations/schedule-operations.ts:202:21](../../lib/recurring-operations/schedule-operations.ts#L202) | Occurrence no longer matches the active schedule | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | restoreSkippedScheduledOccurrence<br>!calculateWeeklyOccurrences(schedule, localOccurrenceDate, localOccurrenceDate).includes(localOccurrenceDate) |
| UI-9913a1892620<br>[lib/recurring-operations/schedule-operations.ts:206:43](../../lib/recurring-operations/schedule-operations.ts#L206) | Occurrence with user activity cannot be restored | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | restoreSkippedScheduledOccurrence<br>activity[marketId] |
| UI-2b310077d1bb<br>[lib/recurring-operations/schedule-operations.ts:215:23](../../lib/recurring-operations/schedule-operations.ts#L215) | Active venue not found for restored occurrence | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | restoreSkippedScheduledOccurrence<br>!market.isScheduleOverride → !venue &#124;&#124; venue.owner_id !== schedule.owner_id &#124;&#124; venue.status !== 'active' &#124;&#124; venue.isDeleted |
| UI-2da74d0476a8<br>[lib/recurring-operations/schedule-operations.ts:235:40](../../lib/recurring-operations/schedule-operations.ts#L235) | Operation schedule not found | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | reviseOperationScheduleFromDate<br>!scheduleBefore |
| UI-1c9ff7edb5ec<br>[lib/recurring-operations/schedule-operations.ts:255:40](../../lib/recurring-operations/schedule-operations.ts#L255) | Operation schedule not found | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | changeOperationScheduleStatus<br>!scheduleBefore |

## lib/recurring-operations/scheduled-market-materializer.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-8d67d9c7ece1<br>[lib/recurring-operations/scheduled-market-materializer.ts:33:21](../../lib/recurring-operations/scheduled-market-materializer.ts#L33) | Venue owner mismatch for schedule ${schedule.id} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | buildScheduledMarketPayload<br>venue.owner_id !== schedule.owner_id |
| UI-c1957eee2133<br>[lib/recurring-operations/scheduled-market-materializer.ts:98:21](../../lib/recurring-operations/scheduled-market-materializer.ts#L98) | Owner authorization is required to materialize scheduled markets | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | ensureScheduledMarkets<br>!options.isOwner &#124;&#124; !options.ownerId.trim() |
| UI-cd0070af0acd<br>[lib/recurring-operations/scheduled-market-materializer.ts:118:17](../../lib/recurring-operations/scheduled-market-materializer.ts#L118) | active venue not found in owner scope | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | ensureScheduledMarkets · reason<br>!venue &#124;&#124; venue.status !== 'active' &#124;&#124; venue.isDeleted |
| UI-6005393fbcba<br>[lib/recurring-operations/scheduled-market-materializer.ts:137:84](../../lib/recurring-operations/scheduled-market-materializer.ts#L137) | deterministic market id collision | **共用文案值** · 文案生產端，須查使用端<br>reason：供畫面或訊息組裝使用的標籤／說明值 | ensureScheduledMarkets · reason<br>existing → 否則 isMatchingMaterializedMarket(existing, occurrenceKey) |

## lib/recurring-operations/validation.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-96f7ead70a02<br>[lib/recurring-operations/validation.ts:50:21](../../lib/recurring-operations/validation.ts#L50) | Invalid operation schedule: ${issues.map(issue =&gt; &#96;${issue.field}:${issue.code}&#96;).join(', ')} | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertValidOperationSchedule<br>issues.length &gt; 0 |
| UI-56e4394330e9<br>[lib/recurring-operations/validation.ts:50:109](../../lib/recurring-operations/validation.ts#L50) | , | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | assertValidOperationSchedule<br>issues.length &gt; 0 |

## lib/supabase/market-region-backfill.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-bcb24439360f<br>[lib/supabase/market-region-backfill.ts:20:21](../../lib/supabase/market-region-backfill.ts#L20) | REGION_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | identity<br>error &#124;&#124; data.session?.user.id !== ownerId |
| UI-888adf33244f<br>[lib/supabase/market-region-backfill.ts:26:21](../../lib/supabase/market-region-backfill.ts#L26) | REGION_OFFLINE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | listRegionCandidates<br>!getNetworkPort().getCurrentStatus().connected |
| UI-3442be39405c<br>[lib/supabase/market-region-backfill.ts:57:23](../../lib/supabase/market-region-backfill.ts#L57) | 請先在市集清單分段整理；目前未分類場次超過清單上限。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | listRegionCandidates<br>result.length &gt; 2000 |
| UI-aaa0dd6da7ea<br>[lib/supabase/market-region-backfill.ts:62:56](../../lib/supabase/market-region-backfill.ts#L62) | REGION_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | listRegionCandidates<br>epoch !== regionBackfillEpoch() |
| UI-51813f637600<br>[lib/supabase/market-region-backfill.ts:70:49](../../lib/supabase/market-region-backfill.ts#L70) | 請先完成縣市補填的雲端啟用。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | saveRegionBackfill<br>!regionBackfillEnabled() |
| UI-b75f992cae09<br>[lib/supabase/market-region-backfill.ts:72:21](../../lib/supabase/market-region-backfill.ts#L72) | REGION_OFFLINE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | saveRegionBackfill<br>!getNetworkPort().getCurrentStatus().connected |
| UI-b0543633938b<br>[lib/supabase/market-region-backfill.ts:83:36](../../lib/supabase/market-region-backfill.ts#L83) | REGION_PENDING | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | saveRegionBackfill<br>pending &gt; 0 |
| UI-0e1c3933760d<br>[lib/supabase/market-region-backfill.ts:92:56](../../lib/supabase/market-region-backfill.ts#L92) | REGION_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | saveRegionBackfill<br>epoch !== regionBackfillEpoch() |
| UI-29b958e4672c<br>[lib/supabase/market-region-backfill.ts:111:21](../../lib/supabase/market-region-backfill.ts#L111) | REGION_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | saveRegionBackfill<br>!Array.isArray(rows) &#124;&#124; rows.length !== items.length &#124;&#124; new Set(rows.map((r) =&gt; r.id)).size !== ids.size &#124;&#124; rows.some( (r) =&gt; r.ownerId !== ownerId &#124;&#124; !ids.has(r.id) &#124;&#124; (r.regionCode !== null &amp;&amp; !isMarketRegionCode(r.regionCode)), ) |
| UI-545923b58248<br>[lib/supabase/market-region-backfill.ts:113:58](../../lib/supabase/market-region-backfill.ts#L113) | REGION_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | saveRegionBackfill<br>epoch !== regionBackfillEpoch() |
