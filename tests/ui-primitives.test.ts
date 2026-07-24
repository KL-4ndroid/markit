import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const button = read('components/ui/Button.tsx');
const iconButton = read('components/ui/IconButton.tsx');
const dialog = read('components/ui/AppDialog.tsx');
const confirm = read('components/ui/ConfirmDialog.tsx');
const formField = read('components/ui/FormField.tsx');
const stateView = read('components/ui/StateView.tsx');
const tabs = read('components/ui/Tabs.tsx');
const globalStyles = read('app/globals.css');
const tailwind = read('tailwind.config.ts');

assert.match(button, /min-h-11/);
assert.match(button, /focus-visible:ring-2/);
assert.match(iconButton, /aria-label=\{label\}/);
assert.match(iconButton, /h-11 w-11/);
assert.match(dialog, /layer === 'critical'/);
assert.match(dialog, /DialogTitle/);
assert.match(dialog, /xl: 'max-w-6xl'/);
assert.match(confirm, /confirmationText/);
assert.match(confirm, /layer="critical"/);
assert.match(confirm, /variant=\{tone === 'danger' \? 'danger' : 'primary'\}/);
assert.match(formField, /aria-describedby/);
assert.match(formField, /aria-invalid/);
assert.match(stateView, /rounded-card/);
assert.match(tabs, /TabGroup/);
assert.match(tabs, /aria-label=\{ariaLabel\}/);
assert.match(tabs, /min-h-11/);
assert.match(globalStyles, /:focus-visible/);
assert.match(tailwind, /control:\s*'1rem'/);
assert.match(tailwind, /card:\s*'1\.5rem'/);
assert.match(tailwind, /dialog:\s*'1\.5rem'/);
assert.match(tailwind, /dialog:\s*'70'/);

console.log('PASS shared UI primitive contracts');
