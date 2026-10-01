# 市集文字匯入 Paste Fixture Blind Review Result B v1

- 複核者：Reviewer B
- 複核日期：2026-09-15
- 判讀依據：僅使用 `MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_V1_2026_09_15.md` 內各筆 `referenceDate` 與 `inputText`，並以 `MARKET_TEXT_IMPORT_ANNOTATION_GUIDE_V1_2026_09_15.md` 作通用欄位、狀態及安全規則參考。
- 隔離聲明：本複核未查看或搜尋 Calibration answer key、Annotation Pass 1、Discovery Record、Corpus Curation、Adjudication、Gmail／郵件來源、git diff、其他 agent 訊息或 Reviewer A 答案。
- 記錄說明：`eventDates` 的 `value` 是可安全正規化的活動日；日期相依但現行單值欄位無法承載的排程仍保留結構化值並標為 `unsupported`。`times`、`costs`、`equipment` 無資料時，以一筆 `not_present` 明示。

## 逐筆結果

### MTI-REP-0001-P01

```yaml
fixtureId: MTI-REP-0001-P01
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
events:
  - marketName: { status: not_present, value: null, evidence: null }
    eventDates:
      status: exact
      value: [2026-10-03, 2026-10-04]
      evidence: "活動日期｜2026年10月3日（星期六）至10月4日（星期日）"
    location:
      status: exact
      value: "醒村文化景觀公園"
      evidence: "醒村文化景觀公園"
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
ignoreSpans:
  - { text: "招募對象｜品牌、職人、創作者及地方夥伴", reason: recruitment_audience_not_add_market_field }
  - { text: "報名連結｜[REGISTRATION_URL]", reason: registration_link_not_parsed }
warnings:
  - "原文沒有市集名稱；草稿只能保留日期與地點候選。"
notes: "日期與星期一致；沒有以 referenceDate 補值。"
```

### MTI-REP-0001-P02

```yaml
fixtureId: MTI-REP-0001-P02
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
events:
  - marketName:
      status: exact
      value: "2026眷村嘉年華"
      evidence: "2026眷村嘉年華"
    eventDates:
      status: exact
      value: [2026-10-03, 2026-10-04]
      evidence: "活動日期｜2026年10月3日（星期六）至10月4日（星期日）"
    location:
      status: exact
      value: "醒村文化景觀公園"
      evidence: "醒村文化景觀公園"
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
ignoreSpans:
  - { text: "過去的「2025眷村嘉年華」", reason: historical_event_reference }
  - { text: "招募對象｜品牌、職人、創作者及地方夥伴", reason: recruitment_audience_not_add_market_field }
  - { text: "報名連結｜[REGISTRATION_URL]", reason: registration_link_not_parsed }
  - { text: "[PERSON_NAME]／活動聯絡人", reason: deidentified_contact_not_event_field }
  - { text: "手機號碼：[PHONE_OR_CONTACT]", reason: deidentified_contact_not_event_field }
  - { text: "電子郵件：[EMAIL]", reason: deidentified_contact_not_event_field }
  - { text: "聯絡地址：[ORGANIZER_ADDRESS]", reason: organizer_address_not_event_location }
warnings:
  - "同文出現 2025 歷史活動名稱；只採用明確指向今年的 2026 活動。"
notes: "去識別化 token 未作為欄位值。"
```

### MTI-REP-0002-P01

```yaml
fixtureId: MTI-REP-0002-P01
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
events:
  - marketName:
      status: exact
      value:
        preferredDisplayName: "開嘉｜芫荽趴踢"
        seriesName: "開嘉"
        occurrenceName: "芫荽趴踢"
      evidence: ["開嘉", "芫荽趴踢"]
    eventDates:
      status: inferable
      value: [2026-11-14, 2026-11-15]
      evidence: "11.14–11.15"
      inference: "由 referenceDate 2026-07-13 推定同年後續檔期。"
    location: { status: not_present, value: null, evidence: null }
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
ignoreSpans:
  - { text: "謝謝您報名參與此次活動。", reason: courtesy_text }
  - { text: "本封信件通知您錄取", reason: acceptance_context_not_add_market_field }
warnings:
  - "活動日期缺年，年份為依 referenceDate 的保守推定。"
notes: "系列名與單場名並存，首選顯示名稱保留兩者。"
```

### MTI-REP-0002-P02

```yaml
fixtureId: MTI-REP-0002-P02
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: event_selection_required
events:
  - marketName:
      status: exact
      value:
        preferredDisplayName: "開嘉｜芫荽趴踢"
        seriesName: "開嘉"
        occurrenceName: "芫荽趴踢"
      evidence: ["開嘉", "芫荽趴踢"]
    eventDates:
      status: inferable
      value: [2026-11-14, 2026-11-15]
      evidence: "11.14–11.15"
      inference: "由 referenceDate 2026-07-13 推定同年後續檔期。"
    location: { status: not_present, value: null, evidence: null }
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
  - marketName:
      status: exact
      value:
        preferredDisplayName: "開嘉｜雞啤節"
        seriesName: "開嘉"
        occurrenceName: "雞啤節"
      evidence: "開嘉｜雞啤節"
    eventDates:
      status: inferable
      value: [2026-10-17, 2026-10-18]
      evidence: "10.17–10.18"
      inference: "由 referenceDate 2026-07-13 推定同年後續檔期。"
    location:
      status: exact
      value: "嘉義公園"
      evidence: "嘉義公園"
    times:
      - role: operation_hours
        status: exact
        value: { start: "14:00", end: "19:00" }
        evidence: "14:00－19:00"
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
ignoreSpans:
  - { text: "本封信件通知您錄取", reason: acceptance_context_not_add_market_field }
  - { text: "繳費期限：2026/07/18 23:59 前完成繳費。", reason: payment_deadline }
  - { text: "確認附件內的租借設備、總金額是否有誤。", reason: attachment_values_not_present_in_input }
warnings:
  - "原文包含兩個不同單場名稱，必須由使用者選擇，不能把欄位合併。"
  - "設備與總金額只指向附件，inputText 沒有可標註值。"
notes: "兩個缺年檔期皆依 referenceDate 推定為 2026 年。"
```

### MTI-REP-0004-P01

```yaml
fixtureId: MTI-REP-0004-P01
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
events:
  - marketName: { status: not_present, value: null, evidence: null }
    eventDates:
      status: inferable
      value: [2026-04-18, 2026-04-19]
      evidence: "04/18（六）– 04/19（日）"
      inference: "由 referenceDate 2026-04-07 補年，且星期相符。"
    location:
      status: exact
      value: "高雄市楠梓區大學南路168號"
      evidence: "高雄市楠梓區大學南路168號"
    times:
      - role: operation_hours
        status: exact
        value: { start: "13:00", end: "18:00" }
        evidence: "13:00 – 18:00"
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
ignoreSpans:
  - { text: "招募間數｜40 間（額滿為止）", reason: recruitment_capacity_not_add_market_field }
  - { text: "招募截止｜04/10", reason: registration_deadline }
  - { text: "報名連結｜[REGISTRATION_URL]", reason: registration_link_not_parsed }
warnings:
  - "原文沒有市集名稱；日期年份依 referenceDate 推定。"
notes: "活動公開地址可作為 location，不屬私人地址。"
```

### MTI-REP-0004-P02

```yaml
fixtureId: MTI-REP-0004-P02
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
events:
  - marketName:
      status: exact
      value: "春日家的日常"
      evidence: "《春日家的日常》"
    eventDates:
      status: inferable
      value: [2026-04-18, 2026-04-19]
      evidence: "04/18（六）– 04/19（日）"
      inference: "由 referenceDate 2026-04-07 補年，且星期相符。"
    location:
      status: exact
      value: "高雄市楠梓區大學南路168號"
      evidence: "高雄市楠梓區大學南路168號"
    times:
      - role: operation_hours
        status: exact
        value: { start: "13:00", end: "18:00" }
        evidence: "13:00 – 18:00"
    costs:
      - role: booth_cost
        status: exact
        value: { amount: 0, currency: null, unit: event }
        evidence: "本次活動免攤位費用"
    equipment:
      - role: included_equipment
        status: exact
        value: { type: tent, size: "3米", quantity: null, provisionStatus: included }
        evidence: "皆配置三米帳篷"
      - role: included_equipment
        status: exact
        value: { type: table, quantity: 1, provisionStatus: included }
        evidence: "1桌"
      - role: included_equipment
        status: exact
        value: { type: chair, quantity: 2, provisionStatus: included }
        evidence: "2椅"
ignoreSpans:
  - { text: "活動期間將發放總額新台幣10萬元之消費兌換券", reason: promotional_budget_not_vendor_cost }
  - { text: "招募間數｜40 間（額滿為止）", reason: recruitment_capacity_not_add_market_field }
  - { text: "招募截止｜04/10", reason: registration_deadline }
  - { text: "報名連結｜[REGISTRATION_URL]", reason: registration_link_not_parsed }
warnings:
  - "三米帳篷沒有明示數量，不推定為一頂。"
notes: "新台幣10萬元是現場消費券總額，不是攤商成本。"
```

### MTI-REP-0007-P01

```yaml
fixtureId: MTI-REP-0007-P01
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
events:
  - marketName:
      status: exact
      value: "2026法國生活節在高雄"
      evidence: "2026法國生活節在高雄"
    eventDates:
      status: exact
      value: [2026-05-22, 2026-05-23, 2026-05-24]
      evidence: "2026/5/22（五）~2026/5/24（日）"
    location:
      status: exact
      value: "高雄衛武營戶外劇場＆衛武營都會公園"
      evidence: "高雄衛武營戶外劇場＆衛武營都會公園"
    times:
      - role: operation_hours_by_date
        status: unsupported
        value:
          - { date: 2026-05-22, start: "14:00", end: "22:00" }
          - { date: 2026-05-23, start: "14:00", end: "22:00" }
          - { date: 2026-05-24, start: "14:00", end: "21:00" }
        evidence:
          - "5/22 14:00~22:00"
          - "5/23 14:00~22:00"
          - "5/24 14:00~21:00"
      - role: setup_window
        status: unsupported
        value: { date: 2026-05-22, start: "11:00", end: "13:00" }
        evidence: "進場時間：5/22 11:00-13:00"
      - role: teardown_time
        status: unsupported
        value: { date: 2026-05-24, after: "21:00" }
        evidence: "5/24 活動時間結束21:00後才能開始撤場"
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
ignoreSpans: []
warnings:
  - "每日營業時間不同，現行單一時間欄位無法完整承載。"
  - "進場時間窗與撤場時間不是營業起訖時間。"
notes: "保留日期相依排程供確認，不壓成單一開始／結束時間。"
```

### MTI-REP-0007-P02

```yaml
fixtureId: MTI-REP-0007-P02
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
events:
  - marketName:
      status: exact
      value: "2026法國生活節在高雄"
      evidence: "2026法國生活節在高雄"
    eventDates:
      status: exact
      value: [2026-05-22, 2026-05-23, 2026-05-24]
      evidence: "2026/5/22（五）~2026/5/24（日）"
    location:
      status: exact
      value: "高雄衛武營戶外劇場＆衛武營都會公園"
      evidence: "高雄衛武營戶外劇場＆衛武營都會公園"
    times:
      - role: operation_hours_by_date
        status: unsupported
        value:
          - { date: 2026-05-22, start: "14:00", end: "22:00" }
          - { date: 2026-05-23, start: "14:00", end: "22:00" }
          - { date: 2026-05-24, start: "14:00", end: "21:00" }
        evidence:
          - "5/22 14:00~22:00"
          - "5/23 14:00~22:00"
          - "5/24 14:00~21:00"
      - role: setup_window
        status: unsupported
        value: { date: 2026-05-22, start: "11:00", end: "13:00" }
        evidence: "進場時間：5/22 11:00-13:00"
    costs:
      - role: booth_cost
        status: exact
        value: { amount: 4000, currency: TWD, currencyStatus: inferable, unit: per_3_day_event }
        evidence: "本次活動3天的攤位租金4,000元"
    equipment:
      - role: included_equipment
        status: exact
        value: { type: signboard, quantity: 1, provisionStatus: included }
        evidence: "攤位看板"
      - role: included_equipment
        status: exact
        value: { type: tent, quantity: 1, provisionStatus: included }
        evidence: "帳篷1頂"
      - role: included_equipment
        status: exact
        value: { type: table, subtype: conference_long_table, quantity: 1, provisionStatus: included }
        evidence: "會議長桌1張"
      - role: included_equipment
        status: exact
        value: { type: chair, quantity: 2, provisionStatus: included }
        evidence: "椅子2張"
      - role: included_equipment
        status: exact
        value: { type: hanging_fan, quantity: 1, provisionStatus: included }
        evidence: "吊扇1台"
      - role: power_option
        status: unsupported
        value: { voltage: 110, amperage: 5, maximumWatts: 300, provisionStatus: basic_included }
        evidence: "基本用電：110V／5A／300W以下"
ignoreSpans:
  - { text: "報名截止時間：即日起至4月6日23:59截止。", reason: registration_deadline }
warnings:
  - "每日營業時間不同，現行單一時間欄位無法完整承載。"
  - "基本用電規格目前沒有獨立表單欄位。"
notes: "幣別 TWD 由公開台灣場地與「元」推定；不把 23:59 截止時間當活動時間。"
```

### MTI-REP-0007-P03

```yaml
fixtureId: MTI-REP-0007-P03
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
events:
  - marketName:
      status: exact
      value: "2026法國生活節在高雄"
      evidence: "2026法國生活節在高雄"
    eventDates:
      status: exact
      value: [2026-05-22, 2026-05-23, 2026-05-24]
      evidence: "2026/5/22~2026/5/24"
    location:
      status: exact
      value: "高雄衛武營戶外劇場＆衛武營都會公園"
      evidence: "高雄衛武營戶外劇場＆衛武營都會公園"
    times:
      - role: operation_hours_by_date
        status: unsupported
        value:
          - { dates: [2026-05-22, 2026-05-23], start: "14:00", end: "22:00" }
          - { date: 2026-05-24, start: "14:00", end: "21:00" }
        evidence:
          - "5/22、5/23 14:00~22:00"
          - "5/24 14:00~21:00"
    costs:
      - role: booth_cost
        status: exact
        value: { amount: 4000, currency: TWD, currencyStatus: inferable, unit: per_3_day_event }
        evidence: "活動3天攤位租金4,000元"
    equipment:
      - role: included_equipment
        status: exact
        value: { type: tent, quantity: 1, provisionStatus: included }
        evidence: "包含帳篷1頂"
      - role: included_equipment
        status: exact
        value: { type: table, subtype: long_table, quantity: 1, provisionStatus: included }
        evidence: "長桌1張"
      - role: included_equipment
        status: exact
        value: { type: chair, quantity: 2, provisionStatus: included }
        evidence: "椅子2張"
      - role: included_equipment
        status: exact
        value: { type: hanging_fan, quantity: 1, provisionStatus: included }
        evidence: "吊扇1台"
ignoreSpans:
  - { text: "電子信箱：[EMAIL]", reason: deidentified_private_answer }
  - { text: "公司地址：[PRIVATE_ADDRESS]", reason: deidentified_private_answer_not_event_location }
  - { text: "品牌名稱：[BRAND_NAME]", reason: deidentified_private_answer_not_market_name }
  - { text: "品牌類別：手作文創", reason: submitted_brand_attribute_not_event_field }
  - { text: "商品介紹：[PRIVATE_FORM_ANSWER]", reason: deidentified_private_answer }
  - { text: "特殊電力需求：[PRIVATE_FORM_ANSWER]", reason: deidentified_private_answer_has_no_parseable_value }
warnings:
  - "每日營業時間不同，現行單一時間欄位無法完整承載。"
notes: "所有私人表單內容均已是 token；不由 token 猜測品牌或電力需求。"
```

### MTI-REP-0011-P01

```yaml
fixtureId: MTI-REP-0011-P01
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
events:
  - marketName:
      status: exact
      value: "2026駁二小夜埕－好日子"
      evidence: "2026駁二小夜埕－好日子"
    eventDates:
      status: exact
      value: [2026-02-14, 2026-02-15, 2026-02-17, 2026-02-18, 2026-02-19, 2026-02-20, 2026-02-21, 2026-02-22]
      evidence: "2026.02.14（六）-02.22（日），活動共計8天（除夕02.16活動休停一日）"
    location:
      status: exact
      value:
        venue: "駁二藝術特區"
        areas: ["大勇區駁遊路", "大義區紅磚廊道"]
      evidence: "駁二藝術特區 大勇區駁遊路／大義區紅磚廊道"
    times:
      - role: operation_hours_by_date
        status: unsupported
        value:
          - { dates: [2026-02-14, 2026-02-15, 2026-02-17, 2026-02-18, 2026-02-19, 2026-02-20, 2026-02-21], start: "14:00", end: "22:00" }
          - { date: 2026-02-22, start: "14:00", end: "20:00" }
        evidence: "14:00-22:00／最後一日-20:00"
    costs:
      - role: booth_option
        status: choice_required
        value: { label: "大勇區手作攤位", amount: 800, currency: TWD, currencyStatus: inferable, unit: per_day, linkedLocation: "大勇區駁遊路" }
        evidence: "大勇區手作攤位｜800元／日"
      - role: booth_option
        status: choice_required
        value: { label: "大義區手作攤位", amount: 1200, currency: TWD, currencyStatus: inferable, unit: per_day, linkedLocation: "大義區紅磚廊道" }
        evidence: "大義區手作攤位｜1,200元／日"
      - role: deposit
        status: exact
        value: { amount: 1000, currency: TWD, currencyStatus: inferable, unit: per_application }
        evidence: "保證金1,000元"
    equipment:
      - role: rentable_equipment
        status: exact
        value: { type: parasol, amount: 450, currency: TWD, currencyStatus: inferable, quantityUnit: "支", priceUnit: per_session }
        evidence: ["遮陽傘450元／支", "皆為每場次價格"]
      - role: rentable_equipment
        status: exact
        value: { type: long_table, amount: 200, currency: TWD, currencyStatus: inferable, quantityUnit: "張", priceUnit: per_session }
        evidence: ["長桌200元／張", "皆為每場次價格"]
      - role: rentable_equipment
        status: exact
        value: { type: folding_chair, quantity: 2, amount: 50, currency: TWD, currencyStatus: inferable, priceUnit: per_session }
        evidence: ["折疊椅50元／2張", "皆為每場次價格"]
ignoreSpans: []
warnings:
  - "兩個攤位方案與場地區域綁定，攤位費必須由使用者選擇。"
  - "最後一日營業時間不同，現行單一時間欄位無法完整承載。"
notes: "02.16 明示休停，未列入 eventDates；地點與費用的綁定未拆散。"
```

### MTI-REP-0011-P02

```yaml
fixtureId: MTI-REP-0011-P02
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
events:
  - marketName:
      status: exact
      value: "2026駁二小夜埕－好日子"
      evidence: "2026駁二小夜埕－好日子"
    eventDates:
      status: exact
      value: [2026-02-14, 2026-02-15, 2026-02-17, 2026-02-18, 2026-02-19, 2026-02-20, 2026-02-21, 2026-02-22]
      evidence: "2026.02.14-02.22，除夕02.16休停一日"
    location:
      status: exact
      value:
        areas: ["大勇區駁遊路", "大義區紅磚廊道"]
      evidence: "大勇區駁遊路800元／日；大義區紅磚廊道1,200元／日"
    times:
      - role: operation_hours_by_date
        status: unsupported
        value:
          - { dates: [2026-02-14, 2026-02-15, 2026-02-17, 2026-02-18, 2026-02-19, 2026-02-20, 2026-02-21], start: "14:00", end: "22:00" }
          - { date: 2026-02-22, start: "14:00", end: "20:00" }
        evidence: "14:00-22:00，最後一日20:00結束"
    costs:
      - role: booth_option
        status: choice_required
        value: { label: "大勇區", amount: 800, currency: TWD, currencyStatus: inferable, unit: per_day, linkedLocation: "大勇區駁遊路" }
        evidence: "大勇區駁遊路800元／日"
      - role: booth_option
        status: choice_required
        value: { label: "大義區", amount: 1200, currency: TWD, currencyStatus: inferable, unit: per_day, linkedLocation: "大義區紅磚廊道" }
        evidence: "大義區紅磚廊道1,200元／日"
      - role: deposit
        status: exact
        value: { amount: 1000, currency: TWD, currencyStatus: inferable, unit: per_application }
        evidence: "保證金：1,000元"
    equipment:
      - role: rentable_equipment
        status: exact
        value: { type: parasol, amount: 450, currency: TWD, currencyStatus: inferable, priceUnit: per_session }
        evidence: ["遮陽傘450元", "皆為每場次價格"]
      - role: rentable_equipment
        status: exact
        value: { type: long_table, amount: 200, currency: TWD, currencyStatus: inferable, priceUnit: per_session }
        evidence: ["長桌200元", "皆為每場次價格"]
      - role: rentable_equipment
        status: exact
        value: { type: folding_chair, quantity: 2, amount: 50, currency: TWD, currencyStatus: inferable, priceUnit: per_session }
        evidence: ["折疊椅2張50元", "皆為每場次價格"]
ignoreSpans:
  - { text: "報名時間：即日起至2025年11月21日23:00止", reason: registration_deadline }
  - { text: "錄取品牌公佈時間：2025年11月26日19:00", reason: announcement_date }
  - { text: "錄取品牌繳費截止日：2025年12月12日", reason: payment_deadline }
  - { text: "品牌名稱：[BRAND_NAME]", reason: deidentified_private_answer_not_market_name }
  - { text: "聯絡人：[PERSON_NAME]", reason: deidentified_contact_not_event_field }
  - { text: "電子信箱：[EMAIL]", reason: deidentified_contact_not_event_field }
  - { text: "商品說明：[PRIVATE_FORM_ANSWER]", reason: deidentified_private_answer }
warnings:
  - "兩個場地方案與攤位費綁定，必須由使用者選擇。"
  - "最後一日營業時間不同，現行單一時間欄位無法完整承載。"
notes: "報名、公佈與繳費日期均未加入 eventDates。"
```

### MTI-REP-0012-P01

```yaml
fixtureId: MTI-REP-0012-P01
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: insufficient
events:
  - marketName:
      status: exact
      value: "2025高雄眷村嘉年華（岡山場）"
      evidence: "《2025高雄眷村嘉年華（岡山場）》"
    eventDates: { status: not_present, value: [], evidence: null }
    location: { status: not_present, value: null, evidence: null }
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
ignoreSpans:
  - { text: "繳費截止日期為10/2（四）15:30前", reason: payment_deadline }
  - { text: "逾期未完成繳費及資料回報者，將視同放棄資格。", reason: payment_rule_not_add_market_field }
warnings:
  - "只有活動名稱與繳費提醒，沒有活動日期、時間、地點、費用或設備資料。"
notes: "10/2（四）是繳費截止，不得當成活動日；資訊不足以建立可用草稿。"
```

### MTI-REP-0016-P01

```yaml
fixtureId: MTI-REP-0016-P01
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
events:
  - marketName:
      status: exact
      value: "美麗華 21愛你幸福前行市集｜10月場"
      evidence: "美麗華 21愛你幸福前行市集｜10月場"
    eventDates:
      status: exact
      value: [2025-10-10, 2025-10-11, 2025-10-12, 2025-10-18, 2025-10-19, 2025-10-24, 2025-10-25, 2025-10-26]
      evidence: "2025/10/10-12、10/18-19、10/24-26"
    location:
      status: exact
      value: "美麗華1樓水舞廣場，台北市中山區敬業三路20號"
      evidence: "美麗華1樓水舞廣場，台北市中山區敬業三路20號"
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
ignoreSpans:
  - { text: "報名連結：[REGISTRATION_URL]", reason: registration_link_not_parsed }
warnings: []
notes: "相同名稱與地點的三段不連續日期保留在同一 event block，未補齊中間日期。"
```

### MTI-REP-0016-P02

```yaml
fixtureId: MTI-REP-0016-P02
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: event_selection_required
events:
  - marketName:
      status: exact
      value: "2025愛手創國際手作設計節"
      evidence: "2025愛手創國際手作設計節"
    eventDates:
      status: inferable
      value: [2025-11-07, 2025-11-08, 2025-11-09]
      evidence: ["2025愛手創國際手作設計節", "11/07-11/09"]
      inference: "年份取自同一活動名稱。"
    location:
      status: exact
      value: "華山1914文創產業園區東2館"
      evidence: "華山1914文創產業園區東2館"
    times:
      - role: operation_hours
        status: exact
        value: { start: "10:30", end: "19:00" }
        evidence: "每日10:30-19:00"
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
  - marketName:
      status: exact
      value: "夏日搖擺市集｜9月場"
      evidence: "夏日搖擺市集｜9月場"
    eventDates:
      status: unsupported
      value: { year: 2025, rangeStart: 2025-09-05, rangeEnd: 2025-09-28, recurrence: "每週五、六、日" }
      evidence: "9/5-9/28每週五、六、日"
      inference: "年份依 referenceDate 2025-08-28 推定；不展開 recurring 日期。"
    location:
      status: exact
      value: "心中山線形公園南段"
      evidence: "心中山線形公園南段"
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
  - marketName:
      status: exact
      value: "美麗華21愛你幸福前行市集"
      evidence: "美麗華21愛你幸福前行市集"
    eventDates:
      status: exact
      value: [2025-10-10, 2025-10-11, 2025-10-12, 2025-10-18, 2025-10-19, 2025-10-24, 2025-10-25, 2025-10-26]
      evidence: "2025/10/10-12、10/18-19、10/24-26"
    location:
      status: exact
      value: "美麗華1樓水舞廣場"
      evidence: "美麗華1樓水舞廣場"
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
ignoreSpans:
  - { text: "合作店品牌進駐", reason: retail_residency_not_single_market_event }
  - { text: "檔期：2025/09/17-2026/01/15", reason: retail_residency_period_not_event_date }
  - { text: "地點：台中購物中心店鋪", reason: retail_store_location_not_market_event }
  - { text: "中山店寄售報名中：[REGISTRATION_URL]", reason: consignment_not_single_market_event }
warnings:
  - "包含三個市集候選，必須先選擇事件。"
  - "夏日搖擺市集是 recurring 描述，第一版不可任意展開日期。"
  - "合作店進駐與寄售不屬單次市集草稿，未建立 event block。"
notes: "多活動欄位保持分離；沒有把店鋪進駐檔期混入市集日期。"
```

### MTI-REP-0018-P01

```yaml
fixtureId: MTI-REP-0018-P01
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: insufficient
events:
  - marketName: { status: not_present, value: null, evidence: null }
    eventDates: { status: not_present, value: [], evidence: null }
    location: { status: not_present, value: null, evidence: null }
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - role: equipment_unit_price
        status: exact
        value: { equipment: meeting_table_with_two_chairs, amount: 250, currency: TWD, currencyStatus: inferable, unit: per_event }
        evidence: "會議桌（180×60cm／含兩椅）／250元／檔"
      - role: equipment_unit_price
        status: exact
        value: { equipment: red_plastic_chair, amount: 15, currency: TWD, currencyStatus: inferable, unit: per_chair_per_event }
        evidence: "紅色塑膠椅／15元／張／檔"
      - role: power_option
        status: unsupported
        value: { amount: 300, currency: TWD, currencyStatus: inferable, unit: per_1000W_per_day }
        evidence: "額外電力每1,000W收取300元／日"
    equipment:
      - role: selected_rental_equipment
        status: exact
        value: { type: meeting_table, sizeCm: "180×60", quantity: 1, quantityUnit: set, includedChairs: 2, provisionStatus: rentable_selected }
        evidence: ["會議桌（180×60cm／含兩椅）", "回答：會議桌（含兩椅）1組"]
      - role: rentable_equipment_option
        status: exact
        value: { type: red_plastic_chair, provisionStatus: rentable_not_selected }
        evidence: ["紅色塑膠椅／15元／張／檔", "回答：會議桌（含兩椅）1組"]
      - role: power_request
        status: exact
        value: { requested: false }
        evidence: ["是否需要申請用電？", "回答：否"]
ignoreSpans: []
warnings:
  - "缺少市集名稱、日期與地點，只有設備選擇，資訊不足以建立事件草稿。"
  - "額外電力費目前沒有獨立欄位，且本次回答為不申請。"
notes: "未用單價乘數量推算新的總價；只保留原文明示單價與選擇。"
```

### MTI-REP-0018-P02

```yaml
fixtureId: MTI-REP-0018-P02
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: insufficient
events:
  - marketName: { status: not_present, value: null, evidence: null }
    eventDates:
      status: unsupported
      value: { selection: "三天全報", concreteDates: [] }
      evidence: "欲報名日期：三天全報"
    location: { status: not_present, value: null, evidence: null }
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - role: equipment_unit_price
        status: exact
        value: { equipment: meeting_table_with_two_chairs, amount: 250, currency: TWD, currencyStatus: inferable, unit: per_event }
        evidence: "250元／檔"
    equipment:
      - role: selected_rental_equipment
        status: exact
        value: { type: meeting_table, quantity: 1, quantityUnit: set, includedChairs: 2, provisionStatus: rentable_selected }
        evidence: "會議桌（含兩椅）1組"
      - role: power_request
        status: exact
        value: { requested: false }
        evidence: "是否申請用電：否"
ignoreSpans:
  - { text: "品牌名稱：[BRAND_NAME]", reason: deidentified_private_answer_not_market_name }
  - { text: "來自哪個縣市：[PRIVATE_FORM_ANSWER]", reason: deidentified_private_answer_not_event_location }
  - { text: "品牌聯絡人：[PERSON_NAME]", reason: deidentified_contact_not_event_field }
  - { text: "聯絡人LINE ID：[PHONE_OR_CONTACT]", reason: deidentified_contact_not_event_field }
  - { text: "聯絡人電話：[PHONE_OR_CONTACT]", reason: deidentified_contact_not_event_field }
  - { text: "E-MAIL：[EMAIL]", reason: deidentified_contact_not_event_field }
  - { text: "品牌類別：[PRIVATE_FORM_ANSWER]", reason: deidentified_private_answer }
  - { text: "商品介紹：[PRIVATE_FORM_ANSWER]", reason: deidentified_private_answer }
warnings:
  - "「三天全報」是使用者選擇但沒有具體活動日期，不能正規化成 eventDates。"
  - "缺少公開活動識別與地點，資訊不足以建立事件草稿。"
notes: "去識別化品牌名稱不是公開市集名稱；不由私人回答 token 猜值。"
```

### MTI-REP-0029-P01

```yaml
fixtureId: MTI-REP-0029-P01
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
events:
  - marketName:
      status: exact
      value: "Butter Zoom x 奶油遊戲人間理想國 奶油市集"
      evidence: "Butter Zoom x 奶油遊戲人間理想國 奶油市集"
    eventDates:
      status: inferable
      value: [2024-12-21, 2024-12-22]
      evidence: "報名日期：12/21-12/22"
      inference: "由 referenceDate 2024-11-23 推定同年後續檔期。"
    location: { status: not_present, value: null, evidence: null }
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - role: selected_booth_cost
        status: inferable
        value: { amount: 2000, currency: TWD, currencyStatus: inferable, unit: per_2_day_event }
        evidence: "共計2日：2,000元＋750元器材＋500元保證金"
        inference: "2,000 元未命名；由同一式中另列器材與保證金，保守推定為兩日攤位費。"
      - role: equipment_total
        status: exact
        value: { amount: 750, currency: TWD, currencyStatus: inferable, unit: selected_bundle }
        evidence: "750元器材"
      - role: deposit
        status: exact
        value:
          amount: 500
          currency: TWD
          currencyStatus: inferable
          unit: per_application
          refundCondition: "活動結束當天簽退後退還"
        evidence: ["500元保證金", "保證金將於活動結束當天簽退後退還"]
      - role: payment_total
        status: ignore
        value: { amount: 3250, currency: TWD, currencyStatus: inferable }
        evidence: "＝3,250元"
        reason: "總付款含設備與保證金，不等於 booth cost。"
    equipment:
      - role: selected_rental_equipment
        status: exact
        value:
          - { type: umbrella, quantity: 1 }
          - { type: table, quantity: 1 }
          - { type: chair, quantity: 1 }
        evidence: "租借器材：傘1、桌1、椅1"
ignoreSpans:
  - { text: "感謝您報名", reason: courtesy_text }
  - { text: "申請的攤位已錄取", reason: acceptance_context_not_add_market_field }
warnings:
  - "2,000 元的角色未直接命名，只能由已拆出的器材與保證金推定為攤位費。"
notes: "不以 3,250 元總付款覆寫 booth cost；設備只有組合總額，沒有個別單價。"
```

### MTI-REP-0029-P02

```yaml
fixtureId: MTI-REP-0029-P02
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: reject
events: []
ignoreSpans:
  - text: "> 感謝您報名 Butter Zoom x 奶油遊戲人間理想國 奶油市集，申請的攤位已錄取。"
    reason: quoted_prior_acceptance_superseded_by_current_cancellation
  - text: "> 報名日期：12/21-12/22"
    reason: quoted_prior_event_detail_superseded_by_current_cancellation
  - text: "> 租借器材：傘1、桌1、椅1"
    reason: quoted_prior_event_detail_superseded_by_current_cancellation
  - text: "> 共計2日：2,000元＋750元器材＋500元保證金＝3,250元"
    reason: quoted_prior_event_detail_superseded_by_current_cancellation
warnings:
  - "目前段落明確表示「這次的市集因故無法前往」並要求取消；不得只解析引用的舊錄取通知來建立參與草稿。"
notes: "events 為空是因目前訊息的取消語意；其餘名稱、日期、費用與設備只存在於被引用的既往通知。"
```

### MTI-REP-0036-P01

```yaml
fixtureId: MTI-REP-0036-P01
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
events:
  - marketName:
      status: exact
      value:
        preferredDisplayName: "台味小吃市集"
        organizerOrSeries: "大兵市集"
      evidence: ["大兵市集", "「台味小吃市集」"]
    eventDates:
      status: inferable
      value: [2024-08-03, 2024-08-04]
      evidence: "8.3—8.4（六日）"
      inference: "由 referenceDate 2024-07-18 補年，且星期相符。"
    location:
      status: exact
      value: "台中｜北屯新村文創園區"
      evidence: "台中｜北屯新村文創園區"
    times:
      - role: operation_hours
        status: exact
        value: { start: "14:00", end: "19:00" }
        evidence: "14:00-19:00"
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - role: equipment_list
        status: unsupported
        value:
          - { type: european_tent, provisionStatus: unknown }
          - { type: table, provisionStatus: unknown }
          - { type: chair, provisionStatus: unknown }
        evidence: "設備：歐帳、桌、椅"
ignoreSpans:
  - { text: "招募台味文創、台味小吃、品味選物、綠色生活、懷舊二手品牌", reason: recruitment_categories_not_add_market_fields }
warnings:
  - "設備清單沒有說明是包含、免費、可租、必須自備或禁止使用，不能推定提供狀態。"
notes: "以「台味小吃市集」為首選活動名；「大兵市集」保留為可能的主辦或系列名稱。"
```

### MTI-REP-0036-P02

```yaml
fixtureId: MTI-REP-0036-P02
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: event_selection_required
events:
  - marketName:
      status: exact
      value:
        preferredDisplayName: "台味小吃市集"
        organizerOrSeries: "大兵市集"
      evidence: ["大兵市集", "「台味小吃市集」"]
    eventDates:
      status: inferable
      value: [2024-08-03, 2024-08-04]
      evidence: "8.3—8.4（六日）"
      inference: "由 referenceDate 2024-07-18 補年，且星期相符。"
    location:
      status: exact
      value: "台中｜北屯新村文創園區"
      evidence: "台中｜北屯新村文創園區"
    times:
      - role: operation_hours
        status: exact
        value: { start: "14:00", end: "19:00" }
        evidence: "14:00-19:00"
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - role: equipment_list
        status: unsupported
        value:
          - { type: european_tent, provisionStatus: unknown }
          - { type: table, provisionStatus: unknown }
          - { type: chair, provisionStatus: unknown }
        evidence: "設備：歐帳、桌、椅"
  - marketName:
      status: exact
      value:
        preferredDisplayName: "台味小吃市集"
        organizerOrSeries: "大兵市集"
      evidence: ["大兵市集", "「台味小吃市集」"]
    eventDates:
      status: inferable
      value: [2024-08-24, 2024-08-25]
      evidence: "8.24—8.25（六日）"
      inference: "由 referenceDate 2024-07-18 補年，且星期相符。"
    location:
      status: exact
      value: "台中｜帝國製糖廠"
      evidence: "台中｜帝國製糖廠"
    times:
      - role: operation_hours
        status: exact
        value: { start: "14:00", end: "18:30" }
        evidence: "14:00-18:30"
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - role: equipment_list
        status: unsupported
        value:
          - { type: european_tent, provisionStatus: unknown }
          - { type: table, provisionStatus: unknown }
          - { type: chair, provisionStatus: unknown }
        evidence: "設備：歐帳、桌、椅"
ignoreSpans:
  - { text: "報名表單：[REGISTRATION_URL]", reason: registration_link_not_parsed }
warnings:
  - "同名活動有兩個不同場地及日期，依 event block 規則拆開並要求選擇。"
  - "共用設備清單沒有提供狀態，兩個 event block 都只能標為 unsupported。"
notes: "沒有把北屯與帝國製糖廠的日期、地點或時間合成一份草稿。"
```

### MTI-REP-0042-P01

```yaml
fixtureId: MTI-REP-0042-P01
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: reject
events: []
ignoreSpans:
  - { text: "合作貼文預計5月5日提供審稿，5月8日前公開。", reason: content_review_and_publish_schedule }
  - { text: "限時動態會帶到貴司近期市集資訊。", reason: marketing_copy_without_event_details }
  - { text: "優惠時間：2024.05.04～2024.05.12", reason: promotion_period_not_event_date }
  - { text: "優惠碼：[PROMO_CODE]", reason: deidentified_private_promo_code }
  - { text: "消費滿500元折100元，滿1,500元贈送耳環。", reason: consumer_promotion_not_vendor_cost }
  - { text: "本次IG單篇圖文合作報價4,000元，包含照片與文案。", reason: marketing_service_invoice_not_market_cost }
warnings:
  - "整段是社群合作、優惠及報價資訊，沒有可建立的市集事件。"
notes: "events 不適用而留空；所有日期與金額都不是活動日或攤商費用。"
```

### MTI-REP-0047-P01

```yaml
fixtureId: MTI-REP-0047-P01
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
events:
  - marketName:
      status: exact
      value: "2023聖誕馬戲嘉年華・衛武營黃昏市集"
      evidence: "2023聖誕馬戲嘉年華・衛武營黃昏市集"
    eventDates:
      status: inferable
      value: [2023-12-09, 2023-12-10, 2023-12-16, 2023-12-17, 2023-12-23, 2023-12-24]
      evidence:
        - "2023聖誕馬戲嘉年華・衛武營黃昏市集"
        - "12/9-12/10"
        - "12/16-12/17"
        - "12/23-12/24"
      inference: "年份取自同一活動名稱。"
    location:
      status: exact
      value:
        venue: "衛武營國家藝術文化中心"
        areaSchedule:
          - { dates: [2023-12-09, 2023-12-10, 2023-12-16, 2023-12-17], areas: ["北廣場", "南廣場"] }
          - { dates: [2023-12-23, 2023-12-24], areas: ["北廣場"] }
      evidence:
        - "地點：衛武營國家藝術文化中心"
        - "12/9-12/10　北廣場／南廣場"
        - "12/16-12/17　北廣場／南廣場"
        - "12/23-12/24　北廣場"
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
ignoreSpans:
  - { text: "高雄｜", reason: city_prefix_already_represented_by_public_venue }
  - { text: "報名連結：[REGISTRATION_URL]", reason: registration_link_not_parsed }
warnings:
  - "12/23–12/24 只有北廣場；地點子區域必須保留日期綁定。"
notes: "同名同主場館的不連續日期保留為單一 event block。"
```

### MTI-REP-0047-P02

```yaml
fixtureId: MTI-REP-0047-P02
reviewerId: Reviewer B
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: event_selection_required
events:
  - marketName:
      status: exact
      value: "台灣龐克折返跑"
      evidence: "台灣龐克折返跑"
    eventDates:
      status: inferable
      value: [2023-12-02, 2023-12-03]
      evidence: "日期：12/02-12/03"
      inference: "由 referenceDate 2023-11-13 推定同年後續檔期。"
    location:
      status: exact
      value: "烏日觀光啤酒廠"
      evidence: "烏日觀光啤酒廠"
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
  - marketName:
      status: exact
      value: "2023米樂生活節｜高雄場"
      evidence: ["2023米樂生活節", "高雄場"]
    eventDates:
      status: inferable
      value: [2023-11-25, 2023-11-26]
      evidence: ["2023米樂生活節", "高雄場：11/25-11/26"]
      inference: "年份取自同一活動名稱。"
    location:
      status: exact
      value: "高雄"
      evidence: "高雄場"
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
  - marketName:
      status: exact
      value: "2023米樂生活節｜台北場"
      evidence: ["2023米樂生活節", "台北場"]
    eventDates:
      status: inferable
      value: [2023-12-23, 2023-12-24]
      evidence: ["2023米樂生活節", "台北場：12/23-12/24"]
      inference: "年份取自同一活動名稱。"
    location:
      status: exact
      value: "台北"
      evidence: "台北場"
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
  - marketName:
      status: exact
      value: "美麗華聖誕跨年市集"
      evidence: "美麗華聖誕跨年市集"
    eventDates:
      status: unsupported
      value: { rangeStart: 2023-12-08, rangeEnd: 2024-01-01, recurrence: "每週五、六、日" }
      evidence: "2023/12/08-2024/01/01，每週五、六、日"
    location:
      status: exact
      value: "美麗華1樓水舞廣場"
      evidence: "美麗華1樓水舞廣場"
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
  - marketName:
      status: exact
      value: "高雄2023聖誕馬戲嘉年華・衛武營黃昏市集"
      evidence: "高雄2023聖誕馬戲嘉年華・衛武營黃昏市集"
    eventDates:
      status: inferable
      value: [2023-12-09, 2023-12-10, 2023-12-16, 2023-12-17, 2023-12-23, 2023-12-24]
      evidence:
        - "高雄2023聖誕馬戲嘉年華・衛武營黃昏市集"
        - "12/9-10、12/16-17、12/23-24"
      inference: "年份取自同一活動名稱。"
    location:
      status: exact
      value: "衛武營國家藝術文化中心"
      evidence: "衛武營國家藝術文化中心"
    times:
      - { role: all, status: not_present, value: [], evidence: null }
    costs:
      - { role: all, status: not_present, value: [], evidence: null }
    equipment:
      - { role: all, status: not_present, value: [], evidence: null }
ignoreSpans:
  - { text: "台灣龐克折返跑及邊緣人市集11-12月最新場次", reason: multi_activity_overview_heading_without_separate_details_for_edge_people_market }
  - { text: "報名截止日期：2022/11/20", reason: registration_deadline_and_stale_year }
  - { text: "進駐全臺遊牧商店：[REGISTRATION_URL]", reason: retail_residency_not_single_market_event }
  - { text: "工讀計時夥伴招募中", reason: staffing_recruitment_not_market_event }
warnings:
  - "共五個可分離的市集場次／事件，必須先由使用者選擇。"
  - "台灣龐克折返跑的 2022 報名截止日早於 referenceDate，且不是活動日期。"
  - "美麗華檔期是跨年 recurring 描述，第一版不得任意展開日期。"
  - "「邊緣人市集」只出現在總覽標題，沒有可安全配對的獨立日期與地點。"
notes: "米樂生活節的高雄場與台北場因地點不同拆成兩個 event block；店鋪進駐與工讀資訊不建立事件。"
```

## 分類統計

| 指標 | 數量 |
| --- | ---: |
| fixture 總數 | 23 |
| `privacyReview: pass` | 23 |
| `privacyReview: fail` | 0 |
| `single_candidate` | 14 |
| `event_selection_required` | 4 |
| `insufficient` | 3 |
| `reject` | 2 |

`eventDisposition` 合計為 23（14 + 4 + 3 + 2）；23 個 fixture ID 均各出現一次於結構化結果。

## 發現的規範歧義

1. `eventDisposition` 四個列舉值沒有正式定義判定門檻。尤其「只有活動名而無活動日」應是 `single_candidate` 或 `insufficient`，以及「現行取消、舊信引用錄取」應是 `reject` 或可保留不參與事件，仍需裁決。本複核分別採 `insufficient` 與 `reject`。
2. 建議紀錄形狀只有單一 `location` 與自由形狀的 `times`，未定義每日不同營業時間、日期相依場地區域的標準資料形狀。本複核保留日期綁定並將現行單值時間欄位標為 `unsupported`。
3. `marketName` 同時有系列／主辦名稱與單場名稱時，Guide 要求兩者都記錄並標示首選，卻未定義 `value` 的正式結構。本複核使用 `preferredDisplayName` 加 `seriesName`、`occurrenceName` 或 `organizerOrSeries`。
4. 「元」加台灣公開場地可推定 TWD，但未規定推定只套在 `currency`，或讓整筆費用的 `status` 變為 `inferable`。本複核保留金額語意的 `exact`，另以 `currencyStatus: inferable` 表達幣別來源。
5. 純「設備：歐帳、桌、椅」沒有提供狀態；Guide 要求區分包含、免費、可租、自備與禁止，卻未定義未知狀態的欄位。本複核使用 `status: unsupported` 與 `provisionStatus: unknown`，不猜測設備由誰提供。
6. 表單回答同時列出設備價目與使用者選擇時，未明確規定未選設備要完全忽略，或保留為可租 option。本複核保留選中設備，並把未選項明示為 `rentable_not_selected`，避免誤當已選。
7. `每週五、六、日` 明定為第一版 `unsupported`，但沒有規定 `value` 應留空或保留 range／recurrence 結構。本複核保留原始可驗證規則，沒有展開日期。
8. 「目前取消＋引用舊錄取通知」在 reject fixture 中，規範未定義要保留一個所有欄位皆 `ignore` 的 event，或令 `events: []`。本複核使用空陣列，並在 `ignoreSpans` 與 `notes` 說明原因。

## 完整性與隱私自檢

- 23 個預期 fixture 均有且只有一筆結果；每筆都有 `privacyReview` 與 `eventDisposition`。
- 所有保留的非空事件欄位值均附 `inputText` evidence；補年或幣別推定另標示 inference／currencyStatus。
- 所有 `ignore`、`choice_required`、`unsupported` 均有就地理由或相鄰 warning／note；本輪沒有需要標為 `conflict` 的欄位。
- Markdown fenced code blocks 已配對。
- 未記錄 Gmail ID、原始 Email、原始電話、LINE ID、實際私人地址、原始網址、私人品牌名或私人表單答案；僅保留 Blind Review Pack 既有的去識別化 token 與公開活動場地。
