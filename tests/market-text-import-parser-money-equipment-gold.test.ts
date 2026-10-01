import assert from 'node:assert/strict';
import { join } from 'node:path';

import { parseMarketText } from '../lib/market-text-import/parser';
import type {
  FieldCandidate,
  ParsedEquipmentValue,
  ParsedMarketDraft,
  ParsedMoneyValue,
} from '../lib/market-text-import/types';
import { loadFullGoldEvaluationTargets } from './fixtures/market-text-import-gold-full-evaluator';

const projectRoot = join(__dirname, '..');
const targets = loadFullGoldEvaluationTargets(projectRoot);
const parsed = new Map<string, ParsedMarketDraft>();

for (const target of targets) {
  const response = parseMarketText({
    inputText: target.inputText,
    referenceDate: target.referenceDate,
    locale: 'zh-TW',
  });
  if (response.ok === false) assert.fail(`${target.fixtureId}: parser returned ${response.error.code}`);
  parsed.set(target.fixtureId, response.draft);

  if (target.disposition === 'reject') {
    assert.equal(response.draft.disposition, 'reject', `${target.fixtureId}: reject disposition leaked`);
    assert.deepEqual(response.draft.events, [], `${target.fixtureId}: reject must have no events`);
  }

  for (const candidate of response.draft.events.flatMap((event) => event.candidates)) {
    if (candidate.field === 'boothCost' && candidate.applyPolicy === 'eligible') {
      const value = candidate.value as ParsedMoneyValue;
      assert.equal(value.role, 'selected_booth_total', `${target.fixtureId}: published price became eligible`);
      assert.equal(value.currency, 'TWD', `${target.fixtureId}: unknown currency became eligible`);
    }
    if (candidate.field === 'deposit' && candidate.applyPolicy === 'eligible') {
      const value = candidate.value as ParsedMoneyValue;
      assert.equal(value.role, 'deposit');
      assert.equal(value.currency, 'TWD');
    }
    if (candidate.field === 'notes') {
      const value = candidate.value as ParsedMoneyValue | ParsedEquipmentValue | null;
      if (value && 'role' in value && ['payment_total', 'payment_received', 'payment_due'].includes(value.role)) {
        assert.equal(candidate.applyPolicy, 'never', `${target.fixtureId}: payment amount became applicable`);
      }
    }
    if (['tableFree', 'chairFree', 'umbrellaFree'].includes(candidate.field) && candidate.applyPolicy === 'eligible') {
      const value = candidate.value as ParsedEquipmentValue;
      assert.equal(value.provision, 'included_free', `${target.fixtureId}: non-free equipment became free`);
    }
    if (candidate.status === 'choice_required') {
      assert.ok((candidate.options?.length ?? 0) >= 2, `${target.fixtureId}: choice has fewer than two options`);
      candidate.options?.forEach((option) => {
        assert.ok(option.linkedCandidateIds.includes(candidate.id), `${target.fixtureId}: option link is incomplete`);
      });
    }
  }
}

const candidates = (fixtureId: string): FieldCandidate<unknown>[] => {
  const draft = parsed.get(fixtureId);
  assert.ok(draft, `missing parsed fixture ${fixtureId}`);
  return draft.events.flatMap((event) => event.candidates);
};

const find = (fixtureId: string, field: string, reasonCode?: string): FieldCandidate<unknown> => {
  const candidate = candidates(fixtureId).find((item) => (
    item.field === field && (reasonCode === undefined || item.reasonCode === reasonCode)
  ));
  assert.ok(candidate, `${fixtureId}: missing ${field}${reasonCode ? `/${reasonCode}` : ''}`);
  return candidate;
};

const selected4000 = find('MTI-REP-0007-P02', 'boothCost').value as ParsedMoneyValue;
assert.equal(selected4000.amount, 4000);
assert.equal(selected4000.role, 'selected_booth_total');
assert.equal(find('MTI-REP-0007-P02', 'boothCost').applyPolicy, 'eligible');

const linkedBooth = find('MTI-REP-0011-P01', 'boothCost');
const linkedLocation = find('MTI-REP-0011-P01', 'location');
assert.equal(linkedBooth.status, 'choice_required');
assert.equal(linkedBooth.options?.length, 2);
assert.equal(linkedLocation.status, 'choice_required');
linkedBooth.options?.forEach((option) => assert.ok(option.linkedCandidateIds.includes(linkedLocation.id)));
linkedLocation.options?.forEach((option) => assert.ok(option.linkedCandidateIds.includes(linkedBooth.id)));

const publicPrices = find('MTI-REP-0066-P02', 'boothCost');
assert.equal(publicPrices.status, 'choice_required');
assert.equal(publicPrices.applyPolicy, 'requires_option');
assert.deepEqual(publicPrices.options?.map((option) => (option.value as ParsedMoneyValue).amount), [450, 800]);

assert.equal(find('MTI-REP-0063-P02', 'tableFree').applyPolicy, 'eligible');
assert.equal(find('MTI-REP-0063-P02', 'chairFree').applyPolicy, 'eligible');
assert.equal(find('MTI-REP-0063-P02', 'umbrellaFree').applyPolicy, 'eligible');
assert.equal(find('MTI-REP-0063-P02', 'notes', 'payment_amount_not_booth_cost').applyPolicy, 'never');

assert.equal(candidates('MTI-REP-0067-P01').some((candidate) => candidate.field === 'tableFree'), false);
assert.equal(find('MTI-REP-0067-P01', 'umbrellaFree').applyPolicy, 'eligible');
assert.equal(find('MTI-REP-0067-P01', 'boothCost').options?.length, 3);

const correctedComponents = find('MTI-REP-0085-P02', 'boothCost').value as ParsedMoneyValue;
assert.equal(correctedComponents.amount, 2400);
assert.equal(correctedComponents.role, 'selected_booth_total');
assert.equal(candidates('MTI-REP-0085-P02').filter((candidate) => candidate.reasonCode === 'payment_amount_not_booth_cost').length, 2);

assert.equal(find('MTI-REP-0086-P01', 'boothCost').status, 'unsupported');
assert.equal(find('MTI-REP-0086-P01', 'boothCost').applyPolicy, 'never');
assert.equal(find('MTI-REP-0090-P01', 'boothCost').reasonCode, 'external_booth_cost_unavailable');
assert.equal(find('MTI-REP-0090-P01', 'boothCost').applyPolicy, 'never');

const ambiguousCost = candidates('MTI-REP-0097-P02').filter((candidate) => candidate.field === 'boothCost');
assert.equal(ambiguousCost.some((candidate) => candidate.status === 'choice_required'), true);
assert.equal(ambiguousCost.some((candidate) => candidate.status === 'unsupported'), true);
assert.equal(ambiguousCost.some((candidate) => candidate.applyPolicy === 'eligible'), false);

const equipmentStateInput = [
  '設備狀態測試市集',
  '活動日期：2026/10/03',
  '地點：高雄中央公園',
  '主辦提供長桌1張。',
  '可租椅子20元／張。',
  '電力請自備。',
  '不提供帳篷。',
  '禁止使用瓦斯設備。',
].join('\n');
const equipmentStateResult = parseMarketText({
  inputText: equipmentStateInput,
  referenceDate: '2026-09-16',
  locale: 'zh-TW',
});
assert.equal(equipmentStateResult.ok, true);
if (equipmentStateResult.ok) {
  const stateCandidates = equipmentStateResult.draft.events.flatMap((event) => event.candidates);
  const provisions = stateCandidates
    .map((candidate) => candidate.value as ParsedEquipmentValue | null)
    .filter((value): value is ParsedEquipmentValue => Boolean(value && typeof value === 'object' && 'provision' in value))
    .map((value) => value.provision);
  assert.ok(provisions.includes('included_free'));
  assert.ok(provisions.includes('rentable'));
  assert.ok(provisions.includes('self_provided'));
  assert.ok(provisions.includes('not_provided'));
  assert.ok(provisions.includes('forbidden'));
  assert.equal(
    stateCandidates.filter((candidate) => candidate.applyPolicy === 'eligible').every((candidate) => candidate.field === 'name' || candidate.field === 'dates' || candidate.field === 'location' || candidate.field === 'tableFree'),
    true,
  );
}

const rejectCount = targets.filter((target) => target.disposition === 'reject').length;
const applicableBoothCount = [...parsed.values()].flatMap((draft) => draft.events)
  .flatMap((event) => event.candidates)
  .filter((candidate) => candidate.field === 'boothCost' && candidate.applyPolicy === 'eligible').length;
const choiceCount = [...parsed.values()].flatMap((draft) => draft.events)
  .flatMap((event) => event.candidates)
  .filter((candidate) => candidate.status === 'choice_required').length;

console.log(
  `market text import parser Gate 6 Gold safety: fixtures=${targets.length}, rejects=${rejectCount}, eligibleBooth=${applicableBoothCount}, choices=${choiceCount}`,
);
