# iOS Windows workflow integration evidence

Date: 2026-10-20 (Asia/Taipei)

## Accepted source result

The source/contract task `IOS-DEVICE-ADAPTERS` is complete. Runtime, storage,
media, files, interactions and startup source slices have been composed through
the shared application registries. The independent native generation, signed
build, physical-device, internal TestFlight and store tasks remain incomplete.
Release readiness is still false.

The bounded changes and technical review are in
`docs/IOS_NAVIGATION_AND_HANDOFF_SOURCE_REVIEW_2026_10_20.md`. Mac operation and
remaining manual/device evidence are in `docs/IOS_MAC_HANDOFF_2026_10_20.md`.

## Behavioral checks

- `ios-platform-workflow-integration.test.ts`: PASS using real TypeScript adapter
  factories with injected native bridges. Startup installs shared registries once;
  auth survives offline/background, pending draft flush runs once, foreground and
  cellular reconnect arrive, cold/warm links navigate, invitations use public
  HTTPS, copy/share dispatch, picker cancellation returns null, CSV export cleans
  only its operation files after presentation, original payload survives, owned
  listeners dispose once, purchases remain unavailable, and Web ports restore.
- `mobile-segment-aliases.test.ts`: PASS against the installed Next client's
  actual segment encoder; aliases preserve bytes, check mode does not write and
  conflicting existing output is not overwritten.
- `ios-navigation-configuration.test.ts`: PASS using the actual CLI 8.5.3 SPM
  storyboard/project in memory; one compiled-source reference, idempotent setup,
  custom-source protection and Windows apply refusal. This is not Swift execution.
- `ios-unsigned-build.test.ts`: PASS for prerequisite blockers, explicit public
  configuration, rejection of privileged keys/fixtures, native identity mismatch,
  command arguments with spaces, unsigned Simulator destination and Windows build
  refusal. No Xcode command was executed on this computer.
- API-enabled mobile build: PASS. 34 flat segment aliases were generated.
- Static verifier: PASS, 374 files / 19.51 MiB; HTTP smoke: PASS, 11 routes/assets,
  including flat inner-page prefetches. API handlers remain absent.
- Isolated localhost browser: welcome hydrated; client click opened privacy;
  privacy reload hydrated its correct document; return link opened welcome;
  Start opened the login dialog. The formerly missing flat privacy/about/terms
  prefetches returned 200/304. No credentials entered, login submitted, account
  created or protected cloud data changed. The browser used Web ports; this
  cannot prove the prepared Swift router or native PWA suppression.

Browser screenshot is local-only under ignored
`.codex-artifacts/ios-navigation/login.png`; it contains no entered credentials.

## Validation scope

The full manifest snapshot at test start passed (401 test files, exit 0). The
subsequently added integration file and updated unsigned/graph checks passed
separately; the final manifest contains 402 files. Scoped TypeScript-test ESLint,
changed-script syntax, canonical graph/generated checklist and whitespace checks
passed. The scripts are excluded from the repository ESLint configuration, so
their syntax checks are recorded separately. Local validation logs are under the
machine's temporary directory (`feria-ios-navigation-tests-20261020.log` and
`feria-ios-navigation-mobile-20261020.log`). Local Node is
22.11.0; CI and the new Mac preflight require Node 24. Hosted CI execution is not
established by local source validation.

No iOS project was generated. No native dependency resolution, Swift compilation,
Simulator run, real Keychain/permissions/system UI, authenticated device sync,
signing, purchase, TestFlight or App Store acceptance is inferred from these tests.
