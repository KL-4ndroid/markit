import type { Market } from '@/types/db';

export const DEFAULT_EARLY_OPEN_BUFFER_MINUTES = 60;
export const DEFAULT_LATE_CLOSE_BUFFER_MINUTES = 60;

export type MarketOperatingSessionPhase =
  | 'unavailable'
  | 'upcoming'
  | 'early-window'
  | 'early-operating'
  | 'operating'
  | 'extended'
  | 'closed'
  | 'ended';

export type MarketOperatingWorkspacePhase = 'not-started' | 'operating' | 'ended';

export interface MarketOperatingSession {
  phase: MarketOperatingSessionPhase;
  workspacePhase: MarketOperatingWorkspacePhase;
  sessionDate: string | null;
  canRecordLiveActivity: boolean;
  canStartEarly: boolean;
  canCloseToday: boolean;
  label: string;
  message: string;
  officialStartAt: number | null;
  officialEndAt: number | null;
  flexibleStartAt: number | null;
  flexibleEndAt: number | null;
}

interface ResolveMarketOperatingSessionOptions {
  earlyOpenBufferMinutes?: number;
  lateCloseBufferMinutes?: number;
}

interface ScheduledSession {
  date: string;
  officialStartAt: number;
  officialEndAt: number;
  flexibleStartAt: number;
  flexibleEndAt: number;
}

const READY_STATUSES = new Set<Market['status']>(['paid', 'ongoing']);
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})/;

function parseDateKey(dateKey: string): Date | null {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function parseClockTime(value?: string): { hours: number; minutes: number } | null {
  if (!value) return null;
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return { hours, minutes };
}

function toDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function enumerateMarketDates(market: Market): string[] {
  const explicitDates = (market.dates ?? [])
    .filter(date => parseDateKey(date) !== null)
    .filter((date, index, dates) => dates.indexOf(date) === index)
    .sort();
  if (explicitDates.length > 0) return explicitDates;

  const start = parseDateKey(market.startDate);
  const end = parseDateKey(market.endDate);
  if (!start || !end || start > end) return [];

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function buildScheduledSessions(
  market: Market,
  earlyOpenBufferMinutes: number,
  lateCloseBufferMinutes: number
): ScheduledSession[] {
  const startTime = parseClockTime(market.operatingStartTime ?? market.startTime);
  const endTime = parseClockTime(market.operatingEndTime ?? market.endTime);
  if (!startTime || !endTime) return [];

  return enumerateMarketDates(market).flatMap(dateKey => {
    const date = parseDateKey(dateKey);
    if (!date) return [];

    const officialStart = new Date(date);
    officialStart.setHours(startTime.hours, startTime.minutes, 0, 0);

    const officialEnd = new Date(date);
    officialEnd.setHours(endTime.hours, endTime.minutes, 0, 0);
    if (officialEnd <= officialStart) officialEnd.setDate(officialEnd.getDate() + 1);

    return [{
      date: dateKey,
      officialStartAt: officialStart.getTime(),
      officialEndAt: officialEnd.getTime(),
      flexibleStartAt: officialStart.getTime() - earlyOpenBufferMinutes * 60_000,
      flexibleEndAt: officialEnd.getTime() + lateCloseBufferMinutes * 60_000,
    }];
  });
}

function buildResult(
  phase: MarketOperatingSessionPhase,
  workspacePhase: MarketOperatingWorkspacePhase,
  session: ScheduledSession | null,
  overrides: Partial<Pick<
    MarketOperatingSession,
    'canRecordLiveActivity' | 'canStartEarly' | 'canCloseToday' | 'label' | 'message'
  >> = {}
): MarketOperatingSession {
  const defaults: Record<MarketOperatingSessionPhase, Pick<MarketOperatingSession, 'label' | 'message'>> = {
    unavailable: { label: '尚未開放', message: '市集狀態或營業時間尚未符合現場記錄條件。' },
    upcoming: { label: '尚未開始', message: '目前不在今日可提前開始或延長營業的時段內。' },
    'early-window': { label: '可提前營業', message: '已進入提前營業時段，開始後才會開放互動與銷售記錄。' },
    'early-operating': { label: '提前營業中', message: '已提前開始營業，互動與銷售記錄已開放。' },
    operating: { label: '營業中', message: '目前為正式營業時段。' },
    extended: { label: '延長營業中', message: '已超過原定收攤時間，仍可記錄最後一批互動與收入。' },
    closed: { label: '今日已收攤', message: '今日現場操作已關閉；遺漏收入請改用補登收入。' },
    ended: { label: '已結束', message: '所有場次的現場操作時段皆已結束。' },
  };

  return {
    phase,
    workspacePhase,
    sessionDate: session?.date ?? null,
    canRecordLiveActivity: false,
    canStartEarly: false,
    canCloseToday: false,
    ...defaults[phase],
    officialStartAt: session?.officialStartAt ?? null,
    officialEndAt: session?.officialEndAt ?? null,
    flexibleStartAt: session?.flexibleStartAt ?? null,
    flexibleEndAt: session?.flexibleEndAt ?? null,
    ...overrides,
  };
}

function hasFutureSession(sessions: ScheduledSession[], sessionDate: string): boolean {
  return sessions.some(session => session.date > sessionDate);
}

export function resolveMarketOperatingSession(
  market: Market,
  now: Date = new Date(),
  options: ResolveMarketOperatingSessionOptions = {}
): MarketOperatingSession {
  const earlyOpenBufferMinutes = Math.max(
    0,
    options.earlyOpenBufferMinutes ?? DEFAULT_EARLY_OPEN_BUFFER_MINUTES
  );
  const lateCloseBufferMinutes = Math.max(
    0,
    options.lateCloseBufferMinutes ?? DEFAULT_LATE_CLOSE_BUFFER_MINUTES
  );
  const sessions = buildScheduledSessions(market, earlyOpenBufferMinutes, lateCloseBufferMinutes);
  const nowAt = now.getTime();

  if (market.status === 'completed') {
    return buildResult('ended', 'ended', sessions.at(-1) ?? null);
  }

  if (!READY_STATUSES.has(market.status) || sessions.length === 0) {
    return buildResult('unavailable', 'not-started', null);
  }

  const officialSession = sessions.find(
    session => nowAt >= session.officialStartAt && nowAt < session.officialEndAt
  );
  const flexibleCandidates = sessions.filter(
    session => nowAt >= session.flexibleStartAt && nowAt < session.flexibleEndAt
  );

  let selectedSession = officialSession ?? null;
  if (!selectedSession && flexibleCandidates.length > 0) {
    const manualSession = flexibleCandidates.find(
      session => session.date === market.operationSessionDate
    );

    if (manualSession && market.operationPhase === 'operating') {
      selectedSession = manualSession;
    } else {
      const candidates = manualSession && market.operationPhase === 'closing'
        ? flexibleCandidates.filter(session => session.date !== manualSession.date)
        : flexibleCandidates;
      const lateSession = [...candidates]
        .filter(session => nowAt >= session.officialEndAt)
        .sort((left, right) => right.officialEndAt - left.officialEndAt)[0];
      const earlySession = [...candidates]
        .filter(session => nowAt < session.officialStartAt)
        .sort((left, right) => left.officialStartAt - right.officialStartAt)[0];
      selectedSession = lateSession ?? earlySession ?? manualSession ?? flexibleCandidates[0];
    }
  }

  if (!selectedSession) {
    const lastSession = sessions.at(-1)!;
    if (nowAt >= lastSession.flexibleEndAt) {
      return buildResult('ended', 'ended', lastSession);
    }

    const nextSession = sessions.find(session => nowAt < session.flexibleStartAt) ?? null;
    return buildResult('upcoming', 'not-started', nextSession);
  }

  const manuallyClosed =
    market.operationPhase === 'closing' &&
    market.operationSessionDate === selectedSession.date;
  const manuallyOpened =
    market.operationPhase === 'operating' &&
    market.operationSessionDate === selectedSession.date;

  if (manuallyClosed) {
    return buildResult(
      'closed',
      hasFutureSession(sessions, selectedSession.date) ? 'not-started' : 'ended',
      selectedSession
    );
  }

  if (nowAt < selectedSession.officialStartAt) {
    if (manuallyOpened) {
      return buildResult('early-operating', 'operating', selectedSession, {
        canRecordLiveActivity: true,
        canCloseToday: true,
      });
    }

    return buildResult('early-window', 'not-started', selectedSession, {
      canStartEarly: true,
    });
  }

  if (nowAt < selectedSession.officialEndAt) {
    return buildResult('operating', 'operating', selectedSession, {
      canRecordLiveActivity: true,
      canCloseToday: true,
    });
  }

  return buildResult('extended', 'operating', selectedSession, {
    canRecordLiveActivity: true,
    canCloseToday: true,
  });
}
