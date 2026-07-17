'use client';

import {
  Armchair,
  ClipboardCheck,
  DoorOpen,
  Moon,
  Store,
  Table,
  Umbrella,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { DateMultiPicker } from '@/components/ui/DateMultiPicker';
import { FormField } from '@/components/ui/FormField';
import { TimePicker } from '@/components/ui/TimePicker';
import type { MarketCoreFormErrors } from '@/lib/markets/market-form';

const inputClassName =
  'min-h-12 w-full rounded-2xl border border-primary/15 bg-atelier-paper px-4 text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground/65 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground';

interface MarketBasicFieldsProps {
  idPrefix: string;
  name: string;
  location: string;
  dates: string[];
  errors: MarketCoreFormErrors;
  mode?: 'owner' | 'manager';
  disabled?: boolean;
  onNameChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onDatesChange: (value: string[]) => void;
}

export function MarketBasicFields({
  idPrefix,
  name,
  location,
  dates,
  errors,
  mode = 'owner',
  disabled = false,
  onNameChange,
  onLocationChange,
  onDatesChange,
}: MarketBasicFieldsProps) {
  const isManagerMode = mode === 'manager';

  return (
    <section className="space-y-5" aria-labelledby={`${idPrefix}-basic-heading`}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft-pink text-primary">
          <Store className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 id={`${idPrefix}-basic-heading`} className="text-base font-semibold text-foreground">
              基本資料
            </h3>
            <span className="rounded-full bg-soft-yellow px-2.5 py-1 text-[11px] font-medium text-secondary">優先填寫</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {isManagerMode ? '確認這次市集的營業日期。' : '名稱、地點與日期是市集的核心資料。'}
          </p>
        </div>
      </div>

      {!isManagerMode && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id={`${idPrefix}-name`}
            label="市集名稱"
            required
            error={errors.name}
          >
            {(fieldProps) => (
              <input
                {...fieldProps}
                type="text"
                value={name}
                onChange={event => onNameChange(event.target.value)}
                placeholder="例如：華山文創市集"
                autoComplete="organization"
                disabled={disabled}
                className={inputClassName}
              />
            )}
          </FormField>

          <FormField
            id={`${idPrefix}-location`}
            label="地點"
            required
            error={errors.location}
          >
            {(fieldProps) => (
              <input
                {...fieldProps}
                type="text"
                value={location}
                onChange={event => onLocationChange(event.target.value)}
                placeholder="例如：台北市中正區"
                autoComplete="street-address"
                disabled={disabled}
                className={inputClassName}
              />
            )}
          </FormField>
        </div>
      )}

      <FormField
        id={`${idPrefix}-dates`}
        label="市集日期"
        required
        hint="可一次選擇多個不連續日期。"
        error={errors.dates}
      >
        {(fieldProps) => (
          <DateMultiPicker
            {...fieldProps}
            value={dates}
            onChange={onDatesChange}
            placeholder="選擇一個或多個日期"
            required
            disabled={disabled}
            className={inputClassName}
          />
        )}
      </FormField>
    </section>
  );
}

export type MarketTimelineField =
  | 'earlyEntryTime'
  | 'checkInTime'
  | 'operatingStartTime'
  | 'operatingEndTime';

interface MarketTimelineFieldsProps {
  idPrefix: string;
  noEarlyEntry: boolean;
  earlyEntryTime: string;
  checkInTime: string;
  operatingStartTime: string;
  operatingEndTime: string;
  operatingDuration: string;
  totalDuration: string;
  disabled?: boolean;
  onNoEarlyEntryChange: (value: boolean) => void;
  onChange: (field: MarketTimelineField, value: string) => void;
  onUseDefaults?: () => void;
}

interface TimelineRowProps {
  id: string;
  label: string;
  value: string;
  icon: typeof Store;
  disabled: boolean;
  onChange: (value: string) => void;
}

function TimelineRow({ id, label, value, icon: Icon, disabled, onChange }: TimelineRowProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
      <label htmlFor={id} className="flex min-h-11 items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {label}
      </label>
      <TimePicker
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={inputClassName}
        placeholder="選擇時間"
      />
    </div>
  );
}

export function MarketTimelineFields({
  idPrefix,
  noEarlyEntry,
  earlyEntryTime,
  checkInTime,
  operatingStartTime,
  operatingEndTime,
  operatingDuration,
  totalDuration,
  disabled = false,
  onNoEarlyEntryChange,
  onChange,
  onUseDefaults,
}: MarketTimelineFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-primary/10 bg-soft-green/45 px-4 transition-colors hover:border-primary/25">
          <input
            type="checkbox"
            checked={noEarlyEntry}
            onChange={event => onNoEarlyEntryChange(event.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary/40"
          />
          <span className="text-sm font-medium text-foreground">不提前進場</span>
        </label>
        {onUseDefaults && (
          <Button variant="ghost" size="compact" onClick={onUseDefaults} disabled={disabled}>
            使用預設時間
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {!noEarlyEntry && (
          <TimelineRow
            id={`${idPrefix}-early-entry-time`}
            label="提前進場"
            value={earlyEntryTime}
            icon={DoorOpen}
            disabled={disabled}
            onChange={value => onChange('earlyEntryTime', value)}
          />
        )}
        <TimelineRow
          id={`${idPrefix}-check-in-time`}
          label="報到"
          value={checkInTime}
          icon={ClipboardCheck}
          disabled={disabled}
          onChange={value => onChange('checkInTime', value)}
        />
        <TimelineRow
          id={`${idPrefix}-operating-start-time`}
          label="開始營業"
          value={operatingStartTime}
          icon={Store}
          disabled={disabled}
          onChange={value => onChange('operatingStartTime', value)}
        />
        <TimelineRow
          id={`${idPrefix}-operating-end-time`}
          label="結束營業"
          value={operatingEndTime}
          icon={Moon}
          disabled={disabled}
          onChange={value => onChange('operatingEndTime', value)}
        />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl border border-primary/10 bg-soft-yellow/45 p-3">
          <dt className="text-xs text-muted-foreground">營業時長</dt>
          <dd className="mt-1 font-medium tabular-nums text-foreground">{operatingDuration}</dd>
        </div>
        <div className="rounded-2xl border border-primary/10 bg-soft-green/50 p-3">
          <dt className="text-xs text-muted-foreground">含進場總時長</dt>
          <dd className="mt-1 font-medium tabular-nums text-foreground">{totalDuration}</dd>
        </div>
      </dl>
    </div>
  );
}

interface MarketCostFieldsProps {
  idPrefix: string;
  boothCost: number;
  deposit: number;
  commissionRate: number;
  fixedCostTotal: number;
  disabled?: boolean;
  onChange: (field: 'boothCost' | 'deposit' | 'commissionRate', value: number) => void;
}

export function MarketCostFields({
  idPrefix,
  boothCost,
  deposit,
  commissionRate,
  fixedCostTotal,
  disabled = false,
  onChange,
}: MarketCostFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={`${idPrefix}-booth-cost`} label="攤位費">
          {(fieldProps) => (
            <input
              {...fieldProps}
              type="number"
              value={boothCost}
              onChange={event => onChange('boothCost', Number(event.target.value))}
              min="0"
              step="1"
              inputMode="decimal"
              disabled={disabled}
              className={inputClassName}
            />
          )}
        </FormField>
        <FormField id={`${idPrefix}-deposit`} label="保證金">
          {(fieldProps) => (
            <input
              {...fieldProps}
              type="number"
              value={deposit}
              onChange={event => onChange('deposit', Number(event.target.value))}
              min="0"
              step="1"
              inputMode="decimal"
              disabled={disabled}
              className={inputClassName}
            />
          )}
        </FormField>
      </div>
      <FormField id={`${idPrefix}-commission-rate`} label="營業額抽成" hint="輸入 10 代表抽成 10%。">
        {(fieldProps) => (
          <input
            {...fieldProps}
            type="number"
            value={commissionRate}
            onChange={event => onChange('commissionRate', Number(event.target.value))}
            min="0"
            max="100"
            step="0.1"
            inputMode="decimal"
            disabled={disabled}
            className={inputClassName}
          />
        )}
      </FormField>
      <p className="rounded-2xl border border-secondary/15 bg-soft-yellow/45 p-3 text-sm text-muted-foreground">
        攤位與設備固定成本合計
        <strong className="ml-2 font-medium tabular-nums text-foreground">
          NT$ {fixedCostTotal.toLocaleString()}
        </strong>
      </p>
    </div>
  );
}

export type MarketEquipmentField = 'tableRental' | 'chairRental' | 'umbrellaRental';
export type MarketEquipmentFreeField = 'tableFree' | 'chairFree' | 'umbrellaFree';

interface MarketEquipmentFieldsProps {
  idPrefix: string;
  rentals: Record<MarketEquipmentField, number>;
  free: Record<MarketEquipmentFreeField, boolean>;
  disabled?: boolean;
  onRentalChange: (field: MarketEquipmentField, value: number) => void;
  onFreeChange: (field: MarketEquipmentFreeField, value: boolean) => void;
}

const EQUIPMENT_OPTIONS: Array<{
  rentalField: MarketEquipmentField;
  freeField: MarketEquipmentFreeField;
  label: string;
  icon: typeof Table;
}> = [
  { rentalField: 'tableRental', freeField: 'tableFree', label: '桌子', icon: Table },
  { rentalField: 'chairRental', freeField: 'chairFree', label: '椅子', icon: Armchair },
  { rentalField: 'umbrellaRental', freeField: 'umbrellaFree', label: '傘具', icon: Umbrella },
];

export function MarketEquipmentFields({
  idPrefix,
  rentals,
  free,
  disabled = false,
  onRentalChange,
  onFreeChange,
}: MarketEquipmentFieldsProps) {
  return (
    <div className="space-y-4">
      {EQUIPMENT_OPTIONS.map(option => {
        const Icon = option.icon;
        const isFree = free[option.freeField];
        const inputId = `${idPrefix}-${option.rentalField}`;
        return (
          <div key={option.rentalField} className="grid gap-3 rounded-2xl border border-primary/10 bg-soft-green/25 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <FormField id={inputId} label={`${option.label}租金`}>
              {(fieldProps) => (
                <div className="relative">
                  <Icon className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <input
                    {...fieldProps}
                    type="number"
                    value={rentals[option.rentalField]}
                    onChange={event => onRentalChange(option.rentalField, Number(event.target.value))}
                    min="0"
                    step="1"
                    inputMode="decimal"
                    disabled={disabled || isFree}
                    className={`${inputClassName} pl-9`}
                  />
                </div>
              )}
            </FormField>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-primary/10 bg-atelier-paper px-3 text-sm text-foreground transition-colors hover:border-primary/25">
              <input
                type="checkbox"
                checked={isFree}
                onChange={event => onFreeChange(option.freeField, event.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary/40"
              />
              免費提供
            </label>
          </div>
        );
      })}
    </div>
  );
}

interface MarketNotesFieldProps {
  idPrefix: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function MarketNotesField({
  idPrefix,
  value,
  disabled = false,
  onChange,
}: MarketNotesFieldProps) {
  return (
    <FormField id={`${idPrefix}-notes`} label="備註" hint="記錄主辦單位規定、進場提醒或其他注意事項。">
      {(fieldProps) => (
        <textarea
          {...fieldProps}
          value={value}
          onChange={event => onChange(event.target.value)}
          rows={4}
          disabled={disabled}
          className={`${inputClassName} resize-none py-2.5`}
        />
      )}
    </FormField>
  );
}
