/**
 * Supabase 用戶設定服務
 * 
 * 處理用戶個人化設定的雲端同步
 */

import { supabase } from './client';
import type { QuickActionButton } from '@/lib/quick-actions-store';

export interface UserSettings {
  user_id: string;
  quick_action_buttons: QuickActionButton[];
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
 * 初始化用戶設定（首次登入時調用）
 */
export async function initializeUserSettings(userId: string): Promise<void> {
  try {
    // 檢查是否已存在
    const existing = await getUserSettings(userId);
    
    if (!existing) {
      // 創建預設設定
      await saveUserSettings(userId, {
        quick_action_buttons: [
          { id: 'button_1', label: '詢問', emoji: '💬' },
          { id: 'button_2', label: '試吃', emoji: '🍰' },
          { id: 'button_3', label: '拍照', emoji: '📸' },
        ],
        theme: 'auto',
        language: 'zh-TW',
      });
      
      console.log('✅ 用戶設定已初始化');
    }
  } catch (error) {
    console.error('初始化用戶設定失敗:', error);
  }
}
