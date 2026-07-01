/**
 * Supabase 用戶設定服務
 * 
 * 處理用戶個人化設定的雲端同步
 */

import { supabase } from './client';
import type { QuickActionButton } from '@/lib/quick-actions-store';
import type { InteractionButton } from '@/lib/interaction-buttons-store';

export interface UserSettings {
  user_id: string;
  brand_name?: string | null;
  quick_action_buttons?: QuickActionButton[];
  interaction_buttons?: InteractionButton[];
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * 獲取用戶設定
 */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // 如果設定不存在，返回 null
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('獲取用戶設定失敗:', error);
    throw error;
  }
}

/**
 * 保存用戶設定（upsert）
 */
export async function saveUserSettings(
  userId: string,
  settings: Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) throw error;

    console.log('✅ 用戶設定已保存到雲端');
  } catch (error) {
    console.error('保存用戶設定失敗:', error);
    throw error;
  }
}

/**
 * 保存快速互動按鈕設定
 */
export async function saveQuickActionButtons(
  userId: string,
  buttons: QuickActionButton[]
): Promise<void> {
  return saveUserSettings(userId, {
    quick_action_buttons: buttons,
  });
}

/**
 * 獲取快速互動按鈕設定
 */
export async function getQuickActionButtons(userId: string): Promise<QuickActionButton[] | null> {
  try {
    const settings = await getUserSettings(userId);
    return settings?.quick_action_buttons || null;
  } catch (error) {
    console.error('獲取快速互動按鈕設定失敗:', error);
    return null;
  }
}

/**
 * 保存互動按鈕設定（新版）
 * 注意：儲存到 quick_action_buttons 欄位（複用現有欄位）
 */
export async function saveInteractionButtons(
  userId: string,
  buttons: InteractionButton[]
): Promise<void> {
  return saveUserSettings(userId, {
    quick_action_buttons: buttons as any,  // 複用 quick_action_buttons 欄位
  });
}

/**
 * 獲取互動按鈕設定（新版）
 * 注意：從 quick_action_buttons 欄位讀取（複用現有欄位）
 */
export async function getInteractionButtons(userId: string): Promise<InteractionButton[] | null> {
  try {
    const settings = await getUserSettings(userId);
    return settings?.quick_action_buttons as any || null;  // 從 quick_action_buttons 讀取
  } catch (error) {
    console.error('獲取互動按鈕設定失敗:', error);
    return null;
  }
}

/**
 * 初始化用戶設定（首次登入時調用）
 */
export async function initializeUserSettings(userId: string): Promise<void> {
  try {
    // 檢查是否已存在
    const existing = await getUserSettings(userId);
    
    if (!existing) {
      // 創建預設設定（儲存到 quick_action_buttons 欄位）
      await saveUserSettings(userId, {
        quick_action_buttons: [
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
        ] as any,  // 複用 quick_action_buttons 欄位
        theme: 'auto',
        language: 'zh-TW',
      });
      
      console.log('✅ 用戶設定已初始化');
    }
  } catch (error) {
    console.error('初始化用戶設定失敗:', error);
  }
}
