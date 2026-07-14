# Sales Photo Evidence Local Smoke Result

Date: 2026-07-14
Status: **Blocked - manual browser execution required**
Plan phase: Phase 1, Local Browser Smoke
Application commit under test: `37e50d4`
Environment class: Local development server; Supabase target not yet classified as disposable
URL: `http://127.0.0.1:3000`

## Safety Check

- Local dev server starts successfully with Next.js 16.2.6.
- `.env.local` defines public Supabase connection variables.
- No sales photo evidence metadata-claim, R2-upload, image-read, or production allow flag is defined in `.env.local`.
- Production runtime enqueue remains code-only and off.
- No R2 credentials were printed or recorded.
- No account login, Supabase mutation, evidence metadata write, R2 upload, image read, queue drain, or cleanup action was performed during this attempt.

## Automated Preflight Result

- `npm test`: pass.
- `npm run lint`: pass with 0 errors and 4 non-blocking warnings.
- `npm run test:staff-types`: pass.
- Targeted local capture, pending list, manual upload, route-gate, private-read, and readiness tests: pass.
- Feature copy uses `成交照片紀錄`, `成交照片`, `待補照片`, and `拍攝/選擇照片`.

## Blocking Condition

Codex could not initialize the in-app browser control runtime in this session. The failure repeated after a clean reconnect attempt. Because the configured Supabase target has not been confirmed as a disposable local/staging project, falling back to an existing signed-in browser profile would violate the smoke test safety boundary.

Phase 1 remains incomplete. This document is not a pass result.

## Manual Inputs Required

Before continuing, confirm both items:

1. The Supabase project configured by `.env.local` is disposable local/staging data, not production.
2. A disposable staff account and test market are available, or an approved local-only fixture will be added in a separate implementation step.

## Manual Browser Checklist

Use a temporary/guest browser profile and a non-sensitive test image.

- [ ] Record browser name/version and viewport.
- [ ] Sign in with the disposable staff account.
- [ ] Open the disposable staff market detail.
- [ ] Confirm one staff-owned pending row with status `waiting_for_event_sync` or `failed_retryable`.
- [ ] Open `待補照片`.
- [ ] Confirm an eligible owned row enables `拍攝/選擇照片`.
- [ ] Confirm a non-owned row, if present, does not allow capture.
- [ ] Cancel once and confirm no local payload is created.
- [ ] Select a small test image and confirm the UI remains usable.
- [ ] Inspect IndexedDB database `MarketPulseDB`, table `salesPhotoEvidencePendingPayloads`.
- [ ] Confirm exactly one row matches the pending `queueId`.
- [ ] Repeat capture and confirm the same `queueId` payload is replaced, not duplicated.
- [ ] Confirm no request writes sales photo evidence metadata to Supabase.
- [ ] Confirm no R2 upload, private image read, queue drain, cleanup, or recovery call occurs.
- [ ] Capture a mobile viewport screenshot without private image content.
- [ ] Record final pass/fail and any blocker below.

## Result To Complete Manually

- Tester:
- Browser/version:
- Viewport:
- Disposable market id:
- Owned queue id:
- Cancel behavior:
- IndexedDB row count before/after:
- Duplicate/replace behavior:
- Unexpected network requests:
- Mobile UX result:
- Final result: `PASS` / `FAIL`
- Notes:

## Exit Decision

Do not start Phase 2 until this document records a final `PASS`, or every `FAIL` has an owner and is explicitly accepted as a blocker to fix before rerun.
