import type { Market } from '@/types/db';

export interface MarketPaymentDeadline {
  date: string;
  time?: string;
  timeZone: 'Asia/Taipei';
  reminderEnabled: boolean;
}

export function normalizePaymentDeadline(value: unknown): MarketPaymentDeadline | null | undefined {
  if (value == null) return value;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('請確認繳費期限');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => !['date', 'time', 'timeZone', 'reminderEnabled'].includes(key))
    || typeof record.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)
    || record.date < '1900-01-01' || record.date > '9999-12-31'
    || !Number.isFinite(Date.parse(`${record.date}T00:00:00Z`))
    || new Date(`${record.date}T00:00:00Z`).toISOString().slice(0, 10) !== record.date
    || record.timeZone !== 'Asia/Taipei'
    || (record.time !== undefined && (typeof record.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(record.time)))
    || (record.reminderEnabled !== undefined && typeof record.reminderEnabled !== 'boolean')) {
    throw new Error('請填有效的繳費日期與時間（台灣時間）');
  }
  return { date: record.date, ...(record.time !== undefined ? { time: record.time as string } : {}),
    timeZone: 'Asia/Taipei', reminderEnabled: record.reminderEnabled !== false };
}

export function readPaymentDeadline(record: Record<string, unknown>): MarketPaymentDeadline | null | undefined {
  const camel = normalizePaymentDeadline(record.paymentDeadline);
  const snake = normalizePaymentDeadline(record.payment_deadline);
  if (camel !== undefined && snake !== undefined && JSON.stringify(camel) !== JSON.stringify(snake)) {
    throw new Error('繳費期限欄位不一致，請重新確認');
  }
  return camel !== undefined ? camel : snake;
}

export function paymentDeadlineFieldsToLocal<T extends Record<string, unknown>>(record: T) {
  const paymentDeadline = readPaymentDeadline(record);
  const { payment_deadline: _wireDeadline, ...local } = record;
  return paymentDeadline === undefined ? local : { ...local, paymentDeadline };
}

export function isPaymentDeadlineWriteEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MARKET_PAYMENT_DEADLINE_ENABLED === 'true';
}

export function assertPaymentDeadlineWriteReady(type: string, payload: Record<string, unknown>): void {
  if (type !== 'market_created' && type !== 'market_updated') return;
  const fields = type === 'market_updated' ? payload.updates as Record<string, unknown> : payload;
  if (!fields || typeof fields !== 'object') return;
  const deadline = readPaymentDeadline(fields);
  if ((type === 'market_created' ? deadline != null : deadline !== undefined) && !isPaymentDeadlineWriteEnabled()) {
    throw new Error('繳費期限尚未開放儲存，請稍後再試');
  }
  if (deadline && (fields.sessionOrigin === 'schedule' || fields.session_origin === 'schedule')) {
    throw new Error('固定營業不設定報名繳費期限');
  }
}

export interface MarketPaymentReminder {
  kind: 'unknown' | 'muted' | 'overdue' | 'today' | 'soon' | 'upcoming';
  label: string;
  deadlineLabel: string | null;
  cutoff: number | null;
}

export function paymentDeadlineCutoff(deadline: MarketPaymentDeadline): number {
  const start = Date.parse(`${deadline.date}T${deadline.time ?? '00:00'}:00+08:00`);
  return deadline.time ? start : start + 86_400_000;
}

export function getMarketPaymentReminder(market: Pick<Market, 'status' | 'sessionOrigin' | 'isDeleted' | 'paymentDeadline'>, now: Date): MarketPaymentReminder | null {
  if (market.isDeleted || market.status !== 'accepted' || market.sessionOrigin === 'schedule') return null;
  const deadline = normalizePaymentDeadline(market.paymentDeadline);
  if (!deadline) return { kind: 'unknown', label: '繳費期限未設定', deadlineLabel: null, cutoff: null };
  const cutoff = paymentDeadlineCutoff(deadline);
  const deadlineLabel = `${deadline.date.replaceAll('-', '/')} ${deadline.time ?? '當日結束前'}（台灣時間）`;
  if (!deadline.reminderEnabled) return { kind: 'muted', label: '期限提醒已關閉', deadlineLabel, cutoff };
  const today = new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);
  const days = (Date.parse(`${deadline.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
  const kind = now.getTime() >= cutoff ? 'overdue' : days === 0 ? 'today' : days <= 3 ? 'soon' : 'upcoming';
  const label = { overdue: '已過繳費期限', today: '今天截止', soon: '3 天內截止', upcoming: '繳費期限' }[kind];
  return { kind, label, deadlineLabel, cutoff };
}

export function comparePaymentDeadlines(a: Pick<Market, 'paymentDeadline'>, b: Pick<Market, 'paymentDeadline'>): number {
  const left = normalizePaymentDeadline(a.paymentDeadline);
  const right = normalizePaymentDeadline(b.paymentDeadline);
  return (left ? paymentDeadlineCutoff(left) : Infinity) - (right ? paymentDeadlineCutoff(right) : Infinity) || 0;
}

export function paymentReminderSummary(reminders: readonly (MarketPaymentReminder | null | undefined)[]): string | null {
  const count = (kind: MarketPaymentReminder['kind']) => reminders.filter(item => item?.kind === kind).length;
  const parts = [count('overdue') ? `逾期 ${count('overdue')} 場` : '', count('today') ? `今天截止 ${count('today')} 場` : '', count('soon') ? `3 天內 ${count('soon')} 場` : ''].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
