'use client';

import { useDateTimePicker } from '@/hooks/useDateTimePicker';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
  disabled?: boolean;
  'aria-describedby'?: string;
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
  id,
  disabled = false,
  'aria-describedby': ariaDescribedBy,
}: TimePickerProps) {
  const { inputRef, pickerRef } = useDateTimePicker({
    type: 'time', value, disabled,
    onChange: next => { if (typeof next === 'string') onChange(next); },
  });

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      aria-haspopup="dialog"
      readOnly
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!disabled) pickerRef.current?.open();
        }
      }}
      value={value}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      aria-describedby={ariaDescribedBy}
      className={className}
    />
  );
}
