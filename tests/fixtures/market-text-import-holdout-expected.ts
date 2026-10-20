import type { MarketFormField } from '../../lib/market-text-import/types';

export interface HoldoutExpectedCandidate {
  field: MarketFormField;
  value?: unknown;
}

export interface MarketTextImportHoldoutExpected {
  fixtureId: string;
  disposition: 'single_candidate' | 'reject';
  candidates: HoldoutExpectedCandidate[];
}

const name = (): HoldoutExpectedCandidate => ({ field: 'name' });
const dates = (...value: string[]): HoldoutExpectedCandidate => ({
  field: 'dates', value: { kind: 'selected_dates', dates: value },
});
const location = (value: string): HoldoutExpectedCandidate => ({ field: 'location', value });
const start = (value: string): HoldoutExpectedCandidate => ({
  field: 'operatingStartTime', value: { kind: 'single', start: value },
});
const end = (value: string): HoldoutExpectedCandidate => ({
  field: 'operatingEndTime', value: { kind: 'single', end: value },
});
const booth = (amount: number, coversDates: string[]): HoldoutExpectedCandidate => ({
  field: 'boothCost',
  value: {
    amount, currency: 'TWD', currencyStatus: 'inferable', role: 'selected_booth_total', unit: 'per_day', coversDates,
  },
});
const equipment = (
  field: Extract<MarketFormField, 'tableRental' | 'chairRental' | 'umbrellaRental' | 'tableFree' | 'chairFree' | 'umbrellaFree'>,
  type: 'table' | 'chair' | 'umbrella',
  provision: 'selected_rental' | 'included_free',
  quantity: number,
  amount?: number,
): HoldoutExpectedCandidate => ({
  field,
  value: {
    type,
    provision,
    quantity,
    ...(amount === undefined ? {} : {
      money: { amount, currency: 'TWD', currencyStatus: 'inferable', role: 'equipment_unit_price', unit: 'per_item' },
    }),
  },
});
const core = (dateValues: string[], venue: string, hours?: [string, string]): HoldoutExpectedCandidate[] => [
  name(), dates(...dateValues), location(venue), ...(hours ? [start(hours[0]), end(hours[1])] : []),
];

export const MARKET_TEXT_IMPORT_HOLDOUT_EXPECTED: readonly MarketTextImportHoldoutExpected[] = [
  { fixtureId: 'MTI-HO-001', disposition: 'single_candidate', candidates: core(['2026-10-24', '2026-10-25'], '國父紀念館－中軸廣場', ['14:00', '20:00']) },
  { fixtureId: 'MTI-HO-002', disposition: 'single_candidate', candidates: core(['2026-08-22', '2026-08-23'], '松山文創園區三號倉庫') },
  { fixtureId: 'MTI-HO-003', disposition: 'single_candidate', candidates: [
    ...core(['2026-02-27', '2026-02-28', '2026-03-01'], '高雄駁二藝術特區大義倉庫群', ['14:00', '21:00']),
    booth(1500, ['2026-02-27', '2026-02-28', '2026-03-01']),
    equipment('umbrellaRental', 'umbrella', 'selected_rental', 1, 500),
    equipment('tableRental', 'table', 'selected_rental', 1, 400),
    equipment('chairRental', 'chair', 'selected_rental', 1, 50),
  ] },
  { fixtureId: 'MTI-HO-004', disposition: 'single_candidate', candidates: [
    ...core(['2025-09-20', '2025-09-21'], '高雄市立美術館館前廣場＋林蔭區', ['14:00', '19:00']),
    booth(900, ['2025-09-20', '2025-09-21']),
    equipment('umbrellaFree', 'umbrella', 'included_free', 1),
  ] },
  { fixtureId: 'MTI-HO-005', disposition: 'single_candidate', candidates: core(['2025-03-15'], '河樂廣場 × 環河街', ['13:00', '20:30']) },
  { fixtureId: 'MTI-HO-006', disposition: 'single_candidate', candidates: core(['2024-11-09', '2024-11-10'], '台中文化資產園區') },
  { fixtureId: 'MTI-HO-007', disposition: 'single_candidate', candidates: core(['2024-08-10', '2024-08-11'], '西門新天地', ['14:00', '20:00']) },
  { fixtureId: 'MTI-HO-008', disposition: 'reject', candidates: [] },
  { fixtureId: 'MTI-HO-009', disposition: 'single_candidate', candidates: core(['2024-07-13', '2024-07-14'], '松山文創園區五號倉庫') },
  { fixtureId: 'MTI-HO-010', disposition: 'single_candidate', candidates: core(['2024-03-30', '2024-03-31'], '南紡購物中心（台南市東區中華東路一段366號）', ['14:00', '20:00']) },
  { fixtureId: 'MTI-HO-011', disposition: 'reject', candidates: [] },
  { fixtureId: 'MTI-HO-012', disposition: 'single_candidate', candidates: [
    ...core(['2024-03-02', '2024-03-03'], '高雄駁二藝術特區大義倉庫群', ['14:00', '21:00']),
    booth(850, ['2024-03-02', '2024-03-03']),
    equipment('umbrellaRental', 'umbrella', 'selected_rental', 1, 400),
    equipment('tableRental', 'table', 'selected_rental', 1, 300),
    equipment('chairRental', 'chair', 'selected_rental', 1, 30),
  ] },
  { fixtureId: 'MTI-HO-013', disposition: 'single_candidate', candidates: [
    ...core(['2024-03-30', '2024-03-31'], '南紡購物中心前廣場', ['14:00', '20:00']),
    equipment('tableFree', 'table', 'included_free', 1), equipment('chairFree', 'chair', 'included_free', 2),
  ] },
  { fixtureId: 'MTI-HO-014', disposition: 'single_candidate', candidates: core(['2023-07-15', '2023-07-16'], '松山文創園區一樓北向製菸工廠') },
  { fixtureId: 'MTI-HO-015', disposition: 'single_candidate', candidates: core(['2023-07-15', '2023-07-16'], '松山文創園區一樓北向製菸工廠') },
  { fixtureId: 'MTI-HO-016', disposition: 'single_candidate', candidates: core(['2023-03-19'], '高雄岡山河堤公園 × 筧橋路', ['14:00', '20:00']) },
  { fixtureId: 'MTI-HO-017', disposition: 'single_candidate', candidates: core(['2023-03-19'], '高雄岡山河堤公園 × 筧橋路', ['14:00', '20:00']) },
  { fixtureId: 'MTI-HO-018', disposition: 'single_candidate', candidates: core(['2023-03-19'], '高雄岡山河堤公園 × 筧橋路', ['14:00', '20:00']) },
  { fixtureId: 'MTI-HO-019', disposition: 'single_candidate', candidates: core(['2023-03-19'], '高雄岡山河堤公園 × 筧橋路', ['14:00', '20:00']) },
  { fixtureId: 'MTI-HO-020', disposition: 'single_candidate', candidates: core(['2022-12-17', '2022-12-18'], '嘉義文化創意產業園區', ['14:00', '21:00']) },
  { fixtureId: 'MTI-HO-021', disposition: 'single_candidate', candidates: core(['2022-10-15', '2022-10-16'], '嘉義文化創意產業園區', ['14:00', '20:00']) },
  { fixtureId: 'MTI-HO-022', disposition: 'single_candidate', candidates: core(['2022-10-15', '2022-10-16'], '嘉義文化創意產業園區', ['14:00', '20:00']) },
  { fixtureId: 'MTI-HO-023', disposition: 'single_candidate', candidates: core(['2022-03-26', '2022-03-27', '2022-04-02', '2022-04-03'], '屏菸1936文化基地・屏東菸葉廠', ['14:00', '19:00']) },
  { fixtureId: 'MTI-HO-024', disposition: 'single_candidate', candidates: core(['2021-12-11', '2021-12-12', '2021-12-18', '2021-12-19', '2021-12-25', '2021-12-26'], '高雄愛河・河西路', ['14:00', '21:00']) },
  { fixtureId: 'MTI-HO-025', disposition: 'single_candidate', candidates: core(['2021-12-04', '2021-12-05', '2021-12-11', '2021-12-12', '2021-12-18', '2021-12-19', '2021-12-25', '2021-12-26'], '高雄愛河・河西路', ['14:00', '21:00']) },
  { fixtureId: 'MTI-HO-026', disposition: 'single_candidate', candidates: core(['2021-12-04', '2021-12-05', '2021-12-11', '2021-12-12', '2021-12-18', '2021-12-19', '2021-12-25', '2021-12-26'], '高雄愛河・河西路', ['14:00', '21:00']) },
  { fixtureId: 'MTI-HO-027', disposition: 'single_candidate', candidates: core(['2021-06-12', '2021-06-13'], '愛河・河西路（五福路－中正路）', ['15:00', '21:00']) },
  { fixtureId: 'MTI-HO-028', disposition: 'single_candidate', candidates: core(['2021-05-29', '2021-05-30'], '愛河・河西路（五福路－中正路）', ['15:00', '21:00']) },
  { fixtureId: 'MTI-HO-029', disposition: 'single_candidate', candidates: [
    ...core(['2021-03-21', '2021-03-27', '2021-03-28'], '新光三越台南新天地小西門前廣場', ['12:00', '18:00']),
    booth(550, ['2021-03-21', '2021-03-27', '2021-03-28']),
  ] },
  { fixtureId: 'MTI-HO-030', disposition: 'single_candidate', candidates: core(['2020-07-11', '2020-07-12'], '松山文創園區二號倉庫') },
] as const;
