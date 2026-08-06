'use client';

import { useEffect, useRef } from 'react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

/**
 * DatePicker - React wrapper for DateTimePicker
 * 
 * 使用純 JS 實現的日期選擇器，iOS PWA 友好
 */
export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  className = '',
  placeholder = '選擇日期',
  required = false,
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<any>(null);

  useEffect(() => {
    if (!inputRef.current) return;

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

      pickerRef.current = new DateTimePicker({
        type: 'date',
        input: inputRef.current,
        onChange: (newValue: string) => {
          onChange(newValue);
        },
        minDate,
        maxDate,
      });
    };

    initPicker();

    return () => {
      if (pickerRef.current) {
        pickerRef.current.destroy();
      }
    };
  }, [minDate, maxDate, onChange]);

  // 當 value 從外部改變時，更新 input
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="text"
      readOnly
      value={value}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );
}
