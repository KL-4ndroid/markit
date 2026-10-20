# 市集文字匯入 Annotation Pass 1 紀錄

- 開始日期：2026-09-15
- 狀態：代表來源稽核 100／100；Round A 23、Round B 30、Round C 30 個均已完成獨立複核與裁決，合計 83 個 Gold research fixtures
- 範圍：`參照對象/Corpus v1/代表樣本`
- 產品實作狀態：未核准、未開始
- 執行計畫：`docs/MARKET_TEXT_IMPORT_EXECUTION_PLAN_2026_09_16.md`
- MVP 支援範圍：`docs/MARKET_TEXT_IMPORT_MVP_SCOPE_V1_2026_09_16.md`
- Parser contract：`docs/MARKET_TEXT_IMPORT_PARSER_CONTRACT_V1_2026_09_16.md`
- Gold test plan：`docs/MARKET_TEXT_IMPORT_GOLD_TEST_PLAN_V1_2026_09_16.md`
- 標註規範：`docs/MARKET_TEXT_IMPORT_ANNOTATION_GUIDE_V1_2026_09_15.md`
- 校準 fixture：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_CALIBRATION_V1_2026_09_15.md`
- 盲審包：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_V1_2026_09_15.md`
- Reviewer B 結果：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_B_V1_2026_09_15.md`
- 裁決工作表：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_V1_2026_09_15.md`
- Round B 候選：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ROUND_B_V1_2026_09_15.md`
- Round B 盲審包：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_B_V1_2026_09_15.md`
- Round B 裁決追蹤：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_ROUND_B_V1_2026_09_15.md`
- Round B Reviewer C 結果：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_C_ROUND_B_V1_2026_09_15.md`
- Round B Reviewer D 補審：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_D_ROUND_B_REMAINDER_V1_2026_09_16.md`
- Round C 候選：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ROUND_C_V1_2026_09_16.md`
- Round C 盲審包：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_C_V1_2026_09_16.md`
- Round C Reviewer E 結果：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_E_ROUND_C_V1_2026_09_16.md`
- Round C 裁決追蹤：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_ROUND_C_V1_2026_09_16.md`

## 1. 本輪完成內容

- 依 Gmail 標籤順序配置匿名來源 ID `MTI-REP-0001` 至 `MTI-REP-0100`；這些 ID 暫作 `sourceSampleId`，不是最終 paste fixture ID。
- 每封郵件均先判斷 event block，再判斷可否安全形成「新增市集」草稿。
- 只留下驗證結論所需的公開活動資訊與最小 evidence；姓名、品牌填答、Email、電話、帳戶、私人連結及 Gmail ID 均未寫入本文件。
- Gmail 來源稽核期間未讀取或下載附件。正文只說「詳見附件」時，不把未貼入的內容視為已取得；若使用者自行開啟附件並複製可見文字，產品仍可把該文字當成一般輸入解析。
- 已將活動日與報名／繳費期限、營業與報到時間、攤位費與付款總額分開標記。
- Gmail 已用 `參照對象/Corpus v1/Annotation Pass 1/初標完成` 與 `參照對象/Corpus v1/Annotation Pass 1/待獨立複核` 標記這 100 封來源郵件，避免後續重複取樣。

100 封代表來源均已完成郵件層級稽核，但不能直接視為 100 份產品 fixture。Round A 23 筆、Round B 30 筆與 Round C 30 筆已依實際貼上邊界建立、完成獨立複核與裁決，合計 83 個 Gold research fixtures；這些尚未轉成可執行 runtime dataset，也不能直接宣稱 parser 品質達標。

### 1.1 2026-09-15 方法校正

目標使用情境是「使用者先判讀來源，選取認為有用的市集資訊，再貼入文字框」。因此，整封 Email 並不是主要產品輸入單位。目前方向的判定如下：

- 產品方向正確：手動貼上代表使用者已表達解析意圖，裝置端規則、保守填值、來源證據、衝突提示與最後由使用者送出都應保留。
- 標註方向需修正：前 60 封結果反映的是來源郵件複雜度，不能直接當成 parser 對真實貼上內容的成功率。
- 既有成果不作廢：24 封可安全形成草稿、9 封需確認、16 封資訊不足、6 封多活動、1 封含敏感表單資料、4 封為取消／未錄取／非市集，適合作為選取 paste sample 與壓力案例的來源。
- 已先從這 60 封選 12 封完成 Paste Scenario Calibration；後續來源稽核須依凍結後的 Paste Sample Selection Policy v1 進行。

## 2. 第一批初標結果摘要（MTI-REP-0001～0020）

| 結果 | 樣本數 | 說明 |
| --- | ---: | --- |
| 可安全形成單一草稿，仍可能留白進階欄位 | 8 | 核心欄位具有單一答案，或年份可依明確規則推定 |
| 可形成草稿，但必須先選擇或處理衝突 | 6 | 多地點、多價格、逐日不同時間或正文新舊段落矛盾 |
| 資訊不足，不應建立草稿 | 4 | 只有繳費提醒、設備異動或缺少必要核心欄位 |
| 一封信包含多個活動，必須先選活動 | 1 | 含 6 個市集活動及數個非市集寄售／快閃項目 |
| 表單回覆含大量個人填答，需專用去識別流程 | 1 | 不可直接把整段表單回覆當作 fixture |

同一樣本可同時帶有多種欄位風險；上表以進入新增市集流程前最主要的處置分類。

## 3. 樣本級初標

### MTI-REP-0001

- `referenceDate`: `2026-07-21`
- `sourceKind`: invitation
- `eventBlocks`: 1
- `marketName`: `exact`，值為「2026眷村嘉年華」；evidence：`2026眷村嘉年華`。
- `eventDates`: `exact`，值為 `2026-10-03`、`2026-10-04`；evidence：`活動日期｜2026年10月3日至10月4日`。
- `location`: `exact`，值為「醒村文化景觀公園」；evidence：`活動地點｜醒村文化景觀公園`。
- 時間、費用與設備：`not_present`。
- 結論：核心欄位可安全套用；簽名檔地址必須忽略。

### MTI-REP-0002

- `referenceDate`: `2026-07-13`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1 個相互矛盾的候選事件。
- `marketName`: `conflict`；evidence：正文目前錄取段落為「芫荽趴踢」，後段引用活動區塊為「雞啤節」。
- `eventDates`: `conflict`；evidence：正文目前錄取段落為 `11.14–11.15`，後段引用區塊為 `10.17–10.18`。
- `location`: `conflict`；只有後段另一活動的「嘉義公園」，不可套到目前錄取活動。
- `paymentDeadline`: `ignore`；evidence：`繳費期限：2026/07/18 23:59`。
- 附件中的租借設備與應繳金額：`unsupported`，因貼入的正文未包含內容。
- 結論：不得自動套用；需提示正文可能混入不同場次的舊活動區塊。

### MTI-REP-0003

- `referenceDate`: `2026-04-18`
- `sourceKind`: event-promotion
- `eventBlocks`: 1
- `marketName`: `exact`，值為「台浮緣日」。
- `eventDates`: `exact`，值為 `2026-05-16`、`2026-05-17`；evidence：`日期：2026.05.16 - 05.17`。
- `location`: `exact`，值為「高雄駁二藝術特區（大義倉庫紅磚廊道）」。
- 營業時間：`unsupported`；evidence：`16日 15:00-21:00 / 17日 15:00-20:00`。現有表單只有一組營業起訖時間。
- 結論：名稱、日期及地點可套用；逐日時間不可壓成單一值。

### MTI-REP-0004

- `referenceDate`: `2026-04-07`
- `sourceKind`: invitation
- `eventBlocks`: 1
- `marketName`: `exact`，值為「春日家的日常」。
- `eventDates`: `inferable`，值為 `2026-04-18`、`2026-04-19`；evidence：`活動日期｜04/18–04/19`，年份由 reference date 與同月未來日期推定。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `13:00`／`18:00`。
- `location`: `exact`，值為「高雄市楠梓區大學南路168號」。
- `boothCost`: `exact`，值為 `0 TWD`；evidence：`本次活動免攤位費用`。
- 設備：帳篷、1 桌、2 椅為 `included`；桌與椅可成為免費提供候選，帳篷目前 `unsupported`。
- 結論：可形成高完整度草稿，年份推定必須顯示給使用者確認。

### MTI-REP-0005

- `referenceDate`: `2026-04-02`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1
- `marketName`: `exact`，值為「2026香菜市集」。
- `eventDates`: `inferable`，值為 `2026-09-26`、`2026-09-27`；年份由活動名稱提供。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `13:00`／`19:00`。
- `location`: `exact`，值為「台北圓山花博花海廣場」。
- `paymentDeadline`: `ignore`；evidence：`繳費截止：05月01日前`。
- 費用與額外設備：`unsupported`，金額與選擇只存在附件清冊。
- 結論：核心欄位可套用，附件欄位保持空白並說明原因。

### MTI-REP-0006

- `referenceDate`: `2026-03-25`
- `sourceKind`: invitation
- `eventBlocks`: 1
- `marketName`: `exact`，值為「社區草地表演音樂暨青農青創市集」。
- `eventDates`: `inferable`，值為 `2026-05-02`；evidence：`活動日期：115年5月2日`，依民國年轉換。
- `location`: `exact`，值為「員林市龍燈公園」。
- 時間：`choice_required`；evidence：`活動時間：15:30–20:30（市集16:40開始）`。可確定營業開始為 `16:40`，但不能直接假設 `20:30` 是市集營業結束。
- `boothCost`: `inferable`，候選為 `500 TWD`；evidence：`費用：500元整`，原文未明稱攤位費。
- 結論：日期轉換可由規則完成；時間與費用需使用者確認。

### MTI-REP-0007

- `referenceDate`: `2026-03-25`
- `sourceKind`: form-response
- `eventBlocks`: 1
- `marketName`: `exact`，值為「2026法國生活節在高雄」。
- `eventDates`: `exact`，值為 `2026-05-22`、`2026-05-23`、`2026-05-24`。
- `location`: `exact`，值為「高雄衛武營戶外劇場＆衛武營都會公園」。
- 營業時間：`unsupported`；evidence：前兩日 `14:00–22:00`，末日 `14:00–21:00`。
- 進場時間：`unsupported`；evidence：`5/22 11:00-13:00` 是時間窗，不是單一提前進場時間。
- `boothCost`: `exact`，值為 `4000 TWD`、單位 `per_event`；evidence：`本次活動3天的攤位收取租金4千元`。
- 設備：看板、帳篷 1、長桌 1、椅 2、吊扇 1 為 `included`；基本電力規格進備註候選。
- `registrationDeadline`: `ignore`；evidence：`4月6日 23:59截止`。
- 結論：可建立草稿，但逐日時間與進場時間窗不能直接套入現有單值欄位。

### MTI-REP-0008

- `referenceDate`: `2026-03-18`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1
- `marketName`: `exact`，值採正文錄取語意的「開嘉｜涼夏研究所」；正文尾端活動區塊有多餘字元，應正規化並顯示確認。
- `eventDates`: `inferable`，值為 `2026-06-13`、`2026-06-14`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `14:00`／`19:00`。
- `location`: `exact`，值為「嘉義公園」。
- `paymentDeadline`: `ignore`；evidence：`2026/03/25 23:59`。
- 費用與設備：`unsupported`，只存在附件。
- 結論：核心欄位可套用；正文名稱的尾端雜訊需保留來源提示。

### MTI-REP-0009

- `referenceDate`: `2025-11-28`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1 個不完整事件。
- `marketName`: `exact`，值為「成醫37榕園草地音樂市集」。
- `eventDates`、營業時間與地點：`not_present`。
- `boothCost`: `exact`，值為 `500 TWD`；`deposit`: `exact`，值為 `500 TWD`；evidence：`報名費用1,000元（租金500元＋保證金500元）`。
- 設備：遮陽設備 1、攤位牌 1、椅 2、燈具 1 為 `included`；遮陽設備可能是帳篷或陽傘，不可直接設定 `umbrellaFree`。
- `paymentDeadline`: `ignore`。
- 結論：缺少日期與地點，不應直接形成可送出的市集草稿。

### MTI-REP-0010

- `referenceDate`: `2025-11-10`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1
- `marketName`: `exact`，值為「聖誕報佳音市集」。
- `eventDates`: `exact`，值為 `2025-12-25`；evidence 同時存在於主旨及活動資訊。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `14:00`／`20:00`。
- `location`: `exact`，值為「台南市新營文化中心」。
- `boothCost`: `exact`，值為 `500 TWD`、單位 `per_day`。
- 設備選項：桌 `200`、椅 `10`、白傘 `350 TWD`；電力 `300 TWD` 為目前不支援的獨立選項。
- 退款與請假日期：`ignore`。
- 結論：可形成高完整度草稿；電力只能成為備註／不支援候選。

### MTI-REP-0011

- `referenceDate`: `2025-11-07`
- `sourceKind`: form-response
- `eventBlocks`: 1
- `marketName`: `exact`，值為「2026駁二小夜埕」。
- `eventDates`: `exact`，為 `2026-02-14` 至 `2026-02-22`，排除明確休停的 `2026-02-16`；evidence：`活動共計8天（除夕02.16活動休停一日）`。
- `location`: `choice_required`，選項為大勇區駁遊路或大義區紅磚廊道。
- 營業時間：`unsupported`；一般日 `14:00–22:00`，最後一日 `14:00–20:00`。
- `boothCost`: `choice_required`，依區域為 `800` 或 `1200 TWD per_day`。
- `deposit`: `exact`，值為 `1000 TWD`。
- 設備選項：遮陽傘 `450`、長桌 `200`、折疊椅兩張 `50 TWD per_event`。
- 報名、公布及繳費日期：`ignore`。
- 結論：日期可產生，但地點與攤位費必須綁定成同一方案讓使用者選擇。

### MTI-REP-0012

- `referenceDate`: `2025-10-22`
- `sourceKind`: payment-reminder
- `eventBlocks`: 1 個不完整事件。
- `marketName`: `not_present`；Gmail 主旨雖有活動名稱，但不屬預設貼入正文。
- `eventDates`、地點、時間及費用：`not_present`。
- `paymentDeadline`: `ignore`；evidence：`繳費截止日期為10/2 15:30前`。
- 結論：這是提醒信，不足以建立草稿；看到日期也不得誤填為活動日。

### MTI-REP-0013

- `referenceDate`: `2025-10-21`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1
- `marketName`: `exact`，值為「山海永續市集」。
- `eventDates`: `inferable`，值為 `2025-12-13`、`2025-12-14`；年份依 reference date 與通知內年份推定。
- `location`: `exact`，值為「高雄駁二大勇區藝術廣場」。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `11:00`／`18:00`。
- `checkInTime`: `choice_required`，原文為 `10:00–10:30` 時間窗。
- `boothCost`: `conflict`；文創 `800 TWD per_day`，美食標示 `1000 TWD per_day`，但兩日總價又寫 `1600`，算術不一致。
- `deposit`: `exact`，值為 `1000 TWD per_event`。
- 內含陽傘、桌、椅與基礎電力；另列的設備租借價格不可在未確認實際選擇時直接套用。
- 結論：核心欄位可預覽；費用區必須阻止自動套用並指出矛盾。

### MTI-REP-0014

- `referenceDate`: `2025-10-09`
- `sourceKind`: corrected-admission
- `eventBlocks`: 1
- `marketName`: `exact`，值為「碌人．散步 x 台中文學館｜樹影裡的續章」。
- `eventDates`: `inferable`，值為 `2025-11-01`、`2025-11-02`；evidence：`日期：11/01-11/02`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `13:00`／`17:00`。
- `location`: `exact`，值為「台中文學館（台中市西區樂群街38號）」。
- `boothCost`: `choice_required`，選項為單日 `900` 或雙日 `1800 TWD`，郵件未提供已選參加日期。
- `paymentDeadline`: `ignore`。
- 結論：本信明確宣告前信日期誤植，若同時貼入多封內容應以此封為優先來源。

### MTI-REP-0015

- `referenceDate`: `2025-09-23`
- `sourceKind`: admission
- `eventBlocks`: 1 個不完整事件。
- `marketName`: `exact`，值為「2025高雄眷村嘉年華（岡山場）」。
- `eventDates`: `not_present`；日期只存在 Gmail 主旨，不列為貼入正文的 evidence。
- `location`、營業時間與費用：`not_present`。
- 設備：帳篷 1、桌 1、椅 2 為 `included`。
- 郵件簽名地址：`ignore`，不得當作活動地點。
- 結論：缺少地點，不足以直接形成可送出的草稿。

### MTI-REP-0016

- `referenceDate`: `2025-08-28`
- `sourceKind`: multi-event-newsletter
- `eventBlocks`: 6 個市集活動；另有寄售、合作店與快閃進駐內容，均不屬單次新增市集。
- 可辨識市集包括：國際手作設計節、夏日搖擺市集、西門六町目市集、微醺祭、材料重生實驗室與美麗華週年市集。
- 各 event block 均有自己的日期、時間或地點，不得合併。
- 週末固定場、跨數週場次：`unsupported`，不可任意展開成日期。
- 結論：解析前必須先列出活動卡片讓使用者選擇；非市集寄售與店面進駐應排除。

### MTI-REP-0017

- `referenceDate`: `2025-08-11`
- `sourceKind`: equipment-amendment
- `eventBlocks`: 1 個不完整事件。
- `marketName`: `not_present`；活動名稱只存在 Gmail 主旨，不列為貼入正文的 evidence。
- 日期、地點與營業時間：`not_present`。
- 已選設備：`exact`，一組桌椅、總價 `250 TWD per_event`；evidence：`已幫您改成一組` 與引用內容的桌椅單價。
- 其他設備候選：陽傘 `370`、單椅 `15 TWD per_event`；基本用電 `300 TWD per_day per_1000W`。
- 結論：設備異動可作為補充資料，但缺少核心欄位，不可建立新市集。

### MTI-REP-0018

- `referenceDate`: `2025-08-09`
- `sourceKind`: one-line-form-response
- `eventBlocks`: 1 個不完整事件。
- 公開活動名稱、完整活動日期、地點與營業時間：`not_present`。
- 使用者選擇的參加日期只寫「三天全報」，缺少可獨立解析的日期範圍。
- 已選設備：一組含兩椅的會議桌，候選總價 `250 TWD per_event`。
- 用電：明確回答不申請；基本電力與加購級距只屬規則說明。
- 結論：整封回覆混有品牌、聯絡人及商品資料；只能先做問答欄位切分與 answer-side 去識別，不能直接保存整行文字。

### MTI-REP-0019

- `referenceDate`: `2025-07-09`
- `sourceKind`: recruitment
- `eventBlocks`: 1
- `marketName`: `exact`，值為「邊緣人市集｜駁二大義・遇見有緣人」。
- `eventDates`: `inferable`，值為 `2025-08-09`、`2025-08-10`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `14:00`／`21:00`。
- `checkInTime`: `choice_required`，原文為 `13:00–13:30` 時間窗。
- `location`: `exact`，值為「高雄駁二藝術特區－大義倉庫」。
- `boothCost`: `choice_required`，存在 `1500`、`1600`、`1150`、`850 TWD per_day` 等攤型方案。
- `deposit`: `exact`，值為 `500 TWD per_event`。
- 結論：核心欄位可預覽；費用必須先選攤型，設備遮蔽類型也不可預設。

### MTI-REP-0020

- `referenceDate`: `2025-06-19`
- `sourceKind`: recruitment
- `eventBlocks`: 1
- `marketName`: `exact`，值為「2025 Pinkoi Design Fest in Taipei 瘋設祭」。
- `eventDates`: `inferable`，值為 `2025-11-07`、`2025-11-08`、`2025-11-09`；年份由活動名稱提供。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `11:00`／`19:30`。
- `location`: `exact`，值為「圓山花博爭艷館」。
- 報名截止：`ignore`；費用與設備：`not_present`。
- 結論：HTML-only 郵件仍能從可見正文取得核心欄位；解析來源必須是貼上的可見文字，不可依賴 HTML 標籤。

## 4. 第二批初標結果摘要（MTI-REP-0021～0040）

| 結果 | 樣本數 | 說明 |
| --- | ---: | --- |
| 可安全形成單一草稿，仍可能留白進階欄位 | 10 | 正文具有名稱、日期與地點；逐日時間或費用選擇另行確認 |
| 可形成候選草稿，但核心欄位仍需確認 | 2 | 活動名稱或地點只能由上下文推定 |
| 資訊不足，不應建立草稿 | 5 | 正文缺少名稱、日期或地點，或資訊只存在外部表單 |
| 一封信包含多個活動，必須先選活動 | 1 | 同一地點列出兩組不同日期與時間 |
| 最新正文表示取消或內容並非市集資料 | 2 | 引用舊錄取內容不得覆蓋最新取消意圖；一般客服信不得解析 |

### MTI-REP-0021

- `referenceDate`: `2025-05-18`
- `sourceKind`: admission
- `eventBlocks`: 1
- `marketName`: `exact`，值為「大兵市集」；活動副標只存在 Gmail 主旨，不列入預設 input evidence。
- `eventDates`: `exact`，值為 `2025-07-26`、`2025-07-27`；evidence：`當日：2025.7.26-27`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `14:00`／`20:00`。
- `location`: `exact`，值為「南紡購物中心 A2 館－戶外南紡廣場」。
- `checkInTime`: `choice_required`，正文提供 `13:00–14:00` 簽到時間窗。
- `boothCost`: `exact`，值為 `2800 TWD per_event`；evidence：`攤費2800元／2天`。
- 設備：陽傘 1、椅子 1 為 `included`；桌子不含，可加租 `200 TWD`；額外椅 `30`、傘 `300`、兩日用電 `200 TWD`。
- 結論：核心欄位可套用；簽到時間窗與未選租借項目不得直接填入。

### MTI-REP-0022

- `referenceDate`: `2025-04-21`
- `sourceKind`: invitation
- `eventBlocks`: 1
- `marketName`: `exact`，值為「粽夏蛋生的小怪獸」。
- `eventDates`: `inferable`，值為 `2025-05-30`、`2025-05-31`、`2025-06-01`；evidence：`活動時間｜05/30-06/01`，年份依 reference date 推定。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `11:30`／`18:00`。
- `location`: `exact`，值為「台南水交社文化園區」。
- 費用與設備：`not_present`。
- 結論：可形成核心草稿，年份推定需顯示確認。

### MTI-REP-0023

- `referenceDate`: `2025-04-08`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1
- `marketName`: `exact`，值為「2025法國生活節在高雄」。
- `eventDates`: `inferable`，值為 `2025-05-23`、`2025-05-24`、`2025-05-25`；年份由正文活動名稱提供。
- `location`: `exact`，值為「高雄駁二大義公園＆紅磚廊道」。
- 營業時間：`unsupported`；前兩日 `14:00–22:00`，末日 `14:00–21:00`。
- `boothCost`: `exact`，值為 `3000 TWD per_event`。
- 設備：三米帳、桌 1、椅 2 與基本 110V／5A 電力為 `included`；大功率與 220V 需求屬備註／不支援項目。
- 附件：不讀取；正文已有的欄位不受附件存在影響。
- 結論：可形成草稿；逐日時間不可壓成單一時間。

### MTI-REP-0024

- `referenceDate`: `2025-03-14`
- `sourceKind`: non-market-customer-service
- `eventBlocks`: 0
- 正文只是商品領取／郵寄與工作室時間往來；「週末會擺市集」只是在說明工作室不營業。
- 所有日期、時間、地點與付款字樣：`ignore`。
- 結論：拒絕建立市集草稿，並歸入 curation false-positive。

### MTI-REP-0025

- `referenceDate`: `2025-03-11`
- `sourceKind`: invitation
- `eventBlocks`: 1
- `marketName`: `exact`，值為「2025夏日文酷祭典－文酷市集」。
- `eventDates`: `inferable`，值為 `2025-06-14`、`2025-06-15`；年份由活動名稱提供。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `10:30`／`18:30`。
- `location`: `exact`，值為「文化部文化資產園區 B03 藝文展覽館 AB」。
- `boothCost`: `choice_required`，單日 `1600`、雙日 `2700 TWD`，邀請信未顯示使用者選擇。
- 設備：桌 1、椅 2、桌巾 1 為 `included`；場館不供電。
- 結論：核心草稿可套用，費用需先選參與日數。

### MTI-REP-0026

- `referenceDate`: `2025-03-09`
- `sourceKind`: recruitment
- `eventBlocks`: 1
- `marketName`: `exact`，值為「藏物市集」。
- `eventDates`: `exact`，值為 `2025-04-12`、`2025-04-13`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `12:00`／`18:00`。
- `location`: `exact`，值為「思微藏物生活空間對面玻璃屋（新瓦屋集會堂）」。
- `boothCost`: `choice_required`，自帶桌 `850`、租桌 `950`、手作體驗 `1050 TWD per_day`。
- 設備方案與費用綁定；額外桌 `150`、椅 `20`、陽傘 `100 TWD`，室內場不提供陽傘或帳篷。
- 額外用電 `100 TWD` 只適用飲食品牌，屬條件式不支援項目。
- 結論：核心草稿可套用；攤位類型、設備與用電必須整組選擇。

### MTI-REP-0027

- `referenceDate`: `2025-02-14`
- `sourceKind`: equipment-amendment-with-quoted-admission
- `eventBlocks`: 1
- `marketName`: `exact`，值為「散步遊者市集－春分之日」。
- `eventDates`: `exact`，值為 `2025-03-15`、`2025-03-16`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `14:00`／`19:00`。
- `location`: `exact`，值為「高雄市立美術館館前廣場＋林蔭區」。
- `boothCost`: `inferable`，值為 `1800 TWD per_event`；evidence：錄取兩日且 `900元／日`。
- `checkInTime`: `inferable`，候選 `13:00`；evidence：`活動開始前一小時抵達`。必須顯示相對時間換算依據。
- 已選設備：額外椅 2 張共 `50 TWD`；陽傘包含在錄取方案中，桌椅原則上不含。
- 結論：可形成草稿；最新回覆的設備異動應覆蓋引用區塊的一般設備清單。

### MTI-REP-0028

- `referenceDate`: `2024-12-12`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1
- `marketName`: `exact`，值為「虎翔市集Ｘ蛇得花錢新春市集（中軸島）」。
- `eventDates`: `inferable`，值為 `2025-01-29` 至 `2025-02-02`；年份依 reference date 與農曆年跨年語境推定。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `16:00`／`23:00`。
- `location`: `exact`，值為「海安路二段中軸帶」。
- `deposit`: `exact`，值為 `500 TWD`。
- `paymentTotal`: `exact`，值為 `10280 TWD`；其中 `9780` 的組成包含哪些攤位與設備費不明，不得映射成 `boothCost`。
- 設備單價存在，但已選數量在可見正文中不完整，保持 `choice_required`。
- 結論：核心草稿可套用；付款總額與攤位費必須分開。

### MTI-REP-0029

- `referenceDate`: `2024-11-23`
- `sourceKind`: cancellation-reply
- `eventBlocks`: 0 個可建立事件。
- 最新正文明確表示取消；引用的舊錄取內容包含日期、設備、費用及保證金，但全部屬歷史上下文。
- 引用區塊所有欄位：`ignore`，不得產生市集草稿。
- 結論：最新明確取消／不參與意圖的優先級高於引用的完整招募資訊。

### MTI-REP-0030

- `referenceDate`: `2024-10-21`
- `sourceKind`: correction-reply
- `eventBlocks`: 1 個不完整事件。
- `marketName`: `exact`，值為「成大醫院草地音樂會」。
- `eventDates`: `inferable`，值為 `2024-11-16`；evidence：`本活動為11/16日單一日`。
- `location` 與營業時間：`not_present`。
- `boothCost`: `inferable`，值為 `350 TWD`；最新正文要求忽略雙日推算，引用內容提供單日攤位費。
- 設備與電力均為未選單價，不直接套用。
- `paymentDeadline`: `ignore`，且民國日期位於引用舊信。
- 結論：最新更正可以覆蓋引用內容，但因缺地點仍不足以建立可送出草稿。

### MTI-REP-0031

- `referenceDate`: `2024-10-21`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1 個需確認的事件。
- `marketName`: `not_present`；完整活動名稱只存在 Gmail 主旨，正文只能看出主辦品牌。
- `eventDates`: `inferable`，候選為 `2024-12-07`、`2024-12-08`；evidence 來自兩日離場規則。
- `location`: `inferable`，候選「大東橋」只存在活動標題，預設 input 不自動採用。
- `boothCost`: `exact`，值為 `6000 TWD per_event`；`deposit`: `exact`，值為 `1000 TWD`；桌椅租賃總額 `700 TWD`。
- 兩個離場時間屬 teardown evidence，不等於營業結束時間。
- 結論：財務內容完整但核心識別不足；只有使用者把主旨一起貼入並確認地點時才能形成草稿。

### MTI-REP-0032

- `referenceDate`: `2024-10-14`
- `sourceKind`: placement-question-with-quoted-admission
- `eventBlocks`: 1 個不完整事件。
- `marketName`: `exact`，值為「赤嵌萬神節」；`eventDates`: `inferable`，值為 `2024-10-26`、`2024-10-27`。
- `location` 與營業時間：`not_present`；「美術館場地限制」是規範上下文，不足以當地點。
- `boothCost`: `inferable`，兩日候選 `700 TWD`；桌、椅、陽傘與電力都是未選方案。
- `paymentDeadline`: `ignore`，且位於引用內容。
- 最新正文是攤位圖查詢，不是欄位更正。
- 結論：可擷取既有活動候選，但缺地點，不能建立可送出草稿。

### MTI-REP-0033

- `referenceDate`: `2024-10-08`
- `sourceKind`: admission
- `eventBlocks`: 1
- `marketName`: `inferable`，候選「個體市集｜雙十連假巨蛋場次」；正文沒有單一明確活動名稱。
- `eventDates`: `inferable`，值為 `2024-10-12`、`2024-10-13`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `14:00`／`21:00`。
- `location`: `exact`，值為「巨蛋廣場樹林」。
- `checkInTime`: `exact`，值為 `12:30`。
- `boothCost`: `choice_required`，大攤 `1000`、小攤 `650 TWD`；餐車固定大攤。
- 不供傘、不供電，需自備桌與電池燈；這些是備註／禁止條件，不是免費設備。
- 結論：地點、日期與時間可套用，名稱及攤型必須確認。

### MTI-REP-0034

- `referenceDate`: `2024-09-09`
- `sourceKind`: invitation
- `eventBlocks`: 1
- `marketName`: `exact`，值為「萬聖節文酷市集」。
- `eventDates`: `exact`，值為 `2024-10-12`、`2024-10-13`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `10:30`／`18:30`。
- `location`: `exact`，值為「文化部文化資產園區 B11 國際展覽館」。
- `boothCost`: `choice_required`，單日 `1600`、雙日 `2700 TWD`。
- 設備：桌 1、椅 2、桌巾 1 為 `included`。
- `registrationDeadline`: `ignore`。
- 結論：核心草稿可套用；費用需使用者選擇參加日數。

### MTI-REP-0035

- `referenceDate`: `2024-09-03`
- `sourceKind`: admission
- `eventBlocks`: 1
- `marketName`: `exact`，值為「大兵市集」；聖誕節副標只存在 Gmail 主旨。
- `eventDates`: `exact`，值為 `2024-12-14`、`2024-12-15`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `14:30`／`20:30`。
- `location`: `exact`，值為「南紡購物中心 A2 館－戶外南紡廣場」。
- 簽到時間 `13:30–14:30` 為時間窗，標為 `choice_required`。
- 設備：陽傘 1、桌 1、椅 2 為 `included`；費用 `not_present`。
- 結論：核心草稿可套用；活動副標不可從 Gmail 主旨偷渡進 input。

### MTI-REP-0036

- `referenceDate`: `2024-07-18`
- `sourceKind`: multi-event-recruitment
- `eventBlocks`: 2
- 共用 `marketName`: `exact`，值為「大兵市集－台味小吃市集」；共用 `location` 為「台中北屯新村文創園區」。
- event 1：`2024-08-03`、`2024-08-04`，營業 `14:00–19:00`。
- event 2：`2024-08-24`、`2024-08-25`，營業 `14:00–18:30`。
- 共用設備：歐帳、桌、椅；費用 `not_present`。
- 結論：必須先讓使用者選一個場次，不得把四個日期與不同結束時間合併成一份草稿。

### MTI-REP-0037

- `referenceDate`: `2024-07-10`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1 個不完整事件。
- `marketName`: `exact`，值為「友の市 X 小滿友夜市」。
- `eventDates`: `inferable`，候選為 `2024-08-02`、`2024-08-03`、`2024-08-17`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `16:00`／`21:00`。
- `location`: `not_present`。
- 進場時間 `13:00` 可作 `earlyEntryTime` 候選；`15:00前完成` 屬 setup deadline。
- `boothCost`: `choice_required`，單日 `1500 TWD`，正文未列已確認出席日；陽傘 1 與主要照明包含。
- 電力與加租設備為選項，不直接填入；撤場 `22:00` 只進備註。
- 結論：缺地點，不能建立可送出草稿。

### MTI-REP-0038

- `referenceDate`: `2024-07-02`
- `sourceKind`: admission-with-external-response-form
- `eventBlocks`: 1 個無法由正文還原的事件。
- `marketName`: `exact`，值為「蝸蝸樂」。
- 錄取日期只存在外部回報單，正文沒有日期值；地點、時間與費用也不存在。
- `responseDeadline`: `ignore`；evidence：`7.4 23:00截止`。
- 結論：外部表單不能取代貼入文字，資訊不足時不建立草稿。

### MTI-REP-0039

- `referenceDate`: `2024-07-02`
- `sourceKind`: admission-and-deposit
- `eventBlocks`: 1 個不完整事件。
- `marketName`、`eventDates` 與 `location`: `not_present`；這些資訊只存在 Gmail 主旨，不屬預設 input evidence。
- `deposit`: `exact`，值為 `1000 TWD`。
- 營業時間與攤位費：`not_present`。
- 結論：只含保證金與入選步驟，不能形成市集草稿。

### MTI-REP-0040

- `referenceDate`: `2024-06-24`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1 個不完整事件。
- `marketName`: `exact`，值為「10月－我是小癡貨」。
- `eventDates`: `inferable`，值為 `2024-10-05`、`2024-10-06`。
- `location` 與營業時間：`not_present`。
- `boothCost`: `choice_required`，手作 `1280`、輕食 `1600`、餐車 `1920 TWD per_event`。
- 設備選項：一桌兩椅 `250`、陽傘 `400 TWD per_event`。
- 回傳／繳費期限：`ignore`。
- 結論：費用資訊充足但缺地點，不應建立可送出的草稿。

## 5. 第三批初標結果摘要（MTI-REP-0041～0060）

| 結果 | 樣本數 | 說明 |
| --- | ---: | --- |
| 可安全形成單一草稿，仍可能留白進階欄位 | 6 | 正文包含核心欄位，費用方案或逐日資訊另行確認 |
| 可形成候選草稿，但核心欄位仍需確認 | 1 | 地點只能由社群打卡指示推定 |
| 資訊不足，不應建立草稿 | 7 | 缺地點、日期或活動名稱，或關鍵資訊只存在外部來源 |
| 一封信包含多個活動，必須先選活動 | 4 | 場次電子報、報名連結目錄或市集與店鋪混合資訊 |
| 最新正文表示未錄取或內容並非市集資料 | 2 | 舊報名資料及一般合作日期／金額全部忽略 |

### MTI-REP-0041

- `referenceDate`: `2024-05-07`
- `sourceKind`: multi-event-newsletter
- `eventBlocks`: 多個，至少 5 個市集候選，另混有遊牧商店檔期。
- 正文列出多組城市、場地與日期，但部分活動名稱存在圖片或連結之外，無法可靠配對。
- 店鋪櫃位與長期檔期：`ignore`，不屬單次市集草稿。
- 結論：必須先切分並讓使用者選活動；名稱、日期與地點配對不完整的區塊不得建立草稿。

### MTI-REP-0042

- `referenceDate`: `2024-05-05`
- `sourceKind`: non-market-influencer-collaboration
- `eventBlocks`: 0
- 正文日期是貼文上線、審稿與優惠期間；金額是社群合作報價與消費折扣。
- 所有日期、金額及商品資訊：`ignore`。
- 結論：拒絕建立市集草稿；不能因同時看到日期、活動與金額字樣就判定為市集。

### MTI-REP-0043

- `referenceDate`: `2024-03-20`
- `sourceKind`: admission
- `eventBlocks`: 1
- `marketName`: `exact`，值為「搶救大兵市集」。
- `eventDates`: `exact`，值為 `2024-05-04`、`2024-05-05`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `11:00`／`18:00`。
- `location`: `inferable`，候選為「北屯新村－臺中市眷村文物館」；evidence 位於社群地標指示，不是明確地點欄位。
- `teardownWindow`: `unsupported`；evidence：`簽退18:00–19:00`，不可當營業結束。
- 費用：`not_present`；設備需自備充電型燈具。
- 結論：可形成候選草稿，但地點必須由使用者確認。

### MTI-REP-0044

- `referenceDate`: `2024-02-22`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1
- `marketName`: `exact`，值為「戀花季－手作春物市集」。
- `eventDates`: `inferable`，值為 `2024-04-13`、`2024-04-14`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `14:00`／`21:00`。
- `location`: `exact`，值為「南紡購物中心」。
- `boothCost`: `choice_required`，一般攤位兩日 `3300`、餐車兩日 `3000 TWD`。
- `deposit`: `exact`，值為 `500 TWD`；發票稅金屬條件式付款資訊，不是攤位費。
- 結論：核心草稿可套用；攤型與未稅／含稅金額需確認。

### MTI-REP-0045

- `referenceDate`: `2024-01-17`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1 個不完整事件。
- `marketName`: `exact`，值為「友の市 X 正月十五市集」。
- `eventDates`: `inferable`，值為 `2024-02-24`、`2024-02-25`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `14:00`／`20:00`。
- `location`: `not_present`。
- `earlyEntryTime`: `exact`，值為 `11:00`；`13:00前完成` 是 setup deadline，撤場 `21:30` 為備註。
- `boothCost`: `choice_required`，一般戶外攤 `1500`、現場烹調攤 `2000 TWD per_day`。
- 一般攤與餐飲歐帳的設備包含內容不同；用電與額外設備均為選項。
- 結論：缺活動地點，不能建立可送出草稿。

### MTI-REP-0046

- `referenceDate`: `2023-11-13`
- `sourceKind`: external-registration-directory
- `eventBlocks`: 多個連結候選。
- 正文只列活動公司粉專與兩種「打狗浪市集」報名連結，沒有可獨立配對的日期、時間、地點或費用。
- 外部連結內容：`unsupported`。
- 結論：可提示偵測到多個報名入口，但不能建立市集草稿。

### MTI-REP-0047

- `referenceDate`: `2023-11-13`
- `sourceKind`: multi-event-newsletter
- `eventBlocks`: 多個，至少 10 個活動或場次系列。
- 內容橫跨台北、桃園、新北、高雄及台中，包含單次、多場次、跨年與每週五六日 recurring 日期。
- 每個地點與日期必須保持在各自 event block，禁止跨活動合併。
- `registrationDeadline`: `conflict`；龐克活動的截止年標為 `2022`，早於郵件與活動一年，不得當活動日或自動修正。
- 長期遊牧商店與工讀招募：`ignore`。
- 結論：先做活動選擇；recurring 與跨年日期保持不支援，不展開。

### MTI-REP-0048

- `referenceDate`: `2023-10-22`
- `sourceKind`: invitation
- `eventBlocks`: 1
- `marketName`: `exact`，值為「Ho! Ho! Ho! 聖誕節文酷市集」。
- `eventDates`: `exact`，值為 `2023-11-25`、`2023-11-26`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `10:00`／`18:00`。
- `location`: `exact`，值為「文化部文化資產園區－表演藝術館」。
- 費用與設備：`not_present`；正文指向附件與表單，不讀取外部內容。
- `registrationDeadline`: `ignore`。
- 結論：可形成核心草稿，進階欄位保持空白。

### MTI-REP-0049

- `referenceDate`: `2023-10-21`
- `sourceKind`: payment-reply-with-quoted-admission
- `eventBlocks`: 1
- `marketName`: `exact`，值為「農島嶼 The treasure island－秧光小市」。
- `eventDates`: `inferable`，值為 `2023-12-09`、`2023-12-10`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `14:00`／`20:00`。
- `location`: `exact`，值為「高雄美術館戶外廣場及草皮」。
- `earlyEntryTime`: `exact`，值為 `11:00`。
- `boothCost`: `exact`，值為 `1600 TWD per_event`；最新回覆明確列出兩日攤費。
- `umbrellaRental`: `exact`，值為 `500 TWD per_event`；其他攤型與設備價格只是未選方案。
- 不供電與明火限制進備註候選。
- 結論：最新付款明細可作使用者已選費用證據；付款識別碼與帳戶資料不保存。

### MTI-REP-0050

- `referenceDate`: `2023-10-17`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1 個不完整事件。
- `marketName`: `exact`，值為「2024虎翔市集Ｘ甜點、服飾走春祭」。
- `eventDates`: `unsupported`；正文只寫農曆初二至初四，第一版不自行換算國曆日期。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `16:00`／`23:00`。
- `location`: `not_present`；進場 `15:00–16:00` 是時間窗，撤場 `23:00–00:00` 為備註。
- `boothCost`: `exact`，值為 `4500 TWD per_event`、三天。
- `paymentTotal`: `exact`，值為 `5430 TWD`；設備單價合計與差額相符，但數量未明寫，只能標為 `inferable`。
- 結論：缺國曆日期與地點，不建立草稿；農曆日期需使用者手動選擇。

### MTI-REP-0051

- `referenceDate`: `2023-10-16`
- `sourceKind`: rejection-reply
- `eventBlocks`: 0 個可建立事件。
- 最新正文明確表示未錄取；後段引用的報名日期與品牌申請資料全部是歷史申請內容。
- 所有引用欄位：`ignore`；個人／品牌回答不得進 fixture。
- 結論：未錄取與取消一樣，應優先阻止新增草稿。

### MTI-REP-0052

- `referenceDate`: `2023-10-11`
- `sourceKind`: registration-link-only
- `eventBlocks`: 0 個可還原事件。
- 正文只有市集招募啟動文案與外部報名連結，沒有活動名稱、日期、地點、時間或費用。
- 外部表單內容：`unsupported`。
- 結論：資訊不足，不建立草稿。

### MTI-REP-0053

- `referenceDate`: `2023-09-25`
- `sourceKind`: admission-and-payment
- `eventBlocks`: 1 個不完整事件。
- `marketName`: `exact`，值為「12月－聖誕禮物市集」。
- `eventDates`: `not_present`；完整日期只存在 Gmail 主旨，正文只寫月份。
- `location` 與營業時間：`not_present`。
- `boothCost`: `exact`，值為 `1200 TWD per_event`、兩天；設備選項為一桌兩椅 `250`、陽傘 `400 TWD`。
- 回傳與繳費期限：`ignore`。
- 結論：費用存在但核心日期與地點不足，不建立草稿。

### MTI-REP-0054

- `referenceDate`: `2023-08-31`
- `sourceKind`: recruitment
- `eventBlocks`: 1
- `marketName`: `exact`，值為「嘉義木頭人市集」。
- `eventDates`: `inferable`，值為 `2023-10-14`、`2023-10-15`、`2023-10-28`、`2023-10-29`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `10:00`／`18:00`。
- `location`: `exact`，值為「嘉義製材所」。
- 費用與設備：`not_present`；詳細資訊只存在表單。
- `registrationDeadline`: `ignore`。
- 結論：可形成核心草稿；四個不連續日期不得補成連續區間。

### MTI-REP-0055

- `referenceDate`: `2023-08-10`
- `sourceKind`: form-response
- `eventBlocks`: 1
- `marketName`: `exact`，值為「2023開嘉！雞啤節」。
- 活動整體標題範圍是 `10/14–10/15`，但使用者的 `時間場次` 明確為 `2023-10-14 14:00–20:00`。
- `eventDates`: `exact`，值採已選參與日 `2023-10-14`，不自動加入未選的 `2023-10-15`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `14:00`／`20:00`。
- `location`: `exact`，值為「嘉義文化創意產業園區」。
- `tableRental`: `exact`，值為 `250 TWD`、1 張；攤位費仍待審核，標為 `not_present`。
- 結論：表單回覆中的已選場次優先於活動整體日期；個人、品牌與商品回答全部去識別化。

### MTI-REP-0056

- `referenceDate`: `2023-07-04`
- `sourceKind`: mixed-market-and-retail-newsletter
- `eventBlocks`: 多個市集及店鋪／寄售檔期。
- 正文以單行長文混合國際手作活動、實體店招商、合作店與長期檔期，部分資訊只能由外部連結取得。
- 市集活動先切 event block；店鋪營業時間、地址與寄售檔期全部 `ignore`，不得建立成市集。
- 結論：必須先分類「單次市集／長期店鋪／寄售」，再讓使用者選擇；不能以日期＋地址直接判定市集。

### MTI-REP-0057

- `referenceDate`: `2023-06-17`
- `sourceKind`: invitation
- `eventBlocks`: 1
- `marketName`: `exact`，值為「La Rue Market x 香菜市集」。
- `eventDates`: `exact`，值為 `2023-07-29`、`2023-07-30`。
- `operatingStartTime`／`operatingEndTime`: `exact`，值為 `14:00`／`20:00`。
- `location`: `exact`，值為「台北圓山花博廣場」。
- `boothCost`: `choice_required`，餐飲 `5000`、手作 `1200 TWD per_day`。
- `registrationDeadline`: `ignore`。
- 結論：核心草稿可套用；品牌類型決定費用，不能預選第一個方案。

### MTI-REP-0058

- `referenceDate`: `2023-06-12`
- `sourceKind`: corrected-admission-with-attachment
- `eventBlocks`: 1 個不完整事件。
- `marketName`: `exact`，值為「下港散策ｘ透心涼美食祭」。
- `eventDates`、地點、營業時間、攤位費、保證金金額與已選設備：`not_present`；更新內容只存在附件。
- 取消期限與繳費期限：`ignore`。
- 不得自備發電機、無停車位、場地動線與保證金規範可成為備註候選，但不能補足核心欄位。
- 結論：正文雖是最新更正版，純文字仍不足以建立草稿。

### MTI-REP-0059

- `referenceDate`: `2023-05-03`
- `sourceKind`: payment-and-rules-only
- `eventBlocks`: 0 個可還原事件。
- `marketName`、日期與地點只存在 Gmail 主旨，正文沒有對應 evidence。
- 報到規則只寫「市集開始前一小時」，但正文沒有營業開始時間，不能換算。
- 繳費、退款、銀行與請假資訊全部 `ignore`；敏感帳戶內容不保存。
- 結論：資訊不足且含高敏感付款資料，不建立草稿。

### MTI-REP-0060

- `referenceDate`: `2023-04-09`
- `sourceKind`: slot-adjustment-and-admission
- `eventBlocks`: 1 個不完整事件。
- `marketName`: `exact`，值為「舊物20x原創14」。
- `eventDates`: `inferable`，值為 `2023-04-29`；最新正文確認只錄取一天。
- `location` 與營業時間：`not_present`；「站外」只是攤位區型，不是場地名稱。
- `boothCost`: `exact`，值為 `1000 TWD per_day`；evidence：`站外半格x1格，1000元／日`。
- 寄物 `150 TWD per_day` 是可選服務，不是設備租金。
- 結論：日期與費用可擷取，但缺地點，不能形成可送出草稿。

## 6. 第四批來源稽核摘要（MTI-REP-0061～0080）

| 來源層判定 | 數量 | 說明 |
| --- | ---: | --- |
| `single_candidate`＋`reviewable_core` | 8 | 名稱、日期與唯一或可安全推定地點足以預覽；仍須人工確認 |
| `single_candidate`＋`partial` | 8 | 可辨識單一事件，但缺核心欄位或存在欄位衝突／方案選擇 |
| `event_selection_required` | 1 | 同一邀請列出三個可分離活動 |
| `insufficient` | 1 | 只有發票／費用行政資訊，無法還原活動日期與地點 |
| `reject` | 2 | 百貨長期快閃設櫃或品牌徵選，不是單次市集事件 |

本表只描述來源郵件可提供的候選與風險，不是 parser 成功率。真正的產品答案仍以後續精確 `inputText` 為準。

### MTI-REP-0061

- `referenceDate`: `2023-04-05`
- `sourceKind`: retail-pop-up-negotiation-with-attachment
- `eventDisposition`: `reject`；內容是百貨快閃設櫃洽談，期間約二至三個月，不是單次市集。
- 擺設區域可辨識，但合約、範圍與條件只在附件或後續協商；簽名地址與聯絡資料一律排除。
- 結論：應先分類成長期零售／快閃櫃，不建立市集草稿。

### MTI-REP-0062

- `referenceDate`: `2023-03-31`
- `sourceKind`: regional-brand-selection-program
- `eventDisposition`: `reject`；「宜蘭敬好生活品牌徵選」是品牌徵選與通路培育計畫，不是特定市集事件。
- 徵選截止、說明會與未來可能參與的展覽／市集都不是活動日期 evidence。
- 結論：即使正文含「市集活動」，也不得從未指定的未來機會建立草稿。

### MTI-REP-0063

- `referenceDate`: `2023-03-09`
- `sourceKind`: admission-equipment-and-payment
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- `marketName`: `exact`，值為「Uber Eats｜大港開唱 feat. 出外人－港邊市集」；活動日期、營業時間與地點為 `not_present`。
- `boothCost`: `exact`，值為 `2500 TWD per_event`；保證金 `1250 TWD`、應繳總額 `3750 TWD` 必須分開。
- 陽傘一座、長桌一張、椅子兩張與攤位招牌為 `included`；電力為 `self_provided`。
- 結論：可預覽費用與設備，但核心欄位不足，不得宣稱完整草稿。

### MTI-REP-0064

- `referenceDate`: `2022-12-27`
- `sourceKind`: admission-and-payment-reminder
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- `marketName`: `exact`，值為「總爺迎春市集」；活動日期、時間、地點與實際參加費為 `not_present`。
- 取消回覆與繳費期限均為 `ignore`；付款帳戶不得進入 fixture。
- 結論：只有錄取身分與行政流程，不足以建立核心草稿。

### MTI-REP-0065

- `referenceDate`: `2022-11-11`
- `sourceKind`: corrected-admission-thread
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- 最新往返信件確認改為單日出席；`eventDates`: `exact`，只保留 `2022-12-18`，引用舊信的其他三日不得恢復。
- `marketName`: `exact`，值為「衛武營黃昏市集｜耶誕搖擺嘉年華」；營業時間 `15:00–20:00`，地點依文創攤型可推定為衛武營南廣場。
- 舊四日費用與折扣已因出席日更正而失效，不可沿用；桌椅、桌巾與供電不包含。
- 結論：最新更正優先，舊完整錄取區塊只能提供仍未被更正的活動 evidence。

### MTI-REP-0066

- `referenceDate`: `2022-11-02`
- `sourceKind`: corrected-admission-with-year-typo
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- 最新段落明確把活動改為 `2022-12-10`；下方活動區塊仍寫 `2021.12.10`，年份為衝突但月日一致。
- `marketName`: `exact`，值為「幸福台南市府點燈活動」；時間 `14:00–20:30` 與台南市府民治中心廣場可在顯示年份修正警告後保留為 `inferable`。
- 攤位費為一般攤 `450`、行動餐車 `800 TWD`，需依攤型選擇；桌、傘與電力為另租選項。
- 結論：最新更正可覆蓋日期，但不可默默消除舊區塊年份錯誤。

### MTI-REP-0067

- `referenceDate`: `2022-10-26`
- `sourceKind`: full-form-response
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- `marketName`: `exact`，值為「高雄駁二大義倉庫｜跨年搖擺嘉年華」；已選活動日為 `2022-12-31`、`2023-01-01`、`2023-01-02`。
- 每日時間不同，必須保留日期綁定並標為現行單值欄位 `unsupported`；場地與費用都依攤型連動，需一併 `choice_required`。
- 表單含品牌、人員、交通工具、車牌、商品與圖片回答；fixture 只能使用公開活動區塊或結構保留的合成版本。
- 結論：適合作 `focused_block` 與少量 `full_message_stress` 配對，不可保存私人回答。

### MTI-REP-0068

- `referenceDate`: `2022-09-02`
- `sourceKind`: recruitment
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- `marketName`: `exact`，值為「2022創意台中 x 綠光小市－藝植｜在這生活」。
- `eventDates`: `exact`，值為 `2022-10-29`、`2022-10-30`；時間 `11:00–18:00`；地點為台中綠空鐵道 1908。
- 報名截止與錄取公告日為 `ignore`；費用與設備為 `not_present`。
- 結論：清楚招募區塊適合作主要成功路徑 fixture。

### MTI-REP-0069

- `referenceDate`: `2022-08-29`
- `sourceKind`: admission-with-selected-day
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- 活動整體為 `2022-09-09` 至 `2022-09-11`，但錄取與費用明細明確顯示只參加 `2022-09-11`；草稿日期只採該日。
- `marketName`: `exact`，值為「衛武營黃昏市集｜聲情並茂戲劇課」；時間 `15:00–20:00`，文創攤位地點可由攤型推定為榕樹廣場南側。
- `boothCost` 為 `1200 TWD per_day`、保證金 `1000 TWD`；一傘、一桌、兩椅、桌套、招牌與陳列物為 `included`。
- 結論：已選參加日優先於活動整體範圍；個人付款與表單資料不得保存。

### MTI-REP-0070

- `referenceDate`: `2022-08-08`
- `sourceKind`: invoice-request-only
- `eventDisposition`: `insufficient`；正文只能辨識「2022海安餐酒節」及發票行政流程。
- 活動日期、時間、地點、攤位費金額與設備選擇均為 `not_present`；開票期限不是活動日期。
- 結論：不建立草稿；個人發票與寄送資料不得進 fixture。

### MTI-REP-0071

- `referenceDate`: `2022-08-01`
- `sourceKind`: exhibition-market-recruitment
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- `marketName`: `exact`，值為「鵝立頭 A Little Party 婦幼主題市集」。
- `eventDates`: `exact`，值為 `2022-09-16` 至 `2022-09-19`；時間 `10:00–18:00`；地點為大台南會展中心。
- `boothCost`: `exact`，值為 `8000 TWD per_event`、涵蓋四天；基本餐桌、展櫃、招牌與椅子一組為 `included`。
- 結論：簽名地址與聯絡方式必須排除，不能誤當活動地點。

### MTI-REP-0072

- `referenceDate`: `2022-07-27`
- `sourceKind`: recruitment-with-noncontiguous-dates
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- `marketName`: 正文可辨識系列名「綠光小市」；若 occurrence 標題未被貼入，不得由 Gmail 主旨補上。
- `eventDates`: `exact`，值為 `2022-08-13`、`2022-08-14`、`2022-08-27`、`2022-08-28`；不可展成連續區間。
- 時間 `13:00–19:00`；地點為綠光計畫與范特喜九號店花園廣場；報到時間與營業時間分開。
- 結論：可形成核心候選，但介面應顯示系列名來源與四個離散日期。

### MTI-REP-0073

- `referenceDate`: `2021-05-11`
- `sourceKind`: multi-event-invitation
- `eventDisposition`: `event_selection_required`；正文列出三個可分離活動。
- 兩個「小人類 x 伴手．禮市集」分別為 `05-14–05-16`、`05-21–05-23`，地點同為高雄左營新光三越彩虹市集夢想廣場。
- 「小人類 x 手作職人市集」為 `05-29–05-30`，地點為駁二大義倉庫；年份可依 `referenceDate` 推定為 2021。
- 時間、費用與設備只在外部連結或圖片時，對目前文字為 `not_present`／`unsupported`。
- 結論：必須先選活動；不可因名稱相同把前兩個日期區間合併。

### MTI-REP-0074

- `referenceDate`: `2021-03-26`
- `sourceKind`: html-registration-receipt
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- `marketName`: `exact`，值為「台中．5月暮暮市集」；活動概覽為整個五月，實際已選十個週末日期。
- 已選日期為 `2021-05-01`、`05-02`、`05-08`、`05-09`、`05-15`、`05-16`、`05-22`、`05-23`、`05-29`、`05-30`。
- 一般攤位 `1000 TWD per_day`、總額 `10000 TWD`；租用設備與加購均為零。活動地點與營業時間為 `not_present`。
- 結論：HTML 表格需先還原列結構；概覽日期範圍不能取代實際選中場次。

### MTI-REP-0075

- `referenceDate`: `2021-03-05`
- `sourceKind`: admission-summary
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- `marketName`: `exact`，值為「2021萬國文酷展」；日期為 `2021-03-20`、`2021-03-21`。
- 小型攤位 `800 TWD per_day`，兩日總額 `1600 TWD`；一桌、一椅與桌巾為 `included`，額外椅子明確未選。
- 地點與營業時間為 `not_present`；優惠補件期限不是活動日期。
- 結論：可預覽日期、費用與設備，但缺少地點，不能形成完整草稿。

### MTI-REP-0076

- `referenceDate`: `2021-02-28`
- `sourceKind`: admission-plus-form-response
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- 市集名稱與場地可辨識為「台中道禾六藝／刑務所演武場戶外市集」。
- 公開通知列出多個可報名週末；私人表單答案選了部分日期，但其中一組費用列把 `04-24–04-25` 寫成 `04-25–04-26`，形成日期／費用衝突。
- 傘帳與全棚費率可作 `choice_required`；在日期衝突裁決前，不計算或套用參加費。
- 結論：私人姓名、聯絡方式、查詢序號、密碼與帳戶全部移除；適合作結構保留的衝突 fixture。

### MTI-REP-0077

- `referenceDate`: `2021-02-27`
- `sourceKind`: admission-with-selected-rentals
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- `marketName`: `exact`，值為「三月火車站市集」；日期為 `2021-03-20`、`2021-03-21`；地點為台中火車站第一／第二月台。
- 一個單位 `800 TWD per_day`，兩日 `1600 TWD`；已選延長線與燈具各 `100 TWD per_day`，總額 `2000 TWD`。
- 繳費期限與連結為 `ignore`。
- 結論：付款總額可以由明確元件算式驗證，但仍分別保留攤位費與設備費。

### MTI-REP-0078

- `referenceDate`: `2021-02-22`
- `sourceKind`: waitlist-admission
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- `marketName`: `exact`，值為「四葉市集三月場」；日期可依 reference date 推定為 `2021-03-27`、`2021-03-28`。
- 每日攤位型態不同：3 月 27 日大帳篷、3 月 28 日小攤車；不可壓成單一 booth type。
- 地點、時間與費用為 `not_present`；回饋表期限為 `ignore`。
- 結論：候補錄取仍是有效參與狀態，但核心欄位不足。

### MTI-REP-0079

- `referenceDate`: `2021-01-21`
- `sourceKind`: concise-recruitment
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- `marketName`: `exact`，值為「DOTEL SPACE 春漾市集」；日期 `2021-03-20`、時間 `12:00–20:00`。
- `location`: `exact`，值為新北市板橋區三民路一段 156 號，且正文明示室內舉辦。
- 報名截止與連結為 `ignore`；費用與設備為 `not_present`。
- 結論：短而清楚的招募段落適合作主要成功路徑 fixture。

### MTI-REP-0080

- `referenceDate`: `2021-01-14`
- `sourceKind`: form-receipt-with-private-answers
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- `marketName`: `exact`，值為「2021台中燈會市集牛湳販」；表單中的「報名日期」依上下文是參加日期，值為 `2021-02-24` 至 `2021-02-28`。
- 帳篷、一桌兩椅與僅限 LED 照明的供電為 `included`；使用者明確不使用額外電力。
- 地點、營業時間與攤位費為 `not_present`；報名、公告、匯款與地圖日期均為 `ignore`。
- 結論：生日、性別、姓名、Email、電話及品牌回答不得保存；適合作問答切分與個資隔離 fixture。

## 7. 第五批來源稽核摘要（MTI-REP-0081～0100）

| 來源層判定 | 數量 | 說明 |
| --- | ---: | --- |
| `single_candidate`＋`reviewable_core` | 7 | 名稱、日期與唯一地點足以進入預覽；仍須人工確認 |
| `single_candidate`＋`partial` | 9 | 可辨識單一事件，但缺核心欄位、日期仍待選或排程超出單值欄位 |
| `single_candidate`＋`blocked` | 1 | 已選日期數量與付款天數互相矛盾 |
| `event_selection_required` | 1 | 完整表單同時列出多個不可合併的市集 |
| `reject` | 2 | 最新正文明確撤回出席，或內容是長期百貨寄售／進駐 |

本批只保存來源層結論與公開活動 evidence，不保存表單中的姓名、品牌回答、Email、電話、LINE、車牌、帳戶、帳號末碼、私人網址或商品回答；Gmail 主旨仍不屬預設 `inputText`。

### MTI-REP-0081

- `referenceDate`: `2020-11-02`
- `sourceKind`: payment-report-form-receipt
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- 表單可辨識「小蝸牛12月份」與錄取日 `2020-12-06`；`840 TWD` 只標為付款總額，沒有足夠 evidence 判定全數都是攤位費。
- 地點與營業時間為 `not_present`；匯款日不是活動日。
- 結論：只能用 `structure_preserving_synthetic` 保留活動日與付款角色；私人品牌、聯絡與付款識別資料全部移除。

### MTI-REP-0082

- `referenceDate`: `2020-08-17`
- `sourceKind`: direct-recruitment-invitation
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- `marketName`: `exact`，值為「DO & TEL 啤酒音樂市集」；日期 `2020-09-19`、時間 `14:00–20:00`、地點為 DOTEL 板橋共享空間。
- `boothCost`: `exact`，值為 `800 TWD per_event`；報名截止與錄取公告日為 `ignore`。
- 結論：清楚的招募資訊區塊適合作 focused success fixture；簽名與防毒附註排除。

### MTI-REP-0083

- `referenceDate`: `2020-06-22`
- `sourceKind`: invitation-with-available-dates
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- 可辨識「四葉市集｜淘金小鎮村」、營業時間 `15:00–20:00`、Tiger City 地下一樓新場地，以及 `300 TWD per_day`。
- `2020-07-12`、`07-18`、`07-19`、`07-25`、`07-26` 是仍有名額的可報日期，狀態為 `choice_required`，不是已選活動日。
- 特製攤車與椅子為 `included`；報名與通知日期為 `ignore`。
- 結論：來源適合驗證「可選場次不得全部預選」及簽名地址不得當活動地點。

### MTI-REP-0084

- `referenceDate`: `2020-05-22`
- `sourceKind`: payment-correction-with-quoted-admission
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- 可辨識「工藝之森」系列與 `2020-05-30` 至 `06-28` 間多個可錄取場次，但實際入選日期只在外部表單，對目前正文為 `not_present`。
- 5 月與 6 月依品牌類別有不同公開日費，電費另計；保證金必須與攤位費分開。
- 地點與營業時間缺少；付款帳戶及往返信件中的私人資料不得進 fixture。
- 結論：適合作「費率存在但已選日期在外部表單」的 partial 案例，不得把整段日期範圍當成已選出席日。

### MTI-REP-0085

- `referenceDate`: `2020-05-21`
- `sourceKind`: payment-discrepancy-thread-with-admission
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- `marketName`: `exact`，值為「迷路森林－夢遊森林」；日期為 `2020-07-11`、`07-12`，地點為松山文創園區二號倉庫。
- 兩日營業時間不同，保留日期相依排程並標為現有單值欄位 `unsupported`。
- 最新付款討論可驗證大攤、椅子與便當的元件算式，但差額與帳戶不是活動欄位。
- 結論：同一事件的付款更正不得覆蓋公開活動資料；fixture 必須合成化私人選擇與付款身份。

### MTI-REP-0086

- `referenceDate`: `2020-04-16`
- `sourceKind`: html-admission-with-per-date-pricing
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- 「五月暮暮市集」概覽涵蓋整個五月，實際錄取日為 `2020-05-02`、`05-03`、`05-15`、`05-16`、`05-17`、`05-22`，不可把整月全數加入。
- 每個日期各自綁定一般攤位費，總額為 `4720 TWD`；需保留 per-date cost 關係，不能壓成單一日費。
- 地點與營業時間只在外部辦法連結，對目前文字為 `not_present`。
- 結論：HTML 表格應先還原列關係；私人品牌與公司簽名資料排除。

### MTI-REP-0087

- `referenceDate`: `2020-02-11`
- `sourceKind`: admission-with-date-only-in-subject
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- 正文可辨識「倉庫市集」、`10:00–18:00`、報到 `09:00–09:45`、美術園區民生路口起始區域及 `400 TWD` 攤位費。
- 具體活動日只存在 Gmail 主旨，對預設 `inputText` 為 `not_present`；匯款與對帳日期均為 `ignore`。
- 結論：不得用主旨中的 3/07 補正文活動日，適合作 subject-leakage 防禦案例。

### MTI-REP-0088

- `referenceDate`: `2020-02-10`
- `sourceKind`: concise-recruitment-announcement
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- `marketName`: `exact`，值為「明日市集｜好評加碼特別場」；日期 `2020-02-28` 至 `03-01`、時間 `10:30–17:30`、地點為臺灣民俗文物館。
- 報名、錄取、匯款與攤位地圖日期全部為行政日期，必須 `ignore`。
- 結論：適合驗證密集行政日期中只保留市集日期。

### MTI-REP-0089

- `referenceDate`: `2020-01-29`
- `sourceKind`: admission-with-public-fee-matrix
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- 可辨識「揪揪市集 2020 二月場」、日期 `2020-02-15`、`02-16`、時間 `11:00–17:00`、地點為文化部文化資產園區文化資產大道。
- 正文只說實際入選日期另見粉絲頁，因此兩日是活動範圍，不可聲稱使用者兩日皆錄取。
- 清潔費依天數與攤數連動；桌椅另租，帳篷為 included，電力不提供。
- 結論：核心事件可預覽，但費用與出席日仍需使用者確認。

### MTI-REP-0090

- `referenceDate`: `2019-11-13`
- `sourceKind`: admission-with-external-fee-detail
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- `marketName`: `exact`，值為「聖誕FUN樂園－南紡購物中心 feat. 職人之聲」；錄取日 `2019-12-21`、`12-22`，時間均為 `14:00–21:00`。
- `location`: `exact`，值為台南南紡購物中心 1F 戶外中華東路廣場。
- 攤位費只在外部表單，對目前正文為 `not_present`；繳費期限與帳戶為 `ignore`／隱私移除。
- 結論：外部費用缺失不妨礙核心事件預覽，但不得猜測金額。

### MTI-REP-0091

- `referenceDate`: `2019-11-06`
- `sourceKind`: recruitment-with-booth-options
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- `marketName`: `exact`，值為「邊緣人市集 × 沙漠音樂節 2019」；日期 `2019-12-07`、時間 `12:00–22:20`、地點為向海咖啡。
- 小攤、大攤與全棚的尺寸和費用為 linked options；桌椅另租，不供電且需自備電池燈具。
- 結論：適合作「完整活動＋多攤型方案」focused fixture。

### MTI-REP-0092

- `referenceDate`: `2019-10-31`
- `sourceKind`: corrected-payment-reply-with-admission
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- `marketName`: `exact`，值為「綠光小市－11月台日系創作市集」；錄取日為 `2019-11-16`、`11-17`、`11-23`、`11-24`，時間 `12:00–18:30`。
- 四日攤位費、桌椅租借與加椅可由明確總額算式驗證；最新回覆只修正私人付款識別碼，不改活動欄位。
- 活動地點未在活動區塊明示；公司簽名地址不得補成市集地點。
- 結論：適合作「更正只影響私人付款欄位」與簽名地址排除案例。

### MTI-REP-0093

- `referenceDate`: `2019-10-21`
- `sourceKind`: long-date-range-admission
- `eventDisposition`: `single_candidate`；`draftReadiness`: `reviewable_core`。
- 可辨識「台南新光三越場次」、日期 `2019-11-07` 至 `11-24`、時間 `11:00–22:00`，地點為台南新光三越小西門前廣場至內街。
- 大、小攤費用為 `choice_required`；陽傘與倉儲為 included，其餘設備不提供。
- 結論：連續十八日錄取範圍可保存，但正式 fixture 應驗證是否展開日期及大／小攤方案選擇。

### MTI-REP-0094

- `referenceDate`: `2019-10-18`
- `sourceKind`: full-multi-event-form-response
- `eventDisposition`: `event_selection_required`；`draftReadiness`: `blocked`。
- 正文同時列出四四南村、MAJI MAJI、板橋環球、天空創意節、美麗華、校園場、草悟道、高雄巨蛋與駁二等多個不可合併活動及大量方案。
- 表單末段包含私人姓名、聯絡方式、所在地、車牌、品牌與商品回答；不可保存原文 full-message fixture。
- 結論：可從公開活動區塊建立多個 focused 候選；若需要 full-message stress，只能使用結構等價合成文字並先要求 event selection。

### MTI-REP-0095

- `referenceDate`: `2019-09-30`
- `sourceKind`: admission-with-fee-options
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- 可辨識「好朋友市集」與錄取日 `2019-10-10`、`10-11`、`10-12`、`10-13`；地點與營業時間為 `not_present`。
- 附設桌椅與自備桌椅為互斥費率；四日優惠不得在攤型未選前直接算入 booth cost。
- 結論：日期可預覽，但費用需先選方案且缺核心地點。

### MTI-REP-0096

- `referenceDate`: `2019-08-21`
- `sourceKind`: seasonal-market-recruitment-with-venue-events
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- 可辨識「秋。台鋁市集」與高雄台鋁場地；`P01` 明示的三段「招募期間」必須忽略，不能當活動日。`P02` 若貼入明示的「日期區間」，可保留為同一事件的三段活動範圍。
- 平日／假日不同時間需保留相依關係，現有單值時間欄無法安全表達。
- 正文另列場域內電影、車展、快閃與其他活動，它們不是要建立的市集 event blocks。
- 室內進駐、寄賣與手作教室是其他合作型態，不得與戶外市集欄位混合。
- 結論：適合作 recurring／seasonal schedule 與場域活動雜訊案例。

### MTI-REP-0097

- `referenceDate`: `2019-08-15`
- `sourceKind`: admission-table-with-unmapped-charge-count
- `eventDisposition`: `single_candidate`；Round C paste fixture 裁決後 `draftReadiness`: `partial`。
- 正文列出 9 月 21、22、28、29 四個錄取日；付款表只記兩個普通假日與總攤位費 `2000`。兩個計費日未對應到四個活動日，屬費用／日期 relationship `unsupported`，不是核心日期 `conflict`。
- 使用者明確不是三輪車且不使用電力；地點與營業時間只在外部辦法連結。
- 結論：四個日期可成為候選；不得任意指定哪兩日被計費，也不得以總額除以天數反推攤型。幣別缺少台灣場景而保持 unknown；付款帳戶與私人品牌回答移除。

### MTI-REP-0098

- `referenceDate`: `2019-04-03`
- `sourceKind`: payment-reply-with-quoted-admission
- `eventDisposition`: `single_candidate`；`draftReadiness`: `partial`。
- `marketName`: `exact`，值為「愛河・野餐派對」；活動日為 `2019-04-13`、`04-14`。
- 自備桌椅與附設桌椅為互斥日費；地點與營業時間在目前正文為 `not_present`。
- 最新回覆只表示已付款，不可從付款狀態推定攤型。
- 結論：引用錄取資訊可供候選，但帳戶、品牌與私人付款資料不得保存。

### MTI-REP-0099

- `referenceDate`: `2019-03-25`
- `sourceKind`: pre-admission-withdrawal
- `eventDisposition`: `reject`；`draftReadiness`: `blocked`。
- 最新正文明確表示 4 月 6、7 日無法出席台南漁光島場次，且錄取名單尚未公布。
- 引用的自動回覆只有一般流程，不得恢復成市集候選；Gmail 主旨中的報名類別也不改變撤回語意。
- 結論：`events: []`，撤回內容保留為 `ignoreSpans`，不得建立草稿。

### MTI-REP-0100

- `referenceDate`: `2018-12-20`
- `sourceKind`: long-term-retail-consignment-form
- `eventDisposition`: `reject`；`draftReadiness`: `blocked`。
- 內容是百貨場域連續 28 天的寄售／進駐合作，包含租金、百貨抽成、發票請款、月結與品牌排班，不是一般攤商親自參加的單次市集事件。
- 民國 `108` 年可推定為 2019，但日期轉換不改變事件分類。
- 表單含私人品牌、姓名、聯絡與商務回答，全部不得保存。
- 結論：應分類為長期零售／寄售合作，`events: []`，不建立市集草稿。

## 8. 校準後新增的標註決策

1. Gmail 主旨預設不是 `inputText`；正文目前段落與引用舊段落指向不同活動時，視為 `conflict`，不可任選其一。
2. 正文引用舊信或舊活動區塊時，必須辨識引用邊界；無法確認時要求使用者選擇。
3. 「詳見附件」不代表欄位存在於目前貼入文字；但使用者若自行開啟附件並貼入可見文字，該文字可正常納入解析。
4. 民國年可用固定曆法規則轉換，但仍標為 `inferable` 並顯示推定依據。
5. 每日不同營業時間、報到時間窗及進場時間窗不能壓成現有單值欄位。
6. 簽名檔地址不是活動地點；活動地點缺失時必須保持空白。
7. 一行式表單回覆要先切 question／answer，再在 answer-side 做去識別化。
8. 同一信件含多個市集時先做 event selection；寄售、店面進駐與快閃租店應排除。
9. 地點與價格互相綁定時，應作為同一方案選項，不可獨立挑選後產生不存在的組合。
10. `inputText` 預設不包含 Gmail 主旨；主旨只作 corpus 稽核提示，不能補足正文缺失欄位。
11. 最新正文若明確表示取消或不參與，引用的完整錄取資訊全部標為 `ignore`。
12. 最新更正段落可覆蓋同一封信中的引用舊值，但覆蓋關係與來源仍須展示。
13. `活動開始前一小時` 等相對時間只有在基準時間明確時才能標為 `inferable`，並保留換算說明。
14. 活動日期只存在未貼入的外部表單、圖片或附件時，對目前 `inputText` 為 `not_present`／`unsupported`；原始來源類型本身不是拒絕解析的理由。
15. 「報名日期」等欄位名稱可能實際指參加日期；日期角色需結合句子用途，不能只看標籤字面。
16. 明確未錄取與取消具有相同的草稿阻止優先級；引用的原始報名答案不得恢復為候選欄位。
17. 商品優惠期間、貼文上線日、審稿日期、合作報價及營業額統計都不是市集欄位，即使同段包含「活動」或「市集」。
18. 農曆日期與民國年分開處理；第一版可支援民國年固定換算，但農曆日期維持 `unsupported`。
19. 表單回覆同時提供活動整體日期與使用者已選場次時，草稿日期採已選場次，整體日期只作活動範圍 evidence。
20. 相對報到時間若缺少營業開始基準，必須保持空白，不可從 Gmail 主旨或常用預設補值。
21. 付款總額只有在元件標籤與算式明確時才能拆分；純總額不得等同 `boothCost`。
22. 單行電子報應先分類單次市集、店鋪、寄售與合作檔期，再進行 event block 切分。

## 9. Paste Scenario Calibration Round A

- 狀態：12 封來源的 23 個去識別化精確 `inputText` 已完成 Reviewer B 獨立複核與 Round A 差異裁決
- Gmail 原文只用於本輪受控檢視；message ID、寄件者、收件者、聯絡資料與全文均未寫入儲存庫
- 本輪刻意提高壓力案例比例，以觀察選取邊界造成的差異；不代表未來正式資料集比例

| `sourceSampleId` | 覆蓋目的 | 規劃 paste scenario | 校準時應驗證的差異 |
| --- | --- | --- | --- |
| `MTI-REP-0001` | 清楚活動區塊＋長行銷文＋簽名地址 | `focused_block`、`full_message_stress` | 兩者應得到相同核心事件；全文版需忽略舊年度敘述與簽名地址 |
| `MTI-REP-0002` | 目前錄取資訊混入舊活動區塊 | `focused_block`、`focused_with_context` | 只選目前段落時可保留單一候選；連同舊段落時必須顯示衝突 |
| `MTI-REP-0004` | 免費攤位、設備、活動日期與招募截止 | `focused_block`、`focused_with_context` | 鄰近內容可增加費用／設備欄位，但招募截止不得變成活動日 |
| `MTI-REP-0007` | 長篇表單回覆、逐日時間、費用與個資 | 三種情境全建 | 聚焦區塊應降低雜訊；全文版仍須隔離個人回答，且逐日時間不可壓成單值 |
| `MTI-REP-0011` | 地點與費用方案綁定、休停日 | `focused_block`、`full_message_stress` | 選取範圍不應破壞地點／價格綁定，休停日不得產生場次 |
| `MTI-REP-0012` | 只有繳費截止的提醒信 | `full_message_stress` | 即使使用者主動貼上，仍不得把截止日誤認為活動日或建立草稿 |
| `MTI-REP-0016` | 市集、店鋪、寄售混合電子報 | `focused_block`、`full_message_stress` | 使用者選單一活動時應直接解析；全文版需先選活動並排除非市集項目 |
| `MTI-REP-0018` | 一行式表單與大量個人回答 | `focused_block`、`full_message_stress` | 只貼設備回答仍不足以新增市集；全文版需先做問答切分與個資隔離 |
| `MTI-REP-0029` | 最新取消＋引用舊錄取資訊 | `focused_block`、`full_message_stress` | 完整上下文必須阻止草稿；若使用者只貼舊錄取區塊，系統無法推知被省略的取消語意 |
| `MTI-REP-0036` | 同一來源多場次、時間不同 | `focused_block`、`full_message_stress` | 單一場次片段可形成一份候選；全文版不得把不同場次合併 |
| `MTI-REP-0042` | 日期與金額密集但不是市集 | `full_message_stress` | 主動貼上不是市集意圖的充分證據，仍應拒絕建立草稿 |
| `MTI-REP-0047` | 十個以上活動、recurring 與跨年 | `focused_block`、`full_message_stress` | 選定單一活動可降低複雜度；全文版需 event selection，recurring 不得任意展開 |

Round A 得到的共通結論：

1. `focused_block` 才是主要成功路徑；整封 Email 的低完整度或高衝突率不能直接外推成產品成功率。
2. 使用者主動貼上是「想分析這段文字」的意圖，不代表內容一定是市集，也不代表核心欄位一定完整。
3. 系統正確性只能以實際 `inputText` 為條件；使用者省略取消、更正或方案上下文時，規則式解析器不能憑空恢復語意。
4. 因此來源 evidence、保守留白、衝突預覽與最後人工確認不是附加功能，而是必要安全機制。
5. 附件、網站或表單並非不可解析來源；產品只是不主動存取它們。使用者貼入其中的可見文字後，應依文字內容正常處理。

獨立複核結果：

- Reviewer B 在未接觸 Calibration answer key、來源郵件與 Reviewer A 答案的條件下完成 23／23 筆盲審。
- 隱私檢查 23／23 通過；`eventDisposition` 的安全意圖 23／23 一致。
- Reviewer B 分布為 `single_candidate` 14、`event_selection_required` 4、`insufficient` 3、`reject` 2。
- 欄位差異已裁決並寫回 Annotation Guide；本批定位為 Gold calibration subset v1，不是完整 Gold dataset，也尚未轉為 runtime fixture。

## 10. Paste Scenario Representative Round B

- 狀態：20 封來源的 30 個去識別化精確 `inputText` 已完成 Reviewer set C／D 隔離盲審與差異裁決
- 情境分布：20 個 `focused_block`、7 個 `focused_with_context`、3 個 `full_message_stress`
- Privacy：30／30 pass；沒有 fixture 需要重製
- `eventDisposition`：`single_candidate` 25、`event_selection_required` 1、`insufficient` 2、`reject` 2
- `draftReadiness`：`reviewable_core` 6、`partial` 16、`blocked` 8

Round B 的實質裁決補強了七項安全規則：事件數量與市集分類分離、同層更正衝突不靜默覆蓋、付款算式不代表方案已選、可參加場次不是已選日期、核心衝突必須 blocked、日期相依攤型保留為 unsupported，以及模糊「報名日期」只能標 inferable。完整逐筆理由位於 Round B Adjudication Worksheet。

Reviewer C 因工具額度中斷只封存前 25 筆；Reviewer D 在未查看 Reviewer C 或 answer key 的隔離條件下，以精確 remainder pack 補審後 5 筆。兩份結果合併覆蓋 30 個唯一 fixture；裁決沒有更動任何 `inputText`，因此不需要重新盲審。

Round B 30 筆列為 Gold representative subset Round B v1。Round A＋B 合計 53 個 Gold research fixtures，但尚未成為 runtime fixture，也不能用來宣稱 parser 品質達標。

## 11. Paste Scenario Representative Round C 與下一批工作

- `MTI-REP-0001` 至 `MTI-REP-0100` 的代表來源稽核已全部完成；Gmail 的「初標完成」與「待獨立複核」標籤皆為 100／100。
- Round C 已從 `MTI-REP-0081` 至 `MTI-REP-0100` 建立 30 個精確 paste fixtures：20 個 `focused_block`、7 個 `focused_with_context`、3 個 `full_message_stress`；Reviewer E 已完成 30／30 隔離盲審，privacy 全數通過。
- 三個 full-message stress 分別覆蓋多活動且含私人回答的 `0094`、明確撤回報名的 `0099`、長期百貨寄售表單 `0100`；所有私人回答均使用 canonical token 或結構等價合成文字。
- Answer key 與 Blind Review Pack 的 30 個 ID、`referenceDate` 與 `inputText` 已機械比對一致；差異裁決沒有修改輸入，因此不需重審。
- 裁決後分布為 `single_candidate` 26、`event_selection_required` 1、`reject` 3；`reviewable_core` 10、`partial` 16、`blocked` 4。Round C 30 筆列為 Gold representative subset Round C v1。
- Round A＋B＋C 合計 83 個 Gold research fixtures。Gate 2 支援矩陣與 Gate 3 parser contract 已凍結；目前執行 Gate 4 executable fixture 全量轉換與資料完整性測試。
- 以約 65% `focused_block`、25% `focused_with_context`、10% `full_message_stress` 作暫定資料平衡起點；若真實來源不適合，不為湊比例製造不自然樣本。
- 同一來源衍生的所有 fixture 保持在同一 split，避免規則設計與盲測洩漏。
- 後續獨立複核沿用本輪的隔離方式、完整性驗證與 `eventDisposition`／`draftReadiness` 雙軸標註。
- 完整 Corpus 與 83 筆 executable fixture 尚未完成，品質門檻仍待最終確認；目前不構成產品實作授權。
