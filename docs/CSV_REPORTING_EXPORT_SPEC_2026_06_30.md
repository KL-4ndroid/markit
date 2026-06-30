# CSV Reporting Export Specification

Date: 2026-06-30

Status: specification and static guardrail phase.

Scope: define reporting CSV / future Excel exports separately from backup, import, recovery, cloud rebuild, and replace-cache work. This document does not approve runtime export UI, file generation, manager capability changes, sensitive staff exports, Excel generation, background export jobs, Supabase writes, or recovery behavior.

## 1. Product Direction

CSV / Excel export is a reporting feature.

It is not:

- a backup format;
- an import format;
- a recovery mechanism;
- a replacement for cloud rebuild;
- a replacement for local cache repair.

The export must be designed for owner and manager reporting workflows, while preserving existing staff data boundaries.

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

- Future candidate for authorized market-scope CSV reports only.
- Must not export unrelated owner cache or cross-market owner account data.
- Must not export owner-only finance fields.
- Must not export supplier or product cost fields.
- Requires a separate capability or route gate before implementation.

Operator:

- No broad CSV export by default.
- Optional future own-activity export requires separate approval.
- Must not export market-wide reports, owner finance, product costs, supplier data, or staff-wide activity.

Viewer:

- No export.

## 4. Initial CSV Report Types

First low-risk CSV candidates:

| Report | Owner | Manager candidate | Operator | Viewer |
| --- | --- | --- | --- | --- |
| `market_summary` | full | scoped redacted | no | no |
| `daily_sales_summary` | full | scoped redacted | no | no |
| `product_sales_summary` | full | scoped redacted | no | no |
| `transaction_log` | full | scoped redacted | no | no |
| `field_operations` | full | scoped redacted | no | no |

Do not implement all report types at once. The first implementation should choose one narrow CSV, preferably `market_summary` or `daily_sales_summary`.

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

Manager, operator, and viewer exports must omit these fields, not mask them.

## 6. Manager Redacted Field Allowlist

Manager candidate CSV exports may include only scoped operational/reporting fields such as:

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

This allowlist is not approval to implement manager export. It defines the safe boundary for a future implementation.

## 7. Data Source Policy

First CSV implementation should use current authorized local view-model data where possible.

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

Initial format:

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
