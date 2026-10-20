# iOS bundled navigation and Mac handoff source review

Date: 2026-10-20 (Asia/Taipei)

Reviewer: Codex technical review under the accepted autonomous Windows-first
authorization. This records repository/source acceptance, not an independent human
review, Apple approval, Swift compilation or device evidence.

## Scope and findings

The installed Capacitor 8.5.3 `CapacitorRouter` returns the root `index.html` for
every extensionless path. Next's multi-page static export contains a different
document per route. Reloading an inner document with the default router would
therefore serve the wrong initial tree. Separately, installed Next 16.2.6's client
uses `convertSegmentPathToStaticExportFilename` (slash-to-dot names), while 34
segment files in this project's export are nested. The prior localhost probe
observed failed segment prefetches and fallback requests.

Reviewed changes:

- Mobile build creates byte-identical flat segment aliases after a successful
  export. Originals remain; conflicting files or symbolic links reject the plan
  before writes. Verification requires the aliases and the bundled 404 document.
  Web production build and shared business rules are unchanged.
- A small app-owned `FeriaStaticRouter` serves the existing route's `index.html`
  or exact static file, confines paths to the asset root, and chooses bundled
  `404.html` for missing/unsafe paths. It does not add remote routing or APIs.
- The app-owned `CAPBridgeViewController` subclass is configured in the real CLI
  8.5.3 storyboard and registered in the Xcode Sources build phase. Configuration
  is idempotent and refuses unknown custom controllers or differing app-owned
  Swift files. Windows tests transform template text in memory only. The Swift
  source remains uncompiled until macOS acceptance.
- Native preparation applies both media and navigation configuration. An unsigned
  build entry checks Node 24, macOS, Xcode 26+, Simulator SDK, reviewed dependency
  versions, existing bundled native identity/configuration, and explicit public
  Supabase configuration. It does not print these values. Fixture origins and
  privileged Supabase keys are rejected.
- On a prepared Mac, the entry rebuilds mobile assets, verifies boundaries,
  synchronizes plugins/assets, reapplies guarded configuration and requests an
  unsigned Debug Simulator build. It does not archive, install, sign, provision,
  upload, dispatch a paid hosted runner or access an Apple account. SPM resolution
  and normal local build outputs are expected when deliberately running it.

## Cross-platform review

The only device behavior is in the iOS source template and its preparation
scripts. Existing `lib/platform` contracts, roles, cloud operations, synchronization,
entitlements and recovery semantics remain shared. The integration test composes
real TypeScript adapter factories with injected native bridges, then uses the same
registries consumed by the application. It covers network/background delivery,
pending draft flush, retained auth, cold/warm link navigation, copy/share, picker
cancellation, scoped file cleanup and unavailable purchases. These are source
behavior assertions, not native API execution.

## Acceptance and remaining boundary

Accept this bounded source slice and the source/contract portion of
`IOS-DEVICE-ADAPTERS` after the recorded checks pass. Actual iOS project generation,
SPM/Swift compilation, Keychain and system UI, permissions, authenticated sync,
safe areas/keyboard, signing, physical-device workflows, native purchases and
TestFlight remain separate incomplete tasks. The aggregate native release gates
must remain not ready.

The unsigned builder deliberately requires the final selected configuration;
it must not silently reuse another computer's `.env.local`. The existing native
project's Xcode Bundle ID must also be reviewed on Mac before signing. Local raw
build output may contain machine paths or package URLs; share sanitized failures
only, and review resolved SPM dependencies before device/release acceptance.

## Primary references checked

- Installed `@capacitor/ios` 8.5.3: `Router.swift`, `CAPBridgeViewController.swift`,
  `WebViewAssetHandler.swift`, and CLI SPM storyboard/project templates.
- Installed Next 16.2.6 client segment encoder and actual mobile export.
- [Capacitor controller subclassing](https://capacitorjs.com/docs/ios/viewcontroller)
- [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Apple generic Simulator destination](https://developer.apple.com/documentation/xcode/creating-a-multi-platform-binary-framework-bundle)

No package version was upgraded and no native project was generated in Windows.
