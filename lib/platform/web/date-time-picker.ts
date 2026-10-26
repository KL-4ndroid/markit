import type { DateTimePickerPort, PickerState, PickerValue } from '@/lib/platform/contracts/date-time-picker';
import { formatDateRanges } from '@/lib/utils';

export const webDateTimePicker: DateTimePickerPort = {
  async attach(target, options) {
    const input = target as HTMLInputElement;
    const { default: DateTimePicker } = await import('@/lib/date-time-picker/DateTimePicker.js');
    if (!document.querySelector('link[href*="DateTimePicker.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/lib/date-time-picker/DateTimePicker.css';
      document.head.appendChild(link);
    }
    const picker = new DateTimePicker({ ...options, input });
    let previousValue: PickerValue | undefined;
    let destroyed = false;
    const update = (state: PickerState) => {
      if (destroyed) return;
      const boundsChanged = picker.minDate !== (state.minDate || null) || picker.maxDate !== (state.maxDate || null);
      picker.minDate = state.minDate || null;
      picker.maxDate = state.maxDate || null;
      input.disabled = !!state.disabled;
      if (input.disabled) picker.close();
      const valueChanged = JSON.stringify(previousValue) !== JSON.stringify(state.value);
      if (valueChanged) {
        previousValue = Array.isArray(state.value) ? [...state.value] : state.value;
        if (Array.isArray(state.value)) {
          picker.selectedDates = [...state.value];
          input.value = formatDateRanges(state.value);
        } else {
          input.value = state.value;
          if (options.type === 'time') {
            const [hour, minute] = state.value ? state.value.split(':').map(Number) : [9, 0];
            picker.selectedTime = { hour, minute };
          } else {
            picker.selectedDate = state.value ? new Date(`${state.value}T00:00:00`) : null;
            picker.currentDate = picker.selectedDate ? new Date(picker.selectedDate) : new Date();
          }
        }
      }
      if (picker.isOpen && (valueChanged || boundsChanged)) picker.render();
    };
    update(options);
    return {
      open: () => { if (!destroyed) picker.open(); },
      update,
      destroy: () => { destroyed = true; picker.destroy(); },
    };
  },
};
