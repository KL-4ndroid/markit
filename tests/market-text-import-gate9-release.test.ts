import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { resolveMarketTextImportReleaseGateStatus } from '../lib/market-text-import/release-gate';

const root = join(__dirname, '..');
const read = (path: string): string => readFileSync(join(root, path), 'utf8');

const addForm = read('components/markets/AddMarketForm.tsx');
const panel = read('components/markets/MarketTextImportPanel.tsx');
const autosave = read('lib/form-autosave.ts');
const envExample = read('.env.example');
const releaseReport = read('docs/MARKET_TEXT_IMPORT_GATE_9_RELEASE_READINESS_2026_09_17.md');

assert.deepEqual(
  resolveMarketTextImportReleaseGateStatus({ nodeEnv: 'development' }),
  { enabled: true, environment: 'local', reason: 'local_default' },
);
assert.equal(resolveMarketTextImportReleaseGateStatus({
  nodeEnv: 'development',
  explicitSetting: '0',
}).enabled, false);
assert.equal(resolveMarketTextImportReleaseGateStatus({
  nodeEnv: 'production',
  publicAppEnv: 'preview',
  explicitSetting: '1',
}).enabled, true);
assert.equal(resolveMarketTextImportReleaseGateStatus({
  nodeEnv: 'production',
  publicAppEnv: 'preview',
}).enabled, false);
assert.equal(resolveMarketTextImportReleaseGateStatus({
  nodeEnv: 'production',
  publicAppEnv: 'production',
  explicitSetting: '1',
  allowProductionSetting: '0',
}).enabled, false);
assert.equal(resolveMarketTextImportReleaseGateStatus({
  nodeEnv: 'production',
  publicAppEnv: 'production',
  explicitSetting: '1',
  allowProductionSetting: '1',
}).enabled, true);

assert.match(addForm, /MARKET_TEXT_IMPORT_ENABLED\s*\?\s*\(/);
assert.match(addForm, /MARKET_TEXT_IMPORT_ENABLED \? savedDraft\.data\.marketTextImportInput/);
assert.match(envExample, /NEXT_PUBLIC_MARKET_TEXT_IMPORT_ENABLED=1/);
assert.match(envExample, /NEXT_PUBLIC_MARKET_TEXT_IMPORT_ALLOW_PRODUCTION=0/);

const submitBlock = addForm.slice(addForm.indexOf('const handleSubmit'), addForm.indexOf('const operatingStartTime'));
assert.doesNotMatch(submitBlock, /marketTextImportInput|inputText|ParsedMarketDraft/);
assert.match(submitBlock, /await createMarket\(payload\)/);
assert.match(autosave, /const AUTOSAVE_EXPIRY = 30 \* 60 \* 1000/);
assert.match(panel, /原文只在此裝置分析/);
assert.match(panel, /最多保留 30 分鐘/);
assert.match(panel, /不會傳給 LLM、寫入市集或分析紀錄/);
assert.doesNotMatch(panel, /fetch\(|XMLHttpRequest|sendBeacon|track\(|capture\(|identify\(/);
assert.doesNotMatch(panel, /console\.error\([^)]*(?:inputText|error)/s);

for (const path of [
  'lib/market-text-import/parser.ts',
  'lib/market-text-import/types.ts',
  'lib/market-text-import/validation.ts',
  'lib/market-text-import/merge.ts',
]) {
  const source = read(path);
  assert.doesNotMatch(
    source,
    /\b(?:window|document|navigator|localStorage|sessionStorage|indexedDB)\s*\.|@capacitor\/|from ['"](?:react|next\/)/,
    `${path} must remain platform neutral`,
  );
}

assert.match(panel, /<label className="mt-3 flex min-h-11 cursor-pointer/);
assert.match(panel, /<summary className="min-h-11 cursor-pointer py-3/);
assert.match(panel, /sm:flex-row/);
assert.match(panel, /sm:grid-cols-2/);
assert.match(panel, /aria-live="polite"/);
assert.match(panel, /aria-label={`套用/);
assert.doesNotMatch(panel, /onClick=\{handleApply\}[\s\S]{0,220}type="submit"/);

for (const marker of [
  '完整建置與回歸',
  '隱私邊界',
  '跨平台可攜性',
  '漸進開放與回退',
  '不自動送出',
]) {
  assert.ok(releaseReport.includes(marker), `Gate 9 report missing ${marker}`);
}

console.log('market text import Gate 9 release, privacy, accessibility, and portability guardrails passed');
