# 市集文字匯入 Paste Fixture Blind Review Pack Round B v1

- 日期：2026-09-15
- 狀態：待獨立複核
- 內容：30 個去識別化 `inputText`；不含第一位標註者答案、來源類型、paste scenario 或選取理由
- 產品實作狀態：未核准、未開始
- 允許規範：`docs/MARKET_TEXT_IMPORT_BLIND_REVIEWER_GUIDE_ROUND_B_V1_2026_09_15.md`

## 1. 複核者隔離規則

1. 不查看 Round B answer key、Annotation Pass 1、Discovery Record、Corpus Curation、Round A 結果、Gmail 或其他 agent 答案。
2. 只根據本文件每筆 `referenceDate` 與 `inputText` 判斷。
3. 每個非空值必須引用目前輸入中的最小 evidence span。
4. 日期、時間與金額先標記語意角色，再判斷是否能填入新增市集。
5. 無法唯一判定時使用 `choice_required`、`conflict` 或 `unsupported`，不得猜測。
6. 若仍有可識別的私人資料，標記 `privacyReview: fail` 並停止該筆欄位複核。
7. `eventDisposition` 與 `draftReadiness` 分開判斷；無論結果為何都不得自動送出。

## 2. 回答格式

每個 fixture 使用以下形狀：

```yaml
fixtureId:
reviewerId:
reviewedAt:
privacyReview: pass | fail
eventDisposition: single_candidate | event_selection_required | insufficient | reject
draftReadiness: reviewable_core | partial | blocked
events:
  - marketName: { status: exact | inferable | choice_required | conflict | not_present | unsupported | ignore, value: null, evidence: null }
    eventDates: { status: null, value: [], evidence: [] }
    location: { status: null, value: null, evidence: null }
    times: []
    costs: []
    equipment: []
ignoreSpans: []
warnings: []
notes:
```

## 3. 盲審輸入

### MTI-REP-0061-P01

- `referenceDate`: `2023-04-05`

```text
擺設位置在漢神百貨 B2F 手扶梯口，UNIQLO 與 JINS 前方。
位置大小與合約條件請參考附件。
目前規劃設置快閃櫃，期間約 2～3 個月，下半年檔期可再討論。
請問供電需要多少電力？
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0062-P01

- `referenceDate`: `2023-03-31`

```text
112年宜蘭敬好生活品牌徵選
徵選時間｜即日起至2023/04/28 17:00止
入選品牌將有機會參與台灣文博會及縣內外市集活動，並媒合適合通路上架。
徵選簡章｜[PROGRAM_URL]
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0063-P01

- `referenceDate`: `2023-03-09`

```text
恭喜錄取「Uber Eats｜大港開唱 feat. 出外人－港邊市集」！
錄取攤位規格：【C. 風格桌攤】
主辦提供：3m × 1.5m 淨地、陽傘 1 座、長桌 1 張、PE 椅 2 張、攤位招牌。
電力自備，僅能使用非柴油式發電機或戶外移動式行動電源。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0063-P02

- `referenceDate`: `2023-03-09`

```text
恭喜錄取「Uber Eats｜大港開唱 feat. 出外人－港邊市集」！
錄取攤位規格：【C. 風格桌攤】
主辦提供：陽傘 1 座、長桌 1 張、PE 椅 2 張、攤位招牌。

攤位費｜2,500元
保證金｜1,250元
應繳金額｜3,750元（此為雙日費用）

請於2023/03/15前完成匯款，並於2023/03/13前回覆用電及特殊需求。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0064-P01

- `referenceDate`: `2022-12-27`

```text
感謝報名蛙抵市集，也通知您錄取「總爺迎春市集」。
若因故無法前來，請於12/30前主動告知。
請於12/31前完成市集參加費用匯款以確認出席。
活動當週將另行通知行前準備與入場動線。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0065-P01

- `referenceDate`: `2022-11-11`

```text
已更正為單日出席。
12/24～12/25請假，請問可以只保留12/18一天嗎？
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0065-P02

- `referenceDate`: `2022-11-11`

```text
已更正為單日出席，保留12/18一天；12/24～12/25請假。

衛武營黃昏市集｜耶誕搖擺嘉年華
原錄取場次：12/17～12/18、12/24～12/25
市集時間：15:00～20:00
地點：衛武營北廣場及南廣場，依品牌攤型配置。

原費用明細為四日攤位費加保證金，連報週數另有折扣。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0066-P01

- `referenceDate`: `2022-11-02`

```text
2022幸福台南市府點燈活動，活動日期調整成2022/12/10（六）。
請注意活動日期與原報名表單不同，請再次確認可以出席再匯款。

活動資訊
時間｜2021.12.10（六）14:00～20:30
地點｜台南市府民治中心廣場
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0066-P02

- `referenceDate`: `2022-11-02`

```text
2022幸福台南市府點燈活動，活動日期調整成2022/12/10（六）。
時間｜2021.12.10（六）14:00～20:30
地點｜台南市府民治中心廣場

攤位費：一般攤450元，行動餐車800元。
加訂桌子200元、傘300元、電100元。
匯款期限：11/6前完成；11/7進行對帳。
場地供電量有限，也允許自備發電機。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0067-P01

- `referenceDate`: `2022-10-26`

```text
高雄駁二大義倉庫｜跨年搖擺嘉年華
活動日期：2022/12/31（六）～2023/01/02（一）
時間：12/31 14:00～00:30；1/1～1/2 14:00～20:00
地點：駁二大義倉庫前紅磚道（文創）、大義廊道輕軌橋下（美食）

一般文創：3m × 1.5m，800元／日，提供一傘。
餐飲桌攤或二、三輪餐車：3m × 2m，1,200元／日，提供一傘。
四輪以上餐車：5m × 3m，1,500元／日，提供一傘。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0067-P02

- `referenceDate`: `2022-10-26`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0068-P01

- `referenceDate`: `2022-09-02`

```text
2022創意台中 x 綠光小市－藝植｜在這生活
市集地點：台中綠空鐵道1908（近台中舊車站）
市集日期：2022/10/29（六）、2022/10/30（日）
市集時間：11:00～18:00
報名日期：即日起至9/30 17:00截止，10/3公告錄取名單。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0069-P01

- `referenceDate`: `2022-08-29`

```text
衛武營黃昏市集｜聲情並茂戲劇課
本次錄取參加日：2022/09/11（日）
市集時間：15:00～20:00
報到時間：14:00～14:30
地點：榕樹廣場南側；四輪以上餐車使用南廣場。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0069-P02

- `referenceDate`: `2022-08-29`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0070-P01

- `referenceDate`: `2022-08-08`

```text
2022第一屆海安餐酒節活動報名費用開立發票
請於8/15前填寫發票寄送資訊。
發票僅開立攤位費用，不含設備租賃、押金、超額電費及代租費用。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0071-P01

- `referenceDate`: `2022-08-01`

```text
鵝立頭 A Little Party 婦幼主題市集
活動地點：大台南會展中心
活動日期：2022/09/16～2022/09/19
活動時間：10:00～18:00
攤位租金：8,000元／檔（4天）
設備：基本餐桌、展櫃、招牌、椅子一組
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0072-P01

- `referenceDate`: `2022-07-27`

```text
綠光小市
市集地點：台中市西區中興一巷19號，綠光計畫及范特喜九號店花園廣場
市集日期：2022/08/13、08/14、08/27、08/28
市集時間：13:00～19:00
報到時間：13:00開始，13:30結束；14:00前無故未報到將釋出攤位。
招募日期：即日起至111年8月1日
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0073-P01

- `referenceDate`: `2021-05-11`

```text
05/29～05/30
小人類 x 手作職人市集
地點：駁二大義倉庫
報名資訊：[REGISTRATION_URL]
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0073-P02

- `referenceDate`: `2021-05-11`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0074-P01

- `referenceDate`: `2021-03-26`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0074-P02

- `referenceDate`: `2021-03-26`

```text
活動名稱：台中．5月暮暮市集
活動日期概覽：2021/05/01～2021/05/31

實際已選場次：05/01、05/02、05/08、05/09、05/15、05/16、05/22、05/23、05/29、05/30
一般攤位：1,000元／日
設備與加購：0元
總金額：10,000元

活動日前七天內取消不退費；實際是否取消以市集公告為準。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0075-P01

- `referenceDate`: `2021-03-05`

```text
恭喜報名成功「2021萬國文酷展」。
擺攤日期：2021/03/20、2021/03/21
攤位大小：小型攤位，800元／日，面長90cm × 寬77cm × 高75cm
設備：一桌、一椅、桌巾
額外租借椅子：不需要
攤位費用：1,600元
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0076-P01

- `referenceDate`: `2021-02-28`

```text
台中道禾六藝／刑務所演武場戶外市集
可參加場次：3/13～3/14、3/27～3/28、4/10～4/11、4/24～4/25

收費標準：
傘帳一天700元、兩天1,300元，含一桌二椅。
全棚一天900元、兩天1,600元，含一桌二椅。
全帳加租一桌200元；加租椅子20元／張。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0076-P02

- `referenceDate`: `2021-02-28`

```text
台中道禾六藝／刑務所演武場戶外市集
公開場次：3/13～3/14、3/27～3/28、4/10～4/11、4/24～4/25

表單已選日期：3/13、4/10、4/11、4/24、4/25
3月費用：3/13 傘帳一天700元
4月費用：4/10～4/11 傘帳兩天1,300元；4/25～4/26 傘帳兩天1,300元
設備：傘帳包含一桌二椅
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0077-P01

- `referenceDate`: `2021-02-27`

```text
錄取「三月火車站市集」
地點：台中火車站第一／第二月台
日期：2021/03/20～2021/03/21
一個單位：200 × 150cm，800元／日，兩日共1,600元。
已選延長線：100元／日
已選燈具含燈泡：100元／日
總金額：2,000元
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0078-P01

- `referenceDate`: `2021-02-22`

```text
四葉市集三月場候補錄取通知
3/27：大帳篷
3/28：小攤車
現場繳費，不提供匯款資料。
請於2/26 24:00前填寫入選回饋表，逾期視同放棄。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0079-P01

- `referenceDate`: `2021-01-21`

```text
DOTEL SPACE 春漾市集～一起來野餐吧！
日期：2021/03/20（六）
時間：12:00～20:00
地點：新北市板橋區三民路一段156號（室內舉辦）
報名期間：即日起至2021/01/27 24:00止
報名連結：[REGISTRATION_URL]
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0080-P01

- `referenceDate`: `2021-01-14`

```text
2021台中燈會市集牛湳販
已選參加日期：2021/02/24、02/25、02/26、02/27、02/28
攤位型態：一般桌子
攤位費用包含：帳篷、一桌兩椅、供電（僅限LED照明使用）
額外電力：不使用
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0080-P02

- `referenceDate`: `2021-01-14`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0080-P03

- `referenceDate`: `2021-01-14`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `draftReadiness`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

## 4. 完成條件

- 30 個 fixture 均有 privacy、event disposition 與 draft readiness 判定。
- 每個非空欄位都有目前 `inputText` 中的 evidence。
- 所有 `ignore`、`choice_required`、`conflict` 與 `unsupported` 均有理由。
- 複核者明確聲明未查看禁讀文件或來源資料。
- 第二份答案封存後，才可與 Round B answer key 比對並建立 adjudication。
