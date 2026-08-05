# Repository Instructions

## Current Product Priority

- Native subscription readiness is resumed as of 2026-08-06, with iOS App Store
  and Google Play subscription launches ahead of Web checkout.
- Platform-neutral subscription contracts, entitlement rules, tests, and mobile
  packaging readiness may proceed now.
- Do not install Capacitor packages, create native projects, or implement native
  store adapters until the existing Phase 2 Gate 2 evidence is complete and the
  corresponding implementation slice is reviewed.
- Web recurring checkout is deferred. ECPay is the selected future Web provider;
  no ECPay runtime or merchant activation is required for the native-first launch.
- The product must remain capable of shipping as Web, iOS, and Android applications from one shared business-logic codebase.
- Web UX should prioritize data presentation, review, analytics, comparison, and reporting.

## Mandatory Cross-Platform Gate

Every feature, fix, and refactor must follow
`docs/CROSS_PLATFORM_VIBE_CODING_GUARDRAILS.md`, including work described as
"vibe coding". A Web-first delivery must not introduce a browser-only assumption
into shared business logic or make the future Capacitor implementation require a
rewrite.

Before implementation, identify platform-dependent capabilities. Keep domain
rules, validation, data models, sync behavior, and API contracts shared. Put
browser/device access behind `lib/platform` ports with a Web adapter now and a
future Capacitor adapter later.
