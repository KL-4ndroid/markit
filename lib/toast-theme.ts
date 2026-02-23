/**
 * Toast 通知主題配置
 * 
 * 根據用戶角色提供不同的 Toast 樣式
 */

import { toast } from 'sonner';

/**
 * 員工模式成功提示
 */
export function staffSuccessToast(message: string, description?: string) {
  toast.success(message, {
    description,
    icon: '👍',
    style: {
      background: 'linear-gradient(to right, #8B7BA6, #A6B4D4)',
      color: 'white',
      border: 'none',
    },
  });
}

/**
 * 員工模式錯誤提示
 */
export function staffErrorToast(message: string, description?: string) {
  toast.error(message, {
    description,
    icon: '⚠️',
    style: {
      background: '#F0E8F3',
      color: '#8B7BA6',
      border: '1px solid rgba(139, 123, 166, 0.2)',
    },
  });
}

/**
 * 權限不足提示
 */
export function permissionDeniedToast(message: string = '此功能僅限老闆使用') {
  toast.error(message, {
    icon: '🔒',
    style: {
      background: '#F0E8F3',
      color: '#8B7BA6',
      border: '1px solid rgba(139, 123, 166, 0.2)',
    },
  });
}

/**
 * 老闆模式成功提示
 */
export function ownerSuccessToast(message: string, description?: string) {
  toast.success(message, {
    description,
    icon: '✅',
    style: {
      background: 'linear-gradient(to right, #7B9FA6, #D4A574)',
      color: 'white',
      border: 'none',
    },
  });
}

/**
 * 根據角色顯示成功提示
 */
export function roleBasedSuccessToast(isStaff: boolean, message: string, description?: string) {
  if (isStaff) {
    staffSuccessToast(message, description);
  } else {
    ownerSuccessToast(message, description);
  }
}
