# 市集文字解析實驗室規格

- 建立日期：2026-10-01
- 狀態：第一版已實作，尚未新增任何雲端資料儲存或自動規則更新
- 路由：`/tools/market-text-import-lab`
- 存取範圍：登入後的 owner；staff 一律不顯示實驗內容

## 1. 目的

提供一個不需進入「新增市集」表單的頁面，用人工方式測試 `parseMarketText` 的解析結果，並將每個候選欄位標為正確、錯誤、需要補規則或尚未判讀。

這是規則式 parser 的研究與驗證工具，不是 LLM 訓練器；系統不會從操作中自動改寫規則、提高候選信心或擴大可套用範圍。

## 2. 架構與跨平台邊界

```text
貼上文字 + referenceDate
        ↓
parseMarketText（既有純 TypeScript 核心）
        ↓
實驗室 Web UI：檢視 evidence、人工判讀、產生 review JSON
```

- `lib/market-text-import/parser.ts`、types 與 review-record builder 維持 platform-neutral。
- Web route 與顯示元件是刻意隔離的 Web presentation，不加入 parser、資料庫、同步或 API contract。
- 未使用 clipboard、download、storage、fetch、Supabase、Dexie 或市場建立流程。
- 未安裝 Capacitor 套件、未建立 native project；未宣稱原生驗證。

## 3. 資料生命週期與隱私

- 原文、解析結果、人工 verdict 與備註只保留在目前 React 記憶體。
- 重新整理、離開路由或關閉分頁即清除；不使用 localStorage、sessionStorage、IndexedDB、資料庫、API 或 telemetry。
- review JSON 刻意排除原文、evidence、candidate values、金額、日期、地點、名稱與敏感 span；只保留長度、解析狀態、reason code、warning code、人工 verdict 與備註。
- 若要建立長期 fixture，必須先由人工將來源內容去識別化，再走既有標註／裁決流程；不得直接將含個資的貼上文字輸出或提交。

## 4. 人工回饋如何轉成規則改進

1. 使用者貼上文字，選定 reference date，執行 parser。
2. 逐欄判讀候選：`correct`、`incorrect`、`needs_rule` 或 `not_reviewed`。
3. 使用 review JSON 記錄失敗類型與 reason code；原文仍留在本機頁面。
4. 由 owner 去識別化並挑選代表案例，建立 fixture、answer key 與預期輸出。
5. 經獨立審核／裁決後，才新增 parser 規則與 Gold／holdout 回歸測試。

禁止根據單一操作自動改 parser、把錯誤候選變成 allowlist，或為提高填入率放寬 hard-zero 安全門檻。

## 5. 第一版驗收條件

- [x] 與 AddMarketForm 分離，不建立市集或修改表單。
- [x] 可貼上文字、指定參考日期、執行既有 parser。
- [x] 顯示 event、candidate、選項、evidence、warning 與 sensitive count。
- [x] 可逐候選人工判讀並產生不含原文的 review JSON。
- [x] owner-only UI 會在授權未確認或 staff 時 fail closed。
- [x] 靜態 guardrail 阻擋資料庫、網路、storage、clipboard、download 與市場寫入依賴。

## 6. 後續可能擴充

下一個合理 slice 是「去識別化 fixture 草稿」：由使用者主動貼入已清洗的測試文字與預期答案，輸出待審核 fixture package。該 slice 不應自動收集真實原文，也不應在未定義保存期限、審核流程與資料責任前加入雲端同步。
