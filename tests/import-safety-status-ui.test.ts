import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  IMPORT_EMERGENCY_BACKUP_KEY,
  IMPORT_EMERGENCY_BACKUP_METADATA_KEY,
  getImportSafetyStatus,
} from '../lib/db/import-safety-status';

type TestFn = () => void;
type StorageMap = Record<string, string>;

interface LocalStorageStub {
  getItem(key: string): string | null;
}

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const panelSource = readFileSync(join(projectRoot, 'components/common/ImportSafetyStatusPanel.tsx'), 'utf8');
const recoveryPageSource = readFileSync(join(projectRoot, 'app/recovery/page.tsx'), 'utf8');
const helperSource = readFileSync(join(projectRoot, 'lib/db/import-safety-status.ts'), 'utf8');
const importPlanSource = readFileSync(join(projectRoot, 'docs/IMPORT_RECOVERY_SEMANTICS_PLAN_2026_06_29.md'), 'utf8');
const highRiskPlanSource = readFileSync(join(projectRoot, 'docs/HIGH_RISK_SYNC_AND_DATA_EXECUTION_PLAN.md'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function withWindowStorage(values: StorageMap, fn: () => void): void {
  const globalWithWindow = globalThis as typeof globalThis & {
    window?: { localStorage: LocalStorageStub };
  };
  const originalWindow = globalWithWindow.window;

  globalWithWindow.window = {
    localStorage: {
      getItem: (key: string) => values[key] ?? null,
    },
  };

  try {
    fn();
  } finally {
    if (originalWindow) {
      globalWithWindow.window = originalWindow;
    } else {
      delete globalWithWindow.window;
    }
  }
}

console.log('\n=== Import safety status UI shell ===');

runTest('helper returns no-backup status when metadata is absent', () => {
  withWindowStorage({}, () => {
    const status = getImportSafetyStatus();

    assert.equal(status.available, false);
    assert.equal(status.metadata, null);
    assert.equal(status.hasLocalBackupContent, false);
    assert.equal(status.storageMode, 'none');
    assert.equal(status.error, null);
  });
});

runTest('helper detects locally stored emergency backup content', () => {
  withWindowStorage({
    [IMPORT_EMERGENCY_BACKUP_METADATA_KEY]: JSON.stringify({
      createdAt: 1_700_000_000_000,
      size: 1234,
    }),
    [IMPORT_EMERGENCY_BACKUP_KEY]: '{"version":1}',
  }, () => {
    const status = getImportSafetyStatus();

    assert.equal(status.available, true);
    assert.equal(status.metadata?.createdAt, 1_700_000_000_000);
    assert.equal(status.metadata?.size, 1234);
    assert.equal(status.hasLocalBackupContent, true);
    assert.equal(status.storageMode, 'local_storage');
    assert.equal(status.error, null);
  });
});

runTest('helper detects downloaded emergency backup metadata without local content', () => {
  withWindowStorage({
    [IMPORT_EMERGENCY_BACKUP_METADATA_KEY]: JSON.stringify({
      createdAt: 1_700_000_000_000,
      size: 5_000_000,
      downloaded: true,
    }),
  }, () => {
    const status = getImportSafetyStatus();

    assert.equal(status.available, true);
    assert.equal(status.hasLocalBackupContent, false);
    assert.equal(status.storageMode, 'downloaded_file');
    assert.equal(status.error, null);
  });
});

runTest('helper handles invalid metadata without throwing', () => {
  withWindowStorage({
    [IMPORT_EMERGENCY_BACKUP_METADATA_KEY]: '{"createdAt":"bad"}',
  }, () => {
    const status = getImportSafetyStatus();

    assert.equal(status.available, false);
    assert.equal(status.storageMode, 'none');
    assert.match(status.error ?? '', /metadata is invalid/);
  });
});

runTest('panel is mounted only on the existing owner-gated recovery page', () => {
  assert.match(recoveryPageSource, /hasCapability\(roleCapabilities, 'canUseRepairTools'\)/);
  assert.match(recoveryPageSource, /<DatabaseRecoveryPanel \/>[\s\S]*<ImportSafetyStatusPanel \/>/);
});

runTest('panel and helper remain read-only and isolated from import repair and cloud writes', () => {
  for (const source of [panelSource, helperSource]) {
    for (const blocked of [
      /importData/,
      /createRecoveryBackup/,
      /repairInvalidDailyStats/,
      /repairProductReferenceErrors/,
      /retryDatabaseRecovery/,
      /restore/i,
      /supabase/i,
      /\bdb\./,
      /\bindexedDB[\s.(]/i,
      /localStorage\.setItem/,
      /localStorage\.removeItem/,
      /localStorage\.clear/,
    ]) {
      assert.doesNotMatch(source, blocked);
    }
  }
});

runTest('plans record the import safety status UI shell as completed without approving recovery automation', () => {
  assert.match(importPlanSource, /Phase 2: Import Safety Status UI Shell[\s\S]*Status: completed as read-only UI shell/);
  assert.match(importPlanSource, /Does not call `importData\(\)`/);
  assert.match(importPlanSource, /Does not restore or repair data/);
  assert.match(highRiskPlanSource, /Import Safety Status UI Shell[\s\S]*Status: completed as owner-gated read-only UI work/);
  assert.match(highRiskPlanSource, /Still not approved:[\s\S]*Automatic rollback, restore, repair, or production recovery behavior/);
});

runTest('full test suite includes import safety status UI guardrail', () => {
  assert.match(testManifestSource, /tsx tests\/import-safety-status-ui\.test\.ts/);
});

function main(): void {
  let failed = 0;

  for (const test of tests) {
    try {
      test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} import safety status UI tests failed`);
  }
}

main();
