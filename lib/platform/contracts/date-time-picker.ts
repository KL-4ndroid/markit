/** Presentation port; the host target is opaque outside its platform adapter. */
export type PickerValue = string | string[];
export interface PickerState {
  value: PickerValue;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
}
export interface PickerOptions extends PickerState {
  type: 'date' | 'time';
  mode?: 'single' | 'multiple';
  onChange(value: PickerValue): void;
}
export interface PickerController {
  open(): void;
  update(state: PickerState): void;
  destroy(): void;
}
export interface DateTimePickerPort {
  attach(target: unknown, options: PickerOptions): Promise<PickerController>;
}
