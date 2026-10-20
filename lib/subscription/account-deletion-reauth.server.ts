import { createHmac } from 'node:crypto';

export const ACCOUNT_DELETION_RECENT_REAUTH_MAX_AGE_MS = 5 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 30 * 1000;

export type AccountDeletionRecentReauthDecision = Readonly<{
  accepted: boolean;
  code: 'recent_reauth_verified' | 'recent_reauth_required' | 'recent_reauth_invalid';
}>;

export function evaluateAccountDeletionRecentReauth(input: {
  lastSignInAt: string | undefined;
  nowMs: number;
  maxAgeMs?: number;
}): AccountDeletionRecentReauthDecision {
  const maxAgeMs = input.maxAgeMs ?? ACCOUNT_DELETION_RECENT_REAUTH_MAX_AGE_MS;
  const signedInAt = typeof input.lastSignInAt === 'string'
    ? Date.parse(input.lastSignInAt)
    : Number.NaN;
  if (!Number.isFinite(input.nowMs) || !Number.isInteger(maxAgeMs) || maxAgeMs <= 0) {
    return Object.freeze({ accepted: false, code: 'recent_reauth_invalid' });
  }
  if (!Number.isFinite(signedInAt) || signedInAt > input.nowMs + MAX_CLOCK_SKEW_MS) {
    return Object.freeze({ accepted: false, code: 'recent_reauth_invalid' });
  }
  if (input.nowMs - signedInAt > maxAgeMs) {
    return Object.freeze({ accepted: false, code: 'recent_reauth_required' });
  }
  return Object.freeze({ accepted: true, code: 'recent_reauth_verified' });
}

export function deriveAccountDeletionRequestHashes(input: {
  secret: string;
  actorId: string;
  idempotencyKey: string;
}): { subjectRefHash: string; idempotencyHash: string } | null {
  if (Buffer.byteLength(input.secret, 'utf8') < 32 || !input.actorId || !input.idempotencyKey) {
    return null;
  }
  const digest = (purpose: string, value: string) => createHmac('sha256', input.secret)
    .update(`account-deletion:${purpose}:v1\0${value}`, 'utf8')
    .digest('hex');
  return Object.freeze({
    subjectRefHash: digest('subject', input.actorId),
    idempotencyHash: digest('idempotency', `${input.actorId}\0${input.idempotencyKey}`),
  });
}
