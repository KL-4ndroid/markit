# 市集文字匯入 Paste Fixture Blind Review Result E — Round C v1

- Reviewer：E（全新獨立盲審）
- 日期：2026-09-16
- 隔離聲明：本次判讀只讀取 `MARKET_TEXT_IMPORT_BLIND_REVIEWER_GUIDE_ROUND_C_V1_2026_09_16.md` 與 `MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_C_V1_2026_09_16.md`。未查看或搜尋 Round C answer key、Annotation Pass 1、Discovery Record、Corpus Curation、Round A／B 文件或結果、Gmail、git 狀態／差異、其他 agent 訊息或答案、外部連結或網路資料。
- 判讀原則：每筆只使用該筆 `referenceDate` 與 `inputText`；privacy 先行；所有非空判斷均附目前 `inputText` 的原句或最小 span。`not_present` 依凍結指南保留空 evidence，不製造不存在的引文。

## 完整 YAML

```yaml
reviews:
  - fixtureId: MTI-REP-0081-P01
    privacyReview:
      status: pass
      evidence: ["小蝸牛12月份｜回報表單", "錄取日期 double check：12/6（日）", "本次匯款總額：840元"]
      reason: "『小蝸牛12月份｜回報表單』以下只有公開活動／付款角色資訊，未見未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["小蝸牛12月份｜回報表單", "錄取日期 double check：12/6（日）"]
      reason: "『小蝸牛12月份』與單一『錄取日期 double check：12/6（日）』可綁成一個事件。"
    draftReadiness:
      value: partial
      evidence: ["小蝸牛12月份｜回報表單", "錄取日期 double check：12/6（日）"]
      reason: "名稱與錄取日可辨識，但目前文字未提供活動地點。"
    events:
      - eventName: {status: exact, value: "小蝸牛12月份", evidence: ["小蝸牛12月份｜回報表單"]}
        dates: {status: inferable, value: ["2020-12-06"], evidence: ["referenceDate: 2020-11-02", "錄取日期 double check：12/6（日）"], reason: "同一活動名稱與 referenceDate 的未來合理區間可補為 2020 年。"}
        location: {status: not_present, value: null, evidence: []}
        paymentTotal: {status: exact, value: {amount: 840, currency: null}, evidence: ["本次匯款總額：840元"], reason: "原文只證明匯款總額，未證明 boothCost 或幣別。"}
    ignoreSpans: []
    warnings:
      - message: "活動地點缺漏；『錄取日期 double check：12/6（日）』不足以形成 reviewable core。"
        evidence: ["錄取日期 double check：12/6（日）"]
      - message: "『本次匯款總額：840元』不得改標為攤位費。"
        evidence: ["本次匯款總額：840元"]
    notes: []

  - fixtureId: MTI-REP-0082-P01
    privacyReview:
      status: pass
      evidence: ["《DO & TEL》啤酒音樂市集 攤商招募", "地點：DOTEL共享辦公空間─新北市板橋區三民路一段156號（室內舉辦）"]
      reason: "『攤商招募』及公開活動場地資訊可保留，未見未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["《DO & TEL》啤酒音樂市集 攤商招募", "市集時間：2020/09/19（星期六）14:00～20:00"]
      reason: "唯一名稱與唯一市集日時指向一個事件。"
    draftReadiness:
      value: reviewable_core
      evidence: ["《DO & TEL》啤酒音樂市集 攤商招募", "市集時間：2020/09/19（星期六）14:00～20:00", "地點：DOTEL共享辦公空間─新北市板橋區三民路一段156號（室內舉辦）"]
      reason: "名稱、活動日與地點均唯一且無衝突。"
    events:
      - eventName: {status: exact, value: "《DO & TEL》啤酒音樂市集", evidence: ["《DO & TEL》啤酒音樂市集 攤商招募"]}
        dates: {status: exact, value: ["2020-09-19"], evidence: ["市集時間：2020/09/19（星期六）14:00～20:00"]}
        operatingHours: {status: exact, value: {start: "14:00", end: "20:00"}, evidence: ["市集時間：2020/09/19（星期六）14:00～20:00"]}
        location: {status: exact, value: "DOTEL共享辦公空間─新北市板橋區三民路一段156號（室內舉辦）", evidence: ["地點：DOTEL共享辦公空間─新北市板橋區三民路一段156號（室內舉辦）"]}
        boothCost: {status: exact, value: {amount: 800, unit: "published_price"}, evidence: ["攤租：800元"], reason: "公開價目唯一，但不是已選方案。"}
    ignoreSpans:
      - {text: "報名期間：即日起至2020/08/19（三）24:00止", reason: "報名期限不是活動日。", evidence: ["報名期間：即日起至2020/08/19（三）24:00止"]}
      - {text: "評選公布：2020/08/24前以Email或專人聯繫", reason: "公告期限不是活動日。", evidence: ["評選公布：2020/08/24前以Email或專人聯繫"]}
    warnings:
      - {message: "『攤租：800元』是公開價目，本文沒有已選／錄取費用 evidence。", evidence: ["攤租：800元"]}
    notes: []

  - fixtureId: MTI-REP-0083-P01
    privacyReview:
      status: pass
      evidence: ["台中四葉市集｜淘金小鎮村", "場地：Tiger City 地下一樓淘金小鎮村"]
      reason: "活動名稱、公開場地與公開規則可保留，未見未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["台中四葉市集｜淘金小鎮村", "目前7/12、7/18、7/19、7/25、7/26都還有位子"]
      reason: "多個可報名日期仍屬同一具名市集，不是多個不可合併事件。"
    draftReadiness:
      value: partial
      evidence: ["目前7/12、7/18、7/19、7/25、7/26都還有位子", "場地：Tiger City 地下一樓淘金小鎮村"]
      reason: "『都還有位子』只形成日期選項，未明示使用者已選活動日。"
    events:
      - eventName: {status: exact, value: "台中四葉市集｜淘金小鎮村", evidence: ["台中四葉市集｜淘金小鎮村"]}
        dates: {status: choice_required, value: ["2020-07-12", "2020-07-18", "2020-07-19", "2020-07-25", "2020-07-26"], evidence: ["referenceDate: 2020-06-22", "目前7/12、7/18、7/19、7/25、7/26都還有位子"], reason: "『都有位子』不是已選；年份依 referenceDate 與未來合理區間推定為 2020。"}
        operatingHours: {status: exact, value: {start: "15:00", end: "20:00"}, evidence: ["市集時間：15:00-20:00"]}
        location: {status: exact, value: "Tiger City 地下一樓淘金小鎮村", evidence: ["場地：Tiger City 地下一樓淘金小鎮村"]}
        boothCost: {status: exact, value: {amount: 300, unit: "per_day_published_price"}, evidence: ["攤租：300元／天"], reason: "公開日價可解析，但沒有已選日期。"}
        equipment: {status: exact, value: ["特製攤車（約90×70cm）", "椅子"], evidence: ["主辦提供特製攤車（約90×70cm）與椅子"]}
    ignoreSpans:
      - {text: "報名截止：6/28（日）", reason: "報名截止不是活動日。", evidence: ["報名截止：6/28（日）"]}
      - {text: "錄取通知：6/29（一）", reason: "錄取通知日不是活動日。", evidence: ["錄取通知：6/29（一）"]}
    warnings:
      - {message: "必須先從『7/12、7/18、7/19、7/25、7/26』選擇日期，不能把『都有位子』視為已錄取。", evidence: ["目前7/12、7/18、7/19、7/25、7/26都還有位子"]}
    notes: []

  - fixtureId: MTI-REP-0084-P01
    privacyReview:
      status: pass
      evidence: ["工藝之森市集｜5/30～6/28 場次錄取通知", "[REGISTRATION_URL]"]
      reason: "公開活動內容與 canonical token『[REGISTRATION_URL]』可保留，未見未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["工藝之森市集｜5/30～6/28 場次錄取通知"]
      reason: "目前文字只辨識出『工藝之森市集』一個活動系列。"
    draftReadiness:
      value: partial
      evidence: ["實際入選場次與匯款金額請見入選表單：[REGISTRATION_URL]", "工藝之森市集｜5/30～6/28 場次錄取通知"]
      reason: "整體範圍可見，但實際入選日留在不可開啟的外部表單，且本文沒有地點。"
    events:
      - eventName: {status: exact, value: "工藝之森市集", evidence: ["工藝之森市集｜5/30～6/28 場次錄取通知"]}
        activityRange: {status: inferable, value: {start: "2020-05-30", end: "2020-06-28"}, evidence: ["referenceDate: 2020-05-22", "工藝之森市集｜5/30～6/28 場次錄取通知"], reason: "缺年範圍依 referenceDate 與未來合理區間補為 2020。"}
        selectedDates: {status: unsupported, value: null, evidence: ["實際入選場次與匯款金額請見入選表單：[REGISTRATION_URL]"], reason: "實際入選日只存在外部表單，不能開啟或補值。"}
        location: {status: not_present, value: null, evidence: []}
        boothCost: {status: choice_required, value: ["5/30～5/31：歷史報名品牌400元／日", "5/30～5/31：其他品牌500元／日", "6月：工藝品牌500元／日", "6月：非工藝品牌600元／日"], evidence: ["5/30～5/31：曾報名過5/9、5/10、5/16、5/17之品牌400元／日，其他品牌500元／日。", "6月份場次：工藝品牌500元／日，非工藝品牌600元／日。"], reason: "價格依日期與資格分類，本文未明示所選類別。"}
        electricityCost: {status: exact, value: {amount: 100, unit: "per_day_published_price"}, evidence: ["電費：100元／天。"]}
        deposit: {status: exact, value: {amount: 500, refundable: true}, evidence: ["保證金：500元，於最後一場活動日簽退後歸還。"]}
    ignoreSpans:
      - {text: "[REGISTRATION_URL]", reason: "canonical 外部連結 token 不得開啟。", evidence: ["[REGISTRATION_URL]"]}
    warnings:
      - {message: "不得用『5/30～6/28』取代外部表單中的實際入選場次。", evidence: ["工藝之森市集｜5/30～6/28 場次錄取通知", "實際入選場次與匯款金額請見入選表單：[REGISTRATION_URL]"]}
    notes: []

  - fixtureId: MTI-REP-0084-P02
    privacyReview:
      status: pass
      evidence: ["[REGISTRATION_URL]", "[BANK_ACCOUNT]"]
      reason: "付款網址與帳戶均已使用 canonical tokens『[REGISTRATION_URL]』『[BANK_ACCOUNT]』遮罩。"
    eventDisposition:
      value: single_candidate
      evidence: ["工藝之森市集｜活動場次為2020/05/30～2020/06/28之間"]
      reason: "引用資訊只指向『工藝之森市集』一個活動。"
    draftReadiness:
      value: partial
      evidence: ["實際入選場次請見外部表單。", "工藝之森市集｜活動場次為2020/05/30～2020/06/28之間"]
      reason: "活動範圍可見，但實際入選日外置且地點缺漏。"
    events:
      - eventName: {status: exact, value: "工藝之森市集", evidence: ["工藝之森市集｜活動場次為2020/05/30～2020/06/28之間"]}
        activityRange: {status: exact, value: {start: "2020-05-30", end: "2020-06-28"}, evidence: ["工藝之森市集｜活動場次為2020/05/30～2020/06/28之間"]}
        selectedDates: {status: unsupported, value: null, evidence: ["實際入選場次請見外部表單。"], reason: "外部表單不可開啟，無法取得入選日。"}
        location: {status: not_present, value: null, evidence: []}
        boothCost: {status: choice_required, value: ["5月底：400或500元／日", "6月：500或600元／日"], evidence: ["5月底日費依歷史報名資格為400或500元；6月依工藝／非工藝品牌為500或600元。"], reason: "日期及品牌類別均會改變費用，本文未明示所選值。"}
        electricityCost: {status: exact, value: {amount: 100, unit: "per_day_published_price"}, evidence: ["電費100元／天。"]}
        deposit: {status: exact, value: {amount: 500, refundable: true}, evidence: ["保證金500元將於參加者最後一場活動日簽退後歸還。"]}
    ignoreSpans:
      - {text: "匯款帳戶：[BANK_ACCOUNT]", reason: "canonical 私人帳戶 token 不是市集欄位。", evidence: ["匯款帳戶：[BANK_ACCOUNT]"]}
      - {text: "匯款金額請參閱入選表單：[REGISTRATION_URL]", reason: "外部連結不可開啟或用來補值。", evidence: ["匯款金額請參閱入選表單：[REGISTRATION_URL]"]}
    warnings:
      - {message: "不得把『2020/05/30～2020/06/28』整體範圍當成實際入選日。", evidence: ["工藝之森市集｜活動場次為2020/05/30～2020/06/28之間", "實際入選場次請見外部表單。"]}
    notes: []

  - fixtureId: MTI-REP-0085-P01
    privacyReview:
      status: pass
      evidence: ["迷路森林－夢遊森林", "地點：松山文創園區二號倉庫"]
      reason: "內容為公開活動、場地、價目與設備資訊，未見未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["迷路森林－夢遊森林", "活動時間：2020/07/11（六）13:00-19:00、2020/07/12（日）11:00-18:00"]
      reason: "兩個活動日屬同一具名事件。"
    draftReadiness:
      value: reviewable_core
      evidence: ["迷路森林－夢遊森林", "地點：松山文創園區二號倉庫", "活動時間：2020/07/11（六）13:00-19:00、2020/07/12（日）11:00-18:00"]
      reason: "名稱、兩個活動日與唯一地點均無衝突。"
    events:
      - eventName: {status: exact, value: "迷路森林－夢遊森林", evidence: ["迷路森林－夢遊森林"]}
        dates: {status: exact, value: ["2020-07-11", "2020-07-12"], evidence: ["活動時間：2020/07/11（六）13:00-19:00、2020/07/12（日）11:00-18:00"]}
        operatingHours: {status: unsupported, value: {"2020-07-11": "13:00-19:00", "2020-07-12": "11:00-18:00"}, evidence: ["活動時間：2020/07/11（六）13:00-19:00、2020/07/12（日）11:00-18:00"], reason: "每日不同營業時間不能壓成單一開始／結束值。"}
        location: {status: exact, value: "松山文創園區二號倉庫", evidence: ["地點：松山文創園區二號倉庫"]}
        boothCost: {status: choice_required, value: ["大攤1200元／日", "小攤800元／日"], evidence: ["大攤：1200元／日；代租桌子300元／日；代租椅子10元／日。", "小攤：800元／日；代租椅子10元／日。"], reason: "本文只有公開價目，未明示大攤或小攤已選。"}
        options: {status: choice_required, value: ["代租桌子300元／日", "代租椅子10元／日", "便當80元／個"], evidence: ["大攤：1200元／日；代租桌子300元／日；代租椅子10元／日。", "小攤：800元／日；代租椅子10元／日。", "便當：80元／個。"], reason: "公開選配價目不等於已選。"}
    ignoreSpans: []
    warnings:
      - {message: "兩日營業時間不同，須保留『7/11 13:00-19:00』『7/12 11:00-18:00』的日期相依結構。", evidence: ["活動時間：2020/07/11（六）13:00-19:00、2020/07/12（日）11:00-18:00"]}
    notes: []

  - fixtureId: MTI-REP-0085-P02
    privacyReview:
      status: pass
      evidence: ["最新付款確認：", "迷路森林－夢遊森林"]
      reason: "付款金額與引用的公開活動資訊未包含未遮罩私人識別資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["迷路森林－夢遊森林", "2020/07/11（六）13:00-19:00", "2020/07/12（日）11:00-18:00"]
      reason: "引用活動資訊明確只指向一個兩日事件。"
    draftReadiness:
      value: reviewable_core
      evidence: ["迷路森林－夢遊森林", "地點：松山文創園區二號倉庫", "2020/07/11（六）13:00-19:00", "2020/07/12（日）11:00-18:00"]
      reason: "名稱、日期、地點無核心衝突；已收與應付是不同付款角色。"
    events:
      - eventName: {status: exact, value: "迷路森林－夢遊森林", evidence: ["迷路森林－夢遊森林"]}
        dates: {status: exact, value: ["2020-07-11", "2020-07-12"], evidence: ["2020/07/11（六）13:00-19:00", "2020/07/12（日）11:00-18:00"]}
        operatingHours: {status: unsupported, value: {"2020-07-11": "13:00-19:00", "2020-07-12": "11:00-18:00"}, evidence: ["2020/07/11（六）13:00-19:00", "2020/07/12（日）11:00-18:00"], reason: "每日不同營業時間需保留 per-date relationship。"}
        location: {status: exact, value: "松山文創園區二號倉庫", evidence: ["地點：松山文創園區二號倉庫"]}
        boothCost: {status: exact, value: {amount: 2400, unit: "per_event", coversDates: ["2020-07-11", "2020-07-12"], selection: "大攤"}, evidence: ["兩日大攤2400元＋兩日兩椅40元（10×2×2）＋兩日共四個便當320元。"]}
        selectedOptions: {status: exact, value: ["兩日兩椅40元", "兩日共四個便當320元"], evidence: ["兩日大攤2400元＋兩日兩椅40元（10×2×2）＋兩日共四個便當320元。"]}
        payment: {status: exact, value: {received: 2740, due: 2760}, evidence: ["已收到2740元，但本次應付2760元。"], reason: "已收款與應付款分開保存，不視為同欄衝突。"}
    ignoreSpans: []
    warnings:
      - {message: "『已收到2740元』少於『本次應付2760元』；兩種付款角色不得互相覆蓋。", evidence: ["已收到2740元，但本次應付2760元。"]}
      - {message: "兩日營業時間不同，不能壓成單一時間。", evidence: ["2020/07/11（六）13:00-19:00", "2020/07/12（日）11:00-18:00"]}
    notes: []

  - fixtureId: MTI-REP-0086-P01
    privacyReview:
      status: pass
      evidence: ["五月暮暮市集｜錄取日期與費用", "租物費：0元"]
      reason: "內容是公開活動日期與費用，未見未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["五月暮暮市集｜錄取日期與費用", "2020/05/02：一般攤位1000元"]
      reason: "六個錄取日均隸屬同一『五月暮暮市集』。"
    draftReadiness:
      value: partial
      evidence: ["五月暮暮市集｜錄取日期與費用", "2020/05/02：一般攤位1000元", "2020/05/22：一般攤位360元"]
      reason: "名稱與活動日可辨識，但目前文字未提供地點。"
    events:
      - eventName: {status: exact, value: "五月暮暮市集", evidence: ["五月暮暮市集｜錄取日期與費用"]}
        dates: {status: exact, value: ["2020-05-02", "2020-05-03", "2020-05-15", "2020-05-16", "2020-05-17", "2020-05-22"], evidence: ["2020/05/02：一般攤位1000元", "2020/05/03：一般攤位1000元", "2020/05/15：一般攤位360元", "2020/05/16：一般攤位1000元", "2020/05/17：一般攤位1000元", "2020/05/22：一般攤位360元"]}
        location: {status: not_present, value: null, evidence: []}
        boothCost: {status: unsupported, value: {"2020-05-02": 1000, "2020-05-03": 1000, "2020-05-15": 360, "2020-05-16": 1000, "2020-05-17": 1000, "2020-05-22": 360}, evidence: ["2020/05/02：一般攤位1000元", "2020/05/03：一般攤位1000元", "2020/05/15：一般攤位360元", "2020/05/16：一般攤位1000元", "2020/05/17：一般攤位1000元", "2020/05/22：一般攤位360元"], reason: "逐日金額不同，單值 boothCost 無法完整表達。"}
        rentalCost: {status: exact, value: 0, evidence: ["租物費：0元"]}
    ignoreSpans: []
    warnings:
      - {message: "逐日攤位費不同，必須保留每個日期與金額的綁定。", evidence: ["2020/05/02：一般攤位1000元", "2020/05/15：一般攤位360元"]}
    notes: []

  - fixtureId: MTI-REP-0086-P02
    privacyReview:
      status: pass
      evidence: ["【五月】暮暮市集", "應付總額：4720元"]
      reason: "活動、費用與期限內容沒有未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["【五月】暮暮市集", "實際錄取日期：05/02、05/03、05/15、05/16、05/17、05/22"]
      reason: "六個實際錄取日同屬一個具名市集。"
    draftReadiness:
      value: partial
      evidence: ["【五月】暮暮市集", "實際錄取日期：05/02、05/03、05/15、05/16、05/17、05/22"]
      reason: "名稱與錄取日可辨識，但目前文字沒有活動地點。"
    events:
      - eventName: {status: exact, value: "【五月】暮暮市集", evidence: ["【五月】暮暮市集"]}
        activityRange: {status: exact, value: {start: "2020-05-01", end: "2020-05-31"}, evidence: ["活動概覽：2020/05/01～2020/05/31"]}
        dates: {status: inferable, value: ["2020-05-02", "2020-05-03", "2020-05-15", "2020-05-16", "2020-05-17", "2020-05-22"], evidence: ["活動概覽：2020/05/01～2020/05/31", "實際錄取日期：05/02、05/03、05/15、05/16、05/17、05/22"], reason: "錄取日缺年，依同一活動的 2020/05 概覽補年。"}
        location: {status: not_present, value: null, evidence: []}
        boothCost: {status: unsupported, value: {"2020-05-02": 1000, "2020-05-03": 1000, "2020-05-15": 360, "2020-05-16": 1000, "2020-05-17": 1000, "2020-05-22": 360}, evidence: ["逐日一般攤位費：05/02 1000元、05/03 1000元、05/15 360元、05/16 1000元、05/17 1000元、05/22 360元。"], reason: "逐日金額不同，須保留 per-date relationship。"}
        rentalCost: {status: exact, value: 0, evidence: ["租物費：0元"]}
        paymentTotal: {status: exact, value: 4720, evidence: ["應付總額：4720元"]}
    ignoreSpans:
      - {text: "付款期限：2020/04/19 23:59", reason: "付款期限不是活動日。", evidence: ["付款期限：2020/04/19 23:59"]}
    warnings:
      - {message: "『活動概覽：2020/05/01～2020/05/31』不是實際錄取日，草稿日期採用『實際錄取日期』。", evidence: ["活動概覽：2020/05/01～2020/05/31", "實際錄取日期：05/02、05/03、05/15、05/16、05/17、05/22"]}
    notes: []

  - fixtureId: MTI-REP-0087-P01
    privacyReview:
      status: pass
      evidence: ["倉庫市集｜入選攤友資訊", "此次市集起始點由美術園區民生路口起始。"]
      reason: "內容為公開活動、場域與費用資訊，未見未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["倉庫市集｜入選攤友資訊", "活動時間：10:00-18:00"]
      reason: "可辨識單一『倉庫市集』，但沒有活動日期。"
    draftReadiness:
      value: partial
      evidence: ["倉庫市集｜入選攤友資訊", "此次市集起始點由美術園區民生路口起始。", "活動時間：10:00-18:00"]
      reason: "名稱、起始場域與時間可辨識，但活動日缺漏。"
    events:
      - eventName: {status: exact, value: "倉庫市集", evidence: ["倉庫市集｜入選攤友資訊"]}
        dates: {status: not_present, value: null, evidence: []}
        operatingHours: {status: exact, value: {start: "10:00", end: "18:00"}, evidence: ["活動時間：10:00-18:00"]}
        checkIn: {status: exact, value: {starts: "09:00", setupDeadline: "09:45"}, evidence: ["服務台09:00開始報到，請於09:45前完成佈置。"]}
        location: {status: exact, value: "美術園區民生路口（市集起始點）", evidence: ["此次市集起始點由美術園區民生路口起始。"]}
        boothCost: {status: exact, value: {amount: 400, unit: "published_price"}, evidence: ["攤位費400元；加訂桌子200元；傘（含座）300元。"], reason: "公開基本攤位費可解析。"}
        options: {status: choice_required, value: ["加訂桌子200元", "傘（含座）300元"], evidence: ["攤位費400元；加訂桌子200元；傘（含座）300元。"], reason: "加訂價目未證明已選。"}
    ignoreSpans:
      - {text: "匯款期限：02/15前", reason: "匯款期限不是活動日。", evidence: ["匯款期限：02/15前"]}
      - {text: "02/16進行對帳作業", reason: "對帳日不是活動日。", evidence: ["02/16進行對帳作業"]}
    warnings:
      - {message: "『匯款期限：02/15前』『02/16進行對帳作業』均不能補成活動日。", evidence: ["匯款期限：02/15前", "02/16進行對帳作業"]}
    notes: []

  - fixtureId: MTI-REP-0088-P01
    privacyReview:
      status: pass
      evidence: ["明日市集｜好評加碼特別場", "地點：臺灣民俗文物館"]
      reason: "文字只有公開活動與流程日期，未見未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["明日市集｜好評加碼特別場", "市集日期：2020/02/28～2020/03/01"]
      reason: "唯一名稱與連續日期範圍構成單一事件。"
    draftReadiness:
      value: reviewable_core
      evidence: ["明日市集｜好評加碼特別場", "市集日期：2020/02/28～2020/03/01", "地點：臺灣民俗文物館"]
      reason: "名稱、日期範圍與地點均唯一且無衝突。"
    events:
      - eventName: {status: exact, value: "明日市集｜好評加碼特別場", evidence: ["明日市集｜好評加碼特別場"]}
        dates: {status: exact, value: {start: "2020-02-28", end: "2020-03-01"}, evidence: ["市集日期：2020/02/28～2020/03/01"]}
        operatingHours: {status: exact, value: {start: "10:30", end: "17:30"}, evidence: ["市集時間：10:30～17:30"]}
        location: {status: exact, value: "臺灣民俗文物館", evidence: ["地點：臺灣民俗文物館"]}
    ignoreSpans:
      - {text: "開放報名：2020/02/10～2020/02/18", reason: "報名期間不是活動日。", evidence: ["開放報名：2020/02/10～2020/02/18"]}
      - {text: "錄取公告：2020/02/19", reason: "公告日不是活動日。", evidence: ["錄取公告：2020/02/19"]}
      - {text: "匯款期限：2020/02/20～2020/02/23", reason: "匯款期限不是活動日。", evidence: ["匯款期限：2020/02/20～2020/02/23"]}
      - {text: "攤位地圖：2020/02/26", reason: "地圖日期不是活動日。", evidence: ["攤位地圖：2020/02/26"]}
    warnings: []
    notes: []

  - fixtureId: MTI-REP-0089-P01
    privacyReview:
      status: pass
      evidence: ["揪揪市集｜2020二月場次", "地點：文化部文化資產園區 文化資產大道"]
      reason: "內容是公開活動、場地、價目與設備規則，未見未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["揪揪市集｜2020二月場次", "活動日期：2020/02/15～2020/02/16"]
      reason: "目前文字只辨識出一個兩日市集。"
    draftReadiness:
      value: partial
      evidence: ["活動日期：2020/02/15～2020/02/16", "實際入圍日期請至主辦公告查詢。", "地點：文化部文化資產園區 文化資產大道"]
      reason: "整體日期存在，但實際入圍日需外查，未明示是一天或兩天。"
    events:
      - eventName: {status: exact, value: "揪揪市集｜2020二月場次", evidence: ["揪揪市集｜2020二月場次"]}
        activityRange: {status: exact, value: {start: "2020-02-15", end: "2020-02-16"}, evidence: ["活動日期：2020/02/15～2020/02/16"]}
        selectedDates: {status: unsupported, value: null, evidence: ["實際入圍日期請至主辦公告查詢。"], reason: "主辦公告不在目前 inputText，不能外查補值。"}
        operatingHours: {status: exact, value: {start: "11:00", end: "17:00"}, evidence: ["時間：11:00-17:00"]}
        location: {status: exact, value: "文化部文化資產園區 文化資產大道", evidence: ["地點：文化部文化資產園區 文化資產大道"]}
        boothCost: {status: choice_required, value: ["一天一攤400元", "一天兩攤800元", "兩天一攤800元", "兩天兩攤1600元"], evidence: ["一天：一攤400元、兩攤800元。", "兩天：一攤800元、兩攤1600元。"], reason: "天數與攤數均未選。"}
        equipment: {status: exact, value: {provided: ["歐式帳篷二分之一"], notProvided: ["桌椅", "電力"]}, evidence: ["主辦只提供歐式帳篷二分之一，不提供桌椅與電力。"]}
        equipmentOption: {status: choice_required, value: "桌椅組200元／天（桌子180×60cm＋兩張椅子）", evidence: ["桌椅組200元／天（桌子180×60cm＋兩張椅子）。"], reason: "公開租借價目未證明已選。"}
    ignoreSpans: []
    warnings:
      - {message: "不得開啟主辦公告或把兩日整體範圍直接當成實際入圍日。", evidence: ["活動日期：2020/02/15～2020/02/16", "實際入圍日期請至主辦公告查詢。"]}
    notes: []

  - fixtureId: MTI-REP-0090-P01
    privacyReview:
      status: pass
      evidence: ["聖誕FUN樂園－南紡購物中心 feat. 職人之聲", "[REGISTRATION_URL]"]
      reason: "公開活動資訊與 canonical token『[REGISTRATION_URL]』可保留，未見未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["聖誕FUN樂園－南紡購物中心 feat. 職人之聲", "錄取場次：2019/12/21（六）、2019/12/22（日）"]
      reason: "兩個錄取日同屬唯一具名事件。"
    draftReadiness:
      value: reviewable_core
      evidence: ["聖誕FUN樂園－南紡購物中心 feat. 職人之聲", "錄取場次：2019/12/21（六）、2019/12/22（日）", "市集地點：台南南紡購物中心1F戶外中華東路廣場"]
      reason: "唯一名稱、錄取日與地點均無衝突。"
    events:
      - eventName: {status: exact, value: "聖誕FUN樂園－南紡購物中心 feat. 職人之聲", evidence: ["聖誕FUN樂園－南紡購物中心 feat. 職人之聲"]}
        dates: {status: exact, value: ["2019-12-21", "2019-12-22"], evidence: ["錄取場次：2019/12/21（六）、2019/12/22（日）"]}
        operatingHours: {status: exact, value: {start: "14:00", end: "21:00", appliesTo: "兩日"}, evidence: ["市集時間：兩日皆為14:00-21:00"]}
        location: {status: exact, value: "台南南紡購物中心1F戶外中華東路廣場", evidence: ["市集地點：台南南紡購物中心1F戶外中華東路廣場"]}
        boothCost: {status: unsupported, value: null, evidence: ["攤位費用請見匯款表單：[REGISTRATION_URL]"], reason: "金額只存在不可開啟的外部表單。"}
    ignoreSpans:
      - {text: "攤位費用請見匯款表單：[REGISTRATION_URL]", reason: "外部連結不可開啟或用來補費用。", evidence: ["攤位費用請見匯款表單：[REGISTRATION_URL]"]}
      - {text: "請於2019/11/20前完成費用匯款。", reason: "匯款期限不是活動日。", evidence: ["請於2019/11/20前完成費用匯款。"]}
    warnings:
      - {message: "攤位費留白；『[REGISTRATION_URL]』不得開啟。", evidence: ["攤位費用請見匯款表單：[REGISTRATION_URL]"]}
    notes: []

  - fixtureId: MTI-REP-0091-P01
    privacyReview:
      status: pass
      evidence: ["邊緣人市集 × 沙漠音樂節2019", "地點：向海咖啡（台中市龍井區台灣大道六段83號）"]
      reason: "活動名稱、公開地址、價目與規則可保留，未見未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["邊緣人市集 × 沙漠音樂節2019", "日期：2019/12/07（六）"]
      reason: "唯一名稱與唯一活動日構成單一事件。"
    draftReadiness:
      value: reviewable_core
      evidence: ["邊緣人市集 × 沙漠音樂節2019", "日期：2019/12/07（六）", "地點：向海咖啡（台中市龍井區台灣大道六段83號）"]
      reason: "名稱、日期與地點唯一且無衝突。"
    events:
      - eventName: {status: exact, value: "邊緣人市集 × 沙漠音樂節2019", evidence: ["邊緣人市集 × 沙漠音樂節2019"]}
        dates: {status: exact, value: ["2019-12-07"], evidence: ["日期：2019/12/07（六）"]}
        operatingHours: {status: exact, value: {start: "12:00", end: "22:20"}, evidence: ["時間：12:00-22:20"]}
        location: {status: exact, value: "向海咖啡（台中市龍井區台灣大道六段83號）", evidence: ["地點：向海咖啡（台中市龍井區台灣大道六段83號）"]}
        boothCost: {status: choice_required, value: ["小攤150×150cm：400元", "大攤300×150cm：700元", "全棚300×300cm：1200元"], evidence: ["小攤150×150cm：400元", "大攤300×150cm：700元", "全棚300×300cm：1200元"], reason: "有三種公開攤型價目，本文未明示已選攤型。"}
        equipment: {status: exact, value: {provided: ["棚"], notProvided: ["電力"]}, evidence: ["主辦供棚；桌子200元／次；椅子10元／天。", "不供電，請自備電池式燈具；此場不提供食品攤商。"]}
        equipmentOptions: {status: choice_required, value: ["桌子200元／次", "椅子10元／天"], evidence: ["主辦供棚；桌子200元／次；椅子10元／天。"], reason: "租用價目未證明已選。"}
    ignoreSpans: []
    warnings:
      - {message: "『此場不提供食品攤商』是參展限制，不是設備提供狀態。", evidence: ["不供電，請自備電池式燈具；此場不提供食品攤商。"]}
    notes: []

  - fixtureId: MTI-REP-0092-P01
    privacyReview:
      status: pass
      evidence: ["綠光小市－11月台日系創作市集", "四日攤位費1800元＋桌椅租借四日400元＋加租一張椅子四日120元＝2320元。"]
      reason: "內容只有公開活動、付款明細與設備規則，未見未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["綠光小市－11月台日系創作市集", "錄取日期：2019/11/16、11/17、11/23、11/24"]
      reason: "四個錄取日同屬一個具名市集。"
    draftReadiness:
      value: partial
      evidence: ["綠光小市－11月台日系創作市集", "錄取日期：2019/11/16、11/17、11/23、11/24"]
      reason: "名稱與日期可辨識，但目前文字沒有活動地點。"
    events:
      - eventName: {status: exact, value: "綠光小市－11月台日系創作市集", evidence: ["綠光小市－11月台日系創作市集"]}
        dates: {status: inferable, value: ["2019-11-16", "2019-11-17", "2019-11-23", "2019-11-24"], evidence: ["錄取日期：2019/11/16、11/17、11/23、11/24"], reason: "首日明示 2019/11，後三日依同一錄取日期列補足年月。"}
        operatingHours: {status: exact, value: {start: "12:00", end: "18:30", appliesTo: "四日"}, evidence: ["活動時間：12:00-18:30"]}
        checkIn: {status: exact, value: {start: "11:00", end: "12:00"}, evidence: ["報到時間：11:00-12:00"]}
        location: {status: not_present, value: null, evidence: []}
        boothCost: {status: exact, value: {amount: 1800, unit: "per_event", coversDates: ["2019-11-16", "2019-11-17", "2019-11-23", "2019-11-24"]}, evidence: ["四日攤位費1800元＋桌椅租借四日400元＋加租一張椅子四日120元＝2320元。"]}
        selectedOptions: {status: exact, value: ["桌椅租借四日400元", "加租一張椅子四日120元"], evidence: ["四日攤位費1800元＋桌椅租借四日400元＋加租一張椅子四日120元＝2320元。"]}
        paymentTotal: {status: exact, value: 2320, evidence: ["四日攤位費1800元＋桌椅租借四日400元＋加租一張椅子四日120元＝2320元。"]}
        equipmentRule: {status: exact, value: "原則自備桌椅、招牌、桌巾與其他設備；本次已租桌椅", evidence: ["攤位原則需自備桌椅、招牌、桌巾與其他設備；本次費用明細另列已租桌椅。"]}
    ignoreSpans: []
    warnings:
      - {message: "『報到時間：11:00-12:00』不得覆蓋『活動時間：12:00-18:30』。", evidence: ["活動時間：12:00-18:30", "報到時間：11:00-12:00"]}
    notes: []

  - fixtureId: MTI-REP-0092-P02
    privacyReview:
      status: pass
      evidence: ["正確帳號末碼為：[IDENTIFIER]", "綠光小市－11月台日系創作市集"]
      reason: "帳號末碼已用 canonical token『[IDENTIFIER]』遮罩，其餘為公開活動與費用資訊。"
    eventDisposition:
      value: single_candidate
      evidence: ["綠光小市－11月台日系創作市集", "活動時間：四個錄取日皆為12:00-18:30"]
      reason: "引用錄取資訊指向一個四日市集。"
    draftReadiness:
      value: partial
      evidence: ["綠光小市－11月台日系創作市集", "報名日期：11/16-11/17、11/23-11/24", "活動時間：四個錄取日皆為12:00-18:30"]
      reason: "日期可由『四個錄取日』辨識，但目前文字沒有地點。"
    events:
      - eventName: {status: exact, value: "綠光小市－11月台日系創作市集", evidence: ["綠光小市－11月台日系創作市集"]}
        dates: {status: inferable, value: ["2019-11-16", "2019-11-17", "2019-11-23", "2019-11-24"], evidence: ["referenceDate: 2019-10-31", "報名日期：11/16-11/17、11/23-11/24", "活動時間：四個錄取日皆為12:00-18:30"], reason: "『四個錄取日』確認其活動角色；年份依 referenceDate 與未來合理區間補為 2019。"}
        operatingHours: {status: exact, value: {start: "12:00", end: "18:30", appliesTo: "四個錄取日"}, evidence: ["活動時間：四個錄取日皆為12:00-18:30"]}
        location: {status: not_present, value: null, evidence: []}
        boothCost: {status: exact, value: {amount: 1800, unit: "per_event", coversDates: ["2019-11-16", "2019-11-17", "2019-11-23", "2019-11-24"]}, evidence: ["四日攤位費1800元＋桌椅400元＋加租椅子120元＝2320元。"]}
        selectedOptions: {status: exact, value: ["桌椅400元", "加租椅子120元"], evidence: ["四日攤位費1800元＋桌椅400元＋加租椅子120元＝2320元。"]}
        paymentTotal: {status: exact, value: 2320, evidence: ["匯款金額：2320元", "四日攤位費1800元＋桌椅400元＋加租椅子120元＝2320元。"]}
        paymentStatus: {status: exact, value: "received_confirmed", evidence: ["已確認收到匯款。"]}
    ignoreSpans:
      - {text: "上一封付款回報有誤，正確帳號末碼為：[IDENTIFIER]", reason: "只更正私人付款識別碼，不改動活動欄位。", evidence: ["上一封付款回報有誤，正確帳號末碼為：[IDENTIFIER]"]}
    warnings:
      - {message: "『正確帳號末碼』只修正付款識別碼，不得改動日期、時間或費用答案。", evidence: ["上一封付款回報有誤，正確帳號末碼為：[IDENTIFIER]"]}
    notes: []

  - fixtureId: MTI-REP-0093-P01
    privacyReview:
      status: pass
      evidence: ["台南新光三越場次", "地點：台南新光三越小西門前廣場至內街"]
      reason: "內容為公開活動場次、場地、價目與設備，未見未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["台南新光三越場次", "錄取日期：2019/11/07～2019/11/24"]
      reason: "唯一場次名稱與錄取日期範圍構成一個事件。"
    draftReadiness:
      value: reviewable_core
      evidence: ["台南新光三越場次", "錄取日期：2019/11/07～2019/11/24", "地點：台南新光三越小西門前廣場至內街"]
      reason: "名稱、錄取日期範圍與唯一地點均無衝突。"
    events:
      - eventName: {status: exact, value: "台南新光三越場次", evidence: ["台南新光三越場次"]}
        dates: {status: exact, value: {start: "2019-11-07", end: "2019-11-24"}, evidence: ["錄取日期：2019/11/07～2019/11/24"]}
        operatingHours: {status: exact, value: {start: "11:00", end: "22:00"}, evidence: ["時間：11:00～22:00"]}
        checkIn: {status: exact, value: "10:00", evidence: ["報到時間：10:00"]}
        location: {status: exact, value: "台南新光三越小西門前廣場至內街", evidence: ["地點：台南新光三越小西門前廣場至內街"]}
        boothCost: {status: choice_required, value: ["大攤900元", "小攤550元"], evidence: ["費用：大攤900元、小攤550元"], reason: "兩種合法攤型，本文未明示已選。"}
        equipment: {status: exact, value: {provided: ["陽傘", "倉儲"], other: "無"}, evidence: ["設備提供：陽傘、倉儲；其餘無"]}
    ignoreSpans: []
    warnings:
      - {message: "『報到時間：10:00』與『時間：11:00～22:00』需分開保存。", evidence: ["時間：11:00～22:00", "報到時間：10:00"]}
    notes: []

  - fixtureId: MTI-REP-0094-P01
    privacyReview:
      status: pass
      evidence: ["邊緣人市集｜MAJI MAJI 集食行樂圓形廣場", "供基本照明用電"]
      reason: "活動、場域、價目與公開設備規則未包含未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["邊緣人市集｜MAJI MAJI 集食行樂圓形廣場", "日期：2019/11/23、2019/11/24"]
      reason: "兩個日期均屬唯一具名市集與場域。"
    draftReadiness:
      value: reviewable_core
      evidence: ["邊緣人市集｜MAJI MAJI 集食行樂圓形廣場", "日期：2019/11/23、2019/11/24"]
      reason: "名稱含唯一場域，日期明示且沒有核心衝突。"
    events:
      - eventName: {status: exact, value: "邊緣人市集", evidence: ["邊緣人市集｜MAJI MAJI 集食行樂圓形廣場"]}
        dates: {status: exact, value: ["2019-11-23", "2019-11-24"], evidence: ["日期：2019/11/23、2019/11/24"]}
        operatingHours: {status: exact, value: {start: "12:00", end: "20:00"}, evidence: ["時間：12:00-20:00"]}
        location: {status: exact, value: "MAJI MAJI 集食行樂圓形廣場", evidence: ["邊緣人市集｜MAJI MAJI 集食行樂圓形廣場"]}
        boothCost: {status: choice_required, value: ["超大攤3×3m：1200元／日", "大攤3×1.5m：650元／日", "小攤1.5×1.5m：400元／日"], evidence: ["超大攤3×3m：1200元／日", "大攤3×1.5m：650元／日", "小攤1.5×1.5m：400元／日"], reason: "三個攤型價目，本文未明示已選。"}
        equipment: {status: exact, value: {venue: "遮蔽廊道", notProvided: ["傘", "棚"], power: "基本照明用電"}, evidence: ["場地有遮蔽廊道，不供傘或棚；桌子250元／次、椅子10元／天。", "供基本照明用電；高規格需求限1000W且須事先說明。"]}
        equipmentOptions: {status: choice_required, value: ["桌子250元／次", "椅子10元／天"], evidence: ["場地有遮蔽廊道，不供傘或棚；桌子250元／次、椅子10元／天。"], reason: "租用價目未證明已選。"}
    ignoreSpans: []
    warnings:
      - {message: "基本照明用電與『高規格需求限1000W且須事先說明』不可簡化為無限制供電。", evidence: ["供基本照明用電；高規格需求限1000W且須事先說明。"]}
    notes: []

  - fixtureId: MTI-REP-0094-P02
    privacyReview:
      status: pass
      evidence: ["邊緣人市集｜K-ARENA 高雄巨蛋（體育館）", "禁用明火與瓦斯"]
      reason: "公開活動、場域、價目與限制未包含未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["邊緣人市集｜K-ARENA 高雄巨蛋（體育館）", "日期：2019/11/16、2019/11/17"]
      reason: "兩個日期同屬唯一具名市集與場域。"
    draftReadiness:
      value: reviewable_core
      evidence: ["邊緣人市集｜K-ARENA 高雄巨蛋（體育館）", "日期：2019/11/16、2019/11/17"]
      reason: "名稱含唯一場域，日期明示且沒有核心衝突。"
    events:
      - eventName: {status: exact, value: "邊緣人市集", evidence: ["邊緣人市集｜K-ARENA 高雄巨蛋（體育館）"]}
        dates: {status: exact, value: ["2019-11-16", "2019-11-17"], evidence: ["日期：2019/11/16、2019/11/17"]}
        operatingHours: {status: exact, value: {start: "14:00", end: "20:00"}, evidence: ["時間：14:00-20:00"]}
        location: {status: exact, value: "K-ARENA 高雄巨蛋（體育館）", evidence: ["邊緣人市集｜K-ARENA 高雄巨蛋（體育館）"]}
        boothCost: {status: choice_required, value: ["大格3×1.5m：900元／日", "小格1.5×1.5m：650元／日"], evidence: ["大格3×1.5m：900元／日", "小格1.5×1.5m：650元／日"], reason: "兩個攤型價目，本文未明示已選。"}
        equipment: {status: exact, value: {provided: ["傘"], notProvided: ["電力"]}, evidence: ["攤位供傘；桌子200元／次；椅子10元／天；不供電。"]}
        equipmentOptions: {status: choice_required, value: ["桌子200元／次", "椅子10元／天"], evidence: ["攤位供傘；桌子200元／次；椅子10元／天；不供電。"], reason: "租用價目未證明已選。"}
        restrictions: {status: exact, value: ["禁用明火與瓦斯", "可停放三輪車、摩托車改裝餐車", "胖卡無法停放"], evidence: ["禁用明火與瓦斯，可停放三輪車、摩托車改裝餐車；胖卡無法停放。"]}
    ignoreSpans: []
    warnings: []
    notes: []

  - fixtureId: MTI-REP-0094-P03
    privacyReview:
      status: pass
      evidence: ["私人姓名：[PERSON_NAME]", "Email：[EMAIL]", "聯絡電話：[PHONE_OR_CONTACT]", "私人地址：[PRIVATE_ADDRESS]", "車牌：[IDENTIFIER]", "品牌與商品回答：[PRIVATE_FORM_ANSWER]"]
      reason: "所有私人欄位均以指南允許的 canonical tokens 遮罩。"
    eventDisposition:
      value: event_selection_required
      evidence: ["活動一｜四四南村", "活動二｜MAJI MAJI 集食行樂圓形廣場", "活動三｜板橋車站2F環球購物中心", "活動四｜K-ARENA 高雄巨蛋"]
      reason: "目前 inputText 明列四個場域、日期與價目不同的不可合併事件，必須先選一個。"
    draftReadiness:
      value: blocked
      evidence: ["活動一｜四四南村", "活動二｜MAJI MAJI 集食行樂圓形廣場", "活動三｜板橋車站2F環球購物中心", "活動四｜K-ARENA 高雄巨蛋"]
      reason: "四個候選事件尚未選擇，不能形成單一草稿。"
    events:
      - eventName: {status: exact, value: "活動一｜四四南村", evidence: ["活動一｜四四南村"]}
        dates: {status: inferable, value: ["2019-11-02", "2019-11-16"], evidence: ["referenceDate: 2019-10-18", "11/2、11/16，12:00-19:00；全棚1200元、半棚700元、四分之一棚400元／日。"], reason: "依 referenceDate 與未來合理區間補為 2019。"}
        operatingHours: {status: exact, value: {start: "12:00", end: "19:00"}, evidence: ["11/2、11/16，12:00-19:00；全棚1200元、半棚700元、四分之一棚400元／日。"]}
        location: {status: exact, value: "四四南村", evidence: ["活動一｜四四南村"]}
        boothCost: {status: choice_required, value: ["全棚1200元／日", "半棚700元／日", "四分之一棚400元／日"], evidence: ["11/2、11/16，12:00-19:00；全棚1200元、半棚700元、四分之一棚400元／日。"], reason: "三個攤型未選。"}
      - eventName: {status: exact, value: "活動二｜MAJI MAJI 集食行樂圓形廣場", evidence: ["活動二｜MAJI MAJI 集食行樂圓形廣場"]}
        dates: {status: inferable, value: ["2019-11-23", "2019-11-24"], evidence: ["referenceDate: 2019-10-18", "11/23、11/24，12:00-20:00；超大攤1200元、大攤650元、小攤400元／日。"], reason: "依 referenceDate 與未來合理區間補為 2019。"}
        operatingHours: {status: exact, value: {start: "12:00", end: "20:00"}, evidence: ["11/23、11/24，12:00-20:00；超大攤1200元、大攤650元、小攤400元／日。"]}
        location: {status: exact, value: "MAJI MAJI 集食行樂圓形廣場", evidence: ["活動二｜MAJI MAJI 集食行樂圓形廣場"]}
        boothCost: {status: choice_required, value: ["超大攤1200元／日", "大攤650元／日", "小攤400元／日"], evidence: ["11/23、11/24，12:00-20:00；超大攤1200元、大攤650元、小攤400元／日。"], reason: "三個攤型未選。"}
      - eventName: {status: exact, value: "活動三｜板橋車站2F環球購物中心", evidence: ["活動三｜板橋車站2F環球購物中心"]}
        dates: {status: inferable, value: ["2019-11-23", "2019-11-24", "2019-11-30", "2019-12-01"], evidence: ["referenceDate: 2019-10-18", "11/23、11/24、11/30、12/1，14:00-21:00；大格750元、小格550元／日。"], reason: "依 referenceDate 與未來合理區間補為 2019。"}
        operatingHours: {status: exact, value: {start: "14:00", end: "21:00"}, evidence: ["11/23、11/24、11/30、12/1，14:00-21:00；大格750元、小格550元／日。"]}
        location: {status: exact, value: "板橋車站2F環球購物中心", evidence: ["活動三｜板橋車站2F環球購物中心"]}
        boothCost: {status: choice_required, value: ["大格750元／日", "小格550元／日"], evidence: ["11/23、11/24、11/30、12/1，14:00-21:00；大格750元、小格550元／日。"], reason: "兩個攤型未選。"}
      - eventName: {status: exact, value: "活動四｜K-ARENA 高雄巨蛋", evidence: ["活動四｜K-ARENA 高雄巨蛋"]}
        dates: {status: inferable, value: ["2019-11-16", "2019-11-17"], evidence: ["referenceDate: 2019-10-18", "11/16、11/17，14:00-20:00；大格900元、小格650元／日。"], reason: "依 referenceDate 與未來合理區間補為 2019。"}
        operatingHours: {status: exact, value: {start: "14:00", end: "20:00"}, evidence: ["11/16、11/17，14:00-20:00；大格900元、小格650元／日。"]}
        location: {status: exact, value: "K-ARENA 高雄巨蛋", evidence: ["活動四｜K-ARENA 高雄巨蛋"]}
        boothCost: {status: choice_required, value: ["大格900元／日", "小格650元／日"], evidence: ["11/16、11/17，14:00-20:00；大格900元、小格650元／日。"], reason: "兩個攤型未選。"}
    ignoreSpans:
      - {text: "私人姓名：[PERSON_NAME]", reason: "已遮罩私人表單欄位，不是事件欄位。", evidence: ["私人姓名：[PERSON_NAME]"]}
      - {text: "Email：[EMAIL]", reason: "已遮罩私人聯絡欄位，不是事件欄位。", evidence: ["Email：[EMAIL]"]}
      - {text: "聯絡電話：[PHONE_OR_CONTACT]", reason: "已遮罩私人聯絡欄位，不是事件欄位。", evidence: ["聯絡電話：[PHONE_OR_CONTACT]"]}
      - {text: "私人地址：[PRIVATE_ADDRESS]", reason: "已遮罩私人地址，不是活動地點。", evidence: ["私人地址：[PRIVATE_ADDRESS]"]}
      - {text: "車牌：[IDENTIFIER]", reason: "已遮罩私人識別碼，不是事件欄位。", evidence: ["車牌：[IDENTIFIER]"]}
      - {text: "品牌與商品回答：[PRIVATE_FORM_ANSWER]", reason: "已遮罩私人表單答案，不是事件欄位。", evidence: ["品牌與商品回答：[PRIVATE_FORM_ANSWER]"]}
    warnings:
      - {message: "四個『活動一』至『活動四』不得合併為一個草稿。", evidence: ["活動一｜四四南村", "活動二｜MAJI MAJI 集食行樂圓形廣場", "活動三｜板橋車站2F環球購物中心", "活動四｜K-ARENA 高雄巨蛋"]}
    notes: []

  - fixtureId: MTI-REP-0095-P01
    privacyReview:
      status: pass
      evidence: ["好朋友市集｜10月國慶場", "錄取四天之品牌優惠200元。"]
      reason: "活動、錄取日、公開價目與期限未包含未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["好朋友市集｜10月國慶場", "錄取日期：2019/10/10、10/11、10/12、10/13"]
      reason: "四個錄取日同屬唯一具名市集。"
    draftReadiness:
      value: partial
      evidence: ["好朋友市集｜10月國慶場", "錄取日期：2019/10/10、10/11、10/12、10/13"]
      reason: "名稱與日期可辨識，但目前文字沒有地點。"
    events:
      - eventName: {status: exact, value: "好朋友市集｜10月國慶場", evidence: ["好朋友市集｜10月國慶場"]}
        dates: {status: inferable, value: ["2019-10-10", "2019-10-11", "2019-10-12", "2019-10-13"], evidence: ["錄取日期：2019/10/10、10/11、10/12、10/13"], reason: "首日明示 2019/10，後三日依同一錄取日期列補足年月。"}
        location: {status: not_present, value: null, evidence: []}
        boothCost: {status: choice_required, value: ["附設桌椅550元／天", "自備桌椅350元／天"], evidence: ["市集費用：附設桌椅550元／天；自備桌椅350元／天。"], reason: "設備方案未明示已選。"}
        discount: {status: exact, value: {amount: 200, condition: "錄取四天"}, evidence: ["錄取四天之品牌優惠200元。"]}
    ignoreSpans:
      - {text: "確認與匯款截止：10/2 18:00", reason: "確認與匯款期限不是活動日。", evidence: ["確認與匯款截止：10/2 18:00"]}
    warnings:
      - {message: "公開費用有『附設桌椅』『自備桌椅』兩個方案，不能由四日優惠推定已選方案。", evidence: ["市集費用：附設桌椅550元／天；自備桌椅350元／天。", "錄取四天之品牌優惠200元。"]}
    notes: []

  - fixtureId: MTI-REP-0096-P01
    privacyReview:
      status: pass
      evidence: ["09-10月｜秋。台鋁市集", "地點：高雄市前鎮區忠勤路8號"]
      reason: "公開活動名稱、場地與時段未包含未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["09-10月｜秋。台鋁市集", "地點：高雄市前鎮區忠勤路8號"]
      reason: "可辨識一個具名市集；三段文字明示為招募期間，不是三個活動事件。"
    draftReadiness:
      value: partial
      evidence: ["招募期間：09/02-09/29、09/30-10/27、10/28-11/03", "市集時間：平日17:00-21:00；假日14:00-21:00"]
      reason: "目前文字只有招募期間，沒有可套用的活動日期。"
    events:
      - eventName: {status: exact, value: "09-10月｜秋。台鋁市集", evidence: ["09-10月｜秋。台鋁市集"]}
        dates: {status: not_present, value: null, evidence: []}
        operatingHours: {status: unsupported, value: {weekday: "17:00-21:00", holiday: "14:00-21:00"}, evidence: ["市集時間：平日17:00-21:00；假日14:00-21:00"], reason: "依平日／假日變動的時間不能壓成單一時間。"}
        location: {status: exact, value: "高雄市前鎮區忠勤路8號", evidence: ["地點：高雄市前鎮區忠勤路8號"]}
    ignoreSpans:
      - {text: "招募期間：09/02-09/29、09/30-10/27、10/28-11/03", reason: "原文明示為招募期間，不是活動日。", evidence: ["招募期間：09/02-09/29、09/30-10/27、10/28-11/03"]}
    warnings:
      - {message: "不得把三段『招募期間』建立為活動日期。", evidence: ["招募期間：09/02-09/29、09/30-10/27、10/28-11/03"]}
    notes: []

  - fixtureId: MTI-REP-0096-P02
    privacyReview:
      status: pass
      evidence: ["09-10月｜秋。台鋁市集", "地點：高雄市前鎮區忠勤路8號"]
      reason: "公開活動、地址與同場域節目資訊未包含未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["09-10月｜秋。台鋁市集", "日期區間：09/02-09/29、09/30-10/27、10/28-11/03"]
      reason: "三段相接日期區間均屬同一具名市集；『同場域活動』與『其他合作』不是欲建立的市集。"
    draftReadiness:
      value: reviewable_core
      evidence: ["09-10月｜秋。台鋁市集", "日期區間：09/02-09/29、09/30-10/27、10/28-11/03", "地點：高雄市前鎮區忠勤路8號"]
      reason: "名稱、活動日期區間與唯一地點可辨識且無衝突。"
    events:
      - eventName: {status: exact, value: "09-10月｜秋。台鋁市集", evidence: ["09-10月｜秋。台鋁市集"]}
        dates: {status: inferable, value: [{start: "2019-09-02", end: "2019-09-29"}, {start: "2019-09-30", end: "2019-10-27"}, {start: "2019-10-28", end: "2019-11-03"}], evidence: ["referenceDate: 2019-08-21", "日期區間：09/02-09/29、09/30-10/27、10/28-11/03"], reason: "依 referenceDate 與未來合理區間補為 2019。"}
        operatingHours: {status: unsupported, value: {weekday: "17:00-21:00", holiday: "14:00-21:00"}, evidence: ["平日17:00-21:00；假日14:00-21:00"], reason: "依日別變動，單一時間欄無法完整表達。"}
        location: {status: exact, value: "高雄市前鎮區忠勤路8號", evidence: ["地點：高雄市前鎮區忠勤路8號"]}
    ignoreSpans:
      - {text: "同場域活動：09/07-09/08街頭文化祭、09/21-09/22車展、10/06戶外電影院、10/10-10/27高雄電影節。", reason: "同場域的文化祭、車展、電影不是本文欲建立的市集事件。", evidence: ["同場域活動：09/07-09/08街頭文化祭、09/21-09/22車展、10/06戶外電影院、10/10-10/27高雄電影節。"]}
      - {text: "其他合作：室內進駐、室內寄賣、手作教室。", reason: "進駐、寄賣、教室是其他合作，不是此市集草稿。", evidence: ["其他合作：室內進駐、室內寄賣、手作教室。"]}
    warnings:
      - {message: "不得把『街頭文化祭』『車展』『戶外電影院』『高雄電影節』切成市集 event block。", evidence: ["同場域活動：09/07-09/08街頭文化祭、09/21-09/22車展、10/06戶外電影院、10/10-10/27高雄電影節。"]}
    notes: []

  - fixtureId: MTI-REP-0097-P01
    privacyReview:
      status: pass
      evidence: ["不能只有文青｜9月錄取通知", "是否為三輪車：否", "是否用電：否"]
      reason: "活動、設備回答與金額未包含未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["不能只有文青｜9月錄取通知", "錄取日期：9/21（六）、9/22（日）、9/28（六）、9/29（日）"]
      reason: "四個錄取日同屬唯一具名市集。"
    draftReadiness:
      value: partial
      evidence: ["不能只有文青｜9月錄取通知", "錄取日期：9/21（六）、9/22（日）、9/28（六）、9/29（日）"]
      reason: "名稱與錄取日可辨識，但目前文字沒有地點。"
    events:
      - eventName: {status: exact, value: "不能只有文青｜9月錄取通知", evidence: ["不能只有文青｜9月錄取通知"]}
        dates: {status: inferable, value: ["2019-09-21", "2019-09-22", "2019-09-28", "2019-09-29"], evidence: ["referenceDate: 2019-08-15", "錄取日期：9/21（六）、9/22（日）、9/28（六）、9/29（日）"], reason: "依 referenceDate 與未來合理區間補為 2019。"}
        location: {status: not_present, value: null, evidence: []}
        stallConfiguration: {status: exact, value: "非三輪車", evidence: ["是否為三輪車：否"]}
        power: {status: exact, value: "不用電", evidence: ["是否用電：否"]}
        boothCost: {status: exact, value: {amount: 2000, unit: "total"}, evidence: ["攤位費用總額：2000元"]}
    ignoreSpans: []
    warnings: []
    notes: []

  - fixtureId: MTI-REP-0097-P02
    privacyReview:
      status: pass
      evidence: ["不能只有文青｜9月錄取通知", "攤位費用總額：2000元"]
      reason: "活動、日期與費用明細未包含未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["不能只有文青｜9月錄取通知", "錄取日期：9/21、9/22、9/28、9/29"]
      reason: "四個錄取日仍屬一個具名市集。"
    draftReadiness:
      value: partial
      evidence: ["不能只有文青｜9月錄取通知", "錄取日期：9/21、9/22、9/28、9/29"]
      reason: "名稱與日期可辨識，但地點缺漏；費用明細另有日期對應不完整。"
    events:
      - eventName: {status: exact, value: "不能只有文青｜9月錄取通知", evidence: ["不能只有文青｜9月錄取通知"]}
        dates: {status: inferable, value: ["2019-09-21", "2019-09-22", "2019-09-28", "2019-09-29"], evidence: ["referenceDate: 2019-08-15", "錄取日期：9/21、9/22、9/28、9/29"], reason: "依 referenceDate 與未來合理區間補為 2019。"}
        location: {status: not_present, value: null, evidence: []}
        boothCost: {status: unsupported, value: {selectedType: "普通攤", perDay: 1000, chargedDays: 2, total: 2000}, evidence: ["錄取（租借）天數：普通假日 2", "普通攤：1000元／日", "攤位費用總額：2000元"], reason: "費用明細只計兩個普通假日，但四個錄取日中未指出是哪兩日。"}
        alternatePrice: {status: ignore, value: "三輪車1200元／日", evidence: ["三輪車：1200元／日"], reason: "普通攤明細與總額已指向普通攤；三輪車為未選公開價目。"}
        powerRental: {status: exact, value: 0, evidence: ["電力租借：0"]}
    ignoreSpans: []
    warnings:
      - {message: "『錄取日期』有四日，但『錄取（租借）天數：普通假日 2』只計兩日，且未指出對應日期；須保留而不可任意分配。", evidence: ["錄取日期：9/21、9/22、9/28、9/29", "錄取（租借）天數：普通假日 2"]}
    notes: []

  - fixtureId: MTI-REP-0098-P01
    privacyReview:
      status: pass
      evidence: ["愛河・野餐派對", "入選場次：2019/04/13（六）、2019/04/14（日）"]
      reason: "內容只有公開活動、入選日、價目與期限，未見未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["愛河・野餐派對", "入選場次：2019/04/13（六）、2019/04/14（日）"]
      reason: "兩個入選日同屬唯一具名活動。"
    draftReadiness:
      value: partial
      evidence: ["愛河・野餐派對", "入選場次：2019/04/13（六）、2019/04/14（日）"]
      reason: "名稱與入選日可辨識，但目前文字沒有活動地點。"
    events:
      - eventName: {status: exact, value: "愛河・野餐派對", evidence: ["愛河・野餐派對"]}
        dates: {status: exact, value: ["2019-04-13", "2019-04-14"], evidence: ["入選場次：2019/04/13（六）、2019/04/14（日）"]}
        location: {status: not_present, value: null, evidence: []}
        boothCost: {status: choice_required, value: ["自備桌椅350元／天", "附設桌椅550元／天"], evidence: ["市集費用：自備桌椅350元／天；附設桌椅550元／天。"], reason: "兩個設備方案均為公開價目，本文未明示已選。"}
    ignoreSpans:
      - {text: "確認與匯款期限：2019/04/03 18:00", reason: "確認與匯款期限不是活動日。", evidence: ["確認與匯款期限：2019/04/03 18:00"]}
    warnings:
      - {message: "『自備桌椅』『附設桌椅』仍需選擇，不能從入選兩日推定。", evidence: ["市集費用：自備桌椅350元／天；附設桌椅550元／天。"]}
    notes: []

  - fixtureId: MTI-REP-0098-P02
    privacyReview:
      status: pass
      evidence: ["最新回覆：您好，已匯款完畢，謝謝。", "愛河・野餐派對"]
      reason: "付款狀態與引用的公開活動資訊未包含未遮罩私人資料。"
    eventDisposition:
      value: single_candidate
      evidence: ["愛河・野餐派對", "入選日期：2019/04/13、2019/04/14"]
      reason: "引用資訊只指向一個兩日活動。"
    draftReadiness:
      value: partial
      evidence: ["愛河・野餐派對", "入選日期：2019/04/13、2019/04/14"]
      reason: "名稱與日期明確，但目前文字沒有地點。"
    events:
      - eventName: {status: exact, value: "愛河・野餐派對", evidence: ["愛河・野餐派對"]}
        dates: {status: exact, value: ["2019-04-13", "2019-04-14"], evidence: ["入選日期：2019/04/13、2019/04/14"]}
        location: {status: not_present, value: null, evidence: []}
        boothCost: {status: choice_required, value: ["自備桌椅350元／天", "附設桌椅550元／天"], evidence: ["自備桌椅350元／天；附設桌椅550元／天。"], reason: "已匯款只證明付款完成，未指出選了哪一個方案。"}
        paymentStatus: {status: exact, value: "paid", evidence: ["最新回覆：您好，已匯款完畢，謝謝。"]}
    ignoreSpans: []
    warnings:
      - {message: "『已匯款完畢』不得用來反推『自備桌椅』或『附設桌椅』方案。", evidence: ["最新回覆：您好，已匯款完畢，謝謝。", "自備桌椅350元／天；附設桌椅550元／天。"]}
    notes: []

  - fixtureId: MTI-REP-0099-P01
    privacyReview:
      status: pass
      evidence: ["手手市集主辦您好", "台南漁光島"]
      reason: "活動名稱與公開場域可保留，文字未見未遮罩私人資料。"
    eventDisposition:
      value: reject
      evidence: ["因人力不足，4/6、4/7無法前往台南漁光島設攤。", "錄取名單尚未公布，先行撤回報名，避免作業困擾。"]
      reason: "目前最新陳述明確『無法前往』並『撤回報名』，不應建立草稿。"
    draftReadiness:
      value: blocked
      evidence: ["錄取名單尚未公布，先行撤回報名，避免作業困擾。"]
      reason: "明確撤回具有優先阻止效果。"
    events: []
    ignoreSpans:
      - {text: "4/6、4/7", reason: "日期只作撤回 evidence，不建立事件。", evidence: ["因人力不足，4/6、4/7無法前往台南漁光島設攤。"]}
      - {text: "台南漁光島", reason: "地點只作撤回 evidence，不建立事件。", evidence: ["因人力不足，4/6、4/7無法前往台南漁光島設攤。"]}
      - {text: "我們已收到您的來信。報名市集者請留意活動前約七天公布的入選名單，無論入選與否皆以主辦公告為準。", reason: "自動回覆不推翻目前的撤回。", evidence: ["我們已收到您的來信。報名市集者請留意活動前約七天公布的入選名單，無論入選與否皆以主辦公告為準。"]}
    warnings:
      - {message: "不得以引用自動回覆建立候選事件；目前有效意圖是『先行撤回報名』。", evidence: ["錄取名單尚未公布，先行撤回報名，避免作業困擾。", "引用自動回覆："]}
    notes: []

  - fixtureId: MTI-REP-0100-P01
    privacyReview:
      status: pass
      evidence: ["愛設計市集 × 誠品站前店K12藝文西廣場", "地點：誠品台北站前店K12藝文西側1A廣場"]
      reason: "文字只有公開檔期、場地與商業合作條件，未見未遮罩私人資料。"
    eventDisposition:
      value: reject
      evidence: ["日期：民國108年2/1～2/28，共28天", "另有百貨抽成：現金30%、刷卡或禮券32%。", "款項月結50天，品牌需排三個8小時班或兩個全日班協助銷售。"]
      reason: "28 天百貨檔期、抽成、月結與排班銷售顯示長期零售／進駐合作，不是本功能的單次市集草稿。"
    draftReadiness:
      value: blocked
      evidence: ["款項月結50天，品牌需排三個8小時班或兩個全日班協助銷售。"]
      reason: "『月結50天』與『排班協助銷售』符合應拒絕的長期零售合作。"
    events: []
    ignoreSpans:
      - {text: "日期：民國108年2/1～2/28，共28天", reason: "長期進駐檔期只作 reject evidence，不建立活動日。", evidence: ["日期：民國108年2/1～2/28，共28天"]}
      - {text: "地點：誠品台北站前店K12藝文西側1A廣場", reason: "長期進駐場地只作 reject evidence，不建立事件。", evidence: ["地點：誠品台北站前店K12藝文西側1A廣場"]}
      - {text: "租金：5000元未稅／28天／檔，提供100×60cm桌一張。", reason: "長期檔租與設備只作 reject evidence。", evidence: ["租金：5000元未稅／28天／檔，提供100×60cm桌一張。"]}
      - {text: "另有百貨抽成：現金30%、刷卡或禮券32%。", reason: "百貨抽成是長期零售條件，不是市集 boothCost。", evidence: ["另有百貨抽成：現金30%、刷卡或禮券32%。"]}
    warnings:
      - {message: "即使標題含『市集』且日期、地點、租金可解析，『百貨抽成』『月結50天』『排班協助銷售』仍要求 reject。", evidence: ["愛設計市集 × 誠品站前店K12藝文西廣場", "另有百貨抽成：現金30%、刷卡或禮券32%。", "款項月結50天，品牌需排三個8小時班或兩個全日班協助銷售。"]}
    notes: []

  - fixtureId: MTI-REP-0100-P02
    privacyReview:
      status: pass
      evidence: ["品牌名稱：[BRAND_NAME]", "姓名：[PERSON_NAME]", "Email：[EMAIL]", "電話與LINE：[PHONE_OR_CONTACT]", "品牌網址：[PRIVATE_FORM_URL]", "商品與發票回答：[PRIVATE_FORM_ANSWER]", "桌數需求：[PRIVATE_FORM_ANSWER]"]
      reason: "品牌、姓名、聯絡方式、私人網址與表單答案均以指南允許的 canonical tokens 遮罩。"
    eventDisposition:
      value: reject
      evidence: ["檔期：民國108年2/1～2/28，共28天", "租金5000元未稅／28天／檔；百貨抽成現金30%、刷卡或禮券32%。", "款項月結50天；品牌需排班協助銷售。"]
      reason: "28 天進駐檔期加上百貨抽成、月結與排班銷售，是長期零售合作而非單次市集。"
    draftReadiness:
      value: blocked
      evidence: ["款項月結50天；品牌需排班協助銷售。"]
      reason: "『月結50天』『排班協助銷售』直接阻止建立市集草稿。"
    events: []
    ignoreSpans:
      - {text: "檔期：民國108年2/1～2/28，共28天", reason: "長期進駐檔期只作 reject evidence。", evidence: ["檔期：民國108年2/1～2/28，共28天"]}
      - {text: "地點：誠品台北站前店K12藝文西側1A廣場", reason: "長期進駐地點只作 reject evidence。", evidence: ["地點：誠品台北站前店K12藝文西側1A廣場"]}
      - {text: "租金5000元未稅／28天／檔；百貨抽成現金30%、刷卡或禮券32%。", reason: "檔租與百貨抽成不是單次市集 boothCost。", evidence: ["租金5000元未稅／28天／檔；百貨抽成現金30%、刷卡或禮券32%。"]}
      - {text: "品牌名稱：[BRAND_NAME]", reason: "已遮罩私人品牌提交，不是事件欄位。", evidence: ["品牌名稱：[BRAND_NAME]"]}
      - {text: "姓名：[PERSON_NAME]", reason: "已遮罩私人姓名，不是事件欄位。", evidence: ["姓名：[PERSON_NAME]"]}
      - {text: "Email：[EMAIL]", reason: "已遮罩私人聯絡方式，不是事件欄位。", evidence: ["Email：[EMAIL]"]}
      - {text: "電話與LINE：[PHONE_OR_CONTACT]", reason: "已遮罩私人聯絡方式，不是事件欄位。", evidence: ["電話與LINE：[PHONE_OR_CONTACT]"]}
      - {text: "品牌網址：[PRIVATE_FORM_URL]", reason: "已遮罩私人網址，不得開啟。", evidence: ["品牌網址：[PRIVATE_FORM_URL]"]}
      - {text: "商品與發票回答：[PRIVATE_FORM_ANSWER]", reason: "已遮罩私人表單答案，不是事件欄位。", evidence: ["商品與發票回答：[PRIVATE_FORM_ANSWER]"]}
      - {text: "桌數需求：[PRIVATE_FORM_ANSWER]", reason: "已遮罩私人表單答案，不解析設備數量。", evidence: ["桌數需求：[PRIVATE_FORM_ANSWER]"]}
    warnings:
      - {message: "標題的『進駐表單回函』、28 天檔期、百貨抽成、月結與排班共同要求 reject。", evidence: ["愛設計市集 × 誠品站前店K12藝文西廣場｜進駐表單回函", "檔期：民國108年2/1～2/28，共28天", "款項月結50天；品牌需排班協助銷售。"]}
    notes: []
```

## 統計

- Fixture 總數：30。
- Privacy：`pass` 30、`fail` 0。
- `eventDisposition`：`single_candidate` 26、`event_selection_required` 1、`insufficient` 0、`reject` 3。
- `draftReadiness`：`reviewable_core` 10、`partial` 16、`blocked` 4。
- `events: []`：3 筆，均為 `reject`（MTI-REP-0099-P01、MTI-REP-0100-P01、MTI-REP-0100-P02）。
- 多事件未選：1 筆（MTI-REP-0094-P03），保留 4 個候選 event blocks。

## 規範歧義紀錄

1. **場次／活動系列與單一事件名稱的顆粒度**：例如「台南新光三越場次」只有場次稱呼而沒有另一個正式名稱；本次將原句直接作 `eventName`，不依常識補品牌或主辦名稱。Evidence：`台南新光三越場次`。
2. **場域寫在標題時是否足以作核心地點**：對「邊緣人市集｜MAJI MAJI 集食行樂圓形廣場」與「邊緣人市集｜K-ARENA 高雄巨蛋（體育館）」，本次把分隔符後的唯一場域視為 `location: exact`。Evidence：`邊緣人市集｜MAJI MAJI 集食行樂圓形廣場`、`邊緣人市集｜K-ARENA 高雄巨蛋（體育館）`。
3. **外部公告中的實際入圍日**：當本文同時有整體範圍與「實際入圍日期請至主辦公告查詢」，本次保留整體 `activityRange`，但將 `selectedDates` 標 `unsupported`，不直接套用兩日。Evidence：`活動日期：2020/02/15～2020/02/16`、`實際入圍日期請至主辦公告查詢。`。
4. **已收款與應付款**：`已收到2740元，但本次應付2760元。` 被視為不同角色而不是同欄 conflict；仍以 warning 保留短付狀態。
5. **錄取四日但費用只計兩日**：`錄取日期：9/21、9/22、9/28、9/29` 與 `錄取（租借）天數：普通假日 2` 不足以指出兩個付費日。本次不改寫錄取日，將費用／日期關係標 `unsupported`。
6. **相接的三個日期區間**：`日期區間：09/02-09/29、09/30-10/27、10/28-11/03` 在唯一名稱與地點下被視為同一市集系列的日期結構，而不是三個必選事件；同場域的車展、電影等則忽略。
7. **幣別**：指南只允許在場地位於台灣且使用「元」時推定 TWD。為避免把推定混入金額角色，本結果保留原文金額，未在沒有必要時補 currency；尤其缺地點的 fixture 不補 TWD。

## 完整性自檢

- [x] 已逐一列出 30 個 fixture，`fixtureId` 無重複。
- [x] 每筆均含 `privacyReview`、`eventDisposition`、`draftReadiness`、`events`、`ignoreSpans`、`warnings`、`notes`。
- [x] 30 筆均先完成 privacy review；沒有 privacy fail，因此沒有觸發單筆停止判讀。
- [x] 所有非空判斷、warning 與 note（本結果 notes 皆空）均附目前 `inputText` 或該筆 `referenceDate` 的 evidence；`not_present` 不製造 evidence。
- [x] `reject` 三筆均使用 `events: []`；撤回或長期進駐的日期、地點只留作拒絕 evidence。
- [x] Markdown fenced block 共 1 組，開啟與關閉配對。
- [x] 結果只重現公開活動資訊與原包既有 canonical tokens；未寫入未遮罩私人姓名、品牌提交、聯絡方式、帳戶、付款識別碼、私人網址、車牌、私人地址或商品回答。
- [x] 未開啟外部連結、未使用網路、未讀取隔離範圍外資料，且未修改任何既有文件。
