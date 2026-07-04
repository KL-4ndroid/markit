import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function section(source: string, start: string, end?: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);

  if (!end) return source.slice(startIndex);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

const cardSource = readProjectFile('components/markets/SalesPhotoEvidenceOperatingCard.tsx');
const ownerPageSource = readProjectFile('app/markets/[id]/page.tsx');
const staffViewSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };

console.log('\n=== Sales photo evidence Slice 4 operating UI ===');

runTest('operating card is UI-only and has owner/staff modes', () => {
  assert.match(cardSource, /export function SalesPhotoEvidenceOperatingCard/);
  assert.match(cardSource, /mode: 'owner' \| 'staff'/);
  assert.match(cardSource, /pendingCount\?: number/);
  assert.match(cardSource, /onToggle\?: \(\) => void/);
  assert.match(cardSource, /onOpenPendingEvidence\?: \(\) => void/);
  assert.match(cardSource, /const canToggle = isOwner && typeof onToggle === 'function'/);
  assert.doesNotMatch(cardSource, /sale_photo_evidence|uploadEvidence|getUserMedia|signedUrl|signed_url|R2/i);
  assert.doesNotMatch(cardSource, /recordEvent|updateMarket|supabase|db\./);
});

runTest('owner operating screen can toggle the requirement without creating evidence rows', () => {
  assert.match(ownerPageSource, /import \{ SalesPhotoEvidenceOperatingCard \}/);
  const operatingBlock = section(ownerPageSource, '{isOperating && (', '/* 3. 營業狀態卡片');
  assert.match(operatingBlock, /<SalesPhotoEvidenceOperatingCard[\s\S]*mode="owner"/);
  assert.match(operatingBlock, /required=\{salesPhotoEvidenceRequired\}/);
  assert.match(operatingBlock, /onToggle=\{handleToggleSalesPhotoEvidence\}/);
  assert.match(operatingBlock, /pendingCount=\{0\}/);
  assert.doesNotMatch(operatingBlock, /sale_photo_evidence|uploadEvidence|getUserMedia|signedUrl|signed_url/i);

  const settingsBlock = section(ownerPageSource, '/* 7. 每日收入統計', '<DailyRevenueStats');
  assert.match(settingsBlock, /\{!isOperating && \(/);
});

runTest('staff operating screen shows read-only indicator and never receives a toggle handler', () => {
  assert.match(staffViewSource, /import \{ SalesPhotoEvidenceOperatingCard \}/);
  assert.match(staffViewSource, /const salesPhotoEvidenceRequired = Boolean\(market\.salesPhotoEvidenceRequired\)/);
  const operatingBlock = section(staffViewSource, '{isOperating && (', '<MarketFieldOpsSection');
  assert.match(operatingBlock, /<SalesPhotoEvidenceOperatingCard[\s\S]*mode="staff"/);
  assert.match(operatingBlock, /required=\{salesPhotoEvidenceRequired\}/);
  assert.match(operatingBlock, /pendingCount=\{0\}/);
  assert.doesNotMatch(operatingBlock, /onToggle=\{handleToggleSalesPhotoEvidence\}|updateMarket\(|recordEvent\(/);
});

runTest('plan and npm test include Slice 4 operating UI guardrails', () => {
  assert.match(planSource, /Slice 4: Active Operating Toggle and Indicator[\s\S]*Status:[\s\S]*implemented/);
  assert.match(planSource, /owner operating-screen toggle/);
  assert.match(planSource, /read-only indicator for staff/);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-slice4-operating-ui\.test\.ts/);
});

function main(): void {
  let failed = 0;

  for (const test of tests) {
    try {
      test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} sales photo evidence Slice 4 tests failed`);
  }
}

main();
