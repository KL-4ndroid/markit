export type MarketWorkspacePhase = 'not-started' | 'operating' | 'ended';

export type OwnerMarketWorkspaceView = 'live' | 'overview' | 'manage';
export type StaffMarketWorkspaceView = 'live' | 'records' | 'tasks';

interface ResolveMarketWorkspacePhaseInput {
  operatingPhase: MarketWorkspacePhase;
  dates?: readonly string[];
  startDate?: string | null;
  endDate?: string | null;
  marketStatus?: string | null;
  today?: string;
}

function getLocalDateString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function resolveMarketWorkspacePhase({
  operatingPhase,
  dates,
  startDate,
  endDate,
  marketStatus,
  today = getLocalDateString(),
}: ResolveMarketWorkspacePhaseInput): MarketWorkspacePhase {
  if (operatingPhase === 'operating') return 'operating';
  if (operatingPhase === 'ended' || marketStatus === 'completed') return 'ended';

  const validDates = (dates ?? []).filter(Boolean).sort();
  const lastMarketDate = validDates[validDates.length - 1] ?? endDate ?? startDate;

  if (lastMarketDate && today > lastMarketDate) return 'ended';
  return 'not-started';
}

export function getDefaultOwnerMarketWorkspaceView(
  phase: MarketWorkspacePhase
): OwnerMarketWorkspaceView {
  if (phase === 'operating') return 'live';
  if (phase === 'ended') return 'overview';
  return 'manage';
}

export function getDefaultStaffMarketWorkspaceView(
  phase: MarketWorkspacePhase
): StaffMarketWorkspaceView {
  if (phase === 'operating') return 'live';
  if (phase === 'ended') return 'records';
  return 'tasks';
}

export function getMarketWorkspacePhaseLabel(phase: MarketWorkspacePhase): string {
  if (phase === 'operating') return '營業中';
  if (phase === 'ended') return '已結束';
  return '準備中';
}
