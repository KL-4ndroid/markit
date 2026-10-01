/**
 * PermissionGate - 統一脫敏閘道
 *
 * 所有資料寫入 IndexedDB 前必須經過此 gate。
 * 根據 infoLevel 動態決定哪些欄位需要移除，實現老闆到員工的權限連續體。
 *
 * ## 設計原則
 *
 * - **單一真相來源**：脫敏規則只在一處定義（SENSITIVE_FIELDS_BY_LEVEL）
 * - **職責分層**：
 *   - Sync 層（useSync）：使用 infoLevel 感知 API（漸進脫敏）
 *   - UI 層：使用 UserRole API（二元判斷：老闆 vs 員工）
 * - **infoLevel 驅動**：老闆=3（無限制），員工=0/1/2（漸進限制）
 *
 * ## 脫敏層級
 *
 * | Level | 角色          | 可見範圍                           |
 * |-------|---------------|-------------------------------------|
 * | 3     | 老闆          | 所有欄位（包含 cost, profit）       |
 * | 2     | 員工（完整資訊）| 名稱、位置、互動、成交，隱藏成本利潤 |
 * | 1     | 員工（基本資訊）| 名稱、位置、互動數，隱藏成本利潤成交 |
 * | 0     | 員工（僅操作）  | 名稱、位置，僅操作（新增互動/成交）  |
 *
 * ## 使用方式
 *
 * ```ts
 * import { createPermissionGate } from '@/lib/permissions/PermissionGate';
 *
 * // Sync 層：使用 infoLevel
 * const gate = createPermissionGate({ infoLevel: 2, entity: 'market' });
 * const cleanMarket = gate.sanitize(rawMarket);
 *
 * // UI 層：使用 UserRole
 * const canSee = canViewSensitiveData(userRole);
 * ```
 */

import type { UserRole } from '@/hooks/useUserRole';

// ─────────────────────────────────────────────────────────────────────────────
// 類型定義
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 資訊揭露層級
 * - 3: 老闆，無限制
 * - 2: 員工（完整），可見名稱/位置/互動/成交
 * - 1: 員工（基本），可見名稱/位置/互動數
 * - 0: 員工（僅操作），可見名稱/位置
 */
export type InfoLevel = 0 | 1 | 2 | 3;

export type EntityType = 'market' | 'product' | 'deal' | 'event' | 'stats';

export interface PermissionGateOptions {
  /** 資訊揭露層級：3=老闆, 0-2=員工 */
  infoLevel: InfoLevel;
  /** 要脫敏的實體類型 */
  entity: EntityType;
}

// ─────────────────────────────────────────────────────────────────────────────
// 脫敏欄位定義（單一真相來源）
//
// Level 2/1/0 的敏感欄位透過组合計算得出，避免重複定義：
//   Level 2 = 基準（成本/利潤/供應商資訊）
//   Level 1 = Level 2 + 收入/定價
//   Level 0 = Level 1 + 互動/成交統計
// ─────────────────────────────────────────────────────────────────────────────

/** Level 2（員工完整）的基準敏感欄位 */
const BASE_FIELDS: Record<EntityType, string[]> = {
  market: [
    'totalCost', 'total_cost',
    'totalProfit', 'total_profit',
    'netProfit', 'net_profit',
    'profitMargin', 'profit_margin',
    'boothCost', 'booth_cost',
    'registrationFee', 'registration_fee',
    'deposit',
    'commissionRate', 'commission_rate',
    'costBreakdown', 'cost_breakdown',
    'averageCost', 'average_cost',
    'costPerItem', 'cost_per_item',
    // ✅ 設備 rental 欄位（tableRental / chairRental / umbrellaRental / tableclothRental）
    // 不視為敏感，金額保留：員工需知道自己是否要帶設備（> 0 = 已承租、0 = 自備）。
    // 配合 supabase/migrations/042_preserve_staff_rental_existence.sql：
    // staff_accessible_markets view 員工 branch 已直接回傳 m.table_rental 原始金額。
  ],
  product: [
    'cost', 'supplierInfo', 'supplier_info',
    'profitMargin', 'profit_margin',
    'grossMargin', 'gross_margin',
  ],
  deal: [
    'cost', 'profit', 'profitMargin', 'profit_margin',
  ],
  event: [
    // 直接成本欄位
    'cost', 'totalCost', 'total_cost',
    'manualCost', 'manual_cost',
    'costAtTimeOfSale', 'cost_at_time_of_sale',
    'supplierInfo', 'supplier_info',
    // product_updated 等事件的 updates{} 巢狀結構（Level 2 即需隱藏）
    'profitMargin', 'profit_margin',
    'grossMargin', 'gross_margin',
    // market_created/market_updated 等事件的 payload.market{} 結構
    'totalProfit', 'total_profit',
    'netProfit', 'net_profit',
    'boothCost', 'booth_cost',
    'registrationFee', 'registration_fee',
    'deposit',
    'commissionRate', 'commission_rate',
    'costBreakdown', 'cost_breakdown',
    'averageCost', 'average_cost',
    'costPerItem', 'cost_per_item',
    // ✅ 設備 rental 欄位（tableRental / chairRental / umbrellaRental / tableclothRental）
    // 不視為敏感，金額保留：員工需在 events replay 時保留設備租金金額。
    // 配合 supabase/migrations/042_preserve_staff_rental_existence.sql，
    // staff_accessible_markets view 員工 branch 已直接回傳 m.table_rental 原始金額。
  ],
  stats: [
    'totalCost', 'total_cost',
    'netProfit', 'net_profit',
    'profitMargin', 'profit_margin',
    'costBreakdown', 'cost_breakdown',
    'averageCost', 'average_cost',
    'costPerItem', 'cost_per_item',
  ],
};

/** Level 1 在 Level 2 基準上額外隱藏的欄位（收入相關） */
const LEVEL_1_EXTRA: Record<EntityType, string[]> = {
  market: ['revenue', 'totalRevenue', 'total_revenue', 'averageDealValue', 'average_deal_value'],
  product: ['price', 'sellingPrice', 'selling_price'],
  deal: ['revenue', 'totalRevenue', 'total_revenue', 'price', 'quantity', 'sellingPrice', 'selling_price'],
  event: ['revenue', 'price', 'quantity'],
  stats: ['revenue', 'totalRevenue', 'total_revenue', 'averageDealValue', 'average_deal_value'],
};

/** Level 0 在 Level 1 基礎上額外隱藏的欄位（互動統計） */
const LEVEL_0_EXTRA: Record<EntityType, string[]> = {
  market: [
    'totalInteractions', 'total_interactions',
    'totalDeals', 'total_deals',
    'interactionCount', 'interaction_count',
    'dealCount', 'deal_count',
  ],
  product: ['stock'],
  deal: [],
  event: [],
  stats: ['totalInteractions', 'total_interactions', 'totalDeals', 'total_deals'],
};

/**
 * 將 base 的每個 entity 與 extra 的同 key 拼接，
 * 產生乾淨的 fields map。
 */
function buildFieldsMap(
  base: Record<EntityType, string[]>,
  extra?: Record<EntityType, string[]>
): Record<EntityType, string[]> {
  const entities: EntityType[] = ['market', 'product', 'deal', 'event', 'stats'];
  const result = {} as Record<EntityType, string[]>;
  for (const key of entities) {
    result[key] = [...base[key], ...((extra?.[key]) ?? [])];
  }
  return result;
}

const EMPTY_FIELDS: Record<EntityType, string[]> = {
  market: [], product: [], deal: [], event: [], stats: [],
};

const SENSITIVE_FIELDS_BY_LEVEL: Record<InfoLevel, Record<EntityType, string[]>> = {
  3: EMPTY_FIELDS,                                                   // 老闆：無敏感欄位
  2: buildFieldsMap(BASE_FIELDS),                                     // Level 2：基準欄位
  1: buildFieldsMap(BASE_FIELDS, LEVEL_1_EXTRA),                     // Level 1：+ 收入
  0: buildFieldsMap(buildFieldsMap(BASE_FIELDS, LEVEL_1_EXTRA), LEVEL_0_EXTRA), // Level 0：+ 互動統計
};

/** 成本相關事件類型（根據 infoLevel 決定是否過濾） */
export const COST_EVENT_TYPES = new Set([
  'cost_added',
  'cost_updated',
  'cost_deleted',
  'inventory_cost_updated',
]);

/** Level 1+ 額外過濾的成交相關事件 */
export const REVENUE_EVENT_TYPES = new Set([
  'deal_closed',
  'deal_deleted',
]);

/** Level 0 過濾的互動事件（只保留 market 本身的存在性） */
export const INTERACTION_EVENT_TYPES = new Set([
  'interaction_recorded',
  'interaction_deleted',
]);

// ─────────────────────────────────────────────────────────────────────────────
// 遞迴脫敏核心
// ─────────────────────────────────────────────────────────────────────────────

function removeSensitiveFields(
  obj: Record<string, unknown>,
  sensitiveFields: string[]
): Record<string, unknown> {
  if (sensitiveFields.length === 0) return obj;

  const toRemove = new Set(sensitiveFields);
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (toRemove.has(key)) continue;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = removeSensitiveFields(value as Record<string, unknown>, sensitiveFields);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? removeSensitiveFields(item as Record<string, unknown>, sensitiveFields)
          : item
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PermissionGate 類別
// ─────────────────────────────────────────────────────────────────────────────

export class PermissionGate {
  private readonly infoLevel: InfoLevel;
  private readonly entity: EntityType;

  constructor(options: PermissionGateOptions) {
    this.infoLevel = options.infoLevel;
    this.entity = options.entity;
  }

  /** 目前 infoLevel + entity 下要移除的敏感欄位 */
  getSensitiveFields(): string[] {
    return SENSITIVE_FIELDS_BY_LEVEL[this.infoLevel][this.entity];
  }

  /** 是否為老闆（Level 3） */
  isOwner(): boolean {
    return this.infoLevel === 3;
  }

  /** 是否需要脫敏（Level 0-2 且有敏感欄位） */
  needsSanitization(): boolean {
    return this.infoLevel < 3 && this.getSensitiveFields().length > 0;
  }

  /**
   * 脫敏任意輸入。
   * 接受 `unknown` 而非 `Record<string, unknown>`，免除呼叫端做 type assertion。
   */
  sanitize(input: unknown): unknown {
    if (!this.needsSanitization()) return input;
    if (input === null || typeof input !== 'object' || Array.isArray(input)) return input;

    const record = input as Record<string, unknown>;
    return removeSensitiveFields(record, this.getSensitiveFields());
  }

  /**
   * 脫敏陣列
   */
  sanitizeArray(array: unknown[]): unknown[] {
    if (!this.needsSanitization()) return array;
    return array.map(item => this.sanitize(item));
  }

  /**
   * 判斷某事件類型是否應被阻擋（不寫入 IndexedDB）
   */
  shouldBlockEvent(eventType: string): boolean {
    if (this.isOwner()) return false;
    if (COST_EVENT_TYPES.has(eventType)) return true;
    if (this.infoLevel <= 1 && REVENUE_EVENT_TYPES.has(eventType)) return true;
    if (this.infoLevel === 0 && INTERACTION_EVENT_TYPES.has(eventType)) return true;
    return false;
  }

  /**
   * 對事件進行脫敏（不移除事件，只淨化 payload）
   */
  sanitizeEvent<T extends { type: string; payload?: unknown }>(event: T): T {
    if (this.isOwner() || this.shouldBlockEvent(event.type)) return event;

    if (event.payload != null && typeof event.payload === 'object') {
      const sanitized = this.sanitize(event.payload);
      return { ...event, payload: sanitized } as T;
    }
    return event;
  }

  /**
   * 清理市場快照中的敏感衍生資料。
   * 在 event handler replay 後呼叫，確保 handler 寫入的衍生資料被移除。
   */
  sanitizeMarketProjection(market: Record<string, unknown>): Record<string, unknown> {
    if (!this.needsSanitization()) return market;
    return removeSensitiveFields({ ...market }, this.getSensitiveFields());
  }

  /**
   * 清理每日統計快照中的敏感衍生資料。
   */
  sanitizeDailyStatsProjection(stats: Record<string, unknown>): Record<string, unknown> {
    if (!this.needsSanitization()) return stats;
    return removeSensitiveFields({ ...stats }, this.getSensitiveFields());
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 快捷工廠
// ─────────────────────────────────────────────────────────────────────────────

export function createPermissionGate(options: PermissionGateOptions): PermissionGate {
  return new PermissionGate(options);
}

// ─────────────────────────────────────────────────────────────────────────────
// 同步層 API（infoLevel 感知）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 統一 sanitize 介面（供 useSync 直接呼叫）
 */
export function sanitizeWithLevel<T = unknown>(
  obj: T,
  entity: EntityType,
  infoLevel: InfoLevel
): T {
  return createPermissionGate({ infoLevel, entity }).sanitize(obj) as T;
}

/**
 * 統一 sanitizeArray 介面
 */
export function sanitizeArrayWithLevel<T = unknown>(
  array: T[],
  entity: EntityType,
  infoLevel: InfoLevel
): T[] {
  return createPermissionGate({ infoLevel, entity }).sanitizeArray(array) as T[];
}

/**
 * 統一 sanitizeEvents 介面
 */
export function sanitizeEventsWithLevel<T extends { type: string; payload?: unknown }>(
  events: T[],
  infoLevel: InfoLevel
): T[] {
  const gate = createPermissionGate({ infoLevel, entity: 'event' });
  return events
    .filter(event => !gate.shouldBlockEvent(event.type))
    .map(event => gate.sanitizeEvent(event));
}

/**
 * 從 UserRole 解析 infoLevel
 *
 * 目前過渡策略：
 * - 老闆（isStaff=false）→ Level 3
 * - 員工 → Level 2（未來可從 permissions.infoLevel 動態讀取）
 */
export function resolveInfoLevel(userRole: UserRole | null | undefined): InfoLevel {
  if (!userRole) return 3;
  if (!userRole.isStaff) return 3;
  return (userRole.permissions as { infoLevel?: InfoLevel } | null)?.infoLevel ?? 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI 層 API（UserRole 二元判斷）
// 給 sync-context.tsx、DataSanitizationExample.tsx 等 UI 層使用
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 檢查使用者是否可以查看敏感資料（成本、利潤等）
 * 老闆=true，員工=false
 */
export function canViewSensitiveData(userRole: UserRole | null | undefined): boolean {
  return resolveInfoLevel(userRole) === 3;
}

/**
 * 檢查使用者是否可以執行敏感操作（編輯成本、利潤等）
 * 目前與 canViewSensitiveData 等義，未來可擴展為獨立的 canPerformSensitiveAction
 */
export function canPerformSensitiveAction(userRole: UserRole | null | undefined): boolean {
  return canViewSensitiveData(userRole);
}

/**
 * 替換敏感資料為遮罩字串
 * 用於需要顯示欄位結構但不顯示實際值的情境
 */
export function maskSensitiveValue(value: unknown, type: 'currency' | 'text' = 'currency'): string {
  return type === 'currency' ? '***' : '******';
}

/**
 * 根據使用者角色條件回傳原始值或遮罩值。
 * 回傳型別與傳入值相同，可安全用於 JSX。
 */
export function renderSensitiveData<T>(
  value: T,
  userRole: UserRole | null | undefined,
  maskValue: T = '***' as T
): T {
  return canViewSensitiveData(userRole) ? value : maskValue;
}

/**
 * 檢查特定欄位是否為敏感欄位
 *
 * ⚠️ 語義變化通知（v2 重構）：
 * - 舊實作（data-sanitization.ts）：靜態檢查某欄位是否在 SENSITIVE_FIELDS[type] 清單
 * - 新實作：以 Level 0（最嚴格）為準，覆蓋所有員工級別（0-2）
 *
 * 這意味著原本在舊清單中但不在 Level 0 的欄位（如 price 在舊 product 清單中），
 * 新實作會視為「非敏感」——因為 Level 2 員工本來就可見 price。
 * 如需舊行為，請直接查 SENSITIVE_FIELDS_BY_LEVEL[2][entity]。
 */
export function isSensitiveField(field: string, entity: EntityType): boolean {
  return SENSITIVE_FIELDS_BY_LEVEL[0][entity].includes(field);
}
