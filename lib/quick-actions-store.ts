/**
 * 快速互動按鈕設置
 */

export interface QuickActionButton {
  id: string;      // 唯一識別，也作為互動類型
  label: string;   // 按鈕文字
  emoji: string;   // 圖示 Emoji
}

const STORAGE_KEY = 'quick_action_buttons';

// 預設按鈕配置
const DEFAULT_BUTTONS: QuickActionButton[] = [
  { id: 'button_1', label: '詢問', emoji: '💬' },
  { id: 'button_2', label: '試吃', emoji: '🍰' },
  { id: 'button_3', label: '拍照', emoji: '📸' },
];

/**
 * 獲取快速互動按鈕配置
 */
export function getQuickActionButtons(): QuickActionButton[] {
  if (typeof window === 'undefined') return DEFAULT_BUTTONS;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const buttons = JSON.parse(stored);
      // 確保每個按鈕都有 id
      return buttons.map((btn: any, index: number) => ({
        id: btn.id || `button_${index + 1}`,
        label: btn.label || '',
        emoji: btn.emoji || '❓',
      }));
    }
  } catch (error) {
    console.error('讀取快速互動按鈕設置失敗：', error);
  }
  
  return DEFAULT_BUTTONS;
}

/**
 * 保存快速互動按鈕配置
 */
export function saveQuickActionButtons(buttons: QuickActionButton[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buttons));
  } catch (error) {
    console.error('保存快速互動按鈕設置失敗：', error);
    throw error;
  }
}

/**
 * 重置為預設配置
 */
export function resetQuickActionButtons(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('重置快速互動按鈕設置失敗：', error);
  }
}
