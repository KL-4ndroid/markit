import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const appDialog = read('components/ui/AppDialog.tsx');
const themeLab = read('components/dev/ThemeLab.tsx');
const themeGate = read('components/dev/ThemeLabGate.tsx');
const wizard = read('components/settings/InteractionSetupWizard.tsx');
const globals = read('app/globals.css');

assert.match(appDialog, /@headlessui\/react/);
assert.match(appDialog, /DialogPanel/);
assert.match(appDialog, /DialogTitle/);
assert.match(appDialog, /label="關閉"/);
assert.match(appDialog, /bg-deep\/35 backdrop-blur-sm/);

assert.match(themeLab, /<AppDialog/);
assert.doesNotMatch(themeLab, /createPortal|addEventListener\('keydown'/);
assert.match(themeLab, /paletteIsAccessible/);
assert.match(themeLab, /目前配色有未通過 AA/);
assert.match(themeLab, /disabled=\{!paletteIsAccessible\}/);
assert.match(themeLab, /theme-save-contrast-error/);
assert.match(themeGate, /lastSafeStateRef/);
assert.match(themeGate, /applyThemePalette\(safeState\.palette\)/);

assert.match(wizard, /<AppDialog/);
assert.doesNotMatch(wizard, /@headlessui\/react|<Dialog|<Transition/);
assert.match(wizard, /BarChart3/);
assert.match(wizard, /AlertTriangle/);
assert.doesNotMatch(wizard, /📊|✅ 就用這組|✏️ 我想調整|⚠️ 這裡記錄的是/);
assert.match(wizard, /aria-hidden="true">\{type\.emoji\}/);
assert.match(wizard, /min-h-11/);

assert.match(globals, /--brand-primary: 96 123 130/);
assert.match(globals, /--brand-secondary: 140 109 76/);
assert.match(globals, /:focus-visible/);

console.log('PASS web accessibility and overlay contracts');
