const COMMIT_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

export function requireExpectedCommitSha(value) {
  const normalized = value?.trim();
  if (!normalized || !COMMIT_SHA_PATTERN.test(normalized)) {
    throw new Error('WEB_SMOKE_EXPECTED_COMMIT_SHA must be a 7-40 character hexadecimal Git SHA.');
  }
  return normalized.slice(0, 7).toLowerCase();
}

export function assertHealthReleaseIdentity(body, expectedCommitSha) {
  if (body?.ok !== true || body?.status !== 'healthy') {
    throw new Error('health response contract is invalid');
  }

  const release = body.release;
  if (!release || typeof release !== 'object' || Array.isArray(release)) {
    throw new Error('health release identity is missing');
  }
  if (
    typeof release.version !== 'string'
    || !release.version
    || release.version === 'development'
    || release.version === 'unknown'
  ) {
    throw new Error('health release version is unavailable');
  }
  if (
    typeof release.commitSha !== 'string'
    || !COMMIT_SHA_PATTERN.test(release.commitSha)
    || release.commitSha.slice(0, 7).toLowerCase() !== expectedCommitSha
  ) {
    throw new Error('health release commit does not match the expected deployment');
  }
  if (
    typeof release.buildTime !== 'string'
    || !release.buildTime
    || !Number.isFinite(Date.parse(release.buildTime))
  ) {
    throw new Error('health release build time is unavailable');
  }
}
