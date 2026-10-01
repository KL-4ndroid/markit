# 市集文字匯入功能：研究與可行性紀錄

- 建立日期：2026-09-15
- 最後更新：2026-09-16
- 狀態：研究與需求探索中，尚未核准實作
- 適用專案：Feria／BoothBook Web、未來 iOS 與 Android 共用核心
- 文件定位：持續更新的討論、證據、假設與決策紀錄，不是可直接執行的實作規格
- 執行計畫：`docs/MARKET_TEXT_IMPORT_EXECUTION_PLAN_2026_09_16.md`
- MVP 支援範圍：`docs/MARKET_TEXT_IMPORT_MVP_SCOPE_V1_2026_09_16.md`
- Parser contract：`docs/MARKET_TEXT_IMPORT_PARSER_CONTRACT_V1_2026_09_16.md`
- Gold test plan：`docs/MARKET_TEXT_IMPORT_GOLD_TEST_PLAN_V1_2026_09_16.md`

## 0. 文件使用方式

在進入實作前，本文件是此功能的主要研究紀錄。後續討論、真實範例、解析規則、UX 決策與風險評估應持續更新在這裡。

每項內容使用以下狀態，避免把假設誤當成已確認需求：

- **已確認**：由目前程式碼、產品決策或真實資料支持。
- **暫定建議**：目前較合適的方向，仍可因研究結果調整。
- **待驗證**：需要更多使用者案例、資料或技術試驗。
- **已決策**：經產品與工程討論後正式採用。
- **不採用**：曾評估但明確排除，應留下原因。

更新本文件時，至少同步修改：

1. 最後更新日期。
2. 受影響章節的狀態或內容。
3. 第 15 節的更新紀錄。
4. 若形成正式決策，記錄決策原因、影響範圍與仍未解決的問題。

## 1. 原始需求

使用者可以從網頁、社群貼文、通訊軟體或主辦單位公告複製一段市集資訊，貼到 App 內的文字框。App 在不接入 LLM 的前提下辨識重要資訊，自動帶入「新增市集」的對應欄位，最後仍由使用者自行檢查、修改與送出。

核心期望：

- 減少在不同頁面之間來回查看與逐欄輸入。
- 不要求主辦資訊使用固定格式。
- 解析錯誤不得直接建立錯誤資料。
- 使用者必須保有最後決定權。
- 不將貼上的內容傳送給 LLM 或其他文字分析服務。

## 2. 本輪初步結論

狀態：**暫定建議**

此功能技術上可行，且方向與「使用者先判讀、再選取貼上」的目標一致。建議採用「裝置端規則式解析器、欄位信心分級、衝突預覽、使用者確認」的方式完成。第一版不需要新增後端 API、Next.js Route Handler、Server Action、LLM 或外部文字分析服務。

使用者主動選取文字與啟動分析，本身就是意圖訊號，也會先濾掉大量 Email 簽名、回覆歷史與無關文案。因此主要資料與驗收單位應是實際貼上的文字片段，而不是整封來源郵件；整封郵件仍保留為少量防禦性壓力測試。

建議的核心流程：

```text
使用者閱讀來源並選取有用區塊
    ↓
貼上市集文字
    ↓
本機正規化與規則解析
    ↓
產生欄位候選、信心等級、來源片段與警告
    ↓
使用者預覽並處理衝突
    ↓
原子式套用到新增市集表單
    ↓
使用者修改、確認
    ↓
沿用既有驗證與建立市集流程
```

產品策略應優先追求高精準、可解釋與可復原，不以「盡可能填滿所有欄位」作為第一版目標。

## 3. 目前專案現況

狀態：**已確認**

### 3.1 現有新增市集流程

- `components/markets/AddMarketForm.tsx` 以 Client Component 管理新增市集表單。
- 表單資料以 `MarketCreatedPayload` 為主要資料形狀。
- 新增表單已有使用者範圍的本機草稿保存、恢復、成功送出後清除及關閉前確認。
- 表單最後呼叫既有 `createMarket(payload)`，記錄 `market_created` 事件。
- 新功能不需要另建一條建立市集寫入路徑。

### 3.2 目前可見欄位

新增市集畫面目前包含：

- 市集名稱。
- 地點。
- 一個或多個市集日期。
- 攤位費。
- 保證金。
- 營業額抽成。
- 桌子、椅子、傘具的租金或免費提供狀態。
- 提前進場、報到、開始營業、結束營業時間。
- 主辦／場地備註。

`MarketCreatedPayload` 另有部分目前未在新增表單呈現的欄位，例如 `registrationFee` 與桌巾相關欄位。第一版不得因為型別中存在這些欄位，就把解析結果暗中寫入使用者無法檢查的欄位。

### 3.3 現有驗證與表單副作用

- `lib/markets/market-form.ts` 的共用核心驗證目前主要要求名稱、地點與至少一個日期。
- 日期變更時，`AddMarketForm` 會更新 `dates`、`startDate` 與 `endDate`。
- 報到時間變更時，目前表單會推算營業開始與結束時間。
- 因此，解析結果不能單純依序模擬每個欄位的 `onChange`；套用順序可能覆蓋文字中已明確寫出的營業時間。

### 3.4 跨平台約束

- 共享解析、正規化、驗證與合併規則必須保持平台中立。
- 共享模組不得使用 `window`、`document`、`navigator`、`sessionStorage` 或 `@capacitor/*`。
- 使用者自行在 `<textarea>` 貼上文字，不需要 Clipboard API。
- 若未來新增「一鍵從剪貼簿貼上」，必須擴充 `lib/platform` 的 Clipboard port；目前介面只有 `writeText()`。
- 不得假設 Next.js Route Handler 會被打包進未來的行動 App。

### 3.5 相關現有檔案

- `components/markets/AddMarketForm.tsx`
- `components/markets/MarketFormFields.tsx`
- `lib/markets/market-form.ts`
- `types/db.ts`
- `lib/form-autosave.ts`
- `lib/platform/contracts/clipboard.ts`
- `docs/CROSS_PLATFORM_VIBE_CODING_GUARDRAILS.md`

## 4. 建議的使用者體驗

狀態：**暫定建議**

### 4.1 入口

在「新增市集」基本資料上方加入次要操作，例如「從文字快速帶入」。入口不應取代原本的手動新增流程。

### 4.2 貼上與分析

1. 開啟文字匯入對話框或底部面板。
2. 使用者將市集資訊貼入多行文字框。
3. 使用者按下「分析資訊」，或在貼上後由介面提供清楚的分析動作。
4. 分析只在裝置端執行，不顯示模糊的 AI 用語。

建議說明文字：

> 資訊只會在此裝置上分析。套用後仍可逐欄修改，系統不會自動建立市集。

### 4.3 結果預覽

預覽應顯示：

- 找到多少個欄位。
- 哪些欄位需要確認。
- 每個值是從哪一段原文判斷而來。
- 既有草稿與新辨識值的衝突。
- 未能結構化但可能重要的內容。

信心分級的初步行為：

| 等級 | 初步定義 | 預設行為 |
| --- | --- | --- |
| 高 | 有明確欄位標籤且格式合法 | 預先選取，清楚顯示來源 |
| 中 | 符合可靠格式，但語意可能有兩種解讀 | 預先選取並以警示色標示 |
| 低 | 主要依位置、標題或弱語意推測 | 不預設套用，要求使用者選擇 |
| 衝突 | 同一欄位有多個不同候選值 | 不自動決定，列出候選 |

### 4.4 套用到表單

- 預設只填入空白欄位。
- 已有內容不得直接覆蓋；應顯示「保留原值／改用辨識值」。
- 套用後，自動展開有辨識內容的「成本、設備、時間軸」區段。
- 可短暫標示剛帶入的欄位，並提供返回查看來源的方式。
- 使用者仍使用原本的「建立市集」按鈕完成送出。
- 文字解析、套用或預覽步驟均不得自動呼叫 `createMarket()`。

## 5. 欄位解析可行性

狀態：**暫定建議／待真實資料驗證**

| 目標欄位 | 初估可行性 | 高信心線索 | 主要風險 |
| --- | --- | --- | --- |
| 市集名稱 | 中 | `市集名稱：`、`活動名稱：` | 首行可能是宣傳標語或系列名稱 |
| 地點 | 高 | `地點：`、`地址：`、`會場：`、台灣地址格式 | 場館名稱、入口與完整地址可能分散在不同列 |
| 日期 | 高 | 完整年月日、有標籤的日期清單 | 缺少年份、跨年、民國年、日期與星期不一致 |
| 多個日期 | 高 | `、`、`,`、換行或明確日期區間 | 區間可能代表報名期間而非活動期間 |
| 營業起訖 | 高 | `營業時間：`、`活動時間：` 加時間區間 | 同文可能同時出現報到、營業、撤場與報名截止時間 |
| 報到／進場 | 高 | `報到：`、`進場：`、`攤商進場：` | 「開放進場」可能指消費者而非攤商 |
| 攤位費 | 高 | `攤位費：`、`攤租：` 加金額 | 單日、全期、早鳥價及不同攤型可能同時存在 |
| 保證金 | 高 | `保證金：`、`押金：` | 可退還條件應保留在備註 |
| 抽成 | 高 | `抽成：10%`、`營業額抽成` | 百分比與金額門檻可能同時存在 |
| 設備租金 | 中 | `桌租：100 元`、`椅子加租` | 單價、數量及總價目前不是分離欄位 |
| 免費設備 | 中 | `免費提供一桌兩椅`、`含桌椅` | 「可提供」不一定免費，「含」可能只適用特定攤型 |
| 備註 | 高 | 停車、用電、尺寸、垃圾、進場動線等內容 | 全文直接塞入備註會造成噪音與重複 |
| 週期排程 | 低 | `每週六日`、`每月第一週` | 目前手動新增與固定排程是不同語意，不得擅自建立 Schedule |

## 6. 初步支援格式

狀態：**待驗證**

### 6.1 日期候選

- `2026/10/03`
- `2026-10-03`
- `2026.10.03`
- `2026 年 10 月 3 日`
- `10/3`、`10 月 3 日`
- `10/3、10/4、10/10`
- `10/3 - 10/5`
- 含星期的日期，例如 `10/3（六）`

缺少年份的日期必須依傳入的 `referenceDate` 使用明確、可測試的推定政策；不得在共享解析器內隱含讀取裝置現在時間。若星期與日期不一致，應產生警告而不是靜默忽略。

### 6.2 時間候選

- `13:00–20:00`
- `13：00 至 20：00`
- `下午 1 點到晚上 8 點`
- `攤商報到 11:30`
- `進場／佈置 10:00–12:00`

無標籤的第一組時間區間只能作為中或低信心候選。跨午夜時間必須保留，例如 `22:00–01:00`。

### 6.3 費用候選

- `攤位費 NT$1,500`
- `攤租 1500 元／日`
- `兩日 2,800 元`
- `保證金 500 元，可退`
- `營業額抽成 10%`
- `免費提供一桌兩椅`
- `桌子加租 100 元／張`

若同時存在多種攤型、早鳥價、單日價與全期價，第一版應列為衝突或未決選項，不得自行選擇最便宜、最貴或第一個金額。

## 7. 建議的解析結果模型

狀態：**暫定建議，尚未定案**

以下僅記錄資料需求，不代表最終 TypeScript 命名：

```ts
type ImportConfidence = 'high' | 'medium' | 'low';

interface MarketImportCandidate<T> {
  field: string;
  value: T;
  confidence: ImportConfidence;
  sourceText: string;
  sourceRange?: { start: number; end: number };
  reason: string;
}

interface MarketTextImportResult {
  candidates: MarketImportCandidate<unknown>[];
  conflicts: Array<{
    field: string;
    candidates: MarketImportCandidate<unknown>[];
  }>;
  warnings: string[];
  unrecognizedLines: string[];
}
```

解析器不應直接回傳已可寫入資料庫的完整 `MarketCreatedPayload`，因為這會隱藏推測、衝突與來源證據。

## 8. 規則式解析策略

狀態：**暫定建議**

### 8.1 處理階段

1. 限制輸入長度，統一換行、全形標點、空白、破折號與數字格式。
2. 將文字切成保留來源位置的行與片段。
3. 先執行明確欄位標籤規則。
4. 再執行日期、時間、金額、百分比與地址格式規則。
5. 將鄰近標籤與數值配對。
6. 依規則強度計算信心，不使用不可解釋的總分。
7. 偵測同欄位的多候選值與互斥資訊。
8. 對候選值執行共享格式與範圍驗證。
9. 回傳候選、來源、衝突、警告及未辨識內容。

### 8.2 規則優先順序

初步優先順序：

1. 同一行的明確欄位標籤與數值。
2. 標籤後一行的合法數值。
3. 有明確語意的句內模式。
4. 地址、日期、時間等格式特徵。
5. 標題、首行或版面位置推測。

較低層級不得靜默覆蓋較高層級結果；若高層級本身出現多個不同值，應轉為衝突。

### 8.3 不應推測的內容

- 未明示時，不推測設備免費。
- 未明示時，不把任意金額當作攤位費。
- 不從地址反向推測市集名稱。
- 不把報名截止日期當成市集日期。
- 不把消費者入場時間當成攤商報到時間。
- 不從「每週六日」任意生成未來數週日期。
- 不從多種方案中自動選擇攤型或價格。

## 9. 表單合併與驗證政策

狀態：**暫定建議**

### 9.1 合併原則

- 預設 `fill-empty-only`，只填空白欄位。
- 現有值與辨識值不同時，建立可見衝突，不直接覆蓋。
- 日期一次合併並統一計算 `dates`、`startDate`、`endDate`。
- 明確解析出的營業時間優先於由報到時間推算的預設時間。
- 只有缺少明確營業時間時，才可詢問使用者是否採用現有預設推算。
- 免費設備為 `true` 時，相關租金應依既有表單語意歸零；有租金候選時則不得同時自動設為免費。

### 9.2 程式化套用所需驗證

目前 HTML 輸入欄位的 `min`、`max` 與 `type` 無法完整保護程式化寫入。進入實作前應定義共享驗證：

- 日期必須為存在的日曆日期並轉成 `YYYY-MM-DD`。
- 金額必須有限、非負，並明確定義是否接受小數。
- 抽成必須介於 0–100。
- 時間必須符合合法 `HH:mm`。
- 跨午夜時間應合法，但不可因字串排序誤判。
- 空字串、`NaN`、`Infinity` 與超大數值不得進入表單資料。

## 10. 隱私、安全與資料生命週期

狀態：**暫定建議**

- 原始貼文與解析結果預設只在裝置端處理。
- 不送到 LLM、第三方分析服務、遙測、錯誤回報或伺服器日誌。
- 不以 `dangerouslySetInnerHTML` 顯示貼入內容。
- URL、電話與社群帳號只視為文字，不自動開啟或執行。
- 建議限制輸入長度，例如 20,000 字；實際上限需由真實資料決定。
- 正規表示式必須保持可預測的執行時間，避免災難性回溯。
- 原始文字是否跟隨草稿保存，尚未決定；若保存，必須有明確期限、使用者範圍與清除政策。
- 本機草稿不是主要備份或復原來源，不應因此擴張成新的備份功能。

## 11. 第一版建議範圍

狀態：**暫定建議**

### 11.1 建議納入

- 單一市集文字貼上。
- 現有新增市集畫面中可見欄位。
- 明確的日期、時間、地點、費用、抽成與設備規則。
- 多個不連續日期。
- 欄位信心、來源片段、衝突與警告。
- 只填空白欄位及使用者確認覆蓋。
- 未辨識重要內容轉為備註候選，而非直接丟失。
- 純函式解析器、合併器與共享驗證的自動測試。

### 11.2 第一版不納入

- LLM 或任何生成式 AI。
- 圖片 OCR、PDF 解析或網頁爬取。
- 由網址自動抓取社群內容。
- 一次貼入多個不同市集並批次建立。
- 自動建立市集或自動送出。
- 自動建立或修改固定 Schedule。
- 地理編碼、地址校正或地圖 API。
- 根據使用者修正自動學習新規則。
- 新的雲端草稿、同步、備份或復原流程。
- 解析目前不可見的隱藏欄位並直接寫入。

## 12. 資料蒐集計畫

狀態：**代表來源稽核 100／100；Round A 23、Round B 30、Round C 30 個均已完成獨立複核與裁決，合計 83 個 Gold research fixtures**

規則式解析的品質主要取決於真實輸入樣本，而不是規則數量。目前已完整盤點 Gmail `市集` 標籤的 1,458 封郵件，建立 849 封 `參照對象` 郵件，並從中完成第一批 200 封分層選樣。這些 Email 是來源池；只有依實際選取邊界建立的 paste sample 才能成為 parser fixture。選樣與來源稽核都還不是 Gold dataset。

### 12.1 樣本應涵蓋

- Facebook、Instagram、LINE、官方網站與純文字公告。
- 完整標籤式內容及自然敘述式內容。
- 單日、多日、不連續日期與跨年資訊。
- 24 小時制、上午下午、中文時間及跨午夜。
- 單一價格、多攤型、早鳥、單日／全期價格。
- 免費設備、加租設備、設備單價與數量。
- 報名截止、繳費截止、活動日期同時出現的案例。
- 攤商進場與一般民眾入場時間同時出現的案例。
- 每週或每月固定市集描述。
- 缺欄位、重複欄位、矛盾資訊及排版混亂的案例。

### 12.2 每份樣本的建議標記

| 欄位 | 說明 |
| --- | --- |
| 樣本 ID | 使用不含來源身分的穩定編號 |
| 來源類型 | 社群、網站、通訊軟體、其他 |
| 原文特徵 | 標籤式、敘述式、混合、表情符號密集等 |
| 期望欄位 | 人工確認後的正確結構化結果 |
| 應忽略內容 | 報名截止、消費者資訊等容易誤判內容 |
| 歧義 | 無法僅從原文決定的地方 |
| 個資處理 | 已去識別化／不可納入測試 |
| 規則涵蓋狀態 | 尚未支援、已支援、刻意不支援 |

### 12.3 貼上情境與資料比例

一封來源郵件可以衍生多個 paste sample，但每一筆 fixture 必須保存精確的 `inputText` 邊界：

- `focused_block`：使用者只複製連續的招募／活動／報名資訊區塊，作為主要成功路徑。
- `focused_with_context`：連同附近的期限、付款或說明一併複製，用來驗證角色與忽略規則。
- `full_message_stress`：整封正文、多活動或引用歷史，只作少量壓力案例。

依 Round A 校準，暫用約 65%／25%／10% 作為 `focused_block`、`focused_with_context`、`full_message_stress` 的資料平衡起點；這不是硬性配額，不應為湊比例製造不自然樣本。同一來源衍生的所有版本必須進入相同資料分組，避免規則設計組與盲測組互相洩漏。

### 12.4 樣本保存原則

- 優先保存去識別化的測試 fixture，不直接保存含個資的完整貼文。
- 電話、姓名、Email、社群帳號及私人連結應遮蔽或替換。
- 若原始內容受著作權或平台條款限制，只保存完成測試所需的最小片段與人工期望值。
- 測試資料不得被打包進公開展示或正式產品輸出。

### 12.5 Corpus Curation v1 結果

Gmail 已建立以下研究子標籤：

| 分組 | 數量 | 狀態 |
| --- | ---: | --- |
| `參照對象/Corpus v1/代表樣本` | 100 | 100／100 完成來源稽核；Round A 23＋Round B 30＋Round C 30 均已裁決，共 83 個 Gold research fixtures |
| `參照對象/Corpus v1/歧義案例` | 40 | 待代表樣本標註後處理 |
| `參照對象/Corpus v1/負面案例` | 30 | 待定義拒絕與忽略答案 |
| `參照對象/Corpus v1/保留盲測` | 30 | 封存至解析候選版本凍結 |

四組沒有重複郵件。代表、歧義與盲測組均為不同討論串及不同標題模板；盲測組由 5 個完整隔離的寄件／主辦來源家族組成，沒有同來源郵件進入規則設計組。

完整選樣方法、啟發式分布與隱私邊界記錄於：

- `docs/MARKET_TEXT_IMPORT_CORPUS_CURATION_V1_2026_09_15.md`
- `docs/MARKET_TEXT_IMPORT_ANNOTATION_GUIDE_V1_2026_09_15.md`
- `docs/MARKET_TEXT_IMPORT_ANNOTATION_PASS_1_2026_09_15.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_CALIBRATION_V1_2026_09_15.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_V1_2026_09_15.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_B_V1_2026_09_15.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_V1_2026_09_15.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ROUND_B_V1_2026_09_15.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_B_V1_2026_09_15.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_C_ROUND_B_V1_2026_09_15.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_D_ROUND_B_REMAINDER_V1_2026_09_16.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_ROUND_B_V1_2026_09_15.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ROUND_C_V1_2026_09_16.md`
- `docs/MARKET_TEXT_IMPORT_BLIND_REVIEWER_GUIDE_ROUND_C_V1_2026_09_16.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_PACK_ROUND_C_V1_2026_09_16.md`
- `docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_ADJUDICATION_ROUND_C_V1_2026_09_16.md`

## 13. 評估指標與驗收門檻草案

狀態：**待討論，尚未成為承諾**

不建議只使用「整份貼文解析成功率」，應分欄位衡量：

- Precision：系統填入的值有多少是正確的。
- Recall：原文存在的可用資訊有多少被找到。
- Conflict detection：多方案或矛盾資訊是否被阻止自動套用。
- Source traceability：每個候選值是否能指出來源片段。
- Edit burden：使用者套用後平均需要修改多少欄位。
- False overwrite：既有草稿被錯誤覆蓋的次數，目標應為零。
- Auto-submit：解析流程直接建立市集的次數，目標必須為零。

初步產品方向應優先提高高信心候選的 Precision；若無法確認，寧可少填並提出警告。

## 14. 待討論與待驗證問題

狀態：**開放中**

### 14.1 產品問題

1. 入口應放在新增市集表單頂部，還是新增市集之前的選擇頁？
2. 貼上後應立即分析，還是要求使用者按「分析資訊」？
3. 中信心欄位應預先選取，還是必須逐項確認？
4. 套用後是否需要保留原始文字，供使用者再次查看？
5. 未辨識內容應全部附加到備註，還是只提供可選片段？
6. 若文字包含多種攤型與價格，第一版應如何引導使用者選擇？
7. 若只有場館名沒有地址，是否接受場館名直接作為地點？
8. 缺少年份的日期應如何推定；多遠的過去日期才轉到下一年？
9. 是否支援民國年與中文數字日期？
10. 遇到「每週六日」時，只提示固定排程，還是提供前往排程功能的入口？

### 14.2 資料模型問題

1. 設備欄位代表單價、總價，還是本次實際支出？
2. 「一桌兩椅已含在攤位費」應只設定免費標記，還是還需保留數量？
3. 多攤型價格是否代表未來需要結構化的方案模型，而非單一 `boothCost`？
4. 原始來源、來源 URL 或主辦聯絡方式是否有正式保存需求？
5. `registrationFee` 與 `boothCost` 在產品語意上是否仍需要分開？

### 14.3 技術問題

1. 原始文字是否需要跟隨現有新增市集草稿暫存？
2. 匯入狀態應整合進 `AddMarketDraft`，還是只保留已套用欄位？
3. 是否需要將表單更新改為 reducer，以安全處理原子式批次套用？
4. 進階欄位驗證應擴充 `market-form.ts`，還是建立較完整的共享 draft validator？
5. 規則是否集中在單一模組，或依日期、時間、費用、設備拆分？
6. 是否需要版本化規則結果，讓未來 fixture 能指出是哪一版解析器產生？

## 15. 研究、決策與更新紀錄

### 2026-09-15：建立初版紀錄

狀態：**研究開始**

已記錄：

- 確認不接入 LLM 的規則式解析方向可行。
- 確認解析應在裝置端執行，不需新增後端處理路徑。
- 建議使用信心分級、來源片段、衝突預覽與使用者確認。
- 確認沿用目前 `AddMarketForm`、共用欄位、草稿及 `createMarket()` 流程。
- 識別報到時間推算營業時間的批次套用風險。
- 識別目前共用驗證只涵蓋核心欄位，程式化填值需要更完整驗證。
- 確認手動貼入文字本身不需要 Clipboard API。
- 將週期排程、OCR、網址抓取、多市集批次建立及自動送出排除在第一版外。

尚未決策：

- 最終 UX 入口與預覽樣式。
- 中、低信心候選的預設選取政策。
- 缺少年份的日期推定政策。
- 原始文字的保存與清除政策。
- 多攤型、多價格及設備數量的產品語意。
- 正式實作範圍、工期與啟動時間。

### 2026-09-17：完成 Gate 8 保留盲測

狀態：**30／30 完成；通過 Frozen Gold Quality Thresholds v1**

已完成：

- 在 Gate 7 候選凍結後首次開封 Gmail `參照對象/Corpus v1/保留盲測` 的 30 封隔離來源。
- 建立 30 個一封一筆、去識別化的 paste fixtures；未保存 Gmail ID、寄收件人、帳戶、聯絡資訊、私人連結、私人答案或附件。
- 第一次基準發現包車登記誤收、地點標籤、多段日期、日期承載於活動時間、已選攤位費與跨攤型設備等失敗類型。
- 只依失敗類型修改通用規則；曾使既有 Gold 回歸的廣泛名稱／日期改寫已撤回。
- 完成結果：disposition 100%、event count 100%、candidate／eligible precision 100%、supported recall 95.04%、evidence 100%、linked option 100%，reject leak 與 unsafe apply 均為 0。
- 83 個既有 Gold 核心、時間、費用與設備 guardrail 全數維持通過。

保留限制：

- 兩封長篇通知中的 6 個已選租賃設備仍不跨行自動組合，保留為選項／人工確認。
- 一筆缺少明確已選關係的舊格式 550 元／日攤位費維持不自動套用。
- 完整結果與第一次基準見 `docs/MARKET_TEXT_IMPORT_GATE_8_HOLDOUT_REPORT_2026_09_17.md`。

### 2026-09-15：完成 Corpus Curation v1 選樣

狀態：**研究資料選樣完成；Annotation Pass 1 尚未開始**

已完成：

- 完整掃描 Gmail `市集` 標籤的 1,458 封郵件。
- 建立 819 封正向參照郵件，另選 30 封負面案例，`參照對象` 共 849 封。
- 建立 100 份代表樣本、40 份歧義案例、30 份負面案例及 30 份保留盲測。
- 四組沒有重複郵件。
- 盲測以 5 個完整寄件／主辦來源家族隔離，未洩漏至規則設計組。
- 郵件原文、Gmail ID、寄件者、收件者及附件均未寫入儲存庫。
- 建立 Corpus Curation v1 報告與 Annotation Guide v1。

下一研究關卡：

- 先對 100 份代表樣本執行事件區塊切分、最小化去識別化及欄位級人工答案標註。
- 完成第一輪後再標註 40 份歧義案例並更新規範。
- 保留盲測不得在解析候選版本凍結前用於規則設計。

### 2026-09-15：開始 Annotation Pass 1

狀態：**已完成 60／100 封來源郵件稽核；後續依方法校正重新解讀**

已完成：

- 為前 60 封代表來源配置匿名暫用 ID；方法校正後這些 ID 定位為 `sourceSampleId`，不是最終 fixture ID。
- 完成 event block、核心欄位、日期／時間／金額角色與安全套用判斷。
- 只保存最小公開 evidence；未保存 Gmail ID、寄收件人、聯絡資料、帳戶或私人連結。
- 新增正文新舊段落衝突、引用舊活動、附件外部資訊、民國年、逐日不同時間、簽名地址、一行式表單及多活動電子報的標註規則。
- 以正文作為當時的稽核輸入邊界，回修只由主旨取得的第一批答案；後續改由每一筆 paste sample 精確決定是否包含主旨文字。
- 新增最新取消／更正優先、相對時間換算及外部表單欄位缺失的標註規則。
- 新增未錄取優先、非市集促銷日期／報價排除、農曆日期不支援，以及表單已選場次優先於活動整體日期的規則。
- 建立 `docs/MARKET_TEXT_IMPORT_ANNOTATION_PASS_1_2026_09_15.md`。

尚未完成：

- 12 封 Paste Scenario Calibration 的精確 `inputText`、隱私複核與選取政策凍結。
- 其餘 40 封代表來源稽核。
- 至少 20 份的第二位獨立複核與差異裁決。
- Gold dataset、支援格式清單與解析器正式技術規格。

### 2026-09-15：對齊「使用者先判讀、再貼上」的輸入單位

狀態：**產品方向維持；標註方法重新校準**

確認事項：

- 手動貼上、裝置端規則解析、保守套用、來源片段、衝突提示與使用者最後確認的整體方向正確。
- 使用者先判讀並選取文字，會大幅降低整封信中的簽名、歷史回覆、多活動與一般通知雜訊；這是無 LLM 方案可行性的重要前提。
- 前 60 封紀錄改稱來源郵件稽核，不再等同 60 份產品 fixture，也不作為預期成功率。
- Email 正文、附件、表單頁、網站或社群只是來源；產品只分析文字框內的 `inputText`，不主動存取外部內容。
- 暫停 `MTI-REP-0061` 至 `MTI-REP-0080`，先從既有 60 封中選 12 封建立三類 paste scenario，完成後再繼續 Annotation Pass 1。

### 2026-09-15：完成 Paste Scenario Calibration Round A 情境矩陣

當時狀態：**23 個候選 fixture 已建立並完成第一輪隱私檢查；獨立複核待執行**

已完成：

- 重新讀取 12 封已標記來源，涵蓋清楚資訊、費用／期限雜訊、表單回覆、多活動、取消引用與非市集內容。
- 為各來源規劃 `focused_block`、`focused_with_context`、`full_message_stress` 的必要組合，共 23 個候選 paste fixture。
- 確認使用者預先選取可顯著降低雜訊，但不能取代非市集判斷、完整度檢查或取消／衝突防護。
- 確認規則引擎只對實際貼入內容負責；未貼入的取消、更正與方案關係不能被推測。
- 校準矩陣與每封來源的預期差異已記錄於 Annotation Pass 1 文件，未保存 Gmail ID 或郵件全文。
- 23 個候選 fixture 的精確、去識別化 `inputText` 與第一位標註者期望行為已記錄於 Paste Fixture Calibration v1。
- 完成第一輪自動格式檢查與隱私檢查：未發現 Gmail ID、原始 Email、電話或私人表單回答。

下一研究關卡：

- 由獨立複核者重新檢查 23 個 `inputText` 的隱私與欄位答案。
- 完成差異裁決後，才將通過者計入 Gold fixture 數量。
- 以欄位正確性、錯誤套用、衝突攔截與使用者修改負擔比較三種貼上情境。

### 2026-09-15：建立獨立盲審與差異裁決交接包

當時狀態：**交接材料完成；第二位複核者尚未作答**

已完成：

- 從 Calibration v1 機械抽取 23 個 fixture 的 ID、`referenceDate` 與完整 `inputText`，建立獨立 Blind Review Pack。
- 盲審包不含第一位標註者答案、來源類型、paste scenario 或選取理由。
- 驗證盲審包與 Calibration v1 的 23 個 `inputText` 逐字一致，無缺漏、額外或內容差異。
- 建立 23 筆 Adjudication Worksheet，預留 privacy、event disposition、欄位差異、裁決與規範影響欄位。
- 獨立複核未由原標註者代填，避免把自我檢查誤稱為獨立證據。

交接規則：

- 第二位複核者只開啟 Blind Review Pack。
- 第二份答案封存後，才同時打開 Calibration answer key 與 Adjudication Worksheet。
- 發現隱私問題時先修正 fixture 並重新盲審，不直接進入欄位裁決。

### 2026-09-15：完成 Reviewer B 獨立盲審與 Round A 裁決

狀態：**23／23 筆完成；列為 Gold calibration subset v1**

已完成：

- 由未取得本次對話歷史的獨立 Reviewer B，只依 Blind Review Pack 與通用 Annotation Guide，完成 23 個 fixture 的重新標註。
- Reviewer B 明確聲明未查看 Calibration answer key、Annotation Pass 1、Discovery Record、Corpus Curation、Adjudication、Gmail 來源、git diff 或 Reviewer A 答案。
- 隱私檢查 23／23 通過；未發現 Gmail ID、原始 Email、電話、私人網址或私人表單答案。
- `eventDisposition` 的安全意圖與 Reviewer A 23／23 一致：`single_candidate` 14、`event_selection_required` 4、`insufficient` 3、`reject` 2。
- 欄位層差異已逐筆裁決；新增 `eventDisposition` 與 `draftReadiness` 雙軸、日期相依值、連動方案、設備供應狀態、幣別推定、recurring 與 reject 表示規則。
- Paste Sample Selection Policy v1 已凍結，Round A 的 23 個 fixture 定位為 Gold calibration subset v1。

限制與下一步：

- Gold calibration subset 只證明校準集已經過雙人判讀與裁決，不代表完整 Corpus 已完成，也不代表解析器品質已達標。
- 下一批可依新政策恢復 `MTI-REP-0061` 至 `MTI-REP-0080`，再完成其餘代表來源、正式 fixture 與後續獨立複核。
- 在支援格式、品質門檻、資料生命週期與有限實作 slice 另行核准前，仍不得開始產品實作。

### 2026-09-15：完成第四批代表來源稽核

狀態：**`MTI-REP-0061` 至 `MTI-REP-0080` 完成；代表來源累計 80／100**

已完成：

- 依 Paste Sample Selection Policy v1 恢復來源稽核；本批不再把整封 Email 當成產品 fixture。
- 為 20 封來源記錄 `eventDisposition`、`draftReadiness`、核心欄位候選、日期／金額角色、個資風險及後續 paste scenario 用途。
- 來源層分布為：`single_candidate`＋`reviewable_core` 8、`single_candidate`＋`partial` 8、`event_selection_required` 1、`insufficient` 1、`reject` 2。
- 新增 HTML 報名表格、最新更正搭配舊年份錯字、候補錄取、日期相依攤型、長期百貨快閃及區域品牌徵選等案例。
- 郵件原文、Gmail ID、寄收件者、姓名、電話、帳戶、查詢密碼、車牌與私人品牌回答均未寫入儲存庫。

下一研究關卡：

- 從 `MTI-REP-0061` 至 `MTI-REP-0080` 建立精確、去識別化 paste sample；優先建立自然的 `focused_block`，再補必要的 context 與 stress 對照。
- 對表單回覆優先使用公開活動區塊或 `structure_preserving_synthetic`，不得保留私人答案。
- 完成這批 fixture 後再安排下一輪獨立複核；其餘 `MTI-REP-0081` 至 `MTI-REP-0100` 仍待來源稽核。

### 2026-09-15：建立 Round B paste fixture 與盲審交接包

狀態：**30 個候選完成第一輪隱私檢查；獨立複核待執行**

已完成：

- 從 `MTI-REP-0061` 至 `MTI-REP-0080` 建立 30 個精確 `inputText`，每封來源至少有一個自然的 focused sample。
- 情境分布為 `focused_block` 20（66.7%）、`focused_with_context` 7（23.3%）、`full_message_stress` 3（10.0%）。
- 長期快閃、品牌徵選及發票通知保留為 focused 負面／不足案例；表單與往返信件使用 `structure_preserving_synthetic` 隔離私人回答。
- 建立不含第一位答案、來源類型、scenario 與選取理由的 Round B Blind Review Pack。
- 驗證 answer key 與盲審包的 30 個 ID 唯一且 `inputText` 逐字一致，Markdown fences 配對，未檢出原始 Email、電話、網址、帳戶或車牌模式。

下一研究關卡：

- 由新的獨立複核者只讀 Round B Blind Review Pack 與通用 Annotation Guide，完成 30／30 隱私、event disposition、draft readiness 與欄位判讀。
- 第二份答案封存後才進行差異裁決；在此之前，Round B 仍是候選 fixture，不計入 Gold。

### 2026-09-16：完成 Reviewer set C／D 盲審與 Round B 裁決

狀態：**30／30 完成；列為 Gold representative subset Round B v1**

執行與完整性：

- Reviewer C 在只讀凍結 Blind Reviewer Guide 與完整 Blind Review Pack 的隔離條件下完成判讀；因工具額度中斷，結果檔只封存前 25 筆。Primary adjudicator 僅修復 Markdown fence，沒有補寫或修改答案。
- 後 5 筆由新的 Reviewer D 使用精確 remainder pack 補審；Reviewer D 未查看 Reviewer C、answer key、Gmail 或其他研究答案。
- Reviewer set 合併後覆蓋 30 個唯一 fixture；30／30 privacy pass，所有必填區段存在，兩份 Markdown／YAML 結構可解析。
- 分布為：`single_candidate` 25、`event_selection_required` 1、`insufficient` 2、`reject` 2；`reviewable_core` 6、`partial` 16、`blocked` 8。

主要裁決：

1. `eventDisposition` 只描述事件數量；唯一具名活動可為 `single_candidate`，市場性質不明或核心日期衝突另以 warning／`blocked` 表示。
2. 同一目前區塊的更正值與資訊列互相矛盾時維持 `conflict`，不可靜默採最新年份。
3. 付款元件加總吻合總額只能驗證算式，不能證明公開方案已被選取。
4. 「可參加場次」是 `choice_required`；未解的核心日期衝突一律為 `blocked`。
5. 日期相依攤型保留為結構化 `unsupported`；模糊的「報名日期」在表單上下文中最多為 `inferable`。
6. 非標準 `[PRIVATE_*]` token 在原值已完全移除時可 privacy pass，但新 fixture 必須使用 canonical token。

裁決沒有更動任何 `inputText`，所以不需重審。Round A＋B 合計 53 個 Gold research fixtures；這仍不是完整 Corpus Gold dataset、runtime 測試集或產品實作授權。

### 2026-09-16：完成第五批代表來源稽核

狀態：**`MTI-REP-0081` 至 `MTI-REP-0100` 完成；代表來源累計 100／100**

已完成：

- 從 `參照對象/Corpus v1/代表樣本` 找出未帶「初標完成」的 20 封郵件；數量與剩餘規劃完全一致，依 Gmail 標籤順序配置 `MTI-REP-0081` 至 `MTI-REP-0100`。
- 只讀取正文與必要的公開活動 evidence，未下載附件；未把 Gmail ID、寄收件者、姓名、私人品牌、Email、電話、LINE、車牌、帳戶、私人網址或表單商品回答寫入儲存庫。
- 來源層分布為：`single_candidate＋reviewable_core` 7、`single_candidate＋partial` 9、`single_candidate＋blocked` 1、`event_selection_required` 1、`reject` 2。
- 新增覆蓋：日期只在主旨、每日期不同費率、付款更正不影響活動欄位、超長多活動表單、撤回報名、季節型 recurring 排程，以及 28 天百貨寄售／進駐。
- Gmail 已為這 20 封加入 `Annotation Pass 1/初標完成` 與 `Annotation Pass 1/待獨立複核`；兩個標籤目前均為 100／100。

下一研究關卡：

- 依自然貼上邊界建立 Round C 候選，暫定 20 個 `focused_block`、7 個 `focused_with_context`、3 個 `full_message_stress`。
- full-message stress 優先使用多活動表單、撤回報名及長期寄售三類防禦案例；含私人回答者一律改成結構等價合成文字。
- 建立 answer key、blind pack 與 adjudication worksheet 後，再交由新的隔離 reviewer 複核；在裁決完成前，Round C 不計入 Gold。

### 2026-09-16：建立 Round C paste fixture 與盲審交接包

狀態：**30 個候選完成第一輪隱私與完整性檢查；獨立複核待執行**

已完成：

- 從 `MTI-REP-0081` 至 `MTI-REP-0100` 建立 30 個精確 `inputText`；情境分布為 `focused_block` 20、`focused_with_context` 7、`full_message_stress` 3。
- 新增日期只在主旨、可報場次、逐日費率、付款更正、場域活動雜訊、日期／付款天數衝突、撤回報名與長期百貨寄售等案例。
- 多活動表單、付款往返與長期進駐表單均使用 canonical privacy token 或 `structure_preserving_synthetic`；未保存私人姓名、品牌、Email、電話、LINE、帳戶、付款識別碼、車牌、私人網址或商品回答。
- 建立只含 `fixtureId`、`referenceDate` 與精確 `inputText` 的 Round C Blind Review Pack，以及不含 Round C 答案的凍結 Blind Reviewer Guide。
- 機械驗證 answer key 與盲審包的 30 個 ID 唯一，`referenceDate` 與 `inputText` 逐字一致；情境數量與 20 個來源覆蓋符合規劃。

下一研究關卡：

- 安排新的獨立 reviewer，只讀 Round C Blind Review Pack 與凍結指南，完成 30／30 privacy、event disposition、draft readiness 與欄位答案。
- Reviewer 結果封存後再進行 evidence-based 差異裁決；在此之前 Round C 仍是候選，不計入 53 個既有 Gold research fixtures。

### 2026-09-16：完成 Reviewer E 盲審、Round C 裁決與 Gate 1

狀態：**30／30 完成；列為 Gold representative subset Round C v1**

已完成：

- Reviewer E 在只讀凍結 Guide 與 Blind Review Pack 的隔離條件下完成 30／30；privacy 全數通過。
- 裁決後分布為 `single_candidate` 26、`event_selection_required` 1、`reject` 3；`reviewable_core` 10、`partial` 16、`blocked` 4。
- 補強外部值、招募期間、相接日期範圍、付款天數、幣別、付款角色、算式與方案選擇、標題內場地等政策。
- 重要修正包括：`招募期間` 不得當活動日；外部表單值標 `unsupported` 且不外查；四個錄取日與兩個計費日不構成核心日期衝突；算式不能證明攤型已選。
- 裁決沒有修改任何 `referenceDate` 或 `inputText`，不需重新盲審。
- Round A＋B＋C 合計 83 個 Gold research fixtures；Gate 1 完成，下一步為 Gate 2 MVP 支援範圍。

### 2026-09-16：完成 Gate 2、Gate 3 與 Gate 4

狀態：**MVP 支援範圍、parser contract、83 筆 executable Gold、完整 evaluator 與品質門檻 v1 已凍結**

已完成：

- 依目前 `AddMarketForm`、`MarketFormFields` 與 `MarketCreatedPayload` 建立完整欄位支援矩陣。
- 凍結五項 MVP 決策：長範圍超過 14 日需二次確認、notes 逐項選取、「提供」不等於免費、相對時間只作有限 deterministic 推定、原文與預覽只作使用者範圍本機 30 分鐘暫存。
- 定義平台中立的 `ParsedMarketDraft`、candidate、evidence、option、warning、日期／時間／費用／設備結構。
- 定義不覆蓋既有草稿的原子 merge policy，並處理日期邊界與現有 check-in 自動帶值的順序風險。
- 定義 `TemporaryDraftPort` 邊界、帳號隔離、清除條件與禁止記錄原文的 telemetry 規則。
- 啟動 Gate 4，建立 executable fixture schema、事件／欄位／安全指標與 precision-first 品質門檻草案。

後續已完成第一個 Gate 4 資料切片：測試專用 loader 可直接載入 83／83 個精確 input envelope，並驗證 52／52 個來源家族、answer／blind pack 文字一致、reviewer／adjudication 完整覆蓋，以及 Email、URL、電話、帳戶、身分證與車牌等原始模式未流入 executable inputs。

Round A 23／23 個最終 expected outputs 也已轉成可執行資料：從封存的 Reviewer B 結構載入後再套用最終裁決，而不是把 reviewer 答案直接視為 Gold。測試已確認 23 個 fixture ID 完整、裁決後 disposition／readiness 分布固定、`not_present` 值正規化、reject events 為空，且所有欄位 evidence 與 ignore span 都是對應 `inputText` 的 substring。

Round B 也完成 30／30 expected outputs：Reviewer C 25 筆與 Reviewer D remainder 5 筆各自保留 reviewer provenance，合併後套用七項最終裁決。Evidence validator 發現 `MTI-REP-0076-P01` 的 reviewer 答案曾把兩行費率組成一個非原文連續 span；executable expected data 已拆回兩個精確原文 span，不修改輸入、正規化值或安全判定。

Round C 最後 30／30 expected outputs 也已完成：外部內容維持 `unsupported＋null`、招募期間不作活動日、四個錄取日不被兩個計費日取代、公開攤型保持未選，金額角色與幣別分開。Reference date evidence 使用獨立來源驗證，不能假裝存在於貼上文字。全量 guardrail 已確認 83 個 input 與 expected ID 一一對應且唯一。

Event＋核心欄位 evaluator 已建立：三輪的名稱、日期與地點投影到共同 comparison model，按 overall、Round A／B／C 與三種 paste scenario 分開計算 disposition、readiness、event count、candidate precision、supported recall、eligible precision 與 evidence integrity。故障注入已證明 evaluator 能檢出 reject 洩漏、跨事件合併、unsafe apply、核心錯填、行政日期洩漏與外部 evidence。

完整 evaluator 後續已補上 time、money、equipment、warning 與 linked-option 共同 projection，並提供 group、candidate status、Round 與 paste scenario 分組報告。多活動比較鍵包含 event index，避免不同活動的同名欄位互相覆蓋。故障注入另確認能檢出 unsafe money apply、linked-option 組合遭竄改及 equipment 漏抓。

第一版 precision-first 最低品質門檻已凍結為 v1 並可由測試機械判定。完美 Gold 基準通過只證明資料投影、比較器、報告與門檻自洽，不代表產品 parser 已達標；截至 Gate 4 關閉時，產品 parser 與 UI 尚未開始，holdout 也未讀取。

### 2026-09-16：完成 Gate 5 Parser Slice 1

狀態：**平台中立 Parser Slice 1～2 與 Gate 7 預覽 UI 已完成；Gate 8 holdout 尚未執行**

已完成：

- 新增共享 `parseMarketText` 純函式、凍結契約型別與 `validateParsedMarketDraft`；不使用 DOM、瀏覽器儲存、網路、Next.js runtime 或 Capacitor。
- 支援輸入限制、Unicode code-point evidence offsets、文字正規化視圖、事件切分、市集名稱、活動日期、地點、單一營業時間、行政日期排除、reject／insufficient、基本 warning 與敏感 span。
- 日期推定只使用呼叫端提供的 `referenceDate`；不讀取目前時間、附件、網址、Gmail 主旨或其他外部內容。
- 83／83 Gold 均能 deterministic 解析並通過契約驗證；overall disposition 與 event count 100%，candidate precision 100%，eligible precision 100%，supported recall 94.09%，evidence integrity 100%。Reject leak、cross-event merge、unsafe apply、core false positive、administrative-date leakage 與 external evidence violations 均為 0。
- `focused_block` 的 disposition、event count、candidate precision、eligible precision 與 evidence integrity 均為 100%，supported recall 95.54%。
- 32／32 組可直接支援的 Gold 營業時間正確，precision／recall 均為 100%；每日不同、條件式或時間窗仍保守標示為 unsupported／warning，不壓成可套用單值。

Gate 6 已補上費用、設備、linked options 與複雜欄位關係。Gate 7 已完成貼上文字、分析預覽、逐欄確認、安全 merge 與 session-only 草稿整合；套用後仍停留在表單，必須由使用者自行建立市集。Holdout 仍未讀取。

## 16. 進入實作前的決策門檻

狀態：**Gate 5 有限實作門檻已達成；後續 Gate 仍須逐關核准**

以下條件完成後，才應將本文件中的研究結論轉成正式實作規格：

Corpus Curation v1 已完成郵件盤點與選樣、100／100 封代表來源郵件稽核，以及 Round A 23、Round B 30、Round C 30 個 paste fixture 的獨立複核與裁決，共 83 個 Gold research fixtures。MVP 支援格式、解析契約、可執行 Gold 全量轉換、資料完整性測試、完整 evaluator 與品質門檻 v1 均已完成；Gate 5～7 的 parser、預覽 UI 與安全 merge 也已實作並通過相應回歸及桌面／行動版瀏覽器檢查。保留盲測依計畫要到 Gate 8 才執行。

- 已蒐集並去識別化足夠的代表性真實樣本。
- 已人工標記主要欄位的期望結果與不可判定案例。
- 已決定第一版支援及刻意不支援的格式。
- 已決定日期缺年、多價格、設備及備註的衝突政策。
- 已決定原始文字是否暫存及其資料生命週期。
- 已確認不會覆蓋現有草稿或自動送出。
- 已定義共享解析、驗證、合併及平台邊界。
- 已定義可量測的欄位級品質門檻。
- 產品與工程已明確核准一個有限的實作 slice。

在上述門檻達成前，本文件的任何範例介面、型別名稱、工期或規則都應視為研究素材，而非實作授權。
