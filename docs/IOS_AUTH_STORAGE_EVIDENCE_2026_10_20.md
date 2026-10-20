# iOS auth storage and startup source evidence

Date: 2026-10-20 (Asia/Taipei)

Scope: reviewed iOS Keychain plugin sources, serialized storage adapter and async
Supabase initialization boundary. This is Windows source/behavior evidence.

The subsequent camera/photo source slice is recorded in
`docs/IOS_CAMERA_EVIDENCE_2026_10_20.md`; remaining-work statements here describe
the auth-storage snapshot before that follow-up.

## Implementation

- Private local plugin 0.1.0 supplies three iOS Security-framework operations.
  Session, user and PKCE keys are scoped to one fixed service. Accessibility is
  after-first-unlock/device-only and synchronization is false.
- A missing Keychain item is distinct from locked/unavailable/corrupt data. Only
  the requested key can be removed; read failure never clears storage.
- Raw string values, UTF-8 limits, serial operations and fixed error codes keep
  auth payloads out of logs and ordinary storage. A timed-out operation prevents
  further operations on that instance until restart; late replies do not resume it.
- Both existing Supabase clients use the common bridge, which now waits for
  platform resolution even during eager module initialization. Native loader
  failure is sticky and never falls back to Web. Web still resolves installed
  ports dynamically. Unsupported Android native auth fails closed.
- The running AppPlatform remains Web until the other device capabilities are
  implemented; only auth storage chooses its actual runtime independently.
- A real SDK test exposed unowned initial-subscription rejections in auth-js
  2.106.1. A narrow postinstall compatibility patch owns those promises in both
  CJS/ESM entry points, preserving event timing and session/error semantics. It
  refuses unreviewed versions or source changes. No dependency upgrade was made.
- The login dialog gives a readable recovery message for native storage errors.
- Capacitor bridge logging is disabled in the source configuration so native auth
  parameters/results are not sent to its debug logger. Actual device logs still
  require native verification.
- The native disclosure inventory and Windows CI include this bounded source slice.

## Verification

- Storage unit behavior, queue ordering, idempotent removal, namespace/size limits,
  bridge errors and ambiguous timeout/late reply behavior: PASS.
- Actual Supabase client eager initialization plus concurrent storage calls: PASS;
  native setup is shared and credential reads wait for it; no network requests.
- Actual SDK storage failure with auth subscribers: PASS; no unhandled rejection,
  synthetic SIGNED_OUT, credential write or deletion. Existing values remain intact.
- Native bootstrap failure/timeout and unsupported platforms: PASS, no Web access.
- Actual Capacitor CLI discovers the local iOS plugin and matching Swift product:
  PASS; no native application is generated.
- Installed SDK patch check and unknown-version/source refusal: PASS.
- Fresh isolated Windows install: PASS; local plugin, reviewed dependency and
  automatic postinstall patch are present, with no manual SDK file edits.
- Shared mobile TypeScript check and scoped ESLint: PASS.
- Web production build: PASS.
- Mobile API build with reserved origin `https://mobile-api.invalid`: PASS.
- Static artifact verification: PASS, 325 files / 19.43 MiB. The bundled SDK
  contains the initial-subscription compatibility handler.
- Generic static-server smoke: PASS, nine artifacts/routes and API isolation.
- Canonical graph/generated manual checklist and `git diff --check`: PASS.
- Full 390-file manifest (`npm.cmd test`): PASS, process exit 0.

The local host remains Node 22.11.0; the project and CI target Node 24. No system
runtime was changed. CI workflow source/contracts were checked locally; no hosted
CI job or signing/upload run was dispatched.

## Native verification still required

Swift/SPM compilation, real Keychain execution, foreground/background refresh,
device lock/reboot/first unlock, process restart, reinstall, login/logout and
account switching must run on macOS/iPhone. Sources and fakes are not those results.
There is still no generated `ios/` application, signature, TestFlight upload or
store purchase runtime. No real account or credential was used for these tests.

The remainder of `IOS-DEVICE-ADAPTERS` stays incomplete: full native platform
bootstrap, camera/photos, files/share, clipboard and external/deep links.
Existing Web credentials are not migrated; native login uses its own Keychain.
