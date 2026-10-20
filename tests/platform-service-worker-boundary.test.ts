import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const registerSource = readFileSync(join(projectRoot, 'app', 'register-sw.tsx'), 'utf8');
const promptSource = readFileSync(join(projectRoot, 'components', 'PWAUpdatePrompt.tsx'), 'utf8');

for (const source of [registerSource, promptSource]) {
  assert.match(source, /getAppPlatform\(\)\.kind !== ['"]web['"]/);
}

console.log('PASS native platform excludes PWA service-worker flows');
