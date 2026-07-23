# Repository Instructions

## Current Product Priority

- Capacitor implementation is paused until the Web product workflow is complete.
- Do not install Capacitor packages, create native projects, or implement native adapters unless the user explicitly resumes that workstream.
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

