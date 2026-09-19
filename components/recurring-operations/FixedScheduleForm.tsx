'use client';

import { MapPin, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { FormField } from '@/components/ui/FormField';
import { FormSectionDisclosure } from '@/components/ui/FormSectionDisclosure';
import { FullScreenForm } from '@/components/ui/FullScreenForm';
import { TimePicker } from '@/components/ui/TimePicker';
import {
  createOperationSchedule,
  createVenue,
  ensureScheduledMarkets,
  toDateKeyInTimeZone,
} from '@/lib/recurring-operations';
import { useRoleContext } from '@/lib/role-context';
import { useAuth } from '@/lib/supabase/auth-context';

interface FixedScheduleFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type FieldErrors = Partial<Record<'venueName' | 'weekdays' | 'startTime' | 'endTime' | 'startDate' | 'endDate', string>>;

const WEEKDAYS = [
  { value: 1, label: '一' }, { value: 2, label: '二' }, { value: 3, label: '三' },
  { value: 4, label: '四' }, { value: 5, label: '五' }, { value: 6, label: '六' },
  { value: 0, label: '日' },
] as const;

const inputClass = 'min-h-12 w-full rounded-2xl border border-primary/15 bg-atelier-paper px-4 text-foreground shadow-sm outline-none transition hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted/40';
const numberFields = [
  ['registrationFee', '報名費'], ['boothCost', '攤位費'], ['deposit', '保證金'],
  ['tableRental', '桌子租金'], ['chairRental', '椅子租金'], ['umbrellaRental', '傘具租金'],
  ['tableclothRental', '桌巾租金'], ['commissionRate', '營業額抽成（%）'],
] as const;

export function FixedScheduleForm({ open, onClose, onSuccess }: FixedScheduleFormProps) {
  const { user } = useAuth();
  const { isOwner, roleRefreshState } = useRoleContext();
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei', []);
  const today = useMemo(() => toDateKeyInTimeZone(new Date(), timezone), [timezone]);
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('18:00');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [defaults, setDefaults] = useState<Record<string, number | boolean | string>>({
    registrationFee: 0, boothCost: 0, deposit: 0, tableRental: 0, chairRental: 0,
    umbrellaRental: 0, tableclothRental: 0, commissionRate: 0,
    tableFree: false, chairFree: false, umbrellaFree: false, tableclothFree: false, notes: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setVenueName(''); setAddress(''); setWeekdays([]); setStartTime('10:00'); setEndTime('18:00');
    setStartDate(today); setEndDate(''); setErrors({}); setSubmitError(null);
    setDefaults({
      registrationFee: 0, boothCost: 0, deposit: 0, tableRental: 0, chairRental: 0,
      umbrellaRental: 0, tableclothRental: 0, commissionRate: 0,
      tableFree: false, chairFree: false, umbrellaFree: false, tableclothFree: false, notes: '',
    });
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!venueName.trim()) next.venueName = '請輸入營業據點名稱';
    if (weekdays.length === 0) next.weekdays = '請至少選擇一個星期';
    if (!/^\d{2}:\d{2}$/.test(startTime)) next.startTime = '請選擇開始時間';
    if (!/^\d{2}:\d{2}$/.test(endTime)) next.endTime = '請選擇結束時間';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) next.startDate = '請選擇起始日期';
    if (endDate && endDate < startDate) next.endDate = '結束日期不可早於起始日期';
    return next;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (roleRefreshState.stage !== 'ready' || !isOwner || !user?.id) {
      setSubmitError('權限狀態已變更，請重新整理後再試。');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const venueId = await createVenue({
        name: venueName.trim(),
        address: address.trim() || undefined,
        status: 'active',
      });
      await createOperationSchedule({
        venueId,
        name: `${venueName.trim()}固定營業`,
        timezone,
        recurrence: {
          frequency: 'weekly', interval: 1, weekdays: [...weekdays].sort((a, b) => a - b),
          startDate, endDate: endDate || undefined,
        },
        startTime,
        endTime,
        endsNextDay: endTime <= startTime,
        defaults,
        status: 'active',
      });
      try {
        await ensureScheduledMarkets({ ownerId: user.id, isOwner: true });
      } catch (materializationError) {
        console.error('固定安排已建立，但場次尚待自動補齊：', materializationError);
      }
      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('建立固定安排失敗：', error);
      setSubmitError('固定安排尚未建立，請確認連線與權限後再試一次。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (roleRefreshState.stage !== 'ready' || !isOwner) return null;

  return (
    <FullScreenForm
      open={open}
      desktopWidth="focused"
      onClose={onClose}
      eyebrow="固定營業"
      title="設定每週固定安排"
      description="先填地點、星期與時間；費用與設備預設可稍後展開。"
      dismissible={!isSubmitting}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>取消</Button>
          <Button type="submit" form="fixed-schedule-form" isLoading={isSubmitting}>建立固定安排</Button>
        </>
      )}
    >
      <form id="fixed-schedule-form" onSubmit={submit} noValidate>
        <section className="japanese-surface-card space-y-5 p-5 sm:p-6" aria-labelledby="fixed-required-heading">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft-pink text-primary">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 id="fixed-required-heading" className="font-semibold text-foreground">固定營業資訊</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">這些資訊用來排出每週的營業場次。</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="fixed-venue-name" label="營業據點名稱" required error={errors.venueName}>
              {props => <input {...props} className={inputClass} value={venueName} onChange={event => setVenueName(event.target.value)} placeholder="例如：華山週末攤位" disabled={isSubmitting} />}
            </FormField>
            <FormField id="fixed-address" label="地址" hint="選填，可只填方便辨識的位置。">
              {props => <input {...props} className={inputClass} value={address} onChange={event => setAddress(event.target.value)} placeholder="例如：台北市中正區" disabled={isSubmitting} />}
            </FormField>
          </div>

          <FormField id="fixed-weekdays" label="每週星期" required error={errors.weekdays}>
            {props => (
              <div {...props} className="grid grid-cols-7 gap-2" role="group" aria-label="每週營業日">
                {WEEKDAYS.map(day => {
                  const selected = weekdays.includes(day.value);
                  return (
                    <button key={day.value} type="button" aria-pressed={selected} disabled={isSubmitting}
                      onClick={() => setWeekdays(current => selected ? current.filter(value => value !== day.value) : [...current, day.value])}
                      className={`min-h-11 rounded-xl border text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${selected ? 'border-primary bg-primary text-white' : 'border-primary/15 bg-atelier-paper text-foreground hover:bg-soft-green/30'}`}>
                      {day.label}
                    </button>
                  );
                })}
              </div>
            )}
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="fixed-start-time" label="開始時間" required error={errors.startTime}>
              {props => <TimePicker {...props} value={startTime} onChange={setStartTime} className={inputClass} disabled={isSubmitting} />}
            </FormField>
            <FormField id="fixed-end-time" label="結束時間" required error={errors.endTime} hint={endTime <= startTime ? '將視為隔日結束。' : undefined}>
              {props => <TimePicker {...props} value={endTime} onChange={setEndTime} className={inputClass} disabled={isSubmitting} />}
            </FormField>
            <FormField id="fixed-start-date" label="起始日期" required error={errors.startDate}>
              {props => <DatePicker {...props} minDate={today} value={startDate} onChange={setStartDate} className={inputClass} disabled={isSubmitting} />}
            </FormField>
            <FormField id="fixed-end-date" label="結束日期" error={errors.endDate} hint="選填；留空表示持續進行。">
              {props => <DatePicker {...props} minDate={startDate} value={endDate} onChange={setEndDate} className={inputClass} disabled={isSubmitting} />}
            </FormField>
          </div>
        </section>

        <div className="mt-5">
          <FormSectionDisclosure title="更多預設" description="費用、設備與每次共用的備註" icon={SlidersHorizontal} tone="yellow">
            <div className="grid gap-4 sm:grid-cols-2">
              {numberFields.map(([field, label]) => (
                <FormField key={field} id={`fixed-${field}`} label={label}>
                  {props => <input {...props} type="number" min="0" step={field === 'commissionRate' ? '0.1' : '1'} value={Number(defaults[field] || 0)} onChange={event => setDefaults(current => ({ ...current, [field]: Number(event.target.value) }))} className={inputClass} disabled={isSubmitting} />}
                </FormField>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {([['tableFree', '免費提供桌子'], ['chairFree', '免費提供椅子'], ['umbrellaFree', '免費提供傘具'], ['tableclothFree', '免費提供桌巾']] as const).map(([field, label]) => (
                <label key={field} className="flex min-h-11 items-center gap-3 rounded-xl border border-primary/10 bg-white/45 px-3 text-sm text-foreground">
                  <input type="checkbox" checked={Boolean(defaults[field])} onChange={event => setDefaults(current => ({ ...current, [field]: event.target.checked }))} disabled={isSubmitting} className="h-4 w-4 accent-primary" />
                  {label}
                </label>
              ))}
            </div>
            <FormField id="fixed-notes" label="備註模板">
              {props => <textarea {...props} rows={3} value={String(defaults.notes || '')} onChange={event => setDefaults(current => ({ ...current, notes: event.target.value }))} className={`${inputClass} mt-5 py-3`} disabled={isSubmitting} placeholder="每次營業都需要記得的事項" />}
            </FormField>
          </FormSectionDisclosure>
        </div>

        {submitError && <p className="mt-5 rounded-control border border-status-danger-border bg-status-danger-bg p-3 text-sm text-status-danger-text" role="alert">{submitError}</p>}
      </form>
    </FullScreenForm>
  );
}
