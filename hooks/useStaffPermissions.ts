/**
 * 員工權限檢查 Hook
 * 用於統一處理員工模式的權限檢查邏輯
 */

import { useMemo } from 'react';
import type { MarketWithAccess, ProductWithAccess } from '@/types/staff';

type AccessItem = MarketWithAccess | ProductWithAccess;

export function useStaffPermissions() {
  /**
   * 檢查用戶對某項目的權限
   * @param item - 市集或商品對象（包含 access_type 和 permissions）
   * @param action - 要執行的操作（view 或 edit）
   * @returns 是否有權限
   */
  const checkPermission = useMemo(() => {
    return (item: AccessItem | null | undefined, action: 'view' | 'edit'): boolean => {
      if (!item) return false;

      // 如果是老闆，擁有全部權限
      if (item.access_type === 'owner') {
        return true;
      }

      // 如果是員工，檢查 permissions
      const perms = item.permissions;
      if (!perms) return false;

      if (action === 'view') return perms.can_view ?? false;
      if (action === 'edit') return perms.can_edit ?? false;

      return false;
    };
  }, []);

  /**
   * 檢查是否為老闆
   * @param item - 市集或商品對象
   * @returns 是否為老闆
   */
  const isOwner = useMemo(() => {
    return (item: AccessItem | null | undefined): boolean => {
      return item?.access_type === 'owner';
    };
  }, []);

  /**
   * 檢查是否為員工
   * @param item - 市集或商品對象
   * @returns 是否為員工
   */
  const isStaff = useMemo(() => {
    return (item: AccessItem | null | undefined): boolean => {
      return item?.access_type === 'staff';
    };
  }, []);

  /**
   * 檢查是否可以查看敏感信息（成本、利潤等）
   * @param item - 市集或商品對象
   * @returns 是否可以查看敏感信息
   */
  const canViewSensitiveData = useMemo(() => {
    return (item: AccessItem | null | undefined): boolean => {
      // 只有老闆可以查看敏感信息
      return isOwner(item);
    };
  }, [isOwner]);

  /**
   * 獲取權限描述文字
   * @param item - 市集或商品對象
   * @returns 權限描述
   */
  const getPermissionLabel = useMemo(() => {
    return (item: AccessItem | null | undefined): string => {
      if (!item) return '無權限';
      
      if (isOwner(item)) {
        return '老闆';
      }
      
      if (isStaff(item)) {
        const perms = item.permissions;
        if (perms.can_edit) return '員工（可編輯）';
        if (perms.can_view) return '員工（僅查看）';
        return '員工';
      }
      
      return '未知';
    };
  }, [isOwner, isStaff]);

  return {
    checkPermission,
    isOwner,
    isStaff,
    canViewSensitiveData,
    getPermissionLabel,
  };
}
