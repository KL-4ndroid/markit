# 市集文字匯入 Gold Test Plan v1

- 建立日期：2026-09-16
- 狀態：Gate 4 已完成（2026-09-16）；83／83 input 與 expected outputs、完整 evaluator、分組報告及品質門檻 v1 均已凍結
- 產品實作狀態：Gate 7 預覽 UI 與安全 merge 已完成；Gate 8 holdout 尚未執行
- Parser contract：`docs/MARKET_TEXT_IMPORT_PARSER_CONTRACT_V1_2026_09_16.md`
- Annotation guide：`docs/MARKET_TEXT_IMPORT_ANNOTATION_GUIDE_V1_2026_09_15.md`
- Gold 規模：Round A 23＋Round B 30＋Round C 30，共 83 筆

## 1. 目的與隔離邊界

Gate 4 把已裁決的 Markdown research fixtures 轉成可由未來 test runner 載入的資料，並先凍結「什麼算安全、什麼算錯填」。本階段不建立 parser 規則、不接 UI、不讀保留盲測內容。

資料分組：

- `design_gold`：目前 83 筆，允許用於規則設計、回歸測試與錯誤分類。
- `holdout`：既有封存盲測來源家族，Gate 8 前不得讀取內容或建立答案。
- 同一 `sourceSampleId` 衍生的所有 paste fixtures 必須留在同一 split。

## 2. Executable fixture schema

```ts
interface MarketTextImportGoldInputFixture {
  schemaVersion: 1;
  fixtureId: string;
  sourceSampleId: string;
  split: 'design_gold';
  round: 'A' | 'B' | 'C';
  pasteScenario: 'focused_block' | 'focused_with_context' | 'full_message_stress';
  sourceTextMode: 'deidentified_verbatim_excerpt' | 'structure_preserving_synthetic';
  referenceDate: string;
  inputText: string;
}

interface MarketTextImportGoldFixture extends MarketTextImportGoldInputFixture {
  expected: {
    disposition: EventDisposition;
    readiness: DraftReadiness;
    eventCount: number;
    events: ExpectedEvent[];
    warningCodes: string[];
    ignoredRoles: string[];
  };
}

interface ExpectedEvent {
  eventKey: string;
  candidates: ExpectedCandidate[];
}

interface ExpectedCandidate {
  field: MarketFormField | 'warning_only';
  status: CandidateStatus;
  normalizedValue: unknown;
  reasonCode: string;
  applyPolicy: 'eligible' | 'requires_option' | 'requires_extra_confirmation' | 'never';
  evidenceTexts: string[];
  options?: Array<{
    normalizedValue: unknown;
    evidenceTexts: string[];
  }>;
}
```

為避免把 83 段文字複製成第二份容易漂移的資料，`tests/fixtures/market-text-import-gold.ts` 將已盲審的 Markdown 當作 canonical input source，載入時合併 blind pack 的 `referenceDate`／`inputText` 與 answer key 的 scenario metadata。若兩份 `inputText` 或共同 `referenceDate` 不一致，loader 立即失敗。這個 loader 只存在測試層，不會進入產品 bundle，也不包含 parser 規則。

Round A 的 expected loader 位於 `tests/fixtures/market-text-import-gold-round-a-expected.ts`。它將封存的 Reviewer B YAML 轉成結構化資料，再套用最終 adjudication：補上 `draftReadiness`、正規化 `not_present`、把多日總費改為 `per_event＋coversDates`、維持 linked location／cost choice、保留 inferable booth total，以及強制 reject 使用空 events。Reviewer 原答案不會越過裁決直接成為 Gold。

Round B 的 expected loader 位於 `tests/fixtures/market-text-import-gold-round-b-expected.ts`。它合併 Reviewer C 25 筆與 Reviewer D remainder 5 筆，再套用七項實質裁決：日期衝突、公開費率未選、可參加日期、日期／費用衝突、逐日攤型及表單日期角色。`MTI-REP-0076-P01` 原 reviewer 結果把兩行費率串成一個不存在的 evidence；executable Gold 已拆成兩個原文 span，沒有修改 `inputText`、欄位值或裁決語意。

Round C 的 expected loader 位於 `tests/fixtures/market-text-import-gold-round-c-expected.ts`。它載入 Reviewer E 30 筆並套用外部值、日期角色、費用／日期關係、金額角色、幣別、標題名稱／場地與 reject 空事件等最終裁決。`referenceDate` evidence 以獨立 source 驗證，不會被誤認為 `inputText` substring。

目前 round-specific loader 保存的是「裁決後 annotation envelope」，包含 reviewer 原有的完整欄位關係與 adjudication tags。第 2 節的 `ExpectedCandidate` 是 evaluator 的統一投影目標；建立 evaluator 時才將三輪歷史資料形狀正規化到共同 candidate comparison model，不修改原始 Gold annotation。

核心 evaluator 位於 `tests/fixtures/market-text-import-gold-evaluator.ts`，統一投影 `name`、`dates`、`location` 三個核心欄位。完整 evaluator 位於 `tests/fixtures/market-text-import-gold-full-evaluator.ts`，再加入 time、money、equipment、warning 與 linked-option projection，並按 group、candidate status、Round 與 paste scenario 產生可重現報告。兩者都只接受未來 parser adapter 產生的 actual results，不包含 parser 規則，也不讀產品 runtime。

轉換規則：

1. `inputText` 與 `referenceDate` 必須逐字等於裁決來源，不因轉檔重新排版。
2. Expected value 只採最終 adjudication；blind reviewer 原答案只作差異證據。
3. Evidence 在 executable data 先保存 exact text；載入測試時驗證它確實存在於 `inputText`，再計算 offsets。
4. `not_present` 使用 `normalizedValue: null`、空 evidence。
5. `reject` 必須 `eventCount: 0`、`events: []`。
6. 不建立 fixture 專屬 parser hint、regex 或規則名稱，避免把答案洩漏到 runtime。

## 3. 測試層級

### 3.1 Schema 與 privacy validation

- 83 個 ID 唯一，且都能回溯至 Round A／B／C 的最終裁決。
- 所有 required keys 存在；enum、日期與金額格式合法。
- evidence 必須是目前 `inputText` 的 substring；`referenceDate` evidence 另行驗證。
- canonical privacy tokens 可以存在；未遮罩 Email、電話、帳戶、識別碼、私人 URL、車牌或私人表單答案不得進入資料檔。
- Markdown answer key、blind pack 與 executable fixture 的 `inputText` 必須一致。

### 3.2 Parser contract tests

- 同一輸入與 reference date 必須得到 deterministic result。
- 結果符合 `ParsedMarketDraft` invariants。
- 不得 throw 使用者文字造成的例外；錯誤輸入回傳固定 error code。
- evidence offsets／text 必須與原始字串一致。
- `reject`、多事件、外部值、recurring、conditional schedule 與 linked options 均有對應回歸測試。

### 3.3 Merge planner tests

- 未選候選不進 patch。
- 既有值／touched field 不被靜默覆蓋。
- `dates`、`startDate`、`endDate` 原子一致。
- check-in 與營業時間不因現有 UI side effect 互相覆蓋。
- 長於 14 日的 range 沒有 extra confirmation 時不展開。
- notes 僅加入被勾選項目並去重。
- patch 永遠不包含 submit、market ID、照片設定、recurring provenance 或非 MVP 欄位。

## 4. 評估單位與指標

### 4.1 事件層

| 指標 | 定義 |
| --- | --- |
| disposition accuracy | `eventDisposition` 完全相符的比例 |
| readiness accuracy | `draftReadiness` 完全相符的比例 |
| event count accuracy | event block 數量相符的比例 |
| reject leak rate | 預期 reject 卻產生任何 event／可套用欄位的比例 |
| cross-event merge violations | 不同事件欄位被組成同一 event 的次數 |

### 4.2 欄位層

| 指標 | 定義 |
| --- | --- |
| candidate precision | parser 產生的欄位候選中，field、status、value、role 均正確的比例 |
| eligible precision | `applyPolicy: eligible` 候選的正確比例；錯填成本最高 |
| supported-field recall | 預期可支援候選被正確找出的比例 |
| unsafe apply rate | 不該套用的值被標成 eligible 的比例 |
| core false-positive rate | name／location／dates 的錯誤候選比例 |
| administrative-date leakage | 截止、公告、付款、對帳、招募期間被誤當活動日的次數 |
| option integrity | linked options 是否保留正確綁定，沒有拼出不存在組合 |
| evidence integrity | 每個非空結果是否引用正確原文 span |

### 4.3 報告切分

所有結果都必須同時提供：

- overall；
- `focused_block`；
- `focused_with_context`；
- `full_message_stress`；
- core fields／time／money／equipment／warning；
- exact／inferable／choice／conflict／unsupported；
- Round A／B／C。

不能使用 full-message stress 的較低表現來代表主要使用路徑，也不能只報 overall 掩蓋 focused path 的錯填。

## 5. 已凍結品質門檻 v1

### 5.1 Hard gates

以下任何一項失敗都不得進入 UI 整合：

- Privacy／fixture integrity：100%。
- `reject` leak：0。
- Cross-event merge violations：0。
- Administrative-date leakage：0。
- 核心欄位 unsafe apply：0。
- 既有表單值未經明確選擇被覆蓋：0。
- Evidence 指向輸入外內容：0。
- External link／附件／未貼入文字被用來補值：0。
- Linked options 遺失綁定或拼出不存在組合：0。

### 5.2 Quantitative targets

| 指標 | `focused_block` | 全部 design Gold |
| --- | ---: | ---: |
| disposition accuracy | 100% | ≥ 98% |
| event count accuracy | 100% | ≥ 98% |
| eligible precision | ≥ 99% | ≥ 98% |
| core candidate precision | ≥ 99% | ≥ 98% |
| supported-field recall | ≥ 90% | ≥ 85% |
| evidence integrity | 100% | 100% |
| linked-option integrity | 100% | 100% |
| reject detection | 100% | 100% |
| multi-event selection detection | 100% | 100% |

原則是 precision 優先於 recall。未達 recall 時可以保守留白；未達 precision 或 hard gate 時不得以「使用者最後會確認」作為放行理由。

## 6. 轉換執行順序

1. [x] 建立 input fixture loader、基本 schema validator 與 privacy scanner。
2. [x] 載入 Round A 23、Round B 30、Round C 30 筆 input envelope。
3. [x] 驗證 83 個 `inputText` 與 blind pack／answer key 來源一致，且 83 個 fixture 都有 reviewer 與 adjudication 覆蓋。
4. [x] 轉換 Round A 23 筆最終 expected outputs，並驗證 evidence／ignore span 都存在於對應 `inputText`。
5. [x] 轉換 Round B 30 筆 expected outputs，合併兩位 reviewer，並驗證 correction、choice、conflict、insufficient、reject 與所有 evidence。
6. [x] 轉換 Round C 30 筆 expected outputs，套用最終 adjudication，並分開驗證 input-text 與 reference-date evidence。
7. [x] 建立 event＋core-field evaluator；驗證 disposition、readiness、event count、核心候選、apply policy、evidence 與 hard-gate violation。
8. [x] 擴充 time／money／equipment／warning／linked-option projection，並完成 group／status／round／scenario 分組報告。
9. [x] Gate 5 已透過測試 adapter 接上 parser result；evaluator 本身仍不依賴產品 parser。

## 7. Gate 4 完成檢查

- [x] 已定義 executable fixture schema。
- [x] 已定義 schema、privacy、parser 與 merge 測試層級。
- [x] 已定義可重現的事件級、欄位級與安全指標。
- [x] 已提出 precision-first 品質門檻。
- [x] 83 筆 Gold 的 input envelope 已可由 test runner 載入。
- [x] Input schema／privacy／來源／reviewer／adjudication 一致性 test 可執行並通過。
- [x] 83 筆裁決後 expected outputs 全部可執行（Round A 23＋Round B 30＋Round C 30）。
- [x] Expected coverage 與 input-text／reference-date evidence validators 可執行並通過。
- [x] Event＋name／dates／location candidate projection、evaluator 與 round／scenario 分組報告可執行並通過。
- [x] Time／money／equipment／warning／linked-option projection 與完整欄位指標可執行並通過。
- [x] 依完成 Gate 4 的明確指示，第一版最低品質門檻已確認並凍結為 v1。

目前可執行驗證：

- `npx.cmd tsx tests/market-text-import-gold-corpus.test.ts`：83／83 input fixture、52／52 source family 通過。
- `npx.cmd tsx tests/market-text-import-gold-round-a-expected.test.ts`：Round A 23／23 expected output 與 evidence 完整性通過。
- `npx.cmd tsx tests/market-text-import-gold-round-b-expected.test.ts`：Round B 30／30 expected output、雙 reviewer 合併與 evidence 完整性通過。
- `npx.cmd tsx tests/market-text-import-gold-round-c-expected.test.ts`：Round C 30／30 expected output、裁決覆蓋與雙 evidence source 完整性通過。
- `npx.cmd tsx tests/market-text-import-gold-expected-coverage.test.ts`：83／83 expected output 全量覆蓋、ID 唯一與總分布通過。
- `npx.cmd tsx tests/market-text-import-gold-evaluator.test.ts`：83 筆完美基準與故障注入均通過；可檢出 reject leak、cross-event merge、unsafe apply、core false positive、administrative-date leakage、external evidence 與 evidence offset／text 錯誤。
- `npx.cmd tsx tests/market-text-import-gold-full-evaluator.test.ts`：完整欄位投影、group／status／round／scenario 報告與 frozen gate v1 通過；故障注入可檢出 unsafe money apply、linked-option 組合遭竄改與 equipment 漏抓。
- `npx.cmd tsx tests/market-text-import-parser-contract.test.ts`：83 筆 parser output 均符合契約、結果 deterministic、Unicode evidence offset 正確，並通過輸入限制、行政日期、時間與平台邊界測試。
- `npx.cmd tsx tests/market-text-import-parser-gold-core.test.ts`：Gate 5 核心品質門檻通過；overall candidate precision、eligible precision、disposition、event count 與 evidence 均為 100%，supported recall 94.09%，hard-gate violations 全為 0。
- `npx.cmd tsx tests/market-text-import-parser-time-gold.test.ts`：32／32 組可直接支援的營業時間正確，precision／recall 均為 100%。

Round A 裁決後的測試分布為：`single_candidate` 14、`event_selection_required` 4、`insufficient` 3、`reject` 2；`reviewable_core` 8、`partial` 6、`blocked` 9。

Round B 裁決後的測試分布為：`single_candidate` 25、`event_selection_required` 1、`insufficient` 2、`reject` 2；`reviewable_core` 6、`partial` 16、`blocked` 8。

Round C 裁決後的測試分布為：`single_candidate` 26、`event_selection_required` 1、`reject` 3；`reviewable_core` 10、`partial` 16、`blocked` 4。全體 83 筆合計為：`single_candidate` 65、`event_selection_required` 6、`insufficient` 5、`reject` 7；`reviewable_core` 24、`partial` 38、`blocked` 21。

`FROZEN_GOLD_QUALITY_THRESHOLDS_V1` 與 `assessFrozenGoldQualityGateV1` 已把第 5 節門檻固化成可執行判定。完美基準通過只證明 fixture projection、比較器、報告切分及門檻判定彼此一致；產品 parser 尚未建立，因此這個結果不能解讀為 parser 已達品質門檻。

Gate 4 已關閉，Gate 5～7 parser、預覽 UI 與安全 merge 也已完成。完整 83 筆 design Gold、merge planner、無自動送出、既有值保護與 session-only 草稿均有回歸守門；holdout 仍未讀取。
