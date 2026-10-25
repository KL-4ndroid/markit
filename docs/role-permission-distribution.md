# Role / Permission Distribution Notes

## 2026-10-25 | Role and access presentation (UX07)

`lib/permissions/staff-access-presentation.ts` describes role work and current membership/access availability only. StaffManagement passes its existing capability decision reason, distinguishes pending/suspended/revoked/simulation/unconfirmed access, and removes the claim that every staff role can record. StaffPermissionCard receives role authorization freshness from the existing context and separates a short availability summary from expandable role rules. Viewer is explicitly read-only; Operator/Manager wording follows existing capabilities and operating restrictions. No entitlement, role capability, staff read/write, freshness, RLS, restore or invitation policy changed. See `docs/UIUX_SIX_IMPROVEMENTS_IMPLEMENTATION_2026_10_25.md` and `tests/uiux-six-improvements.test.tsx` for evidence boundaries.

## 2026-10-23 | Optional registration payment deadlines (075)

Market payment deadlines are operational date/time metadata and an in-app display preference, managed by Owner. Existing manager/operator/viewer write capabilities and the manager update allowlist stay unchanged. The deadline JSON accepts only date, optional time, timeZone and reminderEnabled; payment amounts, bank references and private notes are not part of this payload. Existing Staff may read this metadata on already accessible Markets, with no new reminder-management UI or financial visibility.

Migration 075 appends the field using the deployed view's existing SQL definition, preserving filters, financial nulls and grants. Owner guards apply to event and direct-table deadline changes; schedule-origin Markets cannot acquire a deadline. All new trigger functions explicitly revoke direct role grants as well as PUBLIC execution; the pure validator is available only to authenticated/service_role. No new event types, store adapters, background notifications or sync retry routes are added. See `docs/MARKET_PAYMENT_DEADLINE_2026_10_23.md` for activation and evidence boundaries.

## 2026-10-23 | Owner-managed region metadata (074)

Market/Venue region classification is optional, non-financial metadata. Owner forms may create/change/clear it; manager/operator/viewer receive no new write capability. The existing manager Market update allowlist is unchanged. Migration 074 guards region changes on both direct table writes and event projection, validates actor/owner identity, and preserves 070's owner-only Venue/Schedule management. New projection/guard functions explicitly revoke EXECUTE from PUBLIC, anon, authenticated and service_role, accounting for Supabase's direct default grants; only the pure catalog validator is executable by authenticated/service_role.

The staff Market view appends region_code to the existing accessible Market scope. All previous columns, relationship filters and financial null redaction remain identical; the migration aborts on unexpected view drift. No private notes, cash records, subscription tiers or additional finance data are exposed. Existing offline events, cloud mapping/hydration and owner replay retain the optional field without new retry/write routes. Turning off new classification writes keeps compatible reads and unrelated schedule updates available. See `docs/MARKET_REGION_FOUNDATION_2026_10_23.md` for evidence and remaining UI/cross-device verification.

## 2026-10-22 | Cloud sales projection alignment (073)

Migration 073 patches only the existing market/product deal branches. It preserves event insert authorization, RLS, actor attribution and existing trigger-function security settings. Private projection helpers are not executable by PUBLIC, anon or authenticated. Deletion compensation resolves an original event within the same market; product updates are restricted to that market owner's products. Duplicate and out-of-order tombstones are no-ops after their first effective compensation. Owner/staff read and write capabilities are unchanged. SQL rollback tests do not substitute for staff/cross-account RLS testing. Historical correction is separate; only the precisely named BW-10 test market was corrected.

Same-day legacy backfills may carry a future end-of-day timestamp. App startup demotes only the matching same-market/same-day deletion-order diagnostic to a warning; it does not rewrite records or relax strict backup/import/replay validation. New backfill timestamps are capped at the actual recording time. This compatibility rule infers the original device's offset and remains valid after a timezone change. Role freshness and all existing write authorization remain unchanged.

## 2026-10-22 | Offline pending-count presentation

`hooks/useSync.ts` observes pending/local-only event counts through `lib/sync/local-pending-count-observer.ts` even when cloud sync cannot run. The observer only reads the existing local event store; it performs no uploads, retries, actor binding, projection replacement or permission changes. It unsubscribes on identity change/unmount and ignores callbacks for an inactive sync identity. Owner/staff data scopes and all existing write capabilities remain unchanged.

The offline banner distinguishes authenticated sessions with paused cloud sync from the existing unauthenticated offline read-only branch. This changes guidance only, not authorization or offline write eligibility.

## 2026-08-14 | Recurring operations owner-only contract

Venue and weekly schedule management is owner-only. Manager, operator, viewer, and unresolved-role sessions receive no Venue/Schedule management read or write authority and no new role capability. Staff may read only the non-sensitive recurrence compatibility fields on an already materialized Market through `staff_accessible_markets`; existing Market operation capabilities continue to decide what each Staff role may do.

The new event types are fail-closed in the local role-freshness gate. Remote Venue and Schedule tables use owner-scoped RLS and are not included in Staff views. This does not change Market, product, finance, reporting, billing, recovery, or Staff capability semantics.

Migration 070 mirrors the same role rule remotely: an authenticated identity with an active Staff relationship cannot insert recurring-operation events or access Venue/Schedule management tables. A restrictive event policy and a before-insert trigger provide defense in depth while preserving the existing Market event policy.

## 2026-08-05 | Security Advisor remediation planning boundary

`docs/security/SUPABASE_SECURITY_ADVISOR_REMEDIATION_PLAN_2026_08_05.md`
records a planning-only workstream for pre-existing definer views, mutable
function search paths, permissive INSERT policies, function EXECUTE grants, and
Auth leaked-password protection.

No migration, RLS policy, RPC grant, provider setting, application permission,
data visibility, `PermissionGate`, `useUserRole`, sync, or Dexie behavior changes
in this documentation batch. In particular:

- owner remains the only complete data/finance administrator;
- viewer remains read-only;
- operator and manager retain only their existing capability-gated operations;
- staff continue to read the current redacted `staff_accessible_*` views until a
  separately approved replacement passes role, cross-owner, sync and Dexie tests;
- directly converting those views to invoker views is prohibited because the
  current owner-only base-table RLS would break staff reads;
- any later remediation that changes role behavior must update this file and the
  canonical staff role documents in the same commit.

## 2026-07-29｜S4 authoritative account capability read model

### Change summary

Added a read-only `GET /api/account-capabilities` BFF route and a server-only subscription account repository. The public endpoint always resolves the authenticated actor's own account id and does not accept an owner-workspace override.

### Permission impact

- an authenticated owner may read their own safe capability snapshot;
- a staff client cannot request the owner's full account capability or billing state through this endpoint;
- future feature-specific server routes may use the internal repository contract only after independently verifying an active owner/staff relationship;
- `subscription_accounts` grants no direct table access to `anon` or `authenticated`;
- only the server-only `service_role` RPC may read through the guarded relationship check;
- no role capability is added or broadened;
- staff still receive no owner billing controls, owner financial permission, or checkout action;
- unresolved, foreign, inactive, malformed, and unavailable states remain fail-closed.

S4 does not change product-cover, sales-evidence, analytics, report, Team, Dexie, or sync runtime behavior.

## 2026-07-29｜Subscription preview presentation alignment

### Change summary

Subscription UI now uses the shared Free / Pro / Team preview model. `TopNavigation` no longer hardcodes a current Free plan when no authoritative account capability source exists.

### Permission impact

- owners may see the non-transactional plan preview link;
- staff continue to see no billing controls or checkout actions;
- a plan presentation never overrides owner / manager / operator / viewer permissions;
- unresolved roles remain fail-closed;
- no role capability, staff relationship, RLS, RPC, data visibility, Dexie, or sync behavior changed.

This is a presentation-only change. Paid feature enforcement remains outside S2.

## 2026-07-30｜Production internal test surface boundary

Root `proxy.ts` denies every `/debug/*` request with an HTTP `404` before rendering in
production, while `app/debug/layout.tsx` remains a second server-side denial. Local
development remains available; preview/staging requires the explicit
`INTERNAL_TEST_SURFACES_ENABLED=1` gate. This route boundary does not grant or change
owner, manager, operator, viewer, Supabase, Dexie, sync, or subscription permissions.

`/demo` is intentionally excluded from this internal-route gate and retains the public,
static-example-data contract documented below.

## 2026-06-26｜Féria Demo Mode public route

### Change summary

新增公開展示路由：

```txt
/demo
```

`/demo` 是 Féria Demo Mode，僅使用 `lib/demo/*` 的靜態範例資料與 React local state。此路由不讀取正式市集、商品、銷售、成本、同步或角色資料。

### Auth / Role / Navigation boundary

為了讓 `/demo` 可作為對外展示頁，以下 guard 將 `/demo` 視為 public route：

- `components/auth/AuthGuard.tsx`
- `components/auth/RoleGuard.tsx`

`components/AppChrome.tsx` 會在 `/demo` 使用 standalone public chrome，只渲染 demo page 與 toast，不掛載正式 App 的 `AuthGuard`、`RoleGuard`、底部導航、PWA prompt、staff invitation、initial sync dialog 或 sync progress manager。

`RoleGuard` 對 public route 會直接 render children，不掛載 `ProtectedRoleGuard`，因此不會在 `/demo` 觸發 `useUserRole()` 查詢。

`components/BottomNavigation.tsx` 也會在 `/demo` 直接回傳 `null`，避免公開展示頁掛載正式 App 的底部導航與 role-dependent navigation behavior。

### Permission impact

本次沒有修改以下內容：

- staff role 定義
- viewer / operator / manager / owner 權限分配
- owner / staff 資料可見度
- `PermissionGate`
- `useUserRole` 的角色判斷與 fail-closed 行為
- Dexie / sync 權限行為
- Supabase 權限模型

### Demo safety rule

`/demo` 只允許使用：

```txt
useState
useMemo
static demo data
demo calculation helpers
```

不得 import 或呼叫：

```txt
useMarkets
useMonthlyStats
useAuth
useUserRole
useSyncContext
Dexie write
Supabase write
sync service
permission service
```

### Rationale

Demo Mode 的目的為對外展示 Féria 互動體驗，不應要求登入，也不應接觸封閉測試中的正式資料。此 public route exemption 是 route-level display boundary，不是角色權限模型變更。

## 冷登入恢復與匿名遷移邊界補充

- owner 重播校正只適用同 owner、完整雲端／本機事件 ID 集合相符、全部 synced，且存在舊刪除排序風險的場次；不將 staff 的部分 view 當完整歷史，不放寬 RLS 或角色 freshness。
- 身分或前景狀態改變時停止後續 owner 重播批次；舊身分不能發布新身分的同步進度或釋放新同步鎖。
- `detectAnonymousData` 與匿名遷移只處理 owner／actor 空白或 local、且尚未 synced 的紀錄。其他帳號快取、團隊成員事件、已同步 legacy local 紀錄皆不屬可遷移集合，不能因其 ID 不同於登入者就改綁。
- 照片本機清單為空僅表示本機沒有待補工作，不證明其他裝置上傳完成或歷史成交免拍；保留既有 owner album 與員工能力界線。
- 詳見 `docs/COLD_LOGIN_RESTORE_REVIEW_2026_10_22.md` 文末實作與驗收。本輪沒有修改 Demo、角色能力或雲端授權規則。

### 成交照片提醒恢復補充（2026-10-23）

- owner 提醒恢復只在登入者等於 owner、同 owner 的未刪市集，以及現行照片 runtime gate 啟用時啟動。metadata 使用登入者 client 與既有 RLS，完整讀取該 owner／market 未刪狀態，不含私有影像 key 或簽名連結。
- 本機照片要求快照只作提醒依據，不是拍攝／上傳授權憑證；手動上傳仍由原有 BFF 及 server RPC 重新檢查真實 owner／staff、來源成交與身分。
- 員工不使用 owner 恢復 reader／album fallback；本機工作只顯示同 owner 且拍攝員工為本人者。owner 可處理自己場次的工作；員工新裝置狀態核對需另外實作，沒有擴大相簿／讀圖能力。
- 舊事件要求未知不補猜，讀取失敗不判定全數完成，換帳號／場次或請求失效不發布舊結果／寫入殘留工作；已儲存照片及重試狀態保留。

### 訂閱制度優先與 Team 確認（2026-10-23）

- 使用者確認先前 Pro 為口誤：正式員工協作與 manager 仍屬 Team，依老闆工作空間權益與個別角色權限取交集，不要求員工另行購買 Team。
- 這是既有分級的確認，沒有移動方案功能、變更席次或授予帳號權益。員工新裝置照片擴充先暫緩，優先對齊訂閱與 server 限制。
- 共用有效期判斷已補強：有填但格式錯誤的到期日不再當成明確無期限授權；非有限評估時間拒絕授權；不因錯誤期限取得 fresh／離線 lease。保留既有有效管理員授權、角色與降級資料保留行為。
- 目前權益 API 及 migration 064 仍以既有 admin 授權測試路徑為主；billing 來源未接通，不能把 admin、UI 模擬或照片處理成功當作真實付款證據。
- 程式缺口、候選額度與後續順序見 `docs/subscription/SUBSCRIPTION_RULES_ALIGNMENT_2026_10_23.md`；沒有修改 DB／RLS、啟用收費或改變現有角色。

### 私人出攤心得（2026-10-23，076 已確認套用）

- `market_journals` 為獨立 owner-private 表，登入者必須等於 journal owner、author 與原 market owner；原市集已刪除則 SELECT／writer 拒絕。manager／一般員工不能讀雇主心得，未新增 staff view 欄位或共用事件文字。UI 另要求角色完成確認且非員工模式。
- 一般 client 僅有 owner RLS SELECT 與專用 `save_market_journal` RPC EXECUTE；撤除直接 INSERT／UPDATE／DELETE、匿名讀取及 trigger 函式直接 EXECUTE。RPC 重新檢查 owner／market、日期、長度、revision 與 mutation ID，不信任 UI gate。
- 草稿以 owner／market 隔離，不進共用同步佇列；原帳號未送出的私人草稿阻擋登出／身份快取清除，只有顯式捨棄可清除。認證快取清除使舊非同步工作失效，避免清除後又寫回私人文字。
- 雲端表的 SELECT 與 RPC 不依訂閱或員工財務能力開放，不改 Team、席次、成交、照片或原生發布 gates。已同步內容可透過獨立 owner reader 還原；legacy 財務匯出不等於已備份私人心得。
- 使用者確認完整套用 076（含角色／結構自檢），REST 欄位檢查通過後已啟用本機，真實 owner 寫入／還原與版本衝突流程通過；35 組隔離 SQL 含 11 組心得檢查。沒有宣稱員工實際登入 UI、正式部署或原生實機權限已驗收。詳細狀態見 `docs/MARKET_PRIVATE_JOURNALS_2026_10_23.md`。

### 品牌出攤準備模板（2026-10-23，077 已確認套用）

- 老闆與同品牌 active Team manager 可讀／管理／套用模板；operator／viewer 不讀模板表。已套用的普通待辦保持原本讀取／勾選權限，沒有擴張財務、私人成果或員工席次。
- SQL helper／writer 每次重新確認角色與 `has_authoritative_team_entitlement`；非 UI 隱藏而已。只授權模板 SELECT 與 RPC，不授予 table mutation；套用回條不開 client SELECT，RPC 僅回傳同 actor／相同 request 的結果。
- 模板採雲端保存；套用沿現有 checklist creation events，來源版本在 metadata。沒有新增 pending-operation enqueue／drain、事件類型或離線模板 writer；本機該場有未同步待辦時暫停套用。
- cache reset、換帳號及員工投影清除使晚到套用結果失效。隔離 SQL 權限檢查、077 雲端欄位與真實 owner 手機／獨立來源還原及衝突驗收通過；本機已啟用。真實 manager UI、正式部署與原生實機仍待驗收。詳見 `docs/MARKET_PREPARATION_TEMPLATES_2026_10_23.md`。

### 可選開／收攤現金（2026-10-23，078 已完成、本機已啟用）

- `market_cash_records` 是 owner-only 財務紀錄，原市集 owner 必須等於登入者；刪除市集後不可讀／寫。manager／operator／viewer 即使能讀市集，也不能取得盤點金額。沒有新增 staff view／共用事件財務欄位或改訂閱條件。
- client 僅有 owner RLS SELECT 及專用 writer EXECUTE。直接 table mutations、匿名、內部面額 helper／排程 trigger 的 client EXECUTE 撤權；writer 每次檢查 owner、日期、資料／版本與 mutation ID。
- 持久草稿屬原 owner／market／日別，不走一般事件同步；未送出阻擋無聲清除與帳號刪除，設定頁可回原場次或明確捨棄。cache reset 前使非同步工作失效；不以舊匯出當作已保存私人盤點。
- 雲端紀錄與本機草稿均列排程快照使用者活動；不改成交／庫存／營收／淨利。16 組隔離 SQL 已驗證權限及保護，使用者確認雲端套用，真實 owner UI／雲端還原／衝突／草稿登出保護通過；staff 實際 UI、真正第二裝置與正式部署另驗。詳見 `docs/MARKET_OPTIONAL_CASH_RECORDS_2026_10_23.md`。

### 現金銷售比較與差額（2026-10-24，079 已完成、本機已啟用）

- 03B 沿用 owner-only 現金表／草稿／日別邊界；`read_market_cash_sales` 雖包含員工替品牌記錄的成交，仍只供該場原 owner，SECURITY DEFINER 內重驗 owner 與非刪除狀態。manager／operator／viewer 不取得現金比較或原始財務來源。
- `save_market_cash_record_v2` 可保存選填進出與比較基準；舊 writer 遇新版欄位拒絕覆寫，避免舊 client 靜默抹除。不新增直接 table mutation、匿名／service_role EXECUTE 或員工財務權限；沒有訂閱分級變更。
- 24 組隔離 SQL 已通過（含原 03A）；手機草稿／來源失敗提示與 079 真實 owner 雲端來源、進出／基準保存、獨立來源還原、來源改動及衝突整合均已驗收，本機比較旗標已啟用；正式部署、真正第二裝置與 staff 實際 UI 另驗；詳見 `docs/MARKET_CASH_COMPARISON_2026_10_23.md`。

### 縣市分析與舊場補填（2026-10-24，080 已完成、本機已啟用）

- 縣市金額／商品分析為 owner-only，沿用既有 `advancedAnalytics`，Free 最近三場不能繞過。Team 不擴大員工財務權限；被 gate 阻擋時不掛載縣市成交查詢。分析來源為該 owner 的本機成交，完整性提示與訂閱 gate 分開。
- 分類整理屬 owner metadata 管理，不要求付費能力。雲端清單只讀同 owner 的未分類非刪除場次；`backfill_market_regions` 每次重新確認 owner、非員工及原市集狀態，鎖定並驗證全部預覽版本後才寫標準事件。任一衝突整批拒絕，不改地點／營收／庫存／日期；固定安排只覆寫原單場。
- 080 只授 authenticated 專用 RPC EXECUTE，不增加 table mutations、匿名或 service_role 執行。client 檢查未同步事件、前後帳號、作用域 epoch 與本機版本；清除／換帳號後晚到結果失效。沒有新增離線 writer 或自動重試。
- 21 組隔離 SQL、Free owner 分析阻擋、真實雲端未分類清單與補填預覽通過；使用者已確認 080，普通 owner 完成手機確認、雲端保存、冪等重送、過期預覽拒絕與獨立來源還原，本機已啟用。付費 owner／staff 真實 UI、正式部署與原生另驗。詳見 `docs/MARKET_REGION_ANALYTICS_BACKFILL_2026_10_24.md`。

### 心得轉待辦與固定安排縣市（2026-10-25，081 已完成、本機已啟用）

- 日期篩選仍為 owner-private 心得，不新增共享閱讀。只有 owner 可挑選／改寫並預覽轉成普通待辦，原心得 ID／全文不進 staff 可讀事件 metadata；僅確認的文字沿目標場次既有 Team 員工角色權限使用。
- 固定安排的雲端預覽／整批確認僅 owner；共用場地與可調整的未來快照原子更新，過去、單場覆寫、取消及已有成交／互動／待辦／心得／現金紀錄保留。server 重新比較完整預覽，包括新增私人紀錄，任一變化整批拒絕。
- 081 新增 RLS private receipt 表，client 無 table 讀寫；三個 RPC 僅 authenticated EXECUTE，匿名／PUBLIC／service_role 撤權，在 SECURITY DEFINER 內重驗 owner。回條限制同 owner、kind 與完全相同請求；同批重送不重置後來的待辦或分類。
- client 沿既有網路／認證／有界請求，檢查本機待同步／草稿與 scope，快取清除後的晚到結果不回填。沒有新訂閱、staff writer、離線佇列或自動重試。30 組隔離 SQL 與共用／cache 回歸通過；081 已確認執行且核對 schema，真實 owner 保存、去重／重送、來源／預覽衝突、保護已有待辦場次及獨立來源還原通過。正式部署、staff 真實登入與原生另驗，詳見 [後續細節](MARKET_FOLLOWUP_DETAILS_2026_10_24.md)。
