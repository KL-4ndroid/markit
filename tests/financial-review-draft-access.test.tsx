import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FinancialReviewPanel } from '../components/markets/FinancialReviewPanel';
import { FinancialReviewRepository } from '../lib/markets/financial-review-repository';
import type { useFinancialReviews } from '../hooks/useFinancialReviews';
import type { Market } from '../types/db';

const market = { id: 'm', owner_id: 'owner-a', name: 'private', status: 'completed', startDate: '2026-10-30', endDate: '2026-10-30' } as Market;
let cloudCalls = 0;
const repository = (owner: string) => new FinancialReviewRepository(owner, {
  assertIdentity: async () => { cloudCalls++; }, read: async () => { cloudCalls++; return []; }, save: async () => { cloudCalls++; },
});
function render(enabled: boolean, owner: string) {
  const finance: ReturnType<typeof useFinancialReviews> = { enabled, ready: true, loading: false, snapshots: [],
    blocked: new Set(), error: '', repository: repository(owner), refresh: async () => {} };
  return renderToStaticMarkup(<FinancialReviewPanel market={market} rawStats={[]} finance={finance} />);
}
assert.equal(render(false, 'owner-a'), '', 'Expired/disabled paid UI must reveal no draft panel');
assert.equal(render(true, 'owner-b'), '', 'Another account cannot render the owner draft interface');
assert.equal(render(true, ''), '', 'Unresolved identity stays closed');
assert.match(render(true, 'owner-a'), /核對成本與零收入/);
assert.equal(cloudCalls, 0, 'Rendering must never restore or send a mutation automatically');
console.log('PASS rendered paid draft boundary: expiry, identity mismatch, unresolved identity and no automatic cloud operations');
