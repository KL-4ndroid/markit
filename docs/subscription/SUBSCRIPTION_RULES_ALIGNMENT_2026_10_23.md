# 訂閱制度對齊與整備清單

> 同日後續決策：使用者已接受新兩級方案方向、249／2490 牌價、限期首購優惠及可設定營運後台；請先讀 [最新需求](SUBSCRIPTION_PRICING_PROMOTION_ADMIN_REQUIREMENTS_2026_10_23.md)。下文保留新方向提出前的確認與來源碼快照，不再代表最新產品分級決策；舊 runtime 與待補付費 gate 的事實仍需實作時核對。

日期：2026-10-23（台灣）

狀態：使用者確認維持 Free／Pro／Team；員工協作屬於 Team。已完成來源碼盤點與共用到期日判斷補強，尚未啟用真實收費或付款權益寫入。

## 1. 本次確認的產品方向

- 使用者先前提到 Pro 為口誤；一般員工協作、manager 流程維持 Team，不把員工功能移到 Pro，也不合併方案。
- 員工模式依工作空間老闆的有效 Team 權益判定，並與員工關係、角色及可操作資料範圍取交集；不要求員工自己另買 Team。
- 本次沒有核定新價格、員工席次、容量、寬限天數、試用優惠或商店商品；沿用已存在的規格，不把 candidate 值當已核定公開承諾。
- 暫緩原 UX 待辦中「員工新裝置照片提醒」的功能擴充，先補訂閱／權益與角色限制的一致性。

產品細節仍由 [總規格](../SUBSCRIPTION_TIER_PLAN_2026_07_24.md)、[功能矩陣](SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md) 定義；本文件記錄本次確認、來源碼事實與後續順序，不覆寫 canonical 任務／發布 gate。

## 2. 方案與程式現況

| 項目 | 核對結果 | 狀態／缺口 |
| --- | --- | --- |
| Free／Pro／Team | `subscription-plans.ts` 有三個方案；Pro 個人進階分析／PDF／商品照片，Team 包含 Pro 並加員工／manager／成交照片 | 與本次 Team 確認一致；功能標籤仍不代表所有寫入已有付款限制 |
| 員工權益判定 | migration 064 的 `has_authoritative_team_entitlement` 檢查 owner、Team、admin 來源、billing none、active／grace 與到期時間 | 目前是可稽核的非收費授權路徑；不能視為已訂閱付款證明 |
| 員工邀請與存取 | 064 的邀請、接受、恢復、角色／權限更新及關鍵讀取 helper 會檢查 Team；client 寫入限既有 RPC | SQL 存在與舊 sandbox 報告不代表目前正式部署驗收；本次未連線改 DB |
| 席次 | 模型 Free=0、Pro=0；Team=3，標記 candidate | 來源搜尋未見資料庫席次計數 gate。不能公開保證已限制 3 席；商業數值、計數方式及並發限制須另行定案及實作 |
| 帳號權益 API | `account-capability-server.ts` 對 billing／promotion 回傳 disconnected + Free；admin 路徑可回可稽核測試權益 | 尚未完成真實付款 → 驗證／對帳 → 權益投影 → 能力 API 的閉環 |
| 商品封面 | `product-cover-photo-server.ts` 已有可設定的 server entitlementRequired 路徑 | implementation registry 仍記 open_pre_subscription；不可只因方案頁標付費就稱正式限制已開啟 |
| 成交照片 | upload route、metadata claim／server RPC 檢查 actor、來源成交、owner／staff、狀態及 rollout | registry 記 entitlement_enforcement_missing；正式收費前需補付款權益檢查及到期／退款回歸，不放寬現有角色與來源驗證 |
| 進階分析／PDF／報表 | 已接 authoritative capability read，再由 client 執行結果呈現或輸出 | registry 記 deployment smoke pending；不可稱全部已有伺服器產生或發布驗收 |
| Excel | coming_soon／not_implemented | 不當成現已可交付的付費功能 |
| 價格 | `subscription-pricing.ts` 五個版本仍為 candidate，無 effectiveAt | 不啟用價格、不修改歷史 price assignment，也不因 UI 展示視為商業核定 |

以上是本機來源碼核對，不是即時雲端設定、已套用 migration、營收或訂閱人數盤點。

## 3. 本次已補強的共用權益判斷

`lib/subscription/subscription-capabilities.ts` 原本將 `entitlementEndsAt` 解析失敗的 null 與「明確沒有期限」的 null 混用。
直接呼叫 `hasEffectiveEntitlement` 時，空字串／無效日期可能回 true；`resolveCapabilityFreshness` 也可能先回 fresh。
既有 server／client API parser 已會拒絕這些格式，因此這是共用模型的防禦缺口，並非本次已證明可繞過正式付款 API。

修正後：

- 明確的 `entitlementEndsAt: null` 仍保留既有管理員授權語意；不因此建立新的付費永久方案。
- 有填期限但格式錯誤時，不能授權；時效為 unavailable，不能換取離線 lease。
- 非有限的評估時間不能授權。
- 保留 active／grace、到期比較邊界、取消到期前有效、角色／runtime 限制，以及既有資料讀取／刪除規則。

先在 `tests/subscription-feature-gates.test.ts` 加入回歸並重現失敗，再修改共用判斷；未新增平台 API、DB writer、付款或商店介面。

## 4. 後續實作順序與完成條件

| 順序 | 工作 | 完成條件 |
| --- | --- | --- |
| S1 | 凍結可販售的方案／額度與生命週期規則 | 區分已確認、candidate、coming soon；席次計數、試用／優惠、退款／寬限／恢復行為有一致規格；重大商業選擇由使用者確認 |
| S2 | 完成每個付費操作的權益限制 | Team 工作空間與每個員工寫入都核對老闆權益；照片／報表／匯出各自依角色與權益 gate；未知來源不得授權，保留清理與讀取權利 |
| S3 | 補到期、降級與重新訂閱的一致性 | 到期即使尚未觸發資料列更新也不能繼續 server 存取；保留歷史與本機未完成資料；重新升級由老闆明確恢復既有員工，不自行復活權限 |
| S4 | 串接付款驗證與權益投影 | provider 已驗證交易經冪等對帳後更新權威投影；帳本、重複／亂序通知、退款、撤銷與來源失效都有保護；UI／URL／本機模擬不得直接授權 |
| S5 | Windows 可做的完整情境驗收 | Free／Pro／Team × 老闆／manager／operator × 有效／到期／未知／離線；邀請、接受、恢復、改角色、照片及跨帳號隔離；同時邀請／恢復不得超額 |
| S6 | 發布與商店驗收 | 方案頁、升級提示、到期資訊和實際 server 行為相符；真實 store sandbox、恢復購買、續訂、退款／撤銷、跨裝置與原生生命週期有外部證據 |

S1～S3、S5 主要可在 Windows 準備及驗證；S4 可先完成共享／server 契約與測試，但不能把假 provider 結果當成真實付款；S6 的外部帳號、商店與原生實機條件仍需實際取得。
本輪不要求立即租 Mac 或申請開發者帳號，也不啟動延後的 Web ECPay checkout。

付款權益接通時，必須同一個受審查的變更對齊能力 API 與資料庫 Team helper：目前前者把 billing 來源降為 Free，後者只認 admin，不能只改其中一層就宣布付款後可使用員工模式。

## 5. 既有發布紀錄核對

- 現行 canonical `LAUNCH_EXECUTION_TASKS_2026_08_09.json` 的 NATIVE-GATE2-EVIDENCE 與 NATIVE-RECONCILIATION-FOUNDATION 已 complete；不沿用早期 Gate 2 未完成的歷史敘述。
- 同檔 COMMERCIAL-POLICY 為 pending_manual；ENTITLEMENT-WRITER-RUNTIME 為 pending_approval，真實驗證／store catalog 仍有外部依賴。
- `NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json` 仍為 not_ready；不因本機修正或測試通過修改這些完成狀態。

## 6. 本輪邊界與驗證

沒有移動 Pro／Team 功能、修改售價／席次、授予真實帳號權益、套用 SQL、變更付款設定、部署或 commit／push；保留原工作目錄的 UX／Demo／素材變更。
本輪驗證已完成：

- `subscription-plan-model`、`subscription-feature-gates`、`subscription-account-capability-api`、`team-subscription-enforcement`、`native-account-entitlement` 五組測試通過；新增的無效期限案例先失敗、修正後通過。
- 受影響 ESLint 與 `tsconfig.mobile.json` TypeScript 通過。
- Web 正式建置、手機正式建置通過；手機靜態產物 354 檔、19.39 MiB，資產／邊界檢查及一般靜態主機 smoke（11 路由／資產）通過。
- 訂閱索引第 6 節共 304 個來源項目，索引與本報告的 Markdown 連結核對通過。
- 建置紀錄：`.codex-artifacts/subscription-alignment-{web-build,mobile-build,mobile-verify,mobile-smoke}.txt`。

這些是本機與隔離來源測試，不是正式環境、付費沙盒交易、員工登入或商店恢復購買的外部驗收。
