# 市集文字匯入 Parser Contract v1

- 建立日期：2026-09-16
- 狀態：Gate 3 已完成並凍結（2026-09-16）
- 產品實作狀態：Gate 7 merge planner 與預覽 UI 已依本契約完成；Gate 8 holdout 尚未執行
- 前置決策：`docs/MARKET_TEXT_IMPORT_MVP_SCOPE_V1_2026_09_16.md`
- Gold 基準：Round A 23＋Round B 30＋Round C 30，共 83 個 research fixtures
- 跨平台規範：`docs/CROSS_PLATFORM_VIBE_CODING_GUARDRAILS.md`

## 1. 契約目標

此契約定義三個彼此分離的純邏輯階段：

```text
inputText + referenceDate
        ↓
parseMarketText（只分析）
        ↓
ParsedMarketDraft（候選、證據、選項、警告）
        ↓
buildMarketFormPatch（依使用者選擇產生原子 patch）
        ↓
現有 AddMarketForm（使用者最後確認與送出）
```

Parser 與 merge planner 不讀取 DOM、剪貼簿、儲存空間、網路、資料庫或目前時間，也不呼叫 `createMarket`。所有環境資訊都必須由呼叫端顯式傳入。

## 2. 輸入契約

```ts
interface ParseMarketTextRequest {
  inputText: string;
  referenceDate: string; // YYYY-MM-DD，呼叫端提供的使用者本地日期
  locale: 'zh-TW';
}

type ParseMarketTextResponse =
  | { ok: true; draft: ParsedMarketDraft }
  | {
      ok: false;
      error: {
        code: 'empty_input' | 'input_too_long' | 'invalid_reference_date' | 'internal_error';
      };
    };
```

凍結限制：

- `inputText` 去除首尾空白後不得為空。
- 第一版上限為 20,000 個 Unicode code points；超過時整筆拒絕分析，不截斷，避免 evidence offsets 失真。
- `referenceDate` 必須是有效的 `YYYY-MM-DD`，parser 內不得呼叫 `Date.now()`。
- 正式產品預設使用分析當下的使用者本地日期；測試與研究 fixture 可顯式提供歷史日期。
- Parser 不知道文字來自 Gmail、網站、附件或社群；它只處理使用者實際貼入的字串。
- 不開啟網址、不讀附件、不讀 Gmail 主旨，也不從外部內容補值。

## 3. 正規化與 evidence

Parser 同時保留原始字串與工作用正規化視圖：

1. 換行統一為 `\n`。
2. 搜尋與比對可正規化全形數字、常見冒號、波浪號、破折號與重複空白。
3. 不對整段文字直接做無法還原 offset 的破壞性重寫。
4. 每個 normalized token 必須能映射回原始 `inputText` 的 code-point offset。
5. 每個非空候選、option、warning 與 ignore span 都必須引用原始 evidence；`not_present` 例外，不製造不存在的 evidence。

```ts
interface EvidenceSpan {
  id: string;
  source: 'input_text' | 'reference_date';
  start: number | null; // input_text 使用 code-point offset
  end: number | null;   // exclusive
  text: string;
}
```

`reference_date` evidence 的 `start`／`end` 為 `null`；其他 evidence 的 `text` 必須等於原始輸入對應 slice。

## 4. 核心輸出型別

```ts
type CandidateStatus =
  | 'exact'
  | 'inferable'
  | 'choice_required'
  | 'conflict'
  | 'not_present'
  | 'unsupported'
  | 'ignore';

type EventDisposition =
  | 'single_candidate'
  | 'event_selection_required'
  | 'insufficient'
  | 'reject';

type DraftReadiness = 'reviewable_core' | 'partial' | 'blocked';

type MarketFormField =
  | 'name'
  | 'location'
  | 'dates'
  | 'earlyEntryTime'
  | 'checkInTime'
  | 'operatingStartTime'
  | 'operatingEndTime'
  | 'boothCost'
  | 'deposit'
  | 'commissionRate'
  | 'tableRental'
  | 'chairRental'
  | 'umbrellaRental'
  | 'tableFree'
  | 'chairFree'
  | 'umbrellaFree'
  | 'notes';

interface FieldCandidate<T> {
  id: string;
  field: MarketFormField | 'warning_only';
  status: CandidateStatus;
  value: T | null;
  evidenceIds: string[];
  reasonCode: string;
  applyPolicy: 'eligible' | 'requires_option' | 'requires_extra_confirmation' | 'never';
  options?: CandidateOption<T>[];
}

interface CandidateOption<T> {
  id: string;
  value: T;
  evidenceIds: string[];
  linkedCandidateIds: string[];
}

interface ParsedMarketDraft {
  schemaVersion: 1;
  disposition: EventDisposition;
  readiness: DraftReadiness;
  events: ParsedMarketEvent[];
  evidence: EvidenceSpan[];
  warnings: ParseWarning[];
  ignoreSpans: IgnoreSpan[];
  sensitiveSpans: SensitiveSpan[];
}

interface ParsedMarketEvent {
  id: string;
  label: string;
  candidateIds: string[];
  candidates: FieldCandidate<unknown>[];
}
```

必要不變條件：

- `reject` 必須輸出 `events: []`。
- `event_selection_required` 必須有至少兩個 event blocks，且不同 event 的候選不得合併。
- `single_candidate` 必須只有一個 event block。
- `choice_required` 必須提供至少兩個合法 options，或提供一組需要使用者選定的日期／方案集合。
- `conflict` 必須包含至少兩個互相衝突的 evidence／options。
- `not_present` 的 `value` 為 `null` 且不建立虛構 evidence。
- `unsupported` 可以保存結構化 value 供預覽，但 `applyPolicy` 必須為 `never`。

## 5. 結構化值

### 5.1 日期

```ts
type ParsedDateValue =
  | { kind: 'selected_dates'; dates: string[] }
  | { kind: 'continuous_range'; start: string; end: string; dayCount: number }
  | { kind: 'multiple_ranges'; ranges: Array<{ start: string; end: string }> }
  | { kind: 'recurrence'; rawRule: string };
```

- `selected_dates` 及明示、角色確定的 range 可成為候選。
- 14 日以內的 range 可直接展開成預覽日期陣列；超過 14 日時 `applyPolicy` 為 `requires_extra_confirmation`。
- `recurrence` 與條件不明的多範圍保留為 `unsupported`，不得展開。
- activity range 與 selected dates 分開；外部表單中的 selected dates 為 `unsupported`＋`null`。

### 5.2 時間

```ts
type ParsedTimeValue =
  | { kind: 'single'; start?: string; end?: string }
  | { kind: 'per_date'; entries: Array<{ date: string; start?: string; end?: string }> }
  | { kind: 'conditional'; entries: Array<{ condition: string; start?: string; end?: string }> }
  | { kind: 'window'; start: string; end: string };
```

- 只有單一營業／報到／提前進場時間可對應現有單值欄位。
- `per_date`、`conditional` 及時間窗保留為 `unsupported` 或 notes 候選。
- 相對時間只有在唯一絕對基準、單一偏移量、不跨日且結果合法時可標 `inferable`。

### 5.3 金額

```ts
type MoneyRole =
  | 'selected_booth_total'
  | 'published_booth_price'
  | 'registration_fee'
  | 'deposit'
  | 'equipment_total'
  | 'equipment_unit_price'
  | 'power_fee'
  | 'payment_total'
  | 'payment_received'
  | 'payment_due'
  | 'refund'
  | 'other';

interface ParsedMoneyValue {
  amount: number;
  currency: 'TWD' | null;
  currencyStatus: 'exact' | 'inferable' | 'unknown';
  role: MoneyRole;
  unit: 'per_event' | 'per_day' | 'per_item' | 'percent' | 'unknown';
  quantity?: number;
  coversDates?: string[];
}
```

- `payment_total`、`payment_received` 與 `payment_due` 不得映射為 `boothCost`。
- 僅有 `selected_booth_total` 且 currency 為 TWD exact／inferable 時可成為 `boothCost` 候選。
- 單價、數量與總額可以同時保存，但算式吻合不證明方案已選。
- 只有「元」且沒有明確台灣場景時，currency 為 `null`／`unknown`。

### 5.4 設備與 notes

```ts
type EquipmentProvision =
  | 'included_free'
  | 'provided_unknown_price'
  | 'rentable'
  | 'selected_rental'
  | 'self_provided'
  | 'not_provided'
  | 'forbidden';

interface ParsedEquipmentValue {
  type: 'table' | 'chair' | 'umbrella' | 'tent' | 'power' | 'other';
  provision: EquipmentProvision;
  quantity?: number;
  money?: ParsedMoneyValue;
  detail?: string;
}
```

- 只有 `included_free` 可候選勾選 table／chair／umbrella free。
- 只有 `selected_rental` 且有整場總額可候選填入設備租金。
- 其他狀態各自產生逐項 notes／warning 候選，不得合併成「免費提供」。

## 6. Warning、ignore 與敏感內容

```ts
interface ParseWarning {
  id: string;
  code:
    | 'event_selection_required'
    | 'choice_required'
    | 'core_conflict'
    | 'external_value_unavailable'
    | 'conditional_schedule_unsupported'
    | 'date_range_confirmation_required'
    | 'currency_unknown'
    | 'fee_date_mapping_unknown'
    | 'private_content_detected'
    | 'unsupported_field';
  severity: 'info' | 'warning' | 'blocking';
  field?: MarketFormField;
  evidenceIds: string[];
  params?: Record<string, string | number>;
}

interface IgnoreSpan {
  evidenceId: string;
  reasonCode: string;
}

interface SensitiveSpan {
  evidenceId: string;
  category: 'email' | 'phone_or_contact' | 'bank_account' | 'identifier' | 'private_url' | 'private_answer';
}
```

Shared core 回傳穩定 code 與參數；顯示文字由 UI／localization 層產生。敏感 span 可留在使用者本機原始文字視圖，但不得進 notes、telemetry、market payload 或永久記錄。

## 7. 表單 merge contract

```ts
interface MarketFormSnapshot {
  name: string;
  location: string;
  dates: string[];
  startDate: string;
  endDate: string;
  earlyEntryEnabled: boolean;
  earlyEntryTime: string;
  checkInTime: string;
  operatingStartTime: string;
  operatingEndTime: string;
  boothCost: number;
  deposit: number;
  commissionRate: number;
  tableRental: number;
  chairRental: number;
  umbrellaRental: number;
  tableFree: boolean;
  chairFree: boolean;
  umbrellaFree: boolean;
  notes: string;
}

interface MergeConflict {
  field: MarketFormField;
  candidateId: string;
  currentValue: unknown;
  candidateValue: unknown;
  reason: 'existing_value' | 'touched_field' | 'incompatible_selection';
}

interface BuildMarketFormPatchRequest {
  draft: ParsedMarketDraft;
  selectedEventId: string;
  selectedCandidateIds: string[];
  selectedOptionIds: string[];
  selectedNoteCandidateIds: string[];
  confirmedLongRangeCandidateIds: string[];
  explicitOverwriteFields: MarketFormField[];
  current: {
    values: MarketFormSnapshot;
    touchedFields: MarketFormField[];
  };
}

interface MarketFormPatchPlan {
  patch: Partial<MarketFormSnapshot>;
  derived: Array<'startDate' | 'endDate' | 'earlyEntryEnabled'>;
  conflicts: MergeConflict[];
  skippedCandidateIds: string[];
}
```

Merge 規則：

1. Planner 是純函式，只回傳 patch plan，不直接修改 React state。
2. 只有已選 event 的候選可進入 patch；未選 event、`reject`、`insufficient` 一律無 patch。
3. `exact`／允許的 `inferable` 可套用；`choice_required` 必須有合法 option；長範圍必須有二次確認 ID。
4. 表單欄位已被使用者碰觸或已有非預設值時，預設產生 conflict，不覆蓋；只有欄位列在 `explicitOverwriteFields` 時才能替換。
5. `0` 可能是預設值也可能是使用者明確輸入，因此 UI 必須提供 `touchedFields`，不能只靠值判斷。
6. `dates` 套用後，在同一 patch 內由最終日期陣列衍生 `startDate`／`endDate`。
7. `earlyEntryTime` 套用時同一 patch 設定 `earlyEntryEnabled: true`。
8. `checkInTime`、營業開始與營業結束由最終選擇一次合併；不得經現有單欄 change handler 觸發預設值後覆蓋其他已解析時間。
9. notes 依解析順序去重後附加；若既有 notes 非空，保留原文並以換行分隔。每個 notes 項目都需使用者勾選。
10. `salesPhotoEvidenceRequired`、recurring provenance、舊版 `startTime`／`endTime` 與未列入 MVP 的隱藏欄位永遠不出現在 patch。
11. 產生 patch 不等於送出；UI 套用後仍必須通過既有驗證並由使用者按下「建立市集」。

## 8. 暫存與資料生命週期

```ts
interface MarketTextImportDraftEnvelope {
  schemaVersion: 1;
  ownerScopeKey: string;
  rawInputText: string;
  analysis: ParsedMarketDraft | null;
  selectionState: Record<string, boolean | string>;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

interface TemporaryDraftPort {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

生命週期凍結如下：

- `TemporaryDraftPort` 屬平台能力；未來實作放在 `lib/platform` contract／adapter，shared parser 不得匯入 adapter。
- Web adapter 可沿用目前 session-scoped 草稿語意；未來 Capacitor adapter 可用相等的本機暫存能力，不需要改寫 parser 或 merge planner。
- key 必須使用登入帳號 scope；不同帳號不得讀取彼此草稿。
- TTL 固定 30 分鐘，每次有效編輯更新 `updatedAt`／`expiresAt`。
- 建立成功、明確捨棄、登出、帳號切換或過期時清除。
- adapter 不可用或寫入失敗時降級為記憶體，不得阻止分析；UI 顯示「此段內容不會在中斷後保留」。
- 原始文字、evidence、候選值與選項不得同步雲端、進 Dexie market/event tables、錯誤回報內容或 telemetry。
- 允許的 telemetry 僅限 schema version、輸入長度 bucket、事件／warning／status 數量、reason codes、執行時間與成功／錯誤 code；不得包含原文、substring、金額、日期、地點或名稱。

## 9. Gold coverage 檢查

| Gold 行為 | 契約表達方式 |
| --- | --- |
| 單一完整事件 | `single_candidate`＋單一 event＋eligible candidates |
| 核心欄位缺漏 | `partial`＋`not_present` candidates |
| 多活動 | `event_selection_required`＋多個 event blocks |
| 取消、撤回、未錄取、非市集 | `reject`＋`events: []`＋ignore spans |
| 日期缺年／民國年 | `inferable`＋reference-date evidence／固定曆法 reason code |
| 可報但未選日期 | `choice_required`＋date options |
| 外部表單中的值 | `unsupported`＋`null`＋`external_value_unavailable` |
| recurring 或長／多範圍 | structured date value＋`unsupported` 或額外確認 |
| 每日／條件式時間 | `per_date`／`conditional`＋`unsupported` |
| 多攤型與綁定方案 | linked `CandidateOption`，不拆散欄位關係 |
| 逐日費用與付款天數 | money `coversDates`／warning；未知 mapping 不猜測 |
| 已收、應付、總額、攤位費 | 獨立 `MoneyRole` |
| 設備包含、可租、自備、不提供、禁止 | 獨立 `EquipmentProvision` |
| 更正、引用與核心衝突 | evidence-backed candidate／conflict／ignore boundaries |
| 隱私 token 或疑似私人內容 | `SensitiveSpan`＋不得持久化到正式資料 |

上述結構覆蓋 Round A／B／C 已裁決類型，不需要為單一 fixture 新增臨時欄位。Gate 4 已將 83 筆轉成可執行資料；Gate 5 的 parser output 也已逐筆通過本契約驗證器。

## 10. Gate 3 完成檢查

- [x] 已定義輸入、上限、reference date 與錯誤結果。
- [x] 已定義 event、candidate、evidence、option、warning、ignore 與 sensitive span。
- [x] 已定義日期、時間、金額與設備的結構化值。
- [x] 已定義不覆蓋既有草稿的原子 merge policy。
- [x] 已處理 `dates` 邊界衍生與目前 check-in side effect 的順序風險。
- [x] 已凍結本機暫存、TTL、帳號隔離、清除與 telemetry 邊界。
- [x] Shared core 不依賴 browser／device API，平台能力另設 port。
- [x] 契約可表達 83 筆 Gold 的已知行為類型，不需臨時欄位。

Gate 3 契約凍結維持不變；Gate 4～7 已依序完成。Gate 7 的 merge planner 僅接受 `eligible` 或已有明確 option 的 `requires_option` 候選；UI 顯示 evidence、衝突與不支援狀態，且不會自動送出。下一步為 Gate 8 保留盲測。
