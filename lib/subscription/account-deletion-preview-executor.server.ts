import { createAccountDeletionStepExecutor, DeletionEngineFailure, isOwnedDeletionObjectKey } from './account-deletion-engine.server';
import { terminalPutTargetHash } from './account-deletion-terminal-put.server';

const TEST_PROJECT = 'https://tzhbirwchhqabkxhqjdl.supabase.co';
const TEST_BUCKET = 'markit-account-deletion-preview';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MAX_GRANT_MS = 30 * 60 * 1000;

/** Accepts a server-provisioned grant and already bound ports. No HTTP entry or credentials. */
export function createPreviewDeletionExecutor(input: {
  deployment: string;
  databaseUrl: string;
  r2Endpoint: string;
  bucket: string;
  boundTargetHash: string;
  grant: Readonly<{ actorId: string; requestId: string; issuedAt: number; expiresAt: number }>;
  ports: Parameters<typeof createAccountDeletionStepExecutor>[0];
  now?: () => number;
}) {
  const grant = { ...input.grant };
  const { database, objects, identity } = input.ports;
  const now = input.now ?? Date.now;
  function deny(): never {
    throw new DeletionEngineFailure('manual_review', 'preview_deletion_scope');
  }
  if (input.deployment !== 'preview' || input.databaseUrl !== TEST_PROJECT || input.bucket !== TEST_BUCKET
    || terminalPutTargetHash({ endpoint: input.r2Endpoint, bucket: input.bucket, mode: 'preview-photos' }) !== input.boundTargetHash
    || !UUID.test(grant.actorId) || !UUID.test(grant.requestId)
    || !Number.isSafeInteger(grant.issuedAt) || !Number.isSafeInteger(grant.expiresAt)
    || grant.expiresAt <= grant.issuedAt || grant.expiresAt - grant.issuedAt > MAX_GRANT_MS) deny();

  function checkWindow() {
    const time = now();
    if (!Number.isSafeInteger(time) || time < grant.issuedAt || time >= grant.expiresAt) deny();
  }
  function checkActor(actor: string) {
    checkWindow();
    if (actor !== grant.actorId) deny();
  }
  function checkKey(key: string) {
    checkWindow();
    if (!isOwnedDeletionObjectKey(key, grant.actorId)) deny();
  }

  return createAccountDeletionStepExecutor({
    database: {
      async context(lease) {
        checkWindow();
        if (lease.requestId !== grant.requestId || lease.accountKind !== 'owner') deny();
        const context = await database.context(lease);
        checkActor(context.actorId);
        for (const object of context.objects) checkKey(object.key);
        return context;
      },
      execute(lease) { checkWindow(); return database.execute(lease); },
      acknowledgeObject(lease, key) { checkKey(key); return database.acknowledgeObject(lease, key); },
      completeExternal(lease) { checkWindow(); return database.completeExternal(lease); },
    },
    identity: {
      freeze(actor) { checkActor(actor); return identity.freeze(actor); },
      deleteIdentity(actor) { checkActor(actor); return identity.deleteIdentity(actor); },
      isAbsent(actor) { checkActor(actor); return identity.isAbsent(actor); },
    },
    objects: {
      deleteObject(key) { checkKey(key); return objects.deleteObject(key); },
      isAbsent(key) { checkKey(key); return objects.isAbsent(key); },
    },
  });
}
