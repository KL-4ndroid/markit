/**
 * Form Auto-Save Utilities - 表單自動暫存工具
 * 
 * 當 Session 過期時自動保存表單資料
 * 登入成功後自動恢復
 */

const FORM_AUTOSAVE_PREFIX = 'form_autosave_';
const AUTOSAVE_EXPIRY = 30 * 60 * 1000; // 30 分鐘過期

export interface FormAutoSaveData {
  formId: string;
  data: Record<string, any>;
  timestamp: number;
  pathname: string;
}

/**
 * 保存表單資料到 sessionStorage
 */
export function saveFormData(formId: string, data: Record<string, any>, pathname?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const saveData: FormAutoSaveData = {
      formId,
      data,
      timestamp: Date.now(),
      pathname: pathname || window.location.pathname,
    };
    
    const key = `${FORM_AUTOSAVE_PREFIX}${formId}`;
    sessionStorage.setItem(key, JSON.stringify(saveData));
    
    console.log(`💾 表單已暫存: ${formId}`, data);
  } catch (error) {
    console.error('保存表單資料失敗:', error);
  }
}

/**
 * 從 sessionStorage 讀取表單資料
 */
export function loadFormData(formId: string): FormAutoSaveData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = `${FORM_AUTOSAVE_PREFIX}${formId}`;
    const saved = sessionStorage.getItem(key);
    
    if (!saved) return null;
    
    const data: FormAutoSaveData = JSON.parse(saved);
    
    // 檢查是否過期
    const now = Date.now();
    if (now - data.timestamp > AUTOSAVE_EXPIRY) {
      console.log(`⏰ 表單暫存已過期: ${formId}`);
      clearFormData(formId);
      return null;
    }
    
    console.log(`📂 載入暫存表單: ${formId}`, data);
    return data;
  } catch (error) {
    console.error('讀取表單資料失敗:', error);
    return null;
  }
}

/**
 * 清除表單資料
 */
export function clearFormData(formId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `${FORM_AUTOSAVE_PREFIX}${formId}`;
    sessionStorage.removeItem(key);
    console.log(`🗑️ 清除表單暫存: ${formId}`);
  } catch (error) {
    console.error('清除表單資料失敗:', error);
  }
}

/**
 * 清除所有表單資料
 */
export function clearAllFormData(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(FORM_AUTOSAVE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
    console.log('🗑️ 清除所有表單暫存');
  } catch (error) {
    console.error('清除所有表單資料失敗:', error);
  }
}

/**
 * 獲取所有暫存的表單
 */
export function getAllSavedForms(): FormAutoSaveData[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const keys = Object.keys(sessionStorage);
    const forms: FormAutoSaveData[] = [];
    
    keys.forEach(key => {
      if (key.startsWith(FORM_AUTOSAVE_PREFIX)) {
        const saved = sessionStorage.getItem(key);
        if (saved) {
          try {
            const data: FormAutoSaveData = JSON.parse(saved);
            
            // 檢查是否過期
            const now = Date.now();
            if (now - data.timestamp <= AUTOSAVE_EXPIRY) {
              forms.push(data);
            } else {
              sessionStorage.removeItem(key);
            }
          } catch {
            // 忽略解析錯誤
          }
        }
      }
    });
    
    return forms;
  } catch (error) {
    console.error('獲取所有表單資料失敗:', error);
    return [];
  }
}

/**
 * React Hook: 自動保存表單
 */
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function useFormAutoSave(
  formId: string,
  formData: Record<string, any>,
  options: {
    enabled?: boolean;
    debounceMs?: number;
  } = {}
) {
  const { enabled = true, debounceMs = 1000 } = options;
  const pathname = usePathname();
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled) return;

    // 清除之前的定時器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 防抖保存
    timeoutRef.current = setTimeout(() => {
      // 只保存非空表單
      const hasData = Object.values(formData).some(value => {
        if (typeof value === 'string') return value.trim() !== '';
        if (typeof value === 'number') return value !== 0;
        if (Array.isArray(value)) return value.length > 0;
        return value != null;
      });

      if (hasData) {
        saveFormData(formId, formData, pathname || undefined);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formId, formData, enabled, debounceMs, pathname]);

  // 提供手動清除的方法
  const clearSaved = () => clearFormData(formId);

  return { clearSaved };
}

/**
 * React Hook: 載入暫存的表單
 */
export function useFormAutoLoad(formId: string) {
  const savedData = loadFormData(formId);
  
  return {
    savedData,
    hasSavedData: savedData !== null,
    clearSaved: () => clearFormData(formId),
  };
}
