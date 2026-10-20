# Féria｜固定、非固定與混合營業模式
## 精簡實作規格與 Codex 執行契約 v1.1

- **文件日期：** 2026-08-14
- **文件狀態：** Implementation-ready proposal
- **目標專案：** `KL-4ndroid/markit`
- **建議執行模型：** `gpt-5.6-sol`
- **建議推理強度：** `medium`
- **執行方式：** 單一 Codex agent、一次一個 slice、每個 slice 都有固定輸入／輸出／驗證／停止條件
- **上游需求來源：** `C:/Users/chean/Pictures/FERIA_RECURRING_HYBRID_OPERATIONS_CODEX_SPEC_v1.0.md`

---

# 0. 文件目的與優先順序

本文件把 v1.0 的完整產品方向收斂成可以安全分階段完成的實作契約。

本文件不是要推翻 v1.0 的核心 domain model，而是修正以下執行風險：

1. 不把 Domain、Dexie、Event Sourcing、Supabase、RLS、UX、Analytics 與 onboarding 綁成一次巨大交付。
2. 不要求使用者先理解 Venue、Schedule、Session、Occurrence 等工程概念。
3. 不允許兩台離線裝置為同一固定日期建立不同 canonical Market ID。
4. 不擴張 Manager、Operator、Viewer 的既有權限。
5. 不讓固定攤商被迫經過「已報名 → 已錄取 → 已繳費」的市集申請語意。
6. 不讓純臨時出攤使用者增加任何必要步驟。
7. 不讓這項功能延伸成 POS、餐飲 ERP、進銷存或複雜行事曆產品。

需求與執行文件的優先順序如下：

1. `AGENTS.md`
2. `docs/CROSS_PLATFORM_VIBE_CODING_GUARDRAILS.md`
3. 本文件 v1.1
4. v1.0 的產品 Constitution 與未被本文件取代的需求
5. 現有程式碼與測試所證明的正式行為

若 v1.0 與本文件衝突，以本文件的精簡範圍、權限、分期與停止條件為準。

---

# 1. Codex 執行設定

## 1.1 固定模型設定

未來執行本計畫時，使用：

```text
model: gpt-5.6-sol
reasoning effort: medium
```

本計畫不需要因為文件長度、跨檔案搜尋或測試數量，自動提升到 high / xhigh / max / ultra。

如果執行環境沒有 `gpt-5.6-sol`，應停止並告知使用者，不要自行改用更昂貴的推理設定。

## 1.2 執行節奏

每次只執行一個編號 slice：

```text
讀取該 slice 的必要檔案
→ 確認 worktree 與既有變更
→ 列出本 slice 的 shared logic / platform capability / data risk
→ 實作
→ 跑 focused verification
→ 修正到 gate 通過
→ 回報 changed / unchanged / tests / risks
→ 才進入下一個 slice
```

同一 slice 內，只要沒有命中 STOP CONDITION，Codex 可以自主完成低風險實作細節，不需要逐項詢問。

不得因為「接下來順手可以做」而跨入下一個 slice。

## 1.3 每個 slice 開始時必做

```powershell
git status --short --branch
git log -5 --oneline --decorate
```

並確認：

- 現在的 branch / HEAD，不依賴本文件撰寫時的狀態。
- 使用者既有未提交變更，不覆寫、不整理、不納入本功能 commit。
- 是否有新 migration、角色文件、同步修改或測試使本文件基線過期。
- 本 slice 是否觸及瀏覽器／裝置 API；若有，必須使用 `lib/platform` contract。

## 1.4 每個 slice 結束時固定回報

```text
Slice:
Outcome:
Changed files:
Intentionally unchanged:
Focused tests:
Build / typecheck:
Cross-platform result:
Permission result:
Data / migration result:
Known limitations:
STOP condition encountered: yes / no
Next slice:
```

---

# 2. Product Constitution

下列原則不得被 implementation detail 改寫。

> Féria 不分類使用者是哪一種攤商；Féria 只記住營業據點、固定規律與實際發生的營業場次。

> Venue 描述在哪裡營業；OperationSchedule 描述通常什麼時候營業；既有 Market 暫時承載一次實際營業場次。

> 固定與臨時只影響 Market／Session 的產生方式，不影響之後的交易、成本、商品、Staff、結算與 Analytics。

> 現有 Market、market_id、Event Log、DailyStats 與既有資料都是相容性資產；v1.1 禁止 Big-Bang Rename。

> Domain 可以完整，但 UI 只讓使用者處理今天有什麼不同。

---

# 3. v1.1 已凍結產品決策

## 3.1 第一版正式包含

- Owner 可建立 0..N 個營業據點。
- Owner 可建立 0..N 個每週固定營業安排。
- 一個固定安排可選擇一週 1..N 天，但這些 weekday 共用相同開始／結束時間。
- 支援起始日期、可選結束日期、跨午夜、pause、resume、archive。
- 固定安排只保存現有正式 Market 欄位能表達的 defaults。
- 固定安排產生未來 8 週的 planned compatibility Markets。
- 純臨時 Market 建立流程繼續存在。
- 固定與臨時 Markets 在首頁 Today / Upcoming 使用同一時間軸。
- 固定場次可一鍵開始營業。
- 支援略過一次、只修改一次、從這次開始修改未來。
- closed / completed / ongoing / 有使用者活動的歷史資料不可被 Schedule reconcile 改寫。
- Owner 的固定安排跨裝置同步。
- Staff 依既有 Market 權限看到並操作已 materialize 的固定場次。
- 所有方案都可使用核心固定營業能力，不新增 Session 數量付費牆。

## 3.2 第一版明確不包含

- 強制 onboarding 問卷。
- 永久 `businessType`、`night_market_mode`、`hybrid_mode`。
- Manager / Operator / Viewer 建立、修改、暫停或封存 Schedule。
- 自動將 legacy Markets 依 name / location 合併成 Venue。
- 月週期、每月第 N 個星期幾、RRULE、國定假日、自動節慶排除。
- 自然語言 recurrence parser。
- 天氣、人流、AI 備貨、需求預測。
- 新的 target revenue / target orders 欄位，除非 repo audit 證明已有正式 source of truth。
- 新的 service fee 公式；只可沿用現有 `commissionRate` 或其他已存在正式欄位。
- Venue comparison、weekday analysis、fixed-vs-other contribution 的 runtime UI。
- POS、桌號、點餐、廚房單、電子發票、CRM、預約、完整庫存 ERP。
- Capacitor package、native project、native adapter 或原生背景排程。

## 3.3 不做強制 onboarding

純臨時出攤使用者的 first-run 與建立 Market 流程不得增加必要步驟。

第一版只提供情境式入口：

- 在「新增營業」中選擇「單次營業」或「每週固定」。
- 建立單次 Market 後，可以顯示次要動作「儲存為固定安排」。
- Settings 可進入「固定營業安排」。

不得在登入後強迫回答：

```text
你是固定／不固定／Hybrid 嗎？
```

---

# 4. Canonical Terminology

為避免現有 `operationSessionDate` 與新 Session 概念衝突，v1.1 使用以下工程名稱。

| 概念 | 工程名稱 | UI 中文 | 說明 |
|---|---|---|---|
| 長期地點 | `Venue` | 營業據點 | 可被多次使用的地點 identity |
| 固定規律 | `OperationSchedule` | 固定營業安排 | 每週何時在某 Venue 營業 |
| 固定規律中的某一天 | `ScheduleOccurrence` | 不直接顯示 | 例如某 Schedule 的 2026-08-17 |
| 一次實際營業 | 現有 `Market` compatibility entity | 營業場次／場次 | 第一版不全域 rename 成 Session |
| 多日 Market 中每日開收攤狀態 | `OperatingDayState` concept | 今日營業狀態 | 現有 `operationSessionDate` 的真正語意 |

新程式碼不得使用沒有上下文的 `SessionService`、`sessionDate`、`sessionState` 命名。

優先使用：

- `scheduled-market-materializer.ts`
- `schedule-occurrence.ts`
- `operating-day-state.ts`

UI 不顯示：

- recurrence
- occurrence
- materialization
- revision
- canonical ID

---

# 5. 現有基線：每次執行都要重新驗證

本文件撰寫時觀察到：

- `types/db.ts` 的 MarketStatus 為 `registered / accepted / paid / ongoing / completed / postponed / cancelled`。
- `market_created` local projection 預設產生 `registered` Market。
- `lib/markets/market-operating-session.ts` 目前主要將 `paid / ongoing` 視為可進入現場操作。
- `Market.operationSessionDate` 已用於多日 Market 的每日操作狀態。
- Dexie 最新 schema 為 version 7。
- backup format 只接受 version 1。
- remote migration 撰寫時最新為 `068_add_daily_market_operation_sessions.sql`。
- Owner sync 主要拉取 event log；Staff sync 使用 sanitized views。
- `RoleCapabilities` 沒有 `canManageSchedules`。
- `buildTodayViewModel()` 已有 Today / Upcoming 統一 view model。
- `analytics.advanced` 已有正式 subscription capability。

這些都是 audit 起點，不是永久保證。Codex 必須以執行當下 repo 為準。

---

# 6. Data Contract

## 6.1 Venue

欄位命名需符合現有 local / remote mapper 慣例。Domain contract：

```ts
export interface Venue {
  id: string;
  owner_id: string;

  name: string;
  address?: string;
  locationNote?: string;

  status: 'active' | 'archived';
  isDeleted?: boolean;

  createdAt: number;
  updatedAt: number;
  sync_status?: 'local_only' | 'pending' | 'synced' | 'conflict' | 'error';
}
```

第一版不加入：

- latitude / longitude
- map provider ID
- category
- weather mapping

## 6.2 OperationSchedule

```ts
export interface OperationSchedule {
  id: string;
  owner_id: string;
  venueId: string;

  name?: string;
  timezone: string; // v1 default Asia/Taipei

  recurrence: {
    frequency: 'weekly';
    interval: 1;
    weekdays: number[];
    startDate: string; // YYYY-MM-DD
    endDate?: string;
  };

  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  endsNextDay: boolean;

  defaults: {
    registrationFee?: number;
    boothCost?: number;
    deposit?: number;
    tableRental?: number;
    chairRental?: number;
    umbrellaRental?: number;
    tableclothRental?: number;
    commissionRate?: number;
    tableFree?: boolean;
    chairFree?: boolean;
    umbrellaFree?: boolean;
    tableclothFree?: boolean;
    notes?: string;
  };

  status: 'active' | 'paused' | 'archived';
  revision: number;

  createdAt: number;
  updatedAt: number;
  sync_status?: 'local_only' | 'pending' | 'synced' | 'conflict' | 'error';
}
```

不得在 defaults 建立第二套成本或財務公式。

## 6.3 Market compatibility fields

```ts
export type MarketOrigin = 'manual' | 'schedule' | 'legacy';

export type ScheduleOccurrenceState =
  | 'scheduled'
  | 'skipped'
  | 'suppressed'
  | 'rule_removed';

export interface Market {
  // existing fields remain unchanged

  venueId?: string;
  scheduleId?: string;
  sessionOrigin?: MarketOrigin;

  scheduleOccurrenceKey?: string;
  scheduleRevision?: number;
  scheduleOccurrenceState?: ScheduleOccurrenceState;
  isScheduleOverride?: boolean;
}
```

現有 `Market.name / location / dates / startDate / endDate / startTime / endTime / costs` 是當次 snapshot。

Venue 或 Schedule 修改後，不得透過 live reference 改寫歷史 Market 顯示與財務欄位。

## 6.4 Occurrence state 行為

| State | Today / Upcoming | 可被 generator 再建立 | 可自動恢復 |
|---|---|---|---|
| `scheduled` | 顯示 | 否，同一 deterministic ID 已存在 | 不適用 |
| `skipped` | 不顯示 | 否 | 否 |
| `suppressed` | 不顯示 | 否 | Schedule resume 且仍符合規則時可以 |
| `rule_removed` | 不顯示 | 否 | 新 revision 再次包含該日期且沒有活動時可以 |

Legacy / manual Market 沒有此欄位，既有行為不變。

略過一次時：

- `scheduleOccurrenceState = 'skipped'`
- Market status 使用既有 `cancelled`
- 保留 Market 與 occurrence identity
- generator 永遠不得重新建立同一 occurrence

Pause 時：

- 不刪除 Market
- 未來且未開始、無 override、無使用者活動的 scheduled occurrence 改為 `suppressed`
- Resume 時重新計算，符合規則的 suppressed occurrence 回到 `scheduled`

Rule revision 移除某日期時：

- 未來且安全可 reconcile 的 occurrence 改為 `rule_removed`
- 不 destructive delete

Archive 時：

- Schedule 不再生成 occurrence
- 未來且安全可 reconcile 的 occurrence 改為 `suppressed`
- 歷史與有活動的 occurrence 不變

---

# 7. Deterministic Identity 與離線去重

這是 release blocker，禁止只使用 UI `find()` 再 `insert()`。

## 7.1 Canonical occurrence key

```text
scheduleOccurrenceKey = `${ownerId}:${scheduleId}:${localOccurrenceDate}`
```

其中 `localOccurrenceDate` 使用 Schedule timezone 中的 `YYYY-MM-DD`。

## 7.2 Deterministic Market ID

Schedule-generated Market ID 必須由 stable UUID v5 產生：

```text
scheduledMarketId = uuidV5(
  `scheduled-market:${scheduleOccurrenceKey}`,
  FERIA_RECURRING_OPERATIONS_NAMESPACE,
)
```

namespace 必須是 repo 內固定常數並有測試；不得每台裝置自行生成 namespace。

兩台已同步到同一 Schedule 的裝置，對同一日期必須得到相同 Market UUID。

## 7.3 Deterministic generated event IDs

Materializer 自動產生的事件也要 deterministic：

```text
market_created:
uuidV5(`market-created:${scheduleOccurrenceKey}`, namespace)

revision reconcile update:
uuidV5(`schedule-reconcile:${scheduleOccurrenceKey}:r${revision}`, namespace)
```

使用者手動操作事件繼續使用既有 event ID 規則。

## 7.4 Local 與 remote guarantee

必須同時有：

1. Dexie deterministic primary key。
2. Event primary key idempotency。
3. Supabase Market ID primary key guarantee。
4. Remote unique index：`(owner_id, schedule_occurrence_key)`，只套用非 null rows。
5. Retry / pull / replay 對相同 generated event 不重複 apply。

若發現現有 sync push 使用 insert 而不能安全接受 deterministic retry，先以最小範圍調整 generated-event push；禁止順手重寫整個 sync architecture。

## 7.5 已有活動的 duplicate STOP CONDITION

如果 audit 或測試發現 production／fixture 已存在：

- 相同 occurrence key 的兩個不同 Market IDs；且
- 兩邊都有 deal / interaction / note / checklist / DailyStats / operating events；

停止自動合併，產生 read-only report 與可選方案。不得猜測 canonical winner 或刪除任何一邊。

---

# 8. Schedule Reconciliation Contract

## 8.1 純函式輸入輸出

Recurrence 與 reconcile 先實作成 platform-neutral pure functions：

```ts
calculateWeeklyOccurrences(schedule, fromDate, throughDate): string[]

planScheduleReconciliation({
  scheduleBefore,
  scheduleAfter,
  existingMarkets,
  activityByMarketId,
  fromDate,
  throughDate,
}): ReconciliationPlan
```

`ReconciliationPlan` 只能描述：

- create
- update snapshot
- suppress
- mark rule removed
- restore
- preserve
- blocked with reason

Pure planner 不可直接寫 Dexie、Supabase 或呼叫瀏覽器 API。

## 8.2 不可自動改寫條件

下列 Market 一律 `preserve` 或 `blocked`：

- `status === 'ongoing'`
- `status === 'completed'`
- `isScheduleOverride === true`
- 已有 `market_started / market_ended`
- 已有 deal / interaction / DailyStats
- 已有 field note / checklist user activity
- 不是 `sessionOrigin === 'schedule'`
- owner scope 不符

如果 future Market 已有人為活動但新 Schedule 規則不再包含該日期，不可隱藏或取消；回報它是 retained exception。

## 8.3 只修改這一次

- 更新該 Market snapshot。
- `isScheduleOverride = true`。
- Schedule 不變。
- occurrence key 與 Market ID 不變。
- 之後 reconcile 永遠保留這筆 override。

## 8.4 從這次開始修改未來

- Owner-only。
- 更新 Schedule rule/defaults。
- `revision += 1`。
- effective date 為使用者選定 occurrence date。
- effective date 之前的 Market 全部不變。
- effective date 之後只修改符合安全條件的 Markets。
- 新日期使用相同 deterministic identity 規則建立。

## 8.5 Timezone 與跨午夜

- Recurrence 以 IANA timezone 與 calendar date 計算。
- v1.1 預設 `Asia/Taipei`，但資料不得省略 timezone。
- 不可使用會因 UTC 轉換漂移的 `new Date('YYYY-MM-DD')` 作為唯一日期算法。
- 日期計算保持 platform-neutral；不得依賴 `window`。
- `endsNextDay` 只表示結束時間在隔日，不把 occurrence date 改成隔日。
- Analytics 歸屬日使用 occurrence start local date。

---

# 9. Event Sourcing Contract

## 9.1 新增事件

若 S0 audit 證明仍符合現有 Event Log + snapshot architecture，新增：

```text
venue_created
venue_updated
venue_archived

operation_schedule_created
operation_schedule_updated
operation_schedule_paused
operation_schedule_resumed
operation_schedule_archived
```

不新增 `session_created`。Schedule-generated Market 繼續使用既有：

```text
market_created
market_updated
market_status_changed
market_started
market_ended
```

## 9.2 Projection

- Venue events 投影到 `venues`。
- OperationSchedule events 投影到 `operationSchedules`。
- Market compatibility fields 隨既有 Market events 投影到 `markets`。
- generated events 必須經同一套 `recordEvent()` / sync pipeline，不可在 runtime 只寫 snapshot。

## 9.3 Replay

`rebuildSnapshots()` 必須：

- 清理並重建 venues / operationSchedules / markets / products / dailyStats 的正確範圍。
- 保持 deterministic event order。
- 重複 replay 結果相同。
- generated event 重複出現時不建立 duplicate occurrence。
- staff scoped replay 不取得 owner-only Venue / Schedule 管理資料，除非正式 RLS contract 明確允許。

禁止因本功能 broad refactor 所有既有 event handlers。

---

# 10. Dexie、Backup、Import 與 Recovery

## 10.1 Additive Dexie migration

執行時先確認最新 version。若仍是 7，新增 version 8：

```text
venues
operationSchedules
```

Market 建議索引至少考慮：

```text
scheduleId
venueId
scheduleOccurrenceKey
[owner_id+scheduleOccurrenceKey]
```

實際索引以查詢與 Dexie 支援方式決定，不得為了索引重寫 legacy rows。

Migration 必須：

- additive
- 不清空既有表
- 不修改 closed/completed Market
- 不自動建立 Venue
- 不依名稱合併資料
- 允許所有 legacy Market 新欄位為 undefined

## 10.2 Backup v2

新增：

```ts
interface BackupDataV2 {
  version: 2;
  exportedAt: number;
  events: Event[];
  markets: Market[];
  products: Product[];
  dailyStats: DailyStats[];
  settings: Settings[];
  venues: Venue[];
  operationSchedules: OperationSchedule[];
}
```

Import 必須同時接受：

- v1：缺少 venues / schedules 時視為空陣列。
- v2：驗證新表、event type 與關聯。

Export 新資料一律輸出 v2。

不得把 local backup 改成主要使用者 recovery CTA。Recovery 方向繼續遵守 cloud-rebuild-first；本 slice 只確保資料完整性與相容性。

## 10.3 Import / integrity

- import preflight 認得新 event types。
- invalid Venue / Schedule payload fail closed。
- duplicate occurrence key 進入 blocking error 或明確 conflict report。
- import replace transaction 必須包含新表。
- 任何 clear / replace 都保留既有安全邊界，不新增 production execute 快捷路徑。

---

# 11. Remote Sync 與 RLS

## 11.1 Remote schema

若執行時最新 migration 仍為 068，使用 069；否則使用下一個未占用編號。

Migration code 應包含：

- `venues` snapshot table。
- `operation_schedules` snapshot table。
- `markets` compatibility columns。
- event type CHECK constraint 更新。
- event-to-snapshot projection function / trigger。
- owner indexes。
- partial unique index `(owner_id, schedule_occurrence_key)`。
- updated staff market view，讓 staff 能讀到已 materialize Market 所需 compatibility fields。

## 11.2 MVP 權限

Venue / Schedule runtime management：

| Role | Read Venue/Schedule management data | Write Venue/Schedule | Operate generated Market |
|---|---:|---:|---:|
| Owner | Yes | Yes | Yes |
| Manager | No in MVP | No | Existing Market capability only |
| Operator | No | No | Existing Market capability only |
| Viewer | No | No | Read-only according to existing contract |
| Unresolved role | No | No | No privileged write |

Manager 不因現有 `canEditMarketBasic` 自動取得 Schedule 管理權。

Staff 不需要讀取 owner 的完整 Schedule defaults；Staff 只需要從 sanitized Market projection 得到現場操作必要資料。

## 11.3 Owner-only materialization

第一版只允許 Owner 執行 `ensureScheduledMarkets()`。

- Owner hydration / foreground 可補齊 8 週 horizon。
- Schedule create / update / resume 後立即補齊。
- Staff 裝置不建立 owner 的新 scheduled Markets。
- Staff 可以操作 Owner 已 materialize 並同步下來的 Markets。

這是 MVP 已知限制：若 Owner 超過 8 週未開啟 App，Staff 不會自行延長 horizon。不得為了解決此限制自行加入 server cron、background worker 或擴大 Staff write authority。

## 11.4 Production apply

Codex 可以：

- 寫 migration SQL。
- 寫 static verifier。
- 寫 read-only smoke SQL。
- 寫 runbook。
- 在本地／測試環境驗證。

Codex 不可自行：

- 套用 production migration。
- 修改 production RLS。
- 建立 production synthetic data。
- 清理或合併 production duplicate rows。

到 production apply 時停止，交由人工執行並回填證據。

---

# 12. Existing MarketStatus Compatibility

第一版不新增 `planned / active / closed` 到 MarketStatus。

## 12.1 Generated Market initial state

- `market_created` 繼續建立 `registered` snapshot，避免改變 legacy handler contract。
- 對 `sessionOrigin === 'schedule'` 的 UI，不顯示「已報名／已錄取／已繳費」進度。
- Schedule-generated Market 在使用者視角顯示為「已排定／準備中」。
- 不可為了讓它看起來 ready 而虛構「已繳費」。

## 12.2 One-tap start

建立 shared helper：

```ts
canStartScheduledMarket(market, now): boolean
```

只在下列條件成立時允許：

- `sessionOrigin === 'schedule'`
- `scheduleOccurrenceState === 'scheduled'`
- role capability 允許既有 Market start operation
- 日期與 operating-day 規則允許
- Market 非 cancelled / completed / deleted

開始後仍使用既有 `market_started`，snapshot 進入 `ongoing`。

不得把所有 registered manual Markets 都變成可直接開始。

所有直接判斷 `paid / ongoing` 的 live-action consumers 都要 audit，但只修改 schedule-origin 所需最小範圍。

---

# 13. UX Contract

## 13.1 建立入口

主要入口維持一個：

> 新增營業

打開後選擇：

```text
單次營業
適合市集、快閃或臨時活動

每週固定
設定常用地點、星期與時間
```

不得在首頁同時放三個同等強度的 primary buttons。

## 13.2 固定安排表單

第一層必要欄位：

- 營業據點名稱
- 地址（optional）
- 星期
- 開始時間
- 結束時間
- 起始日期
- 結束日期（optional）

「更多預設」折疊區：

- 既有正式費用欄位
- 設備免費／租借欄位
- 備註模板

不得讓 optional defaults 佔據第一個 mobile viewport。

## 13.3 Home / Today

```text
今天

A 夜市
17:00–23:00

[ 開始今天營業 ]
```

Upcoming 固定與臨時混合排序，不拆兩個系統。

可顯示低強度 tag「固定」，但不得要求使用者理解 Schedule。

## 13.4 編輯提示

只有編輯 schedule-generated Market 時顯示：

```text
只修改這一次
從這次開始都修改
```

Pause / Resume / Archive 只放在「固定營業安排」管理頁，不放首頁主要操作區。

## 13.5 Progressive disclosure acceptance

- 純單次使用者建立 Market 的必要步驟不可增加。
- 回訪固定使用者可從首頁一個主要動作開始今天營業。
- 使用者不需要知道 Venue / Schedule / Occurrence / Revision 才能完成操作。
- Optional fees 保持折疊。
- 所有核心 mobile targets 至少維持現有 44px touch contract。

---

# 14. Subscription Contract

- 固定營業建立、materialization、Today 與基本操作屬於既有 `core.market_operations`。
- 不新增 `recurring_operations` plan feature code。
- 不新增 Session / Schedule / Venue 數量限制。
- Free / Pro / Team 都保留真實營運紀錄。
- 未來 Venue comparison / weekday / fixed-vs-other analytics 使用既有 `analytics.advanced`。
- downgrade 不刪除 Venue、Schedule 或已產生 Markets。
- entitlement failure 不得阻止使用者讀取自己的歷史營業資料。

---

# 15. Cross-Platform Contract

Shared core：

- recurrence calculation
- occurrence identity
- validation
- reconciliation plan
- event payloads
- permissions
- sync / retry / idempotency
- date/time error classification
- view models

不得在 shared core 使用：

- `window`
- `document`
- `navigator`
- localStorage
- browser timer 作為唯一 materialization 保證
- Next.js route runtime 作為 mobile 必要依賴

Owner foreground/hydration 觸發必須重用既有 lifecycle / network platform ports。

Web 可以有較寬的 Schedule management layout，但 mobile 與 Web 必須共用相同 domain service 與 validation。

不得安裝 `@capacitor/*` 或建立 native adapter。

---

# 16. Implementation Slices

# RHO-0｜Read-only Impact Audit

## Goal

以執行當下 repo 建立正式 impact map，不修改 production behavior。

## 必讀

- `AGENTS.md`
- `docs/CROSS_PLATFORM_VIBE_CODING_GUARDRAILS.md`
- 本文件
- `types/db.ts`
- `lib/db/index.ts`
- `lib/db/events.ts`
- `lib/db/integrity.ts`
- `lib/db/hooks.ts`
- `lib/home/today-view-model.ts`
- `lib/markets/market-operating-session.ts`
- `lib/sync/*pull*`
- `lib/sync/sync-push-service.ts`
- `lib/permissions/role-capabilities.ts`
- `lib/permissions/PermissionGate.ts`
- `docs/staff-role-permissions.md`
- `docs/staff-role-matrix.md`
- 最新 Supabase migrations / staff views
- subscription capability source of truth

## Deliverable

```text
docs/architecture/RECURRING_HYBRID_OPERATIONS_IMPACT_AUDIT.md
```

至少包含：

- current branch / HEAD
- affected files
- current Market status assumptions
- current event / projection flow
- Dexie latest version
- backup/import/recovery impact
- remote event constraint / trigger / views impact
- owner/staff pull impact
- direct status checks requiring schedule-origin handling
- mobile / Web shared boundary
- test map
- divergence from this document
- risk register

## Gate

- 只修改 audit doc。
- 沒有 runtime、migration、RLS、permission 或 test fixture 變更。
- 若 audit 沒有命中 STOP CONDITION，可繼續 RHO-1。

---

# RHO-1｜Pure Domain、Identity 與 Recurrence Engine

## Goal

先建立無 I/O 的可測試 shared core。

## Deliverables

建議模組：

```text
lib/recurring-operations/types.ts
lib/recurring-operations/date-key.ts
lib/recurring-operations/occurrence-identity.ts
lib/recurring-operations/weekly-recurrence.ts
lib/recurring-operations/reconciliation.ts
lib/recurring-operations/validation.ts
```

必要測試：

```text
tests/recurring-operations-weekly.test.ts
tests/recurring-operations-identity.test.ts
tests/recurring-operations-reconciliation.test.ts
tests/recurring-operations-timezone.test.ts
```

## Acceptance

- weekdays 1..N。
- start/end boundary。
- 8-week range。
- Asia/Taipei calendar date 無 UTC 漂移。
- cross-midnight identity 仍使用 start date。
- 相同 occurrence 產生相同 Market/event IDs。
- single override 被 preserve。
- ongoing/completed/activity Market 被 preserve。
- pause / resume / rule removed plan deterministic。
- pure modules 不 import Dexie、Supabase、React、Next、window。

## Gate

Focused tests 全通過後才進 RHO-2。

---

# RHO-2｜Local Schema、Events、Replay、Backup v2

## Goal

加入 local data foundation，不接 UI、不接 production remote。

## Deliverables

- Venue / OperationSchedule types。
- Market compatibility fields。
- 新 EventType / EventPayloadMap。
- additive Dexie migration。
- local projection handlers。
- replay/rebuild。
- backup v2 + v1 import compatibility。
- integrity / import preflight。
- local repository/service boundary。

必要測試：

```text
tests/recurring-operations-dexie-migration.test.ts
tests/recurring-operations-events.test.ts
tests/recurring-operations-replay.test.ts
tests/recurring-operations-backup-v2.test.ts
tests/recurring-operations-integrity.test.ts
```

## Must remain unchanged

- legacy Market financial values
- DailyStats
- existing Market IDs
- existing backup v1 fixtures
- existing role semantics
- production sync behavior

## Gate

- empty DB 與 v7 fixture migration 通過。
- v1 backup import 通過。
- v2 round trip 通過。
- repeated replay identical。
- legacy Markets 保持無 Venue / Schedule 也能正常讀取。

---

# RHO-3｜Remote Schema、Sync、RLS 與 Verifier

## Goal

完成 code-level remote contract，但不自行 apply production。

## Deliverables

- 下一號 Supabase migration。
- event CHECK 更新。
- Venue / Schedule owner-only RLS。
- projection trigger/function。
- Markets compatibility columns / unique index。
- owner pull / push support。
- staff market view compatibility fields。
- local mapper / remote mapper。
- read-only verifier SQL。
- production apply runbook。
- permission distribution docs 更新。

必要測試：

```text
tests/recurring-operations-sync-contract.test.ts
tests/recurring-operations-owner-rls-static.test.ts
tests/recurring-operations-staff-view-static.test.ts
tests/recurring-operations-remote-idempotency.test.ts
```

## Gate

- Owner 可同步 Venue / Schedule events。
- Staff 不可管理 Schedule。
- Staff 可讀已產生 Market 的必要非敏感欄位。
- duplicate occurrence 由 remote constraint 阻擋。
- RLS fail closed。
- migration SQL 與 verifier 完成。
- 到 production apply 時 STOP，等待人工證據。

---

# RHO-4｜Owner-only Fixed Schedule Management UX

## Goal

讓 Owner 建立與管理固定安排，但尚不改 mandatory onboarding。

## Deliverables

- 「新增營業」選擇單次／每週固定。
- 營業據點與固定安排 owner-only route / dialog。
- required fields first。
- optional defaults disclosure。
- list / empty / loading / error states。
- pause / resume / archive controls 的 fail-closed presentation。
- responsive mobile / Web layout。

## Permission

- Owner-only render 與 write。
- Manager / Operator / Viewer 不顯示管理入口。
- unresolved role / refresh 不顯示 privileged controls。
- 不修改既有角色能力矩陣。

## Gate

- 純單次建立流程的必要欄位與步驟沒有增加。
- 390x844 可完成 fixed schedule form。
- optional defaults 不佔第一 viewport。
- role tests 通過。
- 未接入強制 onboarding。

---

# RHO-5｜Materialization、Today / Upcoming 與 One-tap Start

## Goal

把固定規律轉成可操作 Markets，重用既有營業流程。

## Deliverables

- `ensureScheduledMarkets()` shared orchestrator。
- Owner hydration / foreground trigger。
- Schedule create/update/resume 後 ensure。
- 8-week horizon。
- deterministic generated events。
- Today / Upcoming 支援 occurrence state。
- fixed + manual unified chronological list。
- schedule-origin one-tap start。
- schedule-origin 隱藏 application progress UI。

必要測試：

```text
tests/recurring-operations-materializer.test.ts
tests/recurring-operations-two-device-idempotency.test.ts
tests/recurring-operations-today-view.test.ts
tests/recurring-operations-one-tap-start.test.ts
tests/recurring-operations-platform-boundary.test.ts
```

## Gate

- app reopen 不重複。
- retry 不重複。
- 兩裝置相同 Schedule/date 得到同 Market/event IDs。
- fixed/manual 同一時間軸。
- manual registered Market 不會因新 helper 突然可直接開始。
- offline 已 materialize Market 可開始營業。
- lifecycle trigger 不直接依賴 browser globals。

---

# RHO-6｜Occurrence Exceptions 與 Schedule Revision UX

## Goal

完成固定規律不可缺少的修改安全性。

## Deliverables

- 略過這次。
- 只修改這一次。
- 從這次開始都修改。
- pause / resume / archive reconcile。
- future override preservation。
- activity-protected exception warning。
- deterministic revision events。

必要測試：

```text
tests/recurring-operations-skip.test.ts
tests/recurring-operations-single-override.test.ts
tests/recurring-operations-future-revision.test.ts
tests/recurring-operations-pause-resume.test.ts
tests/recurring-operations-history-immutability.test.ts
```

## Gate

- skipped occurrence 不重建。
- override 不被 revision 覆蓋。
- completed / ongoing / 有活動 Market 不變。
- rule removed 不 destructive delete。
- resume 只恢復安全且仍符合規則的 suppressed occurrences。
- 所有修改均 Owner-only。

---

# RHO-7｜Release Verification、Docs 與 Implementation Report

## Goal

完成跨平台、角色、資料與 regression 驗證。

## Required verification

Focused tests：

```powershell
npm.cmd exec -- tsx tests/recurring-operations-weekly.test.ts
npm.cmd exec -- tsx tests/recurring-operations-identity.test.ts
npm.cmd exec -- tsx tests/recurring-operations-reconciliation.test.ts
npm.cmd exec -- tsx tests/recurring-operations-replay.test.ts
npm.cmd exec -- tsx tests/recurring-operations-two-device-idempotency.test.ts
npm.cmd exec -- tsx tests/recurring-operations-history-immutability.test.ts
```

Repository verification：

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npx.cmd tsc --noEmit --project tsconfig.mobile.json
npm.cmd run build:mobile
npm.cmd run verify:mobile
git diff --check
git status --short
```

如果 repo-wide test / lint 有 unrelated failure：

- 記錄 exact command / exact error / 是否存在於 base HEAD。
- 不修 unrelated debt。
- touched scope 與 focused guardrails 必須全部通過。

## Viewport matrix

```text
390x844
768x1024
1440x900
200% zoom
```

## Role matrix

```text
owner
manager
operator
viewer
unresolved role
role refresh in progress
```

## Required journeys

1. 純單次使用者新增 Market，流程無額外負擔。
2. Owner 新增固定據點與每週安排。
3. 固定場出現在 Today / Upcoming。
4. 一鍵開始固定場，沿用既有交易流程。
5. 同時建立臨時 Market，與固定場混合排序。
6. 略過一次後不再出現且不重建。
7. 修改一次不改下週。
8. 修改未來不改歷史。
9. Pause / resume。
10. Legacy multi-day Market 正常。
11. Offline materialized Market 可操作。
12. Staff 不可管理 Schedule，但可依既有權限操作場次。
13. Free / Pro / Team 都不受 Session-count paywall。

## Final report

```text
docs/implementation/RECURRING_HYBRID_OPERATIONS_IMPLEMENTATION_REPORT.md
```

包含：

- Summary
- Architecture
- Schema / migration
- Deterministic identity
- Event types
- Sync / RLS
- Permission behavior
- UX behavior
- Legacy compatibility
- Backup v1/v2
- Tests and results
- Cross-platform result
- Known limitations
- Manual production steps
- Commits
- Remaining future scope

---

# 17. Deferred Future Slices

下列不屬於 RHO-0..RHO-7 Definition of Done。

## FUTURE-A｜Analytics Dimensions

- Venue comparison。
- Same-venue 4 / 12 / 52 trend。
- Weekday performance。
- Fixed vs other contribution。
- Existing total formula reconciliation。
- `analytics.advanced` entitlement。

必須另立 implementation slice，不得在 RHO-5 順手加入。

## FUTURE-B｜Contextual Onboarding Experiment

只在有 evidence 時評估：

- empty account 是否需要固定安排提示。
- 建立第二次相似 Market 後是否提示儲存為固定安排。
- fixed-only 使用者是否能更快完成初始設定。

仍不得建立永久 business type。

## FUTURE-C｜Manager Schedule Capability

需要正式產品決策與 capability：

```text
canManageOperationSchedules
```

需要同步：

- role-capabilities
- PermissionGate
- role freshness
- pending/offline writes
- RLS
- staff views
- permission distribution docs

未批准前一律 Owner-only。

## FUTURE-D｜Server Horizon Materializer

只有 Owner 8 週未開啟 App、Staff 仍需自動取得更遠場次的真實需求被驗證後才評估。

不得在 MVP 自行加入：

- cron
- background worker
- automatic server event writer
- Staff-authorized schedule generation

---

# 18. STOP CONDITIONS

遇到以下任一情況，完成所有安全可完成的 docs / tests / verifier 後停止並詢問。

## Data

- 需要 destructive migration / delete / merge。
- 無法保證 legacy Market / Event / DailyStats 不丟失。
- 發現同 occurrence 的兩個 Markets 都已有使用者活動。
- 必須改變既有 financial formula。
- 必須執行 replace-cache、production import 或 local destructive recovery。

## Architecture

- 必須廢除 Event Sourcing。
- 必須改變既有 market_id identity semantics。
- 必須全域 rename Market → Session。
- 必須建立第二套交易、成本或 DailyStats 系統。
- deterministic UUID 無法與現有 remote UUID / sync pipeline 相容。

## Permission / Security

- 必須讓 Manager / Operator / Viewer 管理 Schedule 才能完成 MVP。
- 必須降低 RLS。
- 必須讓 unresolved role 執行 write。
- Staff 需要讀取完整 Schedule defaults 或敏感財務資料。
- 無法透過現有 owner/team scope 表達 remote rows。

## Product

- 必須新增 permanent business type。
- 必須加入 Session paywall。
- 必須強制 onboarding 才能使用既有單次 Market。
- 需求擴張成 POS / ERP / inventory / CRM。

## Production

- production migration / RLS apply。
- production secret。
- production duplicate repair。
- production synthetic data。
- irreversible deploy step。

## Cross-platform

- shared domain 必須依賴 browser-only API。
- 必須安裝 Capacitor package 或建立 native project。
- mobile static build 必須依賴 Next.js same-origin route 才能完成核心流程。

---

# 19. 非 STOP 情境

下列情況由 `gpt-5.6-sol / medium` 依現有 code pattern 自主決定：

- component / hook / service 檔名。
- Dexie index 的低風險細節。
- loading / empty / skeleton。
- form component 拆分。
- mapper 檔案位置。
- test fixture organization。
- responsive layout。
- accessibility labels。
- touched-scope 型別修正。
- safe additive refactor。
- migration 編號因 repo 新增 migration 而順延。

---

# 20. Commit 與 Git 策略

建議每個通過 gate 的 slice 一個或少數可驗證 commit：

```text
docs: audit recurring hybrid operations impact

feat(schedule): add recurring operation domain contracts

feat(db): add venue and schedule local projections

feat(sync): add recurring operation remote contracts

feat(schedule): materialize deterministic scheduled markets

feat(ui): add owner fixed operation management

feat(markets): support scheduled occurrence exceptions

docs: report recurring hybrid operations verification
```

- 不把使用者原有 dirty worktree 變更納入 commit。
- 不做 giant commit。
- 不 amend 使用者既有 commit。
- 只有使用者明確要求 `commit` 時才 commit。
- 只有使用者明確要求 `push` 或 `commit & push` 時才 push。
- production migration apply 不包含在 Git push 授權內。

---

# 21. Definition of Done

RHO-0..RHO-7 全部完成且 gate 通過後，MVP 才算完成。

- [ ] 沒有 permanent business type。
- [ ] 純單次 Market 建立流程無額外必要步驟。
- [ ] Owner 可建立 Venue / weekly Schedule。
- [ ] Manager / Operator / Viewer 未取得 Schedule 管理權。
- [ ] Schedule-generated Market 使用 deterministic Market ID。
- [ ] generated event 使用 deterministic event ID。
- [ ] local / retry / two-device 不產生 duplicate canonical occurrence。
- [ ] 8-week horizon 可由 Owner hydration 補齊。
- [ ] Today / Upcoming 混合 fixed / manual。
- [ ] schedule-origin 可一鍵開始。
- [ ] manual registered Market 行為不變。
- [ ] 固定場 UI 不顯示虛假的報名／繳費進度。
- [ ] 略過一次不重建。
- [ ] 單次 override 不被未來 revision 覆蓋。
- [ ] 修改未來不改 ongoing / completed / activity history。
- [ ] pause / resume / archive 不 destructive delete。
- [ ] legacy multi-day Market / DailyStats 不變。
- [ ] Event replay deterministic。
- [ ] Backup v1 import 與 v2 round trip 通過。
- [ ] remote unique / RLS / staff view contract 完成。
- [ ] offline 已 materialize Market 可操作。
- [ ] shared logic 無 browser-only dependency。
- [ ] mobile typecheck / static build 通過。
- [ ] 無 Session-count paywall。
- [ ] Analytics runtime expansion 未混入 MVP。
- [ ] permission docs 已同步。
- [ ] implementation report 完成。
- [ ] production apply 步驟有獨立 runbook 與人工 gate。

---

# 22. 給未來 Codex 的啟動 Prompt

```text
使用 gpt-5.6-sol，reasoning effort 設為 medium。

執行：
docs/FERIA_RECURRING_HYBRID_OPERATIONS_IMPLEMENTATION_SPEC_v1.1.md

從 RHO-0 開始，一次只執行一個 slice。

開始前先讀 AGENTS.md、跨平台守則、本文件與該 slice 的必讀檔案；確認 branch、HEAD 與 dirty worktree。不得覆寫或納入使用者既有未提交變更。

每個 slice 先列出 shared logic、platform capability、資料風險、權限影響、預計修改檔案與 intentionally unchanged behavior，再實作到該 slice gate 通過。使用 npm.cmd / npx.cmd 執行 Windows 驗證。

不要加入強制 onboarding、permanent business type、Session paywall、Manager Schedule 管理、Analytics runtime expansion、legacy auto-merge、server cron、background worker、Capacitor package、native project、production migration apply 或 destructive recovery。

固定 occurrence 必須使用 deterministic Market UUID 與 deterministic generated event ID；不能只靠 UI find-then-insert。固定場必須重用既有 Market、交易、成本、DailyStats、Staff 與 Analytics，不建立第二套系統。

命中 STOP CONDITION 時，完成所有安全的 docs / tests / verifier / runbook，列出證據、選項、風險與推薦方案後停止。未命中 STOP CONDITION 時，不要因低風險 implementation detail 停下。

每個 slice 結束回報 Outcome、Changed files、Intentionally unchanged、Focused tests、Build/typecheck、Cross-platform、Permission、Data/migration、Known limitations、STOP condition 與 Next slice。

不要自動 commit 或 push；只有使用者明確要求時才執行。
```

---

# 23. 最終成功定義

成功不是讓使用者學會「什麼是 recurring schedule」。

成功是：

> 純市集使用者完全不覺得 Féria 變複雜；固定與 Hybrid 使用者則發現 Féria 已經記得平常在哪裡、什麼時候營業，只需要處理今天不一樣的地方。
