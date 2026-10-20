# 市集文字匯入 MVP 支援範圍 v1

- 建立日期：2026-09-16
- 狀態：Gate 2 已完成並凍結（2026-09-16）
- 產品實作狀態：Gate 9 發布準備已完成；production 入口維持雙重開關 fail-closed
- 上一關：Round A＋B＋C 共 83 個 Gold research fixtures
- 執行計畫：`docs/MARKET_TEXT_IMPORT_EXECUTION_PLAN_2026_09_16.md`
- 研究紀錄：`docs/MARKET_TEXT_IMPORT_DISCOVERY_RECORD_2026_09_15.md`
- 跨平台規範：`docs/CROSS_PLATFORM_VIBE_CODING_GUARDRAILS.md`
- 現有表單：`components/markets/AddMarketForm.tsx`、`components/markets/MarketFormFields.tsx`
- 現有 payload：`types/db.ts` 的 `MarketCreatedPayload`

## 1. Gate 2 目標

把 Gold fixture 中可辨識的資訊對照目前「新增市集」表單，明確決定第一版哪些欄位：

1. 可成為待確認的套用候選。
2. 只顯示為選項、警告或備註候選。
3. 刻意不支援或不得解析。

本功能仍採兩段式操作：先分析並預覽，再由使用者選擇套用；套用後仍停留在新增表單，最後由使用者自行送出。任何候選都不得直接建立市集，也不得靜默覆蓋表單既有值。

## 2. 欄位支援矩陣

| 現有表單／payload 欄位 | 文字來源概念 | 凍結的 MVP 政策 | 可成為套用候選的條件 | 不可直接套用時的呈現 |
| --- | --- | --- | --- | --- |
| `name` | 市集名稱／唯一場次稱呼 | 第一版支援 | `exact`；或經已凍結規則得到單一 `inferable` 名稱 | 多名稱先選 event；缺漏維持空白 |
| `location` | 活動場地、場館、樓層、入口 | 第一版支援 | 唯一 `exact`；標題中 `名稱｜唯一場域` 也可作候選 | 多地點或方案綁定時顯示選項；地圖連結不外查 |
| `dates` | 已選／錄取／明示活動日期 | 第一版支援 | 唯一 event 的 `exact` 或安全 `inferable` 日期；明示的有限連續範圍可展開為日期陣列 | 可報日期為 `choice_required`；recurring、外部值、日期相依衝突顯示警告，不套用 |
| `startDate`、`endDate` | 日期邊界 | 不直接解析 | 套用 `dates` 後沿用既有 `deriveMarketDateBounds` 產生 | 不單獨顯示為解析候選 |
| `operatingStartTime`、`operatingEndTime` | 單一營業起訖 | 第一版支援 | 所有已選日期共用同一組 `exact` 時間；安全的 24 小時制正規化可 `inferable` | 每日／平假日不同時間保留結構化 warning 或備註，不壓成單值 |
| `checkInTime` | 明示報到時間 | 第一版支援 | 唯一 `exact` 或由明確基準計算的 `inferable` 候選 | 時間窗、相對時間基準不足或與進場混淆時不套用 |
| `earlyEntryEnabled`、`earlyEntryTime` | 明示提前進場時間 | 第一版有限支援 | 有唯一提前進場時間時，候選同時設定 enabled 與 time | 「無提前進場」只維持預設；進場時間窗作備註，不轉單值 |
| `boothCost` | 已選攤位成本總額 | 第一版保守支援 | 原文明示已選攤型的整場總額；或原文直接標為本次攤位費總額；currency 必須為 TWD exact／inferable | 公開價目、單日費、多方案、付款總額或純算式只顯示選項／警告，不填入 |
| `deposit` | 保證金 | 第一版支援 | 單一明示金額且 currency 可安全判為 TWD | 退還條件進備註；多方案或 currency unknown 不套用 |
| `commissionRate` | 營業額抽成百分比 | 第一版支援 | 單一、明示且屬本活動的百分比 | 現金／刷卡不同抽成或長期零售合作先拒絕／顯示警告 |
| `tableRental`、`chairRental`、`umbrellaRental` | 本次已選設備租金總額 | 第一版保守支援 | 明示已租設備及本次總額；currency 可安全判為 TWD | 單價、每件／每日價、數量未定或設備方案未選時，只顯示選項 |
| `tableFree`、`chairFree`、`umbrellaFree` | 免費包含設備 | 第一版有限支援 | 原文明示「免費提供」「攤位費包含」或同等無歧義語意 | 只有「提供」時先作備註；自備、不提供、禁止、可租不得轉成 free |
| `notes` | 主辦規定、場地限制、設備狀態、付款／外部值警告 | 第一版支援備註候選 | 使用者在預覽中明確勾選後，以可讀摘要加入 | 不自動塞入所有原文；私人資料、帳戶、網址 token 與期限不得寫入 |
| `registrationFee` | 報名費 | 目前 UI 未提供，第一版不直接套用 | 無 | 只顯示「目前表單無對應欄位」或備註候選 |
| `tableclothRental`、`tableclothFree` | 桌巾費／免費桌巾 | 目前 UI 未提供，第一版不直接套用 | 無 | 備註候選，不建立隱藏值 |
| `startTime`、`endTime` | 舊版時間欄位 | 不支援直接解析 | 無 | 只使用目前可見 timeline 欄位 |
| `salesPhotoEvidenceRequired` | 成交照片規定 | 不由市集文字推定 | 無 | 保留使用者設定／既有預設，解析結果不得修改 |
| recurring provenance 欄位 | 場地、排程與 occurrence 關聯 | 不由貼上文字建立 | 無 | recurring 文字只顯示不支援提示，不建立 schedule 或 provenance |

## 3. 跨欄位安全政策

### 3.1 候選資格

- 只有 `exact` 與已凍結規則允許的 `inferable` 值可以出現在「可套用」清單。
- `choice_required` 必須先選定合法 option；選擇後仍由使用者確認是否套用。
- `conflict`、`unsupported`、`not_present` 與 `ignore` 不得直接寫入表單欄位。
- `event_selection_required` 必須先選一個 event block，之後才顯示該事件的欄位候選。
- `reject` 與 `insufficient` 不產生可套用欄位；只解釋原因與建議使用者補充／改選文字。

### 3.2 日期

- 報名、付款、公告、確認、對帳、地圖與招募期間均不得加入 `dates`。
- 已錄取或明示活動日可套用；「可參加」「仍有位子」只建立待選日期。
- 明示且角色確定的有限日期範圍可展開；14 日以內可作一般套用候選，超過 14 日必須顯示起訖、日期數量與二次確認後才能展開套用。
- `每週六日`、平日／假日 recurring 或不明確週期不展開。
- 活動日與計費天數不同時保留活動日，將費用／日期 mapping 顯示為 warning；只有明示更正或否定活動日才構成核心日期 conflict。

### 3.3 費用與幣別

- 數字、費用角色、單位、涵蓋日期與幣別分開判定。
- 「元」加上明確台灣活動場景最多可推定 TWD；缺少場景時 currency unknown，金額不得套入目前以 NT$ 呈現的欄位。
- 已收款、應付款、付款總額、攤位成本、保證金、設備租金與抽成不得互相覆蓋。
- 單價乘數量等於總額只驗證算式，不證明攤型或設備方案已選。
- 第一版不自行用日費乘活動日數產生 `boothCost`；只有原文明示本次／整場攤位成本總額才列為候選。

### 3.4 設備與備註

- `免費提供`、`包含`、`可租`、`已租`、`自備`、`不提供`、`禁止` 分開處理。
- 現有表單只能直接表達桌、椅、傘的免費狀態及租金總額；帳篷、電力、發電機、尺寸、瓦斯、明火與車種限制先作備註／warning。
- 備註只產生去識別化、可讀的摘要候選；不複製整封文字，也不帶入付款帳戶、聯絡資料、私人回答、私人網址或識別碼。

## 4. 套用與現有草稿的關係

1. 分析不修改表單；只產生預覽資料。
2. 使用者逐欄勾選後才執行一次原子式 merge。
3. 表單已有非空值時預設不覆蓋；顯示「目前值／解析候選」讓使用者明確選擇。
4. 套用 `dates` 時必須一併使用既有日期邊界衍生規則，不能讓 `dates`、`startDate`、`endDate` 不一致。
5. 套用 `checkInTime` 不得觸發既有「自動帶出營業時間」後靜默覆蓋已解析的營業時間；Gate 3 必須為批次 merge 定義順序與原子性。
6. 解析與套用不呼叫 `createMarket`；現有表單驗證與「建立市集」按鈕維持最後一道使用者操作。

## 5. 平台與資料生命週期邊界

- Parser、欄位候選、evidence、warning、event selection 與 merge policy 都屬平台中立共享核心，不得依賴 `window`、DOM、`sessionStorage`、IndexedDB 或 Next.js runtime。
- 使用者直接在文字框貼上不需要程式存取系統剪貼簿。若未來新增「從剪貼簿貼上」按鈕，必須使用既有 `lib/platform/contracts/clipboard.ts` 與平台 adapter。
- Web 表單顯示、focus 管理與目前的草稿儲存屬 adapter／UI 層；不得把它們寫進 parser。
- 原始貼上文字不得進 market payload、事件紀錄或 telemetry。是否在未完成表單草稿中暫存原文與解析預覽，留給 Gate 3 定義；無論如何都必須支援中斷後安全恢復或明確告知未保存。
- 本階段不新增 Capacitor 套件、原生專案、雲端 API、LLM 或第三方文字分析服務。

## 6. Gate 2 凍結決策

1. **長日期範圍**：14 日以內可在預覽後一般套用；超過 14 日仍可解析為 range，但展開到 `dates[]` 前必須二次確認。這是 merge safety 門檻，不改變日期解析本身的正確答案。
2. **備註候選**：warning、設備限制及場地規則逐項列出、逐項勾選；套用時再以穩定順序組成 notes，避免把所有雜訊一次塞入表單。
3. **設備提供語意**：只有「免費提供」「包含」或同等無歧義文字可勾選 free；只有「提供桌椅」時一律先作備註，不推定免費。
4. **相對時間**：第一版只支援具唯一絕對基準、單一明確偏移量且不跨日的 deterministic 推定，例如唯一營業開始時間前一小時；其他相對時間標 `unsupported`。
5. **暫存生命週期**：未完成的原始貼上文字與解析預覽可由平台 adapter 作使用者範圍的本機暫存，TTL 30 分鐘；不得同步到雲端、寫入 market event 或送進 telemetry。建立成功、明確捨棄、登出或切換帳號時清除。若平台暫存不可用，降級為記憶體並向使用者說明中斷後可能遺失。

## 7. Gate 2 完成檢查

- [x] 已盤點目前新增市集所有可見欄位與 payload-only 欄位。
- [x] 已為每個欄位提出支援、警告或刻意不支援政策。
- [x] 已確認不自動送出、不靜默覆蓋與 event selection 邊界。
- [x] 已識別 clipboard、草稿保存與 UI focus 等平台能力。
- [x] 已以保守、可逆的預設確認第 6 節五項選擇。
- [x] 已凍結 Gate 2；後續若有新證據，必須留下變更理由並同步修改解析契約與測試。

Gate 2 的凍結決策維持不變；Gate 3～9 已依序完成。Gate 9 已通過完整回歸、production build 與三種 viewport 驗證，隱私、可攜性、漸進開放與回退守門均已關閉。
