# 市集文字匯入功能執行計畫

- 建立日期：2026-09-16
- 狀態：執行中
- 最終目標：在不接入 LLM 的前提下，讓使用者貼上市集資訊，系統以可解釋規則產生欄位候選，經使用者確認後套用至「新增市集」表單，最後仍由使用者自行送出
- 產品實作狀態：Gate 8 保留盲測已完成並通過凍結門檻；待 Gate 9 發布準備
- 主研究紀錄：`docs/MARKET_TEXT_IMPORT_DISCOVERY_RECORD_2026_09_15.md`
- 標註規範：`docs/MARKET_TEXT_IMPORT_ANNOTATION_GUIDE_V1_2026_09_15.md`
- MVP 支援範圍：`docs/MARKET_TEXT_IMPORT_MVP_SCOPE_V1_2026_09_16.md`
- Parser contract：`docs/MARKET_TEXT_IMPORT_PARSER_CONTRACT_V1_2026_09_16.md`
- Gold test plan：`docs/MARKET_TEXT_IMPORT_GOLD_TEST_PLAN_V1_2026_09_16.md`

## 1. 執行原則

1. 實際產品輸入單位是使用者一次貼入的 `inputText`，不是來源 Email。
2. 規則式 parser 必須可解釋；每個候選值保留 evidence、狀態與警告。
3. `exact` 與安全的 `inferable` 才能成為套用候選；`choice_required`、`conflict`、`unsupported` 必須先由使用者處理。
4. 不覆蓋表單既有值，不自動送出，不從附件、網址、Gmail 主旨或未貼入內容補值。
5. 共享解析核心保持平台中立；瀏覽器或未來裝置能力放在 `lib/platform` 邊界。
6. 每一關必須有可驗證完成門檻；未過關不提前擴張到下一層功能。

## 2. 執行順序與完成門檻

### Gate 1 — 完成 Round C 獨立盲審與裁決

狀態：**已完成（2026-09-16）**

工作：

- 由全新隔離 reviewer 只讀 Round C Blind Review Pack 與凍結指南。
- 完成 30／30 privacy、event disposition、draft readiness 與欄位判讀。
- 封存 reviewer 結果後，由 adjudicator 比較 answer key 與獨立答案。
- 回寫必要政策；若修改 `inputText`，該筆必須重新盲審。

完成門檻：

- 30／30 fixture 有獨立答案。
- 30／30 privacy 有明確結果。
- 所有實質差異都有 evidence-based 裁決。
- 通過者才升級為 Gold；更新 Gold 數量與研究文件。

### Gate 2 — 凍結 MVP 支援範圍

狀態：**已完成（2026-09-16）**

工作：

- 對照現有「新增市集」表單，建立欄位支援矩陣。
- 將欄位分成：第一版支援、只顯示備註／警告、刻意不支援。
- 決定多活動、日期相依時間、逐日費用、設備方案及 recurring 排程的第一版行為。
- 凍結不自動送出、不覆蓋既有欄位及人工確認流程。

完成門檻：

- 每個現有表單欄位都有明確解析政策。
- 所有 `unsupported` 類型都有 UI 呈現方式。
- 沒有依附件、外部網址或隱藏欄位補值的需求。

### Gate 3 — 凍結解析契約與資料生命週期

狀態：**已完成（2026-09-16）**

工作：

- 定義平台中立的 `ParsedMarketDraft`、欄位 candidate、evidence、warning、option 與 conflict 結構。
- 定義 parser 輸入限制、文字正規化、日期參考值與錯誤結果。
- 定義套用到既有表單時的 merge policy。
- 決定原始貼上文字是否只存在記憶體、是否進草稿，以及不得記錄原文的 telemetry 邊界。

完成門檻：

- 型別與契約能表達所有 Gold fixtures，不需臨時欄位。
- 共用核心不依賴 `window`、DOM、IndexedDB 或其他瀏覽器 API。
- 既有表單內容永遠需要明確使用者操作才會被替換。

### Gate 4 — 建立可執行 Gold 測試與品質門檻

狀態：**已完成（2026-09-16）**

工作：

- 將裁決後 fixture 轉成可執行 JSON／TypeScript 測試資料。
- 建立欄位級正確率、錯填率、留白率、衝突檢出率與拒絕率指標。
- 對 focused、context、stress 分開報告，不用 full-message stress 代表主要流程。
- 明確設定「錯填成本高於保持空白」。

完成門檻：

- 每個 Gold fixture 都可由測試 runner 執行。
- 指標計算可重現，且不含保留盲測答案。
- 第一版最低品質門檻獲得確認。

### Gate 5 — Parser Slice 1：核心欄位

狀態：**已完成（2026-09-16）**

範圍：

- 純文字正規化與 event block 切分。
- 市集名稱、活動日期、營業時間與地點。
- 行政日期／時間排除。
- `exact`、`inferable`、`not_present`、`conflict` 與基本 warning。

完成門檻：

- 對應 Gold 測試通過。
- parser 為純函式或平台中立模組。
- 不修改 UI、不套用表單、不新增雲端寫入。

### Gate 6 — Parser Slice 2：費用、設備與複雜關係

狀態：**已完成（2026-09-16）**

範圍：

- 攤位費、總額、保證金、設備費與付款角色分離。
- 多攤型 linked options。
- included、rentable、self-provided、not-provided、forbidden 設備狀態。
- 日期相依時間／費用及 `unsupported` 結構。
- 更正、引用、取消、撤回、非市集與長期零售拒絕。

完成門檻：

- 複雜 fixture 不產生不存在的欄位組合。
- 公開價目不會被誤標為已選方案。
- 所有 reject 案例輸出 `events: []`。

### Gate 7 — 預覽 UI 與表單安全合併

狀態：**已完成（2026-09-17）**

工作：

- 新增貼上文字框與「分析」動作。
- 顯示候選值、原文 evidence、推定、選項、衝突與不支援提示。
- 讓使用者逐欄選擇是否套用。
- 與現有新增市集草稿保存機制整合，避免切頁、重整或角色重新驗證造成輸入遺失。
- 套用後仍停留在表單，由使用者自行送出。

完成門檻：

- 不自動送出、不靜默覆蓋既有值。
- 鍵盤與行動裝置可完成整個確認流程。
- Web UI 不把瀏覽器假設帶入共享 parser。

### Gate 8 — 保留盲測與迭代

狀態：**已完成（2026-09-17）**

工作：

- 對封存盲測執行一次正式評估。
- 按欄位與 scenario 報告錯填、漏填、衝突及拒絕結果。
- 只針對失敗類型修規則，不以讀取單筆答案方式硬編碼。

完成門檻：

- 達成 Gate 4 凍結的品質門檻。
- 沒有 privacy regression、跨事件合併或自動送出風險。
- 失敗案例與刻意不支援範圍已記錄。

### Gate 9 — 發布準備

狀態：**待 Gate 8**

工作：

- 完整建置、回歸、可及性及響應式驗證。
- 驗證原始貼上文字與 telemetry 的隱私邊界。
- 檢查共享核心的 iOS／Android 可攜性。
- 決定漸進開放、失敗回退與使用者說明。

完成門檻：

- Web 流程可安全使用。
- 沒有要求使用者信任未揭露推定的欄位。
- 未引入原生套件或原生專案；任何原生工作仍受既有 Gate 2 限制。

## 3. 當前進度

| 項目 | 目前狀態 |
| --- | --- |
| 代表來源稽核 | 100／100 完成 |
| 精確 paste fixtures | Round A 23＋Round B 30＋Round C 30，共 83 個 |
| 已裁決 Gold fixtures | 83 個（Round A 23＋Round B 30＋Round C 30） |
| 待獨立複核 | 0 個（目前代表 fixture 範圍內） |
| 產品規格 | MVP 支援範圍、parser contract、Gold test plan 與品質門檻 v1 已凍結 |
| Gold executable inputs | 83／83 可載入；52／52 來源家族；完整性與 privacy guardrail 通過 |
| Gold expected outputs | 83／83 完成；Round A、B、C 全數通過 evidence／裁決完整性測試 |
| Gold evaluator | Event、core、time、money、equipment、warning、linked option 全部完成；支援 group／status／round／scenario 報告 |
| Parser 實作 | Gate 5～6 完成；Gate 8 依 holdout 失敗類型完成保守迭代，83 個 Gold 零回歸 |
| UI 實作 | Gate 7 完成：貼上、預覽、逐欄選取、安全合併與使用者自行送出 |
| 保留盲測 | 30／30 完成；precision 100%、supported recall 95.04%、hard-zero 指標全數為 0 |

## 4. 本次開始執行的工作

- [x] 建立本執行計畫與 Gate 順序。
- [x] 建立 Round C answer key、blind pack、凍結 reviewer guide 與 adjudication worksheet。
- [x] 啟動全新隔離 Reviewer E 執行 Round C 30／30 盲審。
- [x] Reviewer E 結果封存。
- [x] Round C 差異裁決。
- [x] 更新 Gold 數量為 83 並關閉 Gate 1。
- [x] 啟動 Gate 2，完成現有表單欄位盤點與 MVP 支援矩陣草案。
- [x] 以保守、可逆預設確認 Gate 2 五項選擇並凍結支援範圍。
- [x] 完成 Gate 3 平台中立 parser contract、原子 merge 與資料生命週期。
- [x] 啟動 Gate 4，建立 executable fixture schema、評估指標與品質門檻草案。
- [x] 建立測試專用 Gold input loader，載入 83／83 input envelope，且不複製原文成第二份資料。
- [x] 完成 input schema、privacy、answer／blind pack、reviewer／adjudication 覆蓋測試。
- [x] 將 Round A 23／23 最終 expected outputs 轉成可執行資料，套用裁決並驗證所有 evidence。
- [x] 合併 Round B 兩位獨立 reviewer，將 30／30 最終 expected outputs 轉成可執行資料並驗證所有 evidence。
- [x] 將 Round C 30／30 最終 expected outputs 轉成可執行資料，分開驗證 input 與 reference-date evidence。
- [x] 建立 83／83 expected-output 全量覆蓋與總分布 guardrail。
- [x] 建立 event＋name／dates／location evaluator，支援 round／scenario 分組、draft threshold assessment 與 hard-gate 故障注入。
- [x] 擴充 time／money／equipment／warning／linked-option projection，完成完整欄位報告並凍結品質門檻 v1。
- [x] 完成 Gate 5 平台中立 Parser Slice 1、契約驗證器與 Gold adapter。
- [x] Gate 5 核心 Gold：83／83 disposition、83／83 event count、candidate／eligible precision 100%、supported recall 94.09%、evidence 100%，所有 hard gate 為 0。
- [x] Gate 5 營業時間 Gold：32／32 可直接支援時段正確，precision／recall 100%。
- [x] 完成 Gate 6 費用、設備、linked option 與拒絕規則，83 個 Gold safety guardrail 通過。
- [x] 完成 Gate 7 預覽 UI、安全 merge、桌面／390×844 與鍵盤流程驗證。
- [x] Gate 8 只在 Gate 7 候選凍結後開封 30 封 holdout，建立去識別化 inputs、人工 expected outputs 與可執行 evaluator。
- [x] Gate 8 第一次基準完成；依失敗類型修正包車拒絕、舉辦地點、多段日期、日期承載於活動時間、已選攤位費與攤型設備隔離。
- [x] Gate 8 完成：30／30 disposition 與 event count、precision 100%、recall 95.04%、evidence／option 100%，reject leak／unsafe apply 為 0。

Gate 1～8 已完成。Gate 8 的 30 封隔離來源已完成一次正式基準、失敗分類、通用規則迭代與門檻驗證；完整結果見 `docs/MARKET_TEXT_IMPORT_GATE_8_HOLDOUT_REPORT_2026_09_17.md`。剩餘 7 個漏填均保持空白或要求選擇，不會錯填。下一步是 Gate 9 發布準備。
