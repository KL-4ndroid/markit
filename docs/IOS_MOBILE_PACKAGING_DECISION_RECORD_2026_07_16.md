# iOS Mobile Packaging Decision Record

Date: 2026-07-16
Status: Accepted for the Phase 1 packaging strategy

## Context

Féria must continue to ship as a Web application while gaining an iOS application through Capacitor. The packaging layer must therefore avoid duplicating screens, domain logic, Dexie repositories, Supabase integration, analytics, forms, and synchronization services.

The Phase 1 inventory found that a mobile bundle could not directly include request-dependent Next route handlers, runtime-created dynamic path segments, the server-only photo-evidence debug page, Web response headers, or the default Next Image optimizer. A separate Vite shell was the fallback if those constraints could not be isolated cleanly.

## Decision

Use the existing Next.js application as the shared UI shell and produce two build profiles from the same source tree.

| Concern | Web profile | Mobile profile |
| --- | --- | --- |
| Build target | Default | `APP_BUILD_TARGET=mobile` |
| Output | Normal Next production build | Next static export in `out/` |
| Route extensions | `web.tsx`, `tsx`, `ts`, `jsx`, `js` | `tsx` only |
| API route handlers | Included | Excluded |
| Web-only debug page | Included through `page.web.tsx` | Excluded |
| Response headers | Next `headers()` | Not configured |
| Images | Normal Web behavior | Unoptimized static assets |
| TypeScript profile | Repository default | Runtime-source-only `tsconfig.mobile.json` |
| Service Worker | Web PWA behavior | Disabled after native bootstrap installs the native platform before React effects |

Runtime-created market and product identifiers use fixed static pages with query parameters:

- `/markets/detail/?id=<market-id>`
- `/products/detail/?id=<product-id>`

Navigation callers use shared URL builders so the route contract is defined once. The screen components remain shared and do not depend on build-time ID enumeration.

The two photo-evidence operations remain server responsibilities. Clients now obtain their endpoint through `lib/api/client.ts`:

- Web may use same-origin `/api` handlers when no remote base is configured.
- Mobile requires an absolute HTTPS `NEXT_PUBLIC_API_BASE_URL` and fails closed when it is absent or invalid.
- Supabase authorization checks, Cloudflare R2 credentials, and the AWS SDK remain outside the mobile bundle.

Do not introduce a Vite mobile shell at this time. It remains a documented fallback if future Next upgrades make route isolation unreliable, mobile-only conditionals spread through shared screens, or static client routing can no longer be verified without duplicating UI.

## Evidence

- `npm.cmd run build:mobile` completed with 25 statically generated pages.
- `npm.cmd run verify:mobile` verified 304 files (17.97 MiB), required assets and routes, and the absence of API artifacts, legacy dynamic routes, server-only dependency names, R2 environment names, and emitted Next Image runtime URLs.
- `npm.cmd run smoke:mobile` passed nine route and asset checks through a generic static HTTP server, including API 404 behavior.
- Browser smoke testing loaded the login flow, both fixed query detail routes, and the interactive Demo from the generic static server without console errors or warnings.
- The hydrated Demo updated revenue, profit, quantity, and feedback after a client interaction.
- A 390 by 844 viewport reported no horizontal overflow on the application entry screen.
- A dedicated route that is discoverable only in the runtime-smoke build passed a real served-origin Dexie write/read/delete round trip and a Supabase browser SDK/CORS request.
- The same runtime-smoke build rendered the production `BottomNavigation`; clicking its market link completed a client-side transition to `/markets/` without console errors.
- The final production mobile rebuild excluded the runtime-smoke route.
- The ordinary `npm.cmd run build` also completed and retained both Web API routes and the Web-only debug route.
- Direct requests to legacy Web market and product URLs returned request-layer 307 redirects to the fixed query routes, while the new `/detail` URLs were not redirected.
- Mobile route discovery, API boundary, platform boundary, authentication, Dexie, and photo client tests passed.
- The configured Supabase public endpoint was present, HTTPS, and reachable without exposing its URL or public key in verification output.

## Consequences

### Positive

- Web and iOS share the same screen components, hooks, domain services, database layer, and tests.
- The project avoids a second router/provider composition and avoids synchronizing two UI entry trees.
- Server-only routes and secrets have a testable packaging boundary.
- Web behavior remains independently buildable and keeps its existing API handlers and PWA features.

### Constraints

- Web and mobile production builds must run serially because both use Next's `.next` workspace.
- New mobile pages must use the supported `.tsx` route convention. New API handlers must not use an extension that enters the mobile route profile.
- Web-only pages use `page.web.tsx` and must remain covered by route-discovery tests.
- Mobile photo upload and protected image reads remain unavailable until Phase 2 deploys and configures the remote API boundary.
- Fixed query routes become part of the deep-link contract and must be preserved or migrated explicitly.
- The mobile build must continue to pass artifact verification; a successful Next compilation alone is insufficient.
- `public/sw.js` remains a shared static asset. Phase 3 native bootstrap must install the native platform implementation before React effects so the platform guard suppresses registration inside Capacitor.

## Follow-up Gates

Gate 1 is passed by the final production artifact and the isolated served-bundle runtime evidence above. This record does not authorize Phase 2 infrastructure deployment or Capacitor package installation.

Before Phase 2 can complete, the project needs a reviewed BFF deployment target, staging and production API base URLs, CORS origins, token verification policy, and deployment credentials. Before Phase 3 can create the native iOS project, the Capacitor major version and Bundle ID must also be confirmed under their respective gates.
