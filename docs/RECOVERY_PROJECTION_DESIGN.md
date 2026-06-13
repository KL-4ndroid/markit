# Recovery 頁 Projection Rebuild 接入分析

更新日期：2026-06-13
階段：C2.17A
狀態：分析完成

## 一、現有 Recovery 面板概覽

`app/recovery/page.tsx` 目前有三個面板：

### 1.1 DatabaseRecoveryPanel

功能：處理 IndexedDB 健康檢查，修復 numeric cache 錯誤。
實作：待確認（未在本次分析範圍）。

### 1.2 OwnerRevenueGapRepairPanel（已完整實作）

- **用途**：新裝置或無痕登入後，本機收入為 0 但雲端有收入的情況。
- **服務**：`lib/sync/owner-revenue-gap-repair.ts` — `repairOwnerRevenueGaps()`
- **Owner-only**：✅ 有（`isStaff` guard）
- **Dry-run**：✅ 有（預覽可修復的市場清單）
- **Execute**：✅ 有（確認 dialog + 執行）
- **原理**：比對 `market.totalRevenue` 與雲端 `deal_closed` 事件總和，找出本地為 0 的市場，拉取雲端事件並 replay 來重建本地 projection
- **安全策略**：保守策略，只修復「本地收入 = 0 且本地無 events 且雲端有收入」的市場（零風險：不會 double-count）

### 1.3 LocalProjectionRepairPanel（已完整實作）

- **用途**：本機已存在 `deal_closed` events，但 `markets` / `dailyStats` projection 被重複累加。
- **服務**：`lib/projections/market-projection-service.ts` — `repairMarketProjectionsFromEvents()`
- **Owner-only**：✅ 有（`isStaff` guard）
- **Dry-run**：✅ 有（預覽 market 清單 + before/after 數值）
- **Execute**：✅ 有（確認 dialog + 執行）
- **原理**：使用 `reconcileTouchedMarketProjections` 和 `compareMarketProjectionWithEvents`，當 `status === 'inflated'` 時重建 projection
- **重建範圍**：`market.totalRevenue` / `totalDeals` / `totalInteractions` + `dailyStats`

## 二、C2.17A 原始需求對照

C2.17A 原始需求：

> - Owner-only guard ✅（已有）
> - dry-run ✅（已有）
> - confirm dialog ✅（已有）
> - execute 只修 dry-run 中確認過的 markets ✅（已有）
> - 清楚說明只修本機 projection，不改雲端、不刪 events ✅（已有說明）

**結論**：C2.17A 的功能需求**已全部滿足**，無需修改 production code。

## 三、程式碼品質評估

### 3.1 OwnerRevenueGapRepairPanel

| 項目 | 評估 |
|------|------|
| 程式碼行數 | ~300 行（含 UI 元件） |
| 職責分離 | 面板只負責 UI 狀態和呈現，業務邏輯委託給 `repairOwnerRevenueGaps` |
| 錯誤處理 | try-catch 包圍，toast 回饋 |
| TypeScript | 使用明確的 `PanelState` 和 `OwnerRevenueGapRepairResult` 類型 |
| Owner guard | 三層保護：未登入 / 載入中 / Staff |

### 3.2 LocalProjectionRepairPanel

| 項目 | 評估 |
|------|------|
| 程式碼行數 | ~260 行（含 UI 元件） |
| 職責分離 | 面板只負責 UI 狀態和呈現，業務邏輯委託給 `repairMarketProjectionsFromEvents` |
| 錯誤處理 | try-catch 包圍，toast 回饋 |
| TypeScript | 使用明確的 `PanelState` 和 `MarketProjectionRepairResult` 類型 |
| Owner guard | 三層保護 |

### 3.3 Recovery Page 元件組合

`app/recovery/page.tsx` 組合了三個面板，邏輯清晰，職責分明。建議在未來增加面板時保持此模式。

## 四、使用建議區塊

`app/recovery/page.tsx` 底部有使用建議說明（lines 42-50）：

1. 先檢查資料庫狀態（numeric cache 錯誤才用資料庫修復）
2. 新裝置或無痕登入後收入不一致 → 用「收入差距修復」
3. 本機收入倍增且已有 deal_closed events → 用「本機統計投影修復」
4. 修復完成後重新整理頁面

此說明文字**已足夠**，但隨著 snapshot 功能暫停（C2.18E），第三條的「本機收入倍增」場景可能需要更新說明，以反映 snapshot 不再是常見原因。

## 五、剩餘潛在改進（非 C2.17A 必要）

### 5.1 建議文字更新（可選）

將第三條更新為反映真實場景：
```
原文：若本機收入出現倍增，但本機已經有 deal_closed events，使用「本機統計投影修復」。
建議更新為：若本機收入數字與成交明細總和不符（倍增或不一致），使用「本機統計投影修復」。
```

### 5.2 Recovery 面板的 market 名稱顯示

`LocalProjectionRepairPanel` 目前只顯示 `marketId.slice(0, 8)`，建議改為顯示市集名稱（需串接 `db.markets.get(marketId)`）。

### 5.3 共同 BlockedPanel 邏輯抽離

兩個面板都有重複的 `BlockedPanel` / `BusyButton` 元件，建議抽離為共用元件（如 `components/common/RecoveryPanel.tsx`）。

## 六、結論

**C2.17A 已完成**：Recovery 頁的 Projection Rebuild 接入已完整實作，Owner-only guard、dry-run、confirm、execute 只修 dry-run 結果等所有功能需求均已滿足。

**無需修改 production code。**

文件建議：
- 更新使用建議說明（第 3 條）以反映 snapshot 已暫停
- 建議顯示 market 名稱而非 marketId
- 考慮抽離共用面板元件

## 七、與 C3.3 的關係

`OwnerRevenueGapRepairPanel` 實作依賴 `repairOwnerRevenueGaps`，該 service 會從 Supabase 拉取 `deal_closed` 事件並 replay 到本地。此流程與 C3.3 的「cloud pull replace cache」策略在概念上接近，但有以下差異：

| | OwnerRevenueGapRepair | C3.3 Replace Cache |
|---|---|---|
| 觸發方式 | 手動（用戶在 Recovery 頁操作） | 自動（登入後 sync） |
| 範圍 | 選擇性修復（只修復本地 = 0 的市場） | 全量替換（針對所有已授權市場） |
| 風險 | 保守（只修零收入市場） | 中等（全量替換需確保完整性） |
| handler replay | 選擇性（只 replay gap 市場的 events） | 全量（所有市場的 events） |

C3.3 實作後，`OwnerRevenueGapRepairPanel` 的策略可能需要調整，避免與自動 sync 的 replace-cache 邏輯重疊或衝突。
