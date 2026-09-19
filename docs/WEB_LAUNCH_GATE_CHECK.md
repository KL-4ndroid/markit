# BoothBook Web Launch Gate Check

Date: 2026-08-01
Status: fail-closed local preflight implemented; launch remains `NOT_READY`

## Purpose

`WEB_LAUNCH_GATES_2026_08_01.json` is the machine-readable status companion to
`WEB_LAUNCH_READINESS_2026_07_30.md`. It contains only the schema version, source
document, update date, overall status, gate IDs, and gate statuses. Evidence and
environment data remain in the reviewed Markdown record or approved external systems.

Run the canonical check with:

```powershell
npm.cmd run check:web-launch-readiness
```

Exit `1` is the expected result while any gate is not `complete`. Exit `0` is possible
only when all 19 required gates are `complete` and `overallStatus` is `ready`. Exit `64`
means the file, schema, required IDs, statuses, date, or overall-status relationship is
invalid.

The JSON and Markdown matrix are synchronized by tests. A status change must update both
files in the same reviewed commit and retain the environment-specific evidence required
by the Markdown row. Removing a gate, inventing a status, duplicating an ID, or setting
`ready` early fails closed.

The command reads one bounded local JSON file and outputs aggregate counts plus blocker
IDs/statuses. It does not approve or execute a launch. It also does not read environment
variables, connect to a provider, expose evidence details, deploy a revision, enable a
feature flag, or replace the signed go/no-go record.
