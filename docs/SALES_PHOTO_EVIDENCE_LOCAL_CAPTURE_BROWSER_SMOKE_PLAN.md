# Sales Photo Evidence Local Capture Browser Smoke Plan

Date: 2026-07-07
Status: plan-only guardrail for the staff local capture browser smoke test. No browser automation, package dependency, runtime upload, Supabase write, R2 call, signed URL request, queue drain, cleanup, or production recovery behavior is approved by this document.

## Goal

Verify that the approved staff-only local capture flow works in a real browser context:

1. Staff opens a market pending evidence list.
2. Staff clicks the local capture action for an eligible pending row.
3. Browser file-input capture/selection opens.
4. The selected image is decoded, compressed, thumbnailed, hashed, and stored as a local pending payload.
5. The sale and pending evidence row remain valid if capture is cancelled or fails.

This smoke test verifies browser behavior only. It does not verify cloud upload, evidence row creation, R2 storage, signed read URLs, or queue drain.

## Safety Boundary

Allowed:

- local dev server only;
- disposable test account or disposable local data;
- temporary browser profile only;
- local IndexedDB inspection only;
- staff market detail pending evidence dialog;
- local `salesPhotoEvidencePendingPayloads` row creation;
- screenshots or notes as manual evidence.

Blocked:

- daily-use Chrome profile;
- production owner/staff account unless the row is explicitly disposable;
- Supabase writes;
- R2 upload;
- signed URL requests;
- evidence row creation;
- queue drain or retry worker;
- cleanup/recovery executor;
- automatic package script wiring;
- Playwright/Puppeteer dependency installation without a separate decision.

## Recommended Manual Procedure

1. Start the app locally with a test Supabase project or disposable local data.
2. Sign in as a staff account that can access one test market.
3. Ensure the market has at least one local pending sales photo evidence row with status `waiting_for_event_sync` or `failed_retryable`.
4. Open the staff market detail page.
5. Open the pending evidence dialog from the sales photo evidence operating card.
6. Click `拍照存本機` on the eligible row.
7. Select a small test image.
8. Confirm the UI shows success or no blocking error.
9. Inspect IndexedDB in the temporary browser profile:
   - database: `MarketPulseDB`;
   - table: `salesPhotoEvidencePendingPayloads`;
   - expected: one row matching the pending `queueId`.
10. Confirm no network request was made to R2, signed URL routes, or Supabase evidence-row writers.
11. Delete the temporary browser profile after the test.

## Pass Criteria

- Eligible staff-owned row enables the action.
- Non-owned staff row stays disabled when `capturedByStaffId` belongs to another user.
- Cancelled selection keeps the row pending and does not create a payload.
- Successful selection creates exactly one local pending payload for the row.
- Re-running capture replaces or updates the same local payload key instead of creating unrelated rows.
- The test does not create a cloud evidence row.
- The test does not upload any image.

## Failure Handling

- If the browser cannot open file input, classify as adapter/browser support failure.
- If decode or compression fails, keep the pending row and record the visible UI message.
- If a local payload is created but cannot be inspected, stop and do not proceed to upload design.
- If any cloud write or upload happens, treat it as a scope violation and stop the rollout.

## Future Automation Boundary

Automated browser smoke testing can be added later only after a separate decision. The allowed shape is:

- Playwright or equivalent temporary profile;
- disposable IndexedDB profile;
- local dev server;
- fixture image;
- no daily browser profile;
- no Supabase/R2 write path;
- no package script wiring until the test is stable.
