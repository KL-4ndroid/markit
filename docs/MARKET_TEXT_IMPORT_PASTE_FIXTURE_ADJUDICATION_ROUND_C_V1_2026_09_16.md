# 市集文字匯入 Paste Fixture Adjudication Worksheet Round C v1

- 日期：2026-09-16
- 狀態：30／30 獨立盲審與差異裁決完成；Round C 已升級為 Gold
- 範圍：Round C 30 個候選 paste fixtures
- 產品實作狀態：未核准、未開始
- Answer key：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ROUND_C_V1_2026_09_16.md`
- Blind Review Pack：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_C_V1_2026_09_16.md`
- Blind Reviewer Guide：`docs/MARKET_TEXT_IMPORT_BLIND_REVIEWER_GUIDE_ROUND_C_V1_2026_09_16.md`
- Reviewer E 結果：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_E_ROUND_C_V1_2026_09_16.md`

## 1. 使用順序

1. 獨立複核者只能開啟 Round C Blind Review Pack 與凍結的 Blind Reviewer Guide。
2. 結果封存前，不得查看本工作表、Round C answer key、來源 Gmail、Annotation Pass 1、Discovery、Corpus 或 Round A／B 答案。
3. 複核完成後，adjudicator 才逐欄比較 privacy、event disposition、draft readiness、status、value、evidence 與安全行為。
4. 差異必須記錄 evidence-based 理由，不得直接以任一方答案或多數決覆蓋。
5. 發現 privacy fail 時先修正 fixture 並重新盲審，不直接進入欄位裁決。

## 2. Fixture 追蹤表

| Fixture | Blind review | Privacy | Disposition | Readiness | Field differences | Adjudication | Policy impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `MTI-REP-0081-P01` | complete | agree | agree | agree | payment currency | amount／role exact；currency unknown | currency boundary |
| `MTI-REP-0082-P01` | complete | agree | agree | agree | price role／currency | published price exact；unit unknown；currency inferable | published price |
| `MTI-REP-0083-P01` | complete | agree | agree | agree | none | accept independent result | none |
| `MTI-REP-0084-P01` | complete | agree | agree | agree | external selected dates | `unsupported`＋null；保留 activity range | external-only value |
| `MTI-REP-0084-P02` | complete | agree | agree | agree | external selected dates | `unsupported`＋null；保留 activity range | external-only value |
| `MTI-REP-0085-P01` | complete | agree | agree | agree | none | accept independent result | none |
| `MTI-REP-0085-P02` | complete | agree | agree | agree | payment currency | received／due 分角色；currency inferable | payment roles |
| `MTI-REP-0086-P01` | complete | agree | agree | agree | none | accept independent result | none |
| `MTI-REP-0086-P02` | complete | agree | agree | agree | none | accept independent result | none |
| `MTI-REP-0087-P01` | complete | agree | agree | agree | none | accept independent result | none |
| `MTI-REP-0088-P01` | complete | agree | agree | agree | none | accept independent result | none |
| `MTI-REP-0089-P01` | complete | agree | agree | agree | selected dates status | `unsupported`＋null，不可外查 | external-only value |
| `MTI-REP-0090-P01` | complete | agree | agree | agree | booth cost status | `unsupported`＋null，不可外查 | external-only value |
| `MTI-REP-0091-P01` | complete | agree | agree | agree | none | accept independent result | none |
| `MTI-REP-0092-P01` | complete | agree | agree | agree | none | accept independent result | none |
| `MTI-REP-0092-P02` | complete | agree | agree | agree | none | accept independent result | none |
| `MTI-REP-0093-P01` | complete | agree | agree | agree | naming granularity confirmed | literal unique occurrence phrase is exact | event naming |
| `MTI-REP-0094-P01` | complete | agree | agree | agree | title location confirmed | title suffix is exact location | title location |
| `MTI-REP-0094-P02` | complete | agree | agree | agree | title location confirmed | title suffix is exact location | title location |
| `MTI-REP-0094-P03` | complete | agree | agree | agree | none | keep four candidate event blocks | none |
| `MTI-REP-0095-P01` | complete | agree | agree | agree | none | accept independent result | none |
| `MTI-REP-0096-P01` | complete | agree | agree | agree | recruitment dates | dates `not_present`；招募期間 `ignore` | date role |
| `MTI-REP-0096-P02` | complete | agree | agree | changed to `reviewable_core` | date ranges／readiness | explicit ranges are event structure；time remains unsupported | core readiness |
| `MTI-REP-0097-P01` | complete | agree | agree | agree | total currency | amount／role exact；currency unknown | currency boundary |
| `MTI-REP-0097-P02` | complete | agree | agree | changed to `partial` | charged days／stall type | dates preserved；fee mapping unsupported；stall choice unproven | fee-date relation |
| `MTI-REP-0098-P01` | complete | agree | agree | agree | none | accept independent result | none |
| `MTI-REP-0098-P02` | complete | agree | agree | agree | none | accept independent result | none |
| `MTI-REP-0099-P01` | complete | agree | agree | agree | none | `reject`＋`events: []` | none |
| `MTI-REP-0100-P01` | complete | agree | agree | agree | none | `reject`＋`events: []` | none |
| `MTI-REP-0100-P02` | complete | agree | agree | agree | none | `reject`＋`events: []` | none |

## 3. 實質差異與裁決

### 3.1 外部內容只被提及、值不在 `inputText`

適用：`0084-P01`、`0084-P02`、`0089-P01`、`0090-P01`。

- 當文字明示「實際入選日／費用請見外部表單或公告」時，存在一個無法由目前輸入取得的欄位值。
- 為區分一般缺漏，裁決為該欄位 `unsupported`、`value: null`，並以外部參照句作 evidence；整體活動範圍可以分開保存。
- 不得開啟連結、把整體活動範圍當成已選日期，或把外部值標成 `choice_required`，因目前文字沒有列出可選值。

### 3.2 日期角色與 core readiness

適用：`0096-P01`、`0096-P02`。

- `0096-P01` 的三段日期明示為「招募期間」，不是活動日期；裁決為 `dates: not_present`，招募期間本身列為 `ignore`。原 answer key 將它當活動排程是錯誤角色判定。
- `0096-P02` 明示「日期區間」，同時有唯一名稱與地點；三段相接範圍屬同一事件日期結構，不切成三個事件。年份依 `referenceDate` 推定；平日／假日時間維持 `unsupported`。
- 時間欄位不支援不會單獨阻止 core，因此 `0096-P02` 裁決為 `reviewable_core`。

### 3.3 活動日期與付款／租借天數

適用：`0097-P02`。

- 「錄取日期」明示四個活動日；「錄取（租借）天數：普通假日 2」描述的是計費／租借數量，沒有文字說明它取代或更正四個錄取日。
- 因此活動日期不是核心衝突，保留四日為 `inferable`；草稿因缺地點而為 `partial`，不是 `blocked`。
- 兩個計費日無法對應到四個活動日，費用／日期 relationship 為 `unsupported`，必須顯示 warning。
- `2000` 總額與兩日數量可以分別保留；但僅靠 `2000 ÷ 2 = 1000` 不足以證明已選普通攤，兩種攤型仍為 published options／`choice_required`。此點修正獨立 reviewer 的 selected type 推定。

### 3.4 金額、角色與幣別分離

適用：`0081-P01`、`0082-P01`、`0085-P02`、`0097-P01`。

- 金額數字與 `payment_total`、`received`、`due`、`published_price` 等角色可以是 `exact`。
- 只有「元」且缺少台灣場地或其他明確台灣情境時，currency 必須保持 unknown；適用 `0081-P01`、`0097-P01`。
- 台灣場地加上「元」只能讓 TWD 成為 `inferable`，不能成為 `exact`；適用 `0082-P01`、`0085-P02`。
- `received: 2740` 與 `due: 2760` 是不同付款角色，不是同欄 conflict；差額以 warning 呈現。

### 3.5 名稱與標題內場地

適用：`0093-P01`、`0094-P01`、`0094-P02`。

- 若目前文字只有一個可辨識事件，「台南新光三越場次」可直接作 `eventName: exact`，不得依常識補不存在的正式名稱。
- `名稱｜唯一場域` 的標題格式，在內容沒有其他地點候選且語意清楚時，分隔符後文字可作 `location: exact`；仍須保留同一標題 evidence。

## 4. 結果統計

- Fixture：30／30 完成；privacy `pass` 30、`fail` 0。
- `eventDisposition`：`single_candidate` 26、`event_selection_required` 1、`reject` 3。
- 裁決後 `draftReadiness`：`reviewable_core` 10、`partial` 16、`blocked` 4。
- `events: []`：3 筆，全部為 `reject`（`0099-P01`、`0100-P01`、`0100-P02`）。
- 多活動未選：1 筆（`0094-P03`），保留四個候選 event blocks。
- 沒有修改任何 fixture 的 `referenceDate` 或 `inputText`；差異只修正 answer key 與共通政策，因此不需重審。
- Round C 30 筆全部列為 Gold；Round A＋B＋C 合計 83 個 Gold research fixtures。

## 5. 完成條件

- [x] 30／30 fixture 完成隔離盲審。
- [x] 30／30 fixture privacy pass，沒有需修正重審的個資問題。
- [x] 所有 disposition、readiness 與實質欄位差異均有 evidence-based 裁決。
- [x] Answer key 與 Annotation Guide 已按裁決修訂。
- [x] 沒有變更 `referenceDate` 或 `inputText`，不觸發重新盲審。
- [x] 30 筆通過並計入 Gold fixture 數量。

## 6. Gate 4 executable conversion note

- 2026-09-16：Round C 30／30 已轉成可執行 expected outputs；fixture ID、privacy、disposition、readiness、事件數及所有 evidence source 均通過驗證。
- `referenceDate: YYYY-MM-DD` 類 evidence 以 request metadata source 驗證；其他 evidence 必須是對應 `inputText` substring，兩者不混用。
- `MTI-REP-0097-P02` 的 executable 裁決明確移除「算式證明普通攤已選」的推定：四個活動日保留、兩個計費日的 mapping 為 `unsupported`，普通攤／三輪車費率維持 `choice_required`。
- Round A＋B＋C 的 executable expected coverage 為 83／83；下一層工作是 evaluator projection，不是重新標註或開始產品 parser。
