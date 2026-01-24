/**
 * 快速互動按鈕設置
 * 
 * 支援本地儲存（localStorage）和雲端同步（Supabase）
 */

export interface QuickActionButton {
  id: string;      // 唯一識別，也作為互動類型
  label: string;   // 按鈕文字
  emoji: string;   // 圖示 Emoji
}

const STORAGE_KEY = 'quick_action_buttons';

// 預設按鈕配置
export const DEFAULT_BUTTONS: QuickActionButton[] = [
  { id: 'button_1', label: '詢問', emoji: '💬' },
  { id: 'button_2', label: '試吃', emoji: '🍰' },
  { id: 'button_3', label: '拍照', emoji: '📸' },
];

/**
 * 獲取快速互動按鈕配置（本地）
 */
export function getQuickActionButtons(): QuickActionButton[] {
  if (typeof window === 'undefined') return DEFAULT_BUTTONS;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const buttons = JSON.parse(stored);
      // 確保每個按鈕都有 id
      return buttons.map((btn: QuickActionButton, index: number) => ({
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
 * 保存快速互動按鈕配置（本地）
 */
export function saveQuickActionButtonsLocal(buttons: QuickActionButton[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buttons));
  } catch (error) {
    console.error('保存快速互動按鈕設置失敗：', error);
    throw error;
  }
}

/**
 * 保存快速互動按鈕配置（本地 + 雲端）
 * 
 * @param buttons - 按鈕配置
 * @param userId - 用戶 ID（如果已登入）
 */
export async function saveQuickActionButtons(
  buttons: QuickActionButton[],
  userId?: string
): Promise<void> {
  // 1. 保存到本地
  saveQuickActionButtonsLocal(buttons);
  
  // 2. 如果已登入，同步到雲端
  if (userId) {
    try {
      const { saveQuickActionButtons: saveToCloud } = await import('@/lib/supabase/settings');
      await saveToCloud(userId, buttons);
      console.log('✅ 快速互動按鈕已同步到雲端');
    } catch (error) {
      console.error('同步到雲端失敗:', error);
      // 不拋出錯誤，本地保存已成功
    }
  }
}

/**
 * 從雲端拉取快速互動按鈕配置
 * 
 * @param userId - 用戶 ID
 * @returns 按鈕配置，如果不存在則返回 null
 */
export async function pullQuickActionButtonsFromCloud(
  userId: string
): Promise<QuickActionButton[] | null> {
  try {
    const { getQuickActionButtons } = await import('@/lib/supabase/settings');
    const buttons = await getQuickActionButtons(userId);
    
    if (buttons) {
      // 同步到本地
      saveQuickActionButtonsLocal(buttons);
      console.log('✅ 已從雲端拉取快速互動按鈕設定');
      return buttons;
    }
    
    return null;
  } catch (error) {
    console.error('從雲端拉取設定失敗:', error);
    return null;
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
