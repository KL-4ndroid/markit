# 04｜方案能力與角色權限交集

日期：2026-07-24  
最後更新：2026-07-29  
狀態：權限安全規格

## 1. 核心公式

```text
Account Plan Capability
AND Role Permission
AND Runtime Feature Gate
AND Data Readiness
```

方案有權限，不代表角色有權限。

## 2. 角色規則

### Owner

- 可查看方案與 billing presentation；
- 可查看 owner-only 財務；
- 可管理 staff，前提是 Team capability；
- 仍受 runtime gate 與 data completeness 限制。

### Manager

- 不應預設取得 billing control；
- 不應預設取得 owner-only settlement report；
- 不應預設取得 Excel / PDF export。

### Operator

- 可執行既有角色允許的市場日操作；
- sales evidence 必須同時通過 Team capability 與 operator role permission。

### Viewer

- 只讀；
- 不得因 Team 取得 write；
- 不得管理 billing 或 staff。

### Unresolved Role

- fail closed；
- 不顯示敏感資料或 billing control；
- 不允許 paid-only write；
- 不得暫時當 owner。

### Referral Reward

- 只有 owner 可以擁有 referral attribution 與 Pro Pass reward；
- staff / manager 不得代表 owner workspace 領取、啟用或轉讓獎勵；
- 推薦人資格需另通過 completed-market 與 server qualification；
- Pro Pass 只改 owner account 的 Pro entitlement，不改任何角色權限或 staff relationship。

### Founder Annual Price

- 只有 owner 可查看資格、接受年繳鎖價、管理續訂或取消；
- 只有 owner 可要求 Pro → Team quote、確認升級、安排 Team → Pro 或取消接續；
- manager / operator / viewer 不得取得鎖價、改變 price assignment 或查看 billing controls；
- 價格鎖定不改變方案能力或角色權限；
- Team 升級後的 dormant Pro 鎖價仍屬 owner billing state，不得被 staff 操作。

## 3. Staff 繼承

```text
staff effective plan = owner plan
```

只繼承方案能力，不繼承 owner 權限。

| 情境 | 結果 |
|---|---|
| Team viewer 新增銷售 | 拒絕 |
| Team operator 新增銷售 | 依既有 role 決定 |
| Pro owner 有既存 staff relationship | staff workspace 應 suspended |
| Team manager 下載 owner report | 預設拒絕 |

## 4. Team 降級

建議：

- 保留 staff relationship；
- 標記 `suspended_by_plan` 或等效狀態；
- 不刪歷史 activity；
- staff 不可操作 owner workspace；
- 重新升級後由 owner 手動確認恢復。

此規則需另行批准 schema / RLS slice。

## 5. 權限文件同步

任何以下修改都必須同步更新專案中的權限分布 Markdown：

- staff role、viewer、operator、manager、owner；
- PermissionGate、useUserRole、role-capabilities；
- sync、Dexie；
- 資料可見度、操作權限；
- subscription × role intersection。

AI 完成 slice 時必須輸出：

```text
Permission distribution document updated: yes / no / not applicable
```

適用但未更新時，slice 不得視為完成。
