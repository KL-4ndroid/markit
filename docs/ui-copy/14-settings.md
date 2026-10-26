# 設定與外觀：提示與介面文字

> 自動產生；請勿手動修改。重新產生：`node scripts/generate-ui-copy-inventory.mjs`。
> [總索引](../APP_UI_COPY_INDEX.md) · [完整 JSON](inventory.json) · [逐檔覆蓋](coverage.md)

共 192 筆來源位置；同字不同出處分開記錄。這是來源盤點，候選與未啟用分支不算已上線功能。

## app/settings/app/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-a97d2b2f928a<br>[app/settings/app/page.tsx:27:68](../../app/settings/app/page.tsx#L27) | 版本 ${APP_METADATA.versionLabel} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | versionContent<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e47fc27ed639<br>[app/settings/app/page.tsx:34:13](../../app/settings/app/page.tsx#L34) | App 與版本 | **畫面文字** · 直接呈現定義<br>SettingsPageShell：呈現操作說明、資料標籤、狀態或注意事項 | AppSettingsPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-19c473cf0934<br>[app/settings/app/page.tsx:35:19](../../app/settings/app/page.tsx#L35) | 管理主畫面安裝，並查看目前使用的版本與產品資訊。 | **畫面文字** · 直接呈現定義<br>SettingsPageShell：呈現操作說明、資料標籤、狀態或注意事項 | AppSettingsPage · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b36f89e4434e<br>[app/settings/app/page.tsx:51:116](../../app/settings/app/page.tsx#L51) | 市集文字解析實驗室 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AppSettingsPage<br>isOwner |
| UI-de5d7351c042<br>[app/settings/app/page.tsx:52:76](../../app/settings/app/page.tsx#L52) | 測試文字解析與人工判讀，不會建立市集 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AppSettingsPage<br>isOwner |
| UI-3660e11538e4<br>[app/settings/app/page.tsx:69:74](../../app/settings/app/page.tsx#L69) | 關於 Féria | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | AppSettingsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-86e1063235f3<br>[app/settings/app/page.tsx:76:40](../../app/settings/app/page.tsx#L76) | 支援中心 | **畫面文字** · 直接呈現定義<br>section：呈現操作說明、資料標籤、狀態或注意事項 | AppSettingsPage · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-36a491d6ea7d<br>[app/settings/app/page.tsx:77:40](../../app/settings/app/page.tsx#L77) | 隱私政策 | **畫面文字** · 直接呈現定義<br>section：呈現操作說明、資料標籤、狀態或注意事項 | AppSettingsPage · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2bab2c881bab<br>[app/settings/app/page.tsx:78:38](../../app/settings/app/page.tsx#L78) | 服務條款 | **畫面文字** · 直接呈現定義<br>section：呈現操作說明、資料標籤、狀態或注意事項 | AppSettingsPage · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-878c478b1a62<br>[app/settings/app/page.tsx:88:79](../../app/settings/app/page.tsx#L88) | ${item.label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | AppSettingsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## app/settings/page.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-6c629ba2879f<br>[app/settings/page.tsx:49:46](../../app/settings/page.tsx#L49) | 個人化 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | settingsIndexItems · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fd54e9727fea<br>[app/settings/page.tsx:54:9](../../app/settings/page.tsx#L54) | Manager 管理員 | **來源候選** · 候選，非已證實提示<br>roleLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | roleLabel<br>isStaff → userRole.staffRole === 'manager' |
| UI-3aebb4bed2e8<br>[app/settings/page.tsx:56:11](../../app/settings/page.tsx#L56) | Operator 現場紀錄 | **來源候選** · 候選，非已證實提示<br>roleLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | roleLabel<br>isStaff → 否則 userRole.staffRole === 'manager' → userRole.staffRole === 'operator' |
| UI-92c1aca7e338<br>[app/settings/page.tsx:57:11](../../app/settings/page.tsx#L57) | Viewer 檢視 | **來源候選** · 候選，非已證實提示<br>roleLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | roleLabel<br>isStaff → 否則 userRole.staffRole === 'manager' → 否則 userRole.staffRole === 'operator' |
| UI-ead008193b06<br>[app/settings/page.tsx:58:7](../../app/settings/page.tsx#L58) | 老闆 | **來源候選** · 候選，非已證實提示<br>roleLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | roleLabel<br>否則 isStaff |
| UI-248a6f551a4c<br>[app/settings/page.tsx:62:13](../../app/settings/page.tsx#L62) | 更多 | **畫面文字** · 直接呈現定義<br>SettingsPageShell：呈現操作說明、資料標籤、狀態或注意事項 | SettingsPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0af8366152ea<br>[app/settings/page.tsx:63:19](../../app/settings/page.tsx#L63) | 帳號、團隊、營業偏好與系統工具都集中在這裡。 | **畫面文字** · 直接呈現定義<br>SettingsPageShell：呈現操作說明、資料標籤、狀態或注意事項 | SettingsPage · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c51d78d85b76<br>[app/settings/page.tsx:72:93](../../app/settings/page.tsx#L72) | 尚未登入 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SettingsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7fad64330782<br>[app/settings/page.tsx:73:65](../../app/settings/page.tsx#L73) | 目前身分：${roleLabel} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SettingsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-659f435acd8a<br>[app/settings/page.tsx:76:26](../../app/settings/page.tsx#L76) | 團隊模式 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SettingsPage<br>isStaff |
| UI-49ec541619f5<br>[app/settings/page.tsx:76:35](../../app/settings/page.tsx#L76) | 營運者 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | SettingsPage<br>否則 isStaff |
| UI-aff7cf32e8f4<br>[app/settings/page.tsx:80:70](../../app/settings/page.tsx#L80) | 設定分類 | **輔助辨識** · 直接呈現定義<br>提供 nav 的讀屏名稱、圖片替代文字或滑入說明 | SettingsPage · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-24b2cfbef970<br>[app/settings/page.tsx:87:18](../../app/settings/page.tsx#L87) | ${item.label} | **動態文字入口** · 執行時綁定入口<br>a 接收執行時文字；內容需追查所列綁定與生產端 | SettingsPage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d1ecf981150a<br>[app/settings/page.tsx:98:63](../../app/settings/page.tsx#L98) | 訂閱方案 | **畫面文字** · 直接呈現定義<br>SettingsSection：呈現操作說明、資料標籤、狀態或注意事項 | SettingsPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-adc547894b2d<br>[app/settings/page.tsx:99:59](../../app/settings/page.tsx#L99) | 目前方案與功能 | **畫面文字** · 直接呈現定義<br>SettingsMenuRow：呈現操作說明、資料標籤、狀態或注意事項 | SettingsPage · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f52995420f8d<br>[app/settings/page.tsx:99:81](../../app/settings/page.tsx#L99) | 免費、輕量與高階版的功能範圍 | **畫面文字** · 直接呈現定義<br>SettingsMenuRow：呈現操作說明、資料標籤、狀態或注意事項 | SettingsPage · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2ea793a8e241<br>[app/settings/page.tsx:101:66](../../app/settings/page.tsx#L101) | 個人化 | **畫面文字** · 直接呈現定義<br>SettingsSection：呈現操作說明、資料標籤、狀態或注意事項 | SettingsPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-68cdde6a447a<br>[app/settings/page.tsx:103:23](../../app/settings/page.tsx#L103) | 主題實驗室 | **畫面文字** · 直接呈現定義<br>SettingsActionRow：呈現操作說明、資料標籤、狀態或注意事項 | SettingsPage · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0ae039187e9b<br>[app/settings/page.tsx:104:29](../../app/settings/page.tsx#L104) | 自由調整全 App 配色，並儲存在這台裝置 | **畫面文字** · 直接呈現定義<br>SettingsActionRow：呈現操作說明、資料標籤、狀態或注意事項 | SettingsPage · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-96b9c75bbd64<br>[app/settings/page.tsx:111:82](../../app/settings/page.tsx#L111) | ${group.label} | **動態文字入口** · 執行時綁定入口<br>SettingsSection 接收執行時文字；內容需追查所列綁定與生產端 | SettingsPage · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/settings/DataCanonicalizationPanel.tsx

僅由測試／工具頁靜態引用

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-65b5101a18e7<br>[components/settings/DataCanonicalizationPanel.tsx:23:16](../../components/settings/DataCanonicalizationPanel.tsx#L23) | ${progress.message} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | ProgressBar<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-260dae72cacc<br>[components/settings/DataCanonicalizationPanel.tsx:24:27](../../components/settings/DataCanonicalizationPanel.tsx#L24) | ${percentage}% | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ProgressBar<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-00a8f2cf4f50<br>[components/settings/DataCanonicalizationPanel.tsx:40:54](../../components/settings/DataCanonicalizationPanel.tsx#L40) | 掃描事件 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SummaryGrid<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b5ab10f0353c<br>[components/settings/DataCanonicalizationPanel.tsx:44:54](../../components/settings/DataCanonicalizationPanel.tsx#L44) | 需整理事件 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SummaryGrid<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f69ae5bcc635<br>[components/settings/DataCanonicalizationPanel.tsx:48:54](../../components/settings/DataCanonicalizationPanel.tsx#L48) | 掃描統計 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SummaryGrid<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-822e8c4e431b<br>[components/settings/DataCanonicalizationPanel.tsx:52:54](../../components/settings/DataCanonicalizationPanel.tsx#L52) | 需整理統計 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | SummaryGrid<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2263dcfb1ee6<br>[components/settings/DataCanonicalizationPanel.tsx:78:21](../../components/settings/DataCanonicalizationPanel.tsx#L78) | 資料格式分析完成 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleAnalyze<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6f09a5c507b1<br>[components/settings/DataCanonicalizationPanel.tsx:81:19](../../components/settings/DataCanonicalizationPanel.tsx#L81) | 資料格式分析失敗，請稍後再試 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleAnalyze<br>catch：操作拋出例外 |
| UI-ef9e3bf630dc<br>[components/settings/DataCanonicalizationPanel.tsx:91:18](../../components/settings/DataCanonicalizationPanel.tsx#L91) | 目前沒有需要整理的資料 | **確認／通知** · 直接呈現定義<br>toast.info：提示操作結果、進度或要求使用者確認 | handleRun<br>!hasChanges |
| UI-b82f19581c37<br>[components/settings/DataCanonicalizationPanel.tsx:112:23](../../components/settings/DataCanonicalizationPanel.tsx#L112) | 資料格式已整理，但仍有健康檢查錯誤需要處理 | **確認／通知** · 直接呈現定義<br>toast.warning：提示操作結果、進度或要求使用者確認 | confirmRun<br>nextResult.integrityErrors.length &gt; 0 |
| UI-c2716ead6f29<br>[components/settings/DataCanonicalizationPanel.tsx:114:23](../../components/settings/DataCanonicalizationPanel.tsx#L114) | 資料格式整理完成 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | confirmRun<br>否則 nextResult.integrityErrors.length &gt; 0 |
| UI-2e680c9e95c3<br>[components/settings/DataCanonicalizationPanel.tsx:118:19](../../components/settings/DataCanonicalizationPanel.tsx#L118) | 資料格式整理失敗，請稍後再試 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | confirmRun<br>catch：操作拋出例外 |
| UI-7bd6b31cae02<br>[components/settings/DataCanonicalizationPanel.tsx:131:65](../../components/settings/DataCanonicalizationPanel.tsx#L131) | 本機資料格式整理 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | DataCanonicalizationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-48db94937734<br>[components/settings/DataCanonicalizationPanel.tsx:133:13](../../components/settings/DataCanonicalizationPanel.tsx#L133) | 將舊格式事件整理成目前穩定格式，例如補齊 market_id、eventId、dealDate、totalAmount 等相容欄位。 此工具只整理本機資料，不修改雲端，不刪除事件。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d08f3c78c8c2<br>[components/settings/DataCanonicalizationPanel.tsx:142:11](../../components/settings/DataCanonicalizationPanel.tsx#L142) | 安全規則 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-174e120d0960<br>[components/settings/DataCanonicalizationPanel.tsx:145:15](../../components/settings/DataCanonicalizationPanel.tsx#L145) | 先分析，再執行。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-876b0ca07c76<br>[components/settings/DataCanonicalizationPanel.tsx:146:15](../../components/settings/DataCanonicalizationPanel.tsx#L146) | 執行前會建立本機備份。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d0b525f1b149<br>[components/settings/DataCanonicalizationPanel.tsx:147:15](../../components/settings/DataCanonicalizationPanel.tsx#L147) | 保留舊欄位，只補齊穩定欄位。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d3023da3ff7b<br>[components/settings/DataCanonicalizationPanel.tsx:148:15](../../components/settings/DataCanonicalizationPanel.tsx#L148) | 不重算收入、不刪除 events、不寫入 Supabase。 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-44a36e38a102<br>[components/settings/DataCanonicalizationPanel.tsx:156:62](../../components/settings/DataCanonicalizationPanel.tsx#L156) | 需要留意的資料 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel<br>plan &amp;&amp; plan.issues.length &gt; 0 |
| UI-6d5857b07536<br>[components/settings/DataCanonicalizationPanel.tsx:160:30](../../components/settings/DataCanonicalizationPanel.tsx#L160) | ${issue.table}[${String(issue.id)}] - ${issue.message} | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9adfeac6de7e<br>[components/settings/DataCanonicalizationPanel.tsx:163:44](../../components/settings/DataCanonicalizationPanel.tsx#L163) | 還有 ${plan.issues.length - 8} 項 | **畫面文字** · 直接呈現定義<br>li：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel<br>plan &amp;&amp; plan.issues.length &gt; 0 → plan.issues.length &gt; 8 |
| UI-e955d60dc1e5<br>[components/settings/DataCanonicalizationPanel.tsx:174:13](../../components/settings/DataCanonicalizationPanel.tsx#L174) | 整理完成 | **畫面文字** · 直接呈現定義<br>div：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel<br>result |
| UI-25fede7f4c5e<br>[components/settings/DataCanonicalizationPanel.tsx:177:13](../../components/settings/DataCanonicalizationPanel.tsx#L177) | 已整理 ${result.changes.events} 筆事件、${result.changes.dailyStats} 筆統計。 ${result.integrityErrors.length === 0 ? ' 資料健康檢查沒有阻塞錯誤。' : &#96; 仍有 ${result.integrityErrors.length} 個錯誤需處理。&#96;} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel<br>result |
| UI-91da4c9cc69b<br>[components/settings/DataCanonicalizationPanel.tsx:178:52](../../components/settings/DataCanonicalizationPanel.tsx#L178) | 資料健康檢查沒有阻塞錯誤。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel<br>result → result.integrityErrors.length === 0 |
| UI-7278b6291288<br>[components/settings/DataCanonicalizationPanel.tsx:178:71](../../components/settings/DataCanonicalizationPanel.tsx#L178) | 仍有 ${result.integrityErrors.length} 個錯誤需處理。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel<br>result → 否則 result.integrityErrors.length === 0 |
| UI-7264342b9e1d<br>[components/settings/DataCanonicalizationPanel.tsx:182:15](../../components/settings/DataCanonicalizationPanel.tsx#L182) | 健康檢查另有 ${result.integrityWarnings.length} 個提醒，通常是舊資料或視角資料相容訊息。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel<br>result → result.integrityWarnings.length &gt; 0 |
| UI-c99dd9add710<br>[components/settings/DataCanonicalizationPanel.tsx:196:11](../../components/settings/DataCanonicalizationPanel.tsx#L196) | 分析資料格式 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DataCanonicalizationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3ea7a84d1c13<br>[components/settings/DataCanonicalizationPanel.tsx:205:11](../../components/settings/DataCanonicalizationPanel.tsx#L205) | 執行格式整理 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | DataCanonicalizationPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7b9dee7da8a7<br>[components/settings/DataCanonicalizationPanel.tsx:213:15](../../components/settings/DataCanonicalizationPanel.tsx#L213) | 整理這台裝置的資料格式？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-162f365e8c13<br>[components/settings/DataCanonicalizationPanel.tsx:214:21](../../components/settings/DataCanonicalizationPanel.tsx#L214) | 系統會先建立本機備份，再整理 IndexedDB 內的事件與統計欄位；不會修改雲端資料，也不會刪除 events。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d34de3b8effb<br>[components/settings/DataCanonicalizationPanel.tsx:215:22](../../components/settings/DataCanonicalizationPanel.tsx#L215) | 開始整理 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | DataCanonicalizationPanel · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/settings/InteractionSettingsPanel.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-becac665b609<br>[components/settings/InteractionSettingsPanel.tsx:22:23](../../components/settings/InteractionSettingsPanel.tsx#L22) | 有興趣 | **來源候選** · 候選，非已證實提示<br>STAGE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | STAGE_LABELS<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-80790311b72a<br>[components/settings/InteractionSettingsPanel.tsx:22:30](../../components/settings/InteractionSettingsPanel.tsx#L22) | 有互動 | **來源候選** · 候選，非已證實提示<br>STAGE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | STAGE_LABELS<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c0b524d35bc4<br>[components/settings/InteractionSettingsPanel.tsx:22:37](../../components/settings/InteractionSettingsPanel.tsx#L22) | 轉換 | **來源候選** · 候選，非已證實提示<br>STAGE_LABELS 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | STAGE_LABELS<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-72d2532e9ee8<br>[components/settings/InteractionSettingsPanel.tsx:45:19](../../components/settings/InteractionSettingsPanel.tsx#L45) | 已重置互動記錄設定 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | confirmReset<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c9eef2cf7ea8<br>[components/settings/InteractionSettingsPanel.tsx:55:99](../../components/settings/InteractionSettingsPanel.tsx#L55) | 互動記錄 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | InteractionSettingsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a25648ac88d6<br>[components/settings/InteractionSettingsPanel.tsx:57:13](../../components/settings/InteractionSettingsPanel.tsx#L57) | 設定現場快速記錄顧客反應的三個按鈕。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | InteractionSettingsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f72eb2884a27<br>[components/settings/InteractionSettingsPanel.tsx:64:61](../../components/settings/InteractionSettingsPanel.tsx#L64) | 目前互動階段 | **輔助辨識** · 直接呈現定義<br>提供 ol 的讀屏名稱、圖片替代文字或滑入說明 | InteractionSettingsPanel · aria-label<br>isSetupComplete |
| UI-085932ff0d2a<br>[components/settings/InteractionSettingsPanel.tsx:68:94](../../components/settings/InteractionSettingsPanel.tsx#L68) | ${button.label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | InteractionSettingsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3d4395f2a5ac<br>[components/settings/InteractionSettingsPanel.tsx:69:77](../../components/settings/InteractionSettingsPanel.tsx#L69) | ${STAGE_LABELS[index]} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | InteractionSettingsPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-745408458edd<br>[components/settings/InteractionSettingsPanel.tsx:79:15](../../components/settings/InteractionSettingsPanel.tsx#L79) | 重新設定 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | InteractionSettingsPanel<br>isSetupComplete |
| UI-f447632aac2b<br>[components/settings/InteractionSettingsPanel.tsx:87:15](../../components/settings/InteractionSettingsPanel.tsx#L87) | 重置 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | InteractionSettingsPanel<br>isSetupComplete |
| UI-da3f3ad8c10e<br>[components/settings/InteractionSettingsPanel.tsx:93:62](../../components/settings/InteractionSettingsPanel.tsx#L93) | 尚未設定快速互動按鈕 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | InteractionSettingsPanel<br>否則 isSetupComplete |
| UI-52118cc347b4<br>[components/settings/InteractionSettingsPanel.tsx:94:61](../../components/settings/InteractionSettingsPanel.tsx#L94) | 完成設定後，營業畫面會顯示三個快速記錄動作。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | InteractionSettingsPanel<br>否則 isSetupComplete |
| UI-16587c7b714c<br>[components/settings/InteractionSettingsPanel.tsx:96:13](../../components/settings/InteractionSettingsPanel.tsx#L96) | 開始設定 | **畫面文字** · 直接呈現定義<br>Button：辨識可點擊操作、導覽或展開入口 | InteractionSettingsPanel<br>否則 isSetupComplete |
| UI-4afa7201e9be<br>[components/settings/InteractionSettingsPanel.tsx:113:15](../../components/settings/InteractionSettingsPanel.tsx#L113) | 重置互動記錄設定？ | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | InteractionSettingsPanel · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6f9e1995def4<br>[components/settings/InteractionSettingsPanel.tsx:114:21](../../components/settings/InteractionSettingsPanel.tsx#L114) | 目前的三個互動按鈕會恢復為未設定狀態，之後可以重新建立。 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | InteractionSettingsPanel · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4bf4c88bb009<br>[components/settings/InteractionSettingsPanel.tsx:115:22](../../components/settings/InteractionSettingsPanel.tsx#L115) | 重置設定 | **畫面文字** · 直接呈現定義<br>ConfirmDialog：呈現操作說明、資料標籤、狀態或注意事項 | InteractionSettingsPanel · confirmLabel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/settings/InteractionSetupWizard.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-10ed16495e52<br>[components/settings/InteractionSetupWizard.tsx:43:9](../../components/settings/InteractionSetupWizard.tsx#L43) | 你 ﹝主要﹞ 產品是什麼？ | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | renderSelectType<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-613ac08067a1<br>[components/settings/InteractionSetupWizard.tsx:58:67](../../components/settings/InteractionSetupWizard.tsx#L58) | ${type.label} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | renderSelectType<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b662749999cc<br>[components/settings/InteractionSetupWizard.tsx:69:9](../../components/settings/InteractionSetupWizard.tsx#L69) | 我們幫你準備了一組互動方式 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | renderPreview<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ee4dbe9cf85a<br>[components/settings/InteractionSetupWizard.tsx:72:9](../../components/settings/InteractionSetupWizard.tsx#L72) | 記錄顧客從「有興趣」到獲得初步「成果」的過程 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | renderPreview<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5489a0f8cf28<br>[components/settings/InteractionSetupWizard.tsx:85:18](../../components/settings/InteractionSetupWizard.tsx#L85) | ${button.label} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | renderPreview<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9aaf741f14ee<br>[components/settings/InteractionSetupWizard.tsx:101:23](../../components/settings/InteractionSetupWizard.tsx#L101) | 儲存中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | renderPreview<br>isSaving |
| UI-f42a6846dd57<br>[components/settings/InteractionSetupWizard.tsx:101:34](../../components/settings/InteractionSetupWizard.tsx#L101) | 就用這組 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | renderPreview<br>否則 isSaving |
| UI-d85d8a97a8b6<br>[components/settings/InteractionSetupWizard.tsx:109:11](../../components/settings/InteractionSetupWizard.tsx#L109) | 我想調整 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | renderPreview<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-88631414c90a<br>[components/settings/InteractionSetupWizard.tsx:120:47](../../components/settings/InteractionSetupWizard.tsx#L120) | 1 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | renderCustomize1<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6cd33c279d32<br>[components/settings/InteractionSetupWizard.tsx:123:11](../../components/settings/InteractionSetupWizard.tsx#L123) | 第一個：有興趣 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | renderCustomize1<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-89df992e285e<br>[components/settings/InteractionSetupWizard.tsx:126:11](../../components/settings/InteractionSetupWizard.tsx#L126) | 顧客停下來看、拿起、試試看 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | renderCustomize1<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e50972d430fb<br>[components/settings/InteractionSetupWizard.tsx:133:11](../../components/settings/InteractionSetupWizard.tsx#L133) | 代表他對你的商品有興趣 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | renderCustomize1<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8a0e5d0536e5<br>[components/settings/InteractionSetupWizard.tsx:136:11](../../components/settings/InteractionSetupWizard.tsx#L136) | 例如：試吃 / 拿起 / 翻看 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | renderCustomize1<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-722184239cfd<br>[components/settings/InteractionSetupWizard.tsx:145:15](../../components/settings/InteractionSetupWizard.tsx#L145) | 顯示名稱 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | renderCustomize1<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d8f9db4b4ec3<br>[components/settings/InteractionSetupWizard.tsx:161:15](../../components/settings/InteractionSetupWizard.tsx#L161) | 圖示 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | renderCustomize1<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5b2e6f7a55fd<br>[components/settings/InteractionSetupWizard.tsx:184:9](../../components/settings/InteractionSetupWizard.tsx#L184) | 下一個 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | renderCustomize1<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2552b8f6a0a7<br>[components/settings/InteractionSetupWizard.tsx:194:47](../../components/settings/InteractionSetupWizard.tsx#L194) | 2 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | renderCustomize2<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1d56193da7fd<br>[components/settings/InteractionSetupWizard.tsx:197:11](../../components/settings/InteractionSetupWizard.tsx#L197) | 第二個：有互動 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | renderCustomize2<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2c2f6b9d3580<br>[components/settings/InteractionSetupWizard.tsx:200:11](../../components/settings/InteractionSetupWizard.tsx#L200) | 顧客開始跟你說話、問問題 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | renderCustomize2<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2264a887bc2c<br>[components/settings/InteractionSetupWizard.tsx:207:11](../../components/settings/InteractionSetupWizard.tsx#L207) | 代表他有購買或了解的意圖 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | renderCustomize2<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5b3803510c89<br>[components/settings/InteractionSetupWizard.tsx:210:11](../../components/settings/InteractionSetupWizard.tsx#L210) | 例如：詢問價格 / 聊材質 / 問來源 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | renderCustomize2<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a70187d4f783<br>[components/settings/InteractionSetupWizard.tsx:219:15](../../components/settings/InteractionSetupWizard.tsx#L219) | 顯示名稱 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | renderCustomize2<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-26809356a0e0<br>[components/settings/InteractionSetupWizard.tsx:235:15](../../components/settings/InteractionSetupWizard.tsx#L235) | 圖示 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | renderCustomize2<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-09e756285f01<br>[components/settings/InteractionSetupWizard.tsx:258:9](../../components/settings/InteractionSetupWizard.tsx#L258) | 下一個 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | renderCustomize2<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9762f47a201a<br>[components/settings/InteractionSetupWizard.tsx:268:47](../../components/settings/InteractionSetupWizard.tsx#L268) | 3 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | renderCustomize3<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9ef9a58a980d<br>[components/settings/InteractionSetupWizard.tsx:271:11](../../components/settings/InteractionSetupWizard.tsx#L271) | 第三個：轉換 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | renderCustomize3<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d960b0aaf581<br>[components/settings/InteractionSetupWizard.tsx:274:11](../../components/settings/InteractionSetupWizard.tsx#L274) | 顧客完成你想要的下一步 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | renderCustomize3<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8bf78a40c87e<br>[components/settings/InteractionSetupWizard.tsx:281:11](../../components/settings/InteractionSetupWizard.tsx#L281) | 代表關係往前走了一格 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | renderCustomize3<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-719b070fe3c3<br>[components/settings/InteractionSetupWizard.tsx:284:11](../../components/settings/InteractionSetupWizard.tsx#L284) | 例如：加 IG / 加 Line / 留下聯絡 / 加入追蹤 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | renderCustomize3<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-eb6c05b7eb4a<br>[components/settings/InteractionSetupWizard.tsx:289:19](../../components/settings/InteractionSetupWizard.tsx#L289) | 這裡記錄的是「有價值的互動結果」，實際銷售、成交使用「商品交易」功能 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | renderCustomize3<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d8ede5e581d7<br>[components/settings/InteractionSetupWizard.tsx:299:15](../../components/settings/InteractionSetupWizard.tsx#L299) | 顯示名稱 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | renderCustomize3<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-391cc6ac07f4<br>[components/settings/InteractionSetupWizard.tsx:315:15](../../components/settings/InteractionSetupWizard.tsx#L315) | 圖示 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | renderCustomize3<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fbda40a509f9<br>[components/settings/InteractionSetupWizard.tsx:339:21](../../components/settings/InteractionSetupWizard.tsx#L339) | 儲存中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | renderCustomize3<br>isSaving |
| UI-a5835b85fb74<br>[components/settings/InteractionSetupWizard.tsx:339:32](../../components/settings/InteractionSetupWizard.tsx#L339) | 完成設定 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | renderCustomize3<br>否則 isSaving |
| UI-50606769eaed<br>[components/settings/InteractionSetupWizard.tsx:355:23](../../components/settings/InteractionSetupWizard.tsx#L355) | 互動方式已設定完成 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSave<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-48cd103474a8<br>[components/settings/InteractionSetupWizard.tsx:359:19](../../components/settings/InteractionSetupWizard.tsx#L359) | 儲存失敗，請稍後再試 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleSave<br>catch：操作拋出例外 |
| UI-1aebd15a6eea<br>[components/settings/InteractionSetupWizard.tsx:376:13](../../components/settings/InteractionSetupWizard.tsx#L376) | 互動記錄設定 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | InteractionSetupWizard · title<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cc5727e628d3<br>[components/settings/InteractionSetupWizard.tsx:377:19](../../components/settings/InteractionSetupWizard.tsx#L377) | 設定營業畫面的三個快速互動動作 | **畫面文字** · 直接呈現定義<br>AppDialog：呈現操作說明、資料標籤、狀態或注意事項 | InteractionSetupWizard · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-70718d328f05<br>[components/settings/InteractionSetupWizard.tsx:387:11](../../components/settings/InteractionSetupWizard.tsx#L387) | 上一步 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | InteractionSetupWizard<br>step !== 'select-type' |

## components/settings/OwnerBrandSettingsCard.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-e6bf01ef15b1<br>[components/settings/OwnerBrandSettingsCard.tsx:58:19](../../components/settings/OwnerBrandSettingsCard.tsx#L58) | 品牌名稱不可空白 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleSave<br>!user?.id &#124;&#124; !normalizedBrandName |
| UI-69e889f08eb7<br>[components/settings/OwnerBrandSettingsCard.tsx:67:21](../../components/settings/OwnerBrandSettingsCard.tsx#L67) | 品牌名稱已更新 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | handleSave<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c432ce322658<br>[components/settings/OwnerBrandSettingsCard.tsx:70:37](../../components/settings/OwnerBrandSettingsCard.tsx#L70) | 儲存品牌名稱失敗，請稍後再試 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | handleSave<br>catch：操作拋出例外 |
| UI-1ea572e7a30d<br>[components/settings/OwnerBrandSettingsCard.tsx:83:63](../../components/settings/OwnerBrandSettingsCard.tsx#L83) | 品牌名稱 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | OwnerBrandSettingsCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-dd26df6f3061<br>[components/settings/OwnerBrandSettingsCard.tsx:85:32](../../components/settings/OwnerBrandSettingsCard.tsx#L85) | 這個名稱會顯示在首頁與老闆結算報告中。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | OwnerBrandSettingsCard<br>showReportUsage |
| UI-1b2f42be3544<br>[components/settings/OwnerBrandSettingsCard.tsx:85:56](../../components/settings/OwnerBrandSettingsCard.tsx#L85) | 這個名稱會顯示在首頁。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | OwnerBrandSettingsCard<br>否則 showReportUsage |
| UI-828e3014abd1<br>[components/settings/OwnerBrandSettingsCard.tsx:91:9](../../components/settings/OwnerBrandSettingsCard.tsx#L91) | 品牌主顯示名稱 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | OwnerBrandSettingsCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-98b57c6a5deb<br>[components/settings/OwnerBrandSettingsCard.tsx:99:22](../../components/settings/OwnerBrandSettingsCard.tsx#L99) | ${OWNER_BRAND_NAME_FALLBACK} | **動態文字入口** · 執行時綁定入口<br>input 接收執行時文字；內容需追查所列綁定與生產端 | OwnerBrandSettingsCard · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1c7e390fa9de<br>[components/settings/OwnerBrandSettingsCard.tsx:102:28](../../components/settings/OwnerBrandSettingsCard.tsx#L102) | 正在載入雲端設定... | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | OwnerBrandSettingsCard<br>isLoading |
| UI-ec607d2bb532<br>[components/settings/OwnerBrandSettingsCard.tsx:102:44](../../components/settings/OwnerBrandSettingsCard.tsx#L102) | 未設定時會顯示「我的品牌」 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | OwnerBrandSettingsCard<br>否則 isLoading |
| UI-61e15803e40b<br>[components/settings/OwnerBrandSettingsCard.tsx:103:33](../../components/settings/OwnerBrandSettingsCard.tsx#L103) | ${brandName.length}/${OWNER_BRAND_NAME_MAX_LENGTH} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | OwnerBrandSettingsCard<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e8cd8187cafa<br>[components/settings/OwnerBrandSettingsCard.tsx:113:21](../../components/settings/OwnerBrandSettingsCard.tsx#L113) | 儲存中... | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | OwnerBrandSettingsCard<br>isSaving |
| UI-74971d4aae89<br>[components/settings/OwnerBrandSettingsCard.tsx:113:32](../../components/settings/OwnerBrandSettingsCard.tsx#L113) | 儲存品牌名稱 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | OwnerBrandSettingsCard<br>否則 isSaving |

## components/settings/SettingsMenu.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-bac0a9d72db3<br>[components/settings/SettingsMenu.tsx:34:72](../../components/settings/SettingsMenu.tsx#L34) | ${label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SettingsMenuRow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3b285202d656<br>[components/settings/SettingsMenu.tsx:35:81](../../components/settings/SettingsMenu.tsx#L35) | ${description} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SettingsMenuRow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-400547cf33dc<br>[components/settings/SettingsMenu.tsx:58:72](../../components/settings/SettingsMenu.tsx#L58) | ${label} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SettingsActionRow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b40255bb452b<br>[components/settings/SettingsMenu.tsx:59:81](../../components/settings/SettingsMenu.tsx#L59) | ${description} | **動態文字入口** · 執行時綁定入口<br>span 接收執行時文字；內容需追查所列綁定與生產端 | SettingsActionRow<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d93e5af8bcae<br>[components/settings/SettingsMenu.tsx:74:34](../../components/settings/SettingsMenu.tsx#L74) | ${title} | **動態文字入口** · 執行時綁定入口<br>section 接收執行時文字；內容需追查所列綁定與生產端 | SettingsSection · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b71e99bb9b72<br>[components/settings/SettingsMenu.tsx:75:78](../../components/settings/SettingsMenu.tsx#L75) | ${title} | **動態文字入口** · 執行時綁定入口<br>h2 接收執行時文字；內容需追查所列綁定與生產端 | SettingsSection<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8d692b618c1e<br>[components/settings/SettingsMenu.tsx:77:10](../../components/settings/SettingsMenu.tsx#L77) | ${children} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | SettingsSection<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## components/settings/SettingsPageShell.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-05ba92c4d6ce<br>[components/settings/SettingsPageShell.tsx:27:15](../../components/settings/SettingsPageShell.tsx#L27) | 返回更多 | **來源候選** · 候選，非已證實提示<br>SettingsPageShell 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | SettingsPageShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-576c421b342d<br>[components/settings/SettingsPageShell.tsx:38:27](../../components/settings/SettingsPageShell.tsx#L38) | ${backLabel} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | SettingsPageShell · aria-label<br>onBack |
| UI-1fd54860f8c7<br>[components/settings/SettingsPageShell.tsx:39:22](../../components/settings/SettingsPageShell.tsx#L39) | ${backLabel} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | SettingsPageShell · title<br>onBack |
| UI-2eb4228985a6<br>[components/settings/SettingsPageShell.tsx:47:27](../../components/settings/SettingsPageShell.tsx#L47) | ${backLabel} | **動態文字入口** · 執行時綁定入口<br>Link 接收執行時文字；內容需追查所列綁定與生產端 | SettingsPageShell · aria-label<br>否則 onBack → backHref |
| UI-180aa41ab079<br>[components/settings/SettingsPageShell.tsx:48:22](../../components/settings/SettingsPageShell.tsx#L48) | ${backLabel} | **動態文字入口** · 執行時綁定入口<br>Link 接收執行時文字；內容需追查所列綁定與生產端 | SettingsPageShell · title<br>否則 onBack → backHref |
| UI-b17a0a270cde<br>[components/settings/SettingsPageShell.tsx:57:55](../../components/settings/SettingsPageShell.tsx#L57) | ${title} | **動態文字入口** · 執行時綁定入口<br>h1 接收執行時文字；內容需追查所列綁定與生產端 | SettingsPageShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-9bb832a3a652<br>[components/settings/SettingsPageShell.tsx:59:76](../../components/settings/SettingsPageShell.tsx#L59) | ${description} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | SettingsPageShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f32d25d65e30<br>[components/settings/SettingsPageShell.tsx:65:10](../../components/settings/SettingsPageShell.tsx#L65) | ${children} | **動態文字入口** · 執行時綁定入口<br>div 接收執行時文字；內容需追查所列綁定與生產端 | SettingsPageShell<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/settings/settings-navigation.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-c6a55dea6db5<br>[lib/settings/settings-navigation.ts:20:10](../../lib/settings/settings-navigation.ts#L20) | 帳號與同步 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | ACCOUNT_DESTINATION · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-61d29abae677<br>[lib/settings/settings-navigation.ts:21:16](../../lib/settings/settings-navigation.ts#L21) | 登入帳號、同步狀態與登出 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | ACCOUNT_DESTINATION · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0ec1319cfe36<br>[lib/settings/settings-navigation.ts:27:10](../../lib/settings/settings-navigation.ts#L27) | 團隊與權限 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | OWNER_TEAM_DESTINATION · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a3235457e987<br>[lib/settings/settings-navigation.ts:28:16](../../lib/settings/settings-navigation.ts#L28) | 邀請成員並管理每位員工的角色 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | OWNER_TEAM_DESTINATION · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-22266061065e<br>[lib/settings/settings-navigation.ts:34:10](../../lib/settings/settings-navigation.ts#L34) | 團隊與權限 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | STAFF_TEAM_DESTINATION · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-ad50ceacdc80<br>[lib/settings/settings-navigation.ts:35:16](../../lib/settings/settings-navigation.ts#L35) | 查看所屬團隊與目前可用功能 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | STAFF_TEAM_DESTINATION · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bcd4a1b2db96<br>[lib/settings/settings-navigation.ts:41:10](../../lib/settings/settings-navigation.ts#L41) | 銷售與照片 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | SALES_DESTINATION · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d34f57d3f06c<br>[lib/settings/settings-navigation.ts:42:16](../../lib/settings/settings-navigation.ts#L42) | 品牌名稱、成交照片與互動記錄偏好 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | SALES_DESTINATION · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f12735729112<br>[lib/settings/settings-navigation.ts:48:10](../../lib/settings/settings-navigation.ts#L48) | 測試資料工具 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | DATA_DESTINATION · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8c9a32441e78<br>[lib/settings/settings-navigation.ts:49:16](../../lib/settings/settings-navigation.ts#L49) | 僅供測試：資料健康、修復與清除 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | DATA_DESTINATION · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-cfb5e605a924<br>[lib/settings/settings-navigation.ts:55:10](../../lib/settings/settings-navigation.ts#L55) | App 與版本 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | APP_DESTINATION · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a391c93c31ba<br>[lib/settings/settings-navigation.ts:56:16](../../lib/settings/settings-navigation.ts#L56) | 安裝到主畫面、版本與關於 Féria | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | APP_DESTINATION · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-aab90f91b8bb<br>[lib/settings/settings-navigation.ts:59:68](../../lib/settings/settings-navigation.ts#L59) | 市集縣市整理 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | REGIONS_DESTINATION · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b628946c4002<br>[lib/settings/settings-navigation.ts:59:89](../../lib/settings/settings-navigation.ts#L59) | 檢查未分類場次並預覽多筆補填 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | REGIONS_DESTINATION · description<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-2747b467003f<br>[lib/settings/settings-navigation.ts:65:24](../../lib/settings/settings-navigation.ts#L65) | 你的工作空間 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getSettingsDestinationGroups · label<br>isStaff |
| UI-7aeab56f804e<br>[lib/settings/settings-navigation.ts:65:35](../../lib/settings/settings-navigation.ts#L65) | 營運設定 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getSettingsDestinationGroups · label<br>否則 isStaff |
| UI-fabb8492984a<br>[lib/settings/settings-navigation.ts:72:14](../../lib/settings/settings-navigation.ts#L72) | 系統 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | getSettingsDestinationGroups · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/supabase/settings.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-03ddb835b889<br>[lib/supabase/settings.ts:159:20](../../lib/supabase/settings.ts#L159) | 看看 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | initializeUserSettings · label<br>!existing |
| UI-4ae3983385cb<br>[lib/supabase/settings.ts:161:26](../../lib/supabase/settings.ts#L161) | 顧客停下來看、拿起、試試看 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | initializeUserSettings · description<br>!existing |
| UI-d5d98a83af31<br>[lib/supabase/settings.ts:166:20](../../lib/supabase/settings.ts#L166) | 詢問 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | initializeUserSettings · label<br>!existing |
| UI-e4d585eb86c1<br>[lib/supabase/settings.ts:168:26](../../lib/supabase/settings.ts#L168) | 顧客開始跟你說話、問問題 | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | initializeUserSettings · description<br>!existing |
| UI-8dc9f5670e43<br>[lib/supabase/settings.ts:173:20](../../lib/supabase/settings.ts#L173) | 後續聯絡 | **共用文案值** · 文案生產端，須查使用端<br>label：供畫面或訊息組裝使用的標籤／說明值 | initializeUserSettings · label<br>!existing |
| UI-d3771cc4cd11<br>[lib/supabase/settings.ts:175:26](../../lib/supabase/settings.ts#L175) | 顧客完成你想要的行為（建立未來聯繫） | **共用文案值** · 文案生產端，須查使用端<br>description：供畫面或訊息組裝使用的標籤／說明值 | initializeUserSettings · description<br>!existing |

## lib/toast-theme.ts

未追到正式頁面引用（待核對動態接線／保留碼）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-42ef915bf5d0<br>[lib/toast-theme.ts:20:17](../../lib/toast-theme.ts#L20) | ${message} | **動態文字入口** · 執行時綁定入口<br>staffSuccessToast 接收執行時文字；內容需追查所列綁定與生產端 | staffSuccessToast<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5e2bfdd07f85<br>[lib/toast-theme.ts:22:11](../../lib/toast-theme.ts#L22) | 👍 | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | staffSuccessToast · icon<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-abc1b7180930<br>[lib/toast-theme.ts:24:19](../../lib/toast-theme.ts#L24) | linear-gradient(to right, rgb(var(--brand-primary) / 0.8), rgb(var(--brand-primary) / 0.6)) | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | staffSuccessToast · background<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fd83dd067040<br>[lib/toast-theme.ts:25:14](../../lib/toast-theme.ts#L25) | white | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | staffSuccessToast · color<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4406ceedabe8<br>[lib/toast-theme.ts:26:15](../../lib/toast-theme.ts#L26) | none | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | staffSuccessToast · border<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-0107b0bb5748<br>[lib/toast-theme.ts:35:15](../../lib/toast-theme.ts#L35) | ${message} | **動態文字入口** · 執行時綁定入口<br>staffErrorToast 接收執行時文字；內容需追查所列綁定與生產端 | staffErrorToast<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-b452349d2611<br>[lib/toast-theme.ts:37:11](../../lib/toast-theme.ts#L37) | ⚠️ | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | staffErrorToast · icon<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-da1ef07163d4<br>[lib/toast-theme.ts:39:19](../../lib/toast-theme.ts#L39) | rgb(var(--brand-primary) / 0.1) | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | staffErrorToast · background<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-fcd89b7b71e3<br>[lib/toast-theme.ts:40:14](../../lib/toast-theme.ts#L40) | rgb(var(--brand-primary)) | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | staffErrorToast · color<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c79493354d6c<br>[lib/toast-theme.ts:41:15](../../lib/toast-theme.ts#L41) | 1px solid rgb(var(--brand-primary) / 0.2) | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | staffErrorToast · border<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8cdaec57e2f9<br>[lib/toast-theme.ts:49:57](../../lib/toast-theme.ts#L49) | 此功能僅限老闆使用 | **來源候選** · 候選，非已證實提示<br>permissionDeniedToast 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | permissionDeniedToast<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7299d4591649<br>[lib/toast-theme.ts:50:15](../../lib/toast-theme.ts#L50) | ${message} | **動態文字入口** · 執行時綁定入口<br>permissionDeniedToast 接收執行時文字；內容需追查所列綁定與生產端 | permissionDeniedToast<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-847f694173fc<br>[lib/toast-theme.ts:51:11](../../lib/toast-theme.ts#L51) | 🔒 | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | permissionDeniedToast · icon<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-feb52643de96<br>[lib/toast-theme.ts:53:19](../../lib/toast-theme.ts#L53) | rgb(var(--brand-primary) / 0.1) | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | permissionDeniedToast · background<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-35353a3e6964<br>[lib/toast-theme.ts:54:14](../../lib/toast-theme.ts#L54) | rgb(var(--brand-primary)) | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | permissionDeniedToast · color<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d41c9d9f2ada<br>[lib/toast-theme.ts:55:15](../../lib/toast-theme.ts#L55) | 1px solid rgb(var(--brand-primary) / 0.2) | **確認／通知** · 直接呈現定義<br>toast.error：提示操作結果、進度或要求使用者確認 | permissionDeniedToast · border<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a7e9be195dc0<br>[lib/toast-theme.ts:64:17](../../lib/toast-theme.ts#L64) | ${message} | **動態文字入口** · 執行時綁定入口<br>ownerSuccessToast 接收執行時文字；內容需追查所列綁定與生產端 | ownerSuccessToast<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-be633ebfe2ba<br>[lib/toast-theme.ts:66:11](../../lib/toast-theme.ts#L66) | ✅ | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | ownerSuccessToast · icon<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-00cae23ea3f9<br>[lib/toast-theme.ts:68:19](../../lib/toast-theme.ts#L68) | linear-gradient(to right, rgb(var(--brand-primary)), rgb(var(--brand-secondary))) | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | ownerSuccessToast · background<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-68cefdb8d6d8<br>[lib/toast-theme.ts:69:14](../../lib/toast-theme.ts#L69) | white | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | ownerSuccessToast · color<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-aaf14a050107<br>[lib/toast-theme.ts:70:15](../../lib/toast-theme.ts#L70) | none | **確認／通知** · 直接呈現定義<br>toast.success：提示操作結果、進度或要求使用者確認 | ownerSuccessToast · border<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-5fe59d874362<br>[lib/toast-theme.ts:80:23](../../lib/toast-theme.ts#L80) | ${message} | **動態文字入口** · 執行時綁定入口<br>roleBasedSuccessToast 接收執行時文字；內容需追查所列綁定與生產端 | roleBasedSuccessToast<br>isStaff |
| UI-60ffbe5d2190<br>[lib/toast-theme.ts:82:23](../../lib/toast-theme.ts#L82) | ${message} | **動態文字入口** · 執行時綁定入口<br>roleBasedSuccessToast 接收執行時文字；內容需追查所列綁定與生產端 | roleBasedSuccessToast<br>否則 isStaff |
