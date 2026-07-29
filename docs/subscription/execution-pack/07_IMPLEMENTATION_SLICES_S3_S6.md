# 07｜Implementation Slices：S3–S6

日期：2026-07-24  
狀態：需逐 slice 明確批准

# S3｜Feature Gate Mapping Audit

建立 feature registry，涵蓋 product cover photo、sales evidence、advanced analytics、PDF、Excel、staff、manager、collaboration readiness。

每筆必須有：

```text
feature id
product tier
current UI source
current runtime source
server enforcement
role requirement
data requirement
production status
downgrade behavior
```

不啟用 route、不改權限。

# S4｜Server Capability Read Model

前置：S0–S3 完成且使用者批准。

可能檔案：

```text
app/api/account-capabilities/route.ts
lib/subscription/account-capability-client.ts
lib/subscription/account-capability-server.ts
tests/subscription-account-capability-api.test.ts
```

必須支援 Free、Admin Pro、Admin Team、stale、unavailable、staff 讀 owner capability。

禁止 client mutation、checkout、public env plan、localStorage plan。

# S5｜Product Cover Photo Alignment

實作狀態（2026-07-29）：本機完成；`open` 維持啟用，`required` 與 production activation 尚未批准。

前置：S4 完成且照片 gates 穩定。

規則：

- open mode 誠實；
- required mode server check；
- Free / downgrade 可 view / delete retained photo；
- 不可 upload / replace；
- 不可靠 client button。

# S6A｜Analytics Presentation Gates

Free 保留來源資料與 data completeness，不提供 basic analytics 或 basic rejoin 結果。

Pro / Team 解鎖單場 basic analytics、basic rejoin、comparison、recommendations、trend、advanced recap。

不得修改 analytics 計算語意。

# S6B｜Report Tier Gates

前置：PDF / Excel 功能另行批准。

- Free：limited preview；
- Pro / Team：產生 approved report；
- manager 不自動取得；
- staff 不顯示 owner-only financial report；
- downgrade 阻擋新產生，不刪 retained report；
- 觸及權限時同步更新權限 Markdown。
