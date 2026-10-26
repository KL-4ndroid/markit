'use client';

import { useDateTimePicker } from '@/hooks/useDateTimePicker';

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
  const { inputRef, pickerRef } = useDateTimePicker({
    type: 'date', mode: 'multiple', value, minDate, maxDate, disabled,
    onChange: next => { if (Array.isArray(next)) onChange(next); },
  });

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
      aria-haspopup="dialog"
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!disabled) pickerRef.current?.open();
        }
      }}
      className={className}
    />
  );
}
