'use client';

import { useEffect, useRef } from 'react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

/**
 * TimePicker - React wrapper for DateTimePicker
 * 
 * 使用純 JS 實現的時間選擇器，iOS PWA 友好
 */
export function TimePicker({
  value,
  onChange,
  className = '',
  placeholder = '選擇時間',
  required = false,
}: TimePickerProps) {
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
        type: 'time',
        input: inputRef.current,
        onChange: (newValue: string) => {
          onChange(newValue);
        },
      });
    };

    initPicker();

    return () => {
      if (pickerRef.current) {
        pickerRef.current.destroy();
      }
    };
  }, [onChange]);

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
