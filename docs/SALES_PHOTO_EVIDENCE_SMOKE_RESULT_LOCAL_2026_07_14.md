# Sales Photo Evidence Local Smoke Result

Date: 2026-07-14
Status: **INVALIDATED - rerun required after runtime wiring fix**
Plan phase: Phase 1, Local Browser Smoke
Application commit under test: `37e50d4`
Environment class: Local development server; environment classification not independently verified by Codex
URL: `http://127.0.0.1:3000`

## Safety Check

- Local dev server starts successfully with Next.js 16.2.6.
- `.env.local` defines public Supabase connection variables.
- No sales photo evidence metadata-claim, R2-upload, image-read, or production allow flag is defined in `.env.local`.
- Production runtime enqueue was temporarily enabled in source for the manual local test and restored to the code-only default `false` before commit.
- No R2 credentials were printed or recorded.
- No account login, Supabase mutation, evidence metadata write, R2 upload, image read, queue drain, or cleanup action was performed during this attempt.

## Automated Preflight Result

- `npm test`: pass.
- `npm run lint`: pass with 0 errors and 4 non-blocking warnings.
- `npm run test:staff-types`: pass.
- Targeted local capture, pending list, manual upload, route-gate, private-read, and readiness tests: pass.
- Feature copy uses `成交照片紀錄`, `成交照片`, `待補照片`, and `拍攝/選擇照片`.

## Manual Execution Result

The repository user initially reported that the manual test was complete. A later direct observation showed that ordinary staff sales did not create pending photo rows and no upload action was available. The earlier pass is therefore invalid and must not be used as release evidence.

The missing runtime path has since been implemented for quick revenue, product sale, cart checkout, and backfill revenue. A production-locked test page is available at `/debug/sales-photo-evidence` for the rerun.

Codex could not independently observe the browser session because the in-app browser control runtime failed to initialize. Browser version, viewport, queue id, IndexedDB counts, replacement behavior, and network observations were not supplied. These remain residual verification gaps and must not be represented as independently verified evidence.

## Safety Follow-Up

- Runtime enqueue now follows the reviewed Local/Staging/Production environment gate instead of a temporary source edit.
- Phase 2 still requires explicit staging classification and disposable owner/staff accounts.
- No production allow flag may be enabled based only on this user-reported result.

## Manual Browser Checklist Record

Use a temporary/guest browser profile and a non-sensitive test image.

- [ ] Create an NT$1 `[TEST]` sale from `/debug/sales-photo-evidence`.
- [ ] Confirm exactly one matching pending row appears.
- [ ] Capture/select a photo and confirm the local payload exists.
- [ ] Browser name/version and viewport supplied.
- [ ] Disposable environment classification independently recorded.
- [ ] Owned/non-owned row observations supplied.
- [ ] Cancel behavior and IndexedDB before/after counts supplied.
- [ ] Same-queue replacement behavior supplied.
- [ ] Network observation supplied.
- [ ] Mobile screenshot supplied.

## Result To Complete Manually

- Tester: repository user (manual confirmation in the Codex task)
- Browser/version:
- Viewport:
- Disposable market id:
- Owned queue id:
- Cancel behavior:
- IndexedDB row count before/after:
- Duplicate/replace behavior:
- Unexpected network requests:
- Mobile UX result:
- Final result: `PENDING RERUN`
- Notes: The original pass was invalidated by the missing runtime integration.

## Exit Decision

Production rollout remains blocked. Phase 1 must be rerun through the new test page and Phase 2 must record a real Staging upload/read pass.
