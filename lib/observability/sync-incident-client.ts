import {
  buildAppApiUrl,
  type BuildAppApiUrlOptions,
} from '@/lib/api/client';
import { fetchAppApi } from '@/lib/api/transport';
import {
  createSyncIncidentReport,
  type SyncIncidentKind,
} from '@/lib/observability/sync-incident-contract';

export const SYNC_INCIDENT_REPORT_COOLDOWN_MS = 5 * 60 * 1_000;

export type SyncIncidentReporterInput = Readonly<{
  accessToken: string;
  kind: SyncIncidentKind;
  pendingCount: number;
}>;

export type SyncIncidentReporterOptions = Readonly<{
  apiUrl?: BuildAppApiUrlOptions;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}>;

export type SyncIncidentReportResult = 'reported' | 'throttled' | 'unavailable';

export function createSyncIncidentReporter(
  options: SyncIncidentReporterOptions = {},
): (input: SyncIncidentReporterInput) => Promise<SyncIncidentReportResult> {
  const lastAttemptAt = new Map<SyncIncidentKind, number>();

  return async input => {
    const accessToken = input.accessToken.trim();
    const report = createSyncIncidentReport(input.kind, input.pendingCount);
    if (!accessToken || !report) return 'unavailable';

    const now = options.now?.() ?? Date.now();
    const previousAttemptAt = lastAttemptAt.get(report.kind);
    if (
      previousAttemptAt !== undefined
      && now - previousAttemptAt < SYNC_INCIDENT_REPORT_COOLDOWN_MS
    ) {
      return 'throttled';
    }

    // Record the attempt before I/O so concurrent failures cannot create a report loop.
    lastAttemptAt.set(report.kind, now);

    try {
      const response = await fetchAppApi(
        buildAppApiUrl('/api/operational-events/sync', options.apiUrl),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(report),
          cache: 'no-store',
        },
        {
          fetchImpl: options.fetchImpl,
          timeoutMs: options.timeoutMs ?? 3_000,
        },
      );
      return response.ok ? 'reported' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  };
}

export const reportSyncIncident = createSyncIncidentReporter();
