# Web Security Headers

Date: 2026-07-30

Status: baseline passed local production-mode API/page/PWA smoke on 2026-07-30; remote anti-frame evidence pending

## Enforced baseline

Every Web response receives:

| Header | Contract | Purpose |
| --- | --- | --- |
| `Content-Security-Policy` | `base-uri 'self'; frame-ancestors 'none'; object-src 'none'` | Reject base-tag rewriting, framing, and plugin objects |
| `Permissions-Policy` | camera self; microphone/geolocation/payment/USB disabled | Preserve file-input camera capture while denying unused browser capabilities |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Avoid leaking path/query data cross-origin |
| `Strict-Transport-Security` | one year, no preload/subdomain expansion | Require HTTPS after the first trusted HTTPS visit |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Legacy anti-framing defense |
| `X-XSS-Protection` | `0` | Disable obsolete browser XSS auditors |

The policy intentionally does not add `Cross-Origin-Opener-Policy`, because external
window and future authentication flows need staging verification first.

## Deferred full CSP

A resource-loading CSP is deliberately deferred. `script-src`, `style-src`,
`connect-src`, `img-src`, `worker-src`, and nonce/hash handling require an inventory of:

- Next.js inline/bootstrap scripts and styles;
- Supabase HTTP and realtime endpoints;
- R2 signed image URLs and blob/data previews;
- service worker registration and PWA assets;
- PDF preview/download behavior;
- analytics and any future billing-provider redirects.

Do not add broad `unsafe-inline`, `unsafe-eval`, wildcard, or `https:` sources merely to
make a strict CSP pass. Start with report-only staging telemetry, then move reviewed
directives to enforcement.

## Evidence

The deployment smokes assert every exact header on `/api/health` after first verifying
the expected release SHA. A local build does not prove the final deployment headers;
Vercel or another edge layer may add, replace, or remove them.

Remote evidence must include:

- commit-bound smoke output;
- raw header names and public values, with cookies/auth headers omitted;
- top-level page and API samples;
- browser console and PWA/service-worker regression review;
- anti-framing verification from an unrelated HTTPS origin.

This baseline does not enable production media, billing, analytics, or third-party
connections and does not replace application authorization or RLS.

## Local evidence

The 2026-07-30 production-mode smoke verified the exact baseline on both
`/api/health` and the public `/demo` page after the release SHA check. It also retained
the debug/dev-API denial contract:

```text
PASS commit-bound production surface (debug 404, dev API 404, public demo available)
```

The separate commit-bound PWA smoke fetched every declared icon and screenshot, the
manifest, service worker, and demo page with the same header contract. Browser evidence
confirmed service-worker activation, no console errors, and no horizontal overflow at
four viewports. The unrelated-origin anti-frame browser probe remains pending because
the in-app browser rejected the inline probe URL and no bypass was attempted.

The dirty local worktree means this is compatibility/runtime evidence, not final
deployment evidence.
