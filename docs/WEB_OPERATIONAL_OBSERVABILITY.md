# BoothBook Web Operational Observability

Date: 2026-08-02
Status: local server-event, sync-incident intake, and deterministic alert-evaluation
baseline implemented; production sink, routing, ownership, and drill pending

## Scope

This baseline makes the existing sales-photo media routes, expiration cron, and
bounded sync failures observable without adding a monitoring vendor. It covers:

- sales-photo upload, image read, owner deletion, and compensating cleanup;
- the daily sales-photo expiration job;
- authenticated, de-identified permission-blocked and unexpected sync failures;
- bounded release correlation through `VERCEL_GIT_COMMIT_SHA` when available.

The sync client submits schema-v1 reports through the portable application API URL
boundary. Reports are attempted at most once per incident kind per client session in
five minutes, never retry a mutating request, and never change sync state, pause policy,
or local pending-write retention when reporting is unavailable.

Billing callback backlog, payment failures, and reconciliation delay remain reserved
until the separately approved billing runtime exists. This document does not treat
those future signals as implemented.

## Event Contract

Every event is one JSON object written by
`lib/observability/server-operational-event.ts` with schema version `1`.

Required fields:

```text
schemaVersion timestamp level event outcome code route
```

Optional fields are limited to bounded `durationMs`, a sanitized `errorName`, an
allowlisted numeric `metrics` object, and a validated `releaseCommitSha`.

The contract must never contain:

- access tokens, authorization headers, cookies, secrets, or signed URLs;
- actor, owner, staff, market, sale, product, evidence, or subscription identifiers;
- R2 object keys, bucket names, filenames, form data, image bytes, or request bodies;
- raw exception messages, upstream response bodies, stack traces, email addresses,
  IP addresses, or user-agent strings.

Logging failure is non-blocking. A failed log sink must not change an API or cron
response, retry decision, local-payload retention rule, or cleanup result.

## Current Event Catalog

| Event | Success code | Failure or partial codes |
| --- | --- | --- |
| `media.sales_photo.upload` | `upload_completed` | `r2_image_upload_failed`, `r2_thumbnail_upload_failed`, `metadata_finalize_failed`, `upload_route_unexpected_error` |
| `media.sales_photo.upload_failure_status` | none | one of the bounded upload failure reasons when metadata failure marking also fails |
| `media.sales_photo.upload_compensation` | none | storage adapter code or `r2_compensation_unavailable` |
| `media.sales_photo.image_read` | `image_read_completed` | storage adapter code, `invalid_image_object`, `image_route_unavailable` |
| `media.sales_photo.delete` | `delete_completed` | `r2_thumbnail_delete_failed`, `r2_image_delete_failed`, `metadata_finalize_failed`, `delete_route_unavailable` |
| `media.sales_photo.expiration.run` | `expiration_cleanup_completed` | `expiration_dependencies_unavailable`, `expiration_cleanup_incomplete`, `expiration_route_unavailable` |
| `sync.permission_blocked` | none | `permission_sync_blocked` |
| `sync.unexpected_failure` | none | `unexpected_sync_failure` |

Expected authentication denials, invalid client requests, and disabled feature flags
are not operational errors and are not emitted by this baseline. Expected offline or
network-unavailable sync outcomes are also excluded.

`POST /api/operational-events/sync` requires a valid application bearer token and an
`application/json` body no larger than 512 bytes. Its body accepts exactly
`schemaVersion`, `kind`, and bounded `pendingCount`; identifiers, raw errors, URLs, and
extra fields are rejected rather than ignored. The authenticated actor is used only to
authorize intake and is never copied into the operational event.

## Initial Alert Policy

`lib/observability/operational-alert-policy.ts` is the vendor-neutral source of truth
for the currently implemented thresholds. It is pure shared logic and has no filesystem,
browser, provider, or server dependency. The production monitoring sink must implement
equivalent behavior before the media production gate can pass:

| Signal | Warning | Page / release blocker |
| --- | --- | --- |
| `/api/health` external probe | one failed five-minute probe | two consecutive failures or release SHA mismatch |
| `/api/health` probe delivery | no probe within 5 minutes | no probe within 10 minutes |
| expiration cron | job has not produced a success event within 30 hours | any `partial`/`failure`, or no success within 36 hours |
| upload | at least 3 failures in 15 minutes | at least 5 failures in 15 minutes, or failure rate >= 10% with at least 10 attempts |
| upload compensation | none | any failure event |
| image read | at least 3 failures in 15 minutes | at least 5 failures in 15 minutes |
| owner delete | none | any `partial`/`failure` because cleanup may be incomplete |
| sync permission blocked | at least 1 report in 15 minutes | at least 3 reports in 15 minutes |
| unexpected sync failure | at least 3 reports in 15 minutes | at least 5 reports in 15 minutes |

Low traffic must use absolute-count thresholds; percentage-only alerts are invalid
when there are fewer than ten attempts.

## Deterministic Evaluator

The bounded CLI evaluates a sanitized export without connecting to Vercel, Supabase,
R2, a log provider, or a notification provider:

```powershell
npm.cmd run check:operational-alerts -- --input=<sanitized-snapshot.json>
```

The input must cover at least 36 complete hours and use this projection only:

```json
{
  "now": "2026-08-01T12:00:00.000Z",
  "observationStartedAt": "2026-07-30T12:00:00.000Z",
  "events": [
    {
      "schemaVersion": 1,
      "timestamp": "2026-08-01T10:00:00.000Z",
      "event": "media.sales_photo.expiration.run",
      "outcome": "success",
      "metrics": { "attemptedCount": 1, "failedCount": 0 }
    }
  ],
  "healthProbes": [
    {
      "timestamp": "2026-08-01T11:59:00.000Z",
      "healthy": true,
      "releaseMatches": true
    }
  ]
}
```

The upstream query must be complete for the stated window. Before the file reaches the
CLI, discard all fields except the projection above. Never export identifiers, event
codes, routes, raw provider records, request data, URLs, error details, or environment
values. The CLI caps files at 2 MiB, events at 10,000, probes at 1,000, and numeric
counts at 1,000,000,000.

The process writes only a policy version, timestamps, aggregate counts, fixed signal
names, and fixed alert IDs. Exit codes are stable:

| Exit | Meaning |
| --- | --- |
| `0` | no threshold crossed |
| `1` | warning present |
| `2` | release blocker present |
| `64` | missing, malformed, oversized, incomplete-window, or failed evaluation |

This command does not prove production log delivery or alert routing. It is a repeatable
policy oracle for configuring provider rules and evaluating a sanitized incident-drill
fixture; provider delivery and paging still require external evidence.

## Guarded Authenticated Intake Smoke

The mutating intake smoke is intentionally separate from automatic CI and public release
smoke. It verifies an exact deployed release, proves that an authenticated report with
an extra field is rejected, and submits one fixed `sync.unexpected_failure` report with
`pendingCount: 0`.

Use isolated-fixture mode only when the local Supabase target is the target embedded in
the deployed application. It creates one confirmed auth user and deletes it in `finally`:

```powershell
npm.cmd run smoke:sync:incident-intake -- `
  --execute=isolated-fixture-only `
  --project-ref=<confirmed-project-ref> `
  --base-url=https://<confirmed-production-origin> `
  --expected-commit=<exact-seven-character-release-sha>
```

If the local and deployed Supabase targets differ, use a dedicated existing test account
that belongs to the deployed target. Supply its credentials through temporary process
environment values; the command discovers exactly one bounded public Supabase config
from the exact release and does not modify or delete the account:

```powershell
$env:SYNC_INCIDENT_SMOKE_USER_EMAIL='<production-test-account>'
$env:SYNC_INCIDENT_SMOKE_USER_PASSWORD='<production-test-password>'
npm.cmd run smoke:sync:incident-intake -- `
  --execute=existing-test-account-only `
  --base-url=https://<confirmed-production-origin> `
  --expected-commit=<exact-seven-character-release-sha>
Remove-Item Env:SYNC_INCIDENT_SMOKE_USER_EMAIL,Env:SYNC_INCIDENT_SMOKE_USER_PASSWORD
```

Isolated mode requires local public and server Supabase environment values, refuses a
project-ref mismatch, and verifies the deployed public auth project before creating any
fixture. It persists only a bounded cleanup marker in the OS temporary directory and
supports `--cleanup-leftover`. Existing-account mode refuses fixture and cleanup
arguments, bounds release HTML and script downloads, and requires exactly one public
Supabase URL and publishable key. Neither mode prints credentials, tokens,
identifiers, endpoint bodies, or environment values. The one accepted synthetic event
is below the unexpected-failure warning threshold; record its execution time in release
evidence so it is not mistaken for a customer incident.

## Incident Procedure

1. Confirm the event `releaseCommitSha` matches the intended deployment. Do not debug
   an unidentified revision.
2. Group by `event`, `code`, and five-minute window. Do not search by private IDs.
3. For a sync permission alert, confirm authorization/RLS health and keep the ten-minute
   client pause in place. Never clear pending local events to silence the alert.
4. For unexpected sync failures, compare fixed event counts across Web releases and
   account roles without querying by user or workspace identifiers.
5. For upload failures, preserve the client local payload and disable only the affected
   server route flag if errors continue.
6. For delete, compensation, or expiration partial failures, assume storage cleanup is
   incomplete. Do not delete metadata or invent a bulk cleanup action.
7. Check Supabase, R2, cron, and Vercel health using their approved operational access;
   never paste secrets or raw payloads into support notes.
8. Record start time, release SHA, event counts, decision owner, mitigation, and recovery
   evidence in the incident log.
9. Re-enable a route only after an authorized and unauthorized staging smoke passes and
   the alert window is clean.

## Production Exit Evidence

The `OBSERVABILITY` launch gate remains externally incomplete until all of the following
exist:

- a production log/metric sink that parses schema version `1` JSON events;
- saved queries or dashboards for each current media and sync event plus `/api/health`;
- alert destinations, primary owner, backup owner, and escalation contact;
- a dated test alert and one incident drill using a non-production fixture;
- retention and access settings reviewed for privacy and operations;
- future billing callback, reconciliation, and payment signals added only with S9.

Local tests and build success prove the event contract and deterministic policy behavior
only. They do not prove Vercel log delivery, alert routing, cron execution, provider
availability, or incident response.

## 2026-08-02 Release Verification

Runtime commit `74eb996` passed the following bounded evidence:

- local production build and the complete repository test manifest;
- GitHub Actions push run `30724274838` and pull-request run `30724276302`;
- GitHub Production deployment `5709384567`, followed by a stable-alias health response
  whose release identity was exactly `74eb996`;
- all four public release checks: production surface, PWA resources, legal/support in
  `draft` mode, and application API boundary;
- unauthenticated sync-incident POST returned `401 authentication_required`;
- `capacitor://localhost` sync-incident preflight returned `204` with only
  `POST, OPTIONS` allowed.

This evidence proves deployment and the public rejection/CORS boundary. It does not
prove authenticated event ingestion into a production monitoring provider, threshold
delivery, notification ownership, retention/access settings, or an incident drill, so
the `OBSERVABILITY` launch gate remains `implemented_local`.

Follow-up commit `3369ff6` passed both GitHub Actions runs, Production deployment
`5709434279`, exact stable-alias health, and all four public release checks. Its public
client config was intentionally compared without exposing values and does not match the
current `.env.local` Supabase target. The isolated local-target fixture therefore failed
closed at Production authentication and was deleted; the supplied test account was also
rejected by the Production target as invalid credentials. No synthetic event was
accepted in either attempt. A valid dedicated Production-target test account remains a
manual prerequisite for authenticated intake proof.

Guarded-harness commit `62bd881` then passed GitHub Actions push run `30725783802` and
pull-request run `30725785670`, Production deployment `5709665655`, exact stable-alias
health, and all four public release checks. The shipped isolated-fixture path now verifies
the deployed public auth project before it can create a fixture. This verifies the
harness and its public release boundary only; authenticated Production intake remains
unproven until a valid dedicated Production-target test account is available.
