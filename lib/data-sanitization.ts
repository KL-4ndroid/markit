/**
 * Data Sanitization Utilities - 資料脫敏工具
 *
 * 根據使用者角色過濾敏感資料
 * 員工無法查看成本、利潤等敏感資訊
 */

import type { UserRole } from '@/hooks/useUserRole';

/**
 * 敏感欄位列表（同時包含 snake_case 與 camelCase）
 */
const SENSITIVE_FIELDS: Record<string, string[]> = {
  // 產品相關
  product: [
    // snake_case
    'cost',
    'profit_margin',
    'gross_margin',
    'supplier_info',
    // camelCase
    'cost',
    'profitMargin',
    'grossMargin',
    'supplierInfo',
  ],

  // 市集相關
  market: [
    // snake_case
    'total_cost',
    'total_profit',
    'net_profit',
    'profit_margin',
    'booth_cost',
    'registration_fee',
    'deposit',
    'table_rental',
    'chair_rental',
    'umbrella_rental',
    'tablecloth_rental',
    'commission_rate',
    // camelCase
    'totalCost',
    'totalProfit',
    'netProfit',
    'profitMargin',
    'boothCost',
    'registrationFee',
    'deposit',
    'tableRental',
    'chairRental',
    'umbrellaRental',
    'tableclothRental',
    'commissionRate',
  ],

  // 交易相關
  deal: [
    // snake_case
    'cost',
    'profit',
    'profit_margin',
    // camelCase
    'cost',
    'profit',
    'profitMargin',
  ],

  // 事件相關（第一層欄位 + 巢狀欄位）
  event: [
    // snake_case
    'cost',
    'total_cost',
    'manual_cost',
    'cost_at_time_of_sale',
    // camelCase
    'cost',
    'totalCost',
    'manualCost',
    'costAtTimeOfSale',
  ],

  // 統計相關
  stats: [
    // snake_case
    'total_cost',
    'net_profit',
    'profit_margin',
    'cost_breakdown',
    'average_cost',
    'cost_per_item',
    // camelCase
    'totalCost',
    'netProfit',
    'profitMargin',
    'costBreakdown',
    'averageCost',
    'costPerItem',
  ],
};

/** 成本相關事件類型（整個事件過濾） */
const COST_EVENT_TYPES = new Set([
  'cost_added',
  'cost_updated',
  'cost_deleted',
  'inventory_cost_updated',
]);

/**
 * 遞迴深層脫敏：
 * - 淺拷貝物件，保留原物件不變
 * - 刪除指定類型的敏感欄位
 * - 同時刪除所有類型的敏感欄位（全域池）
 * - 特殊處理 items[] 巢狀陣列
 * - 特殊處理 updates{} 巢狀物件
 */
function removeSensitiveFields(
  obj: Record<string, unknown>,
  typeSensitiveFields: string[]
): Record<string, unknown> {
  // 全域敏感欄位池：任何類型下都是敏感的欄位，在此一併過濾
  const allSensitive = new Set<string>(typeSensitiveFields);
  for (const fields of Object.values(SENSITIVE_FIELDS)) {
    for (const f of fields) {
      allSensitive.add(f);
    }
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // 跳過敏感欄位
    if (allSensitive.has(key)) {
      continue;
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // 巢狀物件：遞迴處理
      result[key] = removeSensitiveFields(
        value as Record<string, unknown>,
        typeSensitiveFields
      );
    } else if (Array.isArray(value)) {
      // 陣列：逐一處理每個元素
      result[key] = value.map(item => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          return removeSensitiveFields(item as Record<string, unknown>, typeSensitiveFields);
        }
        return item;
      });
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 檢查使用者是否可以查看敏感資料
 */
export function canViewSensitiveData(userRole: UserRole): boolean {
  return !userRole.isStaff;
}

/**
 * 過濾物件中的敏感欄位（同時支援 snake_case 與 camelCase）
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  type: keyof typeof SENSITIVE_FIELDS,
  userRole: UserRole
): T {
  if (canViewSensitiveData(userRole)) {
    return obj;
  }

  const sensitiveFields = SENSITIVE_FIELDS[type] ?? [];
  return removeSensitiveFields(obj, sensitiveFields) as T;
}

/**
 * 過濾陣列中的敏感欄位
 */
export function sanitizeArray<T extends Record<string, any>>(
  array: T[],
  type: keyof typeof SENSITIVE_FIELDS,
  userRole: UserRole
): T[] {
  if (canViewSensitiveData(userRole)) {
    return array;
  }

  const sensitiveFields = SENSITIVE_FIELDS[type] ?? [];
  return array.map(item => removeSensitiveFields(item, sensitiveFields) as T);
}

/**
 * 過濾事件資料（特殊處理）
 * - 過濾掉成本相關事件
 * - 對保留事件執行深層脫敏
 * - 永遠不回傳修改過原始事件或 payload 的結果
 */
export function sanitizeEvents<T extends { type: string; payload?: any }>(
  events: T[],
  userRole: UserRole
): T[] {
  if (canViewSensitiveData(userRole)) {
    return events;
  }

  const sensitiveFields = SENSITIVE_FIELDS.event ?? [];

  return events
    .filter(event => !COST_EVENT_TYPES.has(event.type))
    .map(event => {
      const sanitizedPayload = event.payload != null
        ? removeSensitiveFields(event.payload as Record<string, unknown>, sensitiveFields)
        : undefined;

      return {
        ...event,
        payload: sanitizedPayload,
      } as T;
    });
}

/**
 * 替換敏感資料為遮罩
 * 用於需要顯示欄位但不顯示實際值的情況
 */
export function maskSensitiveValue(value: any, type: 'currency' | 'text' = 'currency'): string {
  if (type === 'currency') {
    return '***';
  }
  return '******';
}

/**
 * 檢查特定欄位是否為敏感欄位
 */
export function isSensitiveField(field: string, type: keyof typeof SENSITIVE_FIELDS): boolean {
  const sensitiveFields = SENSITIVE_FIELDS[type] ?? [];
  return sensitiveFields.includes(field);
}

/**
 * 為 UI 組件提供的便捷函數
 * 根據使用者角色決定是否顯示敏感資料
 */
export function renderSensitiveData(
  value: any,
  userRole: UserRole,
  maskValue: string = '***'
): any {
  if (canViewSensitiveData(userRole)) {
    return value;
  }
  return maskValue;
}

/**
 * 檢查使用者是否可以執行敏感操作
 */
export function canPerformSensitiveAction(userRole: UserRole): boolean {
  return !userRole.isStaff;
}

/**
 * 為統計資料添加脫敏處理
 */
export function sanitizeStats<T extends Record<string, any>>(
  stats: T,
  userRole: UserRole
): T {
  if (canViewSensitiveData(userRole)) {
    return stats;
  }

  return removeSensitiveFields(stats, SENSITIVE_FIELDS.stats ?? []) as T;
}
