/**
 * 特性開關：員工模式
 * 
 * 用於控制是否啟用員工模式功能
 * 預設關閉，確保不影響現有用戶
 */

/**
 * 檢查是否啟用員工模式
 * @returns 是否啟用
 */
export function isStaffModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    return localStorage.getItem('feature_staff_mode') === 'true';
  } catch {
    return false;
  }
}

/**
 * 啟用員工模式
 */
export function enableStaffMode(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('feature_staff_mode', 'true');
      console.log('✅ 員工模式已啟用');
    } catch (error) {
      console.error('❌ 啟用員工模式失敗:', error);
    }
  }
}

/**
 * 停用員工模式
 */
export function disableStaffMode(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('feature_staff_mode');
      console.log('✅ 員工模式已停用');
    } catch (error) {
      console.error('❌ 停用員工模式失敗:', error);
    }
  }
}

/**
 * 切換員工模式
 * @returns 切換後的狀態
 */
export function toggleStaffMode(): boolean {
  const currentState = isStaffModeEnabled();
  
  if (currentState) {
    disableStaffMode();
    return false;
  } else {
    enableStaffMode();
    return true;
  }
}

/**
 * 獲取員工模式狀態（用於 UI 顯示）
 */
export function getStaffModeStatus(): {
  enabled: boolean;
  label: string;
  description: string;
} {
  const enabled = isStaffModeEnabled();
  
  return {
    enabled,
    label: enabled ? '已啟用' : '已停用',
    description: enabled 
      ? '員工可以查看被授權的市集和商品' 
      : '使用原有的查詢邏輯',
  };
}
