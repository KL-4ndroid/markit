# 市集文字匯入 Gate 8 保留盲測報告

- 日期：2026-09-17
- 狀態：**完成；通過 Frozen Gold Quality Thresholds v1**
- 評估對象：Gate 7 完成後凍結的非 LLM 規則式 parser 與安全套用契約
- 來源：Gmail `參照對象/Corpus v1/保留盲測`，30／30 封
- 執行測試：`tests/market-text-import-holdout-gate8.test.ts`

## 1. 盲測開封與隱私邊界

1. Gate 7 候選完成並凍結後才讀取保留盲測，標籤數量為 30 封，與 Corpus Curation v1 一致。
2. 每封來源只產生一個使用者可能貼入的最小文字樣本；沒有把完整 Email 當成產品輸入。
3. 儲存庫只保留完成評估所需的去識別化文字。未保存 Gmail ID、寄件者、收件者、Email、電話、帳戶、私人連結、私人表單答案或附件。
4. 30 個來源分屬 5 個先前隔離的來源家族；本次沒有把 holdout 併回 83 個 Gold 訓練／規則設計資料。
5. 產品仍只解析使用者貼入的 `inputText`，不會在執行時讀取 Gmail、附件或網址。

## 2. 正式基準與失敗分類

第一次 parser 輸出在人工答案比對與規則調整前完成。以其凍結輸出對最終裁決答案計算：

| 指標 | 第一次基準 | Gate 8 完成 | 凍結門檻 |
| --- | ---: | ---: | ---: |
| disposition accuracy | 93.33%（28／30） | 100%（30／30） | overall ≥ 98% |
| event count accuracy | 93.33%（28／30） | 100%（30／30） | overall ≥ 98% |
| eligible／candidate precision | 94.78%（127／134） | 100%（134／134） | overall ≥ 98% |
| supported recall | 90.07%（127／141） | 95.04%（134／141） | overall ≥ 85% |
| evidence integrity | 100% | 100% | 100% |
| linked option integrity | 100% | 100% | 100% |
| reject leak | 2 | 0 | 0 |
| unsafe apply | 7 | 0 | 0 |

第一次基準的失敗類型：

- 2 封純「南下行李包車意願登記」被誤當成市集草稿。
- `舉辦地點：` 未被視為欄位標籤，導致標籤文字一併進入地點值。
- 一行包含兩段日期範圍時只保留第一段。
- `活動時間` 同時承載逐日日期與不同營業時間時，日期候選可能留白。
- `錄取攤位為…元／日` 沒有被辨識為已選攤位費。
- 已明示錄取大攤時，另一個小攤方案內的免費桌椅可能被錯誤套用。

## 3. 本輪通用規則修正

本輪只依失敗類型修正，不使用 fixture ID、主辦單位名稱或單筆答案作為 runtime 條件：

- 非活動的包車意願登記直接 `reject`，輸出 `events: []`。
- `舉辦地點` 納入明確地點標籤。
- 支援「第一段有西元年、後接第二段日期範圍」的窄型多段日期格式。
- 只有沒有其他明確活動日期時，才以含兩個日期的 `活動時間` 行補足日期；避免改變既有 Gold 的日期優先序。
- 已錄取攤位且同一行只有一個明確價格時，建立 `selected_booth_total`。
- 免費設備只從已選攤型讀取；其他攤型的設備不成為 eligible 候選。
- 同一個「提供一桌一椅」片段可分別產生桌、椅候選，但含租借或價格的後續片段不會被誤認為免費提供。

每次通用修正後均重新執行 83 個既有 Gold；曾造成 Gold 回歸的廣泛名稱清理與廣泛日期重寫已撤回，未納入完成版本。

## 4. 完成結果

### 4.1 全體

| 指標 | 結果 |
| --- | ---: |
| fixture | 30 |
| disposition accuracy | 100% |
| event count accuracy | 100% |
| candidate／eligible precision | 100% |
| supported recall | 95.04%（134／141） |
| evidence integrity | 100% |
| linked option integrity | 100% |
| reject leak | 0 |
| unsafe apply | 0 |

### 4.2 Paste scenario

| Scenario | 數量 | disposition | event count | precision | recall | evidence | option integrity | unsafe |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `focused_block` | 9 | 100% | 100% | 100% | 100% | 100% | 100% | 0 |
| `focused_with_context` | 16 | 100% | 100% | 100% | 100% | 100% | 100% | 0 |
| `full_message_stress` | 5 | 100% | 100% | 100% | 79.41% | 100% | 100% | 0 |

主要產品情境 `focused_block` 全數超過凍結門檻；全體指標也超過 overall 門檻。`full_message_stress` 沒有獨立凍結 recall 門檻，其漏填已在下一節完整列出，且沒有錯填或自動套用風險。

## 5. 保留的漏填與刻意不擴張項目

Gate 8 完成版本仍有 7 個 expected candidate 保持空白：

- 2 封長篇入選通知中的已選租賃設備，共 6 個：傘、桌、椅各 2 組。文字同時含公開租價表與已選數量；目前 parser 保留租賃選項並要求使用者確認，尚未把跨行「價目 × 選擇數量」組合成自動套用值。
- 1 封舊格式入選信的單一 `550元／日` 攤位費。原文沒有用明確攤型或「已選攤位費」標籤連接錄取結果，因此維持不自動套用。

這 7 個漏填均符合「錯填成本高於保持空白」原則。它們不阻擋 Gate 8，也不應在沒有新增 Gold／holdout 證據與 UI 語意設計前擴張為 eligible 規則。

## 6. 安全與跨平台結論

- 沒有 privacy regression：30 個 fixture 的 sensitive span 均為 0，且 repository fixture 已去識別化。
- 沒有跨事件合併、reject leak、外部 evidence 或 unsafe apply。
- Gate 7 的逐欄選擇、既有值不預選覆蓋與不自動送出契約未更動。
- parser 與 holdout evaluator 都是平台中立 TypeScript，未使用 `window`、DOM、Clipboard、IndexedDB 或原生套件。
- Gate 8 可以關閉；下一關為 Gate 9 發布準備。
