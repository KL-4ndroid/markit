# 市集文字匯入 Blind Review Result D — Round B Remainder v1

- Reviewer：Reviewer D（全新、獨立補審）
- 日期：2026-09-16
- 範圍：Round B Reviewer C 未封存之 5 個 fixtures
- 狀態：已完成並封存

## 隔離聲明

本次審查只讀取 `MARKET_TEXT_IMPORT_BLIND_REVIEWER_GUIDE_ROUND_B_V1_2026_09_15.md` 與 `MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_B_REMAINDER_V1_2026_09_16.md`。未查看或搜尋完整 Round B answer key、Reviewer C 部分結果、Annotation Pass 1、Discovery、Corpus、Round A 文件、Gmail、git diff／status、其他 agent 訊息或答案，也未沿文件提及的連結開啟其他資料。以下判斷只依各筆目前的 `referenceDate` 與 `inputText`。

## 結構化審查結果

```yaml
reviewer: Reviewer D
reviewDate: 2026-09-16
reviewMode: blind_isolated_round_b_remainder
fixtures:
  - fixtureId: MTI-REP-0078-P01
    referenceDate: 2021-02-22
    privacyReview:
      status: pass
      evidence:
        - "四葉市集三月場候補錄取通知"
        - "現場繳費，不提供匯款資料。"
      reason: "可見內容只有公開活動名稱、日期、攤位配置與行政指示；文字明確表示未提供匯款資料，未見未遮罩的姓名、聯絡方式、帳戶或識別碼。"
    eventDisposition:
      value: single_candidate
      evidence:
        - "四葉市集三月場候補錄取通知"
        - "3/27：大帳篷"
        - "3/28：小攤車"
      reason: "同一個具名三月場包含兩個活動日期；逐日攤位配置不同，但沒有第二個市集名稱或不同地點足以切成另一事件。"
    draftReadiness:
      value: partial
      evidence:
        - "四葉市集三月場候補錄取通知"
        - "3/27：大帳篷"
        - "3/28：小攤車"
      reason: "名稱與活動日期可辨識，但 inputText 未提供活動地點，未達 reviewable_core。"
    events:
      - eventBlock: 1
        marketName:
          status: exact
          value: "四葉市集三月場"
          evidence: "四葉市集三月場候補錄取通知"
        eventDates:
          status: inferable
          value:
            - "2021-03-27"
            - "2021-03-28"
          evidence:
            - "3/27：大帳篷"
            - "3/28：小攤車"
          inferenceSource: "referenceDate 2021-02-22 與『三月場』共同支持補入 2021 年；原文未明寫年份，因此不標 exact。"
        location:
          status: not_present
          value: null
          evidence: []
        perDateBoothAssignment:
          status: unsupported
          value:
            - date: "2021-03-27"
              boothType: "大帳篷"
              evidence: "3/27：大帳篷"
            - date: "2021-03-28"
              boothType: "小攤車"
              evidence: "3/28：小攤車"
          evidence:
            - "3/27：大帳篷"
            - "3/28：小攤車"
          reason: "原文把不同攤位型態綁定至不同日期，不能安全壓成一個已選攤位或單一設備值；應保留逐日關聯供預覽確認。"
        boothCost:
          status: not_present
          value: null
          evidence: []
        operatingStartTime:
          status: not_present
          value: null
          evidence: []
        operatingEndTime:
          status: not_present
          value: null
          evidence: []
    ignoreSpans:
      - role: confirmation_deadline
        status: ignore
        normalizedValue: "2021-02-26T24:00"
        evidence: "請於2/26 24:00前填寫入選回饋表，逾期視同放棄。"
        reason: "這是填寫入選回饋表的確認截止時間，不是市集活動日期或營業時間。"
    warnings:
      - code: inferred_event_year
        message: "兩個活動日期的年份由 referenceDate 與『三月場』推定，預覽時應揭露推定。"
        evidence:
          - "四葉市集三月場候補錄取通知"
          - "3/27：大帳篷"
          - "3/28：小攤車"
      - code: per_date_booth_assignment_unsupported
        message: "兩日各自綁定不同攤位型態，不能壓成單一攤位欄位。"
        evidence:
          - "3/27：大帳篷"
          - "3/28：小攤車"
      - code: missing_location
        message: "目前文字沒有活動地點。"
        evidence: "四葉市集三月場候補錄取通知"
    notes:
      - role: payment_instruction
        value: "現場繳費；不提供匯款資料"
        evidence: "現場繳費，不提供匯款資料。"
        reason: "這是付款方式備註，不提供可填入 boothCost 的金額。"

  - fixtureId: MTI-REP-0079-P01
    referenceDate: 2021-01-21
    privacyReview:
      status: pass
      evidence:
        - "地點：新北市板橋區三民路一段156號（室內舉辦）"
        - "報名連結：[REGISTRATION_URL]"
      reason: "地址位於明確活動資訊區塊，屬公開活動地點；一般報名連結已以規範 token 遮罩，未見未遮罩個資。"
    eventDisposition:
      value: single_candidate
      evidence:
        - "DOTEL SPACE 春漾市集～一起來野餐吧！"
        - "日期：2021/03/20（六）"
        - "地點：新北市板橋區三民路一段156號（室內舉辦）"
      reason: "文字只描述一個具名、單日、單一地點的市集。"
    draftReadiness:
      value: reviewable_core
      evidence:
        - "DOTEL SPACE 春漾市集～一起來野餐吧！"
        - "日期：2021/03/20（六）"
        - "地點：新北市板橋區三民路一段156號（室內舉辦）"
      reason: "名稱、至少一個活動日期與唯一地點皆為唯一且無衝突；可進入人工預覽。"
    events:
      - eventBlock: 1
        marketName:
          status: exact
          value: "DOTEL SPACE 春漾市集～一起來野餐吧！"
          evidence: "DOTEL SPACE 春漾市集～一起來野餐吧！"
        eventDates:
          status: exact
          value:
            - "2021-03-20"
          evidence: "日期：2021/03/20（六）"
        location:
          status: exact
          value: "新北市板橋區三民路一段156號"
          evidence: "地點：新北市板橋區三民路一段156號（室內舉辦）"
        operatingStartTime:
          status: exact
          value: "12:00"
          evidence: "時間：12:00～20:00"
        operatingEndTime:
          status: exact
          value: "20:00"
          evidence: "時間：12:00～20:00"
        boothCost:
          status: not_present
          value: null
          evidence: []
    ignoreSpans:
      - role: registration_deadline
        status: ignore
        normalizedValue: "2021-01-27T24:00"
        evidence: "報名期間：即日起至2021/01/27 24:00止"
        reason: "這是報名截止，不是活動日期或營業時間。"
      - role: registration_url
        status: ignore
        normalizedValue: null
        evidence: "報名連結：[REGISTRATION_URL]"
        reason: "報名連結不是新增市集表單欄位，且不得解析 token 所代表的外部內容。"
    warnings: []
    notes:
      - role: venue_attribute
        value: "室內舉辦"
        evidence: "地點：新北市板橋區三民路一段156號（室內舉辦）"
        reason: "室內屬場地屬性，可作預覽備註，不應併入地址正規化值。"

  - fixtureId: MTI-REP-0080-P01
    referenceDate: 2021-01-14
    privacyReview:
      status: pass
      evidence:
        - "2021台中燈會市集牛湳販"
        - "攤位型態：一般桌子"
        - "額外電力：不使用"
      reason: "可見內容為公開活動名稱與攤位／設備選擇，未見姓名、聯絡方式、帳戶、私人地址或識別碼。"
    eventDisposition:
      value: single_candidate
      evidence:
        - "2021台中燈會市集牛湳販"
        - "已選參加日期：2021/02/24、02/25、02/26、02/27、02/28"
      reason: "一個具名市集具有一組已選參加日期，沒有第二個不可合併事件。"
    draftReadiness:
      value: partial
      evidence:
        - "2021台中燈會市集牛湳販"
        - "已選參加日期：2021/02/24、02/25、02/26、02/27、02/28"
      reason: "活動名稱與日期明確，但 inputText 未提供活動地點。"
    events:
      - eventBlock: 1
        marketName:
          status: exact
          value: "2021台中燈會市集牛湳販"
          evidence: "2021台中燈會市集牛湳販"
        eventDates:
          status: exact
          value:
            - "2021-02-24"
            - "2021-02-25"
            - "2021-02-26"
            - "2021-02-27"
            - "2021-02-28"
          evidence: "已選參加日期：2021/02/24、02/25、02/26、02/27、02/28"
          normalizationNote: "同一列第一個日期明寫 2021 年，後續月日共享該列年份。"
        location:
          status: not_present
          value: null
          evidence: []
        boothType:
          status: exact
          value: "一般桌子"
          evidence: "攤位型態：一般桌子"
        boothCost:
          status: not_present
          value: null
          evidence: []
        equipment:
          status: exact
          value:
            - type: "帳篷"
              provision: included
              quantity: null
            - type: "桌"
              provision: included
              quantity: 1
            - type: "椅"
              provision: included
              quantity: 2
            - type: "供電"
              provision: included
              restriction: "僅限LED照明使用"
          evidence: "攤位費用包含：帳篷、一桌兩椅、供電（僅限LED照明使用）"
        extraPower:
          status: unsupported
          value: "不使用"
          evidence: "額外電力：不使用"
          reason: "原文明確記錄電力選擇，但目前沒有獨立電力欄位；應保留為設備／備註候選，不得改寫為費用。"
        operatingStartTime:
          status: not_present
          value: null
          evidence: []
        operatingEndTime:
          status: not_present
          value: null
          evidence: []
    ignoreSpans: []
    warnings:
      - code: missing_location
        message: "目前文字沒有活動地點。"
        evidence: "2021台中燈會市集牛湳販"
      - code: booth_cost_amount_missing
        message: "文字只列出攤位費用所含設備，沒有提供攤位費金額。"
        evidence: "攤位費用包含：帳篷、一桌兩椅、供電（僅限LED照明使用）"
      - code: independent_power_field_unsupported
        message: "額外電力選擇不能自動填入獨立表單欄位。"
        evidence: "額外電力：不使用"
    notes:
      - role: equipment_restriction
        value: "供電僅限LED照明使用"
        evidence: "攤位費用包含：帳篷、一桌兩椅、供電（僅限LED照明使用）"
        reason: "限制條件必須隨供電設備保留。"

  - fixtureId: MTI-REP-0080-P02
    referenceDate: 2021-01-14
    privacyReview:
      status: pass
      evidence:
        - "2021台中燈會市集牛湳販"
        - "攤位型態：一般桌子"
        - "設備包含：帳篷、一桌兩椅、LED照明用電"
      reason: "可見內容為公開活動名稱、行政日期與攤位設備，未見未遮罩的私人資料或付款識別資料。"
    eventDisposition:
      value: single_candidate
      evidence:
        - "2021台中燈會市集牛湳販"
        - "已選參加日期：2021/02/24～2021/02/28"
      reason: "一個具名市集具有一段連續的已選參加日期，行政日期不構成其他事件。"
    draftReadiness:
      value: partial
      evidence:
        - "2021台中燈會市集牛湳販"
        - "已選參加日期：2021/02/24～2021/02/28"
      reason: "活動名稱與日期明確，但 inputText 未提供活動地點。"
    events:
      - eventBlock: 1
        marketName:
          status: exact
          value: "2021台中燈會市集牛湳販"
          evidence: "2021台中燈會市集牛湳販"
        eventDates:
          status: exact
          value:
            - "2021-02-24"
            - "2021-02-25"
            - "2021-02-26"
            - "2021-02-27"
            - "2021-02-28"
          evidence: "已選參加日期：2021/02/24～2021/02/28"
          normalizationNote: "明確的連續起訖日期展開為五個活動日。"
        location:
          status: not_present
          value: null
          evidence: []
        boothType:
          status: exact
          value: "一般桌子"
          evidence: "攤位型態：一般桌子"
        boothCost:
          status: not_present
          value: null
          evidence: []
        equipment:
          status: exact
          value:
            - type: "帳篷"
              provision: included
              quantity: null
            - type: "桌"
              provision: included
              quantity: 1
            - type: "椅"
              provision: included
              quantity: 2
            - type: "供電"
              provision: included
              restriction: "LED照明用電"
          evidence: "設備包含：帳篷、一桌兩椅、LED照明用電"
        operatingStartTime:
          status: not_present
          value: null
          evidence: []
        operatingEndTime:
          status: not_present
          value: null
          evidence: []
    ignoreSpans:
      - role: registration_period
        status: ignore
        normalizedValue:
          start: "2021-01-13"
          end: "2021-01-17"
        evidence: "報名期間：2021/01/13～2021/01/17"
        reason: "這是報名期間，不是活動日期。"
      - role: announcement_date
        status: ignore
        normalizedValue: "2021-01-19"
        evidence: "錄取公告：2021/01/19"
        reason: "這是錄取公告日，不是活動日期。"
      - role: payment_period
        status: ignore
        normalizedValue:
          start: "2021-01-19"
          end: "2021-01-21"
        evidence: "匯款期間：2021/01/19～2021/01/21"
        reason: "這是付款期間，不是活動日期，也不等於攤位費。"
      - role: administrative_announcement_date
        status: ignore
        normalizedValue: "2021-02-17"
        evidence: "攤位地圖公告：2021/02/17"
        reason: "這是攤位地圖公告日，不是活動日期或活動地點。"
    warnings:
      - code: missing_location
        message: "目前文字沒有活動地點。"
        evidence: "2021台中燈會市集牛湳販"
    notes:
      - role: equipment_restriction
        value: "供電限LED照明用電"
        evidence: "設備包含：帳篷、一桌兩椅、LED照明用電"
        reason: "用途限制必須隨供電設備保留。"

  - fixtureId: MTI-REP-0080-P03
    referenceDate: 2021-01-14
    privacyReview:
      status: pass
      evidence:
        - "私人姓名：[PRIVATE_PERSON]"
        - "Email：[EMAIL]"
        - "生日：[PRIVATE_DATE]"
        - "性別：[PRIVATE_ANSWER]"
      reason: "姓名、Email、生日與私人回答均只出現遮罩 token，未暴露實值；其中三個 token 名稱不是指南列出的標準名稱，需在封存前正規化，但不構成目前 fixture 的原始個資洩漏。"
    eventDisposition:
      value: single_candidate
      evidence:
        - "已收到「2021台中燈會市集牛湳販」報名表。"
        - "報名日期：2021/02/24、02/25、02/26、02/27、02/28"
      reason: "文字只指向一個具名市集；行政日期與已遮罩的表單個人欄位不構成其他事件。"
    draftReadiness:
      value: partial
      evidence:
        - "已收到「2021台中燈會市集牛湳販」報名表。"
        - "報名日期：2021/02/24、02/25、02/26、02/27、02/28"
      reason: "可辨識單一事件與一組高度可推定的參與日期，但 inputText 未提供活動地點；此外『報名日期』的日期角色需在預覽揭露。"
    events:
      - eventBlock: 1
        marketName:
          status: exact
          value: "2021台中燈會市集牛湳販"
          evidence: "已收到「2021台中燈會市集牛湳販」報名表。"
        eventDates:
          status: inferable
          value:
            - "2021-02-24"
            - "2021-02-25"
            - "2021-02-26"
            - "2021-02-27"
            - "2021-02-28"
          evidence:
            - "已收到「2021台中燈會市集牛湳販」報名表。"
            - "報名日期：2021/02/24、02/25、02/26、02/27、02/28"
          inferenceSource: "欄位位於已收到的市集報名表中，且列出五個未來連續日期，因此判為所報名的活動日期；但『報名日期』未明寫『參加日期』，不標 exact。"
        location:
          status: not_present
          value: null
          evidence: []
        boothType:
          status: exact
          value: "一般桌子"
          evidence: "攤位型態：一般桌子"
        boothCost:
          status: not_present
          value: null
          evidence: []
        equipment:
          status: exact
          value:
            - type: "帳篷"
              provision: included
              quantity: null
            - type: "桌"
              provision: included
              quantity: 1
            - type: "椅"
              provision: included
              quantity: 2
            - type: "供電"
              provision: included
              restriction: "LED照明用電"
          evidence: "設備：帳篷、一桌兩椅、LED照明用電"
        extraPower:
          status: unsupported
          value: "不使用"
          evidence: "額外電力：不使用"
          reason: "原文明確記錄電力選擇，但目前沒有獨立電力欄位；應保留為設備／備註候選。"
        operatingStartTime:
          status: not_present
          value: null
          evidence: []
        operatingEndTime:
          status: not_present
          value: null
          evidence: []
    ignoreSpans:
      - role: registration_period
        status: ignore
        normalizedValue:
          start: "2021-01-13"
          end: "2021-01-17"
        evidence: "報名期間：2021/01/13～2021/01/17"
        reason: "這是報名期間，不是活動日期。"
      - role: announcement_date
        status: ignore
        normalizedValue: "2021-01-19"
        evidence: "錄取公告：2021/01/19"
        reason: "這是錄取公告日，不是活動日期。"
      - role: payment_period
        status: ignore
        normalizedValue:
          start: "2021-01-19"
          end: "2021-01-21"
        evidence: "匯款期間：2021/01/19～2021/01/21"
        reason: "這是付款期間，不是活動日期，也不等於攤位費。"
      - role: administrative_announcement_date
        status: ignore
        normalizedValue: "2021-02-17"
        evidence: "攤位地圖：2021/02/17"
        reason: "此日期標示攤位地圖資訊，不是活動日期或文字地點。"
      - role: private_profile_field
        status: ignore
        normalizedValue: null
        evidence: "私人姓名：[PRIVATE_PERSON]"
        reason: "私人姓名不是新增市集欄位；只確認遮罩，不保留為事件資料。"
      - role: private_profile_field
        status: ignore
        normalizedValue: null
        evidence: "Email：[EMAIL]"
        reason: "Email 不是新增市集欄位；只確認遮罩，不保留為事件資料。"
      - role: private_profile_field
        status: ignore
        normalizedValue: null
        evidence: "生日：[PRIVATE_DATE]"
        reason: "生日不是活動日期；只確認遮罩，不保留為事件資料。"
      - role: private_profile_field
        status: ignore
        normalizedValue: null
        evidence: "性別：[PRIVATE_ANSWER]"
        reason: "私人表單回答不是新增市集欄位；只確認遮罩，不保留為事件資料。"
    warnings:
      - code: noncanonical_privacy_tokens
        message: "[PRIVATE_PERSON]、[PRIVATE_DATE]、[PRIVATE_ANSWER] 不符合指南指定的標準 token 名稱，應分別正規化為適用的姓名或私人表單答案 token。"
        evidence:
          - "私人姓名：[PRIVATE_PERSON]"
          - "生日：[PRIVATE_DATE]"
          - "性別：[PRIVATE_ANSWER]"
      - code: event_date_role_inferred
        message: "『報名日期』依報名表上下文與多個連續未來日期推定為參與日，預覽時應揭露並讓使用者確認。"
        evidence:
          - "已收到「2021台中燈會市集牛湳販」報名表。"
          - "報名日期：2021/02/24、02/25、02/26、02/27、02/28"
      - code: missing_location
        message: "目前文字沒有活動地點。"
        evidence: "已收到「2021台中燈會市集牛湳販」報名表。"
      - code: independent_power_field_unsupported
        message: "額外電力選擇不能自動填入獨立表單欄位。"
        evidence: "額外電力：不使用"
    notes:
      - role: equipment_restriction
        value: "供電限LED照明用電"
        evidence: "設備：帳篷、一桌兩椅、LED照明用電"
        reason: "用途限制必須隨供電設備保留。"
```

## 統計

```yaml
fixtureCount: 5
privacyReview:
  pass: 5
  fail: 0
eventDisposition:
  single_candidate: 5
  event_selection_required: 0
  insufficient: 0
  reject: 0
draftReadiness:
  reviewable_core: 1
  partial: 4
  blocked: 0
```

## 規範歧義

1. `MTI-REP-0078-P01` 的「3/27：大帳篷／3/28：小攤車」明確保留逐日綁定，但指南未定義逐日不同攤位型態的正式欄位。本文將其標為 `unsupported` 的 `perDateBoothAssignment`，不拆成兩個事件，也不壓成單一攤位值；證據為「3/27：大帳篷」與「3/28：小攤車」。
2. `MTI-REP-0080-P03` 的「報名日期」未明寫「參加日期」。因它位於已收到的具名市集報名表中且列出五個連續未來日期，本文將其標為 `inferable` 的活動日期並要求預覽揭露，而非 `exact`；證據為「已收到『2021台中燈會市集牛湳販』報名表。」與「報名日期：2021/02/24、02/25、02/26、02/27、02/28」。
3. `MTI-REP-0080-P03` 使用 `[PRIVATE_PERSON]`、`[PRIVATE_DATE]`、`[PRIVATE_ANSWER]`，不同於指南明列的 `[PERSON_NAME]` 與 `[PRIVATE_FORM_ANSWER]`。目前值已被 token 化，所以 privacy 判為 pass，但另列正規化警告；證據為相應三個私人欄位行。

## 完整性自檢

- [x] 5／5 fixtures 均有唯一且與補審包一致的 `fixtureId`。
- [x] 5／5 fixtures 均完成 `privacyReview`、`eventDisposition`、`draftReadiness`、`events`、`ignoreSpans`、`warnings` 與 `notes`。
- [x] 所有非空答案、警告與備註均附目前 `inputText` 中的 evidence；`not_present` 使用 `null` 與空 evidence。
- [x] 所有 `unsupported` 與 `ignore` 均附理由；本批沒有 `choice_required` 或 `conflict` 判定。
- [x] privacy fail 為 0；沒有需要在 privacy 後停止欄位判讀的 fixture。
- [x] Markdown YAML fences 已成對閉合。
- [x] 已檢查敏感資料模式；未保存未遮罩的姓名、Email、生日、聯絡方式、帳戶、私人地址或識別碼。
- [x] 未查看 Reviewer C 或任何其他禁讀資料。
- [x] 未開始產品實作，亦未修改任何既有文件。
