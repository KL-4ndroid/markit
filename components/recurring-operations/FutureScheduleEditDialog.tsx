'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AppDialog } from '@/components/ui/AppDialog';
import { Button } from '@/components/ui/Button';
import { TimePicker } from '@/components/ui/TimePicker';
import { FormSectionDisclosure } from '@/components/ui/FormSectionDisclosure';
import { SlidersHorizontal } from 'lucide-react';
import { db } from '@/lib/db';
import { reviseOperationScheduleFromDate } from '@/lib/recurring-operations';
import { useRoleContext } from '@/lib/role-context';
import { useAuth } from '@/lib/supabase/auth-context';
import type { OperationScheduleDefaults } from '@/lib/recurring-operations';

const WEEKDAYS = [
  { value: 1, label: '一' }, { value: 2, label: '二' }, { value: 3, label: '三' },
  { value: 4, label: '四' }, { value: 5, label: '五' }, { value: 6, label: '六' },
  { value: 0, label: '日' },
] as const;

interface FutureScheduleEditDialogProps {
  open: boolean;
  scheduleId: string;
  effectiveDate: string;
  onClose: () => void;
}

export function FutureScheduleEditDialog({ open, scheduleId, effectiveDate, onClose }: FutureScheduleEditDialogProps) {
  const { user } = useAuth();
  const { isOwner, roleRefreshState } = useRoleContext();
  const schedule = useLiveQuery(() => db.operationSchedules.get(scheduleId), [scheduleId]);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('18:00');
  const [defaults, setDefaults] = useState<OperationScheduleDefaults>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!schedule || !open) return;
    setWeekdays([...schedule.recurrence.weekdays]);
    setStartTime(schedule.startTime);
    setEndTime(schedule.endTime);
    setDefaults({ ...schedule.defaults });
  }, [open, schedule]);

  const save = async () => {
    if (!schedule || weekdays.length === 0 || !user?.id || !isOwner || roleRefreshState.stage !== 'ready') {
      toast.error('請至少選擇一個星期，並確認目前權限。');
      return;
    }
    setIsSaving(true);
    try {
      await reviseOperationScheduleFromDate(schedule.id, effectiveDate, {
        recurrence: { ...schedule.recurrence, weekdays: [...weekdays].sort((a, b) => a - b) },
        startTime,
        endTime,
        endsNextDay: endTime <= startTime,
        defaults,
      }, { ownerId: user.id, isOwner: true });
      toast.success('已更新這次之後的固定安排');
      onClose();
    } catch (error) {
      console.error('修改未來固定安排失敗：', error);
      toast.error('未來安排尚未更新；已有營業活動的場次不會被改寫。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="從這次開始都修改"
      description={`自 ${effectiveDate} 起套用新的星期與營業時間；過去與已有活動的場次不會改變。`}
      size="md"
      dismissible={!isSaving}
      footer={<><Button variant="secondary" onClick={onClose} disabled={isSaving}>取消</Button><Button onClick={() => void save()} isLoading={isSaving}>更新未來安排</Button></>}
    >
      {!schedule ? <p className="text-sm text-muted-foreground">正在載入固定安排…</p> : (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">每週星期</p>
            <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="未來每週營業日">
              {WEEKDAYS.map(day => {
                const selected = weekdays.includes(day.value);
                return <button key={day.value} type="button" aria-pressed={selected} onClick={() => setWeekdays(values => selected ? values.filter(value => value !== day.value) : [...values, day.value])} className={`min-h-11 rounded-xl border text-sm ${selected ? 'border-primary bg-primary text-white' : 'border-primary/15 bg-white text-foreground'}`}>{day.label}</button>;
              })}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-foreground">開始時間<TimePicker value={startTime} onChange={setStartTime} className="mt-2 min-h-11 w-full rounded-xl border border-primary/15 bg-white px-3" /></label>
            <label className="text-sm font-medium text-foreground">結束時間<TimePicker value={endTime} onChange={setEndTime} className="mt-2 min-h-11 w-full rounded-xl border border-primary/15 bg-white px-3" /></label>
          </div>
          <FormSectionDisclosure title="更多預設" description="從這次之後使用的費用與備註" icon={SlidersHorizontal} tone="yellow">
            <div className="grid gap-3 sm:grid-cols-2">
              {([['registrationFee', '報名費'], ['boothCost', '攤位費'], ['deposit', '保證金'], ['tableRental', '桌子租金'], ['chairRental', '椅子租金'], ['umbrellaRental', '傘具租金'], ['tableclothRental', '桌巾租金'], ['commissionRate', '營業額抽成（%）']] as const).map(([field, label]) => (
                <label key={field} className="text-sm font-medium text-foreground">{label}<input type="number" min="0" value={defaults[field] ?? 0} onChange={event => setDefaults(current => ({ ...current, [field]: Number(event.target.value) }))} className="mt-2 min-h-11 w-full rounded-xl border border-primary/15 bg-white px-3" /></label>
              ))}
            </div>
            <label className="mt-4 block text-sm font-medium text-foreground">備註模板<textarea rows={3} value={defaults.notes ?? ''} onChange={event => setDefaults(current => ({ ...current, notes: event.target.value }))} className="mt-2 w-full rounded-xl border border-primary/15 bg-white p-3" /></label>
          </FormSectionDisclosure>
        </div>
      )}
    </AppDialog>
  );
}
