# iOS interaction and application bootstrap source evidence

Date: 2026-10-20 (Asia/Taipei)

## Implemented source slice

- Clipboard 8.0.1 and AppLauncher 8.0.1 are pinned and reviewed. Only explicit
  text copy and validated HTTPS/support mailto opening are exposed. No clipboard
  read/auto-clear, installed-app query, arbitrary scheme or new native library.
- Native text/URL sharing uses existing Share 8.0.3. Unsupported input, failures,
  cancellation, concurrent UI and uncertain bounded I/O never report success.
- Incoming custom links use the lowercased final Bundle ID as their scheme, with
  host app. HTTPS links must match the configured public Web origin. Only existing
  join-token and market/product create routes are forwarded; invitation tokens
  stay opaque and are verified by existing page/server rules. No callback login,
  invitation acceptance or data write is performed by link handling.
- Outgoing invitations use NEXT_PUBLIC_APP_WEB_ORIGIN, defaulting to the previously
  confirmed https://markit-app-mocha.vercel.app. This host must be rechecked before
  release. No capacitor localhost invitation is emitted. HTTPS invitation links
  still work on Web; automatic Universal Link/AASA association remains unconfigured.
- Launch snapshots cannot overwrite an event received during listener registration
  or while reading the snapshot. Route navigation ignores duplicate delivery and
  stale initial reads. Current-document reads are separate from launch intent,
  preventing old create shortcuts from replaying on later page visits. Existing
  market/product permission guards and explicit user submission remain intact.
- The mobile-build-only root gate has matching SSR/first-hydration placeholders.
  It installs all device ports before Auth/Role/Sync providers mount. Web builds
  retain their current initial render. Existing eager SDK module reads still use
  the separate Keychain resolver; no claim that module evaluation waits for React.
- Runtime/network, auth, camera, files and interaction ports are assembled without
  partial installation. Startup is shared across StrictMode/remounts. Failure,
  abort or deadline blocks late installation and disposes acquired/late listeners.
  Errors show a fixed reopen-App message, without raw URLs, tokens or bridge data.
- Native purchases remain explicitly unavailable (native_adapter_not_installed).
  No store SDK, purchase transaction, verifier or entitlement writer was enabled.
- Native external anchor navigation is intercepted behind lib/platform, preserving
  internal Next navigation and reporting failed system opening without navigation
  to an unsafe scheme. PWA registration observes kind=ios before mounting.
- macOS preparation preserves existing URL schemes while adding the final app
  scheme. The actual CLI 8.5.3 template forwards cold/warm links through its
  SceneDelegateProxy. No iOS project was generated to inspect these source fixtures.

## Verification

- Injected interaction and launch-race behavior: PASS.
- Atomic startup, owned/late cleanup, deadline and mobile SSR/provider boundaries:
  PASS. Actual CLI plugin/class discovery and template scheme merge: PASS.
- Read-only browser probe of the bundled mobile output on an isolated localhost
  origin: welcome page and Start button rendered beyond the startup placeholder.
  No credential was entered and no authenticated workflow was exercised. The
  generic server observed missing segment-prefetch requests followed by available
  fallback requests; full static navigation belongs to integration acceptance.
- Clean full manifest rerun: PASS across 398 test files (exit 0). The startup
  status container follows existing main-landmark ownership; that guard and the
  native SSR/startup tests pass after repair.
- Mobile TypeScript, scoped ESLint and changed script syntax checks: PASS. React
  review covered hook cleanup, constant build-target gating, lazy native loading,
  Suspense query boundaries and current permission guards.
- Final mobile API and Web builds: PASS. Static output verification: PASS across
  340 files (19.40 MiB); HTTP smoke: PASS for nine artifacts/routes.
- Native SDK inventory, canonical graph/manual checklist, workflow YAML, staged
  whitespace and secret-marker checks: PASS. Launch readiness stays false; no
  hosted CI or native execution result is inferred from local checks.

## Remaining evidence

No Xcode/SPM/Swift build, signed install, real clipboard, system browser/email,
QuickLook, URL delivery, auth/background/restart cycle or native device workflow
was executed on Windows. IOS-DEVICE-ADAPTERS still needs overall integration
acceptance; source subtasks cannot close device, TestFlight or paid release gates.
Universal Links, final Bundle ID, Apple account, signed build and real device
acceptance remain separate. No protected account or cloud data was changed.

Local Node is 22.11.0; repository and hosted CI require Node 24. Hosted CI execution
is not established by local source/YAML checks.
