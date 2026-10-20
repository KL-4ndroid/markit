# Windows preparation to Mac handoff

Date: 2026-10-20 (Asia/Taipei)

Status: source tooling prepared and Windows checks recorded; no macOS execution,
native compilation, signed binary, device installation or TestFlight result yet.

## What is automated

| Entry | Purpose | Changes |
| --- | --- | --- |
| `npm run check:ios-bootstrap` | Validate generation prerequisites | Status only |
| `npm run prepare:ios-project` | Rebuild assets, create SPM iOS project, configure permissions/privacy/app links/static routing | macOS-only; refuses an existing `ios/` folder |
| `npm run check:ios-unsigned` | Validate existing-project Simulator build prerequisites | Status only |
| `npm run build:ios-unsigned` | Rebuild, verify, synchronize, configure and compile Debug for generic iOS Simulator | macOS-only; unsigned local build |
| `npm run check:ios-media` / `check:ios-navigation` | Detect configuration drift | Status only |

These commands require no signing material for their intended unsigned build.
Apple enrollment, app record, signing and distribution are later steps. A passing
compile still does not prove that the app runs correctly in Simulator or on iPhone.

## Before starting a rented Mac session

Have the reviewed repository commit, a Mac that supports the required Xcode,
Xcode 26+ with its iOS Simulator SDK, and Node 24 available. Finish Xcode's own
first-run setup if prompted. The scripts do not install tools, accept licenses,
switch global Xcode settings, enroll accounts or pay for infrastructure.

The final `IOS_APP_ID` must be chosen and preserved before real generation. Supply
these values explicitly in the Mac shell; no values or credentials belong in Git:

- `IOS_APP_ID`: final Bundle ID; not a fixture/example identifier.
- `NEXT_PUBLIC_API_BASE_URL`: reviewed deployed HTTPS API base.
- `NEXT_PUBLIC_APP_WEB_ORIGIN`: reviewed public Web origin used for invitations.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: matching public
  configuration for the selected environment. Never use a secret/service-role key.

This workspace historically contained a local Supabase configuration different
from the deployed app. Select one intended environment and check its API/client
pair; do not copy `.env.local` blindly. The unsigned preflight requires explicit
public Supabase values to reduce this risk. Public configuration alone does not
prove that API CORS, project authorization or an authenticated workflow works.

## First Mac execution

From the repository root, after the above values are present in the current shell:

```sh
npm ci --no-audit --no-fund
npm run check:ios-bootstrap
npm run prepare:ios-project
npm run check:ios-unsigned
npm run build:ios-unsigned
```

Stop at the first failing command and return its sanitized error code/context for
repair. Do not delete/regenerate an existing project to bypass a failure. On later
source updates, `build:ios-unsigned` synchronizes/reconfigures the existing project;
`prepare:ios-project` is only for its initial creation.

The unsigned build uses `ios/App/App.xcodeproj`, scheme `App`, Debug configuration,
generic iOS Simulator destination, and `CODE_SIGNING_ALLOWED=NO` /
`CODE_SIGNING_REQUIRED=NO`. Derived data stays under ignored
`.codex-artifacts/ios-derived-data`. No archive, signing, provisioning or upload is
performed. Network access is needed to install locked npm dependencies and resolve
SPM packages. Review the actual native dependency resolution and final binary's
privacy resources; Windows source checks cannot replace that review.

## What must still be checked on Mac/iPhone

1. Swift/SPM build, storyboard controller wiring and actual bundled resources.
2. Simulator cold inner-page opening/reload and client navigation. Confirm the
   app-owned router is used, not merely that generic localhost routing works.
3. Keychain restoration after reopen/lock/reboot, failed reads, account switching
   and pending unsynchronized data boundaries.
4. Offline/reconnect and background/resume with actual device suspension.
5. Camera/gallery permissions, HEIC/orientation/large images, cancellation and
   safe temporary-file ownership.
6. File share/cancel, PDF QuickLook dismissal and cleanup; clipboard, system
   browser/mail, launch/warm links and permission/role protections.
7. Touch layout, safe areas, keyboard, accessibility and the real authenticated
   owner/staff workflows against the selected environment.
8. Signing, physical-iPhone install, internal TestFlight install/update, then
   separately approved subscription runtime, store compliance and App Store release.

No cloud write/recovery/cleanup probe is authorized by this handoff document.
Use the existing approved runbooks and bounded fixtures for those checks. A Mac
without a physically reachable iPhone does not establish real-device acceptance.

## Sanitized result packet

Return only the tested commit, OS/Xcode/Node major versions, command pass/fail,
failing step number/error code, and a brief redacted observation. Do not paste
tokens, signing profiles, private keys, user records, tax/bank documents, full
identities, private endpoints or complete build logs into Git.

After success, review `ios/` source/configuration changes and resolved packages
before selectively committing. A generated project or successful unsigned compile
does not update signing, device, TestFlight or paid release gates automatically.
