# Sales Photo Evidence Revised Execution Plan

Date: 2026-07-14
Status: Execution-hardened plan. Product decisions, phase gates, verification commands, rollback, privacy, and retention rules are defined for implementation.

## Executive Summary

The sales photo evidence feature is directionally sound and already has many important safety boundaries implemented: metadata-only database design, R2 object storage, owner-controlled requirement settings, local pending payload storage, gated upload/read routes, staff-side local capture, manual upload, and owner read-only album mounting.

The current plan is strong in engineering caution, but weak in operational clarity. It has grown into a long historical ledger where completed, partially completed, blocked, and future work are difficult to distinguish. The next plan should stop expanding horizontally and instead finish a narrow V1 workflow:

1. A sale is recorded first.
2. If the market requires evidence, a pending evidence task is created.
3. Staff can capture or choose an image without blocking sales.
4. The compressed local payload is stored safely.
5. Staff can manually upload in local/staging first.
6. Owner can review uploaded thumbnails and status from market detail.
7. Production enablement happens only after staging smoke tests and explicit environment gates.

## Current State

Implemented or substantially implemented:

- Owner default setting for whether new markets require sales photo evidence.
- Market-level sales photo evidence requirement.
- Operating-screen owner/staff evidence card.
- Post-sale decision model and runtime wrapper boundary.
- Local pending evidence creation queue.
- Dexie tables for pending creation and pending binary payloads.
- Auth/cache pending-write guards that account for local photo evidence work.
- Browser file-input capture adapter with compression and thumbnail payload storage.
- Staff pending evidence dialog with local capture and manual upload actions.
- Gated upload route with metadata claim, FormData parsing, R2 adapter wiring, and finalization path.
- Server-only Cloudflare R2 upload adapter.
- Owner-only image read route that proxies private image bytes.
- Owner album metadata reader and market-detail read-only album section.
- Extensive static and unit guardrail tests around disabled production behavior.
- Phase 0 copy normalization, smoke-plan text repair, and portable test-file path cleanup completed on 2026-07-14.

Not yet complete for a production V1:

- Production runtime enqueue is still intentionally off.
- Real production R2 upload/read enablement is not approved.
- Local/staging smoke execution is not completed as a documented pass/fail artifact.
- Staff post-sale capture prompt is not yet a polished end-to-end UX.
- Background upload and automatic retry are not implemented.
- Queue recovery/cleanup executor is not implemented.
- Expiration reconciliation is not implemented.
- Owner waiver and replacement request flows are not complete V1 user workflows.

## Content Completeness Review

### Strengths

- The existing plan correctly protects the core sales transaction. Photo capture and upload are follow-up work, not part of the sale transaction.
- Role boundaries are clear: owner controls settings and waiver; staff captures, skips, and retries.
- Storage boundaries are correct: image binaries are not stored in Postgres.
- R2 object access is appropriately private and routed through trusted server code.
- Local pending work is treated as valuable data and included in destructive-cache guards.
- The plan already anticipates offline, upload failure, permission denial, wrong photo, and retention drift.
- Test coverage is unusually strong for guardrails and model-level behavior.

### Gaps

- The previous plan did not provide a concise "definition of done" for V1 production readiness; this revised plan now defines one below.
- The implementation status is too verbose to be useful during daily development.
- Manual QA scripts are present but not tied to an explicit pass/fail release checklist.
- UX copy, button labels, and failure messages are not specified with final Traditional Chinese text.
- There is no clear rollout matrix for disabled, local, staging, limited production, and full production states.
- Recovery and cleanup are repeatedly deferred but not converted into a bounded later milestone.
- Owner review is read-only, but V1 still needs a clear decision on whether waiver is required before production.
- Staff experience after recording a sale is under-specified: when the prompt appears, what the default action is, and how quickly staff can return to selling.

## Execution Decisions Locked For V1

These decisions are the implementation baseline. Changing one requires updating this document and the affected tests before code changes continue.

| Decision | V1 rule | Reason |
| --- | --- | --- |
| Feature name | Use `成交照片紀錄` for owner-facing settings and `成交照片` in compact staff UI. | Clear operational language without legal-sounding terminology. |
| Sale boundary | Persist the sale first. Create the local pending evidence task only after a stable `saleEventId` exists. | Prevents photo work from blocking or invalidating a sale. |
| Cloud sync dependency | Local pending creation does not wait for photo capture, upload, R2, or evidence metadata creation. Cloud work may follow later. | Preserves offline and failure tolerance. |
| Required-sale behavior | Every newly recorded sale in a market that requires evidence creates exactly one pending task. | Gives predictable coverage and idempotency. |
| Staff visibility | Staff can view and act on only their own pending evidence tasks. | Reduces accidental cross-staff edits and privacy exposure. |
| Owner visibility | Owner can view all evidence statuses and uploaded images for the market. | Supports operational review. |
| Owner waiver | Waiver is not a Production V1 blocker. Missing evidence remains visible until uploaded, expired, or handled by a later waiver milestone. | Keeps V1 focused on capture, upload, and review. |
| Upload mode | Manual upload only in V1; no background upload or silent retry. | Makes failure and data usage visible and recoverable. |
| Retention clock | Seven-day object retention starts from successful upload time (`uploadedAt`), not sale or capture time. | Avoids shortening retention because of offline delay. |
| Local deletion | Delete local binary payload only when the server returns an explicit successful finalization result and deletion permission. | Prevents data loss after partial upload failure. |
| Existing work when disabled | Turning off the market requirement affects only future sales. Existing pending tasks remain. | Avoids silently discarding expected records. |

### Change-Control Rule

The following changes require a new reviewed decision record before implementation: blocking checkout on photo completion, multiple photos per sale, public object URLs, background upload, automatic destructive cleanup, broader staff visibility, or a retention period other than seven days.

## Stability Review

### Good Stability Choices

- Runtime enqueue defaults off.
- Production route enablement requires separate explicit environment gates.
- Upload route keeps local payloads unless the server explicitly confirms safe deletion.
- R2 adapter is server-only and lazy-loaded.
- Metadata claim and upload finalization are separated by clear route ordering.
- Signed/private image read does not expose public bucket URLs.
- Tests enforce that production callers do not silently force the runtime on.

### Main Stability Risks

1. **State mismatch between local queue and cloud metadata**

   Local pending rows, local binary payloads, Supabase metadata, and R2 objects can diverge. This is expected in an offline-capable flow, but the UI must classify each state clearly.

2. **Corrupted UI text**

   Some current components show garbled strings in source. This is a release blocker because staff-facing error messages and action labels must be trustworthy during a busy market.

3. **Partial upload/finalization failure**

   R2 upload can succeed while metadata finalization fails, creating orphaned objects. The current plan acknowledges cleanup later, but staging smoke tests must include this failure class with fake or controlled adapters before production.

4. **Local payload retention**

   Local photo payloads can remain on shared devices. The app needs clear owner/staff expectations and a safe cleanup policy after successful upload or after stale failure.

5. **Feature flag confusion**

   There are several gates: runtime enqueue, metadata claim route, R2 upload route, image read route, and production allow flags. This is safe but easy to misconfigure. A single rollout matrix is required.

6. **No automated browser smoke yet**

   The local capture path depends on browser file input, image decode, canvas/compression, Blob storage, and IndexedDB. Unit tests help, but they do not replace one real browser smoke pass.

## UX/UI Reasonableness Review

### What Is Reasonable

- Putting the evidence card in the operating screen is correct. It is contextual and visible during active selling.
- Showing pending count is useful for both staff and owner.
- Staff capture should use the browser file input first. This is simpler and more reliable than custom live camera streaming.
- Manual upload is a reasonable V1 action. It is explicit, recoverable, and easier to debug than automatic background upload.
- Owner album belongs in market detail, not staff detail.

### UX/UI Issues To Fix Before Production

1. **Do not interrupt the sale flow**

   After a sale, the app should show a lightweight bottom sheet or modal:

   - Primary action: `拍攝紀錄`
   - Secondary action: `稍後補拍`
   - Small status copy: `成交已儲存，照片可稍後補上`

   The prompt must never make staff feel the sale is unfinished.

2. **Use plain operational language**

   Avoid terms like "evidence" in staff-facing Traditional Chinese unless needed. Suggested user-facing terms:

   - Feature name: `成交照片紀錄`
   - Required state: `此市集需要成交照片`
   - Pending list: `待補照片`
   - Capture action: `拍攝/選擇照片`
   - Upload action: `上傳照片`
   - Owner album: `成交照片`

3. **Make status labels task-oriented**

   Suggested labels:

   - `pending_capture`: `待補照片`
   - `capture_skipped`: `稍後補拍`
   - `captured_local`: `已拍攝，待上傳`
   - `uploading`: `上傳中`
   - `uploaded`: `已上傳`
   - `upload_failed`: `上傳失敗`
   - `expired`: `已過期`
   - `waived_by_owner`: `老闆已免除`

4. **Pending list rows need better sale context**

   A row should show:

   - Sale time.
   - Amount.
   - Product summary or manual-entry label.
   - Status badge.
   - Staff ownership if owner is viewing.
   - One obvious next action.

5. **Avoid two equal primary actions**

   In staff pending rows:

   - If no local payload exists, primary action is `拍攝/選擇照片`.
   - If local payload exists, primary action is `上傳照片`.
   - Retake is secondary.

6. **Owner should see attention buckets**

   The owner album should start with filter tabs:

   - `全部`
   - `待處理`
   - `已上傳`
   - `失敗`
   - `已免除`
   - `已過期`

7. **Mobile layout must be field-friendly**

   Staff will use this while standing at a booth. Buttons need generous tap targets, no dense technical diagnostics by default, and short recovery text.

## Revised V1 Product Boundary

V1 must include:

- Owner setting for default requirement.
- Owner market-level requirement toggle.
- Read-only staff indicator.
- Sale-first persistence.
- Pending evidence task creation after sale sync readiness.
- Staff local capture/selection.
- Staff local compressed payload storage.
- Staff manual upload.
- Owner market-detail album with uploaded thumbnails and non-uploaded status rows.
- Private image read through server route.
- Local/staging smoke test evidence.
- Production rollout gates documented and tested.

V1 may include if low-risk:

- Owner refresh action for album.
- Staff retake before upload.

V1 must not include:

- Live camera stream.
- Automatic background upload.
- AI photo validation.
- Multiple photos per sale.
- Public R2 URLs.
- Batch export/download.
- Broad cleanup executor.
- Owner waiver or replacement-request workflow.
- Production enablement without staging smoke approval.

## Revised Execution Plan

### Phase 0: Documentation And Text Repair

Goal: Make the feature understandable before further runtime changes.

Execution status: **Complete (2026-07-14).**

Tasks:

- Replace corrupted UI strings in sales photo evidence components with final Traditional Chinese copy.
- Fix corrupted text in smoke-plan documentation.
- Create a single status vocabulary table shared by product, UI, tests, and QA.
- Add a short rollout matrix for environment flags.
- Confirm whether the feature name is `成交照片紀錄`.

Acceptance:

- No visible garbled text remains in sales photo evidence UI files.
- Smoke-plan steps can be followed by a human without guessing button labels.
- Existing tests still pass.

Exit gate:

- Product vocabulary and the V1 decisions in this document have no unresolved placeholders.
- `npm run lint` and the targeted UI/model tests pass.
- Phase 1 smoke data and operator are identified.

Execution evidence:

- `npm test`: passed.
- `npm run lint`: passed with 0 errors and 4 non-blocking warnings outside the Phase 0 copy changes.
- `npm run test:staff-types`: passed.
- Targeted sales photo evidence UI, capture, upload, route-gate, owner-read, and readiness tests: passed.
- Visible feature vocabulary is normalized to `成交照片紀錄`, `成交照片`, and `待補照片`.
- Static tests no longer depend on a previous developer's absolute Windows workspace path.
- Phase 1 operator: Codex in the in-app browser; data scope: disposable local fixture and temporary browser storage only.

Primary files:

- `components/markets/SalesPhotoEvidenceOperatingCard.tsx`
- `components/markets/SalesPhotoEvidencePendingListDialog.tsx`
- `components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx`
- `components/markets/SalesPhotoEvidenceManualUploadAction.tsx`
- `components/markets/StaffMarketDetailView.tsx`
- `docs/SALES_PHOTO_EVIDENCE_LOCAL_CAPTURE_BROWSER_SMOKE_PLAN.md`

### Phase 1: Local Browser Smoke

Goal: Prove staff local capture works in a real browser without cloud writes.

Execution status: **Complete by user-reported manual pass (2026-07-14).** See `docs/SALES_PHOTO_EVIDENCE_SMOKE_RESULT_LOCAL_2026_07_14.md`. Detailed browser/network evidence was not supplied and remains a documented residual verification gap.

Tasks:

- Start local dev server with disposable data.
- Use a temporary browser profile.
- Create or seed one eligible staff pending evidence row.
- Open staff market detail.
- Open `待補照片`.
- Capture/select a small test image.
- Verify one matching row appears in IndexedDB `salesPhotoEvidencePendingPayloads`.
- Verify no Supabase evidence write, R2 upload, signed read, queue drain, or cleanup call occurs.
- Record pass/fail notes in a smoke result document.

Acceptance:

- Eligible staff-owned row enables capture.
- Non-owned row disables capture.
- Cancel leaves the row pending.
- Successful capture creates or replaces exactly one local payload by queue id.
- The UI remains usable on a mobile viewport.

Exit gate:

- The local smoke result records device/browser, commit SHA, steps, network observations, IndexedDB observations, and pass/fail.
- All failures are either fixed and rerun or recorded as explicit blockers.
- No cloud route or production flag was enabled during the test.

Deliverable:

- `docs/SALES_PHOTO_EVIDENCE_SMOKE_RESULT_LOCAL_YYYY_MM_DD.md`

### Phase 2: Staging Manual Upload

Goal: Prove the manual upload path with real staging R2 and staging Supabase.

Tasks:

- Configure staging-only route gates.
- Use disposable owner/staff accounts.
- Upload one local pending payload through the staff manual upload action.
- Confirm upload route ordering:
  1. Authenticate.
  2. Claim or reuse metadata.
  3. Upload image object.
  4. Upload thumbnail object.
  5. Finalize metadata.
  6. Return local-payload deletion permission.
- Confirm local payload deletion only after success.
- Confirm retry keeps local payload after route failure.
- Confirm no production allow flag is set.

Acceptance:

- Staging upload creates private R2 image and thumbnail objects.
- Supabase metadata row reaches `uploaded`.
- Owner album shows the uploaded row.
- Owner image route returns private thumbnail/image bytes only for authorized owner.
- Unauthorized user cannot read the image.
- Failed upload path leaves retryable local work.

Exit gate:

- The staging result records object keys, metadata status, authorization checks, local deletion behavior, and pass/fail without recording credentials.
- One success case and one controlled failure/retry case pass.
- Production environment values remain unchanged.

Deliverable:

- `docs/SALES_PHOTO_EVIDENCE_SMOKE_RESULT_STAGING_YYYY_MM_DD.md`

### Phase 3: Staff Post-Sale UX Completion

Goal: Complete the actual staff workflow after a sale.

Tasks:

- Create exactly one local pending task after each required sale has a stable `saleEventId`; do not wait for photo or evidence cloud sync.
- Ensure the post-sale UI clearly says the sale is saved.
- Add a capture-later path that creates or preserves a pending row.
- Make the pending count update after a sale and after capture/upload.
- Ensure simple manual revenue and product-cart sale modes behave consistently.
- Do mobile visual checks for 375px and desktop checks for owner market detail.

Acceptance:

- Recording a sale never waits for camera, compression, upload, or R2.
- Staff can close the post-sale prompt and continue selling.
- The pending evidence list reflects the new sale.
- Capture and upload actions are available only in the correct state.
- Toasts and error messages are short and readable.

Exit gate:

- Product-cart and manual-revenue sale modes both pass the post-sale state matrix.
- Duplicate submission or rerender does not create duplicate pending tasks.
- Mobile and desktop screenshots show no overflow, overlapping controls, or blocked continuation path.

### Phase 4: Owner Review V1

Goal: Make owner review useful without adding broad mutation workflows.

Tasks:

- Polish owner album filters and empty states.
- Show sale time, amount, status, staff, and delayed capture indicator.
- Load thumbnails only for uploaded rows with object keys.
- Show expired and failed rows as status cards instead of broken images.
- Add refresh and error retry for metadata read failure.
- Keep waiver out of the Production V1 critical path; show unresolved rows without hiding them.

Acceptance:

- Owner can understand what still needs attention.
- Owner can inspect uploaded photo thumbnails.
- Album never exposes raw R2 URLs.
- Staff cannot see owner album section.
- Non-owner access fails closed.

Exit gate:

- Owner, staff, and unauthorized access checks pass against the same staging fixture.
- Uploaded, pending, failed, expired, empty, and read-error states are visually verified.

### Phase 5: Production Gated Rollout

Goal: Enable production in a narrow, reversible way.

Tasks:

- Create production rollout checklist.
- Confirm migrations are applied and RLS verified.
- Confirm R2 lifecycle rules for 7-day prefixes.
- Confirm all route gates and production allow flags are documented.
- Enable for one owner or one internal test market first if supported by configuration.
- Monitor upload failures, pending local payload counts, and image read errors.
- Keep background upload and cleanup executor disabled.

Acceptance:

- Production can be turned off without deleting sales or local evidence tasks.
- Existing sales continue working if photo evidence routes fail.
- Staff can continue selling even if camera/upload fails.
- Owner can review uploaded evidence for the pilot market.

Exit gate:

- Release owner signs the production checklist and records the exact enabled flags and pilot scope.
- Rollback has been rehearsed in staging.
- Pilot monitoring has an owner, review time, and stop threshold.

### Phase 6: Recovery, Cleanup, And Automation

Goal: Add operational maintenance after V1 proves stable.

Tasks:

- Add stale local payload diagnostics.
- Add preview-first cleanup for stale `created` or failed queue rows.
- Add R2 orphan cleanup plan for upload-finalization failure.
- Add expiration reconciliation that marks metadata `expired`.
- Consider automated browser smoke with temporary profile only.
- Consider background upload only after manual upload metrics are stable.

Acceptance:

- Cleanup tools preview target rows before mutation.
- Expiration never deletes sale records.
- Automation cannot touch daily-use browser profiles.
- Background workers are separately gated.

Exit gate:

- Every destructive operation supports preview/dry-run output and an audit record.
- Recovery tests cover partial upload, stale local payload, orphaned R2 object, and expiration drift.

## Phase Entry And Exit Gates

Work may proceed within a phase, but the next phase must not start until the current exit gate is satisfied.

| Phase | Required before starting | Required evidence to proceed |
| --- | --- | --- |
| 0. Text repair | Clean understanding of current changed files; final copy baseline available. | Lint and targeted tests pass; no garbled feature text remains. |
| 1. Local browser smoke | Phase 0 complete; disposable local sale fixture; temporary browser profile. | Signed local smoke result with zero cloud calls. |
| 2. Staging upload | Phase 1 complete; isolated staging Supabase/R2; disposable owner/staff accounts. | Signed staging result covering success, failure/retry, deletion permission, and authorization. |
| 3. Post-sale UX | Stable sale ID and idempotent local queue contract confirmed. | Both sale modes pass behavior and responsive visual checks. |
| 4. Owner review | Staging metadata and private-read path are working. | Role matrix and all owner album states pass. |
| 5. Production pilot | Phases 0-4 complete; migrations/RLS/lifecycle checked; rollback rehearsed. | Pilot remains below stop thresholds for the agreed observation window. |
| 6. Recovery/automation | Production V1 has stable manual-path metrics. | Preview-first cleanup and recovery tests pass before any automation is enabled. |

Blocking rule: any data loss, duplicate pending task, unauthorized image read, checkout regression, or unexplained local/cloud state mismatch stops progression to the next phase.

## Rollout Matrix

| Environment | Runtime Enqueue | Metadata Claim Route | R2 Upload Route | Image Read Route | Production Allow Flags | Expected Behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Default local | Off | Off | Off | Off | Off | No cloud mutation; guardrail tests pass |
| Local capture smoke | Off | Off | Off | Off | Off | Staff can create local pending payload only |
| Staging upload smoke | Off or scoped | On | On | On | Off | Disposable staging upload/read works |
| Production pilot | Scoped/on by decision | On | On | On | Explicitly on | One controlled production cohort |
| Production full V1 | On | On | On | On | Explicitly on | Manual upload and owner review available |

### Exact Server Route Flags

- Metadata claim local/staging gate: `SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED=1`
- Metadata claim production gate: `SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ALLOW_PRODUCTION=1`
- R2 upload local/staging gate: `SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ENABLED=1`
- R2 upload production gate: `SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ALLOW_PRODUCTION=1`
- Private image read local/staging gate: `SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ENABLED=1`
- Private image read production gate: `SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ALLOW_PRODUCTION=1`
- Runtime enqueue is currently a code-only flag: `salesPhotoEvidenceRuntimeEnqueue`; it remains off until the relevant phase explicitly changes and tests it.

R2 credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and optional `R2_ENDPOINT`) are server-only and must never be placed in client-exposed environment variables, screenshots, or smoke result documents.

## Rollback Plan

Rollback must preserve sales records and recoverable local evidence work.

1. Stop expanding the pilot scope.
2. Turn off runtime enqueue so new sales no longer create evidence work through the production path.
3. Turn off metadata claim, R2 upload, and image-read production allow flags as required by the incident.
4. Keep existing local pending rows and binary payloads intact; do not clear IndexedDB as part of rollback.
5. Confirm checkout and ordinary sale sync still work with all photo evidence routes unavailable.
6. Record affected queue ids, metadata ids, and R2 object keys without copying image content or credentials into logs.
7. Re-enable one gate at a time only after the failure is reproduced and verified in staging.

Rollback stop conditions requiring immediate disablement:

- Any photo-related failure prevents or reverses a sale.
- An unauthorized user can read image bytes or metadata outside their role.
- A failed/partial upload causes local payload deletion.
- Duplicate evidence rows or objects are created by ordinary retry.
- Upload or read errors exceed the pilot threshold defined in the release checklist.

## Local Photo Privacy And Retention

- Treat local binary payloads as private transaction records, not browser cache that may be cleared casually.
- Keep image and thumbnail blobs in the existing IndexedDB pending-payload store; do not duplicate them in localStorage, logs, analytics, or error messages.
- Show pending items only after current-session authorization resolves. Staff sees only their own tasks; owner sees market-level status through owner routes.
- Successful finalization may remove the matching local payload only when the response explicitly permits deletion.
- Cancel, offline, timeout, route failure, R2 failure, or metadata-finalization failure must retain the local payload for retry.
- Sign-out, account switching, cache clearing, and destructive recovery actions remain blocked or explicitly warned while unfinished local evidence work exists.
- V1 performs no age-based automatic deletion of unresolved local payloads. Phase 6 may add preview-first cleanup after product and privacy approval.
- Uploaded R2 objects use the seven-day retention prefix/lifecycle. Metadata and sale records may remain after object expiration so the owner sees `已過期` instead of a broken image.
- Smoke tests use non-sensitive test images and disposable accounts. Production photos must not appear in test fixtures, screenshots, issue attachments, or logs.

## Test And Verification Commands

Run from the repository root. Targeted tests provide quick feedback; the full suite remains the release gate.

```powershell
npm run lint
npm run test:staff-types
npx.cmd tsx tests/sales-photo-evidence-runtime-readiness-checklist.test.ts
npx.cmd tsx tests/sales-photo-evidence-local-capture-action-ui.test.ts
npx.cmd tsx tests/sales-photo-evidence-pending-list-ui.test.ts
npx.cmd tsx tests/sales-photo-evidence-manual-upload-client.test.ts
npx.cmd tsx tests/sales-photo-evidence-upload-route-disabled.test.ts
npx.cmd tsx tests/sales-photo-evidence-owner-image-read.test.ts
npx.cmd tsx tests/supabase-sales-photo-evidence-owner-album-reader.test.ts
npm test
npm run build
```

Manual verification artifacts must include the tested commit SHA, environment class (local/staging/pilot), browser and viewport, fixture ids, observed result, pass/fail, and tester/date. They must exclude tokens, credentials, private image content, and production customer data.

## UX Copy Baseline

Feature names:

- Owner-facing: `成交照片紀錄`
- Staff-facing: `成交照片`
- Pending list: `待補照片`
- Owner album: `成交照片`

Core messages:

- Sale saved: `成交已儲存，照片可現在拍攝或稍後補上。`
- Capture primary action: `拍攝/選擇照片`
- Capture later action: `稍後補拍`
- Upload action: `上傳照片`
- Retake action: `重新拍攝`
- No pending items: `目前沒有待補照片。`
- Upload failed: `照片尚未上傳成功，請稍後重試。`
- Permission/capture failed: `無法取得照片，成交紀錄已保留。`

Owner messages:

- Requirement on: `此市集成交後需要照片紀錄。`
- Requirement off: `此市集成交後不要求照片紀錄。`
- Disable warning: `關閉後只影響之後的成交，既有待補照片不會自動取消。`
- Album empty: `目前沒有成交照片紀錄。`

### Component-Level Copy Map

| Component/file | Required visible copy and behavior |
| --- | --- |
| `components/markets/StaffMarketDetailView.tsx` | After a required sale: `成交已儲存，照片可現在拍攝或稍後補上。`; close/later always returns staff to selling. |
| `components/markets/SalesPhotoEvidenceOperatingCard.tsx` | Title `成交照片`; show actionable pending count without technical queue wording. |
| `components/markets/SalesPhotoEvidencePendingListDialog.tsx` | Title `待補照片`; each row shows sale time, amount, summary, status, and exactly one primary action. |
| `components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx` | Primary `拍攝/選擇照片`; failure `無法取得照片，成交紀錄已保留。` |
| `components/markets/SalesPhotoEvidenceManualUploadAction.tsx` | Primary `上傳照片`; retry copy `照片尚未上傳成功，請稍後重試。` |
| `app/markets/[id]/page.tsx` | Owner setting uses `成交照片紀錄`; owner album uses `成交照片`; disabling warns that existing pending work remains. |

UI checks must verify loading, disabled, offline, retry, empty, success, and unauthorized states. Technical ids and raw backend error text must not be the default user-facing message.

## Definition Of Done For Production V1

Production V1 is done only when all items are true:

- Sales persistence remains independent from photo capture and upload.
- Staff can capture/select a photo and store it locally.
- Staff can manually upload a local pending payload.
- Owner can view uploaded evidence thumbnails from market detail.
- Unauthorized image reads fail.
- Pending local payloads block unsafe cache clearing/sign-out flows.
- All visible feature text is readable Traditional Chinese.
- Local smoke result is documented.
- Staging upload/read smoke result is documented.
- Production gates are explicitly configured and reviewed.
- The release can be disabled without corrupting sales data.
- Every required sale creates at most one pending evidence task after a stable sale id exists.
- Failed or partial upload never deletes the only local payload.
- Seven-day retention starts from successful upload time and expired objects render as status, not broken media.
- Rollback has been rehearsed in staging and its result is recorded.
- Role checks confirm staff-own-only access, owner market-wide review, and unauthorized denial.

## Recommended Immediate Next Step

Start with Phase 0, not production enablement. The corrupted UI text and human smoke-plan ambiguity are practical blockers. After text repair, run Phase 1 local browser smoke, then Phase 2 staging manual upload.

The feature should not move to production until Phase 1 and Phase 2 both have written pass/fail results.

The first implementation batch is limited to Phase 0: repair visible copy, align tests and smoke documentation to the locked vocabulary, run the targeted tests, and record any remaining blocker before starting browser smoke.
