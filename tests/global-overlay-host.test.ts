import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const appChrome = read('components/AppChrome.tsx');
const host = read('components/global-overlays/GlobalOverlayHost.tsx');
const invitation = read('components/staff/StaffInvitationDialog.tsx');
const initialSync = read('components/sync/InitialSyncDialog.tsx');
const pwaUpdate = read('components/PWAUpdatePrompt.tsx');
const pwaInstall = read('components/PWAInstallPrompt.tsx');

assert.match(appChrome, /<GlobalOverlayHost \/>/);
assert.doesNotMatch(appChrome, /<PWAInstallPrompt|<PWAUpdatePrompt|<StaffInvitationDialog|<InitialSyncDialog/);
assert.match(host, /'staffInvitation',[\s\S]*'initialSync',[\s\S]*'pwaUpdate',[\s\S]*'pwaInstall'/);
assert.match(host, /OVERLAY_PRIORITY\.find\(id => visibility\[id\]\)/);
assert.match(host, /activeOverlay !== null && activeOverlay !== id/);
assert.match(host, /dynamic<CoordinatedOverlayProps>/);
assert.match(host, /ssr: false/g);
assert.match(host, /import \{ InitialSyncDialog \} from '@\/components\/sync\/InitialSyncDialog'/);
assert.doesNotMatch(host, /dynamic<CoordinatedOverlayProps>\(\s*\(\) => import\('@\/components\/sync\/InitialSyncDialog'/);
assert.match(initialSync, /const shouldOpenInitially = Boolean\(/);
assert.match(initialSync, /useState\(shouldOpenInitially\)/);

for (const source of [invitation, initialSync, pwaUpdate, pwaInstall]) {
  assert.match(source, /isSuppressed/);
  assert.match(source, /onVisibilityChange/);
}

assert.doesNotMatch(invitation, /\bconfirm\s*\(/);
assert.match(invitation, /<ConfirmDialog/);
assert.match(invitation, /pendingDecision === null/);

console.log('PASS coordinated global overlay ownership');
