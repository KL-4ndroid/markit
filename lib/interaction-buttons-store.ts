/**
 * 互動按鈕配置 - 重新設計版本
 * 
 * 核心理念：使用者不是在「設定功能」，而是在「說明他怎麼賣東西」
 */

export interface InteractionButton {
  id: string;           // 固定：'interest', 'engage', 'convert'
  role: 'interest' | 'engage' | 'convert';  // 角色（內部使用）
  label: string;        // 顯示名稱（使用者可自訂）
  emoji: string;        // 圖示
  description: string;  // 說明文字（內部使用）
}

const STORAGE_KEY = 'interaction_buttons_v2';

/**
 * 攤位類型
 */
export type BoothType = 'food' | 'accessory' | 'art' | 'clothing' | 'other';

/**
 * 預設情境配置
 * 
 * 重要原則：
 * - 「轉換」記錄的是「行為轉換」（關係往前走），不是「金錢轉換」（實際購買）
 * - 轉換必須是「非金錢、但可累積價值」的行為詞
 * - 實際銷售金額請使用「商品交易」功能
 */
export const DEFAULT_SCENARIOS: Record<BoothType, InteractionButton[]> = {
  food: [
    { 
      id: 'interest', 
      role: 'interest',
      label: '試吃', 
      emoji: '🍰',
      description: '顧客停下來看、拿起、試試看'
    },
    { 
      id: 'engage', 
      role: 'engage',
      label: '詢問', 
      emoji: '💬',
      description: '顧客開始跟你說話、問問題'
    },
    { 
      id: 'convert', 
      role: 'convert',
      label: '加入追蹤', 
      emoji: '➕',
      description: '顧客完成你想要的行為（建立未來聯繫）'
    },
  ],
  accessory: [
    { 
      id: 'interest', 
      role: 'interest',
      label: '拿起', 
      emoji: '👋',
      description: '顧客停下來看、拿起、試試看'
    },
    { 
      id: 'engage', 
      role: 'engage',
      label: '詢問', 
      emoji: '💬',
      description: '顧客開始跟你說話、問問題'
    },
    { 
      id: 'convert', 
      role: 'convert',
      label: '加 IG', 
      emoji: '📱',
      description: '顧客完成你想要的行為（建立未來聯繫）'
    },
  ],
  art: [
    { 
      id: 'interest', 
      role: 'interest',
      label: '翻看', 
      emoji: '👀',
      description: '顧客停下來看、拿起、試試看'
    },
    { 
      id: 'engage', 
      role: 'engage',
      label: '聊天', 
      emoji: '💬',
      description: '顧客開始跟你說話、問問題'
    },
    { 
      id: 'convert', 
      role: 'convert',
      label: '加 Line', 
      emoji: '💚',
      description: '顧客完成你想要的行為（建立未來聯繫）'
    },
  ],
  clothing: [
    { 
      id: 'interest', 
      role: 'interest',
      label: '試穿', 
      emoji: '👗',
      description: '顧客停下來看、拿起、試試看'
    },
    { 
      id: 'engage', 
      role: 'engage',
      label: '詢問', 
      emoji: '💬',
      description: '顧客開始跟你說話、問問題'
    },
    { 
      id: 'convert', 
      role: 'convert',
      label: '留下聯絡', 
      emoji: '📝',
      description: '顧客完成你想要的行為（建立未來聯繫）'
    },
  ],
  other: [
    { 
      id: 'interest', 
      role: 'interest',
      label: '看看', 
      emoji: '👀',
      description: '顧客停下來看、拿起、試試看'
    },
    { 
      id: 'engage', 
      role: 'engage',
      label: '詢問', 
      emoji: '💬',
      description: '顧客開始跟你說話、問問題'
    },
    { 
      id: 'convert', 
      role: 'convert',
      label: '後續聯絡', 
      emoji: '📞',
      description: '顧客完成你想要的行為（建立未來聯繫）'
    },
  ],
};

/**
 * 攤位類型資訊
 */
export const BOOTH_TYPES = [
  { id: 'food' as BoothType, label: '食品 / 飲料', emoji: '🍔' },
  { id: 'accessory' as BoothType, label: '飾品 / 配件', emoji: '💍' },
  { id: 'art' as BoothType, label: '插畫 / 創作', emoji: '🎨' },
  { id: 'clothing' as BoothType, label: '服飾', emoji: '👕' },
  { id: 'other' as BoothType, label: '其他', emoji: '📦' },
];

/**
 * 獲取互動按鈕配置
 */
export function getInteractionButtons(): InteractionButton[] {
  if (typeof window === 'undefined') {
    return DEFAULT_SCENARIOS.other;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as InteractionButton[];
    }
  } catch (error) {
    console.error('讀取互動按鈕設置失敗：', error);
  }
  
  return DEFAULT_SCENARIOS.other;
}

/**
 * 保存互動按鈕配置（本地）
 */
export function saveInteractionButtonsLocal(buttons: InteractionButton[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buttons));
  } catch (error) {
    console.error('保存互動按鈕設置失敗：', error);
    throw error;
  }
}

/**
 * 保存互動按鈕配置（本地 + 雲端）
 */
export async function saveInteractionButtons(
  buttons: InteractionButton[],
  userId?: string
): Promise<void> {
  // 1. 保存到本地
  saveInteractionButtonsLocal(buttons);
  
  // 2. 如果已登入，同步到雲端
  if (userId) {
    try {
      const { saveInteractionButtons: saveToCloud } = await import('@/lib/supabase/settings');
      await saveToCloud(userId, buttons);
      console.log('✅ 互動按鈕已同步到雲端');
    } catch (error) {
      console.error('同步到雲端失敗:', error);
      // 不拋出錯誤，本地保存已成功
    }
  }
}

/**
 * 檢查是否已完成設定
 */
export function isInteractionSetupComplete(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return !!stored;
  } catch (error) {
    return false;
  }
}

/**
 * 重置為預設配置
 */
export function resetInteractionButtons(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('重置互動按鈕設置失敗：', error);
  }
}
