import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

async function main() {
  const { segmentAliasPath, configureMobileSegmentAliases } = await import('../scripts/lib/mobile-segment-aliases.mjs');
  const require = createRequire(import.meta.url);
  const { convertSegmentPathToStaticExportFilename } = require('next/dist/shared/lib/segment-cache/segment-value-encoding');
  // Compare against the installed client's real URL encoding, including nested routes.
  for (const segments of ['/privacy/__PAGE__', '/products/detail/__PAGE__', '/@modal/!YWJj/__PAGE__']) {
    const source = 'route/__next.' + segments.slice(1) + '.txt';
    assert.equal(segmentAliasPath(source), 'route/' + convertSegmentPathToStaticExportFilename(segments));
  }
  assert.equal(segmentAliasPath('privacy/__next._tree.txt'), null);
  assert.equal(segmentAliasPath('privacy/index.html'), null);
  assert.throws(() => segmentAliasPath('../__next.privacy/__PAGE__.txt'));
  const root = mkdtempSync(join(tmpdir(), 'feria-segments-'));
  try {
    mkdirSync(join(root, 'privacy/__next.privacy'), { recursive: true });
    const original = join(root, 'privacy/__next.privacy/__PAGE__.txt');
    const target = join(root, 'privacy/__next.privacy.__PAGE__.txt');
    writeFileSync(original, 'exact static flight bytes\n');
    assert.throws(() => configureMobileSegmentAliases(root, { check: true }), /missing/);
    assert.equal(existsSync(target), false, 'check mode must not write');
    assert.equal(configureMobileSegmentAliases(root), 1);
    assert.deepEqual(readFileSync(target), readFileSync(original));
    assert.equal(configureMobileSegmentAliases(root), 1, 'repeat builds preserve identical aliases');
    configureMobileSegmentAliases(root, { check: true });
    writeFileSync(target, 'conflicting existing artifact');
    assert.throws(() => configureMobileSegmentAliases(root), /collision/);
    assert.equal(readFileSync(target, 'utf8'), 'conflicting existing artifact', 'never overwrite conflicting output');
  } finally { rmSync(root, { recursive: true, force: true }); }
  console.log('PASS real Next segment encoding, byte-identical aliases, check-only and conflicting-output protection');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
