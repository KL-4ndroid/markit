# Web Deployment Release Identity

Date: 2026-08-01

Status: commit-bound Production deployment and remote smokes passed on 2026-08-01

## Purpose

Deployment evidence never proves a deployment from URL reachability alone. Every Web
smoke must compare the expected Git SHA with the bounded release identity returned by
`GET /api/health`.

The public health identity contains only:

```text
version
commitSha
buildTime
```

It does not expose secrets, environment values, or configuration readiness. Invalid or
oversized metadata is normalized to `unknown` / `null`, causing deployment smoke to fail.

## Run

Resolve the expected source revision without printing any deployment configuration:

```powershell
$env:WEB_SMOKE_EXPECTED_COMMIT_SHA=(git rev-parse HEAD)
```

Then run the appropriate smoke:

```powershell
$env:APP_API_SMOKE_BASE_URL='https://staging.example.com'
npm.cmd run smoke:api:staging
```

```powershell
$env:WEB_PRODUCTION_BOUNDARY_BASE_URL='https://app.example.com'
npm.cmd run smoke:web:production-boundary
```

The smoke rejects missing/invalid expected SHA, `development` or `unknown` version,
missing build time, and a deployment whose returned commit does not match the first
seven characters of the expected revision.

## Evidence

Record:

- deployment URL and environment name;
- full expected source SHA from the trusted checkout or CI event;
- health-returned short SHA, version, and build time;
- command output, operator, and timestamp.

Do not record cookies, bearer tokens, Vercel/Supabase/R2 values, or environment-file
contents. A passing identity check proves only that the smoke reached the intended
revision; every functional, data, billing, and migration gate remains separate.

## Local evidence

The 2026-07-30 production-mode smoke resolved `WEB_SMOKE_EXPECTED_COMMIT_SHA` from the
trusted local Git checkout, verified the health release identity first, and then passed
the production surface checks:

```text
PASS commit-bound production surface (debug 404, dev API 404, public demo available)
```

The worktree contained uncommitted launch-preparation changes, so this result proves the
runtime identity mechanism and boundary behavior only. It is not release evidence until
the exact changes are committed, deployed from that commit, and the remote smoke passes.

## Production evidence

Vercel Production deployment `5703908874` completed successfully for:

```text
0d5b9dbadc4cb3a22371171c1dfa9b11d5481630
```

The commit-specific deployment URL is protected by Vercel SSO and returned `302` to the
SSO endpoint. The public stable alias `https://markit-app-mocha.vercel.app` returned:

```text
version: 0.1.0
commitSha: 0d5b9db
buildTime: 2026-08-01T10:54:23.733Z
```

After validating that identity, the Production boundary, PWA resource, draft legal
page, and API/CORS/invalid-token smokes all passed. GitHub push run `30696620921` and
pull-request run `30696623265` also completed successfully for the same full SHA.

This proves deployment identity and the checked HTTP contracts only. It does not prove
production Supabase/R2 configuration, legal publication, billing, authenticated paid
states, PWA installation, or canary readiness.
