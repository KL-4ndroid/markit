# iOS auth storage and initialization source review

Date: 2026-10-20 (Asia/Taipei)

Codex technical review under the user's autonomous Windows-first implementation
authorization. Gate 2, source bootstrap and App/Network source evidence remain
complete. This review precedes the following bounded implementation.

## Decision

Use a small private local Capacitor plugin with three iOS Keychain operations and
no third-party storage dependency. Reviewed candidate npm archives were not
installed: aparajita 8.0.1 pulls Android/Keyboard dependencies and its iOS read
does not distinguish unavailable Keychain data from missing data; martinkasa
0.13.0 also obscures OS read failures and performs legacy-key migration on read.
Those behaviors do not meet this slice's non-destructive startup requirements.

The plugin source lives under `plugins/feria-auth-storage`, not a generated iOS
application. Its Swift package uses the existing Capacitor 8.5.3 dependency.
The real CLI must discover the local dependency and Swift package on Windows;
Swift compilation and Keychain execution remain macOS/device checks.

## Storage policy

- Generic-password entries have a fixed Féria auth service and only accept the
  Supabase session key and its code-verifier/user companion keys.
- Accessibility is `afterFirstUnlockThisDeviceOnly`, supporting the existing
  background refresh behavior after first unlock, without migration to another
  device. Synchronizable is explicitly false; no iCloud Keychain sharing.
- Only `errSecItemNotFound` becomes null/idempotent removal. Read/access errors
  reject with fixed codes; no automatic deletion, migration, broad clear or fallback.
- Native operations and JS operations are serialized. Reads/writes are bounded;
  an ambiguous operation timeout disables subsequent operations for that instance
  until app restart so a delayed write cannot race a supposedly successful logout.
- Values are raw strings, capped at 256 KiB in UTF-8, without JSON re-encoding,
  chunking, tokens in logs or copies in preferences/browser storage.
- Disable Capacitor bridge logging in the reviewed bootstrap configuration, even
  in development builds, because bridge payloads contain auth secrets. Verify the
  generated configuration and device console again on macOS/iPhone.
- No uninstall-time erasure promise: retained Keychain entries must be revalidated
  through normal Supabase session rules. Device tests must cover reinstall.

## Startup integration

Both existing Supabase clients keep the common async storage bridge. Each bridge
operation first resolves its platform storage. iOS resolution is shared and waits
for the native-only loader; missing bridge, loader failure or timeout never select
the Web adapter. Web continues resolving its current installed storage port.
Android native storage stays unsupported and fails closed until its own slice.
No complete AppPlatform or purchase runtime is installed by auth initialization.

## Required evidence

The installed auth-js 2.106.1 initial subscriber invokes `_emitInitialSession`
without owning its rejection. The real-client failure test reproduced an unhandled
rejection after a Keychain read error. A narrow, idempotent postinstall patch adds
error handlers to that task and its enclosing subscription task in both shipped
CommonJS/ESM entry points. It preserves event timing and does not emit SIGNED_OUT,
return null, erase storage, change token verification or alter auth decisions.
The patch refuses unreviewed versions/source shapes; dependency updates require
review instead of silently dropping this fix. Tests must verify both installed
entry points plus a real-client failure without unhandled rejections.

Test startup ordering, concurrent first reads, native failure without Web access,
missing versus unavailable data, sequential writes/removal, errors, timeout and
late replies. Exercise the bridge with a real Supabase client and a fake native
bridge, preserving auth tokens and pending business data on read failure.
Recheck Web behavior, mobile types, relevant auth tests, SDK inventory, package
discovery and Web/mobile builds. Do not mark the full device task complete.

## Primary sources inspected

- https://capacitorjs.com/docs/plugins/ios
- https://developer.apple.com/documentation/security/ksecattraccessibleafterfirstunlockthisdeviceonly
- https://developer.apple.com/documentation/security/keychain-services
- https://supabase.com/docs/guides/auth/sessions
- Installed Supabase auth initialization/storage helpers and Capacitor 8.5.3 CLI.
- Exact candidate npm archives and their published iOS sources, reviewed in temp.

This is a technical implementation review, not independent human, native runtime
or Apple approval. No signing, paid account, production mutation or submission.
