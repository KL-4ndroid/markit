import { buildAppApiUrl, type BuildAppApiUrlOptions } from '@/lib/api/client';
import { fetchAppApi } from '@/lib/api/transport';
import type { ApplePurchaseServerPort } from './apple-purchase-session';

/** No route is enabled by this client. E02 wires the reviewed B04 handler + binding endpoint. */
export function createApplePurchaseServerClient(input: {
  ownerId: string; accessToken(): string | null; currentOwner(): string | null;
  refresh(ownerId: string): Promise<boolean>; apiUrl?: BuildAppApiUrlOptions; fetchImpl?: typeof fetch;
}): ApplePurchaseServerPort {
  return {
    async verify(ownerId, evidence) {
      if (ownerId !== input.ownerId || input.currentOwner() !== ownerId) return 'rejected';
      const token = input.accessToken(); if (!token) return 'rejected';
      try {
        const response = await fetchAppApi(buildAppApiUrl('/api/subscription/apple/verify', input.apiUrl), {
          method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ schemaVersion: 1, store: evidence.store, productId: evidence.productId, opaqueVerificationPayload: evidence.opaqueVerificationPayload }),
          cache: 'no-store', redirect: 'error',
        }, { fetchImpl: input.fetchImpl, timeoutMs: 15000 });
        if (input.currentOwner() !== ownerId) return 'rejected';
        if (response.status >= 500 || response.status === 429) return 'retry';
        if (response.status !== 200) return 'rejected';
        const value: unknown = await response.json();
        if (!value || typeof value !== 'object' || !('code' in value)) return 'retry';
        // HTTP 200 also covers policy holds: never treat every 2xx as delivery.
        if (value.code === 'projection_ready' || value.code === 'duplicate') return 'committed';
        if (['policy_review_required', 'subscription_conflict', 'protected_projection', 'stale', 'snapshot_conflict'].includes(String(value.code))) return 'review';
        return 'retry';
      } catch { return 'retry'; }
    },
    async refresh(ownerId) {
      return ownerId === input.ownerId && input.currentOwner() === ownerId && await input.refresh(ownerId)
        && input.currentOwner() === ownerId;
    },
  };
}
