# Settlement Report PDF Technical Plan

Date: 2026-07-01

Status: technical decision completed; PDF implementation remains deferred.

Scope: decide the recommended technical approach for the future owner-only settlement report PDF generation feature.

This document does not approve installing a PDF library, generating PDFs, adding download buttons, adding browser file APIs, adding Supabase reads, changing report permissions, changing settlement scoring, changing analytics page behavior, data repair, projection rebuilds, duplicate cleanup, or sync/recovery behavior.

## 1. Recommended Approach

Use client-side `@react-pdf/renderer` for the first implementation slice.

Reason:

- settlement report data currently comes from local IndexedDB through the owner-only preview page;
- generating the PDF in the browser avoids sending owner finance, booth cost, product cost, or profit data to a server route;
- the PDF can be built from the existing `SettlementReportModel` and a future PDF-specific view model;
- fixed A4 page templates match the report's page-based design better than trying to screenshot the current preview page;
- the app can keep PDF export owner-only and local-first.

This is a recommendation for the next implementation path, not an approval to install or implement it in this slice.

## 2. Alternatives Considered

### Option A: Client-Side React PDF

Candidate: `@react-pdf/renderer`.

Pros:

- works in browser and server contexts;
- supports document/page primitives;
- supports style objects and Flexbox-like layout;
- supports registering local TTF/WOFF fonts;
- keeps sensitive report data on the owner's device for the first version.

Cons:

- layout is not normal HTML/CSS;
- report template must be implemented separately from the in-app preview;
- charts require explicit PDF-safe rendering decisions;
- Traditional Chinese font handling must be tested before release.

Decision: recommended for first implementation.

### Option B: Server-Side HTML-To-PDF

Candidates: Playwright or Puppeteer with Chromium PDF output.

Pros:

- can render HTML/CSS closer to a browser page;
- supports print CSS and browser-like layout;
- easier to reuse web styling concepts.

Cons:

- requires server/headless browser runtime;
- increases deployment complexity;
- requires sending owner report data to a server boundary or rebuilding it server-side;
- harder to preserve local-first privacy for the first version;
- font availability and browser runtime behavior must be controlled in production.

Decision: defer. Consider only if client-side PDF cannot satisfy visual quality, pagination, or font requirements.

### Option C: Browser Print Dialog

Candidate: print-specific HTML/CSS and `window.print()`.

Pros:

- minimal dependencies;
- uses browser print engine;
- easy early prototype.

Cons:

- output varies by browser and user print settings;
- no controlled download file name or export flow;
- weaker automated test surface;
- less suitable for polished report delivery.

Decision: not recommended as the first formal export path.

### Option D: Manual Canvas/Image PDF

Candidate: rendering pages to images/canvas and packing into PDF.

Pros:

- high visual control.

Cons:

- weak text selection/search;
- accessibility loss;
- larger files;
- harder pagination and font handling;
- unnecessary for this report's mostly text/table layout.

Decision: reject for first version.

## 3. Client / Server Boundary

First implementation should be browser-only.

Allowed future boundary:

- user opens owner-only report preview;
- page reads local IndexedDB as it does now;
- page builds `SettlementReportModel`;
- page builds a PDF-specific view model;
- PDF renderer receives only the authorized owner report model/view model;
- generated file stays in browser memory until the owner downloads it.

Blocked:

- posting full owner financial report data to Supabase;
- posting full owner financial report data to a server route;
- server-side rebuild from cloud data;
- automatic background report generation;
- storing generated PDF files remotely;
- allowing manager/operator/viewer export.

Server-side PDF may be reconsidered later only after a separate privacy and deployment decision.

## 4. Data Boundary

PDF generation must consume the same report truth as the preview:

- `buildSettlementReportModel()`;
- existing owner-only capabilities;
- local read-only IndexedDB source in the initial UI path;
- no direct Supabase query inside PDF template code;
- no sync, repair, projection rebuild, or pending-operation action.

Recommended future module split:

- `lib/reporting/settlement-report-pdf-view-model.ts`
  - pure transformation from `SettlementReportModel` to PDF page sections;
  - no React;
  - no browser APIs;
  - no data reads.
- `components/reports/settlement/SettlementReportPdfDocument.tsx`
  - PDF-only document component;
  - imports the PDF view model type;
  - no IndexedDB/Supabase/sync imports.
- `components/reports/settlement/SettlementReportPdfDownloadButton.tsx`
  - owner-only UI shell;
  - disabled until the template and font smoke tests pass.

## 5. Font Strategy

Traditional Chinese must be handled with bundled local font files.

Recommended:

- use a Noto Sans TC static font family or another legally redistributable Traditional Chinese font;
- store font files under a dedicated local asset path such as `public/fonts/report/`;
- use static TTF or WOFF files, not variable fonts, for first implementation;
- register separate weights for regular, medium, and bold;
- avoid remote Google Fonts at generation time;
- include a glyph smoke test with Traditional Chinese, numbers, currency, and punctuation.

Reason:

- report generation must work offline or on weak networks after app assets are available;
- remote font loading can make PDF output unreliable;
- Traditional Chinese missing-glyph failures are high-impact for this feature.

## 6. Pagination Strategy

Use fixed A4 pages for version one.

Recommended page structure:

- page 1: cover summary;
- page 2: data confidence and score explanation;
- page 3: market performance;
- page 4: product performance;
- page 5: cost, profit, and next actions.

Rules:

- do not try to render unlimited market/product rows in the first version;
- cap table rows according to the visual spec;
- add continuation pages only after first PDF smoke tests pass;
- long text must wrap inside its section;
- no text should overlap or be clipped;
- every page must include report period and page number.

## 7. Chart Strategy

Version one should avoid complex charts.

Allowed:

- simple score bars;
- simple horizontal value bars;
- text-first KPI cards.

Blocked until later:

- Recharts-to-PDF reuse;
- canvas screenshots;
- SVG chart conversion;
- complex multi-series charts.

Reason:

- the first PDF should prioritize stable Chinese text, tables, and pagination;
- chart rendering adds risk before the base PDF pipeline is proven.

## 8. Export Permission Guardrails

PDF export remains owner-only.

Required checks before showing or enabling a future download button:

- `hasCapability(capabilities, 'canImportExport')`;
- `hasCapability(capabilities, 'canViewOwnerFinance')`;
- role loading complete;
- no fail-closed role error;
- report model built successfully;
- PDF font/template smoke test passed in development or CI.

Blocked:

- manager export;
- operator export;
- viewer export;
- unauthenticated export;
- fail-open fallback.

## 9. Testing Strategy

### Phase 1: Static Guardrails

Required before implementation:

- plan test proving recommended approach and blocked behaviors;
- package test inclusion;
- no PDF dependency installed.

### Phase 2: Pure View Model Tests

Before rendering:

- PDF view model maps all visual spec pages;
- data limitations appear on intended pages;
- row caps are deterministic;
- no data reads or browser APIs.

### Phase 3: Font And Template Smoke Tests

After installing chosen library:

- render fixture PDF with Traditional Chinese;
- verify output buffer is non-empty;
- verify page count;
- verify no known placeholder fallback text;
- keep smoke fixture disposable and owner-model based.

### Phase 4: Browser UI Smoke

Before enabling download:

- owner-only route shows button only for owner;
- generated PDF can be downloaded from local fixture data;
- button remains absent for staff roles;
- no Supabase write/read is triggered by export.

## 10. Implementation Slices

### Slice H: PDF View Model

Low risk.

Allowed:

- pure TypeScript view model;
- fixture tests;
- no React;
- no PDF dependency;
- no browser APIs.

### Slice I: Font Asset Decision

Medium risk because it adds binary assets.

Requires decision:

- exact font family;
- license review;
- file size budget;
- weights to include.

### Slice J: Install PDF Library

Medium risk.

Requires approval before:

- adding `@react-pdf/renderer`;
- changing package lock;
- adding PDF rendering component.

### Slice K: PDF Template Prototype

Medium risk.

Allowed after Slice J:

- fixture-only PDF document;
- no download UI;
- no production user action.

### Slice L: Owner-Only Download UI

Higher risk.

Requires approval before:

- adding a visible download button;
- invoking browser file/download APIs;
- exposing the feature to production users.

## 11. Stop Conditions

Stop for decision before:

- installing any PDF package;
- adding font files;
- adding browser download behavior;
- adding server route PDF generation;
- sending report data to Supabase or a server;
- changing permissions;
- using manager/staff report export;
- changing report scoring;
- rendering charts beyond simple bars;
- storing generated PDFs.

## 12. Current Decision

Recommended first path:

1. Keep this slice documentation-only.
2. Next low-risk implementation: `Slice H: PDF View Model`.
3. Defer font asset addition until a specific font family and file size are approved.
4. Defer package installation until the view model and font decision are complete.
5. Defer download UI until a fixture PDF template passes smoke tests.

The immediate next safe task after this plan is `Slice H: PDF View Model`.
