# Settlement Report Presentation Plan

Date: 2026-07-01

Status: preview repositioning approved; PDF generation still deferred.

Scope: define the product relationship between the settlement report preview page and the future designed PDF output.

This document does not approve PDF generation, download buttons, Excel generation, CSV export, Supabase reads, manager access, report permission changes, scoring changes, data repair, projection rebuilds, duplicate cleanup, or sync/recovery behavior.

## 1. Product Direction

The settlement report feature should have two separate surfaces:

1. Preview/check workspace in the app.
2. Designed PDF as the final report artifact.

The current preview page should not be treated as the final report design. It should remain an owner-only workspace for checking the selected period, data readiness, warnings, key conclusions, and next actions before a final report is generated.

The designed PDF should become the polished output for sharing, archiving, and reviewing the brand's weekly or monthly performance.

## 2. Preview Page Role

The preview page is an in-app checkpoint.

It should help the owner answer:

- Is the selected period correct?
- Is the report data complete enough?
- Are there warnings that make conclusions unreliable?
- Are revenue, profit, score, and recommendation reasonable?
- What data should be fixed or recorded before producing the final report?

The preview page should feel consistent with the BoothBook app:

- compact;
- practical;
- clear;
- operational;
- readable on mobile and desktop;
- similar in density to app settings or analytics tools.

It should not try to become a full PDF mockup or a decorative report cover.

## 3. PDF Role

The PDF is the final report artifact.

It should be designed as a polished brand-management report:

- cover summary;
- large key numbers;
- score and recommendation;
- data-confidence notes;
- market ranking;
- product performance;
- cost and profit section;
- next-action page;
- clear warnings when data is incomplete.

The PDF can use more whitespace, stronger typography, page-based hierarchy, and a more refined visual tone than the in-app preview.

## 4. Shared Truth

Preview and PDF must use the same source model:

- `buildSettlementReportModel()`;
- `buildSettlementReportPreviewModel()` or a later PDF-specific view model derived from the same report model.

The two surfaces must share:

- numbers;
- conclusions;
- score;
- grade;
- recommendation;
- limitation messages;
- data-confidence logic;
- next actions.

They do not need to share identical layout.

## 5. Visual System Direction

Recommended PDF direction:

- page size: portrait A4 as the default;
- layout: cover page plus content pages;
- visual tone: refined brand operations report, not raw accounting export;
- palette: reuse BoothBook's quiet green and warm neutral system, with restrained accent colors;
- typography: clear hierarchy, tabular numbers, short paragraphs;
- charts: only if they improve decision making;
- warnings: visible, direct, and not hidden behind icons only.

Recommended preview direction:

- title it as a report check or preparation workspace;
- place period controls near the top;
- keep warnings and data readiness near the top;
- use smaller, app-like panels instead of a full report cover;
- keep PDF/download actions absent until a separate approved PDF slice exists.

## 6. Non-Goals

This plan does not implement:

- PDF generation;
- browser download;
- PDF library selection;
- PDF template rendering;
- Excel export;
- manager access;
- analytics page replacement;
- Supabase report reads;
- data mutation;
- sync/recovery behavior.

## 7. Next Safe Slices

### Slice E: Reposition Preview UI

Status: approved for low-risk implementation.

Allowed:

- rename the page heading to a check/workspace concept;
- remove overly report-cover-like presentation;
- make controls, readiness, and warnings feel like an in-app workflow;
- keep all data reads local and read-only;
- keep owner-only gate.

Blocked:

- adding PDF generation;
- adding download buttons;
- changing report scoring;
- changing permissions.

### Slice F: PDF Visual Specification

Status: completed as documentation and static guardrail work.

Result record:

- `docs/SETTLEMENT_REPORT_PDF_VISUAL_SPEC_2026_07_01.md`
- `tests/settlement-report-pdf-visual-spec.test.ts`

Define:

- page sequence;
- typography scale;
- PDF section layout;
- warning styles;
- score card;
- table treatment;
- content-to-page mapping.

No runtime code.

### Slice G: PDF Technical Plan

Status: completed as technical decision and static guardrail work.

Result record:

- `docs/SETTLEMENT_REPORT_PDF_TECHNICAL_PLAN_2026_07_01.md`
- `tests/settlement-report-pdf-technical-plan.test.ts`

Decide:

- PDF library;
- rendering strategy;
- font handling;
- image/logo handling;
- testing strategy;
- export permission guardrails.

Decision:

- recommend client-side `@react-pdf/renderer` for the first implementation path;
- keep first implementation browser-only to avoid sending owner financial report data to a server route;
- use browser PDF viewer preview as the first user-facing export surface, so owners can use the browser viewer's built-in download control when needed;
- select Noto Sans TC as the first font-family decision because it is OFL-licensed, Traditional-Chinese-oriented, and visually suitable for a quiet operational brand report;
- stage the local `NotoSansTC-VariableFont_wght.ttf` asset first because its size is acceptable for a first slice;
- require a renderer smoke test before trusting the variable font for generated PDFs;
- keep package installation, PDF template implementation, and browser PDF preview UI behind later approvals.

No implementation is approved by this plan.

### Slice H: PDF View Model

Status: completed as pure TypeScript view model and static guardrail work.

Result record:

- `lib/reporting/settlement-report-pdf-view-model.ts`
- `tests/settlement-report-pdf-view-model.test.ts`

Result:

- maps `SettlementReportModel` into five fixed A4 PDF page data structures;
- carries Noto Sans TC font-plan metadata without adding font files;
- applies deterministic market/product row caps;
- keeps limitations, warnings, score rows, cost/profit metrics, and next actions ready for PDF template rendering.

No PDF package, browser preview UI, download behavior, Supabase access, sync, recovery, or data writes were added.

### Slice I: Font Asset Staging

Status: completed as local asset, license notice, and static guardrail work.

Result record:

- `public/fonts/report/NotoSansTC-VariableFont_wght.ttf`
- `public/fonts/report/LICENSE-NotoSansTC.txt`
- `tests/settlement-report-pdf-font-assets.test.ts`

Result:

- stages Noto Sans TC as the local Traditional Chinese report font asset;
- records the official Noto / Google Fonts source and SIL Open Font License basis;
- keeps the first staged font asset under the 15 MB guardrail;
- updates the PDF view model to point at the local font asset;
- keeps variable-font renderer compatibility behind a future smoke test.

No PDF package, PDF template, browser preview UI, download behavior, Supabase access, sync, recovery, or data writes were added.

### Slice J: PDF Runtime Install and Font Smoke

Status: completed as dependency installation plus fixture-only smoke test.

Result record:

- `@react-pdf/renderer`
- `tests/settlement-report-pdf-font-smoke.test.ts`
- `package.json`
- `package-lock.json`

Result:

- installs the approved PDF renderer;
- renders a minimal A4 PDF buffer with Noto Sans TC;
- verifies PDF generation, CJK font embedding, ToUnicode mapping, and Identity-H encoding;
- confirms no file output, preview UI, download UI, Supabase access, sync, recovery, or data writes were added.

Finding:

- variable-font glyph rendering passed;
- final report typography quality is still not accepted because the generated PDF embeds a thin-weight Noto Sans TC face;
- the next template slice must either visually review this output or switch to static regular/medium/bold font files before production UI.

No formal PDF template, browser preview UI, download behavior, Supabase access, sync, recovery, or data writes were added.

### Slice K: Fixture-Only PDF Template Prototype

Status: completed as non-UI PDF template and guardrail work.

Result record:

- `components/reports/settlement/SettlementReportPdfDocument.tsx`
- `tests/settlement-report-pdf-template.test.ts`

Result:

- renders the existing settlement report PDF view model into five fixed A4 PDF pages;
- keeps PDF rendering fixture-only through `renderToBuffer`;
- verifies five PDF page objects and Noto Sans TC embedding;
- covers cover summary, data confidence, market performance, product performance, and cost/profit/actions pages;
- keeps the component free of IndexedDB, Supabase, sync, recovery, browser preview, and download behavior.

No browser preview UI, download behavior, Supabase access, sync, recovery, or data writes were added.

### Slice L: Owner-Only Browser PDF Preview Shell

Status: completed as browser-only owner preview shell.

Result record:

- `components/reports/settlement/SettlementReportPdfPreviewButton.tsx`
- `app/reports/settlement/page.tsx`
- `tests/settlement-report-pdf-preview-button.test.ts`

Result:

- shows a PDF preview action only inside the existing owner-only settlement report page;
- generates the PDF from the already-built local report model and PDF view model;
- opens the generated blob URL in the browser PDF viewer;
- does not add a custom download button;
- keeps the browser viewer's built-in local save behavior as the only save path;
- keeps the existing owner finance/import-export capability guard.

No Supabase access, sync, recovery, server PDF generation, generated-PDF storage, or manager/staff export was added.
