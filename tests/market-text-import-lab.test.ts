import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildMarketTextImportLabReviewRecord } from '../lib/market-text-import/lab-review';
import type { ParsedMarketDraft } from '../lib/market-text-import/types';

const rawInput = '私密市集名稱\n聯絡人：0912-345-678\n地點：不應輸出';
const draft: ParsedMarketDraft = {
  schemaVersion: 1,
  disposition: 'single_candidate',
  readiness: 'reviewable_core',
  events: [{
    id: 'event-1',
    label: '私密市集名稱',
    candidateIds: ['candidate-1'],
    candidates: [{
      id: 'candidate-1',
      field: 'name',
      status: 'exact',
      value: '私密市集名稱',
      evidenceIds: ['evidence-1'],
      reasonCode: 'explicit_market_name',
      applyPolicy: 'eligible',
    }],
  }],
  evidence: [{ id: 'evidence-1', source: 'input_text', start: 0, end: 5, text: '私密市集名稱' }],
  warnings: [{ id: 'warning-1', code: 'private_content_detected', severity: 'warning', evidenceIds: ['evidence-1'] }],
  ignoreSpans: [],
  sensitiveSpans: [{ evidenceId: 'evidence-1', category: 'phone_or_contact' }],
};

const review = buildMarketTextImportLabReviewRecord({
  inputText: rawInput,
  referenceDate: '2026-10-01',
  draft,
  verdicts: { 'candidate-1': 'needs_rule' },
  note: '  請補充規則  ',
});
const serialized = JSON.stringify(review);

assert.equal(review.input.characterCount, Array.from(rawInput).length);
assert.equal(review.input.sensitiveContentDetected, true);
assert.deepEqual(review.parser.warningCodes, ['private_content_detected']);
assert.deepEqual(review.parser.candidateReviews, [{
  candidateId: 'candidate-1',
  field: 'name',
  status: 'exact',
  reasonCode: 'explicit_market_name',
  applyPolicy: 'eligible',
  verdict: 'needs_rule',
}]);
assert.equal(review.reviewer.note, '請補充規則');
assert.doesNotMatch(serialized, /私密市集名稱|0912-345-678|不應輸出/);
assert.doesNotMatch(serialized, /evidence-1/);

const root = join(__dirname, '..');
const lab = readFileSync(join(root, 'components/markets/MarketTextImportLab.tsx'), 'utf8');
const route = readFileSync(join(root, 'app/tools/market-text-import-lab/page.tsx'), 'utf8');
const appSettings = readFileSync(join(root, 'app/settings/app/page.tsx'), 'utf8');

assert.match(lab, /await import\('@\/lib\/market-text-import\/parser'\)/);
assert.doesNotMatch(lab, /\b(?:fetch|supabase|dexie|indexedDB|localStorage|sessionStorage|navigator|clipboard|createMarket)\b/i);
assert.match(lab, /Review JSON/);
assert.match(route, /useRoleContext/);
assert.match(route, /!isOwner/);
assert.match(route, /isAuthorizationFresh/);
assert.match(appSettings, /href="\/tools\/market-text-import-lab"/);
assert.match(appSettings, /isOwner/);

console.log('market text import lab privacy and owner-route guardrails passed');
