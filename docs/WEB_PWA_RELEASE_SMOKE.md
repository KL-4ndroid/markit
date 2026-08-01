# BoothBook Web PWA Release Smoke

Date: 2026-07-30
Status: local production build and browser smoke passed; remote install evidence pending

## Scope

This gate verifies that the Web release remains installable and that its declared PWA
resources are real. It does not claim offline data support: the current service worker
has no `fetch` handler and must not cache application or user data without a separately
reviewed offline design.

The automated smoke checks:

- commit identity through `/api/health` before accepting any other result;
- the exact reviewed Web security headers;
- manifest name, description, identity, scope, start URL, display mode, icons,
  screenshots, shortcuts, and `prefer_related_applications` policy;
- every unique declared icon and screenshot over HTTP, including MIME type, PNG
  signature, actual dimensions, and body bounds;
- the service worker cache-control and scope headers, version, lifecycle handlers, and
  continued absence of an unreviewed `fetch` cache;
- the public `/demo` manifest link.

## Run

Use the intended release SHA, never a guessed or currently checked-out dirty value:

```powershell
$env:WEB_PWA_SMOKE_BASE_URL = 'https://staging.example.com'
$env:WEB_SMOKE_EXPECTED_COMMIT_SHA = '<deployed-git-sha>'
npm.cmd run smoke:web:pwa
```

The base URL must be HTTPS, except loopback HTTP for a local production build. The
script rejects credentials, paths, queries, fragments, and redirects.

Expected success:

```text
PASS commit-bound PWA resources (9 unique image assets, service worker, manifest, demo)
```

## Browser Evidence

The 2026-07-30 local production build passed these checks:

- `/demo` exposed `/manifest.json` and had no console errors;
- the service worker logged registration success and transitioned through `installed`,
  `activating`, and `activated`;
- no horizontal overflow occurred at requested 390x844, 768x1024, 1440x900, or
  1920x1080 browser sizes;
- the narrow 540x720 screenshot was generated from the public fake-data demo and does
  not contain account data;
- the missing manifest screenshot found by the first smoke was added, rebuilt, and the
  identical smoke then passed;
- create-market and create-product shortcuts now use the platform `DeepLinkPort` and
  open only after owner role and local database readiness are confirmed.

The Codex in-app browser blocked navigation to the inline cross-origin frame probe.
No bypass was attempted. Exact `frame-ancestors 'none'` and `X-Frame-Options: DENY`
checks pass locally, but a real anti-frame probe remains required against the release
deployment from an unrelated HTTPS origin.

## Release Exit Evidence

Before general availability, record all of the following against the same deployment:

- passing `smoke:web:pwa` output with the trusted deployed SHA;
- browser manifest/installability review and a completed install on one Chromium
  desktop and one Android-class viewport;
- launch from the installed icon and update activation after a second deployment;
- owner create-market/create-product shortcut behavior plus staff fail-closed behavior;
- unrelated-origin anti-frame evidence;
- screenshots of the install prompt and installed app shell with no private data.

Localhost evidence is compatibility evidence only. It does not prove HTTPS, edge
headers, install prompts, update delivery, or production deployment identity.
