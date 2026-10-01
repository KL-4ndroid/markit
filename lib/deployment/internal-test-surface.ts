export type InternalTestSurfaceEnv = Record<string, string | undefined>;

export const INTERNAL_TEST_SURFACES_ENABLED_ENV = 'INTERNAL_TEST_SURFACES_ENABLED';

export function isInternalTestSurfaceAvailable(
  env: InternalTestSurfaceEnv = process.env,
): boolean {
  const deploymentEnvironment = (
    env.VERCEL_ENV
    ?? env.APP_ENV
    ?? env.NODE_ENV
    ?? ''
  ).trim().toLowerCase();

  if (deploymentEnvironment === 'production') return false;
  if (env.NODE_ENV !== 'production') return true;

  return (
    deploymentEnvironment === 'preview'
    || deploymentEnvironment === 'staging'
  ) && env[INTERNAL_TEST_SURFACES_ENABLED_ENV] === '1';
}
