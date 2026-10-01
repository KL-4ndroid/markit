# 市集文字匯入 Paste Fixture Blind Review Pack v1

- 日期：2026-09-15
- 狀態：待獨立複核
- 內容：23 個去識別化 `inputText`；不含第一位標註者答案、來源類型或 paste scenario
- 產品實作狀態：未核准、未開始

## 1. 複核者規則

1. 不查看來源 Gmail、Calibration answer key 或 Annotation Pass 1 的既有結論。
2. 只根據本文件的 `referenceDate` 與 `inputText` 判斷。
3. 每個非空值都要引用本輸入中的最小 evidence span。
4. 日期、時間與金額必須先標記語意角色，再判斷是否可填入新增市集。
5. 無法唯一判定時使用 `choice_required` 或 `conflict`，不得猜測。
6. 若仍有可識別的私人資料，立即標記 `privacyReview: fail` 並停止複核該筆。
7. 不直接修改第一位標註者答案；將本文件的空白答題欄複製到獨立複核紀錄。

## 2. 回答格式

每個 fixture 使用以下形狀：

```yaml
fixtureId:
reviewerId:
reviewedAt:
privacyReview: pass | fail
eventDisposition: single_candidate | event_selection_required | insufficient | reject
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

### MTI-REP-0001-P01

- `referenceDate`: `2026-07-21`

```text
【活動資訊】
活動日期｜2026年10月3日（星期六）至10月4日（星期日）
活動地點｜醒村文化景觀公園
招募對象｜品牌、職人、創作者及地方夥伴
報名連結｜[REGISTRATION_URL]
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0001-P02

- `referenceDate`: `2026-07-21`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0002-P01

- `referenceDate`: `2026-07-13`

```text
謝謝您報名參與此次活動。
本封信件通知您錄取 開嘉｜11.14–11.15｜芫荽趴踢
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0002-P02

- `referenceDate`: `2026-07-13`

```text
本封信件通知您錄取 開嘉｜11.14–11.15｜芫荽趴踢

繳費期限：2026/07/18 23:59 前完成繳費。
確認附件內的租借設備、總金額是否有誤。

開嘉｜雞啤節
日期｜10.17–10.18
時間｜14:00－19:00
地點｜嘉義公園
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0004-P01

- `referenceDate`: `2026-04-07`

```text
活動資訊
▪ 活動日期｜04/18（六）– 04/19（日）
▪ 活動時間｜13:00 – 18:00
▪ 活動地點｜高雄市楠梓區大學南路168號
▪ 招募間數｜40 間（額滿為止）
▪ 招募截止｜04/10
▪ 報名連結｜[REGISTRATION_URL]
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0004-P02

- `referenceDate`: `2026-04-07`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0007-P01

- `referenceDate`: `2026-03-25`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0007-P02

- `referenceDate`: `2026-03-25`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0007-P03

- `referenceDate`: `2026-03-25`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0011-P01

- `referenceDate`: `2025-11-07`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0011-P02

- `referenceDate`: `2025-11-07`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0012-P01

- `referenceDate`: `2025-10-22`

```text
親愛的品牌攤商朋友您好：
感謝您報名參與《2025高雄眷村嘉年華（岡山場）》。
在此再次提醒：
繳費截止日期為10/2（四）15:30前。
逾期未完成繳費及資料回報者，將視同放棄資格。
若您已完成繳費，請安心忽略本通知。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0016-P01

- `referenceDate`: `2025-08-28`

```text
美麗華 21愛你幸福前行市集｜10月場
日期：2025/10/10-12、10/18-19、10/24-26
地點：美麗華1樓水舞廣場，台北市中山區敬業三路20號
報名連結：[REGISTRATION_URL]
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0016-P02

- `referenceDate`: `2025-08-28`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0018-P01

- `referenceDate`: `2025-08-09`

```text
如需租借設備，請填寫租借數量。
會議桌（180×60cm／含兩椅）／250元／檔
紅色塑膠椅／15元／張／檔
回答：會議桌（含兩椅）1組

是否需要申請用電？
額外電力每1,000W收取300元／日。
回答：否
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0018-P02

- `referenceDate`: `2025-08-09`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0029-P01

- `referenceDate`: `2024-11-23`

```text
感謝您報名 Butter Zoom x 奶油遊戲人間理想國 奶油市集，申請的攤位已錄取。
報名日期：12/21-12/22
租借器材：傘1、桌1、椅1
共計2日：2,000元＋750元器材＋500元保證金＝3,250元
保證金將於活動結束當天簽退後退還。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0029-P02

- `referenceDate`: `2024-11-23`

```text
您好，這次的市集因故無法前往，非常抱歉，需向您取消。

> 感謝您報名 Butter Zoom x 奶油遊戲人間理想國 奶油市集，申請的攤位已錄取。
> 報名日期：12/21-12/22
> 租借器材：傘1、桌1、椅1
> 共計2日：2,000元＋750元器材＋500元保證金＝3,250元
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0036-P01

- `referenceDate`: `2024-07-18`

```text
大兵市集正在籌備8月市集活動。
此次企劃為「台味小吃市集」，招募台味文創、台味小吃、品味選物、綠色生活、懷舊二手品牌。
設備：歐帳、桌、椅

台中｜北屯新村文創園區
8.3—8.4（六日）14:00-19:00
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0036-P02

- `referenceDate`: `2024-07-18`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0042-P01

- `referenceDate`: `2024-05-05`

```text
合作貼文預計5月5日提供審稿，5月8日前公開。
限時動態會帶到貴司近期市集資訊。

優惠時間：2024.05.04～2024.05.12
優惠碼：[PROMO_CODE]
消費滿500元折100元，滿1,500元贈送耳環。

本次IG單篇圖文合作報價4,000元，包含照片與文案。
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0047-P01

- `referenceDate`: `2023-11-13`

```text
高雄｜2023聖誕馬戲嘉年華・衛武營黃昏市集
地點：衛武營國家藝術文化中心
12/9-12/10　北廣場／南廣場
12/16-12/17　北廣場／南廣場
12/23-12/24　北廣場
報名連結：[REGISTRATION_URL]
```

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

### MTI-REP-0047-P02

- `referenceDate`: `2023-11-13`

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

複核結果：

- `privacyReview`:
- `eventDisposition`:
- `events`:
- `ignoreSpans`:
- `warnings`:
- `notes`:

## 4. 完成條件

- 23 個 fixture 均有 privacy 與 event disposition 判定。
- 每個非空欄位都有 evidence。
- 所有 `ignore`、`choice_required`、`conflict` 與 `unsupported` 均有理由。
- 複核者沒有查看第一位標註者答案。
- 完成後再與 answer key 比對並建立 adjudication，不直接覆寫任一方答案。
