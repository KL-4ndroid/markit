# CSV Reporting Export Specification

Date: 2026-06-30

Status: specification and static guardrail phase.

Scope: define reporting CSV / future Excel exports separately from backup, import, recovery, cloud rebuild, and replace-cache work. This document does not approve runtime export UI, file generation, manager capability changes, sensitive staff exports, Excel generation, background export jobs, Supabase writes, or recovery behavior.

## 1. Product Direction

CSV / Excel export is a supporting reporting download feature.

The primary product direction is now settlement reports: weekly and monthly owner-only report models that can later power designed PDF output. CSV remains useful for data exchange and Excel remains useful for deeper analysis, but neither should lead the user experience.

It is not:

- a backup format;
- an import format;
- a recovery mechanism;
- a replacement for cloud rebuild;
- a replacement for local cache repair.

The export must preserve existing staff data boundaries. Manager export was previously considered as a future candidate, but it is cancelled for now and must not be implemented without a separate approval.

## 2. Current Permission Baseline

Current code keeps `canImportExport` owner-only.

That baseline remains unchanged by this specification.

Future manager reporting export requires a separate approved capability or route gate. Do not reuse owner-only `canImportExport` for manager without a dedicated approval and tests.

## 3. Role Policy

Owner:

- May export full reporting CSVs.
- May include owner-only finance fields.
- May export account-wide or selected-market reports.

Manager:

- No CSV, Excel, PDF, or settlement-report export in the initial implementation.
- Any future authorized market-scope export requires a separate approval, capability, and redaction tests.

Operator:

- No broad CSV export by default.
- Optional future own-activity export requires separate approval.
- Must not export market-wide reports, owner finance, product costs, supplier data, or staff-wide activity.

Viewer:

- No export.

## 4. Initial CSV Report Types

CSV candidates remain future supporting formats:

| Report | Owner | Manager candidate | Operator | Viewer |
| --- | --- | --- | --- | --- |
| `market_summary` | full | scoped redacted | no | no |
| `daily_sales_summary` | full | scoped redacted | no | no |
| `product_sales_summary` | full | scoped redacted | no | no |
| `transaction_log` | full | scoped redacted | no | no |
| `field_operations` | full | scoped redacted | no | no |

Do not implement all report types at once. The next approved direction is not runtime CSV UI; it is the pure owner-only settlement report data model.

## 5. Sensitive Field Policy

These fields are owner-only in reporting exports:

- `cost`;
- `costAtTimeOfSale`;
- `manualCost`;
- `totalCost`;
- `profit`;
- `totalProfit`;
- `netProfit`;
- `profitMargin`;
- `grossMargin`;
- `supplierInfo`;
- `boothCost`;
- `registrationFee`;
- `deposit`;
- `commissionRate`;
- `costBreakdown`;
- `averageCost`;
- `costPerItem`;
- `tableRental`;
- `chairRental`;
- `umbrellaRental`;
- `tableclothRental`.

Snake-case equivalents are also owner-only.

Manager, operator, and viewer exports remain disabled for now. If a future non-owner export is approved, these fields must be omitted, not masked.

## 6. Manager Redacted Field Allowlist

If manager export is reconsidered later, candidate CSV exports may include only scoped operational/reporting fields such as:

- market id;
- market name;
- market dates;
- market location;
- product id;
- product name;
- product category;
- product price;
- product stock;
- deal date;
- deal count;
- revenue;
- interaction count;
- checklist item title and completion state;
- field note text for authorized markets.

This allowlist is not approval to implement manager export. It defines only the safe boundary for a possible future discussion.

## 7. Data Source Policy

First reporting implementation should use current authorized local view-model data where possible.

It must not:

- bypass role gates by reading unsanitized base tables for staff;
- query Supabase directly from UI to fetch broader owner data;
- use service-role credentials;
- export pending local-only rows as synced cloud truth;
- export cloud rebuild preview data as business reports.

If the source includes local-only or pending rows, the CSV must either:

- omit those rows; or
- include an explicit `sync_status` column and label them as not yet cloud-confirmed.

## 8. Output Format

Initial raw download format, when approved later:

- CSV only;
- UTF-8;
- header row required;
- stable column order;
- ISO date columns where possible;
- currency values as numbers, not localized strings;
- no formulas;
- no hidden columns;
- no arbitrary JSON payload columns.

Future Excel:

- separate approval;
- multi-sheet structure;
- no macros;
- no formulas that can execute remote content.

## 9. Implementation Boundary

First implementation slice may add:

- pure CSV escaping/serialization helper;
- one owner-only `market_summary` or `daily_sales_summary` export from already authorized local data;
- static tests for sensitive field exclusion.

First implementation slice must not:

- add manager export capability;
- add Excel dependencies;
- add background jobs;
- add Supabase reads;
- add import support;
- add recovery behavior;
- export owner-only fields for staff roles.

## 10. Step 5 Result

This step completes reporting export specification only.

Approved now:

- documentation;
- static guardrail tests;
- future narrow CSV helper planning.

Still not approved:

- runtime export UI;
- file generation;
- manager export capability changes;
- operator own-activity export;
- Excel generation;
- sensitive staff exports;
- Supabase export queries;
- recovery or backup behavior.

## 11. Step 6 Low-Risk Helper Slice

Status: completed as pure helper and static guardrail work.

Result record:

- `lib/reporting/csv-export.ts`
- `tests/csv-reporting-export.test.ts`

Completed:

- pure CSV escaping and serialization helper;
- owner-only `market_summary` CSV builder;
- stable header order;
- formula-like text neutralization;
- owner capability check requiring `canImportExport` and `canViewOwnerFinance`;
- static tests proving no Supabase, IndexedDB, React, browser download, Excel, sync, or recovery UI dependency.

Still not approved:

- runtime export UI;
- browser download/file generation;
- manager export capability;
- operator own-activity export;
- Excel generation;
- Supabase export queries;
- staff-sensitive export.

## 12. Direction Update: Settlement Reports First

Status: approved direction, data-model phase only.

Settlement reports supersede runtime CSV UI as the next product slice.

Approved next:

- owner-only weekly/monthly settlement report data model;
- pure helper and tests;
- data-quality notes that can later be displayed in a designed PDF.

Still not approved:

- PDF generation library or template;
- Excel generation library;
- download UI;
- manager export/report access;
- cloud export queries;
- background report generation.
