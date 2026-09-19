# Native Launch Gate Check

Date: 2026-08-06

Status: canonical local readiness command implemented; launch remains not ready

## Command

Run from the repository root:

```powershell
npm.cmd run check:native-launch-readiness
```

The command reads
`docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json`, validates the
strict schema and gate allowlist, and emits one bounded JSON report to stdout.

## Exit Codes

| Exit | Meaning |
| ---: | --- |
| `0` | Every canonical native gate is `complete` and `overallStatus` is `ready`. |
| `1` | The document is valid, but one or more gates remain incomplete. This is the expected current result. |
| `64` | Arguments, input file, JSON schema, gate IDs, statuses, date, or overall status are invalid. |

Exit `1` is evidence that the checker ran successfully against a valid not-ready
matrix. It is not a failed engineering check and must not be converted to `0` by
removing gates, weakening statuses, or changing `overallStatus` manually.

## Output Boundary

The report contains only:

- schema version, source document, and update date;
- overall readiness and counts by status;
- gate IDs and statuses for incomplete gates.

It never reads or emits environment values, credentials, product identifiers,
purchase tokens, account IDs, provider references, or customer data.

## Operating Rule

Run the checker after any change to the native execution plan or machine gate file,
before a sandbox submission, and on the final release candidate. Preserve only the
exact revision, timestamp, exit code, counts, and gate statuses in release evidence.

This checker does not approve a gate, install native packages, execute migrations,
submit a store form, perform a purchase, or authorize a release. External and manual
evidence remains required by each gate's canonical runbook.
