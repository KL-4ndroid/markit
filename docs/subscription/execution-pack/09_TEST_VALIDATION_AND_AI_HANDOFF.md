# 09｜測試、驗證與 AI Handoff

日期：2026-07-24  
最後更新：2026-07-29  
狀態：所有 slice 共用

## 1. 每個 Slice 流程

開始前：

1. 指出 slice。
2. 列出精確檔案。
3. 列出測試。
4. 列出不修改範圍。
5. 檢查 stop condition。

完成後：

1. 摘要變更。
2. changed files。
3. intentionally unchanged files。
4. focused tests。
5. build / lint / mobile tsc。
6. 權限文件同步狀態。
7. 風險。
8. commit hash。
9. 不自動進下一 slice。

## 2. 核心測試情境

1. Free 不授予 product photo upload。
2. Pro model 有 product photo，但 runtime 仍受既有 gate。
3. Team model 有 sales evidence，但 route 不自動啟用。
4. Growth Reserve 不出現在可購買方案。
5. missing / stale capability 不顯示 active paid plan，也不允許 paid write。
6. staff 不顯示 billing control。
7. viewer 不因 Team 取得 write。
8. manager 不因 Team 取得 owner report export。
9. data completeness 與 plan entitlement 分開。
10. downgrade 不刪 retained photos。
11. downgrade 阻擋 upload / replace。
12. Team downgrade 保留 staff relationship。
13. unresolved role fail closed。
14. UI blocked reason 與 server reason 一致。
15. pricing 不宣稱 billing 已上線。
16. cancel at period end 到期前維持 entitlement。
17. active product limit 不刪超額歷史商品。
18. Growth Reserve 不存在於 AccountPlanCode。
19. promotion Pro Pass 只授予 Pro，不授予 Team。
20. raw signup、自我推薦、重複 qualification、第二層推薦不發獎勵。
21. benchmark consent 必須 explicit opt-in，且不是 entitlement。
22. capability refresh deadline、entitlement end、offline lease 不混用。
23. 只有 eligible Pro trial 在信任到期前完成年繳才取得一次 founder price assignment。
24. 公開 Pro 價調漲不改寫 active / grace / valid dormant 創始指派價。
25. `cancel_at_period_end` 期末前保留鎖價，撤銷取消仍保留，實際 lapse 後才 forfeited。
26. retry / grace 內恢復保留鎖價，超過 grace 中斷後重訂依當時公開價。
27. refund / chargeback / dispute / abuse 轉移是 server-authoritative、idempotent 與 auditable。
28. founder price 不與 referral paid credit 或其他 checkout discount 自動疊加。
29. Pro 升 Team 使用當時 Team price version，不套用 Pro founder 65%。
30. Pro 未使用價值以 actual paid amount 計算，不以公開價補足。
31. provider 確認升級前不授予 Team，失敗或 quote 過期時保留 Pro。
32. 升級確認後 Team 立即生效，founder lock 轉 dormant。
33. Team 降 Pro 在 renewal boundary 生效，付費不中斷時恢復 dormant 年繳鎖價。
34. Team 取消無 Pro 接續時，dormant lock 只在 paid entitlement 實際 lapse 後 forfeited。
35. 重複 webhook / store notification 不重複 credit、refund 或 lock transition。
36. client 不得用本地公式決定最終 charge、credit / refund、effective time 或 renewal date。
37. provider 無 exact pre-purchase quote 時使用 `provider_confirmation`，無法取得的值留 `null`，不偝造 client 金額或日期。

## 3. 驗證指令

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npx.cmd tsc --noEmit --project tsconfig.mobile.json
git diff --check
git status --short
```

若 repo-wide 指令因既有問題失敗，必須記錄完整錯誤並提供 focused evidence。

## 4. 手動矩陣

Viewports：

```text
390x844
768x1024
1440x900
1920x1080
200% zoom
```

Roles：

```text
owner
staff viewer
staff operator
manager
unresolved role
role refresh in progress
```

Account states：

```text
free
admin-enabled Pro
admin-enabled Team
billing unavailable
capability fetch error
stale capability
downgraded
past due
grace
cancel at period end
founder offer eligible / ineligible
founder lock active / grace / dormant / forfeited
founder cancellation scheduled / reversed / effective
public price version changed
Pro-to-Team quote / pending / confirmed / failed
Team-to-Pro scheduled / founder lock restored
Team cancelled without Pro replacement
```

## 5. Stop Conditions

停止並要求批准：

- Supabase subscription table；
- RLS、staff views、role capabilities；
- production upload / evidence / PDF / Excel；
- billing provider / checkout / charge / trial / cancel / refund；
- native purchase；
- public partner profile、creator、matching、chat；
- 修改 analytics 公式；
- 刪除 retained data。
- referral attribution、qualification、reward ledger、Pro Pass grant、paid credit；
- contact import、cash reward、percentage reward、multi-level reward；
- founder eligibility、price assignment / lock ledger、provider price / discount / offer code、checkout 或價格異動；
- plan-change quote、proration、credit / refund、upgrade、downgrade 或 reconciliation route；
- client-authoritative trial、price、renewal、cancellation、quote 或 lock state。

## 6. AI Handoff Prompt

```text
先閱讀三份 canonical 文件，再依序閱讀 00–09。每次只執行一個 slice，預設從 S0A 開始。開始前列出精確修改檔案、測試、不修改範圍與 stop-condition 檢查。完成後提供 focused tests、build、lint、mobile TypeScript、git diff --check、changed files、intentionally unchanged files、權限文件同步狀態、剩餘風險與 commit hash。

不得實作 billing、checkout、native purchase、公開 marketplace、creator workflow、RLS 變更、權限擴張、production upload、PDF/Excel 啟用，除非使用者明確批准對應 slice。

不得實作 referral attribution、reward grant、Pro Pass activation、subscription credit、contact import、cash / percentage / multi-level reward，除非使用者明確批准 P1–P5 對應 slice。

不得實作 founder eligibility、price assignment、price lock ledger、provider product / price / discount / offer code、checkout、plan-change quote、proration、credit / refund、upgrade / downgrade 或 webhook，除非使用者明確批准 F1–F4 與必要的 S8–S9 slice。鎖價續訂必須使用 server-owned 固定指派金額，不得依當期公開價重算 65%。Pro → Team 必須使用 actual-paid 剩餘價值與當時 Team price version，最終金額與日期以 provider 為準。

方案能力、角色權限、runtime gate、資料完整度必須分開判定。任何 staff role、viewer、operator、manager、owner、PermissionGate、useUserRole、role-capabilities、sync、Dexie 權限行為修改，都必須同步更新專案中的權限分布 Markdown 文件。
```

## 7. 建議第一個任務

```text
執行 S0A：訂閱現況稽核。

只讀取與搜尋現有程式碼，建立：
- docs/subscription/SUBSCRIPTION_CURRENT_STATE_AUDIT.md
- docs/subscription/SUBSCRIPTION_FEATURE_GATE_REGISTRY.md

不得修改 runtime behavior、RLS、角色權限、照片、報表、export、billing 或 API。完成後執行 git diff --check，提交 docs-only commit。
```
