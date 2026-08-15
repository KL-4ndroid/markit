import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pickerSource = readFileSync(join(projectRoot, 'lib', 'date-time-picker', 'DateTimePicker.js'), 'utf8');
const runtimeCss = readFileSync(join(projectRoot, 'public', 'lib', 'date-time-picker', 'DateTimePicker.css'), 'utf8');
const redesignReferenceCss = readFileSync(join(projectRoot, 'lib', 'date-time-picker', 'DateTimePicker.css'), 'utf8');

for (const adapterPath of [
  ['components', 'ui', 'DatePicker.tsx'],
  ['components', 'ui', 'DateMultiPicker.tsx'],
  ['components', 'ui', 'TimePicker.tsx'],
]) {
  const adapterSource = readFileSync(join(projectRoot, ...adapterPath), 'utf8');
  assert.match(adapterSource, /link\.href = ['"]\/lib\/date-time-picker\/DateTimePicker\.css['"]/);
}

for (const runtimeClass of [
  'datetime-picker-selected-count',
  'datetime-picker-actions',
  'datetime-picker-cancel',
  'datetime-picker-confirm',
]) {
  assert.match(pickerSource, new RegExp(`class="[^"]*${runtimeClass}`));
  assert.match(runtimeCss, new RegExp(`\\.${runtimeClass}(?:[\\s,{:]|$)`));
}

assert.match(runtimeCss, /\.datetime-picker-footer\s*\{[\s\S]*?align-items:\s*center;/);
assert.match(runtimeCss, /\.datetime-picker-footer\s*\{[\s\S]*?justify-content:\s*space-between;/);
assert.match(runtimeCss, /\.datetime-picker-actions\s*\{[\s\S]*?display:\s*flex;/);
assert.match(runtimeCss, /@media \(max-width: 380px\)/);
assert.match(redesignReferenceCss, /visual redesign reference \(not loaded at runtime\)/);

console.log('PASS date-time picker runtime style contract');
