'use client';

import { CalendarDays } from 'lucide-react';
import { useEffect, useRef, type InputHTMLAttributes } from 'react';

interface DatePickerProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'readOnly'
> {
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
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
  disabled = false,
  ...inputProps
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<any>(null);

  useEffect(() => {
    if (!inputRef.current || disabled) return;

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
  }, [disabled, minDate, maxDate, onChange]);

  // 當 value 從外部改變時，更新 input
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <span className="relative block">
      <input
        {...inputProps}
        ref={inputRef}
        type="text"
        readOnly
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`${className} pr-12`}
      />
      <CalendarDays
        className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/65"
        aria-hidden="true"
      />
    </span>
  );
}
