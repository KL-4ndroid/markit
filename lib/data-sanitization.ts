/**
 * Data Sanitization Utilities - 資料脫敏工具
 * 
 * 根據使用者角色過濾敏感資料
 * 員工無法查看成本、利潤等敏感資訊
 */

import { UserRole } from '@/hooks/useUserRole';

/**
 * 敏感欄位列表
 */
const SENSITIVE_FIELDS = {
  // 產品相關
  product: ['cost', 'profit_margin', 'supplier_info'],
  
  // 市集相關
  market: ['total_cost', 'net_profit', 'profit_margin'],
  
  // 交易相關
  deal: ['cost', 'profit', 'profit_margin'],
  
  // 事件相關
  event: ['cost', 'total_cost'],
  
  // 統計相關
  stats: ['total_cost', 'net_profit', 'profit_margin', 'cost_breakdown'],
};

/**
 * 檢查使用者是否可以查看敏感資料
 */
export function canViewSensitiveData(userRole: UserRole): boolean {
  // 只有老闆可以查看敏感資料
  return !userRole.isStaff;
}

/**
 * 過濾物件中的敏感欄位
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  type: keyof typeof SENSITIVE_FIELDS,
  userRole: UserRole
): T {
  // 如果可以查看敏感資料，直接返回原物件
  if (canViewSensitiveData(userRole)) {
    return obj;
  }

  // 複製物件，避免修改原物件
  const sanitized = { ...obj };
  
  // 獲取該類型的敏感欄位
  const fieldsToRemove = SENSITIVE_FIELDS[type] || [];
  
  // 移除敏感欄位
  fieldsToRemove.forEach(field => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });
  
  return sanitized;
}

/**
 * 過濾陣列中的敏感欄位
 */
export function sanitizeArray<T extends Record<string, any>>(
  array: T[],
  type: keyof typeof SENSITIVE_FIELDS,
  userRole: UserRole
): T[] {
  // 如果可以查看敏感資料，直接返回原陣列
  if (canViewSensitiveData(userRole)) {
    return array;
  }

  return array.map(item => sanitizeObject(item, type, userRole));
}

/**
 * 過濾事件資料（特殊處理）
 * 員工無法查看 cost 相關的事件
 */
export function sanitizeEvents<T extends { type: string; payload?: any }>(
  events: T[],
  userRole: UserRole
): T[] {
  // 如果可以查看敏感資料，直接返回原陣列
  if (canViewSensitiveData(userRole)) {
    return events;
  }

  // 過濾掉成本相關的事件
  const costEventTypes = [
    'cost_added',
    'cost_updated',
    'cost_deleted',
    'inventory_cost_updated',
  ];

  return events.filter(event => {
    // 移除成本相關事件
    if (costEventTypes.includes(event.type)) {
      return false;
    }
    
    // 如果事件有 payload，過濾敏感欄位
    if (event.payload) {
      event.payload = sanitizeObject(event.payload, 'event', userRole);
    }
    
    return true;
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
  const sensitiveFields = SENSITIVE_FIELDS[type] || [];
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
  // 只有老闆可以執行敏感操作（如查看成本、修改價格等）
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

  const sanitized = { ...stats };
  
  // 移除敏感統計欄位
  const sensitiveStatsFields = [
    'total_cost',
    'net_profit',
    'profit_margin',
    'cost_breakdown',
    'average_cost',
    'cost_per_item',
  ];
  
  sensitiveStatsFields.forEach(field => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });
  
  return sanitized;
}
