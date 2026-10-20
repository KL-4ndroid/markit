# 市集文字匯入 Corpus Curation v1

- 日期：2026-09-15
- 狀態：代表來源稽核 100／100；Round A 23、Round B 30、Round C 30 個均已完成獨立複核與裁決，合計 83 個 Gold research fixtures
- 產品實作狀態：未核准、未開始
- 原始資料位置：Gmail 使用者標籤；原文未匯出至儲存庫
- 主研究文件：`docs/MARKET_TEXT_IMPORT_DISCOVERY_RECORD_2026_09_15.md`
- 執行計畫：`docs/MARKET_TEXT_IMPORT_EXECUTION_PLAN_2026_09_16.md`
- MVP 支援範圍：`docs/MARKET_TEXT_IMPORT_MVP_SCOPE_V1_2026_09_16.md`
- Parser contract：`docs/MARKET_TEXT_IMPORT_PARSER_CONTRACT_V1_2026_09_16.md`
- Gold test plan：`docs/MARKET_TEXT_IMPORT_GOLD_TEST_PLAN_V1_2026_09_16.md`
- 標註規範：`docs/MARKET_TEXT_IMPORT_ANNOTATION_GUIDE_V1_2026_09_15.md`
- 校準 fixture：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_CALIBRATION_V1_2026_09_15.md`
- 盲審包：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_V1_2026_09_15.md`
- Reviewer B 結果：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_B_V1_2026_09_15.md`
- 裁決工作表：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_V1_2026_09_15.md`
- Round B 候選：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ROUND_B_V1_2026_09_15.md`
- Round B 盲審包：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_B_V1_2026_09_15.md`
- Round B 裁決追蹤：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_ROUND_B_V1_2026_09_15.md`
- Round B Reviewer C 結果：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_C_ROUND_B_V1_2026_09_15.md`
- Round B Reviewer D 補審：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_D_ROUND_B_REMAINDER_V1_2026_09_16.md`
- Round C 候選：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ROUND_C_V1_2026_09_16.md`
- Round C 盲審包：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_C_V1_2026_09_16.md`
- Round C Reviewer E 結果：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_E_ROUND_C_V1_2026_09_16.md`
- Round C 裁決追蹤：`docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_ROUND_C_V1_2026_09_16.md`

## 1. 目的

Corpus Curation v1 的目的，是把 Gmail 中可參考的市集郵件整理成可人工標註、可分組驗證且不洩漏原始資料的研究來源池。來源郵件本身不等於產品輸入；真正的 parser fixture 必須對應使用者實際貼上的文字片段。

本階段不訓練模型、不建立解析器、不修改新增市集畫面，也不把 Gmail 內容同步到產品資料庫。此處的「訓練資料」是規則設計、測試 fixture、歧義研究與盲測的參照來源。

## 2. Gmail 來源盤點

### 2.1 完整搜尋範圍

- `市集` 標籤：1,458 封郵件、1,239 個討論串。
- 初步符合參照條件：819 封郵件、711 個討論串。
- 第一批負面案例另選 30 封並加入參照範圍。
- `參照對象` 標籤在本輪完成後：849 封郵件、741 個討論串。

初步參照條件要求郵件具備招募、報名、表單回覆、錄取或同等市集語境，並包含日期、時間、地點、費用、設備等可研究欄位。只含取消、退款、發票、入帳、請假或一般操作通知者，除非刻意選為負面案例，否則不納入正向參照池。

### 2.2 初步參照池分布

以下是 819 封初步參照郵件的啟發式盤點，不是人工確認的正確標註：

| 項目 | 數量 |
| --- | ---: |
| 不重複討論串 | 711 |
| 寄件來源家族 | 96 |
| 標題模板家族 | 542 |
| 日期線索 | 804 |
| 時間線索 | 702 |
| 地點線索 | 478 |
| 費用線索 | 624 |
| 設備／用電線索 | 505 |
| 明確資訊區塊標題候選 | 374 |
| 表單回覆候選 | 434 |
| 多市集候選 | 467 |
| 多價格候選 | 333 |
| 活動日與截止日並存候選 | 303 |
| 日期缺年候選 | 215 |
| 多種時間角色候選 | 257 |
| 特殊符號／空格排版候選 | 174 |

「候選」只代表規則偵測到值得人工查看的特徵，不代表該郵件一定屬於該類。最終數量必須以去識別化後的人工標註為準。

### 2.3 時間分布

| 郵件年份 | 數量 |
| --- | ---: |
| 2018–2020 | 164 |
| 2021–2023 | 305 |
| 2024–2026 | 350 |

舊郵件的缺年日期不能直接用 2026 年現在時間解析。建立 fixture 時，必須保存匿名化的 `referenceDate`，以模擬郵件當時被貼入 App 的情境。

## 3. Corpus v1 分組結果

第一批共選出 200 封郵件。四組之間沒有重複郵件，且每封屬於不同討論串。

| 分組 | Gmail 子標籤 | 數量 | 用途 |
| --- | --- | ---: | --- |
| 代表樣本 | `參照對象/Corpus v1/代表樣本` | 100 | 建立標註規範與第一版支援範圍 |
| 歧義案例 | `參照對象/Corpus v1/歧義案例` | 40 | 研究多市集、多價格、截止日與時間角色衝突 |
| 負面案例 | `參照對象/Corpus v1/負面案例` | 30 | 驗證不應誤填的取消、退款、發票與操作通知 |
| 保留盲測 | `參照對象/Corpus v1/保留盲測` | 30 | 規則完成前不得用於規則設計或調整 |

### 3.1 代表樣本

- 100 封郵件。
- 100 個討論串。
- 100 個標題模板家族。
- 77 個寄件來源家族。
- 年份配額：2018–2020 為 20 封、2021–2023 為 35 封、2024–2026 為 45 封。

| 欄位線索 | 數量 |
| --- | ---: |
| 日期 | 99 |
| 時間 | 85 |
| 地點 | 67 |
| 費用 | 71 |
| 設備／用電 | 45 |

此組用於建立第一版人工答案與規則需求，不代表所有郵件都能完整自動填入。

### 3.2 歧義案例

- 40 封郵件。
- 40 個討論串。
- 40 個標題模板家族。
- 23 個寄件來源家族。

同一封郵件可同時具有多種歧義，因此下列數量會重疊：

| 歧義線索 | 數量 |
| --- | ---: |
| 多市集候選 | 32 |
| 多價格候選 | 23 |
| 活動日與截止日並存 | 24 |
| 日期缺年 | 19 |
| 多種時間角色 | 25 |
| 特殊符號／空格排版 | 17 |

此組的目的不是要求第一版全部自動解析，而是定義何時必須停下並要求使用者選擇。

### 3.3 負面案例

30 封負面案例均為不同討論串及不同標題模板：

| 類型 | 數量 |
| --- | ---: |
| 取消／退款／延期 | 6 |
| 付款／入帳／發票 | 6 |
| 行前與營運通知 | 6 |
| 調查與非新增市集用途 | 6 |
| 請假、異動或其他資料作業 | 5 |
| 其他邊界案例 | 1 |

負面案例可能同樣含有日期、時間、地點或金額。它們用來驗證解析器不會因看到格式線索，就把退款日期、發票金額或繳費期限填入新增市集。

### 3.4 保留盲測

- 30 封郵件。
- 30 個討論串。
- 30 個標題模板家族。
- 5 個完整隔離的寄件／主辦來源家族。
- 盲測來源家族沒有任何郵件進入代表樣本或歧義案例。

| 欄位線索 | 數量 |
| --- | ---: |
| 日期 | 30 |
| 時間 | 28 |
| 地點 | 30 |
| 費用 | 18 |
| 設備／用電 | 19 |

盲測組不可在規則設計期間逐封查看、複製內容或針對結果新增專用規則。只有當一個候選版本凍結後，才可統一執行評估。

## 4. 去重與隔離方法

選樣使用以下研究規則：

1. 同一 Gmail 討論串最多選一封。
2. 移除回覆／轉寄前綴、年月日與流水數字後，近似標題歸為同一模板家族。
3. 代表樣本及歧義案例不重複標題模板。
4. 代表樣本限制單一寄件來源的樣本數，避免大型主辦或表單平台主導資料集。
5. 盲測以寄件／主辦來源家族整體隔離，不使用隨機逐封切分。
6. 負面案例依操作語意分層抽樣，不只抽取完全沒有市集資訊的簡單負例。

目前的自動去重只用於選樣，不能取代人工確認。郵件可能使用不同標題但引用相同內文，人工標註時仍需再檢查內容重複。

## 5. 隱私與資料保存邊界

### 5.1 已執行

- 郵件原文保留在 Gmail。
- 儲存庫文件只記錄統計、方法與 Gmail 標籤名稱。
- 儲存庫未寫入 Gmail message ID、thread ID、寄件者、收件者或郵件全文。
- 未下載附件。
- 未把郵件內容送往產品 API、資料庫、分析服務或 LLM runtime。

### 5.2 建立 fixture 前必須執行

- 移除收件者與寄件者 Email。
- 移除姓名、電話、銀行、帳戶、統編、訂單編號及私人識別碼。
- 公開活動名稱、日期、地點與市集規則只有在測試必要時保留。
- URL 預設替換為用途 token，例如 `[REGISTRATION_URL]`、`[MAP_URL]`。
- 只保留驗證解析規則所需的最小片段。
- 每個 fixture 必須通過人工隱私複核後，才可寫入儲存庫。

100 封代表來源皆已建立去識別化稽核紀錄。這些紀錄可保留作選取 paste sample、發現格式與建立壓力案例之用，但不能計為 100 份產品輸入 fixture。Round A 的 23 筆、Round B 的 30 筆與 Round C 的 30 筆已完成獨立複核與裁決，合計 83 個 Gold research fixtures；完整 Corpus 仍未轉成可執行 runtime dataset。

## 6. 下一步：Annotation Pass 1

下一個研究工作是讓資料單位對齊實際使用行為，不是產品實作：

1. 先暫停直接稽核 `MTI-REP-0061` 至 `MTI-REP-0080`，避免沿用錯誤輸入單位；Round A 裁決完成後已依 Paste Sample Selection Policy v1 恢復並完成來源稽核。
2. 從已稽核的 60 封來源中選 12 封，涵蓋完整資訊、附近雜訊、多活動、引用舊文、取消／未錄取與外部附件等情況。此項已完成。
3. 為每封建立一至三個真實貼上情境：`focused_block`、`focused_with_context`、`full_message_stress`。此項已完成 Round A 校準。
4. 每個 paste sample 分別記錄精確 `inputText`、選取理由、event block、欄位 evidence、正規化值與安全行為。此項已完成 Round A 校準。
5. 比較同一來源在「使用者已先判讀」與「整封正文」下的差異，凍結 Paste Sample Selection Policy v1。此項已完成。
6. 校準通過後，再依新規範完成其餘來源並建立正式 fixture。
7. 負面案例用於驗證拒絕與警告行為；同一來源的所有衍生樣本必須留在相同 split。
8. 盲測組保持封存，直到第一個解析候選版本凍結。

2026-09-16 進度：`MTI-REP-0001` 至 `MTI-REP-0100` 已完成第一位標註者的來源郵件稽核。Round A 23、Round B 30、Round C 30 個 `inputText` 均已完成獨立盲審與裁決，共 83 個 Gold research fixtures；下一步是凍結 MVP 支援範圍、解析契約與可執行測試資料。

## 7. Corpus v1 完成條件

### 已完成

- 完整盤點 `市集` 標籤。
- 建立正向參照池。
- 建立 200 份第一批分層樣本。
- 建立 Gmail 子標籤。
- 驗證四組沒有重複郵件。
- 驗證盲測來源家族沒有洩漏到規則設計組。
- 建立去識別化與標註規範文件。

### 已完成的來源稽核

- 郵件層級事件與風險稽核：100／100。
- 郵件層級去識別化摘要：100／100。
- 郵件層級欄位候選與安全行為：100／100。

### 已完成的方法校準

- Paste Scenario Calibration：12 封來源已建立 23 個 `inputText`，Reviewer B 已完成 23／23 筆獨立盲審。
- 產品輸入 fixture：隱私檢查 23／23 通過，`eventDisposition` 安全意圖 23／23 一致，差異均已裁決。
- Gold 狀態：Round A 23 個列為 Gold calibration subset v1；Round B 30 個與 Round C 30 個分別列為 Gold representative subset，合計 83 個已裁決研究 fixture。它們尚未轉成 runtime 測試檔，也不能用來宣稱 parser 品質達標。
- Round B：Reviewer C 封存前 25 筆、Reviewer D 隔離補審 5 筆；30／30 privacy pass，所有差異已裁決，且沒有改動 `inputText` 或要求重審。
- Round C：`MTI-REP-0081` 至 `0100` 的 20 個 `focused_block`、7 個 `focused_with_context`、3 個 `full_message_stress` 已由 Reviewer E 完成 30／30 隔離盲審與裁決；privacy 全數通過，沒有修改 `inputText` 或重審需求。
- 情境比例：暫以約 65% `focused_block`、25% `focused_with_context`、10% `full_message_stress` 作資料平衡起點，不作產品承諾，也不為湊比例製造不自然樣本。

### 尚未完成

- 郵件內文人工去重。
- 其餘已稽核來源的精確 paste sample 建立與重新編號。
- 所有代表來源的 paste sample 建立與重新編號。
- 後續正式 fixture 的第二位複核者一致性檢查。
- 83 筆 Gold 的 executable fixture 全量轉換與資料完整性測試。
- 品質門檻最終確認與 Gate 8 保留盲測執行。

因此目前仍不得把 Corpus v1 視為可直接執行測試的 Gold dataset，也不構成產品實作授權。
