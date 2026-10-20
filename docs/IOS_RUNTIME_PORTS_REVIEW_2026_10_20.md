# iOS runtime ports source review

Date: 2026-10-20 (Asia/Taipei)

Scope accepted by Codex technical review under the user's autonomous Windows-first
implementation authorization. Gate 2 and source bootstrap remain complete.

## Bounded slice

Install official `@capacitor/app` 8.1.2 and `@capacitor/network` 8.0.1, pinned exactly.
Registry peer metadata requires core >=8.0.0; installed core 8.5.3 satisfies it.
Implement NetworkPort and LifecyclePort adapters under `lib/platform/capacitor`.
The native loader checks native execution and both plugin registrations; browser
fallback implementations must not count as native evidence.

An injected adapter factory permits Windows tests for initial query/event races,
background/offline defaults, initialization failure/timeout, isolated subscribers,
disposal and late listener registration. Initialization must not overwrite a newer
native event with a stale snapshot. Only owned listeners are removed.

There is no automatic app bootstrap or platform installation in this slice. Web
defaults remain active. Auth/client initialization, Keychain, camera, files, sharing,
external links, deep links, store SDKs and signing retain separate implementation
work. Do not install Preferences or use its UserDefaults backend as auth storage.
Do not claim complete `IOS-DEVICE-ADAPTERS` from two implemented ports.

## Acceptance

- Native SDK inventory and baseline tests reflect both packages, with final native
  permission/manifest/binary disclosure review still pending.
- Shared domain, sync and auth modules receive no Capacitor imports.
- Adapter errors use fixed codes, without raw native errors or payload logging.
- Native loading on Web is rejected; mocked tests never become device evidence.
- Relevant adapter/platform/draft regression tests, mobile types and Web/mobile
  builds pass. Native compilation and actual iPhone foreground/network transitions
  remain pending macOS/device verification.

## Primary sources checked

- https://capacitorjs.com/docs/apis/app — appStateChange/getState and owned listener handles.
- https://capacitorjs.com/docs/apis/network — networkStatusChange/getStatus and connection types.
- https://capacitorjs.com/docs/apis/preferences — UserDefaults backend, not Keychain.

This is a technical implementation review, not independent human or Apple approval.
