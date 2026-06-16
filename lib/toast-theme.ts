/**
 * Toast 通知主題配置 — 出攤本 BoothBook VI 對齊版（2026-06-17）
 *
 * Sonner toast 的 style 是 inline CSS 物件，無法直接套用 Tailwind token，
 * 因此這裡直接用 CSS 變數（rgb var(--brand-xxx)）取代舊 hex。
 *
 * 對照：
 *   員工成功（紫灰 → 淺藍紫漸層） → 主色 80% → 主色 60%
 *   員工錯誤（淺紫底） → primary/10
 *   員工邊框（紫灰 20% 透明） → primary/15
 *   老闆成功（霧藍 → 暖木漸層） → primary → secondary
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
      background: 'linear-gradient(to right, rgb(var(--brand-primary) / 0.8), rgb(var(--brand-primary) / 0.6))',
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
      background: 'rgb(var(--brand-primary) / 0.1)',
      color: 'rgb(var(--brand-primary))',
      border: '1px solid rgb(var(--brand-primary) / 0.2)',
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
      background: 'rgb(var(--brand-primary) / 0.1)',
      color: 'rgb(var(--brand-primary))',
      border: '1px solid rgb(var(--brand-primary) / 0.2)',
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
      background: 'linear-gradient(to right, rgb(var(--brand-primary)), rgb(var(--brand-secondary)))',
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
