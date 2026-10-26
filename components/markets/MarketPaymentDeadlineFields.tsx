'use client';

import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';
import { FormField } from '@/components/ui/FormField';
import { ContextHelp } from '@/components/ui/ContextHelp';
import { isPaymentDeadlineWriteEnabled, type MarketPaymentDeadline } from '@/lib/markets/market-payment-deadline';

interface Props {
  id: string;
  value?: MarketPaymentDeadline | null;
  onChange: (value: MarketPaymentDeadline | null) => void;
  disabled?: boolean;
  error?: string;
}

const fieldClass = 'min-h-12 w-full min-w-0 rounded-2xl border border-primary/15 bg-atelier-paper px-4 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-muted/40';

export function MarketPaymentDeadlineFields({ id, value, onChange, disabled, error }: Props) {
  const ready = isPaymentDeadlineWriteEnabled();
  const locked = disabled || !ready;
  return (
    <section className="mt-5 space-y-3 border-t border-primary/10 pt-5" aria-labelledby={`${id}-heading`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <h3 id={`${id}-heading`} className="text-sm font-semibold text-foreground">繳費期限（選填）</h3>
        <ContextHelp label="期限提醒方式">
          <p>未設定期限不會視為逾期。標記已繳費後，期限提醒會停止。</p>
          <p>提醒顯示在 App 內；目前不會在 App 關閉後發送通知。</p>
        </ContextHelp>
      </div>
      <p className="text-xs leading-5 text-muted-foreground" role={ready ? undefined : 'status'}>
        {ready ? '台灣時間；未填時間為當日結束前。' : '繳費期限準備中，可稍後回來設定。'}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={id} label="截止日期" error={error}>
          {props => <DatePicker {...props} value={value?.date ?? ''} disabled={locked} className={fieldClass}
            onChange={date => onChange(date ? { date, ...(value?.time ? { time: value.time } : {}), timeZone: 'Asia/Taipei', reminderEnabled: value?.reminderEnabled ?? true } : null)} />}
        </FormField>
        <FormField id={`${id}-time`} label="截止時間（選填）">
          {props => <TimePicker {...props} value={value?.time ?? ''} disabled={locked || !value} className={fieldClass}
            onChange={time => {
              if (!value) return;
              const { time: _previousTime, ...rest } = value;
              onChange({ ...rest, ...(time ? { time } : {}) });
            }} />}
        </FormField>
      </div>
      {value?.time ? (
        <button type="button" disabled={locked} onClick={() => {
          const { time: _time, ...dateOnly } = value;
          onChange(dateOnly);
        }} className="min-h-11 rounded-lg px-2 text-xs text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          清除時間，改為當日結束前
        </button>
      ) : null}
      {value ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-h-11 items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={value.reminderEnabled} disabled={locked}
              onChange={event => onChange({ ...value, reminderEnabled: event.target.checked })} className="h-5 w-5 accent-primary" />
            在 App 內顯示期限提醒
          </label>
          <button type="button" disabled={locked} onClick={() => onChange(null)} className="min-h-11 rounded-lg px-3 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">移除期限</button>
        </div>
      ) : null}
    </section>
  );
}
