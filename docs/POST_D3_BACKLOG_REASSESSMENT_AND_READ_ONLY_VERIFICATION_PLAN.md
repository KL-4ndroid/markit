# Post-D3 Backlog Reassessment and Read-Only Verification Plan

Date: 2026-06-29

Scope: reclassify the remaining C2/C3/P5/Gate-D backlog after recent staff-role, field notes/checklist, diagnostics, and pending-operations work. This document is intentionally non-mutating: it does not approve migrations, RLS changes, cache replacement execution, production synthetic data, workers, automatic retries, or broad event-handler refactors.

## 1. Safety Boundary

Allowed in the next execution slice:

- Documentation alignment.
- Static audits.
- Local/unit/fixture tests that do not touch production data.
- Read-only Supabase verification with `SELECT`, view definition checks, and transaction-local role simulation.
- Preview-only reports for cache replacement or pending-operation behavior.

Not approved:

- `INSERT`, `UPDATE`, `DELETE`, `UPSERT`, `TRUNCATE`, or data repair in Supabase.
- New or modified migrations.
- RLS policy changes.
- Replace-cache execute behavior.
- Pending-operation worker, batch drain, automatic retry, or feature-flag default changes.
- Production synthetic data creation.
- Broad `lib/db/events.ts` refactor.
- D3c-2n-4 production disposable verification, until a disposable candidate row exists and is explicitly approved again.

## 2. Reclassified Backlog

| Item | Current Reading | Keep? | New Status | Recommended Next Step |
|---|---|---:|---|---|
| C3.3 Full Cloud Pull -> Replace Cache | Owner missing-market hydration exists. Preview-only cache replacement helpers and tests exist. Production owner/staff pull still uses existing pull/replay/cache-writer paths. | Yes, long-term | Deferred high-risk execute | Keep preview/fixture/audit only. Do not wire into production sync. |
| C3.6 Pending Local Operations Boundary | Old "pending local operations" goal overlaps with Gate D `pending_operations`. Staff revoke/downgrade cleanup has also evolved separately. | Yes, but redesigned | Replace old plan with Gate D + future reliable outbox design | Do design consolidation only. No worker or production write routing expansion. |
| C2.20 Staff Data Flow online verification | Staff pull now relies on `staff_accessible_*` views plus sanitizer/replay safeguards. Local tests do not prove deployed view/RLS behavior. | Yes | Read-only verification | Run C2.20 SQL checklist below against staging/production as read-only evidence. |
| C2.21 Old cloud consistency audit | Still useful before any replace-cache or cloud-first work. Finds event/projection/snapshot debt. | Yes | Read-only verification | Run C2.21 SQL checklist below. Prioritize this because it is low-risk and high-signal. |
| C2.29B-2 Staff View / RLS follow-up | Some old docs are stale. Current repo has staff typed client and verification docs/tests, but real deployed RLS/view state should still be checked. | Yes | Read-only verification + doc reconciliation | Run E1-E5 checklist below. Do not change RLS unless verification proves a concrete issue. |
| C2.28B Render Guard / Role Fail-Closed residual | Role fail-closed and page guards appear mostly implemented. Remaining risk is doc/code drift around page guard coverage, `canEdit`, `isOwner`, `canViewSensitiveData`, and market detail fallback semantics. | Yes | Static audit | Verify actual pages/components against docs. No behavior change in this phase. |
| Event Handler Convergence Step 4 | Core event replay/projection remains sensitive. Broad convergence can create regressions. | Limited | Fixture-only | Add narrow handler characterization tests only. No event-system refactor. |
| Stability Optimization deferred tasks | Full rebuild/import/RLS/RPC validation tasks differ in risk. Some are still useful, some are obsolete or too broad. | Partial | Split by risk | Keep import rollback and small replay fixtures as candidates. Defer full rebuild and broad refactor. |
| P5 low-risk follow-up | L1-L10 are complete. Remaining value is static boundaries, docs, diagnostics, and non-mutating previews. | Yes | Main low-risk lane | Use P5 lane to carry audits/tests that reduce risk without changing runtime behavior. |

## 3. Execution Phases

### Phase A - Backlog and Documentation Alignment

Risk: low.

Actions:

- Treat this file as the current backlog classifier.
- Mark older C2/C3/P5 statements as potentially stale unless confirmed by current code or current Supabase verification.
- Update follow-up docs only after evidence changes state.

Exit criteria:

- The 9 backlog items have one current status each.
- Every next step is either read-only, fixture-only, static-audit-only, or explicitly blocked behind a decision point.

### Phase B - Read-Only Supabase Verification Preparation

Risk: low if the SQL remains read-only.

Actions:

- Prepare C2.20 Staff Data Flow checks.
- Prepare C2.21 Cloud Consistency checks.
- Prepare C2.29B Staff View/RLS checks.
- Record environment, user role, and query result summaries before any later implementation decision.

Exit criteria:

- SQL checklist is ready.
- No write SQL is included.
- Any non-zero anomaly is classified before proposing repair.

### Phase C - Static Boundary Audit

Risk: low.

Actions:

- Verify role fail-closed page guards against actual `app/*` pages.
- Verify staff runtime paths use staff-scoped views or typed boundary helpers.
- Verify production sync paths do not import replace-cache execute helpers.
- Verify field notes/checklist write services still avoid pending-operation coupling unless explicitly approved.

Exit criteria:

- Static audit findings are documented.
- Any proposed code change is separately scoped.

### Phase D - Preview and Fixture Expansion

Risk: low to medium.

Actions:

- Expand cache replacement preview fixtures.
- Add narrow event handler fixture tests.
- Keep all helpers side-effect free and disconnected from production sync.

Exit criteria:

- Tests prove behavior boundaries.
- No runtime imports or feature flags activate new behavior.

### Phase E - Decision Boundary

Requires explicit approval:

- Replace-cache execute.
- Pending-operation worker or automatic retry.
- RLS changes.
- Production write verification.
- Broad event replay/projection refactor.
- Any destructive or corrective data operation.

## 4. C2.20 Staff Data Flow Read-Only SQL Checklist

Purpose: confirm deployed staff views and tombstone coverage match the local sanitizer/replay assumptions.

Required placeholders:

- `<OWNER_ID>`: owner profile/user id.
- `<STAFF_ID>`: active staff profile/user id.

### C2.20-A View definition

```sql
SELECT pg_get_viewdef('public.staff_accessible_events'::regclass, true) AS view_definition;
```

Expected:

- The view exposes explicit safe columns or a known sanitized shape.
- The view includes `e.type`, `e.payload`, `e.market_id`, and active relationship filtering.
- If the view filters event types, `deal_deleted` and `interaction_deleted` must not be accidentally excluded.

### C2.20-B Tombstones have root market ids

```sql
SELECT
  type,
  COUNT(*) AS event_count,
  COUNT(*) FILTER (WHERE market_id IS NULL) AS missing_root_market_id
FROM public.events
WHERE type IN ('deal_deleted', 'interaction_deleted')
GROUP BY type
ORDER BY type;
```

Expected:

- `missing_root_market_id = 0`.

### C2.20-C Inspect tombstones missing root market id

Run only if C2.20-B returns missing rows.

```sql
SELECT
  id,
  type,
  market_id,
  payload->>'marketId' AS payload_market_id_camel,
  payload->>'market_id' AS payload_market_id_snake,
  payload->>'eventId' AS payload_event_id_camel,
  payload->>'event_id' AS payload_event_id_snake,
  timestamp,
  created_at
FROM public.events
WHERE type IN ('deal_deleted', 'interaction_deleted')
  AND market_id IS NULL
ORDER BY created_at DESC NULLS LAST, timestamp DESC
LIMIT 50;
```

Expected:

- Ideally zero rows.
- If rows exist, do not repair yet. Classify whether payload still contains enough market/target information.

### C2.20-D Owner/staff relationship tombstone coverage

```sql
SELECT
  e.type,
  COUNT(*) AS event_count,
  COUNT(*) FILTER (WHERE e.market_id IS NULL) AS missing_root_market_id
FROM public.events e
JOIN public.market_members mm ON mm.market_id = e.market_id
JOIN public.staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.owner_id = '<OWNER_ID>'::uuid
  AND sr.staff_id = '<STAFF_ID>'::uuid
  AND sr.status = 'active'
  AND e.type IN ('deal_closed', 'deal_deleted', 'interaction_recorded', 'interaction_deleted')
GROUP BY e.type
ORDER BY e.type;
```

Expected:

- Staff-related market events are reachable through the active relationship.
- Deleted/tombstone event counts are not unexpectedly absent.
- `missing_root_market_id = 0`.

## 5. C2.21 Cloud Consistency Read-Only SQL Checklist

Purpose: detect old cloud data debt before any future cloud-first or replace-cache decision.

### C2.21-A Markets projection vs active deal events

```sql
WITH deal_closed AS (
  SELECT
    e.id,
    e.market_id,
    e.timestamp,
    e.created_at,
    e.payload,
    COALESCE(
      NULLIF(e.payload->>'manualRevenue', '')::numeric,
      NULLIF(e.payload->>'manual_revenue', '')::numeric,
      NULLIF(e.payload->>'totalAmount', '')::numeric,
      NULLIF(e.payload->>'total_amount', '')::numeric,
      0
    ) AS revenue,
    COALESCE(
      NULLIF(e.payload->>'manualDealCount', '')::integer,
      NULLIF(e.payload->>'manual_deal_count', '')::integer,
      NULLIF(e.payload->>'dealCount', '')::integer,
      NULLIF(e.payload->>'deal_count', '')::integer,
      1
    ) AS deal_count
  FROM public.events e
  WHERE e.type = 'deal_closed'
),
deal_deleted AS (
  SELECT
    COALESCE(payload->>'eventId', payload->>'event_id') AS target_event_id,
    market_id,
    id AS tombstone_id
  FROM public.events
  WHERE type = 'deal_deleted'
),
active_deals AS (
  SELECT dc.*
  FROM deal_closed dc
  LEFT JOIN deal_deleted dd ON dd.target_event_id = dc.id::text
  WHERE dd.tombstone_id IS NULL
),
event_totals AS (
  SELECT
    market_id,
    COUNT(*) AS active_deal_event_count,
    COALESCE(SUM(revenue), 0) AS active_event_revenue,
    COALESCE(SUM(deal_count), 0) AS active_event_deal_count
  FROM active_deals
  GROUP BY market_id
)
SELECT
  m.id AS market_id,
  m.name,
  m.start_date,
  m.total_revenue AS cloud_market_total_revenue,
  COALESCE(et.active_event_revenue, 0) AS active_event_revenue,
  m.total_revenue - COALESCE(et.active_event_revenue, 0) AS revenue_diff,
  m.total_deals AS cloud_market_total_deals,
  COALESCE(et.active_event_deal_count, 0) AS active_event_deal_count,
  m.total_deals - COALESCE(et.active_event_deal_count, 0) AS deal_diff,
  COALESCE(et.active_deal_event_count, 0) AS active_deal_event_count
FROM public.markets m
LEFT JOIN event_totals et ON et.market_id = m.id
WHERE
  COALESCE(m.total_revenue, 0) <> COALESCE(et.active_event_revenue, 0)
  OR COALESCE(m.total_deals, 0) <> COALESCE(et.active_event_deal_count, 0)
ORDER BY ABS(COALESCE(m.total_revenue, 0) - COALESCE(et.active_event_revenue, 0)) DESC;
```

Expected:

- Zero rows is ideal.
- Any row is an audit finding, not an automatic repair approval.

### C2.21-B Tombstone completeness

```sql
SELECT
  type,
  COUNT(*) AS tombstone_count,
  COUNT(*) FILTER (WHERE market_id IS NULL) AS missing_root_market_id,
  COUNT(*) FILTER (
    WHERE COALESCE(payload->>'eventId', payload->>'event_id') IS NULL
  ) AS missing_target_event_id
FROM public.events
WHERE type IN ('deal_deleted', 'interaction_deleted')
GROUP BY type
ORDER BY type;
```

Expected:

- `missing_root_market_id = 0`.
- `missing_target_event_id = 0`.

### C2.21-C Tombstone target integrity

```sql
WITH tombstones AS (
  SELECT
    id AS tombstone_id,
    type AS tombstone_type,
    market_id,
    COALESCE(payload->>'eventId', payload->>'event_id') AS target_event_id,
    timestamp,
    created_at
  FROM public.events
  WHERE type IN ('deal_deleted', 'interaction_deleted')
)
SELECT
  t.tombstone_id,
  t.tombstone_type,
  t.market_id,
  t.target_event_id,
  target.id AS target_id,
  target.type AS target_type,
  t.timestamp,
  t.created_at
FROM tombstones t
LEFT JOIN public.events target ON target.id::text = t.target_event_id
WHERE target.id IS NULL
ORDER BY t.created_at DESC NULLS LAST, t.timestamp DESC
LIMIT 100;
```

Expected:

- Zero rows is ideal.

### C2.21-D Duplicate semantic deal check

```sql
WITH deal_values AS (
  SELECT
    id,
    market_id,
    COALESCE(payload->>'dealDate', payload->>'deal_date', to_char(timestamp AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD')) AS deal_date,
    COALESCE(
      NULLIF(payload->>'manualRevenue', '')::numeric,
      NULLIF(payload->>'manual_revenue', '')::numeric,
      NULLIF(payload->>'totalAmount', '')::numeric,
      NULLIF(payload->>'total_amount', '')::numeric,
      0
    ) AS revenue
  FROM public.events
  WHERE type = 'deal_closed'
)
SELECT
  market_id,
  deal_date,
  revenue,
  COUNT(*) AS duplicate_count,
  array_agg(id ORDER BY id) AS event_ids
FROM deal_values
GROUP BY market_id, deal_date, revenue
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, deal_date DESC
LIMIT 100;
```

Expected:

- Zero rows is ideal.
- Non-zero rows need human classification because legitimate same-day same-revenue records may exist.

### C2.21-E Snapshot shape check

```sql
SELECT
  id,
  user_id,
  snapshot_at,
  version,
  event_count,
  jsonb_typeof(data) AS data_type,
  jsonb_object_keys(data) AS top_level_key
FROM public.snapshots
ORDER BY snapshot_at DESC
LIMIT 50;
```

Expected:

- Snapshot shape is understood before any future snapshot/rebuild work.
- Do not repair snapshots in this phase.

## 6. C2.29B Staff View / RLS Read-Only SQL Checklist

Purpose: verify deployed staff data isolation. This checklist should be run with explicit test staff and owner ids.

Required placeholders:

- `<STAFF_ID>`: staff user id to simulate with `auth.uid()`.
- `<OWNER_ID>`: owner user id for owner regression checks.

Important: the `SET LOCAL ROLE authenticated` and `set_config` statements below are transaction-local session simulation, not data writes.

### C2.29B-E1 Staff market view redaction

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<STAFF_ID>', true);

SELECT count(*) AS staff_markets_view
FROM public.staff_accessible_markets;

SELECT
  count(*) AS total,
  count(*) FILTER (WHERE booth_cost IS NULL) AS booth_cost_null,
  count(*) FILTER (WHERE total_profit IS NULL) AS total_profit_null,
  count(*) FILTER (WHERE commission_rate IS NULL) AS commission_rate_null,
  count(*) FILTER (WHERE registration_fee IS NULL) AS registration_fee_null,
  count(*) FILTER (WHERE table_rental IS NULL) AS table_rental_null,
  count(*) FILTER (WHERE chair_rental IS NULL) AS chair_rental_null,
  count(*) FILTER (WHERE umbrella_rental IS NULL) AS umbrella_rental_null,
  count(*) FILTER (WHERE tablecloth_rental IS NULL) AS tablecloth_rental_null
FROM public.staff_accessible_markets;

ROLLBACK;
```

Expected:

- If `total > 0`, every listed sensitive column should have null count equal to `total`.

### C2.29B-E2 Staff product view redaction

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<STAFF_ID>', true);

SELECT count(*) AS staff_products_view
FROM public.staff_accessible_products;

SELECT
  count(*) AS total,
  count(*) FILTER (WHERE cost IS NULL) AS cost_null
FROM public.staff_accessible_products;

ROLLBACK;
```

Expected:

- If `total > 0`, `cost_null = total`.

### C2.29B-E3 Staff event payload redaction

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<STAFF_ID>', true);

SELECT count(*) AS staff_events_view
FROM public.staff_accessible_events;

SELECT
  count(*) FILTER (WHERE payload ? 'boothCost') AS has_boothCost,
  count(*) FILTER (WHERE payload ? 'cost') AS has_cost,
  count(*) FILTER (WHERE payload ? 'costAtTimeOfSale') AS has_costAtTimeOfSale,
  count(*) FILTER (WHERE payload ? 'supplierInfo') AS has_supplierInfo,
  count(*) FILTER (WHERE payload ? 'profitMargin') AS has_profitMargin,
  count(*) FILTER (WHERE payload ? 'grossMargin') AS has_grossMargin,
  count(*) FILTER (WHERE payload ? 'totalProfit') AS has_totalProfit,
  count(*) FILTER (WHERE payload ? 'netProfit') AS has_netProfit,
  count(*) FILTER (WHERE payload ? 'deposit') AS has_deposit,
  count(*) FILTER (WHERE payload ? 'commissionRate') AS has_commissionRate,
  count(*) FILTER (WHERE payload ? 'tableRental') AS has_tableRental,
  count(*) FILTER (WHERE payload ? 'chairRental') AS has_chairRental,
  count(*) FILTER (WHERE payload ? 'umbrellaRental') AS has_umbrellaRental,
  count(*) FILTER (WHERE payload ? 'tableclothRental') AS has_tableclothRental,
  count(*) FILTER (WHERE payload ? 'registrationFee') AS has_registrationFee,
  count(*) FILTER (WHERE payload ? 'booth_cost') AS has_booth_cost,
  count(*) FILTER (WHERE payload ? 'total_cost') AS has_total_cost
FROM public.staff_accessible_events;

SELECT type, count(*)
FROM public.staff_accessible_events
WHERE type IN ('deal_deleted', 'interaction_deleted')
GROUP BY type
ORDER BY type;

ROLLBACK;
```

Expected:

- All sensitive `has_*` counts should be `0`.
- Tombstones should be visible when relevant events exist for the staff-accessible market scope.

### C2.29B-E4 Staff direct base-table SELECT blocked

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<STAFF_ID>', true);

SELECT count(*) AS staff_markets_direct FROM public.markets;
SELECT count(*) AS staff_products_direct FROM public.products;
SELECT count(*) AS staff_events_direct FROM public.events;

SELECT count(*) AS staff_markets_with_booth_cost
FROM public.markets
WHERE booth_cost IS NOT NULL;

SELECT count(*) AS staff_products_with_cost
FROM public.products
WHERE cost IS NOT NULL;

SELECT count(*) AS staff_events_with_payload
FROM public.events
WHERE payload IS NOT NULL;

ROLLBACK;
```

Expected:

- All direct base-table counts should be `0` for staff.

### C2.29B-E4 Owner regression check

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<OWNER_ID>', true);

SELECT count(*) AS owner_markets_direct FROM public.markets;
SELECT count(*) AS owner_products_direct FROM public.products;
SELECT count(*) AS owner_events_direct FROM public.events;

SELECT id, name, booth_cost, total_profit, commission_rate
FROM public.markets
LIMIT 5;

ROLLBACK;
```

Expected:

- Owner can still read expected owner-owned base-table rows.
- Financial fields are not accidentally hidden from owner.

### C2.29B-E5 Type-level guard

Runtime SQL cannot prove this. Validate locally with the existing type-level guard files:

- `lib/supabase/staff-typed-client.ts`
- `tests/staff-typed-client.test-d.ts`

Expected:

- Staff-scoped client usage cannot compile when targeting forbidden base tables.
- If this test is not part of the normal test command, the next low-risk task should add an explicit script or static audit for it before changing runtime behavior.

## 7. Result Recording Template

Use this format after running any read-only verification:

```text
Environment:
Date:
Runner:
Owner id:
Staff id:
Market id, if used:

C2.20:
- A view definition:
- B tombstone root market id:
- C missing tombstone rows:
- D relationship coverage:

C2.21:
- A market projection diff rows:
- B tombstone completeness:
- C missing tombstone targets:
- D duplicate semantic deal rows:
- E snapshot shape:

C2.29B:
- E1 staff market redaction:
- E2 staff product redaction:
- E3 staff event payload redaction:
- E4 staff direct base-table select:
- E4 owner regression:
- E5 type-level guard:

Anomalies:
Recommended next step:
Requires decision? yes/no
```

## 8. Recommended Immediate Next Step

Proceed with Phase B in this order:

1. C2.21 read-only cloud consistency audit.
2. C2.20 staff data flow read-only audit.
3. C2.29B staff view/RLS read-only audit.

Reason: C2.21 gives the broadest picture of existing data debt before any future cache replacement or outbox design. C2.20 and C2.29B then confirm whether staff-visible cloud data is correctly scoped and sanitized.

## 9. Phase B Progress

### C2.21 Read-Only Cloud Consistency Audit

Status: completed with notes on 2026-06-29.

Result file:

- `docs/C2.21_READ_ONLY_VERIFICATION_RESULT_2026_06_29.md`

Summary:

- Market projection vs active deal events returned 4 mismatch rows.
- Tombstone completeness passed: no missing root market ids or target event ids.
- Tombstone target integrity passed: zero missing target rows.
- Duplicate semantic deal check returned 34 broad duplicate-like clusters across 14 markets; these require manual classification and must not be auto-repaired.
- Snapshot shape check showed compressed snapshots, so simple JSON projection SQL is insufficient for snapshot consistency verification.

Decision:

- Continue to C2.20 read-only Staff Data Flow verification.
- Do not approve data repair, replace-cache execute, snapshot rebuild, or duplicate-event cleanup based on C2.21 alone.

### C2.20 Staff Data Flow Read-Only Verification

Status: completed after focused 053 repair. User reported 053 was executed and verified.

SQL source:

- `supabase/verification/c2_20_staff_data_flow_read_only.sql`

Result template:

- `docs/C2.20_READ_ONLY_VERIFICATION_RESULT_TEMPLATE.md`

Scope:

- Confirm deployed `staff_accessible_markets`, `staff_accessible_products`, and `staff_accessible_events` behavior.
- Confirm `sanitize_staff_event_payload` is present when expected.
- Confirm tombstone root `market_id` and target event ids remain available.
- Confirm selected active staff can see only scoped view rows.
- Confirm staff-visible payloads and market/product columns do not expose sensitive owner-only data.

Boundary:

- This is a read-only verification package only.
- It does not approve RLS changes, view changes, sanitizer changes, data repair, or production writes.

Current findings:

- Active owner/staff pair selected: owner `0d21abfe-136f-4c42-987b-14928593f323`, staff `5e92b457-1eaf-49eb-9295-ba47b5a3e575`, role `operator`.
- Global tombstone completeness passed.
- Relationship-scoped projection/tombstone event coverage is present.
- Staff event payload sensitive-key check found `deposit` in 30 staff-visible event payloads.
- C2.20-I confirmed those `deposit` payloads come from `market_created` events, with non-zero deposit values in sample rows. Local sanitizer rules treat `deposit` as sensitive for staff.
- Corrected C2.20-F confirmed tombstone visibility, but sample output contains duplicate event ids.
- C2.20-A1 confirmed deployed staff view definitions expose risk paths:
  - `staff_accessible_markets` owner branch still uses `market_members.user_id = auth.uid()`;
  - `staff_accessible_events` Branch 3 returns full payload where `e.actor_id = auth.uid()`.
- C2.20-H1 confirmed market sensitive-column redaction fails for staff: only 46 of 87 rows have core sensitive fields nulled.
- C2.20-J confirmed 9 duplicate event id rows in `staff_accessible_events`.
- Product `cost` redaction passed for the provided output.
- C2.20-F initially failed because the verification SQL assumed `staff_accessible_events.created_at`; the deployed view does not expose that column. The SQL bundle now uses `timestamp`.

Post-repair status:

- Focused migration: `supabase/migrations/053_repair_staff_accessible_view_sanitization.sql`.
- User reported 053 was executed and verification completed.
- Raw post-053 SQL rows were not pasted into this plan; row-level evidence should be stored if re-run.

Next step:

- Proceed to C2.29B Staff View / RLS read-only verification.
- Do not approve data repair, replace-cache execute, snapshot rebuild, or broad RLS rewrites based on C2.20 alone.

### C2.29B Staff View / RLS Read-Only Verification

Status: completed on 2026-06-29.

SQL sources:

- `supabase/verification/c2_29b_staff_view_rls_read_only.sql`
- `supabase/verification/c2_29b_staff_view_rls_read_only_followup.sql`

Result record:

- `docs/C2.29B_READ_ONLY_VERIFICATION_RESULT_2026_06_29.md`

Verified owner/staff pair:

- Owner: `0d21abfe-136f-4c42-987b-14928593f323`
- Staff: `5e92b457-1eaf-49eb-9295-ba47b5a3e575`
- Staff role: `operator`
- Staff-accessible active market count: 30

Result summary:

- E0 active owner/staff relationship: passed.
- E1 staff market view redaction/scope: passed.
- E2 staff product cost redaction: passed.
- E3 staff event payload redaction, tombstone visibility, and duplicate id check: passed.
- E4 staff direct base-table SELECT blocked: passed.
- E4 owner direct base-table regression: passed.
- E5 type-level guard: passed locally with `npm.cmd run test:staff-types`.

Decision:

- No RLS/view/client repair is justified by the provided C2.29B output.
- C2.29B no longer blocks the next low-risk planning or audit slice.
