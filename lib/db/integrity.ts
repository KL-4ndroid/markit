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

function isValidDateString(value: unknown): boolean {
  if (!isNonEmptyString(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
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

  data.events.forEach((event, index) => {
    if (!isNonEmptyString(event.id)) errors.push(`events[${index}] 缺少有效 id`);
    if (!EVENT_TYPES.has(event.type)) errors.push(`events[${index}] 事件類型不支援：${String(event.type)}`);
    if (!isNumber(event.timestamp)) errors.push(`events[${index}] 缺少有效 timestamp`);
    if (!isRecord(event.payload)) errors.push(`events[${index}] payload 必須是物件`);

    if (event.market_id && !marketIds.has(event.market_id)) {
      errors.push(`events[${index}] 指向不存在的 market_id：${event.market_id}`);
    }
  });

  data.markets.forEach((market, index) => {
    if (!isNonEmptyString(market.id)) errors.push(`markets[${index}] 缺少有效 id`);
    if (!isNonEmptyString(market.name)) errors.push(`markets[${index}] 缺少有效 name`);
    if (!isNonEmptyString(market.location)) errors.push(`markets[${index}] 缺少有效 location`);
    if (!isValidDateString(market.startDate)) errors.push(`markets[${index}] startDate 無效`);
    if (!isValidDateString(market.endDate)) errors.push(`markets[${index}] endDate 無效`);
    if (!isNumber(market.registrationFee)) errors.push(`markets[${index}] registrationFee 無效`);
    if (!isNumber(market.boothCost)) errors.push(`markets[${index}] boothCost 無效`);
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
    if (!isNumber(stat.cost) || stat.cost < 0) errors.push(`dailyStats[${index}] cost 無效`);
    if (!isNumber(stat.profit)) errors.push(`dailyStats[${index}] profit 無效`);
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
