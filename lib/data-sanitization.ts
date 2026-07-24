/**
 * Data Sanitization Utilities - 資料脫敏工具
 *
 * 本模組為向後兼容層，所有核心邏輯已遷移至 `@/lib/permissions/PermissionGate`。
 * 新程式碼請直接使用 PermissionGate 的 API。
 *
 * ## 架構說明
 *
 * - **PermissionGate**：同步層使用（infoLevel 漸進脫敏）
 * - **本模組**：UI 層使用（UserRole 二元判斷）
 *
 * ## 遷移指引
 *
 * 舊 API → 新 API：
 * - sanitizeObject(obj, type, userRole) → sanitizeWithLevel(obj, entity, resolveInfoLevel(userRole))
 * - sanitizeEvents(events, userRole)    → sanitizeEventsWithLevel(events, resolveInfoLevel(userRole))
 * - canViewSensitiveData(userRole)      → canViewSensitiveData(userRole)（兩者相同）
 */

import type { UserRole } from '@/hooks/useUserRole';
import {
  createPermissionGate,
  resolveInfoLevel,
  sanitizeWithLevel,
  sanitizeArrayWithLevel,
  sanitizeEventsWithLevel,
  canViewSensitiveData as gateCanViewSensitiveData,
  canPerformSensitiveAction as gateCanPerformSensitiveAction,
  maskSensitiveValue as gateMaskSensitiveValue,
  renderSensitiveData as gateRenderSensitiveData,
  type InfoLevel,
  type EntityType,
} from '@/lib/permissions/PermissionGate';

// ─── 同步層 API re-exports（由 PermissionGate 提供）───────────────────────────────

export type { InfoLevel, EntityType };
export {
  createPermissionGate,
  resolveInfoLevel,
  sanitizeWithLevel,
  sanitizeArrayWithLevel,
  sanitizeEventsWithLevel,
} from '@/lib/permissions/PermissionGate';

// ─── UI 層 API（委託給 PermissionGate）───────────────────────────────────────

export function canViewSensitiveData(userRole: UserRole | null | undefined): boolean {
  return gateCanViewSensitiveData(userRole);
}

export function canPerformSensitiveAction(userRole: UserRole | null | undefined): boolean {
  return gateCanPerformSensitiveAction(userRole);
}

export function maskSensitiveValue(value: unknown, type: 'currency' | 'text' = 'currency'): string {
  return gateMaskSensitiveValue(value, type);
}

export function renderSensitiveData<T>(
  value: T,
  userRole: UserRole | null | undefined,
  maskValue: T = '***' as T
): T {
  return gateRenderSensitiveData(value, userRole, maskValue);
}

/**
 * 過濾物件中的敏感欄位（同時支援 snake_case 與 camelCase）
 *
 * @deprecated 請使用 sanitizeWithLevel(obj, entity, resolveInfoLevel(userRole))
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  entity: EntityType,
  userRole: UserRole
): T {
  return sanitizeWithLevel(obj, entity, resolveInfoLevel(userRole)) as T;
}

/**
 * 過濾陣列中的敏感欄位
 *
 * @deprecated 請使用 sanitizeArrayWithLevel(array, entity, resolveInfoLevel(userRole))
 */
export function sanitizeArray<T extends Record<string, unknown>>(
  array: T[],
  entity: EntityType,
  userRole: UserRole
): T[] {
  return sanitizeArrayWithLevel(array, entity, resolveInfoLevel(userRole));
}

/**
 * 過濾事件資料（特殊處理）
 * - 過濾掉成本相關事件
 * - 對保留事件執行深層脫敏
 *
 * @deprecated 請使用 sanitizeEventsWithLevel(events, resolveInfoLevel(userRole))
 */
export function sanitizeEvents<T extends { type: string; payload?: unknown }>(
  events: T[],
  userRole: UserRole
): T[] {
  return sanitizeEventsWithLevel(events, resolveInfoLevel(userRole));
}

/**
 * 為統計資料添加脫敏處理
 *
 * @deprecated 請使用 sanitizeWithLevel(stats, 'stats', resolveInfoLevel(userRole))
 */
export function sanitizeStats<T extends Record<string, unknown>>(
  stats: T,
  userRole: UserRole
): T {
  return sanitizeWithLevel(stats, 'stats', resolveInfoLevel(userRole)) as T;
}

/**
 * 檢查特定欄位是否為敏感欄位
 *
 * @deprecated 此函式已廢棄，不再用於生產程式碼
 */
/**
 * 檢查特定欄位是否為敏感欄位
 *
 * ⚠️ 語義變化（v2 重構）：以 Level 0 最嚴格級別為準。
 * 詳見 @/lib/permissions/PermissionGate 的 isSensitiveField 文件。
 */
export { isSensitiveField } from '@/lib/permissions/PermissionGate';
