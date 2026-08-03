# BoothBook Web Launch Manual Actions

Date: 2026-08-01

Status: open external and human evidence queue

This checklist consolidates launch work that cannot be completed from repository code
or anonymous HTTP smoke. Do not record passwords, tokens, environment values, private
addresses, invitation links, cookies, or customer data in the evidence artifact.

## Database and hosting

- Record the migration 066 target classification, migration hash, and apply timestamp.
- Run the read-only migration 066 verifier and retain the all-true result without row data.
- Capture the Supabase Security Advisor result for the selected project.
- Record the migration 067 target classification and SHA-256, apply the reviewed F3B
  migration, then retain the all-true read-only verifier and guarded denial-smoke result.
- Configure the approved Production environment names, then run the structural preflight
  until all checks pass; retain check IDs and counts only.
- Review Vercel environment names and scopes without exporting or photographing values.
- Decide whether commit-specific Vercel URLs need an approved deployment-protection bypass;
  the public stable alias already supplies commit-bound smoke evidence.

## PWA and browser

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
- Complete NewebPay merchant/API/sandbox activation before any billing runtime is enabled.
- Keep F3C-F3E, S9 provider runtime, referral rewards, and production canary behind their
  separate implementation and approval gates.

## Go/no-go record

- Keep `WEB_LAUNCH_GATES_2026_08_01.json` synchronized with the reviewed Markdown matrix;
  run `npm.cmd run check:web-launch-readiness` and retain the aggregate result.
- Select the final release-candidate SHA and repeat CI, remote smoke, configuration,
  authenticated matrix, PWA install/update, and media evidence against that exact SHA.
- Run the four public remote checks through `npm.cmd run smoke:web:release` with the
  stable Production origin, exact release-candidate SHA, and approved legal mode.
- Assign the rollback owner and canary cohort, define the daily review window, and record
  an explicit go/no-go decision.
- General availability remains no-go until every external, approval, evidence, and canary
  item in `WEB_LAUNCH_READINESS_2026_07_30.md` is closed.
