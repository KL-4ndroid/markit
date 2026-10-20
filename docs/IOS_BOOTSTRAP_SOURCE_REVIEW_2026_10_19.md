# iOS bootstrap source slice review

Date: 2026-10-19 (Asia/Taipei)

Review: Codex technical review under the user's accepted Windows-first plan and
authorization to handle routine implementation autonomously. This is not an
independent human review, Apple approval, or native execution evidence.

## Scope accepted for source implementation

Gate 2 is complete in canonical evidence. W1 separates preparation from store
activation. This review satisfies the bounded implementation-slice review for:

- Pin `@capacitor/core`, `@capacitor/ios`, and dev-only `@capacitor/cli` to 8.5.3.
  npm registry metadata was checked today; iOS requires core ^8.5.0 and CLI Node >=22.
  Existing project Node 24 policy remains unchanged; current local Node is 22.11.0.
- Prepare a config factory and CLI scripts. Use bundled `out/` assets, HTTPS API,
  no remote `server.url`, and Swift Package Manager. No new device/IAP plugins.
- Require an explicit application identifier before generating a native project.
  Do not invent or reserve the final production Bundle ID. Configuration tests may
  use a clearly non-production fixture.
- On Windows validate configuration and prerequisites. Generate the actual `ios/`
  project only on macOS, then separately prove compile, signing and installation.
- Rebaseline native SDK inventory and its regression tests when dependencies are
  installed. Preserve draft privacy status and mandatory final-binary review.

## Platform boundaries

Capacitor dependency loading belongs in bootstrap/configuration scripts and future
`lib/platform/capacitor`. Shared business logic, auth, sync, subscription decisions
and validation do not import these packages. Existing Web adapters stay selected;
this slice does not make an incomplete native adapter masquerade as Web.

## Planned files

- package.json and package-lock.json: only the reviewed minimal packages/scripts.
- capacitor.config.ts and scripts/lib/ios-bootstrap-config.cjs: validated config;
  CommonJS compatibility is verified using the real Capacitor config loader.
- scripts/prepare-ios-project.mjs: explicit check/generate modes; no signing/upload.
- tests/ios-bootstrap-config.test.ts and test manifest: negative input and OS guards.
- native disclosure baseline JSON/Markdown and its test: accurate dependency inventory.
- canonical task graph/checklist: source preparation and macOS generation are separate.

## Acceptance and deferred evidence

Config rejects malformed or placeholder identifiers for generation, remote-server
overrides and invalid API origins. Windows generation fails before writing files.
Missing application identity is reported as a prerequisite, not silently defaulted.
Shared/mobile types, relevant tests, Web/mobile builds and static checks must pass.
No Apple account, Google account, remote migration, cloud job, charge, credentials,
notification endpoint, store SDK, entitlement mutation or deletion executor is enabled.

Source preparation can complete with packages/config/scripts/tests. It does not mean
`ios/` exists: `IOS-PROJECT-GENERATION` requires actual macOS generation and validation;
`IOS-SIGNED-BUILD` depends on that task as well as actual signing readiness.
Other device and paid-runtime slices retain their own technical reviews.

## References checked

- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/config
- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/ios

Official docs require macOS/Xcode for iOS builds. No simulator, physical-device,
TestFlight or App Store readiness is asserted by this source review.
