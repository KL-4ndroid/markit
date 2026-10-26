import type { DateTimePickerPort } from '@/lib/platform/contracts/date-time-picker';
import { webDateTimePicker } from '@/lib/platform/web/date-time-picker';

let activePort: DateTimePickerPort = webDateTimePicker;
export function getDateTimePickerPort(): DateTimePickerPort { return activePort; }
export function installDateTimePickerPort(port: DateTimePickerPort): () => void {
  const previous = activePort;
  activePort = port;
  return () => { if (activePort === port) activePort = previous; };
}
