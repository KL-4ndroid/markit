'use client';

import { useEffect, useRef, useCallback } from 'react';

interface DateMultiPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  minDate?: string;
  maxDate?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
  disabled?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
}

/**
 * DateMultiPicker - 多選日期選擇器
 * 
 * 支持選擇多個不連續的日期
 * 使用純 JS 實現的日期選擇器，iOS PWA 友好
 */
export function DateMultiPicker({
  value,
  onChange,
  minDate,
  maxDate,
  className = '',
  placeholder = '選擇日期',
  required = false,
  id,
  disabled = false,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: DateMultiPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const initialMinDateRef = useRef(minDate);
  const initialMaxDateRef = useRef(maxDate);

  // ✅ 保持 onChange 引用最新，但不觸發重新初始化
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // ✅ 只在組件掛載時初始化一次
  useEffect(() => {
    if (!inputRef.current) return;

    let mounted = true;

    // 動態載入 DateTimePicker
    const initPicker = async () => {
      // 載入 CSS
      if (!document.querySelector('link[href*="DateTimePicker.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/lib/date-time-picker/DateTimePicker.css';
        document.head.appendChild(link);
      }

      // 載入 JS
      const { default: DateTimePicker } = await import('@/lib/date-time-picker/DateTimePicker.js');

      if (!mounted) return;

      // ✅ 銷毀舊的 picker（如果存在）
      if (pickerRef.current) {
        pickerRef.current.destroy();
        pickerRef.current = null;
      }

      pickerRef.current = new DateTimePicker({
        type: 'date',
        mode: 'multiple', // ✅ 多選模式
        input: inputRef.current,
        onChange: (newValue: string[]) => {
          // ✅ 使用 ref 來獲取最新的 onChange
          onChangeRef.current(newValue);
        },
        minDate: initialMinDateRef.current,
        maxDate: initialMaxDateRef.current,
      });
      
      // ✅ 設置初始選中的日期
      if (initialValueRef.current && initialValueRef.current.length > 0) {
        pickerRef.current.selectedDates = [...initialValueRef.current];
      }
    };

    initPicker();

    return () => {
      mounted = false;
      if (pickerRef.current) {
        pickerRef.current.destroy();
        pickerRef.current = null;
      }
    };
  }, []); // ✅ 空依賴陣列，只初始化一次

  // ✅ 當 minDate 或 maxDate 改變時，更新 picker 配置
  useEffect(() => {
    if (pickerRef.current) {
      pickerRef.current.minDate = minDate || null;
      pickerRef.current.maxDate = maxDate || null;
    }
  }, [minDate, maxDate]);

  // 當 value 從外部改變時，更新 picker 和 input
  useEffect(() => {
    if (pickerRef.current) {
      pickerRef.current.selectedDates = value || [];
    }
    
    if (inputRef.current) {
      // 格式化顯示
      if (value && value.length > 0) {
        // 動態導入工具函數
        import('@/lib/utils').then(({ formatDateRanges }) => {
          if (inputRef.current) {
            inputRef.current.value = formatDateRanges(value);
          }
        });
      } else {
        inputRef.current.value = '';
      }
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      readOnly
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      className={className}
    />
  );
}
