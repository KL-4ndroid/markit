# 市集文字匯入 Paste Fixture Blind Review Result C Round B v1

- Reviewer：Reviewer C
- 複核日期：2026-09-15
- 複核範圍：Round B 30 個 paste fixtures
- 隔離聲明：本次為獨立盲審；Reviewer C 僅讀取 Round B Blind Reviewer Guide 與 Round B Blind Review Pack，未查看或搜尋 Round B answer key、Annotation Pass 1、Discovery Record、Corpus Curation、Round A calibration／review result／adjudication、Gmail／郵件、git 狀態或差異、其他 agent 訊息或答案，也未沿文件提及的連結開啟其他資料。
- 判定原則：只使用各 fixture 的 referenceDate 與 inputText；日期、時間、金額先標語意角色；所有需選擇、衝突、不支援與忽略判定均保留原因。

## 30 筆結構化結果

~~~yaml
fixtureId: MTI-REP-0061-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: reject
eventDispositionBasis:
  reason: 明確描述百貨快閃櫃而非單次實體市集，不應建立市集事件。
  evidence: '目前規劃設置快閃櫃'
draftReadiness: blocked
draftReadinessBasis:
  reason: 非市集內容。
  evidence: '快閃櫃'
events: []
ignoreSpans:
  - role: non_market_pop_up_details
    status: ignore
    evidence: '期間約 2～3 個月'
    reason: 快閃櫃檔期不是市集 event date。
  - role: non_market_power_question
    status: ignore
    evidence: '請問供電需要多少電力？'
    reason: 快閃櫃設備問題不能建立市集草稿。
warnings:
  - warning: 輸入雖有位置與期間，但事件類型不在單次市集草稿範圍。
    evidence: '設置快閃櫃'
notes: []
---
fixtureId: MTI-REP-0062-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: reject
eventDispositionBasis:
  reason: 內容是品牌徵選計畫，僅表示未來可能媒合市集，沒有實際市集事件。
  evidence: '品牌徵選'
draftReadiness: blocked
draftReadinessBasis:
  reason: 非特定市集發生事件。
  evidence: '將有機會參與台灣文博會及縣內外市集活動'
events: []
ignoreSpans:
  - role: registration_deadline
    status: ignore
    value: '2023-04-28T17:00'
    evidence: '徵選時間｜即日起至2023/04/28 17:00止'
    reason: 徵選截止日時，不是市集日期或營業時間。
  - role: external_program_link
    status: ignore
    evidence: '[PROGRAM_URL]'
    reason: 外部簡章連結不是新增市集欄位，且不解析連結內容。
warnings:
  - warning: 不可把「可能參與市集」解讀為已存在的市集場次。
    evidence: '將有機會參與'
notes: []
---
fixtureId: MTI-REP-0063-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 錄取語意明確指向一個具名市集。
  evidence: '恭喜錄取「Uber Eats｜大港開唱 feat. 出外人－港邊市集」'
draftReadiness: partial
draftReadinessBasis:
  reason: 缺少活動日期與地點。
  evidence: '港邊市集'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 'Uber Eats｜大港開唱 feat. 出外人－港邊市集'
      evidence: '「Uber Eats｜大港開唱 feat. 出外人－港邊市集」'
    eventDates:
      status: not_present
      value: []
      evidence: []
    location:
      status: not_present
      value: null
      evidence: null
    times: []
    costs: []
    equipment:
      - type: booth_space
        status: exact
        provision: included
        value: '3m × 1.5m 淨地'
        evidence: '3m × 1.5m 淨地'
      - type: parasol
        status: exact
        provision: included
        quantity: 1
        evidence: '陽傘 1 座'
      - type: table
        status: exact
        provision: included
        quantity: 1
        evidence: '長桌 1 張'
      - type: chair
        status: exact
        provision: included
        quantity: 2
        evidence: 'PE 椅 2 張'
      - type: booth_sign
        status: exact
        provision: included
        quantity: 1
        evidence: '攤位招牌'
      - type: electricity
        status: exact
        provision: self_supplied_with_restrictions
        evidence: '電力自備，僅能使用非柴油式發電機或戶外移動式行動電源'
ignoreSpans: []
warnings:
  - warning: 名稱可辨識，但日期與地點不可由錄取通知外推。
    evidence: '恭喜錄取'
notes:
  - note: 已錄取攤位規格為 C. 風格桌攤。
    evidence: '【C. 風格桌攤】'
---
fixtureId: MTI-REP-0063-P02
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 錄取語意明確指向一個具名市集。
  evidence: '恭喜錄取「Uber Eats｜大港開唱 feat. 出外人－港邊市集」'
draftReadiness: partial
draftReadinessBasis:
  reason: 雖有名稱、費用與雙日語意，仍沒有實際活動日期及地點。
  evidence: '此為雙日費用'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 'Uber Eats｜大港開唱 feat. 出外人－港邊市集'
      evidence: '「Uber Eats｜大港開唱 feat. 出外人－港邊市集」'
    eventDates:
      status: not_present
      value: []
      evidence: []
    location:
      status: not_present
      value: null
      evidence: null
    times: []
    costs:
      - role: selected_booth_cost
        status: exact
        amount: 2500
        currency: null
        unit: total_for_two_days
        evidence: '攤位費｜2,500元'
      - role: deposit
        status: exact
        amount: 1250
        currency: null
        evidence: '保證金｜1,250元'
      - role: payment_total
        status: ignore
        amount: 3750
        currency: null
        unit: total_for_two_days
        evidence: '應繳金額｜3,750元（此為雙日費用）'
        reason: 應繳總額含攤位費與保證金，不可覆寫 boothCost。
    equipment:
      - type: parasol
        status: exact
        provision: included
        quantity: 1
        evidence: '陽傘 1 座'
      - type: table
        status: exact
        provision: included
        quantity: 1
        evidence: '長桌 1 張'
      - type: chair
        status: exact
        provision: included
        quantity: 2
        evidence: 'PE 椅 2 張'
      - type: booth_sign
        status: exact
        provision: included
        quantity: 1
        evidence: '攤位招牌'
ignoreSpans:
  - role: payment_deadline
    status: ignore
    value: '2023-03-15'
    evidence: '請於2023/03/15前完成匯款'
    reason: 繳費截止日不是活動日期。
  - role: confirmation_deadline
    status: ignore
    value: '2023-03-13'
    evidence: '於2023/03/13前回覆用電及特殊需求'
    reason: 回覆期限不是活動日期。
warnings:
  - warning: 「元」未附明確幣別，且目前文字不足以安全推定幣別。
    evidence: '2,500元'
  - warning: 雙日費用不提供兩個實際活動日期。
    evidence: '此為雙日費用'
notes:
  - note: 已錄取攤位規格為 C. 風格桌攤。
    evidence: '【C. 風格桌攤】'
---
fixtureId: MTI-REP-0064-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 錄取語意明確指向一個具名市集。
  evidence: '錄取「總爺迎春市集」'
draftReadiness: partial
draftReadinessBasis:
  reason: 缺少活動日期與地點；兩個期限不能當作活動日期。
  evidence: '活動當週將另行通知行前準備與入場動線'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 總爺迎春市集
      evidence: '「總爺迎春市集」'
    eventDates:
      status: not_present
      value: []
      evidence: []
    location:
      status: not_present
      value: null
      evidence: null
    times: []
    costs: []
    equipment: []
ignoreSpans:
  - role: confirmation_deadline
    status: ignore
    value: '2022-12-30'
    normalization: inferable_from_reference_date
    evidence: '12/30前主動告知'
    reason: 無法出席的回覆期限不是活動日期。
  - role: payment_deadline
    status: ignore
    value: '2022-12-31'
    normalization: inferable_from_reference_date
    evidence: '12/31前完成市集參加費用匯款'
    reason: 繳費截止日不是活動日期。
warnings:
  - warning: 不可把 12/30 或 12/31 自動填成活動日期。
    evidence: '前完成市集參加費用匯款'
notes:
  - note: 「蛙抵市集」是報名脈絡文字；明確錄取的顯示名稱是「總爺迎春市集」。
    evidence: '報名蛙抵市集，也通知您錄取「總爺迎春市集」'
---
fixtureId: MTI-REP-0065-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: insufficient
eventDispositionBasis:
  reason: 只有出席日期異動片段，沒有名稱或地點可綁定為可辨識事件。
  evidence: '已更正為單日出席'
draftReadiness: blocked
draftReadinessBasis:
  reason: 日期候選無法連結至特定市集。
  evidence: '只保留12/18一天嗎？'
events: []
ignoreSpans: []
warnings:
  - warning: 12/18 與 12/24～12/25 只能視為未綁定的出席異動，不可建立草稿。
    evidence: '12/24～12/25請假，請問可以只保留12/18一天嗎？'
notes: []
---
fixtureId: MTI-REP-0065-P02
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 一個具名市集，且文字明確指出更正後保留的單日場次。
  evidence: '已更正為單日出席，保留12/18一天'
draftReadiness: partial
draftReadinessBasis:
  reason: 日期可唯一推定，但地點依品牌攤型配置而未確定。
  evidence: '衛武營北廣場及南廣場，依品牌攤型配置'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: '衛武營黃昏市集｜耶誕搖擺嘉年華'
      evidence: '衛武營黃昏市集｜耶誕搖擺嘉年華'
    eventDates:
      status: inferable
      value:
        - '2022-12-18'
      evidence:
        - role: event_date
          span: '保留12/18一天'
      inferenceBasis: referenceDate 2022-11-11 與同文 12 月場次
    location:
      status: choice_required
      value: null
      options:
        - 衛武營北廣場
        - 衛武營南廣場
      evidence: '衛武營北廣場及南廣場，依品牌攤型配置'
      reason: 場地與未提供的品牌攤型綁定，不能選第一個地點。
    times:
      - role: operation_start
        status: exact
        value: '15:00'
        evidence: '市集時間：15:00～20:00'
      - role: operation_end
        status: exact
        value: '20:00'
        evidence: '市集時間：15:00～20:00'
    costs: []
    equipment: []
ignoreSpans:
  - role: superseded_event_dates
    status: ignore
    evidence: '原錄取場次：12/17～12/18、12/24～12/25'
    reason: 已被「保留12/18一天」明確更正，不能加入現行 eventDates。
  - role: unselected_leave_dates
    status: ignore
    evidence: '12/24～12/25請假'
    reason: 請假日期不是保留的活動日期。
  - role: superseded_cost_description
    status: ignore
    evidence: '原費用明細為四日攤位費加保證金'
    reason: 原四日費用已不符合更正後單日出席，且沒有可用金額。
warnings:
  - warning: 地點須先依品牌攤型選擇。
    evidence: '依品牌攤型配置'
notes:
  - note: 連報週數有折扣，但目前沒有數值，不能計算。
    evidence: '連報週數另有折扣'
---
fixtureId: MTI-REP-0066-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 名稱與地點指向同一活動，但日期欄位互相矛盾。
  evidence: '2022幸福台南市府點燈活動'
draftReadiness: blocked
draftReadinessBasis:
  reason: 核心活動日期同時出現 2022 與 2021，且 2021 日期的星期亦不相符。
  evidence:
    - '活動日期調整成2022/12/10（六）'
    - '時間｜2021.12.10（六）14:00～20:30'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 2022幸福台南市府點燈活動
      evidence: '2022幸福台南市府點燈活動'
    eventDates:
      status: conflict
      value:
        - '2022-12-10'
        - '2021-12-10'
      evidence:
        - role: event_date
          span: '活動日期調整成2022/12/10（六）'
        - role: event_date
          span: '2021.12.10（六）'
      reason: 同一活動的兩個明確年份互相矛盾；不可自行把舊行視為筆誤或覆寫。
    location:
      status: exact
      value: 台南市府民治中心廣場
      evidence: '地點｜台南市府民治中心廣場'
    times:
      - role: operation_start
        status: exact
        value: '14:00'
        evidence: '14:00～20:30'
      - role: operation_end
        status: exact
        value: '20:30'
        evidence: '14:00～20:30'
    costs: []
    equipment: []
ignoreSpans: []
warnings:
  - warning: 2021-12-10 並非星期六，形成額外日期／星期衝突。
    evidence: '2021.12.10（六）'
  - warning: 在日期衝突解決前，雖可辨識時間與地點，仍不可形成 reviewable core。
    evidence: '請注意活動日期與原報名表單不同'
notes: []
---
fixtureId: MTI-REP-0066-P02
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 一個具名活動，但日期互相矛盾。
  evidence: '2022幸福台南市府點燈活動'
draftReadiness: blocked
draftReadinessBasis:
  reason: 核心日期衝突，且攤位費須依攤型選擇。
  evidence:
    - '2022/12/10（六）'
    - '2021.12.10（六）'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 2022幸福台南市府點燈活動
      evidence: '2022幸福台南市府點燈活動'
    eventDates:
      status: conflict
      value:
        - '2022-12-10'
        - '2021-12-10'
      evidence:
        - role: event_date
          span: '活動日期調整成2022/12/10（六）'
        - role: event_date
          span: '時間｜2021.12.10（六）'
      reason: 同一活動出現互斥年份，且不得自行修正文內值。
    location:
      status: exact
      value: 台南市府民治中心廣場
      evidence: '地點｜台南市府民治中心廣場'
    times:
      - role: operation_start
        status: exact
        value: '14:00'
        evidence: '14:00～20:30'
      - role: operation_end
        status: exact
        value: '20:30'
        evidence: '14:00～20:30'
    costs:
      - role: booth_option
        status: choice_required
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台南市府民治中心廣場'
        options:
          - label: 一般攤
            amount: 450
            evidence: '一般攤450元'
          - label: 行動餐車
            amount: 800
            evidence: '行動餐車800元'
        evidence: '攤位費：一般攤450元，行動餐車800元'
        reason: 兩種合法攤型價格，未指出已選攤型。
      - role: equipment_unit_price
        status: exact
        equipmentType: table
        amount: 200
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台南市府民治中心廣場'
        unit: per_order
        evidence: '加訂桌子200元'
      - role: equipment_unit_price
        status: exact
        equipmentType: parasol
        amount: 300
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台南市府民治中心廣場'
        unit: per_order
        evidence: '傘300元'
      - role: power_option
        status: unsupported
        amount: 100
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台南市府民治中心廣場'
        evidence: '電100元'
        reason: 目前新增表單沒有獨立電力費欄位。
    equipment:
      - type: electricity
        status: exact
        provision: limited_site_supply_or_self_supplied_generator
        evidence: '場地供電量有限，也允許自備發電機'
ignoreSpans:
  - role: payment_deadline
    status: ignore
    value: '2022-11-06'
    normalization: inferable_from_reference_date
    evidence: '匯款期限：11/6前完成'
    reason: 匯款期限不是活動日期。
  - role: reconciliation_date
    status: ignore
    value: '2022-11-07'
    normalization: inferable_from_reference_date
    evidence: '11/7進行對帳'
    reason: 對帳日期不是活動日期。
warnings:
  - warning: 日期年份與星期衝突，必須人工確認。
    evidence: '2021.12.10（六）'
  - warning: 攤位費不可任選一般攤或行動餐車。
    evidence: '一般攤450元，行動餐車800元'
notes:
  - note: 電力供應有限且可自備發電機，應保留為用電規則。
    evidence: '場地供電量有限，也允許自備發電機'
---
fixtureId: MTI-REP-0067-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 一個具名跨年市集，日期連續且屬同一場活動。
  evidence: '高雄駁二大義倉庫｜跨年搖擺嘉年華'
draftReadiness: partial
draftReadinessBasis:
  reason: 地點與攤型綁定而未選定；每日營業時間不同，單一時間欄位無法完整表達。
  evidence:
    - '文創'
    - '美食'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: '高雄駁二大義倉庫｜跨年搖擺嘉年華'
      evidence: '高雄駁二大義倉庫｜跨年搖擺嘉年華'
    eventDates:
      status: exact
      value:
        - '2022-12-31'
        - '2023-01-01'
        - '2023-01-02'
      evidence:
        - role: event_date
          span: '2022/12/31（六）～2023/01/02（一）'
    location:
      status: choice_required
      value: null
      options:
        - label: 文創
          value: 駁二大義倉庫前紅磚道
          evidence: '駁二大義倉庫前紅磚道（文創）'
        - label: 美食
          value: 大義廊道輕軌橋下
          evidence: '大義廊道輕軌橋下（美食）'
      evidence: '地點：駁二大義倉庫前紅磚道（文創）、大義廊道輕軌橋下（美食）'
      reason: 場地與未選定的文創／美食攤型綁定。
    times:
      - role: operation_hours_by_date
        status: unsupported
        value:
          - dateScope: '2022-12-31'
            start: '14:00'
            end: '00:30'
            crossesMidnight: true
            evidence: '12/31 14:00～00:30'
          - dateScope: '2023-01-01..2023-01-02'
            start: '14:00'
            end: '20:00'
            crossesMidnight: false
            evidence: '1/1～1/2 14:00～20:00'
        evidence: '時間：12/31 14:00～00:30；1/1～1/2 14:00～20:00'
        reason: 不同日期有不同營業時間，現有單一時間欄位無法無損表達。
    costs:
      - role: booth_option
        status: choice_required
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '高雄駁二大義倉庫'
        options:
          - label: 一般文創
            amount: 800
            unit: per_day
            boothSize: '3m × 1.5m'
            includedEquipment: 一傘
            evidence: '一般文創：3m × 1.5m，800元／日，提供一傘'
          - label: 餐飲桌攤或二、三輪餐車
            amount: 1200
            unit: per_day
            boothSize: '3m × 2m'
            includedEquipment: 一傘
            evidence: '餐飲桌攤或二、三輪餐車：3m × 2m，1,200元／日，提供一傘'
          - label: 四輪以上餐車
            amount: 1500
            unit: per_day
            boothSize: '5m × 3m'
            includedEquipment: 一傘
            evidence: '四輪以上餐車：5m × 3m，1,500元／日，提供一傘'
        evidence: '一般文創：3m × 1.5m，800元／日'
        reason: 三種合法攤型方案，未指出已選方案，且費用、尺寸、地點與設備需綁定保存。
    equipment:
      - type: parasol
        status: exact
        provision: included_per_booth_option
        quantity: 1
        evidence: '提供一傘'
ignoreSpans: []
warnings:
  - warning: 必須選擇攤型後才能確定地點與攤位費。
    evidence: '一般文創'
  - warning: 12/31 的結束時間跨午夜。
    evidence: '12/31 14:00～00:30'
notes: []
---
fixtureId: MTI-REP-0067-P02
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 具名市集與三個已勾選日期屬同一活動。
  evidence: '報名參與日期'
draftReadiness: partial
draftReadinessBasis:
  reason: 已選日期明確，但攤位種類文字列出多類且未能唯一綁定地點。
  evidence: '品牌攤位種類：一般文創／美食桌攤／餐車'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: '高雄駁二大義倉庫｜跨年搖擺嘉年華'
      evidence: '高雄駁二大義倉庫｜跨年搖擺嘉年華'
    eventDates:
      status: exact
      value:
        - '2022-12-31'
        - '2023-01-01'
        - '2023-01-02'
      evidence:
        - role: event_date
          span: '✓ 2022/12/31'
        - role: event_date
          span: '✓ 2023/01/01'
        - role: event_date
          span: '✓ 2023/01/02'
    location:
      status: choice_required
      value: null
      options:
        - label: 一般文創
          value: 駁二大義倉庫前紅磚道
          evidence: '文創攤位在駁二大義倉庫前紅磚道'
        - label: 美食
          value: 大義廊道輕軌橋下
          evidence: '美食攤位在大義廊道輕軌橋下'
      evidence: '文創攤位在駁二大義倉庫前紅磚道；美食攤位在大義廊道輕軌橋下'
      reason: 場地依攤位種類分流，而攤位種類未唯一選定。
    times:
      - role: operation_hours_by_date
        status: unsupported
        value:
          - dateScope: '2022-12-31'
            start: '14:00'
            end: '00:30'
            crossesMidnight: true
            evidence: '12/31 14:00～00:30'
          - dateScope: '2023-01-01..2023-01-02'
            start: '14:00'
            end: '20:00'
            crossesMidnight: false
            evidence: '1/1～1/2 14:00～20:00'
        evidence: '時間：12/31 14:00～00:30；1/1～1/2 14:00～20:00'
        reason: 每日不同營業時間無法壓成單一開始／結束時間。
    costs:
      - role: equipment_unit_price
        status: exact
        equipmentType: table
        amount: 250
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '高雄駁二大義倉庫'
        unit: per_rental
        evidence: '桌子250元／次'
      - role: equipment_unit_price
        status: exact
        equipmentType: chair
        amount: 10
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '高雄駁二大義倉庫'
        unit: per_day
        evidence: '椅子10元／天'
      - role: equipment_unit_price
        status: exact
        equipmentType: tablecloth
        amount: 100
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '高雄駁二大義倉庫'
        unit: per_rental
        evidence: '桌巾100元／次'
      - role: equipment_unit_price
        status: exact
        equipmentType: rechargeable_light
        amount: 200
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '高雄駁二大義倉庫'
        unit: per_rental
        evidence: '充電燈具200元／次'
    equipment:
      - type: rental_options
        status: exact
        provision: optional_rental
        value:
          - table
          - chair
          - tablecloth
          - rechargeable_light
        evidence: '桌子250元／次、椅子10元／天、桌巾100元／次、充電燈具200元／次'
ignoreSpans:
  - role: redacted_private_answers
    status: ignore
    evidence:
      - '[PRIVATE_BRAND]'
      - '[PRIVATE_ANSWER]'
      - '[PRIVATE_VEHICLE]'
    reason: 這些是去識別化私人欄位占位符，不可進入公開市集草稿。
warnings:
  - warning: 未明示唯一攤位種類，因此不可自行決定文創或美食地點。
    evidence: '一般文創／美食桌攤／餐車'
notes: []
---
fixtureId: MTI-REP-0068-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 名稱、日期、時間與地點皆指向單一市集。
  evidence: '2022創意台中 x 綠光小市－藝植｜在這生活'
draftReadiness: reviewable_core
draftReadinessBasis:
  reason: 單一名稱、明確活動日期與唯一地點均存在，核心欄位無衝突。
  evidence:
    - '市集日期：2022/10/29（六）、2022/10/30（日）'
    - '市集地點：台中綠空鐵道1908'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: '2022創意台中 x 綠光小市－藝植｜在這生活'
      evidence: '2022創意台中 x 綠光小市－藝植｜在這生活'
    eventDates:
      status: exact
      value:
        - '2022-10-29'
        - '2022-10-30'
      evidence:
        - role: event_date
          span: '2022/10/29（六）'
        - role: event_date
          span: '2022/10/30（日）'
    location:
      status: exact
      value: 台中綠空鐵道1908（近台中舊車站）
      evidence: '市集地點：台中綠空鐵道1908（近台中舊車站）'
    times:
      - role: operation_start
        status: exact
        value: '11:00'
        evidence: '市集時間：11:00～18:00'
      - role: operation_end
        status: exact
        value: '18:00'
        evidence: '市集時間：11:00～18:00'
    costs: []
    equipment: []
ignoreSpans:
  - role: registration_deadline
    status: ignore
    value: '2022-09-30T17:00'
    normalization: inferable_from_reference_date
    evidence: '報名日期：即日起至9/30 17:00截止'
    reason: 報名截止日期與時間不是活動日期或營業時間。
  - role: announcement_date
    status: ignore
    value: '2022-10-03'
    normalization: inferable_from_reference_date
    evidence: '10/3公告錄取名單'
    reason: 錄取公告日不是活動日期。
warnings: []
notes: []
---
fixtureId: MTI-REP-0069-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 單一具名市集且本次錄取日明確。
  evidence: '本次錄取參加日：2022/09/11（日）'
draftReadiness: partial
draftReadinessBasis:
  reason: 地點依是否為四輪以上餐車而不同，輸入沒有攤型答案。
  evidence: '榕樹廣場南側；四輪以上餐車使用南廣場'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: '衛武營黃昏市集｜聲情並茂戲劇課'
      evidence: '衛武營黃昏市集｜聲情並茂戲劇課'
    eventDates:
      status: exact
      value:
        - '2022-09-11'
      evidence:
        - role: event_date
          span: '本次錄取參加日：2022/09/11（日）'
    location:
      status: choice_required
      value: null
      options:
        - label: 非四輪以上餐車
          value: 榕樹廣場南側
          evidence: '地點：榕樹廣場南側'
        - label: 四輪以上餐車
          value: 南廣場
          evidence: '四輪以上餐車使用南廣場'
      evidence: '地點：榕樹廣場南側；四輪以上餐車使用南廣場'
      reason: 地點條件與未提供的車輛／攤型資訊綁定。
    times:
      - role: operation_start
        status: exact
        value: '15:00'
        evidence: '市集時間：15:00～20:00'
      - role: operation_end
        status: exact
        value: '20:00'
        evidence: '市集時間：15:00～20:00'
      - role: vendor_check_in
        status: unsupported
        value:
          start: '14:00'
          end: '14:30'
        evidence: '報到時間：14:00～14:30'
        reason: 報到時間窗不能壓成現有單一 checkInTime。
    costs: []
    equipment: []
ignoreSpans: []
warnings:
  - warning: 需先確認攤型才能選定活動地點。
    evidence: '四輪以上餐車使用南廣場'
  - warning: 報到時間為區間，不能擅自選起點或終點。
    evidence: '14:00～14:30'
notes: []
---
fixtureId: MTI-REP-0069-P02
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 單一具名市集，本次錄取參加日可與整體場次區分。
  evidence: '本次錄取參加日：2022/09/11'
draftReadiness: partial
draftReadinessBasis:
  reason: 本次日期明確，但地點仍依攤型而異。
  evidence: '四輪以上餐車使用南廣場'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: '衛武營黃昏市集｜聲情並茂戲劇課'
      evidence: '衛武營黃昏市集｜聲情並茂戲劇課'
    eventDates:
      status: exact
      value:
        - '2022-09-11'
      evidence:
        - role: event_date
          span: '本次錄取參加日：2022/09/11'
    location:
      status: choice_required
      value: null
      options:
        - label: 非四輪以上餐車
          value: 榕樹廣場南側
          evidence: '地點：榕樹廣場南側'
        - label: 四輪以上餐車
          value: 南廣場
          evidence: '四輪以上餐車使用南廣場'
      evidence: '地點：榕樹廣場南側；四輪以上餐車使用南廣場'
      reason: 未明示攤型，不能在兩個條件地點中代選。
    times:
      - role: operation_start
        status: exact
        value: '15:00'
        evidence: '市集時間：15:00～20:00'
      - role: operation_end
        status: exact
        value: '20:00'
        evidence: '市集時間：15:00～20:00'
    costs:
      - role: booth_option
        status: exact
        label: 一般文創品牌
        amount: 1200
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '衛武營'
        unit: per_day
        selected: false
        evidence: '一般文創品牌：1,200元／日'
      - role: deposit
        status: exact
        amount: 1000
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '衛武營'
        evidence: '保證金：1,000元'
      - role: payment_total
        status: ignore
        amount: 2200
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '衛武營'
        evidence: '本次應繳總額：2,200元'
        reason: 應繳總額含攤位費與保證金，不可當成 boothCost。
    equipment:
      - type: bundled_set
        status: exact
        provision: included
        value: 一傘、一桌、兩椅、桌套、攤位招牌及陳列物
        evidence: '主辦提供一傘、一桌、兩椅、桌套、攤位招牌及陳列物'
ignoreSpans:
  - role: overall_event_dates
    status: ignore
    value:
      - '2022-09-09'
      - '2022-09-10'
      - '2022-09-11'
    evidence: '活動整體場次：2022/09/09～2022/09/11'
    reason: 文字另有更精確的「本次錄取參加日」，整體場次不能全部填入使用者草稿。
warnings:
  - warning: 一般文創費率是公開方案，但文字未明示使用者攤型，不能據此選定地點。
    evidence: '一般文創品牌：1,200元／日'
notes: []
---
fixtureId: MTI-REP-0070-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: insufficient
eventDispositionBasis:
  reason: 這是發票資訊提醒；雖有活動名稱，但沒有活動日期或地點可形成發生事件。
  evidence: '活動報名費用開立發票'
draftReadiness: blocked
draftReadinessBasis:
  reason: 僅能辨識名稱與發票處理規則。
  evidence: '請於8/15前填寫發票寄送資訊'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 2022第一屆海安餐酒節
      evidence: '2022第一屆海安餐酒節'
    eventDates:
      status: not_present
      value: []
      evidence: []
    location:
      status: not_present
      value: null
      evidence: null
    times: []
    costs: []
    equipment: []
ignoreSpans:
  - role: invoice_information_deadline
    status: ignore
    value: '2022-08-15'
    normalization: inferable_from_reference_date
    evidence: '請於8/15前填寫發票寄送資訊'
    reason: 發票寄送資料截止日不是活動日期。
  - role: invoice_scope
    status: ignore
    evidence: '發票僅開立攤位費用'
    reason: 發票開立範圍不是攤位費金額，也不能產生 boothCost。
warnings:
  - warning: 不可從發票標題推定活動日期、地點或費用。
    evidence: '活動報名費用開立發票'
notes:
  - note: 發票不含設備租賃、押金、超額電費及代租費用。
    evidence: '不含設備租賃、押金、超額電費及代租費用'
---
fixtureId: MTI-REP-0071-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 名稱、活動期間、營業時間與單一地點皆明確。
  evidence: '鵝立頭 A Little Party 婦幼主題市集'
draftReadiness: reviewable_core
draftReadinessBasis:
  reason: 核心名稱、日期與地點完整且沒有衝突。
  evidence:
    - '活動日期：2022/09/16～2022/09/19'
    - '活動地點：大台南會展中心'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 鵝立頭 A Little Party 婦幼主題市集
      evidence: '鵝立頭 A Little Party 婦幼主題市集'
    eventDates:
      status: exact
      value:
        - '2022-09-16'
        - '2022-09-17'
        - '2022-09-18'
        - '2022-09-19'
      evidence:
        - role: event_date
          span: '活動日期：2022/09/16～2022/09/19'
    location:
      status: exact
      value: 大台南會展中心
      evidence: '活動地點：大台南會展中心'
    times:
      - role: operation_start
        status: exact
        value: '10:00'
        evidence: '活動時間：10:00～18:00'
      - role: operation_end
        status: exact
        value: '18:00'
        evidence: '活動時間：10:00～18:00'
    costs:
      - role: booth_option
        status: exact
        amount: 8000
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '大台南會展中心'
        unit: per_four_day_event
        evidence: '攤位租金：8,000元／檔（4天）'
    equipment:
      - type: bundled_set
        status: exact
        provision: included
        quantity: 1
        value: 基本餐桌、展櫃、招牌、椅子一組
        evidence: '設備：基本餐桌、展櫃、招牌、椅子一組'
ignoreSpans: []
warnings: []
notes: []
---
fixtureId: MTI-REP-0072-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 一個具名市集，四個不連續日期屬同名同地點場次。
  evidence: '綠光小市'
draftReadiness: reviewable_core
draftReadinessBasis:
  reason: 名稱、四個明確日期與唯一地點完整且無核心衝突。
  evidence:
    - '市集日期：2022/08/13、08/14、08/27、08/28'
    - '綠光計畫及范特喜九號店花園廣場'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 綠光小市
      evidence: '綠光小市'
    eventDates:
      status: exact
      value:
        - '2022-08-13'
        - '2022-08-14'
        - '2022-08-27'
        - '2022-08-28'
      evidence:
        - role: event_date
          span: '2022/08/13、08/14、08/27、08/28'
    location:
      status: exact
      value: 台中市西區中興一巷19號，綠光計畫及范特喜九號店花園廣場
      evidence: '市集地點：台中市西區中興一巷19號，綠光計畫及范特喜九號店花園廣場'
    times:
      - role: operation_start
        status: exact
        value: '13:00'
        evidence: '市集時間：13:00～19:00'
      - role: operation_end
        status: exact
        value: '19:00'
        evidence: '市集時間：13:00～19:00'
      - role: vendor_check_in
        status: unsupported
        value:
          start: '13:00'
          end: '13:30'
        evidence: '報到時間：13:00開始，13:30結束'
        reason: 報到時間窗不可壓成單一 checkInTime。
    costs: []
    equipment: []
ignoreSpans:
  - role: registration_deadline
    status: ignore
    value: '2022-08-01'
    normalization: inferable_from_minguo_calendar
    evidence: '招募日期：即日起至111年8月1日'
    reason: 民國年可轉換，但招募截止日仍不是活動日期。
warnings:
  - warning: 報到時間為時間窗，需保留完整區間。
    evidence: '13:00開始，13:30結束'
notes:
  - note: 14:00 前無故未報到會釋出攤位，屬出席規則。
    evidence: '14:00前無故未報到將釋出攤位'
---
fixtureId: MTI-REP-0073-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 一個具名市集，日期與地點唯一。
  evidence: '小人類 x 手作職人市集'
draftReadiness: reviewable_core
draftReadinessBasis:
  reason: 缺年日期可由 referenceDate 唯一補為 2021 年，名稱與地點明確。
  evidence:
    - '05/29～05/30'
    - '地點：駁二大義倉庫'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 小人類 x 手作職人市集
      evidence: '小人類 x 手作職人市集'
    eventDates:
      status: inferable
      value:
        - '2021-05-29'
        - '2021-05-30'
      evidence:
        - role: event_date
          span: '05/29～05/30'
      inferenceBasis: referenceDate 2021-05-11
    location:
      status: exact
      value: 駁二大義倉庫
      evidence: '地點：駁二大義倉庫'
    times: []
    costs: []
    equipment: []
ignoreSpans:
  - role: registration_link
    status: ignore
    evidence: '[REGISTRATION_URL]'
    reason: 報名連結不是新增市集欄位，且不解析連結內容。
warnings:
  - warning: 年份是依 referenceDate 推定，預覽時應顯示推定來源。
    evidence: '05/29～05/30'
notes: []
---
fixtureId: MTI-REP-0073-P02
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: event_selection_required
eventDispositionBasis:
  reason: 輸入至少有兩個不可合併的具名市集；同名同地點的前兩段可合併為不連續場次，第三段名稱與地點不同。
  evidence:
    - '小人類 x 伴手．禮市集'
    - '小人類 x 手作職人市集'
draftReadiness: blocked
draftReadinessBasis:
  reason: 使用者必須先在兩個事件區塊中選擇。
  evidence:
    - '高雄左營新光三越彩虹市集－夢想廣場'
    - '駁二大義倉庫'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 小人類 x 伴手．禮市集
      evidence: '小人類 x 伴手．禮市集'
    eventDates:
      status: inferable
      value:
        - '2021-05-14'
        - '2021-05-15'
        - '2021-05-16'
        - '2021-05-21'
        - '2021-05-22'
        - '2021-05-23'
      evidence:
        - role: event_date
          span: '05/14～05/16'
        - role: event_date
          span: '05/21～05/23'
      inferenceBasis: referenceDate 2021-05-11
    location:
      status: exact
      value: 高雄左營新光三越彩虹市集－夢想廣場
      evidence: '高雄左營新光三越彩虹市集－夢想廣場'
    times: []
    costs: []
    equipment: []
  - eventBlock: 2
    marketName:
      status: exact
      value: 小人類 x 手作職人市集
      evidence: '小人類 x 手作職人市集'
    eventDates:
      status: inferable
      value:
        - '2021-05-29'
        - '2021-05-30'
      evidence:
        - role: event_date
          span: '05/29～05/30'
      inferenceBasis: referenceDate 2021-05-11
    location:
      status: exact
      value: 駁二大義倉庫
      evidence: '駁二大義倉庫'
    times: []
    costs: []
    equipment: []
ignoreSpans:
  - role: registration_links
    status: ignore
    occurrences: 3
    evidence: '[REGISTRATION_URL]'
    reason: 報名連結不是新增市集欄位，且不解析連結內容。
warnings:
  - warning: 不得把兩個市集的日期與地點合成一份草稿。
    evidence:
      - '小人類 x 伴手．禮市集'
      - '小人類 x 手作職人市集'
notes:
  - note: 前兩段名稱與地點相同，依規範合併為同一事件的不連續日期。
    evidence:
      - '05/14～05/16'
      - '05/21～05/23'
---
fixtureId: MTI-REP-0074-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 一個具名市集與十個已選場次。
  evidence: '台中．5月暮暮市集'
draftReadiness: partial
draftReadinessBasis:
  reason: 名稱與日期完整，但沒有活動地點。
  evidence: '已選場次'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 台中．5月暮暮市集
      evidence: '台中．5月暮暮市集'
    eventDates:
      status: exact
      value:
        - '2021-05-01'
        - '2021-05-02'
        - '2021-05-08'
        - '2021-05-09'
        - '2021-05-15'
        - '2021-05-16'
        - '2021-05-22'
        - '2021-05-23'
        - '2021-05-29'
        - '2021-05-30'
      evidence:
        - role: event_date
          span: '2021/05/01、05/02、05/08、05/09、05/15、05/16、05/22、05/23、05/29、05/30'
    location:
      status: not_present
      value: null
      evidence: null
    times: []
    costs:
      - role: selected_booth_cost
        status: exact
        amount: 1000
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中'
        unit: per_day
        evidence: '攤位金額：1,000元／日'
      - role: equipment_total
        status: exact
        amount: 0
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中'
        evidence: '租用設備：0元'
      - role: add_on_total
        status: unsupported
        amount: 0
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中'
        evidence: '加購項目：0元'
        reason: 目前欄位模型未定義一般加購總額，且零元不代表任何設備免費。
      - role: payment_total
        status: ignore
        amount: 10000
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中'
        evidence: '總金額：10,000元'
        reason: 總金額不可覆寫每日 boothCost；應保留明確的每日單價。
    equipment: []
ignoreSpans: []
warnings:
  - warning: 缺少活動地點。
    evidence: '台中．5月暮暮市集'
  - warning: 設備零元只表示未租用，不能推定主辦免費提供設備。
    evidence: '租用設備：0元'
notes:
  - note: 已選攤位類型為一般攤位。
    evidence: '攤位類型：一般攤位'
---
fixtureId: MTI-REP-0074-P02
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 一個具名市集，實際已選十個不連續日期。
  evidence: '實際已選場次'
draftReadiness: partial
draftReadinessBasis:
  reason: 名稱與實際日期明確，但活動地點缺漏。
  evidence: '活動名稱：台中．5月暮暮市集'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 台中．5月暮暮市集
      evidence: '活動名稱：台中．5月暮暮市集'
    eventDates:
      status: exact
      value:
        - '2021-05-01'
        - '2021-05-02'
        - '2021-05-08'
        - '2021-05-09'
        - '2021-05-15'
        - '2021-05-16'
        - '2021-05-22'
        - '2021-05-23'
        - '2021-05-29'
        - '2021-05-30'
      evidence:
        - role: event_date
          span: '實際已選場次：05/01、05/02、05/08、05/09、05/15、05/16、05/22、05/23、05/29、05/30'
    location:
      status: not_present
      value: null
      evidence: null
    times: []
    costs:
      - role: selected_booth_cost
        status: exact
        amount: 1000
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中'
        unit: per_day
        evidence: '一般攤位：1,000元／日'
      - role: equipment_total
        status: exact
        amount: 0
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中'
        evidence: '設備與加購：0元'
      - role: payment_total
        status: ignore
        amount: 10000
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中'
        evidence: '總金額：10,000元'
        reason: 總金額不是每日 boothCost；已有明確每日單價。
    equipment: []
ignoreSpans:
  - role: event_date_overview
    status: ignore
    evidence: '活動日期概覽：2021/05/01～2021/05/31'
    reason: 這是月份概覽；使用者另有明確「實際已選場次」，不可把整月每日加入。
warnings:
  - warning: 缺少活動地點。
    evidence: '活動名稱：台中．5月暮暮市集'
notes:
  - note: 活動日前七天內取消不退費，屬退款規則而非日期值。
    evidence: '活動日前七天內取消不退費'
  - note: 最終取消狀態以市集公告為準。
    evidence: '實際是否取消以市集公告為準'
---
fixtureId: MTI-REP-0075-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 報名成功文字、具名活動與兩個擺攤日期指向單一事件。
  evidence: '恭喜報名成功「2021萬國文酷展」'
draftReadiness: partial
draftReadinessBasis:
  reason: 活動地點未提供。
  evidence: '擺攤日期：2021/03/20、2021/03/21'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 2021萬國文酷展
      evidence: '「2021萬國文酷展」'
    eventDates:
      status: exact
      value:
        - '2021-03-20'
        - '2021-03-21'
      evidence:
        - role: event_date
          span: '擺攤日期：2021/03/20、2021/03/21'
    location:
      status: not_present
      value: null
      evidence: null
    times: []
    costs:
      - role: selected_booth_cost
        status: exact
        amount: 800
        currency: null
        unit: per_day
        evidence: '小型攤位，800元／日'
      - role: selected_booth_cost_total
        status: exact
        amount: 1600
        currency: null
        unit: total_for_two_days
        evidence: '攤位費用：1,600元'
    equipment:
      - type: booth_space
        status: exact
        provision: selected_booth
        value: '面長90cm × 寬77cm × 高75cm'
        evidence: '面長90cm × 寬77cm × 高75cm'
      - type: bundled_set
        status: exact
        provision: included
        value: 一桌、一椅、桌巾
        evidence: '設備：一桌、一椅、桌巾'
      - type: extra_chair
        status: exact
        provision: not_requested
        evidence: '額外租借椅子：不需要'
ignoreSpans: []
warnings:
  - warning: 活動地點缺漏。
    evidence: '擺攤日期'
  - warning: 「元」未附明確幣別，且目前文字不足以安全推定幣別。
    evidence: '800元／日'
notes:
  - note: 已選小型攤位。
    evidence: '攤位大小：小型攤位'
---
fixtureId: MTI-REP-0076-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 同一具名戶外市集提供多個可參加場次與攤型方案。
  evidence: '台中道禾六藝／刑務所演武場戶外市集'
draftReadiness: partial
draftReadinessBasis:
  reason: 日期與攤型皆尚未選擇。
  evidence:
    - '可參加場次'
    - '傘帳一天700元'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 台中道禾六藝／刑務所演武場戶外市集
      evidence: '台中道禾六藝／刑務所演武場戶外市集'
    eventDates:
      status: choice_required
      value: []
      options:
        - value: ['2021-03-13', '2021-03-14']
          evidence: '3/13～3/14'
        - value: ['2021-03-27', '2021-03-28']
          evidence: '3/27～3/28'
        - value: ['2021-04-10', '2021-04-11']
          evidence: '4/10～4/11'
        - value: ['2021-04-24', '2021-04-25']
          evidence: '4/24～4/25'
      evidence: '可參加場次：3/13～3/14、3/27～3/28、4/10～4/11、4/24～4/25'
      inferenceBasis: referenceDate 2021-02-28
      reason: 文字只列可參加選項，沒有已選日期。
    location:
      status: exact
      value: 台中道禾六藝／刑務所演武場
      evidence: '台中道禾六藝／刑務所演武場戶外市集'
    times: []
    costs:
      - role: booth_option
        status: choice_required
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中'
        options:
          - label: 傘帳一天
            amount: 700
            unit: per_day
            includedEquipment: 一桌二椅
            evidence: '傘帳一天700元'
          - label: 傘帳兩天
            amount: 1300
            unit: per_two_days
            includedEquipment: 一桌二椅
            evidence: '兩天1,300元'
          - label: 全棚一天
            amount: 900
            unit: per_day
            includedEquipment: 一桌二椅
            evidence: '全棚一天900元'
          - label: 全棚兩天
            amount: 1600
            unit: per_two_days
            includedEquipment: 一桌二椅
            evidence: '兩天1,600元'
        evidence: '傘帳一天700元、兩天1,300元，含一桌二椅。全棚一天900元、兩天1,600元'
        reason: 攤型與參與天數共同決定費用，輸入沒有選擇結果。
      - role: equipment_unit_price
        status: exact
        equipmentType: table
        amount: 200
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中'
        unit: per_table
        evidence: '加租一桌200元'
      - role: equipment_unit_price
        status: exact
        equipmentType: chair
        amount: 20
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中'
        unit: per_chair
        evidence: '加租椅子20元／張'
    equipment:
      - type: table_and_chairs
        status: exact
        provision: included_per_booth_option
        value: 一桌二椅
        evidence: '含一桌二椅'
ignoreSpans: []
warnings:
  - warning: 不可自動選第一個日期或最低價方案。
    evidence: '可參加場次'
notes: []
---
fixtureId: MTI-REP-0076-P02
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 同一具名市集有已選日期與費用明細，但兩者局部矛盾。
  evidence: '表單已選日期'
draftReadiness: blocked
draftReadinessBasis:
  reason: 已選 4/24～4/25，但費用列為 4/25～4/26，核心日期存在衝突。
  evidence:
    - '表單已選日期：3/13、4/10、4/11、4/24、4/25'
    - '4/25～4/26 傘帳兩天1,300元'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 台中道禾六藝／刑務所演武場戶外市集
      evidence: '台中道禾六藝／刑務所演武場戶外市集'
    eventDates:
      status: conflict
      value:
        selectedDateCandidate:
          - '2021-03-13'
          - '2021-04-10'
          - '2021-04-11'
          - '2021-04-24'
          - '2021-04-25'
        feeImpliedCandidate:
          - '2021-03-13'
          - '2021-04-10'
          - '2021-04-11'
          - '2021-04-25'
          - '2021-04-26'
      evidence:
        - role: event_date
          span: '表單已選日期：3/13、4/10、4/11、4/24、4/25'
        - role: event_date_in_fee_item
          span: '4/25～4/26'
        - role: public_event_date
          span: '4/24～4/25'
      inferenceBasis: referenceDate 2021-02-28
      reason: 費用日期多出 4/26 且缺少已選、公開催明的 4/24，不得自行修正。
    location:
      status: exact
      value: 台中道禾六藝／刑務所演武場
      evidence: '台中道禾六藝／刑務所演武場戶外市集'
    times: []
    costs:
      - role: selected_booth_cost_component
        status: exact
        amount: 700
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中'
        unit: one_day
        dateScope: '2021-03-13'
        evidence: '3/13 傘帳一天700元'
      - role: selected_booth_cost_component
        status: exact
        amount: 1300
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中'
        unit: two_days
        dateScope: '2021-04-10..2021-04-11'
        evidence: '4/10～4/11 傘帳兩天1,300元'
      - role: selected_booth_cost_component
        status: conflict
        amount: 1300
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中'
        unit: two_days
        dateScope: '2021-04-25..2021-04-26'
        evidence: '4/25～4/26 傘帳兩天1,300元'
        reason: 此費用日期與公開催明及表單已選的 4/24～4/25 不一致。
    equipment:
      - type: table_and_chairs
        status: exact
        provision: included_with_parasol_tent
        value: 一桌二椅
        evidence: '設備：傘帳包含一桌二椅'
ignoreSpans: []
warnings:
  - warning: 4/24、4/25、4/26 的參與與計費關係必須人工核對。
    evidence:
      - '4/24、4/25'
      - '4/25～4/26'
notes: []
---
fixtureId: MTI-REP-0077-P01
reviewerId: Reviewer C
reviewedAt: 2026-09-15
privacyReview: pass
eventDisposition: single_candidate
eventDispositionBasis:
  reason: 錄取名稱、日期與場站地點均指向同一市集。
  evidence: '錄取「三月火車站市集」'
draftReadiness: reviewable_core
draftReadinessBasis:
  reason: 名稱、兩日日期與唯一的完整場地文字均存在，核心欄位無衝突。
  evidence:
    - '日期：2021/03/20～2021/03/21'
    - '地點：台中火車站第一／第二月台'
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 三月火車站市集
      evidence: '「三月火車站市集」'
    eventDates:
      status: exact
      value:
        - '2021-03-20'
        - '2021-03-21'
      evidence:
        - role: event_date
          span: '日期：2021/03/20～2021/03/21'
    location:
      status: exact
      value: 台中火車站第一／第二月台
      evidence: '地點：台中火車站第一／第二月台'
    times: []
    costs:
      - role: selected_booth_cost
        status: exact
        amount: 800
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中火車站'
        unit: per_day
        evidence: '800元／日'
      - role: equipment_unit_price
        status: exact
        equipmentType: extension_cord
        amount: 100
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中火車站'
        unit: per_day
        selected: true
        evidence: '已選延長線：100元／日'
      - role: equipment_unit_price
        status: exact
        equipmentType: light_with_bulb
        amount: 100
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中火車站'
        unit: per_day
        selected: true
        evidence: '已選燈具含燈泡：100元／日'
      - role: payment_total
        status: ignore
        amount: 2000
        currency: TWD
        currencyStatus: inferable
        currencyEvidence: '台中火車站'
        evidence: '總金額：2,000元'
        reason: 總金額含攤位與已選設備，不可當成 boothCost。
    equipment:
      - type: booth_space
        status: exact
        provision: selected_unit
        value: '200 × 150cm'
        evidence: '一個單位：200 × 150cm'
      - type: extension_cord
        status: exact
        provision: selected_rental
        evidence: '已選延長線'
      - type: light_with_bulb
        status: exact
        provision: selected_rental
        evidence: '已選燈具含燈泡'
ignoreSpans: []
warnings: []
notes: []
~~~

## 封存中斷註記

- 本註記由 primary adjudicator 於 2026-09-16 加入，只修復 Markdown fence 並記錄持久化範圍，未修改 Reviewer C 的任何欄位答案。
- Reviewer C 因工具使用額度中斷；本檔實際封存 25／30 筆，至 `MTI-REP-0077-P01`。
- 未封存 ID：`MTI-REP-0078-P01`、`MTI-REP-0079-P01`、`MTI-REP-0080-P01`、`MTI-REP-0080-P02`、`MTI-REP-0080-P03`。
- 本檔不得單獨宣稱完成 Round B；缺少 5 筆由隔離的 Reviewer D 補審，並以 reviewer set C／D 合併統計。
