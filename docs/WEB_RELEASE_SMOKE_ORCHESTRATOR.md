# BoothBook Web Release Smoke Orchestrator

Date: 2026-08-01
Status: bounded commit-bound public release smoke implemented

## Command

Run all public release smokes against one exact HTTPS origin and Git revision:

```powershell
npm.cmd run smoke:web:release -- `
  --base-url=https://markit-app-mocha.vercel.app `
  --expected-commit=<7-to-40-character-git-sha> `
  --legal-mode=draft
```

Use `published` only after real operator, contact, policy, retention, and approval values
are deployed. The command rejects HTTP, credentials in URLs, paths, queries, fragments,
unknown arguments, duplicate arguments, invalid SHAs, and unknown legal modes.

## Checks

The command runs these allowlisted scripts in order and stops after the first failure:

1. Production debug/dev surface denial and public demo availability.
2. PWA manifest, nine unique assets, service worker, and demo manifest link.
3. Four legal/support routes in the explicit `draft` or `published` mode.
4. API health, CORS allow/deny behavior, and invalid-token denial.

Every child independently verifies `/api/health` against the expected commit SHA. The
orchestrator uses the current Node executable without a shell, captures bounded child
output, and does not print child stdout, stderr, response bodies, or environment values.
Its JSON output contains only the public origin, short commit SHA, legal mode, timestamp,
aggregate counts, fixed check IDs, and fixed statuses.

Exit `0` means all four checks passed. Exit `1` means one allowlisted check failed and
later checks were not run. Exit `64` means arguments or orchestration were invalid. This
is public-surface evidence only; it does not prove authenticated roles, billing, media
provider configuration, PWA installation, legal approval, alert delivery, or canary signoff.
