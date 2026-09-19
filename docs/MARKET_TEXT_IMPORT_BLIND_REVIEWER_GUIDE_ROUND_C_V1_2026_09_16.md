# 市集文字匯入 Blind Reviewer Guide Round C v1

- 日期：2026-09-16
- 狀態：Round C 盲審專用凍結版
- 內容邊界：只包含 Round A／B 已裁決的通用規則；不含 Round C 答案、分布、來源郵件或研究結論
- 使用限制：只能搭配 Round C Blind Review Pack；不得沿連結或搜尋其他研究文件

## 1. 判讀邊界

1. 每筆答案只能使用該筆 `referenceDate` 與 `inputText`。
2. Gmail 主旨、來源郵件、附件、網址、其他 fixture 與一般常識都不是 evidence。
3. 使用者主動貼上只代表希望分析，不代表內容一定是市集、一定已錄取或一定足以建立草稿。
4. 解析結果只供人工預覽；任何狀態都不得代表自動送出。

## 2. Privacy review

先檢查 privacy，再判讀欄位。

允許保留：

- 公開活動名稱、日期、時間、地點、費用、設備與公開規則。
- canonical tokens：`[PERSON_NAME]`、`[BRAND_NAME]`、`[EMAIL]`、`[PHONE_OR_CONTACT]`、`[PRIVATE_ADDRESS]`、`[PRIVATE_FORM_ANSWER]`、`[BANK_ACCOUNT]`、`[IDENTIFIER]`、`[PRIVATE_FORM_URL]`、`[REGISTRATION_URL]`、`[MAP_URL]`。

若仍有未遮罩的私人姓名、品牌提交、聯絡方式、帳戶、付款識別碼、私人網址、車牌、私人地址或商品回答，標 `privacyReview: fail`，記錄 evidence，停止該筆其他欄位判讀。

## 3. `eventDisposition`

| 值 | 判定門檻 |
| --- | --- |
| `single_candidate` | 只有一個可辨識的市集事件，即使欄位仍缺漏或需選擇 |
| `event_selection_required` | 有兩個以上不可合併的市集事件，必須先選一個 |
| `insufficient` | 只有提醒、付款、設備或零散答案，無法綁成可辨識事件 |
| `reject` | 明確取消、撤回、未錄取、非市集，或長期零售／寄售／進駐等不應建立市集草稿的內容 |

`eventDisposition` 只描述事件數量與阻止原因，不等於草稿完整度。日期、地點與費用看似可解析，也不會把長期百貨寄售自動變成市集事件。

## 4. `draftReadiness`

| 值 | 判定門檻 |
| --- | --- |
| `reviewable_core` | 單一事件具有唯一名稱、至少一個活動日與唯一地點，核心欄位沒有衝突 |
| `partial` | 單一事件可辨識，但名稱、日期或地點至少一項缺漏、需選擇或不支援 |
| `blocked` | 多事件未選、資訊不足、明確拒絕，或名稱／日期／地點存在核心衝突 |

費用、時間或設備缺漏通常不會單獨阻止核心預覽，但必須留白或警告。

## 5. 欄位狀態

每個欄位只能使用：

- `exact`：原文唯一明示。
- `inferable`：依固定政策可推定，必須寫明推定來源。
- `choice_required`：有多個合法選項或尚未明示使用者選擇。
- `conflict`：同一欄位有互相矛盾的值。
- `not_present`：目前文字沒有該資訊。
- `unsupported`：原文有資訊，但現有單值欄位或 MVP 無法完整表達。
- `ignore`：不是新增市集欄位。

`not_present` 不得建立虛構 evidence；`inferable`、`choice_required`、`conflict`、`unsupported` 與 `ignore` 都必須說明原因。

## 6. 日期與更正

1. 報名、付款、公告、對帳、回覆、地圖與確認期限不是活動日。
2. 缺年日期可依 `referenceDate`、同一活動名稱及未來合理區間補年，但狀態為 `inferable`。
3. 民國年可固定換算成西元年，但狀態為 `inferable`。
4. 「可參加」「仍有位子」「可報名」是 `choice_required`，不是已選日期；「錄取」「已選」才是套用候選。
5. 活動整體範圍與實際錄取日同時存在時，以已選／錄取日作草稿候選，整體範圍只保留 evidence。
6. 更正只在新值、舊值及取代關係清楚時覆蓋；同層資訊仍矛盾時為 `conflict`。
7. 不同日期綁定不同時間、費用、攤型或設備時，保留日期相依結構並標 `unsupported`；不得拆散關係。
8. `referenceDate` 只供補年判斷，不是活動日。

## 7. 時間、地點與名稱

1. 營業時間、報到時間、進場時間與截止時間分開標記。
2. 每日不同營業時間不得壓成單一開始／結束值。
3. 簽名檔、公司地址、付款分行與私人地址不是活動地點。
4. Gmail 主旨不是預設 `inputText`，不得補足正文缺少的日期或名稱。
5. 場域內同期電影、車展、快閃與其他節目只有在本身也是欲建立的市集時才切成 event block。

## 8. 費用與設備

1. `boothCost`、設備租金、保證金、餐費、電費、付款總額、已收款額與退款分開。
2. 公開價目不等於已選方案；selected 必須有表單答案、錄取方案或同等明示 evidence。
3. 元件加總等於付款總額只能驗證算式，不能單獨證明某方案已選。
4. 多日總費使用 `per_event` 加 `coversDates`；逐日金額不同時保留 per-date relationship。
5. `提供`、`包含`、`免費`、`可租`、`自備`、`不提供`、`禁止` 是不同設備狀態。
6. 使用 `元` 且場地在台灣時，金額角色可 `exact`，但 TWD 幣別另標 `inferable`。

## 9. 多事件、引用與拒絕

1. 先切 event block，再解析欄位；不同活動不得合併。
2. 引用舊信只提供目前 `inputText` 中仍有效的 evidence；最新取消、撤回或未錄取具有優先阻止效果。
3. 最新回覆只修正私人付款識別碼時，不得改動活動日期、地點或費用答案。
4. `reject` 使用 `events: []`；相關日期與地點可留在 `ignoreSpans` 作拒絕 evidence，不建立假事件。
5. 長期店面、百貨寄售、品牌進駐、抽成銷售與排班合作不是本功能的單次市集草稿。

## 10. 回傳格式

每筆 fixture 必須包含：

```yaml
fixtureId:
privacyReview:
  status: pass | fail
  evidence: []
  reason:
eventDisposition:
  value: single_candidate | event_selection_required | insufficient | reject
  evidence: []
  reason:
draftReadiness:
  value: reviewable_core | partial | blocked
  evidence: []
  reason:
events: []
ignoreSpans: []
warnings: []
notes: []
```

所有非空值、警告與備註都要引用目前 `inputText` 的原句或最小 span。完成後另存結果檔，不得修改盲審包或其他研究文件。
