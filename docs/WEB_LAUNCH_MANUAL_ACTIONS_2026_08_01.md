# BoothBook Web Launch Manual Actions

Date: 2026-08-05

Status: open external and human evidence queue

This checklist consolidates launch work that cannot be completed from repository code
or anonymous HTTP smoke. Do not record passwords, tokens, environment values, private
addresses, invitation links, cookies, or customer data in the evidence artifact.

## Database and hosting

- Preserve the completed migration 066 selected-sandbox target/hash, all-true verifier,
  and Security Advisor evidence. Do not reapply 066 to that target.
- Preserve the completed migration 067 selected-sandbox target/hash, pre/post all-true
  verifier, 79/79 denial-smoke, empty-ledger, and Security Advisor evidence. Do not
  reapply 067 to that target.
- Treat any future staging or Production migration target as a separate reviewed apply
  with environment-specific evidence; sandbox verification is not Production evidence.
- Configure the approved Production environment names, then run the structural preflight
  until all checks pass; retain check IDs and counts only.
- Review Vercel environment names and scopes without exporting or photographing values.
- Decide whether commit-specific Vercel URLs need an approved deployment-protection bypass;
  the public stable alias already supplies commit-bound smoke evidence.

## PWA and browser

- Preserve the 2026-08-03 exact-SHA local desktop and Android-class compatibility
  baseline; it passed manifest/resource and responsive checks but is not install proof.
- Preserve the completed unauthenticated `main` landmark fix and focused regression
  coverage; repeat the landmark check on the final release candidate.
- Complete one Chromium desktop install and one Android-class install.
- Launch from each installed icon and capture public-data-only screenshots.
- Deploy a second reviewed revision and verify service-worker update activation.
- Verify owner create-market/create-product shortcuts and staff fail-closed behavior.
- Repeat the commit-bound unrelated-origin HTTPS anti-frame probe on the final release
  candidate using `prepare:web:anti-frame-probe`; the 2026-08-02 `62bd881` probe passed.

## Authenticated release matrix

Current sanitized partial evidence is recorded in
`WEB_AUTHENTICATED_RELEASE_MATRIX_2026_08_01.md`. It covers a deployed Free owner and
the loopback-only Free/Pro/Team presentation harness; it does not replace the remaining
paid deployment, staff-role, recovery, PDF-output, media, or release-candidate evidence.

- Exercise explicit Free, Pro, Team owner, viewer, operator, and manager states against
  the selected production-like deployment.
- Create or confirm a dedicated test account in the Supabase target embedded by the
  selected Production release. The current local target is different, and the supplied
  test account was rejected by the Production target without submitting an event.
- Complete Team invitation, role change, downgrade cleanup, re-upgrade, and explicit
  restore UI evidence without recording invitation tokens or account identifiers.
- Complete offline pending-write, reconnect, blocked sign-out, and cloud-rebuild recovery.
- Verify PDF preview/download entitlement behavior and representative report output.
- Verify authorized and denied product-cover and sales-photo paths after media activation.

## Media and operations

- Apply and verify the approved media migrations.
- Configure private R2, CORS, quota, lifecycle, and expiration cron behavior.
- Prove upload, private read, delete, expiration, partial failure, and cleanup with disposable data.
- Connect production logs and five-minute health probes to a bounded sink; transform a
  complete 36-hour window into the sanitized projection in `WEB_OPERATIONAL_OBSERVABILITY.md`.
- Run `npm.cmd run check:operational-alerts -- --input=<sanitized-snapshot.json>` and
  configure provider alerts with equivalent fixed thresholds; retain counts, status,
  release SHA, and timestamp only.
- Prove provider ingestion and alert delivery, assign primary/backup owners and escalation,
  review retention/access, then complete one non-production fixture incident drill.
- Include `sync.permission_blocked` and `sync.unexpected_failure` in the production sink
  and reproduce the fixed 15-minute thresholds from `WEB_OPERATIONAL_OBSERVABILITY.md`.
- After the Production-target test account is confirmed, run the guarded authenticated
  sync-intake smoke and retain only exact SHA, timestamp, fixed check names, and statuses.
- Add callback, reconciliation, and payment signals only when the S9 billing runtime is
  approved and implemented.

## Legal, support, and billing

- Approve the public operator, representative, business address, support contact, policy
  effective date, retention table, cross-border processing, and deletion procedure.
- Run one real received/replied/closed support case and one incident escalation drill.
- Store dated product, legal, accounting, privacy/security, and support-owner approvals.
- Keep ECPay merchant/API/sandbox activation deferred. It is required only before
  enabling paid Web checkout, not before native Apple/Google subscription launch.
- Complete the Apple and Google account, agreement, tax/bank, product catalog,
  tester, device, privacy, and store-review inputs listed in
  `subscription/NATIVE_SUBSCRIPTION_EXECUTION_PLAN_2026_08_06.md`.
- Review `subscription/NATIVE_STORE_CATALOG_TOPOLOGY_2026_08_06.md` before creating
  subscription products. Approve Apple group/levels, Google product/base plans, and a
  sandbox-proven Founder mechanism that can actually preserve the promised renewal
  price without exposing it to ineligible users. Keep every mapping non-billable until
  store verification and entitlement writing are separately approved.
- Fill only stable sandbox `productId`, Google `basePlanId`, and optional `offerId`
  values in `subscription/NATIVE_STORE_CATALOG_CONFIG_2026_08_06.json`; mark omitted
  launch items `deferred`, never add offer tokens or credentials, and run
  `npm.cmd run check:native-store-catalog`. Exit `0` is configuration preflight only.
- Review every row and blocking question in
  `subscription/NATIVE_STORE_DATA_DISCLOSURE_BASELINE_2026_08_06.md` against the
  final native dependency lockfile, permissions, provider terms, and submitted binary.
- Review the candidate zh-TW store copy and eleven manual checks in
  `subscription/NATIVE_STORE_LISTING_METADATA_2026_08_06.md`. Publish stable HTTPS
  support, privacy, and account-deletion resources; configure reviewer contact,
  reviewer access, and Google contact email only in protected store fields. Update the
  status-only JSON without credentials and run `npm.cmd run check:native-store-metadata`.
  Exit `0` is a console-entry preflight, not store submission or compliance approval.
- Create the Apple/Google icon and Google feature graphic from a brand-approved
  high-resolution source; do not promote an upscaled PWA icon as final artwork.
- Capture the zh-TW storefront screenshots from the final authenticated native release
  candidates with disposable data. Do not use `/demo`, simulated paid state, placeholder
  prices, or Web/PWA screenshots as native submission evidence.
- Place reviewed files at the canonical paths in
  `subscription/NATIVE_STORE_LISTING_ASSET_BASELINE_2026_08_06.md`, run
  `npm.cmd run check:native-store-assets`, and retain the revision, check IDs, and exit
  code. Structural exit `0` still requires product/brand and current store-rule review.
- Keep `ACCOUNT-DELETION` open until the approved in-app initiation flow, public Web
  deletion resource, server deletion procedure, retention exceptions, and denial/
  lifecycle evidence are complete. Local Dexie deletion is not account deletion.
- Keep F3C-F3E, S9 provider runtime, referral rewards, and production canary behind their
  separate implementation and approval gates.

## Go/no-go record

- Keep `WEB_LAUNCH_GATES_2026_08_01.json` synchronized with the reviewed Markdown matrix;
  run `npm.cmd run check:web-launch-readiness` and retain the aggregate result.
- Keep the separate native matrix synchronized with its execution plan; run
  `npm.cmd run check:native-launch-readiness` and treat exit `1` as the expected
  valid result until every native gate is complete.
- Select the final release-candidate SHA and repeat CI, remote smoke, configuration,
  authenticated matrix, PWA install/update, and media evidence against that exact SHA.
- Run the four public remote checks through `npm.cmd run smoke:web:release` with the
  stable Production origin, exact release-candidate SHA, and approved legal mode.
- Assign the rollback owner and canary cohort, define the daily review window, and record
  an explicit go/no-go decision.
- General availability remains no-go until every external, approval, evidence, and canary
  item in `WEB_LAUNCH_READINESS_2026_07_30.md` is closed.
