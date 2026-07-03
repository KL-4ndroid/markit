import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const formAutosaveSource = readProjectFile('lib/form-autosave.ts');
const addMarketFormSource = readProjectFile('components/markets/AddMarketForm.tsx');

console.log('\n=== Form draft autosave guardrails ===');

runTest('form autosave utility does not log draft payloads', () => {
  assert.doesNotMatch(formAutosaveSource, /console\.(log|info|debug|warn)\(/);
  assert.doesNotMatch(formAutosaveSource, /console\.error\([^)]*,\s*data\s*\)/);
});

runTest('form autosave stays session-only and does not write durable stores', () => {
  assert.match(formAutosaveSource, /sessionStorage\.setItem/);
  assert.match(formAutosaveSource, /sessionStorage\.getItem/);
  assert.match(formAutosaveSource, /sessionStorage\.removeItem/);
  assert.doesNotMatch(formAutosaveSource, /localStorage\.setItem|localStorage\.getItem/);
  assert.doesNotMatch(formAutosaveSource, /supabase|Dexie|indexedDB|db\./i);
});

runTest('AddMarketForm uses an authenticated user-scoped add-market draft id', () => {
  assert.match(addMarketFormSource, /useAuth\(\)/);
  assert.match(addMarketFormSource, /`add-market:\$\{user\.id\}`/);
  assert.doesNotMatch(addMarketFormSource, /add-market:\$\{user\.email\}/);
});

runTest('AddMarketForm restores before saving and avoids empty-default overwrite', () => {
  const loadIndex = addMarketFormSource.indexOf('const savedDraft = loadFormData(draftId)');
  const readyIndex = addMarketFormSource.indexOf('setDraftReady(true)', loadIndex);
  const meaningfulIndex = addMarketFormSource.indexOf('hasMeaningfulMarketDraft(currentDraft)', readyIndex);
  const saveIndex = addMarketFormSource.indexOf('saveFormData(draftId, currentDraft)', meaningfulIndex);

  assert.ok(loadIndex > 0, 'draft load must exist');
  assert.ok(readyIndex > loadIndex, 'draft must become ready after load/restore');
  assert.ok(meaningfulIndex > readyIndex, 'autosave must check meaningful content after restore path');
  assert.ok(saveIndex > meaningfulIndex, 'save must happen only after meaningful-content guard');
});

runTest('AddMarketForm clears draft after successful createMarket', () => {
  const submitIndex = addMarketFormSource.indexOf('const handleSubmit');
  const createIndex = addMarketFormSource.indexOf('await createMarket(payload)', submitIndex);
  const clearIndex = addMarketFormSource.indexOf('clearFormData(draftId)', createIndex);

  assert.ok(createIndex > submitIndex, 'createMarket must run inside submit handler');
  assert.ok(clearIndex > createIndex, 'draft clear must happen after successful createMarket');
});

runTest('AddMarketForm routes close actions through dirty guard instead of direct close', () => {
  assert.match(addMarketFormSource, /const handleRequestClose = \(\) =>/);
  assert.match(addMarketFormSource, /setShowDraftCloseConfirm\(true\)/);
  assert.doesNotMatch(addMarketFormSource, /onClick=\{onClose\}/);

  const closeActionMatches = addMarketFormSource.match(/onClick=\{handleRequestClose\}/g) || [];
  assert.ok(closeActionMatches.length >= 3, 'backdrop, header close, and footer cancel should use the dirty guard');
});

runTest('AddMarketForm keep/discard choices preserve or clear drafts explicitly', () => {
  const keepStart = addMarketFormSource.indexOf('const handleKeepDraftAndClose');
  const discardStart = addMarketFormSource.indexOf('const handleDiscardDraftAndClose');
  const changeStart = addMarketFormSource.indexOf('const handleChange', discardStart);
  const keepSource = addMarketFormSource.slice(keepStart, discardStart);
  const discardSource = addMarketFormSource.slice(discardStart, changeStart);

  assert.ok(keepStart > 0, 'keep draft handler must exist');
  assert.ok(discardStart > keepStart, 'discard draft handler must exist after keep handler');
  assert.doesNotMatch(keepSource, /clearFormData\(draftId\)/);
  assert.match(discardSource, /clearFormData\(draftId\)/);
  assert.match(discardSource, /resetFormState\(\)/);
});

runTest('AddMarketForm protects browser reload only while dirty', () => {
  assert.match(addMarketFormSource, /addEventListener\('beforeunload', handleBeforeUnload\)/);
  assert.match(addMarketFormSource, /removeEventListener\('beforeunload', handleBeforeUnload\)/);
  assert.match(addMarketFormSource, /if \(!isOpen \|\| !hasDirtyDraft\) return/);
  assert.doesNotMatch(addMarketFormSource, /event\.returnValue\s*=\s*['"`][^'"`]+['"`]/);
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
    throw new Error(`${failed} form draft autosave tests failed`);
  }
}

main();
