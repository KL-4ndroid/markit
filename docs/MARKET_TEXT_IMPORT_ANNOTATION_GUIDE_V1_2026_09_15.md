# 市集文字匯入 Annotation Guide v1

- 日期：2026-09-15
- 狀態：Round A 23、Round B 30、Round C 30 個 fixture 均已完成獨立複核與裁決；合計 83 個 Gold research fixtures
- 適用範圍：`參照對象/Corpus v1/代表樣本` 與後續歧義、負面、盲測組
- 原始資料政策：Gmail 原文不得直接寫入儲存庫
- 盲審包：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_V1_2026_09_15.md`
- Reviewer B 結果：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_B_V1_2026_09_15.md`
- 裁決工作表：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_V1_2026_09_15.md`
- Round B 候選：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ROUND_B_V1_2026_09_15.md`
- Round B 盲審包：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_B_V1_2026_09_15.md`
- Round B 裁決追蹤：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_ROUND_B_V1_2026_09_15.md`
- Round B Reviewer C 結果：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_C_ROUND_B_V1_2026_09_15.md`
- Round B Reviewer D 補審：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_D_ROUND_B_REMAINDER_V1_2026_09_16.md`
- Round C 候選：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ROUND_C_V1_2026_09_16.md`
- Round C 盲審規範：`docs/MARKET_TEXT_IMPORT_BLIND_REVIEWER_GUIDE_ROUND_C_V1_2026_09_16.md`
- Round C 盲審包：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_C_V1_2026_09_16.md`
- Round C Reviewer E 結果：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_E_ROUND_C_V1_2026_09_16.md`
- Round C 裁決追蹤：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_ROUND_C_V1_2026_09_16.md`

## 1. 標註目的

標註的目的不是要求每段文字都有唯一答案，而是建立以下可驗證事實：

- 一段使用者實際貼上的文字包含幾個可建立的市集事件。
- 哪些文字屬於市集名稱、日期、時間、地點、費用、設備或備註。
- 日期、時間與金額扮演什麼角色。
- 哪些值可以安全帶入表單。
- 哪些值必須讓使用者選擇。
- 哪些內容必須忽略或只保留為備註候選。

## 2. 標註單位

### 2.1 Source sample

一封經選樣的 Gmail 郵件。Source sample 是研究來源，不等於 parser 的一次輸入；它只存在 Gmail，儲存庫不保存 Gmail ID。

### 2.2 Paste sample

一段經去識別化、能精確代表使用者貼入文字框內容的文字。這是 parser fixture 與產品品質評估的主要單位。

一個 source sample 可以產生零個、一個或多個 paste sample。第一版使用以下情境分類：

| `pasteScenario` | 定義 | 用途 |
| --- | --- | --- |
| `focused_block` | 使用者判讀後，只選取一段連續的「招募資訊／活動資訊／報名資訊」區塊 | 主要成功路徑 |
| `focused_with_context` | 主要資訊區塊連同鄰近期限、付款、規則或說明一併貼入 | 驗證角色判定與忽略規則 |
| `full_message_stress` | 整封可見正文、長篇轉寄或多活動內容 | 防禦性壓力案例，不代表預設使用行為 |

第一版暫定使用者一次選取並貼上一段連續文字；非連續多段自行拼接，必須先有真實使用證據才納入主要支援範圍。

文字原本出現在 Email 正文、使用者開啟的附件、表單頁、網站、社群或通訊軟體都不影響 parser。只要使用者已將可見文字複製到文字框，它就是一般 `inputText`；產品不會自行讀取附件、圖片、連結或其他外部來源。

### 2.3 Event block

一個可以獨立成為「新增市集」草稿的活動區塊。一封郵件可以有零個、一個或多個 event block。

以下情況必須分成不同 event block：

- 不同市集名稱。
- 不同地點且不是同一市集的多日場次。
- 同一電子報中的不同招募活動。
- 寄售、快閃店與實體市集並列，但產品目前只處理市集時。

相同名稱、相同地點但有多個不連續日期，可以是同一 event block 的 `eventDates[]`。

### 2.4 Evidence span

支持一個欄位判斷的最小原文片段。每個非空正確答案至少要有一個 evidence span。不得只依郵件主旨或標註者記憶填寫答案而沒有證據。

`inputText` 的邊界完全以 paste sample 實際保留的文字為準。Gmail 主旨、寄件時間或附件文字若未被使用者選取，就不能成為 parser 正確答案；若使用者確實將其中的可見文字一併貼入，它就與其他一般輸入文字相同。

## 3. Fixture 識別與分組

去識別化後才建立 ID。來源郵件與產品輸入 fixture 必須分開識別：

```text
MTI-REP-0001       來源樣本
MTI-REP-0001-P01   該來源衍生的第一個 paste sample
MTI-REP-0001-P02   該來源衍生的第二個 paste sample
```

既有 `MTI-REP-0001` 至 `MTI-REP-0060` 暫時保留為 `sourceSampleId`，不宣稱是最終 parser fixture。`fixtureId` 必須指向一個確定的 paste sample。ID 不得包含 Gmail ID、寄件者、主辦名稱、活動日期或其他可反查個人的內容。

分組定義：

- `representative`：用於建立與調整規則。
- `ambiguity`：用於定義衝突、候選選擇及不自動填入政策。
- `negative`：用於驗證拒絕、忽略或只產生警告。
- `holdout`：版本凍結前不得用於規則設計。

## 4. 去識別化規則

### 4.1 必須替換

| 原始內容 | 取代 token |
| --- | --- |
| 個人姓名 | `[PERSON_NAME]` |
| 使用者提交的品牌名稱 | `[BRAND_NAME]` |
| 個人或品牌 Email | `[EMAIL]` |
| 電話與 LINE ID | `[PHONE_OR_CONTACT]` |
| 私人地址 | `[PRIVATE_ADDRESS]` |
| 主辦簽名檔地址 | `[ORGANIZER_ADDRESS]` |
| 私人表單文字答案 | `[PRIVATE_FORM_ANSWER]` |
| 私人優惠碼或推薦碼 | `[PROMO_CODE]` |
| 銀行名稱與帳戶 | `[BANK_ACCOUNT]` |
| 身分證、統編、訂單及付款編號 | `[IDENTIFIER]` |
| 私人表單編輯連結 | `[PRIVATE_FORM_URL]` |
| 一般報名連結 | `[REGISTRATION_URL]` |
| 地圖連結 | `[MAP_URL]` |
| 社群追蹤與退訂連結 | `[SOCIAL_OR_TRACKING_URL]` |
| 簽名檔與與解析無關的公司資料 | 移除並記錄為 omitted segment |

Canonical token 用於確保新 fixture 一致。若既有 fixture 使用其他 `[PRIVATE_*]` placeholder，且可證明原值已完全移除，可通過 privacy review，但必須記錄 `noncanonical_privacy_tokens`；後續新 fixture 不得沿用 alias。

### 4.2 可以保留

- 公開市集名稱。
- 公開場館、城市與活動地點。
- 活動日期與時間。
- 公開攤位費、設備費、電力費與規則。
- 支援解析所需的符號、空格、換行與表情圖示。

若公開內容仍可能識別個人報名選擇，應改寫成等價的合成值。測試重點是格式與語意，不是保存真實品牌決策。

### 4.3 最小化原則

- 只保留完成測試所需的區塊。
- 長篇品牌介紹、行銷文案、銀行資訊、完整信件往來及收件名單不進入 fixture。
- 若只需測試日期與時間，使用最小可保留上下文，不複製整封郵件。
- 若格式本身受著作權保護，應改寫內容並保留結構特徵。

## 5. 欄位狀態

### 5.1 欄位狀態

每個欄位使用下列狀態之一：

| 狀態 | 定義 | 自動填入資格 |
| --- | --- | --- |
| `exact` | 原文提供唯一且格式合法的答案 | 可成為高信心候選 |
| `inferable` | 可用明確政策推定，例如參考日期補年 | 必須標示推定來源 |
| `choice_required` | 原文提供多個合法選項，需使用者選擇 | 不可直接填入單一值 |
| `conflict` | 原文對同一欄位提供互相矛盾的值 | 不可自動填入 |
| `not_present` | 原文沒有該資訊 | 保持空白 |
| `unsupported` | 原文有資訊，但目前表單或 MVP 無法表達 | 顯示警告或備註候選 |
| `ignore` | 原文值不是新增市集欄位，例如繳費截止日 | 不得填入 |

Annotator 不直接標記 parser 的 `high/medium/low` 信心。信心是規則引擎根據 evidence 與政策產生的輸出；人工標註只描述正確答案及安全行為。

### 5.2 `eventDisposition`

`eventDisposition` 只描述輸入中可辨識的事件數量與阻止原因，不等於草稿是否完整：

| 值 | 判定門檻 |
| --- | --- |
| `single_candidate` | 有且只有一個可辨識的市集事件，即使名稱、日期或地點仍有缺漏 |
| `event_selection_required` | 有兩個以上不可合併的市集事件或場次，必須先由使用者選擇 |
| `insufficient` | 只有提醒、設備回答、品牌回答或零散欄位，無法綁定成可辨識的活動發生事件 |
| `reject` | 目前文字明確為取消、未錄取、非市集內容或其他不應建立事件的語意 |

只有活動名稱而沒有活動日期或地點的提醒信，通常為 `insufficient`；有活動日期與地點但缺名稱的資訊區塊，可以是 `single_candidate`，但 `draftReadiness` 必須為 `partial`。

### 5.3 `draftReadiness`

`draftReadiness` 與 `eventDisposition` 分開標記：

| 值 | 判定門檻 |
| --- | --- |
| `reviewable_core` | 單一事件具有唯一的名稱、至少一個活動日期與唯一地點，核心欄位沒有衝突；仍只代表可進入人工預覽，不代表可送出 |
| `partial` | 可辨識單一事件，但名稱、活動日期或地點至少一項缺漏、需選擇或不支援 |
| `blocked` | 多事件未選、資訊不足、明確拒絕，或核心欄位存在衝突 |

無論 `draftReadiness` 為何，解析流程都不得自動送出。

## 6. 市集識別欄位

### 6.1 `marketName`

- 保留公開活動名稱。
- 系列名稱與單場名稱同時存在時，記錄兩者並標示首選顯示名稱。
- 宣傳標語不可當成市集名稱。
- 一封信有多個市場名稱時，應先切 event block。

### 6.2 `location`

- 場館、廣場、樓層與入口資訊可組成一個 location candidate。
- 郵件簽名檔地址不是活動地點，應標為 `ignore`。
- 只有地圖連結而沒有文字地點時，MVP 不解析連結內容，標為 `unsupported`。
- 同一活動有主場地與報到處時，分別標記語意角色。
- 地點只明確到城市時，可以保存為 `exact` 的文字證據，但 `draftReadiness` 維持 `partial`。
- 地點與攤位費方案綁定時，`location` 為 `choice_required`；每個選項同時保存地點、費用與相關設備，不得把多個地點壓成一個已選值。

## 7. 日期欄位

每個日期證據必須先標記角色：

| 日期角色 | 說明 | 是否填入 `dates` |
| --- | --- | --- |
| `event_date` | 市集實際舉辦日期 | 是 |
| `registration_deadline` | 報名截止 | 否 |
| `payment_deadline` | 繳費截止 | 否 |
| `confirmation_deadline` | 回覆或確認出席截止 | 否 |
| `announcement_date` | 入選公布或通知日期 | 否 |
| `setup_date` | 進場或搭建日期 | 視是否與 event date 相同，不直接加入 |
| `refund_date` | 退款處理日期 | 否 |
| `message_date` | 郵件寄送時間 | 僅作 `referenceDate` |

正規化規則：

- 明確日期轉為 `YYYY-MM-DD`。
- 不連續日期保留為陣列，不擅自補成整段日期區間。
- `12/12-12/13` 若年份明確，展開為兩日。
- 缺年日期使用 fixture 的 `referenceDate` 評估是否可推定。
- 若星期與年月日不一致，標為 `conflict` 並保留兩項證據。
- `每週六日` 屬 recurring 描述，第一版標為 `unsupported`，不得任意生成日期。

## 8. 時間欄位

每個時間先標記角色：

| 時間角色 | 對應表單欄位 |
| --- | --- |
| `vendor_early_entry` | `earlyEntryTime` |
| `vendor_check_in` | `checkInTime` |
| `operation_start` | `operatingStartTime` |
| `operation_end` | `operatingEndTime` |
| `visitor_entry` | 不直接套用，除非原文同時明確等同營業開始 |
| `setup_window` | 通常為備註或候選，不直接拆成報到時間 |
| `teardown_time` | 備註候選，不等於營業結束 |
| `deadline_time` | `ignore` |

正規化規則：

- 統一為 24 小時制 `HH:mm`。
- `下午 2 點` 正規化為 `14:00`。
- `22:00–01:00` 保留跨午夜語意。
- 同一活動依星期提供不同營業時間時，現有單一時間欄位無法完整表達，標為 `unsupported` 或 `choice_required`。
- 不使用現有表單的報到時間推算功能補寫人工正確答案；只有原文明確值才標為 exact。

## 9. 費用欄位

每個金額先標記角色：

| 費用角色 | 處理方式 |
| --- | --- |
| `selected_booth_cost` | 使用者已明確選擇時，可對應 `boothCost` |
| `booth_option` | 多攤型方案，必須 `choice_required` |
| `registration_fee` | 目前新增表單沒有可見欄位，標為 `unsupported` |
| `deposit` | 對應 `deposit`，退還條件另進備註候選 |
| `commission_rate` | 對應 `commissionRate` |
| `equipment_unit_price` | 記錄設備類型、單價、單位及數量需求 |
| `equipment_total` | 只有原文明確總額才可作為總價候選 |
| `power_option` | 目前沒有獨立電力欄位，標為 `unsupported` 或備註候選 |
| `refund_amount` | `ignore` |
| `invoice_amount` | `ignore` |
| `payment_total` | 不等於 booth cost，除非原文明確說明組成 |

正規化規則：

- 幣別預設不得只依中文內容猜測；原文為 `元` 且場景明確為台灣時，可記錄 `TWD` 並註明推定。
- `2,000 元／日` 必須保留 `per_day` 單位。
- 多日總價不得在缺少參與日數時自行計算。
- `含桌椅` 不代表設備原價為零；它代表設備包含在方案內。
- 同時有多個攤型時，不得選第一個、最低價或最高價。

## 10. 設備與備註

### 10.1 設備

設備證據至少記錄：

- 類型：桌、椅、傘、帳篷、電力、插座、照明等。
- 提供狀態：包含、免費、可租、必須自備、禁止使用。
- 數量。
- 尺寸。
- 單價與計價單位。
- 適用攤型。

`提供一桌兩椅`、`可租一桌兩椅` 與 `不含桌椅` 是三種不同狀態，不得共用同一規則結果。

### 10.2 備註候選

以下內容可以成為備註候選，但不應無條件把全文塞入 `notes`：

- 進場動線與卸貨規則。
- 用電、瓦斯、發電機與防火要求。
- 停車與車輛限制。
- 攤位尺寸與陳列規範。
- 餐飲、垃圾與清潔規定。
- 保證金退還條件。

## 11. 多市集與多方案

### 11.1 多市集

- 先切 event block，再解析欄位。
- 共用主辦規定可記錄為 source-level notes，但套用前應顯示給使用者確認。
- 不得把不同市集的日期、地點與價格合併成一份草稿。

### 11.2 多方案

例如同時出現餐車、餐飲、手作與選品價格時：

- 建立 `booth_option[]`。
- 每個 option 保留名稱、價格、單位、設備包含狀態及 evidence。
- `boothCost` 標為 `choice_required`。
- 若郵件是使用者已完成的表單回覆，而且明確顯示選擇項目，才另外標記 `selected_booth_cost`。

## 12. 建議的標註紀錄形狀

此例只是研究資料格式，不是正式 runtime contract：

```yaml
sourceSampleId: MTI-REP-0001
fixtureId: MTI-REP-0001-P01
split: representative
pasteScenario: focused_block
selectionRationale: 使用者選取單一招募資訊區塊
referenceDate: 2026-01-15
privacyReview: pending
sourceKind: form-response
inputText: |
  經去識別化的最小必要文字
events:
  - eventBlock: 1
    marketName:
      status: exact
      value: 範例市集
      evidence: 市集名稱：範例市集
    eventDates:
      status: exact
      value:
        - 2026-02-07
        - 2026-02-08
      evidence: 日期：2026/2/7-2/8
    paymentDeadline:
      status: ignore
      value: 2026-01-20
      evidence: 請於 1/20 前完成繳費
    boothCost:
      status: choice_required
      options:
        - label: 手作攤位
          amount: 1000
          currency: TWD
          unit: per_day
warnings:
  - 多種攤位方案，需由使用者選擇
omittedSegments:
  - bank-account
  - signature
```

## 13. 標註流程

1. 僅從對應 Gmail 子標籤取一封來源郵件。
2. 確認是否與已稽核來源實質重複。
3. 依 `focused_block`、`focused_with_context` 或 `full_message_stress` 定義實際 paste sample 邊界。
4. 記錄 `sourceSampleId`、`pasteScenario` 與選取理由。
5. 先去識別化，再為每個 paste sample 建立 fixture ID。
6. 只根據該 fixture 的 `inputText` 切分 event block。
7. 標記欄位、角色、正規化值、evidence 與安全狀態。
8. 記錄應忽略及目前不支援的內容。
9. 執行人工隱私複核。
10. 第二位複核者只依去識別化 `inputText` 重新判斷。
11. 不一致項目進入 adjudication，不以多數決直接掩蓋歧義。

## 14. Annotation Pass 1 完成門檻

- 先用 10 至 15 封已稽核來源完成 Paste Scenario Calibration，並凍結選取政策。
- 代表性 paste sample 均有明確 `pasteScenario`、選取邊界與選取理由。
- 每個非空欄位都有 evidence。
- 個資與私人連結均完成取代。
- 活動日、報名截止、繳費截止及通知日期均有角色標記。
- 多方案沒有被強迫壓成單一 booth cost。
- 至少抽查 20% 樣本進行第二次獨立複核。
- 複核差異均有決策記錄。
- 根據結果更新正式支援與不支援格式清單。
- 同一來源衍生的所有 paste sample 必須留在相同資料分組，避免 train／holdout 洩漏。
- 尚未查看保留盲測郵件的具體內容。

達成以上條件後，才可以把人工確認資料稱為第一版 Gold dataset，並開始撰寫解析器的正式技術規格。

## 15. Pass 1 校準補充規則

前 60 份來源郵件稽核揭露下列需要納入後續標註的防禦性情況。這些規則仍有價值，但不能用來假設使用者預設會貼入整封郵件：

- 正文目前段落與引用／轉寄的舊段落指向不同活動時，欄位標為 `conflict`，不得任選其一。Gmail 主旨本身不屬預設 `inputText`。
- 引用舊信、舊活動資訊或轉寄內容時，先辨識引用邊界；若無法證明同一事件，不得把欄位合併。
- 「金額／設備詳見附件」只代表目前 paste sample 未包含該值，不得把附件檔名或推測值當成答案；若使用者另行開啟附件並貼入可見文字，則依該段文字正常解析。
- 民國年可依固定曆法轉換成西元年，但狀態維持 `inferable`，並保存原始日期 evidence。
- 每日不同營業時間、報到時間窗及進場時間窗不可壓成現有單一時間欄位。
- 郵件簽名檔或主辦聯絡地址一律不是活動地點，除非活動資訊區塊明確重複標示。
- 一行式表單回覆必須先切成 question／answer，再對 answer-side 執行個資辨識；不得因整行同時包含公開活動資訊與個資就保存整行。
- 地點、攤型、設備與費用互相綁定時，應標為同一結構化 option，不可各自選第一個值。
- 一封電子報包含多個市集時，先切 event block；寄售、合作店與店面快閃進駐不屬單次市集草稿。

本輪標註紀錄位於 `docs/MARKET_TEXT_IMPORT_ANNOTATION_PASS_1_2026_09_15.md`。

## 16. Round A 獨立複核裁決

Reviewer B 在未查看 Reviewer A 答案、來源 Gmail 或研究結論文件的情況下，完成 23 個 fixture 盲審。隱私判斷 23／23 通過；`eventDisposition` 與 Reviewer A 的安全意圖 23／23 一致。欄位層級差異依下列政策裁決：

1. 系列名稱與單場名稱同時存在時，研究答案採 `preferredDisplayName`、`seriesName`／`organizerOrSeries`、`occurrenceName`；runtime 型別仍待正式規格決定。
2. 每日不同時間、日期相依子場地及 recurring 描述可保留結構化原始值，但欄位狀態維持 `unsupported`，不可套入現有單值欄位。
3. 地點與攤位費綁定時，地點及費用都為 `choice_required`，並保留同一 option 關係。
4. 金額數字與費用角色可以是 `exact`，但只由「元」及台灣場地推得的 TWD 必須另記 `currencyStatus: inferable`。
5. 多日總費使用標準 `unit: per_event`，另以 `coversDates` 或 evidence 表示涵蓋日期，不建立 `per_3_day_event` 等臨時單位。
6. 只有「設備：歐帳、桌、椅」而未說明提供方式時，採 `provisionStatus: unknown`／`unsupported`，不得標為已包含。
7. 表單同時列出設備價目與已選答案時，可保留未選項為 `rentable_not_selected`，但只有已選項可以成為套用候選。
8. 付款算式中的未命名金額若只能透過排除設備費與保證金判斷為攤位費，狀態為 `inferable`，不是 `exact`。
9. recurring 日期保留 range 與 recurrence evidence，狀態為 `unsupported`，第一版不自動展開。
10. 明確取消、未錄取或非市集內容使用 `events: []`；原文相關片段保留在 `ignoreSpans`，不得建立全欄位 `ignore` 的假事件。

完整逐筆結果與裁決位於：

- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_B_V1_2026_09_15.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_V1_2026_09_15.md`

## 17. Round B 獨立複核裁決

Reviewer set C／D 在隔離條件下合計完成 Round B 30 個 fixture：Reviewer C 封存前 25 筆，Reviewer D 使用只含缺漏 5 筆的精確 remainder pack 補審。30／30 privacy pass；裁決後採用以下補充規則：

1. `eventDisposition` 描述可辨識事件數量，不等於已證明符合產品的市集分類。唯一具名活動已有日期與地點時可為 `single_candidate`；市場性質不明、核心衝突或資訊不足另由 warning 與 `draftReadiness` 表達。
2. 更正值只有在新值、被取代值及兩者關係明確分層時才可優先。若同一目前區塊仍出現對同一核心欄位的不同值，維持 `conflict`，不得因「調整」二字靜默覆蓋。
3. 費用元件相加等於總額只能驗證算式，不能單獨證明某公開攤型或方案已被使用者選取；selected 必須有明示表單回答、錄取方案或同等 evidence。
4. 「可參加場次」「可報名日期」是 `choice_required`；「已選參加日」「本次錄取日」才可作日期套用候選。核心日期尚未選擇時為 `partial`，核心日期互相衝突時為 `blocked`。
5. 不同日期綁定不同攤位型態、子場地、時間或設備時，保留日期相依結構與 evidence，狀態為 `unsupported`；不得拆成多事件，也不得壓成單一欄位值。
6. 「報名日期」若位於已提交或已收到的具名市集表單內，且上下文清楚指向多個未來參與日，可標為 `inferable` 的活動日期；不能標 `exact`，並須在預覽揭露推定。
7. 既有 `[PRIVATE_*]` alias 若已完全遮罩原值可 privacy pass，但新 fixture 必須使用第 4.1 節 canonical token。

完整 Reviewer 結果與逐筆裁決位於：

- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_C_ROUND_B_V1_2026_09_15.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_D_ROUND_B_REMAINDER_V1_2026_09_16.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_ROUND_B_V1_2026_09_15.md`

## 18. Paste Sample Selection Policy v1

Round A 後凍結以下選取政策：

1. 主要 fixture 單位是使用者一次實際貼入的完整文字，不是來源 Email。
2. 第一版主要模擬單一連續選取；人工拼接多個不連續區塊不列為主要成功路徑。
3. `focused_block` 優先保存使用者判讀後選取的單一活動資訊。
4. `focused_with_context` 包含鄰近截止、付款、規則或說明，用來驗證語意角色與忽略行為。
5. `full_message_stress` 只作少量防禦性案例；它的成功率不得代表主要使用流程。
6. fixture 的 `inputText` 必須是未來送入 parser 的完整字串；不能依來源主旨、附件或被省略段落補答案。
7. 同一來源衍生的所有 paste sample 必須留在相同資料 split。
8. 公開欄位可用去識別化原文片段；含私人回答或長篇文案時使用結構等價合成文字。
9. 正式代表資料暫以約 65% `focused_block`、25% `focused_with_context`、10% `full_message_stress` 作平衡起點；比例仍可依未來實際貼上行為調整。

## 19. Round C 獨立複核裁決

Reviewer E 在只讀凍結 Blind Reviewer Guide 與 Round C Blind Review Pack 的隔離條件下完成 30／30。Privacy 30／30 pass；裁決後分布為 `single_candidate` 26、`event_selection_required` 1、`reject` 3，以及 `reviewable_core` 10、`partial` 16、`blocked` 4。

Round C 新增以下通用規則：

1. 文字若只說某欄位值「請見外部表單／公告」，該值不在目前 `inputText`。為區分一般缺漏，該欄位標 `unsupported`、值為空，另保留外部參照 evidence；不得開啟連結或把活動整體範圍代替實際入選日。
2. `招募期間`、`報名期間` 一律不是活動日。即使日期格式完整，也必須 `ignore`；若沒有其他活動日期，`dates` 為 `not_present`。
3. 唯一名稱與地點下的相接日期範圍保留為同一事件的日期結構，不切成多事件。若文字明示為活動「日期區間」，可依固定缺年政策推定年份；條件式時間 `unsupported` 不會單獨把 core 降為 `partial`。
4. 錄取活動日與付款／租借天數屬不同角色。付款天數較少只使費用對日期的 mapping 為 `unsupported`；除非文字明示取代、更正或否定活動日，否則不形成核心日期 `conflict`。
5. 金額、金額角色與幣別分開標記。缺少台灣場地或明示幣別時，只看到「元」仍保持 currency unknown；台灣場地加「元」最多使 TWD 為 `inferable`。
6. 已收款與應付款是不同付款角色，不因數字不同形成同欄 `conflict`；短付或溢付以 warning 呈現。
7. 費用總額與數量算式吻合，仍不能單獨證明攤型已選。沒有明示選擇時，公開攤型費率維持 `choice_required`。
8. 目前文字只有唯一場次稱呼時，可直接作 `eventName: exact`，不得依常識補正式名稱。`名稱｜唯一場域` 的標題格式在沒有其他地點候選時，可用分隔符後文字作 `location: exact`。

裁決沒有修改任何 `referenceDate` 或 `inputText`，因此不需重新盲審。Round C 30 筆列為 Gold representative subset Round C v1；Round A＋B＋C 合計 83 個 Gold research fixtures，但尚未轉成 runtime fixture，也不構成產品實作授權。
