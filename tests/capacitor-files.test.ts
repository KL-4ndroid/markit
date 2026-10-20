import assert from 'node:assert/strict';
import { createNativeFiles, type NativeFileDependencies } from '../lib/platform/capacitor/files';
import { createFileResolver } from '../lib/platform/file-resolver';
import { FileOperationError, type FileOperationErrorCode } from '../lib/platform/contracts/files';
import { loadIosFiles } from '../lib/platform/capacitor/load-files';

const id = '00000000-0000-4000-8000-000000000001';
const root = 'file:///var/mobile/Containers/Data/Application/fixture/Library/Caches';
const directory = `feria-exports/${id}`;
const csv = { filename: '營業 報表.csv', data: new Blob(['\uFEFFa,b\n1,2'], { type: 'text/csv;charset=utf-8' }) };
const pdf = { filename: 'report.pdf', data: new Blob(['%PDF-1.7'], { type: 'application/pdf' }) };
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
const rejected = (code: FileOperationErrorCode) => (error: unknown) => error instanceof FileOperationError && error.code === code;
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
function fixture() {
  const calls: string[] = [];
  let bytes = '';
  const dependencies: NativeFileDependencies = {
    createDirectory: async path => { calls.push(`mkdir:${path}`); },
    write: async (path, data) => { calls.push(`write:${path}`); bytes = data; },
    getUri: async path => { calls.push('uri'); return root + '/' + path.split('/').map(encodeURIComponent).join('/'); },
    removeFile: async path => { calls.push(`remove:${path}`); },
    removeDirectory: async path => { calls.push(`rmdir:${path}`); },
    share: async () => { calls.push('share'); }, preview: async () => { calls.push('preview'); }, createId: () => id,
  };
  return { calls, dependencies, bytes: () => bytes, create: () => createNativeFiles(dependencies, { cacheUri: root }) };
}
async function main() {
  {
    const f = fixture(); const native = f.create();
    await native.files.saveFile(csv);
    assert.deepEqual(f.calls, ['uri', `mkdir:${directory}`, `write:${directory}/${csv.filename}`, 'share', `remove:${directory}/${csv.filename}`, `rmdir:${directory}`]);
    assert.deepEqual(Buffer.from(f.bytes(), 'base64'), Buffer.from(await csv.data.arrayBuffer()), 'preserve UTF-8 BOM and all report bytes');
    assert.deepEqual(await native.files.previewFile(pdf), { opened: true });
    assert.ok(f.calls.includes('preview'));
  }
  for (const file of [
    { ...csv, filename: '../report.csv' }, { ...csv, filename: 'a\\report.csv' }, { ...csv, filename: 'a%2freport.csv' },
    { ...csv, filename: 'a\n.csv' }, { ...csv, filename: 'a.csv.' }, { ...csv, filename: 'a.csv ' },
    { ...csv, filename: '.hidden.csv' }, { ...csv, filename: 'a.pdf' },
    { ...csv, data: new Blob([]) }, { ...csv, data: new Blob([new Uint8Array(25 * 1024 * 1024 + 1)], { type: 'text/csv' }) },
  ]) {
    const f = fixture(); await assert.rejects(f.create().files.saveFile(file), rejected('invalid_file')); assert.deepEqual(f.calls, []);
  }
  {
    const f = fixture(); await assert.rejects(f.create().files.previewFile(csv), rejected('invalid_file'));
    f.dependencies.getUri = async () => 'file:///var/foreign/report.csv';
    await assert.rejects(f.create().files.saveFile(csv), rejected('unavailable')); assert.deepEqual(f.calls, []);
  }
  {
    const f = fixture(); const ui = deferred();
    f.dependencies.share = async () => { f.calls.push('share'); await ui.promise; };
    const native = f.create(); const save = native.files.saveFile(csv); await tick();
    assert.equal(f.calls.at(-1), 'share', 'do not delete while system UI owns file');
    await assert.rejects(native.files.previewFile(pdf), rejected('busy'));
    ui.resolve(); await save; assert.equal(f.calls.at(-1), `rmdir:${directory}`);
  }
  for (const [failure, expected] of [[new Error('Share canceled'), 'cancelled'], [new Error('/private/secret data'), 'failed']] as const) {
    const f = fixture(); f.dependencies.share = async () => { throw failure; };
    await assert.rejects(f.create().files.saveFile(csv), error => rejected(expected)(error) && !(error as Error).message.includes('secret'));
    assert.equal(f.calls.at(-1), `rmdir:${directory}`);
  }
  {
    const f = fixture(); f.dependencies.removeFile = async () => { throw new Error('private'); };
    const native = f.create(); await assert.rejects(native.files.saveFile(csv), rejected('cleanup_failed'));
    await assert.rejects(native.files.saveFile(csv), rejected('unavailable'));
  }
  {
    const f = fixture(); const write = deferred(); const timers = new Set<() => void>();
    f.dependencies.write = () => write.promise;
    const native = createNativeFiles(f.dependencies, { cacheUri: root, scheduleDeadline(callback) { timers.add(callback); return () => { timers.delete(callback); }; } });
    const save = assert.rejects(native.files.saveFile(csv), rejected('unavailable')); await tick();
    assert.equal(timers.size, 1); [...timers][0](); await save;
    write.resolve(); await tick();
    assert.ok(!f.calls.some(call => /share|remove|rmdir/.test(call)), 'uncertain write must not race cleanup or late presentation');
    await assert.rejects(native.files.saveFile(csv), rejected('unavailable'));
  }
  {
    const f = fixture(); const ui = deferred(); f.dependencies.preview = () => ui.promise;
    const native = f.create(); const preview = assert.rejects(native.files.previewFile(pdf), rejected('unavailable'));
    await tick(); native.dispose(); ui.resolve(); await preview;
    assert.equal(f.calls.at(-1), `rmdir:${directory}`);
  }
  {
    const f = fixture(); const files = f.create().files; let loads = 0;
    const resolver = createFileResolver({ runtime: () => 'ios', webFiles: () => { throw new Error('Web forbidden'); }, loadIosFiles: async () => { loads++; return files; } });
    const [a, b] = await Promise.all([resolver(), resolver()]); assert.equal(a, b); assert.equal(loads, 1);
    const broken = createFileResolver({ runtime: () => 'ios', webFiles: () => files, loadIosFiles: async () => { throw new Error('private'); } });
    await assert.rejects(broken(), rejected('unavailable')); await assert.rejects(broken(), rejected('unavailable'));
    const unsupported = createFileResolver({ runtime: () => 'android', webFiles: () => files, loadIosFiles: async () => files });
    await assert.rejects(unsupported(), rejected('unavailable'));
    const web = createFileResolver({ runtime: () => 'web', webFiles: () => files, loadIosFiles: async () => { throw new Error(); } });
    assert.equal(await web(), files);
    let timeout!: () => void;
    const stalled = createFileResolver({ runtime: () => 'ios', webFiles: () => files, loadIosFiles: () => new Promise(() => {}), scheduleDeadline(callback) { timeout = callback; return () => {}; } });
    const rejectedLoad = assert.rejects(stalled(), rejected('unavailable')); timeout(); await rejectedLoad;
  }
  await assert.rejects(loadIosFiles(), rejected('unavailable'));
  console.log('PASS native file bytes, scoped cleanup, UI lifetime, cancellation, failures, bounds, disposal and fail-closed resolution');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
