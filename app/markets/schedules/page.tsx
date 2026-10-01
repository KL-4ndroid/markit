'use client';

import { ArrowLeft, CalendarRange, MapPin, Pause, Play, Plus, ShieldAlert, Store, Archive } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { WorkspacePageHeader } from '@/components/layout/WorkspacePageHeader';
import { FixedScheduleForm } from '@/components/recurring-operations/FixedScheduleForm';
import { AppDialog } from '@/components/ui/AppDialog';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { StateView } from '@/components/ui/StateView';
import {
  archiveOperationSchedule,
  ensureScheduledMarkets,
  pauseOperationSchedule,
  resumeOperationSchedule,
  useOwnerRecurringOperations,
} from '@/lib/recurring-operations';
import { useRoleContext } from '@/lib/role-context';
import { useAuth } from '@/lib/supabase/auth-context';
import type { OperationSchedule } from '@/types/db';

const WEEKDAY_LABEL: Record<number, string> = { 0: '週日', 1: '週一', 2: '週二', 3: '週三', 4: '週四', 5: '週五', 6: '週六' };

function scheduleRuleLabel(schedule: OperationSchedule): string {
  return schedule.recurrence.weekdays
    .slice()
    .sort((a, b) => a - b)
    .map(day => WEEKDAY_LABEL[day])
    .join('、');
}

export default function FixedSchedulesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOwner, roleRefreshState } = useRoleContext();
  const canManage = roleRefreshState.stage === 'ready' && isOwner && Boolean(user?.id);
  const data = useOwnerRecurringOperations(canManage ? user?.id ?? null : null);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<OperationSchedule | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const venueById = useMemo(() => new Map((data?.venues ?? []).map(venue => [venue.id, venue])), [data?.venues]);
  const visibleSchedules = data?.schedules.filter(schedule => schedule.status !== 'archived') ?? [];
  const archivedSchedules = data?.schedules.filter(schedule => schedule.status === 'archived') ?? [];

  const act = async (schedule: OperationSchedule, action: 'pause' | 'resume' | 'archive') => {
    if (!canManage) {
      toast.error('權限狀態已變更，請重新整理後再試。');
      return;
    }
    setBusyId(schedule.id);
    try {
      const authorization = { ownerId: user!.id, isOwner: true };
      if (action === 'pause') await pauseOperationSchedule(schedule.id, authorization);
      if (action === 'resume') {
        await resumeOperationSchedule(schedule.id, authorization);
        try {
          await ensureScheduledMarkets({ ownerId: user!.id, isOwner: true });
        } catch (materializationError) {
          console.error('固定安排已恢復，但場次尚待自動補齊：', materializationError);
        }
      }
      if (action === 'archive') await archiveOperationSchedule(schedule.id, authorization);
      toast.success(action === 'pause' ? '固定安排已暫停' : action === 'resume' ? '固定安排已恢復' : '固定安排已封存');
      setArchiveTarget(null);
    } catch (error) {
      console.error('更新固定安排失敗：', error);
      toast.error('固定安排尚未更新，請確認連線後再試一次。');
    } finally {
      setBusyId(null);
    }
  };

  if (roleRefreshState.stage !== 'ready') {
    return <StateView className="mx-auto mt-16 max-w-xl" title="正在確認權限" description="完成後會顯示固定營業安排。" />;
  }

  if (!canManage) {
    return (
      <StateView
        className="mx-auto mt-16 max-w-xl"
        icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
        title="此頁僅限老闆使用"
        description="員工可以操作已排定的營業場次，但不能查看或管理固定規律。"
        action={<Button variant="secondary" onClick={() => router.replace('/markets')}>返回市集</Button>}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <WorkspacePageHeader
        title="固定安排"
        eyebrow="營運管理"
        icon={CalendarRange}
        widthMode="workspace"
        action={<IconButton label="新增固定安排" tone="inverse" icon={<Plus className="h-5 w-5" />} onClick={() => setFormOpen(true)} />}
      />
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 sm:px-6">
        <Button variant="ghost" onClick={() => router.push('/markets')} leadingIcon={<ArrowLeft className="h-4 w-4" />}>
          返回市集
        </Button>

        {data === undefined ? (
          <StateView className="mt-5" title="正在載入固定安排" description="正在整理常用據點與每週時間。" />
        ) : data.error ? (
          <StateView
            className="mt-5"
            icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
            title="固定安排暫時無法載入"
            description="本機資料仍會保留；請重新整理後再試一次。"
            action={<Button variant="secondary" onClick={() => router.replace('/markets')}>返回市集</Button>}
          />
        ) : visibleSchedules.length === 0 ? (
          <StateView
            className="mt-5"
            icon={<CalendarRange className="h-5 w-5" aria-hidden="true" />}
            title="還沒有固定安排"
            description="建立常用地點、星期與時間後，就不用每週重新輸入。"
            action={<Button onClick={() => setFormOpen(true)} leadingIcon={<Plus className="h-4 w-4" />}>建立第一個固定安排</Button>}
          />
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {visibleSchedules.map(schedule => {
              const venue = venueById.get(schedule.venueId);
              const isPaused = schedule.status === 'paused';
              return (
                <article key={schedule.id} className="japanese-surface-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-soft-green text-primary"><Store className="h-4 w-4" aria-hidden="true" /></span>
                        <h2 className="truncate text-base font-semibold text-foreground">{venue?.name ?? schedule.name ?? '固定營業'}</h2>
                      </div>
                      {venue?.address && <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{venue.address}</p>}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isPaused ? 'bg-soft-yellow text-secondary' : 'bg-soft-green text-primary'}`}>
                      {isPaused ? '已暫停' : '進行中'}
                    </span>
                  </div>
                  <div className="mt-4 rounded-xl bg-white/45 p-3 text-sm leading-6 text-foreground">
                    <p>{scheduleRuleLabel(schedule)}</p>
                    <p className="text-muted-foreground">{schedule.startTime}–{schedule.endTime}{schedule.endsNextDay ? '（隔日）' : ''}</p>
                    <p className="text-xs text-muted-foreground">自 {schedule.recurrence.startDate} 起{schedule.recurrence.endDate ? `，至 ${schedule.recurrence.endDate}` : ''}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {isPaused ? (
                      <Button variant="secondary" size="compact" isLoading={busyId === schedule.id} onClick={() => void act(schedule, 'resume')} leadingIcon={<Play className="h-4 w-4" />}>恢復</Button>
                    ) : (
                      <Button variant="secondary" size="compact" isLoading={busyId === schedule.id} onClick={() => void act(schedule, 'pause')} leadingIcon={<Pause className="h-4 w-4" />}>暫停</Button>
                    )}
                    <Button variant="ghost" size="compact" disabled={busyId === schedule.id} onClick={() => setArchiveTarget(schedule)} leadingIcon={<Archive className="h-4 w-4" />}>封存</Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {archivedSchedules.length > 0 && <p className="mt-6 text-sm text-muted-foreground">已封存 {archivedSchedules.length} 個固定安排</p>}
      </div>

      <FixedScheduleForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={() => toast.success('固定安排已建立')} />
      <AppDialog
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        title="封存這個固定安排？"
        description="封存後不再建立未來場次；既有與已完成的營業資料不會刪除。"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setArchiveTarget(null)}>取消</Button>
            <Button variant="danger" isLoading={busyId === archiveTarget?.id} onClick={() => archiveTarget && void act(archiveTarget, 'archive')}>確認封存</Button>
          </>
        )}
      >
        <p className="text-sm leading-6 text-muted-foreground">需要再次使用時，請建立新的固定安排。</p>
      </AppDialog>
    </div>
  );
}
