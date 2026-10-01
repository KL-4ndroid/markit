# 市集文字匯入 Paste Fixture Calibration v1

- 日期：2026-09-15
- 狀態：Round A 23 個 fixture 已完成 Reviewer B 獨立複核與差異裁決；完整 Corpus 仍待後續標註
- 來源：12 封已完成來源郵件稽核的代表樣本
- 產品實作狀態：未核准、未開始
- 原始資料政策：不保存 Gmail ID、寄收件者、私人聯絡資料或郵件全文
- 盲審包：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_V1_2026_09_15.md`
- Reviewer B 結果：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_B_V1_2026_09_15.md`
- 裁決工作表：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_V1_2026_09_15.md`

## 1. 文件目的

本文件把「來源郵件」轉換成「使用者實際貼入文字框的精確 `inputText`」，用來校準規則式解析器未來應面對的真實輸入邊界。

此處的「精確」表示 code block 內的全文就是該候選 fixture 未來要送入 parser 的完整字串；不表示必須逐字保存原始 Email。為遵守最小化、隱私與著作權原則，使用以下兩種文字模式：

- `deidentified_verbatim_excerpt`：保留來源中的必要公開欄位與排版，將 URL、聯絡資料與私人值替換成用途 token。
- `structure_preserving_synthetic`：依來源揭露的格式與歧義重新撰寫等價測試文字，不保留私人敘述或長篇行銷文案。

所有 fixture 的第一輪與 Reviewer B 獨立隱私檢查均通過，欄位差異已完成裁決。它們構成 Gold calibration subset v1，但不是完整 Corpus 的 Gold dataset，也尚未寫成 runtime 測試檔。

`sourceSampleId` 可由 `fixtureId` 移除尾端 `-Pnn` 取得；例如 `MTI-REP-0007-P02` 的來源 ID 為 `MTI-REP-0007`。同一來源的所有候選必須留在相同資料分組。

## 2. Round A 候選 fixture

### MTI-REP-0001-P01

- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者從單一活動的資訊標題開始選取

```text
【活動資訊】
活動日期｜2026年10月3日（星期六）至10月4日（星期日）
活動地點｜醒村文化景觀公園
招募對象｜品牌、職人、創作者及地方夥伴
報名連結｜[REGISTRATION_URL]
```

- 期望：日期與地點為 `exact`；`marketName` 為 `not_present`；報名連結不得成為表單欄位。
- 安全行為：可預覽部分欄位，但名稱保持空白，不得宣稱為完整草稿。

### MTI-REP-0001-P02

- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 模擬整封邀請信，包含舊年度活動、行銷文與簽名地址

```text
謝謝你參與過去的「2025眷村嘉年華」。
2026年，我們準備擴大辦理，再次邀請品牌夥伴加入。

\ 2026眷村嘉年華 /
今年，我們在岡山醒村相見！

【活動資訊】
活動日期｜2026年10月3日（星期六）至10月4日（星期日）
活動地點｜醒村文化景觀公園
招募對象｜品牌、職人、創作者及地方夥伴
報名連結｜[REGISTRATION_URL]

[PERSON_NAME]／活動聯絡人
手機號碼：[PHONE_OR_CONTACT]
電子郵件：[EMAIL]
聯絡地址：[ORGANIZER_ADDRESS]
```

- 期望：`marketName` 為「2026眷村嘉年華」，日期與地點為 `exact`。
- 必須忽略：2025 舊活動提及、聯絡人與簽名地址。

### MTI-REP-0002-P01

- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者只選取目前錄取活動

```text
謝謝您報名參與此次活動。
本封信件通知您錄取 開嘉｜11.14–11.15｜芫荽趴踢
```

- 期望：單一市場候選「開嘉｜芫荽趴踢」；日期可依 `referenceDate: 2026-07-13` 推定為 `2026-11-14`、`2026-11-15`。
- 安全行為：缺少地點與時間，只能形成不完整候選。

### MTI-REP-0002-P02

- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 目前錄取段落連同付款提醒與後方舊活動區塊一起被選取

```text
本封信件通知您錄取 開嘉｜11.14–11.15｜芫荽趴踢

繳費期限：2026/07/18 23:59 前完成繳費。
確認附件內的租借設備、總金額是否有誤。

開嘉｜雞啤節
日期｜10.17–10.18
時間｜14:00－19:00
地點｜嘉義公園
```

- 期望：偵測兩個不同活動區塊，`marketName` 與 `eventDates` 不得互相合併。
- 必須忽略：繳費期限；未貼入的附件內容不得被推測。
- 安全行為：要求使用者選擇活動，不自動套用。

### MTI-REP-0004-P01

- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者只選取明確的活動資訊區塊

```text
活動資訊
▪ 活動日期｜04/18（六）– 04/19（日）
▪ 活動時間｜13:00 – 18:00
▪ 活動地點｜高雄市楠梓區大學南路168號
▪ 招募間數｜40 間（額滿為止）
▪ 招募截止｜04/10
▪ 報名連結｜[REGISTRATION_URL]
```

- 期望：日期依 `referenceDate: 2026-04-07` 推定為 `2026-04-18`、`2026-04-19`；時間與地點為 `exact`；`marketName` 為 `not_present`。
- 必須忽略：招募截止與招募數量。

### MTI-REP-0004-P02

- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 從活動介紹開始選取，包含消費券、免費攤位與設備資訊

```text
《春日家的日常》是一場以居住生活為想像起點的生活市集。
活動期間將發放總額新台幣10萬元之消費兌換券，供民眾於現場攤位使用。
本次活動免攤位費用，皆配置三米帳篷及1桌2椅。

活動資訊
▪ 活動日期｜04/18（六）– 04/19（日）
▪ 活動時間｜13:00 – 18:00
▪ 活動地點｜高雄市楠梓區大學南路168號
▪ 招募間數｜40 間（額滿為止）
▪ 招募截止｜04/10
▪ 報名連結｜[REGISTRATION_URL]
```

- 期望：名稱、日期、時間與地點可形成候選；`boothCost` 為 `0`；帳篷為 `included` 但數量保持未知，桌 1、椅 2 為 `included`。
- 必須忽略：10 萬元消費券、招募截止與招募數量；消費券不得誤判為攤位費。

### MTI-REP-0007-P01

- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者選取表單回覆中的市集資訊區塊

```text
2026法國生活節在高雄 攤商與合作夥伴報名表

▚ 市集資訊 Market Information
1.日期：2026/5/22（五）~2026/5/24（日）；共3天。
2.市集時間：5/22 14:00~22:00
5/23 14:00~22:00
5/24 14:00~21:00
★進場時間：5/22 11:00-13:00
★撤場時間：5/24 活動時間結束21:00後才能開始撤場
3.市集地點：高雄衛武營戶外劇場＆衛武營都會公園
```

- 期望：名稱、三個日期與地點為 `exact`。
- 安全行為：逐日營業時間與進場時間窗標為現有單值欄位無法直接表達；撤場時間不得當成營業結束。

### MTI-REP-0007-P02

- `pasteScenario`: `focused_with_context`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 市集資訊連同報名截止與費用設備區塊一起被選取

```text
2026法國生活節在高雄 攤商與合作夥伴報名表

▚ 市集資訊 Market Information
日期：2026/5/22（五）~2026/5/24（日）；共3天。
市集時間：5/22 14:00~22:00、5/23 14:00~22:00、5/24 14:00~21:00
進場時間：5/22 11:00-13:00
市集地點：高雄衛武營戶外劇場＆衛武營都會公園

▚ 報名注意事項
報名截止時間：即日起至4月6日23:59截止。

▚ 費用說明
本次活動3天的攤位租金4,000元。
提供攤位看板、帳篷1頂、會議長桌1張、椅子2張、吊扇1台。
基本用電：110V／5A／300W以下。
```

- 期望：`boothCost` 為 `4000 TWD per_event`；列出的設備為 `included`；基本電力進備註候選。
- 必須忽略：4 月 6 日報名截止。

### MTI-REP-0007-P03

- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 模擬完整表單回覆，在公開活動資料後混入申請者回答

```text
2026法國生活節在高雄 攤商與合作夥伴報名表

▚ 市集資訊
日期：2026/5/22~2026/5/24
時間：5/22、5/23 14:00~22:00；5/24 14:00~21:00
地點：高雄衛武營戶外劇場＆衛武營都會公園

▚ 費用說明
活動3天攤位租金4,000元，包含帳篷1頂、長桌1張、椅子2張與吊扇1台。

報名資訊
電子信箱：[EMAIL]
公司地址：[PRIVATE_ADDRESS]
品牌名稱：[BRAND_NAME]
品牌類別：手作文創
商品介紹：[PRIVATE_FORM_ANSWER]
特殊電力需求：[PRIVATE_FORM_ANSWER]
```

- 期望：公開活動欄位與 P02 相同；私人表單回答不得成為市集欄位或被保存。
- 安全行為：逐日時間仍不壓成單一值；不得從申請者地址推定活動地點。

### MTI-REP-0011-P01

- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者選取活動、場地方案與費用的連續區塊

```text
◤ 2026駁二小夜埕－好日子 ◢
▩ 日期：2026.02.14（六）-02.22（日），活動共計8天（除夕02.16活動休停一日）
▩ 時間：14:00-22:00／最後一日-20:00
▩ 地點：駁二藝術特區 大勇區駁遊路／大義區紅磚廊道

活動參與費用：
大勇區手作攤位｜800元／日，保證金1,000元
大義區手作攤位｜1,200元／日，保證金1,000元
設備租借：遮陽傘450元／支、長桌200元／張、折疊椅50元／2張，皆為每場次價格。
```

- 期望：日期展開時排除 `2026-02-16`；地點與費用保留為兩個綁定方案；保證金為 `1000 TWD`。
- 安全行為：最後一日不同結束時間不得壓成單一營業時間；設備只列候選，不預設已租。

### MTI-REP-0011-P02

- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 活動與方案後面接續報名時程及私人表單回答

```text
2026駁二小夜埕－好日子
日期：2026.02.14-02.22，除夕02.16休停一日
時間：14:00-22:00，最後一日20:00結束
地點與費用：大勇區駁遊路800元／日；大義區紅磚廊道1,200元／日
保證金：1,000元
設備租借：遮陽傘450元、長桌200元、折疊椅2張50元，皆為每場次價格

報名時間：即日起至2025年11月21日23:00止
錄取品牌公佈時間：2025年11月26日19:00
錄取品牌繳費截止日：2025年12月12日

品牌名稱：[BRAND_NAME]
聯絡人：[PERSON_NAME]
電子信箱：[EMAIL]
商品說明：[PRIVATE_FORM_ANSWER]
```

- 期望：活動欄位與 P01 相同。
- 必須忽略：三個報名／通知／繳費日期及所有私人回答。

### MTI-REP-0012-P01

- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者誤把繳費提醒當成可新增市集的資料貼入

```text
親愛的品牌攤商朋友您好：
感謝您報名參與《2025高雄眷村嘉年華（岡山場）》。
在此再次提醒：
繳費截止日期為10/2（四）15:30前。
逾期未完成繳費及資料回報者，將視同放棄資格。
若您已完成繳費，請安心忽略本通知。
```

- 期望：市場名稱可成為 evidence，但沒有活動日期、地點或營業時間。
- 安全行為：不建立草稿；10 月 2 日必須標為 `payment_deadline`／`ignore`。

### MTI-REP-0016-P01

- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者從多活動電子報中只選取一個完整市集項目

```text
美麗華 21愛你幸福前行市集｜10月場
日期：2025/10/10-12、10/18-19、10/24-26
地點：美麗華1樓水舞廣場，台北市中山區敬業三路20號
報名連結：[REGISTRATION_URL]
```

- 期望：單一市場、八個不連續活動日期與地點為 `exact`。
- 安全行為：不得把三段日期補成一個連續區間；時間保持空白。

### MTI-REP-0016-P02

- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 模擬同一電子報同時列出市集、固定週末場、合作店與寄售

```text
多場活動同步招募中！

2025愛手創國際手作設計節
日期：11/07-11/09，每日10:30-19:00
地點：華山1914文創產業園區東2館

夏日搖擺市集｜9月場
日期：9/5-9/28每週五、六、日
地點：心中山線形公園南段

美麗華21愛你幸福前行市集
日期：2025/10/10-12、10/18-19、10/24-26
地點：美麗華1樓水舞廣場

合作店品牌進駐
檔期：2025/09/17-2026/01/15
地點：台中購物中心店鋪

中山店寄售報名中：[REGISTRATION_URL]
```

- 期望：至少三個市集 event block；合作店與寄售不是單次市集草稿。
- 安全行為：要求使用者先選活動；固定每週場次不自動展開。

### MTI-REP-0018-P01

- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者只選取表單中的設備與用電回答

```text
如需租借設備，請填寫租借數量。
會議桌（180×60cm／含兩椅）／250元／檔
紅色塑膠椅／15元／張／檔
回答：會議桌（含兩椅）1組

是否需要申請用電？
額外電力每1,000W收取300元／日。
回答：否
```

- 期望：已選設備為會議桌 1 組、含椅 2 張，候選總價 `250 TWD per_event`；用電明確為不申請。未選紅色塑膠椅可保留為 `rentable_not_selected`，不得自動套用。
- 安全行為：缺少名稱、日期與地點，不建立新市集草稿。

### MTI-REP-0018-P02

- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 模擬一行式表單回覆，保留問答順序但移除所有私人內容

```text
已經收到您的回覆。
品牌名稱：[BRAND_NAME]
來自哪個縣市：[PRIVATE_FORM_ANSWER]
品牌聯絡人：[PERSON_NAME]
聯絡人LINE ID：[PHONE_OR_CONTACT]
聯絡人電話：[PHONE_OR_CONTACT]
E-MAIL：[EMAIL]
品牌類別：[PRIVATE_FORM_ANSWER]
欲報名日期：三天全報
商品介紹：[PRIVATE_FORM_ANSWER]
租借設備：會議桌（含兩椅）1組，250元／檔
是否申請用電：否
```

- 期望：`三天全報` 沒有可換算的實際日期；設備答案可辨識，但沒有可建立的 event block。
- 安全行為：不建立草稿；所有私人回答只用於忽略／隱私測試。

### MTI-REP-0029-P01

- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者只選取被引用的舊錄取區塊，沒有包含上方取消文字

```text
感謝您報名 Butter Zoom x 奶油遊戲人間理想國 奶油市集，申請的攤位已錄取。
報名日期：12/21-12/22
租借器材：傘1、桌1、椅1
共計2日：2,000元＋750元器材＋500元保證金＝3,250元
保證金將於活動結束當天簽退後退還。
```

- 期望：可辨識市場名稱、日期候選、設備、設備費 750 與保證金 500；`boothCost: 2000 TWD per_event` 只能由付款算式排除其他元件推定，因此為 `inferable`；缺少地點與時間。
- 已知限制：此 `inputText` 沒有取消 evidence，parser 不得假裝知道來源信上方存在取消文字。

### MTI-REP-0029-P02

- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者將最新取消回覆與被引用的舊錄取資訊一起貼入

```text
您好，這次的市集因故無法前往，非常抱歉，需向您取消。

> 感謝您報名 Butter Zoom x 奶油遊戲人間理想國 奶油市集，申請的攤位已錄取。
> 報名日期：12/21-12/22
> 租借器材：傘1、桌1、椅1
> 共計2日：2,000元＋750元器材＋500元保證金＝3,250元
```

- 期望：最新取消語意優先，`eventBlocks: 0`；引用區塊所有欄位為歷史 evidence／`ignore`。
- 安全行為：阻止新增草稿。

### MTI-REP-0036-P01

- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者選取活動介紹至第一個場次為止

```text
大兵市集正在籌備8月市集活動。
此次企劃為「台味小吃市集」，招募台味文創、台味小吃、品味選物、綠色生活、懷舊二手品牌。
設備：歐帳、桌、椅

台中｜北屯新村文創園區
8.3—8.4（六日）14:00-19:00
```

- 期望：名稱為「台味小吃市集」；日期依 `referenceDate: 2024-07-18` 推定為 `2024-08-03`、`2024-08-04`；時間與地點為 `exact`；設備只有品名，提供狀態為 `unknown`／`unsupported`，不得推定為已包含。

### MTI-REP-0036-P02

- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者貼入同一活動的兩個不同地點與時間場次

```text
大兵市集正在籌備「台味小吃市集」。
設備：歐帳、桌、椅
兩場場次時間與地點：

台中｜北屯新村文創園區
8.3—8.4（六日）14:00-19:00

台中｜帝國製糖廠
8.24—8.25（六日）14:00-18:30

報名表單：[REGISTRATION_URL]
```

- 期望：兩個場次選項，各自保留日期、地點與不同結束時間。
- 安全行為：先要求使用者選場次，不得合併成四個日期配單一地點／時間；共用設備清單的提供狀態維持 `unknown`／`unsupported`。

### MTI-REP-0042-P01

- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 日期、金額與「市集」字樣密集，但實際是社群合作與商品優惠

```text
合作貼文預計5月5日提供審稿，5月8日前公開。
限時動態會帶到貴司近期市集資訊。

優惠時間：2024.05.04～2024.05.12
優惠碼：[PROMO_CODE]
消費滿500元折100元，滿1,500元贈送耳環。

本次IG單篇圖文合作報價4,000元，包含照片與文案。
```

- 期望：`eventBlocks: 0`。
- 必須忽略：審稿／上線／優惠日期、消費門檻與合作報價；任何金額都不是攤位費。

### MTI-REP-0047-P01

- `pasteScenario`: `focused_block`
- `sourceTextMode`: `deidentified_verbatim_excerpt`
- `selectionRationale`: 使用者從多活動電子報中選取單一市集項目

```text
高雄｜2023聖誕馬戲嘉年華・衛武營黃昏市集
地點：衛武營國家藝術文化中心
12/9-12/10　北廣場／南廣場
12/16-12/17　北廣場／南廣場
12/23-12/24　北廣場
報名連結：[REGISTRATION_URL]
```

- 期望：單一市場；依 `referenceDate: 2023-11-13` 產生六個活動日期；地點為衛武營，區域資訊保留為日期方案 evidence。
- 安全行為：缺少營業時間，保持空白。

### MTI-REP-0047-P02

- `pasteScenario`: `full_message_stress`
- `sourceTextMode`: `structure_preserving_synthetic`
- `selectionRationale`: 模擬跨城市、多活動、跨年、週期場次及非市集招募混合的電子報

```text
台灣龐克折返跑及邊緣人市集11-12月最新場次

台灣龐克折返跑
日期：12/02-12/03
地點：烏日觀光啤酒廠
報名截止日期：2022/11/20

2023米樂生活節
高雄場：11/25-11/26
台北場：12/23-12/24

美麗華聖誕跨年市集
日期：2023/12/08-2024/01/01，每週五、六、日
地點：美麗華1樓水舞廣場

高雄2023聖誕馬戲嘉年華・衛武營黃昏市集
日期：12/9-10、12/16-17、12/23-24
地點：衛武營國家藝術文化中心

進駐全臺遊牧商店：[REGISTRATION_URL]
工讀計時夥伴招募中
```

- 期望：多個 event block，城市、日期及地點不可跨活動組合。
- 安全行為：要求選活動；2022 截止日為衝突／忽略；每週場次不任意展開；商店進駐與工讀招募排除。

## 3. Round A 初步比較

Round A 共建立 23 個候選：

| 情境 | 數量 | 定位 |
| --- | ---: | --- |
| `focused_block` | 10 | 主要成功路徑與部分資訊案例 |
| `focused_with_context` | 3 | 日期／金額角色與附近雜訊 |
| `full_message_stress` | 10 | 多活動、取消、隱私及非市集防禦性案例 |

本輪為了校準而刻意讓壓力案例占 43%，不應沿用成正式產品評估比例。後續正式代表資料仍暫以約 65% `focused_block`、25% `focused_with_context`、10% `full_message_stress` 為起點，再依真實使用觀察調整。

## 4. 第一輪隱私檢查

已檢查：

- 無 Gmail message ID、thread ID、寄件者或收件者地址。
- 無真實私人姓名、品牌填答、電話、LINE ID、銀行帳戶或訂單編號。
- URL 已替換為用途 token。
- 表單中的私人地址、商品回答與品牌名稱已替換。
- 長篇行銷內容與規章只保留支持測試的最小結構。
- 公開市集名稱、公開場地、活動日期、時間與公開費用僅在解析必要時保留。

Round A 後續狀態：

- Reviewer B 已完成 23／23 獨立隱私與欄位複核。
- 逐 fixture 差異已裁決，並凍結 Paste Sample Selection Policy v1。
- 尚未轉成可執行測試資料；解析器版本與正式品質門檻仍未核准。

## 5. 下一關卡

1. Round A 已完成獨立複核、adjudication 與 Selection Policy v1 凍結。
2. `MTI-REP-0061` 至 `MTI-REP-0080` 已完成來源稽核並建立 Round B 候選。
3. 下一關卡為 Round B 的獨立盲審與差異裁決。
