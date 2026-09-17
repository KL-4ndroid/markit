# 市集文字匯入 Paste Fixture Adjudication Worksheet v1

- 日期：2026-09-15
- 狀態：Reviewer B 盲審與 Round A 差異裁決完成
- 範圍：Round A 23 個候選 paste fixture
- 產品實作狀態：未核准、未開始
- Reviewer B 結果：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_B_V1_2026_09_15.md`

## 1. 使用順序

1. 第二位複核者先完成 Blind Review Pack，期間不得查看第一位標註者答案。
2. 複核結果封存後，才由 adjudicator 同時查看兩份答案。
3. 逐欄比較 status、value、evidence、語意角色與 event disposition。
4. 差異必須留下理由；不得直接以第一位答案或多數決覆蓋。
5. 裁決可能改變 Annotation Guide、fixture 或第一版支援範圍。

## 2. Fixture 追蹤表

| Fixture | Blind review | Privacy | Disposition agreement | Field differences | Adjudication | Policy impact |
| --- | --- | --- | --- | --- | --- | --- |
| `MTI-REP-0001-P01` | complete | agree/pass | agree | readiness vocabulary | single candidate＋partial | disposition/readiness split |
| `MTI-REP-0001-P02` | complete | agree/pass | agree | none | accept | none |
| `MTI-REP-0002-P01` | complete | agree/pass | agree | market-name shape | accept Reviewer B structure | name structure |
| `MTI-REP-0002-P02` | complete | agree/pass | agree | market-name shape | accept Reviewer B structure | name structure |
| `MTI-REP-0004-P01` | complete | agree/pass | agree | readiness vocabulary | single candidate＋partial | disposition/readiness split |
| `MTI-REP-0004-P02` | complete | agree/pass | agree | tent quantity | quantity remains unknown | equipment quantity |
| `MTI-REP-0007-P01` | complete | agree/pass | agree | date-dependent times shape | preserve values as unsupported | schedule representation |
| `MTI-REP-0007-P02` | complete | agree/pass | agree | fee unit、date-dependent times | canonical per_event＋coversDates | fee/schedule representation |
| `MTI-REP-0007-P03` | complete | agree/pass | agree | fee unit、date-dependent times | canonical per_event＋coversDates | fee/schedule representation |
| `MTI-REP-0011-P01` | complete | agree/pass | agree | location status | location and fee both choice_required | linked options |
| `MTI-REP-0011-P02` | complete | agree/pass | agree | location status | location and fee both choice_required | linked options |
| `MTI-REP-0012-P01` | complete | agree/pass | agree | disposition threshold | insufficient＋blocked | disposition/readiness split |
| `MTI-REP-0016-P01` | complete | agree/pass | agree | none | accept | none |
| `MTI-REP-0016-P02` | complete | agree/pass | agree | recurring value shape | preserve range/rule as unsupported | recurrence representation |
| `MTI-REP-0018-P01` | complete | agree/pass | agree | unselected equipment option | retain as rentable_not_selected | selected-option safety |
| `MTI-REP-0018-P02` | complete | agree/pass | agree | non-concrete date selection | preserve selection as unsupported | form-answer representation |
| `MTI-REP-0029-P01` | complete | agree/pass | agree | booth-cost certainty | booth cost is inferable | cost-role confidence |
| `MTI-REP-0029-P02` | complete | agree/pass | agree | rejected event shape | events empty; quoted fields ignored | reject representation |
| `MTI-REP-0036-P01` | complete | agree/pass | agree | equipment provision、name shape | provision unknown; accept name structure | equipment/name safety |
| `MTI-REP-0036-P02` | complete | agree/pass | agree | equipment provision、name shape | provision unknown; accept name structure | equipment/name safety |
| `MTI-REP-0042-P01` | complete | agree/pass | agree | rejected event shape | events empty; all spans ignored | reject representation |
| `MTI-REP-0047-P01` | complete | agree/pass | agree | date-dependent area shape | preserve area schedule evidence | location representation |
| `MTI-REP-0047-P02` | complete | agree/pass | agree | city-only location、recurring shape | exact evidence but partial readiness; recurring unsupported | location/recurrence |

追蹤結果：23／23 完成盲審、23／23 隱私同意通過、23／23 `eventDisposition` 安全意圖一致。欄位差異均屬資料形狀、推定信心或套用安全邊界，沒有需要移除 fixture 的差異。

## 3. Round A 裁決決定

1. 新增 `draftReadiness`，避免用 `eventDisposition` 同時表達事件數量與草稿完整度。
2. `single_candidate` 只表示一個可辨識事件；缺名稱、日期或地點時仍為 `partial`，不可視為可送出。
3. 市集名稱可保留系列／主辦、單場名稱與首選顯示名，但 runtime contract 尚未定案。
4. 地點、費用與設備若屬同一方案，全部保留在同一 option；地點與費用均為 `choice_required`。
5. 日期相依時間、日期相依子場地與 recurring 規則保留結構化 evidence，但現有單值欄位維持 `unsupported`。
6. 費用數字與角色可為 `exact`，幣別推定另用 `currencyStatus: inferable`；多日總費統一使用 `per_event` 加涵蓋日期。
7. 未明示設備提供方式時不推定免費或包含；未選租借項可以保留，但不可成為套用值。
8. 未命名付款元件只有經排除其他明確元件後才能判定角色，狀態為 `inferable`。
9. `reject` 使用 `events: []` 並保留 `ignoreSpans`，不建立假事件。
10. 23 筆 privacy 全數通過，不需退回 fixture 重製。

上述決定已回寫 Annotation Guide v1 與 Calibration answer key。

## 4. 單筆差異紀錄模板

```yaml
fixtureId:
reviewerAResultRef:
reviewerBResultRef:
privacyDecision:
eventDisposition:
  reviewerA:
  reviewerB:
  adjudicated:
differences:
  - field:
    reviewerA:
    reviewerB:
    adjudicated:
    reason:
    evidence:
guideChangeRequired: false
fixtureChangeRequired: false
supportScopeChangeRequired: false
notes:
```

## 5. 差異分類

- `boundary_difference`：event block 或 evidence span 邊界不同。
- `semantic_role_difference`：活動日、截止日、營業時間、報到時間或金額角色不同。
- `normalization_difference`：來源一致，但日期、時間、金額或單位正規化不同。
- `safety_difference`：是否自動套用、要求選擇、保持空白或拒絕的判斷不同。
- `privacy_difference`：任一複核者認為 fixture 仍含不應保存的資料。
- `unsupported_scope_difference`：對現有表單是否可表達的判斷不同。

## 6. 完成門檻

- [x] 23 個 blind review 全部完成。
- [x] 23 個 fixture privacy 均通過；沒有 privacy fail。
- [x] 所有欄位差異都有裁決理由。
- [x] 需要修改 Annotation Guide 的差異已同步回寫。
- [x] Paste Sample Selection Policy v1 已凍結。
- [x] 23 個通過候選可計入 Gold calibration subset v1。

這個完成狀態只適用於 Round A 校準子集；完整代表樣本、歧義案例、負面案例與保留盲測尚未完成，因此不能稱為完整 Gold dataset。
