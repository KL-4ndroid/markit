# 市集文字匯入 Paste Fixture Adjudication Worksheet Round B v1

- 建立日期：2026-09-15
- 裁決完成日：2026-09-16
- 狀態：Reviewer set C／D 盲審與 Round B 差異裁決完成
- 範圍：Round B 30 個候選 paste fixture
- 產品實作狀態：未核准、未開始
- Answer key：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ROUND_B_V1_2026_09_15.md`
- Blind Review Pack：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_B_V1_2026_09_15.md`
- Reviewer C 結果（25 筆）：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_C_ROUND_B_V1_2026_09_15.md`
- Reviewer D remainder 結果（5 筆）：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_D_ROUND_B_REMAINDER_V1_2026_09_16.md`

## 1. 使用順序

1. Reviewer C 只開啟 Round B Blind Review Pack 與凍結的 Blind Reviewer Guide；未查看本工作表、answer key、來源 Gmail、Annotation Pass 1、Round A 答案或其他 agent 結果。
2. Reviewer C 已完成 30 筆判讀，但因工具額度中斷，只持久化前 25 筆。Primary adjudicator 僅修復該檔 Markdown fence，沒有修改任何答案。
3. 未封存的 5 筆由新的 Reviewer D 只使用精確 remainder pack 與同一份凍結指南補審；Reviewer D 未查看 Reviewer C 或 answer key。
4. 兩份結果封存後，adjudicator 才逐欄比較 privacy、event disposition、draft readiness、status、value、evidence 與安全行為。
5. 差異依 evidence 與安全邊界裁決，不以任一方答案或多數決直接覆蓋。

## 2. Fixture 追蹤表

| Fixture | Reviewer | Privacy | Disposition | Readiness | Material difference | Adjudication | Policy impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `MTI-REP-0061-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0062-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0063-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0063-P02` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0064-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0065-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0065-P02` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0066-P01` | C | agree/pass | differ | clarified | activity event vs market certainty; date conflict | `single_candidate`＋`blocked` | disposition threshold |
| `MTI-REP-0066-P02` | C | agree/pass | agree | differ | latest-correction threshold | keep date `conflict`; `blocked` | correction precedence |
| `MTI-REP-0067-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0067-P02` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0068-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0069-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0069-P02` | C | agree/pass | agree | clarified | fee arithmetic vs selected option | public fee not selected; `partial` | selection evidence |
| `MTI-REP-0070-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0071-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0072-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0073-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0073-P02` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0074-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0074-P02` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0075-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0076-P01` | C | agree/pass | agree | differ | available dates vs selected dates | dates `choice_required`; `partial` | date-selection evidence |
| `MTI-REP-0076-P02` | C | agree/pass | agree | differ | core conflict classification | date `conflict`; `blocked` | readiness threshold |
| `MTI-REP-0077-P01` | C | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0078-P01` | D | agree/pass | agree | agree | per-date booth assignment shape | preserve as `unsupported` | relationship representation |
| `MTI-REP-0079-P01` | D | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0080-P01` | D | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0080-P02` | D | agree/pass | agree | agree | none | accept | none |
| `MTI-REP-0080-P03` | D | agree/pass | agree | agree | date certainty; token vocabulary | date `inferable`; token alias accepted | inference/privacy vocabulary |

追蹤結果：30／30 完成隔離盲審，30／30 privacy pass，30／30 完成裁決。沒有 fixture 需要移除或修改 `inputText`；7 筆具有會影響通用政策、欄位狀態或 readiness 的實質差異，其餘差異只屬等價資料形狀或無差異。

## 3. Reviewer set 合併統計

| 指標 | 結果 |
| --- | ---: |
| Reviewer C 持久化結果 | 25 |
| Reviewer D 隔離補審 | 5 |
| 唯一 fixture 覆蓋 | 30／30 |
| Privacy pass | 30 |
| Privacy fail | 0 |
| `single_candidate` | 25 |
| `event_selection_required` | 1 |
| `insufficient` | 2 |
| `reject` | 2 |
| `reviewable_core` | 6 |
| `partial` | 16 |
| `blocked` | 8 |

Reviewer C 的中斷屬答案持久化中斷，不是判讀內容被 primary adjudicator 補寫。Reviewer D 的 5 筆輸入與完整 Blind Review Pack 對應片段逐字相同，且兩位 reviewer 互相隔離，因此可合併成同一 Round B independent reviewer set。

## 4. 實質差異裁決

1. `MTI-REP-0066-P01`：`eventDisposition` 描述可辨識事件數量，不等於已證明它符合「市集」產品範圍。具名活動、日期與地點足以成為 `single_candidate`；但 2021／2022 對同一日期的衝突使 readiness 為 `blocked`，且預覽需提示市集性質仍待確認。
2. `MTI-REP-0066-P02`：「日期調整成 2022/12/10」與緊鄰、同層的「時間｜2021.12.10」互相矛盾。只有更正關係和被取代值界線明確時才可套用最新值；本例維持 `conflict`，不把 2022 當安全覆蓋值。
3. `MTI-REP-0069-P02`：`1200 + 1000 = 2200` 可驗證金額一致，卻不能反向證明「一般文創品牌」是已選攤型。公開方案保持未選；地點仍依攤型為 `choice_required`，readiness 為 `partial`。
4. `MTI-REP-0076-P01`：「可參加場次」是候選日期，不是表單已選答案。日期為 `choice_required`，因此即使活動名稱含場地，也只能是 `partial`。
5. `MTI-REP-0076-P02`：表單已選 4/24～4/25，費用列卻寫 4/25～4/26；這是核心活動日期衝突，readiness 必須為 `blocked`，不是 `partial`。
6. `MTI-REP-0078-P01`：不同日期綁定不同攤位型態仍是一個事件。保存 `perDateBoothAssignment` 與 evidence，但現有單一攤位欄位無法表達，狀態為 `unsupported`；不得拆成兩個市場，也不得壓成單一攤型。
7. `MTI-REP-0080-P03`：「報名日期」在具名市集報名表上下文中可推定為參與日，但字面角色仍有歧義，所以活動日為 `inferable`。`[PRIVATE_PERSON]`、`[PRIVATE_DATE]`、`[PRIVATE_ANSWER]` 已隱去原值，可判 privacy pass；它們是非標準 alias，未來 fixture 必須使用規範 token。

## 5. 回寫政策

1. 更正文字只有在新值、舊值與取代關係清楚分層時才可覆蓋；同層活動資訊仍有不同值時標 `conflict`。
2. `eventDisposition` 只判事件數量與是否應建立；市場性質未完全確認但已有唯一具名活動時，可是 `single_candidate`，另以 warning／readiness 防止直接套用。
3. 公開方案加總吻合付款總額，只能作一致性檢查；沒有明示選擇證據時，不得將方案標為 selected。
4. 「可參加／可報名場次」為 `choice_required`；「已選／錄取參加日」才可成為套用候選。
5. 任何未解的名稱、日期或地點核心衝突都使 `draftReadiness` 為 `blocked`。
6. 日期相依攤位、場地、時間或設備關係先保留為結構化 `unsupported`，不可丟掉相依性。
7. 既有 fixture 中可證明沒有原值的 `[PRIVATE_*]` alias 可通過 privacy，但新 fixture 一律使用 Annotation Guide 的 canonical tokens。

上述規則已同步回寫 Annotation Guide 與 Round B answer key；沒有更動 fixture 輸入文字，也沒有擴張產品實作範圍。

## 6. 完成條件

- [x] 30／30 fixture 完成隔離盲審。
- [x] 30／30 fixture privacy 均通過；沒有 privacy fail。
- [x] 所有 disposition、readiness 與欄位差異均有 evidence-based 裁決。
- [x] 必要的 Annotation Guide 修訂完成。
- [x] 沒有修改 `inputText`，因此不需要變更後重審。
- [x] 30 個通過 fixture 計入 Gold representative subset Round B v1。

Round A 23 筆與 Round B 30 筆合計為 53 個已裁決 Gold research fixtures；仍不能稱為完整 Corpus Gold dataset，也尚未轉成 runtime 測試檔或產品解析器。

## 7. Gate 4 executable conversion note

- 2026-09-16：Round B 30／30 已可由 test runner 載入，Reviewer C 25 筆與 Reviewer D 5 筆的 fixture ID、privacy、disposition、readiness 與 evidence 均通過完整性驗證。
- `MTI-REP-0076-P01` 原 reviewer 結果的攤型費率 evidence 將兩行原文合併成一個非連續字串。Executable Gold 將它拆成「傘帳」與「全棚」兩個精確 span；`choice_required`、費率值、included equipment 與 readiness 均未改變。
- 這是 evidence boundary 正規化，不是 fixture、盲審答案或產品支援範圍的語意改判，因此不需重新盲審。
