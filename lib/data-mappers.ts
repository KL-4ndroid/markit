import type {
  Event,
  Market,
  MarketCreatedPayload,
  Product,
  ProductCreatedPayload,
} from '@/types/db';
import type { MarketWithAccess, ProductWithAccess } from '@/types/staff';

type AnyRecord = Record<string, unknown>;

const MARKET_CAMEL_TO_SNAKE: Record<string, string> = {
  startDate: 'start_date',
  endDate: 'end_date',
  startTime: 'start_time',
  endTime: 'end_time',
  operationPhase: 'operation_phase',
  earlyEntryEnabled: 'early_entry_enabled',
  earlyEntryTime: 'early_entry_time',
  checkInTime: 'check_in_time',
  operatingStartTime: 'operating_start_time',
  operatingEndTime: 'operating_end_time',
  registrationFee: 'registration_fee',
  boothCost: 'booth_cost',
  tableRental: 'table_rental',
  chairRental: 'chair_rental',
  umbrellaRental: 'umbrella_rental',
  tableclothRental: 'tablecloth_rental',
  commissionRate: 'commission_rate',
  tableFree: 'table_free',
  chairFree: 'chair_free',
  umbrellaFree: 'umbrella_free',
  tableclothFree: 'tablecloth_free',
  totalRevenue: 'total_revenue',
  totalProfit: 'total_profit',
  totalInteractions: 'total_interactions',
  totalDeals: 'total_deals',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  isDeleted: 'is_deleted',
};

const MARKET_SNAKE_TO_CAMEL = Object.fromEntries(
  Object.entries(MARKET_CAMEL_TO_SNAKE).map(([camel, snake]) => [snake, camel])
) as Record<string, string>;

const PRODUCT_CAMEL_TO_SNAKE: Record<string, string> = {
  iconName: 'icon_name',
  colorCode: 'color_code',
  unlimitedStock: 'unlimited_stock',
  isActive: 'is_active',
  isShared: 'is_shared',
  totalSold: 'total_sold',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const PRODUCT_SNAKE_TO_CAMEL = Object.fromEntries(
  Object.entries(PRODUCT_CAMEL_TO_SNAKE).map(([camel, snake]) => [snake, camel])
) as Record<string, string>;

export function definedEntries<T extends AnyRecord>(value: T): AnyRecord {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}

export function pickMarketId(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const record = value as AnyRecord;
  const marketId = record.market_id ?? record.marketId;

  return typeof marketId === 'string' && marketId.length > 0 ? marketId : undefined;
}

export function normalizeEventPayloadForLocal<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload;

  const record = payload as AnyRecord;

  if ('updates' in record && record.updates && typeof record.updates === 'object') {
    return {
      ...record,
      market_id: pickMarketId(record),
      updates: marketUpdatesToCamel(record.updates as AnyRecord),
    } as T;
  }

  const marketId = pickMarketId(record);
  if (!marketId || 'marketId' in record) return payload;

  return {
    ...record,
    marketId,
  } as T;
}

export function normalizeEventForCloud<T>(event: Event<T>): Event<T> {
  return {
    ...event,
    market_id: event.market_id ?? pickMarketId(event.payload),
    payload: normalizeEventPayloadForCloud(event.type, event.payload),
  };
}

export function normalizeEventPayloadForCloud<T>(type: string, payload: T): T {
  if (!payload || typeof payload !== 'object') return payload;

  const record = payload as AnyRecord;
  const marketId = pickMarketId(record);

  if (type === 'market_updated' && record.updates && typeof record.updates === 'object') {
    return {
      market_id: marketId,
      updates: marketUpdatesToSnake(record.updates as AnyRecord),
    } as T;
  }

  if (type === 'market_created') {
    return marketCreatedPayloadToCloud(record as MarketCreatedPayload & AnyRecord, marketId) as T;
  }

  if (marketId && !('market_id' in record)) {
    return {
      ...record,
      market_id: marketId,
    } as T;
  }

  return payload;
}

export function marketUpdatesToSnake(updates: AnyRecord): AnyRecord {
  return mapKeys(updates, MARKET_CAMEL_TO_SNAKE);
}

export function marketUpdatesToCamel(updates: AnyRecord): AnyRecord {
  return mapKeys(updates, MARKET_SNAKE_TO_CAMEL);
}

export function productUpdatesToSnake(updates: AnyRecord): AnyRecord {
  return mapKeys(updates, PRODUCT_CAMEL_TO_SNAKE);
}

export function productUpdatesToCamel(updates: AnyRecord): AnyRecord {
  return mapKeys(updates, PRODUCT_SNAKE_TO_CAMEL);
}

export function marketCreatedPayloadToCloud(
  payload: MarketCreatedPayload & AnyRecord,
  marketId?: string
): AnyRecord {
  const startDate = (payload.startDate ?? payload.start_date) as string | undefined;
  const endDate = (payload.endDate ?? payload.end_date) as string | undefined;

  return definedEntries({
    ...payload,
    market_id: marketId ?? pickMarketId(payload),
    start_date: startDate,
    end_date: endDate,
    start_time: payload.startTime ?? payload.start_time,
    end_time: payload.endTime ?? payload.end_time,
    early_entry_enabled: payload.earlyEntryEnabled ?? payload.early_entry_enabled,
    early_entry_time: payload.earlyEntryTime ?? payload.early_entry_time,
    check_in_time: payload.checkInTime ?? payload.check_in_time,
    operating_start_time: payload.operatingStartTime ?? payload.operating_start_time,
    operating_end_time: payload.operatingEndTime ?? payload.operating_end_time,
    registration_fee: payload.registrationFee ?? payload.registration_fee,
    booth_cost: payload.boothCost ?? payload.booth_cost,
    table_rental: payload.tableRental ?? payload.table_rental,
    chair_rental: payload.chairRental ?? payload.chair_rental,
    umbrella_rental: payload.umbrellaRental ?? payload.umbrella_rental,
    tablecloth_rental: payload.tableclothRental ?? payload.tablecloth_rental,
    commission_rate: payload.commissionRate ?? payload.commission_rate,
    table_free: payload.tableFree ?? payload.table_free,
    chair_free: payload.chairFree ?? payload.chair_free,
    umbrella_free: payload.umbrellaFree ?? payload.umbrella_free,
    tablecloth_free: payload.tableclothFree ?? payload.tablecloth_free,
  });
}

export function marketRowToLocal(row: AnyRecord): Market {
  return definedEntries({
    ...row,
    id: row.id as string | undefined,
    name: row.name,
    location: row.location ?? '',
    dates: row.dates,
    startDate: row.startDate ?? row.start_date ?? row.date,
    endDate: row.endDate ?? row.end_date ?? row.date,
    startTime: row.startTime ?? row.start_time,
    endTime: row.endTime ?? row.end_time,
    status: row.status ?? 'registered',
    operationPhase: row.operationPhase ?? row.operation_phase,
    owner_id: row.owner_id,
    is_collaborative: row.is_collaborative,
    sync_status: row.sync_status,
    access_type: row.access_type,
    permissions: row.permissions,
    relationship_owner_id: row.relationship_owner_id,
    isDeleted: row.isDeleted ?? row.is_deleted ?? !!row.deleted_at,
    earlyEntryEnabled: row.earlyEntryEnabled ?? row.early_entry_enabled,
    earlyEntryTime: row.earlyEntryTime ?? row.early_entry_time,
    checkInTime: row.checkInTime ?? row.check_in_time,
    operatingStartTime: row.operatingStartTime ?? row.operating_start_time,
    operatingEndTime: row.operatingEndTime ?? row.operating_end_time,
    registrationFee: row.registrationFee ?? row.registration_fee ?? 0,
    boothCost: row.boothCost ?? row.booth_cost ?? 0,
    deposit: row.deposit,
    tableRental: row.tableRental ?? row.table_rental,
    chairRental: row.chairRental ?? row.chair_rental,
    umbrellaRental: row.umbrellaRental ?? row.umbrella_rental,
    tableclothRental: row.tableclothRental ?? row.tablecloth_rental,
    commissionRate: row.commissionRate ?? row.commission_rate,
    tableFree: row.tableFree ?? row.table_free,
    chairFree: row.chairFree ?? row.chair_free,
    umbrellaFree: row.umbrellaFree ?? row.umbrella_free,
    tableclothFree: row.tableclothFree ?? row.tablecloth_free,
    totalRevenue: row.totalRevenue ?? row.total_revenue,
    totalProfit: row.totalProfit ?? row.total_profit,
    totalInteractions: row.totalInteractions ?? row.total_interactions,
    totalDeals: row.totalDeals ?? row.total_deals,
    notes: row.notes,
    createdAt: toEpoch(row.createdAt ?? row.created_at) ?? Date.now(),
    updatedAt: toEpoch(row.updatedAt ?? row.updated_at) ?? Date.now(),
  }) as unknown as Market;
}

export function marketAccessRowToLocal(row: AnyRecord): MarketWithAccess {
  return {
    ...row,
    ...marketRowToLocal(row),
    relationship_owner_id: row.relationship_owner_id as string,
    permissions: row.permissions as MarketWithAccess['permissions'],
    access_type: row.access_type as MarketWithAccess['access_type'],
  } as unknown as MarketWithAccess;
}

export function productRowToLocal(row: AnyRecord): Product {
  return definedEntries({
    ...row,
    id: row.id as string | undefined,
    owner_id: row.owner_id,
    market_id: row.market_id,
    name: row.name,
    category: row.category ?? 'other',
    price: row.price ?? 0,
    cost: row.cost,
    iconName: row.iconName ?? row.icon_name,
    colorCode: row.colorCode ?? row.color_code,
    stock: row.stock,
    unlimitedStock: row.unlimitedStock ?? row.unlimited_stock,
    isActive: row.isActive ?? row.is_active ?? !row.deleted_at,
    isShared: row.isShared ?? row.is_shared,
    access_type: row.access_type,
    permissions: row.permissions,
    relationship_owner_id: row.relationship_owner_id,
    totalSold: row.totalSold ?? row.total_sold,
    description: row.description ?? row.notes,
    createdAt: toEpoch(row.createdAt ?? row.created_at) ?? Date.now(),
    updatedAt: toEpoch(row.updatedAt ?? row.updated_at) ?? Date.now(),
  }) as unknown as Product;
}

export function productAccessRowToLocal(row: AnyRecord): ProductWithAccess {
  return {
    ...row,
    ...productRowToLocal(row),
    relationship_owner_id: row.relationship_owner_id as string,
    permissions: row.permissions as ProductWithAccess['permissions'],
    access_type: row.access_type as ProductWithAccess['access_type'],
  } as unknown as ProductWithAccess;
}

export function productCreatedPayloadToLocal(
  payload: ProductCreatedPayload & AnyRecord
): ProductCreatedPayload & { productId?: string } {
  return definedEntries({
    ...payload,
    productId: payload.productId ?? payload.product_id,
    iconName: payload.iconName ?? payload.icon_name,
    colorCode: payload.colorCode ?? payload.color_code,
    unlimitedStock: payload.unlimitedStock ?? payload.unlimited_stock,
    isShared: payload.isShared ?? payload.is_shared,
  }) as unknown as ProductCreatedPayload & { productId?: string };
}

function mapKeys(value: AnyRecord, keyMap: Record<string, string>): AnyRecord {
  return definedEntries(
    Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [keyMap[key] ?? key, entryValue])
    )
  );
}

function toEpoch(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}
