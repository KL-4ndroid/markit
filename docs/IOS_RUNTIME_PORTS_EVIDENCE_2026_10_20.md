# iOS runtime ports source evidence

Date: 2026-10-20 (Asia/Taipei)

Scope: reviewed App/Network adapters and guarded native loading. This completes
only the `IOS-RUNTIME-PORTS` source subtask, not all device adapters or native tests.

The subsequent auth-storage source slice and its newer regression results are
recorded in `docs/IOS_AUTH_STORAGE_EVIDENCE_2026_10_20.md`. Remaining-work statements
below describe the runtime-ports snapshot, before that follow-up.

## Changes

- Official App 8.1.2 and Network 8.0.1 packages are pinned; core remains 8.5.3.
- `lib/platform/capacitor/runtime-ports.ts` implements cached LifecyclePort and
  NetworkPort with injected native bridges. Initial state is background/offline.
- Events received during initial registration or reads take precedence over stale
  initial snapshots. Malformed data remains conservative.
- Initialization has a bounded deadline and fixed errors. Disposal resets states,
  stops local subscriptions, removes only owned native handles and handles late
  registration. Concurrent disposal waits for outstanding cleanup.
- Native loader rejects Web/absent native plugins before dynamic plugin loading.
  It returns only after readiness; no application-wide bootstrap is installed.
- Native disclosure inventory reflects the new plugins; final binary review remains
  pending. App/network native method sources were inspected; adapter code calls
  state/connectivity only, not identity, launch URLs, telemetry or server APIs.
- AD4 preparation previously inferred store readiness from any Capacitor directory
  and package. That becomes false once ordinary device ports exist. It now also
  requires complete adapter, verification and entitlement-writer gates, preserving
  the original incomplete-store blocker.

## Verification

- Behavioral adapter tests: PASS, including startup races, timeout, errors, late
  listener cleanup, concurrent disposal, observer isolation and mutable snapshots.
- Integration with installed shared capability registries and background draft save:
  PASS using injected native events on Windows.
- Browser native-loader refusal: PASS, without activating an AppPlatform.
- Native SDK inventory and AD4 readiness regression tests: PASS.
- Shared mobile TypeScript check: PASS, including after the mobile build.
- Web production build: PASS.
- Mobile API build using reserved offline origin `https://mobile-api.invalid`: PASS.
- Mobile static boundary verification: PASS, 324 files / 19.42 MiB.
- Generic static-server smoke: PASS, nine artifacts/routes and API isolation.
- Scoped ESLint: PASS with zero errors; the preparation script was checked with
  `--no-ignore` because repository defaults ignore scripts.
- Dependency tree: exact App 8.1.2, Network 8.0.1, core/iOS/CLI 8.5.3 confirmed.
- Canonical graph and generated manual checklist consistency: PASS. The graph has
  52 tasks, with eight complete; overall launch readiness remains false.
- Full 386-file manifest (`npm.cmd test`): PASS, process exit 0.
- `git diff --check`: PASS.

## Remaining work

Web is still the selected AppPlatform. This slice does not route the running Web
application to native adapters. Keychain-backed auth storage, auth bootstrap
ordering, camera/photos, file/share, clipboard and link adapters remain unfinished.
Preferences was not installed or substituted for secure auth storage.
The broad `IOS-DEVICE-ADAPTERS` task stays incomplete.

There is no `ios/` project, Xcode build, signed app, device/network/background
verification, Apple account access, IAP activation, server entitlement mutation
or cloud signing/upload evidence. Simulated tests do not close those gates.
