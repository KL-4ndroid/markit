# 市集文字匯入 Paste Fixture Round C v1

- 日期：2026-09-16
- 狀態：30／30 已完成獨立盲審與差異裁決；列為 Gold representative subset Round C v1
- 來源：`MTI-REP-0081` 至 `MTI-REP-0100`
- 產品實作狀態：未核准、未開始
- 原始資料政策：不保存 Gmail ID、寄收件者、私人聯絡資料、帳戶、付款識別碼、車牌或郵件全文
- 標註規範：`docs/MARKET_TEXT_IMPORT_ANNOTATION_GUIDE_V1_2026_09_15.md`
- 盲審規範：`docs/MARKET_TEXT_IMPORT_BLIND_REVIEWER_GUIDE_ROUND_C_V1_2026_09_16.md`
- 盲審包：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_C_V1_2026_09_16.md`
- Reviewer E 結果：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_E_ROUND_C_V1_2026_09_16.md`
- 裁決追蹤：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_ROUND_C_V1_2026_09_16.md`

## 1. 文件目的

本文件把最後 20 封代表來源轉成 30 個精確、去識別化的 `inputText`。每個 `text` code block 的完整內容就是未來送入 parser 的字串；答案只能根據該字串與 `referenceDate`，不得使用 Gmail 主旨、附件、外部連結或未被貼入的段落補值。

使用兩種文字模式：

- `deidentified_verbatim_excerpt`：只保留公開活動欄位與必要排版，網址改為用途 token。
- `structure_preserving_synthetic`：表單回覆、付款往返或含私人資料的來源，只保留等價結構與公開事件資訊。

## 2. Round C 候選 fixture

### MTI-REP-0081-P01

- `referenceDate`: `2020-11-02`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 只保留表單中的公開市集、錄取日與付款角色

```text
小蝸牛12月份｜回報表單
錄取日期 double check：12/6（日）
本次匯款總額：840元
```

- 期望：`single_candidate`＋`partial`；日期依 `referenceDate` 推定為 `2020-12-06`；`840` 的金額與 `payment_total` 角色為 `exact`，但缺少台灣場地或明示幣別，currency 保持 unknown；不得把它當成可直接填入的 `boothCost`。
- 安全行為：地點與營業時間保持空白；不得從表單來源補回品牌、聯絡或付款識別資料。

### MTI-REP-0082-P01

- `referenceDate`: `2020-08-17`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者選取完整招募資訊區塊

```text
《DO & TEL》啤酒音樂市集 攤商招募
市集時間：2020/09/19（星期六）14:00～20:00
地點：DOTEL共享辦公空間─新北市板橋區三民路一段156號（室內舉辦）
攤租：800元
報名期間：即日起至2020/08/19（三）24:00止
評選公布：2020/08/24前以Email或專人聯繫
```

- 期望：`single_candidate`＋`reviewable_core`；名稱、日期、時間、地點與公開攤租金額 `800` 均為 `exact`；原文未明示計價單位或已選方案，金額角色為 `published_price`，TWD 只可依台灣場地另標 `inferable`。
- 必須忽略：報名截止與評選公布日期；「室內舉辦」保留為場地屬性。

### MTI-REP-0083-P01

- `referenceDate`: `2020-06-22`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 選取新場地、可報日期與提供設備

```text
台中四葉市集｜淘金小鎮村
場地：Tiger City 地下一樓淘金小鎮村
目前7/12、7/18、7/19、7/25、7/26都還有位子
市集時間：15:00-20:00
攤租：300元／天
主辦提供特製攤車（約90×70cm）與椅子
報名截止：6/28（日）
錄取通知：6/29（一）
```

- 期望：`single_candidate`＋`partial`；五個日期依 `referenceDate` 推定為 2020，但都是可報場次而非已選日期，狀態為 `choice_required`；時間、地點、日費與 included 設備為候選。
- 必須忽略：報名截止與通知日期；不可把五日全部預選。

### MTI-REP-0084-P01

- `referenceDate`: `2020-05-22`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 只選公開錄取範圍與費率說明

```text
工藝之森市集｜5/30～6/28 場次錄取通知
實際入選場次與匯款金額請見入選表單：[REGISTRATION_URL]

5/30～5/31：曾報名過5/9、5/10、5/16、5/17之品牌400元／日，其他品牌500元／日。
6月份場次：工藝品牌500元／日，非工藝品牌600元／日。
電費：100元／天。
保證金：500元，於最後一場活動日簽退後歸還。
```

- 期望：`single_candidate`＋`partial`；整體活動範圍可保留，但實際入選日期只在不可存取的外部表單，`selectedDates` 為 `unsupported` 且值為空；公開費率保留為 linked options，保證金與電費分開。
- 安全行為：不得把 `5/30～6/28` 全數當成已選參加日，也不得存取連結補值。

### MTI-REP-0084-P02

- `referenceDate`: `2020-05-22`
- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 連同付款補充與引用錄取資訊一起貼上

```text
補充：上一封忘記附上付款資訊。
匯款金額請參閱入選表單：[REGISTRATION_URL]
保證金500元將於參加者最後一場活動日簽退後歸還。
匯款帳戶：[BANK_ACCOUNT]

引用錄取資訊：
工藝之森市集｜活動場次為2020/05/30～2020/06/28之間
實際入選場次請見外部表單。
5月底日費依歷史報名資格為400或500元；6月依工藝／非工藝品牌為500或600元。
電費100元／天。
```

- 期望：`single_candidate`＋`partial`；整體活動範圍為 `exact`，實際入選日期只在外部表單，`selectedDates` 為 `unsupported` 且值為空；方案仍未選定，保證金、日費與電費角色分離。
- 必須忽略：付款帳戶與外部連結；補充信不提供新的活動日。

### MTI-REP-0085-P01

- `referenceDate`: `2020-05-21`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 選取公開活動與價目區塊

```text
迷路森林－夢遊森林
地點：松山文創園區二號倉庫
活動時間：2020/07/11（六）13:00-19:00、2020/07/12（日）11:00-18:00

大攤：1200元／日；代租桌子300元／日；代租椅子10元／日。
小攤：800元／日；代租椅子10元／日。
便當：80元／個。
```

- 期望：`single_candidate`＋`reviewable_core`；兩個日期及日期相依時間、地點為 `exact`；攤型與加購價目為 `choice_required`。
- 安全行為：兩日不同時間保留結構化 schedule，現行單值時間欄位為 `unsupported`。

### MTI-REP-0085-P02

- `referenceDate`: `2020-05-21`
- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 連同最新付款差額對話與引用活動資料一起貼上

```text
最新付款確認：
已收到2740元，但本次應付2760元。
兩日大攤2400元＋兩日兩椅40元（10×2×2）＋兩日共四個便當320元。

引用活動資訊：
迷路森林－夢遊森林
地點：松山文創園區二號倉庫
2020/07/11（六）13:00-19:00
2020/07/12（日）11:00-18:00
```

- 期望：`single_candidate`＋`reviewable_core`；日期、地點、日期相依時間及已選費用元件可辨識；`2760` 是應付總額，`2740` 是已收款額，兩者不是同欄衝突；TWD 只可依台灣場地另標 `inferable`。
- 安全行為：付款差額只產生警告，不覆蓋 `boothCost`；不得保存付款者或帳戶資料。

### MTI-REP-0086-P01

- `referenceDate`: `2020-04-16`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 保留實際錄取日期與逐日費用表

```text
五月暮暮市集｜錄取日期與費用
2020/05/02：一般攤位1000元
2020/05/03：一般攤位1000元
2020/05/15：一般攤位360元
2020/05/16：一般攤位1000元
2020/05/17：一般攤位1000元
2020/05/22：一般攤位360元
租物費：0元
```

- 期望：`single_candidate`＋`partial`；六個錄取日及逐日費用為 `exact`，但不同日期綁定不同金額，需保留 per-date cost relationship，現有單一費用欄位為 `unsupported`。
- 安全行為：地點與營業時間保持空白。

### MTI-REP-0086-P02

- `referenceDate`: `2020-04-16`
- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 連同活動概覽、總額與付款期限貼上

```text
【五月】暮暮市集
活動概覽：2020/05/01～2020/05/31
實際錄取日期：05/02、05/03、05/15、05/16、05/17、05/22

逐日一般攤位費：05/02 1000元、05/03 1000元、05/15 360元、05/16 1000元、05/17 1000元、05/22 360元。
租物費：0元
應付總額：4720元
付款期限：2020/04/19 23:59
```

- 期望：`single_candidate`＋`partial`；草稿日期採六個實際錄取日，不採整月概覽；逐日費用算式與總額一致。
- 必須忽略：付款期限；總額不得壓成單日攤位費。

### MTI-REP-0087-P01

- `referenceDate`: `2020-02-11`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 只選正文的費用與入場資訊，不包含 Gmail 主旨

```text
倉庫市集｜入選攤友資訊
攤位費400元；加訂桌子200元；傘（含座）300元。
服務台09:00開始報到，請於09:45前完成佈置。
活動時間：10:00-18:00
此次市集起始點由美術園區民生路口起始。
匯款期限：02/15前
02/16進行對帳作業
```

- 期望：`single_candidate`＋`partial`；名稱、時間、地點描述與費用可辨識，但活動日期在目前 `inputText` 中 `not_present`。
- 必須忽略：匯款與對帳日期；不得從 Gmail 主旨補入活動日。

### MTI-REP-0088-P01

- `referenceDate`: `2020-02-10`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 選取報名日程與活動資訊

```text
明日市集｜好評加碼特別場
開放報名：2020/02/10～2020/02/18
錄取公告：2020/02/19
匯款期限：2020/02/20～2020/02/23
攤位地圖：2020/02/26

市集日期：2020/02/28～2020/03/01
市集時間：10:30～17:30
地點：臺灣民俗文物館
```

- 期望：`single_candidate`＋`reviewable_core`；只採 2/28、2/29、3/1 三個活動日及唯一時間、地點。
- 必須忽略：報名、錄取、匯款與地圖日期。

### MTI-REP-0089-P01

- `referenceDate`: `2020-01-29`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 保留二月檔期、公開費率、設備與場地

```text
揪揪市集｜2020二月場次
活動日期：2020/02/15～2020/02/16
實際入圍日期請至主辦公告查詢。
時間：11:00-17:00
地點：文化部文化資產園區 文化資產大道

一天：一攤400元、兩攤800元。
兩天：一攤800元、兩攤1600元。
桌椅組200元／天（桌子180×60cm＋兩張椅子）。
主辦只提供歐式帳篷二分之一，不提供桌椅與電力。
```

- 期望：`single_candidate`＋`partial`；活動整體範圍、時間與地點為 `exact`，但實際入圍日期只存在主辦公告，`selectedDates` 為 `unsupported` 且值為空；攤數與天數方案為 `choice_required`，費率保持 linked options。
- 安全行為：不得存取主辦公告或預選兩日；設備包含與不包含狀態分開。

### MTI-REP-0090-P01

- `referenceDate`: `2019-11-13`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 選取錄取場次、時間、地點及費用缺口

```text
聖誕FUN樂園－南紡購物中心 feat. 職人之聲
錄取場次：2019/12/21（六）、2019/12/22（日）
市集時間：兩日皆為14:00-21:00
市集地點：台南南紡購物中心1F戶外中華東路廣場
攤位費用請見匯款表單：[REGISTRATION_URL]
請於2019/11/20前完成費用匯款。
```

- 期望：`single_candidate`＋`reviewable_core`；名稱、兩日、時間與地點為 `exact`；文字明示攤位費只在不可存取的外部表單，因此 `boothCost` 為 `unsupported` 且值為空。
- 必須忽略：付款期限與外部表單；不得存取連結補費用。

### MTI-REP-0091-P01

- `referenceDate`: `2019-11-06`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 選取單一活動及完整攤位方案

```text
邊緣人市集 × 沙漠音樂節2019
日期：2019/12/07（六）
時間：12:00-22:20
地點：向海咖啡（台中市龍井區台灣大道六段83號）

小攤150×150cm：400元
大攤300×150cm：700元
全棚300×300cm：1200元
主辦供棚；桌子200元／次；椅子10元／天。
不供電，請自備電池式燈具；此場不提供食品攤商。
```

- 期望：`single_candidate`＋`reviewable_core`；名稱、日期、時間與地點為 `exact`；三種攤型、尺寸與費用為 linked options／`choice_required`。
- 安全行為：供棚、桌椅租借、不供電及食品限制必須保持不同角色。

### MTI-REP-0092-P01

- `referenceDate`: `2019-10-31`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 選取錄取日期、時間與明確費用算式

```text
綠光小市－11月台日系創作市集
錄取日期：2019/11/16、11/17、11/23、11/24
活動時間：12:00-18:30
報到時間：11:00-12:00

四日攤位費1800元＋桌椅租借四日400元＋加租一張椅子四日120元＝2320元。
攤位原則需自備桌椅、招牌、桌巾與其他設備；本次費用明細另列已租桌椅。
```

- 期望：`single_candidate`＋`partial`；四日、營業與報到時間、費用元件與總額為 `exact`；地點為 `not_present`。
- 安全行為：一般「需自備」規則與本次已租桌椅不得互相覆蓋；公司簽名地址不可補成活動地點。

### MTI-REP-0092-P02

- `referenceDate`: `2019-10-31`
- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 連同最新私人付款更正與引用錄取資訊一起貼上

```text
已確認收到匯款。

上一封付款回報有誤，正確帳號末碼為：[IDENTIFIER]
報名日期：11/16-11/17、11/23-11/24
匯款金額：2320元

引用錄取資訊：
綠光小市－11月台日系創作市集
活動時間：四個錄取日皆為12:00-18:30
四日攤位費1800元＋桌椅400元＋加租椅子120元＝2320元。
```

- 期望：`single_candidate`＋`partial`；活動日期依 `referenceDate` 推定為 2019，時間與費用算式可保留；地點缺少。
- 必須忽略：付款確認與私人識別碼；最新更正只改付款欄位，不改活動答案。

### MTI-REP-0093-P01

- `referenceDate`: `2019-10-21`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 選取連續長檔期與方案設備

```text
台南新光三越場次
錄取日期：2019/11/07～2019/11/24
時間：11:00～22:00
地點：台南新光三越小西門前廣場至內街
費用：大攤900元、小攤550元
設備提供：陽傘、倉儲；其餘無
報到時間：10:00
```

- 期望：`single_candidate`＋`reviewable_core`；連續日期範圍、時間、地點與報到時間為 `exact`；大／小攤費用為 `choice_required`。
- 安全行為：陽傘、倉儲 included 與其餘設備不提供需分開保存。

### MTI-REP-0094-P01

- `referenceDate`: `2019-10-18`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 從多活動表單只選 MAJI MAJI 單一區塊

```text
邊緣人市集｜MAJI MAJI 集食行樂圓形廣場
日期：2019/11/23、2019/11/24
時間：12:00-20:00

超大攤3×3m：1200元／日
大攤3×1.5m：650元／日
小攤1.5×1.5m：400元／日
場地有遮蔽廊道，不供傘或棚；桌子250元／次、椅子10元／天。
供基本照明用電；高規格需求限1000W且須事先說明。
```

- 期望：`single_candidate`＋`reviewable_core`；兩日、時間與圓形廣場為 `exact`；三種攤型與費率為 linked options。
- 安全行為：基本照明 included 與高規格電力限制不可合併成無限制供電。

### MTI-REP-0094-P02

- `referenceDate`: `2019-10-18`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 從多活動表單只選高雄巨蛋單一區塊

```text
邊緣人市集｜K-ARENA 高雄巨蛋（體育館）
日期：2019/11/16、2019/11/17
時間：14:00-20:00

大格3×1.5m：900元／日
小格1.5×1.5m：650元／日
攤位供傘；桌子200元／次；椅子10元／天；不供電。
禁用明火與瓦斯，可停放三輪車、摩托車改裝餐車；胖卡無法停放。
```

- 期望：`single_candidate`＋`reviewable_core`；兩日、時間與高雄巨蛋為 `exact`；攤型費率為 linked options。
- 安全行為：供傘、另租桌椅、不供電與車種限制分別保留。

### MTI-REP-0094-P03

- `referenceDate`: `2019-10-18`
- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 模擬完整多活動表單回函及已遮罩私人回答

```text
邊緣人市集／11月場次報名表回函

活動一｜四四南村
11/2、11/16，12:00-19:00；全棚1200元、半棚700元、四分之一棚400元／日。

活動二｜MAJI MAJI 集食行樂圓形廣場
11/23、11/24，12:00-20:00；超大攤1200元、大攤650元、小攤400元／日。

活動三｜板橋車站2F環球購物中心
11/23、11/24、11/30、12/1，14:00-21:00；大格750元、小格550元／日。

活動四｜K-ARENA 高雄巨蛋
11/16、11/17，14:00-20:00；大格900元、小格650元／日。

私人姓名：[PERSON_NAME]
Email：[EMAIL]
聯絡電話：[PHONE_OR_CONTACT]
私人地址：[PRIVATE_ADDRESS]
車牌：[IDENTIFIER]
品牌與商品回答：[PRIVATE_FORM_ANSWER]
```

- 期望：`event_selection_required`＋`blocked`；四個活動必須先選一個，年份可依 `referenceDate` 推定為 2019；不可跨活動合併日期、時間與費用。
- 隱私：所有私人 token 只確認遮罩並 `ignore`；不得把私人地址當活動地點。

### MTI-REP-0095-P01

- `referenceDate`: `2019-09-30`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 選取四日錄取與互斥費率方案

```text
好朋友市集｜10月國慶場
錄取日期：2019/10/10、10/11、10/12、10/13
市集費用：附設桌椅550元／天；自備桌椅350元／天。
錄取四天之品牌優惠200元。
確認與匯款截止：10/2 18:00
```

- 期望：`single_candidate`＋`partial`；四日為 `exact`；兩種桌椅方案為 `choice_required`，優惠需在方案與四日參加確認後才可計算。
- 安全行為：地點與時間保持空白；確認／付款期限為 `ignore`。

### MTI-REP-0096-P01

- `referenceDate`: `2019-08-21`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 只選季節市集日期、時間與地點

```text
09-10月｜秋。台鋁市集
招募期間：09/02-09/29、09/30-10/27、10/28-11/03
市集時間：平日17:00-21:00；假日14:00-21:00
地點：高雄市前鎮區忠勤路8號
```

- 期望：`single_candidate`＋`partial`；「招募期間」不是活動日期，`dates` 為 `not_present`；平日／假日相依時間保留結構並標 `unsupported`，地點為 `exact`。
- 安全行為：三段招募期間必須 `ignore`，不得建立為活動日期；不得選用單一營業時間。

### MTI-REP-0096-P02

- `referenceDate`: `2019-08-21`
- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 連同場域活動與其他合作型態一起貼上

```text
09-10月｜秋。台鋁市集
日期區間：09/02-09/29、09/30-10/27、10/28-11/03
平日17:00-21:00；假日14:00-21:00
地點：高雄市前鎮區忠勤路8號

同場域活動：09/07-09/08街頭文化祭、09/21-09/22車展、10/06戶外電影院、10/10-10/27高雄電影節。
其他合作：室內進駐、室內寄賣、手作教室。
```

- 期望：`single_candidate`＋`reviewable_core`；「日期區間」依 `referenceDate` 推定為三段 2019 活動範圍，與唯一名稱、地點構成可預覽核心；平日／假日相依時間仍為 `unsupported`。場域活動只是附近節目，不建立額外市集，室內進駐／寄賣／教室也不得混入草稿。
- 安全行為：不得把場域活動日期加入市集日期，或把其他合作型態當設備／場地。

### MTI-REP-0097-P01

- `referenceDate`: `2019-08-15`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 只保留錄取日期、設備選擇與付款總額

```text
不能只有文青｜9月錄取通知
錄取日期：9/21（六）、9/22（日）、9/28（六）、9/29（日）
是否為三輪車：否
是否用電：否
攤位費用總額：2000元
```

- 期望：`single_candidate`＋`partial`；四個日期依 `referenceDate` 推定為 2019；非三輪車與不用電為明確回答；`2000` 的總額與角色為 `exact`，但缺少台灣場地或明示幣別，currency 保持 unknown，且不能反推單日費。
- 安全行為：地點與時間保持空白。

### MTI-REP-0097-P02

- `referenceDate`: `2019-08-15`
- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 連同格式混亂的計費表一起貼上

```text
不能只有文青｜9月錄取通知
錄取日期：9/21、9/22、9/28、9/29

確認金額：
錄取（租借）天數：普通假日 2
普通攤：1000元／日
三輪車：1200元／日
電力租借：0
攤位費用總額：2000元
```

- 期望：`single_candidate`＋`partial`；四個錄取日依 `referenceDate` 推定為 2019，沒有被「租借天數 2」取代；兩個計費日無法對應到四個日期，費用／日期關係為 `unsupported`。`2000` 總額與「租借天數 2」可保留，但僅靠算式不能證明已選普通攤；公開攤型費率維持 `choice_required`。
- 安全行為：日期可作候選；不得任意指定哪兩日被計費、不得用 `2000 ÷ 2` 反推已選攤型，也不得把總額當單日費。

### MTI-REP-0098-P01

- `referenceDate`: `2019-04-03`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 只選引用錄取中的活動與費率

```text
愛河・野餐派對
入選場次：2019/04/13（六）、2019/04/14（日）
市集費用：自備桌椅350元／天；附設桌椅550元／天。
確認與匯款期限：2019/04/03 18:00
```

- 期望：`single_candidate`＋`partial`；兩日為 `exact`；費率依桌椅方案 `choice_required`；地點與時間為 `not_present`。
- 必須忽略：確認與匯款期限。

### MTI-REP-0098-P02

- `referenceDate`: `2019-04-03`
- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 連同最新付款回覆與引用錄取資訊一起貼上

```text
最新回覆：您好，已匯款完畢，謝謝。

引用錄取資訊：
愛河・野餐派對
入選日期：2019/04/13、2019/04/14
自備桌椅350元／天；附設桌椅550元／天。
```

- 期望：`single_candidate`＋`partial`；日期與公開費率同 P01；「已匯款」不提供所選方案或金額，不能據此選擇 350 或 550 元。
- 安全行為：付款狀態只作行政備註，不得反推攤位費。

### MTI-REP-0099-P01

- `referenceDate`: `2019-03-25`
- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 保留最新撤回與引用的一般自動回覆

```text
手手市集主辦您好，因人力不足，4/6、4/7無法前往台南漁光島設攤。錄取名單尚未公布，先行撤回報名，避免作業困擾。

引用自動回覆：
我們已收到您的來信。報名市集者請留意活動前約七天公布的入選名單，無論入選與否皆以主辦公告為準。
```

- 期望：`reject`＋`blocked`；最新正文明確撤回且尚未錄取，`events: []`。
- 安全行為：4/6、4/7 與漁光島只作撤回 evidence，引用流程不得恢復成候選事件。

### MTI-REP-0100-P01

- `referenceDate`: `2018-12-20`
- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 只選公開合作條件，驗證縮短內容後仍屬長期零售

```text
愛設計市集 × 誠品站前店K12藝文西廣場
日期：民國108年2/1～2/28，共28天
地點：誠品台北站前店K12藝文西側1A廣場
租金：5000元未稅／28天／檔，提供100×60cm桌一張。
另有百貨抽成：現金30%、刷卡或禮券32%。
款項月結50天，品牌需排三個8小時班或兩個全日班協助銷售。
```

- 期望：`reject`＋`blocked`；雖含「市集」、日期與場地，內容實質是連續 28 天的百貨寄售／進駐、抽成與排班合作，`events: []`。
- 安全行為：民國年可推定為 2019，但日期可解析不改變非目標分類；費用不得套入攤位費。

### MTI-REP-0100-P02

- `referenceDate`: `2018-12-20`
- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 模擬完整進駐表單回函並遮罩私人商務回答

```text
愛設計市集 × 誠品站前店K12藝文西廣場｜進駐表單回函
檔期：民國108年2/1～2/28，共28天
地點：誠品台北站前店K12藝文西側1A廣場
租金5000元未稅／28天／檔；百貨抽成現金30%、刷卡或禮券32%。
款項月結50天；品牌需排班協助銷售。

品牌名稱：[BRAND_NAME]
姓名：[PERSON_NAME]
Email：[EMAIL]
電話與LINE：[PHONE_OR_CONTACT]
品牌網址：[PRIVATE_FORM_URL]
商品與發票回答：[PRIVATE_FORM_ANSWER]
桌數需求：[PRIVATE_FORM_ANSWER]
```

- 期望：`reject`＋`blocked`；與 P01 相同，`events: []`；表單私人回答不改變分類。
- 隱私：所有 token 皆為 `ignore`，不得保存或當作市集欄位。

## 3. 情境分布

| 情境 | 數量 | 比例 | 定位 |
| --- | ---: | ---: | --- |
| `focused_block` | 20 | 66.7% | 使用者已判讀後複製的主要成功或安全拒絕路徑 |
| `focused_with_context` | 7 | 23.3% | 付款更正、引用內容、場域雜訊與欄位衝突 |
| `full_message_stress` | 3 | 10.0% | 多活動表單、撤回報名、長期進駐表單 |

此分布延續 Selection Policy v1 的約 65%／25%／10% 起點。每個 focused fixture 都是自然連續區塊；額外版本只在來源確實存在上下文差異時建立。

## 4. 第一輪隱私與完整性檢查

- 未保存 Gmail message ID、thread ID、寄件者、收件者或郵件全文。
- 未保存私人姓名、品牌、Email、電話、LINE、帳戶、付款末碼、車牌、居住地、商品回答或照片網址。
- 公開活動名稱、日期、時間、場地、費用與設備只保留驗證解析必要的最小文字。
- 表單與付款往返使用 canonical privacy token 或結構等價合成文字。
- 同一來源衍生的所有 fixture 必須進入相同資料 split。

## 5. 獨立複核與裁決結果

- Reviewer E 在隔離條件下完成 30／30：privacy `pass` 30、`single_candidate` 26、`event_selection_required` 1、`reject` 3；`reviewable_core` 10、`partial` 16、`blocked` 4。
- 三個 `reject` 均為 `events: []`；多活動未選案例保留四個候選 event blocks。
- 裁決修正的是答案與政策，沒有修改任何 `referenceDate` 或 `inputText`，因此不需要重新盲審。
- Round C 30 筆全部通過並列為 Gold representative subset Round C v1；Round A＋B＋C 合計 83 個 Gold research fixtures。
- 下一關為執行計畫 Gate 2：凍結 MVP 支援、警告與刻意不支援範圍；這不等於產品實作授權。
