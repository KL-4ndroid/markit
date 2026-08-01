# BoothBook Web Operational Observability

Date: 2026-07-30
Status: local server-event baseline implemented; production sink and alerts pending

## Scope

This baseline makes the existing sales-photo media routes and expiration cron
observable without adding a monitoring vendor or changing client behavior. It covers:

- sales-photo upload, image read, owner deletion, and compensating cleanup;
- the daily sales-photo expiration job;
- bounded release correlation through `VERCEL_GIT_COMMIT_SHA` when available.

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

Expected authentication denials, invalid client requests, and disabled feature flags
are not operational errors and are not emitted by this baseline.

## Initial Alert Policy

The production monitoring sink must implement these launch thresholds before the
media production gate can pass:

| Signal | Warning | Page / release blocker |
| --- | --- | --- |
| `/api/health` external probe | one failed five-minute probe | two consecutive failures or release SHA mismatch |
| expiration cron | job has not produced a success event within 30 hours | any `partial`/`failure`, or no success within 36 hours |
| upload | at least 3 failures in 15 minutes | at least 5 failures in 15 minutes, or failure rate >= 10% with at least 10 attempts |
| upload compensation | none | any failure event |
| image read | at least 3 failures in 15 minutes | at least 5 failures in 15 minutes |
| owner delete | none | any `partial`/`failure` because cleanup may be incomplete |

Low traffic must use absolute-count thresholds; percentage-only alerts are invalid
when there are fewer than ten attempts.

## Incident Procedure

1. Confirm the event `releaseCommitSha` matches the intended deployment. Do not debug
   an unidentified revision.
2. Group by `event`, `code`, and five-minute window. Do not search by private IDs.
3. For upload failures, preserve the client local payload and disable only the affected
   server route flag if errors continue.
4. For delete, compensation, or expiration partial failures, assume storage cleanup is
   incomplete. Do not delete metadata or invent a bulk cleanup action.
5. Check Supabase, R2, cron, and Vercel health using their approved operational access;
   never paste secrets or raw payloads into support notes.
6. Record start time, release SHA, event counts, decision owner, mitigation, and recovery
   evidence in the incident log.
7. Re-enable a route only after an authorized and unauthorized staging smoke passes and
   the alert window is clean.

## Production Exit Evidence

The `OBSERVABILITY` launch gate remains incomplete until all of the following exist:

- a production log/metric sink that parses schema version `1` JSON events;
- saved queries or dashboards for each current event plus `/api/health`;
- alert destinations, primary owner, backup owner, and escalation contact;
- a dated test alert and one incident drill using a non-production fixture;
- retention and access settings reviewed for privacy and operations;
- future billing callback, reconciliation, and payment signals added only with S9.

Local tests and build success prove the contract shape only. They do not prove Vercel
log delivery, alert routing, cron execution, provider availability, or incident response.
