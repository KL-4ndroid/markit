import type { MarketCreatedPayload } from '@/types/db';

import type {
  FieldCandidate,
  MarketFormField,
  ParsedDateValue,
  ParsedEquipmentValue,
  ParsedMarketEvent,
  ParsedMoneyValue,
  ParsedTimeValue,
} from './types';

export interface MarketTextImportSelection {
  candidateId: string;
  optionId?: string;
}

export interface MarketTextImportPatch {
  formData: Partial<MarketCreatedPayload>;
  equipmentFree: Partial<Record<'tableFree' | 'chairFree' | 'umbrellaFree', boolean>>;
  noEarlyEntry?: boolean;
  appliedCandidateIds: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const selectedValue = (
  candidate: FieldCandidate<unknown>,
  selection: MarketTextImportSelection,
): unknown => {
  if (!selection.optionId) return candidate.value;
  return candidate.options?.find((option) => option.id === selection.optionId)?.value;
};

const readTime = (field: MarketFormField, value: unknown): string | null => {
  if (!isRecord(value) || value.kind !== 'single') return null;
  const time = field === 'operatingEndTime' ? value.end : value.start;
  return typeof time === 'string' ? time : null;
};

const readDates = (value: unknown): string[] | null => {
  if (!isRecord(value) || value.kind !== 'selected_dates' || !Array.isArray(value.dates)) return null;
  const dates = value.dates.filter((date): date is string => typeof date === 'string');
  return dates.length > 0 ? dates : null;
};

const readAmount = (value: unknown): number | null => {
  if (!isRecord(value) || typeof value.amount !== 'number' || !Number.isFinite(value.amount)) return null;
  return value.amount;
};

const isEligibleSelection = (
  candidate: FieldCandidate<unknown>,
  selection: MarketTextImportSelection,
): boolean => (
  candidate.applyPolicy === 'eligible'
  || (candidate.applyPolicy === 'requires_option' && Boolean(selection.optionId))
);

export function buildMarketTextImportPatch(
  event: ParsedMarketEvent,
  selections: readonly MarketTextImportSelection[],
): MarketTextImportPatch {
  const formData: Partial<MarketCreatedPayload> = {};
  const equipmentFree: MarketTextImportPatch['equipmentFree'] = {};
  const appliedCandidateIds: string[] = [];
  let noEarlyEntry: boolean | undefined;

  for (const selection of selections) {
    const candidate = event.candidates.find((item) => item.id === selection.candidateId);
    if (!candidate || !isEligibleSelection(candidate, selection)) continue;
    const value = selectedValue(candidate, selection);
    let applied = false;

    if ((candidate.field === 'name' || candidate.field === 'location') && typeof value === 'string') {
      formData[candidate.field] = value;
      applied = true;
    } else if (candidate.field === 'dates') {
      const dates = readDates(value as ParsedDateValue);
      if (dates) {
        formData.dates = dates;
        applied = true;
      }
    } else if (
      candidate.field === 'earlyEntryTime'
      || candidate.field === 'checkInTime'
      || candidate.field === 'operatingStartTime'
      || candidate.field === 'operatingEndTime'
    ) {
      const time = readTime(candidate.field, value as ParsedTimeValue);
      if (time) {
        formData[candidate.field] = time;
        if (candidate.field === 'earlyEntryTime') noEarlyEntry = false;
        applied = true;
      }
    } else if (
      candidate.field === 'boothCost'
      || candidate.field === 'deposit'
      || candidate.field === 'commissionRate'
      || candidate.field === 'tableRental'
      || candidate.field === 'chairRental'
      || candidate.field === 'umbrellaRental'
    ) {
      const amount = readAmount(value as ParsedMoneyValue);
      if (amount !== null) {
        formData[candidate.field] = amount;
        applied = true;
      }
    } else if (
      candidate.field === 'tableFree'
      || candidate.field === 'chairFree'
      || candidate.field === 'umbrellaFree'
    ) {
      if (isRecord(value) && (value as unknown as ParsedEquipmentValue).provision === 'included_free') {
        equipmentFree[candidate.field] = true;
        applied = true;
      }
    } else if (candidate.field === 'notes' && typeof value === 'string') {
      formData.notes = value;
      applied = true;
    }

    if (applied) appliedCandidateIds.push(candidate.id);
  }

  return {
    formData,
    equipmentFree,
    ...(noEarlyEntry === undefined ? {} : { noEarlyEntry }),
    appliedCandidateIds,
  };
}
