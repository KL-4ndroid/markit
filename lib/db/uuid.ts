/**
 * BoothBook - UUID 生成輔助函數
 * 
 * 本檔案提供 UUID 生成相關的輔助函數
 * 用於支援離線建立資料與多人協作
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * 生成 UUID v4
 * 
 * @returns UUID 字串
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * 驗證 UUID 格式
 * 
 * @param uuid - 要驗證的字串
 * @returns 是否為有效的 UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 生成短 UUID（用於邀請碼等場景）
 * 
 * @param length - 長度（預設 6）
 * @returns 短 UUID 字串（大寫字母和數字）
 */
export function generateShortUUID(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * 從 UUID 生成短 ID（用於顯示）
 * 
 * @param uuid - 完整的 UUID
 * @returns 短 ID（前 8 個字元）
 */
export function getShortId(uuid: string): string {
  return uuid.split('-')[0];
}
