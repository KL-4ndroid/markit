/** Product release channel is independent of the deployment host/environment. */
export function resolveTestToolsBuild({ nodeEnv, releaseChannel } = {}) {
  if (releaseChannel !== undefined) return releaseChannel === 'test';
  return nodeEnv === 'development';
}
