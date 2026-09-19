import { pathToFileURL } from 'node:url';

const EXPECTED_COMMIT_PATTERN = /^[0-9a-f]{7,40}$/i;
const PROBE_ORIGIN = 'https://httpbin.org';
const MAX_HEALTH_BYTES = 16 * 1024;

function readOption(args, name) {
  const prefix = `${name}=`;
  const inline = args.find(argument => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();
  const index = args.indexOf(name);
  return index >= 0 ? String(args[index + 1] ?? '').trim() : '';
}

export function requireHttpsOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('base_url_invalid');
  }
  if (
    parsed.protocol !== 'https:'
    || parsed.username
    || parsed.password
    || parsed.pathname !== '/'
    || parsed.search
    || parsed.hash
  ) {
    throw new Error('base_url_invalid');
  }
  return parsed.origin;
}

export function requireExpectedCommit(value) {
  if (!EXPECTED_COMMIT_PATTERN.test(value)) throw new Error('expected_commit_invalid');
  return value.toLowerCase();
}

export function buildAntiFrameProbeUrl(baseUrl, expectedCommit) {
  const html = [
    '<!doctype html>',
    '<meta charset="utf-8">',
    '<meta name="referrer" content="no-referrer">',
    '<title>BoothBook anti-frame probe</title>',
    '<h1>Unrelated HTTPS frame probe</h1>',
    `<p>Expected release: <code>${expectedCommit.slice(0, 7)}</code></p>`,
    `<iframe title="BoothBook target" src="${baseUrl}/" referrerpolicy="no-referrer" width="800" height="600"></iframe>`,
  ].join('');
  return `${PROBE_ORIGIN}/base64/${Buffer.from(html, 'utf8').toString('base64url')}`;
}

async function readBoundedJson(response) {
  const contentLength = Number(response.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_HEALTH_BYTES) {
    throw new Error('health_response_too_large');
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_HEALTH_BYTES) throw new Error('health_response_too_large');
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('health_response_invalid');
  }
}

export async function verifyReleaseIdentity(fetchImpl, baseUrl, expectedCommit) {
  const response = await fetchImpl(`${baseUrl}/api/health`, {
    headers: { 'User-Agent': 'BoothBook anti-frame probe generator' },
    cache: 'no-store',
  });
  const health = await readBoundedJson(response);
  if (
    !response.ok
    || health?.status !== 'healthy'
    || health?.release?.commitSha !== expectedCommit.slice(0, 7)
  ) {
    throw new Error('release_identity_mismatch');
  }
}

export async function run(args, fetchImpl = fetch) {
  const baseUrl = requireHttpsOrigin(readOption(args, '--base-url'));
  const expectedCommit = requireExpectedCommit(readOption(args, '--expected-commit'));
  await verifyReleaseIdentity(fetchImpl, baseUrl, expectedCommit);
  return {
    ok: true,
    report: {
      schemaVersion: 1,
      baseUrl,
      expectedCommitSha: expectedCommit.slice(0, 7),
      probeOrigin: PROBE_ORIGIN,
      probeUrl: buildAntiFrameProbeUrl(baseUrl, expectedCommit),
    },
  };
}

function safeErrorCode(error) {
  return String(error?.message || error?.name || 'unknown_error').slice(0, 80);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2))
    .then(report => {
      process.stdout.write(`${JSON.stringify(report)}\n`);
    })
    .catch(error => {
      process.stderr.write(`${JSON.stringify({ ok: false, error: safeErrorCode(error) })}\n`);
      process.exitCode = 1;
    });
}
