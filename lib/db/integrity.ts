import type { DailyStats, Event, EventType, Market, Product, Settings } from '@/types/db';

export interface BackupData {
  version: number;
  exportedAt: number;
  events: Event[];
  markets: Market[];
  products: Product[];
  dailyStats: DailyStats[];
  settings: Settings[];
}

export interface IntegrityResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const SUPPORTED_BACKUP_VERSIONS = new Set([1]);
const EVENT_TYPES: ReadonlySet<string> = new Set<EventType>([
  'market_created',
  'market_updated',
  'market_status_changed',
  'market_started',
  'market_ended',
  'market_deleted',
  'product_created',
  'product_updated',
  'product_deleted',
  'interaction_recorded',
  'interaction_deleted',
  'deal_closed',
  'deal_deleted',
  'settings_updated',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 寬容的 legacy market cost 欄位驗證。
 * 舊版 market_created 事件可能缺少或傳入空值，視為 0（預設值）。
 * 只允許：finite number | undefined | null | ''（空字串）
 * 其他仍由 isNumber 把關。
 */
function isLegacyMarketCostValue(value: unknown): boolean {
  if (isNumber(value)) return true;
  return value === undefined || value === null || value === '';
}

function isValidDateString(value: unknown): boolean {
  if (!isNonEmptyString(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
}

function pickPayloadMarketId(payload: Record<string, unknown>): string | undefined {
  const marketId = payload.marketId ?? payload.market_id;
  return isNonEmptyString(marketId) ? marketId : undefined;
}

function findDuplicateIds(items: Array<{ id?: string | number }>, label: string): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of items) {
    if (item.id === undefined || item.id === null) continue;
    const key = String(item.id);
    if (seen.has(key)) {
      duplicates.add(key);
    } else {
      seen.add(key);
    }
  }

  return [...duplicates].map(id => `${label} duplicate id: ${id}`);
}

function validateBackupEventPayload(event: Event, index: number): string[] {
  const errors: string[] = [];
  if (!isRecord(event.payload)) return errors;

  const payload = event.payload;
  const label = `events[${index}] ${event.type}`;

  const requireMarketId = () => {
    if (!pickPayloadMarketId(payload)) errors.push(`${label} missing marketId`);
  };

  switch (event.type) {
    case 'market_created':
      if (!isNonEmptyString(payload.name)) errors.push(`${label} missing name`);
      if (!isNonEmptyString(payload.location)) errors.push(`${label} missing location`);
      if (!isNonEmptyString(payload.startDate ?? payload.start_date)) errors.push(`${label} missing startDate`);
      if (!isNonEmptyString(payload.endDate ?? payload.end_date)) errors.push(`${label} missing endDate`);
      if (!isLegacyMarketCostValue(payload.registrationFee ?? payload.registration_fee)) errors.push(`${label} invalid registrationFee`);
      if (!isLegacyMarketCostValue(payload.boothCost ?? payload.booth_cost)) errors.push(`${label} invalid boothCost`);
      break;

    case 'market_updated':
      requireMarketId();
      if (!isRecord(payload.updates)) errors.push(`${label} invalid updates`);
      break;

    case 'market_status_changed':
      requireMarketId();
      if (!isNonEmptyString(payload.oldStatus)) errors.push(`${label} missing oldStatus`);
      if (!isNonEmptyString(payload.newStatus)) errors.push(`${label} missing newStatus`);
      break;

    case 'market_started':
    case 'market_ended':
    case 'market_deleted':
    case 'interaction_recorded':
      requireMarketId();
      if (event.type === 'interaction_recorded' && !isNonEmptyString(payload.type)) {
        errors.push(`${label} missing type`);
      }
      break;

    case 'product_created':
      if (!isNonEmptyString(payload.name)) errors.push(`${label} missing name`);
      if (!isNonEmptyString(payload.category)) errors.push(`${label} missing category`);
      if (!isNumber(payload.price)) errors.push(`${label} invalid price`);
      break;

    case 'product_updated':
      if (!isNonEmptyString(payload.productId)) errors.push(`${label} missing productId`);
      if (!isRecord(payload.updates)) errors.push(`${label} invalid updates`);
      break;

    case 'product_deleted':
      if (!isNonEmptyString(payload.productId)) errors.push(`${label} missing productId`);
      break;

    case 'interaction_deleted':
      if (!isNonEmptyString(payload.eventId)) errors.push(`${label} missing eventId`);
      requireMarketId();
      break;

    case 'deal_closed':
      requireMarketId();
      if (!isNumber(payload.totalAmount)) errors.push(`${label} invalid totalAmount`);
      if (payload.isManualEntry !== true) {
        if (!Array.isArray(payload.items)) {
          errors.push(`${label} invalid items`);
        } else {
          payload.items.forEach((item, itemIndex) => {
            if (!isRecord(item)) {
              errors.push(`${label}.items[${itemIndex}] invalid item`);
              return;
            }
            if (!isNonEmptyString(item.productId)) errors.push(`${label}.items[${itemIndex}] missing productId`);
            if (!isNumber(item.quantity) || item.quantity <= 0) errors.push(`${label}.items[${itemIndex}] invalid quantity`);
            if (!isNumber(item.price)) errors.push(`${label}.items[${itemIndex}] invalid price`);
          });
        }
      }
      break;

    case 'deal_deleted':
      if (!isNonEmptyString(payload.eventId)) errors.push(`${label} missing eventId`);
      requireMarketId();
      if (!isNonEmptyString(payload.dealDate)) errors.push(`${label} missing dealDate`);
      if (!isNumber(payload.totalAmount)) errors.push(`${label} invalid totalAmount`);
      if (!isNumber(payload.totalCost)) errors.push(`${label} invalid totalCost`);
      if (!isNumber(payload.dealCount)) errors.push(`${label} invalid dealCount`);
      break;

    case 'settings_updated':
      break;
  }

  return errors;
}

function validateEventReferences(
  data: BackupData,
  eventById: Map<string, Event>,
  marketIds: Set<string>,
  productIds: Set<string>
): IntegrityResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  data.events.forEach((event, index) => {
    if (!isRecord(event.payload)) return;

    const payload = event.payload;
    const label = `events[${index}] ${event.type}`;
    const payloadMarketId = pickPayloadMarketId(payload);

    if (payloadMarketId && event.market_id && payloadMarketId !== event.market_id) {
      warnings.push(`${label} payload marketId differs from event.market_id`);
    }

    if (payloadMarketId && !marketIds.has(payloadMarketId)) {
      errors.push(`${label} references missing market: ${payloadMarketId}`);
    }

    if (
      event.type === 'product_updated' &&
      isNonEmptyString(payload.productId) &&
      !productIds.has(payload.productId)
    ) {
      errors.push(`${label} references missing product: ${payload.productId}`);
    }

    if (
      event.type === 'product_deleted' &&
      isNonEmptyString(payload.productId) &&
      !productIds.has(payload.productId)
    ) {
      // product_deleted 是 tombstone，deleted 的商品本來就不在 snapshot 中（無論是
      // 因為被刪除、尚未授權、或從未被員工同步）。Integrity check 不應對此报错。
      // 此 warn 可幫助偵測員工視圖範圍外的 orphan tombstone，但不阻擋 sync。
      warnings.push(`${label} references product not in snapshot (may be deleted or out-of-scope)`);
    }

    if (event.type === 'deal_closed' && Array.isArray(payload.items)) {
      payload.items.forEach((item, itemIndex) => {
        if (!isRecord(item) || !isNonEmptyString(item.productId)) return;
        if (!productIds.has(item.productId)) {
          errors.push(`${label}.items[${itemIndex}] references missing product: ${item.productId}`);
        }
      });
    }

    if (event.type !== 'deal_deleted' && event.type !== 'interaction_deleted') return;
    if (!isNonEmptyString(payload.eventId)) return;

    if (payload.eventId === event.id) {
      errors.push(`${label} cannot tombstone itself`);
      return;
    }

    const target = eventById.get(payload.eventId);
    if (!target) {
      errors.push(`${label} references missing event: ${payload.eventId}`);
      return;
    }

    const expectedType = event.type === 'deal_deleted' ? 'deal_closed' : 'interaction_recorded';
    if (target.type !== expectedType) {
      errors.push(`${label} references ${target.type}; expected ${expectedType}`);
    }

    if (isRecord(target.payload)) {
      const targetMarketId = pickPayloadMarketId(target.payload);
      if (payloadMarketId && targetMarketId && payloadMarketId !== targetMarketId) {
        warnings.push(`${label} marketId differs from tombstoned event`);
      }
    }
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function pickPayloadProductId(payload: Record<string, unknown>): string | undefined {
  const productId = payload.productId ?? payload.product_id;
  return isNonEmptyString(productId) ? productId : undefined;
}

export function validateBackupReplayReadiness(data: BackupData): IntegrityResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const activeMarkets = new Set(data.markets.map(market => market.id).filter(isNonEmptyString));
  const activeProducts = new Set(data.products.map(product => product.id).filter(isNonEmptyString));
  const tombstonedEvents = new Set<string>();

  const indexedEvents = data.events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      if (a.event.timestamp !== b.event.timestamp) return a.event.timestamp - b.event.timestamp;
      return a.index - b.index;
    });

  const replayIndexByEventId = new Map<string, number>();
  indexedEvents.forEach(({ event }, replayIndex) => {
    if (isNonEmptyString(event.id)) {
      replayIndexByEventId.set(event.id, replayIndex);
    }
  });

  indexedEvents.forEach(({ event, index }, replayIndex) => {
    if (!isRecord(event.payload)) return;

    const payload = event.payload;
    const label = `events[${index}] ${event.type}`;
    const marketId = pickPayloadMarketId(payload);

    if (
      marketId &&
      !activeMarkets.has(marketId) &&
      event.type !== 'market_created' &&
      event.type !== 'settings_updated' &&
      event.type !== 'market_deleted'
    ) {
      errors.push(`${label} cannot replay because market is unavailable: ${marketId}`);
    }

    if (event.type === 'market_created') {
      const createdMarketId = marketId ?? event.market_id;
      if (createdMarketId) activeMarkets.add(createdMarketId);
      return;
    }

    if (event.type === 'market_deleted' && marketId) {
      activeMarkets.delete(marketId);
      return;
    }

    if (event.type === 'product_created') {
      const productId = pickPayloadProductId(payload);
      if (productId) activeProducts.add(productId);
      return;
    }

    if (event.type === 'product_deleted') {
      const productId = pickPayloadProductId(payload);
      if (productId) activeProducts.delete(productId);
      return;
    }

    if (event.type === 'product_updated') {
      const productId = pickPayloadProductId(payload);
      if (productId && !activeProducts.has(productId)) {
        errors.push(`${label} cannot replay because product is unavailable: ${productId}`);
      }
      return;
    }

    if (event.type === 'deal_closed' && Array.isArray(payload.items)) {
      payload.items.forEach((item, itemIndex) => {
        if (!isRecord(item) || !isNonEmptyString(item.productId)) return;
        if (!activeProducts.has(item.productId)) {
          errors.push(`${label}.items[${itemIndex}] cannot replay because product is unavailable: ${item.productId}`);
        }
      });
    }

    if (event.type !== 'deal_deleted' && event.type !== 'interaction_deleted') return;
    if (!isNonEmptyString(payload.eventId)) return;

    const targetReplayIndex = replayIndexByEventId.get(payload.eventId);
    if (targetReplayIndex !== undefined && targetReplayIndex >= replayIndex) {
      errors.push(`${label} tombstones an event that has not replayed yet: ${payload.eventId}`);
    }

    if (tombstonedEvents.has(payload.eventId)) {
      errors.push(`${label} duplicates tombstone for event: ${payload.eventId}`);
    }
    tombstonedEvents.add(payload.eventId);
  });

  if (data.events.length === 0 && (data.markets.length > 0 || data.products.length > 0 || data.dailyStats.length > 0)) {
    warnings.push('Backup has snapshots but no events; snapshots cannot be independently replayed');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function parseBackupData(jsonData: string): BackupData {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonData);
  } catch {
    throw new Error('備份檔不是有效的 JSON');
  }

  if (!isRecord(parsed)) {
    throw new Error('備份資料格式錯誤：根節點必須是物件');
  }

  const data = parsed as Partial<BackupData>;
  const requiredArrays: Array<keyof Pick<BackupData, 'events' | 'markets' | 'products' | 'dailyStats' | 'settings'>> = [
    'events',
    'markets',
    'products',
    'dailyStats',
    'settings',
  ];

  if (!isNumber(data.version)) {
    throw new Error('備份資料缺少有效版本');
  }

  if (!SUPPORTED_BACKUP_VERSIONS.has(data.version)) {
    throw new Error(`不支援的備份版本：${data.version}`);
  }

  if (!isNumber(data.exportedAt)) {
    throw new Error('備份資料缺少有效匯出時間');
  }

  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) {
      throw new Error(`備份資料缺少有效陣列欄位：${key}`);
    }
  }

  return data as BackupData;
}

export function checkBackupIntegrity(data: BackupData): IntegrityResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  errors.push(...findDuplicateIds(data.events, 'events'));
  errors.push(...findDuplicateIds(data.markets, 'markets'));
  errors.push(...findDuplicateIds(data.products, 'products'));
  errors.push(...findDuplicateIds(data.dailyStats, 'dailyStats'));
  errors.push(...findDuplicateIds(data.settings, 'settings'));

  const marketIds = new Set(data.markets.map(market => market.id).filter(isNonEmptyString));
  const productIds = new Set(data.products.map(product => product.id).filter(isNonEmptyString));
  const eventById = new Map(
    data.events
      .filter(event => isNonEmptyString(event.id))
      .map(event => [event.id as string, event])
  );

  data.events.forEach((event, index) => {
    if (!isNonEmptyString(event.id)) errors.push(`events[${index}] 缺少有效 id`);
    if (!EVENT_TYPES.has(event.type)) errors.push(`events[${index}] 事件類型不支援：${String(event.type)}`);
    if (!isNumber(event.timestamp)) errors.push(`events[${index}] 缺少有效 timestamp`);
    if (!isRecord(event.payload)) errors.push(`events[${index}] payload 必須是物件`);

    if (event.market_id && !marketIds.has(event.market_id)) {
      errors.push(`events[${index}] 指向不存在的 market_id：${event.market_id}`);
    }
  });

  data.events.forEach((event, index) => {
    errors.push(...validateBackupEventPayload(event, index));
  });

  const referenceCheck = validateEventReferences(data, eventById, marketIds, productIds);
  errors.push(...referenceCheck.errors);
  warnings.push(...referenceCheck.warnings);

  const replayReadiness = validateBackupReplayReadiness(data);
  errors.push(...replayReadiness.errors);
  warnings.push(...replayReadiness.warnings);

  data.markets.forEach((market, index) => {
    if (!isNonEmptyString(market.id)) errors.push(`markets[${index}] 缺少有效 id`);
    if (!isNonEmptyString(market.name)) errors.push(`markets[${index}] 缺少有效 name`);
    if (!isNonEmptyString(market.location)) errors.push(`markets[${index}] 缺少有效 location`);
    if (!isValidDateString(market.startDate)) errors.push(`markets[${index}] startDate 無效`);
    if (!isValidDateString(market.endDate)) errors.push(`markets[${index}] endDate 無效`);
    if (!isLegacyMarketCostValue(market.registrationFee)) errors.push(`markets[${index}] registrationFee 無效`);
    if (!isLegacyMarketCostValue(market.boothCost)) errors.push(`markets[${index}] boothCost 無效`);
    if (!isNumber(market.createdAt)) errors.push(`markets[${index}] createdAt 無效`);
    if (!isNumber(market.updatedAt)) errors.push(`markets[${index}] updatedAt 無效`);

    if (market.dates && !Array.isArray(market.dates)) {
      errors.push(`markets[${index}] dates 必須是陣列`);
    } else if (market.dates?.some(date => !isValidDateString(date))) {
      errors.push(`markets[${index}] dates 包含無效日期`);
    }
  });

  data.products.forEach((product, index) => {
    if (!isNonEmptyString(product.id)) errors.push(`products[${index}] 缺少有效 id`);
    if (!isNonEmptyString(product.name)) errors.push(`products[${index}] 缺少有效 name`);
    if (!isNumber(product.price)) errors.push(`products[${index}] price 無效`);
    if (product.cost !== undefined && !isNumber(product.cost)) errors.push(`products[${index}] cost 無效`);
    if (product.stock !== undefined && (!isNumber(product.stock) || product.stock < 0)) {
      errors.push(`products[${index}] stock 無效或為負數`);
    }
    if (product.market_id && !marketIds.has(product.market_id)) {
      errors.push(`products[${index}] 指向不存在的 market_id：${product.market_id}`);
    }
    if (!isNumber(product.createdAt)) errors.push(`products[${index}] createdAt 無效`);
    if (!isNumber(product.updatedAt)) errors.push(`products[${index}] updatedAt 無效`);
  });

  data.dailyStats.forEach((stat, index) => {
    if (!isValidDateString(stat.date)) errors.push(`dailyStats[${index}] date 無效`);
    if (stat.marketId && !marketIds.has(stat.marketId)) {
      errors.push(`dailyStats[${index}] 指向不存在的 marketId：${stat.marketId}`);
    }
    if (!isNumber(stat.touchCount) || stat.touchCount < 0) errors.push(`dailyStats[${index}] touchCount 無效`);
    if (!isNumber(stat.inquiryCount) || stat.inquiryCount < 0) errors.push(`dailyStats[${index}] inquiryCount 無效`);
    if (!isNumber(stat.dealCount) || stat.dealCount < 0) errors.push(`dailyStats[${index}] dealCount 無效`);
    if (!isNumber(stat.revenue) || stat.revenue < 0) errors.push(`dailyStats[${index}] revenue 無效`);
    if (stat.cost !== undefined && (!isNumber(stat.cost) || stat.cost < 0)) errors.push(`dailyStats[${index}] cost 無效`);
    if (stat.profit !== undefined && !isNumber(stat.profit)) errors.push(`dailyStats[${index}] profit 無效`);
    if (!Array.isArray(stat.productsSold)) {
      errors.push(`dailyStats[${index}] productsSold 必須是陣列`);
    } else {
      stat.productsSold.forEach((soldItem, soldIndex) => {
        if (!productIds.has(soldItem.productId)) {
          warnings.push(`dailyStats[${index}].productsSold[${soldIndex}] 指向不存在的 productId：${soldItem.productId}`);
        }
        if (!isNumber(soldItem.quantity) || soldItem.quantity < 0) {
          errors.push(`dailyStats[${index}].productsSold[${soldIndex}] quantity 無效`);
        }
        if (!isNumber(soldItem.revenue) || soldItem.revenue < 0) {
          errors.push(`dailyStats[${index}].productsSold[${soldIndex}] revenue 無效`);
        }
      });
    }
    if (!isNumber(stat.updatedAt)) errors.push(`dailyStats[${index}] updatedAt 無效`);
  });

  data.settings.forEach((setting, index) => {
    if (!['light', 'dark', 'auto'].includes(setting.theme)) errors.push(`settings[${index}] theme 無效`);
    if (!['zh-TW', 'zh-CN', 'en'].includes(setting.language)) errors.push(`settings[${index}] language 無效`);
    if (!isNonEmptyString(setting.defaultCurrency)) errors.push(`settings[${index}] defaultCurrency 無效`);
    if (typeof setting.enableNotifications !== 'boolean') errors.push(`settings[${index}] enableNotifications 無效`);
    if (typeof setting.autoBackup !== 'boolean') errors.push(`settings[${index}] autoBackup 無效`);
    if (!isNumber(setting.updatedAt)) errors.push(`settings[${index}] updatedAt 無效`);
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
