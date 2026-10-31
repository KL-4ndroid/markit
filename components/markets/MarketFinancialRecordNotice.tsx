'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { deriveRoleCapabilities } from '@/lib/permissions/role-capabilities';
import { buildReadableSettlementReport } from '@/lib/reporting/settlement-report-reading';
import { getLocalDateString } from '@/lib/time-utils';
import type { Market } from '@/types/db';

/** Owner paid-workspace caller only; never load another owner's cached finance. */
export function MarketFinancialRecordNotice({market,ownerId}:{market:Market;ownerId:string}) {
  const allowed = Boolean(market.id && ownerId && market.owner_id === ownerId && market.access_type !== 'staff');
  const stats = useLiveQuery(async()=>allowed ? db.dailyStats.where('marketId').equals(market.id!).toArray() : [],[allowed,market.id,ownerId]);
  if (!allowed || stats === undefined) return null;
  const report = buildReadableSettlementReport({capabilities:deriveRoleCapabilities({isOwner:true,staffRole:null}),
    markets:[market],dailyStats:stats,generatedAtDate:getLocalDateString(),
    period:{kind:'monthly',startDate:market.startDate,endDate:market.endDate,label:'整場'}});
  const reading = report.reading!;
  if (!reading.rows.length || reading.rows.every(row=>row.state === 'upcoming') || reading.estimatedProfit !== null) return null;
  const reasons = reading.issues.filter(issue=>issue.kind !== 'method').map(issue=>issue.title.replace(/^有/,''));
  return <p role="status" className="mb-4 px-1 text-xs leading-6 text-muted-foreground">估計淨利待確認：{reasons.length ? reasons.join('、') : '完整資料仍待確認'}。</p>;
}
