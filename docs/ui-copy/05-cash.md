# 開收攤現金與差額比較：提示與介面文字

> 自動產生；請勿手動修改。重新產生：`node scripts/generate-ui-copy-inventory.mjs`。
> [總索引](../APP_UI_COPY_INDEX.md) · [完整 JSON](inventory.json) · [逐檔覆蓋](coverage.md)

共 178 筆來源位置；同字不同出處分開記錄。這是來源盤點，候選與未啟用分支不算已上線功能。

## components/markets/CashSalesComparison.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-51885b3d65eb<br>[components/markets/CashSalesComparison.tsx:38:127](../../components/markets/CashSalesComparison.tsx#L38) | 這場成交資料超過比較上限，暫不提供差額；盤點仍可保存。 | **狀態設定** · 文案生產端，須查使用端<br>setError：更新畫面訊息；仍須依呼叫端確認是否被渲染 | refresh<br>catch：操作拋出例外 → generation===request.current → String((e as {message?:string})?.message).includes('CASH_SALES_LIMIT') |
| UI-f60677882383<br>[components/markets/CashSalesComparison.tsx:38:157](../../components/markets/CashSalesComparison.tsx#L38) | 尚未讀到完整雲端成交；請連線後重新讀取。盤點與草稿仍保留。 | **狀態設定** · 文案生產端，須查使用端<br>setError：更新畫面訊息；仍須依呼叫端確認是否被渲染 | refresh<br>catch：操作拋出例外 → generation===request.current → 否則 String((e as {message?:string})?.message).includes('CASH_SALES_LIMIT') |
| UI-04a376cb00c9<br>[components/markets/CashSalesComparison.tsx:47:60](../../components/markets/CashSalesComparison.tsx#L47) | 記錄開攤與收攤現金後，才可比較差額。 | **來源候選** · 候選，非已證實提示<br>differenceLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | differenceLabel<br>model?.difference===null &#124;&#124; !model |
| UI-7fd56abf506d<br>[components/markets/CashSalesComparison.tsx:47:81](../../components/markets/CashSalesComparison.tsx#L47) | 現金差額${complete?'':'（暫估）'}：${model.difference===0?'NT$0（目前記錄相符）':&#96;${model.difference&gt;0?'多出':'短少'} ${formatCashCents(Math.abs(model.difference))}&#96;} | **來源候選** · 候選，非已證實提示<br>differenceLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | differenceLabel<br>否則 model?.difference===null &#124;&#124; !model |
| UI-8cb0c535eeb5<br>[components/markets/CashSalesComparison.tsx:47:100](../../components/markets/CashSalesComparison.tsx#L47) | （暫估） | **來源候選** · 候選，非已證實提示<br>differenceLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | differenceLabel<br>否則 model?.difference===null &#124;&#124; !model → 否則 complete |
| UI-26a83a9e4684<br>[components/markets/CashSalesComparison.tsx:47:131](../../components/markets/CashSalesComparison.tsx#L47) | NT$0（目前記錄相符） | **來源候選** · 候選，非已證實提示<br>differenceLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | differenceLabel<br>否則 model?.difference===null &#124;&#124; !model → model.difference===0 |
| UI-f81c417397ab<br>[components/markets/CashSalesComparison.tsx:47:146](../../components/markets/CashSalesComparison.tsx#L47) | ${model.difference&gt;0?'多出':'短少'} ${formatCashCents(Math.abs(model.difference))} | **來源候選** · 候選，非已證實提示<br>differenceLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | differenceLabel<br>否則 model?.difference===null &#124;&#124; !model → 否則 model.difference===0 |
| UI-be6fe16bab7c<br>[components/markets/CashSalesComparison.tsx:47:168](../../components/markets/CashSalesComparison.tsx#L47) | 多出 | **來源候選** · 候選，非已證實提示<br>differenceLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | differenceLabel<br>否則 model?.difference===null &#124;&#124; !model → 否則 model.difference===0 → model.difference&gt;0 |
| UI-3da5256d38f6<br>[components/markets/CashSalesComparison.tsx:47:173](../../components/markets/CashSalesComparison.tsx#L47) | 短少 | **來源候選** · 候選，非已證實提示<br>differenceLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | differenceLabel<br>否則 model?.difference===null &#124;&#124; !model → 否則 model.difference===0 → 否則 model.difference&gt;0 |
| UI-e87a21b88199<br>[components/markets/CashSalesComparison.tsx:48:30](../../components/markets/CashSalesComparison.tsx#L48) | 現金銷售比較 | **輔助辨識** · 直接呈現定義<br>提供 section 的讀屏名稱、圖片替代文字或滑入說明 | ComparisonWorkspace · aria-label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-30c5ee4f1931<br>[components/markets/CashSalesComparison.tsx:50:37](../../components/markets/CashSalesComparison.tsx#L50) | 現金銷售與差額 | **畫面文字** · 直接呈現定義<br>h3：辨識畫面、區塊或對話框主題 | ComparisonWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8c2264e7d7b1<br>[components/markets/CashSalesComparison.tsx:51:26](../../components/markets/CashSalesComparison.tsx#L51) | 差額怎麼算 | **畫面文字** · 直接呈現定義<br>ContextHelp：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-14701a8bedba<br>[components/markets/CashSalesComparison.tsx:52:12](../../components/markets/CashSalesComparison.tsx#L52) | 現金差額＝實盤收攤現金 −（開攤現金＋已記錄現金銷售＋其他現金進出）。非現金收款不納入現金銷售。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-99aa45cf2fa1<br>[components/markets/CashSalesComparison.tsx:53:12](../../components/markets/CashSalesComparison.tsx#L53) | 其他現金進出只記一個淨額。例如補入找零 1,000 元、拿出 500 元，淨額為補入 500 元。沒有記錄時，比較會假設沒有其他進出。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d28193ea858a<br>[components/markets/CashSalesComparison.tsx:54:12](../../components/markets/CashSalesComparison.tsx#L54) | 雲端讀取只代表該時點已送達的紀錄，不保證其他裝置沒有未送出成交。共用現金盒跨場時，請自行拆分。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f4b67b7cf14a<br>[components/markets/CashSalesComparison.tsx:55:12](../../components/markets/CashSalesComparison.tsx#L55) | 比較不調整營收、庫存或利潤。差額為零只表示目前記錄相符，不代表所有帳務已核對。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c95c3fb3d8c3<br>[components/markets/CashSalesComparison.tsx:59:32](../../components/markets/CashSalesComparison.tsx#L59) | 其他現金進出（選填） | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | ComparisonWorkspace<br>onChange |
| UI-0d8920ce4fcf<br>[components/markets/CashSalesComparison.tsx:59:314](../../components/markets/CashSalesComparison.tsx#L59) | 不記錄，假設沒有其他進出 | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | ComparisonWorkspace<br>onChange |
| UI-ed2bd9ae6a80<br>[components/markets/CashSalesComparison.tsx:59:355](../../components/markets/CashSalesComparison.tsx#L59) | 記錄一個淨額 | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | ComparisonWorkspace<br>onChange |
| UI-0b8be80cd950<br>[components/markets/CashSalesComparison.tsx:61:34](../../components/markets/CashSalesComparison.tsx#L61) | 進出方向 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | ComparisonWorkspace<br>onChange → net |
| UI-96335c985a47<br>[components/markets/CashSalesComparison.tsx:61:337](../../components/markets/CashSalesComparison.tsx#L61) | 補入現金（增加） | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | ComparisonWorkspace<br>onChange → net |
| UI-d18323819e4a<br>[components/markets/CashSalesComparison.tsx:61:374](../../components/markets/CashSalesComparison.tsx#L61) | 拿出／支出／退現（減少） | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | ComparisonWorkspace<br>onChange → net |
| UI-7e56dcea5750<br>[components/markets/CashSalesComparison.tsx:62:34](../../components/markets/CashSalesComparison.tsx#L62) | 現金進出淨額（元） | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | ComparisonWorkspace<br>onChange → net |
| UI-5412f85b27b2<br>[components/markets/CashSalesComparison.tsx:62:326](../../components/markets/CashSalesComparison.tsx#L62) | 例如 500；沒有進出可填 0 | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | ComparisonWorkspace · placeholder<br>onChange → net |
| UI-f1884cf8b64a<br>[components/markets/CashSalesComparison.tsx:63:34](../../components/markets/CashSalesComparison.tsx#L63) | 現金進出備註（選填） | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | ComparisonWorkspace<br>onChange → net |
| UI-3d0be1bd7b47<br>[components/markets/CashSalesComparison.tsx:63:269](../../components/markets/CashSalesComparison.tsx#L63) | 例如：補入找零 1000、拿出 500，淨額為補入 500 | **輸入提示** · 直接呈現定義<br>在 textarea 提供輸入格式、範例或選擇提示 | ComparisonWorkspace · placeholder<br>onChange → net |
| UI-239aaa881b5d<br>[components/markets/CashSalesComparison.tsx:66:59](../../components/markets/CashSalesComparison.tsx#L66) | 比較時假設沒有其他現金進出。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>!net |
| UI-8f2504c493c3<br>[components/markets/CashSalesComparison.tsx:67:79](../../components/markets/CashSalesComparison.tsx#L67) | 現金進出備註：${net.note} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>net?.note &amp;&amp; !onChange |
| UI-c7a008c7a850<br>[components/markets/CashSalesComparison.tsx:68:115](../../components/markets/CashSalesComparison.tsx#L68) | 讀取雲端成交中… | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ComparisonWorkspace<br>loading |
| UI-82b2caa895e2<br>[components/markets/CashSalesComparison.tsx:68:126](../../components/markets/CashSalesComparison.tsx#L68) | 重新讀取現金銷售 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ComparisonWorkspace<br>否則 loading |
| UI-6bb7cdebf252<br>[components/markets/CashSalesComparison.tsx:69:57](../../components/markets/CashSalesComparison.tsx#L69) | ${error} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | ComparisonWorkspace<br>error |
| UI-adc90e72b22d<br>[components/markets/CashSalesComparison.tsx:70:33](../../components/markets/CashSalesComparison.tsx#L70) | 成交來源待確認；以下數字僅供參考，不能據此完成對帳。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>!fresh |
| UI-799f712b3fc2<br>[components/markets/CashSalesComparison.tsx:71:36](../../components/markets/CashSalesComparison.tsx#L71) | 本機尚有 ${pending} 筆成交／撤回資料未確認同步，請先處理同步後重讀。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>pending&gt;0 |
| UI-b2796be7c783<br>[components/markets/CashSalesComparison.tsx:72:62](../../components/markets/CashSalesComparison.tsx#L72) | ${inputError} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | ComparisonWorkspace<br>inputError |
| UI-f29300b5770a<br>[components/markets/CashSalesComparison.tsx:75:18](../../components/markets/CashSalesComparison.tsx#L75) | 已記錄現金銷售 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>model |
| UI-6fb8575ad0b5<br>[components/markets/CashSalesComparison.tsx:76:18](../../components/markets/CashSalesComparison.tsx#L76) | 非現金收款（排除） | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>model |
| UI-f1e33199af4c<br>[components/markets/CashSalesComparison.tsx:77:18](../../components/markets/CashSalesComparison.tsx#L77) | 其他現金進出 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>model |
| UI-53e890f2207a<br>[components/markets/CashSalesComparison.tsx:78:18](../../components/markets/CashSalesComparison.tsx#L78) | 預期收攤現金${complete?'':'（暫估）'} | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>model |
| UI-adc86c764f5c<br>[components/markets/CashSalesComparison.tsx:78:37](../../components/markets/CashSalesComparison.tsx#L78) | （暫估） | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>model → 否則 complete |
| UI-3b26d789afff<br>[components/markets/CashSalesComparison.tsx:78:119](../../components/markets/CashSalesComparison.tsx#L78) | 需先記開攤現金 | **畫面文字** · 直接呈現定義<br>dd：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>model → model.expected===null |
| UI-1f5530ab9a92<br>[components/markets/CashSalesComparison.tsx:80:52](../../components/markets/CashSalesComparison.tsx#L80) | ${differenceLabel} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | ComparisonWorkspace<br>model |
| UI-e19a8f72468d<br>[components/markets/CashSalesComparison.tsx:80:127](../../components/markets/CashSalesComparison.tsx#L80) | 依目前已讀取紀錄比較；不代表所有帳務已核對。 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>model |
| UI-ccd5fcd0ffd0<br>[components/markets/CashSalesComparison.tsx:81:56](../../components/markets/CashSalesComparison.tsx#L81) | 有 ${model.unknownPaymentCount} 筆付款方式為其他／缺漏，尚無法確認現金比例；未納入現金銷售。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>model → model.unknownPaymentCount&gt;0 |
| UI-7d8d3b22a61d<br>[components/markets/CashSalesComparison.tsx:82:55](../../components/markets/CashSalesComparison.tsx#L82) | 有 ${model.invalidAmountCount} 筆金額格式待確認，未納入比較。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>model → model.invalidAmountCount&gt;0 |
| UI-46e0b5be00c7<br>[components/markets/CashSalesComparison.tsx:83:56](../../components/markets/CashSalesComparison.tsx#L83) | 這場另有 ${model.unassignedDateCount} 筆缺少明確營業日期，未自行按裝置時間分配。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>model → model.unassignedDateCount&gt;0 |
| UI-6fa15bc811d4<br>[components/markets/CashSalesComparison.tsx:84:70](../../components/markets/CashSalesComparison.tsx#L84) | 預期收攤金額為負，請檢查現金進出是否重複計入。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>model → model.expected!==null &amp;&amp; model.expected&lt;0 |
| UI-09815c234bcb<br>[components/markets/CashSalesComparison.tsx:85:65](../../components/markets/CashSalesComparison.tsx#L85) | 原比較基準已更新，請重新確認成交、盤點及進出內容。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>model → model.stale |
| UI-8ad2aa008fa8<br>[components/markets/CashSalesComparison.tsx:86:265](../../components/markets/CashSalesComparison.tsx#L86) | 記下目前比較基準 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | ComparisonWorkspace<br>model → onChange |
| UI-882c0ac90f61<br>[components/markets/CashSalesComparison.tsx:88:63](../../components/markets/CashSalesComparison.tsx#L88) | 雲端成交讀取時間： | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>snapshot |
| UI-7463f95bc321<br>[components/markets/CashSalesComparison.tsx:89:70](../../components/markets/CashSalesComparison.tsx#L89) | 比較基準時間： | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>data.salesBasis |
| UI-3e1b27896578<br>[components/markets/CashSalesComparison.tsx:89:164](../../components/markets/CashSalesComparison.tsx#L89) | 。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>data.salesBasis |
| UI-8e260dcad283<br>[components/markets/CashSalesComparison.tsx:89:175](../../components/markets/CashSalesComparison.tsx#L89) | 此基準需隨盤點一起儲存到雲端。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | ComparisonWorkspace<br>data.salesBasis → onChange |

## components/markets/MarketCashPanel.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-d84886f0097e<br>[components/markets/MarketCashPanel.tsx:24:91](../../components/markets/MarketCashPanel.tsx#L24) | 現金紀錄（選填） | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | MarketCashPanel<br>isReview |
| UI-8d2679e050a6<br>[components/markets/MarketCashPanel.tsx:25:49](../../components/markets/MarketCashPanel.tsx#L25) | 開／收攤現金（選填） | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | MarketCashPanel<br>否則 isReview |
| UI-49b9738f0c52<br>[components/markets/MarketCashPanel.tsx:26:61](../../components/markets/MarketCashPanel.tsx#L26) | 收起 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | MarketCashPanel<br>否則 isReview → open |
| UI-55e12888cdd7<br>[components/markets/MarketCashPanel.tsx:26:66](../../components/markets/MarketCashPanel.tsx#L26) | 展開 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | MarketCashPanel<br>否則 isReview → 否則 open |
| UI-609ac12904e9<br>[components/markets/MarketCashPanel.tsx:28:24](../../components/markets/MarketCashPanel.tsx#L28) | 盤點說明 | **畫面文字** · 直接呈現定義<br>ContextHelp：呈現操作說明、資料標籤、狀態或注意事項 | MarketCashPanel · label<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-afa19ec02f6f<br>[components/markets/MarketCashPanel.tsx:29:10](../../components/markets/MarketCashPanel.tsx#L29) | 可略過不記錄；不影響正常開攤與收攤。可以直接填總額，或依面額計算。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MarketCashPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-817a7d7926ac<br>[components/markets/MarketCashPanel.tsx:30:10](../../components/markets/MarketCashPanel.tsx#L30) | 「未記錄」與實際記錄 0 元不同。切換記錄方式時，尚未儲存的輸入會留在本機草稿，可切回查看。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MarketCashPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e38b3c7efa4f<br>[components/markets/MarketCashPanel.tsx:31:10](../../components/markets/MarketCashPanel.tsx#L31) | 每場、每天獨立記錄；跨午夜請選原本的營業日期。同一現金盒跨多場時，請自行區分範圍。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MarketCashPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-c217cd7add4f<br>[components/markets/MarketCashPanel.tsx:32:10](../../components/markets/MarketCashPanel.tsx#L32) | 現金盤點與比較不會改動營收、庫存或淨利。本機草稿需按「儲存到雲端」才會送出。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | MarketCashPanel<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-3b88ee20d97d<br>[components/markets/MarketCashPanel.tsx:38:96](../../components/markets/MarketCashPanel.tsx#L38) | 未記錄 | **來源候選** · 候選，非已證實提示<br>pointLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | pointLabel<br>cents===null |
| UI-4bf94ac40ebe<br>[components/markets/MarketCashPanel.tsx:38:139](../../components/markets/MarketCashPanel.tsx#L38) | 草稿尚未填完整 | **來源候選** · 候選，非已證實提示<br>pointLabel 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | pointLabel<br>catch：操作拋出例外 |
| UI-1cb7b60318a6<br>[components/markets/MarketCashPanel.tsx:51:82](../../components/markets/MarketCashPanel.tsx#L51) | 尚未確認最新雲端紀錄。以下可能是本機先前保存的內容；草稿會保留。 | **狀態設定** · 文案生產端，須查使用端<br>setCloudError：更新畫面訊息；仍須依呼叫端確認是否被渲染 | refresh<br>catch：操作拋出例外 → alive.current |
| UI-776d43971ccf<br>[components/markets/MarketCashPanel.tsx:55:47](../../components/markets/MarketCashPanel.tsx#L55) | 讀取現金紀錄中… | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace<br>!data |
| UI-cb07af5a17fd<br>[components/markets/MarketCashPanel.tsx:56:75](../../components/markets/MarketCashPanel.tsx#L56) | 目前無法讀取這場市集的現金紀錄。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace<br>!isCashOwner(data.market,ownerId) |
| UI-27af4c97b60c<br>[components/markets/MarketCashPanel.tsx:67:44](../../components/markets/MarketCashPanel.tsx#L67) | 正在保留本機草稿… | **狀態設定** · 文案生產端，須查使用端<br>setStatus：更新畫面訊息；仍須依呼叫端確認是否被渲染 | persist<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7d66742f234a<br>[components/markets/MarketCashPanel.tsx:69:86](../../components/markets/MarketCashPanel.tsx#L69) | 草稿已保存在這台裝置，尚未送達雲端。 | **狀態設定** · 文案生產端，須查使用端<br>setStatus：更新畫面訊息；仍須依呼叫端確認是否被渲染 | persist<br>alive.current |
| UI-62b951a40c27<br>[components/markets/MarketCashPanel.tsx:70:42](../../components/markets/MarketCashPanel.tsx#L70) | ${cashErrorMessage(e)} | **動態文字入口** · 執行時綁定入口<br>persist 接收執行時文字；內容需追查所列綁定與生產端 | persist<br>catch：操作拋出例外 → alive.current |
| UI-cb058f1f964f<br>[components/markets/MarketCashPanel.tsx:70:59](../../components/markets/MarketCashPanel.tsx#L70) | ${e} | **動態文字入口** · 執行時綁定入口<br>persist 接收執行時文字；內容需追查所列綁定與生產端 | persist<br>catch：操作拋出例外 → alive.current |
| UI-fd4cdc486fab<br>[components/markets/MarketCashPanel.tsx:83:104](../../components/markets/MarketCashPanel.tsx#L83) | 已保存到雲端。現金盤點不會改動營收、庫存或淨利。 | **狀態設定** · 文案生產端，須查使用端<br>setStatus：更新畫面訊息；仍須依呼叫端確認是否被渲染 | submit<br>alive.current |
| UI-a3312695b4bc<br>[components/markets/MarketCashPanel.tsx:84:40](../../components/markets/MarketCashPanel.tsx#L84) | ${cashErrorMessage(e)} | **動態文字入口** · 執行時綁定入口<br>submit 接收執行時文字；內容需追查所列綁定與生產端 | submit<br>catch：操作拋出例外 → alive.current |
| UI-f645d0c20fba<br>[components/markets/MarketCashPanel.tsx:84:57](../../components/markets/MarketCashPanel.tsx#L84) | ${e} | **動態文字入口** · 執行時綁定入口<br>submit 接收執行時文字；內容需追查所列綁定與生產端 | submit<br>catch：操作拋出例外 → alive.current |
| UI-03e30de944b4<br>[components/markets/MarketCashPanel.tsx:89:155](../../components/markets/MarketCashPanel.tsx#L89) | 本機草稿已捨棄，已同步紀錄保留。 | **狀態設定** · 文案生產端，須查使用端<br>setStatus：更新畫面訊息；仍須依呼叫端確認是否被渲染 | discard<br>alive.current |
| UI-7b14d740e5dd<br>[components/markets/MarketCashPanel.tsx:89:212](../../components/markets/MarketCashPanel.tsx#L89) | ${cashErrorMessage(e)} | **動態文字入口** · 執行時綁定入口<br>discard 接收執行時文字；內容需追查所列綁定與生產端 | discard<br>catch：操作拋出例外 → alive.current |
| UI-a2100d79dc85<br>[components/markets/MarketCashPanel.tsx:89:229](../../components/markets/MarketCashPanel.tsx#L89) | ${e} | **動態文字入口** · 執行時綁定入口<br>discard 接收執行時文字；內容需追查所列綁定與生產端 | discard<br>catch：操作拋出例外 → alive.current |
| UI-0510bfd9149d<br>[components/markets/MarketCashPanel.tsx:92:38](../../components/markets/MarketCashPanel.tsx#L92) | 營業日期 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | CashWorkspace<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-8b4d1c092e23<br>[components/markets/MarketCashPanel.tsx:93:98](../../components/markets/MarketCashPanel.tsx#L93) | （日期待確認） | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | CashWorkspace<br>!marketBusinessDates(data.market!).includes(d) |
| UI-6c102a5c6431<br>[components/markets/MarketCashPanel.tsx:95:54](../../components/markets/MarketCashPanel.tsx#L95) | 正在確認雲端… | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace<br>loading |
| UI-f4b8b9ac921b<br>[components/markets/MarketCashPanel.tsx:96:70](../../components/markets/MarketCashPanel.tsx#L96) | ${cloudError} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | CashWorkspace<br>cloudError |
| UI-6e0fc2ad3f2a<br>[components/markets/MarketCashPanel.tsx:97:67](../../components/markets/MarketCashPanel.tsx#L97) | ${status} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | CashWorkspace<br>status |
| UI-27e2b780ed29<br>[components/markets/MarketCashPanel.tsx:98:64](../../components/markets/MarketCashPanel.tsx#L98) | ${error} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | CashWorkspace<br>error |
| UI-4779ee269770<br>[components/markets/MarketCashPanel.tsx:102:206](../../components/markets/MarketCashPanel.tsx#L102) | 輸入後會保留本機草稿；按儲存到雲端才送出。 | **狀態設定** · 文案生產端，須查使用端<br>setStatus：更新畫面訊息；仍須依呼叫端確認是否被渲染 | CashWorkspace · onClick<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-6388d3bda203<br>[components/markets/MarketCashPanel.tsx:103:19](../../components/markets/MarketCashPanel.tsx#L103) | 繼續處理現金草稿 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CashWorkspace<br>!editor → draft |
| UI-9cff676d9531<br>[components/markets/MarketCashPanel.tsx:103:34](../../components/markets/MarketCashPanel.tsx#L103) | 修改現金紀錄 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CashWorkspace<br>!editor → 否則 draft → row |
| UI-7efb7d8bae29<br>[components/markets/MarketCashPanel.tsx:103:43](../../components/markets/MarketCashPanel.tsx#L103) | 選擇記錄方式 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CashWorkspace<br>!editor → 否則 draft → 否則 row |
| UI-73adcc4d1b13<br>[components/markets/MarketCashPanel.tsx:104:118](../../components/markets/MarketCashPanel.tsx#L104) | 重新讀取 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CashWorkspace<br>!editor |
| UI-5c3e4bc7c7db<br>[components/markets/MarketCashPanel.tsx:105:105](../../components/markets/MarketCashPanel.tsx#L105) | 捨棄本機草稿 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CashWorkspace<br>!editor → draft |
| UI-a4bd204d0c0b<br>[components/markets/MarketCashPanel.tsx:107:92](../../components/markets/MarketCashPanel.tsx#L107) | 開攤現金 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace<br>!editor |
| UI-d0ae3fd46d33<br>[components/markets/MarketCashPanel.tsx:107:149](../../components/markets/MarketCashPanel.tsx#L107) | ${pointLabel(saved.opening)} | **動態文字入口** · 執行時綁定入口<br>dd 接收執行時文字；內容需追查所列綁定與生產端 | CashWorkspace<br>!editor |
| UI-8d35000deef6<br>[components/markets/MarketCashPanel.tsx:107:195](../../components/markets/MarketCashPanel.tsx#L107) | 收攤現金 | **畫面文字** · 直接呈現定義<br>dt：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace<br>!editor |
| UI-d331f24ab33d<br>[components/markets/MarketCashPanel.tsx:107:252](../../components/markets/MarketCashPanel.tsx#L107) | ${pointLabel(saved.closing)} | **動態文字入口** · 執行時綁定入口<br>dd 接收執行時文字；內容需追查所列綁定與生產端 | CashWorkspace<br>!editor |
| UI-377e0a1ce158<br>[components/markets/MarketCashPanel.tsx:111:60](../../components/markets/MarketCashPanel.tsx#L111) | 已同步 · 第 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace<br>!editor → row |
| UI-f7046d49cc4f<br>[components/markets/MarketCashPanel.tsx:111:83](../../components/markets/MarketCashPanel.tsx#L111) | 版 · 修改 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace<br>!editor → row |
| UI-23ab4423680b<br>[components/markets/MarketCashPanel.tsx:112:53](../../components/markets/MarketCashPanel.tsx#L112) | 這天有尚未送出的本機草稿。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace<br>!editor → draft |
| UI-39aa72508fc5<br>[components/markets/MarketCashPanel.tsx:115:30](../../components/markets/MarketCashPanel.tsx#L115) | 開攤現金 | **畫面文字** · 直接呈現定義<br>CashPointEditor：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace · label<br>editor |
| UI-84d71f9f869e<br>[components/markets/MarketCashPanel.tsx:116:208](../../components/markets/MarketCashPanel.tsx#L116) | 帶入 ${previous.businessDate} 收攤 ${formatCashCents(priorClosing)} | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CashWorkspace<br>editor → previous &amp;&amp; priorClosing!==null |
| UI-4cc524a7ffc6<br>[components/markets/MarketCashPanel.tsx:117:30](../../components/markets/MarketCashPanel.tsx#L117) | 收攤現金 | **畫面文字** · 直接呈現定義<br>CashPointEditor：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace · label<br>editor |
| UI-d3c1e2f0d5ba<br>[components/markets/MarketCashPanel.tsx:118:52](../../components/markets/MarketCashPanel.tsx#L118) | 選「不記錄」並儲存，會清除該時點原金額。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace<br>editor |
| UI-8b7331a66e61<br>[components/markets/MarketCashPanel.tsx:121:174](../../components/markets/MarketCashPanel.tsx#L121) | 比較現金銷售與其他進出（選用） | **畫面文字** · 直接呈現定義<br>summary：辨識可點擊操作、導覽或展開入口 | CashWorkspace<br>editor |
| UI-156f1e3e0858<br>[components/markets/MarketCashPanel.tsx:124:40](../../components/markets/MarketCashPanel.tsx#L124) | 盤點備註（選填） | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | CashWorkspace<br>editor |
| UI-8345ee2533f7<br>[components/markets/MarketCashPanel.tsx:124:358](../../components/markets/MarketCashPanel.tsx#L124) | 例如：兩場共用現金盒，或提領前後的盤點範圍 | **輸入提示** · 直接呈現定義<br>在 textarea 提供輸入格式、範例或選擇提示 | CashWorkspace · placeholder<br>editor |
| UI-b26dedfc055c<br>[components/markets/MarketCashPanel.tsx:125:94](../../components/markets/MarketCashPanel.tsx#L125) | 雲端第 ${row.revision} 版：開攤 ${pointLabel(row.data.opening)}／收攤 ${pointLabel(row.data.closing)} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace<br>editor → conflict &amp;&amp; row |
| UI-df1dd2644398<br>[components/markets/MarketCashPanel.tsx:125:233](../../components/markets/MarketCashPanel.tsx#L125) | 雲端備註：${row.data.note &#124;&#124; '未填'} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace<br>editor → conflict &amp;&amp; row |
| UI-b8707c5a9cfa<br>[components/markets/MarketCashPanel.tsx:125:256](../../components/markets/MarketCashPanel.tsx#L125) | 未填 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace<br>editor → conflict &amp;&amp; row |
| UI-2c82ca1cd60c<br>[components/markets/MarketCashPanel.tsx:126:93](../../components/markets/MarketCashPanel.tsx#L126) | 雲端其他現金進出：${row.data.otherCash.amount} 元 · ${row.data.otherCash.note &#124;&#124; '未填備註'} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace<br>editor → conflict &amp;&amp; row → row.data.otherCash?.mode==='net' |
| UI-4a178171d89b<br>[components/markets/MarketCashPanel.tsx:126:162](../../components/markets/MarketCashPanel.tsx#L126) | 未填備註 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashWorkspace<br>editor → conflict &amp;&amp; row → row.data.otherCash?.mode==='net' |
| UI-c366bec12e01<br>[components/markets/MarketCashPanel.tsx:127:186](../../components/markets/MarketCashPanel.tsx#L127) | 已核對，保留目前輸入整合 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CashWorkspace<br>editor → conflict &amp;&amp; row |
| UI-fd487d0fe98e<br>[components/markets/MarketCashPanel.tsx:128:181](../../components/markets/MarketCashPanel.tsx#L128) | 儲存到雲端 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CashWorkspace<br>editor |
| UI-1f676447f084<br>[components/markets/MarketCashPanel.tsx:129:96](../../components/markets/MarketCashPanel.tsx#L129) | 先收起，保留草稿 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CashWorkspace<br>editor |
| UI-11031448121d<br>[components/markets/MarketCashPanel.tsx:130:95](../../components/markets/MarketCashPanel.tsx#L130) | 捨棄本機草稿 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CashWorkspace<br>editor |
| UI-c8faffeedd25<br>[components/markets/MarketCashPanel.tsx:136:79](../../components/markets/MarketCashPanel.tsx#L136) | 記錄開攤與收攤現金後，可查看盤點增減。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashIncrease<br>increase===null |
| UI-5ededbc25952<br>[components/markets/MarketCashPanel.tsx:136:101](../../components/markets/MarketCashPanel.tsx#L136) | 盤點現金${increase&gt;=0?'增加':'減少'} ${formatCashCents(Math.abs(increase))}。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashIncrease<br>否則 increase===null |
| UI-8848f017b99d<br>[components/markets/MarketCashPanel.tsx:136:120](../../components/markets/MarketCashPanel.tsx#L136) | 增加 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashIncrease<br>否則 increase===null → increase&gt;=0 |
| UI-ce221ea7fa5b<br>[components/markets/MarketCashPanel.tsx:136:125](../../components/markets/MarketCashPanel.tsx#L136) | 減少 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashIncrease<br>否則 increase===null → 否則 increase&gt;=0 |
| UI-ef689e422d7b<br>[components/markets/MarketCashPanel.tsx:136:231](../../components/markets/MarketCashPanel.tsx#L136) | 盤點增減不是營收或淨利，也不表示已對帳完成。 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | CashIncrease<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-214d133cf4f5<br>[components/markets/MarketCashPanel.tsx:140:110](../../components/markets/MarketCashPanel.tsx#L140) | ${label} | **動態文字入口** · 執行時綁定入口<br>legend 接收執行時文字；內容需追查所列綁定與生產端 | CashPointEditor<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-d3f5141529cf<br>[components/markets/MarketCashPanel.tsx:141:95](../../components/markets/MarketCashPanel.tsx#L141) | 請在提領或存款前盤點。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashPointEditor<br>closing &amp;&amp; point.mode!=='none' |
| UI-ecb8d73c0213<br>[components/markets/MarketCashPanel.tsx:142:74](../../components/markets/MarketCashPanel.tsx#L142) | ${label}記錄方式 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | CashPointEditor<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bbb17b8454fe<br>[components/markets/MarketCashPanel.tsx:143:218](../../components/markets/MarketCashPanel.tsx#L143) | 不記錄（預設） | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | CashPointEditor<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-a3210065d589<br>[components/markets/MarketCashPanel.tsx:143:256](../../components/markets/MarketCashPanel.tsx#L143) | 直接填總額 | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | CashPointEditor<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-1a384bb07d10<br>[components/markets/MarketCashPanel.tsx:143:300](../../components/markets/MarketCashPanel.tsx#L143) | 依面額計算 | **畫面文字** · 直接呈現定義<br>option：說明可選值或狀態 | CashPointEditor<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e004b11338d4<br>[components/markets/MarketCashPanel.tsx:144:64](../../components/markets/MarketCashPanel.tsx#L144) | ${label} | **動態文字入口** · 執行時綁定入口<br>label 接收執行時文字；內容需追查所列綁定與生產端 | CashPointEditor<br>point.mode==='total' |
| UI-3baf9e748ad1<br>[components/markets/MarketCashPanel.tsx:144:70](../../components/markets/MarketCashPanel.tsx#L144) | 總額（元） | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | CashPointEditor<br>point.mode==='total' |
| UI-2935d11a107b<br>[components/markets/MarketCashPanel.tsx:144:287](../../components/markets/MarketCashPanel.tsx#L144) | 例如 2000，0 代表實際記錄零元 | **輸入提示** · 直接呈現定義<br>在 input 提供輸入格式、範例或選擇提示 | CashPointEditor · placeholder<br>point.mode==='total' |
| UI-ca7417cad75c<br>[components/markets/MarketCashPanel.tsx:145:149](../../components/markets/MarketCashPanel.tsx#L145) | ${label} | **動態文字入口** · 執行時綁定入口<br>label 接收執行時文字；內容需追查所列綁定與生產端 | CashPointEditor<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-bf2d28dbd093<br>[components/markets/MarketCashPanel.tsx:145:177](../../components/markets/MarketCashPanel.tsx#L145) | 元 | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | CashPointEditor<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-e553e76aaf40<br>[components/markets/MarketCashPanel.tsx:145:186](../../components/markets/MarketCashPanel.tsx#L145) | （張） | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | CashPointEditor<br>d&gt;=100 |
| UI-d1a81e5a52c1<br>[components/markets/MarketCashPanel.tsx:145:192](../../components/markets/MarketCashPanel.tsx#L145) | （枚） | **畫面文字** · 直接呈現定義<br>label：說明欄位或欄位群組 | CashPointEditor<br>否則 d&gt;=100 |
| UI-d45eabf6ddd8<br>[components/markets/MarketCashPanel.tsx:145:441](../../components/markets/MarketCashPanel.tsx#L145) | 未填 | **來源候選** · 候選，非已證實提示<br>CashPointEditor 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | CashPointEditor · placeholder<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-f7a06f595e3b<br>[components/markets/MarketCashPanel.tsx:146:65](../../components/markets/MarketCashPanel.tsx#L146) | 合計：${pointLabel(point)} | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashPointEditor<br>point.mode!=='none' |

## components/settings/CashDraftList.tsx

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-55689a99a6e3<br>[components/settings/CashDraftList.tsx:22:103](../../components/settings/CashDraftList.tsx#L22) | 尚未送出的現金草稿 | **畫面文字** · 直接呈現定義<br>h2：辨識畫面、區塊或對話框主題 | CashDraftList<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-891fa0ffadca<br>[components/settings/CashDraftList.tsx:23:50](../../components/settings/CashDraftList.tsx#L23) | 一般同步不會代為送出。回原市集展開「開／收攤現金」，或明確捨棄本機草稿；已同步紀錄保留。 | **畫面文字** · 直接呈現定義<br>p：呈現操作說明、資料標籤、狀態或注意事項 | CashDraftList<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-7967a7b20698<br>[components/settings/CashDraftList.tsx:24:64](../../components/settings/CashDraftList.tsx#L24) | ${error} | **動態文字入口** · 執行時綁定入口<br>p 接收執行時文字；內容需追查所列綁定與生產端 | CashDraftList<br>error |
| UI-de2816b11df2<br>[components/settings/CashDraftList.tsx:26:54](../../components/settings/CashDraftList.tsx#L26) | 原市集目前無法讀取 | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | CashDraftList<br>否則 isCashOwner(market,user.id) |
| UI-87e40c8c7cf5<br>[components/settings/CashDraftList.tsx:26:67](../../components/settings/CashDraftList.tsx#L26) | ${isCashOwner(market,user.id)?market.name:'原市集目前無法讀取'} · ${draft.businessDate} | **畫面文字** · 直接呈現定義<br>span：呈現操作說明、資料標籤、狀態或注意事項 | CashDraftList<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-55dbbbaa26a1<br>[components/settings/CashDraftList.tsx:27:184](../../components/settings/CashDraftList.tsx#L27) | 回原市集處理 | **畫面文字** · 直接呈現定義<br>Link：辨識可點擊操作、導覽或展開入口 | CashDraftList<br>isCashOwner(market,user.id) |
| UI-73bd654bc1b0<br>[components/settings/CashDraftList.tsx:29:97](../../components/settings/CashDraftList.tsx#L29) | ${cashErrorMessage(e)} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | CashDraftList · onClick<br>catch：操作拋出例外 |
| UI-01c1bd67be9f<br>[components/settings/CashDraftList.tsx:29:114](../../components/settings/CashDraftList.tsx#L29) | ${e} | **動態文字入口** · 執行時綁定入口<br>button 接收執行時文字；內容需追查所列綁定與生產端 | CashDraftList · onClick<br>catch：操作拋出例外 |
| UI-711a4b0964ce<br>[components/settings/CashDraftList.tsx:30:10](../../components/settings/CashDraftList.tsx#L30) | 捨棄此份本機現金草稿 | **畫面文字** · 直接呈現定義<br>button：辨識可點擊操作、導覽或展開入口 | CashDraftList<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/markets/market-cash-adjustment.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-e704cefea276<br>[lib/markets/market-cash-adjustment.ts:6:71](../../lib/markets/market-cash-adjustment.ts#L6) | 其他現金進出請填正負金額，最多兩位小數。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | otherCashCents<br>!/^-?(0&#124;[1-9]\d{0,8})(\.\d{1,2})?$/.test(amount) |
| UI-ef5e237851c2<br>[lib/markets/market-cash-adjustment.ts:9:50](../../lib/markets/market-cash-adjustment.ts#L9) | 其他現金進出備註最多 1000 字。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | otherCashCents<br>[...other.note].length&gt;1000 |

## lib/markets/market-cash-comparison.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

同檔旗標（不代表每列均受它控制）：`NEXT_PUBLIC_MARKET_CASH_COMPARISON_ENABLED`。

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-ade3aa6d4113<br>[lib/markets/market-cash-comparison.ts:47:94](../../lib/markets/market-cash-comparison.ts#L47) | CASH_SALES_AMOUNT | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | summarizeCashSales<br>!Number.isSafeInteger(cashCents) &#124;&#124; !Number.isSafeInteger(noncashCents) |

## lib/markets/market-cash-repository.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-af946bc032b0<br>[lib/markets/market-cash-repository.ts:13:91](../../lib/markets/market-cash-repository.ts#L13) | CASH_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | assertScope<br>!this.ownerId &#124;&#124; this.epoch!==cashScopeEpoch() |
| UI-f8af6ed4ca9e<br>[lib/markets/market-cash-repository.ts:16:139](../../lib/markets/market-cash-repository.ts#L16) | CASH_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | stage<br>!marketCashEnabled() &#124;&#124; draft.ownerId!==this.ownerId &#124;&#124; draft.id!==cashRecordId(draft.marketId,draft.businessDate) |
| UI-662a8b5b5172<br>[lib/markets/market-cash-repository.ts:19:90](../../lib/markets/market-cash-repository.ts#L19) | CASH_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | stage<br>!isCashOwner(await db.markets.get(draft.marketId),this.ownerId) |
| UI-b8b10db4da17<br>[lib/markets/market-cash-repository.ts:21:111](../../lib/markets/market-cash-repository.ts#L21) | CASH_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | stage<br>(existing &amp;&amp; existing.ownerId!==this.ownerId) &#124;&#124; (row &amp;&amp; row.ownerId!==this.ownerId) |
| UI-3424360562c9<br>[lib/markets/market-cash-repository.ts:22:121](../../lib/markets/market-cash-repository.ts#L22) | CASH_DRAFT_CONFLICT | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | stage<br>existing &amp;&amp; existing.mutationId!==draft.mutationId &amp;&amp; existing.mutationId!==previousMutationId |
| UI-150c7f3eb87e<br>[lib/markets/market-cash-repository.ts:24:96](../../lib/markets/market-cash-repository.ts#L24) | CASH_STORAGE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | stage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |
| UI-4df9fdacb3df<br>[lib/markets/market-cash-repository.ts:30:90](../../lib/markets/market-cash-repository.ts#L30) | CASH_DRAFT_CONFLICT | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | discard<br>draft?.ownerId===this.ownerId → draft.mutationId!==mutationId |
| UI-414fa3c71340<br>[lib/markets/market-cash-repository.ts:34:91](../../lib/markets/market-cash-repository.ts#L34) | CASH_OFFLINE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | refresh<br>!getNetworkPort().getCurrentStatus().connected |
| UI-b6cb9300f049<br>[lib/markets/market-cash-repository.ts:39:103](../../lib/markets/market-cash-repository.ts#L39) | CASH_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | refresh<br>!isCashOwner(await db.markets.get(marketId),this.ownerId) |
| UI-b705c3035cdc<br>[lib/markets/market-cash-repository.ts:41:134](../../lib/markets/market-cash-repository.ts#L41) | CASH_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | refresh<br>row.ownerId!==this.ownerId &#124;&#124; row.marketId!==marketId &#124;&#124; row.id!==cashRecordId(marketId,row.businessDate) |
| UI-dab135a3bd98<br>[lib/markets/market-cash-repository.ts:49:90](../../lib/markets/market-cash-repository.ts#L49) | CASH_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | save<br>draft.ownerId!==this.ownerId &#124;&#124; !isCashOwner(market,this.ownerId) |
| UI-c324a53bcec6<br>[lib/markets/market-cash-repository.ts:53:197](../../lib/markets/market-cash-repository.ts#L53) | 請選擇記錄方式並輸入金額；不記錄可直接離開。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | save<br>draft.baseRevision===0 &amp;&amp; normalized.data.opening.mode==='none' &amp;&amp; normalized.data.closing.mode==='none' &amp;&amp; !normalized.data.note &amp;&amp; normalized.data.otherCash?.mode!=='net' |
| UI-153043c1ce21<br>[lib/markets/market-cash-repository.ts:55:71](../../lib/markets/market-cash-repository.ts#L55) | CASH_OFFLINE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | save<br>!getNetworkPort().getCurrentStatus().connected |
| UI-dbb4ab23d7d5<br>[lib/markets/market-cash-repository.ts:59:146](../../lib/markets/market-cash-repository.ts#L59) | CASH_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | save<br>row.ownerId!==this.ownerId &#124;&#124; row.id!==draft.id &#124;&#124; row.marketId!==draft.marketId &#124;&#124; row.businessDate!==draft.businessDate |

## lib/markets/market-cash.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

同檔旗標（不代表每列均受它控制）：`NEXT_PUBLIC_MARKET_CASH_ENABLED`。

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-91e5327711a3<br>[lib/markets/market-cash.ts:21:71](../../lib/markets/market-cash.ts#L21) | 總額請填寫非負金額，最多兩位小數。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | cashPointCents<br>point.mode==='total' → !/^(0&#124;[1-9]\d{0,8})(\.\d{1,2})?$/.test(value) |
| UI-7766b8f5c366<br>[lib/markets/market-cash.ts:25:52](../../lib/markets/market-cash.ts#L25) | 請選擇現金記錄方式。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | cashPointCents<br>point.mode!=='denominations' |
| UI-f0fd43cc86d6<br>[lib/markets/market-cash.ts:26:105](../../lib/markets/market-cash.ts#L26) | 面額不在支援範圍，請改用總額記錄。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | cashPointCents<br>Object.keys(point.counts).some(key=&gt;!CASH_DENOMINATIONS.some(d=&gt;String(d)===key)) |
| UI-0b02f20d7614<br>[lib/markets/market-cash.ts:32:57](../../lib/markets/market-cash.ts#L32) | 張數／枚數請填寫非負整數，最多 999999。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | cashPointCents<br>!/^(0&#124;[1-9]\d{0,5})$/.test(raw) |
| UI-64510954a4b6<br>[lib/markets/market-cash.ts:35:32](../../lib/markets/market-cash.ts#L35) | 請至少輸入一種面額的數量；確認沒有現金時可填 0。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | cashPointCents<br>!entered |
| UI-3ebcfaf91f1f<br>[lib/markets/market-cash.ts:36:44](../../lib/markets/market-cash.ts#L36) | 現金總額過大，請檢查張數／枚數。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | cashPointCents<br>total&gt;MAX_CASH_CENTS |
| UI-01fcd597b2dd<br>[lib/markets/market-cash.ts:53:50](../../lib/markets/market-cash.ts#L53) | 盤點備註最多 1000 字。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateCashData<br>[...data.note].length&gt;1000 |
| UI-d9476944585f<br>[lib/markets/market-cash.ts:56:84](../../lib/markets/market-cash.ts#L56) | 其他現金進出方式不正確。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateCashData<br>data.otherCash → data.otherCash.mode!=='none' &amp;&amp; data.otherCash.mode!=='net' |
| UI-90aa85269120<br>[lib/markets/market-cash.ts:62:189](../../lib/markets/market-cash.ts#L62) | 請重新讀取現金銷售，再記下比較基準。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateCashData<br>data.salesBasis!==undefined → basis &amp;&amp; (!/^[a-f0-9]{32}$/.test(basis.salesKey) &#124;&#124; typeof basis.cashKey!=='string' &#124;&#124; basis.cashKey.length&gt;16000 &#124;&#124; !Number.isFinite(Date.parse(basis.capturedAt))) |
| UI-b2063c4565dd<br>[lib/markets/market-cash.ts:68:90](../../lib/markets/market-cash.ts#L68) | 請選擇這場市集的營業日期。 | **錯誤來源** · 文案生產端，須查使用端<br>Error：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示 | validateCashDate<br>date!==previousDate &amp;&amp; !marketBusinessDates(market).includes(date) |
| UI-6064da704d35<br>[lib/markets/market-cash.ts:75:54](../../lib/markets/market-cash.ts#L75) | 另一個分頁已更新草稿。這次輸入沒有覆寫它，請先保留目前內容，再重新開啟。 | **來源候選** · 候選，非已證實提示<br>cashErrorMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | cashErrorMessage<br>message.includes('CASH_DRAFT_CONFLICT') |
| UI-9519973f0dca<br>[lib/markets/market-cash.ts:76:48](../../lib/markets/market-cash.ts#L76) | 其他裝置已更新這天的現金紀錄。草稿仍保留，請讀取雲端版本後整合。 | **來源候選** · 候選，非已證實提示<br>cashErrorMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | cashErrorMessage<br>message.includes('CASH_CONFLICT') |
| UI-4f61a896201b<br>[lib/markets/market-cash.ts:77:47](../../lib/markets/market-cash.ts#L77) | 草稿尚未寫入裝置，請勿離開，先保留目前數字。 | **來源候選** · 候選，非已證實提示<br>cashErrorMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | cashErrorMessage<br>message.includes('CASH_STORAGE') |
| UI-e313e042fc5b<br>[lib/markets/market-cash.ts:78:47](../../lib/markets/market-cash.ts#L78) | 目前離線，草稿已留在這台裝置；連線後請再按儲存到雲端。 | **來源候選** · 候選，非已證實提示<br>cashErrorMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | cashErrorMessage<br>message.includes('CASH_OFFLINE') |
| UI-fed37c16b174<br>[lib/markets/market-cash.ts:79:45](../../lib/markets/market-cash.ts#L79) | 目前無法存取這場市集。草稿仍留在原帳號中。 | **來源候選** · 候選，非已證實提示<br>cashErrorMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | cashErrorMessage<br>message.includes('CASH_SCOPE') |
| UI-ac7790791878<br>[lib/markets/market-cash.ts:80:44](../../lib/markets/market-cash.ts#L80) | 市集日期已變更，請重新確認營業日期；草稿仍保留。 | **來源候選** · 候選，非已證實提示<br>cashErrorMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | cashErrorMessage<br>message.includes('CASH_DATE') |
| UI-0e155ca5959f<br>[lib/markets/market-cash.ts:81:54](../../lib/markets/market-cash.ts#L81) | 這筆包含新版現金比較資料，請更新應用程式後再編輯。草稿仍保留。 | **來源候選** · 候選，非已證實提示<br>cashErrorMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | cashErrorMessage<br>message.includes('CASH_CLIENT_UPGRADE') |
| UI-e0262f0b01c9<br>[lib/markets/market-cash.ts:83:10](../../lib/markets/market-cash.ts#L83) | 尚未確認送達雲端。草稿仍保留，請核對雲端後重試。 | **來源候選** · 候選，非已證實提示<br>cashErrorMessage 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示 | cashErrorMessage<br>隨所屬畫面／函式狀態呈現；呼叫端條件另查來源 |

## lib/supabase/market-cash.ts

正式頁面靜態引用鏈（不等於條件分支已啟用）

| ID／來源 | 用語／動態範本 | 類型與用途 | 所在符號／觸發條件 |
| --- | --- | --- | --- |
| UI-65a482494541<br>[lib/supabase/market-cash.ts:9:168](../../lib/supabase/market-cash.ts#L9) | CASH_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | assertIdentity<br>error &#124;&#124; data.session?.user.id!==ownerId |
| UI-3e41424201d8<br>[lib/supabase/market-cash.ts:21:61](../../lib/supabase/market-cash.ts#L21) | CASH_CLIENT_UPGRADE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | save<br>enhanced &amp;&amp; !cashComparisonEnabled() |
| UI-ffe0a4165a33<br>[lib/supabase/market-cash.ts:34:127](../../lib/supabase/market-cash.ts#L34) | CASH_SCOPE | **內部狀態／錯誤碼** · 內部代碼，非人類提示<br>Error：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示 | readCashSales<br>snapshot?.marketId!==marketId &#124;&#124; !/^[a-f0-9]{32}$/.test(snapshot.key) &#124;&#124; !Array.isArray(snapshot.events) |
