# Web Production Surface Boundary Smoke

Date: 2026-08-01

Status: local and commit-bound Production smokes passed

## Contract

Production keeps these internal surfaces unavailable:

```text
/debug/flicker-test
/debug/staff-role-test
/debug/sales-photo-evidence
/api/dev/subscription-simulation
/api/dev/subscription-price-foundation-smoke
```

`/demo` remains intentionally public because it uses only static example data and local
React state. It does not authorize access to the authenticated application.

The root `proxy.ts` matcher rejects `/debug/:path*` before rendering with a real HTTP
`404`; the debug layout remains a second server-side defense. The dev API checks
deployment state before CORS, authentication, or request-body parsing. Even if
`INTERNAL_TEST_SURFACES_ENABLED=1` and `SUBSCRIPTION_SIMULATION_ENABLED=true` are
mistakenly supplied, production still returns `404`.

## Run

Against a local `next start` process configured with `VERCEL_ENV=production`:

```powershell
$env:WEB_PRODUCTION_BOUNDARY_BASE_URL='http://127.0.0.1:3026'
$env:WEB_SMOKE_EXPECTED_COMMIT_SHA=(git rev-parse HEAD)
npm.cmd run smoke:web:production-boundary
```

Against a deployed environment, the base URL must use HTTPS:

```powershell
$env:WEB_PRODUCTION_BOUNDARY_BASE_URL='https://app.example.com'
$env:WEB_SMOKE_EXPECTED_COMMIT_SHA='<release-commit-sha>'
npm.cmd run smoke:web:production-boundary
```

The smoke requires health `200` with the expected release SHA, all internal surfaces `404`, dev API code
`dev_tool_unavailable` for GET/POST/OPTIONS, and public demo `200`.

Passing locally does not authorize production deployment. Remote evidence must record
the deployment URL, commit SHA, timestamp, operator, and command output without cookies,
tokens, or environment values.

The request-level proxy is required because an App Router `notFound()` raised after a
stream starts may render not-found content while retaining HTTP `200`; the production
contract requires an actual `404` response.

## Local evidence

The 2026-07-30 smoke used a fresh production build and `next start` on loopback with:

```text
VERCEL_ENV=production
INTERNAL_TEST_SURFACES_ENABLED=1
SUBSCRIPTION_SIMULATION_ENABLED=true
```

The deliberately unsafe flag values did not bypass the deployment boundary. Result:

```text
PASS commit-bound production surface (debug 404, dev API 404, public demo available)
```

No authentication token, cookie, database mutation, storage operation, or external
network service was used. The smoke first matched the health release SHA against the
trusted local HEAD. Because the worktree was dirty, this remains runtime evidence rather
than release-deployment evidence.

## Production evidence

On 2026-08-01 the stable Production alias passed the same smoke after `/api/health`
matched full expected SHA `0d5b9dbadc4cb3a22371171c1dfa9b11d5481630` to deployed short SHA
`0d5b9db`:

```text
PASS commit-bound production surface (debug 404, dev API 404, public demo available)
```

Vercel deployment `5703908874`, GitHub push run `30696620921`, and pull-request run
`30696623265` all succeeded for the same commit. No authentication token, cookie, data
mutation, or storage operation was used by this public-boundary smoke.
