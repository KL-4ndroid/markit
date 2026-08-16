import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const layoutSource = read('app/layout.tsx');
const templateSource = read('app/template.tsx');
const bottomNavigationSource = read('components/BottomNavigation.tsx');
const analyticsSource = read('app/analytics/page.tsx');
const globalStyles = read('app/globals.css');

assert.doesNotMatch(layoutSource, /maximumScale|userScalable/);
assert.doesNotMatch(layoutSource, /NavigationProvider|navigation-context/);
assert.doesNotMatch(templateSource, /use client|useNavigation|slide-from-/);
assert.match(templateSource, /route-fade-in/);
assert.doesNotMatch(bottomNavigationSource, /router\.prefetch|prefetch=|useNavigation|setNavigation/);
assert.doesNotMatch(analyticsSource, /setTimeout\s*\(resolve,\s*500\)/);
assert.doesNotMatch(globalStyles, /contain:\s*layout style paint/);
assert.doesNotMatch(globalStyles, /-webkit-touch-callout:\s*none/);
assert.doesNotMatch(globalStyles, /overscroll-behavior-y:\s*none/);
assert.match(globalStyles, /prefers-reduced-motion:\s*reduce/);
assert.match(globalStyles, /animation-duration:\s*0\.01ms\s*!important/);

console.log('PASS accessible and lightweight app shell');
