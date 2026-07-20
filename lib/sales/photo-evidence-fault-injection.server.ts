import { timingSafeEqual } from 'node:crypto';

export const SALES_PHOTO_EVIDENCE_FAULT_HEADER = 'x-sales-photo-evidence-test-fault';
export const SALES_PHOTO_EVIDENCE_FAULT_TOKEN_HEADER = 'x-sales-photo-evidence-test-token';

export type SalesPhotoEvidenceFaultInjectionMode =
  | 'thumbnail_upload_failed'
  | 'metadata_finalize_failed';

export type SalesPhotoEvidenceFaultInjectionDecision =
  | { action: 'none' }
  | { action: 'reject' }
  | { action: 'inject'; mode: SalesPhotoEvidenceFaultInjectionMode };

export type SalesPhotoEvidenceFaultInjectionEnv = Record<string, string | undefined>;

export type ResolveSalesPhotoEvidenceFaultInjectionInput = {
  request: Request;
  actorId: string;
  ownerId: string;
  marketId: string;
  saleEventId: string;
  env: SalesPhotoEvidenceFaultInjectionEnv;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const MODES = new Set<SalesPhotoEvidenceFaultInjectionMode>([
  'thumbnail_upload_failed',
  'metadata_finalize_failed',
]);

function isMode(value: string): value is SalesPhotoEvidenceFaultInjectionMode {
  return MODES.has(value as SalesPhotoEvidenceFaultInjectionMode);
}

function safeTokenEquals(actual: string, expected: string): boolean {
  if (!TOKEN_PATTERN.test(actual) || !TOKEN_PATTERN.test(expected)) return false;
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export function resolveSalesPhotoEvidenceFaultInjection(
  input: ResolveSalesPhotoEvidenceFaultInjectionInput
): SalesPhotoEvidenceFaultInjectionDecision {
  const requestedMode = input.request.headers.get(SALES_PHOTO_EVIDENCE_FAULT_HEADER)?.trim() ?? '';
  const suppliedToken = input.request.headers.get(SALES_PHOTO_EVIDENCE_FAULT_TOKEN_HEADER)?.trim() ?? '';

  if (!requestedMode && !suppliedToken) return { action: 'none' };
  if (!isMode(requestedMode)) return { action: 'reject' };

  const deploymentEnv = input.env.VERCEL_ENV ?? input.env.APP_ENV ?? input.env.NODE_ENV;
  if (input.env.SALES_PHOTO_EVIDENCE_FAULT_INJECTION_ENABLED !== '1') return { action: 'reject' };
  if (
    deploymentEnv === 'production'
    && input.env.SALES_PHOTO_EVIDENCE_FAULT_INJECTION_ALLOW_PRODUCTION !== '1'
  ) {
    return { action: 'reject' };
  }

  const expectedToken = input.env.SALES_PHOTO_EVIDENCE_FAULT_INJECTION_TOKEN?.trim() ?? '';
  if (!safeTokenEquals(suppliedToken, expectedToken)) return { action: 'reject' };

  const expectedOwnerId = input.env.SALES_PHOTO_EVIDENCE_FAULT_INJECTION_OWNER_ID?.trim() ?? '';
  const expectedMarketId = input.env.SALES_PHOTO_EVIDENCE_FAULT_INJECTION_MARKET_ID?.trim() ?? '';
  const expectedSaleId = input.env.SALES_PHOTO_EVIDENCE_FAULT_INJECTION_SALE_ID?.trim() ?? '';
  if (![expectedOwnerId, expectedMarketId, expectedSaleId].every(value => UUID_PATTERN.test(value))) {
    return { action: 'reject' };
  }
  if (
    input.actorId !== input.ownerId
    || input.actorId !== expectedOwnerId
    || input.ownerId !== expectedOwnerId
    || input.marketId !== expectedMarketId
    || input.saleEventId !== expectedSaleId
  ) {
    return { action: 'reject' };
  }

  return { action: 'inject', mode: requestedMode };
}
