import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const designSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_BROWSER_ADAPTER_IMPLEMENTATION_DESIGN.md');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence browser adapter implementation design ===');

runTest('design keeps the browser adapter implementation slice design-only', () => {
  assert.match(designSource, /Status: Design-only/);
  assert.match(designSource, /No camera, canvas, IndexedDB, Supabase, R2, upload, signed URL, or production runtime wiring is implemented/);
  assert.match(designSource, /Do not upload to R2/);
  assert.match(designSource, /Do not write Supabase metadata/);
  assert.match(designSource, /Do not enable production runtime enqueue/);
});

runTest('design recommends file input capture before live camera stream', () => {
  assert.match(designSource, /Use an `<input type="file" accept="image\/\*" capture="environment">` capture-first adapter/);
  assert.match(designSource, /Do not start with a custom `navigator\.mediaDevices\.getUserMedia\(\)` live camera stream/);
  assert.match(designSource, /`getUserMedia\(\)` can be a later enhancement/);
});

runTest('design separates local processing from storage upload and cloud metadata', () => {
  assert.match(designSource, /browser adapter should be a UI\/local-processing layer only/);
  assert.match(designSource, /return an in-memory result object to the caller/);
  assert.match(designSource, /separate, later-approved storage slice decides how to store pending local binary payloads/);
  assert.match(designSource, /Failure must keep evidence pending and must not write cloud metadata/);
});

runTest('design defines capability failure and output validation boundaries', () => {
  assert.match(designSource, /classifySalesPhotoEvidenceBrowserAdapterReadiness\(snapshot\)/);
  assert.match(designSource, /strip EXIF by drawing to canvas and exporting a new blob/);
  assert.match(designSource, /fail closed if final output cannot meet size policy/);
  assert.match(designSource, /every failure keeps evidence pending/);
});

runTest('design records runtime decision boundary before implementation', () => {
  assert.match(designSource, /Decision Boundary Before Runtime Implementation/);
  assert.match(designSource, /whether local binary pending storage is approved/);
  assert.match(designSource, /owner capture on behalf of staff should remain deferred/);
});

runTest('execution plan records Slice 6C as design-only', () => {
  assert.match(planSource, /Slice 6C Status/);
  assert.match(planSource, /browser adapter implementation design document/);
  assert.match(planSource, /does not implement browser camera, canvas, local binary storage, upload, signed read, R2, Supabase writes, or runtime enqueue/);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-browser-adapter-implementation-design\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence browser adapter implementation design tests failed`);
  }
}

main();
