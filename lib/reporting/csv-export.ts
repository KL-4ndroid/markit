import { hasCapability, type RoleCapabilities } from '@/lib/permissions/role-capabilities';

export type CsvCellValue = string | number | boolean | Date | null | undefined;

export type CsvColumn<TRow extends Record<string, CsvCellValue>> = {
  key: keyof TRow;
  header: string;
};

export type OwnerMarketSummaryCsvRow = {
  marketId: string;
  marketName: string;
  startDate: string;
  endDate?: string | null;
  location?: string | null;
  syncStatus?: string | null;
  totalRevenue?: number | null;
  totalDeals?: number | null;
  totalInteractions?: number | null;
  boothCost?: number | null;
  totalCost?: number | null;
  totalProfit?: number | null;
  netProfit?: number | null;
  commissionRate?: number | null;
};

export const OWNER_MARKET_SUMMARY_COLUMNS: Array<CsvColumn<OwnerMarketSummaryCsvRow>> = [
  { key: 'marketId', header: 'market_id' },
  { key: 'marketName', header: 'market_name' },
  { key: 'startDate', header: 'start_date' },
  { key: 'endDate', header: 'end_date' },
  { key: 'location', header: 'location' },
  { key: 'syncStatus', header: 'sync_status' },
  { key: 'totalRevenue', header: 'total_revenue' },
  { key: 'totalDeals', header: 'total_deals' },
  { key: 'totalInteractions', header: 'total_interactions' },
  { key: 'boothCost', header: 'booth_cost' },
  { key: 'totalCost', header: 'total_cost' },
  { key: 'totalProfit', header: 'total_profit' },
  { key: 'netProfit', header: 'net_profit' },
  { key: 'commissionRate', header: 'commission_rate' },
];

export type BuildOwnerMarketSummaryCsvInput = {
  capabilities: RoleCapabilities;
  rows: OwnerMarketSummaryCsvRow[];
};

function normalizeCell(value: CsvCellValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return value;
}

function neutralizeSpreadsheetFormula(value: string): string {
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

export function escapeCsvCell(value: CsvCellValue): string {
  const normalized = neutralizeSpreadsheetFormula(normalizeCell(value));
  const mustQuote =
    normalized.includes(',') ||
    normalized.includes('"') ||
    normalized.includes('\n') ||
    normalized.includes('\r') ||
    normalized.trim() !== normalized;

  const escaped = normalized.replace(/"/g, '""');
  return mustQuote ? `"${escaped}"` : escaped;
}

export function serializeCsv<TRow extends Record<string, CsvCellValue>>(
  columns: Array<CsvColumn<TRow>>,
  rows: TRow[]
): string {
  const header = columns.map(column => escapeCsvCell(column.header)).join(',');
  const body = rows.map(row =>
    columns.map(column => escapeCsvCell(row[column.key])).join(',')
  );

  return [header, ...body].join('\r\n');
}

function assertOwnerExportAllowed(capabilities: RoleCapabilities): void {
  if (
    !hasCapability(capabilities, 'canImportExport') ||
    !hasCapability(capabilities, 'canViewOwnerFinance')
  ) {
    throw new Error('Owner reporting export requires owner import/export and finance capabilities');
  }
}

export function buildOwnerMarketSummaryCsv({
  capabilities,
  rows,
}: BuildOwnerMarketSummaryCsvInput): string {
  assertOwnerExportAllowed(capabilities);
  return serializeCsv(OWNER_MARKET_SUMMARY_COLUMNS, rows);
}
