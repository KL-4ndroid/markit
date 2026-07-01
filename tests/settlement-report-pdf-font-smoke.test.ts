import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import React from 'react';
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const fontPath = join(projectRoot, 'public/fonts/report/NotoSansTC-VariableFont_wght.ttf');
const smokeSource = readFileSync(__filename, 'utf8');
const rendererImportBlock = smokeSource.slice(
  smokeSource.indexOf("import {"),
  smokeSource.indexOf("} from '@react-pdf/renderer';")
);
const importSection = smokeSource.slice(0, smokeSource.indexOf('type TestFn'));
const technicalPlanSource = readFileSync(
  join(projectRoot, 'docs/SETTLEMENT_REPORT_PDF_TECHNICAL_PLAN_2026_07_01.md'),
  'utf8'
);
const presentationPlanSource = readFileSync(
  join(projectRoot, 'docs/SETTLEMENT_REPORT_PRESENTATION_PLAN_2026_07_01.md'),
  'utf8'
);
const packageJsonSource = readFileSync(join(projectRoot, 'package.json'), 'utf8');
const packageJson = JSON.parse(packageJsonSource) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function buildSmokeDocument(): React.ReactElement {
  Font.register({
    family: 'BoothBook Noto Sans TC Smoke',
    src: fontPath,
    fontWeight: 400,
  });

  const styles = StyleSheet.create({
    page: {
      padding: 32,
      fontFamily: 'BoothBook Noto Sans TC Smoke',
      color: '#1f2933',
      backgroundColor: '#ffffff',
    },
    title: {
      fontSize: 20,
      marginBottom: 12,
    },
    body: {
      fontSize: 12,
      lineHeight: 1.6,
    },
  });

  return React.createElement(
    Document,
    {
      title: 'BoothBook 繁體中文 PDF 字型測試',
      author: 'BoothBook',
      language: 'zh-TW',
    },
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        null,
        React.createElement(Text, { style: styles.title }, '出攤本 繁體中文報告測試'),
        React.createElement(
          Text,
          { style: styles.body },
          '品牌月結報告｜總營收 NT$12,345｜淨利 NT$6,789｜建議再參加｜資料信心度：高'
        )
      )
    )
  );
}

console.log('\n=== Settlement report PDF font smoke ===');

runTest('installs react-pdf renderer as an explicit PDF runtime dependency', () => {
  assert.match(packageJson.dependencies?.['@react-pdf/renderer'] ?? '', /^\^4\./);
});

runTest('renders a minimal Traditional Chinese PDF buffer with the local Noto Sans TC asset', async () => {
  assert.equal(existsSync(fontPath), true);

  const buffer = await renderToBuffer(buildSmokeDocument());
  const pdfSource = buffer.toString('latin1');

  assert.equal(Buffer.isBuffer(buffer), true);
  assert.match(buffer.subarray(0, 8).toString('latin1'), /^%PDF-/);
  assert.ok(buffer.length > 3000, `Expected a non-trivial PDF buffer, got ${buffer.length} bytes`);
  assert.match(pdfSource, /ToUnicode/);
  assert.match(pdfSource, /CIDFontType2/);
  assert.match(pdfSource, /Identity-H/);
  assert.match(pdfSource, /NotoSansTC/);
});

runTest('font smoke test does not create files or browser-facing preview behavior', () => {
  assert.doesNotMatch(rendererImportBlock, /renderToFile|PDFViewer|PDFDownloadLink|BlobProvider|usePDF/);
  assert.doesNotMatch(importSection, /@\/lib\/db|@\/lib\/supabase|dexie|useLiveQuery/);
});

runTest('plans record package installation and font smoke result without approving UI', () => {
  assert.match(technicalPlanSource, /Slice J: Install PDF Library[\s\S]*Status: completed/);
  assert.match(technicalPlanSource, /Slice K: Minimal Font Smoke Test[\s\S]*Status: completed/);
  assert.match(technicalPlanSource, /Variable font glyph rendering passed/);
  assert.match(technicalPlanSource, /weight quality is not accepted for final report output yet/);
  assert.match(presentationPlanSource, /Slice J: PDF Runtime Install and Font Smoke[\s\S]*Status: completed/);
  assert.match(presentationPlanSource, /No formal PDF template, browser preview UI, download behavior/);
});

runTest('full test suite includes PDF font smoke guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/settlement-report-pdf-font-smoke\.test\.ts/);
});

async function main(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} settlement report PDF font smoke tests failed`);
  }
}

void main();
