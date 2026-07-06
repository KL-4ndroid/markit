# Féria Sales Photo Evidence Execution Plan

Date: 2026-07-04
Status: Slice 5C-3G pending evidence recovery/cleanup semantics implemented as a pure model. Pure status/type/key/retention guardrails are implemented and tested. Database metadata schema was drafted, guarded by static tests, and 055 has been manually executed. 056 has been manually executed. Owner default setting, new-market inheritance, owner market-level toggle, operating-screen owner/staff UI, post-sale pending evidence draft decision model, post-sale orchestration boundary, deferred post-sync creation planner, local pending creation queue model, disabled drain service interface, Dexie queue table, disabled storage adapter, pending-write/auth-cache guard integration, runtime enqueue boundary guardrails, code-only disabled runtime flag, dependency-injected runtime wrapper, `AddRevenueDialog` wrapper pilot, disabled evidence context plumbing, runtime enablement guardrails, owner/staff local pending evidence list shell, read-only pending list UX polish, runtime enqueue verification plan guardrails, isolated fake-indexeddb runtime fixture, and pending creation recovery/cleanup classification are implemented. Runtime Supabase evidence row creation, enabled post-sale enqueue, recovery/cleanup execution, sync drain wiring, photo capture, R2 upload, signed access, and album review are not yet implemented.

## Goal

Add a sales photo evidence workflow for Féria so owners can require staff to capture short-term proof photos after sales without slowing down normal sales recording.

The feature must preserve the current fast sales flow:

- sales records are saved before any photo work starts;
- staff can skip immediate capture and complete it later;
- owners control whether photo evidence is required;
- photos live in Cloudflare R2, while Supabase/Postgres stores metadata only;
- the owner can review all evidence photos for a market from market detail in an album-like view.

## Non-Goals

- Do not store image binary data in Postgres.
- Do not make evidence photos product master images.
- Do not require staff to wait for upload completion before continuing sales work.
- Do not add long-term paid retention behavior in the first implementation.
- Do not introduce multi-photo evidence in the first version, but keep the data model extensible.

## Product Rules

1. Photo evidence is a market-level requirement.
2. Owner settings define the default for newly created markets.
3. Market detail can override the default per market.
4. During an active market, owners can toggle the market's photo evidence requirement from the operating screen.
5. Staff cannot change the requirement.
6. If evidence is required, each completed sale creates a photo evidence requirement.
7. Staff can capture immediately, skip and capture later, or retry failed uploads.
8. Skipping capture does not remove the requirement.
9. Closing or disabling the market-level requirement affects future sales only; existing pending evidence remains pending unless the owner waives it.
10. Owner-visible review surfaces must distinguish immediate capture from delayed capture.

## Roles and Permissions

### Owner

- Configure the default evidence requirement for future markets.
- Enable or disable evidence requirement for a specific market.
- Toggle evidence requirement during an active market.
- View all evidence and pending evidence for a market.
- Waive evidence for a sale with an audit reason.
- Replace or request replacement of an incorrect photo.

### Staff

- See whether photo evidence is required for the active market.
- Capture evidence after a sale.
- Skip immediate capture and leave the sale pending.
- Reopen their pending evidence list and capture later.
- Retry uploads for photos captured on their device.
- Cannot enable, disable, or waive the requirement.

### Future Extension

Manager-level control can be added later by permission, but the first implementation should keep setting and waiver authority owner-only.

## Settings Model

### Owner Settings

Add an owner setting:

```txt
default_sales_photo_evidence_required: boolean
```

Behavior:

- Applied when a new market is created.
- Does not mutate existing markets.
- Future optional action: "apply to unstarted markets" with explicit confirmation.

### Market Setting

Add a market-level setting:

```txt
sales_photo_evidence_required: boolean
```

Behavior:

- Controls whether new sales in this market require evidence.
- Editable by owner in market detail.
- Editable by owner in the active operating screen.
- Read-only indicator for staff.

## User Experience

### Owner Settings Page

Add a setting under owner-controlled operational defaults:

```txt
New markets require sales photo evidence
On / Off
```

Helper copy should be short and operational:

```txt
When enabled, newly created markets will ask staff to capture a photo after each sale.
```

### Market Detail Page

Add a section:

```txt
Sales Photo Evidence
Require photo after each sale: On / Off
```

Also add a primary entry point:

```txt
View Evidence Photos
```

This opens the market evidence album.

### Active Operating Screen

For owner:

```txt
Camera icon + Evidence On/Off toggle
Pending photos count
```

For staff:

```txt
Camera icon + Evidence required/read-only state
Pending photos count
```

The pending count opens the pending evidence list.

### Post-Sale Prompt

When evidence is required, after the sale is saved:

```txt
Capture photo evidence

[Take Photo]
[Skip, capture later]
```

Important: the sale is already saved before this prompt appears.

### Pending Evidence List

Accessible from the operating screen and market detail.

Each row should show:

- sale completion time;
- item summary or sale note;
- amount;
- staff member;
- evidence status;
- delayed capture indicator if applicable;
- actions available to the current role.

Staff actions:

- capture;
- retry upload;
- replace local failed capture.

Owner actions:

- view;
- request replacement;
- waive requirement;
- inspect status and timing.

### Market Evidence Album

Add an owner-facing album entry from market detail:

```txt
Market Detail -> View Evidence Photos
```

The album should show thumbnail cards grouped or filterable by:

- all;
- uploaded;
- pending capture;
- skipped;
- upload failed;
- waived;
- expired.

Each thumbnail card should show:

- photo thumbnail;
- sale time;
- staff name;
- sale amount;
- delayed capture badge when `photo_captured_at > sale_completed_at`;
- status badge;
- expiration indicator when close to retention expiry.

Clicking a thumbnail opens a detail viewer:

- larger image from a short-lived signed URL;
- sale metadata;
- capture metadata;
- upload metadata;
- staff identity;
- evidence status;
- actions: replace request, waive, close.

The album must not expose raw public R2 URLs.

## Evidence Status Model

Use explicit statuses instead of a boolean:

```txt
not_required
pending_capture
capture_skipped
captured_local
uploading
uploaded
upload_failed
expired
waived_by_owner
```

Recommended meanings:

- `not_required`: the sale did not require photo evidence at creation time.
- `pending_capture`: evidence is required but no capture attempt exists.
- `capture_skipped`: staff intentionally skipped immediate capture.
- `captured_local`: a compressed image exists locally and needs upload.
- `uploading`: an upload attempt is in progress.
- `uploaded`: R2 object exists and metadata is saved.
- `upload_failed`: capture exists or existed, but upload failed.
- `expired`: R2 object was deleted by retention policy or cleanup.
- `waived_by_owner`: owner explicitly accepted missing evidence.

## State Transitions

```txt
not_required

pending_capture -> capture_skipped
pending_capture -> captured_local
pending_capture -> waived_by_owner

capture_skipped -> captured_local
capture_skipped -> waived_by_owner

captured_local -> uploading
captured_local -> upload_failed

uploading -> uploaded
uploading -> upload_failed

upload_failed -> uploading
upload_failed -> captured_local
upload_failed -> waived_by_owner

uploaded -> expired
uploaded -> captured_local  (replacement flow, future-safe)
```

Do not auto-delete or auto-waive existing pending rows when the owner disables evidence for the market.

## Data Model

### Sales Summary Fields

Add minimal summary fields to the sale record or sale projection:

```txt
photo_evidence_required boolean
photo_evidence_status text
photo_evidence_id uuid nullable
```

These fields optimize list rendering and owner dashboards.

### Evidence Table

Create a dedicated evidence table:

```txt
sale_photo_evidence
- id uuid primary key
- owner_id uuid not null
- market_id uuid not null
- sale_id uuid not null
- captured_by_staff_id uuid nullable
- status text not null
- r2_object_key text nullable
- r2_thumbnail_key text nullable
- mime_type text nullable
- width integer nullable
- height integer nullable
- file_size_bytes integer nullable
- content_hash text nullable
- skipped_reason text nullable
- failure_reason text nullable
- sale_completed_at timestamptz not null
- captured_at timestamptz nullable
- uploaded_at timestamptz nullable
- expires_at timestamptz nullable
- waived_by_owner_id uuid nullable
- waived_reason text nullable
- waived_at timestamptz nullable
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz nullable
```

Indexes:

```txt
(owner_id, market_id, status)
(owner_id, market_id, sale_completed_at desc)
(sale_id)
(expires_at)
```

Future extension:

- allow multiple rows per sale for multi-photo evidence;
- add `evidence_slot` or `sequence_number`;
- add `replacement_of_evidence_id` for replacement audit chains.

## Storage Model

Use Cloudflare R2 for image objects.

Object key pattern:

```txt
sales-evidence/7d/{ownerId}/{marketId}/{saleId}/{evidenceId}.webp
sales-evidence-thumbs/7d/{ownerId}/{marketId}/{saleId}/{evidenceId}.webp
```

Use R2 lifecycle rules to delete `sales-evidence/7d/` and `sales-evidence-thumbs/7d/` objects after 7 days.

Supabase/Postgres stores only metadata and object keys.

Access model:

- uploads use short-lived signed upload capability from a trusted server route;
- reads use short-lived signed read URLs;
- owner and authorized staff access is checked before signed URLs are issued;
- no public bucket URLs are stored in the client as durable data.

## Image Processing

Client-side processing before upload:

```txt
target max edge: 1800px or 2048px
preferred format: WebP
fallback format: JPEG
target file size: <= 1MB
starting quality: 0.82
minimum quality: 0.65
thumbnail: 320px max edge
strip EXIF metadata
```

Compression should be adaptive:

1. Try target max edge and quality 0.82.
2. If above 1MB, lower quality gradually.
3. If quality reaches 0.65 and still above 1MB, reduce max edge.
4. If compression still fails, keep the sale pending and show a retry/capture-again path.

## Offline and Failure Handling

### Camera Permission Denied

- Keep sale saved.
- Mark evidence as `pending_capture`.
- Show staff a short message and the pending evidence entry.

### Staff Skips Capture

- Mark evidence as `capture_skipped`.
- Optional skipped reason.
- Show in owner album and pending list.

### Offline After Capture

- Store compressed image and thumbnail locally.
- Mark as `captured_local`.
- Upload when network returns.

### Upload Failure

- Mark as `upload_failed`.
- Preserve local compressed image if available.
- Allow retry.
- Owner sees failed rows.

### App Closed Mid-Flow

- On next launch, surface pending local uploads.
- Do not create duplicate sale records.
- Evidence rows must be idempotent by `sale_id` and `evidence_id`.

### Local Storage Full

- Keep sale saved.
- Mark evidence as `pending_capture` or `upload_failed` with a storage failure reason.
- Tell staff to retry later or notify owner.

### Wrong Photo

First implementation:

- staff can retake before upload;
- owner can request replacement after upload.

Future extension:

- preserve replacement audit chain.

## Retention and Expiration

Default retention:

```txt
7 days from uploaded_at or captured_at, whichever policy is chosen during implementation.
```

Recommended first implementation:

- set `expires_at = uploaded_at + 7 days` once upload succeeds;
- if a photo remains local-only too long, keep it in pending/failed state and do not claim it is retained in cloud;
- a cleanup job marks metadata as `expired` after the R2 object expires.

Album behavior after expiration:

- sale record remains;
- evidence row remains;
- image viewer shows expired state instead of an image;
- owner can still see that evidence once existed and when it expired.

## Audit Events

Record audit-style events for:

- owner enables evidence for a market;
- owner disables evidence for a market;
- staff skips immediate capture;
- staff captures evidence;
- upload succeeds;
- upload fails;
- owner waives evidence;
- owner requests replacement;
- evidence expires.

These can be lightweight internal events first and do not need to be exposed as a full user-facing audit log in the first slice.

## Execution Risk Analysis

### Risk 1: Sales Persistence Coupled to Camera or Upload

Problem:

If the post-sale capture prompt is coupled to `recordDeal()` or R2 upload, camera permission, compression, offline state, or upload failure could block the sale itself.

Best solution:

- Keep `deal_closed` persistence as the first committed operation.
- Create photo evidence as follow-up metadata only after sale persistence succeeds.
- Treat missing capture as an evidence status, not as a failed sale.
- Do not make R2 upload part of the sale transaction.

### Risk 2: Staff-Controlled Requirement Changes

Problem:

If staff can toggle the requirement, the owner loses control over whether evidence is required during a market.

Best solution:

- Owner-only writes for owner default and market-level requirement.
- Staff gets read-only indicator plus capture/skip/retry actions.
- Waiver remains owner-only and requires a reason.

### Risk 3: Existing Pending Evidence Lost When Owner Disables the Toggle

Problem:

If disabling evidence retroactively clears pending rows, the audit trail becomes unreliable.

Best solution:

- Market toggle affects future sales only.
- Existing evidence rows keep their own statuses.
- Owner can waive specific pending evidence rows explicitly.

### Risk 4: R2 Object Access Leaks

Problem:

Public object URLs or predictable browser-held URLs could expose evidence photos outside the intended owner/staff scope.

Best solution:

- Store object keys only.
- Issue short-lived signed upload/read URLs from a trusted server route.
- Re-check owner/staff market access before issuing signed URLs.
- Keep album URLs non-durable.

### Risk 5: Path Injection in Object Keys

Problem:

Owner, market, sale, or evidence ids used directly in R2 keys can accidentally create unexpected prefixes if not constrained.

Best solution:

- Use a shared object-key builder.
- Accept only safe segment characters.
- Keep all first-version objects under explicit `sales-evidence/7d/` and `sales-evidence-thumbs/7d/` prefixes.

### Risk 6: Full-Size Images Consume Bandwidth and Storage

Problem:

Phone originals are too large for a short-term evidence feature.

Best solution:

- Use adaptive client compression.
- Preserve practical detail with a 2048px target edge and 1800px fallback.
- Keep a hard first-version target under 1MB.
- Generate a 320px thumbnail for album grids.
- Strip EXIF metadata.

### Risk 7: Expiration Metadata Drifts From R2 Lifecycle

Problem:

R2 lifecycle deletion can remove the object while Postgres still says the evidence is uploaded.

Best solution:

- Set `expires_at = uploaded_at + 7 days`.
- Add an expiration reconciliation slice after R2 upload is implemented.
- Album viewer checks metadata status before asking for signed object URLs.
- Expired metadata remains visible without trying to fetch a deleted object.

### Risk 8: Local-Only Captures and Account Switching

Problem:

Offline local photos may remain on-device while auth/cache reset or account switching occurs.

Best solution:

- Treat local captured evidence as pending local work in later auth/cache guards.
- Do not clear local captured evidence silently.
- Add local pending evidence reporting before any destructive authenticated-cache reset integration.

### Risk 9: Schema and Sync Scope Creep

Problem:

Adding evidence metadata directly to existing event handlers or staff views too early can affect sync, role visibility, and existing sales projection logic.

Best solution:

- Start with pure contracts and tests.
- Add schema/RLS as its own slice.
- Add runtime sale-hook behavior only after metadata persistence is proven.
- Keep image objects outside the event stream unless a later explicit decision approves evidence events.

## Implementation Slices

### Slice 1: Planning Guardrails and Type Contracts

- Add shared status constants and TypeScript types.
- Add tests that enumerate allowed status transitions.
- No runtime behavior yet.

Acceptance:

- status enum exists;
- transition tests pass;
- no sales UI changes.

Status:

- Implemented in `lib/sales/photo-evidence-model.ts`.
- Guarded by `tests/sales-photo-evidence-model.test.ts`.
- Includes status constants, transition checks, R2 object key builder, retention calculation, and compression policy.
- Still intentionally does not touch Dexie, Supabase, R2, settings, sales runtime, or UI.
- Verified with `npx.cmd tsx tests/sales-photo-evidence-model.test.ts`.
- Verified through the full `npm.cmd test` suite.

### Slice 2: Database and Metadata Schema

- Add `sale_photo_evidence` table/migration.
- Add sale summary fields or projection-compatible metadata.
- Add owner/market setting fields.
- Add RLS policies for owner read/write and staff scoped write/read.

Acceptance:

- owner can read all market evidence metadata;
- staff can create/update their scoped evidence rows;
- staff cannot change market setting or waive evidence;
- no binary image data enters Postgres.

Status:

- Drafted in `supabase/migrations/055_add_sales_photo_evidence_schema.sql`.
- Guarded by `tests/supabase-sales-photo-evidence-schema.test.ts`.
- Added owner default field: `user_settings.default_sales_photo_evidence_required`.
- Added market setting field: `markets.sales_photo_evidence_required`.
- Added metadata-only table: `sale_photo_evidence`.
- The schema stores private R2 object keys only; no binary image data or public URL storage.
- RLS allows owner review of owned market evidence and staff scoped capture/update rows.
- Staff waiver and hard delete are blocked by RLS/grants.
- The migration intentionally does not alter `public.events`, event type constraints, sync, sales runtime, R2 runtime, or UI.
- 055 has been manually executed and reported as complete by the project owner.

### Slice 3: Owner Settings and Market Detail Toggle

- Add default setting in owner settings page.
- Add market-level toggle in market detail.
- Apply default when creating future markets.
- Do not mutate existing markets automatically.

Acceptance:

- owner can set default;
- new markets inherit the default;
- owner can override per market;
- staff cannot see editable controls.

Status:

- Implemented in `lib/sales/photo-evidence-settings.ts`.
- Owner settings UI added through `components/settings/SalesPhotoEvidenceSettingsCard.tsx`.
- `app/settings/page.tsx` renders the setting owner-only.
- `components/markets/AddMarketForm.tsx` applies the owner default to future `market_created` payloads.
- `app/markets/[id]/page.tsx` exposes an owner-only market-level toggle through existing `updateMarket()` / `market_updated`.
- `types/db.ts`, `lib/db/events.ts`, and `lib/data-mappers.ts` preserve `salesPhotoEvidenceRequired` locally and across event/cloud mapping.
- Guarded by `tests/sales-photo-evidence-slice3.test.ts`.
- This slice does not create `sale_photo_evidence` rows, start camera capture, upload to R2, request signed URLs, or change the post-sale workflow.
- Supabase market read-model trigger/view mapping for this new flag is implemented in `supabase/migrations/056_wire_sales_photo_evidence_market_projection.sql`.
- 056 has been manually executed and reported as complete by the project owner.
- 056 is guarded by `tests/supabase-sales-photo-evidence-projection-migration.test.ts`.

### Slice 4: Active Operating Toggle and Indicator

- Add owner-only toggle in active operating screen.
- Add read-only staff indicator.
- Add pending evidence count entry point.

Acceptance:

- owner can toggle during active market;
- staff sees state but cannot change it;
- disabling affects future sales only.

Status:

- Implemented through the shared `components/markets/SalesPhotoEvidenceOperatingCard.tsx`.
- `app/markets/[id]/page.tsx` shows the owner operating-screen toggle only while the market is operating.
- The original owner market-level setting remains available outside the operating screen.
- `components/markets/StaffMarketDetailView.tsx` shows a read-only indicator for staff and does not pass a toggle handler.
- Pending evidence count entry point is UI-only with `pendingCount={0}` until evidence row creation is implemented.
- Guarded by `tests/sales-photo-evidence-slice4-operating-ui.test.ts`.
- This slice does not create `sale_photo_evidence` rows, start camera capture, upload to R2, request signed URLs, or change sale persistence.

### Slice 5: Post-Sale Evidence Requirement Creation

- When a sale completes and market setting is on, create a pending evidence row.
- Show capture prompt after sale persistence succeeds.
- Allow staff to skip.

Acceptance:

- sale persists even if prompt is closed;
- skipped rows appear as pending;
- no duplicate evidence row is created for the same sale.

Slice 5A Status:

- Implemented pure post-sale requirement decision model in `lib/sales/photo-evidence-model.ts`.
- The model returns `not_required`, `skip_existing`, or `create_pending`.
- `create_pending` produces a metadata-only draft for `sale_photo_evidence` with `status = 'pending_capture'`.
- The model requires committed UUID identifiers before creating a draft, especially `saleEventId`.
- Active existing evidence for the same sale causes `skip_existing` for idempotency.
- Soft-deleted evidence rows do not block a new pending draft.
- Guarded by `tests/sales-photo-evidence-model.test.ts`.
- This slice does not insert into Supabase, does not call `recordDeal()`, does not alter sale persistence, does not show the post-sale prompt, does not start camera capture, and does not upload to R2.

Slice 5B Status:

- `recordDeal()` now returns the committed local `deal_closed` event id.
- Added `lib/sales/photo-evidence-post-sale.ts` orchestration boundary.
- The wrapper always records the sale first, then evaluates photo evidence.
- If no evidence persister is provided, the wrapper returns a `draft_ready` result only.
- If an explicit persister is provided and evidence creation fails, the wrapper returns `failed` evidence status while preserving the recorded sale event id.
- If the sale itself fails, the wrapper still throws and never attempts evidence creation.
- Guarded by `tests/sales-photo-evidence-post-sale.test.ts`.
- This slice is not wired into existing sale UI entry points and does not import Supabase, R2, camera capture, or signed URL behavior.

Slice 5C-1 Status:

- Added `lib/sales/photo-evidence-deferred.ts` deferred creation planner.
- The planner only returns `ready_to_create` when the source event is a `deal_closed` event and `sync_status === 'synced'`.
- `local_only`, `pending`, `error`, `conflict`, and unknown sync states return `wait_for_event_sync`.
- Missing event ids, non-sale events, and invalid UUID/date inputs block fail-closed instead of creating evidence.
- Guarded by `tests/sales-photo-evidence-deferred.test.ts`.
- This slice does not insert into Supabase, does not drain a queue, does not run in a sync worker, does not show capture UI, does not start camera capture, and does not upload to R2.

Slice 5C-2 Status:

- Added `lib/sales/photo-evidence-pending-creation.ts` local pending creation queue model.
- The queue item is keyed by the `deal_closed` sale event id and snapshots owner, market, staff, and sale completion time.
- Candidate classification waits until the source sale event is synced before producing a `sale_photo_evidence` draft.
- Retryable failures can be retried within an explicit retry limit; created, creating, permanent failure, and invalid-source states are not runnable.
- Active evidence for the same sale blocks duplicate creation.
- Guarded by `tests/sales-photo-evidence-pending-creation.test.ts`.
- This slice does not create a Dexie table, does not write to Supabase, does not mount a sync worker, does not connect UI, does not capture photos, and does not upload to R2.

Slice 5C-3A Status:

- Added `lib/sales/photo-evidence-pending-creation-drain.ts` disabled drain service boundary.
- The boundary defines the storage adapter contract needed by a future local queue table, but does not implement the Dexie adapter yet.
- The drain is disabled unless explicitly called with `enabled: true`; no production path imports or calls it.
- When enabled in tests with fake dependencies, it waits for unsynced source events, creates only after synced `deal_closed`, treats existing active evidence as fulfilled, blocks invalid source rows, and classifies writer failures as retryable.
- Guarded by `tests/sales-photo-evidence-pending-creation-drain.test.ts`.
- This slice does not add a Dexie version, does not create a local queue table, does not write to Supabase, does not mount a sync worker, does not connect UI, does not capture photos, and does not upload to R2.

Slice 5C-3B-0 Status:

- Added Dexie version 5 with `salesPhotoEvidencePendingCreations`.
- The new table is keyed by `queueId`, which matches the source `deal_closed` event id for idempotency.
- Added `lib/sales/photo-evidence-pending-creation-storage.ts` Dexie storage adapter.
- The adapter can enqueue a pending creation idempotently, list runnable rows, read the source local event, and update queue statuses through the pure model helpers.
- Existing evidence lookup remains injectable and does not query Supabase by default.
- Guarded by `tests/sales-photo-evidence-pending-creation-storage.test.ts`.
- This slice does not connect `recordDeal()`, does not write Supabase, does not mount a sync worker, does not connect UI, does not capture photos, and does not upload to R2.
- Before any production enqueue path is connected, pending-write/auth-cache-reset guards must include this table so local pending evidence work is not silently lost on sign-out, role switch, or clear-local-and-resync flows.

Slice 5C-3B-1 Status:

- Extended `lib/sync/local-pending-write-report.ts` to count unfinished `salesPhotoEvidencePendingCreations`.
- Unfinished evidence creation statuses are all local queue states except `created`: `waiting_for_event_sync`, `creating`, `failed_retryable`, `failed_permanent`, and `blocked_invalid_source`.
- Added blocking reason `local_pending_sales_photo_evidence`.
- Auth-cache blocked event payloads, the blocked-state dialog, and force sign-out confirmation now surface the pending evidence count.
- Because there is no production evidence drain path yet, pending evidence rows are treated as a hard block and are not routed through the normal event push path.
- Guarded by `tests/auth-cache-destruction-guard.test.ts`.
- This slice does not connect `recordDeal()`, does not write Supabase, does not mount a sync worker, does not connect UI capture, does not capture photos, and does not upload to R2.

Slice 5C-3B-2 Status:

- Runtime enqueue remains blocked; this slice only records the high-risk boundary and guardrails before implementation.
- Direct immediate Supabase insert after local `recordDeal()` is not approved because the cloud `events` row may not exist yet while `sale_photo_evidence.sale_id` references `public.events(id)`.
- The recommended future runtime path is to call `recordDealWithPhotoEvidenceRequirement()` after the sale has committed, injecting `createDexieSalesPhotoEvidencePendingCreationStorage()` as the local queue writer only when an explicit internal feature flag is enabled.
- The feature flag must default off, must not read public env, localStorage, sessionStorage, or remote config, and must be enabled only by a reviewed code change or narrowly scoped test harness.
- Sale persistence remains the first committed operation. Evidence enqueue failure must not throw to the caller, must not roll back `deal_closed`, and must be logged or surfaced separately.
- `queueId` remains the sale event id so duplicate enqueue attempts are idempotent.
- The normal event push may run independently. The evidence drain must wait for the source `deal_closed` event to become synced before creating cloud evidence metadata.
- No drain worker, Supabase evidence insert, camera capture, upload, signed URL, or UI capture prompt is approved by this slice.
- Guarded by `tests/sales-photo-evidence-runtime-enqueue-plan.test.ts`.

Slice 5C-3B-3 Status:

- Added `lib/sales/photo-evidence-runtime-flags.ts` with a code-only `salesPhotoEvidenceRuntimeEnqueue` flag that defaults off.
- The flag does not read public env, localStorage, sessionStorage, remote config, or Supabase.
- Added `lib/sales/photo-evidence-runtime-enqueue.ts`, a dependency-injected wrapper around sale recording and optional evidence enqueue.
- When the flag is off, the wrapper records the sale through the existing `recordDeal()` path and returns `runtime_disabled`.
- When the flag is on but required context is missing, the wrapper still records the sale and returns `context_missing`; it does not enqueue evidence with incomplete data.
- When the flag is on and full context is provided, the wrapper calls the existing post-sale evidence planner and writes only to the local Dexie pending creation queue.
- `AddRevenueDialog` is the only production sale entry wired to the disabled wrapper pilot. It does not pass `evidenceContext` yet, so no evidence enqueue can occur in production.
- Other sale entry points remain on their existing direct `recordDeal()` calls.
- Guarded by `tests/sales-photo-evidence-runtime-enqueue-plan.test.ts` and `tests/sales-photo-evidence-runtime-enqueue.test.ts`.
- This slice does not write Supabase evidence rows, does not mount a drain worker, does not capture photos, does not upload to R2, does not create signed URLs, and does not show a capture prompt.

Slice 5C-3B-4 Status:

- `AddRevenueDialog` now accepts local `salesPhotoEvidenceContext` with `ownerId`, `marketRequiresEvidence`, and `capturedByStaffId`.
- `AddRevenueDialog` fills `marketId`, `saleCompletedAt`, and `now` at submit time so evidence timing follows the actual sale submit action rather than the selected report date.
- Owner market detail passes `ownerId` from `market.owner_id` with `user.id` fallback, `marketRequiresEvidence` from the local market flag, and `capturedByStaffId: null`.
- Staff market detail passes owner id from `relationship_owner_id`, `owner_id`, or `userRole.ownerId`, uses the same local market requirement flag, and passes the signed-in staff user id when not owner.
- If any required context remains unresolved when the disabled flag is later enabled, the runtime wrapper still records the sale and returns `context_missing` without enqueuing evidence.
- The runtime flag remains code-only and default off, so this slice still does not create local pending evidence rows in production.
- Guarded by `tests/sales-photo-evidence-runtime-enqueue.test.ts` and `tests/sales-photo-evidence-runtime-enqueue-plan.test.ts`.

Slice 5C-3B-5 Status:

- No global test-only flag setter is added.
- Existing dependency injection remains the only approved controlled enablement path for runtime enqueue tests.
- Production flag remains code-only and default off.
- The flag module remains immutable and must not read public env, localStorage, sessionStorage, remote config, Supabase, or any external control plane.
- This avoids creating a second mutable runtime control path just for tests.
- Guarded by `tests/sales-photo-evidence-runtime-enablement-decision.test.ts`.

Slice 5C-3C Status:

- Pending evidence list UI shell is implemented.
- Owner and staff market detail read `salesPhotoEvidencePendingCreations` through a local-only read model.
- The operating card now shows the local pending count and opens a read-only pending list dialog.
- The dialog displays pending status, sale event id, sale completed time, retry count, and last error message when present.
- No capture, upload, signed URL, drain, Supabase evidence row creation, queue mutation, or runtime enqueue enablement is added.
- Guarded by `tests/sales-photo-evidence-pending-list-ui.test.ts`.

Slice 5C-3D Status:

- Read-only pending list UX polish is implemented.
- The pending list dialog now shows status summary counts, needs-attention count, last loaded time, and a visible local read failure message.
- Owner and staff detail pages track pending list read errors and last loaded time separately from the queue rows.
- Refresh remains deterministic and read-only: it re-reads local `salesPhotoEvidencePendingCreations` but does not mutate queue rows.
- No capture, upload, signed URL, drain, Supabase evidence row creation, queue mutation, or runtime enqueue enablement is added.
- Guarded by `tests/sales-photo-evidence-pending-list-ui.test.ts`.

Slice 5C-3E Status:

- Runtime enqueue verification plan only is recorded.
- No runtime flag change is made.
- No local fixture, hidden UI, production enqueue, queue cleanup, or retry action is implemented.
- Recommended future verification path: a local-only disposable fixture that calls `recordDealWithOptionalSalesPhotoEvidence()` with injected dependencies after explicit approval.
- The fixture, if later approved, must write only to local IndexedDB test/disposable data and must not call Supabase, R2, signed URL, upload, drain, or queue cleanup.
- Production runtime enqueue remains blocked until pending rows have an approved recovery/cleanup path and manual verification scope is agreed.
- Guarded by `tests/sales-photo-evidence-runtime-verification-plan.test.ts`.

Slice 5C-3F Status:

- Local-only disposable runtime verification fixture is implemented.
- The fixture uses `fake-indexeddb`, imports the real runtime wrapper, and verifies that injected runtime enablement plus the default local storage adapter creates exactly one pending row.
- The fixture verifies idempotency for the same sale event id.
- The fixture verifies the disabled path creates no pending row.
- The fixture deletes the isolated fake IndexedDB database after each test path.
- The fixture does not change the production runtime flag and is not wired into any UI route.
- The fixture must not call Supabase, R2, signed URL, upload, drain, or queue cleanup paths.
- Guarded by `tests/sales-photo-evidence-runtime-local-fixture.test.ts`.

Slice 5C-3G Status:

- Pending evidence recovery/cleanup semantics are implemented as a pure classifier in `lib/sales/photo-evidence-pending-creation-recovery.ts`.
- Stale `creating` rows are classified as recoverable retryable work after an explicit grace window.
- Fresh `creating` rows are retained because another drain attempt may still be active.
- Old `created` rows are eligible only for local queue-row retirement; sale records and `sale_photo_evidence` metadata must not be deleted by this cleanup.
- Fresh `created` rows are retained for diagnostics until the cleanup grace window passes.
- `waiting_for_event_sync` and `failed_retryable` rows are not cleanup candidates because normal drain/retry may still resolve them.
- `failed_permanent` and `blocked_invalid_source` rows require manual review before any removal.
- The model is not wired to Dexie mutation, Supabase, R2, upload, signed URL, drain, UI, timer, or browser storage execution paths.
- Guarded by `tests/sales-photo-evidence-pending-creation-recovery.test.ts`.

Next Slice 5C-3H Boundary:

- This is the boundary before any production runtime enqueue enablement, browser-profile verification, queue recovery/cleanup executor, photo capture implementation, or Supabase evidence-row writer.
- Recommended next step if continuing runtime safety: design an owner-visible local diagnostics/action surface for pending evidence rows, still without automatic cleanup.
- Recommended next step if shifting toward product flow: begin Slice 6 photo capture/compression design only, without connecting capture to sales runtime.
- Any actual recovery/cleanup execution must be separately approved and must preview target rows before mutation.

### Slice 6: Client Capture and Compression

- Implement camera capture.
- Compress to under 1MB using adaptive quality/size.
- Generate thumbnail.
- Store local pending payload if offline.

Acceptance:

- compressed image stays under target size in normal cases;
- thumbnail is generated;
- capture failure leaves sale pending;
- EXIF metadata is stripped.

### Slice 7: R2 Upload and Signed Access

- Add trusted upload/signing route.
- Upload image and thumbnail to R2.
- Persist object keys and metadata.
- Use signed read URLs for owner/staff access.

Acceptance:

- image object is not public;
- DB stores only object keys and metadata;
- owner can view uploaded image;
- unauthorized users cannot request signed URLs.

### Slice 8: Pending Evidence List

- Add pending list for staff and owner.
- Support capture, retry upload, and basic failure display.

Acceptance:

- staff can resolve their pending rows;
- owner can see all pending rows for the market;
- upload failures are visible and actionable.

### Slice 9: Market Evidence Album

- Add `View Evidence Photos` entry in market detail.
- Build thumbnail grid with filters.
- Add detail viewer for original image via signed URL.
- Show sale metadata and capture timing.

Acceptance:

- owner can browse uploaded evidence photos as an album;
- pending/skipped/failed/expired records are visible;
- clicking a thumbnail opens a larger image;
- expired evidence does not attempt to fetch a deleted object.

### Slice 10: Expiration and Cleanup Alignment

- Add metadata cleanup/expiration job or app-side reconciliation.
- Mark expired rows after R2 lifecycle deletion window.
- Keep sales records intact.

Acceptance:

- expired photos disappear from image viewer but metadata remains;
- album shows expired state;
- no sale record is deleted by photo cleanup.

## Testing Plan

### Unit Tests

- status transition validity;
- compression target logic;
- object key builder;
- permission helpers;
- expiration calculation.

### Integration Tests

- sale creates pending evidence when requirement is on;
- sale creates no evidence when requirement is off;
- owner toggle changes only future sale behavior;
- staff cannot toggle or waive;
- skipped capture appears in pending list;
- upload failure can be retried.

### UI Tests

- owner settings default applies to new market;
- market detail toggle is owner-only;
- operating toggle is owner-only;
- staff post-sale prompt supports capture and skip;
- market album thumbnail grid renders uploaded and non-uploaded states;
- detail viewer loads a signed image URL only for authorized users.

### Manual Smoke Tests

- online capture and upload;
- offline capture and later upload;
- camera permission denied;
- skip and later capture;
- upload failure retry;
- owner disables evidence mid-market;
- owner album review;
- expired evidence display.

## Open Decisions Before Implementation

1. Should staff see all pending evidence for a market or only their own?
   - Recommended first version: staff sees their own; owner sees all.
2. Should skip reason be required?
   - Recommended first version: optional quick reason.
3. Should retention start at `captured_at` or `uploaded_at`?
   - Recommended first version: `uploaded_at + 7 days` for R2 lifecycle alignment.
4. Should owner waiver require a reason?
   - Recommended first version: required short reason.
5. Should evidence be required for every sale or only sales above a threshold?
   - Recommended first version: every sale when market setting is on; threshold can be added later.

## First Implementation Boundary

The first implementation should stop after:

- owner default setting;
- market-level setting;
- owner-only active toggle;
- post-sale prompt;
- skip and pending list;
- one photo per sale;
- R2 upload;
- market detail album;
- 7-day expiration metadata alignment.

Do not implement:

- paid retention;
- multiple photos per sale;
- AI photo validation;
- batch export/download;
- product catalog photo reuse;
- staff-controlled requirement toggles.
