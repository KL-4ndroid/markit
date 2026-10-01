import { IN_APP_PURCHASE_STORES, type InAppPurchaseStore } from '@/lib/platform/contracts/in-app-purchase';
import {
  NATIVE_STORE_CATALOG_TEMPLATE,
  validateNativeStoreCatalog,
  type NativeStoreCatalogMapping,
} from './native-store-catalog';
import {
  isSubscriptionPriceVersionId,
  type SubscriptionPriceVersionId,
} from './subscription-pricing';

export const NATIVE_STORE_CATALOG_CONFIG_SCHEMA_VERSION = 1 as const;
export const NATIVE_STORE_CATALOG_CONFIG_SOURCE_DOCUMENT =
  'subscription/NATIVE_STORE_CATALOG_TOPOLOGY_2026_08_06.md' as const;

export type NativeStoreCatalogConfigStatus = 'unconfigured' | 'candidate' | 'deferred';

export type NativeStoreCatalogConfigEntry = Readonly<{
  store: InAppPurchaseStore;
  priceVersionId: SubscriptionPriceVersionId;
  productId: string | null;
  basePlanId: string | null;
  offerId: string | null;
  status: NativeStoreCatalogConfigStatus;
}>;

export type NativeStoreCatalogConfigDocument = Readonly<{
  schemaVersion: typeof NATIVE_STORE_CATALOG_CONFIG_SCHEMA_VERSION;
  sourceDocument: typeof NATIVE_STORE_CATALOG_CONFIG_SOURCE_DOCUMENT;
  updatedAt: string;
  environment: 'sandbox';
  activationStatus: 'disabled';
  mappings: readonly NativeStoreCatalogConfigEntry[];
}>;

export type NativeStoreCatalogConfigValidationCode =
  | 'activation_status_invalid'
  | 'document_invalid'
  | 'environment_invalid'
  | 'mapping_count_invalid'
  | 'mapping_duplicate'
  | 'mapping_invalid'
  | 'mapping_unknown'
  | 'schema_version_unsupported'
  | 'source_document_mismatch'
  | 'updated_date_invalid';

export class NativeStoreCatalogConfigValidationError extends Error {
  constructor(readonly code: NativeStoreCatalogConfigValidationCode) {
    super(code);
  }
}

export type NativeStoreCatalogConfigCheck = Readonly<{
  id: string;
  ok: boolean;
  code: 'candidate' | 'deferred' | 'unconfigured' | 'candidate_present' | 'candidate_missing';
}>;

export type NativeStoreCatalogConfigReport = Readonly<{
  readyForSandboxQuery: boolean;
  totalMappingCount: number;
  candidateCount: number;
  deferredCount: number;
  unconfiguredCount: number;
  checkCount: number;
  blockerCount: number;
  checks: readonly NativeStoreCatalogConfigCheck[];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}

function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isStore(value: unknown): value is InAppPurchaseStore {
  return typeof value === 'string'
    && (IN_APP_PURCHASE_STORES as readonly string[]).includes(value);
}

function isStatus(value: unknown): value is NativeStoreCatalogConfigStatus {
  return value === 'unconfigured' || value === 'candidate' || value === 'deferred';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function mappingKey(value: Readonly<{
  store: InAppPurchaseStore;
  priceVersionId: SubscriptionPriceVersionId;
}>): string {
  return `${value.store}:${value.priceVersionId}`;
}

const EXPECTED_MAPPING_KEYS = Object.freeze(
  NATIVE_STORE_CATALOG_TEMPLATE.map(mappingKey),
);

function parseEntry(value: unknown): NativeStoreCatalogConfigEntry {
  if (!isRecord(value) || !hasExactKeys(value, [
    'store',
    'priceVersionId',
    'productId',
    'basePlanId',
    'offerId',
    'status',
  ])) {
    throw new NativeStoreCatalogConfigValidationError('mapping_invalid');
  }
  if (
    !isStore(value.store)
    || !isSubscriptionPriceVersionId(value.priceVersionId)
    || !isNullableString(value.productId)
    || !isNullableString(value.basePlanId)
    || !isNullableString(value.offerId)
    || !isStatus(value.status)
  ) {
    throw new NativeStoreCatalogConfigValidationError('mapping_invalid');
  }

  if (value.status !== 'candidate') {
    if (value.productId !== null || value.basePlanId !== null || value.offerId !== null) {
      throw new NativeStoreCatalogConfigValidationError('mapping_invalid');
    }
  } else if (value.productId === null) {
    throw new NativeStoreCatalogConfigValidationError('mapping_invalid');
  }

  return Object.freeze({
    store: value.store,
    priceVersionId: value.priceVersionId,
    productId: value.productId,
    basePlanId: value.basePlanId,
    offerId: value.offerId,
    status: value.status,
  });
}

export function parseNativeStoreCatalogConfig(
  value: unknown,
): NativeStoreCatalogConfigDocument {
  if (!isRecord(value) || !Array.isArray(value.mappings) || !hasExactKeys(value, [
    'schemaVersion',
    'sourceDocument',
    'updatedAt',
    'environment',
    'activationStatus',
    'mappings',
  ])) {
    throw new NativeStoreCatalogConfigValidationError('document_invalid');
  }
  if (value.schemaVersion !== NATIVE_STORE_CATALOG_CONFIG_SCHEMA_VERSION) {
    throw new NativeStoreCatalogConfigValidationError('schema_version_unsupported');
  }
  if (value.sourceDocument !== NATIVE_STORE_CATALOG_CONFIG_SOURCE_DOCUMENT) {
    throw new NativeStoreCatalogConfigValidationError('source_document_mismatch');
  }
  if (!isValidDateOnly(value.updatedAt)) {
    throw new NativeStoreCatalogConfigValidationError('updated_date_invalid');
  }
  if (value.environment !== 'sandbox') {
    throw new NativeStoreCatalogConfigValidationError('environment_invalid');
  }
  if (value.activationStatus !== 'disabled') {
    throw new NativeStoreCatalogConfigValidationError('activation_status_invalid');
  }
  if (value.mappings.length !== EXPECTED_MAPPING_KEYS.length) {
    throw new NativeStoreCatalogConfigValidationError('mapping_count_invalid');
  }

  const entries = value.mappings.map(parseEntry);
  const keys = new Set<string>();
  for (const entry of entries) {
    const key = mappingKey(entry);
    if (!EXPECTED_MAPPING_KEYS.includes(key)) {
      throw new NativeStoreCatalogConfigValidationError('mapping_unknown');
    }
    if (keys.has(key)) throw new NativeStoreCatalogConfigValidationError('mapping_duplicate');
    keys.add(key);
  }
  if (EXPECTED_MAPPING_KEYS.some(key => !keys.has(key))) {
    throw new NativeStoreCatalogConfigValidationError('mapping_unknown');
  }

  const mappings: NativeStoreCatalogMapping[] = entries.map(entry => ({
    ...entry,
    environment: 'sandbox',
    status: entry.status === 'candidate' ? 'candidate' : 'unconfigured',
  }));
  for (const store of IN_APP_PURCHASE_STORES) {
    const validation = validateNativeStoreCatalog({
      store,
      environment: 'sandbox',
      mappings,
      storeProducts: [],
    });
    if (!validation.ok) {
      throw new NativeStoreCatalogConfigValidationError('mapping_invalid');
    }
  }

  const byKey = new Map(entries.map(entry => [mappingKey(entry), entry]));
  const ordered = EXPECTED_MAPPING_KEYS.map(key => byKey.get(key)!);
  return Object.freeze({
    schemaVersion: NATIVE_STORE_CATALOG_CONFIG_SCHEMA_VERSION,
    sourceDocument: NATIVE_STORE_CATALOG_CONFIG_SOURCE_DOCUMENT,
    updatedAt: value.updatedAt,
    environment: 'sandbox',
    activationStatus: 'disabled',
    mappings: Object.freeze(ordered),
  });
}

export function evaluateNativeStoreCatalogConfig(
  document: NativeStoreCatalogConfigDocument,
): NativeStoreCatalogConfigReport {
  const mappingChecks: NativeStoreCatalogConfigCheck[] = document.mappings.map(mapping => ({
    id: mappingKey(mapping),
    ok: mapping.status !== 'unconfigured',
    code: mapping.status,
  }));
  const storeChecks: NativeStoreCatalogConfigCheck[] = IN_APP_PURCHASE_STORES.map(store => {
    const hasCandidate = document.mappings.some(mapping => (
      mapping.store === store && mapping.status === 'candidate'
    ));
    return {
      id: `${store}:candidate_presence`,
      ok: hasCandidate,
      code: hasCandidate ? 'candidate_present' : 'candidate_missing',
    };
  });
  const checks = Object.freeze([...mappingChecks, ...storeChecks]);
  const candidateCount = document.mappings.filter(mapping => mapping.status === 'candidate').length;
  const deferredCount = document.mappings.filter(mapping => mapping.status === 'deferred').length;
  const unconfiguredCount = document.mappings.length - candidateCount - deferredCount;
  const blockerCount = checks.filter(check => !check.ok).length;

  return Object.freeze({
    readyForSandboxQuery: blockerCount === 0,
    totalMappingCount: document.mappings.length,
    candidateCount,
    deferredCount,
    unconfiguredCount,
    checkCount: checks.length,
    blockerCount,
    checks,
  });
}
