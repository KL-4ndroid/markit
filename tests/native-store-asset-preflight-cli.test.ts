import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import sharp from 'sharp';

const root = process.cwd();
const cliPath = resolve('scripts/check-native-store-assets.ts');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'boothbook-store-assets-'));

function runCli(assetRoot?: string) {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', cliPath, ...(assetRoot ? [`--root=${assetRoot}`] : [])],
    { cwd: root, encoding: 'utf8', windowsHide: true },
  );
}

async function writePng(
  path: string,
  width: number,
  height: number,
  alpha = false,
): Promise<void> {
  mkdirSync(dirname(path), { recursive: true });
  const channels = alpha ? 4 : 3;
  const background = alpha
    ? { r: 57, g: 92, b: 99, alpha: 1 }
    : { r: 57, g: 92, b: 99 };
  await sharp({ create: { width, height, channels, background } }).png().toFile(path);
}

async function main(): Promise<void> {
  try {
    const current = runCli();
    assert.equal(current.status, 1, current.stderr);
    const currentOutput = JSON.parse(current.stdout);
    assert.equal(currentOutput.report.ready, false);
    assert.equal(currentOutput.report.passedCount, 3);
    assert.equal(currentOutput.report.blockerCount, 2);
    assert.deepEqual(
      currentOutput.report.checks.filter((check: { ok: boolean }) => !check.ok)
        .map((check: { id: string }) => check.id),
      ['ios_phone_screenshots', 'google_phone_screenshots'],
    );

    await writePng(join(temporaryDirectory, 'store-assets/ios/app-icon-1024.png'), 1024, 1024);
    await writePng(
      join(temporaryDirectory, 'store-assets/google/app-icon-512.png'),
      512,
      512,
      true,
    );
    await writePng(
      join(temporaryDirectory, 'store-assets/google/feature-graphic-1024x500.png'),
      1024,
      500,
    );
    await writePng(
      join(temporaryDirectory, 'store-assets/ios/screenshots/zh-TW/01.png'),
      1260,
      2736,
    );
    for (let index = 1; index <= 4; index += 1) {
      await writePng(
        join(temporaryDirectory, `store-assets/google/screenshots/zh-TW/0${index}.png`),
        1080,
        1920,
      );
    }

    const ready = runCli(temporaryDirectory);
    assert.equal(ready.status, 0, ready.stderr);
    assert.equal(JSON.parse(ready.stdout).report.ready, true);

    const invalidArguments = spawnSync(
      process.execPath,
      ['--import', 'tsx', cliPath, '--unknown'],
      { cwd: root, encoding: 'utf8', windowsHide: true },
    );
    assert.equal(invalidArguments.status, 64);
    assert.deepEqual(JSON.parse(invalidArguments.stderr), {
      ok: false,
      code: 'argument_invalid',
    });
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
}

void main().then(() => {
  console.log('PASS Native store asset CLI exits');
});
