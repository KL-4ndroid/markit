import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const sourceRoots = ['app', 'components', 'hooks', 'lib'];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const projectPath = relative(projectRoot, path).replaceAll('\\', '/');
      if (projectPath === 'app/api' || projectPath === 'lib/api/server') return [];
      return walk(path);
    }
    return ['.ts', '.tsx', '.js', '.jsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

function walkAllProductionSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walkAllProductionSources(path);
    return ['.ts', '.tsx', '.js', '.jsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

function allProductionSources(): string[] {
  return sourceRoots.flatMap(root => walkAllProductionSources(join(projectRoot, root)));
}

console.log('\n=== Sales photo evidence client mutation boundary ===');

runTest('client-reachable source contains no direct sale_photo_evidence mutation', () => {
  const violations: string[] = [];
  for (const root of sourceRoots) {
    for (const path of walk(join(projectRoot, root))) {
      if (path.endsWith('.server.ts') || path.endsWith('.server.tsx')) continue;
      const source = readFileSync(path, 'utf8');
      if (!source.includes('sale_photo_evidence')) continue;
      if (/\.(?:insert|update|delete)\s*\(/.test(source)) {
        violations.push(relative(projectRoot, path).replaceAll('\\', '/'));
      }
    }
  }

  assert.deepEqual(violations, []);
});

runTest('manual upload client uses the BFF and cannot import the server mutation capability', () => {
  const source = readFileSync(
    join(projectRoot, 'lib/sales/photo-evidence-manual-upload-client.ts'),
    'utf8'
  );
  assert.match(source, /fetchAppApi/);
  assert.doesNotMatch(source, /sales-photo-evidence-server-mutation|SUPABASE_SECRET_KEY|sb_secret_/);
});

runTest('only the upload API route imports the server mutation capability', () => {
  const capabilityImporters = allProductionSources()
    .filter(path => readFileSync(path, 'utf8').includes(
      'sales-photo-evidence-server-mutation-repository.server'
    ))
    .map(path => relative(projectRoot, path).replaceAll('\\', '/'));

  assert.deepEqual(capabilityImporters, [
    'app/api/sales-photo-evidence/upload/route.ts',
  ]);
});

runTest('use-client modules cannot import any server-only module', () => {
  const violations = allProductionSources()
    .filter(path => {
      const source = readFileSync(path, 'utf8');
      return /^\s*['"]use client['"];?/m.test(source)
        && /(?:from\s+|import\s*\()['"][^'"]*\.server(?:['"]|\.)/.test(source);
    })
    .map(path => relative(projectRoot, path).replaceAll('\\', '/'));

  assert.deepEqual(violations, []);
});

runTest('mobile artifact verification rejects every server mutation credential marker', () => {
  const source = readFileSync(
    join(projectRoot, 'scripts/verify-mobile-static-output.mjs'),
    'utf8'
  );
  assert.match(source, /SUPABASE_SECRET_KEY/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /sb_secret_/);
  assert.match(source, /bff_claim_sale_photo_evidence_upload/);
});

runTest('boundary test is registered in the manifest', () => {
  const manifest = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');
  assert.match(manifest, /tsx tests\/sales-photo-evidence-client-mutation-boundary\.test\.ts/);
});

async function main(): Promise<void> {
  let failed = 0;
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} sales photo evidence client mutation boundary tests failed`);
  }
}

main();
