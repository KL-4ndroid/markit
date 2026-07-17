import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const manifestPath = join(__dirname, 'test-files.txt');
const tsxBin = process.platform === 'win32'
  ? join(projectRoot, 'node_modules', '.bin', 'tsx.cmd')
  : join(projectRoot, 'node_modules', '.bin', 'tsx');

const testFiles = readFileSync(manifestPath, 'utf8')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line.length > 0 && !line.startsWith('#'))
  .map(line => line.replace(/^tsx\s+/, ''));

for (const testFile of testFiles) {
  const env = testFile === 'tests/app-api-server-mutation-client.test.ts'
    ? {
        ...process.env,
        NODE_OPTIONS: [process.env.NODE_OPTIONS, '--conditions=react-server']
          .filter(Boolean)
          .join(' '),
      }
    : process.env;
  const result = spawnSync(tsxBin, [testFile], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
