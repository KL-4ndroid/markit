export type CandidateStatus =
  | 'exact'
  | 'inferable'
  | 'choice_required'
  | 'conflict'
  | 'not_present'
  | 'unsupported'
  | 'ignore';

export type EventDisposition =
  | 'single_candidate'
  | 'event_selection_required'
  | 'insufficient'
  | 'reject';

export type DraftReadiness = 'reviewable_core' | 'partial' | 'blocked';

export type MarketFormField =
  | 'name'
  | 'location'
  | 'dates'
  | 'earlyEntryTime'
  | 'checkInTime'
  | 'operatingStartTime'
  | 'operatingEndTime'
  | 'boothCost'
  | 'deposit'
  | 'commissionRate'
  | 'tableRental'
  | 'chairRental'
  | 'umbrellaRental'
  | 'tableFree'
  | 'chairFree'
  | 'umbrellaFree'
  | 'notes';

export interface EvidenceSpan {
  id: string;
  source: 'input_text' | 'reference_date';
  start: number | null;
  end: number | null;
  text: string;
}

export interface CandidateOption<T> {
  id: string;
  value: T;
  evidenceIds: string[];
  linkedCandidateIds: string[];
}

export interface FieldCandidate<T> {
  id: string;
  field: MarketFormField | 'warning_only';
  status: CandidateStatus;
  value: T | null;
  evidenceIds: string[];
  reasonCode: string;
  applyPolicy: 'eligible' | 'requires_option' | 'requires_extra_confirmation' | 'never';
  options?: CandidateOption<T>[];
}

export type ParsedDateValue =
  | { kind: 'selected_dates'; dates: string[] }
  | { kind: 'continuous_range'; start: string; end: string; dayCount: number }
  | { kind: 'multiple_ranges'; ranges: Array<{ start: string; end: string }> }
  | { kind: 'recurrence'; rawRule: string };

export type ParsedTimeValue =
  | { kind: 'single'; start?: string; end?: string }
  | { kind: 'per_date'; entries: Array<{ date: string; start?: string; end?: string }> }
  | { kind: 'conditional'; entries: Array<{ condition: string; start?: string; end?: string }> }
  | { kind: 'window'; start: string; end: string };

export type MoneyRole =
  | 'selected_booth_total'
  | 'published_booth_price'
  | 'registration_fee'
  | 'deposit'
  | 'equipment_total'
  | 'equipment_unit_price'
  | 'power_fee'
  | 'payment_total'
  | 'payment_received'
  | 'payment_due'
  | 'refund'
  | 'other';

export interface ParsedMoneyValue {
  amount: number;
  currency: 'TWD' | null;
  currencyStatus: 'exact' | 'inferable' | 'unknown';
  role: MoneyRole;
  unit: 'per_event' | 'per_day' | 'per_item' | 'percent' | 'unknown';
  quantity?: number;
  coversDates?: string[];
}

export type EquipmentProvision =
  | 'included_free'
  | 'provided_unknown_price'
  | 'rentable'
  | 'selected_rental'
  | 'self_provided'
  | 'not_provided'
  | 'forbidden';

export interface ParsedEquipmentValue {
  type: 'table' | 'chair' | 'umbrella' | 'tent' | 'power' | 'other';
  provision: EquipmentProvision;
  quantity?: number;
  money?: ParsedMoneyValue;
  detail?: string;
}

export interface ParseWarning {
  id: string;
  code:
    | 'event_selection_required'
    | 'choice_required'
    | 'core_conflict'
    | 'external_value_unavailable'
    | 'conditional_schedule_unsupported'
    | 'date_range_confirmation_required'
    | 'currency_unknown'
    | 'fee_date_mapping_unknown'
    | 'private_content_detected'
    | 'unsupported_field';
  severity: 'info' | 'warning' | 'blocking';
  field?: MarketFormField;
  evidenceIds: string[];
  params?: Record<string, string | number>;
}

export interface IgnoreSpan {
  evidenceId: string;
  reasonCode: string;
}

export interface SensitiveSpan {
  evidenceId: string;
  category: 'email' | 'phone_or_contact' | 'bank_account' | 'identifier' | 'private_url' | 'private_answer';
}

export interface ParsedMarketEvent {
  id: string;
  label: string;
  candidateIds: string[];
  candidates: FieldCandidate<unknown>[];
}

export interface ParsedMarketDraft {
  schemaVersion: 1;
  disposition: EventDisposition;
  readiness: DraftReadiness;
  events: ParsedMarketEvent[];
  evidence: EvidenceSpan[];
  warnings: ParseWarning[];
  ignoreSpans: IgnoreSpan[];
  sensitiveSpans: SensitiveSpan[];
}

export interface ParseMarketTextRequest {
  inputText: string;
  referenceDate: string;
  locale: 'zh-TW';
}

export type ParseMarketTextResponse =
  | { ok: true; draft: ParsedMarketDraft }
  | {
      ok: false;
      error: {
        code: 'empty_input' | 'input_too_long' | 'invalid_reference_date' | 'internal_error';
      };
    };
