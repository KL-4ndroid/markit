# 市集文字匯入 Paste Fixture Round B v1

- 日期：2026-09-15
- 狀態：30／30 已完成隔離盲審與差異裁決；列為 Gold representative subset Round B v1
- 來源：`MTI-REP-0061` 至 `MTI-REP-0080`
- 產品實作狀態：未核准、未開始
- 原始資料政策：不保存 Gmail ID、寄收件者、私人聯絡資料、帳戶、密碼、車牌或郵件全文
- 標註規範：`docs/MARKET_TEXT_IMPORT_ANNOTATION_GUIDE_V1_2026_09_15.md`
- 盲審專用規範：`docs/MARKET_TEXT_IMPORT_BLIND_REVIEWER_GUIDE_ROUND_B_V1_2026_09_15.md`
- 盲審包：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_B_V1_2026_09_15.md`
- Reviewer C 結果（前 25 筆）：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_C_ROUND_B_V1_2026_09_15.md`
- Reviewer D 補審結果（後 5 筆）：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_D_ROUND_B_REMAINDER_V1_2026_09_16.md`
- 裁決結果：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_ROUND_B_V1_2026_09_15.md`

## 1. 文件目的

本文件把第四批 20 封來源郵件轉成 30 個精確、去識別化的 `inputText`。每個 code block 的完整內容就是未來送入 parser 的字串；預期答案不得使用 Gmail 主旨、附件或未被貼入的段落補值。

使用兩種文字模式：

- `deidentified_verbatim_excerpt`：只保留公開活動欄位與必要排版，網址改為用途 token。
- `structure_preserving_synthetic`：往返討論、表單回覆或含私人資料的來源，只保留等價結構與公開事件資訊。

## 2. Round B 候選 fixture

### MTI-REP-0061-P01

- `referenceDate`: `2023-04-05`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 使用者選取百貨快閃設櫃的主要洽談段落

```text
擺設位置在漢神百貨 B2F 手扶梯口，UNIQLO 與 JINS 前方。
位置大小與合約條件請參考附件。
目前規劃設置快閃櫃，期間約 2～3 個月，下半年檔期可再討論。
請問供電需要多少電力？
```

- 期望：`eventDisposition: reject`、`events: []`；內容屬長期零售快閃櫃洽談，不是單次市集。
- 安全行為：不得把百貨位置當成市集地點，也不得由附件或「下半年」製造活動日期。

### MTI-REP-0062-P01

- `referenceDate`: `2023-03-31`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者選取品牌徵選的主要說明

```text
112年宜蘭敬好生活品牌徵選
徵選時間｜即日起至2023/04/28 17:00止
入選品牌將有機會參與台灣文博會及縣內外市集活動，並媒合適合通路上架。
徵選簡章｜[PROGRAM_URL]
```

- 期望：`eventDisposition: reject`、`events: []`；這是品牌徵選／通路計畫，沒有特定市集事件。
- 必須忽略：徵選截止不得標為活動日；未具名的未來市集機會不得建立事件。

### MTI-REP-0063-P01

- `referenceDate`: `2023-03-09`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者只選錄取攤位規格與設備

```text
恭喜錄取「Uber Eats｜大港開唱 feat. 出外人－港邊市集」！
錄取攤位規格：【C. 風格桌攤】
主辦提供：3m × 1.5m 淨地、陽傘 1 座、長桌 1 張、PE 椅 2 張、攤位招牌。
電力自備，僅能使用非柴油式發電機或戶外移動式行動電源。
```

- 期望：`eventDisposition: single_candidate`、`draftReadiness: partial`；名稱與設備為 `exact`，活動日期、時間與地點為 `not_present`。
- 安全行為：可預覽設備與電力規則，但不得宣稱核心草稿完整。

### MTI-REP-0063-P02

- `referenceDate`: `2023-03-09`
- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 連同付款明細與鄰近期限一起選取

```text
恭喜錄取「Uber Eats｜大港開唱 feat. 出外人－港邊市集」！
錄取攤位規格：【C. 風格桌攤】
主辦提供：陽傘 1 座、長桌 1 張、PE 椅 2 張、攤位招牌。

攤位費｜2,500元
保證金｜1,250元
應繳金額｜3,750元（此為雙日費用）

請於2023/03/15前完成匯款，並於2023/03/13前回覆用電及特殊需求。
```

- 期望：`single_candidate`＋`partial`；`boothCost: 2500 TWD per_event`、保證金 `1250 TWD`、總額 `3750 TWD`，幣別為 `currencyStatus: inferable`。
- 必須忽略：匯款與回覆期限；雙日費用說明不能在缺少活動日 evidence 時製造日期。

### MTI-REP-0064-P01

- `referenceDate`: `2022-12-27`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 使用者選取錄取與付款提醒段落

```text
感謝報名蛙抵市集，也通知您錄取「總爺迎春市集」。
若因故無法前來，請於12/30前主動告知。
請於12/31前完成市集參加費用匯款以確認出席。
活動當週將另行通知行前準備與入場動線。
```

- 期望：`single_candidate`＋`partial`；只有市集名稱為 `exact`，日期、時間、地點與費用為 `not_present`。
- 必須忽略：取消回覆與繳費期限；「活動當週」不能轉成日期。

### MTI-REP-0065-P01

- `referenceDate`: `2022-11-11`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 使用者只複製最新的出席更正往返

```text
已更正為單日出席。
12/24～12/25請假，請問可以只保留12/18一天嗎？
```

- 期望：`eventDisposition: insufficient`；可辨識一個參加日候選，但市場名稱、年份、時間與地點均不存在。
- 安全行為：不得從未貼入的 Gmail 主旨或舊錄取信補值。

### MTI-REP-0065-P02

- `referenceDate`: `2022-11-11`
- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 最新更正連同必要的引用活動區塊一起複製

```text
已更正為單日出席，保留12/18一天；12/24～12/25請假。

衛武營黃昏市集｜耶誕搖擺嘉年華
原錄取場次：12/17～12/18、12/24～12/25
市集時間：15:00～20:00
地點：衛武營北廣場及南廣場，依品牌攤型配置。

原費用明細為四日攤位費加保證金，連報週數另有折扣。
```

- 期望：`single_candidate`＋`partial`；活動日只採 `2022-12-18`，時間 `15:00–20:00`；地點依攤型為 `choice_required`。
- 安全行為：原四日日期與舊費用都因最新更正失效，不得套用。

### MTI-REP-0066-P01

- `referenceDate`: `2022-11-02`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者選取最新日期更正與活動資訊

```text
2022幸福台南市府點燈活動，活動日期調整成2022/12/10（六）。
請注意活動日期與原報名表單不同，請再次確認可以出席再匯款。

活動資訊
時間｜2021.12.10（六）14:00～20:30
地點｜台南市府民治中心廣場
```

- 裁決後期望：`single_candidate`＋`blocked`；文字可綁定成一個具名活動事件，所以事件數量不是 `insufficient`，但 `2022/12/10` 與 `2021.12.10` 對同一活動日期構成 `conflict`。
- 安全行為：不得由 Gmail 主旨補上市集性質，也不得把年份衝突拆成兩個事件或默默選其中一年；只有在使用者確認後才可套用活動日。

### MTI-REP-0066-P02

- `referenceDate`: `2022-11-02`
- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 連同費用、設備與行政期限一起選取

```text
2022幸福台南市府點燈活動，活動日期調整成2022/12/10（六）。
時間｜2021.12.10（六）14:00～20:30
地點｜台南市府民治中心廣場

攤位費：一般攤450元，行動餐車800元。
加訂桌子200元、傘300元、電100元。
匯款期限：11/6前完成；11/7進行對帳。
場地供電量有限，也允許自備發電機。
```

- 裁決後期望：`single_candidate`＋`blocked`；兩個同層活動資訊列分別寫 `2022/12/10` 與 `2021.12.10`，活動日為 `conflict`，不可只因前一句含「調整」就自動覆蓋；時間與地點仍可保留為候選。攤位費依攤型 `choice_required`，桌、傘、電力為 `rentable_not_selected`。
- 必須忽略：匯款與對帳日期；供電與自備發電機並存時不得自動勾選任一方案。

### MTI-REP-0067-P01

- `referenceDate`: `2022-10-26`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 只選公開市集資訊與方案

```text
高雄駁二大義倉庫｜跨年搖擺嘉年華
活動日期：2022/12/31（六）～2023/01/02（一）
時間：12/31 14:00～00:30；1/1～1/2 14:00～20:00
地點：駁二大義倉庫前紅磚道（文創）、大義廊道輕軌橋下（美食）

一般文創：3m × 1.5m，800元／日，提供一傘。
餐飲桌攤或二、三輪餐車：3m × 2m，1,200元／日，提供一傘。
四輪以上餐車：5m × 3m，1,500元／日，提供一傘。
```

- 期望：`single_candidate`＋`partial`；三日為 `exact`，每日時間結構為 `unsupported`；地點及費用依同一攤型方案 `choice_required`。
- 安全行為：不得把文創地點與餐車價格交叉組合。

### MTI-REP-0067-P02

- `referenceDate`: `2022-10-26`
- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 模擬完整表單回覆，公開活動規則後混入私人回答

```text
高雄駁二大義倉庫｜跨年搖擺嘉年華
活動日期：2022/12/31～2023/01/02
時間：12/31 14:00～00:30；1/1～1/2 14:00～20:00
地點：文創攤位在駁二大義倉庫前紅磚道；美食攤位在大義廊道輕軌橋下。

報名參與日期：
✓ 2022/12/31
✓ 2023/01/01
✓ 2023/01/02

品牌攤位種類：一般文創／美食桌攤／餐車
私人品牌名稱：[PRIVATE_BRAND]
攤主人數：[PRIVATE_ANSWER]
進場車牌：[PRIVATE_VEHICLE]
商品與照片：[PRIVATE_ANSWER]

桌子250元／次、椅子10元／天、桌巾100元／次、充電燈具200元／次。
```

- 期望：`single_candidate`＋`partial`；活動日期為三日；攤型、地點與費用仍需選擇；租賃項目只列 option，未顯示選中答案時不得套用。
- 隱私：所有 `[PRIVATE_*]` 片段必須忽略；不得把人數或車牌數字當成日期、費用或設備數量。

### MTI-REP-0068-P01

- `referenceDate`: `2022-09-02`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 清楚且連續的招募資訊區塊

```text
2022創意台中 x 綠光小市－藝植｜在這生活
市集地點：台中綠空鐵道1908（近台中舊車站）
市集日期：2022/10/29（六）、2022/10/30（日）
市集時間：11:00～18:00
報名日期：即日起至9/30 17:00截止，10/3公告錄取名單。
```

- 期望：`single_candidate`＋`reviewable_core`；名稱、兩日、時間與地點為 `exact`。
- 必須忽略：報名截止與錄取公告日期。

### MTI-REP-0069-P01

- `referenceDate`: `2022-08-29`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 只保留錄取日與核心活動資訊

```text
衛武營黃昏市集｜聲情並茂戲劇課
本次錄取參加日：2022/09/11（日）
市集時間：15:00～20:00
報到時間：14:00～14:30
地點：榕樹廣場南側；四輪以上餐車使用南廣場。
```

- 期望：`single_candidate`＋`partial`；活動日只採 `2022-09-11`，營業與報到時間分開；地點依攤型為 `choice_required`。
- 安全行為：不得從未貼入段落加入 9/9、9/10 或費用。

### MTI-REP-0069-P02

- `referenceDate`: `2022-08-29`
- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 連同活動整體日期、已選日期與費用明細一起貼上

```text
衛武營黃昏市集｜聲情並茂戲劇課
活動整體場次：2022/09/09～2022/09/11
本次錄取參加日：2022/09/11
市集時間：15:00～20:00
地點：榕樹廣場南側；四輪以上餐車使用南廣場。

一般文創品牌：1,200元／日
保證金：1,000元
本次應繳總額：2,200元
主辦提供一傘、一桌、兩椅、桌套、攤位招牌及陳列物。
```

- 裁決後期望：`single_candidate`＋`partial`；活動日採已選的 9/11，不自動加入 9/9、9/10；地點仍與未明示的攤型綁定而為 `choice_required`。`1200 TWD per_day` 是公開一般品牌價目、`1000 TWD` 是保證金、`2200 TWD` 是總額；算式成立可作一致性檢查，但不足以把一般品牌方案標成已選。
- 安全行為：活動整體範圍只保留為 evidence；總額不得反向證明使用者選了某一攤型或地點。

### MTI-REP-0070-P01

- `referenceDate`: `2022-08-08`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 使用者選取發票通知的主要段落

```text
2022第一屆海安餐酒節活動報名費用開立發票
請於8/15前填寫發票寄送資訊。
發票僅開立攤位費用，不含設備租賃、押金、超額電費及代租費用。
```

- 期望：`eventDisposition: insufficient`；可辨識活動名稱，但日期、時間、地點與費用金額均不存在。
- 必須忽略：開票期限及費用類別說明不得製造欄位值。

### MTI-REP-0071-P01

- `referenceDate`: `2022-08-01`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 清楚的婦幼主題市集招商資訊

```text
鵝立頭 A Little Party 婦幼主題市集
活動地點：大台南會展中心
活動日期：2022/09/16～2022/09/19
活動時間：10:00～18:00
攤位租金：8,000元／檔（4天）
設備：基本餐桌、展櫃、招牌、椅子一組
```

- 期望：`single_candidate`＋`reviewable_core`；四日、時間、地點、`8000 TWD per_event` 與所列 `included` 設備為 `exact`。
- 安全行為：設備「一組」不展開未明示的桌椅數量。

### MTI-REP-0072-P01

- `referenceDate`: `2022-07-27`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者選取市集地點、離散日期與時間

```text
綠光小市
市集地點：台中市西區中興一巷19號，綠光計畫及范特喜九號店花園廣場
市集日期：2022/08/13、08/14、08/27、08/28
市集時間：13:00～19:00
報到時間：13:00開始，13:30結束；14:00前無故未報到將釋出攤位。
招募日期：即日起至111年8月1日
```

- 期望：`single_candidate`＋`reviewable_core`；四個非連續活動日、營業時間、報到時間與地點為 `exact`。
- 必須忽略：民國年招募截止；不得把四日展開成 8/13～8/28 的連續日期。

### MTI-REP-0073-P01

- `referenceDate`: `2021-05-11`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者從多活動邀請中只選一場

```text
05/29～05/30
小人類 x 手作職人市集
地點：駁二大義倉庫
報名資訊：[REGISTRATION_URL]
```

- 期望：`single_candidate`＋`reviewable_core`；年份依 `referenceDate` 推定為 2021，名稱與地點為 `exact`。
- 安全行為：外部連結沒有貼入的時間、費用與設備均為 `not_present`。

### MTI-REP-0073-P02

- `referenceDate`: `2021-05-11`
- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者貼上整份五月活動邀請

```text
小人類市集 05～06 月活動邀請

05/14～05/16
小人類 x 伴手．禮市集
高雄左營新光三越彩虹市集－夢想廣場
[REGISTRATION_URL]

05/21～05/23
小人類 x 伴手．禮市集
高雄左營新光三越彩虹市集－夢想廣場
[REGISTRATION_URL]

05/29～05/30
小人類 x 手作職人市集
駁二大義倉庫
[REGISTRATION_URL]
```

- 期望：`event_selection_required`，共三個 event block；年份可推定為 2021。
- 安全行為：前兩場雖名稱及地點相同，日期區間不同，仍不得合併。

### MTI-REP-0074-P01

- `referenceDate`: `2021-03-26`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 從 HTML 報名表格只選實際場次與金額

```text
台中．5月暮暮市集
已選場次：
2021/05/01、05/02、05/08、05/09、05/15、05/16、05/22、05/23、05/29、05/30
攤位類型：一般攤位
攤位金額：1,000元／日
租用設備：0元
加購項目：0元
總金額：10,000元
```

- 期望：`single_candidate`＋`partial`；十個離散日期、每日攤位費與總額為 `exact`；地點與營業時間 `not_present`。
- 安全行為：HTML 列順序必須保留；零元代表未選設備，不代表免費提供設備。

### MTI-REP-0074-P02

- `referenceDate`: `2021-03-26`
- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 連同活動概覽範圍與實際報名表格一起選取

```text
活動名稱：台中．5月暮暮市集
活動日期概覽：2021/05/01～2021/05/31

實際已選場次：05/01、05/02、05/08、05/09、05/15、05/16、05/22、05/23、05/29、05/30
一般攤位：1,000元／日
設備與加購：0元
總金額：10,000元

活動日前七天內取消不退費；實際是否取消以市集公告為準。
```

- 期望：活動日期採十個已選日；整月範圍只作概覽 evidence，不展開為 31 日。
- 必須忽略：取消規則中的相對日期與一般取消說明。

### MTI-REP-0075-P01

- `referenceDate`: `2021-03-05`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 只保留成功報名的公開活動摘要

```text
恭喜報名成功「2021萬國文酷展」。
擺攤日期：2021/03/20、2021/03/21
攤位大小：小型攤位，800元／日，面長90cm × 寬77cm × 高75cm
設備：一桌、一椅、桌巾
額外租借椅子：不需要
攤位費用：1,600元
```

- 期望：`single_candidate`＋`partial`；兩日、`800 TWD per_day`、總額與 included 設備為 `exact`；額外椅子為 `rentable_not_selected`。
- 安全行為：活動地點與時間不存在，不得由活動名稱推測。

### MTI-REP-0076-P01

- `referenceDate`: `2021-02-28`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 只選公開錄取通知與收費標準

```text
台中道禾六藝／刑務所演武場戶外市集
可參加場次：3/13～3/14、3/27～3/28、4/10～4/11、4/24～4/25

收費標準：
傘帳一天700元、兩天1,300元，含一桌二椅。
全棚一天900元、兩天1,600元，含一桌二椅。
全帳加租一桌200元；加租椅子20元／張。
```

- 裁決後期望：`single_candidate`＋`partial`；年份可依 reference date 推定為 2021，場地取自活動名稱；四組「可參加場次」為 `choice_required`，不是已選活動日；攤型與費率同樣為 `choice_required`。
- 安全行為：公開「可參加場次」不是使用者已選場次，不得預選全部日期送出。

### MTI-REP-0076-P02

- `referenceDate`: `2021-02-28`
- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 公開通知連同去識別化表單選項一起貼上

```text
台中道禾六藝／刑務所演武場戶外市集
公開場次：3/13～3/14、3/27～3/28、4/10～4/11、4/24～4/25

表單已選日期：3/13、4/10、4/11、4/24、4/25
3月費用：3/13 傘帳一天700元
4月費用：4/10～4/11 傘帳兩天1,300元；4/25～4/26 傘帳兩天1,300元
設備：傘帳包含一桌二椅
```

- 裁決後期望：`single_candidate`＋`blocked`；4 月已選日期與費用列出現 `04/24～04/25` 對 `04/25～04/26` 的核心日期 `conflict`。
- 安全行為：衝突裁決前不得計算總費或套用 4 月日期；不得保存表單中的私人識別欄位。

### MTI-REP-0077-P01

- `referenceDate`: `2021-02-27`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 保留錄取場次、攤位費與已選設備

```text
錄取「三月火車站市集」
地點：台中火車站第一／第二月台
日期：2021/03/20～2021/03/21
一個單位：200 × 150cm，800元／日，兩日共1,600元。
已選延長線：100元／日
已選燈具含燈泡：100元／日
總金額：2,000元
```

- 期望：`single_candidate`＋`reviewable_core`；日期、地點、攤位費、兩項設備費與總額均為 `exact`。
- 安全行為：總額只作元件算式驗證，不能覆蓋攤位費欄位。

### MTI-REP-0078-P01

- `referenceDate`: `2021-02-22`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 只保留候補錄取場次與每日攤型

```text
四葉市集三月場候補錄取通知
3/27：大帳篷
3/28：小攤車
現場繳費，不提供匯款資料。
請於2/26 24:00前填寫入選回饋表，逾期視同放棄。
```

- 期望：`single_candidate`＋`partial`；年份推定為 2021；每日不同攤型保留日期綁定並標為 `unsupported`。
- 必須忽略：回饋表期限；地點、時間與費用為 `not_present`。

### MTI-REP-0079-P01

- `referenceDate`: `2021-01-21`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 短而完整的市集招募資訊

```text
DOTEL SPACE 春漾市集～一起來野餐吧！
日期：2021/03/20（六）
時間：12:00～20:00
地點：新北市板橋區三民路一段156號（室內舉辦）
報名期間：即日起至2021/01/27 24:00止
報名連結：[REGISTRATION_URL]
```

- 期望：`single_candidate`＋`reviewable_core`；名稱、日期、時間與公開活動地點為 `exact`。
- 必須忽略：報名截止與連結。

### MTI-REP-0080-P01

- `referenceDate`: `2021-01-14`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 從表單回覆只選活動與已選場次設備

```text
2021台中燈會市集牛湳販
已選參加日期：2021/02/24、02/25、02/26、02/27、02/28
攤位型態：一般桌子
攤位費用包含：帳篷、一桌兩椅、供電（僅限LED照明使用）
額外電力：不使用
```

- 期望：`single_candidate`＋`partial`；五日、攤位型態與 included 設備為 `exact`；地點、時間與費用為 `not_present`。
- 安全行為：表單欄位「報名日期」依上下文解為參加日期，不得加入行政日程。

### MTI-REP-0080-P02

- `referenceDate`: `2021-01-14`
- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 連同報名流程日程與已選活動資料一起貼上

```text
2021台中燈會市集牛湳販
報名期間：2021/01/13～2021/01/17
錄取公告：2021/01/19
匯款期間：2021/01/19～2021/01/21
攤位地圖公告：2021/02/17

已選參加日期：2021/02/24～2021/02/28
攤位型態：一般桌子
設備包含：帳篷、一桌兩椅、LED照明用電
```

- 期望：活動日只採 2/24～2/28；名稱、攤型與設備為 `exact`，核心地點與時間仍缺少。
- 必須忽略：報名、錄取、匯款與地圖公告日期。

### MTI-REP-0080-P03

- `referenceDate`: `2021-01-14`
- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 模擬完整表單確認信，含行政日期及私人回答 token

```text
已收到「2021台中燈會市集牛湳販」報名表。

報名期間：2021/01/13～2021/01/17
錄取公告：2021/01/19
匯款期間：2021/01/19～2021/01/21
攤位地圖：2021/02/17

私人姓名：[PRIVATE_PERSON]
Email：[EMAIL]
生日：[PRIVATE_DATE]
性別：[PRIVATE_ANSWER]

報名日期：2021/02/24、02/25、02/26、02/27、02/28
設備：帳篷、一桌兩椅、LED照明用電
額外電力：不使用
攤位型態：一般桌子
```

- 裁決後期望：`single_candidate`＋`partial`；「報名日期」只能依具名市集報名表上下文推定為活動日，因此狀態為 `inferable` 而非 `exact`；四組行政日期全部 `ignore`。
- 隱私：`[PRIVATE_*]`、`[EMAIL]` 皆視為已遮罩並必須忽略；非標準 token 不構成原值洩漏，但後續新 fixture 應正規化為 Annotation Guide 的標準 token。

## 3. 情境分布

| 情境 | 數量 | 比例 | 定位 |
| --- | ---: | ---: | --- |
| `focused_block` | 20 | 66.7% | 主要使用流程，涵蓋正向、部分資訊及非市集判斷 |
| `focused_with_context` | 7 | 23.3% | 更正、期限、整體日期、費用與欄位衝突 |
| `full_message_stress` | 3 | 10.0% | 多活動或表單私人回答的防禦性案例 |

此分布接近 Selection Policy v1 的 65%／25%／10% 起點。每封來源至少有一個自然的 focused sample；額外樣本只用於確實存在的上下文或壓力差異。

## 4. 第一輪隱私與完整性檢查

- 未保存 Gmail message ID、thread ID、寄件者、收件者或郵件全文。
- 未保存私人姓名、品牌、Email、電話、帳戶、密碼、生日、性別、車牌、商品回答或照片網址。
- 公開活動名稱、日期、時間、場地、費用與設備只保留驗證解析必要的最小文字。
- 所有 URL 及私人回答均替換為用途 token。
- 同一來源的所有 fixture 必須進入相同資料 split。

## 5. Round B 完成狀態

1. Reviewer C 在隔離條件下完成並封存前 25 筆；因工具額度中斷，未持久化的後 5 筆由新的隔離 Reviewer D 使用精確 remainder pack 補審。
2. Reviewer set C／D 合併後為 30／30 個唯一 fixture；30／30 privacy pass，沒有 fixture 因個資問題需要重製。
3. 裁決只修改答案與通用政策，沒有改動任何 `inputText`，因此不需要重新盲審。
4. 30 筆全部通過，可列為 Gold representative subset Round B v1；此名稱只表示研究 fixture 已完成雙人判讀與裁決，不表示完整 Corpus、runtime parser 或產品功能已完成。

## 6. 下一關卡

1. 完成剩餘 20／100 封代表來源稽核，必要時依 Selection Policy 建立下一批 paste fixtures。
2. 另外處理歧義案例、負面案例與保留盲測；不得以 Round A＋B 的 53 筆取代尚未建立的評估 split。
3. 在進入 parser 技術規格前，先凍結 MVP 支援欄位、`unsupported` 呈現方式及欄位級驗收指標。
