'use client';

import { CalendarDays } from 'lucide-react';
import { type InputHTMLAttributes } from 'react';
import { useDateTimePicker } from '@/hooks/useDateTimePicker';

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
  const { inputRef, pickerRef } = useDateTimePicker({
    type: 'date', value, minDate, maxDate, disabled,
    onChange: next => { if (typeof next === 'string') onChange(next); },
  });

  return (
    <span className="relative block">
      <input
        {...inputProps}
        ref={inputRef}
        type="text"
        aria-haspopup="dialog"
        onKeyDown={event => {
          inputProps.onKeyDown?.(event);
          if (!event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            if (!disabled) pickerRef.current?.open();
          }
        }}
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
