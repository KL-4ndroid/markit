import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAppPlatform, installAppPlatform } from '../lib/platform/platform';
import { getFilePort } from '../lib/platform/file-capability';
import type { AppPlatform, PlatformFile } from '../lib/platform/contracts';

const projectRoot = join(__dirname, '..');
const readProjectFile = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

console.log('\n=== Platform file boundary ===');

assert.equal(typeof getAppPlatform().files.saveFile, 'function');
assert.equal(typeof getAppPlatform().files.previewFile, 'function');
console.log('PASS Web provides file save and preview capabilities');

const calls: Array<{ action: string; file: PlatformFile }> = [];
const fakePlatform: AppPlatform = {
  ...getAppPlatform(),
  kind: 'ios',
  files: {
    async saveFile(file) {
      calls.push({ action: 'save', file });
    },
    async previewFile(file) {
      calls.push({ action: 'preview', file });
      return { opened: true };
    },
  },
};

async function main(): Promise<void> {
  const restore = installAppPlatform(fakePlatform);
  try {
    await getAppPlatform().files.saveFile({ filename: 'report.csv', data: new Blob(['a,b']) });
    await getAppPlatform().files.previewFile({ filename: 'report.pdf', data: new Blob(['pdf']) });
    await getFilePort().saveFile({ filename: 'database-backup.json', data: new Blob(['{}']) });
  } finally {
    restore();
  }

  assert.deepEqual(calls.map(call => [call.action, call.file.filename]), [
    ['save', 'report.csv'],
    ['preview', 'report.pdf'],
    ['save', 'database-backup.json'],
  ]);
  console.log('PASS native and test implementations receive platform-neutral files');

  for (const path of [
    'lib/export-utils.ts',
    'components/common/ImportSafetyStatusPanel.tsx',
    'components/common/DatabaseRecoveryPanel.tsx',
    'components/reports/settlement/SettlementReportPdfPreviewButton.tsx',
  ]) {
    const source = readProjectFile(path);
    assert.match(source, /getAppPlatform\(\)\.files/);
    assert.doesNotMatch(source, /document\.createElement|URL\.createObjectURL|window\.open/);
  }
  console.log('PASS migrated shared and UI files no longer own browser file APIs');

  const registrySource = readProjectFile('lib/platform/file-capability.ts');
  assert.doesNotMatch(
    registrySource,
    /from ['"][^'"]*(?:platform\/platform|platform\/web['"]|camera|sales|lib\/db)/
  );

  for (const path of ['lib/db/index.ts', 'lib/db/data-canonicalization.ts']) {
    const source = readProjectFile(path);
    assert.match(source, /@\/lib\/platform\/file-capability/);
    assert.match(source, /getFilePort\(\)\.saveFile/);
    assert.doesNotMatch(source, /document\.createElement|URL\.createObjectURL|\.download\s*=/);
    assert.doesNotMatch(source, /@\/lib\/platform['"]|@\/lib\/platform\/platform/);
  }
  console.log('PASS database fallbacks use the cycle-safe file capability registry');
}

void main();
