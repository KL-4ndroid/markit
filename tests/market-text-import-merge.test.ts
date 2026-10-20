import assert from 'node:assert/strict';

import { buildMarketTextImportPatch } from '../lib/market-text-import/merge';
import type { ParsedMarketEvent } from '../lib/market-text-import/types';

const event: ParsedMarketEvent = {
  id: 'event-1',
  label: '秋日市集',
  candidateIds: ['name', 'dates', 'cost', 'payment', 'table', 'location'],
  candidates: [
    {
      id: 'name', field: 'name', status: 'exact', value: '秋日市集', evidenceIds: ['e1'],
      reasonCode: 'explicit_market_name', applyPolicy: 'eligible',
    },
    {
      id: 'dates', field: 'dates', status: 'exact', value: { kind: 'selected_dates', dates: ['2026-10-03', '2026-10-04'] },
      evidenceIds: ['e2'], reasonCode: 'explicit_event_dates', applyPolicy: 'eligible',
    },
    {
      id: 'cost', field: 'boothCost', status: 'choice_required', value: null, evidenceIds: ['e3'],
      reasonCode: 'published_booth_options', applyPolicy: 'requires_option',
      options: [
        {
          id: 'cost-1', evidenceIds: ['e3'], linkedCandidateIds: ['cost', 'location'],
          value: { amount: 800, currency: 'TWD', currencyStatus: 'inferable', role: 'published_booth_price', unit: 'per_day' },
        },
        {
          id: 'cost-2', evidenceIds: ['e3'], linkedCandidateIds: ['cost', 'location'],
          value: { amount: 1200, currency: 'TWD', currencyStatus: 'inferable', role: 'published_booth_price', unit: 'per_day' },
        },
      ],
    },
    {
      id: 'payment', field: 'notes', status: 'ignore', value: {
        amount: 2000, currency: 'TWD', currencyStatus: 'inferable', role: 'payment_due', unit: 'unknown',
      }, evidenceIds: ['e4'], reasonCode: 'payment_amount_not_booth_cost', applyPolicy: 'never',
    },
    {
      id: 'table', field: 'tableFree', status: 'exact', value: {
        type: 'table', provision: 'included_free', quantity: 1,
      }, evidenceIds: ['e5'], reasonCode: 'included_equipment', applyPolicy: 'eligible',
    },
    {
      id: 'location', field: 'location', status: 'choice_required', value: null, evidenceIds: ['e6'],
      reasonCode: 'location_depends_on_stall_type', applyPolicy: 'requires_option',
      options: [
        { id: 'location-1', value: '大勇區', evidenceIds: ['e6'], linkedCandidateIds: ['location', 'cost'] },
        { id: 'location-2', value: '大義區', evidenceIds: ['e6'], linkedCandidateIds: ['location', 'cost'] },
      ],
    },
  ],
};

const patch = buildMarketTextImportPatch(event, [
  { candidateId: 'name' },
  { candidateId: 'dates' },
  { candidateId: 'cost', optionId: 'cost-2' },
  { candidateId: 'location', optionId: 'location-2' },
  { candidateId: 'payment' },
  { candidateId: 'table' },
]);

assert.deepEqual(patch.formData, {
  name: '秋日市集',
  dates: ['2026-10-03', '2026-10-04'],
  boothCost: 1200,
  location: '大義區',
});
assert.deepEqual(patch.equipmentFree, { tableFree: true });
assert.deepEqual(patch.appliedCandidateIds, ['name', 'dates', 'cost', 'location', 'table']);
assert.equal('notes' in patch.formData, false, 'payment totals must never enter the form');

const noOption = buildMarketTextImportPatch(event, [{ candidateId: 'cost' }]);
assert.deepEqual(noOption.formData, {}, 'choice candidates require an explicit option');

console.log('market text import Gate 7 merge planner passed');
