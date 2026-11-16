import { runBoundPreviewDeletionTick } from '../lib/subscription/account-deletion-engine-adapters.server';

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--tick') {
    throw new Error('Expected explicit --tick.');
  }
  const env = process.env;
  const result = await runBoundPreviewDeletionTick({
    deployment: env.VERCEL_ENV ?? '',
    databaseUrl: env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    publicKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    secretKey: env.SUPABASE_SECRET_KEY ?? '',
    r2Endpoint: env.R2_ENDPOINT ?? (env.R2_ACCOUNT_ID ? 'https://' + env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com' : ''),
    bucket: env.R2_BUCKET_NAME ?? '',
    accessKeyId: env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '',
    boundTargetHash: env.ACCOUNT_DELETION_PREVIEW_R2_TARGET_SHA256 ?? '',
    grant: {
      actorId: env.TEST_PRG_DELETION_ACTOR_ID ?? '',
      requestId: env.TEST_PRG_DELETION_REQUEST_ID ?? '',
      issuedAt: Number(env.TEST_PRG_DELETION_ISSUED_AT_MS),
      expiresAt: Number(env.TEST_PRG_DELETION_EXPIRES_AT_MS),
    },
  });
  console.log(JSON.stringify(result));
  if (result.outcome !== 'completed' && (result.outcome !== 'step_recorded' || result.stepOutcome !== 'completed')) {
    process.exitCode = 1;
  }
}

void main().catch(() => {
  console.error('Preview deletion tick rejected. Check the target, dedicated credentials and grant.');
  process.exitCode = 1;
});
