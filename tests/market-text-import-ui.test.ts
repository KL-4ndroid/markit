import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const addForm = readFileSync(join(root, 'components/markets/AddMarketForm.tsx'), 'utf8');
const panel = readFileSync(join(root, 'components/markets/MarketTextImportPanel.tsx'), 'utf8');
const merge = readFileSync(join(root, 'lib/market-text-import/merge.ts'), 'utf8');

assert.match(addForm, /<MarketTextImportPanel/);
assert.match(addForm, /marketTextImportInput/);
assert.match(addForm, /hasImportText/);
assert.match(addForm, /onApply=\{handleImportApply\}/);
assert.doesNotMatch(
  addForm.slice(addForm.indexOf('const handleImportApply'), addForm.indexOf('const focusFirstError')),
  /createMarket|handleSubmit|onSuccess/,
  'applying parsed fields must not submit or create a market',
);

assert.match(panel, /<textarea/);
assert.match(panel, />\s*分析資訊\s*</);
assert.match(panel, />\s*套用已選欄位\s*</);
assert.match(panel, /type="checkbox"/);
assert.match(panel, /type="radio"/);
assert.match(panel, /查看判定原文/);
assert.match(panel, /目前已有內容/);
assert.match(panel, /原文已變更，請重新分析後再套用/);
assert.match(panel, /await import\('@\/lib\/market-text-import\/parser'\)/);
assert.doesNotMatch(panel, /^import \{ parseMarketText \}/m, 'parser should stay out of the initial form bundle');
assert.doesNotMatch(panel, /fetch\(|createMarket|supabase|from ['"][^'"]*(?:openai|llm)/i);

assert.doesNotMatch(merge, /\b(?:window|document|navigator|localStorage|sessionStorage|indexedDB)\b/);
assert.match(merge, /candidate\.applyPolicy === 'eligible'/);
assert.match(merge, /candidate\.applyPolicy === 'requires_option' && Boolean\(selection\.optionId\)/);

console.log('market text import Gate 7 preview UI and safe-merge guardrails passed');
