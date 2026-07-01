# Settlement Report PDF Technical Plan

Date: 2026-07-01

Status: browser-only owner PDF preview shell and fixture visual validation are implemented.

Scope: decide the recommended technical approach for the future owner-only settlement report PDF generation feature.

This document records the approved `@react-pdf/renderer` installation, font smoke test, PDF template, owner-only browser preview shell, and fixture visual validation. It does not approve custom download buttons, browser file APIs beyond opening a generated blob URL, Supabase reads, changing report permissions, changing settlement scoring, changing analytics page behavior, data repair, projection rebuilds, duplicate cleanup, or sync/recovery behavior.

## 1. Recommended Approach

Use client-side `@react-pdf/renderer` for the first implementation slice.

Reason:

- settlement report data currently comes from local IndexedDB through the owner-only preview page;
- generating the PDF in the browser avoids sending owner finance, booth cost, product cost, or profit data to a server route;
- the PDF can be built from the existing `SettlementReportModel` and a future PDF-specific view model;
- fixed A4 page templates match the report's page-based design better than trying to screenshot the current preview page;
- the app can keep PDF export owner-only and local-first.

This recommendation has now been implemented through the owner-only browser preview shell. Custom download UI, server-side generation, generated-PDF storage, permission expansion, and production data mutation remain separate decision boundaries.

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
- generated PDF is opened in the browser PDF viewer;
- if the owner wants a local file, the owner uses the browser viewer's built-in download control.

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
- `components/reports/settlement/SettlementReportPdfPreviewButton.tsx`
  - owner-only UI shell;
  - opens the generated PDF in the browser PDF viewer after template and font smoke tests pass;
  - does not provide a custom in-app download button in the first version.

## 5. Font Strategy

Traditional Chinese must be handled with bundled local font files.

Decision:

- use Noto Sans TC as the first PDF font family;
- license basis: SIL Open Font License via the official Noto/Google Fonts distribution;
- use this font because it is designed for Traditional Chinese usage in Taiwan/Macau, is legible for tables, and fits BoothBook's quiet operational brand tone.

Recommended future asset path:

- store font files under a dedicated local asset path such as `public/fonts/report/`;
- first staged asset: `public/fonts/report/NotoSansTC-VariableFont_wght.ttf`;
- keep the variable font only if the PDF renderer smoke test proves weight selection and Traditional Chinese glyph output are stable;
- fall back to static regular/medium/bold TTF or WOFF files if the renderer cannot handle the variable font reliably;
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

PDF preview/export remains owner-only.

Required checks before showing or enabling a future browser PDF preview action:

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
- PDF dependency allowed only after explicit approval and smoke guardrails.

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

Before enabling browser PDF preview:

- owner-only route shows preview action only for owner;
- generated PDF opens in the browser PDF viewer from local fixture data;
- browser viewer download remains available through the viewer, not through a custom app download button;
- button remains absent for staff roles;
- no Supabase write/read is triggered by export.

## 10. Implementation Slices

### Slice H: PDF View Model

Status: completed as pure TypeScript view model and fixture tests.

Result record:

- `lib/reporting/settlement-report-pdf-view-model.ts`
- `tests/settlement-report-pdf-view-model.test.ts`

Allowed:

- pure TypeScript view model;
- fixture tests;
- no React;
- no PDF dependency;
- no browser APIs.

### Slice I: Font Asset Staging

Status: completed as local asset and guardrail work.

Decision:

- first font family: Noto Sans TC;
- license basis: SIL Open Font License;
- style fit: clean Traditional Chinese sans-serif for operational reports;
- staged asset: `public/fonts/report/NotoSansTC-VariableFont_wght.ttf`;
- license notice: `public/fonts/report/LICENSE-NotoSansTC.txt`;
- asset size: must stay within the first-slice 15 MB budget;
- render smoke test must verify variable-font compatibility before PDF template work is treated as usable.

Remaining decision before rendering:

- whether `@react-pdf/renderer` can register and render the variable font correctly;
- whether to keep the variable font or replace it with static regular/medium/bold files;
- exact font registration code.

### Slice J: Install PDF Library

Status: completed.

Result:

- installed `@react-pdf/renderer`;
- updated `package.json` and `package-lock.json`;
- no production component or browser preview UI was added.

### Slice K: Minimal Font Smoke Test

Status: completed.

Result:

- renders a minimal A4 PDF buffer in Node using `renderToBuffer`;
- registers `public/fonts/report/NotoSansTC-VariableFont_wght.ttf`;
- verifies the generated PDF starts with `%PDF-`;
- verifies embedded Traditional Chinese font signals: `ToUnicode`, `CIDFontType2`, `Identity-H`, and `NotoSansTC`;
- does not write a PDF file to disk;
- no download UI;
- no production user action.

Finding:

- Variable font glyph rendering passed.
- The embedded font face currently appears as a Noto Sans TC variable-font face with thin-weight naming in the generated PDF.
- This means glyph availability is proven, but weight quality is not accepted for final report output yet.
- Before formal report template work, run a visual PDF review or replace the variable font with static regular/medium/bold files if the typography is too light.

### Slice L: PDF Template Prototype

Status: completed.

Result:

- fixture-only PDF document that uses the settlement report PDF view model;
- renders all five fixed A4 pages from `SettlementReportPdfViewModel`;
- renders in Node test through `renderToBuffer`;
- verifies five PDF page objects and Noto Sans TC embedding;
- no download UI;
- no production user action.

### Slice M: Owner-Only Browser PDF Preview UI

Status: completed.

Result:

- adds an owner-only browser preview shell on `/reports/settlement`;
- builds the PDF from the existing local report model and PDF view model;
- opens a generated blob URL in the browser PDF viewer;
- uses the browser viewer for any user-initiated local save action;
- does not add a custom download button;
- does not store generated PDFs;
- does not send report data to Supabase or a server route;
- does not expose manager, operator, or viewer export.

### Slice N: Browser Visual Validation And Template Polish

Status: completed as fixture artifact generation, browser-attempt documentation, and PDF template polish.

Result:

- adds `tests/settlement-report-pdf-browser-visual.test.ts`;
- renders a readable owner-only fixture PDF in memory by default;
- can write `.codex-artifacts/settlement-report-visual-validation.pdf` only when `WRITE_SETTLEMENT_PDF_ARTIFACT=1`;
- improves the PDF template with a stronger cover hero, warm-neutral metric cards, table framing, warning limits, action limits, page badges, and refined footer;
- registers the staged Noto Sans TC variable font for regular, medium, and bold weights through the same local asset;
- keeps the PDF document free of IndexedDB, Supabase, sync, recovery, browser download, and data-source imports.

Validation note:

- Direct `file://` PDF viewing is blocked by the in-app browser security policy.
- Direct in-app navigation to the localhost PDF viewer can be blocked because the browser PDF viewer internally redirects through a `data:` error page when unavailable.
- The accepted automated guardrail is therefore: render PDF buffer, verify five pages, verify font embedding through existing smoke/template tests, and optionally emit the fixture PDF artifact for manual browser inspection.

Still blocked:

- custom in-app download UI;
- server-side PDF generation;
- generated-PDF storage;
- manager/staff export;
- Supabase reads or writes;
- scoring/model changes;
- sync/recovery changes.

## 11. Stop Conditions

Stop for decision before:

- adding or replacing font files beyond the staged `NotoSansTC-VariableFont_wght.ttf` asset;
- adding browser download behavior;
- adding server route PDF generation;
- sending report data to Supabase or a server;
- changing permissions;
- using manager/staff report export;
- changing report scoring;
- rendering charts beyond simple bars;
- storing generated PDFs.

## 12. Current Decision

Completed:

- technical plan;
- Noto Sans TC font-family decision;
- pure PDF view model.
- local Noto Sans TC variable font asset staging.
- PDF runtime installation.
- minimal Traditional Chinese font smoke test.
- fixture-only five-page PDF template prototype.
- owner-only browser PDF preview shell.
- fixture visual validation and PDF template polish.

Recommended next path:

1. Run owner-page manual smoke with real local owner data when the user is available to log in.
2. If typography still appears too light in the actual browser viewer, replace the variable font with static Noto Sans TC regular/medium/bold files as a separate low-risk asset slice.
3. Add overflow-focused fixtures if real reports show long warnings, long product names, or many action items.
4. Keep custom download UI, server-side generation, Supabase reads, manager/staff export, and generated-PDF storage blocked until separate approval.

The next step is owner-page manual smoke with authenticated local data. Treat any custom download UI, role expansion, server route, or generated-PDF storage as a separate decision boundary.
