import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  BUILT_IN_THEME_PRESETS,
  createThemeLabExport,
  DEFAULT_THEME_PALETTE,
  getContrastRatio,
  normalizeHex,
  parseThemeLabImport,
  sanitizeThemePalette,
  THEME_TOKEN_KEYS,
  type ThemePalette,
} from '../lib/theme-lab';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

assert.equal(THEME_TOKEN_KEYS.length, 15);
assert.equal(DEFAULT_THEME_PALETTE.primary, '#7B9FA6');
assert.equal(DEFAULT_THEME_PALETTE.secondary, '#D4A574');
assert.equal(DEFAULT_THEME_PALETTE.homeEndedCard, '#E7EFF1');
assert.equal(DEFAULT_THEME_PALETTE.upcomingSection, '#EFF3F4');
assert.equal(DEFAULT_THEME_PALETTE.upcomingDateBadge, '#E7EFF1');
assert.equal(normalizeHex(' #f5e6e8 '), '#F5E6E8');
assert.equal(normalizeHex('#xyzxyz'), null);
assert.equal(sanitizeThemePalette(DEFAULT_THEME_PALETTE)?.background, '#FAFAF8');
assert.equal(sanitizeThemePalette({ primary: '#7B9FA6' }), null);
const legacyPalette: Partial<ThemePalette> = { ...DEFAULT_THEME_PALETTE };
delete legacyPalette.homeEndedCard;
delete legacyPalette.upcomingSection;
delete legacyPalette.upcomingDateBadge;
assert.equal(sanitizeThemePalette(legacyPalette)?.homeEndedCard, '#E7EFF1');
assert.equal(sanitizeThemePalette(legacyPalette)?.upcomingSection, '#EFF3F4');
assert.equal(sanitizeThemePalette(legacyPalette)?.upcomingDateBadge, '#E7EFF1');
assert.ok(getContrastRatio('#3A3A3A', '#FAFAF8') >= 4.5);
assert.ok(BUILT_IN_THEME_PRESETS.some((preset) => preset.id === 'warm-twilight'));
assert.equal(BUILT_IN_THEME_PRESETS.length, 9);
for (const presetId of ['honey-milk-tea', 'hydrangea-rain', 'forest-market', 'sea-salt-soda', 'berry-caramel']) {
  const preset = BUILT_IN_THEME_PRESETS.find((candidate) => candidate.id === presetId);
  assert.ok(preset, `missing built-in theme preset: ${presetId}`);
  assert.ok(getContrastRatio(preset.palette.foreground, preset.palette.background) >= 4.5);
  assert.ok(getContrastRatio(preset.palette.mutedForeground, preset.palette.card) >= 4.5);
}

const exported = createThemeLabExport('測試色票', DEFAULT_THEME_PALETTE);
const imported = parseThemeLabImport(JSON.stringify(exported));
assert.equal(imported.name, '測試色票');
assert.deepEqual(imported.palette, DEFAULT_THEME_PALETTE);

const appChrome = read('components/AppChrome.tsx');
const settingsPage = read('app/settings/page.tsx');
const appSettingsPage = read('app/settings/app/page.tsx');
const settingsMenu = read('components/settings/SettingsMenu.tsx');
const gate = read('components/dev/ThemeLabGate.tsx');
const lab = read('components/dev/ThemeLab.tsx');
const themeModel = read('lib/theme-lab.ts');
const home = read('app/page.tsx');
const tailwind = read('tailwind.config.ts');

assert.match(appChrome, /dynamic\(/);
assert.match(appChrome, /ThemeLabGate/);
assert.doesNotMatch(appChrome, /process\.env\.NODE_ENV/);
assert.match(settingsPage, /THEME_LAB_OPEN_EVENT/);
assert.match(settingsPage, /SettingsActionRow/);
assert.match(settingsPage, /主題實驗室/);
assert.match(settingsPage, /個人化/);
assert.doesNotMatch(settingsPage, /process\.env\.NODE_ENV/);
assert.doesNotMatch(appSettingsPage, /themeLabTapCount|handleVersionTap|THEME_LAB_OPEN_EVENT/);
assert.match(settingsMenu, /export function SettingsActionRow/);
assert.match(settingsMenu, /type="button"/);
assert.match(gate, /Ctrl|ctrlKey/);
assert.match(gate, /localStorage|loadThemeLabState/);
assert.match(lab, /type="color"/);
assert.match(lab, /匯入 JSON/);
assert.match(lab, /文字對比檢查/);
assert.match(lab, /個人配色/);
assert.doesNotMatch(lab, /隱藏主題工具/);
assert.match(themeModel, /document\.documentElement/);
assert.match(themeModel, /style\.setProperty/);
assert.match(home, /bg-home-ended-card/);
assert.match(home, /bg-upcoming-section/);
assert.match(home, /bg-upcoming-date-badge/);
assert.match(tailwind, /'home-ended-card'/);
assert.match(tailwind, /'upcoming-section'/);
assert.match(tailwind, /'upcoming-date-badge'/);
assert.doesNotMatch(gate, /fetch\(|supabase/i);
assert.doesNotMatch(lab, /fetch\(|supabase/i);
assert.equal(existsSync(join(root, 'app', 'theme-lab', 'page.tsx')), false);

console.log('PASS theme lab available in all builds');
