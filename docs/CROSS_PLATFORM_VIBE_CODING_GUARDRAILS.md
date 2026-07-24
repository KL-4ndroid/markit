# Cross-Platform Vibe Coding Guardrails

## Decision

As of 2026-07-22, Capacitor implementation is paused while the Web product
workflow is completed. This pause changes delivery priority, not the target
architecture.

The product is intended to ship on three surfaces:

- Web
- iOS through Capacitor
- Android through Capacitor

Web should emphasize data presentation, historical review, analytics,
comparison, reporting, and other information-dense workflows. Web-specific
presentation may be richer than mobile presentation, but it must consume shared
domain models and services.

## Mandatory Rule

Every feature, fix, and refactor must be designed so that future iOS and Android
adapters can reuse the same business logic without a broad rewrite. This applies
even while Capacitor packages and native projects are absent.

Before coding, identify whether the work touches a platform capability. If it
does, define or reuse a contract under `lib/platform` and keep the Web behavior
inside a Web adapter. Do not place browser APIs in shared domain or data code.

## Shared Core

The following must remain platform-neutral and reusable:

- domain types and business rules;
- validation and permission decisions;
- Local-First event and Dexie data semantics;
- synchronization, retry, idempotency, and recovery behavior;
- API request and response contracts;
- analytics calculations and report data models;
- photo processing, policy validation, queueing, and upload orchestration;
- user-facing state machines and error classifications.

Platform ports provide capabilities. They must not contain duplicated business
rules.

## Platform Capabilities

Access these capabilities through `lib/platform` contracts rather than directly
from shared components, hooks, or services:

- camera and photo library;
- file selection, save, preview, and temporary-file cleanup;
- share sheet, clipboard, downloads, and printing;
- network status and foreground/background lifecycle;
- secure authentication storage;
- external links, deep links, and app navigation events;
- browser globals such as `window`, `document`, `navigator`, and storage APIs;
- capabilities added later, such as push notifications or biometric access.

Shared modules must not import `@capacitor/*`. Future Capacitor imports belong
only in native bootstrap code or `lib/platform/capacitor`.

## API And Runtime Boundaries

- Do not assume the client and API share an origin. Mobile uses a configurable,
  stable HTTPS API base URL.
- Keep authentication, authorization, CORS, timeout, retry, and error contracts
  valid for Web and Capacitor origins.
- Do not depend on Next.js route handlers being bundled into the mobile client.
- Do not depend on a remote Capacitor `server.url` for production; mobile must be
  able to use bundled assets.
- Do not assume JavaScript continues running while a mobile app is backgrounded.
- Preserve fail-closed behavior and local pending data across interruption,
  process termination, reconnect, and account switching.

## UI Rules

- Web may use wide tables, dense analytics, comparison layouts, and reporting
  tools when they improve data review.
- Keep calculations, filters, report models, and data queries outside Web-only
  presentation components so mobile can present the same information differently.
- Do not make a core workflow hover-only, mouse-only, keyboard-only, popup-only,
  or dependent on a desktop-sized viewport.
- Account for touch targets, small screens, safe areas, software keyboards,
  orientation changes, and mobile back navigation when designing shared flows.
- Isolate intentionally Web-only routes or views and provide a clear shared
  service boundary beneath them.

## Vibe Coding Checklist

For every task, confirm before completion:

- What part is shared business logic?
- Does the implementation call a browser or device API?
- If yes, is that call isolated behind an existing or new platform port?
- Does any API call assume same-origin Web behavior?
- Can the workflow survive backgrounding, offline state, and process restart
  without losing pending data?
- Can iOS and Android reuse the data model, validation, and orchestration?
- Is Web-specific presentation isolated from shared calculations and services?
- Are platform contract tests or adapter tests needed?
- Do affected shared/mobile boundaries still pass the mobile TypeScript and
  static-output checks?

If any answer exposes a Web-only assumption in shared code, the task is not
complete.

## Capacitor Pause Boundary

During the pause, do not:

- install or upgrade `@capacitor/*` packages;
- create `capacitor.config.*`, `ios/`, or `android/` native projects;
- implement native adapters or native signing/build pipelines;
- claim simulator, physical-device, TestFlight, Play Console, or store readiness.

It is allowed and expected to add or improve platform-neutral contracts, Web
adapters, contract tests, mobile-compatible API boundaries, and responsive UI
when required by current Web work.

When Capacitor work resumes, continue from
`docs/IOS_CAPACITOR_PROGRESS.md`; do not reopen completed Gate 1 or Phase 2
decisions unless current evidence shows that they have regressed.

