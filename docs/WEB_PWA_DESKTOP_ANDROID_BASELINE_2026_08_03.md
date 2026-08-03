# BoothBook Web PWA Desktop and Android Baseline

Date: 2026-08-03

Status: local production compatibility baseline passed; real installs remain external

## Release Identity

- Commit: `097f2be303b543640a6685615632f3b058a67288`
- Version: `0.1.0`
- Build time: `2026-08-03T11:36:36.223Z`
- Origin: loopback production server at `http://localhost:3020`

Loopback evidence confirms compatibility only. It does not prove the final HTTPS
deployment, operating-system install UI, installed-icon launch, or update delivery.

## Automated Results

The exact commit passed `npm.cmd run build` and the commit-bound PWA resource smoke:

```text
PASS commit-bound PWA resources (9 unique image assets, service worker, manifest, demo)
```

Chromium parsed the manifest with no errors. It reported `standalone` display mode,
eight application icons, the narrow application screenshot, three shortcuts, root
scope, and root start URL.

| Surface | Viewport | Result |
| --- | --- | --- |
| Chromium desktop | 1440x900 | Manifest linked, no horizontal overflow, no visible text or control overlap |
| Android class | 412x915 | Manifest linked, no horizontal overflow, no visible text or control overlap |

Both surfaces displayed the same public-data-only unauthenticated launch screen. No
account data, tokens, environment values, or private identifiers were recorded.

## Observed Follow-up

The unauthenticated welcome screen rendered zero `main` landmarks at both viewports.
This does not invalidate the manifest or resource smoke, but it must be corrected and
retested before the final accessibility and PWA release evidence is accepted.

## External Evidence Still Required

The browser-control surface cannot operate Chromium or Android operating-system
installation UI. It also cannot prove installed display mode or read the active
service-worker controller for this run. Complete these steps against the same reviewed
HTTPS release candidate:

1. Install once from desktop Chromium, launch from the installed icon, and capture a
   public-data-only screenshot.
2. Install once from Android Chrome, launch from the installed icon, and capture a
   public-data-only screenshot.
3. Confirm each installed launch is in standalone display mode and remains within the
   manifest scope.
4. Deploy a second reviewed service-worker revision and confirm the installed clients
   activate the update after the documented lifecycle.
5. Verify the create-market and create-product shortcuts for an owner and confirm staff
   behavior fails closed.

Do not include account identifiers, invitation links, cookies, credentials, private
market data, or environment values in the retained screenshots or evidence notes.
