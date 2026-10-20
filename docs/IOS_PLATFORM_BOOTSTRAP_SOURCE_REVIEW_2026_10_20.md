# iOS interactions and application bootstrap source review

Date: 2026-10-20 (Asia/Taipei)

Codex technical review under accepted autonomous Windows-first delivery. Gate 2
and preceding bootstrap/runtime/auth/camera/file source reviews remain complete.
This is not independent human, Apple, simulator or physical-device approval.

- Pin official Clipboard 8.0.1 and AppLauncher 8.0.1 (core peers >=8); reuse
  Share 8.0.3 and App 8.1.2. No Browser, app discovery, clipboard reading, store
  SDK or additional native library is needed. Inspect published Swift sources.
- Keep interaction ports under lib/platform. Clipboard is explicit bounded text
  writing only; no read, auto-copy/clear or token logging. External links use the
  system opener for validated HTTPS and bounded support mailto URLs only.
- Incoming links accept only a configured public Web origin or the app's own
  Bundle-ID scheme with host app. Allowlist join-token and market/product create
  routes; reject credentials, unknown query fields, unsafe paths and auth callback
  payloads. Link parsing must not sign in, accept invitations, or write data.
- Outgoing invitations use the public HTTPS Web origin, never capacitor localhost.
  Default to the previously confirmed production Web origin, with a validated
  explicit environment override. Universal Links/AASA/domain association remain
  separate; no automatic Web-to-App opening is claimed.
- Subscribe before reading the launch URL; retain newer warm events, isolate
  observers and remove only owned listeners. Bound initialization and late cleanup.
- Add a mobile-build-only React startup gate above Auth/Role/Sync providers. Web
  builds retain their current initial render. Mobile SSR and first hydration use
  the same placeholder; install all native ports before mounting providers.
  The existing eager Supabase storage resolver still protects module-level reads
  before React mounts; the gate does not claim to prevent SDK module evaluation.
- Reuse the existing auth/camera/file resolvers to avoid duplicate native bridges.
  Install native network/lifecycle and interaction ports atomically. Abort/timeout
  must prevent late installation and clean up acquired listeners, including late
  resources. StrictMode remounts share one process-lifetime initialization.
- Native purchases stay explicitly unavailable with native_adapter_not_installed;
  this is a disabled port, not a real store adapter or entitlement writer.
- Route validated App links through existing pages/permission checks; intercept
  external native anchor navigation behind the device boundary. Preserve Web PWA,
  auth, role and invitation rules. Native PWA registration must remain suppressed.
- macOS preparation merges the Bundle-ID URL scheme into Info.plist preserving
  existing entries. Windows uses source fixtures; no ios/ generation here.

Validate interaction bounds, URL rejection, launch races, owned listener cleanup,
startup ordering/failure/deadlines, actual plugin discovery, config merge, source
contracts, types/lint, complete manifest and both builds. Real clipboard behavior,
URL delivery, system browser/email, Keychain ordering, background/resume, native
UI and SPM/Xcode execution remain device/build evidence.

Primary sources checked:
- https://capacitorjs.com/docs/apis/clipboard
- https://capacitorjs.com/docs/apis/app-launcher
- https://capacitorjs.com/docs/apis/app
- https://capacitorjs.com/docs/apis/share
- https://capacitorjs.com/docs/guides/deep-links
- Exact published npm sources and Swift package manifests.
