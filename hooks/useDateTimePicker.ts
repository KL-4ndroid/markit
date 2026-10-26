'use client';

import { useEffect, useRef } from 'react';
import type { PickerController, PickerOptions } from '@/lib/platform/contracts/date-time-picker';
import { getDateTimePickerPort } from '@/lib/platform/date-time-picker-capability';

/** Keep callbacks/configuration current without recreating the DOM picker. */
export function useDateTimePicker(options: PickerOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<PickerController | null>(null);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
    pickerRef.current?.update(options);
  });
  const { type, mode } = options;
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    let mounted = true;
    let controller: PickerController | undefined;
    void getDateTimePickerPort().attach(input, {
      ...optionsRef.current,
      onChange: value => optionsRef.current.onChange(value),
    }).then(handle => {
      if (!mounted) { handle.destroy(); return; }
      controller = handle;
      pickerRef.current = handle;
      handle.update(optionsRef.current);
    });
    return () => {
      mounted = false;
      controller?.destroy();
      pickerRef.current = null;
    };
  }, [type, mode]);
  return { inputRef, pickerRef };
}
