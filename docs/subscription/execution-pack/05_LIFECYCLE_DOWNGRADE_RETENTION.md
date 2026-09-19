# 05｜訂閱生命週期、降級與資料保留

日期：2026-07-24  
最後更新：2026-07-29  
狀態：行為規格

## 1. Trial

- trial capability 由 server source 提供；
- 到期後降 Free；
- 不刪除 trial 期間資料；
- 付費專屬內容保留可讀；
- 阻擋新的 paid-only write；
- 未有真實 `entitlementEndsAt` 不得顯示倒數。
- 只有 server 標記 `founderOfferEligible=true` 的 Pro trial 可在信任到期前取得創始鎖價；trial 由來與優惠資格是不同欄位。

## 2. Past Due / Grace

候選：

| 狀態 | 行為 |
|---|---|
| past due 0–7 天 | entitlementStatus=grace，保留能力並通知 |
| 超過 grace | entitlementStatus=inactive，阻擋 paid-only write |
| source unavailable | paid write fail closed |

7 天尚未批准，不可寫死 production。

Capability cache refresh deadline 與 entitlement end 必須使用不同欄位。Team enforcement 前另行定義 offline entitlement lease；暫時無網路不可直接被誤判為訂閱已到期。

## 3. Cancel At Period End

- 到期前維持 entitlement；
- 有真實日期才顯示結束日；
- 到期後降 Free；
- 不刪資料；
- Team staff 進入 suspended behavior。

## 4. Pro → Free

- 既有商品照片可讀、可刪；
- 不可新增或替換照片；
- 不再產生完整付費輸出；
- active products 超額時不刪除、不自動停用；
- 阻擋新增 active product；
- 允許停用商品。

## 5. Pro → Team

- provider 確認升級交易後立即授予 Team；
- 未使用 Pro 價值依實際付款金額折抵或退回；
- Team 依當時 Team `priceVersionId` 計價，不套用 Pro 65% 創始折扣；
- active / grace 創始 Pro 鎖價轉為 `dormant`；
- 交易失敗或 quote 過期時繼續保留 Pro，不得部分授予 Team；
- charge、credit / refund、effective time、renewal date 以 provider quote 與 reconciliation 為準。

## 6. Team → Pro / Free

- staff relationship 保留；
- workspace access suspended；
- 歷史活動保留；
- sales evidence retained；
- 不允許新 evidence；
- owner 可刪 retained evidence；
- 重新升級後由 owner 確認恢復 staff。
- Team → Pro 預設在下次 renewal boundary 生效；
- 若存在 dormant 創始 Pro 鎖價且付費關係未中斷，降級時恢復原年繳鎖價；
- 若 Team 取消且沒有安排 Pro 接續，到期實際 lapse 後才 forfeited。

## 7. Storage

- 不宣稱 unlimited；
- product cover photo 屬 Pro / Team；
- sales evidence 屬 Team；
- local pending blob 不是備份；
- R2 key、signed URL、Base64、blob 不得進 event payload；
- 超額帳戶不得新增，但可刪除。

## 8. Retention Table

| 資料 | 降級後讀取 | 新增 | 替換 | 刪除 |
|---|---|---|---|---|
| Markets | 是 | Free 規則 | 是 | 依既有規則 |
| Products | 是 | 受 active limit | 是 | 依既有規則 |
| Product photos | 是 | 否 | 否 | 是 |
| Sales evidence | owner 可讀 | 否 | 否 | 是 |
| Reports | 不刪除 | 新產生受限 | 視功能 | 依政策 |
| Staff relationships | owner 可見 | 否 | 否 | 可撤銷 |
| Staff activity | 保留 | 不再產生 | 不適用 | 不應任意刪除 |

## 9. Promotion Pro Pass

- `planSource='promotion'`；
- owner 手動啟用後使用真實 `entitlementEndsAt`；
- 只授予 Pro，不授予 Team；
- 到期後依 Pro → Free 規則處理；
- retained product photos 可讀、可刪，不可新增或替換；
- reward ledger 與 market operational events 分離；
- 不得由 client clock、localStorage 或 query string 延長。

## 10. Pro 創始年繳鎖價

| 生命週期狀態 | Pro entitlement | 鎖價狀態 | 結果 |
|---|---|---|---|
| 合格 trial 內完成年繳 | active | active | 記錄一次性固定指派價 |
| `cancel_at_period_end` | 期末前 active | active | 期末前可撤銷取消並保留鎖價 |
| payment retry / approved grace | grace | grace | 恢復成功續用原鎖價 |
| 期末取消實際生效 | inactive | forfeited | 未來重訂依當時公開價 |
| 超過 grace 仍未恢復 | inactive | forfeited | 未來重訂依當時公開價 |
| 已批准全額退款、chargeback、dispute 或 abuse | 依 billing policy | forfeited | 保留稽核紀錄，不得 client 恢復 |
| 連續升級 Team | Team active | dormant | Team 依當時價，不套用 65%；S8 驗證 provider 金流 mapping |
| Team 預約降 Pro | Team 到期前 active | dormant → active | 下次 renewal boundary 恢復原 Pro 年繳鎖價 |
| Team 取消無 Pro 接續 | Team 到期前 active | dormant → forfeited | 付費 entitlement 實際 lapse 時失效 |

公開 Pro 價格調漲只產生新 price version，不改寫 active、grace 或已批准 dormant 的創始指派價。鎖價不與其他結帳折扣或 paid credit 自動疊加。
