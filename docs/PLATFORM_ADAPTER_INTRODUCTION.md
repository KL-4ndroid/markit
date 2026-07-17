# Platform adapter introduction

## Goal

Keep Web/PWA and the future iOS application on one shared React and business-logic codebase. Platform-specific capabilities enter the application through small ports under `lib/platform`.

## Rules

- Shared components, hooks, and business services must not import `@capacitor/*`.
- Capacitor dependencies belong only under `lib/platform/capacitor` when that implementation is added.
- Platform ports own device/browser access, not business rules.
- Web remains the default implementation so the existing Next.js application keeps its current behavior.
- Tests and native bootstrap may install another `AppPlatform` through `installAppPlatform`.

## First slice: camera selection

The first port owns capability detection and camera/library image selection. Image decoding, compression, policy validation, Dexie persistence, and upload remain in the existing shared sales-photo-evidence pipeline. This prevents Web and iOS from developing different evidence safety behavior.

## Next slices

1. File save and PDF preview (completed for primary UI/reporting call sites).
2. Database-level emergency fallbacks use the cycle-safe FilePort registry; native file share remains pending.
3. Network state and foreground/background lifecycle (completed for sync core and relevant online UI).
4. Secure authentication storage (Supabase async bridge completed; native Keychain implementation pending).
5. Clipboard, share, external links, and deep links (ports and Web implementations completed; native implementations pending).
6. Capacitor iOS implementations and native bootstrap.
