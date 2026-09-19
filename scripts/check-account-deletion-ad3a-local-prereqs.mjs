import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const configPath = resolve('supabase/config.toml');
const allowedHosts = new Set(['127.0.0.1', 'localhost']);
const findings = [];

function checkUrl(name) {
  const raw = process.env[name]?.trim();
  if (!raw) return;
  try {
    const parsed = new URL(raw);
    if (!allowedHosts.has(parsed.hostname)) {
      findings.push(`${name} must target localhost; remote targets are prohibited for AD3A.`);
    }
  } catch {
    findings.push(`${name} is not a valid URL.`);
  }
}

checkUrl('NEXT_PUBLIC_SUPABASE_URL');
checkUrl('SUPABASE_DB_URL');

if (!existsSync(configPath)) {
  findings.push('supabase/config.toml is missing; initialize a brand-new local Supabase project first.');
}

const dockerCandidates = [
  'docker',
  ...(process.env.LOCALAPPDATA
    ? [join(process.env.LOCALAPPDATA, 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe')]
    : []),
  'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
];
let dockerReady = false;
for (const candidate of dockerCandidates) {
  if (candidate !== 'docker' && !existsSync(candidate)) continue;
  try {
    execFileSync(candidate, ['info'], { stdio: 'ignore', timeout: 10_000 });
    dockerReady = true;
    break;
  } catch {
    // Try the next known installation location.
  }
}
if (!dockerReady) {
  findings.push('Docker Engine is unavailable; start Docker Desktop before local Supabase.');
}

if (findings.length > 0) {
  console.error(JSON.stringify({ ready: false, destructiveOperationsRun: false, findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ready: true,
  destructiveOperationsRun: false,
  next: 'Run Supabase local start/reset only after re-confirming this disposable target.',
}, null, 2));
