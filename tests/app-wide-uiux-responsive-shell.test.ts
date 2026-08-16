import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getPageShellWidthClass } from '../lib/layout/page-shell';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const plan = read('docs/APP_WIDE_UIUX_REMEDIATION_EXECUTION_PLAN_2026_08_12.md');
const appChrome = read('components/AppChrome.tsx');
const navigation = read('components/BottomNavigation.tsx');
const bottomBar = read('components/navigation/AppBottomNavigationBar.tsx');
const desktopNavigation = read('components/navigation/AppDesktopNavigation.tsx');
const navigationIcon = read('components/navigation/AppNavigationIcon.tsx');
const pageShell = read('components/layout/AppPageShell.tsx');
const navigationModel = read('lib/navigation/app-navigation.ts');

assert.match(plan, /UX-R3 - Responsive Authenticated Shell/);

assert.match(appChrome, /lg:grid-cols-\[15rem_minmax\(0,1fr\)\]/);
assert.match(appChrome, /xl:grid-cols-\[16rem_minmax\(0,1fr\)\]/);
assert.match(appChrome, /pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]\s+lg:pb-0/);
assert.equal(appChrome.match(/<BottomNavigation\s*\/>/g)?.length, 1);
assert.equal(appChrome.match(/<main(?:\s|>)/g)?.length, 3);

assert.match(bottomBar, /env\(safe-area-inset-bottom\)/);
assert.match(bottomBar, /lg:hidden/);
assert.match(desktopNavigation, /hidden[^"]*lg:flex/);
assert.match(desktopNavigation, /lg:sticky[^"]*lg:h-dvh/);
assert.match(desktopNavigation, /aria-label="主要導覽"/);
assert.doesNotMatch(desktopNavigation, /fetch\(|useRoleContext|usePathname/);

assert.match(navigation, /roleReady:\s*roleRefreshState\.isAuthorizationFresh/);
assert.match(navigation, /<AppBottomNavigationBar\s+items=\{navItems\}/);
assert.match(navigation, /<AppDesktopNavigation\s+items=\{navItems\}/);
assert.match(navigation, /getActiveAppNavigationItemId\(pathname, navItems\)/);
assert.doesNotMatch(navigation, /useUserRole/);

assert.match(navigationIcon, /satisfies Record<AppNavigationItemId/);
assert.match(navigationModel, /getActiveAppNavigationItemId/);
assert.match(pageShell, /PageShellWidthMode/);
assert.match(pageShell, /getPageShellWidthClass\(width\)/);
assert.equal(getPageShellWidthClass('focused'), 'max-w-3xl');
assert.equal(getPageShellWidthClass('workspace'), 'max-w-5xl');
assert.equal(getPageShellWidthClass('report'), 'max-w-7xl');

assert.match(appChrome, /isStandalonePublicRoute/);
assert.match(appChrome, /isAuthFlowPublicRoute/);
assert.doesNotMatch(appChrome, /cloneElement|createPortal|fetch\(/);

console.log('PASS UX-R3 responsive authenticated shell contracts');
