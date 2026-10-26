'use client';

import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { reconcileHomePhotoReminders } from '@/lib/sales/home-photo-reminders';
import { listLocalSalesPhotoEvidencePendingTasksForMarket } from '@/lib/sales/photo-evidence-pending-creation-read-model';
import { isSalesPhotoEvidenceRuntimeEnqueueEnabled } from '@/lib/sales/photo-evidence-runtime-flags';
import { SalesPhotoEvidenceReminderAccessError } from '@/lib/sales/photo-evidence-reminder-recovery';

export function useHomePhotoReminders(input: {
  actorId?: string; ownerId?: string | null; marketIds: readonly string[];
  canRead: boolean; canRecover: boolean; syncReady: boolean; isOnline: boolean; syncFailed: boolean; lastSyncAt: number | null;
}) {
  const { actorId, ownerId, canRead, canRecover, syncReady, lastSyncAt } = input;
  const idsKey = [...new Set(input.marketIds)].sort().join('|');
  const scope = canRead && actorId && ownerId ? `${actorId}:${ownerId}:${idsKey}` : '';
  const current = useRef(scope);
  current.current = scope;
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ scope: string; hidden: string[]; warning: string | null; blocked?: boolean } | null>(null);
  const runtimeReady = isSalesPhotoEvidenceRuntimeEnqueueEnabled();
  const shouldRecover = Boolean(scope && idsKey && canRecover && actorId === ownerId && runtimeReady);
  // Hydration may append sales after the markets have already appeared.
  const sourceKey = useLiveQuery(async () => {
    if (!scope || !idsKey) return '';
    const events = await db.events.where('market_id').anyOf(idsKey.split('|')).toArray();
    return events.filter(e => e.type === 'deal_closed' || e.type === 'deal_deleted')
      .map(e => `${e.id}:${e.sync_status}`).sort().join('|');
  }, [scope, idsKey], '');

  useEffect(() => {
    if (!shouldRecover || !syncReady || !ownerId) return;
    let active = true;
    const isCurrent = () => active && current.current === scope;
    void reconcileHomePhotoReminders({ ownerId, marketIds: idsKey.split('|'), isCurrent }).then(plan => {
      if (!plan || !isCurrent()) return;
      setResult({ scope, hidden: [...plan.hiddenSaleIds], warning: plan.failedMarkets > 0
        ? '部分場次尚未核對雲端；目前僅顯示這台裝置可確認的待補工作。'
        : plan.unknownSaleCount > 0 ? `另有 ${plan.unknownSaleCount} 筆成交未記錄照片要求，無法確認是否待補。` : null });
    }).catch(error => {
      if (isCurrent()) setResult({ scope, hidden: [], warning: '尚未核對雲端照片狀態，請稍後重試。',
        blocked: error instanceof SalesPhotoEvidenceReminderAccessError });
    });
    return () => { active = false; };
  }, [scope, idsKey, ownerId, shouldRecover, syncReady, sourceKey, lastSyncAt, retry]);

  const hiddenKey = result?.scope === scope ? [...result.hidden].sort().join('|') : '';
  const items = useLiveQuery(async () => {
    if (!scope || !idsKey) return { scope, rows: [] };
    const hidden = new Set(hiddenKey.split('|'));
    const rows = (await Promise.all(idsKey.split('|').map(id => listLocalSalesPhotoEvidencePendingTasksForMarket(id))))
      .flat().filter(item => item.ownerId === ownerId && !hidden.has(item.saleEventId)
        && (actorId === ownerId || item.capturedByStaffId === actorId));
    return { scope, rows };
  }, [scope, idsKey, ownerId, actorId, hiddenKey]);

  return {
    items: items?.scope === scope && !(result?.scope === scope && result.blocked) ? items.rows : [],
    loading: shouldRecover && input.isOnline && !input.syncFailed && result?.scope !== scope,
    warning: shouldRecover && !input.isOnline ? '目前離線，照片提醒尚未核對雲端。'
      : shouldRecover && input.syncFailed ? '紀錄同步未完成，照片待補狀態尚未確認。'
      : result?.scope === scope ? result.warning : null,
    canRefresh: syncReady && input.isOnline,
    refresh: () => setRetry(value => value + 1),
  };
}
